import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./db.js', () => ({
  getAllStudents: vi.fn().mockResolvedValue({ students: [], total: 0 }),
  getStudentById: vi.fn().mockResolvedValue(undefined),
  getStudentByUserId: vi.fn().mockResolvedValue(undefined),
  createStudent: vi.fn().mockResolvedValue({ id: '1', fullName: 'Test' }),
  updateStudent: vi.fn().mockResolvedValue(null),
  deleteStudent: vi.fn().mockResolvedValue(true),
  toggleDebt: vi.fn().mockResolvedValue(null),
  deleteAllStudents: vi.fn().mockResolvedValue(0),
  getStats: vi.fn().mockResolvedValue({ total: 0, withDebt: 0, avgAttendance: 0, avgPerformance: 0, byCourse: {}, bySpecialty: {} }),
  getStudentsBySpecialty: vi.fn().mockResolvedValue([]),
  getStudentsByCourse: vi.fn().mockResolvedValue([]),
  getRecentStudents: vi.fn().mockResolvedValue([]),
  findUserByEmail: vi.fn().mockResolvedValue(undefined),
  getUserById: vi.fn().mockResolvedValue({ id: '1', email: 'admin@college.local', role: 'admin' }),
  createUser: vi.fn().mockResolvedValue({ id: '2', email: 'new@college.local', role: 'user' }),
  getAllUsers: vi.fn().mockResolvedValue([]),
  updateUser: vi.fn().mockResolvedValue({ id: '1' }),
  updateUserPassword: vi.fn().mockResolvedValue(true),
  db: { select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), values: vi.fn().mockResolvedValue([]) },
}));

vi.mock('./auth.js', () => ({
  authenticate: vi.fn().mockResolvedValue({ accessToken: 'acc', refreshToken: 'ref', role: 'admin' }),
  requireAuth: vi.fn((_req: any, _res: any, next: any) => next()),
  requireAdmin: vi.fn((_req: any, _res: any, next: any) => next()),
  requireCsrf: vi.fn((_req: any, _res: any, next: any) => next()),
  getAuthInfo: vi.fn(() => ({ role: 'admin', authenticated: true })),
  hashPassword: vi.fn((p: string) => p),
  comparePassword: vi.fn(() => true),
  signAccessToken: vi.fn(() => 'test-token'),
  setAuthCookies: vi.fn(),
  clearAuthCookies: vi.fn(),
  refreshSession: vi.fn().mockResolvedValue({ accessToken: 'acc2', refreshToken: 'ref2', role: 'admin' }),
  signResetToken: vi.fn(() => 'reset-token'),
  verifyResetToken: vi.fn(() => 'admin@college.local'),
  revokeRefreshJti: vi.fn(),
  verifyRefreshToken: vi.fn(() => ({ userId: '1', jti: 'j1' })),
  revokeAllRefreshTokens: vi.fn(),
}));

vi.mock('./cache.js', () => ({
  cached: vi.fn((_key: string, _ttl: number, loader: any) => loader()),
  invalidateCache: vi.fn(),
}));

vi.mock('./audit.js', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
  getAuditLogs: vi.fn().mockResolvedValue({ data: [], total: 0 }),
}));

vi.mock('./swagger.js', () => ({
  setupSwagger: vi.fn(),
}));

vi.mock('./logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

vi.mock('./webhooks.js', () => ({
  registerWebhook: vi.fn((url: string, events: string[]) => ({ id: 'w1', url, events, createdAt: new Date().toISOString() })),
  removeWebhook: vi.fn(() => true),
  triggerWebhook: vi.fn().mockResolvedValue(undefined),
  listWebhooks: vi.fn().mockReturnValue([]),
  assertSafeWebhookUrl: vi.fn().mockResolvedValue(undefined),
}));

import express from 'express';
import request from 'supertest';
import { router } from './routes.js';

const app = express();
app.use(express.json());
app.use('/api', router);

describe('API Routes', () => {
  describe('GET /api/health', () => {
    it('returns ok status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/students', () => {
    it('returns paginated students', async () => {
      const res = await request(app).get('/api/students');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('GET /api/students/stats', () => {
    it('returns stats', async () => {
      const res = await request(app).get('/api/students/stats');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(0);
    });
  });

  describe('GET /api/public/stats', () => {
    it('returns public stats without auth', async () => {
      const res = await request(app).get('/api/public/stats');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toBeDefined();
      expect(res.body.data.recent).toEqual([]);
    });
  });

  describe('POST /api/auth/login', () => {
    it('accepts valid credentials and returns role', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@college.local', password: 'admin123' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('admin');
      expect(res.body.data.accessToken).toBeUndefined();
    });
  });

  describe('POST /api/auth/register', () => {
    it('returns 201 even when email already exists (unified response)', async () => {
      const { getAllUsers } = await import('./db.js');
      (getAllUsers as any).mockResolvedValueOnce([{ id: 'existing', email: 'dup@college.local' }]);
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dup@college.local', password: 'secret1', fullName: 'Dup User' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('always returns success and does not leak user existence', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@college.local' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('accepts a refresh token and returns new role', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'some-refresh-token' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('admin');
    });
  });
});