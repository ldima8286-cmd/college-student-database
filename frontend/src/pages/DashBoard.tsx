import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudents } from '../api';
import { Student } from '../types';

const Dashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState({ total: 0, withDebt: 0, avgAttendance: 0 });
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await getStudents();
        setStudents(res.data);
        
        const total = res.data.length;
        const withDebt = res.data.filter((s: Student) => s.academicDebt).length;
        const avgAttendance = total > 0 
          ? res.data.reduce((acc: number, s: Student) => acc + s.attendance, 0) / total 
          : 0;
        
        setStats({ total, withDebt, avgAttendance });
      } catch (err) {
        console.error('Ошибка загрузки данных', err);
      }
    };
    loadData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🎓 Админ-панель</h1>
        <div className="user-info">
          <span>👤 {user.fullName} ({user.role === 'admin' ? 'Администратор' : 'Преподаватель'})</span>
          <button className="btn btn-secondary" onClick={handleLogout}>Выйти</button>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Всего студентов</h3>
          <div className="stat-number">{stats.total}</div>
        </div>
        <div className="stat-card">
          <h3>С задолженностями</h3>
          <div className="stat-number debt">{stats.withDebt}</div>
        </div>
        <div className="stat-card">
          <h3>Средняя посещаемость</h3>
          <div className="stat-number">{Math.round(stats.avgAttendance)}%</div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="quick-actions">
          <h3>Быстрые действия</h3>
          <div className="action-buttons">
            <button className="btn btn-primary" onClick={() => navigate('/students')}>
              📋 Управление студентами
            </button>
            
            {user.role === 'admin' && (
              <>
                <button className="btn btn-success" onClick={() => navigate('/users')}>
                  👥 Управление пользователями
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/logs')}>
                  📋 Журнал действий
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;