/**
 * `@tracksub/api-client` — platform-agnostic typed REST client factory.
 *
 * Web: uses native browser cookies → pass `credentials: 'include'`, no `getCookie`.
 * Mobile: better-auth/expo stores cookies in SecureStore → pass `getCookie:
 * () => authClient.getCookie()` and we set the `cookie` header manually.
 */

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type ApiClientOptions = {
  /**
   * Base URL prefix (e.g. `https://api.tracksub.app` or `http://localhost:4000`).
   * Pass `''` (default) for same-origin (web). Path arguments to client methods
   * already start with `/api/...`.
   */
  baseUrl?: string;
  /**
   * Override fetch implementation. Defaults to `globalThis.fetch`.
   */
  fetch?: FetchLike;
  /**
   * Cookie supplier (mobile). Returns serialized cookies string or null/undefined
   * if no session yet. When provided, the request `cookie` header is set and
   * `credentials` defaults to `'omit'`.
   */
  getCookie?: () => string | null | undefined;
  /**
   * Override the request `credentials` mode.
   * - Default for web (no `getCookie`): `'include'`.
   * - Default for mobile (with `getCookie`): `'omit'`.
   */
  credentials?: RequestCredentials;
  /**
   * Extra headers merged into every request.
   */
  headers?: Record<string, string>;
};

export class ApiError extends Error {
  override name = 'ApiError';
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API ${status}: ${body || 'unknown error'}`);
  }
}
