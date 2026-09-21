import { cleanEnv, str, port, makeValidator } from 'envalid';

const dbUrl = makeValidator((v) => {
  if (!v) return 'sqlite:./database.sqlite';
  if (v.startsWith('sqlite:')) return v;
  try {
    new URL(v);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL or sqlite:./path');
  }
  return v;
});

export const env = cleanEnv(process.env, {
  PORT: port({ default: 5000 }),
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
  DATABASE_URL: dbUrl({ default: 'sqlite:./database.sqlite' }),
  JWT_SECRET: str({ default: 'dev-secret-change-in-production' }),
  ADMIN_PASSWORD: str({ default: 'admin123' }),
  USER_PASSWORD: str({ default: 'user123' }),
  CORS_ORIGIN: str({ default: 'http://localhost:3000' }),
  SENTRY_DSN: str({ default: '' }),
});
