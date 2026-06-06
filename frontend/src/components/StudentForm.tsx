import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { createStudent, updateStudent } from '../api';

interface Props {
  editingStudent: Student | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const StudentForm: React.FC<Props> = ({ editingStudent, onSuccess, onCancel }) => {
  const [form, setForm] = useState<Omit<Student, 'id'>>({
    fullName: '',
    course: 1,
    group: '',
    specialty: '',
    attendance: 100,
    performance: 4.0,
    academicDebt: false
  });

  useEffect(() => {
    if (editingStudent) {
      const { id, ...rest } = editingStudent;
      setForm(rest);
    } else {
      setForm({
        fullName: '',
        course: 1,
        group: '',
        specialty: '',
        attendance: 100,
        performance: 4.0,
        academicDebt: false
      });
    }
  }, [editingStudent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      await updateStudent(editingStudent.id, { ...form, id: editingStudent.id });
    } else {
      await createStudent({ ...form, id: Date.now().toString() });
    }
    onSuccess();
  };

  return (
    <div className="card">
      <h3>{editingStudent ? '✏️ Редактировать' : '➕ Добавить студента'}</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>ФИО</label>
          <input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Курс</label>
          <select value={form.course} onChange={e => setForm({ ...form, course: Number(e.target.value) })}>
            {[1,2,3,4].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Группа</label>
          <input required value={form.group} onChange={e => setForm({ ...form, group: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Специальность</label>
          <input required value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Посещаемость % (0-100)</label>
          <input type="number" min="0" max="100" required value={form.attendance} onChange={e => setForm({ ...form, attendance: Number(e.target.value) })} />
        </div>
        <div className="form-group">
          <label>Успеваемость (0-5)</label>
          <input type="number" step="0.1" min="0" max="5" required value={form.performance} onChange={e => setForm({ ...form, performance: Number(e.target.value) })} />
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', gap: '8px' }}>
            <input type="checkbox" checked={form.academicDebt} onChange={e => setForm({ ...form, academicDebt: e.target.checked })} />
            Академическая задолженность
          </label>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className="btn btn-primary">{editingStudent ? 'Сохранить' : 'Добавить'}</button>
          {editingStudent && <button type="button" className="btn btn-secondary" onClick={onCancel}>Отмена</button>}
        </div>
      </form>
    </div>
  );
};

export default StudentForm;