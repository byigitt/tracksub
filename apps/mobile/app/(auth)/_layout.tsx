import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { authClient } from '@/lib/auth-client';

export default function AuthLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(app)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
