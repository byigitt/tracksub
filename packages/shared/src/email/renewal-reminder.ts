// Renewal reminder \u2014 sent before a paid subscription auto-renews.
// Identical copy to the original `apps/api/src/lib/mailer.ts` rendering, just relocated
// so the web preview page can render the exact same HTML in an iframe.

import type { EmailRenderArgs, EmailTemplate } from './types.ts';
import { dayPhrase, escapeHtml, fmtDate, fmtMoney } from './common.ts';

const subject = ({ subscription, daysLeft }: EmailRenderArgs): string => {
  if (daysLeft <= 0) return `[tracksub] ${subscription.name} bug\u00fcn yenilenecek`;
  if (daysLeft === 1) return `[tracksub] ${subscription.name} yar\u0131n yenilenecek`;
  return `[tracksub] ${subscription.name} ${daysLeft} g\u00fcn sonra yenilenecek`;
};

const html = ({ subscription, daysLeft }: EmailRenderArgs): string => {
  const name = escapeHtml(subscription.name);
  const vendor = subscription.vendor ? escapeHtml(subscription.vendor) : null;
  const amount = fmtMoney(subscription.amount, subscription.currency);
  const renewal = fmtDate(subscription.nextBillingAt);

  let dayLine: string;
  if (daysLeft <= 0) dayLine = '<strong>Bug\u00fcn</strong> yenilenecek.';
  else if (daysLeft === 1) dayLine = '<strong>Yar\u0131n</strong> yenilenecek.';
  else dayLine = `<strong>${daysLeft} g\u00fcn</strong> sonra yenilenecek.`;

  // Quiet "X g\u00fcn sonra/yar\u0131n/bug\u00fcn" word reused via dayPhrase() in the meta line for variety.
  const phrase = dayPhrase(daysLeft);

  return `<!doctype html>
<html lang="tr">
  <body style="font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color:#111; max-width:560px; margin:0 auto; padding:24px;">
    <p style="font-size:12px; color:#666; margin:0 0 8px;">tracksub \u00b7 hat\u0131rlat\u0131c\u0131 \u00b7 ${escapeHtml(phrase)}</p>
    <h1 style="font-size:18px; margin:0 0 12px;">${name}</h1>
    <p style="margin:0 0 16px; font-size:14px;">${dayLine}</p>
    <table style="border-collapse:collapse; font-size:14px;">
      <tr><td style="padding:4px 12px 4px 0; color:#666;">Tutar</td><td><strong>${amount}</strong></td></tr>
      ${vendor ? `<tr><td style="padding:4px 12px 4px 0; color:#666;">Sa\u011flay\u0131c\u0131</td><td>${vendor}</td></tr>` : ''}
      <tr><td style="padding:4px 12px 4px 0; color:#666;">Yenileme</td><td>${renewal}</td></tr>
    </table>
    <p style="margin:24px 0 0; font-size:12px; color:#888;">
      Bu mail tracksub taraf\u0131ndan kendi Gmail'inden, kendi ad\u0131na g\u00f6nderildi.
    </p>
  </body>
</html>`;
};

export const renewalReminderTemplate: EmailTemplate = {
  kind: 'renewal',
  label: 'Yenileme hat\u0131rlat\u0131c\u0131',
  subject,
  html,
};
