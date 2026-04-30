import { PencilIcon, Trash2Icon, XIcon } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
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
import { cn } from '@/lib/utils';

const statusDot: Record<Status, string> = {
  active: 'bg-emerald-500',
  paused: 'bg-amber-500',
  cancelled: 'bg-muted-foreground',
  expired: 'bg-destructive',
};

type Props = {
  open: boolean;
  onClose: () => void;
  subscriptionId?: string;
  /** From the list cache so the sheet doesn't flash a skeleton. */
  initialSubscription?: Subscription;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

/**
 * Bottom sheet shown on row tap. Avoids dropping straight into the edit form,
 * which is a heavy screen and easy to mistap into.
 */
export const SubscriptionActionsSheet = ({
  open,
  onClose,
  subscriptionId,
  initialSubscription,
  onEdit,
  onDelete,
}: Props) => {
  const detail = useSubscription(open ? subscriptionId : undefined);
  const sub = detail.data ?? initialSubscription;

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslate = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (!open) return;
    overlayOpacity.setValue(0);
    sheetTranslate.setValue(40);
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslate, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, overlayOpacity, sheetTranslate]);

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        <Animated.View
          style={{ opacity: overlayOpacity }}
          className="absolute inset-0 bg-black/60"
        >
          <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Kapat" />
        </Animated.View>

        <Animated.View
          style={{ transform: [{ translateY: sheetTranslate }] }}
          className="bg-background border-border rounded-t-3xl border-t"
        >
          <SafeAreaView edges={['bottom']}>
            <View className="items-center pt-2.5">
              <View className="bg-muted h-1 w-10 rounded-full" />
            </View>

            <View className="flex-row items-center justify-between gap-3 px-5 pt-4 pb-2">
              <Text
                className="text-foreground flex-1 text-base font-semibold"
                numberOfLines={1}
              >
                {sub?.name ?? 'Abonelik'}
              </Text>
              <Pressable
                onPress={onClose}
                className="bg-secondary h-8 w-8 items-center justify-center rounded-full active:opacity-80"
                accessibilityLabel="Kapat"
                hitSlop={8}
              >
                <Icon as={XIcon} size={16} className="text-foreground" />
              </Pressable>
            </View>

            {sub ? <Preview subscription={sub} /> : <PreviewLoading />}

            <View className="px-3 pb-3 pt-2">
              <ActionRow
                disabled={!subscriptionId}
                icon={PencilIcon}
                label="Düzenle"
                onPress={() => subscriptionId && onEdit(subscriptionId)}
              />
              <View className="h-2" />
              <ActionRow
                disabled={!subscriptionId}
                icon={Trash2Icon}
                label="Sil"
                destructive
                onPress={() => subscriptionId && onDelete(subscriptionId)}
              />
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const Preview = ({ subscription: s }: { subscription: Subscription }) => {
  const targetIso = s.isTrial ? s.trialEndsAt : s.nextBillingAt;
  const remainBase = formatDaysLeft(targetIso);
  const remain = s.isTrial && remainBase ? `Deneme · ${remainBase}` : remainBase;
  return (
    <View className="border-border bg-muted/30 mx-5 mb-1 mt-2 rounded-xl border p-4">
      <View className="flex-row items-center gap-2">
        <View
          className={cn('h-2 w-2 rounded-full', statusDot[s.status])}
          accessibilityLabel={STATUS_LABELS[s.status]}
        />
        <Text className="text-muted-foreground text-xs">
          {STATUS_LABELS[s.status]}
          {s.vendor ? ` · ${s.vendor}` : ''}
        </Text>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-y-3">
        <Stat label="Tutar" className="w-1/2">
          <Text
            className="text-foreground font-mono text-base font-semibold"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {formatMoney(s.amount, s.currency)}
          </Text>
        </Stat>
        <Stat label="Periyot" className="w-1/2">
          <Text className="text-foreground text-sm font-medium">
            {s.isTrial ? 'Denemede' : formatPeriod(s.period, s.customPeriodDays)}
          </Text>
        </Stat>
        <Stat label={s.isTrial ? 'Deneme bitiş' : 'Sıradaki ödeme'} className="w-1/2">
          <Text className="text-foreground text-sm font-medium">{formatDate(targetIso)}</Text>
        </Stat>
        <Stat label="Kalan" className="w-1/2">
          <Text className="text-foreground text-sm font-medium">{remain ?? '—'}</Text>
        </Stat>
      </View>
    </View>
  );
};

const PreviewLoading = () => (
  <View className="border-border bg-muted/30 mx-5 mb-1 mt-2 h-32 rounded-xl border" />
);

const Stat = ({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <View className={cn('gap-1', className)}>
    <Text className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
      {label}
    </Text>
    {children}
  </View>
);

const ActionRow = ({
  icon,
  label,
  onPress,
  destructive,
  disabled,
}: {
  icon: typeof PencilIcon;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    className={cn(
      'flex-row items-center gap-3 rounded-xl px-4 py-3.5',
      'bg-secondary/60 active:bg-secondary',
      destructive && 'bg-destructive/10 active:bg-destructive/15',
      disabled && 'opacity-50',
    )}
  >
    <View
      className={cn(
        'border-border bg-background h-9 w-9 items-center justify-center rounded-lg border',
      )}
    >
      <Icon
        as={icon}
        size={16}
        className={destructive ? 'text-destructive' : 'text-foreground'}
      />
    </View>
    <Text
      className={cn(
        'text-foreground text-[15px] font-medium',
        destructive && 'text-destructive',
      )}
    >
      {label}
    </Text>
  </Pressable>
);
