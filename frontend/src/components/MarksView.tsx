import { MarkRecord } from '../types';
import { BookOpen } from 'lucide-react';

interface Props {
  marks: MarkRecord[];
}

function gradeColor(mark: number): string {
  if (mark >= 5) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
  if (mark === 4) return 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300';
  if (mark === 3) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
  return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function MarksView({ marks }: Props) {
  const bySubject = new Map<string, MarkRecord[]>();
  for (const m of marks) {
    const key = m.subjectName || 'Без предмета';
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key)!.push(m);
  }

  const overallAvg =
    marks.length > 0
      ? (marks.reduce((acc, m) => acc + m.mark, 0) / marks.length).toFixed(1)
      : null;

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2">
        <BookOpen className="w-4 h-4" />
        Оценки
        {overallAvg !== null && (
          <span className="ml-auto text-xs font-medium text-gray-500 dark:text-gray-400">
            Средний балл: <span className="text-gray-900 dark:text-white">{overallAvg}</span>
          </span>
        )}
      </h3>
      {marks.length === 0 ? (
        <p className="text-sm text-gray-500">Оценки пока не выставлены.</p>
      ) : (
        <div className="space-y-4">
          {Array.from(bySubject.entries()).map(([subject, list]) => {
            const avg = (list.reduce((acc, m) => acc + m.mark, 0) / list.length).toFixed(1);
            return (
              <div key={subject}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{subject}</p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">ср. {avg}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {list.map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <span className={`inline-flex w-7 h-7 items-center justify-center rounded-md text-sm font-bold ${gradeColor(m.mark)}`}>
                        {m.mark}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(m.createdAt)}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}