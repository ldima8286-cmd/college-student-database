import { useEffect, useState, useCallback } from 'react';
import { CalendarDays, Plus, Trash2, Save, X, Users } from 'lucide-react';
import { getSchedule, createScheduleEntry, updateScheduleEntry, deleteScheduleEntry, deleteScheduleByGroup, getGroups, listSubjects, getSettings, updateSemesterStart } from '../../api';
import { ScheduleEntry, Subject, ScheduleWeek } from '../../types';
import { WEEK_LABELS, WEEK_SHORT, weekOfDate } from '../../utils/weeks';
import { toast } from 'react-hot-toast';
import AdminNav from '../../components/AdminNav';

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const LESSONS = Array.from({ length: 5 }, (_, i) => i + 1);

interface CellEditor {
  group: string;
  dayOfWeek: number;
  lessonNumber: number;
  entry?: ScheduleEntry;
}

function WeekBadge({ week }: { week: ScheduleWeek | null }) {
  if (week === null) {
    return <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400" title="Каждую неделю">кажд.</span>;
  }
  const cls = week === 'upper'
    ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
  return <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${cls}`} title={WEEK_LABELS[week]}>
    {WEEK_SHORT[week]} · {WEEK_LABELS[week]}
  </span>;
}

export default function ScheduleManager() {
  const [group, setGroup] = useState('');
  const [knownGroups, setKnownGroups] = useState<string[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekFilter, setWeekFilter] = useState<'' | ScheduleWeek>('');
  const [semesterStart, setSemesterStartState] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [editor, setEditor] = useState<CellEditor | null>(null);
  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [room, setRoom] = useState('');
  const [weekDraft, setWeekDraft] = useState<'' | ScheduleWeek>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGroups().then(setKnownGroups).catch(() => {});
    listSubjects().then(setSubjects).catch(() => {});
    getSettings().then((s) => setSemesterStartState(s.semesterStart)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!group) {
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getSchedule(group);
      setEntries(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [group]);

  useEffect(() => { load(); }, [load]);

  const cellEntries = (dayOfWeek: number, lessonNumber: number) =>
    entries.filter((e) => e.dayOfWeek === dayOfWeek && e.lessonNumber === lessonNumber);

  const cellVisible = (dayOfWeek: number, lessonNumber: number) => {
    const cell = cellEntries(dayOfWeek, lessonNumber);
    if (!weekFilter) return cell;
    return cell.filter((e) => e.week === null || e.week === weekFilter);
  };

  const availableWeeks = (dayOfWeek: number, lessonNumber: number): ScheduleWeek[] => {
    const present = new Set(cellEntries(dayOfWeek, lessonNumber).map((e) => e.week ?? null));
    if (present.has(null)) return [];
    return (['upper', 'lower'] as ScheduleWeek[]).filter((w) => !present.has(w));
  };

  const openEntry = (entry: ScheduleEntry) => {
    setEditor({ group, dayOfWeek: entry.dayOfWeek, lessonNumber: entry.lessonNumber, entry });
    setSubject(entry.subject);
    setTeacher(entry.teacher ?? '');
    setRoom(entry.room ?? '');
    setWeekDraft(entry.week ?? '');
  };

  const openNew = (dayOfWeek: number, lessonNumber: number) => {
    const missing = availableWeeks(dayOfWeek, lessonNumber);
    if (missing.length === 0) {
      toast.error('В этой ячейке уже две записи на разные недели');
      return;
    }
    setEditor({ group, dayOfWeek, lessonNumber });
    setSubject('');
    setTeacher('');
    setRoom('');
    setWeekDraft(weekFilter && missing.includes(weekFilter) ? weekFilter : missing[0]);
  };

  const handleSaveCell = async () => {
    if (!editor || !editor.group) return;
    if (!subject.trim()) {
      toast.error('Введите предмет');
      return;
    }
    setSaving(true);
    const payload = {
      group: editor.group,
      subject: subject.trim(),
      dayOfWeek: editor.dayOfWeek,
      lessonNumber: editor.lessonNumber,
      teacher: teacher.trim() || null,
      room: room.trim() || null,
      week: weekDraft === '' ? null : weekDraft,
    };
    try {
      if (editor.entry) {
        await updateScheduleEntry(editor.entry.id, payload);
        toast.success('Запись обновлена');
      } else {
        await createScheduleEntry(payload);
        toast.success('Запись добавлена');
      }
      setEditor(null);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCell = async (entry: ScheduleEntry) => {
    try {
      await deleteScheduleEntry(entry.id);
      toast.success('Запись удалена');
      setEditor(null);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleClearGroup = async () => {
    if (!group) return;
    if (!window.confirm(`Удалить всё расписание группы ${group}?`)) return;
    try {
      const deleted = await deleteScheduleByGroup(group);
      toast.success(`Удалено записей: ${deleted}`);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveSemesterStart = async () => {
    if (!semesterStart) return;
    setSavingSettings(true);
    try {
      await updateSemesterStart(semesterStart);
      toast.success('Начало семестра сохранено');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const isEditing = (day: number, lesson: number) =>
    editor?.group === group && editor.dayOfWeek === day && editor.lessonNumber === lesson;

  const visibleEntries = weekFilter ? entries.filter((e) => e.week === null || e.week === weekFilter) : entries;
  const dayCount = (day: number) => visibleEntries.filter((e) => e.dayOfWeek === day).length;

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayWeek = semesterStart ? weekOfDate(todayISO, semesterStart) : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <AdminNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 mb-6">
          <CalendarDays className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Расписание</h2>
        </div>

        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Расписание занятий
          </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="label flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Группа</label>
            <input
              type="text"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="input"
              placeholder="Например, ПРИ-21"
              list="schedule-groups"
              maxLength={50}
            />
            <datalist id="schedule-groups">
              {knownGroups.map((g) => <option key={g} value={g} />)}
            </datalist>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={load} disabled={!group || loading} className="btn btn-primary">
              Показать
            </button>
            <button onClick={handleClearGroup} disabled={!group || entries.length === 0} className="btn btn-danger">
              Очистить группу
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Начало семестра (дата — как в <span className="font-semibold">нижней</span> неделе)</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={semesterStart}
                onChange={(e) => setSemesterStartState(e.target.value)}
                className="input"
              />
              <button onClick={handleSaveSemesterStart} disabled={savingSettings} className="btn btn-secondary">
                Сохранить
              </button>
            </div>
          </div>
          <div className="flex items-end">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {todayWeek
                ? <>Сегодня — <span className="font-semibold">{WEEK_LABELS[todayWeek]}</span> неделя.</>
                : 'Выберите дату начала семестра для определения недели.'}
            </p>
          </div>
        </div>
      </div>

      {editor && (
        <div className="card mb-6 animate-slide-down">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">
            {DAY_NAMES[editor.dayOfWeek - 1]}, пара {editor.lessonNumber}
            {editor.entry ? ' — редактирование' : ' — новая запись'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="label">Неделя</label>
              <select
                value={weekDraft}
                onChange={(e) => setWeekDraft((e.target.value || '') as '' | ScheduleWeek)}
                className="input"
              >
                <option value="">Каждую неделю</option>
                <option value="upper">Верхняя неделя</option>
                <option value="lower">Нижняя неделя</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Предмет *</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input"
              >
                <option value="">Выберите предмет…</option>
                {[...subjects]
                  .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
                  .map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                {subject && !subjects.some((s) => s.name === subject) && (
                  <option value={subject}>{subject}</option>
                )}
              </select>
            </div>
            <div>
              <label className="label">Преподаватель</label>
              <input
                type="text"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value.replace(/[^\p{L}\s'’.\-\u2013\u2014]/gu, ''))}
                className="input"
                maxLength={100}
                placeholder="Иванова И.И."
              />
            </div>
            <div>
              <label className="label">Аудитория</label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value.replace(/[^\d\s\-]/g, ''))}
                className="input"
                maxLength={50}
                placeholder="например, 101"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2 flex-wrap">
            <button onClick={handleSaveCell} disabled={saving} className="btn btn-primary flex items-center gap-1">
              <Save className="w-4 h-4" /> {editor.entry ? 'Сохранить' : 'Добавить'}
            </button>
            {editor.entry && (
              <button onClick={() => handleDeleteCell(editor.entry!)} className="btn btn-danger flex items-center gap-1">
                <Trash2 className="w-4 h-4" /> Удалить
              </button>
            )}
            <button onClick={() => setEditor(null)} className="btn btn-secondary flex items-center gap-1">
              <X className="w-4 h-4" /> Отмена
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        {!group ? (
          <p className="text-sm text-gray-500">Выберите группу, чтобы открыть расписание.</p>
        ) : loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {['', 'upper', 'lower'].map((w) => {
                const active = weekFilter === w;
                const label = w === '' ? 'Обе недели' : WEEK_LABELS[w as ScheduleWeek];
                return (
                  <button
                    key={w || 'all'}
                    onClick={() => setWeekFilter(w as '' | ScheduleWeek)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {visibleEntries.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {DAY_NAMES.map((d, i) => (
                  <span key={d} className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium">
                    {d}: {dayCount(i + 1)}
                  </span>
                ))}
                <span className="px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-900 text-primary-700 dark:text-primary-300 font-semibold">
                  Записей: {visibleEntries.length}
                </span>
              </div>
            )}
            <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">Пара</th>
                {DAY_NAMES.map((d) => (
                  <th key={d} className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LESSONS.map((lesson) => (
                <tr key={lesson}>
                  <td className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 whitespace-nowrap">{lesson}</td>
                  {DAY_NAMES.map((_, dayIdx) => {
                    const day = dayIdx + 1;
                    const visible = cellVisible(day, lesson);
                    const editing = isEditing(day, lesson);
                    return (
                      <td key={`${lesson}-${day}`} className={`px-1 py-1 border border-gray-200 dark:border-gray-700 align-top ${editing ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                        {(() => {
                        const upper = visible.filter((e) => e.week !== 'lower');
                        const lower = visible.filter((e) => e.week === 'lower');
                        const renderButton = (e: ScheduleEntry) => (
                          <button key={e.id} onClick={() => openEntry(e)} className="w-full text-left text-xs leading-snug group block mb-0.5">
                            <p className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 flex items-start justify-between gap-1">
                              <span>{e.subject}</span>
                              <WeekBadge week={e.week} />
                            </p>
                            {e.teacher && <p className="text-gray-500 dark:text-gray-400">{e.teacher}</p>}
                            {e.room && <p className="text-gray-500 dark:text-gray-400">ауд. {e.room}</p>}
                          </button>
                        );
                        return (
                          <>
                            {upper.map(renderButton)}
                            {upper.length > 0 && lower.length > 0 && (
                              <div className="my-1 border-t border-dashed border-gray-300 dark:border-gray-600" title="Разделение верхняя/нижняя неделя" />
                            )}
                            {lower.map(renderButton)}
                          </>
                        );
                      })()}
                        {availableWeeks(day, lesson).length > 0 && (
                          <button
                            onClick={() => openNew(day, lesson)}
                            className="w-full text-left text-gray-300 dark:text-gray-600 hover:text-primary-500 px-1 py-1.5 rounded"
                            title="Добавить занятие"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            </table>
          </>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Нажмите на клетку, чтобы изменить занятие. В одной клетке можно задать разные предметы для верхней и нижней недели. Учебная неделя: Пн–Сб, до 5 пар.
      </p>
      </main>
    </div>
  );
}