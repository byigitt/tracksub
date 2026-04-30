// Web uses native browser cookies — `credentials: 'include'` plus same-origin
// (rspack devServer proxies `/api/*` to :4000; prod serves both behind one
// reverse proxy). No `getCookie` needed.

import { createApiClient } from '@tracksub/api-client';

export const apiClient = createApiClient({
  // Same-origin: empty baseUrl keeps requests as `/api/...` so devServer
  // proxy / prod reverse-proxy handle routing.
  baseUrl: '',
  credentials: 'include',
});
