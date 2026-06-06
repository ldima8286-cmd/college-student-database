import React from 'react';
import { Student } from '../types';

interface Props {
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onToggleDebt: (id: string) => void;
}

const getAttendanceClass = (att: number) => {
  if (att >= 90) return 'attendance-good';
  if (att >= 70) return 'attendance-medium';
  return 'attendance-bad';
};

const StudentCard: React.FC<Props> = ({ student, onEdit, onDelete, onToggleDebt }) => {
  return (
    <div className={`card ${student.academicDebt ? 'debt' : ''}`}>
      <div className="card-header">
        <div className="student-name">{student.fullName}</div>
        <div className="card-actions">
          <button className="btn btn-primary" onClick={() => onEdit(student)}>📝</button>
          <button className="btn btn-danger" onClick={() => onDelete(student.id)}>🗑️</button>
        </div>
      </div>
      <div className="details">
        <div><span className="detail-label">Курс:</span> {student.course}</div>
        <div><span className="detail-label">Группа:</span> {student.group}</div>
        <div><span className="detail-label">Специальность:</span> {student.specialty}</div>
        <div><span className="detail-label">Посещаемость:</span> <span className={getAttendanceClass(student.attendance)}>{student.attendance}%</span></div>
        <div><span className="detail-label">Успеваемость:</span> {student.performance.toFixed(1)}</div>
      </div>
      {student.academicDebt && <div className="debt-badge">📚 Академическая задолженность</div>}
      <button className="btn btn-secondary" style={{ marginTop: '12px', width: '100%' }} onClick={() => onToggleDebt(student.id)}>
        {student.academicDebt ? '✅ Снять задолженность' : '⚠️ Добавить задолженность'}
      </button>
    </div>
  );
};

export default StudentCard;