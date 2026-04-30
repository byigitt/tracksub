import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { sessionQueryOptions } from '@/features/auth/use-session';

// Pathless layout: signed-in kullanıcı bu route'lara giremez.
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (session) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardContent>
          <Outlet />
        </CardContent>
      </Card>
    </main>
  );
}
