import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import autoload from '@fastify/autoload';
import Fastify from 'fastify';
import { env } from './env.ts';

const here = dirname(fileURLToPath(import.meta.url));

export const buildServer = async () => {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'HH:MM:ss' },
            }
          : undefined,
    },
  });

  // Plugins: encapsulation kapalı (fastify-plugin ile sarılmış), decorator'lar app-wide.
  await app.register(autoload, {
    dir: join(here, 'plugins'),
    forceESM: true,
  });

  // Modules: business routes, /api prefix.
  await app.register(autoload, {
    dir: join(here, 'modules'),
    options: { prefix: '/api' },
    forceESM: true,
    dirNameRoutePrefix: false,
  });

  return app;
};

export type AppServer = Awaited<ReturnType<typeof buildServer>>;
