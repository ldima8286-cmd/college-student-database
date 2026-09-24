import cookieParser from 'cookie-parser';
import { Router, Request, Response } from 'express';
import {
  getAllStudents,
  getStudentById,
  getStudentByUserId,
  createStudent,
  updateStudent,
  deleteStudent,
  toggleDebt,
  deleteAllStudents,
  getStats,
  getStudentsBySpecialty,
  getStudentsByCourse,
  getRecentStudents,
  getUserById,
  createUser,
  getAllUsers,
  updateUser,
  updateUserPassword,
  findUserByEmail,
  getStudentsByIds,
  deleteStudentsByIds,
  updateStudentsByIds,
  updateUserRoleAndGroup,
  getGroups,
  listSubjects,
  createSubject,
  deleteSubject,
  getSchedule,
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  deleteScheduleByGroup,
  getMarksByStudent,
  getMarkById,
  addMark,
  updateMark,
  deleteMark,
  recomputeStudentPerformance,
  getJournalSummaries,
  getJournalLesson,
  saveJournalLesson,
  getSettings,
  setSemesterStart,
  weekOfDate,
} from './db.js';
import {
  studentSchema, studentUpdateSchema, studentSelfSchema, querySchema,
  registerSchema, loginSchema, refreshSchema,
  updateProfileSchema, changePasswordSchema, batchIdsSchema, batchUpdateSchema, webhookSchema,
  forgotPasswordSchema, resetPasswordSchema, subjectSchema,
  scheduleCreateSchema, scheduleUpdateSchema, markSchema, markUpdateSchema, userAdminUpdateSchema,
  journalQuerySchema, journalDateQuerySchema, journalSaveSchema, settingsSchema,
} from './validation.js';
import {
  authenticate, requireAuth, requireAdmin, requireCsrf, getAuthInfo,
  requireAdminOrCurator,
  hashPassword, comparePassword,
  setAuthCookies, clearAuthCookies, refreshSession,
  signResetToken, verifyResetToken,
  revokeRefreshJti, verifyRefreshToken, revokeAllRefreshTokens,
} from './auth.js';
import { env } from './env.js';
import { logAudit, getAuditLogs, clearAuditLogs } from './audit.js';
import { registerWebhook, removeWebhook, triggerWebhook, listWebhooks, assertSafeWebhookUrl } from './webhooks.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from './email.js';
import { cached, invalidateCache } from './cache.js';
import { logger } from './logger.js';

export const router = Router();

function weekOverlaps(a?: string | null, b?: string | null): boolean {
  const x = a ?? null;
  const y = b ?? null;
  return x === null || y === null || x === y;
}

const CACHE_TTL = 30_000;
const invalidateStudentsCache = () => invalidateCache('students.');

const getCuratorGroup = async (req: Request): Promise<string | null> => {
  if (req.auth?.role !== 'curator') return null;
  const user = await getUserById(req.auth!.userId);
  return user?.group ?? null;
};

router.use(cookieParser());
router.use(requireCsrf);

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await findUserByEmail(data.email.toLowerCase());
    if (existing) {
      res.status(201).json({ success: true, data: { id: existing.id } });
      return;
    }
    const user = await createUser({
      email: data.email,
      passwordHash: await hashPassword(data.password),
      fullName: data.fullName,
      phone: data.phone ?? null,
      group: data.group,
    });
    logAudit('register', 'user', user.id, user.role, { email: user.email, group: data.group });
    void sendWelcomeEmail(user.email, user.fullName).catch(() => {});
    const student = await createStudent({
      fullName: data.fullName,
      course: data.course ?? 1,
      group: data.group,
      specialty: data.specialty ?? '',
      attendance: 100,
      performance: 4.0,
      academicDebt: false,
      email: data.email,
      phone: data.phone ?? null,
      userId: user.id,
      status: 'approved',
    });
    logAudit('create', 'student', student.id, user.id, { fullName: student.fullName, self: true, registered: true, group: data.group });
    void triggerWebhook('student.created', student).catch(() => {});
    res.status(201).json({ success: true, data: { id: user.id } });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authenticate(data.email, data.password);
    if (!result) {
      return res.status(401).json({ success: false, error: 'Неверный email или пароль' });
    }
    setAuthCookies(res, result);
    if (result.role === 'admin' || result.role === 'curator') {
      logAudit('login', 'auth', undefined, result.role);
    }
    res.json({ success: true, data: { role: result.role } });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/auth/refresh', async (req: Request, res: Response) => {
  try {
    const parsed = refreshSchema.safeParse(req.body ?? {});
    const bodyToken = parsed.success ? parsed.data.refreshToken : undefined;
    const cookieToken = typeof req.cookies?.refresh_token === 'string' ? req.cookies.refresh_token : undefined;
    const token = bodyToken || cookieToken;
    if (!token) return res.status(401).json({ success: false, error: 'Нет refresh-токена' });
    const session = await refreshSession(token);
    if (!session) return res.status(401).json({ success: false, error: 'Недействительный refresh-токен' });
    setAuthCookies(res, session);
    res.json({ success: true, data: { role: session.role } });
  } catch (err: any) {
    logger.warn(`Refresh failed: ${err.message}`);
    res.status(401).json({ success: false, error: 'Недействительный refresh-токен' });
  }
});

router.post('/auth/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    const refreshCookie = typeof req.cookies?.refresh_token === 'string' ? req.cookies.refresh_token : undefined;
    if (refreshCookie) {
      const valid = await verifyRefreshToken(refreshCookie);
      if (valid) await revokeRefreshJti(valid.jti);
    }
  } catch {
    /* токен уже недействителен — выходим в любом случае */
  }
  clearAuthCookies(res);
  if (req.auth?.role === 'admin' || req.auth?.role === 'curator') {
    logAudit('logout', 'auth', undefined, req.auth.role);
  }
  res.json({ success: true });
});

router.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await findUserByEmail(email.toLowerCase());
    if (user) {
      const token = signResetToken(user.email);
      const resetUrl = `${env.FRONT_URL}/reset-password?token=${encodeURIComponent(token)}`;
      void sendPasswordResetEmail(user.email, resetUrl).catch(() => {});
      logAudit('forgot-password', 'user', user.id, user.role);
    }
    res.json({ success: true, data: null });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const email = verifyResetToken(token);
    if (!email) return res.status(400).json({ success: false, error: 'Недействительная или истёкшая ссылка сброса' });
    const user = await findUserByEmail(email.toLowerCase());
    if (!user) return res.status(400).json({ success: false, error: 'Недействительная или истёкшая ссылка сброса' });
    await updateUserPassword(user.id, await hashPassword(newPassword));
    revokeAllRefreshTokens(user.id);
    clearAuthCookies(res);
    logAudit('reset-password', 'user', user.id, user.role);
    res.json({ success: true, data: null });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/auth/status', requireAuth, (req: Request, res: Response) => {
  const info = getAuthInfo(req);
  res.json({ success: true, data: info });
});

router.get('/auth/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.auth!.userId);
    if (!user) return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        group: user.group ?? null,
        createdAt: user.createdAt,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.put('/auth/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await updateUser(req.auth!.userId, data);
    if (!user) return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    logAudit('update-profile', 'user', user.id, req.auth?.role, { fullName: user.fullName });
    res.json({ success: true, data: user });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.put('/auth/me/password', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    const user = await getUserById(req.auth!.userId);
    if (!user) return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    if (!(await comparePassword(data.oldPassword, user.passwordHash))) {
      return res.status(400).json({ success: false, error: 'Неверный текущий пароль' });
    }
    await updateUserPassword(req.auth!.userId, await hashPassword(data.newPassword));
    await revokeAllRefreshTokens(req.auth!.userId);
    clearAuthCookies(res);
    logAudit('change-password', 'user', user.id, user.role);
    res.json({ success: true });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/students/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await cached('students.stats', CACHE_TTL, () => getStats());
    res.json({ success: true, data: stats });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/public/stats', async (_req: Request, res: Response) => {
  try {
    const data = await cached('students.public', CACHE_TTL, async () => ({
      stats: await getStats(),
      bySpecialty: await getStudentsBySpecialty(),
      byCourse: await getStudentsByCourse(),
      recent: (await getRecentStudents(5)).map((s) => ({
        id: s.id,
        fullName: s.fullName,
        course: s.course,
        group: s.group,
        specialty: s.specialty,
        attendance: s.attendance,
        performance: s.performance,
      })),
      updatedAt: new Date().toISOString(),
    }));
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/students', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = querySchema.parse(req.query);
    const isAdmin = req.auth?.role === 'admin';
    const status = isAdmin ? query.status : 'approved';
    const limit = isAdmin ? query.limit : Math.min(query.limit, 200);
    const filterGroup = req.auth?.role === 'curator' ? await getCuratorGroup(req) : undefined;
    const { students, total } = await getAllStudents(
      query.search, query.page, limit, query.sortBy, query.sortOrder,
      query.filterDebt, query.filterCourse, status, filterGroup ?? undefined
    );
    res.json({
      success: true, data: students, total,
      page: query.page, limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Неверные параметры', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/students/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const student = await getStudentByUserId(req.auth!.userId);
    res.json({ success: true, data: student ?? null });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.put('/students/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = studentSelfSchema.parse(req.body);
    const existing = await getStudentByUserId(req.auth!.userId);
    if (existing) {
      const student = await updateStudent(existing.id, {
        fullName: data.fullName,
        course: data.course,
        group: data.group,
        specialty: data.specialty,
        email: data.email ?? null,
        phone: data.phone ?? null,
        status: existing.status === 'approved' ? 'pending' : existing.status,
      });
      logAudit('update', 'student', existing.id, req.auth?.role, { fullName: existing.fullName, self: true, status: student?.status });
      invalidateStudentsCache();
      void triggerWebhook('student.updated', student).catch(() => {});
      return res.json({ success: true, data: student });
    }
    const student = await createStudent({
      fullName: data.fullName,
      course: data.course,
      group: data.group,
      specialty: data.specialty,
      attendance: 100,
      performance: 4.0,
      academicDebt: false,
      email: data.email ?? null,
      phone: data.phone ?? null,
      userId: req.auth!.userId,
      status: 'pending',
    });
    logAudit('create', 'student', student.id, req.auth?.role, { fullName: student.fullName, self: true });
    invalidateStudentsCache();
    void triggerWebhook('student.created', student).catch(() => {});
    res.status(201).json({ success: true, data: student });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/students/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const student = await getStudentById(req.params.id);
    if (!student) return res.status(404).json({ success: false, error: 'Студент не найден' });
    if (req.auth?.role === 'curator') {
      const curatorGroup = await getCuratorGroup(req);
      if (!curatorGroup || student.group !== curatorGroup) {
        return res.status(403).json({ success: false, error: 'Недостаточно прав' });
      }
    } else if (req.auth?.role !== 'admin' && student.status === 'pending' && student.userId !== req.auth?.userId) {
      return res.status(403).json({ success: false, error: 'Недостаточно прав' });
    }
    res.json({ success: true, data: student });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/students/batch-delete', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { ids } = batchIdsSchema.parse(req.body);
    const count = await deleteStudentsByIds(ids);
    logAudit('batch-delete', 'student', undefined, req.auth?.role, { deleted: count });
    invalidateStudentsCache();
    void triggerWebhook('students.deleted', { count, ids }).catch(() => {});
    res.json({ success: true, data: { deleted: count } });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/students/batch-export', requireAdminOrCurator, async (req: Request, res: Response) => {
  try {
    let result;
    const isAdmin = req.auth?.role === 'admin';
    const curatorGroup = req.auth?.role === 'curator' ? await getCuratorGroup(req) : undefined;
    if (req.body?.ids?.length) {
      const { ids } = batchIdsSchema.parse(req.body);
      const rows = (await getStudentsByIds(ids)).filter((s) => {
        if (isAdmin) return true;
        if (curatorGroup) return s.status === 'approved' && s.group === curatorGroup;
        return s.status === 'approved' || s.userId === req.auth?.userId;
      });
      result = rows;
    } else {
      const { students } = await getAllStudents(undefined, 1, 10000, 'fullName', 'asc',
        undefined, undefined,
        req.auth?.role === 'admin' ? undefined : 'approved',
        curatorGroup ?? undefined
      );
      result = students;
    }
    logAudit('batch-export', 'student', undefined, req.auth?.role, { count: result.length });
    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/students/batch-update', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { ids, patch } = batchUpdateSchema.parse(req.body);
    const updated = await updateStudentsByIds(ids, patch);
    logAudit('batch-update', 'student', undefined, req.auth?.role, { updated, fields: Object.keys(patch) });
    invalidateStudentsCache();
    void triggerWebhook('students.updated', { count: updated, ids }).catch(() => {});
    res.json({ success: true, data: { updated } });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/students', requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = studentSchema.parse(req.body);
    const student = await createStudent({ ...data, email: data.email ?? null, phone: data.phone ?? null, userId: null, status: 'approved' });
    logAudit('create', 'student', student.id, req.auth?.role, { fullName: student.fullName });
    invalidateStudentsCache();
    void triggerWebhook('student.created', student).catch(() => {});
    res.status(201).json({ success: true, data: student });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/webhooks', requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = webhookSchema.parse(req.body);
    await assertSafeWebhookUrl(data.url);
    const webhook = registerWebhook(data.url, data.events);
    logAudit('create', 'webhook', webhook.id, req.auth?.role, { url: webhook.url });
    res.status(201).json({ success: true, data: webhook });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    if (err.message?.includes('URL webhook') || err.message?.includes('Поддерживаются')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/webhooks', requireAdmin, (_req: Request, res: Response) => {
  res.json({ success: true, data: listWebhooks() });
});

router.delete('/webhooks', requireAdmin, async (req: Request, res: Response) => {
  try {
    const url = (req.body?.url ?? req.query?.url) as string;
    if (!url) return res.status(400).json({ success: false, error: 'Передайте url' });
    const removed = removeWebhook(url);
    logAudit('delete', 'webhook', url, req.auth?.role);
    res.json({ success: true, data: { removed } });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.put('/students/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = studentUpdateSchema.parse(req.body);
    const student = await updateStudent(req.params.id, data);
    if (!student) return res.status(404).json({ success: false, error: 'Студент не найден' });
    logAudit('update', 'student', student.id, req.auth?.role, { fullName: student.fullName });
    invalidateStudentsCache();
    void triggerWebhook('student.updated', student).catch(() => {});
    res.json({ success: true, data: student });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.delete('/students/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const deleted = await deleteStudent(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Студент не найден' });
    logAudit('delete', 'student', req.params.id, req.auth?.role);
    invalidateStudentsCache();
    void triggerWebhook('student.deleted', { id: req.params.id, deleted }).catch(() => {});
    res.status(204).send();
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.patch('/students/:id/toggle-debt', requireAdmin, async (req: Request, res: Response) => {
  try {
    const student = await toggleDebt(req.params.id);
    if (!student) return res.status(404).json({ success: false, error: 'Студент не найден' });
    logAudit('toggle-debt', 'student', student.id, req.auth?.role, { academicDebt: student.academicDebt });
    invalidateStudentsCache();
    void triggerWebhook('student.debt_toggled', student).catch(() => {});
    res.json({ success: true, data: student });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/students/:id/approve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const existing = await getStudentById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Студент не найден' });
    const student = await updateStudent(existing.id, { status: 'approved' });
    logAudit('approve', 'student', student!.id, req.auth?.role, { fullName: student!.fullName });
    invalidateStudentsCache();
    void triggerWebhook('student.approved', student).catch(() => {});
    res.json({ success: true, data: student });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.delete('/students', requireAdmin, async (req: Request, res: Response) => {
  try {
    const count = await deleteAllStudents();
    logAudit('delete-all', 'student', undefined, req.auth?.role, { deleted: count });
    invalidateStudentsCache();
    void triggerWebhook('students.deleted_all', { count }).catch(() => {});
    res.json({ success: true, data: { deleted: count } });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/admin/analytics', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const data = await cached('students.analytics', CACHE_TTL, async () => {
      const [stats, bySpecialty, byCourse, recent] = await Promise.all([
        getStats(), getStudentsBySpecialty(), getStudentsByCourse(), getRecentStudents(5),
      ]);
      return { stats, bySpecialty, byCourse, recent };
    });
    res.json({ success: true, data });
  } catch (err: any) {
    logger.error('Analytics error:', err);
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/admin/users', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json({
      success: true,
      data: users.map((u) => ({
        id: u.id, email: u.email, fullName: u.fullName, role: u.role,
        phone: u.phone, group: u.group ?? null, createdAt: u.createdAt,
      })),
      total: users.length,
    });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/audit-logs', requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const entity = req.query.entity as string | undefined;
    const action = req.query.action as string | undefined;
    const { data: logs, total } = await getAuditLogs(page, limit, entity, action);
    res.json({
      success: true, data: logs, total,
      page, limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.delete('/audit-logs', requireAdmin, async (req: Request, res: Response) => {
  try {
    const deleted = await clearAuditLogs();
    await logAudit('delete', 'audit_log', undefined, req.auth?.userId, { clearedAll: true });
    res.json({ success: true, deleted });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/groups', requireAuth, async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    let groups: string[] = [];
    if (role === 'admin') {
      groups = await getGroups();
    } else if (role === 'curator') {
      const curatorGroup = await getCuratorGroup(req);
      groups = curatorGroup ? [curatorGroup] : [];
    } else {
      const student = await getStudentByUserId(req.auth!.userId);
      groups = student?.group ? [student.group] : [];
    }
    res.json({ success: true, data: groups });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/subjects', requireAuth, async (_req: Request, res: Response) => {
  try {
    const data = await listSubjects();
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/subjects', requireAdminOrCurator, async (req: Request, res: Response) => {
  try {
    const { name } = subjectSchema.parse(req.body);
    const existing = await listSubjects();
    if (existing.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Предмет уже существует' });
    }
    const subject = await createSubject(name);
    logAudit('create', 'subject', subject.id, req.auth?.role, { name: subject.name });
    res.status(201).json({ success: true, data: subject });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.delete('/subjects/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const deleted = await deleteSubject(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Предмет не найден' });
    logAudit('delete', 'subject', req.params.id, req.auth?.role);
    res.json({ success: true, data: { deleted } });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/schedule', requireAuth, async (req: Request, res: Response) => {
  try {
    const role = req.auth?.role;
    let group: string | undefined;
    if (role === 'admin') {
      group = typeof req.query.group === 'string' && req.query.group ? req.query.group : undefined;
    } else if (role === 'curator') {
      group = (await getCuratorGroup(req)) ?? undefined;
    } else {
      const student = await getStudentByUserId(req.auth!.userId);
      group = student?.group ?? undefined;
    }
    const data = await getSchedule(group);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/schedule', requireAdminOrCurator, async (req: Request, res: Response) => {
  try {
    const data = scheduleCreateSchema.parse(req.body);
    const curatorGroup = req.auth?.role === 'curator' ? await getCuratorGroup(req) : null;
    if (curatorGroup && data.group !== curatorGroup) {
      return res.status(403).json({ success: false, error: 'Куратор может вести расписание только своей группы' });
    }
    const existing = await getSchedule(data.group);
    if (existing.some((e) => e.dayOfWeek === data.dayOfWeek && e.lessonNumber === data.lessonNumber && weekOverlaps(e.week, data.week))) {
      return res.status(400).json({ success: false, error: 'Ячейка расписания уже заполнена — используйте обновление' });
    }
    const entry = await createScheduleEntry({ ...data, teacher: data.teacher ?? null, room: data.room ?? null, week: data.week ?? null });
    logAudit('create', 'schedule', entry.id, req.auth?.role, { group: data.group, dayOfWeek: data.dayOfWeek, lessonNumber: data.lessonNumber, week: data.week ?? null });
    res.status(201).json({ success: true, data: entry });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.put('/schedule/:id', requireAdminOrCurator, async (req: Request, res: Response) => {
  try {
    const data = scheduleUpdateSchema.parse(req.body);
    const existing = await getSchedule().then((list) => list.find((e) => e.id === req.params.id));
    if (!existing) return res.status(404).json({ success: false, error: 'Запись расписания не найдена' });
    const curatorGroup = req.auth?.role === 'curator' ? await getCuratorGroup(req) : null;
    if (curatorGroup && existing.group !== curatorGroup) {
      return res.status(403).json({ success: false, error: 'Недостаточно прав' });
    }
    const group = data.group ?? existing.group;
    const dayOfWeek = data.dayOfWeek ?? existing.dayOfWeek;
    const lessonNumber = data.lessonNumber ?? existing.lessonNumber;
    const week = data.week !== undefined ? data.week : existing.week;
    const collision = (await getSchedule(group)).find(
      (e) => e.id !== req.params.id && e.dayOfWeek === dayOfWeek && e.lessonNumber === lessonNumber && weekOverlaps(e.week, week)
    );
    if (collision) {
      return res.status(400).json({ success: false, error: 'Ячейка расписания уже занята другой записью' });
    }
    const entry = await updateScheduleEntry(req.params.id, data);
    logAudit('update', 'schedule', req.params.id, req.auth?.role, { group: existing.group, week: data.week ?? null });
    res.json({ success: true, data: entry });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.delete('/schedule/:id', requireAdminOrCurator, async (req: Request, res: Response) => {
  try {
    const existing = await getSchedule().then((list) => list.find((e) => e.id === req.params.id));
    if (!existing) return res.status(404).json({ success: false, error: 'Запись расписания не найдена' });
    const curatorGroup = req.auth?.role === 'curator' ? await getCuratorGroup(req) : null;
    if (curatorGroup && existing.group !== curatorGroup) {
      return res.status(403).json({ success: false, error: 'Недостаточно прав' });
    }
    const deleted = await deleteScheduleEntry(req.params.id);
    logAudit('delete', 'schedule', req.params.id, req.auth?.role, { group: existing.group });
    res.json({ success: true, data: { deleted } });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.delete('/schedule', requireAdminOrCurator, async (req: Request, res: Response) => {
  try {
    const group = typeof req.query.group === 'string' && req.query.group ? req.query.group : undefined;
    if (!group) return res.status(400).json({ success: false, error: 'Передайте group' });
    const curatorGroup = req.auth?.role === 'curator' ? await getCuratorGroup(req) : null;
    if (curatorGroup && group !== curatorGroup) {
      return res.status(403).json({ success: false, error: 'Недостаточно прав' });
    }
    const deleted = await deleteScheduleByGroup(group);
    logAudit('delete-all', 'schedule', undefined, req.auth?.role, { group, deleted });
    res.json({ success: true, data: { deleted } });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/settings', requireAuth, async (_req: Request, res: Response) => {
  try {
    const data = await getSettings();
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.put('/settings', requireAdmin, async (req: Request, res: Response) => {
  try {
    const body = settingsSchema.parse(req.body);
    await setSemesterStart(body.semesterStart);
    logAudit('update', 'settings', undefined, req.auth?.role, { semesterStart: body.semesterStart });
    res.json({ success: true, data: { semesterStart: body.semesterStart } });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/journal/summary', requireAdminOrCurator, async (req: Request, res: Response) => {
  try {
    const query = journalQuerySchema.parse(req.query);
    if (req.auth?.role === 'curator') {
      const curatorGroup = await getCuratorGroup(req);
      if (!curatorGroup || query.group !== curatorGroup) {
        return res.status(403).json({ success: false, error: 'Куратор может вести журнал только своей группы' });
      }
    }
    const { semesterStart } = await getSettings();
    const week = weekOfDate(query.date, semesterStart);
    const data = await getJournalSummaries(query.group, query.date, week);
    res.json({ success: true, data, week, semesterStart });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Неверные параметры', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/journal/:scheduleId', requireAdminOrCurator, async (req: Request, res: Response) => {
  try {
    const { date } = journalDateQuerySchema.parse(req.query);
    const lesson = await getJournalLesson(req.params.scheduleId, date);
    if (!lesson) return res.status(404).json({ success: false, error: 'Занятие не найдено' });
    if (req.auth?.role === 'curator') {
      const curatorGroup = await getCuratorGroup(req);
      if (!curatorGroup || lesson.group !== curatorGroup) {
        return res.status(403).json({ success: false, error: 'Недостаточно прав' });
      }
    }
    res.json({ success: true, data: lesson });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Неверные параметры', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.put('/journal/:scheduleId', requireAdminOrCurator, async (req: Request, res: Response) => {
  try {
    const data = journalSaveSchema.parse(req.body);
    const lesson = await getJournalLesson(req.params.scheduleId, data.date);
    if (!lesson) return res.status(404).json({ success: false, error: 'Занятие не найдено' });
    if (req.auth?.role === 'curator') {
      const curatorGroup = await getCuratorGroup(req);
      if (!curatorGroup || lesson.group !== curatorGroup) {
        return res.status(403).json({ success: false, error: 'Куратор может вести журнал только своей группы' });
      }
    }
    const validIds = new Set(lesson.students.map((s) => s.studentId));
    const entries = data.entries.filter((e) => validIds.has(e.studentId));
    const saved = await saveJournalLesson(req.params.scheduleId, data.date, entries);
    invalidateStudentsCache();
    logAudit('update', 'journal', req.params.scheduleId, req.auth?.role, { group: lesson.group, date: data.date, students: entries.length });
    void triggerWebhook('journal.updated', { scheduleId: req.params.scheduleId, date: data.date, group: lesson.group }).catch(() => {});
    res.json({ success: true, data: saved });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/marks/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const student = await getStudentByUserId(req.auth!.userId);
    if (!student) return res.json({ success: true, data: [] });
    const data = await getMarksByStudent(student.id);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/students/:id/marks', requireAuth, async (req: Request, res: Response) => {
  try {
    const student = await getStudentById(req.params.id);
    if (!student) return res.status(404).json({ success: false, error: 'Студент не найден' });
    if (req.auth?.role === 'curator') {
      const curatorGroup = await getCuratorGroup(req);
      if (!curatorGroup || student.group !== curatorGroup) {
        return res.status(403).json({ success: false, error: 'Недостаточно прав' });
      }
    } else if (req.auth?.role !== 'admin' && student.userId !== req.auth?.userId) {
      return res.status(403).json({ success: false, error: 'Недостаточно прав' });
    }
    const data = await getMarksByStudent(student.id);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/students/:id/marks', requireAdminOrCurator, async (req: Request, res: Response) => {
  try {
    const data = markSchema.parse(req.body);
    const student = await getStudentById(req.params.id);
    if (!student) return res.status(404).json({ success: false, error: 'Студент не найден' });
    const curatorGroup = req.auth?.role === 'curator' ? await getCuratorGroup(req) : null;
    if (curatorGroup && student.group !== curatorGroup) {
      return res.status(403).json({ success: false, error: 'Куратор может ставить оценки только студентам своей группы' });
    }
    const record = await addMark(student.id, data.subjectId, data.mark);
    await recomputeStudentPerformance(student.id);
    invalidateStudentsCache();
    logAudit('create', 'mark', record.id, req.auth?.role, { studentId: student.id, subjectId: data.subjectId, mark: data.mark });
    void triggerWebhook('mark.created', record).catch(() => {});
    res.status(201).json({ success: true, data: record });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.put('/marks/:id', requireAdminOrCurator, async (req: Request, res: Response) => {
  try {
    const data = markUpdateSchema.parse(req.body);
    const record = await getMarkById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Оценка не найдена' });
    const student = await getStudentById(record.studentId);
    if (!student) return res.status(404).json({ success: false, error: 'Студент не найден' });
    const curatorGroup = req.auth?.role === 'curator' ? await getCuratorGroup(req) : null;
    if (curatorGroup && student.group !== curatorGroup) {
      return res.status(403).json({ success: false, error: 'Куратор может редактировать оценки только своей группы' });
    }
    const updated = await updateMark(req.params.id, data.mark);
    await recomputeStudentPerformance(student.id);
    invalidateStudentsCache();
    logAudit('update', 'mark', req.params.id, req.auth?.role, { studentId: student.id, mark: data.mark });
    void triggerWebhook('mark.updated', updated).catch(() => {});
    res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.delete('/marks/:id', requireAdminOrCurator, async (req: Request, res: Response) => {
  try {
    const record = await getMarkById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Оценка не найдена' });
    const student = await getStudentById(record.studentId);
    const curatorGroup = req.auth?.role === 'curator' ? await getCuratorGroup(req) : null;
    if (curatorGroup && (!student || student.group !== curatorGroup)) {
      return res.status(403).json({ success: false, error: 'Недостаточно прав' });
    }
    const deleted = await deleteMark(req.params.id);
    if (student) {
      await recomputeStudentPerformance(student.id);
      invalidateStudentsCache();
    }
    logAudit('delete', 'mark', req.params.id, req.auth?.role, { studentId: record.studentId });
    void triggerWebhook('mark.deleted', { id: req.params.id, deleted }).catch(() => {});
    res.json({ success: true, data: { deleted } });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.put('/admin/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = userAdminUpdateSchema.parse(req.body);
    if (req.params.id === req.auth!.userId && data.role && data.role !== 'admin') {
      return res.status(400).json({ success: false, error: 'Нельзя изменить собственную роль' });
    }
    const user = await updateUserRoleAndGroup(req.params.id, data);
    if (!user) return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    logAudit('update', 'user', user.id, req.auth?.role, { role: user.role, group: user.group ?? null });
    res.json({ success: true, data: user });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});