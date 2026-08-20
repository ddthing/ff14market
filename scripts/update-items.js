import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ITEM_CSV_URL,
  buildItemsFromCsv,
  buildMasterItems,
  buildSearchCatalog,
  validateItemCollections,
  validateSearchCatalog,
  writeJsonAtomically,
} from './item-data-pipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ITEMS_PATH = path.join(__dirname, '../src/data/items.json');
const MASTER_PATH = path.join(__dirname, '../src/data/masterItems.json');
const SEARCH_PATH = path.join(__dirname, '../src/data/searchItems.json');
const isDryRun = process.argv.includes('--dry-run');

async function fetchCsv(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'ff14market-item-updater',
      accept: 'text/csv,text/plain;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download item database: HTTP ${response.status}`);
  }

  return response.text();
}

async function run() {
  console.log(`Downloading item database from ${ITEM_CSV_URL}...`);
  const csvText = await fetchCsv(ITEM_CSV_URL);
  const items = buildItemsFromCsv(csvText);
  const masterItems = buildMasterItems(items);
  const searchCatalog = buildSearchCatalog(items);
  const validationErrors = [
    ...validateItemCollections(items, masterItems),
    ...validateSearchCatalog(searchCatalog, items),
  ];

  if (validationErrors.length > 0) {
    throw new Error(`Generated data failed validation:\n- ${validationErrors.join('\n- ')}`);
  }

  if (isDryRun) {
    console.log(`Dry run: would write ${items.length} items, ${searchCatalog.entries.length} search entries, and ${masterItems.length} featured items.`);
    return;
  }

  writeJsonAtomically(ITEMS_PATH, items);
  writeJsonAtomically(MASTER_PATH, masterItems);
  writeJsonAtomically(SEARCH_PATH, searchCatalog, { pretty: false });
  console.log(`Saved ${items.length} marketable items to ${ITEMS_PATH}`);
  console.log(`Saved ${masterItems.length} featured items to ${MASTER_PATH}`);
  console.log(`Saved ${searchCatalog.entries.length} search entries to ${SEARCH_PATH}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
