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

export interface MarketSnapshotResponse extends MarketSnapshot {
  source: 'r2' | 'upstream-fallback';
  stale: boolean;
}
