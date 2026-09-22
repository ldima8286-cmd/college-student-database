import { useState } from 'react';
import { Trash2, Download, CheckSquare, Square } from 'lucide-react';
import { Student } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { toast } from 'react-hot-toast';

interface Props {
  students: Student[];
  onBatchDelete: (ids: string[]) => void;
  onBatchExport: (ids: string[]) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
}

export default function BatchActions({ students, onBatchDelete, onBatchExport, selectedIds, setSelectedIds }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const allSelected = students.length > 0 && students.every((s) => selectedIds.includes(s.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s.id));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmOpen(true);
  };

  const confirmBatchDelete = () => {
    onBatchDelete(selectedIds);
    setSelectedIds([]);
    setConfirmOpen(false);
  };

  return (
    <>
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Удалить выбранных?"
        message={`Вы уверены, что хотите удалить ${selectedIds.length} записей?`}
        variant="danger"
        onConfirm={confirmBatchDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <div className="flex items-center gap-2">
        <button onClick={toggleAll} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title={allSelected ? 'Снять выделение' : 'Выбрать все'}>
          {allSelected ? <CheckSquare className="w-5 h-5 text-primary-600" /> : <Square className="w-5 h-5 text-gray-400" />}
        </button>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 ml-2 animate-slide-down">
            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
              Выбрано: {selectedIds.length}
            </span>
            <button onClick={handleBatchDelete} className="btn btn-danger text-sm flex items-center gap-1">
              <Trash2 className="w-4 h-4" />
              Удалить выбранное
            </button>
            <button onClick={() => onBatchExport(selectedIds)} className="btn btn-secondary text-sm flex items-center gap-1">
              <Download className="w-4 h-4" />
              Экспорт выбранных
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export function BatchCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
      {checked ? <CheckSquare className="w-4 h-4 text-primary-600" /> : <Square className="w-4 h-4 text-gray-400" />}
    </button>
  );
}
