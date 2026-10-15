import type { ItemCatalogEntry } from '../api/itemCatalog';
import {
  getSeoOriginFromHtml,
  injectSeoHead,
  itemDetailSeoMetadata,
  renderSeoHeadMarkup,
  resolveSeoMetadata,
} from '../components/seo/seoHead.ts';
import {
  renderItemDetailTemplate,
  ITEM_DETAIL_DATA_SCRIPT_ID,
  parseItemDetailBootstrap,
} from './itemBootstrap.ts';

export type ItemPageEnvironment = {
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  VITE_SITE_URL?: string;
};

export type ItemPageContext = {
  request: Request;
  params: { itemId?: string };
  env: ItemPageEnvironment;
};

export type ItemMetadataLookup = (itemId: number) => ItemCatalogEntry | null;
export type CuratedItemPredicate = (itemId: number) => boolean;

const routeUnavailable = () => new Response('아이템 페이지를 불러오지 못했습니다.', {
  status: 503,
  headers: {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  },
});

const unknownItemResponse = (siteUrl: string | undefined, fallbackOrigin: string) => {
  const metadata = resolveSeoMetadata({
    title: '아이템을 찾을 수 없습니다 | FF14 장터탐지기',
    description: '요청한 아이템을 FF14 장터탐지기 카탈로그에서 찾을 수 없습니다.',
    path: '/item',
    noIndex: true,
  }, siteUrl, fallbackOrigin);
  const html = `<!doctype html><html lang="ko"><head><meta charset="UTF-8" />${renderSeoHeadMarkup(metadata)}</head><body><main><h1>아이템을 찾을 수 없습니다</h1><p>요청한 아이템을 카탈로그에서 찾을 수 없습니다.</p><a href="/">홈으로 돌아가기</a></main></body></html>`;

  return new Response(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, follow',
    },
  });
};

const assetPathUrl = (pathname: string, requestUrl: string) => new URL(pathname, requestUrl);

const fetchAsset = (context: ItemPageContext, pathname: string) => {
  if (!context.env.ASSETS) return Promise.resolve(null);
  return context.env.ASSETS.fetch(new Request(assetPathUrl(pathname, context.request.url)));
};

const htmlResponse = (body: BodyInit | null, sourceHeaders?: HeadersInit, status = 200) => {
  const headers = new Headers(sourceHeaders);
  for (const key of ['Content-Length', 'Content-Encoding', 'ETag']) headers.delete(key);
  headers.delete('X-Robots-Tag');
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-cache');
  return new Response(body, { status, headers });
};

export async function handleItemPageRequest(
  context: ItemPageContext,
  findItem: ItemMetadataLookup,
  isCuratedItem: CuratedItemPredicate,
): Promise<Response> {
  const rawId = context.params.itemId ?? '';
  if (!/^[1-9]\d*$/.test(rawId)) {
    return unknownItemResponse(context.env.VITE_SITE_URL, new URL(context.request.url).origin);
  }

  const itemId = Number(rawId);
  if (!Number.isSafeInteger(itemId)) {
    return unknownItemResponse(context.env.VITE_SITE_URL, new URL(context.request.url).origin);
  }

  const item = findItem(itemId);
  if (!item) return unknownItemResponse(context.env.VITE_SITE_URL, new URL(context.request.url).origin);
  if (!context.env.ASSETS) return routeUnavailable();

  let renderedAsset: Response | null;
  try {
    if (isCuratedItem(itemId)) {
      const curatedPage = await fetchAsset(context, `/rendered-item-${itemId}`);
      if (!curatedPage?.ok) return routeUnavailable();

      const html = await curatedPage.text();
      const initialItemScript = html.match(
        new RegExp(`<script\\b[^>]*\\bid=["']${ITEM_DETAIL_DATA_SCRIPT_ID}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i'),
      );
      if (!html.includes(`data-prerendered="item:${itemId}"`)
        || !initialItemScript
        || !parseItemDetailBootstrap(initialItemScript[1], itemId)) {
        return routeUnavailable();
      }

      return htmlResponse(html, curatedPage.headers);
    }

    renderedAsset = await fetchAsset(context, '/rendered-item-template.template');
  } catch {
    return routeUnavailable();
  }

  if (!renderedAsset?.ok) return routeUnavailable();

  try {
    const template = await renderedAsset.text();
    const hydratedItemTemplate = renderItemDetailTemplate(template, item);
    const resolvedSeo = resolveSeoMetadata(
      itemDetailSeoMetadata(item),
      context.env.VITE_SITE_URL,
      getSeoOriginFromHtml(template),
    );
    const html = injectSeoHead(hydratedItemTemplate, resolvedSeo);
    return htmlResponse(html, renderedAsset.headers);
  } catch {
    return routeUnavailable();
  }
}
