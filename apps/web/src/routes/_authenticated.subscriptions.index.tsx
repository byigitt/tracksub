import { createFileRoute, Link } from '@tanstack/react-router';
import { PlusIcon, SparklesIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import {
  SubscriptionCard,
  SubscriptionCardSkeleton,
} from '@/features/subscriptions/subscription-card';
import { STATUS_LABELS, type Status } from '@/features/subscriptions/types';
import { useSubscriptions } from '@/features/subscriptions/use-subscriptions';

export const Route = createFileRoute('/_authenticated/subscriptions/')({
  component: SubscriptionsPage,
});

type Filter = 'all' | Status;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: STATUS_LABELS.active },
  { id: 'paused', label: STATUS_LABELS.paused },
  { id: 'cancelled', label: STATUS_LABELS.cancelled },
  { id: 'expired', label: STATUS_LABELS.expired },
];

function SubscriptionsPage() {
  const subs = useSubscriptions();
  const [filter, setFilter] = useState<Filter>('all');

  const counts = subs.data
    ? subs.data.reduce<Record<string, number>>((acc, s) => {
        acc[s.status] = (acc[s.status] ?? 0) + 1;
        return acc;
      }, {})
    : {};
  const filtered = subs.data
    ? filter === 'all'
      ? subs.data
      : subs.data.filter((s) => s.status === filter)
    : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Abonelikler</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link to="/import">
              <SparklesIcon /> İçe aktar
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/subscriptions/new">
              <PlusIcon /> Yeni
            </Link>
          </Button>
        </div>
      </header>

      {subs.data && subs.data.length > 0 && (
        <div
          role="tablist"
          aria-label="Durum filtresi"
          className="mb-4 flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1"
        >
          {FILTERS.map((f) => {
            const total = f.id === 'all' ? subs.data!.length : (counts[f.id] ?? 0);
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
                <span
                  className={cn(
                    'rounded px-1 font-mono text-[10px] tabular-nums',
                    active ? 'bg-muted text-muted-foreground' : 'text-muted-foreground/60',
                  )}
                >
                  {total}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {subs.isPending && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SubscriptionCardSkeleton key={i} />
          ))}
        </div>
      )}

      {subs.error && <p className="text-sm text-destructive">Yüklenemedi: {subs.error.message}</p>}

      {subs.data && subs.data.length === 0 && (
        <div className="rounded-lg border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Henüz aboneliğin yok. Manuel ekleyebilir ya da bir mail metnini içe aktarabilirsin.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button asChild>
              <Link to="/subscriptions/new">Yeni abonelik</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/import">Mailden içe aktar</Link>
            </Button>
          </div>
        </div>
      )}

      {subs.data && subs.data.length > 0 && filtered.length === 0 && (
        <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Bu filtrede abonelik yok.
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex flex-col gap-2">
          {filtered.map((s) => (
            <SubscriptionCard key={s.id} subscription={s} />
          ))}
        </div>
      )}
    </div>
  );
}
