import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./db.js', () => ({
  getAllStudents: vi.fn().mockResolvedValue({ students: [], total: 0 }),
  getStudentById: vi.fn().mockResolvedValue(undefined),
  createStudent: vi.fn().mockResolvedValue({ id: '1', fullName: 'Test' }),
  updateStudent: vi.fn().mockResolvedValue(null),
  deleteStudent: vi.fn().mockResolvedValue(true),
  toggleDebt: vi.fn().mockResolvedValue(null),
  deleteAllStudents: vi.fn().mockResolvedValue(0),
  getStats: vi.fn().mockResolvedValue({ total: 0, withDebt: 0, avgAttendance: 0, avgPerformance: 0, byCourse: {}, bySpecialty: {} }),
  getStudentsBySpecialty: vi.fn().mockResolvedValue([]),
  getStudentsByCourse: vi.fn().mockResolvedValue([]),
  getRecentStudents: vi.fn().mockResolvedValue([]),
  db: { select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), values: vi.fn().mockResolvedValue([]) },
}));

vi.mock('./auth.js', () => ({
  login: vi.fn((req: any, res: any) => res.json({ success: true, data: { token: 'test', role: 'admin' } })),
  logout: vi.fn((_req: any, res: any) => res.json({ success: true })),
  requireAuth: vi.fn((_req: any, _res: any, next: any) => next()),
  requireAdmin: vi.fn((_req: any, _res: any, next: any) => next()),
  getAuthInfo: vi.fn(() => ({ role: 'admin', authenticated: true })),
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
    });
  });

  describe('POST /api/auth/login', () => {
    it('accepts valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'admin123', role: 'admin' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
