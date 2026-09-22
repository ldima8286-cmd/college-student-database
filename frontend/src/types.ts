export interface Student {
  id: string;
  fullName: string;
  course: number;
  group: string;
  specialty: string;
  attendance: number;
  performance: number;
  academicDebt: boolean;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentStats {
  total: number;
  withDebt: number;
  avgAttendance: number;
  avgPerformance: number;
  byCourse: Record<number, number>;
  byCourseStats: { course: number; count: number; avgPerformance: number; avgAttendance: number }[];
  bySpecialty: Record<string, number>;
}

export interface PaginatedResponse {
  success: boolean;
  data: Student[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type SortField = 'fullName' | 'course' | 'group' | 'specialty' | 'attendance' | 'performance' | 'createdAt';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'table' | 'cards';
