import { getDefaultResponseCache, type ResponseCache } from './item-detail-cache.ts';
import type { ItemPageContext } from '../../src/routes/itemPageResponse.ts';

export const ITEM_DOCUMENT_EDGE_TTL_SECONDS = 60;

/** Public item identity/layout only: prices and user preferences load separately. */
export const withCachedItemDocument = async (
  context: ItemPageContext & { waitUntil?: (promise: Promise<unknown>) => void },
  render: () => Promise<Response>,
  cache: ResponseCache | undefined = getDefaultResponseCache(),
): Promise<Response> => {
  const rawId = context.params.itemId ?? '';
  if (!cache || !/^[1-9]\d*$/.test(rawId) || !Number.isSafeInteger(Number(rawId))) return render();
  const url = new URL(context.request.url);
  url.pathname = `/__item-documents/v1/${rawId}`;
  url.search = '';
  url.hash = '';
  const key = new Request(url, { method: 'GET' });
  try {
    const cached = await cache.match(key);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set('Cache-Control', 'no-cache');
      headers.set('X-Item-Document-Cache', 'HIT');
      return new Response(cached.body, { status: cached.status, headers });
    }
  } catch {
    // An unavailable edge cache must not prevent the document from rendering.
  }
  const response = await render();
  if (response.status !== 200 || response.headers.has('Set-Cookie')) return response;
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, max-age=${ITEM_DOCUMENT_EDGE_TTL_SECONDS}`);
  const entry = new Response(response.clone().body, { status: 200, headers });
  const write = cache.put(key, entry).catch(() => undefined);
  if (context.waitUntil) context.waitUntil(write);
  else await write;
  response.headers.set('X-Item-Document-Cache', 'MISS');
  return response;
};
