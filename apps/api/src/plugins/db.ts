import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { db, pool, type Database } from '../db/client.ts';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

const dbPlugin: FastifyPluginAsync = async (app) => {
  app.decorate('db', db);

  app.addHook('onClose', async () => {
    await pool.end();
  });
};

export default fp(dbPlugin, { name: 'db' });
