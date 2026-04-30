import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteSubscription } from '@tracksub/query';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId: string;
  onDeleted?: () => void;
};

export const DeleteSubscriptionDialog = ({
  open,
  onOpenChange,
  subscriptionId,
  onDeleted,
}: Props) => {
  const del = useDeleteSubscription();

  const onConfirm = async () => {
    await del.mutateAsync(subscriptionId);
    onDeleted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Silinsin mi?</DialogTitle>
          <DialogDescription>
            Bu işlem geri alınamaz. Aboneliğin tüm geçmişi (olaylar, hatırlatıcılar) silinir.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={del.isPending}>
            Vazgeç
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={del.isPending}>
            {del.isPending ? 'Siliniyor…' : 'Evet, sil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
