// Shared zod primitives used across subscription/candidate/gmail schemas.

import { CANDIDATE_KINDS, PERIODS, SOURCES, STATUSES } from '@tracksub/shared';
import { z } from 'zod';

export const periodEnum = z.enum(PERIODS);
export const statusEnum = z.enum(STATUSES);
export const sourceEnum = z.enum(SOURCES);
export const candidateKindEnum = z.enum(CANDIDATE_KINDS);

// ISO 4217 (loose: 3 uppercase letters). Defaults handled at DB layer.
export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/u, 'currency must be ISO-4217 (3 letters)');

// Numeric stored as string in PG numeric column. Accept number or numeric string.
export const amountSchema = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'number' ? v : Number(v)))
  .refine((n) => Number.isFinite(n) && n >= 0, 'amount must be a non-negative number')
  .transform((n) => n.toFixed(2));

// Permissive ISO datetime / date string → Date.
export const dateSchema = z.coerce.date();
export const optionalDateSchema = dateSchema.optional().nullable();
