import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from './env.js';
import { findUserByEmail, getUserById } from './db.js';

export type Role = 'admin' | 'user';

interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

interface RefreshPayload {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: TokenPayload;
    }
  }
}

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signAccessToken(user: { id: string; email: string; role: Role }): string {
  const payload: TokenPayload = { userId: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(userId: string): string {
  const payload: RefreshPayload = { userId };
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

export async function authenticate(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; role: Role } | null> {
  const user = await findUserByEmail(email.toLowerCase());
  if (!user) return null;
  if (!comparePassword(password, user.passwordHash)) return null;
  const role = user.role === 'admin' ? 'admin' : 'user';
  return {
    accessToken: signAccessToken({ id: user.id, email: user.email, role }),
    refreshToken: signRefreshToken(user.id),
    role,
  };
}

export async function issueTokens(userId: string): Promise<{ accessToken: string; refreshToken: string; role: Role }> {
  const user = await getUserById(userId);
  const role = user?.role === 'admin' ? 'admin' : 'user';
  return {
    accessToken: signAccessToken({ id: userId, email: user?.email ?? '', role }),
    refreshToken: signRefreshToken(userId),
    role,
  };
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