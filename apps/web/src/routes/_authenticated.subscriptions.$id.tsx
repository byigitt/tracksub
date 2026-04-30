import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { SubscriptionForm } from '@/features/subscriptions/subscription-form';
import {
  useDeleteSubscription,
  useSubscription,
  useUpdateSubscription,
} from '@/features/subscriptions/use-subscriptions';

export const Route = createFileRoute('/_authenticated/subscriptions/$id')({
  component: EditSubscriptionPage,
});

function EditSubscriptionPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const sub = useSubscription(id);
  const update = useUpdateSubscription(id);
  const del = useDeleteSubscription();
  const [askDelete, setAskDelete] = useState(false);

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <Link to="/subscriptions" className="text-xs text-muted-foreground hover:text-foreground">
        ← Abonelikler
      </Link>

      <Card className="mt-3">
        <CardHeader>
          <CardTitle>{sub.data ? sub.data.name : 'Aboneliği düzenle'}</CardTitle>
        </CardHeader>
        <CardContent>
          {sub.isPending && (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}
          {sub.error && (
            <p className="text-sm text-destructive">Yüklenemedi: {sub.error.message}</p>
          )}
          {sub.data && (
            <SubscriptionForm
              initial={sub.data}
              onSubmit={async (body) => {
                await update.mutateAsync(body);
                await router.navigate({ to: '/subscriptions' });
              }}
              onCancel={() => router.navigate({ to: '/subscriptions' })}
              submitLabel="Güncelle"
            />
          )}
        </CardContent>
      </Card>

      {sub.data && (
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="destructive" size="sm" onClick={() => setAskDelete(true)}>
            Aboneliği sil
          </Button>
        </div>
      )}

      <Dialog open={askDelete} onOpenChange={setAskDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Silinsin mi?</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Aboneliğin tüm geçmişi (olaylar, hatırlatıcılar) silinir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAskDelete(false)}>
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await del.mutateAsync(id);
                setAskDelete(false);
                await router.navigate({ to: '/subscriptions' });
              }}
              disabled={del.isPending}
            >
              {del.isPending ? 'Siliniyor…' : 'Evet, sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
