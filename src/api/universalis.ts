import axios from 'axios';
import { buildPriceChanges, type SaleHistoryEntry } from '../utils/marketHistory';

const BASE_URL = 'https://universalis.app/api/v2';

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

export interface UniversalisResponse {
  itemIDs: number[];
  items?: Record<string, UniversalisItemData>;
  unresolvedItems: number[];
}

const isNotFound = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 404;

const isCancellation = (error: unknown) => axios.isCancel(error);

const getItemsFromResponse = (
  data: UniversalisResponse | UniversalisItemData,
  fallbackItemId?: number,
): Record<string, UniversalisItemData> => {
  if ('items' in data && data.items) {
    return data.items;
  }

  if ('minPrice' in data && fallbackItemId !== undefined) {
    return { [fallbackItemId]: data };
  }

  return {};
};

export const fetchUniversalisData = async (
  server: string,
  itemIds: number[],
  signal?: AbortSignal,
): Promise<Record<string, UniversalisItemData>> => {
  if (itemIds.length === 0) return {};
  
  // Universalis API only allows fetching up to 100 items at a time
  const CHUNK_SIZE = 100;
  const uniqueItemIds = [...new Set(itemIds)];
  const chunks: number[][] = [];
  for (let i = 0; i < uniqueItemIds.length; i += CHUNK_SIZE) {
    chunks.push(uniqueItemIds.slice(i, i + CHUNK_SIZE));
  }

  const responses = await Promise.allSettled(
    chunks.map(async (chunk) => {
      const response = await axios.get<UniversalisResponse | UniversalisItemData>(
        `${BASE_URL}/${server}/${chunk.join(',')}`,
        { signal },
      );
      return { response, chunk };
    }),
  );

  const allItems: Record<string, UniversalisItemData> = {};
  const failures: unknown[] = [];
  let cancellationReason: unknown;

  for (const result of responses) {
    if (result.status === 'fulfilled') {
      Object.assign(
        allItems,
        getItemsFromResponse(result.value.response.data, result.value.chunk.length === 1 ? result.value.chunk[0] : undefined),
      );
      continue;
    }

    if (isCancellation(result.reason)) {
      cancellationReason = result.reason;
      continue;
    }

    // A 404 means the requested item(s) have no usable market response. Keep
    // successful chunks instead of turning the entire dashboard into an empty list.
    if (!isNotFound(result.reason)) {
      failures.push(result.reason);
    }
  }

  // React Query cancels superseded requests during development and when the
  // user changes server/item context. Preserve that cancellation contract so
  // it does not become a misleading empty-success or error state.
  if (cancellationReason !== undefined) {
    throw cancellationReason;
  }

  if (failures.length > 0 && Object.keys(allItems).length === 0) {
    console.error('Failed to fetch all Universalis item chunks', failures[0]);
    throw new Error('장터 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', {
      cause: failures[0],
    });
  }

  if (failures.length > 0) {
    console.warn(`Universalis returned partial data: ${failures.length} chunk(s) failed.`);
  }

  return allItems;
};

export interface KoreaDCResponse {
  itemID: number;
  listings?: { worldName: string; pricePerUnit: number; hq: boolean }[];
  recentHistory?: { worldName: string; pricePerUnit: number; timestamp: number }[];
  currentAveragePrice: number;
  minPrice: number;
  minPriceNQ: number;
  minPriceHQ: number;
  regularSaleVelocity?: number;
  lastUploadTime?: number;
}

export const fetchKoreaDCData = async (
  itemId: number,
  signal?: AbortSignal,
): Promise<KoreaDCResponse | null> => {
  try {
    const response = await axios.get<KoreaDCResponse>(`${BASE_URL}/Korea/${itemId}`, { signal });
    return response.data;
  } catch (error) {
    if (isCancellation(error)) {
      throw error;
    }

    if (isNotFound(error)) {
      return null;
    }
    console.error('Failed to fetch from Universalis API', error);
    throw new Error('아이템 시세를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', {
      cause: error,
    });
  }
};

interface UniversalisHistoryItem {
  itemID: number;
  entries?: SaleHistoryEntry[];
}

interface UniversalisHistoryResponse {
  itemIDs: number[];
  items?: Record<string, UniversalisHistoryItem>;
  unresolvedItems: number[];
}

const HISTORY_CHUNK_SIZE = 100;
const HISTORY_WINDOW_SECONDS = 7 * 24 * 60 * 60;
const HISTORY_WINDOW_MILLISECONDS = HISTORY_WINDOW_SECONDS * 1000;
// Universalis documents 1,800 as the default history window size. Keep the
// documented default so high-velocity items are less likely to be truncated.
const HISTORY_ENTRIES_LIMIT = 1800;

const fetchHistoryWindow = async (
  server: string,
  itemIds: number[],
  entriesUntil: number,
  signal?: AbortSignal,
): Promise<Record<string, SaleHistoryEntry[]>> => {
  const uniqueItemIds = [...new Set(itemIds)];
  const chunks: number[][] = [];
  for (let i = 0; i < uniqueItemIds.length; i += HISTORY_CHUNK_SIZE) {
    chunks.push(uniqueItemIds.slice(i, i + HISTORY_CHUNK_SIZE));
  }

  const responses = await Promise.allSettled(
    chunks.map(async (chunk) => {
      const params = new URLSearchParams({
        entriesToReturn: String(HISTORY_ENTRIES_LIMIT),
        entriesWithin: String(HISTORY_WINDOW_SECONDS),
        entriesUntil: String(entriesUntil),
        statsWithin: String(HISTORY_WINDOW_MILLISECONDS),
      });
      const response = await axios.get<UniversalisHistoryResponse>(
        `${BASE_URL}/history/${server}/${chunk.join(',')}?${params.toString()}`,
        { signal },
      );
      return response.data;
    }),
  );

  const allHistory: Record<string, SaleHistoryEntry[]> = {};
  const failures: unknown[] = [];
  let cancellationReason: unknown;

  for (const result of responses) {
    if (result.status === 'fulfilled') {
      for (const [itemId, item] of Object.entries(result.value.items ?? {})) {
        allHistory[itemId] = (item.entries ?? []).map(({ pricePerUnit, quantity, timestamp }) => ({
          pricePerUnit,
          quantity,
          timestamp,
        }));
      }
      continue;
    }

    if (isCancellation(result.reason)) {
      cancellationReason = result.reason;
      continue;
    }

    if (!isNotFound(result.reason)) {
      failures.push(result.reason);
    }
  }

  if (cancellationReason !== undefined) throw cancellationReason;

  if (failures.length > 0 && Object.keys(allHistory).length === 0) {
    console.error('Failed to fetch Universalis history data', failures[0]);
    throw new Error('가격 추세 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', {
      cause: failures[0],
    });
  }

  if (failures.length > 0) {
    console.warn(`Universalis history returned partial data: ${failures.length} chunk(s) failed.`);
  }

  return allHistory;
};

export const fetchUniversalisPriceChanges = async (
  server: string,
  itemIds: number[],
  signal?: AbortSignal,
) => {
  if (itemIds.length === 0) return {};

  const now = Math.floor(Date.now() / 1000);
  const [recentHistory, previousHistory] = await Promise.all([
    fetchHistoryWindow(server, itemIds, now, signal),
    fetchHistoryWindow(server, itemIds, now - HISTORY_WINDOW_SECONDS, signal),
  ]);

  return buildPriceChanges(recentHistory, previousHistory);
};
