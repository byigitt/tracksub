import { randomUUID } from 'node:crypto';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { schema } from '../../db/client.ts';
import type { NewSubscription, Subscription } from '../../db/schema.ts';
import { computeNextBilling, type Period } from '@tracksub/shared';
import {
  subscriptionCreateSchema,
  subscriptionUpdateSchema,
  type SubscriptionCreateInput,
  type SubscriptionUpdateInput,
} from '@tracksub/schemas';

const idParamsSchema = z.object({ id: z.string().min(1) });

/** Build the DB insert row from validated create input. */
const buildInsertRow = (userId: string, input: SubscriptionCreateInput): NewSubscription => {
  const startedAt = input.startedAt ?? new Date();
  const nextBillingAt =
    input.nextBillingAt ??
    computeNextBilling(startedAt, input.period as Period, input.customPeriodDays ?? null);

  return {
    id: randomUUID(),
    userId,
    name: input.name,
    vendor: input.vendor ?? null,
    amount: input.amount, // already toFixed(2) string
    currency: input.currency,
    period: input.period,
    customPeriodDays: input.customPeriodDays ?? null,
    status: input.status,
    startedAt,
    nextBillingAt,
    notes: input.notes ?? null,
    source: input.source,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/** Map `subscriptionUpdateSchema` output to a Drizzle update object (only present keys). */
const buildUpdateRow = (
  current: Subscription,
  input: SubscriptionUpdateInput,
): Partial<NewSubscription> => {
  const out: Partial<NewSubscription> = { updatedAt: new Date() };

  if (input.name !== undefined) out.name = input.name;
  if (input.vendor !== undefined) out.vendor = input.vendor;
  if (input.amount !== undefined) out.amount = input.amount;
  if (input.currency !== undefined) out.currency = input.currency;
  if (input.period !== undefined) out.period = input.period;
  if (input.customPeriodDays !== undefined) out.customPeriodDays = input.customPeriodDays;
  if (input.status !== undefined) out.status = input.status;
  if (input.startedAt !== undefined) out.startedAt = input.startedAt;
  if (input.notes !== undefined) out.notes = input.notes;

  // nextBillingAt: if explicitly provided (incl. null), respect it. Otherwise, recompute when
  // period or startedAt changed (so user doesn't end up with a stale renewal date).
  if (input.nextBillingAt !== undefined) {
    out.nextBillingAt = input.nextBillingAt;
  } else if (input.period !== undefined || input.startedAt !== undefined) {
    const period = (input.period ?? current.period) as Period;
    const customDays = input.customPeriodDays ?? current.customPeriodDays ?? null;
    const startedAt = input.startedAt ?? current.startedAt;
    out.nextBillingAt = computeNextBilling(startedAt, period, customDays);
  }

  return out;
};

const subscriptionRoutes: FastifyPluginAsync = async (app) => {
  // ---- Auth gate ----
  app.addHook('preHandler', async (request, reply) => {
    if (!request.session) {
      return reply.status(401).send({ error: 'unauthorized' });
    }
  });

  // GET /api/subscriptions — list current user's subscriptions
  // Sort: nextBillingAt asc, NULLs last; tiebreaker createdAt desc.
  app.get('/subscriptions', async (request) => {
    const userId = request.session!.user.id;
    const rows = await app.db
      .select()
      .from(schema.subscription)
      .where(eq(schema.subscription.userId, userId))
      .orderBy(
        sql`${schema.subscription.nextBillingAt} asc nulls last`,
        sql`${schema.subscription.createdAt} desc`,
      );
    return { items: rows };
  });

  // GET /api/subscriptions/:id
  app.get('/subscriptions/:id', async (request, reply) => {
    const userId = request.session!.user.id;
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid id' });

    const [row] = await app.db
      .select()
      .from(schema.subscription)
      .where(
        and(eq(schema.subscription.id, params.data.id), eq(schema.subscription.userId, userId)),
      )
      .limit(1);

    if (!row) return reply.status(404).send({ error: 'not found' });
    return row;
  });

  // POST /api/subscriptions
  app.post('/subscriptions', async (request, reply) => {
    const userId = request.session!.user.id;
    const parsed = subscriptionCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'validation', issues: parsed.error.issues });
    }
    const insertRow = buildInsertRow(userId, parsed.data);
    const [created] = await app.db.insert(schema.subscription).values(insertRow).returning();
    return reply.status(201).send(created);
  });

  // PATCH /api/subscriptions/:id
  app.patch('/subscriptions/:id', async (request, reply) => {
    const userId = request.session!.user.id;
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid id' });

    const parsed = subscriptionUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'validation', issues: parsed.error.issues });
    }

    // Load current row for ownership + recompute fallback.
    const [current] = await app.db
      .select()
      .from(schema.subscription)
      .where(
        and(eq(schema.subscription.id, params.data.id), eq(schema.subscription.userId, userId)),
      )
      .limit(1);
    if (!current) return reply.status(404).send({ error: 'not found' });

    const updateRow = buildUpdateRow(current, parsed.data);
    const [updated] = await app.db
      .update(schema.subscription)
      .set(updateRow)
      .where(
        and(eq(schema.subscription.id, params.data.id), eq(schema.subscription.userId, userId)),
      )
      .returning();
    return updated;
  });

  // DELETE /api/subscriptions/:id (cascades to events + reminder_jobs via FK ON DELETE CASCADE)
  app.delete('/subscriptions/:id', async (request, reply) => {
    const userId = request.session!.user.id;
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid id' });

    const result = await app.db
      .delete(schema.subscription)
      .where(
        and(eq(schema.subscription.id, params.data.id), eq(schema.subscription.userId, userId)),
      )
      .returning({ id: schema.subscription.id });

    if (result.length === 0) return reply.status(404).send({ error: 'not found' });
    return reply.status(204).send();
  });

  // GET /api/subscriptions/:id/events — small audit list
  app.get('/subscriptions/:id/events', async (request, reply) => {
    const userId = request.session!.user.id;
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid id' });

    const [own] = await app.db
      .select({ id: schema.subscription.id })
      .from(schema.subscription)
      .where(
        and(eq(schema.subscription.id, params.data.id), eq(schema.subscription.userId, userId)),
      )
      .limit(1);
    if (!own) return reply.status(404).send({ error: 'not found' });

    const events = await app.db
      .select()
      .from(schema.subscriptionEvent)
      .where(eq(schema.subscriptionEvent.subscriptionId, params.data.id))
      .orderBy(asc(schema.subscriptionEvent.occurredAt));
    return { items: events };
  });
};

export default subscriptionRoutes;
