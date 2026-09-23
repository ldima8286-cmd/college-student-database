import { sqliteTable, text, integer, real, check, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('passwordHash').notNull(),
  fullName: text('fullName').notNull(),
  role: text('role').notNull().default('user'),
  avatar: text('avatar'),
  phone: text('phone'),
  group: text('group'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
});

export const students = sqliteTable('students', {
  id: text('id').primaryKey(),
  fullName: text('fullName').notNull(),
  course: integer('course').notNull(),
  group: text('group').notNull(),
  specialty: text('specialty').notNull(),
  attendance: integer('attendance').notNull().default(100),
  performance: real('performance').notNull().default(4.0),
  academicDebt: integer('academicDebt', { mode: 'boolean' }).notNull().default(false),
  email: text('email'),
  phone: text('phone'),
  userId: text('userId'),
  status: text('status').notNull().default('approved'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
}, (t) => [
  check('course_check', sql`${t.course} >= 1 AND ${t.course} <= 6`),
  check('attendance_check', sql`${t.attendance} >= 0 AND ${t.attendance} <= 100`),
  check('performance_check', sql`${t.performance} >= 0 AND ${t.performance} <= 5`),
  index('idx_students_status').on(t.status),
  index('idx_students_course').on(t.course),
  index('idx_students_group').on(t.group),
  index('idx_students_filters').on(t.academicDebt),
  index('idx_students_email').on(t.email),
  index('idx_students_user_id').on(t.userId),
  index('idx_students_created_at').on(t.createdAt),
]);

export const auditLog = sqliteTable('auditLog', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entityId'),
  userId: text('userId'),
  details: text('details'),
  createdAt: text('createdAt').notNull(),
}, (t) => [
  index('idx_audit_log_created_at').on(t.createdAt),
]);

export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: text('createdAt').notNull(),
});

export const schedule = sqliteTable('schedule', {
  id: text('id').primaryKey(),
  group: text('group').notNull(),
  dayOfWeek: integer('dayOfWeek').notNull(),
  lessonNumber: integer('lessonNumber').notNull(),
  subject: text('subject').notNull(),
  teacher: text('teacher'),
  room: text('room'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
}, (t) => [
  check('schedule_day_check', sql`${t.dayOfWeek} >= 1 AND ${t.dayOfWeek} <= 7`),
  check('schedule_lesson_check', sql`${t.lessonNumber} >= 1 AND ${t.lessonNumber} <= 10`),
  index('idx_schedule_group_day').on(t.group, t.dayOfWeek, t.lessonNumber),
]);

export const marks = sqliteTable('marks', {
  id: text('id').primaryKey(),
  studentId: text('studentId').notNull().references(() => students.id, { onDelete: 'cascade' }),
  subjectId: text('subjectId').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  mark: integer('mark').notNull(),
  createdAt: text('createdAt').notNull(),
}, (t) => [
  check('mark_check', sql`${t.mark} >= 2 AND ${t.mark} <= 5`),
  index('idx_marks_student').on(t.studentId),
  index('idx_marks_subject').on(t.subjectId),
]);
