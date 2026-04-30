import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteSubscriptionDialog } from './delete-subscription-dialog';
import { SubscriptionForm } from './subscription-form';
import { useCreateSubscription, useSubscription, useUpdateSubscription } from '@tracksub/query';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined = create mode; string = edit mode */
  subscriptionId?: string;
  onSuccess?: () => void;
};

export const SubscriptionModal = ({ open, onOpenChange, subscriptionId, onSuccess }: Props) => {
  const isEdit = Boolean(subscriptionId);
  const sub = useSubscription(open && isEdit ? subscriptionId : undefined);
  const create = useCreateSubscription();
  const update = useUpdateSubscription(subscriptionId ?? '');
  const [askDelete, setAskDelete] = useState(false);

  const close = () => onOpenChange(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Aboneliği düzenle' : 'Yeni abonelik'}</DialogTitle>
          </DialogHeader>

          {isEdit && sub.isPending ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : isEdit && sub.error ? (
            <p className="text-sm text-destructive">Yüklenemedi: {sub.error.message}</p>
          ) : (
            <SubscriptionForm
              initial={isEdit ? (sub.data ?? null) : null}
              onSubmit={async (body) => {
                if (isEdit) await update.mutateAsync(body);
                else await create.mutateAsync(body);
                onSuccess?.();
                close();
              }}
              onCancel={close}
              submitLabel={isEdit ? 'Güncelle' : 'Ekle'}
            />
          )}

          {isEdit && sub.data && (
            <div className="-mx-6 -mb-6 mt-2 flex items-center justify-between border-t bg-muted/20 px-6 py-3">
              <span className="text-xs text-muted-foreground">Bu aboneliği kalıcı olarak sil.</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setAskDelete(true)}
              >
                Sil
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isEdit && subscriptionId && (
        <DeleteSubscriptionDialog
          open={askDelete}
          onOpenChange={setAskDelete}
          subscriptionId={subscriptionId}
          onDeleted={() => {
            setAskDelete(false);
            onSuccess?.();
            close();
          }}
        />
      )}
    </>
  );
};
