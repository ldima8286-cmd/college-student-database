export interface Student {
  id: string;
  fullName: string;
  course: number;
  group: string;
  specialty: string;
  attendance: number;   // 0-100
  performance: number;  // 0-5
  academicDebt: boolean;
}