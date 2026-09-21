import { env } from './env.js';

export interface Student {
  id: string;
  fullName: string;
  course: number;
  group: string;
  specialty: string;
  attendance: number;
  performance: number;
  academicDebt: boolean;
  createdAt: string;
  updatedAt: string;
}

type SortOrder = 'asc' | 'desc';

interface DbModule {
  getAllStudents(search?: string, page?: number, limit?: number, sortBy?: string, sortOrder?: SortOrder, filterDebt?: boolean, filterCourse?: number): Promise<{ students: Student[]; total: number }>;
  getStudentById(id: string): Promise<Student | undefined>;
  createStudent(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student>;
  updateStudent(id: string, data: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Student | null>;
  deleteStudent(id: string): Promise<boolean>;
  toggleDebt(id: string): Promise<Student | null>;
  deleteAllStudents(): Promise<number>;
  getStats(): Promise<{ total: number; withDebt: number; avgAttendance: number; avgPerformance: number; byCourse: Record<number, number>; bySpecialty: Record<string, number> }>;
  getStudentsBySpecialty(): Promise<{ specialty: string; count: number; avgPerformance: number; avgAttendance: number }[]>;
  getStudentsByCourse(): Promise<{ course: number; count: number; withDebt: number }[]>;
  getRecentStudents(limit?: number): Promise<Student[]>;
  logAudit(action: string, entity: string, entityId?: string, userId?: string, details?: any): Promise<void>;
  getAuditLogs(page?: number, limit?: number, entity?: string, action?: string): Promise<{ data: any[]; total: number }>;
  rawDb: any;
}

let _db: DbModule | null = null;

export async function getDbModule(): Promise<DbModule> {
  if (_db) return _db;

  if (env.DATABASE_URL.startsWith('sqlite')) {
    const mod = await import('./db.sqlite.js');
    _db = mod;
  } else {
    const mod = await import('./db.postgres.js');
    _db = mod;
  }

  return _db;
}

export async function getAllStudents(...args: Parameters<DbModule['getAllStudents']>) {
  return (await getDbModule()).getAllStudents(...args);
}
export async function getStudentById(...args: Parameters<DbModule['getStudentById']>) {
  return (await getDbModule()).getStudentById(...args);
}
export async function createStudent(...args: Parameters<DbModule['createStudent']>) {
  return (await getDbModule()).createStudent(...args);
}
export async function updateStudent(...args: Parameters<DbModule['updateStudent']>) {
  return (await getDbModule()).updateStudent(...args);
}
export async function deleteStudent(...args: Parameters<DbModule['deleteStudent']>) {
  return (await getDbModule()).deleteStudent(...args);
}
export async function toggleDebt(...args: Parameters<DbModule['toggleDebt']>) {
  return (await getDbModule()).toggleDebt(...args);
}
export async function deleteAllStudents(...args: Parameters<DbModule['deleteAllStudents']>) {
  return (await getDbModule()).deleteAllStudents(...args);
}
export async function getStats(...args: Parameters<DbModule['getStats']>) {
  return (await getDbModule()).getStats(...args);
}
export async function getStudentsBySpecialty(...args: Parameters<DbModule['getStudentsBySpecialty']>) {
  return (await getDbModule()).getStudentsBySpecialty(...args);
}
export async function getStudentsByCourse(...args: Parameters<DbModule['getStudentsByCourse']>) {
  return (await getDbModule()).getStudentsByCourse(...args);
}
export async function getRecentStudents(...args: Parameters<DbModule['getRecentStudents']>) {
  return (await getDbModule()).getRecentStudents(...args);
}

export let db: any = null;
export async function initDb() {
  const mod = await getDbModule();
  db = mod.rawDb;
  return mod;
}
