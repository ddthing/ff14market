import { getIconPathFromId } from '../utils/icon';

export interface ItemCatalogEntry {
  id: number;
  name: string;
  icon: string;
}

type CompactItemCatalog = {
  entries: [id: number, name: string, iconId: number][];
};

let itemCatalogPromise: Promise<ItemCatalogEntry[]> | undefined;

/**
 * Keep the large searchable catalog out of the initial route bundle. The
 * module promise is shared by search and detail views so navigation cannot
 * trigger duplicate downloads.
 */
export const loadItemCatalog = (): Promise<ItemCatalogEntry[]> => {
  itemCatalogPromise ??= import('./searchItems.json').then(({ default: catalog }) => {
    const { entries } = catalog as CompactItemCatalog;
    return entries.map(([id, name, iconId]) => ({ id, name, icon: getIconPathFromId(iconId) }));
  });
  return itemCatalogPromise;
};
