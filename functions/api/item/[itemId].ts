import {
  createItemDetailTelemetry,
  fetchItemDetail,
  MarketDataError,
} from '../../_lib/market-data.ts';
import type { MarketRequestContext } from '../../_lib/market-data.ts';
import {
  createItemDetailCacheKey,
  getDefaultResponseCache,
  type ResponseCache,
} from '../../_lib/item-detail-cache.ts';
import type { KoreaDCResponse } from '../../../src/types/market.ts';
import {
  ITEM_DETAIL_STALE_MAX_AGE_MS,
  itemDetailStaleKey,
  readStoredItemDetail,
  writeStoredItemDetail,
  type ItemDetailStaleEntry,
} from '../../_lib/item-detail-stale-cache.ts';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

const logEvent = (event: string, payload: Record<string, unknown>) => {
  console.log(JSON.stringify({ event, ...payload }));
};

const errorEvent = (event: string, payload: Record<string, unknown>) => {
  console.error(JSON.stringify({ event, ...payload }));
};

const withCacheStatus = (response: Response, status: 'HIT' | 'MISS') => {
  const headers = new Headers(response.headers);
  headers.set('X-Market-Cache', status);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

interface ItemDetailContext extends MarketRequestContext {
  params: { itemId?: string };
  request?: Request;
  /** Optional seam for deterministic tests; Pages supplies the global cache. */
  cache?: ResponseCache;
}

type ItemDetailFetcher = (input: string, init?: RequestInit) => Promise<Response>;

const ITEM_DETAIL_STALE_FALLBACK_TIMEOUT_MS = 2_500;

const createDeadline = (milliseconds: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), milliseconds);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
};

const createDetailResponse = (
  data: KoreaDCResponse,
  cacheStatus: 'MISS' | 'STALE',
  staleEntry?: ItemDetailStaleEntry,
) => {
  const stale = staleEntry !== undefined;
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': stale
      ? 'no-store'
      : 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
    'X-Market-Cache': cacheStatus,
  });

  const payload = stale
    ? {
      ...data,
      marketMeta: {
        source: 'r2-stale' as const,
        cachedAt: staleEntry.cachedAt,
        staleAgeMs: staleEntry.ageMs,
      },
    }
    : data;

  if (stale) {
    headers.set('X-Market-Source', 'r2-stale');
    headers.set('X-Market-Stale-Age', String(Math.floor(staleEntry.ageMs / 1000)));
    headers.set('X-Market-Stale-At', String(staleEntry.cachedAt));
  }

  return new Response(JSON.stringify(payload), { headers });
};

const errorResponse = (status: number, message: string) => new Response(JSON.stringify({
  error: { code: status === 404 ? 'NOT_FOUND' : 'UPSTREAM_UNAVAILABLE', message },
}), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export const onRequestGet = async (
  context: ItemDetailContext,
  fetcher: ItemDetailFetcher = fetch,
) => {
  const itemId = Number(context.params.itemId);
  if (!Number.isSafeInteger(itemId) || itemId <= 0) return errorResponse(400, '잘못된 아이템 ID입니다.');

  const cache = context.cache ?? getDefaultResponseCache();
  const cacheKey = createItemDetailCacheKey(context.request?.url, itemId);
  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        logEvent('item_detail_cache_hit', { itemId });
        return withCacheStatus(cached, 'HIT');
      }
      logEvent('item_detail_cache_miss', { itemId });
    } catch (error) {
      errorEvent('item_detail_cache_read_failed', { itemId, error: errorMessage(error) });
    }
  } else {
    logEvent('item_detail_cache_bypass', { itemId, reason: 'cache_api_unavailable' });
  }

  const bucket = context.env?.MARKET_SNAPSHOTS;
  let staleEntry: ItemDetailStaleEntry | undefined;
  if (bucket) {
    try {
      const stored = await readStoredItemDetail(bucket, itemId);
      if (stored) {
        staleEntry = stored;
        logEvent('item_detail_stale_cache_hit', {
          itemId,
          ageMs: stored.ageMs,
          maxAgeMs: ITEM_DETAIL_STALE_MAX_AGE_MS,
        });
      }
    } catch (error) {
      errorEvent('item_detail_stale_cache_read_failed', {
        itemId,
        key: itemDetailStaleKey(itemId),
        error: errorMessage(error),
      });
    }
  }

  const telemetry = createItemDetailTelemetry();
  const deadline = staleEntry ? createDeadline(ITEM_DETAIL_STALE_FALLBACK_TIMEOUT_MS) : undefined;
  try {
    const data = await fetchItemDetail(itemId, fetcher, deadline?.signal, telemetry);
    if (!data) {
      logEvent('item_detail_not_found', { itemId, telemetry });
      return errorResponse(404, '아이템 시세를 찾을 수 없습니다.');
    }

    const body = JSON.stringify(data);
    logEvent('item_detail_upstream_completed', {
      itemId,
      telemetry,
      responsePayloadBytes: new TextEncoder().encode(body).byteLength,
    });

    const response = createDetailResponse(data, 'MISS');

    const cacheWrites: Promise<void>[] = [];
    if (cache) {
      cacheWrites.push(cache.put(cacheKey, response.clone()).catch((cacheError) => {
        errorEvent('item_detail_cache_write_failed', {
          itemId,
          error: errorMessage(cacheError),
        });
      }));
    }
    if (bucket) {
      cacheWrites.push(writeStoredItemDetail(bucket, itemId, data).catch((storageError) => {
        errorEvent('item_detail_stale_cache_write_failed', {
          itemId,
          key: itemDetailStaleKey(itemId),
          error: errorMessage(storageError),
        });
      }));
    }
    if (cacheWrites.length > 0) {
      const cacheWrite = Promise.all(cacheWrites).then(() => undefined);
      if (context.waitUntil) context.waitUntil(cacheWrite);
      else await cacheWrite;
    }

    return response;
  } catch (error) {
    if (staleEntry) {
      const reason = deadline?.signal.aborted ? 'timeout' : 'upstream_error';
      logEvent('item_detail_stale_fallback', {
        itemId,
        reason,
        ageMs: staleEntry.ageMs,
        telemetry,
      });
      return createDetailResponse(staleEntry.data, 'STALE', staleEntry);
    }

    errorEvent('item_detail_upstream_failed', {
      itemId,
      telemetry,
      error: errorMessage(error),
    });
    const message = error instanceof MarketDataError
      ? error.message
      : '아이템 시세를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return errorResponse(503, message);
  } finally {
    deadline?.cleanup();
  }
};
