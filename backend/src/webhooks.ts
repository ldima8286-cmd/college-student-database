import { logger } from './logger.js';

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
}

let webhooks: Webhook[] = [];

export function registerWebhook(url: string, events: string[]): Webhook {
  const existing = webhooks.find((w) => w.url === url);
  if (existing) {
    existing.events = Array.from(new Set([...existing.events, ...events]));
    return existing;
  }
  const created: Webhook = {
    id: crypto.randomUUID(),
    url,
    events,
    createdAt: new Date().toISOString(),
  };
  webhooks.push(created);
  logger.info(`Webhook registered: ${url}`);
  return created;
}

export function removeWebhook(url: string): boolean {
  const before = webhooks.length;
  webhooks = webhooks.filter((w) => w.url !== url);
  return webhooks.length < before;
}

export function listWebhooks(): Webhook[] {
  return [...webhooks];
}

export async function triggerWebhook(event: string, data: any): Promise<void> {
  const targets = webhooks.filter((w) => w.events.includes(event) || w.events.includes('*'));
  if (targets.length === 0) return;

  const payload = {
    event,
    data,
    timestamp: new Date().toISOString(),
  };

  await Promise.all(targets.map(async (hook) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
    } catch (err: any) {
      logger.error(`Webhook delivery failed to ${hook.url}: ${err.message}`);
    }
  }));
}