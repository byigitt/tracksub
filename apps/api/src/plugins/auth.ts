import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { auth, type Auth, type Session } from '../lib/auth.ts';

declare module 'fastify' {
  interface FastifyInstance {
    auth: Auth;
    getSession: (request: FastifyRequest) => Promise<Session>;
  }
  interface FastifyRequest {
    session: Session;
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorate('auth', auth);

  app.decorate('getSession', async (request: FastifyRequest) => {
    return auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  });

  // request.session - her istekte kullanılabilir, lazy değil ama cheap.
  app.decorateRequest('session', null);
  app.addHook('preHandler', async (request) => {
    request.session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
  });

  // /api/auth/* catch-all — better-auth Fastify integration pattern.
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    handler: async (request, reply) => {
      try {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const headers = fromNodeHeaders(request.headers);

        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        const response = await auth.handler(req);

        reply.status(response.status);
        response.headers.forEach((value, key) => reply.header(key, value));
        return reply.send(response.body ? await response.text() : null);
      } catch (error) {
        request.log.error({ err: error }, 'auth handler failed');
        return reply.status(500).send({ error: 'Internal authentication error' });
      }
    },
  });
};

export default fp(authPlugin, { name: 'auth', dependencies: [] });
