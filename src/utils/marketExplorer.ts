import type { EnrichedItem } from '../hooks/useItemData';

export type MarketSort = 'volume' | 'price-asc' | 'price-desc' | 'gap';

export function exploreMarket(
  items: readonly EnrichedItem[],
  options: {
    query: string;
    category: string;
    sort: MarketSort;
    favoritesOnly: boolean;
    favoriteIds: readonly number[];
  },
) {
  const query = options.query.trim().toLocaleLowerCase('ko-KR').replace(/\s/g, '');
  const favorites = new Set(options.favoriteIds);
  return items
    .filter(
      (item) =>
        (!query || item.name.toLocaleLowerCase('ko-KR').replace(/\s/g, '').includes(query)) &&
        (options.category === '전체' || item.category === options.category) &&
        (!options.favoritesOnly || favorites.has(item.id)),
    )
    .sort((a, b) => {
      if (options.sort === 'price-asc')
        return (a.price || Infinity) - (b.price || Infinity) || a.id - b.id;
      if (options.sort === 'price-desc') return b.price - a.price || a.id - b.id;
      if (options.sort === 'gap')
        return (a.fluctuation ?? Infinity) - (b.fluctuation ?? Infinity) || a.id - b.id;
    return b.volume - a.volume || b.price - a.price || a.id - b.id;
    });
}

export function marketCsv(items: readonly EnrichedItem[], server: string) {
  const cell = (value: string | number) => {
    const text = String(value);
    return `"${(typeof value === 'string' && /^[=+@\-\t\r]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
  };
  return (
    '\uFEFF' +
    [
      [
        '서버',
        '아이템 ID',
        '아이템',
        '분류',
        '최저 매물가(G)',
        '판매속도(건/일)',
        '매물-판매 격차(%)',
        '수집 시각',
      ],
      ...items.map((item) => [
        server,
        item.id,
        item.name,
        item.category,
        item.price || '',
        item.volume,
        item.fluctuation ?? '',
        item.lastUploadTime ? new Date(item.lastUploadTime).toISOString() : '',
      ]),
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n')
  );
}
