import axios from 'axios';
import { Student } from './types';

const api = axios.create({ baseURL: '/api' });

export const getStudents = () => api.get<Student[]>('/students');
export const createStudent = (student: Student) => api.post('/students', student);
export const updateStudent = (id: string, student: Student) => api.put(`/students/${id}`, student);
export const deleteStudent = (id: string) => api.delete(`/students/${id}`);
export const toggleDebt = (id: string) => api.patch(`/students/${id}/toggle-debt`);
export const deleteAllStudents = () => api.delete('/students');