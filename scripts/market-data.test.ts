import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMarketSnapshotFromCurrent,
  createCurrentSnapshot,
  createItemDetailTelemetry,
  createMarketSyncTelemetry,
  fetchItemDetail,
  fetchCurrentStats,
  fetchPriceChanges,
  getUniversalisWorldId,
  ITEM_DETAIL_ENTRIES,
  ITEM_DETAIL_FIELDS,
  isSnapshotRefreshDue,
  refreshSnapshotIfAllowed,
  SNAPSHOT_REFRESH_COOLDOWN_MS,
  SUPPORTED_SERVERS,
  summarizeMarketSyncTelemetry,
  type SnapshotBucket,
} from '../functions/_lib/market-data.ts';
import {
  mergeCurrentPhaseSnapshot,
  mergeHistoryPhaseSnapshot,
  readCurrentPhaseSnapshot,
  readHistoryPhaseSnapshot,
  CURRENT_ITEM_RETAIN_MAX_AGE_MS,
  currentPhaseKey,
  historyPhaseKey,
  phaseHealthKey,
} from '../functions/_lib/market-phase-cache.ts';
import { withMarketPhaseLock } from '../functions/_lib/market-phase-lock.ts';
import { onRequestGet as getMarketHealth } from '../functions/api/market-health.ts';
import { refreshCurrentPhase } from '../functions/_lib/market-phase-refresh.ts';
import { createItemDetailCacheKey } from '../functions/_lib/item-detail-cache.ts';

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

const tonberryResponse = (body: Record<string, unknown>, status = 200) =>
  response({ worldID: 2078, ...body }, status);

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

test('Korean display server names map to verified numeric Universalis world IDs', () => {
  assert.deepEqual(SUPPORTED_SERVERS.map(getUniversalisWorldId), [2076, 2077, 2075, 2078, 2080]);
});

test('current market requests use summary fields and 50-item chunks', async () => {
  const calls: string[] = [];
  const fetcher = async (url: string) => {
    calls.push(url);
    const ids = new URL(url).pathname.split('/').pop()?.split(',').map(Number) ?? [];
    return tonberryResponse({ items: Object.fromEntries(ids.map((id) => [String(id), item(id)])) });
  };

  const result = await fetchCurrentStats('Tonberry', Array.from({ length: 120 }, (_, index) => index + 1), fetcher);

  assert.equal(calls.length, 3);
  assert.equal(result.partial, false);
  assert.equal(Object.keys(result.data).length, 120);
  assert.equal(result.metrics?.chunks, 3);
  assert.equal(result.metrics?.failedChunks, 0);
  assert.equal(result.metrics?.requests, 3);
  assert.equal(result.metrics?.retries, 0);

  for (const call of calls) {
    const url = new URL(call);
    const ids = url.pathname.split('/').pop()?.split(',') ?? [];
    assert.ok(ids.length <= 50);
    assert.match(url.pathname, /^\/api\/v2\/2078\//, 'Tonberry requests must use the Korean world ID');
    assert.equal(url.searchParams.get('listings'), '0');
    assert.equal(url.searchParams.get('entries'), '20');
    const selectedFields = url.searchParams.get('fields')?.split(',') ?? [];
    assert.ok(selectedFields.includes('worldID'), 'the filtered response must retain the world ID for scope validation');
    assert.ok(selectedFields.includes('items.minPrice'));
  }
});

test('current snapshots preserve sale metrics that depend on upstream history sampling', async () => {
  const fetcher = async (url: string) => {
    // Universalis returns zero summaries when entries=0, even for traded items.
    const includesHistory = Number(new URL(url).searchParams.get('entries') ?? 5) > 0;
    return tonberryResponse({ items: { '45070': {
      ...item(45070),
      averagePrice: includesHistory ? 3143439.2 : 0,
      regularSaleVelocity: includesHistory ? 0.42857143 : 0,
    } } });
  };

  const current = await fetchCurrentStats('Tonberry', [45070], fetcher);
  const snapshot = createCurrentSnapshot('Tonberry', current);
  assert.equal(snapshot.items['45070'].averagePrice, 3143439.2);
  assert.equal(snapshot.items['45070'].regularSaleVelocity, 0.42857143);
});

test('current market keeps successful chunks when one upstream chunk fails', async () => {
  let callCount = 0;
  const fetcher = async (url: string) => {
    callCount += 1;
    const ids = new URL(url).pathname.split('/').pop()?.split(',').map(Number) ?? [];
    if (ids.includes(51)) throw new Error('simulated upstream timeout');
    return tonberryResponse({ items: Object.fromEntries(ids.map((id) => [String(id), item(id)])) });
  };

  const result = await fetchCurrentStats('Tonberry', Array.from({ length: 100 }, (_, index) => index + 1), fetcher);

  assert.equal(result.partial, true);
  assert.equal(Object.keys(result.data).length, 50);
  assert.ok(callCount >= 3, 'the retry policy should make the failed chunk observable');
  assert.equal(result.metrics?.chunks, 2);
  assert.equal(result.metrics?.failedChunks, 1);
  assert.equal(result.metrics?.retries, 1);
  assert.deepEqual(result.successfulItemIds, Array.from({ length: 50 }, (_, index) => index + 1));
  assert.deepEqual(result.failedItemIds, Array.from({ length: 50 }, (_, index) => index + 51));
});

test('same-named non-Korean world responses are rejected at the affected chunk', async () => {
  const requestedIds = Array.from({ length: 51 }, (_, index) => index + 1);
  const result = await fetchCurrentStats('Tonberry', requestedIds, async (url) => {
    const ids = new URL(url).pathname.split('/').pop()?.split(',').map(Number) ?? [];
    return response({
      worldID: ids.includes(51) ? 46 : 2078,
      items: Object.fromEntries(ids.map((id) => [String(id), item(id)])),
    });
  });

  assert.equal(result.partial, true);
  assert.equal(Object.keys(result.data).length, 50);
  assert.deepEqual(result.failedItemIds, [51]);
  assert.equal(result.metrics?.requests, 2, 'a wrong-world payload is rejected without another upstream request');
});

test('successful empty current chunks clear old values while failed chunks retain bounded last-good data', async () => {
  const ids = Array.from({ length: 51 }, (_, index) => index + 1);
  const fetched = await fetchCurrentStats('Tonberry', ids, async (url) => {
    const requestedIds = new URL(url).pathname.split('/').pop()?.split(',').map(Number) ?? [];
    if (requestedIds.includes(51)) throw new Error('simulated chunk failure');
    return tonberryResponse({ items: {} });
  });
  const now = 10_000_000;
  const previousSuccessfulItem = item(1);
  const previousFailedItem = item(51);
  const prior = {
    schemaVersion: 3 as const,
    phase: 'current' as const,
    server: 'Tonberry',
    sourceWorldId: 2078,
    generatedAt: now - 5_000,
    lastSuccessAt: now - 5_000,
    partial: false,
    items: { '1': previousSuccessfulItem, '51': previousFailedItem },
    itemUpdatedAt: { '1': now - 5_000, '51': now - 5_000 },
    failedItemIds: [],
  };

  const merged = mergeCurrentPhaseSnapshot('Tonberry', ids, fetched, prior, now);
  assert.deepEqual(merged.items, { '51': previousFailedItem });
  assert.deepEqual(merged.itemUpdatedAt, { '51': now - 5_000 });
  assert.deepEqual(merged.failedItemIds, [51]);
  assert.equal(merged.partial, true);

  const expiredPrior = {
    ...prior,
    itemUpdatedAt: { '1': now - 1, '51': now - CURRENT_ITEM_RETAIN_MAX_AGE_MS - 1 },
  };
  const expired = mergeCurrentPhaseSnapshot('Tonberry', ids, fetched, expiredPrior, now);
  assert.deepEqual(expired.items, {});
  assert.equal(expired.lastSuccessAt, now, 'a successful empty chunk still proves the phase contacted Universalis');
});

test('upstream retry metrics classify rate limits and server errors', async () => {
  const attempts = new Map<number, number>();
  const fetcher = async (url: string) => {
    const ids = new URL(url).pathname.split('/').pop()?.split(',').map(Number) ?? [];
    const key = ids[0] ?? 0;
    const attempt = (attempts.get(key) ?? 0) + 1;
    attempts.set(key, attempt);

    if (attempt === 1 && key === 1) return response({}, 429);
    if (attempt === 1 && key === 51) return response({}, 503);
    return tonberryResponse({ items: Object.fromEntries(ids.map((id) => [String(id), item(id)])) });
  };

  const result = await fetchCurrentStats('Tonberry', Array.from({ length: 100 }, (_, index) => index + 1), fetcher);

  assert.equal(result.partial, false);
  assert.equal(result.metrics?.requests, 4);
  assert.equal(result.metrics?.retries, 2);
  assert.equal(result.metrics?.rateLimitResponses, 1);
  assert.equal(result.metrics?.serverErrors, 1);
});

test('item detail requests only the fields and history points rendered by the UI', async () => {
  let requestedUrl = '';
  const payload = { itemID: 33939, listings: [], recentHistory: [] };
  const fetcher = async (url: string) => {
    requestedUrl = url;
    return response(payload);
  };

  const telemetry = createItemDetailTelemetry();
  const result = await fetchItemDetail(33939, fetcher, undefined, telemetry);
  const url = new URL(requestedUrl);

  assert.equal(result?.itemID, 33939);
  assert.equal(url.searchParams.get('entries'), String(ITEM_DETAIL_ENTRIES));
  assert.equal(url.searchParams.get('fields'), ITEM_DETAIL_FIELDS);
  assert.ok(url.searchParams.get('fields')?.includes('listings.worldName'));
  assert.ok(url.searchParams.get('fields')?.includes('recentHistory.timestamp'));
  assert.equal(telemetry.attempts, 1);
  assert.equal(telemetry.lastStatus, 200);
  assert.equal(
    telemetry.upstreamPayloadBytes,
    new TextEncoder().encode(JSON.stringify(payload)).byteLength,
  );
  assert.ok(telemetry.upstreamDurationMs >= 0);
});

test('item detail cache keys ignore query strings', () => {
  const first = createItemDetailCacheKey(
    'https://ff14market.pages.dev/api/item/33939?measure=first',
    33939,
  );
  const second = createItemDetailCacheKey(
    'https://ff14market.pages.dev/api/item/33939?measure=second',
    33939,
  );

  assert.equal(first.url, 'https://ff14market.pages.dev/api/item/33939');
  assert.equal(first.url, second.url);
  assert.equal(first.method, 'GET');
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
    return tonberryResponse({
      items: {
        '1': {
          entries: [{ pricePerUnit: 100, quantity: 2, timestamp: 1_000 }],
        },
      },
    });
  };

  const telemetry = createMarketSyncTelemetry(1_000);
  const snapshot = await buildMarketSnapshotFromCurrent('Tonberry', current, fetcher, undefined, telemetry);

  assert.equal(calls.length, 2, 'history should fetch recent and previous windows only');
  assert.ok(calls.every((url) => new URL(url).pathname.startsWith('/api/v2/history/2078/')));
  assert.equal(snapshot.historyReady, true);
  assert.equal(snapshot.partial, false);
  assert.deepEqual(snapshot.items, current.data);
  assert.equal(telemetry.history.recent.chunks, 1);
  assert.equal(telemetry.history.recent.requests, 1);
  assert.equal(telemetry.history.previous.chunks, 1);
  assert.equal(telemetry.history.previous.requests, 1);

  const summary = summarizeMarketSyncTelemetry(telemetry, 4_000);
  assert.equal(summary.durationMs, 3_000);
  assert.equal(summary.totals.chunks, 2);
  assert.equal(summary.totals.requests, 2);
});

test('history responses from a wrong same-named world fail validation', async () => {
  const requestedUrls: string[] = [];
  await assert.rejects(
    fetchPriceChanges('Tonberry', [33939], async (url) => {
      requestedUrls.push(url);
      return response({ worldID: 45, items: {} });
    }),
    /가격 이력 데이터를 불러오지 못했습니다/,
  );
  assert.equal(requestedUrls.length, 1, 'a wrong-world response fails before retrying');
  assert.ok(new URL(requestedUrls[0]).pathname.startsWith('/api/v2/history/2078/'));
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

test('history phase keeps only failed item values and clears successful empty history results', async () => {
  const ids = Array.from({ length: 51 }, (_, index) => index + 1);
  const calls = new Map<string, number>();
  const fetched = await fetchPriceChanges('Tonberry', ids, async (url) => {
    const parsed = new URL(url);
    const requestedIds = parsed.pathname.split('/').pop()?.split(',').map(Number) ?? [];
    const id = requestedIds.includes(51) ? 51 : requestedIds[0];
    const window = parsed.searchParams.get('entriesUntil');
    calls.set(`${window}:${id}`, (calls.get(`${window}:${id}`) ?? 0) + 1);
    if (requestedIds.includes(51)) throw new Error('simulated history chunk failure');
    return tonberryResponse({ items: {} });
  });
  const now = 10_000_000;
  const prior = {
    schemaVersion: 3 as const,
    phase: 'history' as const,
    server: 'Tonberry',
    sourceWorldId: 2078,
    generatedAt: now - 60_000,
    lastSuccessAt: now - 60_000,
    partial: false,
    historyReady: true,
    priceChanges: {
      '1': {
        changePercent: -2,
        volumeChangePercent: 5,
        recentAveragePrice: 98,
        previousAveragePrice: 100,
        recentUnitsSold: 5,
        previousUnitsSold: 4,
        recentSalesCount: 3,
        previousSalesCount: 2,
      },
      '51': {
        changePercent: 3,
        volumeChangePercent: 2,
        recentAveragePrice: 103,
        previousAveragePrice: 100,
        recentUnitsSold: 6,
        previousUnitsSold: 5,
        recentSalesCount: 4,
        previousSalesCount: 3,
      },
    },
    itemUpdatedAt: { '1': now - 60_000, '51': now - 60_000 },
    failedItemIds: [],
  };

  const merged = mergeHistoryPhaseSnapshot('Tonberry', ids, fetched, prior, now);
  assert.deepEqual(Object.keys(merged.priceChanges), ['51']);
  assert.deepEqual(merged.failedItemIds, [51]);
  assert.equal(merged.historyReady, true);
  assert.equal(merged.itemUpdatedAt['51'], now - 60_000);
  assert.equal(calls.size, 4, 'both independent history windows were requested for both chunks');
});

test('pre-world-scoped snapshots are rejected and never become retained fallback data', async () => {
  const generatedAt = 1_700_000_000_000;
  const legacy = {
    schemaVersion: 1,
    server: 'Tonberry',
    generatedAt,
    historyReady: true,
    partial: false,
    items: { '33939': item(33939) },
    priceChanges: {
      '33939': {
        changePercent: -1,
        volumeChangePercent: null,
        recentAveragePrice: 99,
        previousAveragePrice: 100,
        recentUnitsSold: 1,
        previousUnitsSold: 1,
        recentSalesCount: 1,
        previousSalesCount: 1,
      },
    },
  };
  const wrongCurrent = {
    schemaVersion: 2,
    phase: 'current',
    server: 'Tonberry',
    generatedAt,
    items: { '51': item(51) },
  };
  const wrongHistory = {
    schemaVersion: 2,
    phase: 'history',
    server: 'Tonberry',
    generatedAt,
    priceChanges: { '51': legacy.priceChanges['33939'] },
  };
  const bucket: SnapshotBucket = {
    get: async (key) => {
      if (key === 'market-snapshots/Tonberry.json') return { text: async () => JSON.stringify(legacy) };
      if (key === currentPhaseKey('Tonberry')) return { text: async () => JSON.stringify(wrongCurrent) };
      if (key === historyPhaseKey('Tonberry')) return { text: async () => JSON.stringify(wrongHistory) };
      return null;
    },
    put: async () => undefined,
  };

  const [current, history] = await Promise.all([
    readCurrentPhaseSnapshot(bucket, 'Tonberry'),
    readHistoryPhaseSnapshot(bucket, 'Tonberry'),
  ]);
  assert.equal(current, null, 'unverified old current data must cold-refetch');
  assert.equal(history, null, 'unverified old history data must cold-refetch');

  const ids = Array.from({ length: 51 }, (_, index) => index + 1);
  const partialKoreanFetch = await fetchCurrentStats('Tonberry', ids, async (url) => {
    const requestedIds = new URL(url).pathname.split('/').pop()?.split(',').map(Number) ?? [];
    return response({
      worldID: requestedIds.includes(51) ? 46 : 2078,
      items: Object.fromEntries(requestedIds.map((id) => [String(id), item(id)])),
    });
  });
  const merged = mergeCurrentPhaseSnapshot('Tonberry', ids, partialKoreanFetch, current, generatedAt + 1);
  assert.equal(Object.hasOwn(merged.items, '51'), false, 'wrong-world prices cannot survive as partial fallbacks');
  assert.deepEqual(merged.failedItemIds, [51]);
  assert.equal(merged.sourceWorldId, 2078);
});

test('current refresh writes only the current phase snapshot', async () => {
  const currentItem = item(33939);
  const objects = new Map<string, { text: string; etag: string }>();
  let etagCounter = 0;
  const bucket: SnapshotBucket = {
    get: async (key) => {
      const value = objects.get(key);
      return value ? { text: async () => value.text, etag: value.etag } : null;
    },
    put: async (key, value, options) => {
      const previous = objects.get(key);
      const condition = options?.onlyIf;
      if (condition instanceof Headers) {
        if (condition.get('If-None-Match') === '*' && previous) return null;
      } else if (condition?.etagMatches && previous?.etag !== condition.etagMatches) {
        return null;
      }
      const entry = { text: value, etag: `phase-${++etagCounter}` };
      objects.set(key, entry);
      return { text: async () => entry.text, etag: entry.etag };
    },
  };

  const result = await refreshCurrentPhase(bucket, 'Tonberry', [33939], {
    scheduled: true,
    now: () => 1_700_000_000_000,
    fetcher: async () => tonberryResponse({ items: { '33939': currentItem } }),
  });

  assert.equal(result.state, 'updated');
  assert.equal(result.snapshot?.sourceWorldId, 2078);
  assert.deepEqual(result.snapshot?.items, { '33939': currentItem });
  assert.ok(objects.has(currentPhaseKey('Tonberry')));
  assert.equal(objects.has(historyPhaseKey('Tonberry')), false);
});

test('phase lock uses conditional R2 writes to deduplicate overlapping refreshes', async () => {
  const stored = new Map<string, { text: string; etag: string }>();
  let etagCounter = 0;
  const bucket: SnapshotBucket = {
    get: async (key) => {
      const value = stored.get(key);
      return value ? { text: async () => value.text, etag: value.etag } : null;
    },
    put: async (key, value, options) => {
      const current = stored.get(key);
      const condition = options?.onlyIf;
      if (condition instanceof Headers) {
        if (condition.get('If-None-Match') === '*' && current) return null;
      } else if (condition?.etagMatches && current?.etag !== condition.etagMatches) {
        return null;
      }
      const etag = `etag-${++etagCounter}`;
      const object = { text: value, etag };
      stored.set(key, object);
      return { text: async () => object.text, etag };
    },
  };

  let markStarted!: () => void;
  let finishCallback!: () => void;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  const blocked = new Promise<void>((resolve) => { finishCallback = resolve; });
  let calls = 0;
  const first = withMarketPhaseLock(bucket, 'current', 'Tonberry', async () => {
    calls += 1;
    markStarted();
    await blocked;
    return 'updated';
  }, { now: 1_000_000 });
  await started;

  const second = await withMarketPhaseLock(bucket, 'current', 'Tonberry', async () => {
    calls += 1;
    return 'duplicate';
  }, { now: 1_000_001 });
  finishCallback();
  const firstResult = await first;

  assert.equal(calls, 1);
  assert.deepEqual(second, { acquired: false, reason: 'busy' });
  assert.deepEqual(firstResult, { acquired: true, value: 'updated' });
});

test('market health reports scheduled writes for each server and marks stale phases unhealthy', async () => {
  const now = Date.now();
  const objects = new Map<string, string>();
  for (const server of SUPPORTED_SERVERS) {
    for (const phase of ['current', 'history'] as const) {
      objects.set(phaseHealthKey(phase, server), JSON.stringify({
        schemaVersion: 2,
        phase,
        server,
        sourceWorldId: getUniversalisWorldId(server),
        cron: phase === 'current' ? '* * * * *' : '*/3 * * * *',
        scheduledAt: now - 30_000,
        startedAt: now - 29_000,
        completedAt: now - 1_000,
        durationMs: 28_000,
        status: 'success',
        serverCount: 1,
        successfulServerCount: 1,
        skippedServerCount: 0,
        failedServerCount: 0,
        partialServerCount: 0,
        itemCount: 200,
        retainedItemCount: 0,
        failedItemCount: 0,
        lastSuccessAt: now - 1_000,
      }));
    }
  }
  const bucket: SnapshotBucket = {
    get: async (key) => {
      const value = objects.get(key);
      return value ? { text: async () => value } : null;
    },
    put: async () => undefined,
  };

  const healthyResponse = await getMarketHealth({ env: { MARKET_SNAPSHOTS: bucket } });
  const healthy = await healthyResponse.json() as {
    healthy: boolean;
    current: { servers: unknown[] };
    history: { servers: unknown[] };
  };
  assert.equal(healthy.healthy, true);
  assert.equal(healthy.current.servers.length, SUPPORTED_SERVERS.length);
  assert.equal(healthy.history.servers.length, SUPPORTED_SERVERS.length);

  const staleHealth = JSON.parse(objects.get(phaseHealthKey('history', SUPPORTED_SERVERS[0])) ?? '{}') as { scheduledAt: number };
  staleHealth.scheduledAt = now - 60 * 60_000;
  objects.set(phaseHealthKey('history', SUPPORTED_SERVERS[0]), JSON.stringify(staleHealth));
  const staleResponse = await getMarketHealth({ env: { MARKET_SNAPSHOTS: bucket } });
  const stale = await staleResponse.json() as { healthy: boolean; history: { healthy: boolean } };
  assert.equal(stale.history.healthy, false);
  assert.equal(stale.healthy, false);
});
