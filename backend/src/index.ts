import { env } from './env.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { router } from './routes.js';
import { setupSwagger } from './swagger.js';
import { compress } from './compress.js';
import { logger } from './logger.js';
import { initDb } from './db.js';
import { seedUsers } from './seed.js';

const app = express();

app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'https:'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'same-origin' },
}));

app.use(cookieParser());

app.use(cors({
  origin: env.NODE_ENV === 'production'
    ? env.CORS_ORIGIN.split(',')
    : true,
  credentials: true,
}));

app.use(compress());

const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 600 : 4000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || (req.method !== 'GET' && req.method !== 'HEAD'),
  message: { success: false, error: 'Слишком много запросов, попробуйте позже' },
});
app.use('/api', readLimiter);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.path === '/health') return true;
    if (req.method === 'GET' || req.method === 'HEAD') return true;
    return req.method === 'OPTIONS';
  },
  message: { success: false, error: 'Слишком много запросов, попробуйте позже' },
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Слишком много попыток входа' },
});
app.use('/api/auth/login', authLimiter);

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 5 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Слишком много регистраций с этого адреса' },
});
app.use('/api/auth/register', registerLimiter);

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 60 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Слишком много запросов на обновление токена' },
});
app.use('/api/auth/refresh', refreshLimiter);

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 3 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Слишком много запросов на восстановление пароля' },
});
app.use('/api/auth/forgot-password', forgotLimiter);

app.get('/favicon.ico', (_req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🎓</text></svg>`);
});

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.path.includes('/health')) {
      const level = res.statusCode >= 400 ? 'warn' : 'info';
      logger.log(level, `${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

setupSwagger(app);

app.use('/api', router);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
});

async function start() {
  try {
    const fs = await import('fs');
    if (!fs.existsSync('logs')) fs.mkdirSync('logs');

    await initDb();
    await seedUsers();
    logger.info('Database connected');

    const server = app.listen(env.PORT, () => {
      logger.info(`Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
    });

    const shutdown = (signal: string) => {
      logger.info(`${signal} received, shutting down...`);
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
