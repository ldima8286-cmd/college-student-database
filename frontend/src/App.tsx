import { Suspense, useEffect } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { isAuthenticated, isAdmin, getRole, tryRefresh } from './api';
import { retryableLazy } from './components/RetryableLazy';
import type { Role } from './types';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

const AdminPanel = retryableLazy(() => import('./pages/AdminPanel'));
const AuditLog = retryableLazy(() => import('./pages/AuditLog'));
const Profile = retryableLazy(() => import('./pages/Profile'));
const Register = retryableLazy(() => import('./pages/Register'));
const PublicShowcase = retryableLazy(() => import('./pages/PublicShowcase'));
const ForgotPassword = retryableLazy(() => import('./pages/ForgotPassword'));
const ResetPassword = retryableLazy(() => import('./pages/ResetPassword'));
const ScheduleManager = retryableLazy(() => import('./pages/admin/ScheduleManager'));
const SubjectsManager = retryableLazy(() => import('./pages/admin/SubjectsManager'));
const UsersManager = retryableLazy(() => import('./pages/admin/UsersManager'));
const CuratorPanel = retryableLazy(() => import('./pages/CuratorPanel'));
const StudentDiary = retryableLazy(() => import('./pages/StudentDiary'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-gray-600 border-t-transparent" />
    </div>
  );
}

function ProtectedRoute({ children, role }: { children: ReactNode; role?: Role }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  const current = getRole();
  if (role === 'admin' && !isAdmin()) return <Navigate to="/" replace />;
  if (role === 'curator' && current !== 'curator') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RoleSync() {
  useEffect(() => {
    if (isAuthenticated()) void tryRefresh();
  }, []);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <RoleSync />
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/diary" element={
            <ProtectedRoute role="user"><StudentDiary /></ProtectedRoute>
          } />
          <Route path="/curator" element={
            <ProtectedRoute role="curator"><CuratorPanel /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute role="admin"><AdminPanel /></ProtectedRoute>
          } />
          <Route path="/admin/audit" element={
            <ProtectedRoute role="admin"><AuditLog /></ProtectedRoute>
          } />
          <Route path="/admin/schedule" element={
            <ProtectedRoute role="admin"><ScheduleManager /></ProtectedRoute>
          } />
          <Route path="/admin/subjects" element={
            <ProtectedRoute role="admin"><SubjectsManager /></ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute role="admin"><UsersManager /></ProtectedRoute>
          } />
          <Route path="/admin/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}