import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { LogOutIcon, UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { sessionQueryKey } from '@/features/auth/use-session';
import { useMe } from '@/features/me/use-me';
import { signOut } from '@/lib/auth-client';

const initials = (name?: string | null, email?: string | null): string => {
  const src = (name || email || '').trim();
  if (!src) return '?';
  const parts = src.split(/\s+/u).filter(Boolean);
  const a = parts[0];
  const b = parts[1];
  if (a && b) return (a.charAt(0) + b.charAt(0)).toUpperCase();
  return src.slice(0, 2).toUpperCase();
};

export const UserMenu = () => {
  const me = useMe();
  const router = useRouter();
  const qc = useQueryClient();

  const onSignOut = async () => {
    await signOut();
    qc.setQueryData(sessionQueryKey, null);
    await router.invalidate();
    await router.navigate({ to: '/signin' });
  };

  const user = me.data?.user;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Hesap menüsü"
          className="size-8 rounded-full font-mono text-[11px] font-semibold"
        >
          {user ? initials(user.name, user.email) : <UserIcon className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {user && (
          <div className="flex flex-col gap-0.5 px-2 py-1.5">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </div>
        )}
        {user && <DropdownMenuSeparator />}
        <DropdownMenuItem variant="destructive" onSelect={onSignOut}>
          <LogOutIcon /> Çıkış yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
