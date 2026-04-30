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

const optionalNullable = (key: string): string | null => {
  const v = process.env[key];
  return v && v.length > 0 ? v : null;
};

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  BETTER_AUTH_SECRET: required('BETTER_AUTH_SECRET'),
  BETTER_AUTH_URL: optional('BETTER_AUTH_URL', 'http://localhost:4000'),
  WEB_ORIGIN: optional('WEB_ORIGIN', 'http://localhost:3000'),
  API_PORT: Number(optional('API_PORT', '4000')),
  NODE_ENV: optional('NODE_ENV', 'development'),

  // AI — fal.ai any-llm
  FAL_KEY: optionalNullable('FAL_KEY'),
  AI_MODEL: optional('AI_MODEL', 'google/gemini-2.5-flash'),

  // Google OAuth (better-auth google social) — hem Gmail okuma hem gönderme
  GOOGLE_CLIENT_ID: optionalNullable('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: optionalNullable('GOOGLE_CLIENT_SECRET'),

  REMINDER_TZ: optional('REMINDER_TZ', 'Europe/Istanbul'),
};

export const features = {
  ai: env.FAL_KEY !== null,
  // Gmail OAuth tek anahtar: hem read (import) hem send (reminder) buna bağlı
  google: env.GOOGLE_CLIENT_ID !== null && env.GOOGLE_CLIENT_SECRET !== null,
};

export type Env = typeof env;
