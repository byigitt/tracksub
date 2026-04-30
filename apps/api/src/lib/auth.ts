import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/client.ts';
import { env, features } from '../env.ts';

// Mobile app scheme — must match `apps/mobile/app.config.ts` `scheme`.
const MOBILE_SCHEME = 'tracksub';

// Gmail scope'lar: hem mailleri okumak (import) hem de hatırlatıcı mail göndermek (reminder).
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, { provider: 'pg' }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  socialProviders: features.google
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
          scope: GOOGLE_SCOPES,
          accessType: 'offline',
          prompt: 'consent',
        },
      }
    : undefined,

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  plugins: [expo()],

  trustedOrigins: [
    env.WEB_ORIGIN,
    `${MOBILE_SCHEME}://`,
    `${MOBILE_SCHEME}://*`,
    // Expo Go / dev builds use exp:// with the LAN IP. Allowed only in dev.
    ...(env.NODE_ENV !== 'production' ? ['exp://', 'exp://**', 'exp://*'] : []),
  ],

  advanced: {
    cookiePrefix: 'tracksub',
  },
});

export type Auth = typeof auth;
export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
