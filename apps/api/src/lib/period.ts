// Subscription period utilities.
// Period semantics:
//   daily      → +1 day
//   weekly     → +7 days
//   monthly    → +1 month (calendar-aware: 31 Jan + 1mo = 28/29 Feb)
//   quarterly  → +3 months
//   yearly     → +1 year
//   one_time   → no recurrence (returns null)
//   custom     → +customPeriodDays (must be > 0)

export type Period =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'one_time'
  | 'custom';

export const PERIODS = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'one_time',
  'custom',
] as const satisfies readonly Period[];

export type Status = 'active' | 'paused' | 'cancelled' | 'expired';
export const STATUSES = [
  'active',
  'paused',
  'cancelled',
  'expired',
] as const satisfies readonly Status[];

export type Source = 'manual' | 'paste' | 'gmail';
export const SOURCES = ['manual', 'paste', 'gmail'] as const satisfies readonly Source[];

const addDays = (d: Date, n: number): Date => {
  const r = new Date(d.getTime());
  r.setUTCDate(r.getUTCDate() + n);
  return r;
};

const addMonths = (d: Date, n: number): Date => {
  // Calendar-aware month addition. Clamps day to last-day-of-target-month.
  const r = new Date(d.getTime());
  const day = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + n);
  const lastDay = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, lastDay));
  return r;
};

const addYears = (d: Date, n: number): Date => addMonths(d, n * 12);

/**
 * Compute next billing date from a base date + period.
 * Returns `null` for `one_time` (no recurrence) and when `custom` lacks valid days.
 */
export const computeNextBilling = (
  from: Date,
  period: Period,
  customDays: number | null = null,
): Date | null => {
  switch (period) {
    case 'daily':
      return addDays(from, 1);
    case 'weekly':
      return addDays(from, 7);
    case 'monthly':
      return addMonths(from, 1);
    case 'quarterly':
      return addMonths(from, 3);
    case 'yearly':
      return addYears(from, 1);
    case 'one_time':
      return null;
    case 'custom':
      if (customDays === null || !Number.isFinite(customDays) || customDays <= 0) return null;
      return addDays(from, customDays);
  }
};

/**
 * Roll `nextBillingAt` forward until it is in the future.
 * Useful when sub.startedAt is far in the past — we want the next *upcoming* renewal.
 */
export const rollForward = (
  base: Date,
  period: Period,
  customDays: number | null = null,
  now: Date = new Date(),
): Date | null => {
  if (period === 'one_time') return base > now ? base : null;
  let cursor = base;
  let safety = 5000;
  while (cursor <= now && safety-- > 0) {
    const next = computeNextBilling(cursor, period, customDays);
    if (next === null) return null;
    cursor = next;
  }
  return cursor;
};

/** Whole-day difference (target - now). Negative if target is in the past. */
export const daysUntil = (target: Date, now: Date = new Date()): number => {
  const ms = target.getTime() - now.getTime();
  return Math.ceil(ms / 86_400_000);
};

export const REMINDER_OFFSETS = [7, 3, 1, 0] as const;
export type ReminderOffset = (typeof REMINDER_OFFSETS)[number];

/**
 * If `nextBillingAt` falls into one of the reminder windows, return that offset.
 * Otherwise returns `null`. Uses `daysUntil` (whole days, ceil).
 */
export const reminderOffsetFor = (
  nextBillingAt: Date,
  now: Date = new Date(),
): ReminderOffset | null => {
  const d = daysUntil(nextBillingAt, now);
  return (REMINDER_OFFSETS as readonly number[]).includes(d) ? (d as ReminderOffset) : null;
};
