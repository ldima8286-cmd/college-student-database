import { sqliteTable, text, integer, real, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('passwordHash').notNull(),
  fullName: text('fullName').notNull(),
  role: text('role').notNull().default('user'),
  avatar: text('avatar'),
  phone: text('phone'),
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
]);

export const auditLog = sqliteTable('auditLog', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entityId'),
  userId: text('userId'),
  details: text('details'),
  createdAt: text('createdAt').notNull(),
});
