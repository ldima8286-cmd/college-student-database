import { useState } from 'react';
import { ScheduleEntry, ScheduleWeek } from '../types';
import { CalendarDays } from 'lucide-react';
import { WEEK_LABELS, WEEK_SHORT, weekOfDate } from '../utils/weeks';

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const LESSONS = Array.from({ length: 10 }, (_, i) => i + 1);

interface Props {
  entries: ScheduleEntry[];
  group?: string | null;
  semesterStart?: string | null;
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

export default function ScheduleView({ entries, group, semesterStart }: Props) {
  const [weekFilter, setWeekFilter] = useState<'' | ScheduleWeek>('');

  const cellEntries = (day: number, lesson: number) =>
    entries.filter((e) => e.dayOfWeek === day && e.lessonNumber === lesson && (weekFilter === '' || e.week === null || e.week === weekFilter));

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayWeek = semesterStart ? weekOfDate(todayISO, semesterStart) : null;

  const hasWeeks = entries.some((e) => e.week !== null);
  const counts: Record<string, { upper: number; lower: number; all: number }> = {};
  for (const e of entries) {
    const c = (counts[e.dayOfWeek] ??= { upper: 0, lower: 0, all: 0 });
    if (e.week === null) { c.upper++; c.lower++; c.all++; }
    else { c[e.week]++; c.all++; }
  }

  return (
    <div className="card overflow-x-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Расписание{group ? ` группы ${group}` : ''}
        </h3>
        {hasWeeks && (
          <div className="flex items-center gap-1">
            {(['', 'upper', 'lower'] as ('' | ScheduleWeek)[]).map((w) => (
              <button
                key={w || 'all'}
                onClick={() => setWeekFilter(w)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                  weekFilter === w
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400'
                }`}
              >
                {w === '' ? 'Обе' : WEEK_LABELS[w]}
              </button>
            ))}
            {todayWeek && (
              <span className="ml-1 text-[11px] text-gray-500 dark:text-gray-400">
                Сейчас — {WEEK_LABELS[todayWeek]} неделя
              </span>
            )}
          </div>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">Расписание ещё не заполнено.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">Пара</th>
              {DAY_NAMES.map((d, i) => (
                <th key={d} className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  {d}
                  {hasWeeks && <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal"> · {counts[i + 1] ? `${counts[i + 1].upper}в/${counts[i + 1].lower}н` : '0'}</span>}
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
                  const day = dayIdx + 1;
                  const cell = cellEntries(day, lesson);
                  return (
                    <td key={`${lesson}-${day}`} className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 align-top">
                      {(() => {
                        const upper = cell.filter((e) => e.week !== 'lower');
                        const lower = cell.filter((e) => e.week === 'lower');
                        const renderItem = (e: ScheduleEntry) => (
                          <div key={e.id} className="text-xs leading-snug mb-0.5">
                            <p className="font-medium text-gray-900 dark:text-white flex items-start justify-between gap-1">
                              <span>{e.subject}</span>
                              <WeekBadge week={e.week} />
                            </p>
                            {e.teacher && <p className="text-gray-500 dark:text-gray-400">{e.teacher}</p>}
                            {e.room && <p className="text-gray-500 dark:text-gray-400">ауд. {e.room}</p>}
                          </div>
                        );
                        return (
                          <>
                            {upper.map(renderItem)}
                            {upper.length > 0 && lower.length > 0 && (
                              <div className="my-1 border-t border-dashed border-gray-300 dark:border-gray-600" title="Разделение верхняя/нижняя неделя" />
                            )}
                            {lower.map(renderItem)}
                          </>
                        );
                      })()}
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