import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';
import { Student, StudentStats } from './types.js';

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
        course INTEGER NOT NULL CHECK(course BETWEEN 1 AND 6),
        "group" TEXT NOT NULL,
        specialty TEXT NOT NULL,
        attendance INTEGER NOT NULL DEFAULT 100 CHECK(attendance BETWEEN 0 AND 100),
        performance REAL NOT NULL DEFAULT 4.0 CHECK(performance BETWEEN 0 AND 5),
        academicDebt INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_students_fullName ON students(fullName);
      CREATE INDEX IF NOT EXISTS idx_students_group ON students("group");
      CREATE INDEX IF NOT EXISTS idx_students_specialty ON students(specialty);
      CREATE INDEX IF NOT EXISTS idx_students_course ON students(course);
      CREATE INDEX IF NOT EXISTS idx_students_academicDebt ON students(academicDebt);
    `);
  }
  return db;
}

function rowToStudent(row: any): Student {
  return {
    ...row,
    academicDebt: row.academicDebt === 1,
  };
}

export async function getAllStudents(
  search?: string,
  page: number = 1,
  limit: number = 50,
  sortBy: string = 'fullName',
  sortOrder: 'asc' | 'desc' = 'asc',
  filterDebt?: boolean,
  filterCourse?: number
): Promise<{ students: Student[]; total: number }> {
  const db = await getDb();

  const allowedSorts = ['fullName', 'course', 'group', 'specialty', 'attendance', 'performance', 'createdAt'];
  const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'fullName';
  const safeSortOrder = sortOrder === 'desc' ? 'DESC' : 'ASC';

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (search) {
    whereClauses.push(`(fullName LIKE ? OR "group" LIKE ? OR specialty LIKE ?)`);
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (filterDebt !== undefined) {
    whereClauses.push(`academicDebt = ?`);
    params.push(filterDebt ? 1 : 0);
  }

  if (filterCourse !== undefined) {
    whereClauses.push(`course = ?`);
    params.push(filterCourse);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countResult = await db.get(`SELECT COUNT(*) as count FROM students ${whereStr}`, ...params);
  const total = countResult.count;

  const offset = (page - 1) * limit;
  const col = safeSortBy === 'group' ? '"group"' : safeSortBy;
  const rows = await db.all(
    `SELECT * FROM students ${whereStr} ORDER BY ${col} COLLATE NOCASE ${safeSortOrder} LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset
  );

  return {
    students: rows.map(rowToStudent),
    total,
  };
}

export async function getStudentById(id: string): Promise<Student | undefined> {
  const db = await getDb();
  const row = await db.get('SELECT * FROM students WHERE id = ?', id);
  return row ? rowToStudent(row) : undefined;
}

export async function createStudent(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
  const db = await getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO students (id, fullName, course, "group", specialty, attendance, performance, academicDebt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    data.fullName,
    data.course,
    data.group,
    data.specialty,
    data.attendance,
    data.performance,
    data.academicDebt ? 1 : 0,
    now,
    now
  );

  return (await getStudentById(id))!;
}

export async function updateStudent(id: string, data: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Student | null> {
  const db = await getDb();
  const existing = await getStudentById(id);
  if (!existing) return null;

  const updated = {
    fullName: data.fullName ?? existing.fullName,
    course: data.course ?? existing.course,
    group: data.group ?? existing.group,
    specialty: data.specialty ?? existing.specialty,
    attendance: data.attendance ?? existing.attendance,
    performance: data.performance ?? existing.performance,
    academicDebt: data.academicDebt ?? existing.academicDebt,
  };

  const now = new Date().toISOString();

  await db.run(
    `UPDATE students SET
      fullName = ?, course = ?, "group" = ?, specialty = ?,
      attendance = ?, performance = ?, academicDebt = ?, updatedAt = ?
     WHERE id = ?`,
    updated.fullName,
    updated.course,
    updated.group,
    updated.specialty,
    updated.attendance,
    updated.performance,
    updated.academicDebt ? 1 : 0,
    now,
    id
  );

  return (await getStudentById(id))!;
}

export async function deleteStudent(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.run('DELETE FROM students WHERE id = ?', id);
  return (result.changes ?? 0) > 0;
}

export async function toggleDebt(id: string): Promise<Student | null> {
  const db = await getDb();
  const student = await getStudentById(id);
  if (!student) return null;

  const now = new Date().toISOString();
  await db.run(
    'UPDATE students SET academicDebt = ?, updatedAt = ? WHERE id = ?',
    student.academicDebt ? 0 : 1,
    now,
    id
  );

  return (await getStudentById(id))!;
}

export async function deleteAllStudents(): Promise<number> {
  const db = await getDb();
  const result = await db.run('DELETE FROM students');
  return result.changes ?? 0;
}

export async function getStats(): Promise<StudentStats> {
  const db = await getDb();

  const totalResult = await db.get('SELECT COUNT(*) as count FROM students');
  const debtResult = await db.get('SELECT COUNT(*) as count FROM students WHERE academicDebt = 1');
  const avgResult = await db.get('SELECT AVG(attendance) as avgAtt, AVG(performance) as avgPerf FROM students');

  const courseRows = await db.all('SELECT course, COUNT(*) as count FROM students GROUP BY course');
  const specialtyRows = await db.all('SELECT specialty, COUNT(*) as count FROM students GROUP BY specialty');

  const byCourse: Record<number, number> = {};
  courseRows.forEach((r: any) => { byCourse[r.course] = r.count; });

  const bySpecialty: Record<string, number> = {};
  specialtyRows.forEach((r: any) => { bySpecialty[r.specialty] = r.count; });

  return {
    total: totalResult.count,
    withDebt: debtResult.count,
    avgAttendance: Math.round(avgResult.avgAtt ?? 0),
    avgPerformance: Number((avgResult.avgPerf ?? 0).toFixed(2)),
    byCourse,
    bySpecialty,
  };
}

export async function getStudentsBySpecialty(): Promise<{ specialty: string; count: number; avgPerformance: number; avgAttendance: number }[]> {
  const db = await getDb();
  return db.all(`
    SELECT specialty, COUNT(*) as count, ROUND(AVG(performance), 2) as avgPerformance, ROUND(AVG(attendance)) as avgAttendance
    FROM students GROUP BY specialty ORDER BY count DESC
  `);
}

export async function getStudentsByCourse(): Promise<{ course: number; count: number; withDebt: number }[]> {
  const db = await getDb();
  return db.all(`
    SELECT course, COUNT(*) as count, SUM(academicDebt) as withDebt
    FROM students GROUP BY course ORDER BY course
  `);
}

export async function getRecentStudents(limit: number = 5): Promise<Student[]> {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM students ORDER BY createdAt DESC LIMIT ?', limit);
  return rows.map(rowToStudent);
}
