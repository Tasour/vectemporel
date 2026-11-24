/** Favoris locaux : provinces et articles, persistés en localStorage. */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CollectionEntry } from '@/features/library/types';

export interface CollectionsState {
  entries: CollectionEntry[];
}

export interface CollectionsActions {
  add: (entry: CollectionEntry) => void;
  remove: (key: string) => void;
  clear: () => void;
}

export type CollectionsStore = CollectionsState & CollectionsActions;

const STORAGE_KEY = 'vectemporel_collections';
const MAX_ENTRIES = 500;

export function collectionKey(kind: CollectionEntry['kind'], id: string): string {
  return `${kind}:${id}`;
}

function isValidEntry(value: unknown): value is CollectionEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<CollectionEntry>;
  return (
    typeof entry.key === 'string' &&
    typeof entry.id === 'string' &&
    (entry.kind === 'article' || entry.kind === 'province') &&
    typeof entry.title === 'string' &&
    typeof entry.subtitle === 'string' &&
    typeof entry.continent === 'string' &&
    typeof entry.epoch === 'string' &&
    typeof entry.addedAt === 'string'
  );
}

export function sanitizeEntries(values: unknown): CollectionEntry[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const result: CollectionEntry[] = [];
  for (const value of values) {
    if (!isValidEntry(value) || seen.has(value.key)) continue;
    seen.add(value.key);
    result.push(value);
    if (result.length >= MAX_ENTRIES) break;
  }
  return result;
}

export const useCollectionsStore = create<CollectionsStore>()(
  persist(
    (set) => ({
      entries: [],
      add: (entry) =>
        set((state) => ({
          entries: sanitizeEntries([entry, ...state.entries.filter((item) => item.key !== entry.key)]),
        })),
      remove: (key) =>
        set((state) => ({ entries: state.entries.filter((entry) => entry.key !== key) })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ entries: state.entries }),
      version: 1,
      merge: (persisted, current) => {
        const candidate = persisted as Partial<CollectionsState> | undefined;
        return { ...current, entries: sanitizeEntries(candidate?.entries) };
      },
    },
  ),
);

export { STORAGE_KEY as COLLECTIONS_STORAGE_KEY };
