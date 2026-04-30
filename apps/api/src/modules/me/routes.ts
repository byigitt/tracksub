import type { FastifyPluginAsync } from 'fastify';

const meRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/me — preHandler'dan request.session geliyor (auth plugin)
  app.get('/me', async (request, reply) => {
    if (!request.session) {
      return reply.status(401).send({ error: 'unauthorized' });
    }
    return {
      user: request.session.user,
      session: request.session.session,
    };
  });
};

export default meRoutes;
