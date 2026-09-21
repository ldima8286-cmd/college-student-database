import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from './env.js';

export type Role = 'admin' | 'user';

interface TokenPayload {
  role: Role;
  iat: number;
}

declare global {
  namespace Express {
    interface Request {
      auth?: TokenPayload;
    }
  }
}

export function login(password: string, role: Role): { token: string; role: Role } | null {
  const expectedPassword = role === 'admin' ? env.ADMIN_PASSWORD : env.USER_PASSWORD;

  if (password !== expectedPassword) return null;

  const payload: TokenPayload = { role, iat: Math.floor(Date.now() / 1000) };
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });

  return { token, role };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Необходима авторизация' });
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.auth = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Неверный или истёкший токен' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Недостаточно прав' });
      return;
    }
    next();
  });
}

export function getAuthInfo(req: Request): { role: Role | null; authenticated: boolean } {
  return req.auth
    ? { role: req.auth.role, authenticated: true }
    : { role: null, authenticated: false };
}
