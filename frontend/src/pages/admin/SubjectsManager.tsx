import { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, Loader2 } from 'lucide-react';
import { listSubjects, createSubject, deleteSubject } from '../../api';
import { Subject } from '../../types';
import { toast } from 'react-hot-toast';

export default function SubjectsManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

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
    try {
      await deleteSubject(s.id);
      toast.success(`Предмет "${s.name}" удалён`);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-2xl">
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
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">Список предметов ({subjects.length})</h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent"></div>
          </div>
        ) : subjects.length === 0 ? (
          <p className="text-sm text-gray-500">Предметы не добавлены. Добавьте первый предмет, чтобы выставлять оценки.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {subjects.map((s) => (
              <li key={s.id} className="py-2.5 flex items-center gap-3">
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{s.name}</span>
                <button onClick={() => handleDelete(s)} className="btn btn-ghost text-xs text-red-600 flex items-center gap-1" title="Удалить">
                  <Trash2 className="w-3.5 h-3.5" /> Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}