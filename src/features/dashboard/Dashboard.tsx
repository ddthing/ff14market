import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { EnrichedItem } from '../../hooks/useItemData';
import { useItemData } from '../../hooks/useItemData';
import { FavoriteButton } from '../../components/ui/FavoriteButton';
import { SkeletonRow } from '../../components/ui/SkeletonRow';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchKoreaDCData } from '../../api/universalis';
import { getIconUrl } from '../../utils/icon';
import { useFavoriteStore } from '../../store/useFavoriteStore';
// @ts-ignore
import _Twemoji from 'react-twemoji';
const Twemoji = (_Twemoji as any).default || _Twemoji;

export const Dashboard = () => {
  const { enrichedItems, isLoading } = useItemData();
  const [activeCategory, setActiveCategory] = useState<string>('전체');
  const navigate = useNavigate();

  // Sort them dynamically based on real data
  const trendingVolume = [...enrichedItems].sort((a, b) => b.volume - a.volume).slice(0, 3);
  const marginTop = [...enrichedItems].sort((a, b) => b.fluctuation - a.fluctuation).slice(0, 3);
  const hotDeals = [...enrichedItems].filter(a => a.price > 0).sort((a, b) => a.price - b.price).slice(0, 3);

  // 카테고리 리스트 추출 (전체 + 중복제거)
  const categories = ['전체', ...Array.from(new Set(enrichedItems.map(item => item.category))).filter(Boolean)];

  // 필터링 적용된 아이템들
  const filteredListItems = activeCategory === '전체' 
    ? enrichedItems 
    : enrichedItems.filter(item => item.category === activeCategory);

  const { favoriteIds } = useFavoriteStore();
  const favoriteListItems = filteredListItems.filter(item => favoriteIds.includes(item.id));
  const trendingListItems = filteredListItems.filter(item => !favoriteIds.includes(item.id));

  return (
    <div className="space-y-12">
      {/* 3단 요약 위젯 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <DashboardCard 
          title={<Twemoji options={{ folder: 'svg', ext: '.svg' }}>🔥 거래량 떡상</Twemoji>} 
          items={isLoading ? [] : trendingVolume}
          isLoading={isLoading}
        />
        <DashboardCard 
          title={<Twemoji options={{ folder: 'svg', ext: '.svg' }}>🚀 마진율 TOP</Twemoji>} 
          items={isLoading ? [] : marginTop}
          isLoading={isLoading}
        />
        <DashboardCard 
          title={<Twemoji options={{ folder: 'svg', ext: '.svg' }}>⏱️ 실시간 핫딜</Twemoji>} 
          items={isLoading ? [] : hotDeals}
          isLoading={isLoading}
        />
      </div>

      {/* 전체 아이템 시세 리스트 (토스증권 랭킹형 한 줄 나열) */}
      <div>
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex flex-col">
            <h2 className="text-[1.3rem] font-bold tracking-tight">지금 가장 핫한 아이템</h2>
            <span className="text-[12px] font-medium text-gray-400 dark:text-[#9ea4aa] mt-1">
              순위 기준: 최근 거래량 많은 순
            </span>
          </div>
        </div>

        {/* 카테고리 필터 (Toss style chips) */}
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide py-3 mb-2 px-2">
          {categories.map(cat => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-4 py-[8px] rounded-full text-[14px] transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 font-bold dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'bg-gray-100 text-gray-500 font-medium hover:bg-gray-200 dark:bg-[#26282b] dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
        
        <div className="flex flex-col space-y-4">
          {isLoading ? (
            <div className="bg-white dark:bg-[#26282b] rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none border border-transparent dark:border-gray-800 overflow-hidden relative">
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 dark:bg-[#26282b]/70 backdrop-blur-sm rounded-xl">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <Twemoji options={{ folder: 'svg', ext: '.svg' }}>
                  <p className="text-[15px] font-bold text-gray-800 dark:text-gray-200 mb-1">집사들이 장터 게시판에서 시세를 확인하고 있습니다... 📦</p>
                </Twemoji>
                <p className="text-[13px] font-medium text-gray-500">200여 개 핵심 아이템 트렌드 분석 중</p>
              </div>
              <div className="opacity-40">
                {Array.from({ length: 5 }).map((_, idx) => <SkeletonRow key={`skel-${idx}`} />)}
              </div>
            </div>
          ) : (
            <>
              <AnimatePresence>
                {favoriteListItems.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    className="bg-white dark:bg-[#26282b] rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none border border-transparent dark:border-gray-800 overflow-hidden"
                  >
                    <div className="px-4 sm:px-6 pt-5 pb-3">
                      <h3 className="text-[15px] font-bold text-gray-900 dark:text-white flex items-center">
                        <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="mr-2 text-[16px] inline-flex">❤️</Twemoji> 내 관심 아이템
                      </h3>
                    </div>
                    <AnimatePresence mode="popLayout">
                      {favoriteListItems.map((item) => (
                        <DashboardListItem 
                          key={`fav-${item.id}`} 
                          item={item} 
                          index={enrichedItems.findIndex(i => i.id === item.id)} 
                          navigate={navigate} 
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-white dark:bg-[#26282b] rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none border border-transparent dark:border-gray-800 overflow-hidden">
                {favoriteListItems.length > 0 && (
                  <div className="px-4 sm:px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800/60">
                    <h3 className="text-[15px] font-bold text-gray-900 dark:text-white flex items-center">
                      <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="mr-2 text-[16px] inline-flex">🔥</Twemoji> 실시간 트렌드
                    </h3>
                  </div>
                )}
                <AnimatePresence mode="popLayout">
                  {trendingListItems.map((item) => (
                    <DashboardListItem 
                      key={`list-${item.id}`} 
                      item={item} 
                      index={enrichedItems.findIndex(i => i.id === item.id)} 
                      navigate={navigate} 
                    />
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const DashboardCard = ({ title, items, isLoading }: { title: React.ReactNode, items: EnrichedItem[], isLoading: boolean }) => {
  const navigate = useNavigate();
  return (
    <div className="bg-white dark:bg-[#26282b] rounded-xl p-5 md:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:shadow-none border border-transparent dark:border-gray-800 min-h-[280px]">
      <div className="flex items-center space-x-2 mb-6">
        <h2 className="text-[1.15rem] font-bold tracking-tight">{title}</h2>
      </div>
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={`card-skel-${idx}`} className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                <div className="w-[42px] h-[42px] rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="flex flex-col space-y-2">
                  <div className="w-20 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="w-12 h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <div className="w-16 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                <div className="w-10 h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : (
          items.map((item, idx) => (
            <div 
              key={`${title}-${item.id}`} 
              onClick={() => navigate(`/item/${item.id}`)}
              className="flex items-center justify-between cursor-pointer group hover:bg-gray-50 dark:hover:bg-[#252836] p-3 -mx-3 rounded-xl transition-all active:scale-[0.98]"
            >
              <div className="flex items-center space-x-4">
                <div className="font-normal text-gray-400 dark:text-[#9ea4aa] w-4 text-center text-[14px]">
                  {idx + 1}
                </div>
                <div className="w-[42px] h-[42px] rounded-full bg-gray-100 dark:bg-gray-800 p-[2px] transition-transform group-hover:scale-105">
                  <img 
                    src={item.icon} 
                    alt={item.name} 
                    loading="lazy"
                    className="w-full h-full rounded-full object-cover bg-gray-50 dark:bg-[#101112]" 
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[15px] leading-tight text-gray-900 dark:text-white">
                    {item.name}
                  </span>
                  <span className="text-[13px] text-gray-500 dark:text-[#9ea4aa] mt-[2px] font-normal">
                    {item.volume.toLocaleString()}건 거래
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold text-[15px] text-gray-900 dark:text-white leading-tight">
                  {item.price > 0 ? `${item.price.toLocaleString()} G` : '-'}
                </span>
                <span className={`font-medium text-[13px] mt-[2px] ${
                  item.fluctuation > 0 ? 'text-red-500' : 
                  item.fluctuation < 0 ? 'text-blue-500' : 'text-gray-500'
                }`}>
                  {item.fluctuation > 0 ? '+' : ''}{item.fluctuation.toFixed(1)}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const DashboardListItem = memo(({ item, index, navigate }: { item: EnrichedItem, index: number, navigate: any }) => {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ['searchItem', 'Korea', item.id],
      queryFn: () => fetchKoreaDCData(item.id),
      staleTime: 300000, // 5 minutes
    });
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2 }}
      onMouseEnter={handleMouseEnter}
      onClick={() => navigate(`/item/${item.id}`)}
      className="flex items-center justify-between py-[18px] px-4 sm:px-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252836] transition-colors border-b border-gray-100 dark:border-gray-800/60 last:border-0"
    >
      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
        <FavoriteButton itemId={item.id} />
        <span className="font-normal text-[14px] text-gray-400 dark:text-[#9ea4aa] w-4 text-center flex-shrink-0">
          {index + 1}
        </span>
        <div className="w-[42px] h-[42px] rounded-full bg-gray-100 dark:bg-gray-800 p-[2px] flex-shrink-0">
          <img 
            src={getIconUrl(item.icon)} 
            alt={item.name} 
            loading="lazy"
            className="w-full h-full rounded-full object-cover bg-gray-50 dark:bg-[#101112]" 
          />
        </div>
        <div className="flex flex-col truncate">
          <span className="font-bold text-[15px] sm:text-[16px] leading-tight text-gray-900 dark:text-white truncate">
            {item.name}
          </span>
          <span className="text-[12px] font-medium text-gray-400 dark:text-[#9ea4aa] mt-[2px] flex items-center space-x-2">
            <span>{item.category}</span>
            <span className="w-[3px] h-[3px] rounded-full bg-gray-300 dark:bg-gray-600"></span>
            <span className="text-gray-400 text-xs inline-flex items-center">
              일일 판매 {item.volume.toLocaleString()}건 {item.volume >= 50 && <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="ml-1 inline-flex">🔥</Twemoji>}
            </span>
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4 sm:space-x-6 md:space-x-12 ml-2 flex-shrink-0">
        <div className="text-right w-20 sm:w-28">
          <span className="font-bold text-[15px] sm:text-[16px] text-gray-900 dark:text-white whitespace-nowrap">
            {item.price > 0 ? `${item.price.toLocaleString()} G` : '데이터 없음'}
          </span>
        </div>
        <div className="text-right w-16 sm:w-20">
          <span className={`font-medium text-[14px] sm:text-[15px] whitespace-nowrap ${
            item.fluctuation > 0 ? 'text-red-500' : 
            item.fluctuation < 0 ? 'text-blue-500' : 'text-gray-500'
          }`}>
            {item.fluctuation > 0 ? '+' : ''}{item.fluctuation.toFixed(1)}%
          </span>
        </div>
        <div className="text-right w-12 sm:w-16">
          <span className="text-[13px] sm:text-[14px] font-normal text-gray-500 dark:text-[#9ea4aa] whitespace-nowrap">
            {item.volume.toLocaleString()}건
          </span>
        </div>
      </div>
    </motion.div>
  );
});
