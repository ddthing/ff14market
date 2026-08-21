import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildItemsFromCsv,
  buildMasterItems,
  buildSearchCatalog,
  getOfficialCategoryName,
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

test('getOfficialCategoryName maps the official UI category groups', () => {
  assert.equal(getOfficialCategoryName(33), '재료');
  assert.equal(getOfficialCategoryName(45), '재료');
  assert.equal(getOfficialCategoryName(46), '요리');
  assert.equal(getOfficialCategoryName(54, '코치닐 염료'), '염료');
  assert.equal(getOfficialCategoryName(55), '염료');
  assert.equal(getOfficialCategoryName(57), '하우징');
  assert.equal(getOfficialCategoryName(84), '장비');
  assert.equal(getOfficialCategoryName(112), '룩템');
  assert.equal(getOfficialCategoryName(61, '우주복 궤짝'), '룩템');
});

test('buildMasterItems keeps source categories and rejects substring keyword false positives', () => {
  const items = [
    { id: 200, name: '사파이어 목장식', icon: '', category: '장비' },
    { id: 201, name: '견과파이', icon: '', category: '요리' },
    { id: 202, name: '스타 사파이어 오르골', icon: '', category: '하우징' },
    { id: 203, name: '티타늄금 수호자 투구', icon: '', category: '장비' },
    { id: 204, name: '우주 궤짝 의자', icon: '', category: '하우징' },
    { id: 205, name: '파이싸킬러', icon: '', category: '재료' },
  ];

  const masterItems = buildMasterItems(items, 20);
  const categoriesByName = new Map(masterItems.map((item) => [item.name, item.category]));

  assert.equal(categoriesByName.get('견과파이'), '요리');
  assert.equal(categoriesByName.get('티타늄금 수호자 투구'), '장비');
  assert.equal(categoriesByName.get('우주 궤짝 의자'), '하우징');
  assert.equal(categoriesByName.has('사파이어 목장식'), false);
  assert.equal(categoriesByName.has('스타 사파이어 오르골'), false);
  assert.equal(categoriesByName.has('파이싸킬러'), false);
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
