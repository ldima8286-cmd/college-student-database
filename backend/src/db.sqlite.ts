import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { env } from './env.js';
import type { Student, UserRecord, Subject, ScheduleEntry, MarkRecord, JournalLesson, JournalSummaryLesson, AttendanceStatus, JournalStudentRow } from './db.js';
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
    performance REAL NOT NULL DEFAULT 4.0 CHECK(performance >= 0 AND performance <= 10),
    academicDebt INTEGER NOT NULL DEFAULT 0,
    email TEXT,
    phone TEXT,
    userId TEXT,
    status TEXT NOT NULL DEFAULT 'approved',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

const studentCols = sqliteDb.prepare(`PRAGMA table_info(students)`).all() as any[];
if (!studentCols.some((c: any) => c.name === 'email')) {
  sqliteDb.exec(`ALTER TABLE students ADD COLUMN email TEXT`);
}
if (!studentCols.some((c: any) => c.name === 'phone')) {
  sqliteDb.exec(`ALTER TABLE students ADD COLUMN phone TEXT`);
}
if (!studentCols.some((c: any) => c.name === 'userId')) {
  sqliteDb.exec(`ALTER TABLE students ADD COLUMN userId TEXT`);
}
if (!studentCols.some((c: any) => c.name === 'status')) {
  sqliteDb.exec(`ALTER TABLE students ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'`);
}

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

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    fullName TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    avatar TEXT,
    phone TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS refreshSessions (
    jti TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    expiresAt INTEGER NOT NULL
  )
`);

const userCols = sqliteDb.prepare(`PRAGMA table_info(users)`).all() as any[];
if (!userCols.some((c: any) => c.name === 'group')) {
  sqliteDb.exec(`ALTER TABLE users ADD COLUMN "group" TEXT`);
}

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    createdAt TEXT NOT NULL
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS schedule (
    id TEXT PRIMARY KEY,
    "group" TEXT NOT NULL,
    dayOfWeek INTEGER NOT NULL CHECK(dayOfWeek >= 1 AND dayOfWeek <= 7),
    lessonNumber INTEGER NOT NULL CHECK(lessonNumber >= 1 AND lessonNumber <= 10),
    subject TEXT NOT NULL,
    teacher TEXT,
    room TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS marks (
    id TEXT PRIMARY KEY,
    studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subjectId TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    mark INTEGER NOT NULL CHECK(mark >= 1 AND mark <= 10),
    scheduleId TEXT REFERENCES schedule(id) ON DELETE SET NULL,
    date TEXT,
    createdAt TEXT NOT NULL
  )
`);

sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    scheduleId TEXT NOT NULL REFERENCES schedule(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK(status IN ('present', 'late', 'absent')),
    createdAt TEXT NOT NULL,
    UNIQUE(scheduleId, date, studentId)
  )
`);

export const rawDb: DatabaseType = sqliteDb;

export async function ensureSchema(): Promise<void> {
  const studentsSql = (sqliteDb.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='students'`).get() as any)?.sql ?? '';
  if (studentsSql.includes('performance <= 5') || studentsSql.includes('performance BETWEEN 0 AND 5')) {
    sqliteDb.pragma('foreign_keys = OFF');
    sqliteDb.exec(`
      CREATE TABLE students_new (
        id TEXT PRIMARY KEY,
        fullName TEXT NOT NULL,
        course INTEGER NOT NULL CHECK(course >= 1 AND course <= 6),
        "group" TEXT NOT NULL,
        specialty TEXT NOT NULL,
        attendance INTEGER NOT NULL DEFAULT 100 CHECK(attendance >= 0 AND attendance <= 100),
        performance REAL NOT NULL DEFAULT 4.0 CHECK(performance >= 0 AND performance <= 10),
        academicDebt INTEGER NOT NULL DEFAULT 0,
        email TEXT,
        phone TEXT,
        userId TEXT,
        status TEXT NOT NULL DEFAULT 'approved',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      INSERT INTO students_new (id, fullName, course, "group", specialty, attendance, performance, academicDebt, email, phone, userId, status, createdAt, updatedAt)
        SELECT id, fullName, course, "group", specialty, attendance, performance, academicDebt, email, phone, userId, status, createdAt, updatedAt FROM students;
      DROP TABLE students;
      ALTER TABLE students_new RENAME TO students;
    `);
    sqliteDb.pragma('foreign_keys = ON');
  }
  const marksSql = (sqliteDb.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='marks'`).get() as any)?.sql ?? '';
  if (marksSql.includes('mark <= 5') || marksSql.includes('mark BETWEEN 1 AND 5')) {
    sqliteDb.pragma('foreign_keys = OFF');
    sqliteDb.exec(`
      CREATE TABLE marks_new (
        id TEXT PRIMARY KEY,
        studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        subjectId TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        mark INTEGER NOT NULL CHECK(mark >= 1 AND mark <= 10),
        scheduleId TEXT REFERENCES schedule(id) ON DELETE SET NULL,
        date TEXT,
        createdAt TEXT NOT NULL
      );
      INSERT INTO marks_new (id, studentId, subjectId, mark, scheduleId, date, createdAt)
        SELECT id, studentId, subjectId, mark, NULL, NULL, createdAt FROM marks;
      DROP TABLE marks;
      ALTER TABLE marks_new RENAME TO marks;
    `);
    sqliteDb.pragma('foreign_keys = ON');
  }
  const markCols = sqliteDb.prepare(`PRAGMA table_info(marks)`).all() as any[];
  if (!markCols.some((c: any) => c.name === 'scheduleId')) {
    sqliteDb.exec(`ALTER TABLE marks ADD COLUMN scheduleId TEXT REFERENCES schedule(id) ON DELETE SET NULL`);
  }
  if (!markCols.some((c: any) => c.name === 'date')) {
    sqliteDb.exec(`ALTER TABLE marks ADD COLUMN date TEXT`);
  }
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      scheduleId TEXT NOT NULL REFERENCES schedule(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('present', 'late', 'absent')),
      createdAt TEXT NOT NULL,
      UNIQUE(scheduleId, date, studentId)
    );
    CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
    CREATE INDEX IF NOT EXISTS idx_students_course ON students(course);
    CREATE INDEX IF NOT EXISTS idx_students_group ON students("group");
    CREATE INDEX IF NOT EXISTS idx_students_filters ON students(academicDebt);
    CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
    CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(userId);
    CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(createdAt);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON auditLog(createdAt);
    CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user ON refreshSessions(userId);
    CREATE INDEX IF NOT EXISTS idx_schedule_group_day ON schedule("group", dayOfWeek, lessonNumber);
    CREATE INDEX IF NOT EXISTS idx_marks_student ON marks(studentId);
    CREATE INDEX IF NOT EXISTS idx_marks_subject ON marks(subjectId);
    CREATE INDEX IF NOT EXISTS idx_marks_schedule_date ON marks(scheduleId, date);
    CREATE INDEX IF NOT EXISTS idx_attendance_schedule_date ON attendance(scheduleId, date);
    CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(studentId);
  `);
}

type SortOrder = 'asc' | 'desc';

export async function getAllStudents(
  search?: string, page: number = 1, limit: number = 50,
  sortBy: string = 'fullName', sortOrder: SortOrder = 'asc',
  filterDebt?: boolean, filterCourse?: number, filterStatus?: string, filterGroup?: string
): Promise<{ students: Student[]; total: number }> {
  const allowedSorts = ['fullName', 'course', 'group', 'specialty', 'attendance', 'performance', 'createdAt'];
  const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'fullName';

  let query = `SELECT *, COUNT(*) OVER () AS total FROM students`;
  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    conditions.push(`(fullName LIKE ? OR "group" LIKE ? OR specialty LIKE ? OR email LIKE ? OR phone LIKE ?)`);
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }
  if (filterDebt !== undefined) {
    conditions.push(`academicDebt = ?`);
    params.push(filterDebt ? 1 : 0);
  }
  if (filterCourse !== undefined) {
    conditions.push(`course = ?`);
    params.push(filterCourse);
  }
  if (filterStatus !== undefined) {
    conditions.push(`status = ?`);
    params.push(filterStatus);
  }
  if (filterGroup !== undefined) {
    conditions.push(`"group" = ?`);
    params.push(filterGroup);
  }

  if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;

  const col = safeSortBy === 'group' ? '"group"' : safeSortBy;
  query += ` ORDER BY ${col} ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
  query += ` LIMIT ? OFFSET ?`;
  params.push(limit, (page - 1) * limit);

  const rows = sqliteDb.prepare(query).all(...params) as any[];
  const total = rows.length > 0 ? Number(rows[0]?.total ?? 0) : 0;
  const students = rows.map(({ total: _t, ...r }) => ({ ...r, academicDebt: r.academicDebt === 1 }));

  return { students, total };
}

export async function getStudentById(id: string): Promise<Student | undefined> {
  const row = sqliteDb.prepare('SELECT * FROM students WHERE id = ?').get(id) as any;
  return row ? { ...row, academicDebt: row.academicDebt === 1 } : undefined;
}

export async function getStudentByUserId(userId: string): Promise<Student | undefined> {
  const row = sqliteDb.prepare('SELECT * FROM students WHERE userId = ?').get(userId) as any;
  return row ? { ...row, academicDebt: row.academicDebt === 1 } : undefined;
}

export async function createStudent(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  sqliteDb.prepare(
    `INSERT INTO students (id, fullName, course, "group", specialty, attendance, performance, academicDebt, email, phone, userId, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.fullName, data.course, data.group, data.specialty, data.attendance, data.performance, data.academicDebt ? 1 : 0, data.email ?? null, data.phone ?? null, data.userId ?? null, data.status ?? 'approved', now, now);
  return (await getStudentById(id))!;
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
    updatedAt: new Date().toISOString(),
  };
  sqliteDb.prepare(
    `UPDATE students SET fullName=?, course=?, "group"=?, specialty=?, attendance=?, performance=?, academicDebt=?, email=?, phone=?, userId=?, status=?, updatedAt=? WHERE id=?`
  ).run(updated.fullName, updated.course, updated.group, updated.specialty, updated.attendance, updated.performance, updated.academicDebt ? 1 : 0, updated.email, updated.phone, updated.userId, updated.status, updated.updatedAt, id);
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

export async function getStudentsByIds(ids: string[]): Promise<Student[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = sqliteDb.prepare(`SELECT * FROM students WHERE id IN (${placeholders})`).all(...ids) as any[];
  return rows.map(r => ({ ...r, academicDebt: r.academicDebt === 1 }));
}

export async function deleteStudentsByIds(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const result = sqliteDb.prepare(`DELETE FROM students WHERE id IN (${placeholders})`).run(...ids);
  return result.changes;
}

export async function updateStudentsByIds(
  ids: string[],
  data: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<number> {
  if (ids.length === 0) return 0;
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, value] of Object.entries(data)) {
    const col = key === 'group' ? '"group"' : key;
    sets.push(`${col} = ?`);
    params.push(key === 'academicDebt' ? (value ? 1 : 0) : value === undefined ? null : value);
  }
  if (sets.length === 0) return 0;
  sets.push('updatedAt = ?');
  params.push(new Date().toISOString());
  const placeholders = ids.map(() => '?').join(',');
  const result = sqliteDb.prepare(`UPDATE students SET ${sets.join(', ')} WHERE id IN (${placeholders})`).run(...params, ...ids);
  return result.changes;
}

export async function getStats() {
  const total = (sqliteDb.prepare("SELECT COUNT(*) as c FROM students WHERE status = 'approved'").get() as any).c ?? 0;
  const withDebt = (sqliteDb.prepare("SELECT COUNT(*) as c FROM students WHERE status = 'approved' AND academicDebt = 1").get() as any).c ?? 0;
  const avgs = sqliteDb.prepare("SELECT AVG(attendance) as a, AVG(performance) as p FROM students WHERE status = 'approved'").get() as any;
  const courseRows = sqliteDb.prepare("SELECT course, COUNT(*) as count FROM students WHERE status = 'approved' GROUP BY course").all() as any[];
  const byCourse: Record<number, number> = {};
  for (const r of courseRows) byCourse[r.course] = r.count;
  const courseStats = sqliteDb.prepare(
    "SELECT course, ROUND(AVG(performance), 2) as avgPerformance, ROUND(AVG(attendance)) as avgAttendance, COUNT(*) as count FROM students WHERE status = 'approved' GROUP BY course"
  ).all() as any[];
  const specRows = sqliteDb.prepare("SELECT specialty, COUNT(*) as count FROM students WHERE status = 'approved' GROUP BY specialty").all() as any[];
  const bySpecialty: Record<string, number> = {};
  for (const r of specRows) bySpecialty[r.specialty] = r.count;
  return {
    total, withDebt,
    avgAttendance: Math.round(avgs?.a ?? 0),
    avgPerformance: Number((avgs?.p ?? 0).toFixed(2)),
    byCourse, byCourseStats: courseStats, bySpecialty,
  };
}

export async function getStudentsBySpecialty() {
  return sqliteDb.prepare(
    "SELECT specialty, COUNT(*) as count, ROUND(AVG(performance), 2) as avgPerformance, ROUND(AVG(attendance)) as avgAttendance FROM students WHERE status = 'approved' GROUP BY specialty ORDER BY count DESC"
  ).all() as any[];
}

export async function getStudentsByCourse() {
  return sqliteDb.prepare(
    "SELECT course, COUNT(*) as count, SUM(academicDebt) as withDebt FROM students WHERE status = 'approved' GROUP BY course ORDER BY course"
  ).all() as any[];
}

export async function getRecentStudents(limit: number = 5): Promise<Student[]> {
  const rows = sqliteDb.prepare("SELECT * FROM students WHERE status = 'approved' ORDER BY createdAt DESC LIMIT ?").all(limit) as any[];
  return rows.map(r => ({ ...r, academicDebt: r.academicDebt === 1 }));
}

export async function logAudit(action: string, entity: string, entityId?: string, userId?: string, details?: any) {
  _logAudit(sqliteDb, action, entity, entityId, userId, details);
}

export async function getAuditLogs(page: number = 1, limit: number = 50, entity?: string, action?: string) {
  return _getAuditLogs(sqliteDb, page, limit, entity, action);
}

export async function pruneAuditLogs(): Promise<number> {
  let deleted = 0;
  deleted += sqliteDb.prepare(
    `DELETE FROM auditLog WHERE action IN ('login', 'logout') AND entity = 'auth' AND userId = 'user'`
  ).run().changes;
  const cutoff = new Date(Date.now() - env.AUDIT_RETENTION_DAYS * 86400000).toISOString();
  deleted += sqliteDb.prepare(`DELETE FROM auditLog WHERE createdAt < ?`).run(cutoff).changes;
  const total = (sqliteDb.prepare(`SELECT COUNT(*) as c FROM auditLog`).get() as any).c as number;
  if (total > env.AUDIT_MAX_ROWS) {
    deleted += sqliteDb.prepare(
      `DELETE FROM auditLog WHERE id IN (SELECT id FROM auditLog ORDER BY createdAt DESC LIMIT -1 OFFSET ?)`
    ).run(env.AUDIT_MAX_ROWS).changes;
  }
  return deleted;
}

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  const row = sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  return row ? { ...row } : undefined;
}

export async function getUserById(id: string): Promise<UserRecord | undefined> {
  const row = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  return row ? { ...row } : undefined;
}

export async function createUser(data: { email: string; passwordHash: string; fullName: string; role?: string; avatar?: string | null; phone?: string | null; group?: string | null }): Promise<UserRecord> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  sqliteDb.prepare(
    `INSERT INTO users (id, email, passwordHash, fullName, role, avatar, phone, "group", createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.email.toLowerCase(), data.passwordHash, data.fullName, data.role ?? 'user', data.avatar ?? null, data.phone ?? null, data.group ?? null, now, now);
  return (await findUserByEmail(data.email.toLowerCase()))!;
}

export async function updateUser(id: string, data: { fullName?: string; avatar?: string | null; phone?: string | null }): Promise<UserRecord | null> {
  const existing = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!existing) return null;
  const updated = {
    fullName: data.fullName ?? existing.fullName,
    avatar: data.avatar !== undefined ? data.avatar : existing.avatar,
    phone: data.phone !== undefined ? data.phone : existing.phone,
    updatedAt: new Date().toISOString(),
  };
  sqliteDb.prepare('UPDATE users SET fullName = ?, avatar = ?, phone = ?, updatedAt = ? WHERE id = ?')
    .run(updated.fullName, updated.avatar, updated.phone, updated.updatedAt, id);
  const row = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  return row ? { ...row } : null;
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<boolean> {
  const result = sqliteDb.prepare('UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?')
    .run(passwordHash, new Date().toISOString(), id);
  return result.changes > 0;
}

export async function getAllUsers(): Promise<UserRecord[]> {
  const rows = sqliteDb.prepare('SELECT * FROM users ORDER BY createdAt DESC').all() as any[];
  return rows.map(r => ({ ...r }));
}

export async function updateUserRoleAndGroup(id: string, data: { role?: string; group?: string | null }): Promise<UserRecord | null> {
  const existing = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!existing) return null;
  const role = data.role ?? existing.role;
  const group = data.group !== undefined ? (data.group === '' ? null : data.group) : (existing.group ?? null);
  sqliteDb.prepare('UPDATE users SET role = ?, "group" = ?, updatedAt = ? WHERE id = ?')
    .run(role, group, new Date().toISOString(), id);
  const row = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  return row ? { ...row } : null;
}

export async function getGroups(): Promise<string[]> {
  const rows = sqliteDb.prepare(`SELECT DISTINCT "group" FROM students WHERE status = 'approved' AND "group" IS NOT NULL AND "group" <> '' ORDER BY "group"`).all() as any[];
  return rows.map((r) => r.group);
}

export async function listSubjects(): Promise<Subject[]> {
  return sqliteDb.prepare('SELECT * FROM subjects ORDER BY name').all() as Subject[];
}

export async function createSubject(name: string): Promise<Subject> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  sqliteDb.prepare('INSERT INTO subjects (id, name, createdAt) VALUES (?, ?, ?)').run(id, name, now);
  return { id, name, createdAt: now };
}

export async function deleteSubject(id: string): Promise<boolean> {
  return sqliteDb.prepare('DELETE FROM subjects WHERE id = ?').run(id).changes > 0;
}

const scheduleCols = ['id', 'group', 'dayOfWeek', 'lessonNumber', 'subject', 'teacher', 'room', 'createdAt', 'updatedAt'];

export async function getSchedule(group?: string): Promise<ScheduleEntry[]> {
  const where = group ? 'WHERE "group" = ?' : '';
  const params = group ? [group] : [];
  return sqliteDb.prepare(
    `SELECT ${scheduleCols.map((c) => (c === 'group' ? '"group"' : c)).join(', ')} FROM schedule ${where} ORDER BY dayOfWeek, lessonNumber`
  ).all(...params) as ScheduleEntry[];
}

export async function createScheduleEntry(data: Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleEntry> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  sqliteDb.prepare(
    `INSERT INTO schedule (id, "group", dayOfWeek, lessonNumber, subject, teacher, room, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.group, data.dayOfWeek, data.lessonNumber, data.subject, data.teacher ?? null, data.room ?? null, now, now);
  return (await getSchedule(data.group)).find((e) => e.id === id)!;
}

export async function updateScheduleEntry(id: string, data: Partial<Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ScheduleEntry | null> {
  const existing = sqliteDb.prepare('SELECT * FROM schedule WHERE id = ?').get(id) as any;
  if (!existing) return null;
  const updated = {
    group: data.group ?? existing.group,
    dayOfWeek: data.dayOfWeek ?? existing.dayOfWeek,
    lessonNumber: data.lessonNumber ?? existing.lessonNumber,
    subject: data.subject ?? existing.subject,
    teacher: data.teacher !== undefined ? data.teacher : existing.teacher,
    room: data.room !== undefined ? data.room : existing.room,
    updatedAt: new Date().toISOString(),
  };
  sqliteDb.prepare(
    `UPDATE schedule SET "group" = ?, dayOfWeek = ?, lessonNumber = ?, subject = ?, teacher = ?, room = ?, updatedAt = ? WHERE id = ?`
  ).run(updated.group, updated.dayOfWeek, updated.lessonNumber, updated.subject, updated.teacher, updated.room, updated.updatedAt, id);
  const row = sqliteDb.prepare('SELECT * FROM schedule WHERE id = ?').get(id) as any;
  return row ? { ...row } : null;
}

export async function deleteScheduleEntry(id: string): Promise<boolean> {
  return sqliteDb.prepare('DELETE FROM schedule WHERE id = ?').run(id).changes > 0;
}

export async function deleteScheduleByGroup(group: string): Promise<number> {
  return sqliteDb.prepare('DELETE FROM schedule WHERE "group" = ?').run(group).changes;
}

export async function getMarksByStudent(studentId: string): Promise<MarkRecord[]> {
  return sqliteDb.prepare(
    `SELECT m.id, m.studentId, m.subjectId, s.name as subjectName, m.mark, m.createdAt, m.scheduleId, m.date
     FROM marks m JOIN subjects s ON s.id = m.subjectId
     WHERE m.studentId = ? ORDER BY s.name, m.createdAt`
  ).all(studentId) as MarkRecord[];
}

export async function getMarkById(id: string): Promise<MarkRecord | undefined> {
  return sqliteDb.prepare(
    `SELECT m.id, m.studentId, m.subjectId, s.name as subjectName, m.mark, m.createdAt, m.scheduleId, m.date
     FROM marks m JOIN subjects s ON s.id = m.subjectId
     WHERE m.id = ?`
  ).get(id) as MarkRecord | undefined;
}

export async function addMark(studentId: string, subjectId: string, mark: number): Promise<MarkRecord> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  sqliteDb.prepare(
    `INSERT INTO marks (id, studentId, subjectId, mark, createdAt) VALUES (?, ?, ?, ?, ?)`
  ).run(id, studentId, subjectId, mark, now);
  const row = await getMarkById(id);
  return { ...row!, subjectName: (sqliteDb.prepare('SELECT name FROM subjects WHERE id = ?').get(subjectId) as any)?.name };
}

export async function updateMark(id: string, mark: number): Promise<MarkRecord | null> {
  const existing = await getMarkById(id);
  if (!existing) return null;
  sqliteDb.prepare('UPDATE marks SET mark = ? WHERE id = ?').run(mark, id);
  const row = await getMarkById(id);
  return { ...row!, subjectName: (sqliteDb.prepare('SELECT name FROM subjects WHERE id = ?').get(row!.subjectId) as any)?.name };
}

export async function deleteMark(id: string): Promise<boolean> {
  return sqliteDb.prepare('DELETE FROM marks WHERE id = ?').run(id).changes > 0;
}

export async function recomputeStudentPerformance(studentId: string): Promise<void> {
  const row = sqliteDb.prepare('SELECT AVG(mark) as avg FROM marks WHERE studentId = ?').get(studentId) as any;
  if (row?.avg === null || row?.avg === undefined) return;
  const value = Math.max(0, Math.min(10, Number(Number(row.avg).toFixed(2))));
  sqliteDb.prepare('UPDATE students SET performance = ?, updatedAt = ? WHERE id = ?').run(value, new Date().toISOString(), studentId);
}

export async function recomputeStudentAttendance(studentId: string): Promise<void> {
  const row = sqliteDb.prepare(
    `SELECT COUNT(*) as total, SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) as present FROM attendance WHERE studentId = ?`
  ).get(studentId) as any;
  const total = Number(row?.total ?? 0);
  if (total === 0) return;
  const present = Number(row?.present ?? 0);
  const value = Math.round((present / total) * 100);
  sqliteDb.prepare('UPDATE students SET attendance = ?, updatedAt = ? WHERE id = ?').run(value, new Date().toISOString(), studentId);
}

export async function getJournalSummaries(group: string, date: string): Promise<JournalSummaryLesson[]> {
  const studentRows = sqliteDb.prepare(`SELECT id FROM students WHERE "group" = ? AND status = 'approved'`).all(group) as any[];
  if (studentRows.length === 0) return [];
  const ph = studentRows.map(() => '?').join(',');
  const lessons = sqliteDb.prepare(`SELECT id, lessonNumber, subject, teacher, room FROM schedule WHERE "group" = ? ORDER BY lessonNumber`).all(group) as any[];
  return lessons.map((l) => {
    const marked = (sqliteDb.prepare(`SELECT COUNT(*) as c FROM marks WHERE scheduleId = ? AND date = ? AND studentId IN (${ph})`).get(l.id, date, ...studentRows.map((s) => s.id)) as any)?.c ?? 0;
    const attRows = sqliteDb.prepare(`SELECT status, COUNT(*) as c FROM attendance WHERE scheduleId = ? AND date = ? AND studentId IN (${ph}) GROUP BY status`).all(l.id, date, ...studentRows.map((s) => s.id)) as any[];
    const present = attRows.find((r) => r.status === 'present')?.c ?? 0;
    const late = attRows.find((r) => r.status === 'late')?.c ?? 0;
    const absent = attRows.find((r) => r.status === 'absent')?.c ?? 0;
    return {
      scheduleId: l.id, lessonNumber: l.lessonNumber, subject: l.subject, teacher: l.teacher, room: l.room,
      totalStudents: studentRows.length, marked: Number(marked), present: Number(present), late: Number(late), absent: Number(absent),
    };
  });
}

export async function getJournalLesson(scheduleId: string, date: string): Promise<JournalLesson | null> {
  const entry = sqliteDb.prepare(`SELECT * FROM schedule WHERE id = ?`).get(scheduleId) as any;
  if (!entry) return null;
  const students = sqliteDb.prepare(`SELECT id, fullName, course FROM students WHERE "group" = ? AND status = 'approved' ORDER BY fullName`).all(entry.group) as any[];
  const markById = new Map<string, { id: string; mark: number }>();
  for (const m of sqliteDb.prepare(`SELECT id, studentId, mark FROM marks WHERE scheduleId = ? AND date = ?`).all(scheduleId, date) as any[]) {
    markById.set(m.studentId, { id: m.id, mark: m.mark });
  }
  const statusById = new Map<string, string>();
  for (const a of sqliteDb.prepare(`SELECT studentId, status FROM attendance WHERE scheduleId = ? AND date = ?`).all(scheduleId, date) as any[]) {
    statusById.set(a.studentId, a.status);
  }
  return {
    scheduleId, group: entry.group, dayOfWeek: entry.dayOfWeek, lessonNumber: entry.lessonNumber,
    subject: entry.subject, teacher: entry.teacher, room: entry.room, date,
    students: students.map((s) => {
      const mark = markById.get(s.id);
      return {
        studentId: s.id, fullName: s.fullName, course: s.course,
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
  const entry = sqliteDb.prepare(`SELECT * FROM schedule WHERE id = ?`).get(scheduleId) as any;
  if (!entry) return null;
  let subjectRow = sqliteDb.prepare(`SELECT id FROM subjects WHERE name = ? COLLATE NOCASE`).get(entry.subject) as any;
  if (!subjectRow) {
    const subjectId = crypto.randomUUID();
    sqliteDb.prepare('INSERT INTO subjects (id, name, createdAt) VALUES (?, ?, ?)').run(subjectId, entry.subject, new Date().toISOString());
    subjectRow = { id: subjectId };
  }
  const subjectId = subjectRow.id;
  const now = new Date().toISOString();
  const tx = sqliteDb.transaction(() => {
    for (const e of entries) {
      if (typeof e.mark === 'number') {
        const existing = sqliteDb.prepare('SELECT id FROM marks WHERE scheduleId = ? AND date = ? AND studentId = ?').get(scheduleId, date, e.studentId) as any;
        if (existing) {
          sqliteDb.prepare('UPDATE marks SET mark = ?, subjectId = ? WHERE id = ?').run(e.mark, subjectId, existing.id);
        } else {
          sqliteDb.prepare('INSERT INTO marks (id, studentId, subjectId, mark, scheduleId, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(crypto.randomUUID(), e.studentId, subjectId, e.mark, scheduleId, date, now);
        }
      } else {
        sqliteDb.prepare('DELETE FROM marks WHERE scheduleId = ? AND date = ? AND studentId = ?').run(scheduleId, date, e.studentId);
      }
      if (e.status) {
        const existing = sqliteDb.prepare('SELECT id FROM attendance WHERE scheduleId = ? AND date = ? AND studentId = ?').get(scheduleId, date, e.studentId) as any;
        if (existing) {
          sqliteDb.prepare('UPDATE attendance SET status = ? WHERE id = ?').run(e.status, existing.id);
        } else {
          sqliteDb.prepare('INSERT INTO attendance (id, scheduleId, date, studentId, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
            .run(crypto.randomUUID(), scheduleId, date, e.studentId, e.status, now);
        }
      } else {
        sqliteDb.prepare('DELETE FROM attendance WHERE scheduleId = ? AND date = ? AND studentId = ?').run(scheduleId, date, e.studentId);
      }
    }
  });
  tx();
  for (const e of entries) {
    await recomputeStudentPerformance(e.studentId);
    await recomputeStudentAttendance(e.studentId);
  }
  return getJournalLesson(scheduleId, date);
}

export async function saveRefreshSession(jti: string, userId: string, expiresAt: number): Promise<void> {
  sqliteDb.prepare('INSERT INTO refreshSessions (jti, userId, expiresAt) VALUES (?, ?, ?)').run(jti, userId, expiresAt);
}

export async function getRefreshSession(jti: string): Promise<{ jti: string; userId: string; expiresAt: number } | undefined> {
  const row = sqliteDb.prepare('SELECT * FROM refreshSessions WHERE jti = ?').get(jti) as any;
  return row ?? undefined;
}

export async function deleteRefreshSession(jti: string): Promise<boolean> {
  return sqliteDb.prepare('DELETE FROM refreshSessions WHERE jti = ?').run(jti).changes > 0;
}

export async function deleteRefreshSessionsByUserId(userId: string): Promise<number> {
  return sqliteDb.prepare('DELETE FROM refreshSessions WHERE userId = ?').run(userId).changes;
}
