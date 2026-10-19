import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Users, TrendingUp, BookOpen, Award,
  LogIn, UserPlus, RefreshCw,
} from 'lucide-react';
import { getPublicStats, getRecentStudents, isAuthenticated } from '../api';
import ThemeToggle from '../components/ThemeToggle';

export default function PublicShowcase() {
  const [data, setData] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setData(await getPublicStats());
      // Список студентов не входит в публичные агрегаты: ФИО и группы
      // показываются только авторизованному пользователю.
      setRecent(isAuthenticated() ? await getRecentStudents() : []);
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = data?.stats;
  const maxCourse = Math.max(1, ...(data?.byCourse ?? []).map((c: any) => c.count));

  const cards = [
    { icon: Users, label: 'Студентов учтено', value: stats?.total ?? 0, color: 'text-primary-600 dark:text-primary-400' },
    { icon: TrendingUp, label: 'Средняя успеваемость', value: stats?.avgPerformance?.toFixed(2) ?? '0.00', color: 'text-emerald-600 dark:text-emerald-400' },
    { icon: BookOpen, label: 'Средняя посещаемость', value: `${stats?.avgAttendance ?? 0}%`, color: 'text-amber-600 dark:text-amber-400' },
    { icon: Award, label: 'С задолженностью', value: stats?.withDebt ?? 0, color: 'text-red-600 dark:text-red-400' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 min-h-16 py-2">
            <div className="flex items-center gap-3 min-w-0">
              <GraduationCap className="w-6 h-6 text-primary-600 flex-shrink-0" />
              <h1 className="font-serif text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">База данных учащихся</h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ThemeToggle />
              <Link to="/login" className="btn btn-ghost text-sm flex items-center gap-1">
                <LogIn className="w-4 h-4" /> <span className="hidden sm:inline">Войти</span>
              </Link>
              <Link to="/register" className="btn btn-primary text-sm flex items-center gap-1">
                <UserPlus className="w-4 h-4" /> <span className="hidden sm:inline">Регистрация</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-gray-900 dark:text-white mb-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-200 dark:bg-gray-700 overflow-hidden mb-10">
              {cards.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="bg-white dark:bg-gray-800 p-5">
                    <Icon className={`w-5 h-5 mb-3 ${c.color}`} />
                    <p className="font-mono text-2xl font-semibold text-gray-900 dark:text-white">{c.value}</p>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
              <div className="card">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-4">Студенты по курсам</h3>
                {(data.byCourse ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400">Нет данных</p>
                ) : (
                  <div className="space-y-3">
                    {(data.byCourse ?? []).map((c: any) => (
                      <div key={c.course} className="flex items-center gap-3">
                        <span className="w-12 text-sm text-gray-500 dark:text-gray-400">{c.course} курс</span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-sm h-3 overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-sm" style={{ width: `${(c.count / maxCourse) * 100}%` }} />
                        </div>
                        <span className="font-mono text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">{c.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-4">Недавно добавленные</h3>
                {recent.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    {isAuthenticated() ? 'Нет данных' : 'Доступно после входа'}
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {recent.map((s: any) => (
                      <li key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.fullName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{s.course} курс · {s.group} · {s.specialty}</p>
                        </div>
                        <div className="text-right text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          <p className="font-mono">Успеваемость: {Number(s.performance).toFixed(2)}</p>
                          <p className="font-mono">Посещаемость: {s.attendance}%</p>
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
