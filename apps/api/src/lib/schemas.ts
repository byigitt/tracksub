// Zod 4 schemas for application API.
// Centralized so both Fastify routes and any internal callers share validation.

import { z } from 'zod';
import { PERIODS, SOURCES, STATUSES } from './period.ts';

const periodEnum = z.enum(PERIODS);
const statusEnum = z.enum(STATUSES);
const sourceEnum = z.enum(SOURCES);

// ISO 4217 (loose: 3 uppercase letters). Defaults handled at DB layer.
const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/u, 'currency must be ISO-4217 (3 letters)');

// Numeric stored as string in PG numeric column. Accept number or numeric string.
const amountSchema = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'number' ? v : Number(v)))
  .refine((n) => Number.isFinite(n) && n >= 0, 'amount must be a non-negative number')
  .transform((n) => n.toFixed(2));

// Permissive ISO datetime / date string → Date.
const dateSchema = z.coerce.date();
const optionalDateSchema = dateSchema.optional().nullable();

export const subscriptionCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'name is required').max(200),
    vendor: z.string().trim().max(200).optional().nullable(),
    amount: amountSchema,
    currency: currencySchema.default('TRY'),
    period: periodEnum,
    customPeriodDays: z.number().int().positive().max(3650).optional().nullable(),
    status: statusEnum.default('active'),
    startedAt: dateSchema.optional(),
    nextBillingAt: optionalDateSchema,
    notes: z.string().max(2000).optional().nullable(),
    source: sourceEnum.default('manual'),
  })
  .refine(
    (v) =>
      v.period !== 'custom' || (v.customPeriodDays !== null && v.customPeriodDays !== undefined),
    { message: 'customPeriodDays required when period=custom', path: ['customPeriodDays'] },
  );

export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;

export const subscriptionUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    vendor: z.string().trim().max(200).optional().nullable(),
    amount: amountSchema.optional(),
    currency: currencySchema.optional(),
    period: periodEnum.optional(),
    customPeriodDays: z.number().int().positive().max(3650).optional().nullable(),
    status: statusEnum.optional(),
    startedAt: dateSchema.optional(),
    nextBillingAt: optionalDateSchema,
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'no fields to update' });

export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;

export const pasteParseSchema = z.object({
  text: z.string().trim().min(10, 'paste at least a few lines').max(50_000),
});
export type PasteParseInput = z.infer<typeof pasteParseSchema>;

export const fromCandidateSchema = z.object({
  jobId: z.string().min(1),
  candidateIndex: z.number().int().min(0),
});
export type FromCandidateInput = z.infer<typeof fromCandidateSchema>;

export const gmailSyncSchema = z.object({
  days: z.number().int().min(1).max(365).default(90),
});
export type GmailSyncInput = z.infer<typeof gmailSyncSchema>;

// ---------------------------------------------------------------------------
// AI candidate shape (returned from fal-llm and stored as JSONB)
// ---------------------------------------------------------------------------

export const candidateSchema = z.object({
  name: z.string().min(1).max(200),
  vendor: z.string().max(200).optional().nullable(),
  amount: z.number().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/u),
  period: periodEnum,
  customPeriodDays: z.number().int().positive().max(3650).optional().nullable(),
  nextBillingDate: z.string().nullable().optional(), // ISO date or null
  confidence: z.number().min(0).max(1),
  evidence: z.string().max(1000).optional().nullable(),
});

export const candidateListSchema = z.array(candidateSchema);
export type Candidate = z.infer<typeof candidateSchema>;
