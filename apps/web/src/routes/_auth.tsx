import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent } from '@/components/ui/card';
import { sessionQueryOptions } from '@/features/auth/use-session';

// Pathless layout: signed-in kullanıcı bu route'lara giremez.
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (session) {
      throw redirect({ to: '/app' });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <main className="relative grid min-h-screen place-items-center bg-background p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center justify-center gap-1.5">
          <span className="size-2 rounded-full bg-foreground" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-tight">tracksub</span>
        </div>
        <Card>
          <CardContent>
            <Outlet />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
