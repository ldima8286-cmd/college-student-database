import { useEffect, useState } from 'react';
import { Users as UsersIcon, Save, Shield, UserRound } from 'lucide-react';
import { getAdminUsers, updateAdminUser, getGroups } from '../../api';
import { AdminUser, Role } from '../../types';
import { toast } from 'react-hot-toast';

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
    import('../../api').then(({ getMe }) => getMe().then((u) => setMeId(u?.id ?? null)).catch(() => {}));
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

  return (
    <div className="max-w-3xl">
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2">
          <UsersIcon className="w-4 h-4" /> Пользователи ({users.length})
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Куратору назначается группа — он получит доступ к анкетам, телефонам и задолженностям студентов этой группы, а также сможет вести их оценки.
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent"></div>
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500">Пользователей пока нет.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {users.map((u) => {
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
    </div>
  );
}