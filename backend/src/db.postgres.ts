import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql, like, or, and, count, avg, desc, asc, inArray, getTableColumns } from 'drizzle-orm';
import { students, auditLog, users } from './schema.js';
import { env } from './env.js';
import type { Student, UserRecord } from './db.js';

const client = postgres(env.DATABASE_URL);
const db = drizzle(client);

type SortOrder = 'asc' | 'desc';

export { db as rawDb };

export async function ensureSchema(): Promise<void> {
  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      avatar TEXT,
      phone TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS students (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      course INTEGER NOT NULL CHECK(course >= 1 AND course <= 6),
      "group" TEXT NOT NULL,
      specialty TEXT NOT NULL,
      attendance INTEGER NOT NULL DEFAULT 100 CHECK(attendance >= 0 AND attendance <= 100),
      performance REAL NOT NULL DEFAULT 4.0 CHECK(performance >= 0 AND performance <= 5),
      academic_debt BOOLEAN NOT NULL DEFAULT false,
      email TEXT,
      phone TEXT,
      user_id UUID REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'approved',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      user_id TEXT,
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
    CREATE INDEX IF NOT EXISTS idx_students_course ON students(course);
    CREATE INDEX IF NOT EXISTS idx_students_group ON students("group");
    CREATE INDEX IF NOT EXISTS idx_students_filters ON students(academic_debt);
    CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
    CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
    CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
  `);
}

export async function getAllStudents(
  search?: string, page: number = 1, limit: number = 50,
  sortBy: string = 'fullName', sortOrder: SortOrder = 'asc',
  filterDebt?: boolean, filterCourse?: number, filterStatus?: string
): Promise<{ students: Student[]; total: number }> {
  const allowedSorts = ['fullName', 'course', 'group', 'specialty', 'attendance', 'performance', 'createdAt'];
  const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'fullName';
  const orderFn = sortOrder === 'desc' ? desc : asc;

  const conditions: ReturnType<typeof eq>[] = [];
  if (search) {
    const term = `%${search}%`;
    conditions.push(or(like(students.fullName, term), like(students.group, term), like(students.specialty, term), like(students.email, term), like(students.phone, term))!);
  }
  if (filterDebt !== undefined) conditions.push(eq(students.academicDebt, filterDebt));
  if (filterCourse !== undefined) conditions.push(eq(students.course, filterCourse));
  if (filterStatus !== undefined) conditions.push(eq(students.status, filterStatus));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const offset = (page - 1) * limit;

  const rows = await db.select({ ...getTableColumns(students), total: sql<number>`count(*) over ()` }).from(students).where(whereClause)
    .orderBy(
      safeSortBy === 'fullName' ? orderFn(students.fullName) :
      safeSortBy === 'course' ? orderFn(students.course) :
      safeSortBy === 'group' ? orderFn(students.group) :
      safeSortBy === 'specialty' ? orderFn(students.specialty) :
      safeSortBy === 'attendance' ? orderFn(students.attendance) :
      safeSortBy === 'performance' ? orderFn(students.performance) :
      orderFn(students.createdAt)
    )
    .limit(limit).offset(offset);

  const pageTotal = rows.length > 0 ? Number(rows[0]?.total ?? 0) : 0;
  const mapped = rows.map(({ total: _t, ...rest }) => rest);
  return { students: mapped as unknown as Student[], total: pageTotal };
}

export async function getStudentById(id: string): Promise<Student | undefined> {
  const rows = await db.select().from(students).where(eq(students.id, id));
  return rows[0] as unknown as Student | undefined;
}

export async function getStudentByUserId(userId: string): Promise<Student | undefined> {
  const rows = await db.select().from(students).where(eq(students.userId, userId));
  return rows[0] as unknown as Student | undefined;
}

export async function createStudent(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const inserted = await db.insert(students).values({
    id, fullName: data.fullName, course: data.course, group: data.group,
    specialty: data.specialty, attendance: data.attendance, performance: data.performance,
    academicDebt: data.academicDebt, email: data.email ?? null, phone: data.phone ?? null,
    userId: data.userId ?? null, status: data.status ?? 'approved',
    createdAt: new Date(now), updatedAt: new Date(now),
  }).returning();
  return inserted[0] as unknown as Student;
}

export async function updateStudent(id: string, data: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Student | null> {
  const existing = await getStudentById(id);
  if (!existing) return null;
  const updated = {
    fullName: data.fullName ?? existing.fullName, course: data.course ?? existing.course,
    group: data.group ?? existing.group, specialty: data.specialty ?? existing.specialty,
    attendance: data.attendance ?? existing.attendance, performance: data.performance ?? existing.performance,
    academicDebt: data.academicDebt ?? existing.academicDebt,
    email: data.email !== undefined ? data.email : existing.email,
    phone: data.phone !== undefined ? data.phone : existing.phone,
    userId: data.userId !== undefined ? data.userId : existing.userId,
    status: data.status ?? existing.status,
    updatedAt: new Date(),
  };
  const rows = await db.update(students).set(updated).where(eq(students.id, id)).returning();
  return (rows[0] as unknown as Student) ?? null;
}

export async function deleteStudent(id: string): Promise<boolean> {
  const rows = await db.delete(students).where(eq(students.id, id)).returning();
  return rows.length > 0;
}

export async function toggleDebt(id: string): Promise<Student | null> {
  const existing = await getStudentById(id);
  if (!existing) return null;
  const rows = await db.update(students).set({ academicDebt: !existing.academicDebt, updatedAt: new Date() })
    .where(eq(students.id, id)).returning();
  return (rows[0] as unknown as Student) ?? null;
}

export async function deleteAllStudents(): Promise<number> {
  const rows = await db.delete(students).returning();
  return rows.length;
}

export async function getStudentsByIds(ids: string[]): Promise<Student[]> {
  if (ids.length === 0) return [];
  const rows = await db.select().from(students).where(inArray(students.id, ids));
  return rows as unknown as Student[];
}

export async function deleteStudentsByIds(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const rows = await db.delete(students).where(inArray(students.id, ids)).returning();
  return rows.length;
}

export async function updateStudentsByIds(
  ids: string[],
  data: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<number> {
  if (ids.length === 0) return 0;
  const setData: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'updatedAt' || value === undefined) continue;
    setData[key] = key === 'academicDebt' ? value : (value ?? null);
  }
  if (Object.keys(setData).length === 0) return 0;
  setData.updatedAt = new Date();
  const rows = await db.update(students).set(setData).where(inArray(students.id, ids)).returning();
  return rows.length;
}

export async function getStats() {
  const approved = eq(students.status, 'approved');
  const totalResult = await db.select({ count: count() }).from(students).where(approved);
  const total = Number(totalResult[0]?.count ?? 0);
  const debtResult = await db.select({ count: count() }).from(students).where(and(approved, eq(students.academicDebt, true)));
  const withDebt = Number(debtResult[0]?.count ?? 0);
  const avgResult = await db.select({ avgAttendance: avg(students.attendance), avgPerformance: avg(students.performance) }).from(students).where(approved);
  const courseRows = await db.select({ course: students.course, count: count() }).from(students).where(approved).groupBy(students.course);
  const byCourse: Record<number, number> = {};
  for (const row of courseRows) byCourse[row.course] = Number(row.count);
  const byCourseStats = await db.select({
    course: students.course, count: count(),
    avgPerformance: sql<number>`ROUND(AVG(${students.performance}), 2)`,
    avgAttendance: sql<number>`ROUND(AVG(${students.attendance}))`,
  }).from(students).where(approved).groupBy(students.course);
  const specialtyRows = await db.select({ specialty: students.specialty, count: count() }).from(students).where(approved).groupBy(students.specialty);
  const bySpecialty: Record<string, number> = {};
  for (const row of specialtyRows) bySpecialty[row.specialty] = Number(row.count);
  return {
    total, withDebt,
    avgAttendance: Math.round(Number(avgResult[0]?.avgAttendance ?? 0)),
    avgPerformance: Number(Number(avgResult[0]?.avgPerformance ?? 0).toFixed(2)),
    byCourse, byCourseStats, bySpecialty,
  };
}

export async function getStudentsBySpecialty() {
  return db.select({
    specialty: students.specialty, count: count(),
    avgPerformance: sql<number>`ROUND(AVG(${students.performance}), 2)`,
    avgAttendance: sql<number>`ROUND(AVG(${students.attendance}))`,
  }).from(students).where(eq(students.status, 'approved')).groupBy(students.specialty).orderBy(desc(count()));
}

export async function getStudentsByCourse() {
  return db.select({
    course: students.course, count: count(),
    withDebt: sql<number>`SUM(CASE WHEN ${students.academicDebt} THEN 1 ELSE 0 END)`,
  }).from(students).where(eq(students.status, 'approved')).groupBy(students.course).orderBy(students.course);
}

export async function getRecentStudents(limit: number = 5): Promise<Student[]> {
  const rows = await db.select().from(students).where(eq(students.status, 'approved')).orderBy(desc(students.createdAt)).limit(limit);
  return rows as unknown as Student[];
}

export async function logAudit(action: string, entity: string, entityId?: string, userId?: string, details?: any) {
  await db.insert(auditLog).values({
    action, entity, entityId: entityId ?? null, userId: userId ?? null,
    details: details ? JSON.stringify(details) : null, createdAt: new Date(),
  });
}

export async function getAuditLogs(page: number = 1, limit: number = 50, entity?: string, action?: string) {
  const conditions: ReturnType<typeof eq>[] = [];
  if (entity) conditions.push(eq(auditLog.entity, entity));
  if (action) conditions.push(eq(auditLog.action, action));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const countResult = await db.select({ count: count() }).from(auditLog).where(whereClause);
  const total = Number(countResult[0]?.count ?? 0);
  const offset = (page - 1) * limit;
  const data = await db.select().from(auditLog).where(whereClause).orderBy(desc(auditLog.createdAt)).limit(limit).offset(offset);
  return { data, total };
}

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  const rows = await db.select().from(users).where(eq(users.email, email));
  return rows[0] as unknown as UserRecord | undefined;
}

export async function getUserById(id: string): Promise<UserRecord | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, id));
  return rows[0] as unknown as UserRecord | undefined;
}

export async function createUser(data: { email: string; passwordHash: string; fullName: string; role?: string; avatar?: string | null; phone?: string | null }): Promise<UserRecord> {
  const id = crypto.randomUUID();
  const now = new Date();
  const inserted = await db.insert(users).values({
    id, email: data.email, passwordHash: data.passwordHash, fullName: data.fullName,
    role: data.role ?? 'user', avatar: data.avatar ?? null, phone: data.phone ?? null,
    createdAt: now, updatedAt: now,
  }).returning();
  return inserted[0] as unknown as UserRecord;
}

export async function updateUser(id: string, data: { fullName?: string; avatar?: string | null; phone?: string | null }): Promise<UserRecord | null> {
  const rows = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
  return (rows[0] as unknown as UserRecord) ?? null;
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<boolean> {
  const rows = await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id)).returning();
  return rows.length > 0;
}

export async function getAllUsers(): Promise<UserRecord[]> {
  const rows = await db.select().from(users).orderBy(desc(users.createdAt));
  return rows as unknown as UserRecord[];
}
