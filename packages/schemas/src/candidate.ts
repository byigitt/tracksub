import { z } from 'zod';
import { candidateKindEnum, periodEnum } from './_common.ts';

// `kind` ayırımı (AI gözlemi):
//   existing  — zaten alınmış, yenilenmiş, aktif abonelik (mailde "yenilendi", "tahsil edildi")
//   upcoming  — gelecekte tahsil edilecek fatura ("due on", "will be charged", "upcoming payment")
//   offer     — reklam/upsell/teklif ("upgrade", "plan is $X/mo", "Try free")
// UI bunları farklı gösterir; offer'lar default seçili gelmez.

// Strict shape used after we filter incomplete AI outputs out.
export const candidateSchema = z.object({
  name: z.string().min(1).max(200),
  vendor: z.string().max(200).optional().nullable(),
  amount: z.number().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/u),
  period: periodEnum,
  customPeriodDays: z.number().int().positive().max(3650).optional().nullable(),
  /** ISO date — when AI thinks this charge ALREADY happened (existing kind). */
  lastChargedDate: z.string().nullable().optional(),
  /** ISO date — when AI thinks the NEXT charge will happen (upcoming/existing). */
  nextBillingDate: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  evidence: z.string().max(1000).optional().nullable(),
  kind: candidateKindEnum.default('existing'),
  /** How many mails the same logical subscription was found in (post-dedupe). */
  occurrenceCount: z.number().int().min(1).optional(),
});

export const candidateListSchema = z.array(candidateSchema);
export type CandidateInput = z.infer<typeof candidateSchema>;

// Lenient shape — the AI sometimes emits half-baked rows (null amount, missing
// currency, lower-case period, etc.). We accept those leniently then either fix
// or drop them in `parseSubscriptionsFromText`.
export const candidateLenientSchema = z
  .object({
    name: z.unknown(),
    vendor: z.unknown().optional(),
    amount: z.unknown().optional(),
    currency: z.unknown().optional(),
    period: z.unknown().optional(),
    customPeriodDays: z.unknown().optional(),
    nextBillingDate: z.unknown().optional(),
    confidence: z.unknown().optional(),
    evidence: z.unknown().optional(),
  })
  .passthrough();

export const candidateListLenientSchema = z.array(candidateLenientSchema);

export const pasteParseSchema = z.object({
  text: z.string().trim().min(10, 'paste at least a few lines').max(50_000),
});
export type PasteParseInput = z.infer<typeof pasteParseSchema>;

export const fromCandidateSchema = z.object({
  jobId: z.string().min(1),
  candidateIndex: z.number().int().min(0),
});
export type FromCandidateInput = z.infer<typeof fromCandidateSchema>;

export const fromCandidatesSchema = z.object({
  jobId: z.string().min(1),
  indices: z.array(z.number().int().min(0)).min(1).max(200),
});
export type FromCandidatesInput = z.infer<typeof fromCandidatesSchema>;
