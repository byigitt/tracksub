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
  /** Cap on messages returned (we run AI on each → keep it bounded). Default 200. */
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
  const limit = Math.max(1, Math.min(opts.limit ?? 200, 500));

  // Multi-query keyword search. Gmail's `q` operator (server-side full-text)
  // is faster + more precise than fetching 500 mails and filtering client-side.
  // We dispatch several narrow queries in parallel, dedupe, then fetch metadata.
  //
  // Each query targets a distinct subscription "signal":
  const subscriptionQueries: string[] = [
    // TR yenileme/abonelik
    'subject:(yenilendi OR yenilenecek OR "üyelik" OR "aboneliğin" OR "abonelik")',
    // TR fatura/ödeme
    'subject:(fatura OR makbuz OR "ödeme" OR "tahsil" OR "ödenecek")',
    // EN renewal
    'subject:(renewed OR renewal OR "auto-renew" OR "renews on")',
    // EN invoice/receipt
    'subject:(invoice OR receipt OR "thank you for your payment" OR "payment receipt")',
    // EN charged/billed
    'subject:("has been charged" OR "will be charged" OR "upcoming payment" OR "charge" OR billed)',
    // Vendor sender pattern + payment-ish subject
    'from:(billing OR receipts OR invoice OR "no-reply" OR noreply) subject:(payment OR invoice OR receipt OR fatura OR ödeme)',
    // Google's own category — most reliable for purchase confirmations
    'category:purchases',
  ];

  const tryList = async (q: string, max?: number) => {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q,
      maxResults: Math.min(max ?? limit, 500),
    });
    return (res.data.messages ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
  };

  let ids: string[] = [];
  if (opts.query) {
    ids = await tryList(opts.query);
  } else {
    // Run all keyword queries in parallel, each capped so a single keyword
    // can't dominate the result set. Then dedupe + cap to overall limit.
    const perQuery = Math.max(20, Math.ceil((limit / subscriptionQueries.length) * 2));
    const lists = await Promise.all(
      subscriptionQueries.map((q) => tryList(`${baseQuery} ${q}`, perQuery).catch(() => [])),
    );
    const seen = new Set<string>();
    for (const list of lists) {
      for (const id of list) {
        if (seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
        if (ids.length >= limit) break;
      }
      if (ids.length >= limit) break;
    }
    // Last-resort fallback: if keyword search caught nothing (very empty inbox
    // or unusual locale), at least pull Google's purchases category.
    if (ids.length === 0) {
      ids = await tryList(`${baseQuery} category:purchases`);
    }
  }
  if (ids.length === 0) return [];

  // Per-message body cap. With many mails we keep bodies tiny to bound prompt size.
  const bodyCap = limit > 50 ? 1500 : limit > 25 ? 3000 : 6000;

  // Strategy: with metadata-only format (no body fetched) Gmail returns ~10x smaller
  // payloads and is 2-5x faster. The `snippet` field is auto-generated by Gmail
  // (~200 chars summary) and is good enough for AI to spot subscription mails.
  // For the bigger limit case we still drop to metadata; for small limits we go full.
  const useMetadataOnly = limit > 50;

  // Run gets in parallel — Gmail quota is 250 units/sec/user, get=5 units → 50 concurrent
  // is safe. Sequential 500 fetches takes ~100s; this finishes in 5-10s.
  const concurrency = 50;
  const messages: FetchedMessage[] = new Array(ids.length);
  let cursor = 0;

  const fetchOne = async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= ids.length) return;
      const id = ids[idx]!;
      try {
        const res = await gmail.users.messages.get({
          userId: 'me',
          id,
          format: useMetadataOnly ? 'metadata' : 'full',
          metadataHeaders: useMetadataOnly ? ['Date', 'From', 'To', 'Subject'] : undefined,
        });
        const m = res.data;
        const headers = m.payload?.headers ?? undefined;
        const body = useMetadataOnly
          ? '' // body skipped; AI will work off snippet + subject + from
          : extractBody(m.payload as Part | null | undefined).slice(0, bodyCap);
        messages[idx] = {
          id,
          threadId: m.threadId ?? id,
          date: headerValue(headers, 'Date'),
          from: headerValue(headers, 'From'),
          to: headerValue(headers, 'To'),
          subject: headerValue(headers, 'Subject'),
          snippet: m.snippet ?? '',
          body,
        };
      } catch {
        // skip individual message failures, continue
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, fetchOne));
  // Filter out any holes from individual failures.
  return messages.filter((m): m is FetchedMessage => Boolean(m));
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
