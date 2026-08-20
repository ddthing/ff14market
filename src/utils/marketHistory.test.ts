/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPriceChanges, computePeriodPriceChange } from './marketHistory.ts';

test('computePeriodPriceChange uses a quantity-weighted average', () => {
  const change = computePeriodPriceChange(
    [
      { pricePerUnit: 80, quantity: 2, timestamp: 3 },
      { pricePerUnit: 120, quantity: 2, timestamp: 2 },
    ],
    [
      { pricePerUnit: 100, quantity: 1, timestamp: 1 },
      { pricePerUnit: 200, quantity: 3, timestamp: 0 },
    ],
  );

  assert.ok(change);
  assert.equal(change.recentAveragePrice, 100);
  assert.equal(change.previousAveragePrice, 175);
  assert.equal(change.changePercent, ((100 - 175) / 175) * 100);
  assert.equal(change.recentUnitsSold, 4);
  assert.equal(change.previousUnitsSold, 4);
  assert.equal(change.volumeChangePercent, 0);
});

test('computePeriodPriceChange ignores invalid prices and missing periods', () => {
  assert.equal(
    computePeriodPriceChange(
      [{ pricePerUnit: 0.5, quantity: 10, timestamp: 1 }],
      [{ pricePerUnit: 100, quantity: 1, timestamp: 0 }],
    ),
    null,
  );
  assert.equal(
    computePeriodPriceChange(
      [{ pricePerUnit: 100, quantity: 1, timestamp: 1 }],
      [],
    ),
    null,
  );
});

test('computePeriodPriceChange calculates sale quantity growth separately from price growth', () => {
  const change = computePeriodPriceChange(
    [{ pricePerUnit: 100, quantity: 6, timestamp: 2 }],
    [{ pricePerUnit: 100, quantity: 4, timestamp: 1 }],
  );

  assert.ok(change);
  assert.equal(change.changePercent, 0);
  assert.equal(change.volumeChangePercent, 50);
});

test('buildPriceChanges keeps only items with both periods', () => {
  const changes = buildPriceChanges(
    { '1': [{ pricePerUnit: 90, quantity: 1, timestamp: 2 }], '2': [] },
    { '1': [{ pricePerUnit: 100, quantity: 1, timestamp: 1 }], '2': [{ pricePerUnit: 100, quantity: 1, timestamp: 1 }] },
  );

  assert.deepEqual(Object.keys(changes), ['1']);
  assert.equal(changes['1'].changePercent, -10);
  assert.equal(changes['1'].volumeChangePercent, 0);
});
