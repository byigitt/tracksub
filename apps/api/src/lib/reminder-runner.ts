// Pure logic for the reminder run — exported so the cron job AND the dev test
// endpoint can share it. Idempotency is enforced at the DB layer via the
// `reminder_job` unique-on-(subscriptionId, dueOffsetDays, scheduledFor::date) index.

import { randomUUID } from 'node:crypto';
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';
import { db, schema } from '../db/client.ts';
import { sendReminderViaGmail, type SendReminderResult } from './mailer.ts';
import {
  type EmailTemplateKind,
  reminderOffsetFor,
  REMINDER_OFFSETS,
  type ReminderOffset,
} from '@tracksub/shared';

export type ReminderOutcome = {
  subscriptionId: string;
  userId: string;
  offset: ReminderOffset;
  template: EmailTemplateKind;
  result: 'sent' | 'skipped_duplicate' | 'failed';
  messageId?: string;
  error?: string;
};

export const runReminders = async (
  now: Date = new Date(),
  logger?: FastifyBaseLogger,
): Promise<ReminderOutcome[]> => {
  // 1. Pull every active subscription whose nextBillingAt is within reminder window.
  // We compute offsets in JS rather than in SQL — list is small (per-user).
  const subs = await db
    .select({
      id: schema.subscription.id,
      userId: schema.subscription.userId,
      nextBillingAt: schema.subscription.nextBillingAt,
      name: schema.subscription.name,
      vendor: schema.subscription.vendor,
      amount: schema.subscription.amount,
      currency: schema.subscription.currency,
      period: schema.subscription.period,
      customPeriodDays: schema.subscription.customPeriodDays,
      status: schema.subscription.status,
      startedAt: schema.subscription.startedAt,
      isTrial: schema.subscription.isTrial,
      trialEndsAt: schema.subscription.trialEndsAt,
      notes: schema.subscription.notes,
      source: schema.subscription.source,
      createdAt: schema.subscription.createdAt,
      updatedAt: schema.subscription.updatedAt,
    })
    .from(schema.subscription)
    .where(
      and(eq(schema.subscription.status, 'active'), isNotNull(schema.subscription.nextBillingAt)),
    );

  // Trial subs anchor on `trialEndsAt`; renewal subs on `nextBillingAt`. A single sub
  // never hits both targets in the same run — trial mode wipes nextBillingAt at write time.
  type Due = {
    sub: (typeof subs)[number];
    offset: ReminderOffset;
    target: Date;
    template: EmailTemplateKind;
  };
  const due: Due[] = [];
  for (const s of subs) {
    const target = s.isTrial ? s.trialEndsAt : s.nextBillingAt;
    if (!target) continue;
    const offset = reminderOffsetFor(target, now);
    if (offset !== null) {
      due.push({
        sub: s,
        offset,
        target,
        template: s.isTrial ? 'trial_ending' : 'renewal',
      });
    }
  }
  if (due.length === 0) {
    logger?.info({ msg: 'reminders: no due subs', checked: subs.length });
    return [];
  }

  // 2. Group due subs by user, batch-fetch user emails.
  const userIds = [...new Set(due.map((d) => d.sub.userId))];
  const users = await db
    .select({ id: schema.user.id, email: schema.user.email, name: schema.user.name })
    .from(schema.user)
    .where(inArray(schema.user.id, userIds));
  const userMap = new Map(users.map((u) => [u.id, u]));

  const outcomes: ReminderOutcome[] = [];

  for (const { sub, offset, target, template } of due) {
    const user = userMap.get(sub.userId);
    if (!user) continue;

    // 3. Idempotency guard: try to insert a `reminder_job` row pre-send. The unique
    // index on (subscriptionId, dueOffsetDays, date_trunc('day', scheduledFor))
    // means only ONE run per day per offset will get a fresh row.
    const jobId = randomUUID();
    const scheduledFor = target;
    let inserted: { id: string } | undefined;
    try {
      const rows = await db
        .insert(schema.reminderJob)
        .values({
          id: jobId,
          subscriptionId: sub.id,
          dueOffsetDays: offset,
          scheduledFor,
          status: 'pending',
          createdAt: new Date(),
        })
        .returning({ id: schema.reminderJob.id });
      inserted = rows[0];
    } catch {
      inserted = undefined;
    }
    if (!inserted) {
      outcomes.push({
        subscriptionId: sub.id,
        userId: sub.userId,
        offset,
        template,
        result: 'skipped_duplicate',
      });
      continue;
    }

    // 4. Fire.
    let result: SendReminderResult;
    try {
      result = await sendReminderViaGmail({
        userId: sub.userId,
        to: user.email,
        subscription: sub,
        daysLeft: offset,
        template,
      });
    } catch (err) {
      result = {
        ok: false,
        error: (err as Error).message,
        reason: 'send_failed',
      };
    }

    if (result.ok) {
      await db
        .update(schema.reminderJob)
        .set({ status: 'sent', sentAt: new Date() })
        .where(eq(schema.reminderJob.id, inserted.id));
      await db.insert(schema.subscriptionEvent).values({
        id: randomUUID(),
        subscriptionId: sub.id,
        kind: 'reminder_sent',
        occurredAt: new Date(),
        meta: { offset, template, messageId: result.messageId },
      });
      outcomes.push({
        subscriptionId: sub.id,
        userId: sub.userId,
        offset,
        template,
        result: 'sent',
        messageId: result.messageId,
      });
    } else {
      await db
        .update(schema.reminderJob)
        .set({ status: 'failed', error: result.error })
        .where(eq(schema.reminderJob.id, inserted.id));
      outcomes.push({
        subscriptionId: sub.id,
        userId: sub.userId,
        offset,
        template,
        result: 'failed',
        error: result.error,
      });
      logger?.warn({
        msg: 'reminder send failed',
        subId: sub.id,
        userId: sub.userId,
        offset,
        error: result.error,
      });
    }
  }

  logger?.info({
    msg: 'reminders: run complete',
    sent: outcomes.filter((o) => o.result === 'sent').length,
    skipped: outcomes.filter((o) => o.result === 'skipped_duplicate').length,
    failed: outcomes.filter((o) => o.result === 'failed').length,
  });
  return outcomes;
};

// Auxiliary: roll forward subscriptions whose nextBillingAt has passed. Called at
// the end of each run so users always see an up-to-date "next renewal" date.
export const rollPastDueSubscriptions = async (now: Date = new Date()): Promise<number> => {
  // Only roll auto-renewing periods.
  const rolled = await db.execute<{ id: string }>(sql`
    -- placeholder: handled in JS for clarity
    select id from ${schema.subscription} where status = 'active' and next_billing_at < ${now} limit 0
  `);
  // Use ORM for the actual logic (simpler to reason about than SQL date math).
  const due = await db
    .select()
    .from(schema.subscription)
    .where(
      and(eq(schema.subscription.status, 'active'), isNotNull(schema.subscription.nextBillingAt)),
    );
  let count = 0;
  // Local import to avoid circular type deps.
  const { computeNextBilling } = await import('@tracksub/shared');
  for (const s of due) {
    if (!s.nextBillingAt) continue;
    if (s.nextBillingAt.getTime() >= now.getTime()) continue;
    if (s.period === 'one_time') continue;
    // Trial subs do not auto-renew — once the trial ends the user must convert it manually.
    if (s.isTrial) continue;
    let cursor = s.nextBillingAt;
    let safety = 5000;
    while (cursor.getTime() < now.getTime() && safety-- > 0) {
      const next = computeNextBilling(
        cursor,
        s.period as Parameters<typeof computeNextBilling>[1],
        s.customPeriodDays ?? null,
      );
      if (!next) break;
      cursor = next;
    }
    await db
      .update(schema.subscription)
      .set({ nextBillingAt: cursor, updatedAt: new Date() })
      .where(eq(schema.subscription.id, s.id));
    count++;
  }
  // Touch the placeholder so unused-var lint stays quiet.
  void rolled;
  void REMINDER_OFFSETS;
  return count;
};
