import React from 'react';
import { Student } from '../types';
import { createStudent } from '../api';

interface Props {
  students: Student[];
  onImport: () => void;
}

const ImportExport: React.FC<Props> = ({ students, onImport }) => {
  const exportToJSON = () => {
    const dataStr = JSON.stringify(students, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFromJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as Student[];
        for (const student of imported) {
          await createStudent({ ...student, id: Date.now() + Math.random().toString() });
        }
        onImport();
        alert('Импорт завершён');
      } catch (err) {
        alert('Ошибка импорта: неверный JSON');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="card">
      <h3>📁 Импорт / Экспорт</h3>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button className="btn btn-success" onClick={exportToJSON}>📤 Экспорт в JSON</button>
        <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
          📥 Импорт из JSON
          <input type="file" accept=".json" onChange={importFromJSON} style={{ display: 'none' }} />
        </label>
      </div>
    </div>
  );
};

export default ImportExport;