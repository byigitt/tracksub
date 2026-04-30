// Helper to load (and refresh, if needed) the Google OAuth token for a user.
// We bypass better-auth's higher-level helpers and read directly from the `account`
// table where better-auth stores OAuth tokens.

import { and, eq } from 'drizzle-orm';
import { google } from 'googleapis';
import { db, schema } from '../db/client.ts';
import { env } from '../env.ts';

export type GoogleTokenInfo = {
  accessToken: string;
  refreshToken: string | null;
  scope: string | null;
  expiresAt: Date | null;
};

const REFRESH_SKEW_MS = 60_000; // refresh if <60s remain

export const getGoogleToken = async (userId: string): Promise<GoogleTokenInfo | null> => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;

  const [row] = await db
    .select()
    .from(schema.account)
    .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, 'google')))
    .limit(1);
  if (!row || !row.accessToken) return null;

  const expiresAt = row.accessTokenExpiresAt ?? null;
  const isExpired = expiresAt ? expiresAt.getTime() - Date.now() < REFRESH_SKEW_MS : false;

  if (isExpired && row.refreshToken) {
    const oauth2 = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
    oauth2.setCredentials({ refresh_token: row.refreshToken });
    const res = await oauth2.refreshAccessToken();
    const creds = res.credentials;
    const newAccessToken = creds.access_token ?? row.accessToken;
    const newExpiresAt = creds.expiry_date ? new Date(creds.expiry_date) : null;
    await db
      .update(schema.account)
      .set({
        accessToken: newAccessToken,
        accessTokenExpiresAt: newExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.account.id, row.id));
    return {
      accessToken: newAccessToken,
      refreshToken: row.refreshToken,
      scope: row.scope ?? null,
      expiresAt: newExpiresAt,
    };
  }

  return {
    accessToken: row.accessToken,
    refreshToken: row.refreshToken ?? null,
    scope: row.scope ?? null,
    expiresAt,
  };
};

export const hasScope = (scopeStr: string | null, target: string): boolean => {
  if (!scopeStr) return false;
  // better-auth stores OAuth scopes comma-separated; Google issues them space-separated
  // in the URL fragment. Accept both delimiters defensively.
  return scopeStr
    .split(/[\s,]+/u)
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(target);
};
