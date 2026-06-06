import React, { useEffect, useState } from 'react';
import { Student } from './types';
import { getStudents, deleteStudent, toggleDebt, deleteAllStudents } from './api';
import StudentForm from './components/StudentForm';
import StudentCard from './components/StudentCard';
import SearchBar from './components/SearchBar';
import ThemeToggle from './components/ThemeToggle';
import ImportExport from './components/ImportExport';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadStudents = async () => {
    try {
      const res = await getStudents();
      setStudents(res.data);
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

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

  const handleDelete = async (id: string) => {
    if (confirm('Удалить студента?')) {
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
    if (confirm('Удалить ВСЕХ студентов? Это необратимо.')) {
      await deleteAllStudents();
      await loadStudents();
      setEditingStudent(null);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
  };

  const handleFormSuccess = () => {
    loadStudents();
    setEditingStudent(null);
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎓 База данных учащихся колледжа</h1>
        <ThemeToggle />
      </header>

      <div className="app-layout">
        <aside className="sidebar">
          <StudentForm
            editingStudent={editingStudent}
            onSuccess={handleFormSuccess}
            onCancel={() => setEditingStudent(null)}
          />
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <ImportExport students={students} onImport={loadStudents} />
          <button className="btn btn-danger" onClick={handleDeleteAll}>
            🗑️ Удалить всех студентов
          </button>
        </aside>

        <main className="main-content">
          <h2>Список студентов ({filteredStudents.length})</h2>
          {filteredStudents.length === 0 ? (
            <div className="empty-state">Нет студентов по вашему запросу</div>
          ) : (
            <div className="students-grid">
              {filteredStudents.map(student => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleDebt={handleToggleDebt}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;