// Dev-only email preview endpoint. Returns the rendered { subject, html } for a given
// template + fixture, so we (or curl) can smoke-test parity with the web preview page.
//
// Production guard: any non-development NODE_ENV gets a 403. Auth is intentionally NOT
// required \u2014 the page also unauthenticated calls won't expose user data (fixtures only).

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  EMAIL_TEMPLATE_KINDS,
  type EmailSubscriptionView,
  getEmailTemplate,
} from '@tracksub/shared';
import { env } from '../../env.ts';

const querySchema = z.object({
  template: z.enum(EMAIL_TEMPLATE_KINDS).default('renewal'),
  daysLeft: z.coerce.number().int().min(-30).max(60).default(3),
  name: z.string().trim().min(1).max(200).default('Spotify'),
  vendor: z.string().trim().max(200).optional(),
  amount: z.string().trim().default('59.99'),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/u)
    .default('TRY'),
  /** ISO yyyy-mm-dd; if omitted we anchor `daysLeft` from today. */
  targetDate: z.string().datetime().optional(),
});

const emailPreviewRoutes: FastifyPluginAsync = async (app) => {
  app.get('/dev/email-previews', async (request, reply) => {
    if (env.NODE_ENV === 'production') {
      return reply.status(403).send({ error: 'disabled in production' });
    }

    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'bad query', issues: parsed.error.issues });
    }
    const q = parsed.data;

    // Anchor target date: if caller didn't pass one, derive from `daysLeft`.
    const target = q.targetDate
      ? new Date(q.targetDate)
      : new Date(Date.now() + q.daysLeft * 86_400_000);

    const isTrial = q.template === 'trial_ending';
    const subscription: EmailSubscriptionView = {
      name: q.name,
      vendor: q.vendor ?? null,
      amount: q.amount,
      currency: q.currency,
      nextBillingAt: isTrial ? null : target,
      trialEndsAt: isTrial ? target : null,
      isTrial,
    };

    const tpl = getEmailTemplate(q.template);
    const renderArgs = { subscription, daysLeft: q.daysLeft };

    return {
      template: q.template,
      subject: tpl.subject(renderArgs),
      html: tpl.html(renderArgs),
      fixture: { ...subscription, daysLeft: q.daysLeft, targetDate: target.toISOString() },
    };
  });
};

export default emailPreviewRoutes;
