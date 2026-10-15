import {
  createMarketSyncTelemetry,
  SNAPSHOT_TTL_MS,
  SUPPORTED_SERVERS,
  summarizeMarketSyncTelemetry,
  type SnapshotBucket,
} from '../functions/_lib/market-data';
import {
  HISTORY_PHASE_TTL_MS,
  getSnapshotSourceWorldId,
  phaseHealthKey,
  type MarketPhaseName,
  type MarketSyncPhaseHealth,
  readCurrentPhaseSnapshot,
  readHistoryPhaseSnapshot,
} from '../functions/_lib/market-phase-cache';
import { refreshCurrentPhase, refreshHistoryPhase } from '../functions/_lib/market-phase-refresh';
import masterItems from '../src/data/masterItems.json';

interface Env {
  MARKET_SNAPSHOTS: SnapshotBucket;
  MARKET_API_BASE_URL?: string;
}

interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
}

const FALLBACK_MARKET_ITEM_IDS = masterItems.map((item) => item.id);
const DEFAULT_MARKET_API_BASE_URL = 'https://ff14market.pages.dev';
const CURRENT_CRON = '* * * * *';
const HISTORY_CRON = '*/3 * * * *';

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

const getPhaseLastSuccessAt = async (
  env: Env,
  phase: MarketPhaseName,
  server: string,
) => {
  const snapshot = phase === 'current'
    ? await readCurrentPhaseSnapshot(env.MARKET_SNAPSHOTS, server)
    : await readHistoryPhaseSnapshot(env.MARKET_SNAPSHOTS, server);
  return snapshot?.lastSuccessAt ?? null;
};

const writeServerHealth = async (
  env: Env,
  health: MarketSyncPhaseHealth,
) => {
  const maxAgeMs = health.phase === 'current' ? SNAPSHOT_TTL_MS : HISTORY_PHASE_TTL_MS;
  await env.MARKET_SNAPSHOTS.put(phaseHealthKey(health.phase, health.server), JSON.stringify(health), {
    httpMetadata: {
      contentType: 'application/json',
      cacheControl: `public, max-age=${Math.floor(maxAgeMs / 1000)}`,
    },
  });
};

const runScheduledPhase = async (
  phase: MarketPhaseName,
  event: ScheduledEvent,
  env: Env,
  servers: readonly string[],
) => {
  const startedAt = Date.now();
  const itemIds = await resolveMarketItemIds(env);
  let successfulServerCount = 0;
  let skippedServerCount = 0;
  let failedServerCount = 0;
  let partialServerCount = 0;
  let itemCount = 0;
  let retainedItemCount = 0;
  let failedItemCount = 0;

  logEvent('market_item_ids_resolved', { phase, count: itemIds.length });

  // Current prices refresh all five servers each minute. History rotates one
  // server every three minutes, so each server receives a history phase every
  // fifteen minutes without exceeding the per-invocation subrequest budget.
  for (const server of servers) {
    const serverStartedAt = Date.now();
    const telemetry = createMarketSyncTelemetry(serverStartedAt);
    let status: MarketSyncPhaseHealth['status'];
    let serverItemCount = 0;
    let serverRetainedItemCount = 0;
    let serverFailedItemCount = 0;
    let lastSuccessAt: number | null;

    try {
      const outcome = phase === 'current'
        ? await refreshCurrentPhase(env.MARKET_SNAPSHOTS, server, itemIds, {
            telemetry,
            scheduled: true,
          })
        : await refreshHistoryPhase(env.MARKET_SNAPSHOTS, server, itemIds, {
            telemetry,
            scheduled: true,
          });

      if (outcome.state !== 'updated') {
        status = outcome.state;
        skippedServerCount += 1;
        lastSuccessAt = await getPhaseLastSuccessAt(env, phase, server);
        logEvent('market_phase_skipped', {
          phase,
          server,
          reason: outcome.state,
          telemetry: summarizeMarketSyncTelemetry(telemetry),
        });
      } else {
        status = outcome.snapshot?.partial ? 'partial' : 'success';
        successfulServerCount += 1;
        serverItemCount = outcome.itemCount;
        serverRetainedItemCount = outcome.retainedItemCount;
        serverFailedItemCount = outcome.failedItemCount;
        lastSuccessAt = outcome.snapshot?.lastSuccessAt ?? null;
        itemCount += serverItemCount;
        retainedItemCount += serverRetainedItemCount;
        failedItemCount += serverFailedItemCount;
        if (status === 'partial') partialServerCount += 1;
        logEvent('market_phase_updated', {
          phase,
          server,
          itemCount: serverItemCount,
          retainedItemCount: serverRetainedItemCount,
          failedItemCount: serverFailedItemCount,
          generatedAt: outcome.snapshot?.generatedAt,
          partial: outcome.snapshot?.partial,
          telemetry: summarizeMarketSyncTelemetry(telemetry),
        });
      }
    } catch (error) {
      status = 'failed';
      failedServerCount += 1;
      lastSuccessAt = await getPhaseLastSuccessAt(env, phase, server).catch(() => null);
      errorEvent('market_phase_failed', {
        phase,
        server,
        itemCount: itemIds.length,
        telemetry: summarizeMarketSyncTelemetry(telemetry),
        error: errorMessage(error),
      });
    }

    const completedAt = Date.now();
    const health: MarketSyncPhaseHealth = {
      schemaVersion: 2,
      phase,
      server,
      sourceWorldId: getSnapshotSourceWorldId(server),
      cron: event.cron,
      scheduledAt: event.scheduledTime,
      startedAt: serverStartedAt,
      completedAt,
      durationMs: Math.max(0, completedAt - serverStartedAt),
      status,
      serverCount: 1,
      successfulServerCount: status === 'success' || status === 'partial' ? 1 : 0,
      skippedServerCount: status === 'skipped_busy' || status === 'skipped_cooldown' ? 1 : 0,
      failedServerCount: status === 'failed' ? 1 : 0,
      partialServerCount: status === 'partial' ? 1 : 0,
      itemCount: serverItemCount,
      retainedItemCount: serverRetainedItemCount,
      failedItemCount: serverFailedItemCount,
      lastSuccessAt,
    };
    try {
      await writeServerHealth(env, health);
    } catch (error) {
      errorEvent('market_phase_health_write_failed', {
        phase,
        server,
        error: errorMessage(error),
      });
    }
  }

  logEvent('market_sync_phase_completed', {
    phase,
    cron: event.cron,
    scheduledAt: event.scheduledTime,
    durationMs: Date.now() - startedAt,
    serverCount: servers.length,
    successfulServerCount,
    skippedServerCount,
    failedServerCount,
    partialServerCount,
    itemCount,
    retainedItemCount,
    failedItemCount,
  });
};

const getRotatingHistoryServer = (scheduledTime: number) => {
  const slot = Math.floor(scheduledTime / (3 * 60_000)) % SUPPORTED_SERVERS.length;
  return SUPPORTED_SERVERS[slot] ?? SUPPORTED_SERVERS[0] ?? 'Chocobo';
};

export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    if (event.cron === HISTORY_CRON) {
      await runScheduledPhase('history', event, env, [getRotatingHistoryServer(event.scheduledTime)]);
      return;
    }
    if (event.cron === CURRENT_CRON) {
      await runScheduledPhase('current', event, env, SUPPORTED_SERVERS);
      return;
    }

    warnEvent('market_sync_unknown_cron', { cron: event.cron });
  },
};
