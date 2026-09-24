import { useEffect, useState } from 'react';
import { Users as UsersIcon, Save, Shield, UserRound, Search, Filter } from 'lucide-react';
import { getAdminUsers, updateAdminUser, getGroups, getMe } from '../../api';
import { AdminUser, Role } from '../../types';
import { toast } from 'react-hot-toast';
import AdminNav from '../../components/AdminNav';

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Админ',
  curator: 'Куратор',
  user: 'Пользователь',
};

export default function UsersManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { role: Role; group: string }>>({});
  const [meId, setMeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');

  const load = async () => {
    try {
      const [us, gs] = await Promise.all([getAdminUsers(), getGroups()]);
      setUsers(us);
      setGroups(gs);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getMe().then((u) => setMeId(u?.id ?? null)).catch(() => {});
    load();
  }, []);

  const draftFor = (u: AdminUser) => draft(u);

  const draft = (u: AdminUser): { role: Role; group: string } =>
    drafts[u.id] ?? { role: u.role, group: u.group ?? '' };

  const setDraft = (id: string, patch: Partial<{ role: Role; group: string }>) =>
    setDrafts((prev) => {
      const base = users.find((u) => u.id === id);
      const current = prev[id] ?? { role: base?.role ?? 'user', group: base?.group ?? '' };
      return { ...prev, [id]: { ...current, ...patch } };
    });

  const handleSave = async (u: AdminUser) => {
    const d = draftFor(u);
    setSavingId(u.id);
    try {
      await updateAdminUser(u.id, { role: d.role, group: d.group.trim() ? d.group.trim() : null });
      toast.success('Пользователь обновлён');
      setDrafts((prev) => { const next = { ...prev }; delete next[u.id]; return next; });
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const roleCount = (r: Role) => users.filter((u) => u.role === r).length;

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return `${u.fullName} ${u.email} ${u.group ?? ''}`.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <AdminNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 mb-6">
          <UsersIcon className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Пользователи</h2>
        </div>

        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2 flex-wrap">
              Пользователи
              <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium">
                {users.length}
              </span>
            </h3>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по имени, email, группе..."
                  className="input pl-10 text-sm"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-gray-400" />
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as 'all' | Role)} className="input w-auto text-sm">
                  <option value="all">Все роли</option>
                  <option value="admin">Админ</option>
                  <option value="curator">Куратор</option>
                  <option value="user">Пользователь</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4 text-xs">
            <button onClick={() => setRoleFilter('all')} className={`px-3 py-1.5 rounded-lg border font-medium ${roleFilter === 'all' ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'}`}>
              Все: {users.length}
            </button>
            <button onClick={() => setRoleFilter('admin')} className={`px-3 py-1.5 rounded-lg border font-medium ${roleFilter === 'admin' ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'}`}>
              Админы: {roleCount('admin')}
            </button>
            <button onClick={() => setRoleFilter('curator')} className={`px-3 py-1.5 rounded-lg border font-medium ${roleFilter === 'curator' ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'}`}>
              Кураторы: {roleCount('curator')}
            </button>
            <button onClick={() => setRoleFilter('user')} className={`px-3 py-1.5 rounded-lg border font-medium ${roleFilter === 'user' ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'}`}>
              Пользователи: {roleCount('user')}
            </button>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Куратору назначается группа — он получит доступ к анкетам, телефонам и задолженностям студентов этой группы, а также сможет вести их оценки.
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent"></div>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500">Ничего не найдено.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((u) => {
                const d = draftFor(u);
                const isSelf = u.id === meId;
                return (
                <li key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {u.fullName}
                      {isSelf && <span className="ml-2 text-xs text-gray-400">(вы)</span>}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-24 text-xs text-gray-500 truncate">
                      {u.role === 'admin' ? <Shield className="w-3.5 h-3.5 inline mr-1" /> : <UserRound className="w-3.5 h-3.5 inline mr-1" />}
                      {ROLE_LABELS[d.role]}
                    </span>
                    <select
                      disabled={isSelf}
                      value={d.role}
                      onChange={(e) => setDraft(u.id, { role: e.target.value as Role })}
                      className="input w-auto text-sm"
                    >
                      <option value="user">Пользователь</option>
                      <option value="curator">Куратор</option>
                      <option value="admin">Админ</option>
                    </select>
                    {d.role === 'curator' && (
                      <input
                        type="text"
                        value={d.group}
                        onChange={(e) => setDraft(u.id, { group: e.target.value })}
                        className="input w-32 text-sm"
                        placeholder="Группа"
                        list="curator-groups"
                        maxLength={50}
                      />
                    )}
                    {d.role === 'curator' && (
                      <datalist id="curator-groups">
                        {groups.map((g) => <option key={g} value={g} />)}
                      </datalist>
                    )}
                    <button
                      onClick={() => handleSave(u)}
                      disabled={savingId === u.id || isSelf}
                      className="btn btn-primary text-xs flex items-center gap-1"
                    >
                      {savingId === u.id ? <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" /> : <Save className="w-3.5 h-3.5" />}
                      Сохранить
                    </button>
                  </div>
                </li>
              );
            })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}