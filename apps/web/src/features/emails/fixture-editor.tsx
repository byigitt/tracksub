// Controlled fixture editor for the email preview page. Drives a single
// `EmailFixture` value upward via `onChange`; the route component then renders
// the matching shared template into the iframe.

import { Field } from '@/components/field';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CURRENCIES, EMAIL_TEMPLATE_KINDS, type EmailTemplateKind } from '@tracksub/shared';
import { cn } from '@/lib/utils';

export type EmailFixture = {
  template: EmailTemplateKind;
  daysLeft: number;
  name: string;
  vendor: string;
  amount: string;
  currency: string;
};

const TEMPLATE_LABELS: Record<EmailTemplateKind, string> = {
  renewal: 'Yenileme',
  trial_ending: 'Deneme bitiyor',
};

const QUICK_DAYS: readonly number[] = [0, 1, 3, 7, 14];

type Props = {
  value: EmailFixture;
  onChange: (next: EmailFixture) => void;
};

export const FixtureEditor = ({ value, onChange }: Props) => {
  const patch = (p: Partial<EmailFixture>): void => onChange({ ...value, ...p });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm">Şablon</Label>
        <Tabs
          value={value.template}
          onValueChange={(v) => patch({ template: v as EmailTemplateKind })}
        >
          <TabsList className="w-full">
            {EMAIL_TEMPLATE_KINDS.map((k) => (
              <TabsTrigger key={k} value={k} className="flex-1">
                {TEMPLATE_LABELS[k]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-sm">Kalan gün</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_DAYS.map((d) => {
            const active = value.daysLeft === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => patch({ daysLeft: d })}
                className={cn(
                  'h-8 rounded-md border px-3 text-xs font-medium transition-colors',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'bg-background hover:bg-accent/40',
                )}
                aria-pressed={active}
              >
                {d === 0 ? 'bugün' : d === 1 ? 'yarın' : `${d} gün`}
              </button>
            );
          })}
          <input
            type="number"
            min={-30}
            max={60}
            value={value.daysLeft}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) patch({ daysLeft: n });
            }}
            className="h-8 w-20 rounded-md border bg-background px-2 text-xs tabular-nums focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-label="Özel gün"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Negatif değerler past-due durumunu, 0 / 1 / 3 / 7 reminder cron eşiklerini gösterir.
        </p>
      </div>

      <Field
        label="Ad"
        value={value.name}
        onChange={(e) => patch({ name: e.target.value })}
        placeholder="Spotify"
      />

      <Field
        label="Sağlayıcı"
        value={value.vendor}
        onChange={(e) => patch({ vendor: e.target.value })}
        placeholder="Spotify AB"
      />

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field
          label="Tutar"
          inputMode="decimal"
          value={value.amount}
          onChange={(e) => patch({ amount: e.target.value })}
          placeholder="59.99"
        />
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm">Para birimi</Label>
          <Select value={value.currency} onValueChange={(v) => patch({ currency: v })}>
            <SelectTrigger className="w-24 sm:w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
