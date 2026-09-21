import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, like, or, and, sql, count, desc, asc } from 'drizzle-orm';
import * as schema from './schema.sqlite.js';
import { env } from './env.js';
import type { Student } from './db.js';
import { logAudit as _logAudit, getAuditLogs as _getAuditLogs } from './audit.sqlite.js';

const sqliteDb: DatabaseType = new Database(env.DATABASE_URL.replace('sqlite:', ''));
sqliteDb.pragma('journal_mode = WAL');
sqliteDb.pragma('foreign_keys = ON');

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    course INTEGER NOT NULL CHECK(course >= 1 AND course <= 6),
    "group" TEXT NOT NULL,
    specialty TEXT NOT NULL,
    attendance INTEGER NOT NULL DEFAULT 100 CHECK(attendance >= 0 AND attendance <= 100),
    performance REAL NOT NULL DEFAULT 4.0 CHECK(performance >= 0 AND performance <= 5),
    academicDebt INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS auditLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entityId TEXT,
    userId TEXT,
    details TEXT,
    createdAt TEXT NOT NULL
  )
`);

const db = drizzle(sqliteDb, { schema });

export const rawDb: DatabaseType = sqliteDb;

type SortOrder = 'asc' | 'desc';
const studentsTable = schema.students;
const auditTable = schema.auditLog;

export async function getAllStudents(
  search?: string, page: number = 1, limit: number = 50,
  sortBy: string = 'fullName', sortOrder: SortOrder = 'asc',
  filterDebt?: boolean, filterCourse?: number
): Promise<{ students: Student[]; total: number }> {
  const allowedSorts = ['fullName', 'course', 'group', 'specialty', 'attendance', 'performance', 'createdAt'];
  const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'fullName';

  let query = `SELECT * FROM students`;
  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    conditions.push(`(fullName LIKE ? OR "group" LIKE ? OR specialty LIKE ?)`);
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (filterDebt !== undefined) {
    conditions.push(`academicDebt = ?`);
    params.push(filterDebt ? 1 : 0);
  }
  if (filterCourse !== undefined) {
    conditions.push(`course = ?`);
    params.push(filterCourse);
  }

  if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;

  const countRow = sqliteDb.prepare(`SELECT COUNT(*) as count FROM students${conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''}`).get(...params) as any;
  const total = countRow?.count ?? 0;

  const col = safeSortBy === 'group' ? '"group"' : safeSortBy;
  query += ` ORDER BY ${col} COLLATE NOCASE ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
  query += ` LIMIT ? OFFSET ?`;
  params.push(limit, (page - 1) * limit);

  const rows = sqliteDb.prepare(query).all(...params) as any[];
  const students = rows.map(r => ({ ...r, academicDebt: r.academicDebt === 1 }));

  return { students, total };
}

export async function getStudentById(id: string): Promise<Student | undefined> {
  const row = sqliteDb.prepare('SELECT * FROM students WHERE id = ?').get(id) as any;
  return row ? { ...row, academicDebt: row.academicDebt === 1 } : undefined;
}

export async function createStudent(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  sqliteDb.prepare(
    `INSERT INTO students (id, fullName, course, "group", specialty, attendance, performance, academicDebt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.fullName, data.course, data.group, data.specialty, data.attendance, data.performance, data.academicDebt ? 1 : 0, now, now);
  return (await getStudentById(id))!;
}

export async function updateStudent(id: string, data: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Student | null> {
  const existing = await getStudentById(id);
  if (!existing) return null;
  const updated = {
    fullName: data.fullName ?? existing.fullName, course: data.course ?? existing.course,
    group: data.group ?? existing.group, specialty: data.specialty ?? existing.specialty,
    attendance: data.attendance ?? existing.attendance, performance: data.performance ?? existing.performance,
    academicDebt: data.academicDebt ?? existing.academicDebt, updatedAt: new Date().toISOString(),
  };
  sqliteDb.prepare(
    `UPDATE students SET fullName=?, course=?, "group"=?, specialty=?, attendance=?, performance=?, academicDebt=?, updatedAt=? WHERE id=?`
  ).run(updated.fullName, updated.course, updated.group, updated.specialty, updated.attendance, updated.performance, updated.academicDebt ? 1 : 0, updated.updatedAt, id);
  return (await getStudentById(id)) ?? null;
}

export async function deleteStudent(id: string): Promise<boolean> {
  const result = sqliteDb.prepare('DELETE FROM students WHERE id = ?').run(id);
  return result.changes > 0;
}

export async function toggleDebt(id: string): Promise<Student | null> {
  const existing = await getStudentById(id);
  if (!existing) return null;
  sqliteDb.prepare('UPDATE students SET academicDebt = ?, updatedAt = ? WHERE id = ?')
    .run(existing.academicDebt ? 0 : 1, new Date().toISOString(), id);
  return (await getStudentById(id)) ?? null;
}

export async function deleteAllStudents(): Promise<number> {
  const result = sqliteDb.prepare('DELETE FROM students').run();
  return result.changes;
}

export async function getStats() {
  const total = (sqliteDb.prepare('SELECT COUNT(*) as c FROM students').get() as any).c ?? 0;
  const withDebt = (sqliteDb.prepare('SELECT COUNT(*) as c FROM students WHERE academicDebt = 1').get() as any).c ?? 0;
  const avgs = sqliteDb.prepare('SELECT AVG(attendance) as a, AVG(performance) as p FROM students').get() as any;
  const courseRows = sqliteDb.prepare('SELECT course, COUNT(*) as count FROM students GROUP BY course').all() as any[];
  const byCourse: Record<number, number> = {};
  for (const r of courseRows) byCourse[r.course] = r.count;
  const specRows = sqliteDb.prepare('SELECT specialty, COUNT(*) as count FROM students GROUP BY specialty').all() as any[];
  const bySpecialty: Record<string, number> = {};
  for (const r of specRows) bySpecialty[r.specialty] = r.count;
  return {
    total, withDebt,
    avgAttendance: Math.round(avgs?.a ?? 0),
    avgPerformance: Number((avgs?.p ?? 0).toFixed(2)),
    byCourse, bySpecialty,
  };
}

export async function getStudentsBySpecialty() {
  return sqliteDb.prepare(
    'SELECT specialty, COUNT(*) as count, ROUND(AVG(performance), 2) as avgPerformance, ROUND(AVG(attendance)) as avgAttendance FROM students GROUP BY specialty ORDER BY count DESC'
  ).all() as any[];
}

export async function getStudentsByCourse() {
  return sqliteDb.prepare(
    'SELECT course, COUNT(*) as count, SUM(academicDebt) as withDebt FROM students GROUP BY course ORDER BY course'
  ).all() as any[];
}

export async function getRecentStudents(limit: number = 5): Promise<Student[]> {
  const rows = sqliteDb.prepare('SELECT * FROM students ORDER BY createdAt DESC LIMIT ?').all(limit) as any[];
  return rows.map(r => ({ ...r, academicDebt: r.academicDebt === 1 }));
}

export async function logAudit(action: string, entity: string, entityId?: string, userId?: string, details?: any) {
  _logAudit(sqliteDb, action, entity, entityId, userId, details);
}

export async function getAuditLogs(page: number = 1, limit: number = 50, entity?: string, action?: string) {
  return _getAuditLogs(sqliteDb, page, limit, entity, action);
}
