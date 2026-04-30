import { queryOptions, useQuery } from '@tanstack/react-query';
import { getSession, type SessionData } from '@/lib/auth-client';

// Session tek kaynaktan: TanStack Query cache.
// Route guard'lar ve hook'lar aynı queryKey üzerinden çalışır.
export const sessionQueryKey = ['session'] as const;

export const sessionQueryOptions = queryOptions<SessionData | null>({
  queryKey: sessionQueryKey,
  queryFn: async () => {
    const { data } = await getSession();
    return data ?? null;
  },
  staleTime: 30_000,
});

export const useSessionQuery = () => useQuery(sessionQueryOptions);
