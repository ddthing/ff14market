import type {
  KoreaDCResponse,
  MarketSnapshotResponse,
} from '../types/market';

export type { KoreaDCResponse, MarketSnapshotResponse } from '../types/market';

interface ApiErrorResponse {
  error?: { message?: string };
}

const getErrorMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const error = (payload as ApiErrorResponse).error;
    if (error?.message) return error.message;
  }
  return fallback;
};

const fetchJson = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, '장터 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'));
  }

  return payload as T;
};

/**
 * The browser talks only to the same-origin Pages Function. The function owns
 * upstream chunking, retries, caching, and R2 snapshot fallback.
 */
export const fetchMarketSnapshot = async (
  server: string,
  signal?: AbortSignal,
): Promise<MarketSnapshotResponse> => fetchJson<MarketSnapshotResponse>(
  `/api/market/${encodeURIComponent(server)}`,
  signal,
);

export const fetchKoreaDCData = async (
  itemId: number,
  signal?: AbortSignal,
): Promise<KoreaDCResponse | null> => {
  const response = await fetch(`/api/item/${itemId}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (response.status === 404) return null;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, '아이템 시세를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'));
  }

  return payload as KoreaDCResponse;
};
