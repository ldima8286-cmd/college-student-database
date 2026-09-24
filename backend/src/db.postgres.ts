import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql, like, or, and, count, avg, desc, asc, inArray, getTableColumns } from 'drizzle-orm';
import { students, auditLog, users, subjects, schedule, marks } from './schema.js';
import { env } from './env.js';
import type { Student, UserRecord, Subject, ScheduleEntry, MarkRecord, JournalLesson, JournalSummaryLesson, AttendanceStatus, JournalStudentRow } from './db.js';

const client = postgres(env.DATABASE_URL);
const db = drizzle(client);

type SortOrder = 'asc' | 'desc';

export { db as rawDb };

export async function ensureSchema(): Promise<void> {
  await client.unsafe(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS "group" TEXT;
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      avatar TEXT,
      phone TEXT,
      "group" TEXT,
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
      performance REAL NOT NULL DEFAULT 4.0 CHECK(performance >= 0 AND performance <= 10),
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
    CREATE TABLE IF NOT EXISTS subjects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS schedule (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "group" TEXT NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week >= 1 AND day_of_week <= 7),
      lesson_number INTEGER NOT NULL CHECK(lesson_number >= 1 AND lesson_number <= 10),
      subject TEXT NOT NULL,
      teacher TEXT,
      room TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS marks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      mark INTEGER NOT NULL CHECK(mark >= 1 AND mark <= 10),
      schedule_id uuid REFERENCES schedule(id) ON DELETE SET NULL,
      date TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_schedule_group_day ON schedule("group", day_of_week, lesson_number);
    CREATE INDEX IF NOT EXISTS idx_marks_student ON marks(student_id);
    CREATE INDEX IF NOT EXISTS idx_marks_subject ON marks(subject_id);
    ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_mark_check;
    ALTER TABLE marks ADD CONSTRAINT marks_mark_check CHECK (mark >= 1 AND mark <= 10);
    ALTER TABLE marks ADD COLUMN IF NOT EXISTS schedule_id uuid REFERENCES schedule(id) ON DELETE SET NULL;
    ALTER TABLE marks ADD COLUMN IF NOT EXISTS date TEXT;
    CREATE INDEX IF NOT EXISTS idx_marks_schedule_date ON marks(schedule_id, date);
    CREATE TABLE IF NOT EXISTS attendance (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      schedule_id uuid NOT NULL REFERENCES schedule(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(schedule_id, date, student_id)
    );
    CREATE INDEX IF NOT EXISTS idx_attendance_schedule_date ON attendance(schedule_id, date);
    CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
    ALTER TABLE students DROP CONSTRAINT IF EXISTS students_performance_check;
    ALTER TABLE students ADD CONSTRAINT students_performance_check CHECK (performance >= 0 AND performance <= 10);
    CREATE TABLE IF NOT EXISTS refresh_sessions (
      jti TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user ON refresh_sessions(user_id);
  `);
}

export async function getAllStudents(
  search?: string, page: number = 1, limit: number = 50,
  sortBy: string = 'fullName', sortOrder: SortOrder = 'asc',
  filterDebt?: boolean, filterCourse?: number, filterStatus?: string, filterGroup?: string
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
  if (filterGroup !== undefined) conditions.push(eq(students.group, filterGroup));
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

export async function pruneAuditLogs(): Promise<number> {
  let deleted = 0;
  deleted += (await client.unsafe<{ id: number }[]>(
    `DELETE FROM audit_log WHERE action IN ('login', 'logout') AND entity = 'auth' AND user_id = 'user' RETURNING id`
  )).length;
  const cutoff = new Date(Date.now() - env.AUDIT_RETENTION_DAYS * 86400000);
  deleted += (await client.unsafe<{ id: number }[]>(
    `DELETE FROM audit_log WHERE created_at < $1 RETURNING id`, [cutoff]
  )).length;
  const rows = await client.unsafe<{ count: string }[]>(`SELECT COUNT(*) AS count FROM audit_log`);
  const total = Number(rows[0]?.count ?? 0);
  if (total > env.AUDIT_MAX_ROWS) {
    deleted += (await client.unsafe<{ id: number }[]>(
      `DELETE FROM audit_log WHERE id IN (SELECT id FROM audit_log ORDER BY created_at DESC OFFSET $1) RETURNING id`,
      [env.AUDIT_MAX_ROWS]
    )).length;
  }
  return deleted;
}

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  const rows = await db.select().from(users).where(eq(users.email, email));
  return rows[0] as unknown as UserRecord | undefined;
}

export async function getUserById(id: string): Promise<UserRecord | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, id));
  return rows[0] as unknown as UserRecord | undefined;
}

export async function createUser(data: { email: string; passwordHash: string; fullName: string; role?: string; avatar?: string | null; phone?: string | null; group?: string | null }): Promise<UserRecord> {
  const id = crypto.randomUUID();
  const now = new Date();
  const inserted = await db.insert(users).values({
    id, email: data.email, passwordHash: data.passwordHash, fullName: data.fullName,
    role: data.role ?? 'user', avatar: data.avatar ?? null, phone: data.phone ?? null,
    group: data.group ?? null,
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

export async function updateUserRoleAndGroup(id: string, data: { role?: string; group?: string | null }): Promise<UserRecord | null> {
  const setData: Record<string, any> = { updatedAt: new Date() };
  if (data.role !== undefined) setData.role = data.role;
  if (data.group !== undefined) setData.group = data.group === '' ? null : data.group;
  const rows = await db.update(users).set(setData).where(eq(users.id, id)).returning();
  return (rows[0] as unknown as UserRecord) ?? null;
}

export async function getGroups(): Promise<string[]> {
  const rows = await db.select({ group: students.group })
    .from(students)
    .where(and(eq(students.status, 'approved'), sql`${students.group} <> ''`))
    .groupBy(students.group)
    .orderBy(asc(students.group));
  return rows.map((r) => r.group);
}

export async function listSubjects(): Promise<Subject[]> {
  const rows = await db.select().from(subjects).orderBy(asc(subjects.name));
  return rows.map((r) => ({ id: r.id, name: r.name, createdAt: (r as any).createdAt?.toISOString?.() ?? new Date().toISOString() })) as Subject[];
}

export async function createSubject(name: string): Promise<Subject> {
  const inserted = await db.insert(subjects).values({ name }).returning();
  const r = inserted[0];
  return { id: r.id, name: r.name, createdAt: (r as any).createdAt?.toISOString?.() ?? new Date().toISOString() };
}

export async function deleteSubject(id: string): Promise<boolean> {
  const rows = await db.delete(subjects).where(eq(subjects.id, id)).returning();
  return rows.length > 0;
}

export async function getSchedule(group?: string): Promise<ScheduleEntry[]> {
  const rows = group
    ? await db.select().from(schedule).where(eq(schedule.group, group)).orderBy(asc(schedule.dayOfWeek), asc(schedule.lessonNumber))
    : await db.select().from(schedule).orderBy(asc(schedule.dayOfWeek), asc(schedule.lessonNumber));
  return rows.map((r) => ({
    id: r.id, group: r.group, dayOfWeek: r.dayOfWeek, lessonNumber: r.lessonNumber,
    subject: r.subject, teacher: r.teacher, room: r.room,
    createdAt: (r as any).createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: (r as any).updatedAt?.toISOString?.() ?? new Date().toISOString(),
  })) as ScheduleEntry[];
}

export async function createScheduleEntry(data: Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleEntry> {
  const now = new Date();
  const inserted = await db.insert(schedule).values({
    group: data.group, dayOfWeek: data.dayOfWeek, lessonNumber: data.lessonNumber,
    subject: data.subject, teacher: data.teacher ?? null, room: data.room ?? null,
    createdAt: now, updatedAt: now,
  }).returning();
  const r = inserted[0];
  return {
    id: r.id, group: r.group, dayOfWeek: r.dayOfWeek, lessonNumber: r.lessonNumber,
    subject: r.subject, teacher: r.teacher, room: r.room,
    createdAt: (r as any).createdAt?.toISOString?.() ?? now.toISOString(),
    updatedAt: (r as any).updatedAt?.toISOString?.() ?? now.toISOString(),
  };
}

export async function updateScheduleEntry(id: string, data: Partial<Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ScheduleEntry | null> {
  const setData: Record<string, any> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    setData[key] = value;
  }
  if (Object.keys(setData).length === 1) return null;
  const rows = await db.update(schedule).set(setData).where(eq(schedule.id, id)).returning();
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id, group: r.group, dayOfWeek: r.dayOfWeek, lessonNumber: r.lessonNumber,
    subject: r.subject, teacher: r.teacher, room: r.room,
    createdAt: (r as any).createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: (r as any).updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

export async function deleteScheduleEntry(id: string): Promise<boolean> {
  const rows = await db.delete(schedule).where(eq(schedule.id, id)).returning();
  return rows.length > 0;
}

export async function deleteScheduleByGroup(group: string): Promise<number> {
  const rows = await db.delete(schedule).where(eq(schedule.group, group)).returning();
  return rows.length;
}

export async function getMarksByStudent(studentId: string): Promise<MarkRecord[]> {
  const rows = await db.select({
    id: marks.id, studentId: marks.studentId, subjectId: marks.subjectId,
    subjectName: subjects.name, mark: marks.mark, createdAt: marks.createdAt,
    scheduleId: marks.scheduleId, date: marks.date,
  }).from(marks).innerJoin(subjects, eq(marks.subjectId, subjects.id))
    .where(eq(marks.studentId, studentId))
    .orderBy(asc(subjects.name), asc(marks.createdAt));
  return rows.map((r) => ({
    id: r.id, studentId: r.studentId, subjectId: r.subjectId, subjectName: r.subjectName,
    mark: r.mark, createdAt: (r as any).createdAt?.toISOString?.() ?? new Date().toISOString(),
    scheduleId: r.scheduleId ?? null, date: r.date ?? null,
  }));
}

export async function getMarkById(id: string): Promise<MarkRecord | undefined> {
  const rows = await db.select({
    id: marks.id, studentId: marks.studentId, subjectId: marks.subjectId,
    subjectName: subjects.name, mark: marks.mark, createdAt: marks.createdAt,
    scheduleId: marks.scheduleId, date: marks.date,
  }).from(marks).innerJoin(subjects, eq(marks.subjectId, subjects.id)).where(eq(marks.id, id));
  if (rows.length === 0) return undefined;
  const r = rows[0];
  return { id: r.id, studentId: r.studentId, subjectId: r.subjectId, subjectName: r.subjectName, mark: r.mark, createdAt: (r as any).createdAt?.toISOString?.() ?? new Date().toISOString(), scheduleId: r.scheduleId ?? null, date: r.date ?? null };
}

export async function addMark(studentId: string, subjectId: string, mark: number): Promise<MarkRecord> {
  const inserted = await db.insert(marks).values({ studentId, subjectId, mark }).returning();
  const r = inserted[0];
  const [subjectName] = await db.select({ name: subjects.name }).from(subjects).where(eq(subjects.id, subjectId));
  return { id: r.id, studentId: r.studentId, subjectId: r.subjectId, subjectName: subjectName?.name, mark: r.mark, createdAt: (r as any).createdAt?.toISOString?.() ?? new Date().toISOString() };
}

export async function updateMark(id: string, mark: number): Promise<MarkRecord | null> {
  const rows = await db.update(marks).set({ mark }).where(eq(marks.id, id)).returning();
  if (rows.length === 0) return null;
  return (await getMarkById(id)) ?? null;
}

export async function deleteMark(id: string): Promise<boolean> {
  const rows = await db.delete(marks).where(eq(marks.id, id)).returning();
  return rows.length > 0;
}

export async function recomputeStudentPerformance(studentId: string): Promise<void> {
  const rows = await client.unsafe<{ avg: string | null }[]>(`SELECT AVG(mark) as avg FROM marks WHERE student_id = $1`, [studentId]);
  const avg = rows[0]?.avg;
  if (avg === null || avg === undefined) return;
  const value = Math.max(0, Math.min(10, Math.round(Number(avg) * 100) / 100));
  await client.unsafe(`UPDATE students SET performance = $1, updated_at = now() WHERE id = $2`, [value, studentId]);
}

export async function recomputeStudentAttendance(studentId: string): Promise<void> {
  const rows = await client.unsafe<{ total: string; present: string }[]>(
    `SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END), 0) as present FROM attendance WHERE student_id = $1`,
    [studentId]
  );
  const total = Number(rows[0]?.total ?? 0);
  if (total === 0) return;
  const present = Number(rows[0]?.present ?? 0);
  const value = Math.round((present / total) * 100);
  await client.unsafe(`UPDATE students SET attendance = $1, updated_at = now() WHERE id = $2`, [value, studentId]);
}

export async function getJournalSummaries(group: string, date: string): Promise<JournalSummaryLesson[]> {
  const studentRows = await client.unsafe<{ id: string }[]>(`SELECT id FROM students WHERE "group" = $1 AND status = 'approved'`, [group]);
  if (studentRows.length === 0) return [];
  const ids = studentRows.map((s) => s.id);
  const lessons = await client.unsafe<{ id: string; lesson_number: number; subject: string; teacher: string | null; room: string | null }[]>(
    `SELECT id, lesson_number, subject, teacher, room FROM schedule WHERE "group" = $1 ORDER BY lesson_number`, [group]
  );
  const result: JournalSummaryLesson[] = [];
  for (const l of lessons) {
    const [markedRow] = await client.unsafe<{ c: string }[]>(
      `SELECT COUNT(*) as c FROM marks WHERE schedule_id = $1 AND date = $2 AND student_id = ANY($3)`, [l.id, date, ids]
    );
    const attRows = await client.unsafe<{ status: string; c: string }[]>(
      `SELECT status, COUNT(*) as c FROM attendance WHERE schedule_id = $1 AND date = $2 AND student_id = ANY($3) GROUP BY status`, [l.id, date, ids]
    );
    result.push({
      scheduleId: l.id, lessonNumber: l.lesson_number, subject: l.subject, teacher: l.teacher, room: l.room,
      totalStudents: studentRows.length,
      marked: Number(markedRow?.c ?? 0),
      present: Number(attRows.find((r) => r.status === 'present')?.c ?? 0),
      late: Number(attRows.find((r) => r.status === 'late')?.c ?? 0),
      absent: Number(attRows.find((r) => r.status === 'absent')?.c ?? 0),
    });
  }
  return result;
}

export async function getJournalLesson(scheduleId: string, date: string): Promise<JournalLesson | null> {
  const entries = await client.unsafe<{ id: string; group: string; day_of_week: number; lesson_number: number; subject: string; teacher: string | null; room: string | null }[]>(
    `SELECT id, "group", day_of_week, lesson_number, subject, teacher, room FROM schedule WHERE id = $1`, [scheduleId]
  );
  if (entries.length === 0) return null;
  const entry = entries[0];
  const students = await client.unsafe<{ id: string; full_name: string; course: number }[]>(
    `SELECT id, full_name, course FROM students WHERE "group" = $1 AND status = 'approved' ORDER BY full_name`, [entry.group]
  );
  const markRows = await client.unsafe<{ id: string; student_id: string; mark: number }[]>(
    `SELECT id, student_id, mark FROM marks WHERE schedule_id = $1 AND date = $2`, [scheduleId, date]
  );
  const attRows = await client.unsafe<{ student_id: string; status: string }[]>(
    `SELECT student_id, status FROM attendance WHERE schedule_id = $1 AND date = $2`, [scheduleId, date]
  );
  const markById = new Map(markRows.map((m) => [m.student_id, { id: m.id, mark: m.mark }]));
  const statusById = new Map(attRows.map((a) => [a.student_id, a.status]));
  return {
    scheduleId, group: entry.group, dayOfWeek: entry.day_of_week, lessonNumber: entry.lesson_number,
    subject: entry.subject, teacher: entry.teacher, room: entry.room, date,
    students: students.map((s) => {
      const mark = markById.get(s.id);
      return {
        studentId: s.id, fullName: s.full_name, course: s.course,
        mark: mark?.mark ?? null, markId: mark?.id ?? null,
        status: (statusById.get(s.id) as JournalStudentRow['status']) ?? null,
      };
    }),
  };
}

export async function saveJournalLesson(
  scheduleId: string, date: string,
  entries: { studentId: string; mark?: number | null; status?: AttendanceStatus | null }[]
): Promise<JournalLesson | null> {
  const scheduleRows = await client.unsafe<{ subject: string }[]>(`SELECT subject FROM schedule WHERE id = $1`, [scheduleId]);
  if (scheduleRows.length === 0) return null;
  const subjectName = scheduleRows[0].subject;
  let subjectRows = await client.unsafe<{ id: string }[]>(`SELECT id FROM subjects WHERE lower(name) = lower($1)`, [subjectName]);
  if (subjectRows.length === 0) {
    subjectRows = await client.unsafe<{ id: string }[]>(`INSERT INTO subjects (name) VALUES ($1) RETURNING id`, [subjectName]);
  }
  const subjectId = subjectRows[0].id;
  await client.begin(async (tx) => {
    for (const e of entries) {
      if (typeof e.mark === 'number') {
        const existing = await tx.unsafe<{ id: string }[]>(`SELECT id FROM marks WHERE schedule_id = $1 AND date = $2 AND student_id = $3`, [scheduleId, date, e.studentId]);
        if (existing.length > 0) {
          await tx.unsafe(`UPDATE marks SET mark = $1, subject_id = $2 WHERE id = $3`, [e.mark, subjectId, existing[0].id]);
        } else {
          await tx.unsafe(`INSERT INTO marks (student_id, subject_id, mark, schedule_id, date) VALUES ($1, $2, $3, $4, $5)`, [e.studentId, subjectId, e.mark, scheduleId, date]);
        }
      } else {
        await tx.unsafe(`DELETE FROM marks WHERE schedule_id = $1 AND date = $2 AND student_id = $3`, [scheduleId, date, e.studentId]);
      }
      if (e.status) {
        const existing = await tx.unsafe<{ id: string }[]>(`SELECT id FROM attendance WHERE schedule_id = $1 AND date = $2 AND student_id = $3`, [scheduleId, date, e.studentId]);
        if (existing.length > 0) {
          await tx.unsafe(`UPDATE attendance SET status = $1 WHERE id = $2`, [e.status, existing[0].id]);
        } else {
          await tx.unsafe(`INSERT INTO attendance (schedule_id, date, student_id, status) VALUES ($1, $2, $3, $4)`, [scheduleId, date, e.studentId, e.status]);
        }
      } else {
        await tx.unsafe(`DELETE FROM attendance WHERE schedule_id = $1 AND date = $2 AND student_id = $3`, [scheduleId, date, e.studentId]);
      }
    }
  });
  for (const e of entries) {
    await recomputeStudentPerformance(e.studentId);
    await recomputeStudentAttendance(e.studentId);
  }
  return getJournalLesson(scheduleId, date);
}

export async function saveRefreshSession(jti: string, userId: string, expiresAt: number): Promise<void> {
  await client.unsafe(
    `INSERT INTO refresh_sessions (jti, user_id, expires_at) VALUES ($1, $2, to_timestamp($3 / 1000.0))`,
    [jti, userId, expiresAt]
  );
}

export async function getRefreshSession(jti: string): Promise<{ jti: string; userId: string; expiresAt: number } | undefined> {
  const rows = await client.unsafe<{ jti: string; user_id: string; expires_at: string | Date }[]>(
    `SELECT jti, user_id, expires_at FROM refresh_sessions WHERE jti = $1`, [jti]
  );
  if (rows.length === 0) return undefined;
  const r = rows[0];
  return { jti: r.jti, userId: r.user_id, expiresAt: new Date(r.expires_at).getTime() };
}

export async function deleteRefreshSession(jti: string): Promise<boolean> {
  const rows = await client.unsafe<{ jti: string }[]>(`DELETE FROM refresh_sessions WHERE jti = $1 RETURNING jti`, [jti]);
  return rows.length > 0;
}

export async function deleteRefreshSessionsByUserId(userId: string): Promise<number> {
  const rows = await client.unsafe<{ user_id: string }[]>(`DELETE FROM refresh_sessions WHERE user_id = $1 RETURNING user_id`, [userId]);
  return rows.length;
}
