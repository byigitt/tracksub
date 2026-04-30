// Gmail API helper — fetch recent inbox messages and decode their bodies.
// Uses googleapis with an OAuth2 client driven by an existing access token.
// Token refresh is handled by the caller (see modules/gmail/routes.ts).

import { google } from 'googleapis';

export type FetchedMessage = {
  id: string;
  threadId: string;
  date: string | null;
  from: string | null;
  to: string | null;
  subject: string | null;
  snippet: string;
  body: string; // text/plain preferred, fallback to text/html stripped
};

const decodeBase64Url = (input: string): string => {
  const b64 = input.replace(/-/gu, '+').replace(/_/gu, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, 'base64').toString('utf8');
};

const stripHtml = (html: string): string =>
  html
    .replace(/<style[\s\S]*?<\/style>/gu, '')
    .replace(/<script[\s\S]*?<\/script>/gu, '')
    .replace(/<\/?[^>]+>/gu, ' ')
    .replace(/&nbsp;/gu, ' ')
    .replace(/&amp;/gu, '&')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/\s+/gu, ' ')
    .trim();

type Part = {
  mimeType?: string | null;
  body?: { data?: string | null } | null | undefined;
  parts?: Part[] | null;
};

const extractBody = (payload: Part | null | undefined): string => {
  if (!payload) return '';
  // Walk the part tree, prefer text/plain.
  const collect = (parts: Part[], mime: string): string => {
    for (const p of parts) {
      if (p.mimeType === mime && p.body?.data) {
        return decodeBase64Url(p.body.data);
      }
      if (p.parts && p.parts.length > 0) {
        const inner = collect(p.parts, mime);
        if (inner) return inner;
      }
    }
    return '';
  };
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts && payload.parts.length > 0) {
    const txt = collect(payload.parts, 'text/plain');
    if (txt) return txt;
    const html = collect(payload.parts, 'text/html');
    if (html) return stripHtml(html);
  }
  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    return payload.mimeType === 'text/html' ? stripHtml(decoded) : decoded;
  }
  return '';
};

const headerValue = (
  headers: Array<{ name?: string | null; value?: string | null }> | undefined,
  name: string,
): string | null => {
  if (!headers) return null;
  const lower = name.toLowerCase();
  for (const h of headers) {
    if (h.name && h.name.toLowerCase() === lower) return h.value ?? null;
  }
  return null;
};

export type FetchOptions = {
  accessToken: string;
  refreshToken?: string | null;
  clientId: string;
  clientSecret: string;
  /** How far back to look. Default 90 days. */
  sinceDays?: number;
  /** Optional Gmail search query (added to the date filter). */
  query?: string;
  /** Cap on messages returned (we run AI on each → keep it modest). Default 25. */
  limit?: number;
};

export const fetchRecentMessages = async (opts: FetchOptions): Promise<FetchedMessage[]> => {
  const oauth2 = new google.auth.OAuth2(opts.clientId, opts.clientSecret);
  oauth2.setCredentials({
    access_token: opts.accessToken,
    refresh_token: opts.refreshToken ?? undefined,
  });
  const gmail = google.gmail({ version: 'v1', auth: oauth2 });

  const days = opts.sinceDays ?? 90;
  const sinceTs = Math.floor(Date.now() / 1000) - days * 86400;
  const baseQuery = `after:${sinceTs}`;
  // Heuristic: limit to mail that smells like billing / subscription.
  // Note: Gmail search treats unquoted multi-word terms as AND, so we list each
  // payment-related keyword separately rather than using quoted strings.
  const subscriptionHints =
    '(subject:(invoice OR receipt OR subscription OR renewal OR yenileme OR fatura OR makbuz OR odeme) OR from:(billing OR noreply OR no-reply))';
  const q = opts.query ?? `${baseQuery} ${subscriptionHints}`;
  const limit = Math.max(1, Math.min(opts.limit ?? 25, 100));

  const list = await gmail.users.messages.list({
    userId: 'me',
    q,
    maxResults: limit,
  });
  const ids = (list.data.messages ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  const messages: FetchedMessage[] = [];
  for (const id of ids) {
    try {
      const res = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
      const m = res.data;
      const headers = m.payload?.headers ?? undefined;
      const body = extractBody(m.payload as Part | null | undefined).slice(0, 8000);
      messages.push({
        id,
        threadId: m.threadId ?? id,
        date: headerValue(headers, 'Date'),
        from: headerValue(headers, 'From'),
        to: headerValue(headers, 'To'),
        subject: headerValue(headers, 'Subject'),
        snippet: m.snippet ?? '',
        body,
      });
    } catch {
      // skip individual message failures, continue
    }
  }
  return messages;
};

export const buildPromptFromMessages = (messages: FetchedMessage[]): string => {
  // Trim per-message and concatenate.
  return messages
    .map((m, i) => {
      const head = [
        `--- MESSAGE ${i + 1} ---`,
        m.date ? `Date: ${m.date}` : '',
        m.from ? `From: ${m.from}` : '',
        m.subject ? `Subject: ${m.subject}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      const body = m.body || m.snippet;
      return `${head}\n\n${body}`;
    })
    .join('\n\n');
};
