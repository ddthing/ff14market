import type { MarketPhaseName } from './market-phase-cache.ts';
import { phaseLockKey } from './market-phase-cache.ts';
import type { SnapshotBucket } from './market-data.ts';

export const CURRENT_PHASE_LOCK_LEASE_MS = 90_000;
export const HISTORY_PHASE_LOCK_LEASE_MS = 180_000;
export const API_REFRESH_COOLDOWN_MS = 60_000;

type LockOptions = {
  leaseMs?: number;
  cooldownMs?: number;
  ignoreCooldown?: boolean;
  now?: number;
};

export type PhaseLockResult<T> =
  | { acquired: true; value: T }
  | { acquired: false; reason: 'busy' | 'cooldown' };

type StoredLock = {
  owner: string;
  expiresAt: number;
  cooldownUntil: number;
};

const parseLock = async (object: { text(): Promise<string> }) => {
  try {
    const value: unknown = JSON.parse(await object.text());
    if (!value || typeof value !== 'object') return null;
    const candidate = value as Partial<StoredLock>;
    if (typeof candidate.owner !== 'string'
      || typeof candidate.expiresAt !== 'number'
      || typeof candidate.cooldownUntil !== 'number') return null;
    return candidate as StoredLock;
  } catch {
    return null;
  }
};

const writeLock = (
  bucket: SnapshotBucket,
  key: string,
  value: StoredLock,
  condition: { etagMatches: string } | Headers,
) => bucket.put(key, JSON.stringify(value), {
  httpMetadata: { contentType: 'application/json', cacheControl: 'no-store' },
  onlyIf: condition,
});

/**
 * R2 conditional writes provide a globally shared per-phase lease. The lease
 * serializes Pages stale repairs with the scheduled Worker, while the cooldown
 * limits repeated retries during an upstream outage. Cron can bypass cooldowns
 * but still respects an active lease.
 */
export const withMarketPhaseLock = async <T>(
  bucket: SnapshotBucket,
  phase: MarketPhaseName,
  server: string,
  callback: () => Promise<T>,
  options: LockOptions = {},
): Promise<PhaseLockResult<T>> => {
  const now = options.now ?? Date.now();
  const key = phaseLockKey(phase, server);
  const leaseMs = options.leaseMs ?? (phase === 'history'
    ? HISTORY_PHASE_LOCK_LEASE_MS
    : CURRENT_PHASE_LOCK_LEASE_MS);
  const existingObject = await bucket.get(key);
  const existing = existingObject ? await parseLock(existingObject) : null;

  if (existingObject && existing && existing.expiresAt > now) {
    return { acquired: false, reason: 'busy' };
  }
  if (existing && existing.cooldownUntil > now && !options.ignoreCooldown) {
    return { acquired: false, reason: 'cooldown' };
  }

  const owner = crypto.randomUUID();
  const lock: StoredLock = {
    owner,
    expiresAt: now + leaseMs,
    cooldownUntil: existing?.cooldownUntil ?? 0,
  };
  const condition = existingObject?.etag
    ? { etagMatches: existingObject.etag }
    : new Headers({ 'If-None-Match': '*' });

  // A malformed or legacy lock object cannot safely be replaced without its
  // ETag; leaving it alone fails closed rather than starting duplicate work.
  if (existingObject && !existingObject.etag) return { acquired: false, reason: 'busy' };

  const written = await writeLock(bucket, key, lock, condition);
  if (written === null) return { acquired: false, reason: 'busy' };

  const writtenEtag = written && typeof written === 'object' ? written.etag : undefined;
  try {
    return { acquired: true, value: await callback() };
  } finally {
    if (writtenEtag) {
      await writeLock(bucket, key, {
        owner,
        expiresAt: now,
        cooldownUntil: Date.now() + (options.cooldownMs ?? 0),
      }, { etagMatches: writtenEtag }).catch((error) => {
        console.warn('Market phase lock release failed', { phase, server, error });
      });
    }
  }
};
