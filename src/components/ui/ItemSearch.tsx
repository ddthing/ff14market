import { memo, useEffect, useId, useRef, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent } from 'react';
import { BarChart3, Flame, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchItemSearch, type ItemCatalogEntry } from '../../api/itemCatalog';
import { getIconUrl } from '../../utils/icon';
import type { EnrichedItem } from '../../hooks/useItemData';

type ItemSearchProps = {
  variant?: 'hero' | 'compact';
  recommendedItems?: ReadonlyArray<Pick<EnrichedItem, 'id' | 'name'>>;
  placeholder?: string;
  autoFocus?: boolean;
  onSelect?: () => void;
  onEscape?: () => void;
};

/**
 * Shared item search interaction for the home hero and global header.
 * Keeping one search state machine prevents page-specific behavior drift.
 */
export const ItemSearch = memo(({
  variant = 'hero',
  recommendedItems = [],
  placeholder,
  autoFocus = false,
  onSelect,
  onEscape,
}: ItemSearchProps) => {
  const [searchResults, setSearchResults] = useState<ItemCatalogEntry[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [hasSearchError, setHasSearchError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const navigate = useNavigate();
  const isHero = variant === 'hero';
  // iOS Safari zooms focused inputs below 16px; compact sizing starts at md.
  const inputClassName = isHero ? 'pl-4 pr-6 text-[16px] md:text-[18px]' : 'px-2.5 pr-3 text-[16px] md:text-[13px]';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const query = debouncedSearchQuery.trim();
    if (!query) return;

    const controller = new AbortController();

    void fetchItemSearch(query, controller.signal)
      .then(setSearchResults)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSearchResults([]);
        setHasSearchError(true);
        console.error('Item search failed', error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsSearchLoading(false);
      });

    return () => controller.abort();
  }, [debouncedSearchQuery]);

  useEffect(() => {
    setActiveResultIndex((currentIndex) => (
      currentIndex !== null && currentIndex < searchResults.length ? currentIndex : null
    ));
  }, [searchResults.length]);

  const isSearching = searchQuery !== debouncedSearchQuery || (searchQuery.trim().length > 0 && isSearchLoading);
  const activeResult = activeResultIndex === null ? null : searchResults[activeResultIndex];

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    const hasQuery = nextQuery.trim().length > 0;
    setSearchQuery(nextQuery);
    setIsDropdownOpen(nextQuery.length > 0);
    setActiveResultIndex(null);
    setIsSearchLoading(hasQuery);
    setHasSearchError(false);
    if (!hasQuery) {
      setSearchResults([]);
      setIsSearchLoading(false);
    }
  };

  const handleSearchBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDropdownOpen(false);
    }
  };

  const handleItemClick = (item: ItemCatalogEntry) => {
    setIsDropdownOpen(false);
    setActiveResultIndex(null);
    setSearchQuery('');
    onSelect?.();
    navigate(`/item/${item.id}`);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsDropdownOpen(false);
      setActiveResultIndex(null);
      onEscape?.();
      return;
    }

    if (event.key === 'ArrowDown' && searchResults.length > 0) {
      event.preventDefault();
      setIsDropdownOpen(true);
      setActiveResultIndex((currentIndex) => (
        currentIndex === null ? 0 : Math.min(currentIndex + 1, searchResults.length - 1)
      ));
      return;
    }

    if (event.key === 'ArrowUp' && searchResults.length > 0) {
      event.preventDefault();
      setIsDropdownOpen(true);
      setActiveResultIndex((currentIndex) => (
        currentIndex === null ? searchResults.length - 1 : Math.max(currentIndex - 1, 0)
      ));
      return;
    }

    if (event.key === 'Enter' && searchResults.length > 0) {
      event.preventDefault();
      handleItemClick(searchResults[activeResultIndex ?? 0]);
    }
  };

  const handleRecommendedItemClick = (item: Pick<EnrichedItem, 'id' | 'name'>) => {
    setSearchQuery(item.name);
    setIsDropdownOpen(true);
    setActiveResultIndex(null);
    setIsSearchLoading(true);
    setHasSearchError(false);
    inputRef.current?.focus();
  };

  return (
    <div
      className={isHero ? 'mb-6 mt-2 flex w-full flex-col items-center' : 'relative w-full'}
      onBlur={handleSearchBlur}
      role="search"
    >
      <div className={isHero ? 'relative w-full max-w-2xl' : 'relative w-full'}>
        <div className={`relative flex w-full items-center border border-[var(--app-hairline)] bg-[var(--app-surface)] transition-[border-color,box-shadow] focus-within:border-[var(--app-accent)] focus-within:ring-2 focus-within:ring-[var(--app-accent)]/30 ${
          isHero
            ? 'h-[60px] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-none'
            : 'h-10 rounded-md shadow-none'
        }`}>
          <div className={isHero ? 'pointer-events-none flex items-center justify-center pl-6' : 'pointer-events-none flex items-center justify-center pl-3'}>
            <Search className={isHero ? 'h-6 w-6 text-[var(--app-accent)]' : 'h-4 w-4 text-[var(--app-ink-muted)]'} aria-hidden="true" />
          </div>
          <input
            ref={inputRef}
            autoFocus={autoFocus}
            type="text"
            placeholder={placeholder ?? (isHero ? '환혹약, 비전서, 룩템 이름 입력...' : '아이템 이름 검색...')}
            value={searchQuery}
            role="combobox"
            aria-label="아이템 검색"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
            aria-controls={isDropdownOpen ? listboxId : undefined}
            aria-activedescendant={isDropdownOpen && activeResult ? `${listboxId}-option-${activeResult.id}` : undefined}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchQuery) setIsDropdownOpen(true);
            }}
            className={`h-full w-full bg-transparent font-medium text-[var(--app-ink)] placeholder-[var(--app-ink-muted)] focus:outline-none ${inputClassName}`}
          />
        </div>

        {isHero && (
          <div className="scrollbar-hide flex w-full max-w-full items-center justify-start space-x-2 overflow-x-auto px-1 pb-1 pt-3 md:justify-center">
            {recommendedItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => handleRecommendedItemClick(item)}
                className="flex min-h-11 flex-shrink-0 items-center space-x-1 rounded-md bg-[var(--app-surface-subtle)] px-3 py-1.5 text-[13px] font-medium text-[var(--app-ink-muted)] transition-colors hover:bg-[var(--app-hairline)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/50"
              >
                <Flame className="h-3.5 w-3.5 text-[var(--app-accent)]" aria-hidden="true" />
                <span>{item.name}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => navigate('/hot-issues')}
              className="ml-1 flex min-h-11 flex-shrink-0 items-center space-x-1 rounded-md border border-[var(--app-accent)]/30 bg-[var(--app-surface-subtle)] px-3 py-1.5 text-[13px] font-bold text-[var(--app-accent)] transition-colors hover:bg-[var(--app-hairline)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/50"
            >
              <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>랭킹 더보기</span>
            </button>
          </div>
        )}

        {isDropdownOpen && (
          <div
            id={listboxId}
            role="listbox"
            className={`absolute left-0 z-50 w-full animate-fade-in overflow-hidden rounded-xl border border-[var(--app-hairline)] bg-[var(--app-surface)] shadow-[0_10px_40px_rgb(0,0,0,0.1)] ${
              isHero ? 'top-[calc(100%+12px)]' : 'top-[calc(100%+8px)]'
            }`}
          >
            <div className={`scrollbar-hide max-h-[360px] overflow-y-auto ${isHero ? 'p-3' : 'p-2'}`}>
              {hasSearchError ? (
                <div className="py-8 text-center text-[13px] font-medium text-[var(--destructive)]" role="alert">
                  검색 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
                </div>
              ) : isSearching ? (
                <div className="py-8 text-center text-[13px] font-medium text-[var(--app-ink-muted)]" aria-live="polite">
                  검색 중...
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((item, index) => (
                  <button
                    type="button"
                    role="option"
                    id={`${listboxId}-option-${item.id}`}
                    aria-selected={activeResultIndex === index}
                    key={item.id}
                    onMouseEnter={() => setActiveResultIndex(index)}
                    onClick={() => handleItemClick(item)}
                    className={`flex w-full items-center text-left transition-colors hover:bg-[var(--app-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/50 active:scale-[0.98] ${
                      isHero ? 'min-h-14 space-x-4 rounded-lg p-3' : 'min-h-11 space-x-3 rounded-md p-2'
                    }`}
                  >
                    <img
                      src={getIconUrl(item.icon)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={isHero ? 'h-10 w-10 flex-shrink-0 rounded-full bg-[var(--app-surface-subtle)] p-0.5 object-cover' : 'h-8 w-8 flex-shrink-0 rounded-full bg-[var(--app-surface-subtle)] p-0.5 object-cover'}
                    />
                    <span className={`truncate font-bold text-[var(--app-ink)] ${isHero ? 'text-[16px]' : 'text-[13px]'}`}>{item.name}</span>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-[var(--app-ink-muted)]">
                  <Search className="mb-3 h-7 w-7 opacity-20" aria-hidden="true" />
                  <span className="text-[13px] font-medium">검색 결과가 없습니다.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ItemSearch.displayName = 'ItemSearch';
