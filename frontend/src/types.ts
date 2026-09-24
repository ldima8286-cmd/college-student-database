export type StudentStatus = 'pending' | 'approved';

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
  userId?: string | null;
  status?: StudentStatus;
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
export type Role = 'admin' | 'curator' | 'user';

export interface Subject {
  id: string;
  name: string;
  createdAt: string;
}

export interface ScheduleEntry {
  id: string;
  group: string;
  dayOfWeek: number;
  lessonNumber: number;
  subject: string;
  teacher: string | null;
  room: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarkRecord {
  id: string;
  studentId: string;
  subjectId: string;
  subjectName?: string;
  mark: number;
  createdAt: string;
  scheduleId?: string | null;
  date?: string | null;
}

export type AttendanceStatus = 'present' | 'late' | 'absent';

export interface JournalStudentRow {
  studentId: string;
  fullName: string;
  course: number;
  mark: number | null;
  markId: string | null;
  status: AttendanceStatus | null;
}

export interface JournalLesson {
  scheduleId: string;
  group: string;
  dayOfWeek: number;
  lessonNumber: number;
  subject: string;
  teacher: string | null;
  room: string | null;
  date: string;
  students: JournalStudentRow[];
}

export interface JournalSummaryLesson {
  scheduleId: string;
  lessonNumber: number;
  subject: string;
  teacher: string | null;
  room: string | null;
  totalStudents: number;
  marked: number;
  present: number;
  late: number;
  absent: number;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone: string | null;
  group: string | null;
  createdAt: string;
}
