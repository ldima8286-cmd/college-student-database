import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { isAuthenticated, isAdmin } from './api';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import AuditLog from './pages/AuditLog';
import Profile from './pages/Profile';
import Register from './pages/Register';
import PublicShowcase from './pages/PublicShowcase';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin()) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/login" element={
          isAuthenticated() ? <Navigate to={isAdmin() ? '/admin' : '/'} replace /> : <Login />
        } />
        <Route path="/register" element={
          isAuthenticated() ? <Navigate to={isAdmin() ? '/admin' : '/'} replace /> : <Register />
        } />
        <Route path="/public" element={<PublicShowcase />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={
          <ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>
        } />
        <Route path="/admin/audit" element={
          <ProtectedRoute adminOnly><AuditLog /></ProtectedRoute>
        } />
        <Route path="/admin/profile" element={
          <ProtectedRoute><Profile /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
