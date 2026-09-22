import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Student } from '../types';

interface Props {
  students?: Student[];
}

export default function PdfExport({ students }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF('landscape', 'mm', 'a4');
      const data = students || [];

      doc.setFontSize(16);
      doc.text(`Отчёт о студентах — ${new Date().toLocaleDateString('ru-RU')}`, 14, 15);

      const rows = data.map((s) => [
        s.fullName,
        String(s.course),
        s.group,
        s.specialty,
        s.email || '',
        s.phone || '',
        `${s.attendance}%`,
        s.performance.toFixed(1),
        s.academicDebt ? 'Да' : 'Нет',
      ]);

      autoTable(doc, {
        startY: 25,
        head: [['ФИО', 'Курс', 'Группа', 'Специальность', 'Email', 'Телефон', 'Посещаемость', 'Успеваемость', 'Задолженность']],
        body: rows,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
      });

      doc.save(`students_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF экспортирован');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка экспорта PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="btn btn-secondary text-sm flex items-center gap-1.5"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      PDF
    </button>
  );
}
