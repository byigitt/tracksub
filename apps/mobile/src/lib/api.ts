// Mobile uses better-auth/expo which keeps the session cookie in SecureStore.
// We pass it manually as the `cookie` header (createApiClient handles this when
// `getCookie` is provided and credentials default to 'omit').

import { createApiClient } from '@tracksub/api-client';
import { API_URL } from './api-url';
import { authClient } from './auth-client';

export const apiClient = createApiClient({
  baseUrl: API_URL,
  getCookie: () => authClient.getCookie(),
});
