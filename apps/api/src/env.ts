// Düz env okuma. Zod gibi ekstra dep yok, locality > abstraction.
// Eksik değerlerde startup'ta net hata atılır.
//
// Node 20.6+ native --env-file desteği var; ekstra dotenv paketine ihtiyacımız yok.
// Geliştirme için root .env'i tsx --env-file-if-exists ile yüklüyoruz (package.json scripts).

const required = (key: string): string => {
  const value = process.env[key];
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const optional = (key: string, fallback: string): string => process.env[key] ?? fallback;

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  BETTER_AUTH_SECRET: required('BETTER_AUTH_SECRET'),
  BETTER_AUTH_URL: optional('BETTER_AUTH_URL', 'http://localhost:4000'),
  WEB_ORIGIN: optional('WEB_ORIGIN', 'http://localhost:3000'),
  API_PORT: Number(optional('API_PORT', '4000')),
  NODE_ENV: optional('NODE_ENV', 'development'),
};

export type Env = typeof env;
