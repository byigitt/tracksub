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
Kullanıcı sana ham bir mail/metin verecek. Görevin: BU METİNDEN sadece **gerçek, yenilenen ücretli abonelikleri** JSON olarak çıkarmak.

Çıktı KESİNLİKLE şu formatta SADECE bir JSON array olmalı (markdown fence YOK, açıklama YOK):

[
  {
    "name": "Netflix",
    "vendor": "Netflix Inc." | null,
    "amount": 229.99,
    "currency": "TRY",
    "period": "monthly",
    "customPeriodDays": null,
    "nextBillingDate": "2026-05-15" | null,
    "confidence": 0.92,
    "evidence": "Aylık 229,99 TL"
  }
]

ZORUNLU KURALLAR (ihlal etme):
- **amount** ve **currency** zorunlu. Tutar veya para birimi belirsizse O ADAYI EKLEME, atla.
- amount sayısal olmalı (string, null, "unknown" yasak). Birden fazla tutar varsa periyodik olanı al, kerelik fırsatı/iade'yi atla.
- currency 3 harfli ISO 4217 (TRY, USD, EUR, GBP). Sembolden çıkar: ₺/TL→TRY, $→USD, €→EUR, £→GBP.
- period: daily|weekly|monthly|quarterly|yearly|one_time|custom. Şüphedeysen monthly varsay.
- Türkçe ondalık virgüllü ("229,99" → 229.99).
- **Şunlar abonelik DEĞİL — atla**:
  - Reklam/promosyon/kampanya mailleri ("özel fırsat", "%50 indirim", "kazanma şansı", "fırsatlar")
  - Newsletter/bülten (yazılım ürün duyuruları, blog özetleri)
  - Sipariş/kargo/iade bildirimleri (tek seferlik alışveriş)
  - GitHub/CI/code review/security alert mailleri
  - Hesap açtın/sosyal medya bildirimleri/bahsetme bildirimleri
  - Sadece bir tutar içeren rastgele bildirimler (ödeme onayı olmayan)
- Yenilemeyi/yenilendiğini/aktif aboneliği NET gösterenler kabul. Örnek: "üyeliğin yenilendi", "X TL hesabından tahsil edildi", "renews on", "next charge", "subscription auto-renewed".
- Hiç gerçek abonelik yoksa boş array [] döndür.
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
      const candidate = {
        name: typeof row.name === 'string' ? row.name : '',
        vendor: typeof row.vendor === 'string' ? row.vendor : null,
        amount: amountNum,
        currency,
        period,
        customPeriodDays: typeof row.customPeriodDays === 'number' ? row.customPeriodDays : null,
        nextBillingDate: typeof row.nextBillingDate === 'string' ? row.nextBillingDate : null,
        confidence:
          typeof row.confidence === 'number' ? Math.min(1, Math.max(0, row.confidence)) : 0.5,
        evidence: typeof row.evidence === 'string' ? row.evidence : null,
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
