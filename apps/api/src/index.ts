import { env } from './env.ts';
import { buildServer } from './server.ts';

const app = await buildServer();

app.listen({ port: env.API_PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`tracksub-api ready at ${address}`);
});

const shutdown = async (signal: string) => {
  app.log.info(`${signal} received, closing...`);
  await app.close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
