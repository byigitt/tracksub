import { createAuthClient } from 'better-auth/react';

// Aynı origin: rspack devServer /api proxy'si :4000'e gönderir,
// prod'da reverse-proxy aynı origin'den serve eder.
export const authClient = createAuthClient({
  baseURL: typeof window === 'undefined' ? 'http://localhost:4000' : window.location.origin,
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

export type SessionData = Awaited<ReturnType<typeof getSession>>['data'];
