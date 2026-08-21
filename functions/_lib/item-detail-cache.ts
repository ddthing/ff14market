export interface ResponseCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

/**
 * Item detail has no query-dependent response. Normalizing the key prevents
 * analytics or cache-busting query strings from creating duplicate entries.
 */
export const createItemDetailCacheKey = (requestUrl: string | undefined, itemId: number) => {
  const url = new URL(requestUrl ?? `https://ff14market.pages.dev/api/item/${itemId}`);
  url.pathname = `/api/item/${itemId}`;
  url.search = '';
  url.hash = '';
  return new Request(url.toString(), { method: 'GET' });
};

export const getDefaultResponseCache = (): ResponseCache | undefined => {
  const runtime = globalThis as typeof globalThis & {
    caches?: { default?: ResponseCache };
  };
  return runtime.caches?.default;
};
