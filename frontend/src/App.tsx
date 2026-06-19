import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentsManager from './pages/StudentsManager';
import UsersManager from './pages/UsersManager';
import LogsPage from './pages/LogsPage';
import './App.css';

// Компонент для защиты маршрутов
const ProtectedRoute = ({ children, adminOnly = false }: { children: JSX.Element; adminOnly?: boolean }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" />;
  
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/students" element={
          <ProtectedRoute>
            <StudentsManager />
          </ProtectedRoute>
        } />
        
        <Route path="/users" element={
          <ProtectedRoute adminOnly>
            <UsersManager />
          </ProtectedRoute>
        } />
        
        <Route path="/logs" element={
          <ProtectedRoute adminOnly>
            <LogsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;