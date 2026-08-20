import test from 'node:test';
import assert from 'node:assert/strict';
import { createItemSearcher } from './itemSearch.ts';

const search = createItemSearcher([
  [1, '환혹약 8등급', 100],
  [2, '환혹약 7등급', 101],
  [3, '비전서: 요리', 102],
]);

test('item search keeps fuzzy matching and caps result count', () => {
  assert.deepEqual(search('환혹약').map((item) => item.id), [1, 2]);
  assert.equal(search('환혹약', 1).length, 1);
});

test('item search ignores surrounding whitespace and empty queries', () => {
  assert.deepEqual(search('  비전서  ').map((item) => item.id), [3]);
  assert.deepEqual(search('   '), []);
});
