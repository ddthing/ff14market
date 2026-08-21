import assert from 'node:assert/strict';
import test from 'node:test';
import { getAbsoluteMinPrice, getServerMinPrices } from './marketListings.ts';

test('server minimum prices are calculated in one pass and preserve server order', () => {
  const prices = getServerMinPrices([
    { worldName: '초코보', pricePerUnit: 900 },
    { worldName: '톤베리', pricePerUnit: 0 },
    { worldName: '초코보', pricePerUnit: 300 },
    { worldName: '모그리', pricePerUnit: Number.NaN },
    { worldName: '모그리', pricePerUnit: 120 },
    { worldName: '알 수 없는 서버', pricePerUnit: 1 },
  ], ['초코보', '모그리', '톤베리']);

  assert.deepEqual(prices, [
    { serverName: '초코보', minPrice: 300 },
    { serverName: '모그리', minPrice: 120 },
    { serverName: '톤베리', minPrice: 0 },
  ]);
  assert.equal(getAbsoluteMinPrice(prices), 120);
});

test('absolute minimum ignores unavailable server prices', () => {
  assert.equal(getAbsoluteMinPrice([
    { serverName: '초코보', minPrice: 0 },
    { serverName: '모그리', minPrice: -1 },
  ]), 0);
});
