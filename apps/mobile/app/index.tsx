import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { authClient } from '@/lib/auth-client';

export default function Index() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={session ? '/(app)' : '/(auth)/sign-in'} />;
}
