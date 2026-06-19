import { Router } from 'express';
import { getDb, getAllStudents, getStudentById, createStudent, updateStudent, deleteStudent, toggleDebt, deleteAllStudents, getUserByUsername, createUser, deleteUser, getAllUsers } from './db.js';
import { generateToken, verifyToken } from './auth.js';
import { logRequest, logAnonymous, getLogs, getLogsByUser } from './logger.js';

export const router = Router();

// ============================================================
//  АВТОРИЗАЦИЯ
// ============================================================

router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const db = await getDb();
  
  const user = await db.get('SELECT * FROM users WHERE username = ?', username);
  if (!user) {
    await logAnonymous(req, username, 'LOGIN_FAILED', 'Неверный логин');
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  // Для GH Pages
  if (password !== user.password) {
    await logAnonymous(req, username, 'LOGIN_FAILED', 'Неверный пароль');
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const token = generateToken({
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    groupFilter: user.groupFilter
  });

  // Логируем успешный вход
  await logAction({
    userId: user.id,
    username: user.username,
    action: 'LOGIN_SUCCESS',
    details: 'Успешный вход в систему',
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      groupFilter: user.groupFilter
    }
  });
});

// ============================================================
//  МИДЛВЭРЫ
// ============================================================

const checkAuth = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Неверный токен' });
  }

  req.user = user;
  next();
};

const checkAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещён. Только для администратора' });
  }
  next();
};

// ============================================================
//  СТУДЕНТЫ (с логированием)
// ============================================================

router.get('/students', checkAuth, async (req, res) => {
  const db = await getDb();
  let query = 'SELECT * FROM students';
  const params: any[] = [];
  
  // Если преподаватель — показываем только его группу
  if (req.user.role === 'teacher' && req.user.groupFilter) {
    query += ' WHERE `group` = ?';
    params.push(req.user.groupFilter);
  }
  
  query += ' ORDER BY fullName COLLATE NOCASE';
  const students = await db.all(query, ...params);
  res.json(students);
});

router.post('/students', checkAuth, async (req, res) => {
  const student = req.body;
  const db = await getDb();
  
  await db.run(
    `INSERT INTO students (id, fullName, course, \`group\`, specialty, attendance, performance, academicDebt, createdBy, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    student.id,
    student.fullName,
    student.course,
    student.group,
    student.specialty,
    student.attendance,
    student.performance,
    student.academicDebt ? 1 : 0,
    req.user.id,
    new Date().toISOString()
  );
  
  await logRequest(req, 'СТУДЕНТ_ДОБАВЛЕН', `Добавлен студент: ${student.fullName} (группа ${student.group})`);
  res.status(201).json(student);
});

router.put('/students/:id', checkAuth, async (req, res) => {
  const id = req.params.id;
  const student = req.body;
  const db = await getDb();
  
  const oldStudent = await db.get('SELECT * FROM students WHERE id = ?', id);
  if (!oldStudent) {
    return res.status(404).json({ error: 'Студент не найден' });
  }

  // Преподаватель может редактировать только свою группу
  if (req.user.role === 'teacher' && req.user.groupFilter && oldStudent.group !== req.user.groupFilter) {
    return res.status(403).json({ error: 'Доступ запрещён: не ваша группа' });
  }

  await db.run(
    `UPDATE students SET 
      fullName = ?, course = ?, \`group\` = ?, specialty = ?, 
      attendance = ?, performance = ?, academicDebt = ?, updatedAt = ?
     WHERE id = ?`,
    student.fullName,
    student.course,
    student.group,
    student.specialty,
    student.attendance,
    student.performance,
    student.academicDebt ? 1 : 0,
    new Date().toISOString(),
    id
  );
  
  await logRequest(req, 'СТУДЕНТ_ОБНОВЛЁН', `Обновлён студент: ${oldStudent.fullName} → ${student.fullName}`);
  res.json(student);
});

router.delete('/students/:id', checkAuth, async (req, res) => {
  const id = req.params.id;
  const db = await getDb();
  
  const student = await db.get('SELECT * FROM students WHERE id = ?', id);
  if (!student) {
    return res.status(404).json({ error: 'Студент не найден' });
  }

  // Преподаватель не может удалять студентов
  if (req.user.role === 'teacher') {
    return res.status(403).json({ error: 'Доступ запрещён: только администратор может удалять' });
  }

  await db.run('DELETE FROM students WHERE id = ?', id);
  await logRequest(req, 'СТУДЕНТ_УДАЛЁН', `Удалён студент: ${student.fullName}`);
  
  res.status(204).send();
});

router.patch('/students/:id/toggle-debt', checkAuth, async (req, res) => {
  const id = req.params.id;
  const db = await getDb();
  
  const student = await db.get('SELECT * FROM students WHERE id = ?', id);
  if (!student) {
    return res.status(404).json({ error: 'Студент не найден' });
  }

  // Преподаватель может работать только со своей группой
  if (req.user.role === 'teacher' && req.user.groupFilter && student.group !== req.user.groupFilter) {
    return res.status(403).json({ error: 'Доступ запрещён: не ваша группа' });
  }

  const newDebtStatus = student.academicDebt === 0 ? 1 : 0;
  await db.run(
    'UPDATE students SET academicDebt = ?, updatedAt = ? WHERE id = ?',
    newDebtStatus,
    new Date().toISOString(),
    id
  );
  
  await logRequest(req, 'ЗАДОЛЖЕННОСТЬ_ПЕРЕКЛЮЧЕНА', 
    `${student.fullName}: задолженность ${newDebtStatus ? 'добавлена' : 'снята'}`
  );
  
  res.status(200).json({ success: true });
});

router.delete('/students', checkAuth, checkAdmin, async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM students');
  
  await logRequest(req, 'ВСЕ_СТУДЕНТЫ_УДАЛЕНЫ', 'Удалены все студенты');
  res.status(204).send();
});

// ============================================================
//  ЛОГИ (только для админа)
// ============================================================

router.get('/admin/logs', checkAuth, checkAdmin, async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const logs = await getLogs(limit);
  res.json(logs);
});

router.get('/admin/logs/user/:userId', checkAuth, checkAdmin, async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const logs = await getLogsByUser(req.params.userId, limit);
  res.json(logs);
});

// ============================================================
//  ПОЛЬЗОВАТЕЛИ (только для админа)
// ============================================================

router.get('/admin/users', checkAuth, checkAdmin, async (req, res) => {
  const users = await getAllUsers();
  res.json(users);
});

router.post('/admin/users', checkAuth, checkAdmin, async (req, res) => {
  const { username, password, role, fullName, groupFilter } = req.body;
  
  // Проверяем, не существует ли уже пользователь
  const existing = await getUserByUsername(username);
  if (existing) {
    return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
  }

  await createUser({
    id: Date.now().toString(),
    username,
    password, // Временно без хеширования
    role,
    fullName,
    groupFilter
  });

  await logRequest(req, 'ПОЛЬЗОВАТЕЛЬ_СОЗДАН', `Создан пользователь: ${username} (${role})`);
  res.status(201).json({ message: 'Пользователь создан' });
});

router.delete('/admin/users/:id', checkAuth, checkAdmin, async (req, res) => {
  const userId = req.params.id;
  
  // Не даём удалить самого себя
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Нельзя удалить самого себя' });
  }

  await deleteUser(userId);
  await logRequest(req, 'ПОЛЬЗОВАТЕЛЬ_УДАЛЁН', `Удалён пользователь с ID: ${userId}`);
  res.status(204).send();
});