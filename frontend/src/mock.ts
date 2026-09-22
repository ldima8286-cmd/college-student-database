import { Student, StudentStats, PaginatedResponse } from './types';

const delay = (ms = 200) => new Promise((res) => setTimeout(res, ms + Math.random() * 200));

let idCounter = 100;

const now = new Date().toISOString();

let students: Student[] = [
  { id: '1', fullName: 'Иванов Иван Иванович', course: 2, group: 'ПРИ-21', specialty: 'Программирование', attendance: 95, performance: 4.8, academicDebt: false, email: 'ivanov.ii@student.local', phone: '+7 (912) 345-67-89', createdAt: now, updatedAt: now },
  { id: '2', fullName: 'Петрова Анна Сергеевна', course: 3, group: 'ИС-31', specialty: 'Информационные системы', attendance: 92, performance: 4.5, academicDebt: false, email: 'petrova.as@student.local', phone: '+7 (903) 111-22-33', createdAt: now, updatedAt: now },
  { id: '3', fullName: 'Сидоров Алексей Владимирович', course: 1, group: 'ПРИ-11', specialty: 'Программирование', attendance: 71, performance: 3.2, academicDebt: true, email: 'sidorov.av@student.local', phone: '+7 (921) 444-55-66', createdAt: now, updatedAt: now },
  { id: '4', fullName: 'Козлова Мария Дмитриевна', course: 2, group: 'ВД-21', specialty: 'Веб-дизайн и разработка', attendance: 88, performance: 4.1, academicDebt: false, email: 'kozlova.md@student.local', phone: '+7 (905) 777-88-99', createdAt: now, updatedAt: now },
  { id: '5', fullName: 'Николаев Дмитрий Олегович', course: 4, group: 'ЭВМ-41', specialty: 'ЭВМ и сети', attendance: 64, performance: 3.0, academicDebt: true, email: 'nikolaev.do@student.local', phone: '+7 (916) 123-45-67', createdAt: now, updatedAt: now },
  { id: '6', fullName: 'Смирнов Николай Павлович', course: 1, group: 'ИС-11', specialty: 'Информационные системы', attendance: 97, performance: 4.9, academicDebt: false, email: 'smirnov.np@student.local', phone: '+7 (909) 222-33-44', createdAt: now, updatedAt: now },
  { id: '7', fullName: 'Волкова Екатерина Андреевна', course: 3, group: 'ВД-31', specialty: 'Веб-дизайн и разработка', attendance: 84, performance: 3.9, academicDebt: false, email: 'volkova.ea@student.local', phone: '+7 (911) 555-66-77', createdAt: now, updatedAt: now },
  { id: '8', fullName: 'Морозов Артём Игоревич', course: 2, group: 'ЭВМ-21', specialty: 'ЭВМ и сети', attendance: 76, performance: 3.5, academicDebt: false, email: 'morozov.ai@student.local', phone: '+7 (918) 888-99-00', createdAt: now, updatedAt: now },
  { id: '9', fullName: 'Соколова Ольга Викторовна', course: 4, group: 'ПРИ-41', specialty: 'Программирование', attendance: 90, performance: 4.4, academicDebt: false, email: 'sokolova.ov@student.local', phone: '+7 (900) 333-44-55', createdAt: now, updatedAt: now },
  { id: '10', fullName: 'Кузнецов Сергей Михайлович', course: 1, group: 'ЭВМ-11', specialty: 'ЭВМ и сети', attendance: 68, performance: 3.1, academicDebt: true, email: 'kuznetsov.sm@student.local', phone: '+7 (902) 777-88-00', createdAt: now, updatedAt: now },
  { id: '11', fullName: 'Павлова Наталья Сергеевна', course: 3, group: 'ПРИ-31', specialty: 'Программирование', attendance: 93, performance: 4.7, academicDebt: false, email: 'pavlova.ns@student.local', phone: '+7 (904) 111-99-22', createdAt: now, updatedAt: now },
  { id: '12', fullName: 'Фёдоров Илья Андреевич', course: 2, group: 'ИС-21', specialty: 'Информационные системы', attendance: 82, performance: 3.8, academicDebt: false, email: 'fedorov.ia@student.local', phone: '+7 (915) 555-11-77', createdAt: now, updatedAt: now },
  { id: '13', fullName: 'Лебедева Дарья Константиновна', course: 4, group: 'ИС-41', specialty: 'Информационные системы', attendance: 89, performance: 4.2, academicDebt: true, email: 'lebedeva.dk@student.local', phone: '+7 (920) 666-22-88', createdAt: now, updatedAt: now },
  { id: '14', fullName: 'Ершов Максим Денисович', course: 1, group: 'ВД-11', specialty: 'Веб-дизайн и разработка', attendance: 79, performance: 3.6, academicDebt: false, email: 'ershov.md@student.local', phone: '+7 (907) 333-77-11', createdAt: now, updatedAt: now },
];

let auditLogs: any[] = [
  { id: 'l1', action: 'login', entity: 'user', entityId: '1', userEmail: 'admin@college.local', timestamp: now },
  { id: 'l2', action: 'create', entity: 'student', entityId: '1', userEmail: 'admin@college.local', timestamp: now },
  { id: 'l3', action: 'update', entity: 'student', entityId: '2', userEmail: 'admin@college.local', timestamp: now },
  { id: 'l4', action: 'delete', entity: 'student', entityId: '5', userEmail: 'admin@college.local', timestamp: now },
];

interface MockUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'admin' | 'user';
  avatar: string | null;
}

let currentUser: MockUser = {
  id: '1',
  email: 'admin@college.local',
  fullName: 'Администратор системы',
  phone: '+7 (900) 000-00-00',
  role: 'admin',
  avatar: null,
};

function makeStudent(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Student {
  return {
    ...data,
    id: String(++idCounter),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function computeStats(list: Student[]): StudentStats {
  const total = list.length;
  const withDebt = list.filter((s) => s.academicDebt).length;
  const avgAttendance = total ? Math.round(list.reduce((a, s) => a + s.attendance, 0) / total) : 0;
  const avgPerformance = total ? list.reduce((a, s) => a + s.performance, 0) / total : 0;
  const byCourse: Record<number, number> = {};
  const bySpecialty: Record<string, number> = {};
  const courseMap = new Map<number, { count: number; perf: number; att: number }>();
  for (const s of list) {
    byCourse[s.course] = (byCourse[s.course] ?? 0) + 1;
    bySpecialty[s.specialty] = (bySpecialty[s.specialty] ?? 0) + 1;
    const c = courseMap.get(s.course) ?? { count: 0, perf: 0, att: 0 };
    c.count += 1;
    c.perf += s.performance;
    c.att += s.attendance;
    courseMap.set(s.course, c);
  }
  const byCourseStats = [...courseMap.entries()].map(([course, c]) => ({
    course,
    count: c.count,
    avgPerformance: c.perf / c.count,
    avgAttendance: Math.round(c.att / c.count),
  }));
  return { total, withDebt, avgAttendance, avgPerformance, byCourse, byCourseStats, bySpecialty };
}

export async function login(email: string): Promise<{ token: string; role: 'admin' | 'user' }> {
  await delay(300);
  const role = email.toLowerCase().includes('admin') ? 'admin' : 'user';
  currentUser = {
    ...currentUser,
    email: email.toLowerCase(),
    role,
    fullName: role === 'admin' ? 'Администратор системы' : 'Пользователь',
  };
  localStorage.setItem('auth_token', 'mock-token');
  localStorage.setItem('auth_refresh_token', 'mock-refresh-token');
  localStorage.setItem('auth_role', role);
  auditLogs.unshift({ id: `l${Date.now()}`, action: 'login', entity: 'user', entityId: currentUser.id, userEmail: currentUser.email, timestamp: new Date().toISOString() });
  return { token: 'mock-token', role };
}

export async function logout(): Promise<void> {
  await delay(50);
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_refresh_token');
  localStorage.removeItem('auth_role');
}

export async function register(): Promise<void> {
  await delay(300);
}

export async function getMe(): Promise<MockUser> {
  await delay(150);
  return { ...currentUser };
}

export async function updateProfile(data: { fullName: string; phone?: string; avatar?: string }): Promise<MockUser> {
  await delay(200);
  currentUser = { ...currentUser, ...data, phone: data.phone ?? null, avatar: data.avatar ?? null };
  return { ...currentUser };
}

export async function changePassword(data: { oldPassword: string; newPassword: string }): Promise<void> {
  await delay(200);
  if (!data.newPassword || data.newPassword.length < 6) {
    throw new Error('Минимум 6 символов');
  }
}

export async function refreshToken(): Promise<string> {
  await delay(100);
  localStorage.setItem('auth_token', 'mock-token');
  return 'mock-token';
}

export async function getStudents(params: {
  search?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc';
  filterDebt?: boolean; filterCourse?: number;
}): Promise<PaginatedResponse> {
  await delay(250);
  let list = [...students];
  const { search, sortBy = 'fullName', sortOrder = 'asc', filterDebt, filterCourse, limit = 20 } = params;
  const q = (search ?? '').trim().toLowerCase();
  if (q) {
    list = list.filter((s) =>
      s.fullName.toLowerCase().includes(q) ||
      s.group.toLowerCase().includes(q) ||
      s.specialty.toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q) ||
      (s.phone ?? '').toLowerCase().includes(q)
    );
  }
  if (filterDebt !== undefined) list = list.filter((s) => s.academicDebt === filterDebt);
  if (filterCourse !== undefined) list = list.filter((s) => s.course === filterCourse);
  const dir = sortOrder === 'desc' ? -1 : 1;
  list.sort((a, b) => {
    const av = a[sortBy as keyof Student];
    const bv = b[sortBy as keyof Student];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av ?? '').localeCompare(String(bv ?? ''), 'ru') * dir;
  });
  const total = list.length;
  const page = params.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return { success: true, data: list.slice(start, start + limit), total, page, limit, totalPages };
}

export async function getStudentById(id: string): Promise<Student> {
  await delay(100);
  const student = students.find((s) => s.id === id);
  if (!student) throw new Error('Студент не найден');
  return { ...student };
}

export async function createStudent(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
  await delay(250);
  const created = makeStudent(student);
  students.unshift(created);
  auditLogs.unshift({ id: `l${Date.now()}`, action: 'create', entity: 'student', entityId: created.id, userEmail: currentUser.email, timestamp: new Date().toISOString() });
  return { ...created };
}

export async function updateStudent(id: string, patch: Partial<Student>): Promise<Student> {
  await delay(250);
  const idx = students.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error('Студент не найден');
  students[idx] = { ...students[idx], ...patch, id, updatedAt: new Date().toISOString() };
  auditLogs.unshift({ id: `l${Date.now()}`, action: 'update', entity: 'student', entityId: id, userEmail: currentUser.email, timestamp: new Date().toISOString() });
  return { ...students[idx] };
}

export async function deleteStudent(id: string): Promise<void> {
  await delay(200);
  students = students.filter((s) => s.id !== id);
  auditLogs.unshift({ id: `l${Date.now()}`, action: 'delete', entity: 'student', entityId: id, userEmail: currentUser.email, timestamp: new Date().toISOString() });
}

export async function toggleDebt(id: string): Promise<Student> {
  await delay(200);
  const idx = students.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error('Студент не найден');
  students[idx] = { ...students[idx], academicDebt: !students[idx].academicDebt, updatedAt: new Date().toISOString() };
  return { ...students[idx] };
}

export async function deleteAllStudents(): Promise<number> {
  await delay(250);
  const count = students.length;
  students = [];
  return count;
}

export async function getStats(): Promise<StudentStats> {
  await delay(200);
  return computeStats(students);
}

export async function getAnalytics(): Promise<any> {
  await delay(250);
  const stats = computeStats(students);
  const courseMap = new Map<number, { count: number; withDebt: number }>();
  for (const s of students) {
    const c = courseMap.get(s.course) ?? { count: 0, withDebt: 0 };
    c.count += 1;
    if (s.academicDebt) c.withDebt += 1;
    courseMap.set(s.course, c);
  }
  const byCourse = [...courseMap.entries()]
    .map(([course, c]) => ({ course, count: c.count, withDebt: c.withDebt }))
    .sort((a, b) => a.course - b.course);
  const bySpecialtyObj: Record<string, number> = {};
  for (const s of students) bySpecialtyObj[s.specialty] = (bySpecialtyObj[s.specialty] ?? 0) + 1;
  const bySpecialty = Object.entries(bySpecialtyObj)
    .map(([specialty, count]) => ({ specialty, count }))
    .sort((a, b) => b.count - a.count);
  return { stats, byCourse, bySpecialty };
}

export async function getAuditLogs(page: number = 1, limit: number = 50, entity?: string): Promise<{ logs: any[]; total: number; totalPages: number }> {
  await delay(200);
  let list = auditLogs;
  if (entity) list = list.filter((l) => l.entity === entity);
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return { logs: list.slice(start, start + limit), total, totalPages };
}

export async function batchDeleteStudents(ids: string[]): Promise<void> {
  await delay(250);
  students = students.filter((s) => !ids.includes(s.id));
}

export async function batchUpdateStudents(ids: string[], patch: Partial<Student>): Promise<number> {
  await delay(250);
  let updated = 0;
  students = students.map((s) => {
    if (ids.includes(s.id)) {
      updated += 1;
      return { ...s, ...patch, id: s.id, updatedAt: new Date().toISOString() };
    }
    return s;
  });
  return updated;
}

export async function batchExportStudents(ids?: string[]): Promise<Student[]> {
  await delay(200);
  if (ids && ids.length > 0) return students.filter((s) => ids.includes(s.id)).map((s) => ({ ...s }));
  return students.map((s) => ({ ...s }));
}