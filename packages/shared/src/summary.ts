// Aggregations over the subscription list — done client-side since the list is small.

import { monthlyEquivalent } from './format.ts';
import type { Subscription } from './types.ts';

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
    // Trial subs are not yet charging — don't pollute the monthly/yearly totals with
    // money that hasn't actually started flowing. They re-enter totals once the user
    // edits the sub off trial mode.
    if (s.isTrial) continue;
    const m = monthlyEquivalent(s);
    if (m === null) continue;
    monthly[s.currency] = (monthly[s.currency] ?? 0) + m;
    yearly[s.currency] = (yearly[s.currency] ?? 0) + m * 12;
  }
  // Upcoming list keeps trial subs — the user wants to see what's about to charge or
  // expire next, regardless of whether the trigger is a renewal or a trial ending.
  const upcoming = active
    .map((s) => ({ s, target: s.isTrial ? s.trialEndsAt : s.nextBillingAt }))
    .filter((x): x is { s: Subscription; target: string } => x.target !== null)
    .sort((a, b) => new Date(a.target).getTime() - new Date(b.target).getTime())
    .slice(0, 3)
    .map((x) => x.s);

  return {
    activeCount: active.length,
    monthlyByCurrency: monthly,
    yearlyByCurrency: yearly,
    upcoming,
  };
};
