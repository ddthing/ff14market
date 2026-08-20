export interface SaleHistoryEntry {
  pricePerUnit: number;
  quantity: number;
  timestamp: number;
}

export interface PriceChange {
  changePercent: number;
  volumeChangePercent: number | null;
  recentAveragePrice: number;
  previousAveragePrice: number;
  recentUnitsSold: number;
  previousUnitsSold: number;
  recentSalesCount: number;
  previousSalesCount: number;
}

interface WeightedAverage {
  averagePrice: number;
  unitsSold: number;
  salesCount: number;
}

const getWeightedAverage = (entries: SaleHistoryEntry[]): WeightedAverage | null => {
  let totalValue = 0;
  let unitsSold = 0;
  let salesCount = 0;

  for (const entry of entries) {
    if (
      !Number.isFinite(entry.pricePerUnit) ||
      entry.pricePerUnit < 1 ||
      !Number.isFinite(entry.quantity) ||
      entry.quantity <= 0
    ) {
      continue;
    }

    totalValue += entry.pricePerUnit * entry.quantity;
    unitsSold += entry.quantity;
    salesCount += 1;
  }

  if (unitsSold === 0) return null;

  return {
    averagePrice: totalValue / unitsSold,
    unitsSold,
    salesCount,
  };
};

export const computePeriodPriceChange = (
  recentEntries: SaleHistoryEntry[],
  previousEntries: SaleHistoryEntry[],
): PriceChange | null => {
  const recent = getWeightedAverage(recentEntries);
  const previous = getWeightedAverage(previousEntries);
  if (!recent || !previous || previous.averagePrice < 1) return null;

  return {
    changePercent: ((recent.averagePrice - previous.averagePrice) / previous.averagePrice) * 100,
    volumeChangePercent: previous.unitsSold > 0
      ? ((recent.unitsSold - previous.unitsSold) / previous.unitsSold) * 100
      : null,
    recentAveragePrice: recent.averagePrice,
    previousAveragePrice: previous.averagePrice,
    recentUnitsSold: recent.unitsSold,
    previousUnitsSold: previous.unitsSold,
    recentSalesCount: recent.salesCount,
    previousSalesCount: previous.salesCount,
  };
};

export const buildPriceChanges = (
  recentByItem: Record<string, SaleHistoryEntry[]>,
  previousByItem: Record<string, SaleHistoryEntry[]>,
): Record<string, PriceChange> => {
  const changes: Record<string, PriceChange> = {};

  for (const itemId of Object.keys(recentByItem)) {
    const change = computePeriodPriceChange(recentByItem[itemId], previousByItem[itemId] ?? []);
    if (change) changes[itemId] = change;
  }

  return changes;
};
