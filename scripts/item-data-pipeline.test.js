import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildItemsFromCsv,
  buildMasterItems,
  buildSearchCatalog,
  parseCsv,
  validateItemCollections,
  validateSearchCatalog,
} from './item-data-pipeline.js';

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function createCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function createItemRow({ id, name, icon = '56892', uiCategory = '44', searchCategory = '1' }) {
  const row = Array.from({ length: 18 }, () => '');
  row[0] = id;
  row[10] = name;
  row[11] = icon;
  row[16] = uiCategory;
  row[17] = searchCategory;
  return row;
}

test('parseCsv preserves commas, escaped quotes, and line breaks inside fields', () => {
  const rows = parseCsv('meta\r\nid,name\r\n1,"A, ""quoted"" item\nline"\r\n');
  assert.deepEqual(rows[2], ['1', 'A, "quoted" item\nline']);
});

test('buildItemsFromCsv keeps marketable items and deduplicates ids', () => {
  const csv = createCsv([
    ['# Item.csv'],
    ['Index', ...Array.from({ length: 9 }, () => ''), 'Name', 'Icon', ...Array.from({ length: 4 }, () => ''), 'ItemUICategory', 'ItemSearchCategory'],
    ['labels'],
    ['types'],
    createItemRow({ id: 20, name: '시장 아이템' }),
    createItemRow({ id: 20, name: '중복 아이템' }),
    createItemRow({ id: 21, name: '비시장 아이템', searchCategory: '0' }),
  ]);

  const items = buildItemsFromCsv(csv);
  assert.deepEqual(items.map((item) => item.id), [20]);
  assert.equal(items[0].category, '소모품');
  assert.equal(items[0].icon, '/i/056000/056892.png');
});

test('buildMasterItems retains the curated selection rules for new data', () => {
  const items = [
    { id: 100, name: '8등급 환혹약', icon: '', category: '소모품' },
    { id: 101, name: '9등급 환혹약', icon: '', category: '소모품' },
    { id: 102, name: '알테마 마테리쟈', icon: '', category: '마테리아' },
  ];

  const masterItems = buildMasterItems(items);
  assert.deepEqual(masterItems.map((item) => item.id), [102, 100]);
});

test('buildSearchCatalog stores only fields needed by the lazy search bundle', () => {
  const items = [
    { id: 1, name: '아이템', icon: '/i/000000/000001.png', category: '기타' },
  ];

  const searchCatalog = buildSearchCatalog(items);
  assert.deepEqual(searchCatalog, {
    entries: [[1, '아이템', 1]],
  });
  assert.deepEqual(validateSearchCatalog(searchCatalog, items), []);
});

test('validateItemCollections catches broken master references', () => {
  const errors = validateItemCollections(
    [{ id: 1, name: '아이템', icon: '', category: '기타' }],
    [{ id: 2, name: '없는 아이템', icon: '', category: '기타' }],
  );

  assert.ok(errors.some((error) => error.includes('missing from items.json')));
});
