import { memo } from 'react';
import { Student } from '../types';
import { Pencil, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  onToggleDebt: (student: Student) => void;
  readOnly?: boolean;
}

const attendanceColor = (att: number) => {
  if (att >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (att >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

const performanceColor = (perf: number) => {
  if (perf >= 9) return 'text-emerald-600 dark:text-emerald-400';
  if (perf >= 7) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

export default memo(function StudentCards({ students, onEdit, onDelete, onToggleDebt, readOnly }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.map((student) => (
        <div key={student.id}
          className={`card card-hover animate-fade-in ${
            student.academicDebt ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-primary-500'
          }`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{student.fullName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                  {student.group}
                </span>
                <span className="text-xs text-gray-500">{student.course} курс</span>
              </div>
            </div>
            {!readOnly && (
              <div className="flex items-center gap-1 ml-2">
                <button onClick={() => onEdit(student)} className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Редактировать">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(student)} className="p-1.5 rounded-lg transition-colors hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600" title="Удалить">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 truncate">{student.specialty}</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Посещаемость</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${
                    student.attendance >= 90 ? 'bg-emerald-500' : student.attendance >= 70 ? 'bg-amber-500' : 'bg-red-500'
                  }`} style={{ width: `${student.attendance}%` }}></div>
                </div>
                <span className={`text-sm font-semibold ${attendanceColor(student.attendance)}`}>{student.attendance}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Успеваемость</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${
                    student.performance >= 9 ? 'bg-emerald-500' : student.performance >= 7 ? 'bg-amber-500' : 'bg-red-500'
                  }`} style={{ width: `${(student.performance / 10) * 100}%` }}></div>
                </div>
                <span className={`text-sm font-semibold ${performanceColor(student.performance)}`}>{student.performance.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {student.academicDebt && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs font-medium mb-3">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Академическая задолженность</span>
            </div>
          )}

          {!readOnly && (
            <button onClick={() => onToggleDebt(student)}
              className={`w-full btn text-sm flex items-center justify-center gap-2 ${
                student.academicDebt ? 'btn-success' : 'btn-secondary'
              }`}>
              {student.academicDebt ? (
                <><CheckCircle className="w-4 h-4" /> Снять задолженность</>
              ) : (
                <><AlertTriangle className="w-4 h-4" /> Добавить задолженность</>
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
});
