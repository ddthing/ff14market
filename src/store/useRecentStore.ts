import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecentStore {
  recentIds: number[];
  addRecentId: (id: number) => void;
}

const MAX_RECENT_ITEMS = 5;

export const useRecentStore = create<RecentStore>()(
  persist(
    (set) => ({
      recentIds: [],
      addRecentId: (id) => set((state) => {
        // Remove the id if it already exists to move it to the front
        const filteredIds = state.recentIds.filter((recentId) => recentId !== id);
        // Add to the front
        const newIds = [id, ...filteredIds];
        // Keep only max items
        return { recentIds: newIds.slice(0, MAX_RECENT_ITEMS) };
      }),
    }),
    {
      name: 'recent-view-storage',
    }
  )
);
