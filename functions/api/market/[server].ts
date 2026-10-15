import {
  fetchCurrentStats,
  isSupportedServer,
  MarketDataError,
  type MarketRequestContext,
  type SnapshotBucket,
} from '../../_lib/market-data';
import {
  getCurrentPhaseFreshness,
  getHistoryPhaseFreshness,
  mergeCurrentPhaseSnapshot,
  readCurrentPhaseSnapshot,
  readHistoryPhaseSnapshot,
  type CurrentPhaseSnapshot,
  type HistoryPhaseSnapshot,
} from '../../_lib/market-phase-cache';
import { refreshCurrentPhase, refreshHistoryPhase } from '../../_lib/market-phase-refresh';
import masterItems from '../../../src/data/masterItems.json';
import type { MarketSnapshotResponse } from '../../../src/types/market';
import { getMarketServerWorldId } from '../../../src/constants/market';

const MARKET_ITEM_IDS = masterItems.map((item) => item.id);

const jsonHeaders = (snapshot: MarketSnapshotResponse) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=10, s-maxage=15, stale-while-revalidate=30',
  'X-Market-Source': snapshot.source,
  'X-Market-Generated-At': String(snapshot.generatedAt),
  'X-Market-History-Ready': String(snapshot.historyReady),
  'X-Market-Current-Stale': String(snapshot.freshness?.current.stale ?? snapshot.stale),
  'X-Market-History-Stale': String(snapshot.freshness?.history.stale ?? true),
});

const toResponse = (
  server: string,
  current: CurrentPhaseSnapshot | null,
  history: HistoryPhaseSnapshot | null,
  source: MarketSnapshotResponse['source'],
  now = Date.now(),
) => {
  const currentFreshness = getCurrentPhaseFreshness(current, now);
  const historyFreshness = getHistoryPhaseFreshness(history, now);
  const responseSnapshot: MarketSnapshotResponse = {
    schemaVersion: 1,
    server,
    sourceWorldId: getMarketServerWorldId(server)!,
    generatedAt: current?.generatedAt ?? now,
    currentGeneratedAt: current?.generatedAt,
    historyGeneratedAt: history?.generatedAt ?? null,
    historyReady: history?.historyReady ?? false,
    partial: (current?.partial ?? false) || (history?.partial ?? false),
    items: current?.items ?? {},
    priceChanges: history?.priceChanges ?? {},
    source,
    stale: currentFreshness.stale,
    freshness: {
      current: currentFreshness,
      history: historyFreshness,
    },
  };
  return new Response(JSON.stringify(responseSnapshot), { headers: jsonHeaders(responseSnapshot) });
};

const errorResponse = (status: number, message: string) => new Response(JSON.stringify({
  error: {
    code: status === 503 ? 'UPSTREAM_UNAVAILABLE' : 'BAD_REQUEST',
    message,
  },
}), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

const scheduleCurrentRefresh = (
  context: MarketRequestContext,
  bucket: SnapshotBucket,
  server: string,
) => {
  context.waitUntil?.(refreshCurrentPhase(bucket, server, MARKET_ITEM_IDS).catch((error) => {
    console.error('Stale current market phase refresh failed', { server, error });
  }));
};

const scheduleHistoryRefresh = (
  context: MarketRequestContext,
  bucket: SnapshotBucket,
  server: string,
) => {
  context.waitUntil?.(refreshHistoryPhase(bucket, server, MARKET_ITEM_IDS).catch((error) => {
    console.error('Stale history market phase refresh failed', { server, error });
  }));
};

const createUncachedCurrent = async (server: string): Promise<CurrentPhaseSnapshot> => {
  const fetched = await fetchCurrentStats(server, MARKET_ITEM_IDS);
  return mergeCurrentPhaseSnapshot(server, MARKET_ITEM_IDS, fetched, null);
};

export const onRequestGet = async (context: MarketRequestContext & { params: { server?: string } }) => {
  const server = context.params.server ?? '';
  if (!isSupportedServer(server)) return errorResponse(400, '지원하지 않는 서버입니다.');

  const bucket = context.env?.MARKET_SNAPSHOTS;
  let current: CurrentPhaseSnapshot | null;
  let history: HistoryPhaseSnapshot | null = null;

  if (bucket) {
    [current, history] = await Promise.all([
      readCurrentPhaseSnapshot(bucket, server),
      readHistoryPhaseSnapshot(bucket, server),
    ]);

    if (!current) {
      try {
        const refreshed = await refreshCurrentPhase(bucket, server, MARKET_ITEM_IDS);
        current = refreshed.snapshot ?? await readCurrentPhaseSnapshot(bucket, server);
      } catch (error) {
        console.error('Initial current market phase refresh failed', { server, error });
        current = await readCurrentPhaseSnapshot(bucket, server);
      }
    }

    if (current && getCurrentPhaseFreshness(current).stale) {
      scheduleCurrentRefresh(context, bucket, server);
    }
    if (!history || getHistoryPhaseFreshness(history).stale) {
      scheduleHistoryRefresh(context, bucket, server);
    }

    if (current) return toResponse(server, current, history, 'r2');
  } else {
    try {
      current = await createUncachedCurrent(server);
    } catch (error) {
      console.error('Failed to fetch current market phase', { server, error });
      const message = error instanceof MarketDataError
        ? error.message
        : '장터 스냅샷을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.';
      return errorResponse(503, message);
    }
  }

  if (!current) {
    return errorResponse(503, '현재 장터 시세를 준비하는 중입니다. 잠시 후 다시 시도해 주세요.');
  }

  return toResponse(server, current, history, 'upstream-fallback');
};
