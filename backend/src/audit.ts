import { getDbModule } from './db.js';

export async function logAudit(action: string, entity: string, entityId?: string, userId?: string, details?: any) {
  const mod = await getDbModule();
  return mod.logAudit(action, entity, entityId, userId, details);
}

export async function getAuditLogs(page: number = 1, limit: number = 50, entity?: string, action?: string) {
  const mod = await getDbModule();
  return mod.getAuditLogs(page, limit, entity, action);
}

export async function clearAuditLogs() {
  const mod = await getDbModule();
  return mod.clearAuditLogs?.();
}
