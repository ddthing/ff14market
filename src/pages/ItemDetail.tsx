import { lazy, Suspense, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Flame, ArrowLeft } from 'lucide-react';
import { fetchItemMetadata } from '../api/itemCatalog';
import { fetchKoreaDCData } from '../api/universalis';
import { computeTrueMinPrice } from '../hooks/useItemData';
import { getIconUrl } from '../utils/icon';
import { useRecentStore } from '../store/useRecentStore';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import { DataErrorState } from '../components/ui/DataErrorState';
import { Seo } from '../components/seo/Seo';
import { formatSaleVelocity } from '../utils/marketMetrics';
import masterItems from '../data/masterItems.json';
import { MARKET_SERVER_NAMES } from '../constants/market';
import { getAbsoluteMinPrice, getServerMinPrices } from '../utils/marketListings';
import { formatFreshness } from '../utils/time';

const PriceChart = lazy(() => import('../components/common/PriceChart').then(({ PriceChart: Component }) => ({ default: Component })));
const MASTER_ITEMS_BY_ID = new Map(masterItems.map((candidate) => [candidate.id, candidate] as const));

export const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const addRecentId = useRecentStore((state) => state.addRecentId);

  const itemId = id ? parseInt(id) : 0;

  const localItem = MASTER_ITEMS_BY_ID.get(itemId);
  const {
    data: fetchedItem,
    isLoading: isMetadataLoading,
    isError: isMetadataError,
    refetch: refetchItemMetadata,
  } = useQuery({
    queryKey: ['itemMetadata', itemId],
    queryFn: ({ signal }) => fetchItemMetadata(itemId, signal),
    // Most detail links originate from the curated market list. Reuse the
    // already bundled metadata and reserve the cold search endpoint for direct
    // links to items outside that list.
    enabled: itemId > 0 && !localItem,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
  const item = localItem ?? fetchedItem;
  const isItemLoading = !localItem && isMetadataLoading;
  const isItemError = !localItem && isMetadataError;

  useEffect(() => {
    if (itemId) {
      addRecentId(itemId);
    }
  }, [itemId, addRecentId]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['searchItem', 'Korea', itemId],
    queryFn: ({ signal }) => fetchKoreaDCData(itemId, signal),
    // The item catalog and market detail request are independent. Start both
    // immediately so the 16k-entry search catalog cannot block price data.
    enabled: itemId > 0,
    staleTime: 60000,
    retry: 1,
  });

  const serverPrices = useMemo(
    () => getServerMinPrices(data?.listings, MARKET_SERVER_NAMES),
    [data],
  );
  const absoluteMin = useMemo(() => getAbsoluteMinPrice(serverPrices), [serverPrices]);

  if (isItemLoading) {
    return (
      <>
        <Seo
          title="아이템 시세 조회 중 | FF14 장터탐지기"
          description="파이널판타지14 한국 데이터센터 아이템 시세를 불러오는 중입니다."
          path={`/item/${itemId}`}
          noIndex
        />
        <div className="mx-auto flex max-w-md flex-col items-center justify-center py-20" role="status" aria-live="polite" aria-label="아이템 정보를 불러오는 중">
          <h1 className="sr-only">아이템 시세 조회 중</h1>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--app-hairline)] border-t-[var(--app-accent)]" aria-hidden="true" />
        </div>
      </>
    );
  }

  if (isItemError) {
    return (
      <>
        <Seo
          title="아이템 정보 오류 | FF14 장터탐지기"
          description="아이템 정보를 불러오지 못했습니다."
          path={`/item/${itemId}`}
          noIndex
        />
        <DataErrorState onRetry={() => void refetchItemMetadata()} />
      </>
    );
  }

  if (!item) {
    return (
      <>
        <Seo
          title="아이템을 찾을 수 없습니다 | FF14 장터탐지기"
          description="요청한 아이템을 FF14 장터탐지기 카탈로그에서 찾을 수 없습니다."
          path={`/item/${itemId}`}
          noIndex
        />
        <div className="flex flex-col items-center justify-center py-20">
          <h1 className="mb-4 text-2xl font-bold text-[var(--app-ink)]">아이템을 찾을 수 없습니다</h1>
          <button 
            onClick={() => navigate('/')}
            className="rounded-lg bg-[var(--app-accent)] px-6 py-2 font-bold text-[var(--app-accent-foreground)] transition-colors hover:bg-[var(--app-accent-hover)]"
          >
            홈으로 돌아가기
          </button>
        </div>
      </>
    );
  }

  const itemData = data;
  const globalMinPrice = itemData
    ? computeTrueMinPrice(itemData.minPrice ?? 0, itemData.minPriceNQ ?? 0, itemData.minPriceHQ ?? 0)
    : 0;
  const netPrice = Math.floor(globalMinPrice * 0.95);
  
  return (
    <>
      <Seo
        title={`${item.name} 시세 | FF14 장터탐지기`}
        description={`${item.name}의 한국 데이터센터 최저 매물가, 최근 판매량, 가격 흐름을 확인하세요.`}
        path={`/item/${item.id}`}
      />
      <div className="max-w-md mx-auto py-8 px-2 sm:px-4 animate-fade-in">
      <button 
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center space-x-2 font-medium text-[var(--app-ink-muted)] transition-colors hover:text-[var(--app-ink)]"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>뒤로 가기</span>
      </button>

      <div className="relative w-full rounded-xl border border-[var(--app-hairline)] bg-[var(--app-surface)] p-6 shadow-sm sm:p-8">
        <div className="absolute right-6 top-6">
          <FavoriteButton itemId={itemId} />
        </div>
        
        <div className="flex flex-col items-center pt-8 pb-8">
          <img 
            src={getIconUrl(item.icon)} 
            alt=""
            loading="lazy"
            className="mb-5 h-[100px] w-[100px] rounded-full bg-[var(--app-surface-subtle)] p-[3px] shadow-sm" 
          />
          <h1 className="text-center text-[24px] font-bold leading-tight text-[var(--app-ink)]">
            {item.name}
          </h1>
          <p className="mt-2 text-[15px] font-medium text-[var(--app-ink-muted)]">
            {isLoading
              ? '한국 DC 최근 수집 시세 조회 중...'
              : data?.marketMeta
                ? `최근 정상 수집 데이터 · ${formatFreshness(data.marketMeta.cachedAt)}`
                : '한국 DC 최근 수집 시세'}
          </p>
        </div>
        
        <div className="space-y-5 rounded-xl bg-[var(--app-surface-subtle)] p-5">
          {/* Chart Section */}
          <div className="w-full">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[14px] font-bold text-[var(--app-ink)]">한국 전체 최저가</span>
              {isLoading ? (
                <div className="h-6 w-24 animate-pulse rounded bg-[var(--app-hairline)]" />
              ) : (
                <div className="text-right">
                  <div className="text-[20px] font-bold leading-none text-[var(--app-ink)]">
                    {globalMinPrice > 0 ? `${globalMinPrice.toLocaleString()} G` : '매물 없음'}
                  </div>
                  {globalMinPrice > 0 && (
                    <div className="mt-1 text-[12px] font-medium text-blue-600 dark:text-blue-400">
                      (수수료 5% 제외: {netPrice.toLocaleString()} G)
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Daily Sales Announcement */}
            {!isLoading && itemData?.regularSaleVelocity !== undefined && (
              <div className="mb-3 flex w-full items-center justify-between rounded-lg border border-[var(--app-accent)]/20 bg-[var(--app-surface)] px-3 py-2">
                <span className="flex items-center text-[13px] font-medium text-[var(--app-accent)]">
                  {itemData.regularSaleVelocity >= 50 && <Flame className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  최근 판매속도 기준 하루 평균 {formatSaleVelocity(itemData.regularSaleVelocity)}건이 판매되었습니다.
                </span>
              </div>
            )}
            
            {isError ? (
              <DataErrorState compact onRetry={() => void refetch()} />
            ) : isLoading ? (
              <div className="mt-3 flex h-[200px] w-full items-end space-x-2">
                {[40, 70, 45, 90, 60, 30, 80, 50, 100, 60, 85, 40].map((h, i) => (
                  <div key={i} className="flex-1 animate-pulse rounded-t-sm bg-[var(--app-hairline)]" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : (
              <Suspense fallback={<div className="flex h-[100px] items-center justify-center rounded-xl bg-[var(--app-surface-subtle)] text-[12px] text-[var(--app-ink-muted)]">가격 흐름 준비 중...</div>}>
                <PriceChart history={itemData?.recentHistory || []} />
              </Suspense>
            )}
          </div>

          {/* DC Comparison Section */}
          <div className="border-t border-[var(--app-hairline)] pt-4">
            <span className="mb-3 block text-[13px] font-bold text-[var(--app-ink-muted)]">서버별 최저가 비교</span>
            <div className="space-y-2">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 w-full animate-pulse rounded bg-[var(--app-hairline)]" />
                ))
              ) : (
                serverPrices.map(s => {
                  const isLowest = s.minPrice > 0 && s.minPrice === absoluteMin;
                  return (
                    <div key={s.serverName} className={`flex items-center justify-between rounded-lg p-2 transition-colors ${isLowest ? 'bg-[var(--app-surface)]' : 'hover:bg-[var(--app-surface)]'}`}>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[14px] font-bold ${isLowest ? 'text-[var(--app-accent)]' : 'text-[var(--app-ink)]'}`}>
                          {s.serverName}
                        </span>
                        {isLowest && (
                          <span className="rounded-md bg-[var(--app-surface-subtle)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--app-accent)]">
                            최저가
                          </span>
                        )}
                      </div>
                      <span className={`text-[14px] font-medium ${isLowest ? 'font-bold text-[var(--app-accent)]' : 'text-[var(--app-ink)]'}`}>
                        {s.minPrice > 0 ? `${s.minPrice.toLocaleString()} G` : '-'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/')}
          className="mt-6 w-full rounded-xl bg-[var(--app-accent)] py-[16px] text-[17px] font-bold text-[var(--app-accent-foreground)] transition-colors hover:bg-[var(--app-accent-hover)]"
        >
          장터 둘러보기
        </button>
      </div>
      </div>
    </>
  );
};
