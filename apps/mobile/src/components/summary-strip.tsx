import { View } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { formatMoney } from '@tracksub/shared';

type Props = {
  loading: boolean;
  activeCount: number;
  monthly: Record<string, number>;
  yearly: Record<string, number>;
};

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View className="flex-1 items-center justify-center gap-1 py-4">
    <Text className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
      {label}
    </Text>
    {children}
  </View>
);

export const SummaryStrip = ({ loading, activeCount, monthly, yearly }: Props) => {
  const monthlyEntries = Object.entries(monthly);
  const yearlyEntries = Object.entries(yearly);

  return (
    <View className="border-border bg-card flex-row rounded-xl border">
      <Cell label="Aktif">
        {loading ? (
          <Skeleton className="h-7 w-10" />
        ) : (
          <Text
            className="text-foreground text-2xl font-semibold"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {activeCount}
          </Text>
        )}
      </Cell>
      <View className="bg-border w-px" />
      <Cell label="Aylık">
        {loading ? (
          <Skeleton className="h-6 w-20" />
        ) : monthlyEntries.length === 0 ? (
          <Text className="text-muted-foreground text-2xl font-semibold">—</Text>
        ) : (
          <View className="items-center">
            {monthlyEntries.map(([cur, amount]) => (
              <Text
                key={cur}
                className="text-foreground text-base font-semibold"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatMoney(amount, cur)}
              </Text>
            ))}
          </View>
        )}
      </Cell>
      <View className="bg-border w-px" />
      <Cell label="Yıllık">
        {loading ? (
          <Skeleton className="h-6 w-20" />
        ) : yearlyEntries.length === 0 ? (
          <Text className="text-muted-foreground text-2xl font-semibold">—</Text>
        ) : (
          <View className="items-center">
            {yearlyEntries.map(([cur, amount]) => (
              <Text
                key={cur}
                className="text-foreground text-base font-semibold"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatMoney(amount, cur)}
              </Text>
            ))}
          </View>
        )}
      </Cell>
    </View>
  );
};
