import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { loadItemCatalog, type ItemCatalogEntry } from '../../data/loadItemCatalog';
import { getIconUrl } from '../../utils/icon';
import { useItemData } from '../../hooks/useItemData';
// @ts-expect-error react-twemoji lacks types
import _Twemoji from 'react-twemoji';
const Twemoji = (_Twemoji as { default?: React.ElementType }).default || _Twemoji;

export const HeroSearch = () => {
  const { enrichedItems } = useItemData();
  const [itemCatalog, setItemCatalog] = useState<ItemCatalogEntry[] | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [hasCatalogError, setHasCatalogError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const navigate = useNavigate();

  const requestCatalog = () => {
    if (itemCatalog || isCatalogLoading || hasCatalogError) return;

    setIsCatalogLoading(true);
    void loadItemCatalog()
      .then(setItemCatalog)
      .catch(() => setHasCatalogError(true))
      .finally(() => setIsCatalogLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fuse = useMemo(() => itemCatalog ? new Fuse(itemCatalog, {
    keys: ['name'],
    threshold: 0.3,
  }) : null, [itemCatalog]);

  const filteredItems = useMemo(() => {
    if (debouncedSearchQuery.trim().length === 0 || !fuse) return [];
    return fuse.search(debouncedSearchQuery).map(result => result.item).slice(0, 10);
  }, [debouncedSearchQuery, fuse]);

  const isSearching = searchQuery !== debouncedSearchQuery || (searchQuery.trim().length > 0 && isCatalogLoading);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextQuery = e.target.value;
    setSearchQuery(nextQuery);
    setIsDropdownOpen(nextQuery.length > 0);
    if (nextQuery.trim().length > 0) requestCatalog();
  };

  const handleItemClick = (item: ItemCatalogEntry) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    navigate(`/item/${item.id}`);
  };

  return (
    <div className="w-full mb-6 mt-2 flex flex-col items-center">
      <div className="relative w-full max-w-2xl" ref={dropdownRef}>
        <div className="relative flex h-[60px] w-full items-center rounded-xl border border-[var(--app-hairline)] bg-[var(--app-surface)] shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] focus-within:border-[var(--app-accent)] focus-within:ring-2 focus-within:ring-[var(--app-accent)]/30 dark:shadow-none">
          <div className="pl-6 flex items-center justify-center pointer-events-none">
            <Search className="h-6 w-6 text-[var(--app-accent)]" />
          </div>
          <input
            ref={inputRef}
            type="text" 
            placeholder="환혹약, 비전서, 룩템 이름 입력..." 
            value={searchQuery}
            role="combobox"
            aria-label="아이템 검색"
            aria-autocomplete="list"
            aria-expanded={isDropdownOpen}
            aria-controls={isDropdownOpen ? listboxId : undefined}
            onChange={handleSearchChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredItems.length > 0) {
                handleItemClick(filteredItems[0]);
              }
            }}
            onFocus={() => {
              if (searchQuery) {
                setIsDropdownOpen(true);
                requestCatalog();
              }
            }}
            className="h-full w-full bg-transparent pl-4 pr-6 text-[16px] font-medium text-[var(--app-ink)] placeholder-[var(--app-ink-muted)] focus:outline-none md:text-[18px]"
          />
        </div>

        {/* Recommended Search Chips */}
        <div className="flex items-center space-x-2 mt-3 overflow-x-auto scrollbar-hide px-1 pb-1 w-full max-w-full justify-start md:justify-center">
          {enrichedItems.slice(0, 3).map(item => (
            <button
              type="button"
              key={item.id}
              onClick={() => {
                setSearchQuery(item.name);
                setIsDropdownOpen(true);
                requestCatalog();
                inputRef.current?.focus();
              }}
              className="flex min-h-11 flex-shrink-0 items-center space-x-1 rounded-md bg-[var(--app-surface-subtle)] px-3 py-1.5 text-[13px] font-medium text-[var(--app-ink-muted)] transition-colors hover:bg-[var(--app-hairline)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/50"
            >
              <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="inline-flex w-[14px] h-[14px]">🔥</Twemoji>
              <span>{item.name}</span>
            </button>
          ))}
          
          <button
            type="button"
            onClick={() => navigate('/hot-issues')}
            className="ml-1 flex min-h-11 flex-shrink-0 items-center space-x-1 rounded-md border border-[var(--app-accent)]/30 bg-[var(--app-surface-subtle)] px-3 py-1.5 text-[13px] font-bold text-[var(--app-accent)] transition-colors hover:bg-[var(--app-hairline)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/50"
          >
            <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="inline-flex w-[14px] h-[14px]">📊</Twemoji>
            <span>랭킹 더보기</span>
          </button>
        </div>

        {isDropdownOpen && (
          <div id={listboxId} role="listbox" className="absolute left-0 top-[calc(100%+12px)] z-50 w-full animate-fade-in overflow-hidden rounded-xl border border-[var(--app-hairline)] bg-[var(--app-surface)] shadow-[0_10px_40px_rgb(0,0,0,0.1)]">
            <div className="max-h-[360px] overflow-y-auto p-3 scrollbar-hide">
              {hasCatalogError ? (
                <div className="py-10 text-center text-[14px] font-medium text-[var(--destructive)]" role="alert">
                  검색 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
                </div>
              ) : isSearching ? (
                <div className="py-10 text-center text-[14px] font-medium text-[var(--app-ink-muted)]" aria-live="polite">
                  검색 중...
                </div>
              ) : filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <button
                    type="button"
                    role="option"
                    key={item.id} 
                    onClick={() => handleItemClick(item)}
                    className="flex min-h-14 w-full items-center space-x-4 rounded-lg p-3 text-left transition-colors hover:bg-[var(--app-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/50 active:scale-[0.98]"
                  >
                    <img src={getIconUrl(item.icon)} alt={item.name} className="h-10 w-10 flex-shrink-0 rounded-full bg-[var(--app-surface-subtle)] p-0.5 object-cover" />
                    <span className="truncate text-[16px] font-bold text-[var(--app-ink)]">{item.name}</span>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--app-ink-muted)]">
                  <Search className="w-8 h-8 mb-3 opacity-20" />
                  <span className="text-[15px] font-medium">검색 결과가 없습니다.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
