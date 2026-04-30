import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Pencil, PlusIcon, SearchIcon, SparklesIcon, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  computeSummary,
  formatDaysLeft,
  formatMoney,
  STATUS_LABELS,
  type Status,
} from '@tracksub/shared';
import { useMe, useSubscriptions } from '@tracksub/query';
import { cn } from '@/lib/utils';

import { DeleteSubscriptionDialog } from '@/features/subscriptions/delete-subscription-dialog';
import { ImportModal } from '@/features/subscriptions/import-modal';
import { SubscriptionActionsSheet } from '@/features/subscriptions/subscription-actions-sheet';
import {
  SubscriptionCard,
  SubscriptionCardSkeleton,
} from '@/features/subscriptions/subscription-card';
import { SubscriptionModal } from '@/features/subscriptions/subscription-modal';
import { SwipeableRow } from '@/features/subscriptions/swipeable-row';

type ModalSearch = 'new' | 'edit' | 'import' | 'actions';

type AppSearch = {
  modal?: ModalSearch;
  id?: string;
};

const VALID_MODALS: readonly ModalSearch[] = ['new', 'edit', 'import', 'actions'] as const;

export const Route = createFileRoute('/_authenticated/app')({
  component: AppPage,
  validateSearch: (raw: Record<string, unknown>): AppSearch => {
    const m = raw.modal;
    const id = raw.id;
    return {
      modal:
        typeof m === 'string' && (VALID_MODALS as readonly string[]).includes(m)
          ? (m as ModalSearch)
          : undefined,
      id: typeof id === 'string' && id.length > 0 ? id : undefined,
    };
  },
});

type Filter = 'all' | Status;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: STATUS_LABELS.active },
  { id: 'paused', label: STATUS_LABELS.paused },
  { id: 'cancelled', label: STATUS_LABELS.cancelled },
  { id: 'expired', label: STATUS_LABELS.expired },
];

function AppPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const me = useMe();
  const subs = useSubscriptions();
  const summary = computeSummary(subs.data);

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const counts = subs.data
    ? subs.data.reduce<Record<string, number>>((acc, s) => {
        acc[s.status] = (acc[s.status] ?? 0) + 1;
        return acc;
      }, {})
    : {};

  const filtered = useMemo(() => {
    if (!subs.data) return [];
    const byStatus = filter === 'all' ? subs.data : subs.data.filter((s) => s.status === filter);
    const q = query.trim().toLocaleLowerCase('tr');
    if (!q) return byStatus;
    return byStatus.filter((s) => {
      const haystack = `${s.name} ${s.vendor ?? ''}`.toLocaleLowerCase('tr');
      return haystack.includes(q);
    });
  }, [subs.data, filter, query]);

  const setModal = (modal: ModalSearch | undefined, id?: string) => {
    void navigate({
      to: '/app',
      search: modal ? { modal, ...(id ? { id } : {}) } : {},
      replace: false,
    });
  };

  const closeModal = () => setModal(undefined);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-6">
      {/* Greeting + summary strip */}
      <section className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {me.data ? `Selam ${me.data.user.name.split(' ')[0]}` : 'Selam'}
        </h1>
      </section>

      <SummaryStrip
        loading={subs.isPending}
        activeCount={summary.activeCount}
        monthly={summary.monthlyByCurrency}
        yearly={summary.yearlyByCurrency}
      />

      {/* Upcoming — includes both renewals and trial endings, anchored on whichever date is set. */}
      {!subs.isPending && summary.upcoming.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Yaklaşanlar
          </h2>
          <ul className="flex flex-col divide-y rounded-lg border bg-card">
            {summary.upcoming.slice(0, 3).map((s) => {
              const targetIso = s.isTrial ? s.trialEndsAt : s.nextBillingAt;
              const baseLine = formatDaysLeft(targetIso);
              const line = s.isTrial && baseLine ? `Deneme · ${baseLine}` : baseLine;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setModal('edit', s.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors',
                      'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{line}</div>
                    </div>
                    <div className="font-mono text-sm font-semibold tabular-nums">
                      {formatMoney(s.amount, s.currency)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Toolbar */}
      <section className="mt-6 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Aboneliklerim</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setModal('import')}>
              <SparklesIcon /> İçe aktar
            </Button>
            <Button size="sm" onClick={() => setModal('new')}>
              <PlusIcon /> Yeni
            </Button>
          </div>
        </div>

        {subs.data && subs.data.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div
              role="tablist"
              aria-label="Durum filtresi"
              className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1"
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
                      'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
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

            <div className="relative sm:ml-auto sm:w-56">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ara…"
                className="h-9 w-full rounded-lg border bg-transparent pr-3 pl-8 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                aria-label="Aboneliklerde ara"
              />
            </div>
          </div>
        )}

        {subs.isPending && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SubscriptionCardSkeleton key={i} />
            ))}
          </div>
        )}

        {subs.error && (
          <p className="text-sm text-destructive">Yüklenemedi: {subs.error.message}</p>
        )}

        {subs.data && subs.data.length === 0 && (
          <EmptyState onNew={() => setModal('new')} onImport={() => setModal('import')} />
        )}

        {subs.data && subs.data.length > 0 && filtered.length === 0 && (
          <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            {query ? 'Aramayla eşleşen abonelik yok.' : 'Bu filtrede abonelik yok.'}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-col gap-2">
            {filtered.map((s) => (
              <SwipeableRow
                key={s.id}
                onTap={() => setModal('actions', s.id)}
                leftAction={{
                  label: 'Düzenle',
                  icon: <Pencil />,
                  className: 'bg-secondary text-foreground',
                  ariaLabel: `${s.name} aboneliğini düzenle`,
                  onAction: () => setModal('edit', s.id),
                }}
                rightAction={{
                  label: 'Sil',
                  icon: <Trash2 />,
                  className: 'bg-destructive text-white',
                  ariaLabel: `${s.name} aboneliğini sil`,
                  onAction: () => setDeleteId(s.id),
                }}
              >
                <SubscriptionCard subscription={s} />
              </SwipeableRow>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      <SubscriptionActionsSheet
        open={search.modal === 'actions'}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        subscriptionId={search.modal === 'actions' ? search.id : undefined}
        initialSubscription={
          search.modal === 'actions' && search.id
            ? subs.data?.find((s) => s.id === search.id)
            : undefined
        }
        onEdit={(id) => setModal('edit', id)}
        onDelete={(id) => {
          closeModal();
          setDeleteId(id);
        }}
      />
      <SubscriptionModal
        open={search.modal === 'new' || search.modal === 'edit'}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        subscriptionId={search.modal === 'edit' ? search.id : undefined}
      />
      <ImportModal
        open={search.modal === 'import'}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      />
      {deleteId && (
        <DeleteSubscriptionDialog
          open={Boolean(deleteId)}
          onOpenChange={(open) => {
            if (!open) setDeleteId(null);
          }}
          subscriptionId={deleteId}
          onDeleted={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}

type SummaryStripProps = {
  loading: boolean;
  activeCount: number;
  monthly: Record<string, number>;
  yearly: Record<string, number>;
};

const SummaryStrip = ({ loading, activeCount, monthly, yearly }: SummaryStripProps) => {
  const monthlyEntries = Object.entries(monthly);
  const yearlyEntries = Object.entries(yearly);
  return (
    <div className="grid grid-cols-3 divide-x rounded-lg border bg-card">
      <SummaryCell label="Aktif">
        {loading ? (
          <Skeleton className="h-7 w-10" />
        ) : (
          <span className="font-mono text-xl font-semibold tabular-nums sm:text-2xl">
            {activeCount}
          </span>
        )}
      </SummaryCell>
      <SummaryCell label="Aylık tahmini">
        {loading ? (
          <Skeleton className="h-6 w-20" />
        ) : monthlyEntries.length === 0 ? (
          <span className="text-xl font-semibold text-muted-foreground">—</span>
        ) : (
          <div className="flex min-w-0 flex-col gap-0.5">
            {monthlyEntries.map(([cur, amount]) => (
              <span
                key={cur}
                className="truncate font-mono text-sm font-semibold tabular-nums sm:text-lg"
              >
                {formatMoney(amount, cur)}
              </span>
            ))}
          </div>
        )}
      </SummaryCell>
      <SummaryCell label="Yıllık tahmini">
        {loading ? (
          <Skeleton className="h-6 w-20" />
        ) : yearlyEntries.length === 0 ? (
          <span className="text-xl font-semibold text-muted-foreground">—</span>
        ) : (
          <div className="flex min-w-0 flex-col gap-0.5">
            {yearlyEntries.map(([cur, amount]) => (
              <span
                key={cur}
                className="truncate font-mono text-sm font-semibold tabular-nums sm:text-lg"
              >
                {formatMoney(amount, cur)}
              </span>
            ))}
          </div>
        )}
      </SummaryCell>
    </div>
  );
};

const SummaryCell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-1 px-3 py-3 sm:px-4 sm:py-4">
    <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
    <div className="min-w-0">{children}</div>
  </div>
);

const EmptyState = ({ onNew, onImport }: { onNew: () => void; onImport: () => void }) => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/20 px-6 py-12 text-center">
    <div className="flex size-10 items-center justify-center rounded-full border bg-background">
      <PlusIcon className="size-4 text-muted-foreground" />
    </div>
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium">Henüz aboneliğin yok</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Manuel ekleyebilir ya da bir mail metni / Gmail üzerinden AI ile içe aktarabilirsin.
      </p>
    </div>
    <div className="mt-1 flex flex-wrap justify-center gap-2">
      <Button onClick={onNew}>
        <PlusIcon /> Yeni abonelik
      </Button>
      <Button variant="outline" onClick={onImport}>
        <SparklesIcon /> Mailden içe aktar
      </Button>
    </div>
  </div>
);
