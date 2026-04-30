// Trial-ending reminder \u2014 sent before a free trial converts into a paid charge.
// Different copy from the renewal template: emphasizes that the trial is ending, not
// that a charge is "renewing", and surfaces the cancel-via-vendor escape hatch.

import type { EmailRenderArgs, EmailTemplate } from './types.ts';
import { dayPhrase, escapeHtml, fmtDate, fmtMoney } from './common.ts';

const subject = ({ subscription, daysLeft }: EmailRenderArgs): string => {
  if (daysLeft <= 0) {
    return `[tracksub] ${subscription.name} deneme s\u00fcresi bug\u00fcn bitiyor`;
  }
  if (daysLeft === 1) {
    return `[tracksub] ${subscription.name} deneme s\u00fcresi yar\u0131n bitiyor`;
  }
  return `[tracksub] ${subscription.name} deneme s\u00fcresi ${daysLeft} g\u00fcn sonra bitiyor`;
};

const html = ({ subscription, daysLeft }: EmailRenderArgs): string => {
  const name = escapeHtml(subscription.name);
  const vendor = subscription.vendor ? escapeHtml(subscription.vendor) : null;
  const amount = fmtMoney(subscription.amount, subscription.currency);
  // Trial subs anchor on `trialEndsAt`, not `nextBillingAt`.
  const trialEnds = fmtDate(subscription.trialEndsAt);
  const phrase = dayPhrase(daysLeft);

  let dayLine: string;
  if (daysLeft <= 0) {
    dayLine = 'Deneme s\u00fcreniz <strong>bug\u00fcn</strong> bitiyor.';
  } else if (daysLeft === 1) {
    dayLine = 'Deneme s\u00fcreniz <strong>yar\u0131n</strong> bitiyor.';
  } else {
    dayLine = `Deneme s\u00fcreniz <strong>${daysLeft} g\u00fcn</strong> sonra bitiyor.`;
  }

  return `<!doctype html>
<html lang="tr">
  <body style="font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color:#111; max-width:560px; margin:0 auto; padding:24px;">
    <p style="font-size:12px; color:#666; margin:0 0 8px;">tracksub \u00b7 deneme hat\u0131rlat\u0131c\u0131s\u0131 \u00b7 ${escapeHtml(phrase)}</p>
    <h1 style="font-size:18px; margin:0 0 12px;">${name}</h1>
    <p style="margin:0 0 8px; font-size:14px;">${dayLine}</p>
    <p style="margin:0 0 16px; font-size:14px; color:#444;">
      Bitiminden sonra <strong>${amount}</strong> \u00fccretlendirileceksiniz.
    </p>
    <table style="border-collapse:collapse; font-size:14px;">
      <tr><td style="padding:4px 12px 4px 0; color:#666;">Plan tutar\u0131</td><td><strong>${amount}</strong></td></tr>
      ${vendor ? `<tr><td style="padding:4px 12px 4px 0; color:#666;">Sa\u011flay\u0131c\u0131</td><td>${vendor}</td></tr>` : ''}
      <tr><td style="padding:4px 12px 4px 0; color:#666;">Deneme biti\u015fi</td><td>${trialEnds}</td></tr>
    </table>
    <p style="margin:20px 0 0; font-size:13px; color:#444;">
      Devam etmek istemiyorsan\u0131z, \u00fccretlendirilmeden \u00f6nce sa\u011flay\u0131c\u0131n\u0131n hesab\u0131n\u0131zdan
      iptal etmeniz gerekir. tracksub iptal i\u015flemini sizin ad\u0131n\u0131za yapamaz.
    </p>
    <p style="margin:24px 0 0; font-size:12px; color:#888;">
      Bu mail tracksub taraf\u0131ndan kendi Gmail'inden, kendi ad\u0131n\u0131za g\u00f6nderildi.
    </p>
  </body>
</html>`;
};

export const trialEndingTemplate: EmailTemplate = {
  kind: 'trial_ending',
  label: 'Deneme s\u00fcresi bitiyor',
  subject,
  html,
};
