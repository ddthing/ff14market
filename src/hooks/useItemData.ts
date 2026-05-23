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

export const useItemData = () => {
  const { server } = useServerStore();
  const itemIds = masterItems.map(item => item.id);
  
  const { data: apiData, isLoading } = useQuery({
    queryKey: ['universalis', server, itemIds],
    queryFn: () => fetchUniversalisData(server, itemIds),
  });

  const enrichedItems: EnrichedItem[] = masterItems.map(item => {
    const data = apiData?.[item.id];
    // If not loaded or not found, default to 0
    const minPrice = data?.minPrice || 0;
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
