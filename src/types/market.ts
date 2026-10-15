import type { PriceChange } from '../utils/marketHistory';

export type { PriceChange } from '../utils/marketHistory';

export interface UniversalisItemData {
  itemID: number;
  minPrice: number;
  minPriceNQ: number;
  minPriceHQ: number;
  regularSaleVelocity: number;
  currentAveragePrice: number;
  averagePrice: number;
  lastUploadTime?: number;
}

export interface KoreaDCResponse {
  itemID: number;
  listings?: { worldName: string; pricePerUnit: number; hq?: boolean }[];
  recentHistory?: { worldName?: string; pricePerUnit: number; timestamp: number }[];
  currentAveragePrice: number;
  minPrice: number;
  minPriceNQ: number;
  minPriceHQ: number;
  regularSaleVelocity?: number;
  lastUploadTime?: number;
  /** Present only when the API had to serve a bounded R2 stale fallback. */
  marketMeta?: {
    source: 'r2-stale';
    cachedAt: number;
    staleAgeMs: number;
  };
}

export interface MarketSnapshot {
  schemaVersion: 1;
  server: string;
  generatedAt: number;
  historyReady: boolean;
  partial: boolean;
  items: Record<string, UniversalisItemData>;
  priceChanges: Record<string, PriceChange>;
}

export interface MarketPhaseFreshness {
  /** Time of the most recent attempted phase refresh. */
  generatedAt: number | null;
  /** Time of the most recent successful upstream chunk in this phase. */
  lastSuccessAt: number | null;
  ageMs: number | null;
  stale: boolean;
  partial: boolean;
  /** Number of values retained from earlier successful upstream reads. */
  retainedItemCount: number;
}

export interface MarketSnapshotResponse extends MarketSnapshot {
  source: 'r2' | 'upstream-fallback';
  /** Universalis world ID that produced this data (Korean worlds are numeric). */
  sourceWorldId?: number;
  /** Backward-compatible alias for current phase freshness. */
  stale: boolean;
  currentGeneratedAt?: number;
  historyGeneratedAt?: number | null;
  freshness?: {
    current: MarketPhaseFreshness;
    history: MarketPhaseFreshness;
  };
}
