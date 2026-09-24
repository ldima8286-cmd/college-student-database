import { ScheduleEntry } from '../types';
import { CalendarDays } from 'lucide-react';

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const LESSONS = Array.from({ length: 10 }, (_, i) => i + 1);

interface Props {
  entries: ScheduleEntry[];
  group?: string | null;
}

export default function ScheduleView({ entries, group }: Props) {
  const cellKey = (day: number, lesson: number) =>
    entries.find((e) => e.dayOfWeek === day && e.lessonNumber === lesson);

  return (
    <div className="card overflow-x-auto">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2">
        <CalendarDays className="w-4 h-4" />
        Расписание{group ? ` группы ${group}` : ''}
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">Расписание ещё не заполнено.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">Урок</th>
              {DAY_NAMES.map((d) => (
                <th key={d} className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LESSONS.map((lesson) => (
              <tr key={lesson}>
                <td className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 whitespace-nowrap">
                  {lesson}
                </td>
                {DAY_NAMES.map((_, dayIdx) => {
                  const e = cellKey(dayIdx + 1, lesson);
                  return (
                    <td key={`${lesson}-${dayIdx + 1}`} className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 align-top">
                      {e && (
                        <div className="text-xs leading-snug">
                          <p className="font-medium text-gray-900 dark:text-white">{e.subject}</p>
                          {e.teacher && <p className="text-gray-500 dark:text-gray-400">{e.teacher}</p>}
                          {e.room && <p className="text-gray-500 dark:text-gray-400">ауд. {e.room}</p>}
                        </div>
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
  );
}