import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';

type Props = {
  children: ReactNode;
};

export const AppShell = ({ children }: Props) => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-foreground" aria-hidden="true" />
            <span className="text-sm font-semibold tracking-tight">tracksub</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
};
