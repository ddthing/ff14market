import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchCurrentStats,
  isSnapshotRefreshDue,
  refreshSnapshotIfAllowed,
  SNAPSHOT_REFRESH_COOLDOWN_MS,
  type SnapshotBucket,
} from '../functions/_lib/market-data.ts';

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

const item = (id: number) => ({
  itemID: id,
  minPrice: id * 10,
  minPriceNQ: id * 10,
  minPriceHQ: 0,
  regularSaleVelocity: 1,
  currentAveragePrice: id * 10,
  averagePrice: id * 10,
  lastUploadTime: Date.now(),
});

test('current market requests use summary fields and 50-item chunks', async () => {
  const calls: string[] = [];
  const fetcher = async (url: string) => {
    calls.push(url);
    const ids = new URL(url).pathname.split('/').pop()?.split(',').map(Number) ?? [];
    return response({ items: Object.fromEntries(ids.map((id) => [String(id), item(id)])) });
  };

  const result = await fetchCurrentStats('Tonberry', Array.from({ length: 120 }, (_, index) => index + 1), fetcher);

  assert.equal(calls.length, 3);
  assert.equal(result.partial, false);
  assert.equal(Object.keys(result.data).length, 120);

  for (const call of calls) {
    const url = new URL(call);
    const ids = url.pathname.split('/').pop()?.split(',') ?? [];
    assert.ok(ids.length <= 50);
    assert.equal(url.searchParams.get('listings'), '0');
    assert.equal(url.searchParams.get('entries'), '0');
    assert.match(url.searchParams.get('fields') ?? '', /items\.minPrice/);
  }
});

test('current market keeps successful chunks when one upstream chunk fails', async () => {
  let callCount = 0;
  const fetcher = async (url: string) => {
    callCount += 1;
    const ids = new URL(url).pathname.split('/').pop()?.split(',').map(Number) ?? [];
    if (ids.includes(51)) throw new Error('simulated upstream timeout');
    return response({ items: Object.fromEntries(ids.map((id) => [String(id), item(id)])) });
  };

  const result = await fetchCurrentStats('Tonberry', Array.from({ length: 100 }, (_, index) => index + 1), fetcher);

  assert.equal(result.partial, true);
  assert.equal(Object.keys(result.data).length, 50);
  assert.ok(callCount >= 3, 'the retry policy should make the failed chunk observable');
});

test('stale snapshot refresh is throttled and writes the refreshed snapshot', async () => {
  const now = 1_000_000;
  const writes: string[] = [];
  let buildCount = 0;
  const snapshot = {
    schemaVersion: 1 as const,
    server: 'Tonberry',
    generatedAt: now,
    historyReady: true,
    partial: false,
    items: {},
    priceChanges: {},
  };
  const bucket: SnapshotBucket = {
    get: async (key) => key.endsWith('.refresh')
      ? { text: async () => String(now - SNAPSHOT_REFRESH_COOLDOWN_MS - 1) }
      : null,
    put: async (key) => {
      writes.push(key);
    },
  };

  assert.equal(isSnapshotRefreshDue(now - 1, now), false);
  assert.equal(isSnapshotRefreshDue(now - SNAPSHOT_REFRESH_COOLDOWN_MS, now), true);

  const refreshed = await refreshSnapshotIfAllowed(
    bucket,
    'Tonberry',
    async () => {
      buildCount += 1;
      return snapshot;
    },
    now,
  );

  assert.equal(refreshed, true);
  assert.equal(buildCount, 1);
  assert.deepEqual(writes, [
    'market-snapshots/Tonberry.json.refresh',
    'market-snapshots/Tonberry.json',
  ]);
});

test('snapshot refresh skips a recently started refresh', async () => {
  const now = 1_000_000;
  let buildCount = 0;
  const bucket: SnapshotBucket = {
    get: async (key) => key.endsWith('.refresh')
      ? { text: async () => String(now - SNAPSHOT_REFRESH_COOLDOWN_MS + 1) }
      : null,
    put: async () => {
      throw new Error('a throttled refresh must not write');
    },
  };

  const refreshed = await refreshSnapshotIfAllowed(
    bucket,
    'Tonberry',
    async () => {
      buildCount += 1;
      throw new Error('a throttled refresh must not build');
    },
    now,
  );

  assert.equal(refreshed, false);
  assert.equal(buildCount, 0);
});
