import { useEffect, useState, useCallback } from 'react';
import { CalendarDays, Plus, Trash2, Save, X, Users } from 'lucide-react';
import { getSchedule, createScheduleEntry, updateScheduleEntry, deleteScheduleEntry, deleteScheduleByGroup, getGroups, listSubjects } from '../../api';
import { ScheduleEntry, Subject } from '../../types';
import { toast } from 'react-hot-toast';

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const LESSONS = Array.from({ length: 10 }, (_, i) => i + 1);

interface CellEditor {
  group: string;
  dayOfWeek: number;
  lessonNumber: number;
  entry?: ScheduleEntry;
}

export default function ScheduleManager() {
  const [group, setGroup] = useState('');
  const [knownGroups, setKnownGroups] = useState<string[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<CellEditor | null>(null);
  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [room, setRoom] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGroups().then(setKnownGroups).catch(() => {});
    listSubjects().then(setSubjects).catch(() => {});
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

  const openCell = (dayOfWeek: number, lessonNumber: number) => {
    const entry = entries.find((e) => e.dayOfWeek === dayOfWeek && e.lessonNumber === lessonNumber);
    setEditor({ group, dayOfWeek, lessonNumber, entry });
    setSubject(entry?.subject ?? '');
    setTeacher(entry?.teacher ?? '');
    setRoom(entry?.room ?? '');
  };

  const handleSaveCell = async () => {
    if (!editor || !group) return;
    if (!subject.trim()) {
      toast.error('Введите предмет');
      return;
    }
    setSaving(true);
    const payload = {
      group,
      subject: subject.trim(),
      dayOfWeek: editor.dayOfWeek,
      lessonNumber: editor.lessonNumber,
      teacher: teacher.trim() || null,
      room: room.trim() || null,
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

  const cellKey = (day: number, lesson: number) =>
    entries.find((e) => e.dayOfWeek === day && e.lessonNumber === lesson);

  const isEditing = (day: number, lesson: number) =>
    editor?.group === group && editor.dayOfWeek === day && editor.lessonNumber === lesson;

  return (
    <div>
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
      </div>

      {editor && (
        <div className="card mb-6 animate-slide-down">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">
            {DAY_NAMES[editor.dayOfWeek - 1]}, урок {editor.lessonNumber}
            {editor.entry ? ' — редактирование' : ' — новая запись'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Предмет *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input"
                list="cell-subjects"
                maxLength={100}
                placeholder="Введите или выберите предмет"
              />
              <datalist id="cell-subjects">
                {subjects.map((s) => <option key={s.id} value={s.name} />)}
              </datalist>
            </div>
            <div>
              <label className="label">Преподаватель</label>
              <input type="text" value={teacher} onChange={(e) => setTeacher(e.target.value)} className="input" maxLength={100} />
            </div>
            <div>
              <label className="label">Аудитория</label>
              <input type="text" value={room} onChange={(e) => setRoom(e.target.value)} className="input" maxLength={50} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
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
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">Урок</th>
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
                    const e = cellKey(day, lesson);
                    return (
                      <td key={`${lesson}-${day}`} className={`px-1 py-1 border border-gray-200 dark:border-gray-700 align-top ${isEditing(day, lesson) ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                        {e ? (
                          <button onClick={() => openCell(day, lesson)} className="w-full text-left text-xs leading-snug group">
                            <p className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600">{e.subject}</p>
                            {e.teacher && <p className="text-gray-500 dark:text-gray-400">{e.teacher}</p>}
                            {e.room && <p className="text-gray-500 dark:text-gray-400">ауд. {e.room}</p>}
                          </button>
                        ) : (
                          <button
                            onClick={() => openCell(day, lesson)}
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
        )}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Нажмите на клетку, чтобы добавить или изменить занятие. Дни недели: Пн–Вс, до 10 уроков.
      </p>
    </div>
  );
}