import { createFileRoute, Link } from '@tanstack/react-router';
import { PlusIcon, SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  SubscriptionCard,
  SubscriptionCardSkeleton,
} from '@/features/subscriptions/subscription-card';
import { useSubscriptions } from '@/features/subscriptions/use-subscriptions';

export const Route = createFileRoute('/_authenticated/subscriptions')({
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const subs = useSubscriptions();

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

      {subs.data && subs.data.length > 0 && (
        <div className="flex flex-col gap-2">
          {subs.data.map((s) => (
            <SubscriptionCard key={s.id} subscription={s} />
          ))}
        </div>
      )}
    </div>
  );
}
