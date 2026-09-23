import { useRef, useState } from 'react';
import { Download, Upload, FileJson, FileSpreadsheet, Loader2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student } from '../types';
import { createStudent, getStudents } from '../api';
import { toast } from 'react-hot-toast';

interface Props {
  onImportComplete: () => void;
}

interface PreviewRow {
  key: string;
  rowNumber: number;
  student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> | null;
  duplicate: boolean;
  error?: string;
  selected: boolean;
}

export default function ImportExport({ onImportComplete }: Props) {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const duplicateKeys = useRef<Set<string> | undefined>(undefined);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [fileName, setFileName] = useState('');

  const exportToJSON = async () => {
    try {
      const res = await getStudents({ limit: 10000 });
      const dataStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('JSON экспортирован');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const exportToExcel = async () => {
    try {
      const res = await getStudents({ limit: 10000 });
      const rows = res.data.map(s => ({
        'ФИО': s.fullName,
        'Курс': s.course,
        'Группа': s.group,
        'Специальность': s.specialty,
        'Email': s.email || '',
        'Телефон': s.phone || '',
        'Посещаемость (%)': s.attendance,
        'Успеваемость (0-5)': s.performance,
        'Задолженность': s.academicDebt ? 'Да' : 'Нет',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 30 }, { wch: 6 }, { wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Студенты');
      XLSX.writeFile(wb, `students_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Excel экспортирован');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const parseStudentRow = (row: any): { student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> | null; error?: string } => {
    const fullName = String(row['ФИО'] || row['fullName'] || row['full_name'] || '').trim();
    const group = String(row['Группа'] || row['group'] || '').trim();
    const specialty = String(row['Специальность'] || row['specialty'] || '').trim();
    const rawCourse = parseInt(row['Курс'] || row['course'] || '1');
    const course = isNaN(rawCourse) ? 1 : rawCourse;
    const rawAttendance = parseInt(row['Посещаемость (%)'] || row['attendance'] || '100');
    const rawPerformance = parseFloat(row['Успеваемость (0-5)'] || row['performance'] || '4.0');
    const attendance = isNaN(rawAttendance) ? 100 : rawAttendance;
    const performance = isNaN(rawPerformance) ? 4.0 : rawPerformance;
    const debtVal = row['Задолженность'] || row['academicDebt'] || row['academic_debt'] || '';
    const academicDebt = debtVal === 'Да' || debtVal === 'true' || debtVal === true || debtVal === 1;
    const email = String(row['Email'] || row['email'] || '').trim();
    const phone = String(row['Телефон'] || row['phone'] || '').trim();

    if (!fullName || !group || !specialty) {
      return { student: null, error: 'Не заполнены обязательные поля (ФИО, группа, специальность)' };
    }
    if (course < 1 || course > 6) {
      return { student: null, error: `Некорректный курс (${course}). Допустимо 1-6` };
    }
    if (attendance < 0 || attendance > 100) {
      return { student: null, error: `Некорректная посещаемость (${attendance})` };
    }
    if (performance < 0 || performance > 5) {
      return { student: null, error: `Некорректная успеваемость (${performance})` };
    }

    return {
      student: {
        fullName,
        course,
        group,
        specialty,
        attendance,
        performance,
        academicDebt,
        email: email || null,
        phone: phone || null,
      },
    };
  };

  const keyOf = (s: { fullName: string; group: string }) =>
    `${s.fullName.trim().toLowerCase()}|${s.group.trim().toLowerCase()}`;

  const buildPreview = async (data: any[], tableName: string) => {
    const existingKeys = await loadExistingKeys();
    const rows: PreviewRow[] = [];
    data.forEach((row, i) => {
      const { student, error } = parseStudentRow(row);
      const key = student ? keyOf(student) : '';
      const duplicate = student ? existingKeys.has(key) : false;
      rows.push({
        key,
        rowNumber: i + 2,
        student,
        duplicate,
        error,
        selected: !!student && !duplicate && !error,
      });
    });
    setFileName(tableName);
    setPreview(rows);
  };

  const loadExistingKeys = async () => {
    if (duplicateKeys.current) return duplicateKeys.current;
    const res = await getStudents({ limit: 10000 });
    const keys = new Set<string>();
    for (const s of res.data) keys.add(keyOf(s));
    duplicateKeys.current = keys;
    return keys;
  };

  const importFromJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as any[];
      if (!Array.isArray(data)) throw new Error('Файл должен содержать массив студентов');
      await buildPreview(data, file.name);
    } catch (err: any) {
      toast.error(`Ошибка: ${err.message}`);
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  const importFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      if (data.length === 0) throw new Error('Файл пуст');
      await buildPreview(data, file.name);
    } catch (err: any) {
      toast.error(`Ошибка: ${err.message}`);
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const toggleRow = (index: number) => {
    setPreview((prev) => prev?.map((r, i) => i === index ? { ...r, selected: !r.selected } : r) ?? null);
  };

  const toggleAll = () => {
    setPreview((prev) => {
      if (!prev) return prev;
      const anyUnselected = prev.some((r) => !r.selected);
      return prev.map((r) => ({ ...r, selected: r.student && !r.duplicate && !r.error ? anyUnselected : r.selected }));
    });
  };

  const commitImport = async () => {
    if (!preview) return;
    const rowsToImport = preview.filter((r) => r.selected && r.student);
    if (rowsToImport.length === 0) {
      toast.error('Выберите хотя бы одну строку');
      return;
    }
    setImporting(true);
    let imported = 0;
    try {
      for (const row of rowsToImport) {
        await createStudent(row.student!);
        duplicateKeys.current?.add(row.key);
        imported++;
      }
      toast.success(`Импортировано: ${imported} студент(ов)`);
      duplicateKeys.current = undefined;
      setPreview(null);
      onImportComplete();
    } catch (err: any) {
      toast.error(`Ошибка импорта: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const validCount = preview?.filter((r) => r.student && !r.duplicate && !r.error).length ?? 0;
  const selectedCount = preview?.filter((r) => r.selected).length ?? 0;
  const duplicateCount = preview?.filter((r) => r.duplicate).length ?? 0;
  const errorCount = preview?.filter((r) => !r.student).length ?? 0;

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">Импорт / Экспорт</h3>
      <div className="flex flex-wrap gap-2">
        <button onClick={exportToJSON} className="btn btn-secondary text-sm flex items-center gap-1.5">
          <FileJson className="w-4 h-4" /> JSON
        </button>
        <button onClick={exportToExcel} className="btn btn-secondary text-sm flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4" /> Excel
        </button>
        <label className={`btn btn-secondary text-sm flex items-center gap-1.5 cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Импорт JSON
          <input ref={jsonInputRef} type="file" accept=".json" onChange={importFromJSON} className="hidden" />
        </label>
        <label className={`btn btn-secondary text-sm flex items-center gap-1.5 cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Импорт Excel
          <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={importFromExcel} className="hidden" />
        </label>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Предпросмотр импорта: {fileName}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Готово к импорту: {validCount} · Дубликаты: {duplicateCount} · Ошибки: {errorCount}
                </p>
              </div>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-5 py-3">
              <button onClick={toggleAll} className="text-sm text-primary-600 hover:text-primary-700 mb-2">
                {preview.some((r) => !r.selected && r.student && !r.duplicate && !r.error) ? 'Выбрать все корректные' : 'Снять выбор'}
              </button>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-2"></th>
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">ФИО</th>
                    <th className="py-2 pr-2">Курс</th>
                    <th className="py-2 pr-2">Группа</th>
                    <th className="py-2 pr-2">Специальность</th>
                    <th className="py-2">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {preview.map((row, i) => (
                    <tr key={i} className={row.selected ? '' : 'opacity-50'}>
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={!row.student || row.duplicate || !!row.error}
                          onChange={() => toggleRow(i)}
                          className="accent-primary-600"
                        />
                      </td>
                      <td className="py-2 pr-2 text-gray-500 dark:text-gray-400">{row.rowNumber}</td>
                      <td className="py-2 pr-2 font-medium text-gray-900 dark:text-white">{row.student?.fullName ?? '—'}</td>
                      <td className="py-2 pr-2 text-gray-600 dark:text-gray-300">{row.student?.course ?? '—'}</td>
                      <td className="py-2 pr-2 text-gray-600 dark:text-gray-300">{row.student?.group ?? '—'}</td>
                      <td className="py-2 pr-2 text-gray-600 dark:text-gray-300">{row.student?.specialty ?? '—'}</td>
                      <td className="py-2">
                        {row.student && !row.duplicate && !row.error && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ОК
                          </span>
                        )}
                        {row.duplicate && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400" title={row.student?.fullName}>
                            <AlertTriangle className="w-3.5 h-3.5" /> Дубликат
                          </span>
                        )}
                        {!row.student && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-500" title={row.error}>
                            <AlertTriangle className="w-3.5 h-3.5" /> {row.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Выбрано: <span className="font-semibold text-gray-900 dark:text-white">{selectedCount}</span>
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPreview(null)} className="btn btn-secondary text-sm">Отмена</button>
                <button
                  onClick={commitImport}
                  disabled={importing || selectedCount === 0}
                  className="btn btn-primary text-sm flex items-center gap-1.5"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {importing ? 'Импорт...' : `Импортировать (${selectedCount})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}