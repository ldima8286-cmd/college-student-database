import { cleanEnv, str, port, num, makeValidator } from 'envalid';

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
  ADMIN_EMAIL: str({ default: 'admin@college.local' }),
  USER_EMAIL: str({ default: 'user@college.local' }),
  CURATOR_EMAIL: str({ default: 'curator@college.local' }),
  CURATOR_PASSWORD: str({ default: 'curator123' }),
  CURATOR_GROUP: str({ default: 'ПО-507' }),
  CORS_ORIGIN: str({ default: 'http://localhost:3000' }),
  SENTRY_DSN: str({ default: '' }),
  SMTP_HOST: str({ default: '' }),
  SMTP_PORT: port({ default: 587 }),
  SMTP_USER: str({ default: '' }),
  SMTP_PASS: str({ default: '' }),
  SMTP_FROM: str({ default: 'noreply@college.local' }),
  REFRESH_TOKEN_SECRET: str({ default: 'refresh-secret-change-in-production' }),
  FRONT_URL: str({ default: 'http://localhost:3000' }),
  REDIS_URL: str({ default: '' }),
  RESET_TOKEN_SECRET: str({ default: 'reset-secret-change-in-production' }),
  AUDIT_RETENTION_DAYS: num({ default: 30 }),
  AUDIT_MAX_ROWS: num({ default: 2000 }),
});
