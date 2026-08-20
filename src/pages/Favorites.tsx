import { useFavoriteStore } from '../store/useFavoriteStore';
import { useItemData } from '../hooks/useItemData';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SkeletonRow } from '../components/ui/SkeletonRow';
import { ItemListItem } from '../components/ui/ItemListItem';
import { Seo } from '../components/seo/Seo';

export const Favorites = () => {
  const { favoriteIds } = useFavoriteStore();
  const { enrichedItems, isLoading } = useItemData();
  
  const favoriteItemsList = enrichedItems.filter(item => favoriteIds.includes(item.id));

  return (
    <>
      <Seo
        title="내 관심 아이템 | FF14 장터탐지기"
        description="저장한 파이널판타지14 아이템의 장터 시세를 빠르게 확인하세요."
        path="/favorites"
        noIndex
      />
      <div className="space-y-6">
      <div className="flex items-center justify-between px-2 mb-2">
        <h2 className="text-[1.3rem] font-bold tracking-tight">내 관심템</h2>
        <span className="text-sm font-medium text-[var(--app-ink-muted)]">
          {isLoading ? '-' : favoriteItemsList.length}개
        </span>
      </div>

      {isLoading ? (
        <div className="overflow-hidden rounded-xl border border-[var(--app-hairline)] bg-[var(--app-surface)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none">
          {Array.from({ length: 3 }).map((_, idx) => <SkeletonRow key={`fav-skel-${idx}`} />)}
        </div>
      ) : favoriteItemsList.length === 0 ? (
        <div className="flex h-[50vh] flex-col items-center justify-center rounded-xl border border-[var(--app-hairline)] bg-[var(--app-surface)] text-[var(--app-ink-muted)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none">
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
      </div>
    </>
  );
};
