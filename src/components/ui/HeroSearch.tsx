import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import itemsData from '../../data/items.json';
import { getIconUrl } from '../../utils/icon';

interface Item {
  id: number;
  name: string;
  icon: string;
}

export const HeroSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fuse = useMemo(() => new Fuse(itemsData, {
    keys: ['name'],
    threshold: 0.3,
  }), []);

  const filteredItems = useMemo(() => {
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
    setIsDropdownOpen(false);
    setSearchQuery('');
    navigate(`/item/${item.id}`);
  };

  return (
    <div className="w-full mb-6 mt-2 flex flex-col items-center">
      <div className="relative w-full max-w-2xl" ref={dropdownRef}>
        <div className="relative flex items-center w-full h-[60px] rounded-2xl bg-white dark:bg-[#26282b] shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-none border border-transparent dark:border-gray-800 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.12)] focus-within:ring-2 focus-within:ring-blue-500/50">
          <div className="pl-6 flex items-center justify-center pointer-events-none">
            <Search className="h-6 w-6 text-blue-500 dark:text-blue-400" />
          </div>
          <input 
            type="text" 
            placeholder="환혹약, 비전서, 룩템 이름 입력..." 
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredItems.length > 0) {
                handleItemClick(filteredItems[0]);
              }
            }}
            onFocus={() => { if(searchQuery) setIsDropdownOpen(true) }}
            className="w-full h-full bg-transparent text-[16px] md:text-[18px] font-medium pl-4 pr-6 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
          />
        </div>

        {/* Recommended Search Chips */}
        <div className="flex items-center space-x-2 mt-3 overflow-x-auto scrollbar-hide px-1 pb-1 w-full max-w-full justify-start md:justify-center">
          {['환혹약', 'G17 지도', '비전서', '명인의 약차'].map(term => (
            <button
              key={term}
              onClick={() => {
                setSearchQuery(term);
                setIsDropdownOpen(true);
                // Optionally focus the input:
                const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (input) input.focus();
              }}
              className="flex-shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-[#26282b] text-gray-600 dark:text-gray-300 rounded-full text-[13px] font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              {term}
            </button>
          ))}
        </div>

        {isDropdownOpen && (
          <div className="absolute top-[calc(100%+12px)] left-0 w-full bg-white dark:bg-[#26282b] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-[0_10px_40px_rgb(0,0,0,0.1)] z-50 overflow-hidden animate-fade-in">
            <div className="max-h-[360px] overflow-y-auto p-3 scrollbar-hide">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => handleItemClick(item)}
                    className="flex items-center space-x-4 p-4 hover:bg-gray-50 dark:hover:bg-[#1a1b1e] rounded-xl cursor-pointer transition-colors active:scale-[0.98]"
                  >
                    <img src={getIconUrl(item.icon)} alt={item.name} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 p-0.5 object-cover flex-shrink-0" />
                    <span className="text-[16px] font-bold text-gray-900 dark:text-white truncate">{item.name}</span>
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-gray-500 dark:text-[#9ea4aa]">
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
