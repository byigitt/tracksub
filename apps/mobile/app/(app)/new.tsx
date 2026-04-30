import { Stack, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SubscriptionForm } from '@/components/subscription-form';
import { useCreateSubscription } from '@tracksub/query';

export default function NewSubscriptionScreen() {
  const router = useRouter();
  const create = useCreateSubscription();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <Stack.Screen
        options={{ headerShown: true, title: 'Yeni abonelik', headerLargeTitle: false }}
      />
      <SubscriptionForm
        submitLabel="Kaydet"
        pending={create.isPending}
        onSubmit={async (body) => {
          await create.mutateAsync(body);
          router.back();
        }}
      />
    </KeyboardAvoidingView>
  );
}
