import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ITEMS_PATH = path.join(__dirname, '../src/data/items.json');
const MASTER_PATH = path.join(__dirname, '../src/data/masterItems.json');

// Read the massive items database
const rawData = fs.readFileSync(ITEMS_PATH, 'utf-8');
const allItems = JSON.parse(rawData);

const keywords = [
  { term: '환혹약', category: '소모품' },
  { term: '환약', category: '소모품' },
  { term: '마테리쟈', category: '마테리아' }, // Covers 알테마테리쟈, 오메가마테리쟈
  { term: '염료', category: '염료' },
  { term: '궤짝', category: '룩템' },
  { term: '파이', category: '요리' },
  { term: '티타늄', category: '재료' },
  { term: '미스릴', category: '재료' },
  { term: '샐러드', category: '요리' },
  { term: '보석약', category: '소모품' },
];

let masterItems = [];
const includedIds = new Set();

for (const item of allItems) {
  for (const keyword of keywords) {
    // Only include higher grade potions/materia or general keywords
    if (item.name.includes(keyword.term)) {
      // 8등급 이상 환혹약, 보석약 등 필터링 강화
      if (keyword.term === '환혹약' || keyword.term === '보석약' || keyword.term === '환약') {
        if (!item.name.includes('7등급') && !item.name.includes('8등급') && !item.name.includes('4등급')) continue;
      }
      if (keyword.term === '마테리쟈') {
        if (!item.name.includes('알테') && !item.name.includes('오메가')) continue;
      }

      if (!includedIds.has(item.id)) {
        masterItems.push({
          id: item.id,
          name: item.name,
          icon: item.icon,
          category: keyword.category
        });
        includedIds.add(item.id);
      }
    }
  }
}

import https from 'https';

// Prioritize important consumables and materia
masterItems.sort((a, b) => {
  const aPriority = a.name.includes('환혹약') || a.name.includes('보석약') || a.name.includes('마테리') || a.name.includes('환약') || a.name.includes('음식') || a.name.includes('파이') ? 1 : 0;
  const bPriority = b.name.includes('환혹약') || b.name.includes('보석약') || b.name.includes('마테리') || b.name.includes('환약') || b.name.includes('음식') || b.name.includes('파이') ? 1 : 0;
  if (aPriority !== bPriority) return bPriority - aPriority;
  return b.id - a.id;
});

// Slice to ~200 items max
masterItems = masterItems.slice(0, 200);

function fetchCategory(id) {
  return new Promise((resolve) => {
    https.get(`https://v2.xivapi.com/api/sheet/Item/${id}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.fields?.ItemUICategory?.value || 0);
        } catch (e) {
          resolve(0);
        }
      });
    }).on('error', () => resolve(0));
  });
}

function getOfficialCategoryName(uiCatId) {
  if (uiCatId === 44 || uiCatId === 45) return '소모품'; // 요리, 약품
  if (uiCatId >= 47 && uiCatId <= 55) return '재료'; // 광석, 목재, 실 등
  if (uiCatId >= 1 && uiCatId <= 43) return '장비'; // 무기, 방어구, 장신구 등
  if (uiCatId === 58) return '마테리아';
  if (uiCatId >= 64 && uiCatId <= 83) return '하우징';
  return '기타';
}

async function runUpdate() {
  console.log(`Fetching official categories for ${masterItems.length} items from XIVAPI...`);
  for (let i = 0; i < masterItems.length; i += 10) {
    const chunk = masterItems.slice(i, i + 10);
    await Promise.all(chunk.map(async (item) => {
      const uiCatId = await fetchCategory(item.id);
      item.category = getOfficialCategoryName(uiCatId);
    }));
    await new Promise(r => setTimeout(r, 200));
  }

  fs.writeFileSync(MASTER_PATH, JSON.stringify(masterItems, null, 2), 'utf-8');
  console.log(`Successfully generated masterItems.json with ${masterItems.length} items!`);
}

runUpdate();
