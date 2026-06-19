import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface LogEntry {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
  ip: string;
  userAgent: string;
}

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    loadLogs();
  }, [limit]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/admin/logs?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data);
    } catch (error) {
      console.error('Ошибка загрузки логов', error);
      alert('Не удалось загрузить логи. Возможно, у вас нет прав администратора.');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const map: Record<string, string> = {
      'LOGIN_SUCCESS': 'badge-success',
      'LOGIN_FAILED': 'badge-danger',
      'СТУДЕНТ_ДОБАВЛЕН': 'badge-primary',
      'СТУДЕНТ_ОБНОВЛЁН': 'badge-warning',
      'СТУДЕНТ_УДАЛЁН': 'badge-danger',
      'ЗАДОЛЖЕННОСТЬ_ПЕРЕКЛЮЧЕНА': 'badge-purple',
      'ВСЕ_СТУДЕНТЫ_УДАЛЕНЫ': 'badge-dark',
      'ПОЛЬЗОВАТЕЛЬ_СОЗДАН': 'badge-success',
      'ПОЛЬЗОВАТЕЛЬ_УДАЛЁН': 'badge-danger'
    };
    return map[action] || 'badge-secondary';
  };

  const getActionLabel = (action: string) => {
    const map: Record<string, string> = {
      'LOGIN_SUCCESS': '✅ Вход в систему',
      'LOGIN_FAILED': '❌ Неудачный вход',
      'СТУДЕНТ_ДОБАВЛЕН': '➕ Добавлен студент',
      'СТУДЕНТ_ОБНОВЛЁН': '✏️ Обновлён студент',
      'СТУДЕНТ_УДАЛЁН': '🗑️ Удалён студент',
      'ЗАДОЛЖЕННОСТЬ_ПЕРЕКЛЮЧЕНА': '🔄 Переключена задолженность',
      'ВСЕ_СТУДЕНТЫ_УДАЛЕНЫ': '💣 Удалены все студенты',
      'ПОЛЬЗОВАТЕЛЬ_СОЗДАН': '👤 Создан пользователь',
      'ПОЛЬЗОВАТЕЛЬ_УДАЛЁН': '👤 Удалён пользователь'
    };
    return map[action] || action;
  };

  const filteredLogs = logs.filter(log =>
    log.username.toLowerCase().includes(filter.toLowerCase()) ||
    log.action.toLowerCase().includes(filter.toLowerCase()) ||
    log.details.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Загрузка логов...</div>;
  }

  return (
    <div className="logs-page">
      <header className="page-header">
        <h1>📋 Журнал действий</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadLogs}>
            🔄 Обновить
          </button>
        </div>
      </header>

      <div className="logs-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="🔍 Фильтр по пользователю, действию или описанию..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <label>Показать:</label>
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value={50}>50 записей</option>
            <option value={100}>100 записей</option>
            <option value={200}>200 записей</option>
            <option value={500}>500 записей</option>
          </select>
        </div>
      </div>

      <div className="logs-stats">
        <span>Всего: <strong>{filteredLogs.length}</strong> записей</span>
        {filter && <span> (отфильтровано из {logs.length})</span>}
      </div>

      <div className="logs-table-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Время</th>
              <th>Пользователь</th>
              <th>Действие</th>
              <th>Описание</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  {logs.length === 0 ? '📭 Логов пока нет' : '🔍 Ничего не найдено по вашему запросу'}
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id}>
                  <td className="log-time">
                    {new Date(log.timestamp).toLocaleString('ru-RU')}
                  </td>
                  <td className="log-user">
                    <strong>{log.username}</strong>
                  </td>
                  <td>
                    <span className={`badge ${getActionBadge(log.action)}`}>
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="log-details">{log.details || '—'}</td>
                  <td className="log-ip">{log.ip || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogsPage;