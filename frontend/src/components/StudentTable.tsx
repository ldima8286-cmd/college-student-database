import { memo } from 'react';
import { Student, SortField, SortOrder } from '../types';
import { Pencil, Trash2, CheckCircle, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  students: Student[];
  sortBy: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  onToggleDebt: (student: Student) => void;
  readOnly?: boolean;
}

const SortIcon = ({ field, current, order }: { field: SortField; current: SortField; order: SortOrder }) => {
  if (field !== current) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  return order === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
};

const attendanceColor = (att: number) => {
  if (att >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (att >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

const performanceColor = (perf: number) => {
  if (perf >= 4.5) return 'text-emerald-600 dark:text-emerald-400';
  if (perf >= 3.5) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

export default memo(function StudentTable({ students, sortBy, sortOrder, onSort, onEdit, onDelete, onToggleDebt, readOnly }: Props) {
  const columns: { field: SortField; label: string; className?: string }[] = [
    { field: 'fullName', label: 'ФИО' },
    { field: 'course', label: 'Курс', className: 'hidden sm:table-cell' },
    { field: 'group', label: 'Группа' },
    { field: 'specialty', label: 'Специальность', className: 'hidden md:table-cell' },
    { field: 'attendance', label: 'Посещ.', className: 'hidden lg:table-cell' },
    { field: 'performance', label: 'Успев.', className: 'hidden lg:table-cell' },
  ];

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              {columns.map((col) => (
                <th key={col.field} onClick={() => onSort(col.field)}
                  className={`px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors select-none ${col.className || ''}`}>
                  <span className="inline-flex items-center gap-1.5">
                    {col.label} <SortIcon field={col.field} current={sortBy} order={sortOrder} />
                  </span>
                </th>
              ))}
              {!readOnly && <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 w-32">Действия</th>}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}
                className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                  student.academicDebt ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {student.academicDebt && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500"></span>}
                    <span className="font-medium text-gray-900 dark:text-white">{student.fullName}</span>
                    {student.status === 'pending' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                        Модерация
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-400">{student.course}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                    {student.group}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400 max-w-[200px] truncate">{student.specialty}</td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className={`font-semibold ${attendanceColor(student.attendance)}`}>{student.attendance}%</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className={`font-semibold ${performanceColor(student.performance)}`}>{student.performance.toFixed(1)}</span>
                </td>
                {!readOnly && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onToggleDebt(student)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                        title={student.academicDebt ? 'Снять задолженность' : 'Добавить задолженность'}>
                        {student.academicDebt
                          ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                          : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      </button>
                      <button onClick={() => onEdit(student)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                        title="Редактировать">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(student)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                        title="Удалить">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
