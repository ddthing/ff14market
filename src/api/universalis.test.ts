import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchMarketSnapshot } from './universalis.ts';

test('snapshot boundary accepts only the selected Korean world', async (t) => {
  let payload: object = { server: 'Chocobo', sourceWorldId: 2076, items: [] };
  const requests: RequestInit[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    requests.push(init);
    return Response.json(payload);
  });
  assert.equal((await fetchMarketSnapshot('Chocobo')).sourceWorldId, 2076);
  assert.equal(requests[0].cache, 'no-cache');
  for (const invalid of [
    { server: 'Chocobo', sourceWorldId: 70 },
    { server: 'Chocobo' },
    { server: 'Moogle', sourceWorldId: 2076 },
  ]) {
    payload = invalid;
    await assert.rejects(fetchMarketSnapshot('Chocobo'), /한국 서버/);
  }
  const requestCount = requests.length;
  await assert.rejects(fetchMarketSnapshot('unknown'), /지원하지 않는 서버/);
  assert.equal(requests.length, requestCount);
});
