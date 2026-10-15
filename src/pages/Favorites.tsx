import { useSyncExternalStore } from 'react';
import { useFavoriteStore } from '../store/useFavoriteStore';
import { useItemData } from '../hooks/useItemData';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SkeletonRow } from '../components/ui/SkeletonRow';
import { ItemListItem } from '../components/ui/ItemListItem';
import { Seo } from '../components/seo/Seo';
import { useSavedItems } from '../hooks/useSavedItems';
import { DataErrorState } from '../components/ui/DataErrorState';

const subscribeToClient = () => () => {};
const getClientReadySnapshot = () => true;
const getServerReadySnapshot = () => false;

export const Favorites = () => {
  const isClientReady = useSyncExternalStore(
    subscribeToClient,
    getClientReadySnapshot,
    getServerReadySnapshot,
  );
  const favoriteIds = useFavoriteStore((state) => state.favoriteIds);
  const { enrichedItems, isLoading, isError, hasSnapshot, snapshotStale, currentFreshness, refetch } = useItemData({
    enabled: isClientReady && favoriteIds.length > 0,
  });
  const favoriteItemsList = useSavedItems(favoriteIds, enrichedItems);
  const isShowingOldSnapshot = snapshotStale
    || currentFreshness?.stale === true
    || currentFreshness?.partial === true
    || (isError && hasSnapshot);

  return (
    <>
      <Seo
        title="내 관심 아이템 | FF14 장터탐지기"
        description="저장한 파이널판타지14 아이템의 장터 시세를 빠르게 확인하세요."
        path="/favorites"
        noIndex
      />
      <div className="space-y-6">
        <div className="mb-2 flex items-center justify-between px-2">
          <h1 className="text-[1.3rem] font-bold tracking-tight">내 관심템</h1>
          <span className="text-sm font-medium text-[var(--app-ink-muted)]">
            {isClientReady
              ? `${favoriteItemsList.length}개${favoriteItemsList.length > 0 && isShowingOldSnapshot ? ' · 이전 시세' : ''}`
              : '불러오는 중'}
          </span>
        </div>

        <div className="min-h-[50dvh]">
          {!isClientReady ? (
            <div className="flex min-h-[50dvh] flex-col items-center justify-center rounded-xl border border-[var(--app-hairline)] bg-[var(--app-surface)] text-[var(--app-ink-muted)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none" role="status" aria-live="polite">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[var(--app-hairline)] border-t-[var(--app-accent)]" aria-hidden="true" />
              <p className="font-medium text-[var(--app-ink)]">저장한 관심 아이템을 불러오는 중입니다.</p>
            </div>
          ) : (
            <>
              {favoriteIds.length > 0 && isError && !hasSnapshot && <DataErrorState compact onRetry={() => void refetch()} />}
              {isLoading ? (
                <div className="overflow-hidden rounded-xl border border-[var(--app-hairline)] bg-[var(--app-surface)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none">
                  {favoriteItemsList.map((item) => <SkeletonRow key={`fav-skel-${item.id}`} />)}
                </div>
              ) : favoriteItemsList.length === 0 ? (
                <div className="flex min-h-[50dvh] flex-col items-center justify-center rounded-xl border border-[var(--app-hairline)] bg-[var(--app-surface)] text-[var(--app-ink-muted)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none">
                  <Heart className="mb-4 h-12 w-12 text-[var(--app-hairline)]" />
                  <p className="font-medium text-[var(--app-ink)]">관심 아이템이 없습니다.</p>
                  <p className="mt-2 text-[14px]">시세 목록에서 하트(♡)를 눌러 아이템을 추가해보세요.</p>
                  <Link to="/" className="mt-6 rounded-lg bg-[var(--app-accent)] px-6 py-2.5 font-medium text-[var(--app-accent-foreground)] transition-colors hover:bg-[var(--app-accent-hover)]">
                    홈으로 가기
                  </Link>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-[var(--app-hairline)] bg-[var(--app-surface)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none">
                  {favoriteItemsList.map((item) => (
                    <ItemListItem key={`fav-${item.id}`} item={item} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
