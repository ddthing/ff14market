import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Share2, ArrowLeft } from 'lucide-react';
import { loadItemCatalog, type ItemCatalogEntry } from '../data/loadItemCatalog';
import { fetchKoreaDCData } from '../api/universalis';
import { computeTrueMinPrice } from '../hooks/useItemData';
import { PriceChart } from '../components/common/PriceChart';
import { getIconUrl } from '../utils/icon';
import { useRecentStore } from '../store/useRecentStore';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import { DataErrorState } from '../components/ui/DataErrorState';
import { Seo } from '../components/seo/Seo';
import { formatSaleVelocity } from '../utils/marketMetrics';

export const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isCopied, setIsCopied] = useState(false);
  const [itemCatalog, setItemCatalog] = useState<ItemCatalogEntry[] | null>(null);
  const [hasCatalogError, setHasCatalogError] = useState(false);
  const addRecentId = useRecentStore((state) => state.addRecentId);

  const itemId = id ? parseInt(id) : 0;

  useEffect(() => {
    let isMounted = true;
    void loadItemCatalog()
      .then((catalog) => {
        if (isMounted) setItemCatalog(catalog);
      })
      .catch(() => {
        if (isMounted) setHasCatalogError(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const item = itemCatalog?.find((catalogItem) => catalogItem.id === itemId);

  useEffect(() => {
    if (itemId) {
      addRecentId(itemId);
    }
  }, [itemId, addRecentId]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['searchItem', 'Korea', itemId],
    queryFn: ({ signal }) => fetchKoreaDCData(itemId, signal),
    enabled: !!itemId && !!item,
    staleTime: 60000,
    retry: 1,
  });

  if (!itemCatalog) {
    return (
      <>
        <Seo
          title="아이템 시세 조회 중 | FF14 장터탐지기"
          description="파이널판타지14 한국 데이터센터 아이템 시세를 불러오는 중입니다."
          path={`/item/${itemId}`}
          noIndex
        />
        <div className="mx-auto flex max-w-md items-center justify-center py-20">
          {hasCatalogError ? (
            <DataErrorState onRetry={() => window.location.reload()} />
          ) : (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--app-hairline)] border-t-[var(--app-accent)]" aria-label="아이템 정보 불러오는 중" />
          )}
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
          <h2 className="mb-4 text-2xl font-bold text-[var(--app-ink)]">아이템을 찾을 수 없습니다</h2>
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
  
  const serverPrices = ['초코보', '모그리', '카벙클', '톤베리', '펜리르'].map(serverName => {
    const serverListings = itemData?.listings?.filter(l => l.worldName === serverName) || [];
    const minPrice = serverListings.length > 0 ? Math.min(...serverListings.map(l => l.pricePerUnit)) : 0;
    return { serverName, minPrice };
  });

  const validPrices = serverPrices.filter(s => s.minPrice > 0).map(s => s.minPrice);
  const absoluteMin = validPrices.length > 0 ? Math.min(...validPrices) : 0;

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 500);
  };

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
        <div className="absolute top-6 right-6 flex items-center space-x-3">
          <FavoriteButton itemId={itemId} />
          <button 
            onClick={handleShare} 
            className="flex items-center space-x-1 rounded-lg bg-[var(--app-surface-subtle)] px-3 py-2 text-[var(--app-ink-muted)] transition-colors hover:bg-[var(--app-hairline)] hover:text-[var(--app-ink)]"
          >
            {isCopied ? (
              <span className="text-[13px] font-bold text-[var(--app-accent)]">복사됨!</span>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span className="text-[13px] font-bold">공유</span>
              </>
            )}
          </button>
        </div>
        
        <div className="flex flex-col items-center pt-8 pb-8">
          <img 
            src={getIconUrl(item.icon)} 
            alt={item.name} 
            loading="lazy"
            className="mb-5 h-[100px] w-[100px] rounded-full bg-[var(--app-surface-subtle)] p-[3px] shadow-sm" 
          />
          <h2 className="text-center text-[24px] font-bold leading-tight text-[var(--app-ink)]">
            {item.name}
          </h2>
          <p className="mt-2 text-[15px] font-medium text-[var(--app-ink-muted)]">
            {isLoading ? '한국 DC 통합 시세 조회 중...' : `한국 DC 실시간 시세`}
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
                  {itemData.regularSaleVelocity >= 50 ? '🔥 ' : ''}최근 판매속도 기준 하루 평균 {formatSaleVelocity(itemData.regularSaleVelocity)}건이 판매되었습니다.
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
              <PriceChart history={itemData?.recentHistory || []} />
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
