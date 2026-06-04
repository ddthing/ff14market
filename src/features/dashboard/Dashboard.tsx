import { useNavigate } from 'react-router-dom';
import type { EnrichedItem } from '../../hooks/useItemData';
import { useItemData } from '../../hooks/useItemData';
import { SkeletonRow } from '../../components/ui/SkeletonRow';
import { AnimatePresence } from 'framer-motion';
import { useFavoriteStore } from '../../store/useFavoriteStore';
import { useRecentStore } from '../../store/useRecentStore';
import { HeroSearch } from '../../components/ui/HeroSearch';
import { ItemListItem } from '../../components/ui/ItemListItem';
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
                      <ItemListItem 
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
                      <ItemListItem 
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
