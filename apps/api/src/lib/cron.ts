// Daily 09:00 Europe/Istanbul reminder cron. Disabled when Google OAuth env is
// missing (we have nothing to send through). Single shared schedule for all users.

import cron from 'node-cron';
import type { FastifyInstance } from 'fastify';
import { env, features } from '../env.ts';
import { rollPastDueSubscriptions, runReminders } from './reminder-runner.ts';

let scheduled = false;

export const startCron = (app: FastifyInstance): void => {
  if (scheduled) return;
  if (!features.google) {
    app.log.warn(
      'cron: GOOGLE_CLIENT_ID/SECRET missing — reminder cron disabled (no way to send mail)',
    );
    return;
  }

  // Every day at 09:00 in REMINDER_TZ.
  cron.schedule(
    '0 9 * * *',
    async () => {
      app.log.info({ msg: 'cron: reminder run start', tz: env.REMINDER_TZ });
      try {
        const rolled = await rollPastDueSubscriptions(new Date());
        if (rolled > 0) app.log.info({ msg: 'cron: rolled past-due subs', rolled });
        const outcomes = await runReminders(new Date(), app.log);
        app.log.info({ msg: 'cron: reminder run done', count: outcomes.length });
      } catch (err) {
        app.log.error({ err: (err as Error).message }, 'cron: reminder run crashed');
      }
    },
    { timezone: env.REMINDER_TZ },
  );

  scheduled = true;
  app.log.info({
    msg: 'cron: reminder schedule installed',
    cron: '0 9 * * *',
    tz: env.REMINDER_TZ,
  });

  app.addHook('onClose', async () => {
    // node-cron has no global stop; keep scheduled flag so re-bootstrap is idempotent.
    scheduled = false;
  });
};
