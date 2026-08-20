export const getIconPathFromId = (iconId: number) => {
  if (!Number.isSafeInteger(iconId) || iconId <= 0) return '';

  const folder = String(Math.floor(iconId / 1000) * 1000).padStart(6, '0');
  const file = String(iconId).padStart(6, '0');
  return `/i/${folder}/${file}.png`;
};

export const getIconUrl = (iconPath: string) => {
  if (!iconPath) return '';
  
  // If it's already a v2 asset URL, return as is
  if (iconPath.includes('v2.xivapi.com')) return iconPath;

  // Extract folder and file from formats like "/i/056000/056892.png" or "https://xivapi.com/i/056000/056892.png"
  const match = iconPath.match(/\/i\/(\d{6})\/(\d{6})\.png/);
  if (match) {
    // XIVAPI v2 endpoint for high-resolution item icons
    return `https://v2.xivapi.com/api/asset?path=ui/icon/${match[1]}/${match[2]}_hr1.tex&format=png`;
  }
  
  // Fallback for legacy paths
  if (iconPath.startsWith('/')) {
    return `https://xivapi.com${iconPath}`;
  }
  
  return iconPath;
};
