import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Student, StudentStatus, PaginatedResponse, StudentStats, ApiResponse, Role, Subject, ScheduleEntry, ScheduleWeek, MarkRecord, AdminUser, AttendanceStatus, JournalLesson, JournalSummaryLesson, Settings } from './types';

export type { Role };

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,
});

export function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

export function setCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

export function clearLocalCookies(): void {
  document.cookie = 'role=; path=/; max-age=0';
  document.cookie = 'x_csrf=; path=/; max-age=0';
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = (config.method ?? 'get').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = getCookie('x_csrf');
    if (csrf) config.headers['X-CSRF-Token'] = csrf;
  }
  return config;
});

let refreshPromise: Promise<boolean> | null = null;

export async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        await api.post('/auth/refresh', null);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

function handleSessionExpired(): void {
  clearLocalCookies();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const method = (error.config?.method ?? 'get').toUpperCase();
    const cfg = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (status === 401 && !AUTH_PATHS.includes(url) && cfg && !cfg._retried) {
      const ok = await tryRefresh();
      if (ok) {
        cfg._retried = true;
        const csrf = getCookie('x_csrf');
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && csrf) {
          cfg.headers['X-CSRF-Token'] = csrf;
        }
        return api.request(cfg);
      }
      handleSessionExpired();
    }
    return Promise.reject(new Error((error.response?.data as any)?.error || 'Ошибка сети'));
  }
);

export async function login(email: string, password: string): Promise<{ role: Role }> {
  const { data } = await api.post<ApiResponse<{ role: Role }>>('/auth/login', { email, password });
  if (!data.success || !data.data) throw new Error(data.error || 'Ошибка входа');
  return { role: data.data.role };
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout', null);
  } catch {
    /* сеть недоступна — подчищаем локально */
  } finally {
    clearLocalCookies();
  }
}

export async function forgotPassword(email: string): Promise<void> {
  const { data } = await api.post<ApiResponse<void>>('/auth/forgot-password', { email });
  if (!data.success) throw new Error(data.error || 'Ошибка запроса');
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const { data } = await api.post<ApiResponse<void>>('/auth/reset-password', { token, newPassword });
  if (!data.success) throw new Error(data.error || 'Ошибка сброса пароля');
}

export function getRole(): Role | null {
  const role = getCookie('role');
  return role === 'admin' || role === 'curator' || role === 'user' ? role : null;
}

export function isAuthenticated(): boolean {
  return getRole() !== null;
}

export function isAdmin(): boolean {
  return getRole() === 'admin';
}

export function isCurator(): boolean {
  return getRole() === 'curator';
}

export async function getStudents(params: {
  search?: string; page?: number; limit?: number; sortBy?: string;
  sortOrder?: 'asc' | 'desc'; filterDebt?: boolean; filterCourse?: number; status?: StudentStatus;
  signal?: AbortSignal;
}): Promise<PaginatedResponse> {
  const { signal, ...query } = params;
  const { data } = await api.get<PaginatedResponse>('/students', { params: query, signal });
  return data;
}

export async function createStudent(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
  const { data } = await api.post<ApiResponse<Student>>('/students', student);
  if (!data.success || !data.data) throw new Error('Ошибка создания');
  return data.data;
}

export async function updateStudent(id: string, student: Partial<Student>): Promise<Student> {
  const { data } = await api.put<ApiResponse<Student>>(`/students/${id}`, student);
  if (!data.success || !data.data) throw new Error('Ошибка обновления');
  return data.data;
}

export async function deleteStudent(id: string): Promise<void> {
  await api.delete(`/students/${id}`);
}

export async function toggleDebt(id: string): Promise<Student> {
  const { data } = await api.patch<ApiResponse<Student>>(`/students/${id}/toggle-debt`);
  if (!data.success || !data.data) throw new Error('Ошибка');
  return data.data;
}

export async function deleteAllStudents(): Promise<number> {
  const { data } = await api.delete<ApiResponse<{ deleted: number }>>('/students');
  return data.data?.deleted ?? 0;
}

export async function getStats(): Promise<StudentStats> {
  const { data } = await api.get<ApiResponse<StudentStats>>('/students/stats');
  if (!data.success || !data.data) throw new Error('Ошибка загрузки статистики');
  return data.data;
}

export async function getPublicStats(): Promise<any> {
  const { data } = await api.get<ApiResponse<any>>('/public/stats');
  if (!data.success || !data.data) throw new Error('Ошибка загрузки статистики');
  return data.data;
}

export async function getMyStudent(): Promise<Student | null> {
  const { data } = await api.get<ApiResponse<Student | null>>('/students/me');
  if (!data.success) throw new Error(data.error || 'Ошибка загрузки анкеты');
  return data.data ?? null;
}

export async function saveMyStudent(payload: {
  fullName: string; course: number; group: string; specialty: string;
  email?: string | null; phone?: string | null;
}): Promise<Student> {
  const { data } = await api.put<ApiResponse<Student>>('/students/me', payload);
  if (!data.success || !data.data) throw new Error(data.error || 'Ошибка сохранения анкеты');
  return data.data;
}

export async function approveStudent(id: string): Promise<Student> {
  const { data } = await api.post<ApiResponse<Student>>(`/students/${id}/approve`);
  if (!data.success || !data.data) throw new Error(data.error || 'Ошибка одобрения');
  return data.data;
}

export async function getAnalytics(): Promise<any> {
  const { data } = await api.get('/admin/analytics');
  if (!data.success) throw new Error('Ошибка');
  return data.data;
}

export async function register(data: {
  email: string; password: string; fullName: string; phone?: string;
  group: string; course: number; specialty?: string;
}): Promise<void> {
  const res = await api.post<ApiResponse<void>>('/auth/register', data);
  if (!res.data.success) throw new Error(res.data.error || 'Ошибка регистрации');
}

export async function getMe(signal?: AbortSignal): Promise<any> {
  const { data } = await api.get<ApiResponse<any>>('/auth/me', { signal });
  if (!data.success || !data.data) throw new Error('Ошибка загрузки профиля');
  return data.data;
}

export async function updateProfile(data: { fullName: string; phone?: string; avatar?: string | null }): Promise<any> {
  const { data: res } = await api.put<ApiResponse<any>>('/auth/me', data);
  if (!res.success) throw new Error(res.error || 'Ошибка обновления');
  return res.data;
}

export async function changePassword(data: { oldPassword: string; newPassword: string }): Promise<void> {
  const { data: res } = await api.put<ApiResponse<void>>('/auth/me/password', data);
  if (!res.success) throw new Error(res.error || 'Ошибка смены пароля');
}

export async function getAuditLogs(page?: number, limit?: number, entity?: string): Promise<any> {
  const { data } = await api.get('/audit-logs', { params: { page, limit, entity } });
  if (!data.success) throw new Error('Ошибка загрузки журнала');
  return data;
}

export async function clearAuditLogs(): Promise<number> {
  const { data } = await api.delete<ApiResponse<{ deleted: number }>>('/audit-logs');
  if (!data.success) throw new Error(data.error || 'Ошибка очистки журнала');
  return data.data?.deleted ?? 0;
}

export async function batchDeleteStudents(ids: string[]): Promise<void> {
  await api.post('/students/batch-delete', { ids });
}

export async function batchUpdateStudents(ids: string[], patch: Partial<Student>): Promise<number> {
  const { data } = await api.post<ApiResponse<{ updated: number }>>('/students/batch-update', { ids, patch });
  if (!data.success || data.data === undefined) throw new Error('Ошибка обновления');
  return data.data.updated;
}

export async function batchExportStudents(ids?: string[]): Promise<any[]> {
  const { data } = await api.post('/students/batch-export', { ids });
  if (!data.success || !data.data) throw new Error('Ошибка экспорта');
  return data.data;
}

export async function getGroups(): Promise<string[]> {
  const { data } = await api.get<ApiResponse<string[]>>('/groups');
  if (!data.success || !data.data) throw new Error('Ошибка загрузки групп');
  return data.data;
}

export async function listSubjects(): Promise<Subject[]> {
  const { data } = await api.get<ApiResponse<Subject[]>>('/subjects');
  if (!data.success || !data.data) throw new Error('Ошибка загрузки предметов');
  return data.data;
}

export async function createSubject(name: string): Promise<Subject> {
  const { data } = await api.post<ApiResponse<Subject>>('/subjects', { name });
  if (!data.success || !data.data) throw new Error(data.error || 'Ошибка создания предмета');
  return data.data;
}

export async function deleteSubject(id: string): Promise<void> {
  const { data } = await api.delete<ApiResponse<{ deleted: boolean }>>(`/subjects/${id}`);
  if (!data.success) throw new Error(data.error || 'Ошибка удаления предмета');
}

export async function getSchedule(group?: string): Promise<ScheduleEntry[]> {
  const { data } = await api.get<ApiResponse<ScheduleEntry[]>>('/schedule', { params: group ? { group } : {} });
  if (!data.success || !data.data) throw new Error('Ошибка загрузки расписания');
  return data.data;
}

export async function createScheduleEntry(entry: Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleEntry> {
  const { data } = await api.post<ApiResponse<ScheduleEntry>>('/schedule', entry);
  if (!data.success || !data.data) throw new Error(data.error || 'Ошибка сохранения расписания');
  return data.data;
}

export async function updateScheduleEntry(id: string, entry: Partial<Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ScheduleEntry> {
  const { data } = await api.put<ApiResponse<ScheduleEntry>>(`/schedule/${id}`, entry);
  if (!data.success || !data.data) throw new Error(data.error || 'Ошибка обновления расписания');
  return data.data;
}

export async function deleteScheduleEntry(id: string): Promise<void> {
  const { data } = await api.delete<ApiResponse<{ deleted: boolean }>>(`/schedule/${id}`);
  if (!data.success) throw new Error(data.error || 'Ошибка удаления');
}

export async function deleteScheduleByGroup(group: string): Promise<number> {
  const { data } = await api.delete<ApiResponse<{ deleted: number }>>('/schedule', { params: { group } });
  return data.data?.deleted ?? 0;
}

export interface JournalSummaryResult {
  lessons: JournalSummaryLesson[];
  week: ScheduleWeek;
  semesterStart: string;
}

export async function getJournalSummary(group: string, date: string): Promise<JournalSummaryResult> {
  const { data } = await api.get<ApiResponse<JournalSummaryLesson[]>>('/journal/summary', { params: { group, date } });
  if (!data.success || !data.data) throw new Error(data.error || 'Ошибка загрузки журнала');
  const week = (data as any).week as ScheduleWeek;
  const semesterStart = (data as any).semesterStart as string;
  return { lessons: data.data, week: week ?? 'upper', semesterStart: semesterStart ?? '' };
}

export async function getSettings(): Promise<Settings> {
  const { data } = await api.get<ApiResponse<Settings>>('/settings');
  if (!data.success || !data.data) throw new Error(data.error || 'Ошибка загрузки настроек');
  return data.data;
}

export async function updateSemesterStart(semesterStart: string): Promise<Settings> {
  const { data } = await api.put<ApiResponse<Settings>>('/settings', { semesterStart });
  if (!data.success || !data.data) throw new Error(data.error || 'Ошибка сохранения настроек');
  return data.data;
}

export async function getJournalLesson(scheduleId: string, date: string): Promise<JournalLesson> {
  const { data } = await api.get<ApiResponse<JournalLesson>>(`/journal/${scheduleId}`, { params: { date } });
  if (!data.success || !data.data) throw new Error(data.error || 'Ошибка загрузки занятия');
  return data.data;
}

export async function saveJournalLesson(
  scheduleId: string,
  date: string,
  entries: { studentId: string; mark: number | null; status: AttendanceStatus | null }[]
): Promise<JournalLesson> {
  const { data } = await api.put<ApiResponse<JournalLesson>>(`/journal/${scheduleId}`, { date, entries });
  if (!data.success || !data.data) throw new Error(data.error || 'Ошибка сохранения журнала');
  return data.data;
}

export async function getMyMarks(): Promise<MarkRecord[]> {
  const { data } = await api.get<ApiResponse<MarkRecord[]>>('/marks/me');
  if (!data.success || !data.data) throw new Error('Ошибка загрузки оценок');
  return data.data;
}

export async function getStudentMarks(studentId: string): Promise<MarkRecord[]> {
  const { data } = await api.get<ApiResponse<MarkRecord[]>>(`/students/${studentId}/marks`);
  if (!data.success || !data.data) throw new Error('Ошибка загрузки оценок');
  return data.data;
}

export async function addMark(studentId: string, subjectId: string, mark: number): Promise<MarkRecord> {
  const { data } = await api.post<ApiResponse<MarkRecord>>(`/students/${studentId}/marks`, { subjectId, mark });
  if (!data.success || !data.data) throw new Error(data.error || 'Ошибка добавления оценки');
  return data.data;
}

export async function updateMark(markId: string, mark: number): Promise<MarkRecord> {
  const { data } = await api.put<ApiResponse<MarkRecord>>(`/marks/${markId}`, { mark });
  if (!data.success || !data.data) throw new Error(data.error || 'Ошибка обновления оценки');
  return data.data;
}

export async function deleteMark(markId: string): Promise<void> {
  const { data } = await api.delete<ApiResponse<{ deleted: boolean }>>(`/marks/${markId}`);
  if (!data.success) throw new Error(data.error || 'Ошибка удаления оценки');
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<ApiResponse<AdminUser[]>>('/admin/users');
  if (!data.success || !data.data) throw new Error('Ошибка загрузки пользователей');
  return data.data;
}

export async function updateAdminUser(id: string, patch: { role?: Role; group?: string | null }): Promise<AdminUser> {
  const { data } = await api.put<ApiResponse<AdminUser>>(`/admin/users/${id}`, patch);
  if (!data.success || !data.data) throw new Error(data.error || 'Ошибка обновления пользователя');
  return data.data;
}