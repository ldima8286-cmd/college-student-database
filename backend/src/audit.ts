import { getDbModule } from './db.js';
import { logger } from './logger.js';

/**
 * Аудит не должен ронять запрос: раньше вызовы делались без await, и отказ
 * БД превращался в unhandledRejection, который мог завершить процесс.
 * Ошибка пишется в лог, но наружу не пробрасывается.
 */
export async function logAudit(action: string, entity: string, entityId?: string, userId?: string, details?: any) {
  try {
    const mod = await getDbModule();
    return await mod.logAudit(action, entity, entityId, userId, details);
  } catch (err) {
    logger.error('audit write failed', { action, entity, entityId, err: String(err) });
    return undefined;
  }
}

export async function getAuditLogs(page: number = 1, limit: number = 50, entity?: string, action?: string) {
  const mod = await getDbModule();
  return mod.getAuditLogs(page, limit, entity, action);
}

export async function clearAuditLogs() {
  const mod = await getDbModule();
  return mod.clearAuditLogs?.();
}
