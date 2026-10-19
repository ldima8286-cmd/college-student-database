import { memo } from 'react';
import { StudentStats } from '../types';
import { Users, AlertTriangle, Activity, TrendingUp } from 'lucide-react';

interface Props {
  stats: StudentStats | null;
}

export default memo(function StatsPanel({ stats }: Props) {
  if (!stats) return null;

  const mainStats = [
    {
      label: 'Всего студентов',
      value: stats.total,
      icon: Users,
      color: 'text-primary-600 dark:text-primary-400',
    },
    {
      label: 'С задолженностью',
      value: stats.withDebt,
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Средняя посещаемость',
      value: `${stats.avgAttendance}%`,
      icon: Activity,
      color: stats.avgAttendance >= 90 ? 'text-emerald-600 dark:text-emerald-400' : stats.avgAttendance >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Средняя успеваемость',
      value: stats.avgPerformance.toFixed(1),
      icon: TrendingUp,
      color: stats.avgPerformance >= 4.5 ? 'text-emerald-600 dark:text-emerald-400' : stats.avgPerformance >= 3.5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400',
    },
  ];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-200 dark:bg-gray-700 overflow-hidden">
        {mainStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white dark:bg-gray-800 p-5">
              <Icon className={`w-5 h-5 mb-3 ${stat.color}`} />
              <p className="font-mono text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {Object.keys(stats.byCourse).length > 0 && (
        <div className="card mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">По курсам</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byCourse)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([course, count]) => (
                <div key={course} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{course} курс:</span>
                  <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
});
