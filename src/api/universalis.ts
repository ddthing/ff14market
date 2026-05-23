import axios from 'axios';

const BASE_URL = 'https://universalis.app/api/v2';

export interface UniversalisItemData {
  itemID: number;
  minPrice: number;
  regularSaleVelocity: number;
  currentAveragePrice: number;
  averagePrice: number;
}

export interface UniversalisResponse {
  itemIDs: number[];
  items?: Record<string, UniversalisItemData>;
  unresolvedItems: number[];
}

export const fetchUniversalisData = async (server: string, itemIds: number[]): Promise<Record<string, UniversalisItemData>> => {
  if (itemIds.length === 0) return {};
  
  // Universalis API only allows fetching up to 100 items at a time
  const CHUNK_SIZE = 100;
  const chunks: number[][] = [];
  for (let i = 0; i < itemIds.length; i += CHUNK_SIZE) {
    chunks.push(itemIds.slice(i, i + CHUNK_SIZE));
  }

  try {
    const responses = await Promise.all(
      chunks.map(chunk => axios.get<UniversalisResponse>(`${BASE_URL}/${server}/${chunk.join(',')}`))
    );

    let allItems: Record<string, UniversalisItemData> = {};
    
    responses.forEach((response, idx) => {
      if (response.data && response.data.items) {
        allItems = { ...allItems, ...response.data.items };
      } else if (chunks[idx].length === 1 && (response.data as any).minPrice !== undefined) {
        allItems[chunks[idx][0]] = response.data as any;
      }
    });
    
    return allItems;
  } catch (error) {
    // 404 에러는 해당 아이템의 장터 데이터가 전혀 없거나 거래 불가 아이템일 때 발생하므로 콘솔에 에러를 띄우지 않습니다.
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return {};
    }
    console.error('Failed to fetch from Universalis API', error);
    return {};
  }
};

export interface KoreaDCResponse {
  itemID: number;
  listings?: { worldName: string; pricePerUnit: number }[];
  recentHistory?: { worldName: string; pricePerUnit: number; timestamp: number }[];
  currentAveragePrice: number;
  minPrice: number;
  regularSaleVelocity?: number;
}

export const fetchKoreaDCData = async (itemId: number): Promise<KoreaDCResponse | null> => {
  try {
    const response = await axios.get<KoreaDCResponse>(`${BASE_URL}/Korea/${itemId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    console.error('Failed to fetch from Universalis API', error);
    return null;
  }
};
