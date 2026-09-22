import { Router, Request, Response } from 'express';
import {
  getAllStudents,
  getStudentById,
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
} from './db.js';
import {
  studentSchema, studentUpdateSchema, querySchema,
  registerSchema, loginSchema, refreshSchema,
  updateProfileSchema, changePasswordSchema, batchIdsSchema, webhookSchema,
} from './validation.js';
import {
  authenticate, requireAuth, requireAdmin, getAuthInfo, Role,
  hashPassword, comparePassword, signAccessToken,
} from './auth.js';
import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { logAudit, getAuditLogs } from './audit.js';
import { registerWebhook, removeWebhook, triggerWebhook, listWebhooks } from './webhooks.js';
import { sendWelcomeEmail } from './email.js';
import { logger } from './logger.js';

export const router = Router();

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await getAllUsers().then((users) => users.find((u) => u.email === data.email.toLowerCase()));
    if (existing) {
      return res.status(409).json({ success: false, error: 'Пользователь с таким email уже существует' });
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
    logAudit('login', 'auth', undefined, result.role);
    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.post('/auth/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const decoded = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET) as { userId: string };
    const user = await getUserById(decoded.userId);
    if (!user) return res.status(401).json({ success: false, error: 'Пользователь не найден' });
    const token = signAccessToken({ id: user.id, email: user.email, role: user.role === 'admin' ? 'admin' : 'user' });
    res.json({ success: true, data: { token, role: user.role } });
  } catch (err: any) {
    logger.warn(`Refresh token verification failed: ${err.message}`);
    res.status(401).json({ success: false, error: 'Недействительный refresh-токен' });
  }
});

router.post('/auth/logout', requireAuth, (req: Request, res: Response) => {
  logAudit('logout', 'auth', undefined, req.auth?.role);
  res.json({ success: true });
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
    const stats = await getStats();
    res.json({ success: true, data: stats });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/students', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = querySchema.parse(req.query);
    const { students, total } = await getAllStudents(
      query.search, query.page, query.limit, query.sortBy, query.sortOrder,
      query.filterDebt, query.filterCourse
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

router.get('/students/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const student = await getStudentById(req.params.id);
    if (!student) return res.status(404).json({ success: false, error: 'Студент не найден' });
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
        if (student) rows.push(student);
      }
      result = rows;
    } else {
      const { students } = await getAllStudents(undefined, 1, 10000);
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

router.post('/students', requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = studentSchema.parse(req.body);
    const student = await createStudent({ ...data, email: data.email ?? null, phone: data.phone ?? null });
    logAudit('create', 'student', student.id, req.auth?.role, { fullName: student.fullName });
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
    const webhook = registerWebhook(data.url, data.events);
    logAudit('create', 'webhook', webhook.id, req.auth?.role, { url: webhook.url });
    res.status(201).json({ success: true, data: webhook });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
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
    await triggerWebhook('student.debt_toggled', student);
    res.json({ success: true, data: student });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.delete('/students', requireAdmin, async (req: Request, res: Response) => {
  try {
    const count = await deleteAllStudents();
    logAudit('delete-all', 'student', undefined, req.auth?.role, { deleted: count });
    await triggerWebhook('students.deleted_all', { count });
    res.json({ success: true, data: { deleted: count } });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/admin/analytics', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const stats = await getStats();
    const bySpecialty = await getStudentsBySpecialty();
    const byCourse = await getStudentsByCourse();
    const recent = await getRecentStudents(5);
    res.json({
      success: true,
      data: { stats, bySpecialty, byCourse, recent },
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