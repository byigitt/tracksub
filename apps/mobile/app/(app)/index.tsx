import { useRouter } from 'expo-router';
import { PlusIcon, SearchIcon, SettingsIcon, SparklesIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { SubscriptionCard, SubscriptionCardSkeleton } from '@/components/subscription-card';
import { SummaryStrip } from '@/components/summary-strip';
import {
  computeSummary,
  formatDaysLeft,
  formatMoney,
  STATUS_LABELS,
  type Status,
} from '@tracksub/shared';
import { useMe, useSubscriptions } from '@tracksub/query';
import { cn } from '@/lib/utils';

type Filter = 'all' | Status;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: STATUS_LABELS.active },
  { id: 'paused', label: STATUS_LABELS.paused },
  { id: 'cancelled', label: STATUS_LABELS.cancelled },
  { id: 'expired', label: STATUS_LABELS.expired },
];

export default function HomeScreen() {
  const router = useRouter();
  const me = useMe();
  const subs = useSubscriptions();
  const summary = computeSummary(subs.data);

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const counts = subs.data
    ? subs.data.reduce<Record<string, number>>((acc, s) => {
        acc[s.status] = (acc[s.status] ?? 0) + 1;
        return acc;
      }, {})
    : {};

  const filtered = useMemo(() => {
    if (!subs.data) return [];
    const byStatus = filter === 'all' ? subs.data : subs.data.filter((s) => s.status === filter);
    const q = query.trim().toLocaleLowerCase('tr');
    if (!q) return byStatus;
    return byStatus.filter((s) => {
      const haystack = `${s.name} ${s.vendor ?? ''}`.toLocaleLowerCase('tr');
      return haystack.includes(q);
    });
  }, [subs.data, filter, query]);

  const firstName = me.data?.user.name?.split(' ')[0] ?? '';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <SubscriptionCard subscription={item} onPress={(id) => router.push(`/(app)/sub/${id}`)} />
        )}
        ItemSeparatorComponent={() => <View className="h-2" />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={subs.isRefetching && !subs.isLoading}
            onRefresh={() => void subs.refetch()}
          />
        }
        ListHeaderComponent={
          <View className="gap-5 pt-2 pb-4">
            <View className="flex-row items-end justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-foreground text-[26px] font-semibold leading-tight">
                  {firstName ? `Selam ${firstName}` : 'Selam'}
                </Text>
                <Text className="text-muted-foreground text-sm">Aboneliklerine bakalım.</Text>
              </View>
              <Pressable
                onPress={() => router.push('/(app)/settings')}
                className="bg-secondary h-10 w-10 items-center justify-center rounded-full active:opacity-80"
                accessibilityLabel="Ayarlar"
              >
                <Icon as={SettingsIcon} size={18} className="text-foreground" />
              </Pressable>
            </View>

            <SummaryStrip
              loading={subs.isPending}
              activeCount={summary.activeCount}
              monthly={summary.monthlyByCurrency}
              yearly={summary.yearlyByCurrency}
            />

            {!subs.isPending && summary.upcoming.length > 0 && (
              <View className="gap-2">
                <Text className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                  Yaklaşan yenilemeler
                </Text>
                <View className="border-border bg-card overflow-hidden rounded-xl border">
                  {summary.upcoming.map((s, i, arr) => (
                    <Pressable
                      key={s.id}
                      onPress={() => router.push(`/(app)/sub/${s.id}`)}
                      className={cn(
                        'flex-row items-center justify-between gap-3 px-4 py-3 active:bg-accent/50',
                        i < arr.length - 1 && 'border-border border-b',
                      )}
                    >
                      <View className="min-w-0 flex-1">
                        <Text className="text-foreground text-sm font-medium" numberOfLines={1}>
                          {s.name}
                        </Text>
                        <Text className="text-muted-foreground text-xs">
                          {formatDaysLeft(s.nextBillingAt)}
                        </Text>
                      </View>
                      <Text
                        className="text-foreground font-mono text-sm font-semibold"
                        style={{ fontVariant: ['tabular-nums'] }}
                      >
                        {formatMoney(s.amount, s.currency)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-foreground text-base font-medium">Aboneliklerim</Text>
              <View className="flex-row gap-2">
                <Button variant="outline" size="sm" onPress={() => router.push('/(app)/import')}>
                  <Icon as={SparklesIcon} size={14} className="text-foreground" />
                  <Text>İçe aktar</Text>
                </Button>
                <Button size="sm" onPress={() => router.push('/(app)/new')}>
                  <Icon as={PlusIcon} size={14} className="text-primary-foreground" />
                  <Text>Yeni</Text>
                </Button>
              </View>
            </View>

            {subs.data && subs.data.length > 0 && (
              <View className="gap-3">
                <View className="bg-muted/40 flex-row flex-wrap gap-1 rounded-lg p-1">
                  {FILTERS.map((f) => {
                    const total = f.id === 'all' ? subs.data!.length : (counts[f.id] ?? 0);
                    const active = filter === f.id;
                    return (
                      <Pressable
                        key={f.id}
                        onPress={() => setFilter(f.id)}
                        className={cn(
                          'flex-row items-center gap-1.5 rounded-md px-2.5 py-1.5',
                          active && 'bg-background',
                        )}
                      >
                        <Text
                          className={cn(
                            'text-xs font-medium',
                            active ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {f.label}
                        </Text>
                        <Text
                          className={cn(
                            'font-mono text-[10px]',
                            active ? 'text-muted-foreground' : 'text-muted-foreground/60',
                          )}
                          style={{ fontVariant: ['tabular-nums'] }}
                        >
                          {total}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="relative">
                  <View className="absolute left-3 top-0 bottom-0 z-10 justify-center">
                    <Icon as={SearchIcon} size={14} className="text-muted-foreground" />
                  </View>
                  <Input
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Ara…"
                    className="pl-9"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}

            {subs.isPending && (
              <View className="gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SubscriptionCardSkeleton key={i} />
                ))}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          subs.isPending ? null : subs.data && subs.data.length === 0 ? (
            <EmptyState
              onNew={() => router.push('/(app)/new')}
              onImport={() => router.push('/(app)/import')}
            />
          ) : (
            <View className="bg-muted/30 mt-2 items-center rounded-xl p-8">
              <Text className="text-muted-foreground text-sm">
                {query ? 'Aramayla eşleşen abonelik yok.' : 'Bu filtrede abonelik yok.'}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const EmptyState = ({ onNew, onImport }: { onNew: () => void; onImport: () => void }) => (
  <View className="border-border bg-card mt-2 items-center gap-4 rounded-xl border border-dashed p-8">
    <View className="bg-secondary h-12 w-12 items-center justify-center rounded-full">
      <Icon as={SparklesIcon} size={20} className="text-foreground" />
    </View>
    <View className="items-center gap-1">
      <Text className="text-foreground text-base font-medium">Henüz abonelik yok</Text>
      <Text className="text-muted-foreground text-center text-sm">
        Manuel ekle ya da bir mail yapıştır, AI senin için ayıklasın.
      </Text>
    </View>
    <View className="flex-row gap-2">
      <Button variant="outline" onPress={onImport}>
        <Icon as={SparklesIcon} size={14} className="text-foreground" />
        <Text>İçe aktar</Text>
      </Button>
      <Button onPress={onNew}>
        <Icon as={PlusIcon} size={14} className="text-primary-foreground" />
        <Text>Yeni</Text>
      </Button>
    </View>
  </View>
);
