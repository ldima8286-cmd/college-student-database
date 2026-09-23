import { useEffect, useState, useCallback } from 'react';
import { IdCard, BookOpen, CalendarDays, AlertTriangle } from 'lucide-react';
import { getMyMarks, getSchedule, getMyStudent } from '../api';
import { MarkRecord, ScheduleEntry, Student } from '../types';
import { toast } from 'react-hot-toast';
import MyStudentCard from '../components/MyStudentCard';
import MarksView from '../components/MarksView';
import ScheduleView from '../components/ScheduleView';

type Tab = 'profile' | 'marks' | 'schedule';

export default function StudentDiary() {
  const [tab, setTab] = useState<Tab>('profile');
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStudent = useCallback(async () => {
    try {
      const s = await getMyStudent();
      setStudent(s);
    } catch (err: any) {
      toast.error(err.message);
    }
  }, []);

  const loadMarks = useCallback(async () => {
    try {
      const data = await getMyMarks();
      setMarks(data);
    } catch (err: any) {
      toast.error(err.message);
    }
  }, []);

  const loadSchedule = useCallback(async () => {
    try {
      const data = await getSchedule();
      setSchedule(data);
    } catch (err: any) {
      toast.error(err.message);
    }
  }, []);

  useEffect(() => { loadStudent(); }, [loadStudent]);

  useEffect(() => {
    if (tab === 'marks') {
      setLoading(true);
      loadMarks().finally(() => setLoading(false));
    } else if (tab === 'schedule') {
      setLoading(true);
      loadSchedule().finally(() => setLoading(false));
    }
  }, [tab, loadMarks, loadSchedule]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Анкета', icon: <IdCard className="w-4 h-4" /> },
    { id: 'marks', label: 'Оценки', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'schedule', label: 'Расписание', icon: <CalendarDays className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {student?.academicDebt && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          <AlertTriangle className="w-4 h-4" /> У вас есть академическая задолженность. Обратитесь к куратору группы.
        </div>
      )}

      <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden mb-6 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              tab === t.id
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {t.icon}
            <span className={tab === t.id ? '' : 'hidden sm:inline'}>{t.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {tab === 'profile' && <MyStudentCard />}
          {tab === 'marks' && <MarksView marks={marks} />}
          {tab === 'schedule' && <ScheduleView entries={schedule} group={student?.group ?? null} />}
        </>
      )}
    </div>
  );
}