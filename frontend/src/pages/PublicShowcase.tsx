import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Users, TrendingUp, BookOpen, Award,
  LogIn, UserPlus, RefreshCw,
} from 'lucide-react';
import { getPublicStats } from '../api';
import ThemeToggle from '../components/ThemeToggle';

export default function PublicShowcase() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setData(await getPublicStats());
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = data?.stats;
  const maxCourse = Math.max(1, ...(data?.byCourse ?? []).map((c: any) => c.count));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-gradient-to-r from-primary-600 to-primary-500 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-7 h-7" />
              <h1 className="text-lg sm:text-xl font-bold">База данных учащихся</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link to="/login" className="btn bg-white/15 hover:bg-white/25 text-white text-sm flex items-center gap-1">
                <LogIn className="w-4 h-4" /> Войти
              </Link>
              <Link to="/register" className="btn bg-white text-primary-700 hover:bg-gray-100 text-sm flex items-center gap-1">
                <UserPlus className="w-4 h-4" /> Регистрация
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Открытая статистика колледжа
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Сводные данные о контингенте, успеваемости и посещаемости студентов.
            Подробная работа с записями доступна после входа в систему.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
            <button onClick={load} className="btn btn-secondary text-sm flex items-center gap-1.5 mx-auto">
              <RefreshCw className="w-4 h-4" /> Повторить
            </button>
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
          </div>
        )}

        {data && !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <div className="card flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30">
                  <Users className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total ?? 0}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Студентов учтено</p>
                </div>
              </div>
              <div className="card flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.avgPerformance?.toFixed(2) ?? '0.00'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Средняя успеваемость</p>
                </div>
              </div>
              <div className="card flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <BookOpen className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.avgAttendance ?? 0}%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Средняя посещаемость</p>
                </div>
              </div>
              <div className="card flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                  <Award className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.withDebt ?? 0}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">С задолженностью</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">Студенты по курсам</h3>
                {(data.byCourse ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400">Нет данных</p>
                ) : (
                  <div className="space-y-3">
                    {(data.byCourse ?? []).map((c: any) => (
                      <div key={c.course} className="flex items-center gap-3">
                        <span className="w-10 text-sm text-gray-500 dark:text-gray-400">{c.course} курс</span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(c.count / maxCourse) * 100}%` }} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-16 text-right">{c.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">Недавно добавленные</h3>
                {(data.recent ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400">Нет данных</p>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {(data.recent ?? []).map((s: any) => (
                      <li key={s.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{s.fullName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{s.course} курс · {s.group} · {s.specialty}</p>
                        </div>
                        <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                          <p>Успеваемость: {Number(s.performance).toFixed(2)}</p>
                          <p>Посещаемость: {s.attendance}%</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="text-center pb-6">
              <p className="text-gray-500 dark:text-gray-400 mb-4">Хотите увидеть полную базу и управлять записями?</p>
              <div className="flex justify-center gap-3">
                <Link to="/login" className="btn btn-primary">Войти в систему</Link>
                <Link to="/register" className="btn btn-secondary">Создать аккаунт</Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}