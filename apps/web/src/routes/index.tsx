import { createFileRoute, redirect } from '@tanstack/react-router';
import { sessionQueryOptions } from '@/features/auth/use-session';

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    // ensureQueryData: cache'te yoksa fetch eder, varsa cached değeri döner.
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions);
    throw redirect({ to: session ? '/dashboard' : '/signin' });
  },
});
