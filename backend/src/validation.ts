import { z } from 'zod';

export const studentSchema = z.object({
  fullName: z.string().min(2, 'ФИО должно содержать минимум 2 символа').max(200),
  course: z.number().int().min(1, 'Курс от 1').max(6, 'Курс до 6'),
  group: z.string().min(1, 'Укажите группу').max(50),
  specialty: z.string().min(1, 'Укажите специальность').max(200),
  attendance: z.number().int().min(0).max(100),
  performance: z.number().min(0).max(5),
  academicDebt: z.boolean(),
  email: z.string().email('Некорректный email').max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
});

export const studentUpdateSchema = studentSchema.partial();

export const querySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(10000).default(50),
  sortBy: z.enum(['fullName', 'course', 'group', 'specialty', 'attendance', 'performance', 'createdAt']).default('fullName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  filterDebt: z.coerce.boolean().optional(),
  filterCourse: z.coerce.number().int().min(1).max(6).optional(),
});

export const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Минимум 6 символов').max(200),
  fullName: z.string().min(2, 'ФИО минимум 2 символа').max(200),
  phone: z.string().max(50).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(200).optional(),
  phone: z.string().max(50).nullable().optional(),
  avatar: z.string().max(5_000_000).nullable().optional(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Минимум 6 символов').max(200),
});

export const batchIdsSchema = z.object({
  ids: z.array(z.string().uuid('Некорректный ID')).min(1).max(1000),
}).or(z.object({
  ids: z.array(z.string()).min(1).max(1000),
}));

export const batchUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(1000),
  patch: z.object({
    course: z.number().int().min(1).max(6).optional(),
    group: z.string().min(1).max(50).optional(),
    specialty: z.string().min(1).max(200).optional(),
    attendance: z.number().int().min(0).max(100).optional(),
    performance: z.number().min(0).max(5).optional(),
    academicDebt: z.boolean().optional(),
    email: z.string().email('Некорректный email').max(200).nullable().optional(),
    phone: z.string().max(50).nullable().optional(),
  }).refine((p) => Object.keys(p).length > 0, { message: 'Нет полей для обновления' }),
});

export const webhookSchema = z.object({
  url: z.string().url('Некорректный URL'),
  events: z.array(z.string()).min(1).default(['*']),
});
