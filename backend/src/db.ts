import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql, like, or, and, count, avg, desc, asc } from 'drizzle-orm';
import { students, auditLog, type Student } from './schema.js';
import { env } from './env.js';

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client);

type SortOrder = 'asc' | 'desc';

export async function getAllStudents(
  search?: string,
  page: number = 1,
  limit: number = 50,
  sortBy: string = 'fullName',
  sortOrder: SortOrder = 'asc',
  filterDebt?: boolean,
  filterCourse?: number
): Promise<{ students: Student[]; total: number }> {
  const allowedSorts = ['fullName', 'course', 'group', 'specialty', 'attendance', 'performance', 'createdAt'];
  const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'fullName';
  const orderFn = sortOrder === 'desc' ? desc : asc;

  const conditions: ReturnType<typeof eq>[] = [];

  if (search) {
    const term = `%${search}%`;
    conditions.push(or(
      like(students.fullName, term),
      like(students.group, term),
      like(students.specialty, term)
    )!);
  }

  if (filterDebt !== undefined) {
    conditions.push(eq(students.academicDebt, filterDebt));
  }

  if (filterCourse !== undefined) {
    conditions.push(eq(students.course, filterCourse));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ count: count() })
    .from(students)
    .where(whereClause);

  const total = Number(countResult[0]?.count ?? 0);

  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(students)
    .where(whereClause)
    .orderBy(
      safeSortBy === 'fullName' ? orderFn(students.fullName) :
      safeSortBy === 'course' ? orderFn(students.course) :
      safeSortBy === 'group' ? orderFn(students.group) :
      safeSortBy === 'specialty' ? orderFn(students.specialty) :
      safeSortBy === 'attendance' ? orderFn(students.attendance) :
      safeSortBy === 'performance' ? orderFn(students.performance) :
      orderFn(students.createdAt)
    )
    .limit(limit)
    .offset(offset);

  return { students: rows as Student[], total };
}

export async function getStudentById(id: string): Promise<Student | undefined> {
  const rows = await db.select().from(students).where(eq(students.id, id));
  return rows[0] as Student | undefined;
}

export async function createStudent(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
  const id = crypto.randomUUID();
  const now = new Date();

  const inserted = await db
    .insert(students)
    .values({
      id,
      fullName: data.fullName,
      course: data.course,
      group: data.group,
      specialty: data.specialty,
      attendance: data.attendance,
      performance: data.performance,
      academicDebt: data.academicDebt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return inserted[0] as Student;
}

export async function updateStudent(
  id: string,
  data: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Student | null> {
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
    updatedAt: new Date(),
  };

  const rows = await db
    .update(students)
    .set(updated)
    .where(eq(students.id, id))
    .returning();

  return (rows[0] as Student) ?? null;
}

export async function deleteStudent(id: string): Promise<boolean> {
  const rows = await db.delete(students).where(eq(students.id, id)).returning();
  return rows.length > 0;
}

export async function toggleDebt(id: string): Promise<Student | null> {
  const existing = await getStudentById(id);
  if (!existing) return null;

  const rows = await db
    .update(students)
    .set({ academicDebt: !existing.academicDebt, updatedAt: new Date() })
    .where(eq(students.id, id))
    .returning();

  return (rows[0] as Student) ?? null;
}

export async function deleteAllStudents(): Promise<number> {
  const rows = await db.delete(students).returning();
  return rows.length;
}

export async function getStats() {
  const totalResult = await db.select({ count: count() }).from(students);
  const total = Number(totalResult[0]?.count ?? 0);

  const debtResult = await db
    .select({ count: count() })
    .from(students)
    .where(eq(students.academicDebt, true));
  const withDebt = Number(debtResult[0]?.count ?? 0);

  const avgResult = await db
    .select({
      avgAttendance: avg(students.attendance),
      avgPerformance: avg(students.performance),
    })
    .from(students);

  const courseRows = await db
    .select({ course: students.course, count: count() })
    .from(students)
    .groupBy(students.course);

  const byCourse: Record<number, number> = {};
  for (const row of courseRows) {
    byCourse[row.course] = Number(row.count);
  }

  const specialtyRows = await db
    .select({ specialty: students.specialty, count: count() })
    .from(students)
    .groupBy(students.specialty);

  const bySpecialty: Record<string, number> = {};
  for (const row of specialtyRows) {
    bySpecialty[row.specialty] = Number(row.count);
  }

  return {
    total,
    withDebt,
    avgAttendance: Math.round(Number(avgResult[0]?.avgAttendance ?? 0)),
    avgPerformance: Number(Number(avgResult[0]?.avgPerformance ?? 0).toFixed(2)),
    byCourse,
    bySpecialty,
  };
}

export async function getStudentsBySpecialty() {
  return db
    .select({
      specialty: students.specialty,
      count: count(),
      avgPerformance: sql<number>`ROUND(AVG(${students.performance}), 2)`,
      avgAttendance: sql<number>`ROUND(AVG(${students.attendance}))`,
    })
    .from(students)
    .groupBy(students.specialty)
    .orderBy(desc(count()));
}

export async function getStudentsByCourse() {
  return db
    .select({
      course: students.course,
      count: count(),
      withDebt: sql<number>`SUM(CASE WHEN ${students.academicDebt} THEN 1 ELSE 0 END)`,
    })
    .from(students)
    .groupBy(students.course)
    .orderBy(students.course);
}

export async function getRecentStudents(limit: number = 5): Promise<Student[]> {
  const rows = await db
    .select()
    .from(students)
    .orderBy(desc(students.createdAt))
    .limit(limit);

  return rows as Student[];
}
