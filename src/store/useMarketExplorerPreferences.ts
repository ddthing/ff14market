import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_MARKET_EXPLORER_PREFERENCES,
  normalizeMarketExplorerPreferences,
  type MarketExplorerPreferences,
  type MarketPageSize,
  type MarketSort,
} from '../utils/marketExplorer';

interface MarketExplorerPreferenceStore extends MarketExplorerPreferences {
  setQuery: (query: string) => void;
  setCategory: (category: string) => void;
  setSort: (sort: MarketSort) => void;
  setFavoritesOnly: (favoritesOnly: boolean) => void;
  setPageSize: (pageSize: MarketPageSize) => void;
  resetPreferences: () => void;
}

export const useMarketExplorerPreferences = create<MarketExplorerPreferenceStore>()(
  persist(
    (set) => ({
      ...DEFAULT_MARKET_EXPLORER_PREFERENCES,
      setQuery: (query) => set({ query }),
      setCategory: (category) => set({ category }),
      setSort: (sort) => set({ sort }),
      setFavoritesOnly: (favoritesOnly) => set({ favoritesOnly }),
      setPageSize: (pageSize) => set({ pageSize }),
      resetPreferences: () => set({ ...DEFAULT_MARKET_EXPLORER_PREFERENCES }),
    }),
    {
      name: 'marketExplorerPreferences',
      version: 1,
      partialize: ({ query, category, sort, favoritesOnly, pageSize }) => ({
        query,
        category,
        sort,
        favoritesOnly,
        pageSize,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizeMarketExplorerPreferences(persistedState),
      }),
    },
  ),
);
