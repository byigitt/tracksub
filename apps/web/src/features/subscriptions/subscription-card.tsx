import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { daysUntil, formatDate, formatDaysLeft, formatMoney, formatPeriod } from './format';
import { STATUS_LABELS, type Status, type Subscription } from './types';

const statusVariant: Record<Status, 'default' | 'secondary' | 'destructive' | 'muted'> = {
  active: 'default',
  paused: 'secondary',
  cancelled: 'muted',
  expired: 'destructive',
};

const remainTone = (iso: string | null): string => {
  const d = daysUntil(iso);
  if (d === null) return 'text-muted-foreground';
  if (d < 0) return 'text-destructive';
  if (d <= 3) return 'text-amber-600 dark:text-amber-500';
  return 'text-muted-foreground';
};

type Props = { subscription: Subscription };

// Sade kart — renkli sol şerit YOK. Yatay layout: sol meta, sağ tutar.
export const SubscriptionCard = ({ subscription: s }: Props) => {
  const remain = formatDaysLeft(s.nextBillingAt);
  return (
    <Link
      to="/subscriptions/$id"
      params={{ id: s.id }}
      className={cn(
        'group flex items-stretch gap-4 rounded-lg border bg-card p-4',
        'transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className={cn('text-xs font-medium', remainTone(s.nextBillingAt))}>{remain}</div>
        <div className="truncate text-base font-semibold leading-tight">{s.name}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {s.vendor && <span className="truncate">{s.vendor}</span>}
          <Badge variant={statusVariant[s.status]} className="text-[10px] uppercase tracking-wide">
            {STATUS_LABELS[s.status]}
          </Badge>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between text-right">
        <div className="font-mono text-base font-semibold tabular-nums">
          {formatMoney(s.amount, s.currency)}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatPeriod(s.period, s.customPeriodDays)}
        </div>
        <div className="text-[11px] text-muted-foreground/80">{formatDate(s.nextBillingAt)}</div>
      </div>
    </Link>
  );
};

export const SubscriptionCardSkeleton = () => (
  <div className="flex items-stretch gap-4 rounded-lg border bg-card p-4">
    <div className="flex flex-1 flex-col gap-1.5">
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
    </div>
    <div className="flex flex-col items-end gap-1.5">
      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      <div className="h-3 w-12 animate-pulse rounded bg-muted" />
    </div>
  </div>
);
