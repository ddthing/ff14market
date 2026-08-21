import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Flame, X, RefreshCw, HelpCircle } from 'lucide-react';
import { fetchKoreaDCData } from '../../api/universalis';
import { getBulkQueryKey, computeTrueMinPrice } from '../../hooks/useItemData';
import { formatFreshness } from '../../utils/time';
import { PriceChart } from './PriceChart';
import { useServerStore } from '../../store/useServerStore';
import { getIconUrl } from '../../utils/icon';
import { DataErrorState } from '../ui/DataErrorState';
import type { MarketSnapshotResponse } from '../../types/market';
import { MARKET_SERVERS, MARKET_SERVER_NAMES } from '../../constants/market';
import { getAbsoluteMinPrice, getServerMinPrices } from '../../utils/marketListings';

interface Item {
  id: number;
  name: string;
  icon: string;
}

export const ItemModal = ({ item, onClose }: { item: Item; onClose: () => void }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const queryClient = useQueryClient();
  const { server } = useServerStore();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['searchItem', 'Korea', item.id],
    queryFn: ({ signal }) => fetchKoreaDCData(item.id, signal),
    staleTime: 300000, // 5 minutes
    retry: 0, // Pages Function already applies bounded upstream retry/backoff
  });

  const serverPrices = useMemo(
    () => getServerMinPrices(data?.listings, MARKET_SERVER_NAMES),
    [data],
  );
  const absoluteMin = useMemo(() => getAbsoluteMinPrice(serverPrices), [serverPrices]);

  // 모달에서 받은 최신 데이터를 리스트 벌크 캐시에 역방향 동기화
  // → 모달을 닫았을 때 리스트 가격이 즉시 최신화됨
  useEffect(() => {
    if (!data) return;
    
    // 현재 선택된 서버의 한글 이름 찾기 (예: '톤베리')
    const myServerName = MARKET_SERVERS.find((candidate) => candidate.id === server)?.name ?? '';
    
    // 모달이 불러온 Korea DC 전체 데이터 중, '현재 선택된 서버'의 매물만 필터링
    const myServerMinPrice = serverPrices.find(({ serverName }) => serverName === myServerName)?.minPrice ?? 0;

    if (myServerMinPrice <= 0) return;

    const exactQueryKey = getBulkQueryKey(server);

    queryClient.setQueryData<MarketSnapshotResponse>(
      exactQueryKey,
      (oldData) => {
        if (!oldData) return oldData;
        const prev = oldData.items[String(item.id)];
        if (!prev) return oldData;
        return {
          ...oldData,
          items: {
            ...oldData.items,
            [item.id]: {
              ...prev,
              minPrice: myServerMinPrice,
              minPriceNQ: 0, // NQ/HQ 구분 없이 절대 최저가로 덮어씌움
              minPriceHQ: 0,
              lastUploadTime: Date.now(), // 방금 직접 확인했으므로 시간 갱신
            },
          },
        };
      }
    );
  }, [data, item.id, queryClient, server, serverPrices]);

  const handleRefresh = async () => {
    setIsSpinning(true);
    await queryClient.invalidateQueries({
      queryKey: ['searchItem', 'Korea', item.id]
    });
    setTimeout(() => {
      setIsSpinning(false);
    }, 1000);
  };

  const itemData = data;
  // 모달 헤드라인: NQ/HQ 무관 절대 최저가
  const globalMinPrice = itemData
    ? computeTrueMinPrice(itemData.minPrice ?? 0, itemData.minPriceNQ ?? 0, itemData.minPriceHQ ?? 0)
    : 0;
  const netPrice = Math.floor(globalMinPrice * 0.95);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm max-h-[90vh] bg-white dark:bg-[#26282b] rounded-t-2xl sm:rounded-xl flex flex-col shadow-2xl animate-slide-up sm:animate-pop-in overflow-hidden">
        
        {/* 모바일 바텀시트 핸들바 */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0 cursor-pointer" onClick={onClose}>
          <div className="w-10 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>

        {/* 데스크톱 닫기 버튼 */}
        <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
          <button 
            onClick={onClose} 
            className="p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg text-gray-500 dark:text-[#9ea4aa] hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm hidden sm:flex"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 스크롤 가능한 내부 컨텐츠 */}
        <div className="overflow-y-auto px-4 sm:px-6 pb-24 sm:pb-28 pt-4 sm:pt-6 flex-1 scrollbar-hide">
          <div className="flex flex-col items-center sm:pt-4 pb-5">
          <img 
            src={getIconUrl(item.icon)} 
            alt={item.name} 
            loading="lazy"
            className="w-[88px] h-[88px] rounded-full mb-4 bg-gray-50 dark:bg-[#101112] p-[3px] shadow-sm" 
          />
          <h2 className="text-[20px] font-bold text-gray-900 dark:text-white text-center leading-tight">
            {item.name}
          </h2>
          <div className="flex items-center space-x-1 mt-2 text-gray-500 dark:text-[#9ea4aa] text-[13px] font-medium select-none">
            <span>
              {isLoading 
                ? '한국 DC 통합 시세 조회 중...' 
                : `업데이트: ${formatFreshness(itemData?.lastUploadTime)}`}
            </span>
            {!isLoading && (
              <>
                {/* 툴팁 */}
                <div className="relative group flex items-center justify-center">
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400 dark:text-[#9ea4aa] hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-60 hidden group-hover:block bg-gray-900/95 dark:bg-gray-800/95 text-white text-[11px] rounded-lg py-2 px-3 shadow-xl text-center leading-normal z-[120] pointer-events-none transition-all">
                    Universalis 데이터 제공 시점에 따라 인게임과 약간의 차이가 있을 수 있습니다.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95 dark:border-t-gray-800/95"></div>
                  </div>
                </div>
                {/* 새로고침 버튼 */}
                <button
                  onClick={handleRefresh}
                  disabled={isSpinning}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer flex items-center justify-center"
                  title="최신 정보 다시 조회"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-[#101112] rounded-xl p-4 space-y-4">
          {/* Chart Section */}
          <div className="w-full">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[13px] font-bold text-gray-700 dark:text-gray-300">한국 전체 최저가</span>
              {isLoading ? (
                <div className="w-20 h-5 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              ) : (
                <div className="text-right">
                  <div className="text-[18px] font-bold text-gray-900 dark:text-white leading-none">
                    {globalMinPrice > 0 ? `${globalMinPrice.toLocaleString()} G` : '매물 없음'}
                  </div>
                  {globalMinPrice > 0 && (
                    <div className="text-[11px] font-medium text-blue-500 dark:text-blue-400 mt-1">
                      (수수료 5% 제외: {netPrice.toLocaleString()} G)
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Daily Sales Announcement */}
            {!isLoading && itemData?.regularSaleVelocity !== undefined && (
              <div className="w-full bg-blue-50/50 dark:bg-blue-900/10 rounded-lg py-2 px-3 mb-3 border border-blue-100 dark:border-blue-800/30 flex items-center justify-between">
                <span className="text-[12px] font-medium text-blue-600 dark:text-blue-400 flex items-center">
                  {Math.round(itemData.regularSaleVelocity) >= 50 && <Flame className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  오늘 하루 동안 총 {Math.round(itemData.regularSaleVelocity).toLocaleString()}개의 매물이 거래되었습니다.
                </span>
              </div>
            )}
            
            {isError ? (
              <DataErrorState compact onRetry={() => void refetch()} />
            ) : isLoading ? (
              <div className="h-[90px] w-full bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mt-2" />
            ) : (
              <PriceChart history={itemData?.recentHistory || []} />
            )}
          </div>

          {/* DC Comparison Section */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-800/60">
            <span className="text-[12px] font-bold text-gray-500 dark:text-[#9ea4aa] mb-2 block">서버별 최저가 비교</span>
            <div className="space-y-1.5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-full h-7 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                ))
              ) : (
                serverPrices.map(s => {
                  const isLowest = s.minPrice > 0 && s.minPrice === absoluteMin;
                  return (
                    <div key={s.serverName} className={`flex justify-between items-center p-2 rounded-lg transition-colors ${
                      isLowest ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[13px] font-bold ${
                          isLowest ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {s.serverName}
                        </span>
                        {isLowest && (
                          <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 text-[10px] font-bold rounded-md">
                            최저가
                          </span>
                        )}
                      </div>
                      <span className={`text-[13px] font-medium ${isLowest ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-900 dark:text-white'}`}>
                        {s.minPrice > 0 ? `${s.minPrice.toLocaleString()} G` : '-'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        </div>
        
        {/* 하단 고정 버튼 영역 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-white via-white to-transparent dark:from-[#26282b] dark:via-[#26282b] dark:to-transparent pt-8 sm:pt-10 pointer-events-none">
          <button 
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-[14px] rounded-lg transition-colors text-[16px] pointer-events-auto shadow-lg"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
