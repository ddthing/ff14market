import { useQueries } from '@tanstack/react-query';
import masterItems from '../data/masterItems.json';
import { fetchItemMetadata } from '../api/itemCatalog';
import type { EnrichedItem } from './useItemData';

const catalog = new Map(masterItems.map((item) => [item.id, item]));

/** Saved items remain reachable even when the selected server has no listings. */
export function useSavedItems(ids: readonly number[], marketItems: readonly EnrichedItem[]) {
  const missingIds = ids.filter((id) => !catalog.has(id));
  const metadata = useQueries({
    queries: missingIds.map((id) => ({
      queryKey: ['itemMetadata', id],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchItemMetadata(id, signal),
      staleTime: 60 * 60 * 1000,
      retry: 1,
    })),
  });
  const market = new Map(marketItems.map((item) => [item.id, item]));
  const extra = new Map(missingIds.map((id, index) => [id, metadata[index]?.data]));
  return ids.map(
    (id): EnrichedItem =>
      market.get(id) ?? {
        id,
        name: `아이템 #${id}`,
        icon: '',
        category: '시세 대기',
        ...(catalog.get(id) ?? extra.get(id)),
        price: 0,
        averageListingPrice: 0,
        averageSalePrice: 0,
        fluctuation: null,
        volume: 0,
      },
  );
}
