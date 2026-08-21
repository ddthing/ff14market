import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequestGet } from '../functions/api/item/[itemId].ts';
import {
  ITEM_DETAIL_STALE_MAX_AGE_MS,
  itemDetailStaleKey,
  readStoredItemDetail,
  writeStoredItemDetail,
} from '../functions/_lib/item-detail-stale-cache.ts';
import type { ResponseCache } from '../functions/_lib/item-detail-cache.ts';
import type { SnapshotBucket } from '../functions/_lib/market-data.ts';
import type { KoreaDCResponse } from '../src/types/market.ts';

const detail = (itemID: number): KoreaDCResponse => ({
  itemID,
  listings: [{ worldName: 'Tonberry', pricePerUnit: 100 }],
  recentHistory: [{ pricePerUnit: 110, timestamp: 1_000 }],
  currentAveragePrice: 120,
  minPrice: 100,
  minPriceNQ: 100,
  minPriceHQ: 0,
  regularSaleVelocity: 2,
  lastUploadTime: 900,
});

const createBucket = () => {
  const objects = new Map<string, string>();
  const bucket: SnapshotBucket = {
    get: async (key) => {
      const value = objects.get(key);
      return value === undefined ? null : { text: async () => value };
    },
    put: async (key, value) => {
      objects.set(key, value);
    },
  };

  return { bucket, objects };
};

const createCache = () => {
  const responses = new Map<string, Response>();
  const cache: ResponseCache = {
    match: async (request) => responses.get(request.url)?.clone(),
    put: async (request, response) => {
      responses.set(request.url, response.clone());
    },
  };

  return { cache, responses };
};

const requestContext = (
  itemId: number,
  bucket: SnapshotBucket,
  cache?: ResponseCache,
  waiters: Promise<unknown>[] = [],
) => ({
  params: { itemId: String(itemId) },
  request: new Request(`https://ff14market.pages.dev/api/item/${itemId}`),
  env: { MARKET_SNAPSHOTS: bucket },
  cache,
  waitUntil: (promise: Promise<unknown>) => waiters.push(promise),
});

test('item detail stale entries are versioned, validated, and age-bounded', async () => {
  const { bucket } = createBucket();
  const now = 2_000_000;
  await writeStoredItemDetail(bucket, 33939, detail(33939), now - 1_000);

  const stored = await readStoredItemDetail(bucket, 33939, now);
  assert.equal(stored?.data.itemID, 33939);
  assert.equal(stored?.ageMs, 1_000);

  const expired = await readStoredItemDetail(
    bucket,
    33939,
    now + ITEM_DETAIL_STALE_MAX_AGE_MS + 1,
  );
  assert.equal(expired, null);

  const wrongItem = await readStoredItemDetail(bucket, 123, now);
  assert.equal(wrongItem, null);
});

test('successful item detail requests populate both edge and R2 tiers', async () => {
  const { bucket, objects } = createBucket();
  const { cache, responses } = createCache();
  const waiters: Promise<unknown>[] = [];
  let upstreamCalls = 0;

  const first = await onRequestGet(
    requestContext(33939, bucket, cache, waiters),
    async () => {
      upstreamCalls += 1;
      return new Response(JSON.stringify(detail(33939)), {
        headers: { 'Content-Type': 'application/json' },
      });
    },
  );
  await Promise.all(waiters);

  assert.equal(first.status, 200);
  assert.equal(first.headers.get('X-Market-Cache'), 'MISS');
  assert.equal(upstreamCalls, 1);
  assert.ok(objects.has(itemDetailStaleKey(33939)));
  assert.equal(responses.size, 1);

  const second = await onRequestGet(
    requestContext(33939, bucket, cache),
    async () => {
      throw new Error('the edge cache should satisfy the second request');
    },
  );

  assert.equal(second.status, 200);
  assert.equal(second.headers.get('X-Market-Cache'), 'HIT');
});

test('upstream failure returns a bounded, explicitly marked stale detail', async () => {
  const { bucket } = createBucket();
  await writeStoredItemDetail(bucket, 33939, detail(33939), Date.now() - 2_000);

  const response = await onRequestGet(
    requestContext(33939, bucket),
    async () => new Response('{}', { status: 400 }),
  );
  const payload = await response.json() as KoreaDCResponse;

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Market-Cache'), 'STALE');
  assert.equal(response.headers.get('X-Market-Source'), 'r2-stale');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(payload.itemID, 33939);
  assert.equal(payload.marketMeta?.source, 'r2-stale');
  assert.ok((payload.marketMeta?.staleAgeMs ?? 0) >= 2_000);
});

test('expired stale detail does not mask an upstream failure', async () => {
  const { bucket } = createBucket();
  await writeStoredItemDetail(
    bucket,
    33939,
    detail(33939),
    Date.now() - ITEM_DETAIL_STALE_MAX_AGE_MS - 1,
  );

  const response = await onRequestGet(
    requestContext(33939, bucket),
    async () => new Response('{}', { status: 400 }),
  );

  assert.equal(response.status, 503);
  assert.equal(response.headers.get('X-Market-Cache'), null);
});
