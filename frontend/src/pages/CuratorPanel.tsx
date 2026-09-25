import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { UserRound, Users, Phone, Mail, AlertTriangle, Activity, GraduationCap, ClipboardList, CalendarDays } from 'lucide-react';
import { getStudents, getMe, getSchedule, getSettings } from '../api';
import { Student, ScheduleEntry } from '../types';
import { toast } from 'react-hot-toast';
import MarksEditor from '../components/MarksEditor';
import ScheduleView from '../components/ScheduleView';
import Pagination from '../components/Pagination';

type CuratorTab = 'students' | 'schedule';

export default function CuratorPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [semesterStart, setSemesterStart] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [tab, setTab] = useState<CuratorTab>('students');

  useEffect(() => {
    getMe().then((u) => setGroup(u?.group ?? null)).catch(() => {});
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getStudents({ page, limit, sortBy: 'fullName', sortOrder: 'asc' });
      setStudents(res.data);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
      setSelected((prev) => {
        if (prev && res.data.some((s) => s.id === prev.id)) return prev;
        return res.data[0] ?? null;
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const loadSchedule = useCallback(async () => {
    try {
      const data = await getSchedule();
      setSchedule(data);
      getSettings().then((s) => setSemesterStart(s.semesterStart)).catch(() => {});
    } catch (err: any) {
      toast.error(err.message);
    }
  }, []);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  return (
    <div>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <UserRound className="w-5 h-5 text-primary-600" />
            Кабинет куратора
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Полный доступ к данным студентов группы{group ? ` ${group}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setTab('students')}
            className={`btn text-sm flex items-center gap-1 ${tab === 'students' ? 'btn-primary' : 'btn-ghost'}`}>
            <Users className="w-4 h-4" /> Студенты
          </button>
          <button onClick={() => setTab('schedule')}
            className={`btn text-sm flex items-center gap-1 ${tab === 'schedule' ? 'btn-primary' : 'btn-ghost'}`}>
            <CalendarDays className="w-4 h-4" /> Расписание
          </button>
          <Link to="/curator/journal" className="btn btn-secondary text-sm flex items-center gap-1 whitespace-nowrap">
            <ClipboardList className="w-4 h-4" /> Журнал
          </Link>
          <button onClick={() => { if (page !== 1) setPage(1); else { loadStudents(); loadSchedule(); } }} className="btn btn-secondary text-sm">Обновить</button>
        </div>
      </div>

      {tab === 'schedule' ? (
        <ScheduleView entries={schedule} group={group} semesterStart={semesterStart} />
      ) : (
      <>
      {students.length === 0 && !loading && (
        <div className="card text-center py-10 text-gray-500">
          <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          Студентов вашей группы пока нет.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" /> Моя группа ({students.length})
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent"></div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[28rem] overflow-y-auto">
                {students.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelected(s)}
                      className={`w-full text-left px-2 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        selected?.id === s.id ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{s.fullName}</span>
                        <span className="block text-xs text-gray-500 truncate">{s.specialty} · {s.course} курс</span>
                      </span>
                      {s.academicDebt && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!loading && students.length > 0 && (
              <div className="mt-3">
                <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selected ? (
            <>
              <div className="card">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.fullName}</h3>
                      <p className="text-sm text-gray-500">{selected.group} · {selected.specialty}</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelected(null); }} className="text-xs text-gray-400 hover:text-gray-600">Закрыть</button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Посещаемость:</span>
                    <span className="font-medium">{Number(selected.attendance ?? 0)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Успеваемость:</span>
                    <span className="font-medium">{Number(selected.performance ?? 0).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Email:</span>
                    <span className="font-medium truncate">{selected.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Телефон:</span>
                    <span className="font-medium">{selected.phone || '—'}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Академическая задолженность:</span>
                    <span className={`font-medium ${selected.academicDebt ? 'text-red-600' : 'text-emerald-600'}`}>
                      {selected.academicDebt ? 'есть' : 'нет'}
                    </span>
                  </div>
                </div>
              </div>

              <MarksEditor studentId={selected.id} studentName={selected.fullName} />
            </>
          ) : (
            <div className="card text-center py-12">
              <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500">Выберите студента из списка слева, чтобы увидеть подробности и оценки.</p>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}