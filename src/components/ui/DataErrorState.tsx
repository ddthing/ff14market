import { AlertTriangle, RefreshCw } from 'lucide-react';

interface DataErrorStateProps {
  onRetry: () => void;
  compact?: boolean;
}

export const DataErrorState = ({ onRetry, compact = false }: DataErrorStateProps) => (
  <div
    role="alert"
    className={`flex flex-col items-center justify-center rounded-xl border border-[var(--app-danger-border)] bg-[var(--app-danger-surface)] text-center ${compact ? 'px-4 py-6' : 'min-h-[240px] px-6 py-10'}`}
  >
    <AlertTriangle className="mb-3 h-7 w-7 text-[var(--destructive)]" aria-hidden="true" />
    <p className="text-[15px] font-bold text-[var(--app-ink)]">
      실시간 장터 데이터를 불러오지 못했습니다.
    </p>
    <p className="mt-1 text-[13px] text-[var(--app-ink-muted)]">
      잠시 후 다시 시도해 주세요.
    </p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--destructive)] px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--destructive)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-canvas)]"
    >
      <RefreshCw className="h-4 w-4" aria-hidden="true" />
      다시 시도
    </button>
  </div>
);
