import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentsManager from './pages/StudentsManager';
import UsersManager from './pages/UsersManager';
import LogsPage from './pages/LogsPage';
import './App.css';

const ProtectedRoute = ({ children, adminOnly = false }: { children: JSX.Element; adminOnly?: boolean }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

// ===== КОМПОНЕНТ НАВИГАЦИИ =====
const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Не показываем навигацию на странице логина
  if (location.pathname === '/login') return null;

  return (
    <nav className="main-nav">
      <button 
        className={`nav-btn ${location.pathname === '/dashboard' ? 'active' : ''}`}
        onClick={() => navigate('/dashboard')}
      >
        📊 Дашборд
      </button>
      <button 
        className={`nav-btn ${location.pathname === '/students' ? 'active' : ''}`}
        onClick={() => navigate('/students')}
      >
        👨‍🎓 Студенты
      </button>
      {isAdmin && (
        <>
          <button 
            className={`nav-btn ${location.pathname === '/users' ? 'active' : ''}`}
            onClick={() => navigate('/users')}
          >
            👥 Пользователи
          </button>
          <button 
            className={`nav-btn ${location.pathname === '/logs' ? 'active' : ''}`}
            onClick={() => navigate('/logs')}
          >
            📋 Логи
          </button>
        </>
      )}
      <button className="nav-btn nav-btn-logout" onClick={handleLogout}>
        🚪 Выйти
      </button>
    </nav>
  );
};

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <HashRouter>
      <div className="app">
        <header className="app-header">
          <h1>🎓 База данных учащихся колледжа</h1>
          <div className="header-actions">
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'light' ? '🌙 Тёмная' : '☀️ Светлая'}
            </button>
          </div>
        </header>
        
        <Navigation />

        <main className="app-body">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/students" element={<ProtectedRoute><StudentsManager /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute adminOnly><UsersManager /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute adminOnly><LogsPage /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;