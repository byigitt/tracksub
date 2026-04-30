import { Pressable, View } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { formatDaysLeft, formatMoney, formatPeriod } from '@/features/subscriptions/format';
import { STATUS_LABELS, type Status, type Subscription } from '@/features/subscriptions/types';
import { cn } from '@/lib/utils';

const statusDot: Record<Status, string> = {
  active: 'bg-emerald-500',
  paused: 'bg-amber-500',
  cancelled: 'bg-muted-foreground',
  expired: 'bg-destructive',
};

type Props = {
  subscription: Subscription;
  onPress: (id: string) => void;
};

export const SubscriptionCard = ({ subscription, onPress }: Props) => {
  const sub = subscription;
  const daysLabel = formatDaysLeft(sub.nextBillingAt);

  return (
    <Pressable
      onPress={() => onPress(sub.id)}
      className={cn(
        'border-border bg-card flex-row items-center justify-between gap-3 rounded-xl border px-4 py-3.5',
        'active:bg-accent/50',
      )}
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-3">
        <View
          className={cn('h-2 w-2 rounded-full', statusDot[sub.status])}
          accessibilityLabel={STATUS_LABELS[sub.status]}
        />
        <View className="min-w-0 flex-1">
          <Text className="text-foreground text-[15px] font-medium" numberOfLines={1}>
            {sub.name}
          </Text>
          <Text className="text-muted-foreground text-xs" numberOfLines={1}>
            {[sub.vendor, formatPeriod(sub.period, sub.customPeriodDays), daysLabel]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </View>
      <View className="items-end">
        <Text
          className="text-foreground font-mono text-[15px] font-semibold"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {formatMoney(sub.amount, sub.currency)}
        </Text>
      </View>
    </Pressable>
  );
};

export const SubscriptionCardSkeleton = () => (
  <View className="border-border bg-card flex-row items-center justify-between gap-3 rounded-xl border px-4 py-3.5">
    <View className="flex-1 flex-row items-center gap-3">
      <Skeleton className="h-2 w-2 rounded-full" />
      <View className="flex-1 gap-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </View>
    </View>
    <Skeleton className="h-4 w-16" />
  </View>
);
