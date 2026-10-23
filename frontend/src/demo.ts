import type { AxiosAdapter, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type {
  AdminUser,
  AttendanceStatus,
  JournalLesson,
  JournalSummaryLesson,
  MarkRecord,
  Role,
  ScheduleEntry,
  ScheduleWeek,
  Settings,
  Student,
  StudentStats,
  StudentStatus,
  Subject,
} from './types';
import { weekOfDate } from './utils/weeks';

type Body = Record<string, any>;
type Params = Record<string, any>;

interface DemoUser extends AdminUser {
  avatar: string | null;
}

interface JournalEntry {
  studentId: string;
  mark: number | null;
  status: AttendanceStatus | null;
  markId: string | null;
}

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

const GROUPS = ['ИС-21', 'ИС-22', 'ПО-507', 'ЭК-31', 'БУ-41'];

const SUBJECT_NAMES = [
  'Математика',
  'Физика',
  'Программирование',
  'Веб-разработка',
  'Компьютерные сети',
  'Базы данных',
  'ООП',
  'Алгоритмы',
  'Паттерны проектирования',
  'Тестирование ПО',
  'История Беларуси',
  'Иностранный язык',
  'Физкультура',
  'Экономика',
  'Финансы',
  'Бухгалтерский учёт',
  'Налоги',
  'Аудит',
  'Статистика',
  'Менеджмент',
  'Информационные системы',
  'Правоведение',
];

const TEACHERS = [
  'Иванова И.И.',
  'Петров П.П.',
  'Сидорова С.С.',
  'Кузнецов А.А.',
  'Морозова Е.Е.',
  'Волков Д.Д.',
  'Новикова О.О.',
  'Фёдоров Н.Н.',
];

const daysAgo = (n: number): string => new Date(Date.now() - n * 86400000).toISOString();
const nowISO = (): string => new Date().toISOString();
const uid = (prefix: string): string => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const STUDENT_SEED: {
  fullName: string;
  course: number;
  group: string;
  specialty: string;
  attendance: number;
  performance: number;
  academicDebt: boolean;
  email: string | null;
  phone: string | null;
  status?: StudentStatus;
}[] = [
  { fullName: 'Иванов Иван Иванович', course: 2, group: 'ПО-507', specialty: 'Программирование', attendance: 92, performance: 8.4, academicDebt: false, email: 'ivanov@college.local', phone: '+375291112233' },
  { fullName: 'Петрова Анна Сергеевна', course: 2, group: 'ПО-507', specialty: 'Программирование', attendance: 96, performance: 9.1, academicDebt: false, email: 'petrova@college.local', phone: '+375292223344' },
  { fullName: 'Сидоров Максим Олегович', course: 2, group: 'ПО-507', specialty: 'Программирование', attendance: 74, performance: 6.2, academicDebt: true, email: 'sidorov@college.local', phone: '+375293334455' },
  { fullName: 'Кузнецова Мария Дмитриевна', course: 1, group: 'ИС-21', specialty: 'Информационные системы', attendance: 88, performance: 7.8, academicDebt: false, email: 'kuznetsova@college.local', phone: '+375294445566' },
  { fullName: 'Смирнов Артём Владимирович', course: 1, group: 'ИС-21', specialty: 'Информационные системы', attendance: 81, performance: 7.1, academicDebt: false, email: 'smirnov@college.local', phone: '+375295556677' },
  { fullName: 'Волкова Елизавета Игоревна', course: 1, group: 'ИС-22', specialty: 'Информационные системы', attendance: 90, performance: 8.0, academicDebt: false, email: 'volkova@college.local', phone: '+375296667788' },
  { fullName: 'Морозов Денис Павлович', course: 1, group: 'ИС-22', specialty: 'Информационные системы', attendance: 68, performance: 5.4, academicDebt: true, email: 'morozov@college.local', phone: '+375297778899' },
  { fullName: 'Новикова Ольга Андреевна', course: 3, group: 'ЭК-31', specialty: 'Экономика', attendance: 94, performance: 9.3, academicDebt: false, email: 'novikova@college.local', phone: '+375298889900' },
  { fullName: 'Фёдоров Павел Николаевич', course: 3, group: 'ЭК-31', specialty: 'Экономика', attendance: 79, performance: 6.8, academicDebt: false, email: 'fedorov@college.local', phone: '+375299990011' },
  { fullName: 'Соколова Виктория Алексеевна', course: 3, group: 'БУ-41', specialty: 'Бухгалтерский учёт', attendance: 86, performance: 7.6, academicDebt: true, email: 'sokolova@college.local', phone: '+375291010101' },
  { fullName: 'Лебедев Кирилл Романович', course: 1, group: 'ИС-21', specialty: 'Информационные системы', attendance: 100, performance: 4.0, academicDebt: false, email: 'lebedev@college.local', phone: '+375292020202', status: 'pending' },
];

const USERS: DemoUser[] = [
  { id: 'u1', email: 'admin@college.local', fullName: 'Администратор Системы', role: 'admin', phone: null, group: null, avatar: null, createdAt: daysAgo(120) },
  { id: 'u2', email: 'curator@college.local', fullName: 'Петрова Анна Сергеевна', role: 'curator', phone: '+375292223344', group: 'ПО-507', avatar: null, createdAt: daysAgo(90) },
  { id: 'u3', email: 'user@college.local', fullName: 'Иванов Иван Иванович', role: 'user', phone: '+375291112233', group: 'ПО-507', avatar: null, createdAt: daysAgo(60) },
  { id: 'u4', email: 'smirnov@college.local', fullName: 'Смирнов Артём Владимирович', role: 'user', phone: '+375295556677', group: 'ИС-21', avatar: null, createdAt: daysAgo(45) },
  { id: 'u5', email: 'novikova@college.local', fullName: 'Новикова Ольга Андреевна', role: 'user', phone: '+375298889900', group: 'ЭК-31', avatar: null, createdAt: daysAgo(30) },
  { id: 'u6', email: 'kuznetsova@college.local', fullName: 'Кузнецова Мария Дмитриевна', role: 'user', phone: '+375294445566', group: 'ИС-21', avatar: null, createdAt: daysAgo(20) },
];

let students: Student[] = STUDENT_SEED.map((s, i) => ({
  id: `s${i + 1}`,
  fullName: s.fullName,
  course: s.course,
  group: s.group,
  specialty: s.specialty,
  attendance: s.attendance,
  performance: s.performance,
  academicDebt: s.academicDebt,
  email: s.email,
  phone: s.phone,
  userId: i === 0 ? 'u3' : null,
  status: s.status ?? 'approved',
  createdAt: daysAgo((STUDENT_SEED.length - i) * 4),
  updatedAt: daysAgo((STUDENT_SEED.length - i) * 4),
}));

let studentSeq = students.length + 1;
let subjectSeq = SUBJECT_NAMES.length + 1;

let subjects: Subject[] = SUBJECT_NAMES.map((name, i) => ({
  id: `sub${i + 1}`,
  name,
  createdAt: daysAgo(SUBJECT_NAMES.length - i),
}));

let settings: Settings = { semesterStart: '2026-09-01' };

function makeEntry(group: string, day: number, lesson: number, week: ScheduleWeek | null, gi: number): ScheduleEntry {
  const subject = SUBJECT_NAMES[(gi * 7 + day * 3 + lesson) % SUBJECT_NAMES.length];
  const teacher = TEACHERS[(gi * 3 + day + lesson) % TEACHERS.length];
  const room = String(100 + ((gi * 11 + day * 5 + lesson * 3) % 40));
  return {
    id: `sch-${group}-${day}-${lesson}-${week ?? 'all'}`,
    group,
    dayOfWeek: day,
    lessonNumber: lesson,
    subject,
    teacher,
    room,
    week,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
}

let scheduleEntries: ScheduleEntry[] = [];
GROUPS.forEach((group, gi) => {
  for (let day = 1; day <= 5; day++) {
    for (let lesson = 1; lesson <= 4; lesson++) {
      scheduleEntries.push(makeEntry(group, day, lesson, null, gi));
    }
    scheduleEntries.push(makeEntry(group, day, 5, day % 2 === 1 ? 'upper' : 'lower', gi));
  }
});

let marks: MarkRecord[] = [];
students.forEach((s, si) => {
  if (s.status === 'pending') return;
  for (let k = 0; k < 4; k++) {
    const subject = subjects[(si * 3 + k * 5) % subjects.length];
    marks.push({
      id: `m-${s.id}-${k}`,
      studentId: s.id,
      subjectId: subject.id,
      mark: 6 + ((si + k) % 5),
      createdAt: daysAgo(si + k + 1),
      scheduleId: null,
      date: daysAgo(si + k + 1).slice(0, 10),
    });
  }
});

const journal = new Map<string, JournalEntry[]>();
const journalKey = (scheduleId: string, date: string): string => `${scheduleId}|${date}`;

const AUDIT_ACTIONS = ['login', 'create', 'update', 'delete', 'logout'];
const AUDIT_ENTITIES = ['student', 'schedule', 'subject', 'user', 'journal'];
let auditLogs: AuditEntry[] = Array.from({ length: 24 }, (_, i) => {
  const action = AUDIT_ACTIONS[i % AUDIT_ACTIONS.length];
  const entity = AUDIT_ENTITIES[(i * 2) % AUDIT_ENTITIES.length];
  return {
    id: `a${i + 1}`,
    action,
    entity,
    entityId: `id-${1000 + i}`,
    userId: ['admin', 'curator', 'user'][i % 3],
    details: {
      subject: `Запись ${i + 1}`,
      note: action === 'login' ? 'Успешный вход' : `Демонстрационное действие «${action}»`,
    },
    createdAt: new Date(Date.now() - i * 5 * 3600000).toISOString(),
  };
});

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

function clearCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

function currentUser(): DemoUser {
  const email = readCookie('demo_user');
  if (email) {
    const byEmail = USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (byEmail) return byEmail;
  }
  const role = readCookie('role') as Role | undefined;
  return USERS.find((u) => u.role === role) ?? USERS[0];
}

function publicUser(user: DemoUser): AdminUser & { avatar: string | null } {
  return { ...user };
}

const approved = (): Student[] => students.filter((s) => s.status !== 'pending');

function myStudent(): Student | null {
  const user = currentUser();
  return students.find((s) => s.userId === user.id) ?? null;
}

function scopedStudents(): Student[] {
  const user = currentUser();
  if (user.role === 'curator' && user.group) {
    return students.filter((s) => s.group === user.group);
  }
  return students;
}

function subjectName(subjectId: string): string | undefined {
  return subjects.find((s) => s.id === subjectId)?.name;
}

function withSubject(m: MarkRecord): MarkRecord {
  return { ...m, subjectName: m.subjectName ?? subjectName(m.subjectId) ?? 'Без предмета' };
}

function marksForStudent(studentId: string): MarkRecord[] {
  return marks
    .filter((m) => m.studentId === studentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(withSubject);
}

function computeStats(): StudentStats {
  const list = approved();
  const total = list.length;
  const withDebt = list.filter((s) => s.academicDebt).length;
  const avgAttendance = total ? Math.round(list.reduce((a, s) => a + s.attendance, 0) / total) : 0;
  const avgPerformance = total ? Number((list.reduce((a, s) => a + s.performance, 0) / total).toFixed(2)) : 0;

  const byCourse: Record<number, number> = {};
  const bySpecialty: Record<string, number> = {};
  for (const s of list) {
    byCourse[s.course] = (byCourse[s.course] ?? 0) + 1;
    bySpecialty[s.specialty] = (bySpecialty[s.specialty] ?? 0) + 1;
  }

  const courses = [...new Set(list.map((s) => s.course))].sort((a, b) => a - b);
  const byCourseStats = courses.map((course) => {
    const arr = list.filter((s) => s.course === course);
    return {
      course,
      count: arr.length,
      avgPerformance: Number((arr.reduce((a, s) => a + s.performance, 0) / arr.length).toFixed(2)),
      avgAttendance: Math.round(arr.reduce((a, s) => a + s.attendance, 0) / arr.length),
    };
  });

  const groups = [...new Set(list.map((s) => s.group))].sort((a, b) => a.localeCompare(b, 'ru'));
  const byGroupStats = groups.map((group) => {
    const arr = list.filter((s) => s.group === group);
    return {
      group,
      count: arr.length,
      avgPerformance: Number((arr.reduce((a, s) => a + s.performance, 0) / arr.length).toFixed(2)),
      avgAttendance: Math.round(arr.reduce((a, s) => a + s.attendance, 0) / arr.length),
    };
  });

  return { total, withDebt, avgAttendance, avgPerformance, byCourse, byCourseStats, byGroupStats, bySpecialty };
}

function dayOfWeekOf(date: string): number {
  const d = new Date(`${date}T00:00:00`);
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

function journalEntries(scheduleId: string, date: string): JournalEntry[] {
  return journal.get(journalKey(scheduleId, date)) ?? [];
}

function lessonFor(scheduleId: string, date: string): JournalLesson | null {
  const entry = scheduleEntries.find((e) => e.id === scheduleId);
  if (!entry) return null;
  const list = approved().filter((s) => s.group === entry.group);
  const stored = new Map(journalEntries(scheduleId, date).map((x) => [x.studentId, x]));
  return {
    scheduleId: entry.id,
    group: entry.group,
    dayOfWeek: entry.dayOfWeek,
    lessonNumber: entry.lessonNumber,
    subject: entry.subject,
    teacher: entry.teacher,
    room: entry.room,
    date,
    students: list.map((s) => {
      const item = stored.get(s.id);
      return {
        studentId: s.id,
        fullName: s.fullName,
        course: s.course,
        mark: item?.mark ?? null,
        markId: item?.markId ?? null,
        status: item?.status ?? null,
      };
    }),
  };
}

function respond<T>(config: InternalAxiosRequestConfig, data: T, status = 200): AxiosResponse<T> {
  return { data, status, statusText: 'OK', headers: {}, config } as AxiosResponse<T>;
}

function ok<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse {
  return respond(config, { success: true, data });
}

function fail(config: InternalAxiosRequestConfig, error: string): AxiosResponse {
  return respond(config, { success: false, error });
}

function parseBody(data: unknown): Body {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as Body;
    } catch {
      return {};
    }
  }
  if (typeof data === 'object') return data as Body;
  return {};
}

function abortError(): Error {
  const error = new Error('canceled');
  error.name = 'CanceledError';
  return error;
}

function wait(config: InternalAxiosRequestConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const signal = (config as unknown as { signal?: AbortSignal }).signal;
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(resolve, 80 + Math.random() * 70);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true },
    );
  });
}

function paginateStudents(config: InternalAxiosRequestConfig, params: Params): AxiosResponse {
  let list = scopedStudents();

  if (params.status === 'pending' || params.status === 'approved') {
    list = list.filter((s) => (s.status ?? 'approved') === params.status);
  }

  const search = String(params.search ?? '').trim().toLowerCase();
  if (search) {
    list = list.filter((s) =>
      `${s.fullName} ${s.group} ${s.specialty}`.toLowerCase().includes(search),
    );
  }

  if (params.filterDebt === true || params.filterDebt === 'true') {
    list = list.filter((s) => s.academicDebt);
  } else if (params.filterDebt === false || params.filterDebt === 'false') {
    list = list.filter((s) => !s.academicDebt);
  }

  if (params.filterCourse !== undefined && params.filterCourse !== '') {
    const course = Number(params.filterCourse);
    if (!Number.isNaN(course)) list = list.filter((s) => s.course === course);
  }

  const sortBy = String(params.sortBy ?? 'fullName');
  const direction = params.sortOrder === 'desc' ? -1 : 1;
  list = [...list].sort((a, b) => {
    const left = (a as unknown as Record<string, unknown>)[sortBy];
    const right = (b as unknown as Record<string, unknown>)[sortBy];
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction;
    return String(left ?? '').localeCompare(String(right ?? ''), 'ru') * direction;
  });

  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const limit = Math.max(1, Number(params.limit ?? 20) || 20);
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const data = list.slice((page - 1) * limit, page * limit);

  return respond(config, { success: true, data, total, page, limit, totalPages });
}

function addStudent(input: Body, status: StudentStatus = 'approved'): Student {
  const student: Student = {
    id: `s${studentSeq++}`,
    fullName: String(input.fullName ?? 'Без имени'),
    course: Number(input.course ?? 1) || 1,
    group: String(input.group ?? ''),
    specialty: String(input.specialty ?? ''),
    attendance: Number(input.attendance ?? 100),
    performance: Number(input.performance ?? 4),
    academicDebt: Boolean(input.academicDebt),
    email: input.email ? String(input.email) : null,
    phone: input.phone ? String(input.phone) : null,
    userId: null,
    status,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  students.push(student);
  return student;
}

function saveJournal(scheduleId: string, date: string, entries: JournalEntry[]): JournalLesson | null {
  const entry = scheduleEntries.find((e) => e.id === scheduleId);
  if (!entry) return null;
  const subjectId = subjects.find((s) => s.name === entry.subject)?.id ?? subjects[0]?.id ?? '';

  const stored: JournalEntry[] = entries.map((item) => {
    const markId = `jm-${scheduleId}-${item.studentId}-${date}`;
    const existing = marks.find((m) => m.id === markId);
    if (item.mark === null) {
      marks = marks.filter((m) => m.id !== markId);
      return { ...item, markId: null };
    }
    if (existing) {
      existing.mark = item.mark;
    } else {
      marks.push({
        id: markId,
        studentId: item.studentId,
        subjectId,
        mark: item.mark,
        createdAt: nowISO(),
        scheduleId,
        date,
      });
    }
    return { ...item, markId };
  });

  journal.set(journalKey(scheduleId, date), stored);
  return lessonFor(scheduleId, date);
}

async function route(
  config: InternalAxiosRequestConfig,
  method: string,
  url: string,
  params: Params,
  body: Body,
): Promise<AxiosResponse> {
  if (method === 'post' && url === '/auth/login') {
    const email = String(body.email ?? '').toLowerCase();
    const byEmail = USERS.find((u) => u.email.toLowerCase() === email);
    const role: Role = byEmail?.role ?? (email.includes('admin') ? 'admin' : email.includes('curator') ? 'curator' : 'user');
    const user = byEmail ?? USERS.find((u) => u.role === role) ?? USERS[2];
    writeCookie('role', user.role);
    writeCookie('demo_user', user.email);
    return ok(config, { role: user.role });
  }

  if (method === 'post' && url === '/auth/logout') {
    clearCookie('role');
    clearCookie('demo_user');
    return ok(config, undefined);
  }

  if (method === 'post' && (url === '/auth/refresh' || url === '/auth/forgot-password' || url === '/auth/reset-password')) {
    return ok(config, undefined);
  }

  if (method === 'post' && url === '/auth/register') {
    const email = String(body.email ?? '');
    if (email && !USERS.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      const user: DemoUser = {
        id: uid('u'),
        email,
        fullName: String(body.fullName ?? 'Новый пользователь'),
        role: 'user',
        phone: body.phone ? String(body.phone) : null,
        group: body.group ? String(body.group) : null,
        avatar: null,
        createdAt: nowISO(),
      };
      USERS.push(user);
      const student = addStudent({ ...body, userId: user.id }, 'pending');
      student.userId = user.id;
    }
    return ok(config, undefined);
  }

  if (method === 'get' && url === '/auth/me') {
    return ok(config, publicUser(currentUser()));
  }

  if (method === 'put' && url === '/auth/me') {
    const user = currentUser();
    if (body.fullName !== undefined) user.fullName = String(body.fullName);
    if (body.phone !== undefined) user.phone = body.phone ? String(body.phone) : null;
    if (body.avatar !== undefined) user.avatar = body.avatar ? String(body.avatar) : null;
    return ok(config, publicUser(user));
  }

  if (method === 'put' && url === '/auth/me/password') {
    return ok(config, undefined);
  }

  if (method === 'get' && url === '/public/stats') {
    const stat = computeStats();
    const byCourse = Object.entries(stat.byCourse)
      .map(([course, count]) => ({ course: Number(course), count }))
      .sort((a, b) => a.course - b.course);
    const bySpecialty = Object.entries(stat.bySpecialty).map(([specialty, count]) => ({ specialty, count }));
    return ok(config, {
      stats: {
        total: stat.total,
        withDebt: stat.withDebt,
        avgAttendance: stat.avgAttendance,
        avgPerformance: stat.avgPerformance,
      },
      byCourse,
      bySpecialty,
    });
  }

  if (method === 'get' && url === '/students/stats') {
    return ok(config, computeStats());
  }

  if (method === 'get' && url === '/students/recent') {
    const recent = approved()
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6);
    return ok(config, recent);
  }

  if (method === 'get' && url === '/students/me') {
    return ok(config, myStudent());
  }

  if (method === 'put' && url === '/students/me') {
    const user = currentUser();
    let student = students.find((s) => s.userId === user.id) ?? null;
    if (!student) {
      student = addStudent({ ...body }, 'pending');
      student.userId = user.id;
    } else {
      student.fullName = String(body.fullName ?? student.fullName);
      student.course = Number(body.course ?? student.course) || student.course;
      student.group = String(body.group ?? student.group);
      student.specialty = String(body.specialty ?? student.specialty);
      student.email = body.email ? String(body.email) : null;
      student.phone = body.phone ? String(body.phone) : null;
      student.status = 'pending';
      student.updatedAt = nowISO();
    }
    return ok(config, student);
  }

  if (method === 'post' && url === '/students/batch-import') {
    const incoming = Array.isArray(body.students) ? (body.students as Body[]) : [];
    let created = 0;
    let skipped = 0;
    for (const item of incoming) {
      const key = `${String(item.fullName ?? '').trim().toLowerCase()}|${String(item.group ?? '').trim().toLowerCase()}`;
      const exists = students.some(
        (s) => `${s.fullName.trim().toLowerCase()}|${s.group.trim().toLowerCase()}` === key,
      );
      if (exists) {
        skipped += 1;
      } else {
        addStudent(item);
        created += 1;
      }
    }
    return ok(config, { created, skipped });
  }

  if (method === 'post' && url === '/students/batch-delete') {
    const ids = new Set((Array.isArray(body.ids) ? body.ids : []).map(String));
    const before = students.length;
    students = students.filter((s) => !ids.has(s.id));
    return ok(config, { deleted: before - students.length });
  }

  if (method === 'post' && url === '/students/batch-update') {
    const ids = new Set((Array.isArray(body.ids) ? body.ids : []).map(String));
    const patch = (body.patch ?? {}) as Partial<Student>;
    let updated = 0;
    students = students.map((s) => {
      if (!ids.has(s.id)) return s;
      updated += 1;
      return { ...s, ...patch, updatedAt: nowISO() };
    });
    return ok(config, { updated });
  }

  if (method === 'post' && url === '/students/batch-export') {
    const ids = Array.isArray(body.ids) ? new Set(body.ids.map(String)) : null;
    const list = ids ? students.filter((s) => ids.has(s.id)) : students;
    return ok(config, list);
  }

  if (method === 'get' && url === '/students') {
    return paginateStudents(config, params);
  }

  if (method === 'delete' && url === '/students') {
    const deleted = students.length;
    students = [];
    return ok(config, { deleted });
  }

  if (method === 'post' && url === '/students') {
    return ok(config, addStudent(body));
  }

  const toggleDebt = url.match(/^\/students\/([^/]+)\/toggle-debt$/);
  if (method === 'patch' && toggleDebt) {
    const student = students.find((s) => s.id === toggleDebt[1]);
    if (!student) return fail(config, 'Студент не найден');
    student.academicDebt = !student.academicDebt;
    student.updatedAt = nowISO();
    return ok(config, student);
  }

  const approve = url.match(/^\/students\/([^/]+)\/approve$/);
  if (method === 'post' && approve) {
    const student = students.find((s) => s.id === approve[1]);
    if (!student) return fail(config, 'Студент не найден');
    student.status = 'approved';
    student.updatedAt = nowISO();
    return ok(config, student);
  }

  const studentMarks = url.match(/^\/students\/([^/]+)\/marks$/);
  if (studentMarks && method === 'get') {
    return ok(config, marksForStudent(studentMarks[1]));
  }
  if (studentMarks && method === 'post') {
    const subject = subjects.find((s) => s.id === String(body.subjectId));
    if (!subject) return fail(config, 'Предмет не найден');
    const record: MarkRecord = {
      id: uid('m'),
      studentId: studentMarks[1],
      subjectId: subject.id,
      mark: Number(body.mark ?? 5),
      createdAt: nowISO(),
      scheduleId: null,
      date: nowISO().slice(0, 10),
    };
    marks.push(record);
    return ok(config, withSubject(record));
  }

  const studentById = url.match(/^\/students\/([^/]+)$/);
  if (studentById) {
    const index = students.findIndex((s) => s.id === studentById[1]);
    if (index === -1) return fail(config, 'Студент не найден');
    if (method === 'put') {
      students[index] = { ...students[index], ...body, id: students[index].id, updatedAt: nowISO() };
      return ok(config, students[index]);
    }
    if (method === 'delete') {
      students.splice(index, 1);
      return ok(config, undefined);
    }
  }

  if (method === 'get' && url === '/groups') {
    const groups = [...new Set(students.map((s) => s.group).filter(Boolean))];
    if (groups.length === 0) groups.push('ИС-21', 'ПО-507', 'ТО-31');
    groups.sort((a, b) => String(a).localeCompare(String(b), 'ru'));
    return ok(config, groups);
  }

  if (method === 'get' && url === '/subjects') {
    return ok(config, subjects);
  }

  if (method === 'post' && url === '/subjects') {
    const name = String(body.name ?? '').trim();
    if (!name) return fail(config, 'Введите название предмета');
    if (subjects.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      return fail(config, 'Такой предмет уже существует');
    }
    const subject: Subject = { id: `sub${subjectSeq++}`, name, createdAt: nowISO() };
    subjects.push(subject);
    return ok(config, subject);
  }

  const subjectById = url.match(/^\/subjects\/([^/]+)$/);
  if (method === 'delete' && subjectById) {
    subjects = subjects.filter((s) => s.id !== subjectById[1]);
    return ok(config, { deleted: true });
  }

  if (method === 'get' && url === '/schedule') {
    const user = currentUser();
    const group = params.group ? String(params.group) : '';
    let list = scheduleEntries;
    if (group) {
      list = list.filter((e) => e.group === group);
    } else if ((user.role === 'curator' || user.role === 'user') && user.group) {
      list = list.filter((e) => e.group === user.group);
    }
    return ok(config, list);
  }

  if (method === 'post' && url === '/schedule') {
    const entry: ScheduleEntry = {
      id: uid('sch'),
      group: String(body.group ?? ''),
      dayOfWeek: Number(body.dayOfWeek ?? 1),
      lessonNumber: Number(body.lessonNumber ?? 1),
      subject: String(body.subject ?? ''),
      teacher: body.teacher ? String(body.teacher) : null,
      room: body.room ? String(body.room) : null,
      week: body.week === 'upper' || body.week === 'lower' ? body.week : null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    scheduleEntries.push(entry);
    return ok(config, entry);
  }

  if (method === 'delete' && url === '/schedule') {
    const group = String(params.group ?? '');
    const before = scheduleEntries.length;
    scheduleEntries = scheduleEntries.filter((e) => e.group !== group);
    return ok(config, { deleted: before - scheduleEntries.length });
  }

  const scheduleById = url.match(/^\/schedule\/([^/]+)$/);
  if (scheduleById) {
    const index = scheduleEntries.findIndex((e) => e.id === scheduleById[1]);
    if (index === -1) return fail(config, 'Запись расписания не найдена');
    if (method === 'put') {
      scheduleEntries[index] = {
        ...scheduleEntries[index],
        ...body,
        id: scheduleEntries[index].id,
        updatedAt: nowISO(),
      };
      return ok(config, scheduleEntries[index]);
    }
    if (method === 'delete') {
      scheduleEntries.splice(index, 1);
      return ok(config, { deleted: true });
    }
  }

  if (method === 'get' && url === '/settings') {
    return ok(config, settings);
  }

  if (method === 'put' && url === '/settings') {
    settings = { semesterStart: String(body.semesterStart ?? settings.semesterStart) };
    return ok(config, settings);
  }

  if (method === 'get' && url === '/journal/summary') {
    const group = String(params.group ?? '');
    const date = String(params.date ?? nowISO().slice(0, 10));
    const day = dayOfWeekOf(date);
    const week = weekOfDate(date, settings.semesterStart);
    const groupSize = approved().filter((s) => s.group === group).length;

    const entries = scheduleEntries
      .filter((e) => e.group === group && e.dayOfWeek === day && (e.week === null || e.week === week))
      .sort((a, b) => a.lessonNumber - b.lessonNumber);

    const lessons: JournalSummaryLesson[] = entries.map((e) => {
      const stored = journalEntries(e.id, date);
      return {
        scheduleId: e.id,
        lessonNumber: e.lessonNumber,
        subject: e.subject,
        teacher: e.teacher,
        room: e.room,
        totalStudents: groupSize,
        marked: stored.filter((x) => x.mark !== null).length,
        present: stored.filter((x) => x.status === 'present' || x.status === 'late').length,
        late: stored.filter((x) => x.status === 'late').length,
        absent: stored.filter((x) => x.status === 'absent').length,
      };
    });

    return respond(config, {
      success: true,
      data: lessons,
      week,
      semesterStart: settings.semesterStart,
    });
  }

  const journalById = url.match(/^\/journal\/([^/]+)$/);
  if (journalById && method === 'get') {
    const date = String(params.date ?? nowISO().slice(0, 10));
    const lesson = lessonFor(journalById[1], date);
    return lesson ? ok(config, lesson) : fail(config, 'Занятие не найдено');
  }

  if (journalById && method === 'put') {
    const date = String(body.date ?? nowISO().slice(0, 10));
    const incoming = Array.isArray(body.entries) ? (body.entries as Body[]) : [];
    const entries: JournalEntry[] = incoming.map((item) => ({
      studentId: String(item.studentId ?? ''),
      mark: item.mark === null || item.mark === '' ? null : Number(item.mark),
      status:
        item.status === 'present' || item.status === 'late' || item.status === 'absent'
          ? item.status
          : null,
      markId: null,
    }));
    const lesson = saveJournal(journalById[1], date, entries);
    return lesson ? ok(config, lesson) : fail(config, 'Занятие не найдено');
  }

  if (method === 'get' && url === '/marks/me') {
    const student = myStudent();
    return ok(config, student ? marksForStudent(student.id) : []);
  }

  const markById = url.match(/^\/marks\/([^/]+)$/);
  if (markById) {
    const index = marks.findIndex((m) => m.id === markById[1]);
    if (index === -1) return fail(config, 'Оценка не найдена');
    if (method === 'put') {
      marks[index] = { ...marks[index], mark: Number(body.mark ?? marks[index].mark) };
      return ok(config, withSubject(marks[index]));
    }
    if (method === 'delete') {
      marks.splice(index, 1);
      return ok(config, { deleted: true });
    }
  }

  if (method === 'get' && url === '/admin/users') {
    return ok(config, USERS.map(publicUser));
  }

  const adminUserId = url.match(/^\/admin\/users\/([^/]+)$/);
  if (method === 'put' && adminUserId) {
    const user = USERS.find((u) => u.id === adminUserId[1]);
    if (!user) return fail(config, 'Пользователь не найден');
    if (body.role === 'admin' || body.role === 'curator' || body.role === 'user') {
      user.role = body.role;
    }
    if (body.group !== undefined) user.group = body.group ? String(body.group) : null;
    return ok(config, publicUser(user));
  }

  if (method === 'get' && url === '/admin/analytics') {
    const stat = computeStats();
    const courses = [...new Set(approved().map((s) => s.course))].sort((a, b) => a - b);
    const byCourse = courses.map((course) => {
      const arr = approved().filter((s) => s.course === course);
      return { course, count: arr.length, withDebt: arr.filter((s) => s.academicDebt).length };
    });
    const bySpecialty = Object.entries(stat.bySpecialty)
      .map(([specialty, count]) => ({ specialty, count }))
      .sort((a, b) => b.count - a.count);
    return ok(config, { stats: { total: stat.total }, byCourse, bySpecialty });
  }

  if (method === 'get' && url === '/audit-logs') {
    let list = auditLogs;
    if (params.entity) list = list.filter((l) => l.entity === params.entity);
    const page = Math.max(1, Number(params.page ?? 1) || 1);
    const limit = Math.max(1, Number(params.limit ?? 50) || 50);
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const logs = list.slice((page - 1) * limit, page * limit);
    return respond(config, { success: true, logs, data: logs, total, page, limit, totalPages });
  }

  if (method === 'delete' && url === '/audit-logs') {
    const deleted = auditLogs.length;
    auditLogs = [];
    return ok(config, { deleted });
  }

  return fail(config, `Демо-режим: ${method.toUpperCase()} ${url} не реализован`);
}

const demoAdapter: AxiosAdapter = async (config) => {
  await wait(config);
  const method = (config.method ?? 'get').toLowerCase();
  const url = (config.url ?? '').split('?')[0];
  const params = (config.params ?? {}) as Params;
  const body = parseBody(config.data);
  return route(config, method, url, params, body);
};

export function installDemo(api: AxiosInstance): void {
  api.defaults.adapter = demoAdapter;

  if (typeof window !== 'undefined') {
    let started = false;
    try {
      started = window.sessionStorage.getItem('demo_started') === '1';
    } catch {
      started = false;
    }
    if (!started && !readCookie('role')) {
      writeCookie('role', USERS[0].role);
      writeCookie('demo_user', USERS[0].email);
    }
    try {
      window.sessionStorage.setItem('demo_started', '1');
    } catch {
      /* приватный режим — не критично */
    }
  }
}
