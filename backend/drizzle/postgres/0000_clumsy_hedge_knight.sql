CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"user_id" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"course" integer NOT NULL,
	"group" text NOT NULL,
	"specialty" text NOT NULL,
	"attendance" integer DEFAULT 100 NOT NULL,
	"performance" real DEFAULT 4 NOT NULL,
	"academic_debt" boolean DEFAULT false NOT NULL,
	"email" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_course_check" CHECK ("students"."course" >= 1 AND "students"."course" <= 6),
	CONSTRAINT "students_attendance_check" CHECK ("students"."attendance" >= 0 AND "students"."attendance" <= 100),
	CONSTRAINT "students_performance_check" CHECK ("students"."performance" >= 0 AND "students"."performance" <= 5)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"avatar" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
