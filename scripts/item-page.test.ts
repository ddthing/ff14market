import assert from 'node:assert/strict';
import test from 'node:test';
import { handleItemPageRequest } from '../src/routes/itemPageResponse.ts';
import {
  ITEM_DETAIL_DATA_SCRIPT_ID,
  ITEM_TEMPLATE_TOKENS,
  injectItemDetailTemplateData,
  parseItemDetailBootstrap,
  renderItemDetailTemplate,
  serializeItemDetailBootstrap,
} from '../src/routes/itemBootstrap.ts';
import type { ItemCatalogEntry } from '../src/api/itemCatalog.ts';
import { withCachedItemDocument } from '../functions/_lib/item-document-cache.ts';

test('public item documents reuse edge entries without browser caching or sharing hosts', async () => {
  const entries = new Map<string, Response>();
  const cache = {
    match: async (key: Request) => entries.get(key.url)?.clone(),
    put: async (key: Request, value: Response) => { entries.set(key.url, value.clone()); },
  };
  const context = {
    request: new Request('https://market.example/item/5064?from=search'),
    params: { itemId: '5064' }, env: {},
  };
  let renders = 0;
  const render = async () => {
    renders += 1;
    return new Response('<h1>공개 아이템 정보</h1>', { headers: { 'Cache-Control': 'no-cache' } });
  };
  const first = await withCachedItemDocument(context, render, cache);
  assert.equal(first.headers.get('X-Item-Document-Cache'), 'MISS');
  assert.equal(first.headers.get('Cache-Control'), 'no-cache');
  assert.equal([...entries.values()][0].headers.get('Cache-Control'), 'public, max-age=60');
  const next = await withCachedItemDocument({ ...context, request: new Request('https://market.example/item/5064/') }, render, cache);
  assert.equal(next.headers.get('X-Item-Document-Cache'), 'HIT');
  assert.equal(next.headers.get('Cache-Control'), 'no-cache');
  assert.equal(await next.text(), '<h1>공개 아이템 정보</h1>');
  assert.equal(renders, 1);
  await withCachedItemDocument({ ...context, request: new Request('https://preview.example/item/5064') }, render, cache);
  assert.equal(renders, 2);
  await withCachedItemDocument({ ...context, params: { itemId: '999' } }, async () => new Response('unavailable', { status: 503 }), cache);
  assert.equal(entries.size, 2, 'Failures must not become cached item documents');
  const brokenCache = { ...cache, match: async (): Promise<Response | undefined> => { throw new Error('cache unavailable'); }, put: async () => { throw new Error('cache unavailable'); } };
  assert.equal((await withCachedItemDocument(context, render, brokenCache)).status, 200);
});

const templateDocument = (id: number) => injectItemDetailTemplateData(`<!doctype html>
<html lang="ko"><head>
  <title>${ITEM_TEMPLATE_TOKENS.name} 시세 | FF14 장터탐지기</title>
  <meta name="description" content="${ITEM_TEMPLATE_TOKENS.name} 설명" />
  <link rel="canonical" href="https://ff14market.pages.dev/item/${id}" />
</head><body>
  <div id="root" data-prerendered="item:${ITEM_TEMPLATE_TOKENS.id}">
    <h1>${ITEM_TEMPLATE_TOKENS.name}</h1>
    <img src="${ITEM_TEMPLATE_TOKENS.iconUrl}" alt="" />
    <div aria-label="시세 데이터 확인 중"></div>
  </div>
</body></html>`);

const responseCacheHeaders = () => new Headers({
  'Content-Type': 'text/plain; charset=utf-8',
  'Content-Length': '9876',
  'Content-Encoding': 'gzip',
  ETag: 'old-template-etag',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
});

test('item bootstrap JSON is validated against the route and safe inside script elements', () => {
  const item = { id: 5064, name: '</script><script>alert("x")</script>', icon: '/i/006000/006064.png' };
  const json = serializeItemDetailBootstrap(item);

  assert.ok(json.includes(String.raw`\u003c/script\u003e`));
  assert.deepEqual(parseItemDetailBootstrap(json, item.id), item);
  assert.equal(parseItemDetailBootstrap(json, 27786), null);
  assert.equal(parseItemDetailBootstrap('{invalid', item.id), null);
  assert.equal(parseItemDetailBootstrap(JSON.stringify({ ...item, icon: 'javascript:alert(1)' }), item.id), null);
});

test('non-curated catalog IDs are substituted into the generic shell and route head', async () => {
  const item: ItemCatalogEntry = { id: 27786, name: '힘의 환혹약', icon: '/i/027000/027786.png' };
  const requestedAssets: string[] = [];
  const context = {
    request: new Request('https://preview.example/item/27786?from=search'),
    params: { itemId: '27786' },
    env: {
      VITE_SITE_URL: 'https://ff14market.example/',
      ASSETS: {
        fetch: async (request: Request) => {
          requestedAssets.push(new URL(request.url).pathname);
          return new Response(templateDocument(27786), { headers: responseCacheHeaders() });
        },
      },
    },
  };

  const response = await handleItemPageRequest(context, (id) => id === item.id ? item : null, () => false);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.deepEqual(requestedAssets, ['/rendered-item-template.template']);
  assert.match(html, /data-prerendered="item:27786"/);
  assert.match(html, /<h1>힘의 환혹약<\/h1>/);
  assert.match(html, /<title>힘의 환혹약 시세 \| FF14 장터탐지기<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/ff14market\.example\/item\/27786" \/>/);
  assert.match(html, /https:\/\/v2\.xivapi\.com\/api\/asset\?path=ui\/icon\/027000\/027786_hr1\.tex&amp;format=webp/);
  assert.doesNotMatch(html, /__FF14_ITEM_/);
  assert.equal((html.match(new RegExp(`<script id="${ITEM_DETAIL_DATA_SCRIPT_ID}"`, 'g')) ?? []).length, 1);
  const itemScript = html.match(new RegExp(`<script id="${ITEM_DETAIL_DATA_SCRIPT_ID}"[^>]*>([\\s\\S]*?)<\\/script>`))?.[1];
  assert.deepEqual(parseItemDetailBootstrap(itemScript ?? '', item.id), item);
  assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(response.headers.get('cache-control'), 'no-cache');
  assert.equal(response.headers.get('x-robots-tag'), null);
  assert.equal(response.headers.get('content-length'), null);
  assert.equal(response.headers.get('content-encoding'), null);
  assert.equal(response.headers.get('etag'), null);
});

test('catalog item markup escapes names and does not leak item-data sentinels', () => {
  const item = { id: 5064, name: '<img src=x onerror="alert(1)"> & silver', icon: '/i/006000/006064.png' };
  const html = renderItemDetailTemplate(templateDocument(27786), item);

  assert.match(html, /<h1>&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; silver<\/h1>/);
  assert.match(html, /data-prerendered="item:5064"/);
  assert.doesNotMatch(html, /<h1><img src=x/);
  assert.doesNotMatch(html, /__FF14_ITEM_/);
  const itemScript = html.match(new RegExp(`<script id="${ITEM_DETAIL_DATA_SCRIPT_ID}"[^>]*>([\\s\\S]*?)<\\/script>`))?.[1];
  assert.deepEqual(parseItemDetailBootstrap(itemScript ?? '', item.id), item);
});

test('curated item IDs use their prebuilt document and reject an unexpected SPA fallback', async () => {
  const item: ItemCatalogEntry = { id: 49238, name: '4등급 정신력의 보석약', icon: '/i/020000/020708.png' };
  const requestedAssets: string[] = [];
  const context = {
    request: new Request('https://preview.example/item/49238/'),
    params: { itemId: '49238' },
    env: {
      ASSETS: {
        fetch: async (request: Request) => {
          requestedAssets.push(new URL(request.url).pathname);
          return new Response(`<html><head><title>${item.name} 시세</title></head><body><div id="root" data-prerendered="item:${item.id}"></div><script id="${ITEM_DETAIL_DATA_SCRIPT_ID}" type="application/json">${serializeItemDetailBootstrap(item)}</script></body></html>`, {
            headers: responseCacheHeaders(),
          });
        },
      },
    },
  };
  const response = await handleItemPageRequest(context, () => item, () => true);

  assert.equal(response.status, 200);
  assert.deepEqual(requestedAssets, ['/rendered-item-49238']);
  assert.equal(response.headers.get('cache-control'), 'no-cache');
  assert.equal(response.headers.get('content-length'), null);

  const badContext = {
    ...context,
    env: {
      ASSETS: {
        fetch: async () => new Response('<html><body><div id="root" data-prerendered="home"></div></body></html>'),
      },
    },
  };
  assert.equal((await handleItemPageRequest(badContext, () => item, () => true)).status, 503);
});

test('invalid IDs and missing catalog entries return noindex 404 without loading assets', async () => {
  let assetRequests = 0;
  const context = {
    request: new Request('https://preview.example/item/0'),
    params: { itemId: '0' },
    env: { ASSETS: { fetch: async () => { assetRequests += 1; return new Response('unused'); } } },
  };
  const invalid = await handleItemPageRequest(context, () => null, () => false);
  assert.equal(invalid.status, 404);
  assert.equal(invalid.headers.get('x-robots-tag'), 'noindex, follow');

  const missing = await handleItemPageRequest({ ...context, params: { itemId: '999999999' } }, () => null, () => false);
  assert.equal(missing.status, 404);
  assert.equal(assetRequests, 0);
});
