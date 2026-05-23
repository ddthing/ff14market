import React, { useState, useRef, useEffect } from 'react';
import Fuse from 'fuse.js';
// @ts-expect-error react-twemoji lacks types
import _Twemoji from 'react-twemoji';
const Twemoji = (_Twemoji as { default?: React.ElementType }).default || _Twemoji;
import { Search, ChevronDown, Sun, Moon } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import itemsData from '../../data/items.json';
import { ItemModal } from '../common/ItemModal';
import { useServerStore } from '../../store/useServerStore';
import { useThemeStore } from '../../store/useThemeStore';
import { getIconUrl } from '../../utils/icon';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { server, setServer } = useServerStore();
  const { theme, setTheme } = useThemeStore();
  
  // Real-time dark mode evaluation for the icon
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fuse = React.useMemo(() => new Fuse(itemsData, {
    keys: ['name'],
    threshold: 0.3,
  }), []);

  const filteredItems = React.useMemo(() => {
    if (debouncedSearchQuery.length === 0) return [];
    return fuse.search(debouncedSearchQuery).map(result => result.item).slice(0, 10);
  }, [debouncedSearchQuery, fuse]);

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
    setSearchQuery(e.target.value);
    setIsDropdownOpen(e.target.value.length > 0);
  };

  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
    setIsDropdownOpen(false);
    setSearchQuery('');
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

            {/* 검색창 */}
            <div className="flex items-center relative" ref={dropdownRef}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400 dark:text-[#9ea4aa]" />
                </div>
                <input 
                  type="text" 
                  placeholder="아이템 검색" 
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => { if(searchQuery) setIsDropdownOpen(true) }}
                  className="bg-gray-100 dark:bg-[#26282b] text-[14px] font-medium rounded-lg pl-9 pr-4 py-[8px] w-[140px] md:w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-500/30 transition-all placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
                />
              </div>

              {/* Auto-complete Dropdown */}
              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-[280px] bg-white dark:bg-[#26282b] border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden animate-pop-in">
                  <div className="max-h-[320px] overflow-y-auto p-2">
                    {filteredItems.length > 0 ? (
                      filteredItems.map(item => (
                        <div 
                          key={item.id} 
                          onClick={() => handleItemClick(item)}
                          className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                        >
                          <img src={getIconUrl(item.icon)} alt={item.name} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 p-0.5 object-cover" />
                          <span className="text-[14px] font-medium text-gray-900 dark:text-white">{item.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500 dark:text-[#9ea4aa]">
                        검색 결과가 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              )}
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

