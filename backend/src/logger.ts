import { Request } from 'express';
import { addLog, getUserByUsername } from './db.js';

export interface LogEntry {
  userId: string;
  username: string;
  action: string;
  details?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Запись лога в базу данных
 */
export const logAction = async (entry: LogEntry): Promise<void> => {
  try {
    await addLog({
      userId: entry.userId,
      username: entry.username,
      action: entry.action,
      details: entry.details || '',
      timestamp: new Date().toISOString(),
      ip: entry.ip || '',
      userAgent: entry.userAgent || ''
    });
  } catch (error) {
    console.error('❌ Ошибка при записи лога:', error);
  }
};

/**
 * Логирование действия из запроса (автоматически берёт пользователя из req.user)
 */
export const logRequest = async (
  req: Request,
  action: string,
  details?: string
): Promise<void> => {
  const user = (req as any).user;
  if (!user) {
    console.warn('⚠️ Попытка лога без пользователя:', action);
    return;
  }

  await logAction({
    userId: user.id,
    username: user.username,
    action,
    details,
    ip: req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent']
  });
};

/**
 * Логирование без пользователя (например, неудачная авторизация)
 */
export const logAnonymous = async (
  req: Request,
  username: string,
  action: string,
  details?: string
): Promise<void> => {
  await logAction({
    userId: 'anonymous',
    username: username || 'unknown',
    action,
    details,
    ip: req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent']
  });
};

/**
 * Получение всех логов (только для админа)
 */
export const getLogs = async (limit: number = 100) => {
  const { getLogs: getLogsFromDb } = await import('./db.js');
  return await getLogsFromDb(limit);
};

/**
 * Получение логов по пользователю
 */
export const getLogsByUser = async (userId: string, limit: number = 50) => {
  const { getLogsByUser: getLogsByUserFromDb } = await import('./db.js');
  return await getLogsByUserFromDb(userId, limit);
};