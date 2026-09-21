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
import { login, logout, requireAuth, requireAdmin, getAuthInfo, getActiveSessions } from './auth.js';

export const router = Router();

// Auth
router.post('/auth/login', login);
router.post('/auth/logout', requireAuth, logout);
router.get('/auth/status', requireAuth, (req: Request, res: Response) => {
  const info = getAuthInfo(req);
  const sessions = getActiveSessions();
  res.json({ success: true, data: { ...info, sessions } });
});

// Public: stats
router.get('/students/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getStats();
    res.json({ success: true, data: stats });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

// Authenticated (user or admin): list
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

// Authenticated: single student
router.get('/students/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const student = await getStudentById(req.params.id);
    if (!student) return res.status(404).json({ success: false, error: 'Студент не найден' });
    res.json({ success: true, data: student });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

// Admin only: create
router.post('/students', requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = studentSchema.parse(req.body);
    const student = await createStudent(data);
    res.status(201).json({ success: true, data: student });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

// Admin only: update
router.put('/students/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = studentUpdateSchema.parse(req.body);
    const student = await updateStudent(req.params.id, data);
    if (!student) return res.status(404).json({ success: false, error: 'Студент не найден' });
    res.json({ success: true, data: student });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Ошибка валидации', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

// Admin only: delete
router.delete('/students/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const deleted = await deleteStudent(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Студент не найден' });
    res.status(204).send();
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

// Admin only: toggle debt
router.patch('/students/:id/toggle-debt', requireAdmin, async (req: Request, res: Response) => {
  try {
    const student = await toggleDebt(req.params.id);
    if (!student) return res.status(404).json({ success: false, error: 'Студент не найден' });
    res.json({ success: true, data: student });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

// Admin only: delete all
router.delete('/students', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const count = await deleteAllStudents();
    res.json({ success: true, data: { deleted: count } });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

// Admin only: analytics
router.get('/admin/analytics', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const stats = await getStats();
    const bySpecialty = await getStudentsBySpecialty();
    const byCourse = await getStudentsByCourse();
    const recent = await getRecentStudents(5);
    res.json({
      success: true,
      data: { stats, bySpecialty, byCourse, recent, sessions: getActiveSessions() },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});
