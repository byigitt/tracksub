import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { authClient } from '@/lib/auth-client';

export default function AppLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="settings"
        options={{ presentation: 'card', headerShown: true, title: 'Ayarlar' }}
      />
      <Stack.Screen name="new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="import" options={{ presentation: 'modal' }} />
      <Stack.Screen name="sub/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
