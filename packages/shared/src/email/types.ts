// Shared email-template contracts. Pure data in / strings out — no Node-only deps,
// so the same modules render in API (Gmail send) and web (preview iframe).

export type EmailTemplateKind = 'renewal' | 'trial_ending';

export const EMAIL_TEMPLATE_KINDS = ['renewal', 'trial_ending'] as const satisfies readonly [
  EmailTemplateKind,
  EmailTemplateKind,
];

/**
 * Minimal subscription shape needed by the email templates.
 * Intentionally permissive on dates (`Date | string | null`) so both the API DB row
 * (Drizzle returns `Date`) and the wire/web `Subscription` (ISO `string`) can be passed
 * directly without an adapter. The templates always normalize via `fmtDate`.
 */
export type EmailSubscriptionView = {
  name: string;
  vendor: string | null;
  amount: string | number;
  currency: string;
  nextBillingAt: Date | string | null;
  trialEndsAt: Date | string | null;
  isTrial: boolean;
};

export type EmailRenderArgs = {
  subscription: EmailSubscriptionView;
  /** Whole-day offset; 0 = today, 1 = tomorrow, 3/7 = N days out. Negative is past-due. */
  daysLeft: number;
};

export type EmailTemplate = {
  kind: EmailTemplateKind;
  /** Short, human-readable label (TR) for the preview UI. */
  label: string;
  subject: (args: EmailRenderArgs) => string;
  html: (args: EmailRenderArgs) => string;
};
