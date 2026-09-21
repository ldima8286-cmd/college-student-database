import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const USER_PASSWORD = process.env.USER_PASSWORD || 'user123';

export type Role = 'admin' | 'user';

interface Session {
  createdAt: number;
  ip: string;
  role: Role;
}

const sessions = new Map<string, Session>();
const SESSION_TTL = 24 * 60 * 60 * 1000;

export function login(req: Request, res: Response) {
  const { password, role } = req.body;
  const requestedRole: Role = role === 'admin' ? 'admin' : 'user';

  if (!password) {
    return res.status(400).json({ success: false, error: 'Введите пароль' });
  }

  const expectedPassword = requestedRole === 'admin' ? ADMIN_PASSWORD : USER_PASSWORD;

  if (password !== expectedPassword) {
    return res.status(401).json({ success: false, error: 'Неверный пароль' });
  }

  const token = crypto.randomUUID();
  sessions.set(token, {
    createdAt: Date.now(),
    ip: req.ip || 'unknown',
    role: requestedRole,
  });

  cleanupSessions();

  res.json({ success: true, data: { token, role: requestedRole } });
}

export function logout(req: Request, res: Response) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) sessions.delete(token);
  res.json({ success: true });
}

function getSession(req: Request): Session | null {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;

  if (Date.now() - session.createdAt > SESSION_TTL) {
    sessions.delete(token);
    return null;
  }

  return session;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Необходима авторизация' });
  }
  (req as any).session = session;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Необходима авторизация' });
  }
  if (session.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Недостаточно прав' });
  }
  (req as any).session = session;
  next();
}

export function getAuthInfo(req: Request) {
  const session = getSession(req);
  return session ? { role: session.role, authenticated: true } : { role: null, authenticated: false };
}

function cleanupSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL) {
      sessions.delete(token);
    }
  }
}

export function getActiveSessions() {
  cleanupSessions();
  let admins = 0;
  let users = 0;
  for (const session of sessions.values()) {
    if (session.role === 'admin') admins++;
    else users++;
  }
  return { total: sessions.size, admins, users };
}
