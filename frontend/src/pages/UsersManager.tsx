import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'teacher', fullName: '', groupFilter: '' });

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      setUsers(res.data);
    } catch (err) {
      console.error('Ошибка загрузки пользователей', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/admin/users', form, { headers: { Authorization: `Bearer ${token}` } });
      setShowForm(false);
      setForm({ username: '', password: '', role: 'teacher', fullName: '', groupFilter: '' });
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка создания');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить пользователя?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="users-manager">
      <header className="page-header">
        <h1>👥 Пользователи</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '❌ Отмена' : '➕ Добавить'}
        </button>
      </header>
      {showForm && (
        <form onSubmit={handleCreate} className="user-form">
          <input placeholder="Логин" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required />
          <input placeholder="Пароль" type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />
          <input placeholder="ФИО" value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} required />
          <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}>
            <option value="admin">Админ</option>
            <option value="teacher">Преподаватель</option>
          </select>
          <input placeholder="Группа (для учителя)" value={form.groupFilter} onChange={(e) => setForm({...form, groupFilter: e.target.value})} />
          <button type="submit" className="btn btn-success">Создать</button>
        </form>
      )}
      <table className="users-table">
        <thead><tr><th>Логин</th><th>ФИО</th><th>Роль</th><th>Группа</th><th>Действия</th></tr></thead>
        <tbody>
          {users.map((u: any) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.fullName}</td>
              <td>{u.role}</td>
              <td>{u.groupFilter || '—'}</td>
              <td><button className="btn btn-danger" onClick={() => handleDelete(u.id)}>🗑️</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersManager;