import axios from 'axios';
import { Student } from './types';

// Добавляем заглушку для данных, если бэкенд недоступен
const USE_MOCK_DATA = true; // Включаем тестовые данные

const api = axios.create({ baseURL: '/api' });

export const getStudents = async () => {
  if (USE_MOCK_DATA) {
    // Возвращаем тестовые данные вместо запроса к бэкенду
    return { data: mockStudents };
  }
  return api.get('/students');
};

// Тестовые данные для демонстрации
const mockStudents: Student[] = [
  {
    id: '1',
    fullName: 'Иванов Иван Иванович',
    course: 2,
    group: 'ИС-21',
    specialty: 'Информационные системы',
    attendance: 95,
    performance: 4.8,
    academicDebt: false
  },
  {
    id: '2',
    fullName: 'Петрова Анна Сергеевна',
    course: 3,
    group: 'ПКС-31',
    specialty: 'Программирование',
    attendance: 87,
    performance: 4.2,
    academicDebt: true
  }
];

// Остальные функции тоже оборачиваем в мок-режим
export const createStudent = async (student: Student) => {
  if (USE_MOCK_DATA) {
    console.log('Mock: создан студент', student);
    return { data: student };
  }
  return api.post('/students', student);
};

export const updateStudent = async (id: string, student: Student) => {
  if (USE_MOCK_DATA) {
    console.log('Mock: обновлён студент', id, student);
    return { data: student };
  }
  return api.put(`/students/${id}`, student);
};

export const deleteStudent = async (id: string) => {
  if (USE_MOCK_DATA) {
    console.log('Mock: удалён студент', id);
    return { data: {} };
  }
  return api.delete(`/students/${id}`);
};

export const toggleDebt = async (id: string) => {
  if (USE_MOCK_DATA) {
    console.log('Mock: переключён долг у студента', id);
    return { data: {} };
  }
  return api.patch(`/students/${id}/toggle-debt`);
};

export const deleteAllStudents = async () => {
  if (USE_MOCK_DATA) {
    console.log('Mock: удалены все студенты');
    return { data: {} };
  }
  return api.delete('/students');
};