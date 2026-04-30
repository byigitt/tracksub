// Reminder mailer — sends through the user's own Gmail using OAuth `gmail.send` scope.
// No SMTP/App Password — pure OAuth. Message is encoded as a raw RFC 822 string,
// base64url-armored, and POSTed to gmail.users.messages.send.

import { google } from 'googleapis';
import { env } from '../env.ts';
import type { Subscription } from '../db/schema.ts';
import { getGoogleToken, hasScope } from './google-token.ts';

const SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

const fmtMoney = (amount: string, currency: string): string => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
};

const fmtDate = (d: Date | null): string => {
  if (!d) return 'belirsiz';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const escapeHtml = (s: string): string =>
  s.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

const subjectFor = (sub: Subscription, daysLeft: number): string => {
  if (daysLeft <= 0) return `[tracksub] ${sub.name} bugün yenilenecek`;
  if (daysLeft === 1) return `[tracksub] ${sub.name} yarın yenilenecek`;
  return `[tracksub] ${sub.name} ${daysLeft} gün sonra yenilenecek`;
};

const renderHtml = (sub: Subscription, daysLeft: number): string => {
  const name = escapeHtml(sub.name);
  const vendor = sub.vendor ? escapeHtml(sub.vendor) : null;
  const amount = fmtMoney(sub.amount, sub.currency);
  const renewal = fmtDate(sub.nextBillingAt);
  const dayLine =
    daysLeft <= 0
      ? '<strong>Bugün</strong> yenilenecek.'
      : daysLeft === 1
        ? '<strong>Yarın</strong> yenilenecek.'
        : `<strong>${daysLeft} gün</strong> sonra yenilenecek.`;
  return `<!doctype html>
<html lang="tr">
  <body style="font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color:#111; max-width:560px; margin:0 auto; padding:24px;">
    <p style="font-size:12px; color:#666; margin:0 0 8px;">tracksub · hatırlatıcı</p>
    <h1 style="font-size:18px; margin:0 0 12px;">${name}</h1>
    <p style="margin:0 0 16px; font-size:14px;">${dayLine}</p>
    <table style="border-collapse:collapse; font-size:14px;">
      <tr><td style="padding:4px 12px 4px 0; color:#666;">Tutar</td><td><strong>${amount}</strong></td></tr>
      ${vendor ? `<tr><td style="padding:4px 12px 4px 0; color:#666;">Sağlayıcı</td><td>${vendor}</td></tr>` : ''}
      <tr><td style="padding:4px 12px 4px 0; color:#666;">Yenileme</td><td>${renewal}</td></tr>
    </table>
    <p style="margin:24px 0 0; font-size:12px; color:#888;">
      Bu mail tracksub tarafından kendi Gmail'inden, kendi adına gönderildi.
    </p>
  </body>
</html>`;
};

const buildRawMessage = (to: string, from: string, subject: string, html: string): string => {
  // Encode subject as RFC 2047 to safely carry non-ASCII chars (TR).
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html, 'utf8').toString('base64'),
  ];
  return lines.join('\r\n');
};

const toBase64Url = (s: string): string =>
  Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/=+$/u, '');

export type SendReminderArgs = {
  userId: string;
  to: string;
  subscription: Subscription;
  daysLeft: number;
};

export type SendReminderResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string; reason: 'no_token' | 'no_scope' | 'send_failed' };

export const sendReminderViaGmail = async (args: SendReminderArgs): Promise<SendReminderResult> => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return { ok: false, error: 'google oauth not configured', reason: 'no_token' };
  }
  const token = await getGoogleToken(args.userId);
  if (!token) return { ok: false, error: 'gmail not linked', reason: 'no_token' };
  if (!hasScope(token.scope, SEND_SCOPE)) {
    return { ok: false, error: 'gmail.send scope missing', reason: 'no_scope' };
  }

  const oauth2 = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
  oauth2.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken ?? undefined,
  });
  const gmail = google.gmail({ version: 'v1', auth: oauth2 });

  const subject = subjectFor(args.subscription, args.daysLeft);
  const html = renderHtml(args.subscription, args.daysLeft);
  const raw = buildRawMessage(args.to, args.to, subject, html);
  const encoded = toBase64Url(raw);

  try {
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encoded },
    });
    return { ok: true, messageId: res.data.id ?? '' };
  } catch (err) {
    return { ok: false, error: (err as Error).message, reason: 'send_failed' };
  }
};
