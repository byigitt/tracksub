import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { SubscriptionForm } from '@/components/subscription-form';
import { useDeleteSubscription, useSubscription, useUpdateSubscription } from '@tracksub/query';

export default function EditSubscriptionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sub = useSubscription(id);
  const update = useUpdateSubscription(id ?? '');
  const del = useDeleteSubscription();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <Stack.Screen options={{ headerShown: true, title: sub.data?.name ?? 'Abonelik' }} />

      {sub.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : sub.error || !sub.data ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-destructive text-sm">
            Yüklenemedi: {sub.error?.message ?? 'bulunamadı'}
          </Text>
        </View>
      ) : (
        <SubscriptionForm
          initial={sub.data}
          submitLabel="Kaydet"
          pending={update.isPending || del.isPending}
          onSubmit={async (body) => {
            await update.mutateAsync(body);
            router.back();
          }}
          onDelete={async () => {
            if (!id) return;
            await del.mutateAsync(id);
            router.back();
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}
