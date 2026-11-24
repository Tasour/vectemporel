/** Sélection persistée du panneau Téléchargements. */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { sanitizeSelection } from '@/features/library/selection';
import type { DownloadKey } from '@/features/library/types';

export interface DownloadState {
  selected: DownloadKey[];
}

export interface DownloadActions {
  toggle: (key: DownloadKey) => void;
  selectMany: (keys: DownloadKey[]) => void;
  removeMany: (keys: DownloadKey[]) => void;
  clear: () => void;
}

export type DownloadStore = DownloadState & DownloadActions;

const STORAGE_KEY = 'vectemporel_downloads';

export const useDownloadStore = create<DownloadStore>()(
  persist(
    (set) => ({
      selected: [],
      toggle: (key) =>
        set((state) => ({
          selected: state.selected.includes(key)
            ? state.selected.filter((value) => value !== key)
            : sanitizeSelection([...state.selected, key]),
        })),
      selectMany: (keys) =>
        set((state) => ({ selected: sanitizeSelection([...state.selected, ...keys]) })),
      removeMany: (keys) => {
        const remove = new Set(keys);
        set((state) => ({
          selected: state.selected.filter((key) => !remove.has(key)),
        }));
      },
      clear: () => set({ selected: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ selected: state.selected }),
      version: 1,
      merge: (persisted, current) => {
        const candidate = persisted as Partial<DownloadState> | undefined;
        return { ...current, selected: sanitizeSelection(candidate?.selected) };
      },
    },
  ),
);

export { STORAGE_KEY as DOWNLOAD_STORAGE_KEY };
