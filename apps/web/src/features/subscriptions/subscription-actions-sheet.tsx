import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { BrandIcon } from './brand-icon';
import {
  formatDate,
  formatDaysLeft,
  formatMoney,
  formatPeriod,
  STATUS_LABELS,
  type Status,
  type Subscription,
} from '@tracksub/shared';
import { useSubscription } from '@tracksub/query';

const statusVariant: Record<Status, 'default' | 'secondary' | 'destructive' | 'muted'> = {
  active: 'default',
  paused: 'secondary',
  cancelled: 'muted',
  expired: 'destructive',
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required when open. */
  subscriptionId?: string;
  /** Subscription already in the list — used as a placeholder while detail loads. */
  initialSubscription?: Subscription;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

/**
 * Lightweight preview-and-actions sheet shown on row tap.
 * Avoids dropping straight into the edit form, which is heavy and easy to mistap.
 */
export const SubscriptionActionsSheet = ({
  open,
  onOpenChange,
  subscriptionId,
  initialSubscription,
  onEdit,
  onDelete,
}: Props) => {
  // Use the cached list-derived subscription as a placeholder so the sheet
  // never flashes a skeleton when opened from the list.
  const detail = useSubscription(open ? subscriptionId : undefined);
  const sub = detail.data ?? initialSubscription;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-sm">
        <DialogHeader className="sr-only">
          <DialogTitle>{sub ? sub.name : 'Abonelik'}</DialogTitle>
        </DialogHeader>

        {sub ? <Preview subscription={sub} /> : <PreviewSkeleton />}

        <div className="flex flex-col border-t">
          <ActionRow
            disabled={!subscriptionId}
            onClick={() => subscriptionId && onEdit(subscriptionId)}
            icon={<Pencil className="size-4" />}
            label="Düzenle"
          />
          <ActionRow
            disabled={!subscriptionId}
            onClick={() => subscriptionId && onDelete(subscriptionId)}
            icon={<Trash2 className="size-4" />}
            label="Sil"
            destructive
          />
        </div>

        <div className="border-t p-3">
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Preview = ({ subscription: s }: { subscription: Subscription }) => {
  const targetIso = s.isTrial ? s.trialEndsAt : s.nextBillingAt;
  const remainBase = formatDaysLeft(targetIso);
  const remain = s.isTrial && remainBase ? `Deneme · ${remainBase}` : remainBase;
  return (
    <div className="flex flex-col gap-4 px-6 pt-6 pb-4">
      <div className="flex items-start gap-3">
        <BrandIcon name={s.name} vendor={s.vendor} size={48} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="truncate text-base font-semibold leading-tight">{s.name}</div>
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            {s.vendor && <span className="min-w-0 truncate">{s.vendor}</span>}
            <Badge
              variant={statusVariant[s.status]}
              className="shrink-0 text-[10px] uppercase tracking-wide"
            >
              {STATUS_LABELS[s.status]}
            </Badge>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-xs">
        <Stat label="Tutar">
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatMoney(s.amount, s.currency)}
          </span>
        </Stat>
        <Stat label="Periyot">
          <span className="text-sm font-medium">
            {s.isTrial ? 'Denemede' : formatPeriod(s.period, s.customPeriodDays)}
          </span>
        </Stat>
        <Stat label={s.isTrial ? 'Deneme bitiş' : 'Sıradaki ödeme'}>
          <span className="text-sm font-medium">{formatDate(targetIso)}</span>
        </Stat>
        <Stat label="Kalan">
          <span className="text-sm font-medium">{remain ?? '—'}</span>
        </Stat>
      </dl>
    </div>
  );
};

const PreviewSkeleton = () => (
  <div className="flex flex-col gap-4 px-6 pt-6 pb-4">
    <div className="flex items-start gap-3">
      <Skeleton className="size-12 rounded-md" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <Skeleton className="h-20 w-full" />
  </div>
);

const Stat = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {label}
    </dt>
    <dd className="min-w-0 truncate">{children}</dd>
  </div>
);

const ActionRow = ({
  icon,
  label,
  onClick,
  disabled,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex w-full items-center gap-3 px-6 py-3.5 text-left text-sm font-medium transition-colors',
      'hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none',
      'disabled:cursor-not-allowed disabled:opacity-50',
      destructive && 'text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10',
      '[&:not(:last-child)]:border-b',
    )}
  >
    <span
      className={cn(
        'flex size-8 items-center justify-center rounded-md border bg-background',
        destructive ? 'text-destructive' : 'text-foreground',
      )}
      aria-hidden="true"
    >
      {icon}
    </span>
    <span>{label}</span>
  </button>
);
