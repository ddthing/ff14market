import assert from 'node:assert/strict';
import test from 'node:test';
import { exploreMarket, marketCsv } from './marketExplorer.ts';
import { formatFreshness } from './time.ts';
import type { EnrichedItem } from '../hooks/useItemData';

const item = (id: number, overrides: Partial<EnrichedItem> = {}): EnrichedItem => ({
  id,
  name: `아이템 ${id}`,
  category: '재료',
  icon: '',
  price: 100,
  averageListingPrice: 100,
  averageSalePrice: 100,
  fluctuation: 0,
  volume: 1,
  ...overrides,
});
const options = {
  query: '',
  category: '전체',
  sort: 'volume' as const,
  favoritesOnly: false,
  favoriteIds: [],
};

test('filters combine category, whitespace-insensitive Korean search and saved IDs', () => {
  const items = [
    item(1, { name: '정신력의 보석약', category: '소모품' }),
    item(2, { name: '보석약', category: '재료' }),
    item(3, { name: '보석약', category: '소모품' }),
  ];
  assert.deepEqual(
    exploreMarket(items, {
      ...options,
      query: ' 보석 약 ',
      category: '소모품',
      favoritesOnly: true,
      favoriteIds: [1, 2],
    }).map((value) => value.id),
    [1],
  );
});

test('missing prices and comparisons sort last without mutating the snapshot', () => {
  const items = [
    item(1, { price: 0, fluctuation: null }),
    item(2, { price: 300, fluctuation: 5 }),
    item(3, { price: 100, fluctuation: -5 }),
  ];
  assert.deepEqual(
    exploreMarket(items, { ...options, sort: 'price-asc' }).map((value) => value.id),
    [3, 2, 1],
  );
  assert.deepEqual(
    exploreMarket(items, { ...options, sort: 'gap' }).map((value) => value.id),
    [3, 2, 1],
  );
  assert.deepEqual(
    items.map((value) => value.id),
    [1, 2, 3],
  );
});

test('CSV preserves Korean, escapes quotes and prevents formula evaluation', () => {
  const csv = marketCsv(
    [item(1, { name: '=HYPERLINK("example")', fluctuation: null, price: 0 })],
    '초코보',
  );
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=HYPERLINK(""example"")"'));
  assert.ok(csv.includes('"초코보","1"'));
  assert.ok(csv.includes('"재료","","1","",""'));
  assert.ok(marketCsv([item(2, { fluctuation: -5 })], '초코보').includes(',"-5",'));
});

test('freshness never presents unknown timestamps as freshly collected', () => {
  assert.equal(formatFreshness(), '시점 미제공');
  assert.equal(formatFreshness(Number.NaN), '시점 미제공');
  assert.equal(formatFreshness(Date.now() - 120000), '2분 전');
});
