import { memo } from 'react';
import { BarChart3, TrendingUp, Activity } from 'lucide-react';
import { StudentStats } from '../types';

export type StatDimension = 'course' | 'group';

interface Props {
  stats: StudentStats | null;
  view?: StatDimension;
}

interface Item {
  key: number | string;
  label: string;
  avgPerformance: number;
  avgAttendance: number;
  count: number;
}

export default memo(function ChartsPanel({ stats, view = 'course' }: Props) {
  if (!stats) return null;

  const courses = [...stats.byCourseStats].sort((a, b) => a.course - b.course);
  const groups = [...(stats.byGroupStats ?? [])]
    .sort((a, b) => a.group.localeCompare(b.group, 'ru'))
    .slice(0, 20);

  const items: Item[] = view === 'course'
    ? courses.map((c) => ({ key: c.course, label: `${c.course}к`, avgPerformance: c.avgPerformance, avgAttendance: c.avgAttendance, count: c.count }))
    : groups.map((g) => ({ key: g.group, label: g.group, avgPerformance: g.avgPerformance, avgAttendance: g.avgAttendance, count: g.count }));

  if (items.length === 0) return null;

  const dim = view === 'course' ? 'по курсам' : 'по группам';
  const maxPerf = 5;
  const maxAtt = 100;

  const PerfChart = () => (
    <div className="card">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">
        <TrendingUp className="w-4 h-4 text-primary-600" /> Средняя успеваемость {dim}
      </h4>
      <div className="flex items-end gap-3 h-52">
        {items.map((c) => (
          <div key={c.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end min-w-0">
            <span className="text-xs font-bold text-primary-700 dark:text-primary-300">{c.avgPerformance.toFixed(1)}</span>
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-primary-600 to-primary-400 transition-all duration-300"
              style={{ height: `${Math.min(100, (c.avgPerformance / maxPerf) * 100)}%` }}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight w-full text-center break-words" title={c.label}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const AttChart = () => (
    <div className="card">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">
        <Activity className="w-4 h-4 text-emerald-600" /> Средняя посещаемость {dim}
      </h4>
      <div className="flex items-end gap-3 h-52">
        {items.map((c) => (
          <div key={c.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end min-w-0">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{c.avgAttendance}%</span>
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-300"
              style={{ height: `${Math.min(100, (c.avgAttendance / maxAtt) * 100)}%` }}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight w-full text-center break-words" title={c.label}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const DebtChart = () => {
    const maxCount = Math.max(...items.map((c) => c.count), 1);
    return (
      <div className="card">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">
          <BarChart3 className="w-4 h-4 text-amber-600" /> Количество студентов {dim}
        </h4>
        <div className="flex items-end gap-3 h-52">
          {items.map((c) => (
            <div key={c.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end min-w-0">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{c.count}</span>
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-amber-600 to-amber-400 transition-all duration-300"
                style={{ height: `${Math.min(100, (c.count / maxCount) * 100)}%` }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight w-full text-center break-words" title={c.label}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <PerfChart />
      <AttChart />
      <DebtChart />
    </div>
  );
});