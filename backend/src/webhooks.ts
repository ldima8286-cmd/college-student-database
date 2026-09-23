import dns from 'node:dns/promises';
import net from 'node:net';
import { logger } from './logger.js';

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
}

let webhooks: Webhook[] = [];

function isPrivateIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length === 4) {
    if (parts[0] === 10) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    if (parts[0] >= 224) return true;
  }
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::' || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('ff')) return true;
  return false;
}

export async function assertSafeWebhookUrl(url: string): Promise<void> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Поддерживаются только http/https URL');
  }
  const hostname = parsed.hostname;
  if (!net.isIP(hostname)) {
    const addresses = await dns.resolve4(hostname).catch(async () => {
      const v6 = await dns.resolve6(hostname).catch(() => []);
      return v6;
    });
    if (!addresses || addresses.length === 0) {
      throw new Error('Не удалось разрешить домен webhook');
    }
    for (const addr of addresses) {
      if (net.isIPv4(addr)) {
        if (isPrivateIp(addr)) throw new Error('URL webhook ведёт на внутренний адрес');
      } else if (isPrivateIpv6(addr)) {
        throw new Error('URL webhook ведёт на внутренний адрес');
      }
    }
  } else if (net.isIPv4(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('URL webhook ведёт на внутренний адрес');
  } else if (isPrivateIpv6(hostname)) {
    throw new Error('URL webhook ведёт на внутренний адрес');
  }
}

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
        redirect: 'manual',
      });
      clearTimeout(timer);
    } catch (err: any) {
      logger.error(`Webhook delivery failed to ${hook.url}: ${err.message}`);
    }
  }));
}