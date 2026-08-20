import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateItemCollections, validateSearchCatalog } from './item-data-pipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ITEMS_PATH = path.join(__dirname, '../src/data/items.json');
const MASTER_PATH = path.join(__dirname, '../src/data/masterItems.json');
const SEARCH_PATH = path.join(__dirname, '../src/data/searchItems.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const items = readJson(ITEMS_PATH);
const errors = [
  ...validateItemCollections(items, readJson(MASTER_PATH)),
  ...validateSearchCatalog(readJson(SEARCH_PATH), items),
];

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Item data validation passed.');
}
