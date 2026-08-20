type NumericValue = number | null | undefined;

export const MARKET_SIGNAL_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const isPositiveFinite = (value: NumericValue): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const isValidReferencePrice = (value: NumericValue): value is number =>
  isPositiveFinite(value) && value >= 1;

/** Absolute lowest listing price across the API's all/NQ/HQ fields. */
export const computeTrueMinPrice = (
  minPrice: NumericValue,
  minPriceNQ: NumericValue,
  minPriceHQ: NumericValue,
): number => {
  const candidates = [minPrice, minPriceNQ, minPriceHQ].filter(isPositiveFinite);
  return candidates.length > 0 ? Math.min(...candidates) : 0;
};

/**
 * Compares the current average listing price with the recent average sale
 * price. This is a market gap signal, not a strict time-series price change.
 */
export const computeMarketPriceGapPercent = (
  currentAverageListingPrice: NumericValue,
  recentAverageSalePrice: NumericValue,
): number | null => {
  if (!isValidReferencePrice(currentAverageListingPrice) || !isValidReferencePrice(recentAverageSalePrice)) {
    return null;
  }

  return ((currentAverageListingPrice - recentAverageSalePrice) / recentAverageSalePrice) * 100;
};

export const formatMarketPriceGap = (value: NumericValue): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '비교 불가';
  if (value >= 1000) return '+999%+';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
};

/** Universalis returns the average number of sales per day, including fractions. */
export const normalizeSaleVelocity = (value: NumericValue): number =>
  isPositiveFinite(value) ? value : 0;

/** Hot rankings should not treat an old market upload as a live signal. */
export const isRecentMarketData = (
  timestamp: NumericValue,
  now = Date.now(),
  maxAgeMs = MARKET_SIGNAL_MAX_AGE_MS,
): boolean => {
  if (timestamp === undefined) return true;
  return isPositiveFinite(timestamp) && now - timestamp <= maxAgeMs;
};

export const formatSaleVelocity = (value: NumericValue): string => {
  const velocity = normalizeSaleVelocity(value);
  if (velocity === 0) return '0';

  return velocity < 10
    ? velocity.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
    : Math.round(velocity).toLocaleString('ko-KR');
};
