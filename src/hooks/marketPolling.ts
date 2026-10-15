export const MARKET_POLL_INTERVAL_MS = 30_000;

export type MarketQueryFetchStatus = 'idle' | 'fetching' | 'paused';

/** Schedule the next poll only after the current request has settled. */
export const getMarketPollInterval = (fetchStatus: MarketQueryFetchStatus): number | false =>
  fetchStatus === 'idle' ? MARKET_POLL_INTERVAL_MS : false;
