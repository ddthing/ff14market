import { useQuery } from '@tanstack/react-query';
import { fetchUniversalisData } from '../api/universalis';
import masterItems from '../data/masterItems.json';
import { useServerStore } from '../store/useServerStore';

export interface EnrichedItem {
  id: number;
  name: string;
  icon: string;
  category: string;
  price: number;
  fluctuation: number;
  volume: number;
  lastUploadTime?: number;
}

// 서버별 통합 쿼리 키 생성 함수 — 모달의 캐시 역방향 동기화에서 공유 사용
export const getBulkQueryKey = (server: string) => ['universalis', server] as const;

// 진짜 최저가: NQ/HQ 중 낮은 값, 없으면 minPrice fallback
export const computeTrueMinPrice = (
  minPrice: number,
  minPriceNQ: number,
  minPriceHQ: number
): number => {
  const candidates = [minPrice, minPriceNQ, minPriceHQ].filter(v => v > 0);
  return candidates.length > 0 ? Math.min(...candidates) : 0;
};

export const useItemData = () => {
  const { server } = useServerStore();
  const itemIds = masterItems.map(item => item.id);

  // 현재 선택된 서버 기준으로 통합 조회
  const { data: apiData, isLoading } = useQuery({
    queryKey: [...getBulkQueryKey(server), itemIds],
    queryFn: () => fetchUniversalisData(server, itemIds),
    staleTime: 300000, // 5 minutes (모달에서 수동으로 덮어씌운 최신 캐시가 백그라운드 리패치에 의해 과거 벌크 데이터로 즉시 롤백되는 현상 방지)
  });

  const enrichedItems: EnrichedItem[] = masterItems.map(item => {
    const data = apiData?.[item.id];
    // NQ/HQ 관계없이 절대 최저가
    const minPrice = data
      ? computeTrueMinPrice(data.minPrice, data.minPriceNQ, data.minPriceHQ)
      : 0;
    const currentAverage = data?.currentAveragePrice || data?.averagePrice || minPrice;

    // Calculate fluctuation based on current average vs minimum price
    let fluctuation = 0;
    if (currentAverage > 0 && minPrice > 0) {
      fluctuation = ((minPrice - currentAverage) / currentAverage) * 100;
    }

    // 일일 거래량(regularSaleVelocity) 그대로 파싱
    const volume = data?.regularSaleVelocity ? Math.round(data.regularSaleVelocity) : 0;

    return {
      ...item,
      price: minPrice,
      fluctuation: fluctuation,
      volume: volume,
      lastUploadTime: data?.lastUploadTime,
    };
  })
  .filter(item => item.price > 0 && item.volume > 0) // 필터링: 거래량이나 가격이 없는 껍데기 매물 제외
  .sort((a, b) => {
    // 1순위: 거래량 내림차순
    if (b.volume !== a.volume) {
      return b.volume - a.volume;
    }
    // 2순위: 최저가 비싼 순 내림차순
    return b.price - a.price;
  })
  .slice(0, 50); // 실시간 인기순 상위 50개만 추출 (역동적인 리스트)

  return { enrichedItems, isLoading };
};
