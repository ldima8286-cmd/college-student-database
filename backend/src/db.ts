import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export interface Student {
  id: string;
  fullName: string;
  course: number;
  group: string;
  specialty: string;
  attendance: number;
  performance: number;
  academicDebt: boolean;
  createdBy?: string;
  updatedAt?: string;
}

let db: any = null;

export async function getDb() {
  if (!db) {
    db = await open({
      filename: './database.sqlite',
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        fullName TEXT NOT NULL,
        course INTEGER NOT NULL,
        \`group\` TEXT NOT NULL,
        specialty TEXT NOT NULL,
        attendance INTEGER NOT NULL,
        performance REAL NOT NULL,
        academicDebt INTEGER NOT NULL DEFAULT 0,
        createdBy TEXT,
        updatedAt TEXT
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'teacher')),
        fullName TEXT NOT NULL,
        groupFilter TEXT
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        timestamp TEXT NOT NULL,
        ip TEXT,
        userAgent TEXT
      )
    `);

    const adminExists = await db.get('SELECT * FROM users WHERE username = ?', 'admin');
    if (!adminExists) {
      await db.run(
        `INSERT INTO users (id, username, password, role, fullName)
         VALUES (?, ?, ?, ?, ?)`,
        'admin-1', 'admin', 'admin123', 'admin', 'Главный администратор'
      );
    }

    const teacherExists = await db.get('SELECT * FROM users WHERE username = ?', 'teacher');
    if (!teacherExists) {
      await db.run(
        `INSERT INTO users (id, username, password, role, fullName, groupFilter)
         VALUES (?, ?, ?, ?, ?, ?)`,
        'teacher-1', 'teacher', 'teacher123', 'teacher', 'Преподаватель', 'ИС-21'
      );
    }
  }
  return db;
}

// ==================== СТУДЕНТЫ ====================

export async function getAllStudents(): Promise<Student[]> {
  const db = await getDb();
  const rows = await db.all(
    'SELECT id, fullName, course, `group`, specialty, attendance, performance, academicDebt, createdBy, updatedAt FROM students ORDER BY fullName COLLATE NOCASE'
  );
  return rows.map((row: any) => ({
    ...row,
    academicDebt: row.academicDebt === 1
  }));
}

export async function getStudentById(id: string): Promise<Student | undefined> {
  const db = await getDb();
  const row = await db.get(
    'SELECT id, fullName, course, `group`, specialty, attendance, performance, academicDebt, createdBy, updatedAt FROM students WHERE id = ?',
    id
  );
  if (!row) return undefined;
  return { ...row, academicDebt: row.academicDebt === 1 };
}

export async function createStudent(student: Student): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
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
    student.createdBy || null,
    now
  );
}

export async function updateStudent(id: string, student: Student): Promise<boolean> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.run(
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
    now,
    id
  );
  return (result.changes ?? 0) > 0;
}

export async function deleteStudent(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.run('DELETE FROM students WHERE id = ?', id);
  return (result.changes ?? 0) > 0;
}

export async function toggleDebt(id: string): Promise<boolean> {
  const student = await getStudentById(id);
  if (!student) return false;
  return await updateStudent(id, { ...student, academicDebt: !student.academicDebt });
}

export async function deleteAllStudents(): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM students');
}

// ==================== ЛОГИ ====================

export interface LogEntry {
  id: string;
  userId: string;
  username: string;
  action: string;
  details?: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
}

export async function addLog(entry: Omit<LogEntry, 'id'>): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO logs (id, userId, username, action, details, timestamp, ip, userAgent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    Date.now().toString(),
    entry.userId,
    entry.username,
    entry.action,
    entry.details || '',
    entry.timestamp,
    entry.ip || '',
    entry.userAgent || ''
  );
}

export async function getLogs(limit: number = 100): Promise<LogEntry[]> {
  const db = await getDb();
  return await db.all(
    `SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?`,
    limit
  );
}

export async function getLogsByUser(userId: string, limit: number = 50): Promise<LogEntry[]> {
  const db = await getDb();
  return await db.all(
    `SELECT * FROM logs WHERE userId = ? ORDER BY timestamp DESC LIMIT ?`,
    userId,
    limit
  );
}

export async function deleteAllLogs(): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM logs');
}

// ==================== ПОЛЬЗОВАТЕЛИ ====================

export async function getUserByUsername(username: string): Promise<any> {
  const db = await getDb();
  return await db.get('SELECT * FROM users WHERE username = ?', username);
}

export async function createUser(user: any): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO users (id, username, password, role, fullName, groupFilter)
     VALUES (?, ?, ?, ?, ?, ?)`,
    user.id,
    user.username,
    user.password,
    user.role,
    user.fullName,
    user.groupFilter || null
  );
}

export async function deleteUser(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.run('DELETE FROM users WHERE id = ?', id);
  return (result.changes ?? 0) > 0;
}

export async function getAllUsers(): Promise<any[]> {
  const db = await getDb();
  return await db.all('SELECT id, username, role, fullName, groupFilter FROM users');
}