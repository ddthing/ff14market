import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketSnapshot } from '../api/universalis';
import type { MarketSnapshotResponse } from '../types/market';
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

// 서버별 스냅샷 쿼리 키 생성 함수 — 목록과 상세 모달이 공유 사용
export const getMarketSnapshotQueryKey = (server: string) => ['market-snapshot', server] as const;
export const getBulkQueryKey = getMarketSnapshotQueryKey;

export const useItemData = () => {
  const { server } = useServerStore();

  // 현재 선택된 서버의 요약 지표와 사전 계산된 순위를 한 번에 조회
  const { data: snapshot, isLoading, isError, error, refetch } = useQuery<MarketSnapshotResponse>({
    queryKey: getMarketSnapshotQueryKey(server),
    queryFn: ({ signal }) => fetchMarketSnapshot(server, signal),
    staleTime: 300000, // 5 minutes (모달에서 수동으로 덮어씌운 최신 캐시가 백그라운드 리패치에 의해 과거 벌크 데이터로 즉시 롤백되는 현상 방지)
    gcTime: 900000,
    refetchOnWindowFocus: false,
    retry: 0,
  });

  const apiData = snapshot?.items;

  // The snapshot changes far less often than the views that consume it.
  // Keep normalization out of unrelated renders such as theme and favorite updates.
  const enrichedItems = useMemo<EnrichedItem[]>(() => masterItems.map(item => {
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
      volume,
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
    }), [apiData]);

  return {
    enrichedItems,
    priceChanges: snapshot?.priceChanges ?? {},
    historyReady: snapshot?.historyReady ?? false,
    snapshotGeneratedAt: snapshot?.generatedAt,
    snapshotSource: snapshot?.source,
    snapshotStale: snapshot?.stale ?? false,
    isLoading,
    isError,
    error,
    refetch,
  };
};
