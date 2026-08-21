export interface MarketListingSummary {
  worldName: string;
  pricePerUnit: number;
}

export interface ServerMinPrice {
  serverName: string;
  minPrice: number;
}

/**
 * Finds each server's lowest listing in one pass.
 *
 * Detail responses can contain hundreds of listings. The previous callers
 * filtered and mapped that full array once per server, which multiplied work
 * and duplicated the rule in two views. This reducer keeps the domain rule in
 * one place and makes the cost O(listings + servers).
 */
export const getServerMinPrices = (
  listings: readonly MarketListingSummary[] | undefined,
  serverNames: readonly string[],
): ServerMinPrice[] => {
  const minimumByServer = new Map<string, number>(serverNames.map((serverName) => [serverName, 0]));

  for (const listing of listings ?? []) {
    const currentMinimum = minimumByServer.get(listing.worldName);
    if (
      currentMinimum === undefined
      || !Number.isFinite(listing.pricePerUnit)
      || listing.pricePerUnit <= 0
    ) {
      continue;
    }

    if (currentMinimum === 0 || listing.pricePerUnit < currentMinimum) {
      minimumByServer.set(listing.worldName, listing.pricePerUnit);
    }
  }

  return serverNames.map((serverName) => ({
    serverName,
    minPrice: minimumByServer.get(serverName) ?? 0,
  }));
};

export const getAbsoluteMinPrice = (serverPrices: readonly ServerMinPrice[]) =>
  serverPrices.reduce(
    (minimum, { minPrice }) => minPrice > 0 && (minimum === 0 || minPrice < minimum) ? minPrice : minimum,
    0,
  );
