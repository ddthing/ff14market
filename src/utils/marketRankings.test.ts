/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { selectCurrentPriceGapItems, selectHotIssueItems, selectRecentVolumeItems } from './marketRankings.ts';

const items = [
  { id: 'popular', price: 100, volume: 100, fluctuation: -1, volumeChangePercent: 12 },
  { id: 'expensive', price: 10000, volume: 1, fluctuation: -2, volumeChangePercent: 2 },
  { id: 'drop', price: 80, volume: 2, fluctuation: -50, volumeChangePercent: 50 },
  { id: 'no-sales', price: 5000, volume: 0, fluctuation: null, volumeChangePercent: null },
];

test('each hot-issue tab ranks the full dataset independently', () => {
  assert.deepEqual(selectHotIssueItems(items, 'volume', 2).map((item) => item.id), ['drop', 'popular']);
  assert.deepEqual(selectHotIssueItems(items, 'drop', 2).map((item) => item.id), ['drop', 'expensive']);
  assert.deepEqual(selectHotIssueItems(items, 'price', 2).map((item) => item.id), ['expensive', 'no-sales']);
});

test('fast volume preview ranks current sale velocity while history is loading', () => {
  assert.deepEqual(selectRecentVolumeItems(items, 3).map((item) => item.id), ['popular', 'drop', 'expensive']);
});

test('price-drop preview ranks the current listing-versus-sale gap while history is loading', () => {
  assert.deepEqual(selectCurrentPriceGapItems(items, 3).map((item) => item.id), ['drop', 'expensive', 'popular']);
});

test('ranking filters unavailable values without removing other valid metrics', () => {
  assert.deepEqual(selectHotIssueItems(items, 'volume').map((item) => item.id), ['drop', 'popular', 'expensive']);
  assert.deepEqual(selectHotIssueItems(items, 'drop').map((item) => item.id), ['drop', 'expensive', 'popular']);
});

test('ranking excludes stale market uploads', () => {
  const now = 1_800_000_000_000;
  const stale = { id: 'stale', price: 99999, volume: 999, fluctuation: -99, volumeChangePercent: 999, lastUploadTime: now - 8 * 24 * 60 * 60 * 1000 };
  const fresh = { id: 'fresh', price: 100, volume: 1, fluctuation: -1, volumeChangePercent: 1, lastUploadTime: now };

  assert.deepEqual(selectHotIssueItems([stale, fresh], 'volume', 50, now).map((item) => item.id), ['fresh']);
});
