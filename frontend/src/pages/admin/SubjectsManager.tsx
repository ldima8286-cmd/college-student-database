import { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, Loader2, Search } from 'lucide-react';
import { listSubjects, createSubject, deleteSubject } from '../../api';
import { Subject } from '../../types';
import { toast } from 'react-hot-toast';
import AdminNav from '../../components/AdminNav';

export default function SubjectsManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const data = await listSubjects();
      setSubjects(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await createSubject(trimmed);
      toast.success('Предмет добавлен');
      setName('');
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (s: Subject) => {
    if (!window.confirm(`Удалить предмет «${s.name}»? Оценки по нему будут недоступны.`)) return;
    try {
      await deleteSubject(s.id);
      toast.success(`Предмет "${s.name}" удалён`);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = search.trim()
    ? subjects.filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase()))
    : subjects;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <AdminNav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Предметы</h2>
        </div>

        <form onSubmit={handleAdd} className="card mb-6">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Новый предмет
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input flex-1"
              placeholder="Название предмета, например «Математика»"
              maxLength={100}
            />
            <button type="submit" disabled={creating || !name.trim()} className="btn btn-primary flex items-center gap-1">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Добавить
            </button>
          </div>
        </form>

        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2 flex-wrap">
              Список предметов
              <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium">
                {subjects.length}
              </span>
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию..."
                className="input pl-10 text-sm"
              />
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent"></div>
            </div>
          ) : subjects.length === 0 ? (
            <p className="text-sm text-gray-500">Предметы не добавлены. Добавьте первый предмет, чтобы выставлять оценки.</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500">Ничего не найдено по запросу «{search}».</p>
          ) : (
            <>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((s) => (
                  <li key={s.id} className="py-2.5 flex items-center gap-3">
                    <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{s.name}</span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(s.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                    <button onClick={() => handleDelete(s)} className="btn btn-ghost text-xs text-red-600 flex items-center gap-1" title="Удалить">
                      <Trash2 className="w-3.5 h-3.5" /> Удалить
                    </button>
                  </li>
                ))}
              </ul>
              {filtered.length !== subjects.length && (
                <p className="text-xs text-gray-400 mt-3">Показано {filtered.length} из {subjects.length}</p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}