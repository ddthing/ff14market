import type { SnapshotBucket } from '../_lib/market-data.ts';
import {
  phaseHealthKey,
  type MarketPhaseName,
  type MarketSyncPhaseHealth,
} from '../_lib/market-phase-cache.ts';
import { SUPPORTED_SERVERS } from '../_lib/market-data.ts';
import { getMarketServerWorldId } from '../../src/constants/market.ts';

interface MarketHealthContext {
  env?: { MARKET_SNAPSHOTS?: SnapshotBucket };
}

const readPhaseHealth = async (
  bucket: SnapshotBucket,
  phase: MarketPhaseName,
  server: string,
): Promise<MarketSyncPhaseHealth | null> => {
  const object = await bucket.get(phaseHealthKey(phase, server));
  if (!object) return null;
  try {
    const value: unknown = JSON.parse(await object.text());
    if (!value || typeof value !== 'object') return null;
    const health = value as Partial<MarketSyncPhaseHealth>;
    if (health.schemaVersion !== 2
      || health.phase !== phase
      || health.server !== server
      || health.sourceWorldId !== getMarketServerWorldId(server)
      || typeof health.scheduledAt !== 'number'
      || typeof health.completedAt !== 'number'
      || typeof health.status !== 'string') return null;
    return health as MarketSyncPhaseHealth;
  } catch {
    return null;
  }
};

const isPhaseHealthy = (
  phase: MarketPhaseName,
  records: Array<MarketSyncPhaseHealth | null>,
  now: number,
) => {
  const maxAgeMs = phase === 'current' ? 5 * 60_000 : 45 * 60_000;
  return records.every((health) => health?.status === 'success'
    && now - health.scheduledAt < maxAgeMs
    && health.completedAt <= now + 60_000);
};

export const onRequestGet = async (context: MarketHealthContext) => {
  const bucket = context.env?.MARKET_SNAPSHOTS;
  if (!bucket) {
    return new Response(JSON.stringify({ error: 'Market health storage is unavailable.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const [currentRecords, historyRecords] = await Promise.all([
    Promise.all(SUPPORTED_SERVERS.map((server) => readPhaseHealth(bucket, 'current', server))),
    Promise.all(SUPPORTED_SERVERS.map((server) => readPhaseHealth(bucket, 'history', server))),
  ]);
  const now = Date.now();
  const currentHealthy = isPhaseHealthy('current', currentRecords, now);
  const historyHealthy = isPhaseHealthy('history', historyRecords, now);
  const body = {
    schemaVersion: 1,
    checkedAt: now,
    current: {
      healthy: currentHealthy,
      cronConfiguredFor: '* * * * *',
      servers: currentRecords,
    },
    history: {
      healthy: historyHealthy,
      cronConfiguredFor: '*/3 * * * * (one rotating server; each server every 15 minutes)',
      servers: historyRecords,
    },
    healthy: currentHealthy && historyHealthy,
  };

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};
