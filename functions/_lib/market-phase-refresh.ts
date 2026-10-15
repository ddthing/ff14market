import type { MarketSnapshot } from '../../src/types/market';
import {
  createMarketSyncTelemetry,
  fetchCurrentStats,
  fetchPriceChanges,
  type Fetcher,
  type MarketSyncTelemetry,
  type SnapshotBucket,
} from './market-data.ts';
import {
  CURRENT_PHASE_TTL_MS,
  HISTORY_PHASE_TTL_MS,
  currentPhaseKey,
  historyPhaseKey,
  mergeCurrentPhaseSnapshot,
  mergeHistoryPhaseSnapshot,
  readCurrentPhaseSnapshot,
  readHistoryPhaseSnapshot,
  type CurrentPhaseSnapshot,
  type HistoryPhaseSnapshot,
} from './market-phase-cache.ts';
import { API_REFRESH_COOLDOWN_MS, withMarketPhaseLock } from './market-phase-lock.ts';

const jsonPutOptions = (maxAgeMs: number) => ({
  httpMetadata: {
    contentType: 'application/json',
    cacheControl: `public, max-age=${Math.floor(maxAgeMs / 1000)}`,
  },
});

export type PhaseRefreshState = 'updated' | 'skipped_busy' | 'skipped_cooldown';

export interface CurrentPhaseRefreshResult {
  state: PhaseRefreshState;
  snapshot?: CurrentPhaseSnapshot;
  telemetry: MarketSyncTelemetry;
  itemCount: number;
  retainedItemCount: number;
  failedItemCount: number;
}

export interface HistoryPhaseRefreshResult {
  state: PhaseRefreshState;
  snapshot?: HistoryPhaseSnapshot;
  telemetry: MarketSyncTelemetry;
  itemCount: number;
  retainedItemCount: number;
  failedItemCount: number;
}

const retainedCount = (updatedAt: Record<string, number>, generatedAt: number) =>
  Object.values(updatedAt).filter((updated) => updated < generatedAt).length;

const skipped = (reason: 'busy' | 'cooldown'): PhaseRefreshState =>
  reason === 'busy' ? 'skipped_busy' : 'skipped_cooldown';

export const refreshCurrentPhase = async (
  bucket: SnapshotBucket,
  server: string,
  itemIds: number[],
  options: {
    fetcher?: Fetcher;
    telemetry?: MarketSyncTelemetry;
    now?: () => number;
    scheduled?: boolean;
  } = {},
): Promise<CurrentPhaseRefreshResult> => {
  const telemetry = options.telemetry ?? createMarketSyncTelemetry();
  const result = await withMarketPhaseLock(bucket, 'current', server, async () => {
    const previous = await readCurrentPhaseSnapshot(bucket, server);
    const fetched = await fetchCurrentStats(
      server,
      itemIds,
      options.fetcher,
      undefined,
      telemetry.current,
    );
    const snapshot = mergeCurrentPhaseSnapshot(server, itemIds, fetched, previous, options.now?.() ?? Date.now());
    await bucket.put(
      currentPhaseKey(server),
      JSON.stringify(snapshot),
      jsonPutOptions(CURRENT_PHASE_TTL_MS),
    );
    return snapshot;
  }, {
    ignoreCooldown: options.scheduled,
    cooldownMs: options.scheduled ? 0 : API_REFRESH_COOLDOWN_MS,
  });

  if (!result.acquired) {
    return {
      state: skipped(result.reason),
      telemetry,
      itemCount: 0,
      retainedItemCount: 0,
      failedItemCount: 0,
    };
  }

  const snapshot = result.value;
  return {
    state: 'updated',
    snapshot,
    telemetry,
    itemCount: Object.keys(snapshot.items).length,
    retainedItemCount: retainedCount(snapshot.itemUpdatedAt, snapshot.generatedAt),
    failedItemCount: snapshot.failedItemIds.length,
  };
};

export const refreshHistoryPhase = async (
  bucket: SnapshotBucket,
  server: string,
  itemIds: number[],
  options: {
    fetcher?: Fetcher;
    telemetry?: MarketSyncTelemetry;
    now?: () => number;
    scheduled?: boolean;
  } = {},
): Promise<HistoryPhaseRefreshResult> => {
  const telemetry = options.telemetry ?? createMarketSyncTelemetry();
  const result = await withMarketPhaseLock(bucket, 'history', server, async () => {
    const previous = await readHistoryPhaseSnapshot(bucket, server);
    const fetched = await fetchPriceChanges(
      server,
      itemIds,
      options.fetcher,
      undefined,
      telemetry.history,
    );
    const snapshot = mergeHistoryPhaseSnapshot(server, itemIds, fetched, previous, options.now?.() ?? Date.now());
    await bucket.put(
      historyPhaseKey(server),
      JSON.stringify(snapshot),
      jsonPutOptions(HISTORY_PHASE_TTL_MS),
    );
    return snapshot;
  }, {
    ignoreCooldown: options.scheduled,
    cooldownMs: options.scheduled ? 0 : API_REFRESH_COOLDOWN_MS,
  });

  if (!result.acquired) {
    return {
      state: skipped(result.reason),
      telemetry,
      itemCount: 0,
      retainedItemCount: 0,
      failedItemCount: 0,
    };
  }

  const snapshot = result.value;
  return {
    state: 'updated',
    snapshot,
    telemetry,
    itemCount: Object.keys(snapshot.priceChanges).length,
    retainedItemCount: retainedCount(snapshot.itemUpdatedAt, snapshot.generatedAt),
    failedItemCount: snapshot.failedItemIds.length,
  };
};

export const combineMarketPhaseSnapshots = (
  server: string,
  current: CurrentPhaseSnapshot | null,
  history: HistoryPhaseSnapshot | null,
  generatedAt = current?.generatedAt ?? Date.now(),
): MarketSnapshot => ({
  schemaVersion: 1,
  server,
  generatedAt,
  historyReady: history?.historyReady ?? false,
  partial: (current?.partial ?? false) || (history?.partial ?? false),
  items: current?.items ?? {},
  priceChanges: history?.priceChanges ?? {},
});
