import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './api-url';

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: 'tracksub',
      storagePrefix: 'tracksub',
      storage: SecureStore,
      cookiePrefix: 'tracksub',
    }),
  ],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

export type SessionData = Awaited<ReturnType<typeof getSession>>['data'];
