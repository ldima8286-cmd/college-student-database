import { env } from './env.js';

export type StudentStatus = 'pending' | 'approved';

export interface Student {
  id: string;
  fullName: string;
  course: number;
  group: string;
  specialty: string;
  attendance: number;
  performance: number;
  academicDebt: boolean;
  email: string | null;
  phone: string | null;
  userId: string | null;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: string;
  avatar: string | null;
  phone: string | null;
  group: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  createdAt: string;
}

export interface ScheduleEntry {
  id: string;
  group: string;
  dayOfWeek: number;
  lessonNumber: number;
  subject: string;
  teacher: string | null;
  room: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarkRecord {
  id: string;
  studentId: string;
  subjectId: string;
  subjectName?: string;
  mark: number;
  createdAt: string;
}

type SortOrder = 'asc' | 'desc';

interface DbModule {
  ensureSchema?(): Promise<void>;
  getAllStudents(search?: string, page?: number, limit?: number, sortBy?: string, sortOrder?: SortOrder, filterDebt?: boolean, filterCourse?: number, filterStatus?: StudentStatus, filterGroup?: string): Promise<{ students: Student[]; total: number }>;
  getStudentById(id: string): Promise<Student | undefined>;
  getStudentByUserId(userId: string): Promise<Student | undefined>;
  createStudent(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student>;
  updateStudent(id: string, data: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Student | null>;
  deleteStudent(id: string): Promise<boolean>;
  toggleDebt(id: string): Promise<Student | null>;
  deleteAllStudents(): Promise<number>;
  getStudentsByIds?(ids: string[]): Promise<Student[]>;
  deleteStudentsByIds?(ids: string[]): Promise<number>;
  updateStudentsByIds?(ids: string[], data: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number>;
  getStats(): Promise<{ total: number; withDebt: number; avgAttendance: number; avgPerformance: number; byCourse: Record<number, number>; byCourseStats: { course: number; count: number; avgPerformance: number; avgAttendance: number }[]; bySpecialty: Record<string, number> }>;
  getStudentsBySpecialty(): Promise<{ specialty: string; count: number; avgPerformance: number; avgAttendance: number }[]>;
  getStudentsByCourse(): Promise<{ course: number; count: number; withDebt: number }[]>;
  getRecentStudents(limit?: number): Promise<Student[]>;
  logAudit(action: string, entity: string, entityId?: string, userId?: string, details?: any): Promise<void>;
  getAuditLogs(page?: number, limit?: number, entity?: string, action?: string): Promise<{ data: any[]; total: number }>;
  findUserByEmail(email: string): Promise<UserRecord | undefined>;
  getUserById(id: string): Promise<UserRecord | undefined>;
  createUser(data: { email: string; passwordHash: string; fullName: string; role?: string; avatar?: string | null; phone?: string | null; group?: string | null }): Promise<UserRecord>;
  updateUser(id: string, data: { fullName?: string; avatar?: string | null; phone?: string | null }): Promise<UserRecord | null>;
  updateUserPassword(id: string, passwordHash: string): Promise<boolean>;
  getAllUsers(): Promise<UserRecord[]>;
  updateUserRoleAndGroup(id: string, data: { role?: string; group?: string | null }): Promise<UserRecord | null>;
  getGroups(): Promise<string[]>;
  listSubjects(): Promise<Subject[]>;
  createSubject(name: string): Promise<Subject>;
  deleteSubject(id: string): Promise<boolean>;
  getSchedule(group?: string): Promise<ScheduleEntry[]>;
  createScheduleEntry(data: Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleEntry>;
  updateScheduleEntry(id: string, data: Partial<Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ScheduleEntry | null>;
  deleteScheduleEntry(id: string): Promise<boolean>;
  deleteScheduleByGroup(group: string): Promise<number>;
  getMarksByStudent(studentId: string): Promise<MarkRecord[]>;
  getMarkById(id: string): Promise<MarkRecord | undefined>;
  addMark(studentId: string, subjectId: string, mark: number): Promise<MarkRecord>;
  updateMark(id: string, mark: number): Promise<MarkRecord | null>;
  deleteMark(id: string): Promise<boolean>;
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

return _db as unknown as DbModule;
}

export async function getAllStudents(...args: Parameters<DbModule['getAllStudents']>) {
  return (await getDbModule()).getAllStudents(...args);
}
export async function getStudentById(...args: Parameters<DbModule['getStudentById']>) {
  return (await getDbModule()).getStudentById(...args);
}
export async function getStudentByUserId(...args: Parameters<DbModule['getStudentByUserId']>) {
  return (await getDbModule()).getStudentByUserId(...args);
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
export async function getStudentsByIds(...args: Parameters<NonNullable<DbModule['getStudentsByIds']>>) {
  return (await getDbModule()).getStudentsByIds!(...args);
}
export async function deleteStudentsByIds(...args: Parameters<NonNullable<DbModule['deleteStudentsByIds']>>) {
  return (await getDbModule()).deleteStudentsByIds!(...args);
}
export async function updateStudentsByIds(...args: Parameters<NonNullable<DbModule['updateStudentsByIds']>>) {
  return (await getDbModule()).updateStudentsByIds!(...args);
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
export async function findUserByEmail(...args: Parameters<DbModule['findUserByEmail']>) {
  return (await getDbModule()).findUserByEmail(...args);
}
export async function getUserById(...args: Parameters<DbModule['getUserById']>) {
  return (await getDbModule()).getUserById(...args);
}
export async function createUser(...args: Parameters<DbModule['createUser']>) {
  return (await getDbModule()).createUser(...args);
}
export async function updateUser(...args: Parameters<DbModule['updateUser']>) {
  return (await getDbModule()).updateUser(...args);
}
export async function updateUserPassword(...args: Parameters<DbModule['updateUserPassword']>) {
  return (await getDbModule()).updateUserPassword(...args);
}
export async function getAllUsers(...args: Parameters<DbModule['getAllUsers']>) {
  return (await getDbModule()).getAllUsers(...args);
}

export async function updateUserRoleAndGroup(...args: Parameters<DbModule['updateUserRoleAndGroup']>) {
  return (await getDbModule()).updateUserRoleAndGroup(...args);
}
export async function getGroups(...args: Parameters<DbModule['getGroups']>) {
  return (await getDbModule()).getGroups(...args);
}
export async function listSubjects(...args: Parameters<DbModule['listSubjects']>) {
  return (await getDbModule()).listSubjects(...args);
}
export async function createSubject(...args: Parameters<DbModule['createSubject']>) {
  return (await getDbModule()).createSubject(...args);
}
export async function deleteSubject(...args: Parameters<DbModule['deleteSubject']>) {
  return (await getDbModule()).deleteSubject(...args);
}
export async function getSchedule(...args: Parameters<DbModule['getSchedule']>) {
  return (await getDbModule()).getSchedule(...args);
}
export async function createScheduleEntry(...args: Parameters<DbModule['createScheduleEntry']>) {
  return (await getDbModule()).createScheduleEntry(...args);
}
export async function updateScheduleEntry(...args: Parameters<DbModule['updateScheduleEntry']>) {
  return (await getDbModule()).updateScheduleEntry(...args);
}
export async function deleteScheduleEntry(...args: Parameters<DbModule['deleteScheduleEntry']>) {
  return (await getDbModule()).deleteScheduleEntry(...args);
}
export async function deleteScheduleByGroup(...args: Parameters<DbModule['deleteScheduleByGroup']>) {
  return (await getDbModule()).deleteScheduleByGroup(...args);
}
export async function getMarksByStudent(...args: Parameters<DbModule['getMarksByStudent']>) {
  return (await getDbModule()).getMarksByStudent(...args);
}
export async function getMarkById(...args: Parameters<DbModule['getMarkById']>) {
  return (await getDbModule()).getMarkById(...args);
}
export async function addMark(...args: Parameters<DbModule['addMark']>) {
  return (await getDbModule()).addMark(...args);
}
export async function updateMark(...args: Parameters<DbModule['updateMark']>) {
  return (await getDbModule()).updateMark(...args);
}
export async function deleteMark(...args: Parameters<DbModule['deleteMark']>) {
  return (await getDbModule()).deleteMark(...args);
}

export let db: any = null;
export async function initDb() {
  const mod = await getDbModule();
  db = mod.rawDb;
  await mod.ensureSchema?.();
  return mod;
}
