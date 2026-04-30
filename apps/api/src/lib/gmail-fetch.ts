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
  // Coverage strategy: cast a very wide net with 40+ targeted queries dispatched
  // in parallel. Wall time = slowest single query (~300-500ms), so adding more
  // queries is essentially free. Quota: 40 list × 5 = 200 units (under 250/sec/user).
  const subscriptionQueries: string[] = [
    // ============================================================
    // TURKISH — renewal/membership/plan
    // ============================================================
    'subject:(yenilendi OR yenilenecek OR yenileniyor OR "yenileme tarihi" OR "yenileme bilgisi")',
    'subject:("üyeliğin" OR "üyeliğiniz" OR "üyelik" OR "üyeliğimiz" OR "premium üye")',
    'subject:("abonelik" OR "aboneliğin" OR "aboneliğiniz" OR "abonelii" OR "abone")',
    'subject:("paketin" OR "paketiniz" OR "planiniz" OR "planın" OR "tarifeniz" OR "tarifen")',
    'subject:("hizmet bedeli" OR "ücret" OR "ücretler" OR "ücretlendirme" OR "ücreti")',
    // ============================================================
    // TURKISH — payment / invoice / receipt
    // ============================================================
    'subject:(fatura OR faturanız OR faturan OR "fatura bilgisi" OR "fatura dönemi")',
    'subject:(makbuz OR "e-fatura" OR "e-makbuz" OR "satış makbuzu" OR dekont)',
    'subject:("ödeme" OR "ödemen" OR "ödemeniz" OR "ödenecek" OR "ödeniyor")',
    'subject:("tahsil" OR "tahsilat" OR "çekildi" OR "çekilecek" OR "çekilen")',
    'subject:("hesabınızdan" OR "hesabından" OR "kartınızdan" OR "kartından" OR "kredi kartı")',
    'subject:("otomatik ödeme" OR "sonraki ödeme" OR "sonraki yenileme" OR "yenileme ücreti")',
    // ============================================================
    // ENGLISH — subscription / renewal / membership
    // ============================================================
    'subject:(renewed OR renewal OR "auto-renew" OR "auto-renewed" OR "auto renewal")',
    'subject:("renews on" OR "renewal date" OR "will renew" OR "renewing soon")',
    'subject:("your subscription" OR "subscription confirmation" OR "subscription renewed" OR "subscription update")',
    'subject:("membership renewed" OR "membership renewal" OR "membership confirmation" OR "member benefits")',
    'subject:("plan renewed" OR "plan renewal" OR "upgrade your plan" OR "current plan")',
    // ============================================================
    // ENGLISH — next charge / upcoming
    // ============================================================
    'subject:("next billing" OR "next charge" OR "upcoming bill" OR "upcoming charge" OR "upcoming payment")',
    'subject:("due on" OR "due soon" OR "due tomorrow" OR "payment due" OR "bill due")',
    'subject:("will be charged" OR "will charge" OR "will be billed" OR "will renew")',
    // ============================================================
    // ENGLISH — invoice / receipt / payment
    // ============================================================
    'subject:(invoice OR "your invoice" OR "new invoice" OR "monthly invoice" OR "invoice for")',
    'subject:(receipt OR "your receipt" OR "order receipt" OR "payment receipt" OR "receipt for")',
    'subject:("thank you for your payment" OR "payment received" OR "payment confirmation" OR "payment successful")',
    'subject:("has been charged" OR "successfully charged" OR "we charged" OR "charge confirmation" OR "card charged")',
    'subject:("your bill" OR "monthly bill" OR "annual bill" OR "bill is ready" OR "bill statement")',
    'subject:(billed OR "auto-billed" OR "billing statement" OR "billing summary" OR "billed monthly")',
    'subject:("monthly fee" OR "annual fee" OR "membership fee" OR "service fee" OR "yearly plan")',
    // ============================================================
    // ENGLISH — dunning / payment-failure (also abonelik dönüşümü)
    // ============================================================
    'subject:("payment failed" OR "card declined" OR "renew now" OR "action required" OR "update payment")',
    // ============================================================
    // VENDOR senders — known subscription mailers
    // ============================================================
    'from:(no_reply@email.apple.com OR no-reply@email.apple.com OR appstore@apple.com)',
    'from:(no-reply@spotify.com OR info@spotify.com OR no-reply@spotifymail.com)',
    'from:(account-update@amazon.com OR no-reply@amazon.com OR auto-confirm@amazon.com) subject:(subscription OR prime OR membership OR renewal)',
    'from:(noreply@github.com OR billing@github.com) subject:(invoice OR receipt OR billing OR subscription)',
    'from:(billing@netflix.com OR info@account.netflix.com OR info@mailer.netflix.com OR netflix.com)',
    'from:(no-reply@google.com OR payments-noreply@google.com OR googleworkspace-noreply@google.com) subject:(subscription OR receipt OR invoice OR "google one" OR workspace OR "youtube premium")',
    'from:(no-reply@hetzner.com OR robot-noreply@hetzner.com)',
    'from:(billing@cloudflare.com OR noreply@cloudflare.com OR notify@cloudflare.com)',
    'from:(receipts@stripe.com OR notifications@stripe.com OR no-reply@stripe.com OR support@stripe.com)',
    'from:(billing@figma.com OR billing@notion.so OR receipts@linear.app OR billing@vercel.com OR billing@anthropic.com OR billing@openai.com OR receipts@openai.com)',
    'from:(no-reply@dropbox.com OR no-reply@dropboxmail.com OR billing@dropbox.com)',
    'from:(message@iyzico.com OR noreply@iyzico.com OR no-reply@paypal.com OR service@paypal.com OR receipts@paypal.com)',
    'from:(no-reply@adobe.com OR mail@adobe.com OR message@adobe.com) subject:(subscription OR plan OR invoice OR receipt)',
    'from:(no-reply@microsoft.com OR microsoft-noreply@microsoft.com OR account-security-noreply@accountprotection.microsoft.com) subject:(subscription OR "microsoft 365" OR receipt OR invoice OR "office 365")',
    // -- TR brands
    'from:(noreply@blutv.com.tr OR no-reply@exxen.com OR noreply@gain.com.tr OR no-reply@tabii.com OR noreply@hepsiburada.com)',
    // -- Telcos / ISPs (TR)
    'from:(efatura@turktelekom.com.tr OR fatura@turkcell.com.tr OR fatura@vodafone.com.tr OR ttnet@turktelekom.com.tr)',
    // ============================================================
    // Gmail's own categorizer — most reliable
    // ============================================================
    'category:purchases',
    'category:forums subject:(invoice OR receipt OR subscription OR billing OR fatura OR ödeme)',
    'category:updates subject:(invoice OR receipt OR subscription OR billing OR fatura OR ödeme OR üyelik OR yenileme)',
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
