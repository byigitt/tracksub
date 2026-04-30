// Aggregations over the subscription list — done client-side since the list is small.

import { monthlyEquivalent } from './format';
import type { Subscription } from './types';

export type Summary = {
  activeCount: number;
  monthlyByCurrency: Record<string, number>;
  yearlyByCurrency: Record<string, number>;
  upcoming: Subscription[]; // next 3 nextBillingAt, active only
};

export const computeSummary = (subs: Subscription[] | undefined): Summary => {
  if (!subs) {
    return { activeCount: 0, monthlyByCurrency: {}, yearlyByCurrency: {}, upcoming: [] };
  }
  const active = subs.filter((s) => s.status === 'active');
  const monthly: Record<string, number> = {};
  const yearly: Record<string, number> = {};
  for (const s of active) {
    const m = monthlyEquivalent(s);
    if (m === null) continue;
    monthly[s.currency] = (monthly[s.currency] ?? 0) + m;
    yearly[s.currency] = (yearly[s.currency] ?? 0) + m * 12;
  }
  const upcoming = active
    .filter((s) => s.nextBillingAt)
    .sort((a, b) => {
      const ta = new Date(a.nextBillingAt!).getTime();
      const tb = new Date(b.nextBillingAt!).getTime();
      return ta - tb;
    })
    .slice(0, 3);

  return {
    activeCount: active.length,
    monthlyByCurrency: monthly,
    yearlyByCurrency: yearly,
    upcoming,
  };
};
