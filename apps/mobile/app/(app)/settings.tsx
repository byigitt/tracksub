import { useRouter } from 'expo-router';
import { LogOutIcon, MoonIcon, SunIcon, MonitorIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useMe } from '@tracksub/query';
import { authClient } from '@/lib/auth-client';
import { type ThemePreference, useTheme } from '@/lib/use-theme';
import { cn } from '@/lib/utils';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Açık', icon: SunIcon },
  { value: 'dark', label: 'Koyu', icon: MoonIcon },
  { value: 'system', label: 'Sistem', icon: MonitorIcon },
];

export default function SettingsScreen() {
  const router = useRouter();
  const me = useMe();
  const theme = useTheme();
  const [pref, setPref] = useState<ThemePreference>('system');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    void theme.getPreference().then(setPref);
  }, [theme]);

  const onSignOut = async () => {
    Alert.alert('Çıkış yap', 'Hesaptan çıkmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış yap',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await authClient.signOut();
            router.replace('/(auth)/sign-in');
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }}>
      <View className="border-border bg-card gap-1 rounded-xl border px-5 py-5">
        <Text className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
          Hesap
        </Text>
        <Text className="text-foreground text-base font-medium">{me.data?.user.name ?? '—'}</Text>
        <Text className="text-muted-foreground text-sm">{me.data?.user.email ?? '—'}</Text>
      </View>

      <View className="gap-2">
        <Text className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
          Görünüm
        </Text>
        <View className="bg-muted/40 flex-row gap-1 rounded-lg p-1">
          {THEME_OPTIONS.map((opt) => {
            const active = pref === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={async () => {
                  setPref(opt.value);
                  await theme.setPreference(opt.value);
                }}
                className={cn(
                  'flex-1 flex-row items-center justify-center gap-2 rounded-md py-2.5',
                  active && 'bg-background',
                )}
              >
                <Icon
                  as={opt.icon}
                  size={14}
                  className={active ? 'text-foreground' : 'text-muted-foreground'}
                />
                <Text
                  className={cn(
                    'text-sm font-medium',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button variant="outline" onPress={onSignOut} disabled={signingOut}>
        <Icon as={LogOutIcon} size={14} className="text-foreground" />
        <Text>{signingOut ? 'Çıkış yapılıyor…' : 'Çıkış yap'}</Text>
      </Button>
    </ScrollView>
  );
}
