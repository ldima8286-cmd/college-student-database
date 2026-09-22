import axios from 'axios';
import { Student, PaginatedResponse, StudentStats, ApiResponse } from './types';

export type Role = 'admin' | 'user';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_role');
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(new Error(error.response?.data?.error || 'Ошибка сети'));
  }
);

export async function login(email: string, password: string): Promise<{ token: string; role: Role }> {
  const { data } = await api.post<ApiResponse<{ accessToken: string; refreshToken: string; role: Role }>>('/auth/login', { email, password });
  if (!data.success || !data.data) throw new Error(data.error || 'Ошибка входа');
  localStorage.setItem('auth_token', data.data.accessToken);
  localStorage.setItem('auth_refresh_token', data.data.refreshToken);
  localStorage.setItem('auth_role', data.data.role);
  return { token: data.data.accessToken, role: data.data.role };
}

export async function logout(): Promise<void> {
  try { await api.post('/auth/logout'); } finally {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_role');
  }
}

export function getRole(): Role | null {
  return (localStorage.getItem('auth_role') as Role) || null;
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('auth_token');
}

export function isAdmin(): boolean {
  return getRole() === 'admin';
}

export async function getStudents(params: {
  search?: string; page?: number; limit?: number; sortBy?: string;
  sortOrder?: 'asc' | 'desc'; filterDebt?: boolean; filterCourse?: number;
}): Promise<PaginatedResponse> {
  const { data } = await api.get<PaginatedResponse>('/students', { params });
  return data;
}

export async function getStudentById(id: string): Promise<Student> {
  const { data } = await api.get<ApiResponse<Student>>(`/students/${id}`);
  if (!data.success || !data.data) throw new Error('Студент не найден');
  return data.data;
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

export async function getAnalytics(): Promise<any> {
  const { data } = await api.get('/admin/analytics');
  if (!data.success) throw new Error('Ошибка');
  return data.data;
}

export async function register(data: { email: string; password: string; fullName: string; phone?: string }): Promise<void> {
  const res = await api.post<ApiResponse<void>>('/auth/register', data);
  if (!res.data.success) throw new Error(res.data.error || 'Ошибка регистрации');
}

export async function getMe(): Promise<any> {
  const { data } = await api.get<ApiResponse<any>>('/auth/me');
  if (!data.success || !data.data) throw new Error('Ошибка загрузки профиля');
  return data.data;
}

export async function updateProfile(data: { fullName: string; phone?: string; avatar?: string }): Promise<any> {
  const { data: res } = await api.put<ApiResponse<any>>('/auth/me', data);
  if (!res.success) throw new Error(res.error || 'Ошибка обновления');
  return res.data;
}

export async function changePassword(data: { oldPassword: string; newPassword: string }): Promise<void> {
  const { data: res } = await api.put<ApiResponse<void>>('/auth/me/password', data);
  if (!res.success) throw new Error(res.error || 'Ошибка смены пароля');
}

export async function refreshToken(): Promise<string> {
  const refreshToken = localStorage.getItem('auth_refresh_token');
  if (!refreshToken) throw new Error('Нет refresh-токена');
  const { data } = await api.post<ApiResponse<{ token: string; role: string }>>('/auth/refresh', { refreshToken });
  if (!data.success || !data.data) throw new Error('Ошибка обновления токена');
  localStorage.setItem('auth_token', data.data.token);
  localStorage.setItem('auth_role', data.data.role);
  return data.data.token;
}

export async function getAuditLogs(page?: number, limit?: number, entity?: string): Promise<any> {
  const { data } = await api.get('/audit-logs', { params: { page, limit, entity } });
  if (!data.success) throw new Error('Ошибка загрузки журнала');
  return data.data;
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
