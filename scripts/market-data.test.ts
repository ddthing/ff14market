import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMarketSnapshotFromCurrent,
  createCurrentSnapshot,
  fetchItemDetail,
  fetchCurrentStats,
  ITEM_DETAIL_ENTRIES,
  ITEM_DETAIL_FIELDS,
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

test('item detail requests only the fields and history points rendered by the UI', async () => {
  let requestedUrl = '';
  const fetcher = async (url: string) => {
    requestedUrl = url;
    return response({ itemID: 33939, listings: [], recentHistory: [] });
  };

  const result = await fetchItemDetail(33939, fetcher);
  const url = new URL(requestedUrl);

  assert.equal(result?.itemID, 33939);
  assert.equal(url.searchParams.get('entries'), String(ITEM_DETAIL_ENTRIES));
  assert.equal(url.searchParams.get('fields'), ITEM_DETAIL_FIELDS);
  assert.ok(url.searchParams.get('fields')?.includes('listings.worldName'));
  assert.ok(url.searchParams.get('fields')?.includes('recentHistory.timestamp'));
});

test('current snapshot preview is usable before history finishes', async () => {
  const current = {
    data: { '1': item(1) },
    partial: false,
  };
  const preview = createCurrentSnapshot('Tonberry', current, 1_000_000);

  assert.equal(preview.generatedAt, 1_000_000);
  assert.equal(preview.historyReady, false);
  assert.equal(preview.partial, false);
  assert.deepEqual(preview.items, current.data);
  assert.deepEqual(preview.priceChanges, {});
});

test('history can finish from an already fetched current snapshot', async () => {
  const calls: string[] = [];
  const current = {
    data: { '1': item(1) },
    partial: false,
  };
  const fetcher = async (url: string) => {
    calls.push(url);
    return response({
      items: {
        '1': {
          entries: [{ pricePerUnit: 100, quantity: 2, timestamp: 1_000 }],
        },
      },
    });
  };

  const snapshot = await buildMarketSnapshotFromCurrent('Tonberry', current, fetcher);

  assert.equal(calls.length, 2, 'history should fetch recent and previous windows only');
  assert.equal(snapshot.historyReady, true);
  assert.equal(snapshot.partial, false);
  assert.deepEqual(snapshot.items, current.data);
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
