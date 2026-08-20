import fs from 'node:fs';
import path from 'node:path';

export const ITEM_CSV_URL =
  'https://raw.githubusercontent.com/Ra-Workspace/ffxiv-datamining-ko/master/csv/Item.csv';

const FALLBACK_COLUMNS = Object.freeze({
  id: 0,
  name: 10,
  icon: 11,
  itemUiCategory: 16,
  itemSearchCategory: 17,
});

const MASTER_KEYWORDS = Object.freeze([
  { term: '환혹약', category: '소모품' },
  { term: '환약', category: '소모품' },
  { term: '마테리쟈', category: '마테리아' },
  { term: '염료', category: '염료' },
  { term: '궤짝', category: '룩템' },
  { term: '파이', category: '요리' },
  { term: '티타늄', category: '재료' },
  { term: '미스릴', category: '재료' },
  { term: '샐러드', category: '요리' },
  { term: '보석약', category: '소모품' },
]);

const MASTER_ITEM_LIMIT = 200;

/**
 * Parse the datamining CSV without splitting on newlines. Item names can
 * contain commas and line breaks, so both have to be handled while quoted.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  const finishRow = () => {
    row.push(value);
    rows.push(row);
    row = [];
    value = '';
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (inQuotes) {
      if (character === '"') {
        if (nextCharacter === '"') {
          value += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        value += character;
      }
      continue;
    }

    if (character === '"' && value.length === 0) {
      inQuotes = true;
    } else if (character === ',') {
      row.push(value);
      value = '';
    } else if (character === '\n') {
      finishRow();
    } else if (character === '\r') {
      if (nextCharacter === '\n') index += 1;
      finishRow();
    } else {
      value += character;
    }
  }

  if (inQuotes) {
    throw new Error('CSV ended inside a quoted field. The source file may be truncated.');
  }

  if (value.length > 0 || row.length > 0) {
    finishRow();
  }

  if (rows[0]?.[0]?.startsWith('\uFEFF')) {
    rows[0][0] = rows[0][0].slice(1);
  }

  return rows;
}

function normalizeHeader(value) {
  return value.replace(/^\uFEFF/, '').trim();
}

function findHeaderRow(rows) {
  return rows.findIndex((candidate) => {
    const headers = candidate.map(normalizeHeader);
    return headers.includes('Name') && headers.includes('Icon') && headers.includes('ItemSearchCategory');
  });
}

function resolveColumns(rows) {
  const headerRowIndex = findHeaderRow(rows);
  if (headerRowIndex < 0) {
    return { headerRowIndex: -1, ...FALLBACK_COLUMNS };
  }

  const headers = rows[headerRowIndex].map(normalizeHeader);
  const findColumn = (name, fallback) => {
    const index = headers.indexOf(name);
    return index >= 0 ? index : fallback;
  };

  return {
    headerRowIndex,
    id: findColumn('Index', FALLBACK_COLUMNS.id),
    name: findColumn('Name', FALLBACK_COLUMNS.name),
    icon: findColumn('Icon', FALLBACK_COLUMNS.icon),
    itemUiCategory: findColumn('ItemUICategory', FALLBACK_COLUMNS.itemUiCategory),
    itemSearchCategory: findColumn('ItemSearchCategory', FALLBACK_COLUMNS.itemSearchCategory),
  };
}

export function getOfficialCategoryName(itemUiCategoryId) {
  if (itemUiCategoryId === 44 || itemUiCategoryId === 45) return '소모품';
  if (itemUiCategoryId >= 47 && itemUiCategoryId <= 55) return '재료';
  if (itemUiCategoryId >= 1 && itemUiCategoryId <= 43) return '장비';
  if (itemUiCategoryId === 58) return '마테리아';
  if (itemUiCategoryId >= 64 && itemUiCategoryId <= 83) return '하우징';
  return '기타';
}

export function getIconPath(iconValue) {
  const iconId = Number.parseInt(String(iconValue ?? ''), 10);
  if (!Number.isFinite(iconId) || iconId <= 0) return '';

  const folder = String(Math.floor(iconId / 1000) * 1000).padStart(6, '0');
  const file = String(iconId).padStart(6, '0');
  // Keep generated data compact. getIconUrl resolves this legacy-compatible
  // path to the v2 asset endpoint at render time.
  return `/i/${folder}/${file}.png`;
}

export function getIconIdFromPath(iconPath) {
  const match = String(iconPath ?? '').match(/\/i\/\d{6}\/(\d{6})\.png$/);
  if (!match) return 0;

  const iconId = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(iconId) ? iconId : 0;
}

export function buildItemsFromCsv(csvText) {
  const rows = parseCsv(csvText);
  const columns = resolveColumns(rows);
  const itemsById = new Map();
  const dataStart = columns.headerRowIndex >= 0 ? columns.headerRowIndex + 1 : 0;

  for (const row of rows.slice(dataStart)) {
    const id = Number.parseInt(row[columns.id] ?? '', 10);
    const name = (row[columns.name] ?? '').trim();
    const searchCategory = Number.parseInt(row[columns.itemSearchCategory] ?? '0', 10);

    // ItemSearchCategory > 0 is the upstream's marketable-item signal.
    if (!Number.isInteger(id) || id <= 0 || !name || searchCategory <= 0) continue;
    if (itemsById.has(id)) continue;

    const itemUiCategory = Number.parseInt(row[columns.itemUiCategory] ?? '0', 10);
    itemsById.set(id, {
      id,
      name,
      icon: getIconPath(row[columns.icon]),
      category: getOfficialCategoryName(itemUiCategory),
    });
  }

  return [...itemsById.values()].sort((a, b) => a.id - b.id);
}

function matchesMasterKeyword(item, keyword) {
  if (!item.name.includes(keyword.term)) return false;

  if (keyword.term === '환혹약' || keyword.term === '보석약' || keyword.term === '환약') {
    if (!['4등급', '7등급', '8등급'].some((grade) => item.name.includes(grade))) {
      return false;
    }
  }

  if (keyword.term === '마테리쟈' && !item.name.includes('알테') && !item.name.includes('오메가')) {
    return false;
  }

  return true;
}

function getMasterPriority(item) {
  return /환혹약|보석약|마테리|환약|음식|파이/.test(item.name) ? 1 : 0;
}

export function buildMasterItems(items, limit = MASTER_ITEM_LIMIT) {
  const selectedItems = [];
  const includedIds = new Set();

  for (const item of items) {
    const keyword = MASTER_KEYWORDS.find((candidate) => matchesMasterKeyword(item, candidate));
    if (!keyword || includedIds.has(item.id)) continue;

    selectedItems.push({
      id: item.id,
      name: item.name,
      icon: item.icon,
      category: keyword.category,
    });
    includedIds.add(item.id);
  }

  return selectedItems
    .sort((a, b) => getMasterPriority(b) - getMasterPriority(a) || b.id - a.id)
    .slice(0, limit);
}

/**
 * The UI only needs these three fields for Fuse search and detail lookup.
 * Numeric icon IDs remove long, repeated icon paths from the lazy-loaded
 * bundle. The client reconstructs the legacy-compatible path at runtime.
 */
export function buildSearchCatalog(items) {
  return {
    entries: items.map((item) => [item.id, item.name, getIconIdFromPath(item.icon)]),
  };
}

function validateCollection(items, label, errors) {
  const ids = new Set();

  if (!Array.isArray(items) || items.length === 0) {
    errors.push(`${label} must contain at least one item.`);
    return;
  }

  for (const item of items) {
    if (!Number.isInteger(item.id) || item.id <= 0) {
      errors.push(`${label} contains an invalid item id.`);
    }
    if (typeof item.name !== 'string' || item.name.trim() === '') {
      errors.push(`${label} contains an item without a name.`);
    }
    if (typeof item.icon !== 'string') {
      errors.push(`${label} item ${item.id} has an invalid icon value.`);
    }
    if (typeof item.category !== 'string' || item.category.trim() === '') {
      errors.push(`${label} item ${item.id} has an invalid category.`);
    }
    if (ids.has(item.id)) {
      errors.push(`${label} contains duplicate item id ${item.id}.`);
    }
    ids.add(item.id);
  }

  return ids;
}

export function validateItemCollections(items, masterItems) {
  const errors = [];
  const itemIds = validateCollection(items, 'items.json', errors) ?? new Set();
  validateCollection(masterItems, 'masterItems.json', errors);

  for (const item of masterItems ?? []) {
    if (!itemIds.has(item.id)) {
      errors.push(`masterItems.json item ${item.id} is missing from items.json.`);
    }
  }

  return errors;
}

export function validateSearchCatalog(searchCatalog, items) {
  const errors = [];
  const itemsById = new Map((items ?? []).map((item) => [item.id, item]));
  const itemIds = new Set(itemsById.keys());
  const searchIds = new Set();

  if (
    !searchCatalog ||
    typeof searchCatalog !== 'object' ||
    !Array.isArray(searchCatalog.entries) ||
    searchCatalog.entries.length === 0
  ) {
    errors.push('searchItems.json must contain at least one item.');
    return errors;
  }

  for (const entry of searchCatalog.entries) {
    if (!Array.isArray(entry) || entry.length !== 3) {
      errors.push('searchItems.json contains an invalid tuple.');
      continue;
    }

    const [id, name, iconId] = entry;
    if (!Number.isInteger(id) || id <= 0 || !itemIds.has(id)) {
      errors.push(`searchItems.json contains an unknown item id ${id}.`);
    }
    if (typeof name !== 'string' || name.trim() === '') {
      errors.push(`searchItems.json item ${id} has an invalid name.`);
    }
    if (!Number.isSafeInteger(iconId) || iconId < 0) {
      errors.push(`searchItems.json item ${id} has an invalid icon id.`);
    }
    const sourceItem = itemsById.get(id);
    if (sourceItem && iconId !== getIconIdFromPath(sourceItem.icon)) {
      errors.push(`searchItems.json item ${id} has an icon id that does not match items.json.`);
    }
    if (searchIds.has(id)) {
      errors.push(`searchItems.json contains duplicate item id ${id}.`);
    }
    searchIds.add(id);
  }

  if (searchIds.size !== itemIds.size) {
    errors.push('searchItems.json must contain exactly one entry for every items.json item.');
  }

  return errors;
}

export function writeJsonAtomically(filePath, value, { pretty = true } = {}) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });

  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`, 'utf8');

  try {
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    fs.rmSync(temporaryPath, { force: true });
    throw error;
  }
}
