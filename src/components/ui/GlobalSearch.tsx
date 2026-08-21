import { useEffect, useRef } from 'react';
import { Command, Search, X } from 'lucide-react';
import { ItemSearch } from './ItemSearch';
import { useSearchStore } from '../../store/useSearchStore';

const SEARCH_DIALOG_ID = 'global-item-search';

/**
 * One responsive search surface for the whole product:
 * a centered command palette on desktop and a bottom sheet on mobile.
 */
export const GlobalSearch = () => {
  const isOpen = useSearchStore((state) => state.isOpen);
  const open = useSearchStore((state) => state.open);
  const close = useSearchStore((state) => state.close);
  const wasOpen = useRef(false);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const previousBodyOverflow = useRef('');

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        open();
        return;
      }

      if (isOpen && event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [close, isOpen, open]);

  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      previouslyFocusedElement.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      previousBodyOverflow.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    if (!isOpen && wasOpen.current) {
      document.body.style.overflow = previousBodyOverflow.current;
      requestAnimationFrame(() => {
        const focusTarget = previouslyFocusedElement.current?.isConnected
          ? previouslyFocusedElement.current
          : document.querySelector<HTMLElement>('[data-search-trigger="true"]');
        focusTarget?.focus();
      });
    }

    wasOpen.current = isOpen;

    return () => {
      if (isOpen) document.body.style.overflow = previousBodyOverflow.current;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,var(--app-ink)_18%,transparent)] p-0 backdrop-blur-[2px] md:items-start md:p-4 md:pt-[12vh]"
      onPointerDown={close}
      role="presentation"
    >
      <section
        id={SEARCH_DIALOG_ID}
        aria-labelledby={`${SEARCH_DIALOG_ID}-title`}
        aria-modal="true"
        className="w-full max-h-[min(80vh,540px)] overflow-visible rounded-t-2xl border border-b-0 border-[var(--app-hairline)] bg-[var(--app-surface)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-12px_36px_rgba(23,25,28,0.14)] animate-slide-up md:max-w-2xl md:rounded-2xl md:border-b md:p-5 md:pb-5 md:shadow-[0_20px_60px_rgba(23,25,28,0.16)] md:animate-pop-in"
        onPointerDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--app-surface-subtle)] text-[var(--app-ink)]" aria-hidden="true">
              <Search className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 id={`${SEARCH_DIALOG_ID}-title`} className="truncate text-[15px] font-bold text-[var(--app-ink)]">
                아이템 찾기
              </h2>
              <p className="hidden text-[11px] text-[var(--app-ink-muted)] sm:block">
                이름이나 종류로 장터 아이템을 검색하세요.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1 text-[11px] text-[var(--app-ink-muted)] sm:inline-flex" aria-label="검색창 닫기 단축키 Escape">
              <kbd className="rounded border border-[var(--app-hairline)] px-1.5 py-0.5 font-medium">Esc</kbd>
              닫기
            </span>
            <button
              type="button"
              onClick={close}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-[var(--app-ink-muted)] transition-colors hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/60"
              aria-label="아이템 검색 닫기"
            >
              <X className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        </div>

        <ItemSearch
          variant="compact"
          autoFocus
          onSelect={close}
          onEscape={close}
        />

        <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--app-ink-muted)]" aria-label="검색 단축키 안내">
          <Command className="h-3.5 w-3.5" aria-hidden="true" />
          <span><kbd className="font-semibold">Ctrl</kbd>/<kbd className="font-semibold">⌘</kbd> + <kbd className="font-semibold">K</kbd>로 언제든 열 수 있습니다.</span>
        </div>
      </section>
    </div>
  );
};
