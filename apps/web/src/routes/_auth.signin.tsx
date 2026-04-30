import { Link, createFileRoute } from '@tanstack/react-router';
import { SignInForm } from '@/features/auth/sign-in-form';

export const Route = createFileRoute('/_auth/signin')({
  component: SignInPage,
});

function SignInPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Giriş yap</h1>
        <p className="text-sm text-muted-foreground">Hesabına e-posta ve şifre ile gir.</p>
      </header>
      <SignInForm />
      <p className="text-sm text-muted-foreground">
        Hesabın yok mu?{' '}
        <Link to="/signup" className="font-medium text-primary hover:underline">
          Hesap aç
        </Link>
      </p>
    </div>
  );
}
