import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MASTER_PATH = path.join(__dirname, '../src/data/masterItems.json');

const masterItems = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf-8'));

function fetchCategory(id) {
  return new Promise((resolve, reject) => {
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
    }).on('error', reject);
  });
}

function getOfficialCategoryName(uiCatId) {
  if (uiCatId === 44 || uiCatId === 45) return '소모품'; // 요리/약품
  if (uiCatId >= 47 && uiCatId <= 55) return '재료'; // 광석, 목재 등
  if (uiCatId >= 1 && uiCatId <= 43) return '장비'; // 무기, 방어구, 장신구 등
  if (uiCatId === 58) return '마테리아';
  if (uiCatId >= 64 && uiCatId <= 83) return '하우징';
  return '기타';
}

async function run() {
  console.log(`Fixing categories for ${masterItems.length} items...`);
  
  for (let i = 0; i < masterItems.length; i += 10) {
    const chunk = masterItems.slice(i, i + 10);
    await Promise.all(chunk.map(async (item) => {
      const uiCatId = await fetchCategory(item.id);
      const newCategory = getOfficialCategoryName(uiCatId);
      item.category = newCategory;
    }));
    await new Promise(r => setTimeout(r, 200)); // Rate limit protection
  }
  
  fs.writeFileSync(MASTER_PATH, JSON.stringify(masterItems, null, 2), 'utf-8');
  console.log('Successfully fixed masterItems.json!');
}

run();
