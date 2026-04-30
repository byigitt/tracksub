import { CheckIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMoney } from './format';
import { PERIOD_LABELS } from './types';
import { useConfirmCandidates, type Candidate } from './use-parse-text';

const confidenceTone = (n: number): { label: string; cls: string } => {
  if (n >= 0.8)
    return { label: 'Yüksek', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' };
  if (n >= 0.5) return { label: 'Orta', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' };
  return { label: 'Düşük', cls: 'bg-muted text-muted-foreground' };
};

type Props = {
  jobId: string;
  candidates: Candidate[];
  onAdded?: () => void;
};

export const CandidatesList = ({ jobId, candidates, onAdded }: Props) => {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(candidates.map((_, i) => i)));
  const [added, setAdded] = useState<Set<number>>(new Set());
  const confirm = useConfirmCandidates();

  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        AI bu metinden abonelik çıkaramadı. Daha fazla bağlam içeren bir mail dene ya da manuel
        ekle.
      </div>
    );
  }

  const toggle = (i: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const onAddSelected = async () => {
    const indices = [...selected].filter((i) => !added.has(i));
    if (indices.length === 0) return;
    await confirm.mutateAsync({ jobId, indices });
    setAdded((a) => {
      const next = new Set(a);
      for (const i of indices) next.add(i);
      return next;
    });
    onAdded?.();
  };

  const remaining = [...selected].filter((i) => !added.has(i)).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {candidates.length} aday bulundu. Seçili olanları ekleyebilirsin.
        </p>
        <Button onClick={onAddSelected} disabled={remaining === 0 || confirm.isPending} size="sm">
          <PlusIcon /> {confirm.isPending ? 'Ekleniyor…' : `Seçilenleri ekle (${remaining})`}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {candidates.map((c, i) => {
          const isSelected = selected.has(i);
          const isAdded = added.has(i);
          const conf = confidenceTone(c.confidence);
          return (
            <button
              type="button"
              key={i}
              onClick={() => !isAdded && toggle(i)}
              disabled={isAdded}
              className={cn(
                'group flex items-stretch gap-3 rounded-lg border bg-card p-3 text-left transition-colors',
                isSelected && !isAdded && 'border-foreground/40 bg-accent/30',
                isAdded && 'opacity-60',
                !isAdded && 'hover:bg-accent/40',
              )}
            >
              <div
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border',
                  isSelected || isAdded
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-muted-foreground/40',
                )}
                aria-hidden="true"
              >
                {(isSelected || isAdded) && <CheckIcon className="size-3" />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{c.name}</span>
                  {c.vendor && (
                    <span className="truncate text-xs text-muted-foreground">{c.vendor}</span>
                  )}
                  <Badge variant="outline" className={cn('ml-auto text-[10px]', conf.cls)}>
                    {conf.label} · {(c.confidence * 100).toFixed(0)}%
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums text-foreground">
                    {formatMoney(c.amount, c.currency)}
                  </span>
                  <span>·</span>
                  <span>
                    {c.period === 'custom'
                      ? `${c.customPeriodDays ?? '?'} günde bir`
                      : PERIOD_LABELS[c.period]}
                  </span>
                  {c.nextBillingDate && (
                    <>
                      <span>·</span>
                      <span>Yenileme: {c.nextBillingDate}</span>
                    </>
                  )}
                </div>
                {c.evidence && (
                  <p className="line-clamp-2 text-[11px] italic text-muted-foreground/80">
                    "{c.evidence}"
                  </p>
                )}
                {isAdded && <p className="text-[11px] text-emerald-600">Eklendi ✓</p>}
              </div>
            </button>
          );
        })}
      </div>

      {confirm.error && (
        <p className="text-sm text-destructive">{(confirm.error as Error).message}</p>
      )}
    </div>
  );
};
