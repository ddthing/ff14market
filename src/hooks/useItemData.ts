import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketSnapshot } from '../api/universalis';
import type { MarketSnapshotResponse } from '../types/market';
import masterItems from '../data/masterItems.json';
import { useServerStore } from '../store/useServerStore';
import { getMarketPollInterval, MARKET_POLL_INTERVAL_MS } from './marketPolling';
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

export const useItemData = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { server } = useServerStore();

  // This shared observer owns polling for the selected server's snapshot key.
  const { data: snapshot, isPending, isFetching, isError, error, refetch } = useQuery<MarketSnapshotResponse>({
    queryKey: getMarketSnapshotQueryKey(server),
    queryFn: ({ signal }) => fetchMarketSnapshot(server, signal),
    enabled,
    staleTime: MARKET_POLL_INTERVAL_MS,
    gcTime: 900000,
    refetchInterval: (query) => getMarketPollInterval(query.state.fetchStatus),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    networkMode: 'online',
    retry: 0,
  });
  const isLoading = enabled && isPending && snapshot === undefined;

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
    currentFreshness: snapshot?.freshness?.current,
    historyFreshness: snapshot?.freshness?.history,
    hasSnapshot: snapshot !== undefined,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
};
