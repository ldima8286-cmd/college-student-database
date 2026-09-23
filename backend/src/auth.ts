import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from './env.js';
import { findUserByEmail, getUserById } from './db.js';

export type Role = 'admin' | 'user';

interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  type: 'access';
  jti: string;
}

interface RefreshPayload {
  userId: string;
  type: 'refresh';
  jti: string;
}

interface ResetPayload {
  email: string;
  type: 'reset';
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
const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const CSRF_COOKIE = 'x_csrf';
const ROLE_COOKIE = 'role';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  role: Role;
}

function cookieSecure(): boolean {
  return env.NODE_ENV === 'production';
}

const activeRefreshes = new Map<string, { userId: string; expiresAt: number }>();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(user: { id: string; email: string; role: Role }): string {
  const payload: TokenPayload = { userId: user.id, email: user.email, role: user.role, type: 'access', jti: crypto.randomUUID() };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function revokeRefreshJti(jti: string): void {
  activeRefreshes.delete(jti);
}

export function revokeAllRefreshTokens(userId: string): void {
  for (const [jti, entry] of activeRefreshes) {
    if (entry.userId === userId) activeRefreshes.delete(jti);
  }
}

export function signRefreshToken(userId: string): string {
  const jti = crypto.randomUUID();
  activeRefreshes.set(jti, { userId, expiresAt: Date.now() + 7 * 24 * 3600 * 1000 });
  const payload: RefreshPayload = { userId, type: 'refresh', jti };
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyRefreshToken(token: string): { userId: string; jti: string } | null {
  try {
    const decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET) as RefreshPayload;
    if (decoded.type !== 'refresh' || !decoded.userId || !decoded.jti) return null;
    const entry = activeRefreshes.get(decoded.jti);
    if (!entry || entry.userId !== decoded.userId || entry.expiresAt < Date.now()) return null;
    return { userId: decoded.userId, jti: decoded.jti };
  } catch {
    return null;
  }
}

export async function authenticate(email: string, password: string): Promise<AuthSession | null> {
  const user = await findUserByEmail(email.toLowerCase());
  if (!user) return null;
  if (!(await comparePassword(password, user.passwordHash))) return null;
  const role = user.role === 'admin' ? 'admin' : 'user';
  return {
    accessToken: signAccessToken({ id: user.id, email: user.email, role }),
    refreshToken: signRefreshToken(user.id),
    role,
  };
}

export async function issueTokens(userId: string): Promise<AuthSession> {
  const user = await getUserById(userId);
  const role = user?.role === 'admin' ? 'admin' : 'user';
  return {
    accessToken: signAccessToken({ id: userId, email: user?.email ?? '', role }),
    refreshToken: signRefreshToken(userId),
    role,
  };
}

export function signResetToken(email: string): string {
  const payload: ResetPayload = { email, type: 'reset' };
  return jwt.sign(payload, env.RESET_TOKEN_SECRET, { expiresIn: '15m' });
}

export function verifyResetToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, env.RESET_TOKEN_SECRET) as ResetPayload;
    if (decoded.type !== 'reset' || !decoded.email) return null;
    return decoded.email;
  } catch {
    return null;
  }
}

function csrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setAuthCookies(res: Response, session: AuthSession): void {
  const secure = cookieSecure();
  res.cookie(ACCESS_COOKIE, session.accessToken, {
    httpOnly: true, secure, sameSite: 'lax',
    maxAge: 15 * 60 * 1000, path: '/',
  });
  res.cookie(REFRESH_COOKIE, session.refreshToken, {
    httpOnly: true, secure, sameSite: 'lax',
    maxAge: 7 * 24 * 3600 * 1000, path: '/api/auth',
  });
  res.cookie(CSRF_COOKIE, csrfToken(), {
    httpOnly: false, secure, sameSite: 'lax',
    maxAge: 7 * 24 * 3600 * 1000, path: '/',
  });
  res.cookie(ROLE_COOKIE, session.role, {
    httpOnly: false, secure, sameSite: 'lax',
    maxAge: 7 * 24 * 3600 * 1000, path: '/',
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
  res.clearCookie(ROLE_COOKIE, { path: '/' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  let token: string | undefined;
  if (header?.startsWith('Bearer ')) {
    token = header.slice(7);
  } else if (typeof req.cookies?.[ACCESS_COOKIE] === 'string') {
    token = req.cookies[ACCESS_COOKIE];
  }

  if (!token) {
    res.status(401).json({ success: false, error: 'Необходима авторизация' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    if (decoded.type !== 'access') throw new Error('wrong token type');
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

export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }
  const hasSessionCookie = typeof req.cookies?.[ACCESS_COOKIE] === 'string' || typeof req.cookies?.[REFRESH_COOKIE] === 'string';
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const rawHeader = req.headers['x-csrf-token'];
  const headerToken = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  if (!hasSessionCookie && !cookieToken) {
    next();
    return;
  }
  if (
    typeof cookieToken !== 'string' || typeof headerToken !== 'string' ||
    cookieToken.length === 0 || headerToken.length !== cookieToken.length
  ) {
    res.status(403).json({ success: false, error: 'CSRF-проверка не пройдена' });
    return;
  }
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    res.status(403).json({ success: false, error: 'CSRF-проверка не пройдена' });
    return;
  }
  next();
}

export function getAuthInfo(req: Request): { role: Role | null; authenticated: boolean } {
  return req.auth
    ? { role: req.auth.role, authenticated: true }
    : { role: null, authenticated: false };
}

export async function refreshSession(refreshToken: string): Promise<AuthSession | null> {
  const valid = verifyRefreshToken(refreshToken);
  if (!valid) return null;
  revokeRefreshJti(valid.jti);
  return issueTokens(valid.userId);
}