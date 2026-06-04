import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { EnrichedItem } from '../../hooks/useItemData';
import { useItemData } from '../../hooks/useItemData';
import { FavoriteButton } from '../../components/ui/FavoriteButton';
import { SkeletonRow } from '../../components/ui/SkeletonRow';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchKoreaDCData } from '../../api/universalis';
import { getIconUrl } from '../../utils/icon';
import { useFavoriteStore } from '../../store/useFavoriteStore';
import { useRecentStore } from '../../store/useRecentStore';
import { formatFreshness } from '../../utils/time';
import { HeroSearch } from '../../components/ui/HeroSearch';
// @ts-expect-error react-twemoji lacks types
import _Twemoji from 'react-twemoji';
const Twemoji = (_Twemoji as { default?: React.ElementType }).default || _Twemoji;

export const Dashboard = () => {
  const { enrichedItems, isLoading } = useItemData();
  const navigate = useNavigate();

  const { favoriteIds } = useFavoriteStore();
  const { recentIds } = useRecentStore();

  const favoriteListItems = enrichedItems.filter(item => favoriteIds.includes(item.id));
  
  // Create recentListItems maintaining the order of recentIds
  const recentListItems = recentIds
    .map(id => enrichedItems.find(item => item.id === id))
    .filter((item): item is EnrichedItem => item !== undefined);

  return (
    <div className="space-y-6 animate-fade-in">
      <HeroSearch />

      <div className="flex flex-col space-y-6">
        {isLoading ? (
          <div className="bg-white dark:bg-[#26282b] rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none border border-transparent dark:border-gray-800 overflow-hidden relative">
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 dark:bg-[#26282b]/70 backdrop-blur-sm rounded-xl">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <Twemoji options={{ folder: 'svg', ext: '.svg' }}>
                <p className="text-[15px] font-bold text-gray-800 dark:text-gray-200 mb-1">집사들이 장터 게시판에서 시세를 확인하고 있습니다... 📦</p>
              </Twemoji>
            </div>
            <div className="opacity-40">
              {Array.from({ length: 5 }).map((_, idx) => <SkeletonRow key={`skel-${idx}`} />)}
            </div>
          </div>
        ) : (
          <>
            {/* Watchlist Section */}
            <section>
              <h2 className="text-[16px] sm:text-[18px] font-bold tracking-tight mb-3 flex items-center text-gray-900 dark:text-white px-1">
                <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="mr-2 inline-flex">❤️</Twemoji> 내 관심 아이템
              </h2>
              {favoriteListItems.length > 0 ? (
                <div className="bg-white dark:bg-[#26282b] rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none border border-transparent dark:border-gray-800 overflow-hidden">
                  <AnimatePresence mode="popLayout">
                    {favoriteListItems.map((item) => (
                      <DashboardListItem 
                        key={`fav-${item.id}`} 
                        item={item} 
                        navigate={navigate} 
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="py-3 px-4 bg-gray-50 dark:bg-[#1a1b1e] rounded-xl border border-dashed border-gray-200 dark:border-gray-800 flex items-center">
                  <span className="text-[14px] text-gray-500 dark:text-[#9ea4aa] font-medium">
                    <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="inline-flex mr-1.5">💡</Twemoji> 
                    자주 찾는 레이드 소모품을 찜해두세요.
                  </span>
                </div>
              )}
            </section>

            {/* Recently Viewed Section (Rendered only if data exists) */}
            {recentListItems.length > 0 && (
              <section>
                <h2 className="text-[16px] sm:text-[18px] font-bold tracking-tight mb-3 flex items-center text-gray-900 dark:text-white px-1">
                  <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="mr-2 inline-flex">🕒</Twemoji> 최근 본 아이템
                </h2>
                <div className="bg-white dark:bg-[#26282b] rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none border border-transparent dark:border-gray-800 overflow-hidden">
                  <AnimatePresence mode="popLayout">
                    {recentListItems.map((item) => (
                      <DashboardListItem 
                        key={`recent-${item.id}`} 
                        item={item} 
                        navigate={navigate} 
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const DashboardListItem = memo(({ item, navigate }: { item: EnrichedItem, navigate: NavigateFunction }) => {
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
        <div className="text-right w-20 sm:w-28 flex flex-col items-end justify-center">
          <span className="font-bold text-[15px] sm:text-[16px] text-gray-900 dark:text-white whitespace-nowrap leading-tight">
            {item.price > 0 ? `${item.price.toLocaleString()} G` : '데이터 없음'}
          </span>
          {item.price > 0 && item.lastUploadTime !== undefined && (
            <span className="text-[10px] font-normal text-gray-400 dark:text-[#9ea4aa] mt-[3px] leading-none whitespace-nowrap">
              {formatFreshness(item.lastUploadTime)}
            </span>
          )}
        </div>
        <div className="text-right w-16 sm:w-20 hidden sm:block">
          <span className={`font-medium text-[14px] sm:text-[15px] whitespace-nowrap ${
            item.fluctuation > 0 ? 'text-red-500' : 
            item.fluctuation < 0 ? 'text-blue-500' : 'text-gray-500'
          }`}>
            {item.fluctuation > 0 ? '+' : ''}{item.fluctuation.toFixed(1)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
});
