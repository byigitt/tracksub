// fal.ai any-llm wrapper — extract subscription candidates from arbitrary text.
// Uses `@fal-ai/client` against the `fal-ai/any-llm` endpoint.
// Model id is openrouter-style ("openai/gpt-4o", "google/gemini-2.5-flash", ...).

import { fal } from '@fal-ai/client';
import { env, features } from '../env.ts';
import { candidateListSchema, type Candidate } from './schemas.ts';

let configured = false;
const ensureConfigured = (): boolean => {
  if (!features.ai || !env.FAL_KEY) return false;
  if (configured) return true;
  fal.config({ credentials: env.FAL_KEY });
  configured = true;
  return true;
};

const SYSTEM_PROMPT = `Sen abonelik çıkarımı yapan bir AI asistanısın.
Kullanıcı sana ham bir mail/metin verecek. Görevin: BU METİNDEN tüm abonelikleri (subscription / recurring payment) JSON olarak çıkarmak.

Çıktı KESİNLİKLE şu formatta SADECE bir JSON array olmalı (markdown fence YOK, açıklama YOK):

[
  {
    "name": "Netflix",                    // Hizmet adı (zorunlu, kısa)
    "vendor": "Netflix Inc.",             // Sağlayıcı (opsiyonel; null olabilir)
    "amount": 229.99,                     // Sayı, KDV/vergi dahil görünen tutar
    "currency": "TRY",                    // ISO 4217 (TRY/USD/EUR/GBP/...)
    "period": "monthly",                  // daily|weekly|monthly|quarterly|yearly|one_time|custom
    "customPeriodDays": null,             // period=custom ise integer; aksi null
    "nextBillingDate": "2026-05-15",     // ISO date veya null
    "confidence": 0.92,                   // 0..1
    "evidence": "Aylık 229,99 TL"        // metinden alıntı (kısa)
  }
]

Kurallar:
- SADECE gerçek abonelik/yenilenen ödemeleri çıkar. Tek seferlik fatura "one_time" olur.
- Tutar belirsizse o adayı atla.
- Para birimi sembolden çıkar: ₺/TL → TRY, $ → USD, € → EUR, £ → GBP.
- Türkçe sayılarda virgül ondalıktır ("229,99" → 229.99).
- Hiç abonelik yoksa boş array [] döndür.
- JSON dışında HİÇBİR şey yazma. Markdown fence kullanma.`;

const stripFences = (raw: string): string => {
  let s = raw.trim();
  // ```json ... ``` veya ``` ... ```
  if (s.startsWith('```')) {
    s = s.replace(/^```[a-zA-Z]*\n?/u, '').replace(/```\s*$/u, '');
  }
  return s.trim();
};

type AnyLlmResult = { output?: unknown };

export const parseSubscriptionsFromText = async (
  text: string,
  logger?: {
    info: (msg: unknown) => void;
    warn: (msg: unknown) => void;
    error: (msg: unknown) => void;
  },
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
    const validated = candidateListSchema.safeParse(parsed);
    if (!validated.success) {
      logger?.warn({ msg: 'candidate schema mismatch', issues: validated.error.issues });
      return { candidates: [], error: 'schema mismatch' };
    }
    return { candidates: validated.data, error: null };
  } catch (err) {
    logger?.error({ msg: 'fal any-llm call failed', err: (err as Error).message });
    return { candidates: [], error: (err as Error).message };
  }
};
