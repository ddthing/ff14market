import type { MarketPhaseFreshness, MarketSnapshot } from '../../src/types/market';
import type { ChunkFetchResult } from './market-data';
import type { SnapshotBucket } from './market-data';
import { getMarketServerWorldId } from '../../src/constants/market.ts';

export const CURRENT_PHASE_TTL_MS = 60_000;
export const CURRENT_PHASE_STALE_AFTER_MS = 2 * 60_000;
export const CURRENT_ITEM_RETAIN_MAX_AGE_MS = 6 * 60 * 60_000;
export const HISTORY_PHASE_TTL_MS = 15 * 60_000;
export const HISTORY_PHASE_STALE_AFTER_MS = 30 * 60_000;
export const HISTORY_ITEM_RETAIN_MAX_AGE_MS = 48 * 60 * 60_000;

export type MarketPhaseName = 'current' | 'history';

export interface CurrentPhaseSnapshot {
  schemaVersion: 3;
  phase: 'current';
  server: string;
  sourceWorldId: number;
  generatedAt: number;
  lastSuccessAt: number | null;
  partial: boolean;
  items: Record<string, MarketSnapshot['items'][string]>;
  itemUpdatedAt: Record<string, number>;
  failedItemIds: number[];
}

export interface HistoryPhaseSnapshot {
  schemaVersion: 3;
  phase: 'history';
  server: string;
  sourceWorldId: number;
  generatedAt: number;
  lastSuccessAt: number | null;
  partial: boolean;
  historyReady: boolean;
  priceChanges: MarketSnapshot['priceChanges'];
  itemUpdatedAt: Record<string, number>;
  failedItemIds: number[];
}

export interface PhaseFetchResult<T> extends ChunkFetchResult<T> {
  successfulItemIds: number[];
  failedItemIds: number[];
}

export interface HistoryFetchResult {
  data: MarketSnapshot['priceChanges'];
  partial: boolean;
  successfulItemIds: number[];
  failedItemIds: number[];
}

export interface MarketSyncPhaseHealth {
  schemaVersion: 2;
  phase: MarketPhaseName;
  server: string;
  sourceWorldId: number;
  cron: string;
  scheduledAt: number;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  status: 'success' | 'partial' | 'failed' | 'skipped_busy' | 'skipped_cooldown';
  serverCount: number;
  successfulServerCount: number;
  skippedServerCount: number;
  failedServerCount: number;
  partialServerCount: number;
  itemCount: number;
  retainedItemCount: number;
  failedItemCount: number;
  lastSuccessAt: number | null;
}

const marketWorldKey = (server: string) => `${server}-${getMarketServerWorldId(server) ?? 'unknown'}`;

export const currentPhaseKey = (server: string) => `market-phase-korea-v3/current/${marketWorldKey(server)}.json`;
export const historyPhaseKey = (server: string) => `market-phase-korea-v3/history/${marketWorldKey(server)}.json`;
export const phaseHealthKey = (phase: MarketPhaseName, server: string) =>
  `market-phase-korea-v3/health/${phase}/${marketWorldKey(server)}.json`;
export const phaseLockKey = (phase: MarketPhaseName, server: string) =>
  `market-phase-korea-v3/lock/${phase}/${marketWorldKey(server)}.json`;

export const getSnapshotSourceWorldId = (server: string) => {
  const worldId = getMarketServerWorldId(server);
  if (!worldId) throw new Error(`Unsupported Korean market server: ${server}`);
  return worldId;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteTimestamp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const parseRecord = (serialized: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(serialized);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeTimestampMap = (value: unknown, fallbackAt: number) => {
  if (!isRecord(value)) return {} as Record<string, number>;
  return Object.fromEntries(Object.entries(value).flatMap(([id, timestamp]) =>
    isFiniteTimestamp(timestamp) ? [[id, timestamp]] : [[id, fallbackAt]],
  ));
};

const normalizeNumberIds = (value: unknown) => Array.isArray(value)
  ? [...new Set(value.filter((id): id is number => Number.isSafeInteger(id) && Number(id) > 0))]
  : [];

export const readCurrentPhaseSnapshot = async (
  bucket: SnapshotBucket,
  server: string,
): Promise<CurrentPhaseSnapshot | null> => {
  const object = await bucket.get(currentPhaseKey(server));
  if (object) {
    const stored = parseRecord(await object.text());
    if (stored?.schemaVersion === 3
      && stored.phase === 'current'
      && stored.server === server
      && stored.sourceWorldId === getMarketServerWorldId(server)
      && isFiniteTimestamp(stored.generatedAt)
      && isRecord(stored.items)) {
      return {
        schemaVersion: 3,
        phase: 'current',
        server,
        sourceWorldId: getSnapshotSourceWorldId(server),
        generatedAt: stored.generatedAt,
        lastSuccessAt: isFiniteTimestamp(stored.lastSuccessAt) ? stored.lastSuccessAt : null,
        partial: stored.partial === true,
        items: stored.items as CurrentPhaseSnapshot['items'],
        itemUpdatedAt: normalizeTimestampMap(stored.itemUpdatedAt, stored.generatedAt),
        failedItemIds: normalizeNumberIds(stored.failedItemIds),
      };
    }
  }
  // Pre-world-scoped snapshots may contain data from a same-named JP/EU world.
  // They are intentionally ignored and refetched from the verified Korean ID.
  return null;
};

export const readHistoryPhaseSnapshot = async (
  bucket: SnapshotBucket,
  server: string,
): Promise<HistoryPhaseSnapshot | null> => {
  const object = await bucket.get(historyPhaseKey(server));
  if (object) {
    const stored = parseRecord(await object.text());
    if (stored?.schemaVersion === 3
      && stored.phase === 'history'
      && stored.server === server
      && stored.sourceWorldId === getMarketServerWorldId(server)
      && isFiniteTimestamp(stored.generatedAt)
      && isRecord(stored.priceChanges)) {
      return {
        schemaVersion: 3,
        phase: 'history',
        server,
        sourceWorldId: getSnapshotSourceWorldId(server),
        generatedAt: stored.generatedAt,
        lastSuccessAt: isFiniteTimestamp(stored.lastSuccessAt) ? stored.lastSuccessAt : null,
        partial: stored.partial === true,
        historyReady: stored.historyReady === true,
        priceChanges: stored.priceChanges as HistoryPhaseSnapshot['priceChanges'],
        itemUpdatedAt: normalizeTimestampMap(stored.itemUpdatedAt, stored.generatedAt),
        failedItemIds: normalizeNumberIds(stored.failedItemIds),
      };
    }
  }
  return null;
};

export const mergeCurrentPhaseSnapshot = (
  server: string,
  requestedIds: number[],
  fetched: PhaseFetchResult<CurrentPhaseSnapshot['items']>,
  previous: CurrentPhaseSnapshot | null,
  now = Date.now(),
): CurrentPhaseSnapshot => {
  const requested = new Set(requestedIds);
  const successful = new Set(fetched.successfulItemIds);
  const failed = new Set(fetched.failedItemIds);
  const items: CurrentPhaseSnapshot['items'] = {};
  const itemUpdatedAt: Record<string, number> = {};

  for (const id of requested) {
    const key = String(id);
    if (successful.has(id) && Object.hasOwn(fetched.data, key)) {
      items[key] = fetched.data[key];
      itemUpdatedAt[key] = now;
      continue;
    }

    if (failed.has(id) && previous?.items[key] && previous.itemUpdatedAt[key]
      && now - previous.itemUpdatedAt[key] <= CURRENT_ITEM_RETAIN_MAX_AGE_MS) {
      items[key] = previous.items[key];
      itemUpdatedAt[key] = previous.itemUpdatedAt[key];
    }
  }

  const successfulChunks = fetched.successfulItemIds.length > 0;
  return {
    schemaVersion: 3,
    phase: 'current',
    server,
    sourceWorldId: getSnapshotSourceWorldId(server),
    generatedAt: now,
    lastSuccessAt: successfulChunks ? now : previous?.lastSuccessAt ?? null,
    partial: fetched.partial,
    items,
    itemUpdatedAt,
    failedItemIds: [...failed],
  };
};

export const mergeHistoryPhaseSnapshot = (
  server: string,
  requestedIds: number[],
  fetched: HistoryFetchResult,
  previous: HistoryPhaseSnapshot | null,
  now = Date.now(),
): HistoryPhaseSnapshot => {
  const requested = new Set(requestedIds);
  const successful = new Set(fetched.successfulItemIds);
  const failed = new Set(fetched.failedItemIds);
  const priceChanges: HistoryPhaseSnapshot['priceChanges'] = {};
  const itemUpdatedAt: Record<string, number> = {};

  for (const id of requested) {
    const key = String(id);
    if (successful.has(id)) {
      if (Object.hasOwn(fetched.data, key)) {
        priceChanges[key] = fetched.data[key];
        itemUpdatedAt[key] = now;
      }
      continue;
    }

    if (failed.has(id) && previous?.priceChanges[key] && previous.itemUpdatedAt[key]
      && now - previous.itemUpdatedAt[key] <= HISTORY_ITEM_RETAIN_MAX_AGE_MS) {
      priceChanges[key] = previous.priceChanges[key];
      itemUpdatedAt[key] = previous.itemUpdatedAt[key];
    }
  }

  const successfulChunks = fetched.successfulItemIds.length > 0;
  const lastSuccessAt = successfulChunks ? now : previous?.lastSuccessAt ?? null;
  return {
    schemaVersion: 3,
    phase: 'history',
    server,
    sourceWorldId: getSnapshotSourceWorldId(server),
    generatedAt: now,
    lastSuccessAt,
    partial: fetched.partial,
    historyReady: lastSuccessAt !== null,
    priceChanges,
    itemUpdatedAt,
    failedItemIds: [...failed],
  };
};

const countRetained = (updatedAt: Record<string, number>, generatedAt: number) =>
  Object.values(updatedAt).filter((timestamp) => timestamp < generatedAt).length;

export const getCurrentPhaseFreshness = (
  snapshot: CurrentPhaseSnapshot | null,
  now = Date.now(),
): MarketPhaseFreshness => {
  const generatedAt = snapshot?.generatedAt ?? null;
  const lastSuccessAt = snapshot?.lastSuccessAt ?? null;
  const ageMs = lastSuccessAt === null ? null : Math.max(0, now - lastSuccessAt);
  return {
    generatedAt,
    lastSuccessAt,
    ageMs,
    stale: ageMs === null || ageMs > CURRENT_PHASE_STALE_AFTER_MS,
    partial: snapshot?.partial ?? false,
    retainedItemCount: snapshot ? countRetained(snapshot.itemUpdatedAt, snapshot.generatedAt) : 0,
  };
};

export const getHistoryPhaseFreshness = (
  snapshot: HistoryPhaseSnapshot | null,
  now = Date.now(),
): MarketPhaseFreshness => {
  const generatedAt = snapshot?.generatedAt ?? null;
  const lastSuccessAt = snapshot?.lastSuccessAt ?? null;
  const ageMs = lastSuccessAt === null ? null : Math.max(0, now - lastSuccessAt);
  return {
    generatedAt,
    lastSuccessAt,
    ageMs,
    stale: ageMs === null || ageMs > HISTORY_PHASE_STALE_AFTER_MS,
    partial: snapshot?.partial ?? false,
    retainedItemCount: snapshot ? countRetained(snapshot.itemUpdatedAt, snapshot.generatedAt) : 0,
  };
};
