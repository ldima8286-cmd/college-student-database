import { useState } from 'react';
import { Trash2, Download, CheckSquare, Square, Pencil } from 'lucide-react';
import { Student } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { toast } from 'react-hot-toast';

interface Props {
  students: Student[];
  onBatchDelete: (ids: string[]) => void;
  onBatchExport: (ids: string[]) => void;
  onBatchUpdate: (ids: string[], patch: Partial<Student>) => Promise<void>;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
}

interface EditState {
  course?: number;
  attendance?: number;
  performance?: number;
  academicDebt?: 'keep' | boolean;
}

export default function BatchActions({ students, onBatchDelete, onBatchExport, onBatchUpdate, selectedIds, setSelectedIds }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editState, setEditState] = useState<EditState>({});
  const [saving, setSaving] = useState(false);
  const allSelected = students.length > 0 && students.every((s) => selectedIds.includes(s.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s.id));
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

  const openEdit = () => {
    setEditState({});
    setEditOpen(true);
  };

  const confirmBatchEdit = async () => {
    const patch: Partial<Student> = {};
    if (editState.course !== undefined) patch.course = editState.course;
    if (editState.attendance !== undefined) patch.attendance = editState.attendance;
    if (editState.performance !== undefined) patch.performance = editState.performance;
    if (editState.academicDebt !== undefined && editState.academicDebt !== 'keep') patch.academicDebt = Boolean(editState.academicDebt);

    if (Object.keys(patch).length === 0) {
      toast.error('Заполните хотя бы одно поле');
      return;
    }

    setSaving(true);
    try {
      await onBatchUpdate(selectedIds, patch);
      setSelectedIds([]);
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "input w-full text-sm";

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

      <ConfirmDialog
        isOpen={editOpen}
        title={`Редактировать ${selectedIds.length} записи`}
        message={
          <div className="space-y-3 text-left">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Курс (1-6)</span>
              <input
                type="number" min={1} max={6}
                value={editState.course ?? ''}
                onChange={(e) => setEditState((p) => ({ ...p, course: e.target.value === '' ? undefined : Number(e.target.value) }))}
                className={inputCls}
                placeholder="Не менять"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Посещаемость (0-100)</span>
              <input
                type="number" min={0} max={100}
                value={editState.attendance ?? ''}
                onChange={(e) => setEditState((p) => ({ ...p, attendance: e.target.value === '' ? undefined : Number(e.target.value) }))}
                className={inputCls}
                placeholder="Не менять"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Успеваемость (0-10)</span>
              <input
                type="number" min={0} max={10} step={0.1}
                value={editState.performance ?? ''}
                onChange={(e) => setEditState((p) => ({ ...p, performance: e.target.value === '' ? undefined : Number(e.target.value) }))}
                className={inputCls}
                placeholder="Не менять"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Академическая задолженность</span>
              <select
                value={editState.academicDebt === undefined ? 'keep' : String(editState.academicDebt)}
                onChange={(e) => setEditState((p) => ({ ...p, academicDebt: e.target.value === 'keep' ? undefined : e.target.value === 'true' }))}
                className={inputCls}
              >
                <option value="keep">Не менять</option>
                <option value="true">Выставить</option>
                <option value="false">Снять</option>
              </select>
            </label>
          </div>
        }
        variant="warning"
        confirmText={saving ? 'Сохранение...' : 'Сохранить'}
        disabled={saving}
        onConfirm={confirmBatchEdit}
        onCancel={() => setEditOpen(false)}
      />

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button onClick={toggleAll} className="px-2 py-1 rounded-lg flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" title={allSelected ? 'Снять выделение' : 'Выбрать все'}>
          {allSelected ? <CheckSquare className="w-5 h-5 text-primary-600" /> : <Square className="w-5 h-5 text-gray-400" />}
          <span>{allSelected ? 'Снять все' : 'Выбрать все'}</span>
        </button>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 ml-2 animate-slide-down flex-wrap">
            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
              Выбрано: {selectedIds.length}
            </span>
            <button onClick={openEdit} className="btn btn-secondary text-sm flex items-center gap-1">
              <Pencil className="w-4 h-4" />
              Редактировать
            </button>
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