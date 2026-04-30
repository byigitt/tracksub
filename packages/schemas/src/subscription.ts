import { z } from 'zod';
import {
  amountSchema,
  currencySchema,
  dateSchema,
  optionalDateSchema,
  periodEnum,
  sourceEnum,
  statusEnum,
} from './_common.ts';

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
    isTrial: z.boolean().default(false),
    trialEndsAt: optionalDateSchema,
    notes: z.string().max(2000).optional().nullable(),
    source: sourceEnum.default('manual'),
  })
  .refine(
    (v) =>
      v.period !== 'custom' || (v.customPeriodDays !== null && v.customPeriodDays !== undefined),
    { message: 'customPeriodDays required when period=custom', path: ['customPeriodDays'] },
  )
  .refine((v) => !v.isTrial || (v.trialEndsAt !== null && v.trialEndsAt !== undefined), {
    message: 'trialEndsAt required when isTrial=true',
    path: ['trialEndsAt'],
  });

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
    isTrial: z.boolean().optional(),
    trialEndsAt: optionalDateSchema,
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'no fields to update' });

export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;
