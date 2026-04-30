import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { ListIcon, SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/theme-toggle';
import { sessionQueryKey } from '@/features/auth/use-session';
import { useMe } from '@/features/me/use-me';
import { formatDaysLeft, formatMoney } from '@/features/subscriptions/format';
import { computeSummary } from '@/features/subscriptions/summary';
import { useSubscriptions } from '@/features/subscriptions/use-subscriptions';
import { signOut } from '@/lib/auth-client';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useMe();
  const subs = useSubscriptions();
  const summary = computeSummary(subs.data);

  const onSignOut = async () => {
    await signOut();
    queryClient.setQueryData(sessionQueryKey, null);
    await router.invalidate();
    await router.navigate({ to: '/signin' });
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">tracksub</span>
          <span>/</span>
          <span>dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            Çıkış yap
          </Button>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {me.data ? `Selam ${me.data.user.name}` : 'Selam'}
          </h1>
          {me.data && <p className="text-sm text-muted-foreground">{me.data.user.email}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/subscriptions">
              <ListIcon /> Aboneliklerim
            </Link>
          </Button>
          <Button asChild>
            <Link to="/import">
              <SparklesIcon /> İçe aktar
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="gap-2 py-5">
          <CardHeader className="px-5 [.border-b]:pb-0">
            <CardDescription className="text-xs">Aktif abonelik</CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <p className="font-mono text-3xl font-semibold tabular-nums">
              {subs.isPending ? <Skeleton className="h-8 w-12" /> : summary.activeCount}
            </p>
          </CardContent>
        </Card>

        <Card className="gap-2 py-5">
          <CardHeader className="px-5 [.border-b]:pb-0">
            <CardDescription className="text-xs">Aylık tahmini</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-0.5 px-5">
            {subs.isPending ? (
              <Skeleton className="h-7 w-24" />
            ) : Object.keys(summary.monthlyByCurrency).length === 0 ? (
              <p className="text-2xl font-semibold text-muted-foreground">—</p>
            ) : (
              Object.entries(summary.monthlyByCurrency).map(([cur, amount]) => (
                <p key={cur} className="font-mono text-xl font-semibold tabular-nums">
                  {formatMoney(amount, cur)}
                </p>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="gap-2 py-5">
          <CardHeader className="px-5 [.border-b]:pb-0">
            <CardDescription className="text-xs">Yıllık tahmini</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-0.5 px-5">
            {subs.isPending ? (
              <Skeleton className="h-7 w-24" />
            ) : Object.keys(summary.yearlyByCurrency).length === 0 ? (
              <p className="text-2xl font-semibold text-muted-foreground">—</p>
            ) : (
              Object.entries(summary.yearlyByCurrency).map(([cur, amount]) => (
                <p key={cur} className="font-mono text-xl font-semibold tabular-nums">
                  {formatMoney(amount, cur)}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {/* Upcoming */}
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium">Yaklaşan yenilemeler</h2>
          {summary.upcoming.length > 0 && (
            <Link
              to="/subscriptions"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Hepsini gör →
            </Link>
          )}
        </div>
        {subs.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : summary.upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Aktif aboneliğin yok.{' '}
              <Link
                to="/subscriptions"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Yeni ekle
              </Link>
              {' veya '}
              <Link to="/import" className="text-foreground underline-offset-4 hover:underline">
                mailden içe aktar
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {summary.upcoming.map((s) => (
              <Link
                key={s.id}
                to="/subscriptions/$id"
                params={{ id: s.id }}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent/40"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDaysLeft(s.nextBillingAt)}
                  </div>
                </div>
                <div className="font-mono tabular-nums text-sm font-semibold">
                  {formatMoney(s.amount, s.currency)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
