import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Учётная запись, которую возвращает getUserById. Меняется в тестах доступа,
 * чтобы проверить fail-closed поведение куратора без группы.
 */
// По умолчанию запросы приходят от куратора группы ПО-507: requireAdminOrCurator
// в моке выставляет роль curator, и проверка группы должна её найти.
const currentUser: { id: string; email: string; role: string; group?: string | null } = {
  id: 'cur1', email: 'curator@college.local', role: 'curator', group: 'ПО-507',
};

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
  getUserById: vi.fn(async () => ({ ...currentUser })),
  createUser: vi.fn().mockResolvedValue({ id: '2', email: 'new@college.local', role: 'user' }),
  getAllUsers: vi.fn().mockResolvedValue([]),
  updateUser: vi.fn().mockResolvedValue({ id: '1' }),
  updateUserPassword: vi.fn().mockResolvedValue(true),
  getStudentsByIds: vi.fn().mockResolvedValue([]),
  createStudentsBatch: vi.fn(async (rows: any[], idsOut: string[]) => {
    rows.forEach((_, i) => idsOut.push(`new-${i}`));
    return [];
  }),
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
  getSettings: vi.fn().mockResolvedValue({ semesterStart: '2026-08-31' }),
  setSemesterStart: vi.fn().mockResolvedValue(undefined),
  weekOfDate: vi.fn().mockReturnValue('upper'),
  db: { select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), values: vi.fn().mockResolvedValue([]) },
}));

vi.mock('./auth.js', () => ({
  authenticate: vi.fn().mockResolvedValue({ accessToken: 'acc', refreshToken: 'ref', role: 'admin' }),
  // Роль и пользователь берутся из currentUser, чтобы тесты могли выставить
  // конкретного актора (админ, куратор группы, куратор без группы).
  requireAuth: vi.fn((req: any, _res: any, next: any) => {
    req.auth = { userId: currentUser.id, email: currentUser.email, role: currentUser.role };
    next();
  }),
  requireAdmin: vi.fn((req: any, _res: any, next: any) => {
    req.auth = { userId: currentUser.id, email: currentUser.email, role: currentUser.role };
    next();
  }),
  requireAdminOrCurator: vi.fn((req: any, _res: any, next: any) => {
    req.auth = { userId: currentUser.id, email: currentUser.email, role: currentUser.role };
    next();
  }),
  requireCsrf: vi.fn((_req: any, _res: any, next: any) => next()),
  getAuthInfo: vi.fn(() => ({ role: 'admin', authenticated: true })),
  normalizeRole: vi.fn((role?: string | null) =>
    role === 'admin' || role === 'curator' || role === 'user' ? role : 'user'),
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
  clearAuditLogs: vi.fn().mockResolvedValue(0),
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
// Тот же лимит тела запроса, что и в index.ts: тесты импорта должны упираться
// в лимит импорта, а не в 413 от дефолтных 100 КБ.
app.use(express.json({ limit: '10mb' }));
app.use('/api', router);

describe('API Routes', () => {
  beforeEach(() => {
    currentUser.id = 'cur1';
    currentUser.email = 'curator@college.local';
    currentUser.role = 'curator';
    currentUser.group = 'ПО-507';
  });

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
    it('returns only aggregate stats without auth', async () => {
      const res = await request(app).get('/api/public/stats');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toBeDefined();
      // Список студентов с ФИО не должен попадать в неаутентифицированный ответ
      expect(res.body.data.recent).toBeUndefined();
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
      currentUser.role = 'admin';
      const res = await request(app)
        .put(`/api/admin/users/${currentUser.id}`)
        .send({ role: 'curator' });
      expect(res.status).toBe(400);
    });

    it('never returns passwordHash', async () => {
      const { updateUserRoleAndGroup } = await import('./db.js');
      (updateUserRoleAndGroup as any).mockResolvedValueOnce({
        id: '2', email: 'u@college.local', fullName: 'U', role: 'curator',
        group: 'ПО-507', avatar: null, phone: null, createdAt: '2026-01-01',
        passwordHash: '$2a$10$hashedvalue',
      });
      const res = await request(app)
        .put('/api/admin/users/2')
        .send({ role: 'curator', group: 'ПО-507' });
      expect(res.status).toBe(200);
      expect(res.body.data.passwordHash).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('hashedvalue');
    });
  });

  describe('PUT /api/auth/me', () => {
    it('never returns passwordHash after profile update', async () => {
      const { updateUser } = await import('./db.js');
      (updateUser as any).mockResolvedValueOnce({
        id: 'u1', email: 'u@college.local', fullName: 'U', role: 'user',
        avatar: null, phone: null, group: 'ПО-507', createdAt: '2026-01-01',
        passwordHash: '$2a$10$hashedvalue',
      });
      const res = await request(app)
        .put('/api/auth/me')
        .send({ fullName: 'Ульянов Даниил', phone: '+375 (29) 123-45-67' });
      expect(res.status).toBe(200);
      expect(res.body.data.passwordHash).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('hashedvalue');
    });
  });

  describe('group isolation (fail-closed)', () => {
    it('hides other groups from the student list for a curator', async () => {
      const { getAllStudents } = await import('./db.js');
      const res = await request(app).get('/api/students');
      expect(res.status).toBe(200);
      expect((getAllStudents as any).mock.calls.at(-1)?.[8]).toBe('ПО-507');
    });

    it('returns an empty scope for a curator without a group instead of all students', async () => {
      currentUser.group = null;
      const { getAllStudents } = await import('./db.js');
      const res = await request(app).get('/api/students');
      expect(res.status).toBe(200);
      const filter = (getAllStudents as any).mock.calls.at(-1)?.[8];
      expect(filter).not.toBeUndefined();
      expect(filter).not.toBe('ПО-507');
    });

    it('forbids a curator without a group from creating a schedule entry', async () => {
      currentUser.group = null;
      const res = await request(app)
        .post('/api/schedule')
        .send({ group: 'ПО-507', dayOfWeek: 1, lessonNumber: 1, subject: 'Математика' });
      expect(res.status).toBe(403);
    });

    it('forbids a curator without a group from writing marks', async () => {
      currentUser.group = null;
      const { getStudentById } = await import('./db.js');
      (getStudentById as any).mockResolvedValueOnce({ id: 'st1', group: 'ПО-507', status: 'approved' });
      const res = await request(app)
        .post('/api/students/st1/marks')
        .send({ subjectId: '11111111-1111-1111-1111-111111111111', mark: 5 });
      expect(res.status).toBe(403);
    });

    it('forbids a curator from reading a schedule of another group', async () => {
      const { getJournalLesson } = await import('./db.js');
      (getJournalLesson as any).mockResolvedValueOnce({
        id: 'sch1', group: 'ПО-508', dayOfWeek: 1, lessonNumber: 1,
        subject: 'Математика', students: [],
      });
      const res = await request(app).get('/api/journal/sch1?date=2026-09-01');
      expect(res.status).toBe(403);
    });

    it('forbids a curator from editing a schedule entry of another group', async () => {
      const { getSchedule } = await import('./db.js');
      (getSchedule as any).mockResolvedValueOnce([{
        id: 'sch1', group: 'ПО-508', dayOfWeek: 1, lessonNumber: 1, subject: 'Математика',
      }]);
      const res = await request(app)
        .put('/api/schedule/sch1')
        .send({ subject: 'Физика' });
      expect(res.status).toBe(403);
    });

    it('allows a curator to read a schedule of their own group', async () => {
      const { getJournalLesson } = await import('./db.js');
      (getJournalLesson as any).mockResolvedValueOnce({
        id: 'sch1', group: 'ПО-507', dayOfWeek: 1, lessonNumber: 1, subject: 'Математика', students: [],
      });
      const res = await request(app).get('/api/journal/sch1?date=2026-09-01');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/students/batch-import', () => {
    // ФИО не должно содержать цифр — такое имя отвергает fullNameField.
    const letters = 'абвгдежзиклмнопрстуфхцчшщэюя';
    const name = (i: number) => {
      const a = letters[i % letters.length];
      const b = letters[Math.floor(i / letters.length) % letters.length];
      const c = letters[Math.floor(i / (letters.length ** 2)) % letters.length];
      return `Студент ${a}${b}${c}`;
    };
    const student = (fullName: string, group = 'ПО-507') => ({
      fullName, course: 2, group, specialty: 'Программирование',
      attendance: 100, performance: 5, academicDebt: false,
      email: null, phone: null,
    });

    it('imports a whole file in one request and reports the count', async () => {
      const { createStudentsBatch, getAllStudents } = await import('./db.js');
      (getAllStudents as any).mockResolvedValue({ students: [], total: 0 });
      const rows = Array.from({ length: 450 }, (_, i) => student(name(i)));
      const res = await request(app)
        .post('/api/students/batch-import')
        .send({ students: rows });
      expect(res.status).toBe(201);
      expect(res.body.data.created).toBe(450);
      expect(createStudentsBatch).toHaveBeenCalledTimes(1);
    });

    it('skips students that already exist instead of duplicating them', async () => {
      const { createStudentsBatch, getAllStudents } = await import('./db.js');
      (getAllStudents as any).mockResolvedValue({
        students: [{ id: 's1', fullName: name(0), group: 'ПО-507' }],
        total: 1,
      });
      const res = await request(app)
        .post('/api/students/batch-import')
        .send({ students: [student(name(0)), student(name(1))] });
      expect(res.status).toBe(201);
      expect(res.body.data).toEqual({ created: 1, skipped: 1 });
      const passed = (createStudentsBatch as any).mock.calls.at(-1)?.[0];
      expect(passed).toHaveLength(1);
      expect(passed[0].fullName).toBe(name(1));
    });

    it('rejects a file above the import limit', async () => {
      const rows = Array.from({ length: 1001 }, (_, i) => student(name(i)));
      const res = await request(app)
        .post('/api/students/batch-import')
        .send({ students: rows });
      expect(res.status).toBe(400);
    });

    it('rejects an empty file', async () => {
      const res = await request(app).post('/api/students/batch-import').send({ students: [] });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/audit-logs', () => {
    it('returns the deleted count inside data', async () => {
      const { clearAuditLogs } = await import('./audit.js');
      (clearAuditLogs as any).mockResolvedValue(7);
      currentUser.role = 'admin';
      const res = await request(app).delete('/api/audit-logs');
      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(7);
    });
  });

  describe('GET /api/students/recent', () => {
    it('returns only students visible to the actor', async () => {
      const { getRecentStudents } = await import('./db.js');
      (getRecentStudents as any).mockResolvedValueOnce([
        { id: 's1', fullName: 'Свой', group: 'ПО-507', status: 'approved' },
        { id: 's2', fullName: 'Чужой', group: 'ПО-508', status: 'approved' },
      ]);
      const res = await request(app).get('/api/students/recent');
      expect(res.status).toBe(200);
      expect(res.body.data.map((s: any) => s.id)).toEqual(['s1']);
    });
  });
});