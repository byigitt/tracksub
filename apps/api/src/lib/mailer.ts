// Reminder mailer — sends through the user's own Gmail using OAuth `gmail.send` scope.
// No SMTP/App Password — pure OAuth. Message is encoded as a raw RFC 822 string,
// base64url-armored, and POSTed to gmail.users.messages.send.
//
// Subject + HTML rendering lives in `@tracksub/shared/email/*` so the web preview
// page renders the exact same output (single source of truth).

import { google } from 'googleapis';
import { env } from '../env.ts';
import type { Subscription } from '../db/schema.ts';
import { getEmailTemplate, type EmailTemplateKind } from '@tracksub/shared';
import { getGoogleToken, hasScope } from './google-token.ts';

const SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

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
  /** Which template to render. Defaults to `renewal` for back-compat. */
  template?: EmailTemplateKind;
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

  const tpl = getEmailTemplate(args.template ?? 'renewal');
  const renderArgs = { subscription: args.subscription, daysLeft: args.daysLeft };
  const subject = tpl.subject(renderArgs);
  const html = tpl.html(renderArgs);
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
