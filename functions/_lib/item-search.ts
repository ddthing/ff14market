import searchCatalog from '../../src/data/searchItems.json';
import { getIconPathFromId } from '../../src/utils/icon.ts';
import {
  createItemSearcher,
  type CompactSearchEntry,
} from '../../src/utils/itemSearch.ts';

interface CompactSearchCatalog {
  entries: CompactSearchEntry[];
}

export interface ItemCatalogEntry {
  id: number;
  name: string;
  icon: string;
}

const entries = (searchCatalog as CompactSearchCatalog).entries;
const search = createItemSearcher(entries);
const entriesById = new Map(entries.map(([id, name, iconId]) => [id, { id, name, iconId }]));

const toCatalogEntry = ({ id, name, iconId }: { id: number; name: string; iconId: number }): ItemCatalogEntry => ({
  id,
  name,
  icon: getIconPathFromId(iconId),
});

export const searchItemCatalog = (query: string, limit = 10) =>
  search(query, limit).map(toCatalogEntry);

export const findItemMetadata = (itemId: number): ItemCatalogEntry | null => {
  const entry = entriesById.get(itemId);
  return entry ? toCatalogEntry(entry) : null;
};
