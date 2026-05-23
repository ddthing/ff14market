const https = require('https');
const fs = require('fs');

const url = 'https://raw.githubusercontent.com/Ra-Workspace/ffxiv-datamining-ko/master/csv/Item.csv';

https.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to download: ${res.statusCode}`);
    return;
  }
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const lines = data.split('\n');
    const items = [];
    
    // Row 1: column names
    const headers = lines[1].split(',');
    const nameIdx = 10; // Name
    const iconIdx = 11; // Icon
    const itemSearchCategoryIdx = 17; // ItemSearchCategory
    const categoryNameIdx = 16; // ItemUICategory
    
    // simple csv line parser to handle quotes
    function parseCSVLine(text) {
      const ret = [];
      let inQuote = false;
      let value = '';
      for (let i = 0; i < text.length; i++) {
        let char = text[i];
        if (inQuote) {
          if (char === '"') {
            if (i < text.length - 1 && text[i+1] === '"') {
              value += '"';
              i++;
            } else {
              inQuote = false;
            }
          } else {
            value += char;
          }
        } else {
          if (char === '"') {
            inQuote = true;
          } else if (char === ',') {
            ret.push(value);
            value = '';
          } else {
            value += char;
          }
        }
      }
      ret.push(value);
      return ret;
    }
    
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      const parts = parseCSVLine(line);
      const id = parseInt(parts[0]);
      let name = parts[nameIdx];
      const icon = parts[iconIdx];
      const searchCategory = parseInt(parts[itemSearchCategoryIdx] || '0');
      
      // Only include items that are marketable (ItemSearchCategory > 0)
      if (id && name && name !== '' && searchCategory > 0) {
        const iconId = String(icon).padStart(6, '0');
        const folder = iconId.substring(0, 3) + '000';
        const iconUrl = `https://xivapi.com/i/${folder}/${iconId}.png`;
        
        let category = '소모품'; // Default fallback
        const uiCat = parseInt(parts[categoryNameIdx] || '0');
        if (uiCat >= 1 && uiCat <= 33) category = '장비'; // Weapons/Armor
        if (uiCat >= 34 && uiCat <= 39) category = '장비'; // Accessories
        if (uiCat >= 40 && uiCat <= 43) category = '소모품'; // Medicines/Meals
        if (uiCat >= 44 && uiCat <= 55) category = '재료'; // Materials
        if (uiCat >= 56 && uiCat <= 62) category = '기타'; // Materia/Crystals
        if (uiCat >= 65 && uiCat <= 85) category = '하우징'; // Housing
        if (uiCat >= 90) category = '기타'; // Minions/Mounts
        
        items.push({ id, name, icon: iconUrl, category });
      }
    }
    
    fs.writeFileSync('src/data/items.json', JSON.stringify(items, null, 2));
    console.log(`Saved ${items.length} marketable items to src/data/items.json`);
  });
}).on('error', console.error);
