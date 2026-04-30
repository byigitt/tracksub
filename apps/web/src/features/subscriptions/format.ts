import { PERIOD_LABELS, type Period, type Subscription } from './types';

const dayMs = 86_400_000;

/** Whole-day difference (target - now), ceil. Negative = past. */
export const daysUntil = (iso: string | null, now: Date = new Date()): number | null => {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - now.getTime()) / dayMs);
};

const fmtCache = new Map<string, Intl.NumberFormat>();
export const formatMoney = (amount: string | number, currency: string): string => {
  const num = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(num)) return `${amount} ${currency}`;
  const key = currency.toUpperCase();
  let fmt = fmtCache.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: key });
    } catch {
      fmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
    }
    fmtCache.set(key, fmt);
  }
  return fmt.format(num);
};

export const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatPeriod = (period: Period, customDays: number | null): string => {
  if (period === 'custom') return customDays ? `${customDays} günde bir` : 'Özel';
  return PERIOD_LABELS[period];
};

/** Human-friendly remaining-time label (e.g. "3 gün kaldı", "Bugün", "Geçti"). */
export const formatDaysLeft = (iso: string | null): string => {
  const d = daysUntil(iso);
  if (d === null) return 'Tarih yok';
  if (d < 0) return `${Math.abs(d)} gün gecikti`;
  if (d === 0) return 'Bugün';
  if (d === 1) return 'Yarın';
  return `${d} gün kaldı`;
};

/** Approx monthly cost in subscription's own currency. */
export const monthlyEquivalent = (sub: Subscription): number | null => {
  const amt = Number(sub.amount);
  if (!Number.isFinite(amt)) return null;
  switch (sub.period) {
    case 'daily':
      return amt * 30;
    case 'weekly':
      return amt * (30 / 7);
    case 'monthly':
      return amt;
    case 'quarterly':
      return amt / 3;
    case 'yearly':
      return amt / 12;
    case 'one_time':
      return null;
    case 'custom':
      if (!sub.customPeriodDays || sub.customPeriodDays <= 0) return null;
      return amt * (30 / sub.customPeriodDays);
  }
};
