import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, total, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="btn btn-secondary disabled:opacity-30 flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Назад
        </button>
        <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
          стр. {page} из {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="btn btn-secondary disabled:opacity-30 flex items-center gap-1 text-sm"
        >
          Вперёд
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        Всего: {total} записей
      </span>
    </div>
  );
}
