import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  CheckCircle2Icon,
  CircleIcon,
  MailIcon,
  RefreshCwIcon,
  SparklesIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { Segmented } from '@/components/segmented';
import { formatMoney } from '@/features/subscriptions/format';
import { PERIOD_LABELS } from '@/features/subscriptions/types';
import { useGmailStatus, useGmailSync } from '@/features/subscriptions/use-gmail';
import {
  type Candidate,
  useConfirmCandidates,
  useParseText,
} from '@/features/subscriptions/use-parse-text';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

type Tab = 'paste' | 'gmail';
const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'paste', label: 'Yapıştır' },
  { value: 'gmail', label: 'Gmail' },
];

export default function ImportScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('paste');
  const [text, setText] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const parse = useParseText();
  const confirm = useConfirmCandidates();
  const status = useGmailStatus();
  const sync = useGmailSync();

  const onAnalyze = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await parse.mutateAsync(text);
    setJobId(res.jobId);
    setCandidates(res.candidates);
    setSelected(new Set(res.candidates.map((_, i) => i)));
  };

  const onSync = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await sync.mutateAsync({ days: 90, limit: 200 });
    setJobId(res.jobId);
    setCandidates(res.candidates);
    setSelected(new Set(res.candidates.map((_, i) => i)));
  };

  const onConnectGmail = async () => {
    await authClient.signIn.social({ provider: 'google', callbackURL: '/(app)/import' });
    void status.refetch();
  };

  const onConfirm = async () => {
    if (!jobId || selected.size === 0) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await confirm.mutateAsync({ jobId, indices: Array.from(selected).sort((a, b) => a - b) });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <Stack.Screen options={{ headerShown: true, title: 'İçe aktar' }} />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <Segmented options={TAB_OPTIONS} value={tab} onChange={setTab} />

        {tab === 'paste' && (
          <View className="gap-3">
            <Text className="text-muted-foreground text-sm">
              Bir abonelik mailini yapıştır, AI senin için ayıklasın.
            </Text>
            <Textarea
              value={text}
              onChangeText={setText}
              placeholder="Mail içeriğini buraya yapıştır…"
              numberOfLines={10}
              editable={!parse.isPending}
            />
            <Button onPress={onAnalyze} disabled={parse.isPending || text.trim().length < 20}>
              {parse.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon as={SparklesIcon} size={14} className="text-primary-foreground" />
                  <Text>Analiz et</Text>
                </>
              )}
            </Button>
            {parse.error && <Text className="text-destructive text-sm">{parse.error.message}</Text>}
          </View>
        )}

        {tab === 'gmail' && (
          <View className="gap-3">
            {!status.data || !status.data.configured ? (
              <Text className="text-muted-foreground text-sm">
                Sunucuda Gmail OAuth yapılandırılmamış.
              </Text>
            ) : !status.data.linked ? (
              <View className="gap-3">
                <Text className="text-muted-foreground text-sm">
                  Gmail'ini bağla; abonelik mailleri taransın. SMTP yok, sadece OAuth.
                </Text>
                <Button onPress={onConnectGmail}>
                  <Icon as={MailIcon} size={14} className="text-primary-foreground" />
                  <Text>Gmail'i bağla</Text>
                </Button>
              </View>
            ) : (
              <View className="gap-3">
                <View className="border-border bg-card flex-row items-center justify-between rounded-xl border px-4 py-3">
                  <View className="min-w-0 flex-1">
                    <Text className="text-foreground text-sm font-medium">Gmail bağlı</Text>
                    <Text className="text-muted-foreground text-xs">
                      {status.data.canRead ? 'Okuma izni var.' : 'Okuma izni yok.'}
                    </Text>
                  </View>
                </View>
                <Button onPress={onSync} disabled={sync.isPending || !status.data.canRead}>
                  {sync.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon as={RefreshCwIcon} size={14} className="text-primary-foreground" />
                      <Text>Maillerden tara</Text>
                    </>
                  )}
                </Button>
                {sync.error && (
                  <Text className="text-destructive text-sm">{sync.error.message}</Text>
                )}
              </View>
            )}
          </View>
        )}

        {candidates.length > 0 && (
          <CandidatesList
            candidates={candidates}
            selected={selected}
            onToggle={(i) => {
              setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                return next;
              });
            }}
          />
        )}

        {candidates.length > 0 && (
          <Button onPress={onConfirm} disabled={confirm.isPending || selected.size === 0}>
            {confirm.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text>{selected.size} aboneliği ekle</Text>
            )}
          </Button>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const CandidatesList = ({
  candidates,
  selected,
  onToggle,
}: {
  candidates: Candidate[];
  selected: Set<number>;
  onToggle: (i: number) => void;
}) => {
  const sorted = useMemo(
    () => candidates.map((c, i) => ({ c, i })).sort((a, b) => b.c.confidence - a.c.confidence),
    [candidates],
  );
  return (
    <View className="gap-2">
      <Text className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
        {candidates.length} aday bulundu
      </Text>
      <View className="border-border bg-card overflow-hidden rounded-xl border">
        {sorted.map(({ c, i }, idx, arr) => {
          const isSelected = selected.has(i);
          return (
            <Pressable
              key={i}
              onPress={() => onToggle(i)}
              className={cn(
                'flex-row items-center gap-3 px-4 py-3 active:bg-accent/50',
                idx < arr.length - 1 && 'border-border border-b',
              )}
            >
              <Icon
                as={isSelected ? CheckCircle2Icon : CircleIcon}
                size={20}
                className={isSelected ? 'text-foreground' : 'text-muted-foreground'}
              />
              <View className="min-w-0 flex-1">
                <Text className="text-foreground text-[15px] font-medium" numberOfLines={1}>
                  {c.name}
                </Text>
                <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                  {[c.vendor, PERIOD_LABELS[c.period], `%${Math.round(c.confidence * 100)}`]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Text
                className="text-foreground font-mono text-sm font-semibold"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatMoney(c.amount, c.currency)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};
