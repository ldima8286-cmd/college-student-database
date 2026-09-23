import { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, Pencil, Save, X, Loader2 } from 'lucide-react';
import { listSubjects, getStudentMarks, addMark, updateMark, deleteMark } from '../api';
import { Subject, MarkRecord } from '../types';
import { toast } from 'react-hot-toast';

interface Props {
  studentId: string;
  studentName: string;
}

const GRADES = [5, 4, 3, 2];

export default function MarksEditor({ studentId, studentName }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectId, setSubjectId] = useState('');
  const [grade, setGrade] = useState<number>(5);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingGrade, setEditingGrade] = useState<number>(5);

  const load = async () => {
    try {
      setLoading(true);
      const [subj, m] = await Promise.all([listSubjects(), getStudentMarks(studentId)]);
      setSubjects(subj);
      setMarks(m);
      if (!subjectId && subj.length > 0) setSubjectId(subj[0].id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [studentId]);

  const refreshMarks = async () => {
    try {
      const m = await getStudentMarks(studentId);
      setMarks(m);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAdd = async () => {
    if (!subjectId) {
      toast.error('Сначала создайте предметы в разделе администратора');
      return;
    }
    setSaving(true);
    try {
      await addMark(studentId, subjectId, grade);
      toast.success('Оценка добавлена');
      await refreshMarks();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (markId: string) => {
    try {
      await updateMark(markId, editingGrade);
      toast.success('Оценка обновлена');
      setEditingId(null);
      await refreshMarks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (markId: string) => {
    try {
      await deleteMark(markId);
      toast.success('Оценка удалена');
      await refreshMarks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2">
        <BookOpen className="w-4 h-4" />
        Оценки · {studentName}
      </h3>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="input flex-1">
          {subjects.length === 0 && <option value="">Нет предметов</option>}
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="input w-auto">
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <button onClick={handleAdd} disabled={saving || !subjectId} className="btn btn-primary text-sm flex items-center gap-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Выставить
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent"></div>
        </div>
      ) : marks.length === 0 ? (
        <p className="text-sm text-gray-500">Оценок пока нет.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {marks.map((m) => (
            <li key={m.id} className="py-2 flex items-center gap-3">
              <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{m.subjectName}</span>
              {editingId === m.id ? (
                <div className="flex items-center gap-2">
                  <select value={editingGrade} onChange={(e) => setEditingGrade(Number(e.target.value))} className="input w-20">
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <button onClick={() => handleSaveEdit(m.id)} className="btn btn-primary text-xs flex items-center gap-1">
                    <Save className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="btn btn-secondary text-xs flex items-center gap-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <button onClick={() => { setEditingId(m.id); setEditingGrade(m.mark); }} className="btn btn-ghost text-xs" title="Изменить">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="btn btn-ghost text-xs text-red-600" title="Удалить">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <span className={`inline-flex w-8 h-8 items-center justify-center rounded-md text-sm font-bold ${
                m.mark >= 5 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : m.mark === 4 ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                : m.mark === 3 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {m.mark}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(m.createdAt).toLocaleDateString('ru-RU')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}