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
} from './db.js';
import {
  studentSchema, studentUpdateSchema, studentSelfSchema, querySchema,
  registerSchema, loginSchema, refreshSchema,
  updateProfileSchema, changePasswordSchema, batchIdsSchema, batchUpdateSchema, webhookSchema,
  forgotPasswordSchema, resetPasswordSchema,
} from './validation.js';
import {
  authenticate, requireAuth, requireAdmin, requireCsrf, getAuthInfo, Role,
  hashPassword, comparePassword, signAccessToken,
  setAuthCookies, clearAuthCookies, refreshSession,
  signResetToken, verifyResetToken,
  revokeRefreshJti, verifyRefreshToken, revokeAllRefreshTokens,
} from './auth.js';
import { env } from './env.js';
import { logAudit, getAuditLogs } from './audit.js';
import { registerWebhook, removeWebhook, triggerWebhook, listWebhooks, assertSafeWebhookUrl } from './webhooks.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from './email.js';
import { cached, invalidateCache } from './cache.js';
import { logger } from './logger.js';

export const router = Router();

const CACHE_TTL = 30_000;
const invalidateStudentsCache = () => invalidateCache('students.');

router.use(cookieParser());
router.use(requireCsrf);

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await getAllUsers().then((users) => users.find((u) => u.email === data.email.toLowerCase()));
    if (existing) {
      res.status(201).json({ success: true, data: { id: existing.id } });
      return;
    }
    const user = await createUser({
      email: data.email,
      passwordHash: hashPassword(data.password),
      fullName: data.fullName,
      phone: data.phone ?? null,
    });
    logAudit('register', 'user', user.id, user.role, { email: user.email });
    await sendWelcomeEmail(user.email, user.fullName).catch(() => {});
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
    logAudit('login', 'auth', undefined, result.role);
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

router.post('/auth/logout', requireAuth, (req: Request, res: Response) => {
  const refreshCookie = typeof req.cookies?.refresh_token === 'string' ? req.cookies.refresh_token : undefined;
  if (refreshCookie) {
    const valid = verifyRefreshToken(refreshCookie);
    if (valid) revokeRefreshJti(valid.jti);
  }
  clearAuthCookies(res);
  logAudit('logout', 'auth', undefined, req.auth?.role);
  res.json({ success: true });
});

router.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await findUserByEmail(email.toLowerCase());
    if (user) {
      const token = signResetToken(user.email);
      const resetUrl = `${env.FRONT_URL}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail(user.email, resetUrl).catch(() => {});
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
    await updateUserPassword(user.id, hashPassword(newPassword));
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
    if (!comparePassword(data.oldPassword, user.passwordHash)) {
      return res.status(400).json({ success: false, error: 'Неверный текущий пароль' });
    }
    await updateUserPassword(req.auth!.userId, hashPassword(data.newPassword));
    revokeAllRefreshTokens(req.auth!.userId);
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
    const { students, total } = await getAllStudents(
      query.search, query.page, query.limit, query.sortBy, query.sortOrder,
      query.filterDebt, query.filterCourse, status
    );
    res.json({
      success: true, data: students, total,
      page: query.page, limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
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
        status: 'pending',
      });
      logAudit('update', 'student', existing.id, req.auth?.role, { fullName: existing.fullName, self: true });
      invalidateStudentsCache();
      await triggerWebhook('student.updated', student);
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
    await triggerWebhook('student.created', student);
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
    if (req.auth?.role !== 'admin' && student.status === 'pending' && student.userId !== req.auth?.userId) {
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
    let count = 0;
    for (const id of ids) {
      if (await deleteStudent(id)) count++;
    }
    logAudit('batch-delete', 'student', undefined, req.auth?.role, { deleted: count });
    invalidateStudentsCache();
    await triggerWebhook('students.deleted', { count, ids });
    res.json({ success: true, data: { deleted: count } });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/students/batch-export', requireAuth, async (req: Request, res: Response) => {
  try {
    let result;
    if (req.body?.ids?.length) {
      const { ids } = batchIdsSchema.parse(req.body);
      const rows = [];
      for (const id of ids) {
        const student = await getStudentById(id);
        if (!student) continue;
        if (req.auth?.role !== 'admin' && student.status === 'pending' && student.userId !== req.auth?.userId) continue;
        rows.push(student);
      }
      result = rows;
    } else {
      const { students } = await getAllStudents(undefined, 1, 10000, 'fullName', 'asc', undefined, undefined, req.auth?.role === 'admin' ? undefined : 'approved');
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
    let updated = 0;
    for (const id of ids) {
      const student = await updateStudent(id, patch);
      if (student) updated++;
    }
    logAudit('batch-update', 'student', undefined, req.auth?.role, { updated, fields: Object.keys(patch) });
    invalidateStudentsCache();
    await triggerWebhook('students.updated', { count: updated, ids });
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
    await triggerWebhook('student.created', student);
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
    await triggerWebhook('student.updated', student);
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
    const student = await getStudentById(req.params.id);
    const deleted = await deleteStudent(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Студент не найден' });
    logAudit('delete', 'student', req.params.id, req.auth?.role);
    invalidateStudentsCache();
    await triggerWebhook('student.deleted', { id: req.params.id, deleted });
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
    await triggerWebhook('student.debt_toggled', student);
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
    await triggerWebhook('student.approved', student);
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
    await triggerWebhook('students.deleted_all', { count });
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
        phone: u.phone, createdAt: u.createdAt,
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

router.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});