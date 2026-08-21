import type { KoreaDCResponse } from '../../src/types/market';
import type { SnapshotBucket } from './market-data';

/**
 * R2 is a resilience tier, not the primary freshness source. Keeping the
 * window short limits how long a failed upstream can hide a changed listing.
 */
export const ITEM_DETAIL_STALE_MAX_AGE_MS = 15 * 60 * 1000;
export const ITEM_DETAIL_STALE_CACHE_PREFIX = 'item-details/';

export interface StoredItemDetail {
  schemaVersion: 1;
  itemId: number;
  cachedAt: number;
  data: KoreaDCResponse;
}

export interface ItemDetailStaleEntry {
  data: KoreaDCResponse;
  cachedAt: number;
  ageMs: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isKoreaDCResponse = (value: unknown): value is KoreaDCResponse => {
  if (!isRecord(value)) return false;

  return Number.isSafeInteger(value.itemID)
    && isFiniteNumber(value.minPrice)
    && isFiniteNumber(value.minPriceNQ)
    && isFiniteNumber(value.minPriceHQ)
    && isFiniteNumber(value.currentAveragePrice)
    && (value.listings === undefined || Array.isArray(value.listings))
    && (value.recentHistory === undefined || Array.isArray(value.recentHistory));
};

export const itemDetailStaleKey = (itemId: number) =>
  `${ITEM_DETAIL_STALE_CACHE_PREFIX}${itemId}.json`;

export const serializeStoredItemDetail = (
  itemId: number,
  data: KoreaDCResponse,
  cachedAt = Date.now(),
): string => JSON.stringify({
  schemaVersion: 1,
  itemId,
  cachedAt,
  data,
} satisfies StoredItemDetail);

export const readStoredItemDetail = async (
  bucket: SnapshotBucket,
  itemId: number,
  now = Date.now(),
  maxAgeMs = ITEM_DETAIL_STALE_MAX_AGE_MS,
): Promise<ItemDetailStaleEntry | null> => {
  const object = await bucket.get(itemDetailStaleKey(itemId));
  if (!object) return null;

  let stored: unknown;
  try {
    stored = JSON.parse(await object.text());
  } catch {
    return null;
  }

  if (!isRecord(stored)
    || stored.schemaVersion !== 1
    || stored.itemId !== itemId
    || !isFiniteNumber(stored.cachedAt)
    || !isKoreaDCResponse(stored.data)
    || stored.data.itemID !== itemId) {
    return null;
  }

  const ageMs = Math.max(0, now - stored.cachedAt);
  if (ageMs > maxAgeMs) return null;

  return {
    data: stored.data,
    cachedAt: stored.cachedAt,
    ageMs,
  };
};

export const writeStoredItemDetail = async (
  bucket: SnapshotBucket,
  itemId: number,
  data: KoreaDCResponse,
  cachedAt = Date.now(),
): Promise<void> => {
  await bucket.put(itemDetailStaleKey(itemId), serializeStoredItemDetail(itemId, data, cachedAt), {
    httpMetadata: {
      contentType: 'application/json',
      cacheControl: 'no-store',
    },
  });
};
