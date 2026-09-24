import { Component, lazy, useState, useMemo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

interface BoundaryProps {
  children: ReactNode;
  onRetry: () => void;
}

class LazyErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch() {
    /* ошибка показана в UI — обработка не требуется */
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="py-16 flex items-center justify-center">
          <div className="card max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Раздел не загрузился</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Похоже, сеть нестабильна. Нажмите «Повторить», чтобы загрузить раздел ещё раз.
            </p>
            <button onClick={() => { this.setState({ failed: false }); this.props.onRetry(); }} className="btn btn-primary inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Повторить
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function retryableLazy<T extends ComponentType<any>>(loader: () => Promise<{ default: T }>) {
  return function RetryableLazy() {
    const [attempt, setAttempt] = useState(0);
    const Comp = useMemo<ComponentType>(() => lazy(loader) as unknown as ComponentType, [attempt]);
    return (
      <LazyErrorBoundary onRetry={() => setAttempt((a) => a + 1)}>
        <Comp />
      </LazyErrorBoundary>
    );
  };
}