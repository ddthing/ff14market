import { searchItemCatalog } from '../_lib/item-search';

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': status === 200
      ? 'public, max-age=60, s-maxage=900, stale-while-revalidate=3600'
      : 'no-store',
  },
});

export const onRequestGet = (context: { request: Request }) => {
  const query = new URL(context.request.url).searchParams.get('q')?.trim() ?? '';

  if (query.length > 80) {
    return jsonResponse({ error: { code: 'BAD_REQUEST', message: '검색어가 너무 깁니다.' } }, 400);
  }

  return jsonResponse({
    query,
    items: searchItemCatalog(query),
  });
};
