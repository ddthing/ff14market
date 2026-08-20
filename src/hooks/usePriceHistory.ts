import { useQuery } from '@tanstack/react-query';
import masterItems from '../data/masterItems.json';
import { fetchUniversalisPriceChanges } from '../api/universalis';
import type { PriceChange } from '../utils/marketHistory';

const masterItemIds = masterItems.map((item) => item.id);

export const usePriceHistory = (
  server: string,
  enabled: boolean,
  itemIds: number[] = masterItemIds,
) => {
  const requestedItemIds = [...new Set(itemIds)].sort((a, b) => a - b);
  const query = useQuery({
    queryKey: ['universalis-price-history', server, requestedItemIds],
    queryFn: ({ signal }) => fetchUniversalisPriceChanges(server, requestedItemIds, signal),
    enabled,
    staleTime: 900000,
    gcTime: 1800000,
    retry: 0,
  });

  return {
    priceChanges: (query.data ?? {}) as Record<string, PriceChange>,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
};
