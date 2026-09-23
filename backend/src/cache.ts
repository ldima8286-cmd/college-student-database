import { env } from './env.js';
import { logger } from './logger.js';

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const memory = new Map<string, CacheEntry>();
let redisClient: any = null;
let redisReady = false;
let redisTried = false;

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of memory) {
    if (entry.expiresAt < now) memory.delete(key);
  }
}

async function getRedis(): Promise<any | null> {
  if (!env.REDIS_URL) return null;
  if (redisTried) return redisReady ? redisClient : null;
  redisTried = true;
  try {
    const { createClient } = await import('redis');
    redisClient = createClient({ url: env.REDIS_URL });
    redisClient.on('error', (err: Error) => {
      logger.warn(`Redis error: ${err.message}; falling back to in-memory cache`);
      redisReady = false;
    });
    await redisClient.connect();
    redisReady = true;
    logger.info('Redis cache connected');
  } catch (err: any) {
    logger.warn(`Redis unavailable (${err.message}); using in-memory cache`);
    redisReady = false;
  }
  return redisReady ? redisClient : null;
}

export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const client = await getRedis();
  if (client) {
    try {
      const raw = await client.get(`cache:${key}`);
      if (raw) return JSON.parse(raw) as T;
    } catch (err: any) {
      logger.warn(`Redis GET failed: ${err.message}`);
    }
    const value = await loader();
    try {
      await client.setEx(`cache:${key}`, Math.ceil(ttlMs / 1000), JSON.stringify(value));
    } catch (err: any) {
      logger.warn(`Redis SET failed: ${err.message}`);
    }
    return value;
  }

  cleanupExpired();
  const hit = memory.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  const value = await loader();
  memory.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function invalidateCache(prefix: string): void {
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
  void Promise.resolve(getRedis()).then(async (client) => {
    if (!client) return;
    try {
      const keys = await client.keys(`cache:${prefix}*`);
      if (keys.length > 0) await client.del(keys);
    } catch (err: any) {
      logger.warn(`Redis invalidate failed: ${err.message}`);
    }
  });
}