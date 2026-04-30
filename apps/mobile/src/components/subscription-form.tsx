import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { Segmented } from '@/components/segmented';
import {
  CURRENCIES,
  PERIODS,
  PERIOD_LABELS,
  STATUSES,
  STATUS_LABELS,
  type Period,
  type Status,
  type Subscription,
  type SubscriptionCreateBody,
} from '@tracksub/shared';

type Props = {
  initial?: Subscription;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (body: SubscriptionCreateBody) => Promise<void> | void;
  onDelete?: () => void;
};

const PERIOD_OPTIONS = PERIODS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }));
const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));

const toIsoDate = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const SubscriptionForm = ({ initial, pending, submitLabel, onSubmit, onDelete }: Props) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [vendor, setVendor] = useState(initial?.vendor ?? '');
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>(
    (initial?.currency as (typeof CURRENCIES)[number]) ?? 'TRY',
  );
  const [period, setPeriod] = useState<Period>(initial?.period ?? 'monthly');
  const [customDays, setCustomDays] = useState<string>(
    initial?.customPeriodDays !== null && initial?.customPeriodDays !== undefined
      ? String(initial.customPeriodDays)
      : '',
  );
  const [status, setStatus] = useState<Status>(initial?.status ?? 'active');
  const [startedAt, setStartedAt] = useState<Date>(
    initial?.startedAt ? new Date(initial.startedAt) : new Date(),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !pending &&
    name.trim().length > 0 &&
    Number.isFinite(Number(amount)) &&
    Number(amount) > 0 &&
    (period !== 'custom' || (Number.isFinite(Number(customDays)) && Number(customDays) > 0));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const body: SubscriptionCreateBody = {
        name: name.trim(),
        vendor: vendor.trim() || null,
        amount: Number(amount).toFixed(2),
        currency,
        period,
        customPeriodDays: period === 'custom' ? Number(customDays) : null,
        status,
        startedAt: startedAt.toISOString(),
        notes: notes.trim() || null,
      };
      await onSubmit(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Beklenmeyen bir hata oluştu.');
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert('Aboneliği sil', 'Bu işlem geri alınamaz. Emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onDelete();
        },
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-1.5">
        <Label nativeID="name">Ad</Label>
        <Input
          aria-labelledby="name"
          value={name}
          onChangeText={setName}
          placeholder="örn. Spotify"
          editable={!pending}
        />
      </View>

      <View className="gap-1.5">
        <Label nativeID="vendor">Sağlayıcı (opsiyonel)</Label>
        <Input
          aria-labelledby="vendor"
          value={vendor ?? ''}
          onChangeText={setVendor}
          placeholder="örn. Spotify AB"
          editable={!pending}
        />
      </View>

      <View className="flex-row gap-3">
        <View className="flex-[2] gap-1.5">
          <Label nativeID="amount">Tutar</Label>
          <Input
            aria-labelledby="amount"
            value={String(amount)}
            onChangeText={(t) => setAmount(t.replace(',', '.'))}
            keyboardType="decimal-pad"
            placeholder="59.90"
            editable={!pending}
          />
        </View>
        <View className="flex-1 gap-1.5">
          <Label>Para</Label>
          <Segmented options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} />
        </View>
      </View>

      <View className="gap-1.5">
        <Label>Periyot</Label>
        <Segmented options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
      </View>

      {period === 'custom' && (
        <View className="gap-1.5">
          <Label nativeID="customDays">Kaç günde bir?</Label>
          <Input
            aria-labelledby="customDays"
            value={customDays}
            onChangeText={(t) => setCustomDays(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="örn. 14"
            editable={!pending}
          />
        </View>
      )}

      <View className="gap-1.5">
        <Label>Durum</Label>
        <Segmented options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </View>

      <View className="gap-1.5">
        <Label>Başlangıç</Label>
        <Pressable
          onPress={() => setPickerOpen((v) => !v)}
          className="border-input bg-background h-11 flex-row items-center rounded-md border px-3"
        >
          <Text className="text-foreground text-base">{toIsoDate(startedAt)}</Text>
        </Pressable>
        {pickerOpen && (
          <DateTimePicker
            value={startedAt}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_e, d) => {
              if (Platform.OS === 'android') setPickerOpen(false);
              if (d) setStartedAt(d);
            }}
          />
        )}
      </View>

      <View className="gap-1.5">
        <Label nativeID="notes">Not</Label>
        <Textarea
          aria-labelledby="notes"
          value={notes ?? ''}
          onChangeText={setNotes}
          placeholder="Opsiyonel"
          editable={!pending}
        />
      </View>

      {error && <Text className="text-destructive text-sm">{error}</Text>}

      <Button onPress={handleSubmit} disabled={!canSubmit}>
        {pending ? <ActivityIndicator size="small" color="#fff" /> : <Text>{submitLabel}</Text>}
      </Button>

      {onDelete && (
        <Button variant="ghost" onPress={handleDelete} disabled={pending}>
          <Text className="text-destructive">Aboneliği sil</Text>
        </Button>
      )}
    </ScrollView>
  );
};
