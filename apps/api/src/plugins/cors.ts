import cors from '@fastify/cors';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../env.ts';

// fastify-plugin sarmalı: encapsulation'u kapatır, decorator'lar üst scope'a sızar.
//
// Web (browser) ve mobile (Expo) farklı CORS davranışı ister:
//   - Web: same-origin + credentials (cookie). Origin = WEB_ORIGIN, credentials true.
//   - Mobile: better-auth/expo cookie'leri SecureStore'da tutar ve `Cookie` header'ı
//             manuel ekler. Bu yüzden credentials gerekmez ama origin permissive olmalı
//             (Expo Go: origin yok / null; dev build: tracksub://; release: tracksub://).
//
// `@fastify/cors` origin function'ı bize per-request karar verme hakkı tanıyor.
const corsPlugin: FastifyPluginAsync = async (app) => {
  const allowedExactOrigins = new Set<string>([env.WEB_ORIGIN]);

  await app.register(cors, {
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    origin: (origin, cb) => {
      // No origin: native fetch (mobile / curl) → allow.
      if (!origin) return cb(null, true);

      // Mobile schemes / Expo dev URLs.
      if (origin.startsWith('tracksub://')) return cb(null, true);
      if (env.NODE_ENV !== 'production' && origin.startsWith('exp://')) return cb(null, true);

      // Browser web app.
      if (allowedExactOrigins.has(origin)) return cb(null, true);

      return cb(new Error(`CORS: origin ${origin} not allowed`), false);
    },
  });
};

export default fp(corsPlugin, { name: 'cors' });
