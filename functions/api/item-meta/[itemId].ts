import { findItemMetadata } from '../../_lib/item-search';

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': status === 200
      ? 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
      : 'no-store',
  },
});

export const onRequestGet = (context: { params: { itemId?: string } }) => {
  const itemId = Number(context.params.itemId);
  if (!Number.isSafeInteger(itemId) || itemId <= 0) {
    return jsonResponse({ error: { code: 'BAD_REQUEST', message: '잘못된 아이템 ID입니다.' } }, 400);
  }

  const item = findItemMetadata(itemId);
  return item
    ? jsonResponse(item)
    : jsonResponse({ error: { code: 'NOT_FOUND', message: '아이템을 찾을 수 없습니다.' } }, 404);
};
