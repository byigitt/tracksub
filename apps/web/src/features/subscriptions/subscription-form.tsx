import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/field';
import { BrandIcon } from './brand-icon';
import {
  CURRENCIES,
  PERIOD_LABELS,
  PERIODS,
  STATUS_LABELS,
  STATUSES,
  type Period,
  type Status,
  type Subscription,
  type SubscriptionCreateBody,
  type SubscriptionUpdateBody,
} from '@tracksub/shared';

type FormValues = {
  name: string;
  vendor: string;
  amount: string;
  currency: string;
  period: Period;
  customPeriodDays: string; // string for input control; parsed at submit
  status: Status;
  startedAt: string; // yyyy-mm-dd
  nextBillingAt: string; // yyyy-mm-dd or empty
  isTrial: boolean;
  trialEndsAt: string; // yyyy-mm-dd or empty
  notes: string;
};

const toDateInput = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const valuesFromSubscription = (sub: Subscription | null): FormValues => ({
  name: sub?.name ?? '',
  vendor: sub?.vendor ?? '',
  amount: sub ? sub.amount : '',
  currency: sub?.currency ?? 'TRY',
  period: sub?.period ?? 'monthly',
  customPeriodDays:
    sub?.customPeriodDays !== null && sub?.customPeriodDays !== undefined
      ? String(sub.customPeriodDays)
      : '',
  status: sub?.status ?? 'active',
  startedAt: toDateInput(sub?.startedAt) || new Date().toISOString().slice(0, 10),
  nextBillingAt: toDateInput(sub?.nextBillingAt),
  isTrial: sub?.isTrial ?? false,
  trialEndsAt: toDateInput(sub?.trialEndsAt),
  notes: sub?.notes ?? '',
});

const buildBody = (values: FormValues): SubscriptionCreateBody & SubscriptionUpdateBody => {
  const body: SubscriptionCreateBody & SubscriptionUpdateBody = {
    name: values.name.trim(),
    vendor: values.vendor.trim() || null,
    amount: values.amount.trim(), // server normalizes
    currency: values.currency,
    period: values.period,
    status: values.status,
    isTrial: values.isTrial,
    notes: values.notes.trim() || null,
  };
  if (values.period === 'custom') {
    body.customPeriodDays = Number(values.customPeriodDays) || null;
  } else {
    body.customPeriodDays = null;
  }
  if (values.startedAt) body.startedAt = new Date(`${values.startedAt}T00:00:00Z`).toISOString();

  if (values.isTrial) {
    // Trial mode: only the trial end date matters; server clears nextBillingAt.
    body.nextBillingAt = null;
    body.trialEndsAt = values.trialEndsAt
      ? new Date(`${values.trialEndsAt}T00:00:00Z`).toISOString()
      : null;
  } else {
    // Paid mode: clear any prior trial end and pass through the renewal date.
    body.trialEndsAt = null;
    if (values.nextBillingAt) {
      body.nextBillingAt = new Date(`${values.nextBillingAt}T00:00:00Z`).toISOString();
    } else {
      // Let server compute. Send `null` only on update if user cleared it explicitly.
      body.nextBillingAt = null;
    }
  }
  return body;
};

export type SubscriptionFormProps = {
  initial?: Subscription | null;
  onSubmit: (body: SubscriptionCreateBody & SubscriptionUpdateBody) => Promise<unknown>;
  onCancel?: () => void;
  submitLabel?: string;
};

export const SubscriptionForm = ({
  initial = null,
  onSubmit,
  onCancel,
  submitLabel,
}: SubscriptionFormProps) => {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: valuesFromSubscription(initial),
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        await onSubmit(buildBody(value));
      } catch (err) {
        setServerError(err instanceof Error ? err.message : 'Kaydetme başarısız');
      }
    },
  });

  const submitText = submitLabel ?? (initial ? 'Güncelle' : 'Ekle');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <form.Subscribe selector={(s) => [s.values.name, s.values.vendor] as const}>
        {([name, vendor]) =>
          (name?.trim() ?? '').length > 0 ? (
            <div className="flex items-center gap-3 border-b pb-3">
              <BrandIcon name={name} vendor={vendor} size={40} />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium leading-tight">{name}</span>
                {vendor?.trim() && (
                  <span className="truncate text-xs text-muted-foreground">{vendor}</span>
                )}
              </div>
            </div>
          ) : null
        }
      </form.Subscribe>

      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) => (value.trim() ? undefined : 'Ad gerekli'),
        }}
      >
        {(field) => (
          <Field
            label="Ad"
            placeholder="Netflix, Spotify, ChatGPT…"
            required
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]?.toString()}
          />
        )}
      </form.Field>

      <form.Field name="vendor">
        {(field) => (
          <Field
            label="Sağlayıcı"
            placeholder="Netflix Inc."
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <form.Field
          name="amount"
          validators={{
            onChange: ({ value }) => {
              if (!value.trim()) return 'Tutar gerekli';
              const n = Number(value.replace(',', '.'));
              if (!Number.isFinite(n) || n < 0) return 'Geçersiz tutar';
              return undefined;
            },
          }}
        >
          {(field) => (
            <Field
              label="Tutar"
              inputMode="decimal"
              placeholder="229.99"
              required
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]?.toString()}
            />
          )}
        </form.Field>

        <form.Field name="currency">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Para birimi</Label>
              <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
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
          )}
        </form.Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <form.Field name="period">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Periyot</Label>
              <Select
                value={field.state.value}
                onValueChange={(v) => field.handleChange(v as Period)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PERIOD_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>

        <form.Field name="status">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Durum</Label>
              <Select
                value={field.state.value}
                onValueChange={(v) => field.handleChange(v as Status)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>
      </div>

      <form.Subscribe selector={(s) => s.values.period === 'custom'}>
        {(isCustom) =>
          isCustom ? (
            <form.Field
              name="customPeriodDays"
              validators={{
                onChange: ({ value }) => {
                  const n = Number(value);
                  if (!Number.isInteger(n) || n <= 0) return 'Pozitif tam sayı';
                  return undefined;
                },
              }}
            >
              {(field) => (
                <Field
                  label="Kaç günde bir yenilensin?"
                  type="number"
                  min={1}
                  max={3650}
                  placeholder="14"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors[0]?.toString()}
                />
              )}
            </form.Field>
          ) : null
        }
      </form.Subscribe>

      <form.Field name="isTrial">
        {(field) => (
          <label className="flex items-start gap-3 rounded-md border bg-card px-3 py-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-foreground"
              checked={field.state.value}
              onChange={(e) => field.handleChange(e.target.checked)}
              onBlur={field.handleBlur}
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium leading-tight">Ücretsiz deneme</span>
              <span className="text-xs text-muted-foreground">
                Deneme bitiminden 7/3/1/0 gün önce hatırlatma maili atılır.
              </span>
            </span>
          </label>
        )}
      </form.Field>

      <div className="grid grid-cols-2 gap-3">
        <form.Field name="startedAt">
          {(field) => (
            <Field
              label="Başlangıç"
              type="date"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>

        <form.Subscribe selector={(s) => s.values.isTrial}>
          {(isTrial) =>
            isTrial ? (
              <form.Field
                name="trialEndsAt"
                validators={{
                  onChange: ({ value }) => (value ? undefined : 'Deneme bitişi gerekli'),
                }}
              >
                {(field) => (
                  <Field
                    label="Deneme bitişi"
                    type="date"
                    required
                    hint="Bu tarihten 7/3/1/0 gün önce hatırlatıcı"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    error={field.state.meta.errors[0]?.toString()}
                  />
                )}
              </form.Field>
            ) : (
              <form.Field name="nextBillingAt">
                {(field) => (
                  <Field
                    label="Sonraki yenileme"
                    type="date"
                    hint="Boşsa periyottan otomatik hesaplanır"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            )
          }
        </form.Subscribe>
      </div>

      <form.Field name="notes">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Not</Label>
            <Textarea
              rows={3}
              placeholder="İsteğe bağlı"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          </div>
        )}
      </form.Field>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="mt-1 flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Vazgeç
          </Button>
        )}
        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? 'Kaydediliyor…' : submitText}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
};
