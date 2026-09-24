import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Clock, Filter } from 'lucide-react';
import { getAuditLogs } from '../api';
import { toast } from 'react-hot-toast';
import Pagination from '../components/Pagination';
import ThemeToggle from '../components/ThemeToggle';

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [entity, setEntity] = useState<string>('all');
  const limit = 50;

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAuditLogs(page, limit, entity === 'all' ? undefined : entity);
      setLogs(data.logs || data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, entity]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  useEffect(() => { setPage(1); }, [entity]);

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      admin: 'Администратор',
      curator: 'Куратор',
      user: 'Пользователь',
      system: 'Система',
    };
    return map[role] || role || '-';
  };

  const actionLabel = (action: string) => {
    const map: Record<string, string> = {
      create: 'Создание',
      update: 'Обновление',
      delete: 'Удаление',
      login: 'Вход',
      logout: 'Выход',
      register: 'Регистрация',
    };
    return map[action] || action;
  };

  const entityLabel = (ent: string) => {
    const map: Record<string, string> = {
      student: 'Студент',
      user: 'Пользователь',
      audit_log: 'Лог',
    };
    return map[ent] || ent;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/admin" className="btn btn-ghost text-sm flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <Shield className="w-6 h-6 text-primary-600" />
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Журнал аудита</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Все сущности</option>
            <option value="student">Студент</option>
            <option value="user">Пользователь</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400">Нет записей</h3>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Дата</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Действие</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Сущность</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Роль исполнителя</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any, i: number) => (
                    <tr key={log.id || i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {new Date(log.createdAt || log.timestamp).toLocaleString('ru-RU')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.action === 'delete'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : log.action === 'create'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        }`}>
                          {actionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{entityLabel(log.entity || log.entityType || '')}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-500 font-mono text-xs">{log.entityId || log.targetId || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{roleLabel(log.userId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </main>
    </div>
  );
}
