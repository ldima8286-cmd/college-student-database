import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Mail, Send, AlertCircle, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '../api';
import { toast } from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Введите email'); return; }
    try {
      setLoading(true);
      setError('');
      await forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Ошибка');
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Восстановление пароля</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Укажите email, на который придёт ссылка для сброса</p>
        </div>

        {sent ? (
          <div className="card text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
              <Send className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Если аккаунт с таким email существует, мы отправили на него ссылку для сброса пароля (действует 15 минут).
            </p>
            <Link to="/login" className="btn btn-primary w-full">Вернуться ко входу</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card">
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <div className="mb-4">
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className="input pl-10"
                  placeholder="user@example.com"
                  autoFocus
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full flex items-center justify-center gap-2">
              {loading ? (
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {loading ? 'Отправка...' : 'Отправить ссылку'}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Назад ко входу</Link>
        </p>
      </div>
    </div>
  );
}