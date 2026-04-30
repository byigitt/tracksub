import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/field';
import { signIn } from '@/lib/auth-client';
import { sessionQueryKey } from '@/features/auth/use-session';

export const SignInForm = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const { error } = await signIn.email(value);
      if (error) {
        setServerError(error.message ?? 'Giriş başarısız');
        return;
      }
      // Cache'i refetch et — await yeni session cache'e yazılsın diye gerekli
      await queryClient.refetchQueries({ queryKey: sessionQueryKey });
      // Router beforeLoad'ları yeni context ile yeniden çalıştır
      await router.invalidate();
      // Dashboard'a götür — _authenticated guard artık cache'ten session'ı görecek
      await router.navigate({ to: '/dashboard' });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) =>
            !value
              ? 'E-posta gerekli'
              : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                ? 'Geçersiz e-posta'
                : undefined,
        }}
      >
        {(field) => (
          <Field
            label="E-posta"
            type="email"
            autoComplete="email"
            required
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]?.toString()}
          />
        )}
      </form.Field>

      <form.Field
        name="password"
        validators={{
          onChange: ({ value }) => (value.length < 8 ? 'Şifre en az 8 karakter olmalı' : undefined),
        }}
      >
        {(field) => (
          <Field
            label="Şifre"
            type="password"
            autoComplete="current-password"
            required
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]?.toString()}
          />
        )}
      </form.Field>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit} className="mt-1 w-full">
            {isSubmitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
};
