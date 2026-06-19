import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { getStudents, deleteStudent, toggleDebt, deleteAllStudents, updateStudent, createStudent } from '../api';
import SearchBar from '../components/SearchBar';
import ImportExport from '../components/ImportExport';

const StudentsManager: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    course: 1,
    group: '',
    specialty: '',
    attendance: 100,
    performance: 4.0,
    academicDebt: false
  });
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const loadStudents = async () => {
    try {
      const res = await getStudents();
      if (res && res.data) {
        setStudents(res.data);
      }
    } catch (err) {
      console.error('Ошибка загрузки студентов', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

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

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFilteredStudents(
      students.filter(s =>
        s.fullName.toLowerCase().includes(term) ||
        s.group.toLowerCase().includes(term) ||
        s.specialty.toLowerCase().includes(term)
      )
    );
  }, [students, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, { ...form, id: editingStudent.id });
      } else {
        await createStudent({ ...form, id: Date.now().toString() });
      }
      setEditingStudent(null);
      loadStudents();
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      alert('Ошибка при сохранении студента');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return alert('Только администратор может удалять');
    if (window.confirm('Удалить студента?')) {
      await deleteStudent(id);
      await loadStudents();
      if (editingStudent?.id === id) setEditingStudent(null);
    }
  };

  const handleToggleDebt = async (id: string) => {
    await toggleDebt(id);
    await loadStudents();
  };

  const handleDeleteAll = async () => {
    if (!isAdmin) return alert('Только администратор');
    if (window.confirm('Удалить всех студентов?')) {
      await deleteAllStudents();
      await loadStudents();
      setEditingStudent(null);
    }
  };

  const getAttendanceClass = (att: number) => {
    if (att >= 90) return 'attendance-good';
    if (att >= 70) return 'attendance-medium';
    return 'attendance-bad';
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="students-manager">
      {/* ===== ЛЕВАЯ ПАНЕЛЬ ===== */}
      <aside className="sidebar">
        <div className="card">
          <h3>{editingStudent ? '✏️ Редактировать студента' : '➕ Добавить студента'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>ФИО</label>
              <input
                required
                value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
                placeholder="Введите ФИО"
              />
            </div>

            <div className="form-group">
              <label>Курс</label>
              <select
                value={form.course}
                onChange={e => setForm({ ...form, course: Number(e.target.value) })}
              >
                <option value={1}>1 курс</option>
                <option value={2}>2 курс</option>
                <option value={3}>3 курс</option>
                <option value={4}>4 курс</option>
              </select>
            </div>

            <div className="form-group">
              <label>Группа</label>
              <input
                required
                value={form.group}
                onChange={e => setForm({ ...form, group: e.target.value })}
                placeholder="Например: ИС-21"
              />
            </div>

            <div className="form-group">
              <label>Специальность</label>
              <input
                required
                value={form.specialty}
                onChange={e => setForm({ ...form, specialty: e.target.value })}
                placeholder="Например: Информационные системы"
              />
            </div>

            <div className="form-group">
              <label>Посещаемость (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={form.attendance}
                onChange={e => setForm({ ...form, attendance: Number(e.target.value) })}
                placeholder="0-100"
                className="no-spinner"
              />
            </div>

            <div className="form-group">
              <label>Успеваемость (средний балл)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                required
                value={form.performance}
                onChange={e => setForm({ ...form, performance: Number(e.target.value) })}
                placeholder="0.0-5.0"
                className="no-spinner"
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={form.academicDebt}
                  onChange={e => setForm({ ...form, academicDebt: e.target.checked })}
                />
                Академическая задолженность
              </label>
            </div>

            <div className="button-group">
              <button type="submit" className="btn btn-primary">
                {editingStudent ? '💾 Сохранить' : '➕ Добавить'}
              </button>
              {editingStudent && (
                <button type="button" className="btn btn-secondary" onClick={() => setEditingStudent(null)}>
                  ❌ Отмена
                </button>
              )}
            </div>
          </form>
        </div>

        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <ImportExport students={students} onImport={loadStudents} />
        {isAdmin && (
          <button className="btn btn-danger" onClick={handleDeleteAll}>
            🗑️ Удалить всех студентов
          </button>
        )}
      </aside>

      {/* ===== ПРАВАЯ ПАНЕЛЬ ===== */}
      <main className="main-content">
        <h2>Список студентов ({filteredStudents.length})</h2>
        {filteredStudents.length === 0 ? (
          <div className="empty-state">
            {students.length === 0 ? '📭 Нет студентов. Добавьте первого!' : '🔍 Ничего не найдено'}
          </div>
        ) : (
          <div className="students-grid">
            {filteredStudents.map(student => {
              const attendanceClass = getAttendanceClass(student.attendance);
              return (
                <div key={student.id} className={`student-card ${student.academicDebt ? 'debt' : ''}`}>
                  <div className="card-header">
                    <div className="student-name">{student.fullName}</div>
                    <div className="card-actions">
                      {isAdmin && (
                        <>
                          <button 
                            className="btn btn-primary btn-sm" 
                            onClick={() => setEditingStudent(student)}
                            title="Редактировать"
                          >
                            📝
                          </button>
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={() => handleDelete(student.id)}
                            title="Удалить"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="details">
                    <div>
                      <span className="detail-label">Курс:</span> {student.course}
                    </div>
                    <div>
                      <span className="detail-label">Группа:</span> {student.group}
                    </div>
                    <div>
                      <span className="detail-label">Специальность:</span> {student.specialty}
                    </div>
                    <div>
                      <span className="detail-label">Посещаемость:</span>
                      <span className={attendanceClass}> {student.attendance}%</span>
                    </div>
                    <div>
                      <span className="detail-label">Успеваемость:</span> {student.performance.toFixed(1)}
                    </div>
                  </div>

                  {student.academicDebt && (
                    <div className="debt-badge">📚 Академическая задолженность</div>
                  )}

                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleToggleDebt(student.id)}
                  >
                    {student.academicDebt ? '✅ Снять задолженность' : '⚠️ Добавить задолженность'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentsManager;