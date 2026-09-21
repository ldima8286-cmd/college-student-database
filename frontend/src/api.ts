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

// Auth
export async function login(password: string, role: Role): Promise<{ token: string; role: Role }> {
  const { data } = await api.post<ApiResponse<{ token: string; role: Role }>>('/auth/login', { password, role });
  if (!data.success || !data.data) throw new Error(data.error || 'Ошибка входа');
  localStorage.setItem('auth_token', data.data.token);
  localStorage.setItem('auth_role', data.data.role);
  return data.data;
}

export async function logout(): Promise<void> {
  try { await api.post('/auth/logout'); } finally {
    localStorage.removeItem('auth_token');
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

// Students (both roles can read)
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

// Admin only
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
