import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/field';
import { signUp } from '@/lib/auth-client';
import { sessionQueryKey } from '@/features/auth/use-session';

export const SignUpForm = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: '', email: '', password: '' },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const { error } = await signUp.email(value);
      if (error) {
        setServerError(error.message ?? 'Kayıt başarısız');
        return;
      }
      await queryClient.refetchQueries({ queryKey: sessionQueryKey });
      await router.invalidate();
      await router.navigate({ to: '/app' });
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
        name="name"
        validators={{
          onChange: ({ value }) =>
            value.trim().length < 2 ? 'Ad en az 2 karakter olmalı' : undefined,
        }}
      >
        {(field) => (
          <Field
            label="Ad"
            autoComplete="name"
            required
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]?.toString()}
          />
        )}
      </form.Field>

      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) =>
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Geçersiz e-posta' : undefined,
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
            autoComplete="new-password"
            required
            minLength={8}
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]?.toString()}
            hint="En az 8 karakter"
          />
        )}
      </form.Field>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit} className="mt-1 w-full">
            {isSubmitting ? 'Kayıt oluşturuluyor…' : 'Hesap aç'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
};
