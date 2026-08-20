import { useMemo } from 'react';
import type { EnrichedItem } from '../../hooks/useItemData';
import { useItemData } from '../../hooks/useItemData';
import { SkeletonRow } from '../../components/ui/SkeletonRow';
import { useFavoriteStore } from '../../store/useFavoriteStore';
import { useRecentStore } from '../../store/useRecentStore';
import { HeroSearch } from '../../components/ui/HeroSearch';
import { ItemListItem } from '../../components/ui/ItemListItem';
import { DataErrorState } from '../../components/ui/DataErrorState';
import { Seo } from '../../components/seo/Seo';
// @ts-expect-error react-twemoji lacks types
import _Twemoji from 'react-twemoji';
const Twemoji = (_Twemoji as { default?: React.ElementType }).default || _Twemoji;

export const Dashboard = () => {
  const { enrichedItems, isLoading, isError, refetch } = useItemData();

  const favoriteIds = useFavoriteStore((state) => state.favoriteIds);
  const recentIds = useRecentStore((state) => state.recentIds);

  // Both sections read from the same snapshot, so build one O(1) lookup map.
  const itemById = useMemo(
    () => new Map(enrichedItems.map((item) => [item.id, item] as const)),
    [enrichedItems],
  );
  const favoriteListItems = useMemo(() => {
    const favoriteIdSet = new Set(favoriteIds);
    return enrichedItems.filter((item) => favoriteIdSet.has(item.id));
  }, [enrichedItems, favoriteIds]);
  const recentListItems = useMemo(
    () => recentIds
      .map((id) => itemById.get(id))
      .filter((item): item is EnrichedItem => item !== undefined),
    [itemById, recentIds],
  );
  const recommendedItems = useMemo(() => enrichedItems.slice(0, 3), [enrichedItems]);

  return (
    <>
      <Seo
        title="FF14 장터탐지기 | 한국 서버 시세 대시보드"
        description="파이널판타지14 한국 데이터센터 장터의 최저 매물가, 판매량, 가격 흐름을 한눈에 확인하세요."
        path="/"
      />
      <div className="space-y-6 animate-fade-in">
      <HeroSearch recommendedItems={recommendedItems} />

      <div className="flex flex-col space-y-6">
        {isError ? (
          <DataErrorState onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="relative overflow-hidden rounded-xl border border-[var(--app-hairline)] bg-[var(--app-surface)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none">
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-[var(--app-surface)]/70 backdrop-blur-sm">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[var(--app-hairline)] border-t-[var(--app-accent)]"></div>
              <Twemoji options={{ folder: 'svg', ext: '.svg' }}>
                <p className="mb-1 text-[15px] font-bold text-[var(--app-ink)]">집사들이 장터 게시판에서 시세를 확인하고 있습니다... 📦</p>
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
              <h2 className="mb-3 flex items-center px-1 text-[16px] font-bold tracking-tight text-[var(--app-ink)] sm:text-[18px]">
                <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="mr-2 inline-flex">❤️</Twemoji> 내 관심 아이템
              </h2>
              {favoriteListItems.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-[var(--app-hairline)] bg-[var(--app-surface)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none">
                  <div>
                    {favoriteListItems.map((item) => (
                      <ItemListItem 
                        key={`fav-${item.id}`} 
                        item={item} 
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center rounded-xl border border-dashed border-[var(--app-hairline)] bg-[var(--app-surface-subtle)] px-4 py-3">
                  <span className="text-[14px] font-medium text-[var(--app-ink-muted)]">
                    <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="inline-flex mr-1.5">💡</Twemoji> 
                    자주 찾는 레이드 소모품을 찜해두세요.
                  </span>
                </div>
              )}
            </section>

            {/* Recently Viewed Section (Rendered only if data exists) */}
            {recentListItems.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center px-1 text-[16px] font-bold tracking-tight text-[var(--app-ink)] sm:text-[18px]">
                  <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="mr-2 inline-flex">🕒</Twemoji> 최근 본 아이템
                </h2>
                <div className="overflow-hidden rounded-xl border border-[var(--app-hairline)] bg-[var(--app-surface)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none">
                  <div>
                    {recentListItems.map((item) => (
                      <ItemListItem 
                        key={`recent-${item.id}`} 
                        item={item} 
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
      </div>
    </>
  );
};
