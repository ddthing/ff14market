import assert from 'node:assert/strict';
import test from 'node:test';
import { getMarketPollInterval, MARKET_POLL_INTERVAL_MS } from './marketPolling.ts';

test('market polling waits until the query is idle before scheduling the next request', () => {
  assert.equal(getMarketPollInterval('idle'), MARKET_POLL_INTERVAL_MS);
  assert.equal(getMarketPollInterval('fetching'), false);
  assert.equal(getMarketPollInterval('paused'), false);
});
