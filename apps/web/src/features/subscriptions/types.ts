// Wire types — must mirror what `apps/api` returns (see apps/api/src/db/schema.ts).
// We deliberately type `amount` as string (PG numeric → Drizzle returns string) and
// dates as ISO strings (JSON serialization).

export type Period =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'one_time'
  | 'custom';

export const PERIODS: readonly Period[] = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'one_time',
  'custom',
];

export const PERIOD_LABELS: Record<Period, string> = {
  daily: 'Günlük',
  weekly: 'Haftalık',
  monthly: 'Aylık',
  quarterly: '3 Aylık',
  yearly: 'Yıllık',
  one_time: 'Tek seferlik',
  custom: 'Özel',
};

export type Status = 'active' | 'paused' | 'cancelled' | 'expired';
export const STATUSES: readonly Status[] = ['active', 'paused', 'cancelled', 'expired'];
export const STATUS_LABELS: Record<Status, string> = {
  active: 'Aktif',
  paused: 'Duraklatıldı',
  cancelled: 'İptal',
  expired: 'Süresi doldu',
};

export type Source = 'manual' | 'paste' | 'gmail';

export type Subscription = {
  id: string;
  userId: string;
  name: string;
  vendor: string | null;
  amount: string; // numeric(12,2) → string
  currency: string;
  period: Period;
  customPeriodDays: number | null;
  status: Status;
  startedAt: string; // ISO
  nextBillingAt: string | null; // ISO | null
  notes: string | null;
  source: Source;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionCreateBody = {
  name: string;
  vendor?: string | null;
  amount: number | string;
  currency?: string;
  period: Period;
  customPeriodDays?: number | null;
  status?: Status;
  startedAt?: string; // ISO
  nextBillingAt?: string | null; // ISO | null
  notes?: string | null;
  source?: Source;
};

export type SubscriptionUpdateBody = Partial<SubscriptionCreateBody>;

export const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'] as const;
