import { Link, createFileRoute } from '@tanstack/react-router';
import { SignUpForm } from '@/features/auth/sign-up-form';

export const Route = createFileRoute('/_auth/signup')({
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Hesap aç</h1>
        <p className="text-sm text-muted-foreground">Yeni bir tracksub hesabı oluştur.</p>
      </header>
      <SignUpForm />
      <p className="text-sm text-muted-foreground">
        Zaten üyesin?{' '}
        <Link to="/signin" className="font-medium text-primary hover:underline">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
