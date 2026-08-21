import {
  createItemDetailTelemetry,
  fetchItemDetail,
  MarketDataError,
} from '../../_lib/market-data';
import type { MarketRequestContext } from '../../_lib/market-data';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

const logEvent = (event: string, payload: Record<string, unknown>) => {
  console.log(JSON.stringify({ event, ...payload }));
};

const errorEvent = (event: string, payload: Record<string, unknown>) => {
  console.error(JSON.stringify({ event, ...payload }));
};

const errorResponse = (status: number, message: string) => new Response(JSON.stringify({
  error: { code: status === 404 ? 'NOT_FOUND' : 'UPSTREAM_UNAVAILABLE', message },
}), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export const onRequestGet = async (context: MarketRequestContext & { params: { itemId?: string } }) => {
  const itemId = Number(context.params.itemId);
  if (!Number.isSafeInteger(itemId) || itemId <= 0) return errorResponse(400, '잘못된 아이템 ID입니다.');

  const telemetry = createItemDetailTelemetry();
  try {
    const data = await fetchItemDetail(itemId, fetch, undefined, telemetry);
    if (!data) {
      logEvent('item_detail_not_found', { itemId, telemetry });
      return errorResponse(404, '아이템 시세를 찾을 수 없습니다.');
    }

    const body = JSON.stringify(data);
    logEvent('item_detail_upstream_completed', {
      itemId,
      telemetry,
      responsePayloadBytes: new TextEncoder().encode(body).byteLength,
    });

    return new Response(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    errorEvent('item_detail_upstream_failed', {
      itemId,
      telemetry,
      error: errorMessage(error),
    });
    const message = error instanceof MarketDataError
      ? error.message
      : '아이템 시세를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return errorResponse(503, message);
  }
};
