import Database from 'better-sqlite3';

export function logAudit(sqliteDb: Database.Database, action: string, entity: string, entityId?: string, userId?: string, details?: any) {
  sqliteDb.prepare(
    'INSERT INTO auditLog (action, entity, entityId, userId, details, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(action, entity, entityId ?? null, userId ?? null, details ? JSON.stringify(details) : null, new Date().toISOString());
}

export function getAuditLogs(sqliteDb: Database.Database, page: number = 1, limit: number = 50, entity?: string, action?: string) {
  const conditions: string[] = [];
  const params: any[] = [];
  if (entity) { conditions.push('entity = ?'); params.push(entity); }
  if (action) { conditions.push('action = ?'); params.push(action); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (sqliteDb.prepare(`SELECT COUNT(*) as c FROM auditLog ${where}`).get(...params) as any).c ?? 0;
  const offset = (page - 1) * limit;
  const data = sqliteDb.prepare(`SELECT * FROM auditLog ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { data, total };
}
