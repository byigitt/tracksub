import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionForm } from '@/features/subscriptions/subscription-form';
import { useCreateSubscription } from '@/features/subscriptions/use-subscriptions';

export const Route = createFileRoute('/_authenticated/subscriptions/new')({
  component: NewSubscriptionPage,
});

function NewSubscriptionPage() {
  const router = useRouter();
  const create = useCreateSubscription();

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <Link to="/subscriptions" className="text-xs text-muted-foreground hover:text-foreground">
        ← Abonelikler
      </Link>
      <Card className="mt-3">
        <CardHeader>
          <CardTitle>Yeni abonelik</CardTitle>
        </CardHeader>
        <CardContent>
          <SubscriptionForm
            onSubmit={async (body) => {
              await create.mutateAsync(body);
              await router.navigate({ to: '/subscriptions' });
            }}
            onCancel={() => router.navigate({ to: '/subscriptions' })}
            submitLabel="Ekle"
          />
        </CardContent>
      </Card>
      {create.error && <p className="mt-3 text-sm text-destructive">{create.error.message}</p>}
      <div className="mt-4 flex justify-end">
        <Button asChild variant="ghost" size="sm">
          <Link to="/subscriptions">Vazgeç</Link>
        </Button>
      </div>
    </div>
  );
}
