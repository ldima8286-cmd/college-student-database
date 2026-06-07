import { Student } from './types';

const USE_MOCK_DATA = true;

// Хранилище студентов в памяти (для мок-режима)
let mockStudentsStore: Student[] = [
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
  },
  {
    id: '3',
    fullName: 'Сидоров Алексей Владимирович',
    course: 1,
    group: 'ЭВМ-11',
    specialty: 'ЭВМ и системы',
    attendance: 72,
    performance: 3.5,
    academicDebt: false
  }
];

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// GET /students
export const getStudents = async () => {
  if (USE_MOCK_DATA) {
    await delay();
    return { data: [...mockStudentsStore] };
  }
};

export const createStudent = async (student: Student) => {
  if (USE_MOCK_DATA) {
    await delay();
    mockStudentsStore.push({ ...student });
    return { data: student };
  }
};

export const updateStudent = async (id: string, student: Student) => {
  if (USE_MOCK_DATA) {
    await delay();
    const index = mockStudentsStore.findIndex(s => s.id === id);
    if (index !== -1) {
      mockStudentsStore[index] = { ...student, id };
    }
    return { data: student };
  }
};

// DELETE /students/:id
export const deleteStudent = async (id: string) => {
  if (USE_MOCK_DATA) {
    await delay();
    mockStudentsStore = mockStudentsStore.filter(s => s.id !== id);
    return { data: {} };
  }
};

export const toggleDebt = async (id: string) => {
  if (USE_MOCK_DATA) {
    await delay();
    const student = mockStudentsStore.find(s => s.id === id);
    if (student) {
      student.academicDebt = !student.academicDebt;
    }
    return { data: {} };
  }
};

export const deleteAllStudents = async () => {
  if (USE_MOCK_DATA) {
    await delay();
    mockStudentsStore = [];
    return { data: {} };
  }

};