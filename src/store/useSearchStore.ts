import { create } from 'zustand';

interface SearchStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

/**
 * Search is transient UI state, so it should not survive a page reload.
 * Keeping it outside the header lets every screen offer the same entry point.
 */
export const useSearchStore = create<SearchStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
