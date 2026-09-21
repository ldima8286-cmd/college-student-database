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
} from './db.js';
import { studentSchema, studentUpdateSchema, querySchema } from './validation.js';
import { login, requireAuth, requireAdmin, getAuthInfo, Role } from './auth.js';
import { logAudit, getAuditLogs } from './audit.js';
import { logger } from './logger.js';

export const router = Router();

router.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { password, role } = req.body;
    const requestedRole: Role = role === 'admin' ? 'admin' : 'user';

    if (!password) {
      return res.status(400).json({ success: false, error: 'Введите пароль' });
    }

    const result = login(password, requestedRole);
    if (!result) {
      return res.status(401).json({ success: false, error: 'Неверный пароль' });
    }

    logAudit('login', 'auth', undefined, requestedRole);
    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
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

router.post('/students', requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = studentSchema.parse(req.body);
    const student = await createStudent(data);
    logAudit('create', 'student', student.id, req.auth?.role, { fullName: student.fullName });
    res.status(201).json({ success: true, data: student });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.put('/students/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = studentUpdateSchema.parse(req.body);
    const student = await updateStudent(req.params.id, data);
    if (!student) return res.status(404).json({ success: false, error: 'Студент не найден' });
    logAudit('update', 'student', student.id, req.auth?.role, { fullName: student.fullName });
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
    res.json({ success: true, data: student });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.delete('/students', requireAdmin, async (req: Request, res: Response) => {
  try {
    const count = await deleteAllStudents();
    logAudit('delete-all', 'student', undefined, req.auth?.role, { deleted: count });
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
