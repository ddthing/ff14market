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
import { itemDetailSeoMetadata } from '../components/seo/seoHead';
import type { ItemCatalogEntry } from '../api/itemCatalog';
import { formatSaleVelocity } from '../utils/marketMetrics';
import masterItems from '../data/masterItems.json';
import { MARKET_SERVER_NAMES } from '../constants/market';
import { getAbsoluteMinPrice, getServerMinPrices } from '../utils/marketListings';
import { formatFreshness } from '../utils/time';
import { PurchasePlanner } from '../components/common/PurchasePlanner';
import { getMarketPollInterval, MARKET_POLL_INTERVAL_MS } from '../hooks/marketPolling';

const PriceChart = lazy(() => import('../components/common/PriceChart').then(({ PriceChart: Component }) => ({ default: Component })));
const MASTER_ITEMS_BY_ID = new Map(masterItems.map((candidate) => [candidate.id, candidate] as const));

type ItemDetailProps = { initialItem?: ItemCatalogEntry };

export const ItemDetail = ({ initialItem }: ItemDetailProps = {}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const addRecentId = useRecentStore((state) => state.addRecentId);

  const itemId = id && /^[1-9]\d*$/.test(id) ? Number(id) : 0;

  const localItem = MASTER_ITEMS_BY_ID.get(itemId);
  const routeInitialItem = initialItem?.id === itemId ? initialItem : undefined;
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
    enabled: itemId > 0 && !localItem && !routeInitialItem,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
  const item = routeInitialItem ?? localItem ?? fetchedItem;
  const isItemLoading = !routeInitialItem && !localItem && isMetadataLoading;
  const isItemError = !routeInitialItem && !localItem && isMetadataError;

  useEffect(() => {
    if (itemId) {
      addRecentId(itemId);
    }
  }, [itemId, addRecentId]);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['searchItem', 'Korea', itemId],
    queryFn: ({ signal }) => fetchKoreaDCData(itemId, signal),
    // The item catalog and market detail request are independent. Start both
    // immediately so the 16k-entry search catalog cannot block price data.
    // This detail query owns the only interval for its key; modal observers do not poll.
    enabled: itemId > 0,
    staleTime: MARKET_POLL_INTERVAL_MS,
    refetchInterval: (query) => getMarketPollInterval(query.state.fetchStatus),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    networkMode: 'online',
    retry: 1,
  });
  const isLoading = isPending && data === undefined;
  const hasStaleMarketData = data !== undefined
    && data !== null
    && (isError || data.marketMeta?.source === 'r2-stale');
  const plannerStatus = isLoading
    ? 'loading'
    : data === null
      ? 'unavailable'
      : hasStaleMarketData
        ? 'stale'
        : isError
          ? 'error'
          : data !== undefined ? 'ready' : 'error';

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
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-[var(--app-ink)]">아이템 정보를 확인하는 중</h1>
          <div className="flex flex-col items-center gap-4" role="status" aria-live="polite" aria-label="아이템 정보를 불러오는 중">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--app-hairline)] border-t-[var(--app-accent)]" aria-hidden="true" />
            <p className="text-sm text-[var(--app-ink-muted)]">요청한 아이템 정보를 확인하고 있습니다.</p>
          </div>
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
        <div className="mx-auto max-w-3xl py-8">
          <h1 className="mb-4 text-2xl font-bold text-[var(--app-ink)]">아이템 정보를 불러오지 못했습니다</h1>
          <DataErrorState onRetry={() => void refetchItemMetadata()} />
        </div>
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
  const emptyPriceLabel = data === null
    ? '시세 미제공'
    : data !== undefined
      ? '매물 없음'
      : isError
        ? '시세 확인 실패'
        : '시세 미제공';
  const marketSubtitle = isLoading
    ? '시세 데이터 확인 중...'
    : data?.marketMeta?.source === 'r2-stale'
      ? `이전 수집 · 갱신 실패 · ${formatFreshness(data.marketMeta.cachedAt)}`
      : isError
        ? data !== undefined && data !== null
          ? '저장된 시세 · 갱신 실패'
          : data === null
            ? '시세 자료 없음 · 갱신 실패'
            : '시세 조회 실패'
        : data === null
          ? '시세 자료 없음'
          : data?.marketMeta
            ? `최근 정상 수집 · ${formatFreshness(data.marketMeta.cachedAt)}`
            : data !== undefined
              ? '한국 DC 최근 수집 시세'
              : '시세 조회 실패';
  
  return (
    <>
      <Seo {...itemDetailSeoMetadata(item)} />
      <div className="item-detail-page mx-auto py-4">
      <button 
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center space-x-2 font-medium text-[var(--app-ink-muted)] transition-colors hover:text-[var(--app-ink)]"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>뒤로 가기</span>
      </button>

      <div className="detail-layout"><div className="detail-summary relative w-full rounded-xl border border-[var(--app-hairline)] bg-[var(--app-surface)] p-6 shadow-sm sm:p-8">
        <div className="absolute right-6 top-6">
          <FavoriteButton itemId={itemId} />
        </div>
        
        <div className="flex flex-col items-center pt-8 pb-8">
          <img
            src={getIconUrl(item.icon)}
            alt=""
            width={80}
            height={80}
            loading="eager"
            fetchPriority="high"
            className="mb-5 h-14 w-14 rounded-full bg-[var(--app-surface-subtle)] p-[3px] shadow-sm md:h-[100px] md:w-[100px]"
          />
          <h1 className="text-center text-[24px] font-bold leading-tight text-[var(--app-ink)]">
            {item.name}
          </h1>
          <p className="mt-2 flex min-h-[3rem] items-center justify-center text-center text-[15px] font-medium leading-6 text-[var(--app-ink-muted)]">
            <span className="block w-full">
              {marketSubtitle}
            </span>
          </p>
        </div>
        
        <div className="space-y-5 rounded-xl bg-[var(--app-surface-subtle)] p-5">
          {/* Chart Section */}
          <div className="w-full">
            <div className="mb-2 flex items-end justify-between gap-3">
              <span className="min-w-0 text-[14px] font-bold text-[var(--app-ink)]">한국 전체 최저가</span>
              <div className="flex min-h-16 w-44 max-w-[60%] shrink-0 flex-col justify-center text-right">
                {isLoading ? (
                  <div className="w-full" aria-hidden="true">
                    <div className="ml-auto h-[18px] w-3/4 animate-pulse rounded bg-[var(--app-hairline)] md:h-5" />
                    <div className="ml-auto mt-1 h-4 w-full animate-pulse rounded bg-[var(--app-hairline)]" />
                  </div>
                ) : (
                  <>
                    <div className="w-full min-w-0 text-[18px] font-bold leading-none text-[var(--app-ink)] md:text-[20px]">
                      {globalMinPrice > 0 ? `${globalMinPrice.toLocaleString()} G` : emptyPriceLabel}
                    </div>
                    {globalMinPrice > 0 && (
                      <div className="mt-1 w-full min-w-0 text-[12px] font-medium text-blue-600 dark:text-blue-400">
                        (수수료 5% 제외: {netPrice.toLocaleString()} G)
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Keep the status slot in place as market data loads or fails. */}
            <div className="mb-3 flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-[var(--app-accent)]/20 bg-[var(--app-surface)] px-3 py-2">
              <span className="shrink-0 text-[13px] font-medium text-[var(--app-ink-muted)]">최근 판매속도</span>
              {isLoading ? (
                <span className="text-right text-[13px] font-medium text-[var(--app-ink-muted)]" role="status" aria-live="polite">
                  확인 중
                </span>
              ) : itemData?.regularSaleVelocity !== undefined ? (
                <span className="whitespace-nowrap text-right text-[15px] font-bold tabular-nums text-[var(--app-accent)]" aria-live="polite">
                  {itemData.regularSaleVelocity >= 50 && <Flame className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />}
                  {formatSaleVelocity(itemData.regularSaleVelocity)}{' '}건/일
                </span>
              ) : (
                <span className="whitespace-nowrap text-right text-[13px] font-medium text-[var(--app-ink-muted)]" aria-live="polite">
                  {isError ? '조회 실패' : '미제공'}
                </span>
              )}
            </div>
            
            {isError && !itemData ? (
              <div className="mt-3 flex min-h-[200px] items-center">
                <div className="w-full">
                  <DataErrorState compact onRetry={() => void refetch()} />
                </div>
              </div>
            ) : isLoading ? (
              <div className="mt-3 flex h-[200px] w-full items-end space-x-2">
                {[40, 70, 45, 90, 60, 30, 80, 50, 100, 60, 85, 40].map((h, i) => (
                  <div key={i} className="flex-1 animate-pulse rounded-t-sm bg-[var(--app-hairline)]" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : data === null ? (
              <div className="mt-3 flex min-h-[200px] items-center justify-center rounded-xl bg-[var(--app-surface-subtle)] text-[13px] text-[var(--app-ink-muted)]">
                시세 자료가 없습니다.
              </div>
            ) : (
              <Suspense fallback={<div className="mt-3 flex h-[200px] items-center justify-center rounded-xl bg-[var(--app-surface-subtle)] text-[12px] text-[var(--app-ink-muted)]">가격 흐름 준비 중...</div>}>
                <div className="mt-3 flex min-h-[200px] items-center">
                  <div className="w-full">
                    <PriceChart history={itemData?.recentHistory || []} />
                  </div>
                </div>
              </Suspense>
            )}
          </div>

          {/* DC Comparison Section */}
          <div className="border-t border-[var(--app-hairline)] pt-4">
            <span className="mb-3 block text-[13px] font-bold text-[var(--app-ink-muted)]">서버별 최저가 비교</span>
            <div className="space-y-2">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 w-full animate-pulse rounded bg-[var(--app-hairline)]" />
                ))
              ) : (
                serverPrices.map(s => {
                  const isLowest = s.minPrice > 0 && s.minPrice === absoluteMin;
                  return (
                    <div key={s.serverName} className={`flex min-h-10 items-center justify-between rounded-lg p-2 transition-colors ${isLowest ? 'bg-[var(--app-surface)]' : 'hover:bg-[var(--app-surface)]'}`}>
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
                        {data === null
                          ? '미제공'
                          : data === undefined
                            ? isError ? '조회 실패' : '미제공'
                            : s.minPrice > 0 ? `${s.minPrice.toLocaleString()} G` : '매물 없음'}
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
      <PurchasePlanner
        key={itemId}
        listings={data?.listings ?? []}
        status={plannerStatus}
      />
      </div>
      </div>
    </>
  );
};
