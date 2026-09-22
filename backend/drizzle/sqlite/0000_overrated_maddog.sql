CREATE TABLE `auditLog` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entityId` text,
	`userId` text,
	`details` text,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`fullName` text NOT NULL,
	`course` integer NOT NULL,
	`group` text NOT NULL,
	`specialty` text NOT NULL,
	`attendance` integer DEFAULT 100 NOT NULL,
	`performance` real DEFAULT 4 NOT NULL,
	`academicDebt` integer DEFAULT false NOT NULL,
	`email` text,
	`phone` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	CONSTRAINT "course_check" CHECK("students"."course" >= 1 AND "students"."course" <= 6),
	CONSTRAINT "attendance_check" CHECK("students"."attendance" >= 0 AND "students"."attendance" <= 100),
	CONSTRAINT "performance_check" CHECK("students"."performance" >= 0 AND "students"."performance" <= 5)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`passwordHash` text NOT NULL,
	`fullName` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`avatar` text,
	`phone` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);