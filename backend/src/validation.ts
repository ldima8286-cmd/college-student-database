import { z } from 'zod';

const phoneField = z.string()
  .max(20, 'Телефон: не более 20 символов')
  .refine(
    (v) => /^\+?[\d\s()-]*$/.test(v) && v.replace(/\D/g, '').length <= 15,
    'Телефон: только цифры (до 15), допустимы +, (, ), пробел, дефис'
  )
  .nullable()
  .optional();

export const studentSchema = z.object({
  fullName: z.string().min(2, 'ФИО должно содержать минимум 2 символа').max(200),
  course: z.number().int().min(1, 'Курс от 1').max(6, 'Курс до 6'),
  group: z.string().min(1, 'Укажите группу').max(50),
  specialty: z.string().min(1, 'Укажите специальность').max(200),
  attendance: z.number().int().min(0).max(100),
  performance: z.number().min(0).max(10),
  academicDebt: z.boolean(),
  email: z.string().email('Некорректный email').max(200).nullable().optional(),
  phone: phoneField,
});

export const studentUpdateSchema = studentSchema.partial();

export const studentSelfSchema = z.object({
  fullName: z.string().min(2, 'ФИО должно содержать минимум 2 символа').max(200),
  course: z.number().int().min(1, 'Курс от 1').max(6, 'Курс до 6'),
  group: z.string().min(1, 'Укажите группу').max(50),
  specialty: z.string().min(1, 'Укажите специальность').max(200),
  email: z.string().email('Некорректный email').max(200).nullable().optional(),
  phone: phoneField,
});

export const querySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(10000).default(50),
  sortBy: z.enum(['fullName', 'course', 'group', 'specialty', 'attendance', 'performance', 'createdAt']).default('fullName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  filterDebt: z.coerce.boolean().optional(),
  filterCourse: z.coerce.number().int().min(1).max(6).optional(),
  status: z.enum(['pending', 'approved']).optional(),
});

export const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Минимум 6 символов').max(200),
  fullName: z.string().min(2, 'ФИО минимум 2 символа').max(200),
  phone: phoneField,
  group: z.string().min(1, 'Укажите группу').max(50),
  course: z.number().int('Курс — целое число').min(1, 'Курс от 1').max(6, 'Курс до 6').default(1),
  specialty: z.string().max(200).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Некорректный email'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6, 'Минимум 6 символов').max(200),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(200).optional(),
  phone: phoneField,
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
    performance: z.number().min(0).max(10).optional(),
    academicDebt: z.boolean().optional(),
    email: z.string().email('Некорректный email').max(200).nullable().optional(),
    phone: phoneField,
  }).refine((p) => Object.keys(p).length > 0, { message: 'Нет полей для обновления' }),
});

export const webhookSchema = z.object({
  url: z.string().url('Некорректный URL'),
  events: z.array(z.string()).min(1).default(['*']),
});

export const subjectSchema = z.object({
  name: z.string().min(2, 'Название предмета минимум 2 символа').max(100),
});

export const scheduleCreateSchema = z.object({
  group: z.string().min(1, 'Укажите группу').max(50),
  dayOfWeek: z.number().int().min(1, 'День недели 1-6').max(6, 'День недели 1-6'),
  lessonNumber: z.number().int().min(1, 'Урок 1-10').max(10, 'Урок 1-10'),
  subject: z.string().min(1, 'Укажите предмет').max(100),
  teacher: z.string().max(100).nullable().optional(),
  room: z.string().max(50).nullable().optional(),
  week: z.enum(['upper', 'lower']).nullish(),
});

export const scheduleUpdateSchema = scheduleCreateSchema.partial().refine((p) => Object.keys(p).length > 0, {
  message: 'Нет полей для обновления',
});

export const settingsSchema = z.object({
  semesterStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате ГГГГ-ММ-ДД'),
});

export const markSchema = z.object({
  subjectId: z.string().uuid('Некорректный ID предмета'),
  mark: z.number().int('Оценка — целое число').min(1, 'Оценка от 1').max(10, 'Оценка до 10'),
});

export const markUpdateSchema = z.object({
  mark: z.number().int('Оценка — целое число').min(1, 'Оценка от 1').max(10, 'Оценка до 10'),
});

export const journalQuerySchema = z.object({
  group: z.string().min(1, 'Укажите группу').max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате ГГГГ-ММ-ДД'),
});

export const journalDateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате ГГГГ-ММ-ДД'),
});

export const journalEntrySchema = z.object({
  studentId: z.string().min(1),
  mark: z.number().int('Оценка — целое число').min(1, 'Оценка от 1').max(10, 'Оценка до 10').nullable().optional(),
  status: z.enum(['present', 'late', 'absent']).nullable().optional(),
});

export const journalSaveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате ГГГГ-ММ-ДД'),
  entries: z.array(journalEntrySchema).min(1, 'Журнал пуст').max(1000),
});

export const userAdminUpdateSchema = z.object({
  role: z.enum(['admin', 'curator', 'user']).optional(),
  group: z.string().max(50).nullable().optional(),
}).refine((p) => p.role !== undefined || p.group !== undefined, { message: 'Нет полей для обновления' });
