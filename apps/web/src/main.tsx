import '@/styles/globals.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { ApiClientProvider } from '@tracksub/query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { apiClient } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import { router } from '@/router';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={apiClient}>
        <RouterProvider router={router} />
      </ApiClientProvider>
    </QueryClientProvider>
  </StrictMode>,
);
