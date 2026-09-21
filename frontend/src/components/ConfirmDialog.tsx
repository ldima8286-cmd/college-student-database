import { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ isOpen, title, message, variant = 'danger', onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const Icon = variant === 'danger' ? Trash2 : AlertTriangle;
  const iconColor = variant === 'danger' ? 'text-red-600' : 'text-amber-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel}></div>
      <div ref={dialogRef} className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-xl bg-gray-100 dark:bg-gray-700 ${iconColor}`}>
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn btn-secondary">Отмена</button>
          <button onClick={onConfirm} className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}>
            {variant === 'danger' ? 'Удалить' : 'Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  );
}
