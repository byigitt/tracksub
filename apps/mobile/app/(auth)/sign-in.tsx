import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setPending(true);
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? 'Giriş başarısız.');
        return;
      }
      router.replace('/(app)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Beklenmeyen bir hata oluştu.');
    } finally {
      setPending(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGooglePending(true);
    try {
      const res = await authClient.signIn.social({ provider: 'google', callbackURL: '/(app)' });
      if (res.error) {
        setError(res.error.message ?? 'Google ile girişte hata.');
        return;
      }
      // On native signIn.social does not navigate automatically.
      router.replace('/(app)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Beklenmeyen bir hata oluştu.');
    } finally {
      setGooglePending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          className="px-6"
        >
          <View className="gap-8">
            <View className="gap-1.5">
              <Text variant="h2" className="border-0 pb-0">
                Hoş geldin
              </Text>
              <Text className="text-muted-foreground">
                Aboneliklerini takip etmek için giriş yap.
              </Text>
            </View>

            <View className="gap-4">
              <View className="gap-1.5">
                <Label nativeID="email">E-posta</Label>
                <Input
                  aria-labelledby="email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  placeholder="ornek@mail.com"
                  editable={!pending}
                />
              </View>
              <View className="gap-1.5">
                <Label nativeID="pw">Şifre</Label>
                <Input
                  aria-labelledby="pw"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                  textContentType="password"
                  placeholder="••••••••"
                  editable={!pending}
                />
              </View>

              {error && <Text className="text-destructive text-sm">{error}</Text>}

              <Button onPress={handleSubmit} disabled={pending || !email || !password}>
                {pending ? <ActivityIndicator size="small" color="#fff" /> : <Text>Giriş yap</Text>}
              </Button>

              <View className="flex-row items-center gap-3">
                <View className="bg-border h-px flex-1" />
                <Text className="text-muted-foreground text-xs uppercase tracking-wider">veya</Text>
                <View className="bg-border h-px flex-1" />
              </View>

              <Button variant="outline" onPress={handleGoogle} disabled={googlePending}>
                {googlePending ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Text>Google ile devam et</Text>
                )}
              </Button>
            </View>

            <View className="flex-row justify-center gap-1">
              <Text className="text-muted-foreground text-sm">Hesabın yok mu?</Text>
              <Link href="/(auth)/sign-up" className="text-foreground text-sm font-medium">
                Kayıt ol
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
