import React, { useEffect, useState } from 'react';
import { ChevronDown, Sun, Moon, Home, Flame, Heart, Coins, Search } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import { useServerStore } from '../../store/useServerStore';
import { useThemeStore } from '../../store/useThemeStore';
import { ItemSearch } from '../ui/ItemSearch';

const SERVERS = [
  { id: 'Chocobo', name: '초코보' },
  { id: 'Moogle', name: '모그리' },
  { id: 'Carbuncle', name: '카벙클' },
  { id: 'Tonberry', name: '톤베리' },
  { id: 'Fenrir', name: '펜리르' },
];

export const Header = () => {
  const { server, setServer } = useServerStore();
  const { theme, setTheme } = useThemeStore();
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = () => setSystemPrefersDark(mediaQuery.matches);

    updateSystemTheme();
    mediaQuery.addEventListener('change', updateSystemTheme);
    return () => mediaQuery.removeEventListener('change', updateSystemTheme);
  }, []);

  const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark);
  
  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
    `inline-flex min-h-10 items-center text-[13px] transition-colors ${isActive ? 'font-bold text-[var(--app-ink)]' : 'font-medium text-[var(--app-ink-muted)] hover:text-[var(--app-ink)]'}`;

  return (
    <>
      <header className="relative sticky top-0 z-40 border-b border-[var(--app-hairline)] bg-[var(--app-surface)]/95 backdrop-blur-md transition-colors">
        <div className="container mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <div className="flex shrink-0 items-center space-x-4 md:space-x-6">
            <Link to="/" aria-label="FF14 장터탐지기 홈" className="flex min-h-10 items-center whitespace-nowrap text-[1rem] font-bold tracking-tight">
              <span className="mr-1.5 inline-flex items-center text-[var(--app-accent)]" aria-hidden="true">
                <Coins className="h-[18px] w-[18px]" />
              </span>
              <span className="hidden sm:inline">FF14 장터탐지기</span>
              <span className="sm:hidden">FF14 마켓</span>
            </Link>
            <nav className="hidden items-center space-x-4 md:flex" aria-label="주요 메뉴">
              <NavLink to="/" className={navLinkClass}>홈</NavLink>
              <NavLink to="/hot-issues" className={navLinkClass}>실시간 Hot</NavLink>
              <NavLink to="/favorites" className={navLinkClass}>내 관심템</NavLink>
            </nav>
          </div>

          <div className="hidden min-w-0 flex-1 justify-center px-3 lg:flex">
            <div className="w-full max-w-[280px]">
              <ItemSearch variant="compact" />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsSearchOpen((open) => !open)}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-[var(--app-ink-muted)] transition-colors hover:bg-[var(--app-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-surface)] lg:hidden"
              aria-label={isSearchOpen ? '아이템 검색 닫기' : '아이템 검색 열기'}
              aria-expanded={isSearchOpen}
              aria-controls="mobile-item-search"
            >
              <Search className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>

            {/* 테마 토글 */}
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-[var(--app-ink-muted)] transition-colors hover:bg-[var(--app-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-surface)]"
              aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {isDark ? <Sun className="h-[18px] w-[18px]" aria-hidden="true" /> : <Moon className="h-[18px] w-[18px]" aria-hidden="true" />}
            </button>

            {/* 서버 선택 드롭다운 */}
            <div className="relative">
              <select 
                value={server}
                onChange={(e) => setServer(e.target.value)}
                aria-label="장터 서버 선택"
                className="h-10 w-[76px] appearance-none rounded-md bg-[var(--app-surface-subtle)] pl-2 pr-7 text-[12px] font-bold text-[var(--app-ink)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/50 sm:w-auto sm:pl-3 sm:text-[13px]"
              >
                {SERVERS.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-[var(--app-ink-muted)]" aria-hidden="true" />
              </div>
            </div>

          </div>
        </div>

        {isSearchOpen && (
          <div id="mobile-item-search" className="absolute inset-x-0 top-full border-b border-[var(--app-hairline)] bg-[var(--app-surface)] p-3 shadow-[0_8px_24px_rgba(23,25,28,0.08)] lg:hidden">
            <div className="mx-auto max-w-md">
              <ItemSearch
                variant="compact"
                autoFocus
                onSelect={() => setIsSearchOpen(false)}
                onEscape={() => setIsSearchOpen(false)}
              />
            </div>
          </div>
        )}
      </header>

      <nav className="mobile-bottom-nav fixed inset-x-3 z-40 border border-[var(--app-hairline)] bg-[var(--app-surface)]/95 backdrop-blur-lg md:hidden" aria-label="주요 메뉴">
        <div className="mobile-bottom-nav__inner mx-auto grid max-w-md grid-cols-3 gap-1">
          <MobileNavLink to="/" label="홈" icon={<Home className="h-[22px] w-[22px]" aria-hidden="true" />} />
          <MobileNavLink to="/hot-issues" label="실시간 Hot" icon={<Flame className="h-[22px] w-[22px]" aria-hidden="true" />} />
          <MobileNavLink to="/favorites" label="관심템" icon={<Heart className="h-[22px] w-[22px]" aria-hidden="true" />} />
        </div>
      </nav>
    </>
  );
};

const MobileNavLink = ({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) => (
  <NavLink
    to={to}
    aria-label={label}
    className={({ isActive }) => `mobile-bottom-nav__link flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/60 ${isActive ? 'font-bold text-[var(--app-ink)]' : 'font-medium text-[var(--app-ink-muted)]'}`}
  >
    {icon}
    <span>{label}</span>
  </NavLink>
);
