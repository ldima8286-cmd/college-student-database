export interface Student {
  id: string;
  fullName: string;
  course: number;
  group: string;
  specialty: string;
  attendance: number;
  performance: number;
  academicDebt: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentStats {
  total: number;
  withDebt: number;
  avgAttendance: number;
  avgPerformance: number;
  byCourse: Record<number, number>;
  bySpecialty: Record<string, number>;
}

export interface PaginatedResponse<T> {
  data: T[];
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
