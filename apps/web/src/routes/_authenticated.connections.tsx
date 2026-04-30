import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeftIcon, MailIcon, UnlinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { signIn } from '@/lib/auth-client';
import { ConnectionCard } from '@/features/connections/connection-card';
import { useGmailDisconnect, useGmailStatus } from '@/features/subscriptions/use-gmail';

export const Route = createFileRoute('/_authenticated/connections')({
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const status = useGmailStatus();
  const disconnect = useGmailDisconnect();

  const onConnectGoogle = async () => {
    await signIn.social({
      provider: 'google',
      callbackURL: window.location.href,
    });
  };

  const gmail = status.data;
  const gmailStatus: 'connected' | 'partial' | 'disconnected' | 'unconfigured' = !gmail?.configured
    ? 'unconfigured'
    : !gmail.linked
      ? 'disconnected'
      : !gmail.canRead
        ? 'partial'
        : 'connected';

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-6">
      <Link
        to="/app"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3" /> Geri
      </Link>

      <header className="mt-3 mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Bağlantılar</h1>
      </header>

      <section className="flex flex-col gap-3">
        {status.isPending ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : (
          <ConnectionCard
            icon={<MailIcon className="size-5" />}
            name="Gmail"
            status={gmailStatus}
            meta={
              gmail?.linked && gmail.lastSyncedAt
                ? `Son tarama: ${new Date(gmail.lastSyncedAt).toLocaleString('tr-TR')}`
                : undefined
            }
            actions={
              <GmailActions
                gmailStatus={gmailStatus}
                onConnect={onConnectGoogle}
                onDisconnect={() => disconnect.mutateAsync()}
                disconnecting={disconnect.isPending}
              />
            }
          />
        )}
      </section>

      {/* Future: more connections (Outlook, Apple Mail, banking apps...) */}
    </div>
  );
}

type GmailActionsProps = {
  gmailStatus: 'connected' | 'partial' | 'disconnected' | 'unconfigured';
  onConnect: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
};

const GmailActions = ({
  gmailStatus,
  onConnect,
  onDisconnect,
  disconnecting,
}: GmailActionsProps) => {
  if (gmailStatus === 'unconfigured') {
    return (
      <p className="text-xs text-muted-foreground">
        Sunucu Google entegrasyonu için yapılandırılmamış.
      </p>
    );
  }
  if (gmailStatus === 'disconnected') {
    return <Button onClick={onConnect}>Gmail'i bağla</Button>;
  }
  if (gmailStatus === 'partial') {
    return (
      <>
        <Button onClick={onConnect}>İzni yenile</Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDisconnect}
          disabled={disconnecting}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <UnlinkIcon /> Bağlantıyı kaldır
        </Button>
      </>
    );
  }
  return (
    <>
      <Button variant="outline" size="sm" onClick={onConnect}>
        İzinleri yenile
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDisconnect}
        disabled={disconnecting}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <UnlinkIcon /> {disconnecting ? 'Kaldırılıyor…' : 'Bağlantıyı kaldır'}
      </Button>
    </>
  );
};
