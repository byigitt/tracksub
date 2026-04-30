import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Status = 'connected' | 'partial' | 'disconnected' | 'unconfigured';

const STATUS_META: Record<
  Status,
  { label: string; variant: 'default' | 'muted' | 'destructive' | 'outline'; dot: string }
> = {
  connected: { label: 'Bağlı', variant: 'muted', dot: 'bg-emerald-500' },
  partial: { label: 'İzin gerekli', variant: 'destructive', dot: 'bg-amber-500' },
  disconnected: { label: 'Bağlı değil', variant: 'outline', dot: 'bg-muted-foreground/40' },
  unconfigured: { label: 'Yapılandırılmadı', variant: 'outline', dot: 'bg-muted-foreground/40' },
};

type Props = {
  icon: ReactNode;
  name: string;
  description?: string;
  status: Status;
  meta?: ReactNode;
  actions?: ReactNode;
};

export const ConnectionCard = ({ icon, name, description, status, meta, actions }: Props) => {
  const s = STATUS_META[status];
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-5">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background">
          {icon}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold leading-tight">{name}</h3>
            <Badge variant={s.variant} className="gap-1.5">
              <span className={cn('size-1.5 rounded-full', s.dot)} aria-hidden="true" />
              {s.label}
            </Badge>
          </div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
};
