export interface ItemCatalogEntry {
  id: number;
  name: string;
  icon: string;
}

interface ItemSearchResponse {
  items?: ItemCatalogEntry[];
}

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

const fetchCatalogJson = async <T>(url: string, signal?: AbortSignal): Promise<T | null> => {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });
  const payload = await response.json().catch(() => null);

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, '아이템 검색 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'));
  }

  return payload as T;
};

export const fetchItemSearch = async (
  query: string,
  signal?: AbortSignal,
): Promise<ItemCatalogEntry[]> => {
  const payload = await fetchCatalogJson<ItemSearchResponse>(`/api/search?q=${encodeURIComponent(query)}`, signal);
  return payload?.items ?? [];
};

export const fetchItemMetadata = async (
  itemId: number,
  signal?: AbortSignal,
): Promise<ItemCatalogEntry | null> => fetchCatalogJson<ItemCatalogEntry>(`/api/item-meta/${itemId}`, signal);
