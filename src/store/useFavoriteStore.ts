import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoriteStore {
  favoriteIds: number[];
  toggleFavorite: (id: number) => void;
}

export const useFavoriteStore = create<FavoriteStore>()(
  persist(
    (set) => ({
      favoriteIds: [],
      toggleFavorite: (id) => set((state) => ({
        favoriteIds: state.favoriteIds.includes(id)
          ? state.favoriteIds.filter((favId) => favId !== id)
          : [...state.favoriteIds, id],
      })),
    }),
    {
      name: 'favoriteItems',
    }
  )
);
