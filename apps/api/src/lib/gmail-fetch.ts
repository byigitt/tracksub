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
  /** Optional logger — we log per-query hit counts when present. */
  logger?: { info: (msg: unknown) => void };
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

  // Multi-query keyword search. Gmail's `q` operator (server-side full-text) is
  // faster + more precise than fetching 500 mails and filtering client-side. We
  // dispatch many narrow queries in parallel, dedupe by ID, then fetch metadata.
  //
  // Quota note: each list = 5 units; 25 queries = 125 units (well under 250/s/user).
  // Wall time is bound by the SLOWEST query (~200-500ms), not the sum.
  //
  // Coverage strategy: TR/EN keywords + vendor sender patterns + Gmail's own
  // categorizer. The same mail will often match multiple queries — dedupe handles
  // it. Goal: cast a wide net for *true* subscription mails while still keeping
  // promotional/marketing mail ("%50 indirim", "yeni ürününüz") out of the result.
  const subscriptionQueries: string[] = [
    // -- Turkish: renewal/membership --
    'subject:(yenilendi OR yenilenecek OR yenileniyor OR "yenileme tarihi")',
    'subject:("üyeliğin" OR "üyeliğiniz" OR "abonelik" OR "aboneliğin" OR "aboneliğiniz" OR "üyelik")',
    'subject:("paketin" OR "paketiniz" OR planiniz OR planın)',
    // -- Turkish: payment/invoice --
    'subject:(fatura OR faturanız OR faturan OR makbuz OR e-fatura OR "e-makbuz")',
    'subject:("ödeme" OR "ödemen" OR "ödemeniz" OR "ödenecek" OR "ödenmiş")',
    'subject:("tahsil" OR "tahsilat" OR "çekildi" OR "hesabınızdan" OR "kartınızdan")',
    // -- English: renewal/subscription --
    'subject:(renewed OR renewal OR "auto-renew" OR "auto-renewed" OR "renews on" OR "renewal date")',
    'subject:("your subscription" OR "subscription confirmation" OR "membership renewed" OR "membership renewal")',
    'subject:("next billing" OR "next charge" OR "upcoming bill" OR "upcoming charge")',
    // -- English: payment/invoice/receipt --
    'subject:(invoice OR receipt OR "order confirmation" OR "order receipt")',
    'subject:("thank you for your payment" OR "payment received" OR "payment confirmation" OR "payment receipt")',
    'subject:("has been charged" OR "will be charged" OR "successfully charged" OR "we charged")',
    'subject:("your bill" OR "monthly bill" OR "annual bill" OR "bill is ready" OR "bill due")',
    'subject:(billed OR "auto-billed" OR "billing statement")',
    // -- Vendor-aware sender patterns + payment subject --
    'from:(billing OR receipts OR invoice OR "no-reply" OR noreply OR notifications) subject:(payment OR invoice OR receipt OR subscription OR fatura OR ödeme OR üyelik)',
    // -- Vendor-specific senders that ALWAYS send subscription mails --
    'from:(no_reply@email.apple.com OR no-reply@spotify.com OR info@spotify.com)',
    'from:(account-update@amazon.com OR no-reply@amazon.com) subject:(subscription OR "prime" OR membership)',
    'from:(noreply@github.com) subject:(invoice OR receipt OR billing OR subscription)',
    'from:(billing@netflix.com OR info@account.netflix.com OR info@mailer.netflix.com)',
    'from:(no-reply@google.com OR payments-noreply@google.com) subject:(subscription OR receipt OR invoice OR "google one")',
    'from:(no-reply@hetzner.com OR robot-noreply@hetzner.com OR billing@cloudflare.com)',
    'from:(receipts@stripe.com OR notifications@stripe.com OR no-reply@stripe.com)',
    'from:(billing@figma.com OR billing@notion.so OR receipts@linear.app OR billing@vercel.com)',
    // -- Gmail's own categorizer — most reliable for true purchase/sub mails --
    'category:purchases',
    // -- Forums: some service bills land here --
    'category:forums subject:(invoice OR receipt OR subscription OR billing OR fatura OR ödeme)',
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
    let totalHits = 0;
    for (const list of lists) {
      totalHits += list.length;
      for (const id of list) {
        if (seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
        if (ids.length >= limit) break;
      }
      if (ids.length >= limit) break;
    }
    if (opts.logger) {
      opts.logger.info({
        msg: 'gmail multi-keyword search',
        queries: subscriptionQueries.length,
        totalHits,
        uniqueIds: ids.length,
        perQueryHits: lists.map((l, i) => ({ q: subscriptionQueries[i], hits: l.length })),
      });
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
