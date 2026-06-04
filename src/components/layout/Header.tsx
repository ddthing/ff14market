import React, { useState } from 'react';
// @ts-expect-error react-twemoji lacks types
import _Twemoji from 'react-twemoji';
const Twemoji = (_Twemoji as { default?: React.ElementType }).default || _Twemoji;
import { ChevronDown, Sun, Moon } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import { ItemModal } from '../common/ItemModal';
import { useServerStore } from '../../store/useServerStore';
import { useThemeStore } from '../../store/useThemeStore';

interface Item {
  id: number;
  name: string;
  icon: string;
}

const SERVERS = [
  { id: 'Chocobo', name: '초코보' },
  { id: 'Moogle', name: '모그리' },
  { id: 'Carbuncle', name: '카벙클' },
  { id: 'Tonberry', name: '톤베리' },
  { id: 'Fenrir', name: '펜리르' },
];

export const Header = () => {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  const { server, setServer } = useServerStore();
  const { theme, setTheme } = useThemeStore();
  
  // Real-time dark mode evaluation for the icon
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
    `text-[15px] transition-colors ${isActive ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-500 dark:text-[#9ea4aa] hover:text-gray-900 dark:hover:text-gray-100'}`;


  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-[#101112]/80 border-b border-gray-100 dark:border-gray-800 transition-colors">
        <div className="container mx-auto px-4 max-w-6xl h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6 md:space-x-8">
            <Link to="/" className="text-[1.15rem] font-bold tracking-tight cursor-pointer whitespace-nowrap flex items-center">
              <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="inline-flex items-center space-x-1">
                <span className="text-[1.3rem] mr-1">💰</span> <span>FF14 장터탐지기</span>
              </Twemoji>
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              <NavLink to="/" className={navLinkClass}>홈</NavLink>
              <NavLink to="/hot-issues" className={navLinkClass}>실시간 Hot</NavLink>
              <NavLink to="/favorites" className={navLinkClass}>내 관심템</NavLink>
            </nav>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* 테마 토글 */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-[#26282b] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>

            {/* 서버 선택 드롭다운 */}
            <div className="relative hidden sm:block">
              <select 
                value={server}
                onChange={(e) => setServer(e.target.value)}
                className="appearance-none bg-gray-100 dark:bg-[#26282b] text-[13px] font-bold rounded-lg pl-3 pr-8 py-[8px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-500/30 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
              >
                {SERVERS.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Item Detail Modal */}
      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </>
  );
};

