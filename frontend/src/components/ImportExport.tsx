import { useRef, useState } from 'react';
import { Download, Upload, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student } from '../types';
import { createStudent, getStudents } from '../api';
import { toast } from 'react-hot-toast';

interface Props {
  onImportComplete: () => void;
}

export default function ImportExport({ onImportComplete }: Props) {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const duplicateKeys = useRef<Set<string> | undefined>(undefined);
  const [importing, setImporting] = useState(false);

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

  const parseStudentRow = (row: any): Omit<Student, 'id' | 'createdAt' | 'updatedAt'> | null => {
    const fullName = row['ФИО'] || row['fullName'] || row['full_name'] || '';
    const course = parseInt(row['Курс'] || row['course'] || '1');
    const group = row['Группа'] || row['group'] || '';
    const specialty = row['Специальность'] || row['specialty'] || '';
    const attendance = parseInt(row['Посещаемость (%)'] || row['attendance'] || '100');
    const performance = parseFloat(row['Успеваемость (0-5)'] || row['performance'] || '4.0');
    const debtVal = row['Задолженность'] || row['academicDebt'] || row['academic_debt'] || '';
    const academicDebt = debtVal === 'Да' || debtVal === 'true' || debtVal === true || debtVal === 1;
    const email = row['Email'] || row['email'] || '';
    const phone = row['Телефон'] || row['phone'] || '';

    if (!fullName.trim() || !group.trim() || !specialty.trim()) return null;

    return {
      fullName: fullName.trim(),
      course: Math.min(6, Math.max(1, isNaN(course) ? 1 : course)),
      group: group.trim(),
      specialty: specialty.trim(),
      attendance: Math.min(100, Math.max(0, isNaN(attendance) ? 100 : attendance)),
      performance: Math.min(5, Math.max(0, isNaN(performance) ? 4.0 : performance)),
      academicDebt,
      email: email.trim() ? email.trim() : null,
      phone: phone.trim() ? phone.trim() : null,
    };
  };

  const loadExistingKeys = async () => {
    if (duplicateKeys.current) return duplicateKeys.current;
    const res = await getStudents({ limit: 10000 });
    const keys = new Set<string>();
    for (const s of res.data) keys.add(`${s.fullName.trim().toLowerCase()}|${s.group.trim().toLowerCase()}`);
    duplicateKeys.current = keys;
    return keys;
  };

  const importFromJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const text = await file.text();
      const data = JSON.parse(text) as any[];
      if (!Array.isArray(data)) throw new Error('Файл должен содержать массив студентов');

      const existingKeys = await loadExistingKeys();
      let imported = 0;
      let skipped = 0;

      for (const row of data) {
        const student = parseStudentRow(row);
        if (!student) { skipped++; continue; }
        const key = `${student.fullName.trim().toLowerCase()}|${student.group.trim().toLowerCase()}`;
        if (existingKeys.has(key)) { skipped++; continue; }
        try {
          await createStudent(student);
          existingKeys.add(key);
          imported++;
        } catch { skipped++; }
      }

      toast.success(`Импорт: ${imported} добавлено, ${skipped} пропущено (дубликаты/ошибки)`);
      duplicateKeys.current = undefined;
      onImportComplete();
    } catch (err: any) {
      toast.error(`Ошибка: ${err.message}`);
    } finally {
      setImporting(false);
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  const importFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);

      if (data.length === 0) throw new Error('Файл пуст');

      const existingKeys = await loadExistingKeys();
      let imported = 0;
      let skipped = 0;

      for (const row of data) {
        const student = parseStudentRow(row);
        if (!student) { skipped++; continue; }
        const key = `${student.fullName.trim().toLowerCase()}|${student.group.trim().toLowerCase()}`;
        if (existingKeys.has(key)) { skipped++; continue; }
        try {
          await createStudent(student);
          existingKeys.add(key);
          imported++;
        } catch { skipped++; }
      }

      toast.success(`Импорт: ${imported} добавлено, ${skipped} пропущено (дубликаты/ошибки)`);
      duplicateKeys.current = undefined;
      onImportComplete();
    } catch (err: any) {
      toast.error(`Ошибка: ${err.message}`);
    } finally {
      setImporting(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

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
    </div>
  );
}
