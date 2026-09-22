import { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  variant?: 'danger' | 'warning';
  confirmText?: string;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ isOpen, title, message, variant = 'danger', confirmText, disabled, onConfirm, onCancel }: Props) {
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
  const confirmLabel = confirmText || (variant === 'danger' ? 'Удалить' : 'Подтвердить');

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
        <div className="text-gray-600 dark:text-gray-400 mb-6">{message}</div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn btn-secondary">Отмена</button>
          <button onClick={onConfirm} disabled={disabled} className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}