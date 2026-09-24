import { useEffect, useState, useCallback } from 'react';
import { Shield, Clock, Filter, Search, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { getAuditLogs, clearAuditLogs } from '../api';
import { toast } from 'react-hot-toast';
import Pagination from '../components/Pagination';
import AdminNav from '../components/AdminNav';

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [entity, setEntity] = useState<string>('all');
  const [search, setSearch] = useState('');
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

  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    if (total === 0) return;
    if (!window.confirm('Очистить журнал аудита полностью? Это действие удалит все записи и его нельзя отменить.')) return;
    setClearing(true);
    try {
      const deleted = await clearAuditLogs();
      toast.success(`Журнал аудита очищен (записей: ${deleted})`);
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
      setPage(1);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setClearing(false);
    }
  };

  const filtered = search.trim()
    ? logs.filter((l) => {
        const hay = `${l.entityId || l.targetId || ''} ${JSON.stringify(l.details ?? '')}`.toLowerCase();
        return hay.includes(search.trim().toLowerCase());
      })
    : logs;

  const countAction = (action: string) =>
    filtered.filter((l) => (l.action || '').toLowerCase() === action.toLowerCase()).length;

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
      schedule: 'Расписание',
      subject: 'Предмет',
      journal: 'Журнал',
      audit_log: 'Лог',
    };
    return map[ent] || ent;
  };

  const actionBadge = (action: string) => {
    const cls = action === 'delete'
      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      : action === 'create'
      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
      : action === 'login' || action === 'logout' || action === 'register'
      ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
      : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300';
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <AdminNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Журнал аудита</h2>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium">
            Записей всего: {total}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 font-medium">
            Создано: {countAction('create')}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-900 text-primary-700 dark:text-primary-300 font-medium">
            Обновлено: {countAction('update')}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-red-700 dark:text-red-300 font-medium">
            Удалено: {countAction('delete')}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium">
            Входы: {countAction('login') + countAction('logout') + countAction('register')}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="input w-auto"
            >
              <option value="all">Все сущности</option>
              <option value="student">Студент</option>
              <option value="user">Пользователь</option>
              <option value="schedule">Расписание</option>
              <option value="subject">Предмет</option>
              <option value="journal">Журнал</option>
            </select>
          </div>
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по ID записи или деталям..."
              className="input pl-10"
            />
          </div>
          <button onClick={loadLogs} className="btn btn-secondary text-sm flex items-center gap-1">
            <RefreshCw className="w-4 h-4" /> Обновить
          </button>
          <button
            onClick={handleClear}
            disabled={clearing || total === 0}
            className="btn btn-danger text-sm flex items-center gap-1"
            title="Удалить все записи журнала аудита"
          >
            {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Очистить журнал
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
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
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Детали</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log: any, i: number) => {
                    let details = log.details;
                    let detailText = '';
                    if (details && typeof details === 'string') {
                      try { details = JSON.parse(details); } catch { /* keep string */ }
                    }
                    if (details && typeof details === 'object') {
                      detailText = Object.entries(details as Record<string, unknown>)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                        .join(', ');
                    } else if (details) {
                      detailText = String(details);
                    }
                    return (
                      <tr key={log.id || i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {new Date(log.createdAt || log.timestamp).toLocaleString('ru-RU')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={actionBadge(log.action)}>
                            {actionLabel(log.action)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{entityLabel(log.entity || log.entityType || '')}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-500 font-mono text-xs">{log.entityId || log.targetId || '-'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{roleLabel(log.userId)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate" title={detailText}>{detailText || '-'}</td>
                      </tr>
                    );
                  })}
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