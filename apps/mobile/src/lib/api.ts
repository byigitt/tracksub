import { API_URL } from './api-url';
import { authClient } from './auth-client';

/**
 * Authenticated fetch wrapper. Automatically attaches better-auth/expo cookies
 * (stored in SecureStore) via `authClient.getCookie()`. Use this for all API
 * calls outside the better-auth handlers themselves.
 */
export const api = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const url = path.startsWith('http')
    ? path
    : `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const cookies = authClient.getCookie();
  const headers: Record<string, string> = {
    accept: 'application/json',
    ...(init.body !== undefined &&
      !(init.body instanceof FormData) && {
        'content-type': 'application/json',
      }),
    ...(cookies ? { cookie: cookies } : {}),
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };

  const res = await fetch(url, {
    ...init,
    headers,
    // SecureStore cookies are sent manually via the `cookie` header — don't
    // also `credentials: include` (would cause double-set issues on web).
    credentials: 'omit',
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const text = await res.text();
      message = text || message;
    } catch {
      // ignore
    }
    throw new Error(`API ${res.status}: ${message}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
};
