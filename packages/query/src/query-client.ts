import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';

/**
 * Sane defaults shared by web + mobile.
 *
 * - `staleTime: 30s` — list/detail screens reuse cache between mounts without
 *   refetch storms; tweak per-query via `staleTime` if you need fresh data.
 * - `gcTime: 5min` — keep data cached after unmount (mobile back-stack).
 * - `retry: 1` — single retry on 5xx; aborts on 4xx via tanstack default.
 * - `refetchOnWindowFocus: false` — too aggressive for both web tabs and mobile
 *   focus; rely on explicit `invalidateQueries` calls.
 * - `refetchOnReconnect: true` — recover after network drop (mobile esp.).
 * - `mutations.retry: 0` — don't double-charge POSTs.
 */
const defaults: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
};

export const createQueryClient = (overrides: QueryClientConfig = {}): QueryClient => {
  return new QueryClient({
    ...defaults,
    ...overrides,
    defaultOptions: {
      ...defaults.defaultOptions,
      ...overrides.defaultOptions,
      queries: {
        ...defaults.defaultOptions?.queries,
        ...overrides.defaultOptions?.queries,
      },
      mutations: {
        ...defaults.defaultOptions?.mutations,
        ...overrides.defaultOptions?.mutations,
      },
    },
  });
};
