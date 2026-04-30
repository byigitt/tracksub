// Minimal API-client context. No JSX (so no per-bundler JSX runtime concerns) —
// uses `React.createElement` directly. Web/mobile both render
// `<ApiClientProvider client={apiClient}>{children}</ApiClientProvider>` from
// their own entry file.

import type { ApiClient } from '@tracksub/api-client';
import { createContext, createElement, type ReactNode, useContext } from 'react';

const ApiClientContext = createContext<ApiClient | null>(null);

export type ApiClientProviderProps = {
  client: ApiClient;
  children: ReactNode;
};

export const ApiClientProvider = ({ client, children }: ApiClientProviderProps) =>
  createElement(ApiClientContext.Provider, { value: client }, children);

export const useApiClient = (): ApiClient => {
  const ctx = useContext(ApiClientContext);
  if (!ctx) {
    throw new Error(
      '@tracksub/query: useApiClient() must be used within <ApiClientProvider>. ' +
        'Wrap your app with `<ApiClientProvider client={apiClient}>`.',
    );
  }
  return ctx;
};
