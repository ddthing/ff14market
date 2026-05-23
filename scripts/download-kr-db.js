import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { parse } from 'csv-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ITEMS_PATH = path.join(__dirname, '../src/data/items.json');
const CSV_URL = 'https://raw.githubusercontent.com/Ra-Workspace/ffxiv-datamining-ko/master/csv/Item.csv';

function getOfficialCategoryName(uiCatId) {
  if (uiCatId === 44 || uiCatId === 45) return '소모품'; // 요리, 약품
  if (uiCatId >= 47 && uiCatId <= 55) return '재료'; // 광석, 목재, 실 등
  if (uiCatId >= 1 && uiCatId <= 43) return '장비'; // 무기, 방어구, 장신구 등
  if (uiCatId === 58) return '마테리아';
  if (uiCatId >= 64 && uiCatId <= 83) return '하우징';
  return '기타';
}

function getV2IconUrl(iconIdStr) {
  if (!iconIdStr || iconIdStr === '0') return '';
  const iconId = parseInt(iconIdStr, 10);
  const folder = String(Math.floor(iconId / 1000) * 1000).padStart(6, '0');
  const file = String(iconId).padStart(6, '0');
  return `https://v2.xivapi.com/api/asset?path=ui/icon/${folder}/${file}_hr1.tex&format=png`;
}

async function downloadAndProcess() {
  console.log(`Downloading Korean Item.csv from ${CSV_URL}...`);
  
  return new Promise((resolve, reject) => {
    https.get(CSV_URL, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch CSV: ${res.statusCode}`));
      }

      const items = [];
      let rowCount = 0;

      res
        .pipe(parse({ relax_column_count: true }))
        .on('data', (row) => {
          rowCount++;
          // Skip headers (Row 1: keys, Row 2: labels, Row 3: types)
          if (rowCount <= 3) return;

          const id = parseInt(row[0], 10);
          const name = row[10];
          const iconId = row[11];
          const uiCatId = parseInt(row[16], 10);

          if (!name || name === '') return;

          items.push({
            id,
            name,
            icon: getV2IconUrl(iconId),
            category: getOfficialCategoryName(uiCatId)
          });
        })
        .on('end', () => {
          console.log(`Parsed ${items.length} items from CSV.`);
          fs.writeFileSync(ITEMS_PATH, JSON.stringify(items, null, 2), 'utf-8');
          console.log(`Saved items to ${ITEMS_PATH}`);
          resolve();
        })
        .on('error', reject);
    }).on('error', reject);
  });
}

downloadAndProcess().catch(console.error);
