import {
  buildMarketSnapshot,
  createMarketSyncTelemetry,
  SNAPSHOT_TTL_MS,
  snapshotKey,
  SUPPORTED_SERVERS,
  summarizeMarketSyncTelemetry,
  type SnapshotBucket,
} from '../functions/_lib/market-data';
import masterItems from '../src/data/masterItems.json';

interface Env {
  MARKET_SNAPSHOTS: SnapshotBucket;
  MARKET_API_BASE_URL?: string;
}

const FALLBACK_MARKET_ITEM_IDS = masterItems.map((item) => item.id);
const DEFAULT_MARKET_API_BASE_URL = 'https://ff14market.pages.dev';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

const logEvent = (event: string, payload: Record<string, unknown>) => {
  console.log(JSON.stringify({ event, ...payload }));
};

const warnEvent = (event: string, payload: Record<string, unknown>) => {
  console.warn(JSON.stringify({ event, ...payload }));
};

const errorEvent = (event: string, payload: Record<string, unknown>) => {
  console.error(JSON.stringify({ event, ...payload }));
};

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
    warnEvent('market_item_ids_fallback', {
      itemCount: FALLBACK_MARKET_ITEM_IDS.length,
      error: errorMessage(error),
    });
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
    const syncStartedAt = Date.now();
    let successfulServers = 0;
    let failedServers = 0;
    const marketItemIds = await resolveMarketItemIds(env);
    logEvent('market_item_ids_resolved', { count: marketItemIds.length });

    // Run servers serially. Each snapshot already uses at most two upstream
    // connections, keeping the worker below Universalis' connection cap.
    for (const server of SUPPORTED_SERVERS) {
      const telemetry = createMarketSyncTelemetry();
      try {
        const snapshot = await buildMarketSnapshot(server, marketItemIds, fetch, undefined, telemetry);
        const writeStartedAt = Date.now();
        await env.MARKET_SNAPSHOTS.put(
          snapshotKey(server),
          JSON.stringify(snapshot),
          snapshotPutOptions,
        );
        successfulServers += 1;
        const telemetrySummary = summarizeMarketSyncTelemetry(telemetry);
        logEvent('market_snapshot_updated', {
          server,
          itemCount: marketItemIds.length,
          generatedAt: snapshot.generatedAt,
          historyReady: snapshot.historyReady,
          partial: snapshot.partial,
          r2WriteDurationMs: Date.now() - writeStartedAt,
          telemetry: telemetrySummary,
        });
      } catch (error) {
        failedServers += 1;
        // Keep the previous R2 snapshot when one server's upstream refresh
        // fails. The Pages Function will mark that snapshot as stale.
        errorEvent('market_snapshot_failed', {
          server,
          itemCount: marketItemIds.length,
          telemetry: summarizeMarketSyncTelemetry(telemetry),
          error: errorMessage(error),
        });
      }
    }

    logEvent('market_sync_completed', {
      durationMs: Date.now() - syncStartedAt,
      successfulServers,
      failedServers,
      totalServers: SUPPORTED_SERVERS.length,
      itemCount: marketItemIds.length,
    });
  },
};
