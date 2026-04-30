import type { FastifyPluginAsync } from 'fastify';

// modules/* autoload edilirken `/api` prefix'i alır.
// Bu dosya `/api/health` endpoint'i olur.
const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({ ok: true, service: 'tracksub-api' }));
};

export default healthRoutes;
