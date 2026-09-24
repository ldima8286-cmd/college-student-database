import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, CalendarDays, ArrowLeft, Save, CheckCheck, Loader2, UserCheck, UserX, Clock, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getMe, getGroups, getJournalSummary, getJournalLesson, saveJournalLesson, isCurator, isAdmin } from '../api';
import { AttendanceStatus, JournalSummaryLesson, JournalLesson } from '../types';

const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const STATUS_OPTIONS: { value: '' | AttendanceStatus; label: string }[] = [
  { value: '', label: '—' },
  { value: 'present', label: 'Присутств.' },
  { value: 'late', label: 'Опоздал' },
  { value: 'absent', label: 'Отсутств.' },
];

const GRADES = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

interface Row {
  studentId: string;
  fullName: string;
  mark: number | null;
  status: AttendanceStatus | null;
}

export default function Journal() {
  const canEdit = isAdmin() || isCurator();
  const [groups, setGroups] = useState<string[]>([]);
  const [group, setGroup] = useState<string>('');
  const [date, setDate] = useState<string>(today());
  const [lessons, setLessons] = useState<JournalSummaryLesson[]>([]);
  const [lesson, setLesson] = useState<JournalLesson | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        if (isCurator()) {
          const me = await getMe();
          const g = me?.group ?? '';
          setGroup(g);
          setGroups(g ? [g] : []);
        } else {
          const list = await getGroups();
          setGroups(list);
          if (list.length > 0) setGroup(list[0]);
        }
      } catch (err: any) {
        toast.error(err.message);
      }
    };
    init();
  }, []);

  const loadSummaries = useCallback(async () => {
    if (!group) {
      setLessons([]);
      return;
    }
    try {
      setLoading(true);
      const data = await getJournalSummary(group, date);
      setLessons(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [group, date]);

  useEffect(() => { loadSummaries(); }, [loadSummaries]);

  const openLesson = async (scheduleId: string) => {
    setLesson(null);
    if (!canEdit) return;
    try {
      setLoadingLesson(true);
      const data = await getJournalLesson(scheduleId, date);
      setLesson(data);
      setRows(data.students.map((s) => ({ studentId: s.studentId, fullName: s.fullName, mark: s.mark, status: s.status })));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingLesson(false);
    }
  };

  const updateRow = (studentId: string, patch: Partial<Pick<Row, 'mark' | 'status'>>) => {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)));
  };

  const markAllPresent = () => {
    setRows((prev) => prev.map((r) => (r.status ? r : { ...r, status: 'present' })));
  };

  const handleSave = async () => {
    if (!lesson || !canEdit) return;
    try {
      setSaving(true);
      const entries = rows.map((r) => ({ studentId: r.studentId, mark: r.mark, status: r.status }));
      await saveJournalLesson(lesson.scheduleId, lesson.date, entries);
      toast.success('Журнал сохранён');
      await loadSummaries();
      await openLesson(lesson.scheduleId);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const counts = {
    marked: rows.filter((r) => r.mark !== null).length,
    present: rows.filter((r) => r.status === 'present' || r.status === 'late').length,
    absent: rows.filter((r) => r.status === 'absent').length,
  };

  return (
    <div className="max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-600" />
            Журнал посещаемости и оценок
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Выберите группу и дату — в журнал попадут занятия из расписания на этот день.
          </p>
        </div>
        <button onClick={() => { setLesson(null); loadSummaries(); }} className="btn btn-secondary text-sm">Обновить</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select value={group} onChange={(e) => { setGroup(e.target.value); setLesson(null); }} className="input sm:w-64" disabled={groups.length <= 1}>
          {groups.length === 0 && <option value="">Нет групп</option>}
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <label className="flex items-center gap-2 input sm:w-auto">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setLesson(null); }} className="bg-transparent outline-none" />
        </label>
      </div>

      {!group && !loading && (
        <div className="card text-center py-10 text-gray-500">
          <ClipboardList className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          Выберите группу, чтобы открыть журнал.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {!lesson ? (
            lessons.length === 0 ? (
              <div className="card text-center py-10 text-gray-500">
                <CalendarDays className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                На этот день у группы нет занятий в расписании.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lessons.map((l) => {
                  const filled = l.marked > 0 || l.present > 0 || l.late > 0 || l.absent > 0;
                  return (
                    <button
                      key={l.scheduleId}
                      onClick={() => openLesson(l.scheduleId)}
                      className="card text-left hover:border-primary-400 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            Урок {l.lessonNumber} · {l.subject}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {l.teacher || 'Преподаватель не указан'}
                            {l.room ? ` · ауд. ${l.room}` : ''}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                          filled ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}>
                          {filled ? 'Заполнено' : 'Пусто'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-600 dark:text-gray-300">
                        {l.marked > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            Оценок: {l.marked}/{l.totalStudents}
                          </span>
                        )}
                        {l.present > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
                            <UserCheck className="w-3.5 h-3.5" /> {l.present}
                          </span>
                        )}
                        {l.late > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300">
                            <Clock className="w-3.5 h-3.5" /> {l.late}
                          </span>
                        )}
                        {l.absent > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                            <UserX className="w-3.5 h-3.5" /> {l.absent}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                          <UsersCount total={l.totalStudents} />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <button onClick={() => setLesson(null)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-1">
                    <ArrowLeft className="w-3.5 h-3.5" /> К списку занятий
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Урок {lesson.lessonNumber} · {lesson.subject}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Группа {lesson.group} · {lesson.date}
                    {lesson.teacher ? ` · ${lesson.teacher}` : ''}
                    {lesson.room ? ` · ауд. ${lesson.room}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-800">Оценок: {counts.marked}</span>
                  <span className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">Пришли: {counts.present}</span>
                  <span className="px-2 py-1 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">Нет: {counts.absent}</span>
                </div>
              </div>

              {loadingLesson ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-10">№</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Студент</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Посещаемость</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-28">Оценка (1–10)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {rows.map((r, i) => (
                        <tr key={r.studentId}>
                          <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{r.fullName}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              {STATUS_OPTIONS.map((opt) => (
                                <button
                                  key={opt.value}
                                  onClick={() => updateRow(r.studentId, { status: r.status === opt.value ? null : (opt.value || null) })}
                                  title={opt.value === 'present' ? 'Присутствовал' : opt.value === 'late' ? 'Опоздал' : opt.value === 'absent' ? 'Отсутствовал' : 'Не отмечен'}
                                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                                    r.status === opt.value
                                      ? opt.value === 'absent'
                                        ? 'bg-red-600 text-white'
                                        : opt.value === 'late'
                                          ? 'bg-sky-600 text-white'
                                          : 'bg-emerald-600 text-white'
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={r.mark === null ? '' : String(r.mark)}
                              onChange={(e) => updateRow(r.studentId, { mark: e.target.value === '' ? null : Number(e.target.value) })}
                              className="input w-full"
                            >
                              <option value="">—</option>
                              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <button onClick={markAllPresent} className="btn btn-secondary text-sm flex items-center gap-1.5">
                  <CheckCheck className="w-4 h-4" /> Отметить всех присутствующими
                </button>
                <button onClick={handleSave} disabled={saving || loadingLesson} className="btn btn-primary text-sm flex items-center gap-1.5">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Сохранить журнал
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UsersCount({ total }: { total: number }) {
  return (
    <>
      <Users className="w-3.5 h-3.5" /> {total}
    </>
  );
}