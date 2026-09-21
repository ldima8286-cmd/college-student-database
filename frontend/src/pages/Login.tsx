import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, LogIn, AlertCircle, User, Shield, Eye, EyeOff } from 'lucide-react';
import { login, Role } from '../api';
import { toast } from 'react-hot-toast';

export default function Login() {
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) { setError('Введите пароль'); return; }
    try {
      setLoading(true);
      setError('');
      const result = await login(password, role);
      toast.success(`Вход как ${result.role === 'admin' ? 'администратор' : 'пользователь'}`);
      navigate(result.role === 'admin' ? '/admin' : '/');
    } catch (err: any) {
      setError(err.message || 'Неверный пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 mb-4">
            <GraduationCap className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">База данных учащихся</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Войдите для доступа к системе</p>
        </div>

        <form onSubmit={handleSubmit} className="card">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="label">Роль</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                  role === 'user'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <User className="w-4 h-4" />
                Пользователь
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                  role === 'admin'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Shield className="w-4 h-4" />
                Администратор
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="label">Пароль</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="input pl-10 pr-10"
                placeholder="Введите пароль"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="mt-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 space-y-1">
          <p><strong>Пользователь:</strong> user123</p>
          <p><strong>Администратор:</strong> admin123</p>
        </div>
      </div>
    </div>
  );
}
