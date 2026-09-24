import { pgTable, uuid, text, integer, real, boolean, timestamp, serial, jsonb, check, index } from 'drizzle-orm/pg-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('user'),
  avatar: text('avatar'),
  phone: text('phone'),
  group: text('group'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: text('full_name').notNull(),
  course: integer('course').notNull(),
  group: text('group').notNull(),
  specialty: text('specialty').notNull(),
  attendance: integer('attendance').notNull().default(100),
  performance: real('performance').notNull().default(4.0),
  academicDebt: boolean('academic_debt').notNull().default(false),
  email: text('email'),
  phone: text('phone'),
  userId: uuid('user_id').references(() => users.id),
  status: text('status').notNull().default('approved'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('students_course_check', sql`${t.course} >= 1 AND ${t.course} <= 6`),
  check('students_attendance_check', sql`${t.attendance} >= 0 AND ${t.attendance} <= 100`),
  check('students_performance_check', sql`${t.performance} >= 0 AND ${t.performance} <= 10`),
  index('idx_students_status').on(t.status),
  index('idx_students_course').on(t.course),
  index('idx_students_group').on(t.group),
  index('idx_students_filters').on(t.academicDebt),
  index('idx_students_email').on(t.email),
  index('idx_students_user_id').on(t.userId),
  index('idx_students_created_at').on(t.createdAt),
]);

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  userId: text('user_id'),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_audit_log_created_at').on(t.createdAt),
]);

export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const schedule = pgTable('schedule', {
  id: uuid('id').primaryKey().defaultRandom(),
  group: text('group').notNull(),
  dayOfWeek: integer('day_of_week').notNull(),
  lessonNumber: integer('lesson_number').notNull(),
  subject: text('subject').notNull(),
  teacher: text('teacher'),
  room: text('room'),
  week: text('week', { enum: ['upper', 'lower'] }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('schedule_day_check', sql`${t.dayOfWeek} >= 1 AND ${t.dayOfWeek} <= 6`),
  check('schedule_lesson_check', sql`${t.lessonNumber} >= 1 AND ${t.lessonNumber} <= 10`),
  index('idx_schedule_group_day').on(t.group, t.dayOfWeek, t.lessonNumber),
]);

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const marks = pgTable('marks', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  mark: integer('mark').notNull(),
  scheduleId: uuid('schedule_id').references(() => schedule.id, { onDelete: 'set null' }),
  date: text('date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('mark_check', sql`${t.mark} >= 1 AND ${t.mark} <= 10`),
  index('idx_marks_student').on(t.studentId),
  index('idx_marks_subject').on(t.subjectId),
  index('idx_marks_schedule_date').on(t.scheduleId, t.date),
]);

export const attendance = pgTable('attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull().references(() => schedule.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('attendance_status_check', sql`${t.status} IN ('present', 'late', 'absent')`),
  index('idx_attendance_schedule_date').on(t.scheduleId, t.date),
  index('idx_attendance_student').on(t.studentId),
]);

export type Student = InferSelectModel<typeof students>;
export type NewStudent = InferInsertModel<typeof students>;
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
