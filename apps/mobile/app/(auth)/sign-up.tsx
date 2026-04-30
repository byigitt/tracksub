import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const canSubmit = name.length > 0 && email.length > 0 && password.length >= 8 && !pending;

  const handleSubmit = async () => {
    setError(null);
    setPending(true);
    try {
      const res = await authClient.signUp.email({ name, email, password });
      if (res.error) {
        setError(res.error.message ?? 'Kayıt başarısız.');
        return;
      }
      router.replace('/(app)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Beklenmeyen bir hata oluştu.');
    } finally {
      setPending(false);
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
                Hesap oluştur
              </Text>
              <Text className="text-muted-foreground">Birkaç saniye sürer.</Text>
            </View>

            <View className="gap-4">
              <View className="gap-1.5">
                <Label nativeID="name">Ad</Label>
                <Input
                  aria-labelledby="name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  placeholder="Adın"
                  editable={!pending}
                />
              </View>
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
                  autoComplete="new-password"
                  textContentType="newPassword"
                  placeholder="En az 8 karakter"
                  editable={!pending}
                />
              </View>

              {error && <Text className="text-destructive text-sm">{error}</Text>}

              <Button onPress={handleSubmit} disabled={!canSubmit}>
                {pending ? <ActivityIndicator size="small" color="#fff" /> : <Text>Kayıt ol</Text>}
              </Button>
            </View>

            <View className="flex-row justify-center gap-1">
              <Text className="text-muted-foreground text-sm">Hesabın var mı?</Text>
              <Link href="/(auth)/sign-in" className="text-foreground text-sm font-medium">
                Giriş yap
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
