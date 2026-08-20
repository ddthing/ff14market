import React, { useEffect, useState } from 'react';
// @ts-expect-error react-twemoji lacks types
import _Twemoji from 'react-twemoji';
const Twemoji = (_Twemoji as { default?: React.ElementType }).default || _Twemoji;
import { ChevronDown, Sun, Moon, Home, Flame, Heart } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import { useServerStore } from '../../store/useServerStore';
import { useThemeStore } from '../../store/useThemeStore';

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
      <header className="sticky top-0 z-40 border-b border-[var(--app-hairline)] bg-[var(--app-surface)]/95 backdrop-blur-md transition-colors">
        <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center space-x-4 md:space-x-6">
            <Link to="/" aria-label="FF14 장터탐지기 홈" className="flex min-h-10 items-center whitespace-nowrap text-[1rem] font-bold tracking-tight">
              <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="inline-flex items-center space-x-1">
                <span className="mr-1 text-[1.1rem]">💰</span>
                <span className="hidden sm:inline">FF14 장터탐지기</span>
                <span className="sm:hidden">FF14 마켓</span>
              </Twemoji>
            </Link>
            <nav className="hidden items-center space-x-4 md:flex" aria-label="주요 메뉴">
              <NavLink to="/" className={navLinkClass}>홈</NavLink>
              <NavLink to="/hot-issues" className={navLinkClass}>실시간 Hot</NavLink>
              <NavLink to="/favorites" className={navLinkClass}>내 관심템</NavLink>
            </nav>
          </div>
          
          <div className="flex items-center space-x-2">
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
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--app-hairline)] bg-[var(--app-surface)]/95 px-2 pb-[env(safe-area-inset-bottom)] pt-0.5 backdrop-blur-lg md:hidden" aria-label="주요 메뉴">
        <div className="mx-auto grid max-w-md grid-cols-3">
          <MobileNavLink to="/" label="홈" icon={<Home className="h-4 w-4" aria-hidden="true" />} />
          <MobileNavLink to="/hot-issues" label="실시간 Hot" icon={<Flame className="h-4 w-4" aria-hidden="true" />} />
          <MobileNavLink to="/favorites" label="관심템" icon={<Heart className="h-4 w-4" aria-hidden="true" />} />
        </div>
      </nav>
    </>
  );
};

const MobileNavLink = ({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/60 ${isActive ? 'font-bold text-[var(--app-accent)]' : 'font-medium text-[var(--app-ink-muted)]'}`}
  >
    {icon}
    <span>{label}</span>
  </NavLink>
);
