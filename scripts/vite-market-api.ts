import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import masterItems from '../src/data/masterItems.json' with { type: 'json' };
import {
  buildMarketSnapshot,
  fetchItemDetail,
  isSupportedServer,
  MarketDataError,
} from '../functions/_lib/market-data.ts';
import type { MarketSnapshotResponse } from '../src/types/market.ts';

const marketItemIds = masterItems.map((item) => item.id);

const sendJson = (response: ServerResponse, status: number, payload: unknown, cacheControl = 'no-store') => {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', cacheControl);
  response.end(JSON.stringify(payload));
};

const getPathParts = (request: IncomingMessage) => {
  const requestUrl = new URL(request.url ?? '/', 'http://localhost');
  return requestUrl.pathname.split('/').filter(Boolean);
};

export const marketApiDevPlugin = (): Plugin => ({
  name: 'ff14market-dev-api',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      const parts = getPathParts(request);
      if (parts[0] !== 'api') {
        next();
        return;
      }

      if (request.method !== 'GET') {
        sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'GET만 지원합니다.' } });
        return;
      }

      try {
        if (parts[1] === 'market' && parts[2]) {
          const serverName = decodeURIComponent(parts[2]);
          if (!isSupportedServer(serverName)) {
            sendJson(response, 400, { error: { code: 'BAD_REQUEST', message: '지원하지 않는 서버입니다.' } });
            return;
          }

          const snapshot = await buildMarketSnapshot(serverName, marketItemIds);
          const payload: MarketSnapshotResponse = {
            ...snapshot,
            source: 'upstream-fallback',
            stale: false,
          };
          sendJson(response, 200, payload, 'private, max-age=30');
          return;
        }

        if (parts[1] === 'item' && parts[2]) {
          const itemId = Number(parts[2]);
          if (!Number.isSafeInteger(itemId) || itemId <= 0) {
            sendJson(response, 400, { error: { code: 'BAD_REQUEST', message: '잘못된 아이템 ID입니다.' } });
            return;
          }

          const data = await fetchItemDetail(itemId);
          if (!data) {
            sendJson(response, 404, { error: { code: 'NOT_FOUND', message: '아이템 시세를 찾을 수 없습니다.' } });
            return;
          }

          sendJson(response, 200, data, 'private, max-age=30');
          return;
        }

        next();
      } catch (error) {
        const message = error instanceof MarketDataError
          ? error.message
          : '장터 데이터를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.';
        sendJson(response, 503, { error: { code: 'UPSTREAM_UNAVAILABLE', message } });
      }
    });
  },
});
