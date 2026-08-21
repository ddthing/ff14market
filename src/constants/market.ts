/**
 * The supported market servers are a shared domain contract.
 * Keep the API id and the Korean display name together so a new server is
 * added once and every surface (header, rankings, and detail views) follows it.
 */
export const MARKET_SERVERS = [
  { id: 'Chocobo', name: '초코보' },
  { id: 'Moogle', name: '모그리' },
  { id: 'Carbuncle', name: '카벙클' },
  { id: 'Tonberry', name: '톤베리' },
  { id: 'Fenrir', name: '펜리르' },
] as const;

export type MarketServer = (typeof MARKET_SERVERS)[number]['id'];

export const MARKET_SERVER_NAMES = MARKET_SERVERS.map(({ name }) => name);

export const getMarketServerLabel = (server: string) =>
  MARKET_SERVERS.find((candidate) => candidate.id === server)?.name ?? server;
