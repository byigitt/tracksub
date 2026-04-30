// Public surface of the shared email-template module.
//
// Used by:
//   - `apps/api/src/lib/mailer.ts`        \u2192 picks a template, renders subject + html,
//                                            wraps in RFC822 + base64url, sends via Gmail.
//   - `apps/web/src/routes/_authenticated.emails.tsx` \u2192 renders the same {subject, html}
//                                            client-side into an <iframe srcDoc>.
//
// Single source of truth for what the user actually receives.

export * from './types.ts';
export * from './common.ts';
export { renewalReminderTemplate } from './renewal-reminder.ts';
export { trialEndingTemplate } from './trial-ending.ts';

import { renewalReminderTemplate } from './renewal-reminder.ts';
import { trialEndingTemplate } from './trial-ending.ts';
import type { EmailTemplate, EmailTemplateKind } from './types.ts';

export const EMAIL_TEMPLATES: Record<EmailTemplateKind, EmailTemplate> = {
  renewal: renewalReminderTemplate,
  trial_ending: trialEndingTemplate,
};

export const getEmailTemplate = (kind: EmailTemplateKind): EmailTemplate => EMAIL_TEMPLATES[kind];
