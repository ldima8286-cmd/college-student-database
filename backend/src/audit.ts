import { eq, sql, and, desc } from 'drizzle-orm';
import { db } from './db.js';
import { auditLog } from './schema.js';

export async function logAudit(
  action: string,
  entity: string,
  entityId?: string,
  userId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  await db.insert(auditLog).values({
    action,
    entity,
    entityId: entityId ?? null,
    userId: userId ?? null,
    details: details ?? null,
    createdAt: new Date(),
  });
}

export async function getAuditLogs(
  page: number = 1,
  limit: number = 50,
  entity?: string,
  action?: string
): Promise<{ logs: any[]; total: number }> {
  const conditions = [];
  if (entity) conditions.push(eq(auditLog.entity, entity));
  if (action) conditions.push(eq(auditLog.action, action));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLog)
    .where(whereClause);
  const total = Number(countResult[0]?.count ?? 0);

  const offset = (page - 1) * limit;
  const logs = await db
    .select()
    .from(auditLog)
    .where(whereClause)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);

  return { logs, total };
}
