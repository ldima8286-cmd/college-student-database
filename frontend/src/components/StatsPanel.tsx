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
      bg: 'bg-primary-50 dark:bg-primary-900/20',
    },
    {
      label: 'С задолженностью',
      value: stats.withDebt,
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: 'Средняя посещаемость',
      value: `${stats.avgAttendance}%`,
      icon: Activity,
      color: stats.avgAttendance >= 90 ? 'text-emerald-600 dark:text-emerald-400' : stats.avgAttendance >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'Средняя успеваемость',
      value: stats.avgPerformance.toFixed(1),
      icon: TrendingUp,
      color: stats.avgPerformance >= 4.5 ? 'text-emerald-600 dark:text-emerald-400' : stats.avgPerformance >= 3.5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
  ];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {mainStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`card flex items-center gap-3 ${stat.bg}`}>
              <Icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {Object.keys(stats.byCourse).length > 0 && (
        <div className="card mt-4">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">По курсам</h4>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.byCourse)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([course, count]) => (
                <div key={course} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700/50">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{course} курс:</span>
                  <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
});
