import { isRecentMarketData } from './marketMetrics.ts';

export type HotIssueTab = 'volume' | 'drop' | 'price';

export interface RankingItem {
  price: number;
  volume: number;
  fluctuation: number | null;
  volumeChangePercent?: number | null;
  lastUploadTime?: number;
}

/** Fast fallback while the two-window history comparison is still loading. */
export const selectRecentVolumeItems = <T extends RankingItem>(
  items: T[],
  limit = 50,
  now = Date.now(),
): T[] => items
  .filter((item) => isRecentMarketData(item.lastUploadTime, now) && item.volume > 0)
  .sort((a, b) => b.volume - a.volume || b.price - a.price)
  .slice(0, Math.max(0, limit));

/** Current listing-versus-sale gap preview while historical prices load. */
export const selectCurrentPriceGapItems = <T extends RankingItem>(
  items: T[],
  limit = 50,
  now = Date.now(),
): T[] => items
  .filter((item) => isRecentMarketData(item.lastUploadTime, now) && item.fluctuation !== null)
  .sort((a, b) => (a.fluctuation ?? Infinity) - (b.fluctuation ?? Infinity) || b.volume - a.volume || b.price - a.price)
  .slice(0, Math.max(0, limit));

/** Selects and ranks each tab independently from the full enriched dataset. */
export const selectHotIssueItems = <T extends RankingItem>(
  items: T[],
  tab: HotIssueTab,
  limit = 50,
  now = Date.now(),
): T[] => {
  const filteredItems = items.filter((item) => {
    if (!isRecentMarketData(item.lastUploadTime, now)) return false;
    if (tab === 'volume') return item.volumeChangePercent !== null && item.volumeChangePercent !== undefined && item.volumeChangePercent > 0;
    if (tab === 'drop') return item.fluctuation !== null && item.fluctuation < 0;
    return item.price > 0;
  });

  filteredItems.sort((a, b) => {
    if (tab === 'volume') {
      return (b.volumeChangePercent ?? -Infinity) - (a.volumeChangePercent ?? -Infinity)
        || b.volume - a.volume
        || b.price - a.price;
    }
    if (tab === 'drop') return (a.fluctuation ?? Infinity) - (b.fluctuation ?? Infinity) || b.volume - a.volume;
    return b.price - a.price || b.volume - a.volume;
  });

  return filteredItems.slice(0, Math.max(0, limit));
};
