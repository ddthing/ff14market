import React, { useState, useRef, useEffect } from 'react';
import Fuse from 'fuse.js';
// @ts-ignore
import _Twemoji from 'react-twemoji';
const Twemoji = (_Twemoji as any).default || _Twemoji;
import { Search, X, ChevronDown, Share2, Sun, Moon, RefreshCw, HelpCircle } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchKoreaDCData } from '../../api/universalis';
import { formatFreshness } from '../../utils/time';
import { PriceChart } from '../common/PriceChart';
import itemsData from '../../data/items.json';
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

            {/* 실시간 Live 인디케이터 (토스 스타일) */}
            <div className="flex items-center space-x-1.5 bg-green-50 dark:bg-green-950/20 border border-green-100/50 dark:border-green-900/30 rounded-lg px-2.5 py-[8px] select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[11px] font-bold text-green-600 dark:text-green-400 tracking-wider">LIVE</span>
            </div>

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

const ItemModal = ({ item, onClose }: { item: Item, onClose: () => void }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['searchItem', 'Korea', item.id],
    queryFn: () => fetchKoreaDCData(item.id),
    staleTime: 300000, // 5 minutes
  });

  const handleRefresh = async () => {
    setIsSpinning(true);
    await queryClient.invalidateQueries({
      queryKey: ['searchItem', 'Korea', item.id]
    });
    setTimeout(() => {
      setIsSpinning(false);
    }, 1000);
  };

  const itemData = data;
  const globalMinPrice = itemData?.minPrice || 0;
  const netPrice = Math.floor(globalMinPrice * 0.95);
  
  const serverPrices = ['초코보', '모그리', '카벙클', '톤베리', '펜리르'].map(serverName => {
    const serverListings = itemData?.listings?.filter(l => l.worldName === serverName) || [];
    const minPrice = serverListings.length > 0 ? Math.min(...serverListings.map(l => l.pricePerUnit)) : 0;
    return { serverName, minPrice };
  });

  const validPrices = serverPrices.filter(s => s.minPrice > 0).map(s => s.minPrice);
  const absoluteMin = validPrices.length > 0 ? Math.min(...validPrices) : 0;

  const handleShare = () => {
    const url = `${window.location.origin}/item/${item.id}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm max-h-[90vh] bg-white dark:bg-[#26282b] rounded-t-2xl sm:rounded-xl flex flex-col shadow-2xl animate-slide-up sm:animate-pop-in overflow-hidden">
        
        {/* 모바일 바텀시트 핸들바 */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0 cursor-pointer" onClick={onClose}>
          <div className="w-10 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>

        {/* 상단 액션 버튼 */}
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex items-center space-x-2 z-10">
          <button 
            onClick={handleShare} 
            className="flex items-center space-x-1 px-3 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg text-gray-500 dark:text-[#9ea4aa] hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            {isCopied ? (
              <span className="text-[13px] font-bold text-blue-600 dark:text-blue-400">복사됨!</span>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span className="text-[13px] font-bold hidden sm:inline">공유</span>
              </>
            )}
          </button>
          <button 
            onClick={onClose} 
            className="p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg text-gray-500 dark:text-[#9ea4aa] hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm hidden sm:flex"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 스크롤 가능한 내부 컨텐츠 */}
        <div className="overflow-y-auto px-4 sm:px-6 pb-24 sm:pb-28 pt-4 sm:pt-6 flex-1 scrollbar-hide">
          <div className="flex flex-col items-center sm:pt-4 pb-5">
          <img 
            src={getIconUrl(item.icon)} 
            alt={item.name} 
            loading="lazy"
            className="w-[88px] h-[88px] rounded-full mb-4 bg-gray-50 dark:bg-[#101112] p-[3px] shadow-sm" 
          />
          <h2 className="text-[20px] font-bold text-gray-900 dark:text-white text-center leading-tight">
            {item.name}
          </h2>
          <div className="flex items-center space-x-1 mt-2 text-gray-500 dark:text-[#9ea4aa] text-[13px] font-medium select-none">
            <span>
              {isLoading 
                ? '한국 DC 통합 시세 조회 중...' 
                : `업데이트: ${formatFreshness(itemData?.lastUploadTime)}`}
            </span>
            {!isLoading && (
              <>
                {/* 툴팁 */}
                <div className="relative group flex items-center justify-center">
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400 dark:text-[#9ea4aa] hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-60 hidden group-hover:block bg-gray-900/95 dark:bg-gray-800/95 text-white text-[11px] rounded-lg py-2 px-3 shadow-xl text-center leading-normal z-[120] pointer-events-none transition-all">
                    Universalis 데이터 제공 시점에 따라 인게임과 약간의 차이가 있을 수 있습니다.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95 dark:border-t-gray-800/95"></div>
                  </div>
                </div>
                {/* 새로고침 버튼 */}
                <button
                  onClick={handleRefresh}
                  disabled={isSpinning}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer flex items-center justify-center"
                  title="실시간 정보 새로고침"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-[#101112] rounded-xl p-4 space-y-4">
          {/* Chart Section */}
          <div className="w-full">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[13px] font-bold text-gray-700 dark:text-gray-300">한국 전체 최저가</span>
              {isLoading ? (
                <div className="w-20 h-5 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              ) : (
                <div className="text-right">
                  <div className="text-[18px] font-bold text-gray-900 dark:text-white leading-none">
                    {globalMinPrice > 0 ? `${globalMinPrice.toLocaleString()} G` : '매물 없음'}
                  </div>
                  {globalMinPrice > 0 && (
                    <div className="text-[11px] font-medium text-blue-500 dark:text-blue-400 mt-1">
                      (수수료 5% 제외: {netPrice.toLocaleString()} G)
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Daily Sales Announcement */}
            {!isLoading && itemData?.regularSaleVelocity !== undefined && (
              <div className="w-full bg-blue-50/50 dark:bg-blue-900/10 rounded-lg py-2 px-3 mb-3 border border-blue-100 dark:border-blue-800/30 flex items-center justify-between">
                <span className="text-[12px] font-medium text-blue-600 dark:text-blue-400 flex items-center">
                  {Math.round(itemData.regularSaleVelocity) >= 50 ? '🔥 ' : ''}오늘 하루 동안 총 {Math.round(itemData.regularSaleVelocity).toLocaleString()}개의 매물이 거래되었습니다.
                </span>
              </div>
            )}
            
            {isLoading ? (
              <div className="h-[90px] w-full bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mt-2" />
            ) : (
              <PriceChart history={itemData?.recentHistory || []} />
            )}
          </div>

          {/* DC Comparison Section */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-800/60">
            <span className="text-[12px] font-bold text-gray-500 dark:text-[#9ea4aa] mb-2 block">서버별 최저가 비교</span>
            <div className="space-y-1.5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-full h-7 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                ))
              ) : (
                serverPrices.map(s => {
                  const isLowest = s.minPrice > 0 && s.minPrice === absoluteMin;
                  return (
                    <div key={s.serverName} className={`flex justify-between items-center p-2 rounded-lg transition-colors ${isLowest ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[13px] font-bold ${isLowest ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {s.serverName}
                        </span>
                        {isLowest && (
                          <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 text-[10px] font-bold rounded-md">
                            최저가
                          </span>
                        )}
                      </div>
                      <span className={`text-[13px] font-medium ${isLowest ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-900 dark:text-white'}`}>
                        {s.minPrice > 0 ? `${s.minPrice.toLocaleString()} G` : '-'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        </div>
        
        {/* 하단 고정 버튼 영역 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-white via-white to-transparent dark:from-[#26282b] dark:via-[#26282b] dark:to-transparent pt-8 sm:pt-10 pointer-events-none">
          <button 
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-[14px] rounded-lg transition-colors text-[16px] pointer-events-auto shadow-lg"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
