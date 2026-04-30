import { and, desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { schema } from '../../db/client.ts';
import { env } from '../../env.ts';
import { runReminders } from '../../lib/reminder-runner.ts';

const reminderRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    if (!request.session) return reply.status(401).send({ error: 'unauthorized' });
  });

  // GET /api/reminders — list of past reminder jobs for current user's subs
  app.get('/reminders', async (request) => {
    const userId = request.session!.user.id;
    const rows = await app.db
      .select({
        id: schema.reminderJob.id,
        subscriptionId: schema.reminderJob.subscriptionId,
        subscriptionName: schema.subscription.name,
        dueOffsetDays: schema.reminderJob.dueOffsetDays,
        scheduledFor: schema.reminderJob.scheduledFor,
        sentAt: schema.reminderJob.sentAt,
        status: schema.reminderJob.status,
        error: schema.reminderJob.error,
        createdAt: schema.reminderJob.createdAt,
      })
      .from(schema.reminderJob)
      .innerJoin(schema.subscription, eq(schema.subscription.id, schema.reminderJob.subscriptionId))
      .where(eq(schema.subscription.userId, userId))
      .orderBy(desc(schema.reminderJob.createdAt))
      .limit(100);
    return { items: rows };
  });

  // POST /api/reminders/test — dev-only: manually trigger the reminder run for the
  // current user's subscriptions. Useful while building / verifying e-mail flow.
  app.post('/reminders/test', async (request, reply) => {
    if (env.NODE_ENV === 'production') {
      return reply.status(403).send({ error: 'disabled in production' });
    }
    const userId = request.session!.user.id;
    const outcomes = await runReminders(new Date(), request.log);
    // Filter to current user only — runReminders returns global outcomes.
    return { items: outcomes.filter((o) => o.userId === userId) };
  });

  // POST /api/reminders/send — dev-only: send a one-off reminder for a specific sub
  // bypassing the day window. For UI "Hatırlat" buttons.
  app.post<{ Body: { subscriptionId: string; daysLeft?: number } }>(
    '/reminders/send',
    async (request, reply) => {
      if (env.NODE_ENV === 'production') {
        return reply.status(403).send({ error: 'disabled in production' });
      }
      const userId = request.session!.user.id;
      const { subscriptionId, daysLeft } = request.body ?? { subscriptionId: '' };
      if (!subscriptionId) return reply.status(400).send({ error: 'subscriptionId required' });

      const [sub] = await app.db
        .select()
        .from(schema.subscription)
        .where(
          and(eq(schema.subscription.id, subscriptionId), eq(schema.subscription.userId, userId)),
        )
        .limit(1);
      if (!sub) return reply.status(404).send({ error: 'not found' });

      const [user] = await app.db
        .select({ email: schema.user.email })
        .from(schema.user)
        .where(eq(schema.user.id, userId))
        .limit(1);
      if (!user) return reply.status(404).send({ error: 'user missing' });

      const { sendReminderViaGmail } = await import('../../lib/mailer.ts');
      const result = await sendReminderViaGmail({
        userId,
        to: user.email,
        subscription: sub,
        daysLeft: daysLeft ?? 0,
        template: sub.isTrial ? 'trial_ending' : 'renewal',
      });
      if (!result.ok) return reply.status(502).send(result);
      return result;
    },
  );
};

export default reminderRoutes;
