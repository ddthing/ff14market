import Fuse from 'fuse.js';

export type CompactSearchEntry = readonly [id: number, name: string, iconId: number];

export interface SearchableItem {
  id: number;
  name: string;
  iconId: number;
}

const MAX_SEARCH_RESULTS = 10;

export const createItemSearcher = (entries: readonly CompactSearchEntry[]) => {
  const searchableItems: SearchableItem[] = entries.map(([id, name, iconId]) => ({
    id,
    name,
    iconId,
  }));
  const fuse = new Fuse(searchableItems, {
    keys: ['name'],
    threshold: 0.3,
  });

  return (query: string, limit = MAX_SEARCH_RESULTS): SearchableItem[] => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return [];

    const safeLimit = Math.max(1, Math.min(Math.floor(limit), MAX_SEARCH_RESULTS));
    return fuse.search(normalizedQuery, { limit: safeLimit }).map(({ item }) => item);
  };
};
