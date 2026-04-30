// fal.ai any-llm wrapper — extract subscription candidates from arbitrary text.
// Uses `@fal-ai/client` against the `fal-ai/any-llm` endpoint.
// Model id is openrouter-style ("openai/gpt-4o", "google/gemini-2.5-flash", ...).

import { fal } from '@fal-ai/client';
import { env, features } from '../env.ts';
import { candidateListLenientSchema, candidateSchema, type Candidate } from './schemas.ts';
import { PERIODS, type Period } from './period.ts';

let configured = false;
const ensureConfigured = (): boolean => {
  if (!features.ai || !env.FAL_KEY) return false;
  if (configured) return true;
  fal.config({ credentials: env.FAL_KEY });
  configured = true;
  return true;
};

const SYSTEM_PROMPT = `Sen abonelik çıkarımı yapan katı bir AI asistanısın.
Kullanıcı sana ham mail metni verecek. Görevin: ücretli abonelikleri JSON olarak çıkarmak ve **kind** + **tarihler**'i doğru işaretlemek.

Çıktı KESİNLİKLE şu formatta SADECE bir JSON array olmalı (markdown fence YOK, açıklama YOK):

[
  {
    "name": "Netflix",
    "vendor": "Netflix Inc." | null,
    "amount": 229.99,
    "currency": "TRY",
    "period": "monthly",
    "customPeriodDays": null,
    "lastChargedDate": "2026-04-15" | null,
    "nextBillingDate": "2026-05-15" | null,
    "confidence": 0.92,
    "evidence": "Aylık 229,99 TL 15 Nisan'da tahsil edildi",
    "kind": "existing"
  }
]

## kind — ÇOK ÖNEMLİ (3 türden BIRINI seç)

- **"existing"** — Para zaten alınmış, mevcut aktif abonelik.
  Sinyaller: "yenilendi", "tahsil edildi", "ödemen alındı", "thanks for your payment", "invoice paid", "successfully charged", "makbuz".

- **"upcoming"** — Henüz alınmadı ama EDILECEK; kullanıcı zaten abone.
  Sinyaller: "will be charged", "due on", "upcoming payment", "yenilenecek", "ödeneceiniz", "will soon be debited".

- **"offer"** — Satış teklifi, upsell, reklam. Kullanıcı şu an abone DEĞİL.
  Sinyaller: "yükseltin", "upgrade", "try free", "plan is $X/mo", "%X indirim", "sign up", "start your subscription".

Kararlı olamazsan **existing** seç.

## Tarihler — ÇOK ÖNEMLİ

Her mailde "Date: ..." header'ı görüyorsun. Bunları ISO 8601 ("2026-04-15") formatında yaz:

- **lastChargedDate** — paranın alındığı tarih.
  - Mail metninde açık tarih varsa ("15 Nisan'da tahsil edildi") onu yaz.
  - **kind=existing ise mail header Date'ini kullan** (mail gönderildiğinde ödeme yeni alınmış demektir).
  - kind=upcoming/offer ise null bırak.

- **nextBillingDate** — BIR SONRAKI tahsilat tarihi.
  - kind=upcoming: mailde "will be charged on April 28" / "15 Mayıs'ta ödenecek" varsa onu.
  - kind=existing: mailde "sonraki yenileme: 15 Mayıs" varsa onu; yoksa null bırak (server hesaplar).
  - kind=offer: null.

Tarihler ISO 8601 ("2026-04-15") formatında. Belirsizse null — tahmin etme.

## Diğer kurallar

- **amount** ve **currency** zorunlu. Belirsizse o adayı EKLEME, atla.
- amount sayısal (string/null/"unknown" yasak). Birden çok tutar varsa periyodik olanı al.
- amount = 0 anlamsız bildirim ($0.00 invoice gibi) → atla.
- currency: ISO 4217 3 harf. ₺/TL→TRY, $→USD, €→EUR, £→GBP.
- period: daily|weekly|monthly|quarterly|yearly|one_time|custom. Şüphedeysen monthly.
- Türkçe ondalık virgüllü ("229,99" → 229.99).
- evidence: metinden KıSA alıntı (1 cümle).
- **Şunlar abonelik DEĞİL — hiç çıkarma**:
  - Sipariş/kargo/iade bildirimleri
  - GitHub/CI/code review/security alert
  - Hesap açtın/sosyal medya/bahsetme bildirimleri
  - Newsletter, blog özetleri
  - Banka/ekstre toplu özet (e-ekstre, hesap hareketi)
- Hiç abonelik yoksa boş array [] döndür.
- JSON dışında HİÇBİR şey yazma.`;

const stripFences = (raw: string): string => {
  let s = raw.trim();
  // ```json ... ``` veya ``` ... ```
  if (s.startsWith('```')) {
    s = s.replace(/^```[a-zA-Z]*\n?/u, '').replace(/```\s*$/u, '');
  }
  return s.trim();
};

type AnyLlmResult = { output?: unknown };

type Logger = {
  info: (msg: unknown) => void;
  warn: (msg: unknown) => void;
  error: (msg: unknown) => void;
};

export const parseSubscriptionsFromText = async (
  text: string,
  logger?: Logger,
): Promise<{ candidates: Candidate[]; error: string | null }> => {
  if (!ensureConfigured()) {
    return { candidates: [], error: 'AI not configured (FAL_KEY missing)' };
  }

  try {
    const res = await fal.subscribe('fal-ai/any-llm', {
      input: {
        model: env.AI_MODEL,
        system_prompt: SYSTEM_PROMPT,
        prompt: text,
      },
    });
    const data = res.data as AnyLlmResult | undefined;
    const raw = typeof data?.output === 'string' ? data.output : '';
    if (!raw) {
      logger?.warn({ msg: 'fal any-llm returned empty output', requestId: res.requestId });
      return { candidates: [], error: 'empty output' };
    }
    const cleaned = stripFences(raw);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      logger?.warn({ msg: 'fal any-llm output not valid JSON', raw: cleaned.slice(0, 500) });
      return { candidates: [], error: `JSON parse: ${(err as Error).message}` };
    }
    const lenient = candidateListLenientSchema.safeParse(parsed);
    if (!lenient.success) {
      logger?.warn({ msg: 'fal output not an array', issues: lenient.error.issues });
      return { candidates: [], error: 'not an array' };
    }

    // Coerce + filter: AI sometimes emits half-baked rows (null amount, wrong-cased
    // period, missing currency). We silently skip those rather than fail the whole
    // batch — a partial result is more useful than a 502.
    const kept: Candidate[] = [];
    let dropped = 0;
    for (const raw_row of lenient.data) {
      const row = raw_row as Record<string, unknown>;
      const amountNum = typeof row.amount === 'number' ? row.amount : Number(row.amount);
      if (!Number.isFinite(amountNum) || amountNum < 0) {
        dropped++;
        continue;
      }
      const currency =
        typeof row.currency === 'string' && /^[A-Za-z]{3}$/u.test(row.currency)
          ? row.currency.toUpperCase()
          : null;
      if (!currency) {
        dropped++;
        continue;
      }
      const periodRaw = typeof row.period === 'string' ? row.period.toLowerCase() : '';
      const period: Period = (PERIODS as readonly string[]).includes(periodRaw)
        ? (periodRaw as Period)
        : 'monthly';
      const kindRaw = typeof row.kind === 'string' ? row.kind.toLowerCase() : '';
      const kind: 'existing' | 'upcoming' | 'offer' =
        kindRaw === 'upcoming' || kindRaw === 'offer' ? kindRaw : 'existing';

      // Normalize date strings: AI sometimes emits "April 15, 2026", "15 May 2026",
      // "2026-04-15T00:00:00Z". We isolate ISO-shaped substring or fall back to
      // Date.parse, then format as YYYY-MM-DD.
      const normalizeDate = (v: unknown): string | null => {
        if (typeof v !== 'string' || v.length === 0) return null;
        const isoMatch = v.match(/(\d{4})-(\d{2})-(\d{2})/u);
        if (isoMatch) return isoMatch[0]!;
        const t = Date.parse(v);
        if (!Number.isFinite(t)) return null;
        const d = new Date(t);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      };

      const candidate = {
        name: typeof row.name === 'string' ? row.name : '',
        vendor: typeof row.vendor === 'string' ? row.vendor : null,
        amount: amountNum,
        currency,
        period,
        customPeriodDays: typeof row.customPeriodDays === 'number' ? row.customPeriodDays : null,
        lastChargedDate: normalizeDate(row.lastChargedDate),
        nextBillingDate: normalizeDate(row.nextBillingDate),
        confidence:
          typeof row.confidence === 'number' ? Math.min(1, Math.max(0, row.confidence)) : 0.5,
        evidence: typeof row.evidence === 'string' ? row.evidence : null,
        kind,
      };
      const strict = candidateSchema.safeParse(candidate);
      if (strict.success) {
        kept.push(strict.data);
      } else {
        dropped++;
      }
    }
    if (dropped > 0) {
      logger?.info({
        msg: 'fal candidates: dropped incomplete rows',
        kept: kept.length,
        dropped,
      });
    }
    return { candidates: kept, error: null };
  } catch (err) {
    logger?.error({ msg: 'fal any-llm call failed', err: (err as Error).message });
    return { candidates: [], error: (err as Error).message };
  }
};

// ---------------------------------------------------------------------------
// Batched, parallel parse — used by Gmail sync to keep prompts small + fast.
//
// Why batch: 1 prompt of 200 mails (300KB) takes ~60s and confuses the model.
// 25 prompts of 8 mails each, 5 in parallel → ~12s wall time, much sharper output.
// ---------------------------------------------------------------------------

export type BatchInput = { id: string; text: string };

// Tier/edition suffixes that should be stripped before brand matching.
// "Netflix Standard" ≡ "Netflix Premium" ≡ "Netflix" for dedupe purposes.
const TIER_TOKENS = [
  'premium',
  'plus',
  'pro',
  'lite',
  'basic',
  'standard',
  'family',
  'duo',
  'individual',
  'personal',
  'student',
  'business',
  'enterprise',
  'free',
  'unlimited',
  'extra',
  'mini',
  'starter',
  'aile',
  'bireysel',
  'öğrenci',
  'ogrenci',
  'tier',
  'plan',
  'paketi',
  'subscription',
  'aboneliği',
  'aboneligi',
  'üyeliği',
  'uyeligi',
];

const stripDiacritics = (s: string): string => s.normalize('NFD').replace(/[\u0300-\u036f]/gu, '');

const normalizeBrandKey = (name: string, vendor?: string | null): string => {
  // Prefer vendor when present (cleaner: "Netflix Inc." vs name "Netflix Standard").
  let raw = (vendor ?? name).toLowerCase();
  raw = stripDiacritics(raw);
  // Drop common corporate suffixes
  raw = raw.replace(
    /\b(inc|llc|ltd|gmbh|a\.s\.|a\.ş\.|co|corp|corporation|holdings|sarl|sa)\b/giu,
    '',
  );
  // Drop tier/plan tokens
  for (const tok of TIER_TOKENS) {
    raw = raw.replace(new RegExp(`\\b${tok}\\b`, 'giu'), '');
  }
  // Keep only alphanumerics
  raw = raw.replace(/[^a-z0-9]/gu, '');
  return raw || name.toLowerCase().replace(/[^a-z0-9]/gu, '');
};

const pickFreshestDate = (
  a: string | null | undefined,
  b: string | null | undefined,
): string | null => {
  if (!a && !b) return null;
  if (!a) return b ?? null;
  if (!b) return a;
  return a >= b ? a : b; // ISO YYYY-MM-DD compares lexically
};

export const dedupeCandidates = (lists: Candidate[][]): Candidate[] => {
  // Same logical subscription ≡ normalizedBrand + period + currency. Amount is
  // EXCLUDED from the key because vendors raise prices over time — we don't want
  // April Netflix at 229.99 to be a different sub than May Netflix at 249.99.
  type Acc = Candidate & { occurrenceCount?: number };
  const seen = new Map<string, Acc>();
  for (const list of lists) {
    for (const c of list) {
      const brandKey = normalizeBrandKey(c.name, c.vendor);
      const key = `${brandKey}|${c.period}|${c.currency}`;
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, { ...c, occurrenceCount: 1 });
        continue;
      }
      // Merge: keep the higher-confidence base, but always pull freshest dates
      // and bump the occurrence count so UI can show "12 kez algilandı".
      const winner = c.confidence > existing.confidence ? c : existing;
      const merged: Acc = {
        ...winner,
        // Use the more-recent dates from either side.
        lastChargedDate: pickFreshestDate(existing.lastChargedDate, c.lastChargedDate),
        nextBillingDate: pickFreshestDate(existing.nextBillingDate, c.nextBillingDate),
        // Keep the highest-amount when one of the merged rows had a price bump
        // (mostly accurate — avoids "refund" rows pulling amount down).
        amount: Math.max(existing.amount, c.amount),
        confidence: Math.max(existing.confidence, c.confidence),
        occurrenceCount: (existing.occurrenceCount ?? 1) + 1,
      };
      seen.set(key, merged);
    }
  }
  return [...seen.values()].sort((a, b) => b.confidence - a.confidence);
};

const chunk = <T>(arr: T[], size: number): T[][] => {
  if (size < 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const runWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runOne = async (): Promise<void> => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]!, i);
    }
  };
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, runOne);
  await Promise.all(workers);
  return results;
};

export type BatchResult = {
  candidates: Candidate[];
  batchCount: number;
  successCount: number;
  failedCount: number;
  durationMs: number;
};

export const parseSubscriptionsBatched = async (
  inputs: BatchInput[],
  opts: { batchSize?: number; concurrency?: number; logger?: Logger } = {},
): Promise<BatchResult> => {
  const batchSize = opts.batchSize ?? 8;
  const concurrency = opts.concurrency ?? 5;
  const logger = opts.logger;
  const start = Date.now();

  if (inputs.length === 0) {
    return { candidates: [], batchCount: 0, successCount: 0, failedCount: 0, durationMs: 0 };
  }

  const batches = chunk(inputs, batchSize);
  logger?.info({
    msg: 'fal batched parse: start',
    inputs: inputs.length,
    batches: batches.length,
    batchSize,
    concurrency,
  });

  const results = await runWithConcurrency(batches, concurrency, async (batch, idx) => {
    const text = batch
      .map((b, i) => `--- ITEM ${idx * batchSize + i + 1} (id=${b.id}) ---\n${b.text}`)
      .join('\n\n');
    return parseSubscriptionsFromText(text, logger);
  });

  const successful = results.filter((r) => r.error === null);
  const failed = results.length - successful.length;
  const merged = dedupeCandidates(successful.map((r) => r.candidates));
  const durationMs = Date.now() - start;

  logger?.info({
    msg: 'fal batched parse: done',
    candidates: merged.length,
    batches: batches.length,
    successful: successful.length,
    failed,
    durationMs,
  });

  return {
    candidates: merged,
    batchCount: batches.length,
    successCount: successful.length,
    failedCount: failed,
    durationMs,
  };
};
