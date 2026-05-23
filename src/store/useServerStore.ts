import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ServerStore {
  server: string;
  setServer: (server: string) => void;
}

export const useServerStore = create<ServerStore>()(
  persist(
    (set) => ({
      server: 'Chocobo',
      setServer: (server) => set({ server }),
    }),
    {
      name: 'ff14-server',
    }
  )
);
