import targetItems from './targetItems.json';

export interface Item {
  id: number;
  name: string;
  icon: string;
}

export interface EnrichedItem extends Item {
  price: number;
  fluctuation: number;
  volume: number;
  margin: number;
}

// Enriching the dummy data with fake stats
export const enrichedItems: EnrichedItem[] = targetItems.map((item, index) => ({
  ...item,
  price: 605473 + index * 125000,
  fluctuation: index % 2 === 0 ? (index + 1) * 3.5 : -(index + 1) * 2.8,
  volume: 536 - index * 32,
  margin: index % 2 === 0 ? (index + 1) * 12000 : -(index + 1) * 8000,
}));

export const trendingVolume = [...enrichedItems].sort((a, b) => b.volume - a.volume).slice(0, 3);
export const marginTop = [...enrichedItems].sort((a, b) => b.fluctuation - a.fluctuation).slice(0, 3);
export const hotDeals = [...enrichedItems].reverse().slice(0, 3);
