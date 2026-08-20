import {
  buildMarketSnapshot,
  isSupportedServer,
  MarketDataError,
  SNAPSHOT_TTL_MS,
  snapshotKey,
  type MarketRequestContext,
  type SnapshotBucket,
} from '../../_lib/market-data';
import masterItems from '../../../src/data/masterItems.json';
import type { MarketSnapshot, MarketSnapshotResponse } from '../../../src/types/market';

const MARKET_ITEM_IDS = masterItems.map((item) => item.id);

const jsonHeaders = (snapshot: MarketSnapshotResponse) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
  'X-Market-Source': snapshot.source,
  'X-Market-Generated-At': String(snapshot.generatedAt),
  'X-Market-History-Ready': String(snapshot.historyReady),
});

const toResponse = (snapshot: MarketSnapshot, source: MarketSnapshotResponse['source'], stale: boolean) => {
  const responseSnapshot: MarketSnapshotResponse = { ...snapshot, source, stale };
  return new Response(JSON.stringify(responseSnapshot), {
    headers: jsonHeaders(responseSnapshot),
  });
};

const readStoredSnapshot = async (bucket: SnapshotBucket, key: string) => {
  const object = await bucket.get(key);
  if (!object) return null;

  try {
    return JSON.parse(await object.text()) as MarketSnapshot;
  } catch (error) {
    console.warn('Stored market snapshot was invalid', { key, error });
    return null;
  }
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

export const onRequestGet = async (context: MarketRequestContext & { params: { server?: string } }) => {
  const server = context.params.server ?? '';
  if (!isSupportedServer(server)) return errorResponse(400, '지원하지 않는 서버입니다.');

  const bucket = context.env?.MARKET_SNAPSHOTS;
  if (bucket) {
    const stored = await readStoredSnapshot(bucket, snapshotKey(server));
    if (stored) {
      const stale = Date.now() - stored.generatedAt > SNAPSHOT_TTL_MS;
      return toResponse(stored, 'r2', stale);
    }
  }

  try {
    const snapshot = await buildMarketSnapshot(server, MARKET_ITEM_IDS);
    if (bucket) {
      context.waitUntil?.(bucket.put(snapshotKey(server), JSON.stringify(snapshot), {
        httpMetadata: {
          contentType: 'application/json',
          cacheControl: 'public, max-age=60',
        },
      }));
    }
    return toResponse(snapshot, 'upstream-fallback', false);
  } catch (error) {
    console.error('Failed to build market snapshot', { server, error });
    const message = error instanceof MarketDataError
      ? error.message
      : '장터 스냅샷을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return errorResponse(503, message);
  }
};
