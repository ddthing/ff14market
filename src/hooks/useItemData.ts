import { useQuery } from '@tanstack/react-query';
import { fetchUniversalisData } from '../api/universalis';
import masterItems from '../data/masterItems.json';
import { useServerStore } from '../store/useServerStore';
import {
  computeMarketPriceGapPercent,
  computeTrueMinPrice,
  normalizeSaleVelocity,
} from '../utils/marketMetrics';

export { computeTrueMinPrice } from '../utils/marketMetrics';

export interface EnrichedItem {
  id: number;
  name: string;
  icon: string;
  category: string;
  price: number;
  averageListingPrice: number;
  averageSalePrice: number;
  fluctuation: number | null;
  volumeChangePercent?: number | null;
  volume: number;
  lastUploadTime?: number;
}

// 서버별 통합 쿼리 키 생성 함수 — 모달의 캐시 역방향 동기화에서 공유 사용
export const getBulkQueryKey = (server: string) => ['universalis', server] as const;

export const useItemData = () => {
  const { server } = useServerStore();
  const itemIds = masterItems.map(item => item.id);

  // 현재 선택된 서버 기준으로 통합 조회
  const { data: apiData, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...getBulkQueryKey(server), itemIds],
    queryFn: ({ signal }) => fetchUniversalisData(server, itemIds, signal),
    staleTime: 300000, // 5 minutes (모달에서 수동으로 덮어씌운 최신 캐시가 백그라운드 리패치에 의해 과거 벌크 데이터로 즉시 롤백되는 현상 방지)
    retry: 1,
  });

  const enrichedItems: EnrichedItem[] = masterItems.map(item => {
    const data = apiData?.[item.id];
    // NQ/HQ 관계없이 절대 최저가
    const minPrice = data
      ? computeTrueMinPrice(data.minPrice, data.minPriceNQ, data.minPriceHQ)
      : 0;
    const currentAveragePrice = data?.currentAveragePrice ?? 0;
    const recentAverageSalePrice = data?.averagePrice ?? 0;
    const averageListingPrice = currentAveragePrice > 0 ? currentAveragePrice : 0;
    const averageSalePrice = recentAverageSalePrice > 0 ? recentAverageSalePrice : 0;
    const fluctuation = computeMarketPriceGapPercent(averageListingPrice, averageSalePrice);
    const volume = normalizeSaleVelocity(data?.regularSaleVelocity);

    return {
      ...item,
      price: minPrice,
      averageListingPrice,
      averageSalePrice,
      fluctuation,
      volume: volume,
      lastUploadTime: data?.lastUploadTime,
    };
  })
  .filter(item => item.price > 0 || item.averageListingPrice > 0 || item.volume > 0)
  .sort((a, b) => {
    // 1순위: 거래량 내림차순
    if (b.volume !== a.volume) {
      return b.volume - a.volume;
    }
    // 2순위: 최저가 비싼 순 내림차순
    return b.price - a.price;
  });

  return { enrichedItems, isLoading, isError, error, refetch };
};
