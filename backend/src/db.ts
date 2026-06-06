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
        academicDebt INTEGER NOT NULL DEFAULT 0
      )
    `);
  }
  return db;
}

export async function getAllStudents(): Promise<Student[]> {
  const db = await getDb();
  const rows = await db.all('SELECT id, fullName, course, `group`, specialty, attendance, performance, academicDebt FROM students ORDER BY fullName COLLATE NOCASE');
  return rows.map((row: any) => ({
    ...row,
    academicDebt: row.academicDebt === 1
  }));
}

export async function getStudentById(id: string): Promise<Student | undefined> {
  const db = await getDb();
  const row = await db.get('SELECT id, fullName, course, `group`, specialty, attendance, performance, academicDebt FROM students WHERE id = ?', id);
  if (!row) return undefined;
  return { ...row, academicDebt: row.academicDebt === 1 };
}

export async function createStudent(student: Student): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO students (id, fullName, course, \`group\`, specialty, attendance, performance, academicDebt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    student.id,
    student.fullName,
    student.course,
    student.group,
    student.specialty,
    student.attendance,
    student.performance,
    student.academicDebt ? 1 : 0
  );
}

export async function updateStudent(id: string, student: Student): Promise<boolean> {
  const db = await getDb();
  const result = await db.run(
    `UPDATE students SET 
      fullName = ?, course = ?, \`group\` = ?, specialty = ?, 
      attendance = ?, performance = ?, academicDebt = ?
     WHERE id = ?`,
    student.fullName,
    student.course,
    student.group,
    student.specialty,
    student.attendance,
    student.performance,
    student.academicDebt ? 1 : 0,
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