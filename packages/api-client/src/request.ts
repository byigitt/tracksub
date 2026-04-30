import type { ApiClientOptions, FetchLike } from './types.ts';
import { ApiError } from './types.ts';

export type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

/**
 * Create a typed `request<T>(path, init)` bound to `opts`.
 *
 * - Adds `Accept: application/json` always.
 * - Adds `Content-Type: application/json` when body is a string (JSON.stringify
 *   convention).
 * - Sets `cookie` header when `getCookie()` returns a value (mobile path).
 * - Sets `credentials` based on `getCookie` presence unless overridden.
 * - Returns parsed JSON for 2xx (or `undefined` for 204/empty).
 * - Throws `ApiError(status, bodyText)` on non-2xx.
 */
export const createRequest = (opts: ApiClientOptions): RequestFn => {
  const baseUrl = opts.baseUrl ?? '';
  const fetchImpl: FetchLike = opts.fetch ?? (globalThis as { fetch: FetchLike }).fetch;
  const credentials = opts.credentials ?? (opts.getCookie ? 'omit' : 'include');
  const extraHeaders = opts.headers ?? {};

  return async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const url =
      path.startsWith('http://') || path.startsWith('https://')
        ? path
        : `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    const cookies = opts.getCookie?.();
    const isString = typeof init.body === 'string';

    const headers: Record<string, string> = {
      accept: 'application/json',
      ...(isString ? { 'content-type': 'application/json' } : {}),
      ...extraHeaders,
      ...(cookies ? { cookie: cookies } : {}),
      ...(init.headers as Record<string, string> | undefined),
    };

    const res = await fetchImpl(url, {
      ...init,
      headers,
      credentials,
    });

    if (!res.ok) {
      let body = res.statusText;
      try {
        const text = await res.text();
        if (text) body = text;
      } catch {
        // ignore
      }
      throw new ApiError(res.status, body);
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  };
};
