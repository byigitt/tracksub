import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { ListIcon, SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { sessionQueryKey } from '@/features/auth/use-session';
import { useMe } from '@/features/me/use-me';
import { signOut } from '@/lib/auth-client';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useMe();

  const onSignOut = async () => {
    await signOut();
    queryClient.setQueryData(sessionQueryKey, null);
    await router.invalidate();
    await router.navigate({ to: '/signin' });
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">tracksub</span>
          <span>/</span>
          <span>dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            Çıkış yap
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/subscriptions">
            <ListIcon /> Aboneliklerim
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/import">
            <SparklesIcon /> Mailden içe aktar
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hoş geldin{me.data ? `, ${me.data.user.name}` : '…'}</CardTitle>
          {me.data && <CardDescription>{me.data.user.email}</CardDescription>}
        </CardHeader>
        <CardContent>
          {me.isPending && <p className="text-sm text-muted-foreground">Yükleniyor…</p>}
          {me.error && <p className="text-sm text-destructive">Hata: {me.error.message}</p>}
          {me.data && (
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              <p className="text-muted-foreground">
                Session{' '}
                <span className="font-mono text-foreground">{me.data.session.id.slice(0, 8)}…</span>{' '}
                bitiş tarihi:
              </p>
              <p className="font-medium">
                {new Date(me.data.session.expiresAt).toLocaleString('tr-TR')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
