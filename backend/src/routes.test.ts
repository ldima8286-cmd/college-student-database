import { describe, it, expect, vi } from 'vitest';

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
  getStudentsByIds: vi.fn().mockResolvedValue([]),
  deleteStudentsByIds: vi.fn().mockResolvedValue(0),
  updateStudentsByIds: vi.fn().mockResolvedValue(0),
  updateUserRoleAndGroup: vi.fn().mockResolvedValue({ id: '1', email: 'admin@college.local', role: 'curator', group: 'ПО-507' }),
  getGroups: vi.fn().mockResolvedValue(['ПО-507']),
  listSubjects: vi.fn().mockResolvedValue([]),
  createSubject: vi.fn().mockResolvedValue({ id: 's1', name: 'Математика', createdAt: new Date().toISOString() }),
  deleteSubject: vi.fn().mockResolvedValue(true),
  getSchedule: vi.fn().mockResolvedValue([]),
  createScheduleEntry: vi.fn().mockResolvedValue({ id: 'sch1', group: 'ПО-507', dayOfWeek: 1, lessonNumber: 1, subject: 'Математика', teacher: null, room: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
  updateScheduleEntry: vi.fn().mockResolvedValue({ id: 'sch1', group: 'ПО-507', dayOfWeek: 1, lessonNumber: 1, subject: 'Математика', teacher: null, room: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
  deleteScheduleEntry: vi.fn().mockResolvedValue(true),
  deleteScheduleByGroup: vi.fn().mockResolvedValue(2),
  getMarksByStudent: vi.fn().mockResolvedValue([]),
  getMarkById: vi.fn().mockResolvedValue(undefined),
  addMark: vi.fn().mockResolvedValue({ id: 'm1', studentId: 'st1', subjectId: 's1', subjectName: 'Математика', mark: 5, createdAt: new Date().toISOString() }),
  updateMark: vi.fn().mockResolvedValue({ id: 'm1', studentId: 'st1', subjectId: 's1', subjectName: 'Математика', mark: 4, createdAt: new Date().toISOString() }),
  deleteMark: vi.fn().mockResolvedValue(true),
  recomputeStudentPerformance: vi.fn().mockResolvedValue(undefined),
  recomputeStudentAttendance: vi.fn().mockResolvedValue(undefined),
  getJournalSummaries: vi.fn().mockResolvedValue([]),
  getJournalLesson: vi.fn().mockResolvedValue(null),
  saveJournalLesson: vi.fn().mockResolvedValue(null),
  db: { select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), values: vi.fn().mockResolvedValue([]) },
}));

vi.mock('./auth.js', () => ({
  authenticate: vi.fn().mockResolvedValue({ accessToken: 'acc', refreshToken: 'ref', role: 'admin' }),
  requireAuth: vi.fn((req: any, _res: any, next: any) => {
    req.auth = { userId: '1', email: 'admin@college.local', role: 'admin' };
    next();
  }),
  requireAdmin: vi.fn((req: any, _res: any, next: any) => {
    req.auth = { userId: '1', email: 'admin@college.local', role: 'admin' };
    next();
  }),
  requireAdminOrCurator: vi.fn((req: any, _res: any, next: any) => {
    req.auth = { userId: '1', email: 'curator@college.local', role: 'curator' };
    next();
  }),
  requireCsrf: vi.fn((_req: any, _res: any, next: any) => next()),
  getAuthInfo: vi.fn(() => ({ role: 'admin', authenticated: true })),
  hashPassword: vi.fn(async (p: string) => p),
  comparePassword: vi.fn(async () => true),
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
    it('creates user and linked student card with group', async () => {
      const { createUser } = await import('./db.js');
      const { createStudent } = await import('./db.js');
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'newuser@college.local', password: 'secret1', fullName: 'New User', group: 'ПО-507', course: 1 });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ email: 'newuser@college.local', group: 'ПО-507' }));
      expect(createStudent).toHaveBeenCalledWith(expect.objectContaining({
        group: 'ПО-507', course: 1, userId: '2', status: 'approved',
      }));
    });

    it('rejects registration without a group', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'nogroup@college.local', password: 'secret1', fullName: 'No Group' });
      expect(res.status).toBe(400);
    });

    it('returns 201 even when email already exists (unified response)', async () => {
      const { findUserByEmail } = await import('./db.js');
      (findUserByEmail as any).mockResolvedValueOnce({ id: 'existing', email: 'dup@college.local' });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dup@college.local', password: 'secret1', fullName: 'Dup User', group: 'ПО-507', course: 1 });
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

  describe('GET /api/groups', () => {
    it('returns distinct approved groups for admin', async () => {
      const res = await request(app).get('/api/groups');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(['ПО-507']);
    });
  });

  describe('POST /api/subjects', () => {
    it('creates a subject', async () => {
      const res = await request(app).post('/api/subjects').send({ name: 'Математика' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Математика');
    });

    it('rejects duplicate subject name', async () => {
      const { listSubjects } = await import('./db.js');
      (listSubjects as any).mockResolvedValueOnce([{ id: 's1', name: 'Математика' }]);
      const res = await request(app).post('/api/subjects').send({ name: 'Математика' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/schedule', () => {
    it('creates a schedule entry', async () => {
      const res = await request(app)
        .post('/api/schedule')
        .send({ group: 'ПО-507', dayOfWeek: 1, lessonNumber: 1, subject: 'Математика', teacher: null, room: null });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('rejects duplicate cell (same group, day, lesson)', async () => {
      const { getSchedule } = await import('./db.js');
      (getSchedule as any).mockResolvedValueOnce([{ id: 'sch1', group: 'ПО-507', dayOfWeek: 1, lessonNumber: 1 }]);
      const res = await request(app)
        .post('/api/schedule')
        .send({ group: 'ПО-507', dayOfWeek: 1, lessonNumber: 1, subject: 'Физика' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/schedule', () => {
    it('returns schedule list', async () => {
      const res = await request(app).get('/api/schedule');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('POST /api/students/:id/marks', () => {
    it('adds a mark', async () => {
      const { getStudentById } = await import('./db.js');
      const { addMark } = await import('./db.js');
      (getStudentById as any).mockResolvedValueOnce({ id: 'st1', group: 'ПО-507', status: 'approved' });
      const res = await request(app)
        .post('/api/students/st1/marks')
        .send({ subjectId: '11111111-1111-1111-1111-111111111111', mark: 5 });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(addMark).toHaveBeenCalledWith('st1', '11111111-1111-1111-1111-111111111111', 5);
    });
  it('rejects mark above 10 (10-point scale)', async () => {
      const { getStudentById } = await import('./db.js');
      (getStudentById as any).mockResolvedValueOnce({ id: 'st1', group: 'ПО-507', status: 'approved' });
      const res = await request(app)
        .post('/api/students/st1/marks')
        .send({ subjectId: '11111111-1111-1111-1111-111111111111', mark: 11 });
      expect(res.status).toBe(400);
    });

    it('rejects mark below 1 (10-point scale)', async () => {
      const { getStudentById } = await import('./db.js');
      (getStudentById as any).mockResolvedValueOnce({ id: 'st1', group: 'ПО-507', status: 'approved' });
      const res = await request(app)
        .post('/api/students/st1/marks')
        .send({ subjectId: '11111111-1111-1111-1111-111111111111', mark: 0 });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/marks/me', () => {
    it('returns empty marks when student has no linked card', async () => {
      const res = await request(app).get('/api/marks/me');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('updates user role and group', async () => {
      const res = await request(app)
        .put('/api/admin/users/2')
        .send({ role: 'curator', group: 'ПО-507' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('curator');
    });

    it('forbids changing own role', async () => {
      const res = await request(app)
        .put('/api/admin/users/1')
        .send({ role: 'curator' });
      expect(res.status).toBe(400);
    });
  });
});