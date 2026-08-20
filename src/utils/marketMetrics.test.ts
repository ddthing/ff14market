/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeMarketPriceGapPercent,
  computeTrueMinPrice,
  formatMarketPriceGap,
  formatSaleVelocity,
  isRecentMarketData,
  normalizeSaleVelocity,
} from './marketMetrics.ts';

test('computeTrueMinPrice ignores unavailable NQ/HQ values', () => {
  assert.equal(computeTrueMinPrice(0, 8000, 1000), 1000);
  assert.equal(computeTrueMinPrice(0, 0, 0), 0);
});

test('computeMarketPriceGapPercent compares current listings with recent sales', () => {
  assert.equal(computeMarketPriceGapPercent(80, 100), -20);
  assert.equal(computeMarketPriceGapPercent(120, 100), 20);
  assert.equal(computeMarketPriceGapPercent(0, 100), null);
  assert.equal(computeMarketPriceGapPercent(100, 0), null);
  assert.equal(computeMarketPriceGapPercent(100, 0.5), null);
});

test('normalizeSaleVelocity preserves fractional daily sales', () => {
  assert.equal(normalizeSaleVelocity(0.14285715), 0.14285715);
  assert.equal(normalizeSaleVelocity(0), 0);
  assert.equal(normalizeSaleVelocity(Number.NaN), 0);
});

test('formatSaleVelocity keeps low-volume items visible', () => {
  assert.equal(formatSaleVelocity(0.14285715), '0.1');
  assert.equal(formatSaleVelocity(12.8), '13');
});

test('formatMarketPriceGap keeps extreme data readable', () => {
  assert.equal(formatMarketPriceGap(-20), '-20.0%');
  assert.equal(formatMarketPriceGap(20), '+20.0%');
  assert.equal(formatMarketPriceGap(1200), '+999%+');
  assert.equal(formatMarketPriceGap(null), '비교 불가');
});

test('isRecentMarketData rejects uploads older than the live signal window', () => {
  const now = 1_800_000_000_000;
  assert.equal(isRecentMarketData(now - 6 * 24 * 60 * 60 * 1000, now), true);
  assert.equal(isRecentMarketData(now - 8 * 24 * 60 * 60 * 1000, now), false);
  assert.equal(isRecentMarketData(undefined, now), true);
});
