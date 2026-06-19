import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data);
    } catch (err) {
      console.error('Ошибка загрузки логов', err);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!window.confirm('Удалить все логи? Это действие необратимо.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete('/api/admin/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadLogs();
    } catch (err) {
      console.error('Ошибка очистки логов', err);
      alert('Не удалось очистить логи');
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="logs-page">
      <div className="page-header">
        <h1>📋 Журнал действий</h1>
        <button className="btn btn-danger" onClick={clearLogs}>
          🗑️ Очистить логи
        </button>
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
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">Логов пока нет</td>
              </tr>
            ) : (
              logs.map((log: any) => (
                <tr key={log.id}>
                  <td>{new Date(log.timestamp).toLocaleString('ru-RU')}</td>
                  <td><strong>{log.username}</strong></td>
                  <td>{log.action}</td>
                  <td>{log.details || '—'}</td>
                  <td>{log.ip || '—'}</td>
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