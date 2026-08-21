import { buildPriceChanges, type SaleHistoryEntry } from '../../src/utils/marketHistory.ts';
import type {
  KoreaDCResponse,
  MarketSnapshot,
  PriceChange,
  UniversalisItemData,
} from '../../src/types/market.ts';

export const UPSTREAM_BASE_URL = 'https://universalis.app/api/v2';
export const SUPPORTED_SERVERS = ['Chocobo', 'Moogle', 'Carbuncle', 'Tonberry', 'Fenrir'] as const;
export const CURRENT_CHUNK_SIZE = 50;
export const HISTORY_CHUNK_SIZE = 50;
export const MAX_UPSTREAM_CONCURRENCY = 2;
export const HISTORY_WINDOW_SECONDS = 7 * 24 * 60 * 60;
export const HISTORY_WINDOW_MILLISECONDS = HISTORY_WINDOW_SECONDS * 1000;
export const HISTORY_ENTRIES_LIMIT = 1800;
export const SNAPSHOT_TTL_MS = 5 * 60 * 1000;
export const SNAPSHOT_REFRESH_COOLDOWN_MS = 60 * 1000;

export interface SnapshotBucketObject {
  text(): Promise<string>;
}

export interface SnapshotBucket {
  get(key: string): Promise<SnapshotBucketObject | null>;
  put(key: string, value: string, options?: Record<string, unknown>): Promise<void>;
}

export interface MarketRequestContext {
  waitUntil?: (promise: Promise<unknown>) => void;
  env?: {
    MARKET_SNAPSHOTS?: SnapshotBucket;
  };
}

export class MarketDataError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number, options?: ErrorOptions) {
    super(message, options);
    this.name = 'MarketDataError';
    this.status = status;
  }
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface HistoryResponse {
  items?: Record<string, { entries?: SaleHistoryEntry[] }>;
}

interface CurrentResponse {
  items?: Record<string, UniversalisItemData>;
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, milliseconds);
});

const uniqueIds = (itemIds: number[]) => [...new Set(itemIds)].filter(Number.isSafeInteger);

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const withTimeout = (signal?: AbortSignal, milliseconds = 12_000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  const abort = () => controller.abort();

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', abort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    },
  };
};

const getRetryDelay = (response: Response, attempt: number) => {
  const retryAfter = Number(response.headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.min(retryAfter * 1000, 5_000);
  }

  return 300 * (2 ** attempt) + Math.floor(Math.random() * 150);
};

const requestJson = async <T>(
  url: string,
  fetcher: Fetcher = fetch,
  signal?: AbortSignal,
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const timeout = withTimeout(signal);
    try {
      const response = await fetcher(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'FF14Market/1.0 (+https://ff14market.pages.dev)',
        },
        signal: timeout.signal,
      });

      if (response.ok) return await response.json() as T;

      const retryable = response.status === 429 || response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504;
      lastError = new MarketDataError(`Universalis responded with HTTP ${response.status}`, response.status);
      if (!retryable || attempt === 1) throw lastError;

      await wait(getRetryDelay(response, attempt));
    } catch (error) {
      lastError = error;
      if (error instanceof MarketDataError && error.status && ![429, 500, 502, 503, 504].includes(error.status)) {
        throw error;
      }
      if (signal?.aborted || attempt === 1) throw error;
      await wait(300 * (2 ** attempt) + Math.floor(Math.random() * 150));
    } finally {
      timeout.cleanup();
    }
  }

  throw lastError instanceof Error ? lastError : new MarketDataError('Universalis request failed');
};

const settledMapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  callback: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> => {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;

      try {
        results[index] = { status: 'fulfilled', value: await callback(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
};

const getCurrentUrl = (server: string, itemIds: number[]) => {
  const params = new URLSearchParams({
    // The dashboard only needs summary metrics. Avoid downloading every listing
    // and recent entry from the current-data endpoint.
    listings: '0',
    entries: '0',
    fields: 'items.itemID,items.lastUploadTime,items.currentAveragePrice,items.regularSaleVelocity,items.averagePrice,items.minPrice,items.minPriceNQ,items.minPriceHQ',
  });
  return `${UPSTREAM_BASE_URL}/${server}/${itemIds.join(',')}?${params.toString()}`;
};

const getHistoryUrl = (server: string, itemIds: number[], entriesUntil: number) => {
  const params = new URLSearchParams({
    entriesToReturn: String(HISTORY_ENTRIES_LIMIT),
    entriesWithin: String(HISTORY_WINDOW_SECONDS),
    entriesUntil: String(entriesUntil),
    statsWithin: String(HISTORY_WINDOW_MILLISECONDS),
  });
  return `${UPSTREAM_BASE_URL}/history/${server}/${itemIds.join(',')}?${params.toString()}`;
};

export interface ChunkFetchResult<T> {
  data: T;
  partial: boolean;
}

export const fetchCurrentStats = async (
  server: string,
  itemIds: number[],
  fetcher: Fetcher = fetch,
  signal?: AbortSignal,
): Promise<ChunkFetchResult<Record<string, UniversalisItemData>>> => {
  const chunks = chunk(uniqueIds(itemIds), CURRENT_CHUNK_SIZE);
  const results = await settledMapWithConcurrency(chunks, MAX_UPSTREAM_CONCURRENCY, (ids) =>
    requestJson<CurrentResponse>(getCurrentUrl(server, ids), fetcher, signal));
  const allItems: Record<string, UniversalisItemData> = {};
  let failures = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') Object.assign(allItems, result.value.items ?? {});
    else failures += 1;
  }

  if (Object.keys(allItems).length === 0 && failures > 0) {
    throw new MarketDataError('현재 장터 요약 데이터를 불러오지 못했습니다.', undefined, {
      cause: results.find((result) => result.status === 'rejected')?.reason,
    });
  }

  return { data: allItems, partial: failures > 0 };
};

const fetchHistoryWindow = async (
  server: string,
  itemIds: number[],
  entriesUntil: number,
  fetcher: Fetcher,
  signal?: AbortSignal,
): Promise<ChunkFetchResult<Record<string, SaleHistoryEntry[]>>> => {
  const chunks = chunk(uniqueIds(itemIds), HISTORY_CHUNK_SIZE);
  const results = await settledMapWithConcurrency(chunks, MAX_UPSTREAM_CONCURRENCY, (ids) =>
    requestJson<HistoryResponse>(getHistoryUrl(server, ids, entriesUntil), fetcher, signal));
  const allHistory: Record<string, SaleHistoryEntry[]> = {};
  let failures = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
        for (const [itemId, item] of Object.entries(result.value.items ?? {})) {
        allHistory[itemId] = (item.entries ?? []).map(({ pricePerUnit, quantity, timestamp }) => ({
          pricePerUnit,
          quantity,
          timestamp,
        }));
      }
    } else {
      failures += 1;
    }
  }

  if (Object.keys(allHistory).length === 0 && failures > 0) {
    throw new MarketDataError('가격 이력 데이터를 불러오지 못했습니다.', undefined, {
      cause: results.find((result) => result.status === 'rejected')?.reason,
    });
  }

  return { data: allHistory, partial: failures > 0 };
};

export const fetchPriceChanges = async (
  server: string,
  itemIds: number[],
  fetcher: Fetcher = fetch,
  signal?: AbortSignal,
): Promise<ChunkFetchResult<Record<string, PriceChange>>> => {
  const now = Math.floor(Date.now() / 1000);
  // Keep the two windows sequential so one refresh never exceeds the upstream
  // simultaneous-connection limit. Each window is internally capped at two.
  const recent = await fetchHistoryWindow(server, itemIds, now, fetcher, signal);
  const previous = await fetchHistoryWindow(server, itemIds, now - HISTORY_WINDOW_SECONDS, fetcher, signal);

  return {
    data: buildPriceChanges(recent.data, previous.data),
    partial: recent.partial || previous.partial,
  };
};

export const createCurrentSnapshot = (
  server: string,
  current: ChunkFetchResult<Record<string, UniversalisItemData>>,
  generatedAt = Date.now(),
): MarketSnapshot => ({
  schemaVersion: 1,
  server,
  generatedAt,
  historyReady: false,
  partial: current.partial,
  items: current.data,
  priceChanges: {},
});

export const buildMarketSnapshotFromCurrent = async (
  server: string,
  current: ChunkFetchResult<Record<string, UniversalisItemData>>,
  fetcher: Fetcher = fetch,
  signal?: AbortSignal,
): Promise<MarketSnapshot> => {
  const preview = createCurrentSnapshot(server, current);
  let priceChanges: Record<string, PriceChange> = {};
  let historyReady = false;
  let partial = current.partial;

  try {
    const history = await fetchPriceChanges(server, Object.keys(current.data).map(Number), fetcher, signal);
    priceChanges = history.data;
    historyReady = !history.partial;
    partial ||= history.partial;
  } catch (error) {
    // Current data is still useful for the fast preview. The UI can explain
    // that the two-window history snapshot is not ready yet.
    console.warn('Market history snapshot was not ready', { server, error });
  }

  return {
    ...preview,
    historyReady,
    partial,
    priceChanges,
  };
};

export const buildMarketSnapshot = async (
  server: string,
  itemIds: number[],
  fetcher: Fetcher = fetch,
  signal?: AbortSignal,
): Promise<MarketSnapshot> => {
  const current = await fetchCurrentStats(server, itemIds, fetcher, signal);
  return buildMarketSnapshotFromCurrent(server, current, fetcher, signal);
};

export const fetchItemDetail = async (
  itemId: number,
  fetcher: Fetcher = fetch,
  signal?: AbortSignal,
): Promise<KoreaDCResponse | null> => {
  try {
    return await requestJson<KoreaDCResponse>(`${UPSTREAM_BASE_URL}/Korea/${itemId}`, fetcher, signal);
  } catch (error) {
    if (error instanceof MarketDataError && error.status === 404) return null;
    throw error;
  }
};

export const snapshotKey = (server: string) => `market-snapshots/${server}.json`;

export const snapshotRefreshKey = (server: string) => `${snapshotKey(server)}.refresh`;

export const isSnapshotRefreshDue = (lastStartedAt: number | null, now = Date.now()) =>
  lastStartedAt === null
  || !Number.isFinite(lastStartedAt)
  || now - lastStartedAt >= SNAPSHOT_REFRESH_COOLDOWN_MS;

/**
 * Refreshes a stale R2 snapshot without making the caller wait for upstream history.
 * The short-lived marker prevents a burst of stale requests from starting duplicate builds.
 */
export const refreshSnapshotIfAllowed = async (
  bucket: SnapshotBucket,
  server: string,
  buildSnapshot: () => Promise<MarketSnapshot>,
  now = Date.now(),
): Promise<boolean> => {
  const refreshMarker = await bucket.get(snapshotRefreshKey(server));
  const lastStartedAt = refreshMarker ? Number(await refreshMarker.text()) : null;
  if (!isSnapshotRefreshDue(lastStartedAt, now)) return false;

  await bucket.put(snapshotRefreshKey(server), String(now), {
    httpMetadata: {
      contentType: 'text/plain',
      cacheControl: `public, max-age=${Math.floor(SNAPSHOT_REFRESH_COOLDOWN_MS / 1000)}`,
    },
  });

  const snapshot = await buildSnapshot();
  await bucket.put(snapshotKey(server), JSON.stringify(snapshot), {
    httpMetadata: {
      contentType: 'application/json',
      cacheControl: `public, max-age=${Math.floor(SNAPSHOT_TTL_MS / 1000)}`,
    },
  });
  return true;
};

export const isSupportedServer = (server: string): server is (typeof SUPPORTED_SERVERS)[number] =>
  (SUPPORTED_SERVERS as readonly string[]).includes(server);
