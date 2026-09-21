import { z } from 'zod';

export const studentSchema = z.object({
  fullName: z.string().min(2, 'ФИО должно содержать минимум 2 символа').max(200),
  course: z.number().int().min(1, 'Курс от 1').max(6, 'Курс до 6'),
  group: z.string().min(1, 'Укажите группу').max(50),
  specialty: z.string().min(1, 'Укажите специальность').max(200),
  attendance: z.number().int().min(0).max(100),
  performance: z.number().min(0).max(5),
  academicDebt: z.boolean(),
});

export const studentUpdateSchema = studentSchema.partial();

export const querySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['fullName', 'course', 'group', 'specialty', 'attendance', 'performance', 'createdAt']).default('fullName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  filterDebt: z.coerce.boolean().optional(),
  filterCourse: z.coerce.number().int().min(1).max(6).optional(),
});
