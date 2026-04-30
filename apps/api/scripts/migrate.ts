// Drizzle migrate runner. drizzle-kit migrate yerine programatik çalıştırma:
// CI/Prod'da daha güvenilir, env zaten yüklü, tek dosya — kafa karıştıran soyutlama yok.
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from '../src/db/client.ts';

const main = async () => {
  console.log('running migrations...');
  await migrate(db, { migrationsFolder: './migrations' });
  console.log('migrations complete');
  await pool.end();
};

main().catch((err: unknown) => {
  console.error('migration failed', err);
  process.exit(1);
});
