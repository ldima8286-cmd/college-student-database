import { cleanEnv, str, port, num, makeValidator } from 'envalid';

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {}
}

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

const NODE_ENV = ((): 'development' | 'production' | 'test' => {
  const raw = process.env.NODE_ENV;
  if (raw === 'production' || raw === 'test') return raw;
  if (raw === undefined || raw === 'development') return 'development';
  throw new Error('NODE_ENV must be development, production or test');
})();

/**
 * Секрет обязателен в production: без реального значения приложение не стартует,
 * вместо того чтобы подписывать токены предсказуемой строкой из репозитория.
 * В development/test допускается явный devFallback, чтобы локальный запуск
 * и тесты не требовали ручной генерации секретов.
 */
const DEV_FALLBACK_SECRETS = new Set([
  'dev-secret-change-in-production',
  'refresh-secret-change-in-production',
  'reset-secret-change-in-production',
]);

const secret = ({ devFallback }: { devFallback: string }) => str({ default: devFallback });

export const env = cleanEnv(process.env, {
  PORT: port({ default: 5000 }),
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
  DATABASE_URL: dbUrl({ default: 'sqlite:./database.sqlite' }),
  JWT_SECRET: secret({ devFallback: 'dev-secret-change-in-production' }),
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
  REFRESH_TOKEN_SECRET: secret({ devFallback: 'refresh-secret-change-in-production' }),
  FRONT_URL: str({ default: 'http://localhost:3000' }),
  REDIS_URL: str({ default: '' }),
  RESET_TOKEN_SECRET: secret({ devFallback: 'reset-secret-change-in-production' }),
  AUDIT_RETENTION_DAYS: num({ default: 30 }),
  AUDIT_MAX_ROWS: num({ default: 2000 }),
});

const REQUIRED_SECRETS = [
  ['JWT_SECRET', env.JWT_SECRET],
  ['REFRESH_TOKEN_SECRET', env.REFRESH_TOKEN_SECRET],
  ['RESET_TOKEN_SECRET', env.RESET_TOKEN_SECRET],
] as const;

if (NODE_ENV === 'production') {
  const problems = REQUIRED_SECRETS.flatMap(([name, value]) => {
    if (!value) return [`${name}: не задан`];
    if (DEV_FALLBACK_SECRETS.has(value)) {
      return [`${name}: используется значение для разработки — сгенерируйте случайный секрет`];
    }
    if (value.length < 32) return [`${name}: минимум 32 символа, получено ${value.length}`];
    return [];
  });
  if (problems.length > 0) {
    throw new Error(
      `Отказ запуска в production из-за небезопасных секретов:\n  - ${problems.join('\n  - ')}\n` +
      'Сгенерируйте значения командой: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
    );
  }
}
