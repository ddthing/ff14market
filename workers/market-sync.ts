import {
  buildMarketSnapshot,
  SNAPSHOT_TTL_MS,
  snapshotKey,
  SUPPORTED_SERVERS,
  type SnapshotBucket,
} from '../functions/_lib/market-data';
import masterItems from '../src/data/masterItems.json';

interface Env {
  MARKET_SNAPSHOTS: SnapshotBucket;
  MARKET_API_BASE_URL?: string;
}

const FALLBACK_MARKET_ITEM_IDS = masterItems.map((item) => item.id);
const DEFAULT_MARKET_API_BASE_URL = 'https://ff14market.pages.dev';

const resolveMarketItemIds = async (env: Env): Promise<number[]> => {
  const baseUrl = (env.MARKET_API_BASE_URL ?? DEFAULT_MARKET_API_BASE_URL).replace(/\/$/, '');

  try {
    const response = await fetch(`${baseUrl}/api/market-item-ids`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json() as { itemIds?: unknown };
    const itemIds = Array.isArray(payload.itemIds)
      ? payload.itemIds.filter((itemId): itemId is number =>
          typeof itemId === 'number' && Number.isSafeInteger(itemId) && itemId > 0)
      : [];
    const uniqueItemIds = [...new Set(itemIds)];
    if (uniqueItemIds.length === 0) throw new Error('Pages returned an empty item list');

    return uniqueItemIds;
  } catch (error) {
    console.warn('Could not refresh market item ids; using embedded fallback', { error });
    return FALLBACK_MARKET_ITEM_IDS;
  }
};

const snapshotPutOptions = {
  httpMetadata: {
    contentType: 'application/json',
    cacheControl: `public, max-age=${Math.floor(SNAPSHOT_TTL_MS / 1000)}`,
  },
};

export default {
  async scheduled(_event: unknown, env: Env) {
    const marketItemIds = await resolveMarketItemIds(env);
    console.log('Market item ids resolved', { count: marketItemIds.length });

    // Run servers serially. Each snapshot already uses at most two upstream
    // connections, keeping the worker below Universalis' connection cap.
    for (const server of SUPPORTED_SERVERS) {
      try {
        const snapshot = await buildMarketSnapshot(server, marketItemIds);
        await env.MARKET_SNAPSHOTS.put(
          snapshotKey(server),
          JSON.stringify(snapshot),
          snapshotPutOptions,
        );
        console.log('Market snapshot updated', {
          server,
          generatedAt: snapshot.generatedAt,
          historyReady: snapshot.historyReady,
          partial: snapshot.partial,
        });
      } catch (error) {
        // Keep the previous R2 snapshot when one server's upstream refresh
        // fails. The Pages Function will mark that snapshot as stale.
        console.error('Market snapshot update failed', { server, error });
      }
    }
  },
};
