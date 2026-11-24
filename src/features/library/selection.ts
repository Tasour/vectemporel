/** Opérations pures sur la sélection hiérarchique de téléchargement. */

import type { DownloadKey } from './types';

const MAX_SELECTION = 2500;

export function groupSelectionKey(groupId: string): DownloadKey {
  return `g:${groupId}`;
}

export function itemSelectionKey(groupId: string, item: string): DownloadKey {
  return `i:${groupId}:${item}`;
}

export function isDownloadKey(value: unknown): value is DownloadKey {
  if (typeof value !== 'string' || value.length < 3 || value.length > 300) return false;
  return value.startsWith('g:') || value.startsWith('i:');
}

export function sanitizeSelection(values: unknown): DownloadKey[] {
  if (!Array.isArray(values)) return [];
  const result: DownloadKey[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!isDownloadKey(value) || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
    if (result.length >= MAX_SELECTION) break;
  }
  return result;
}

/** Une province sélectionnée entraîne la fiche du groupe auquel elle appartient. */
export function effectiveGroupIds(selection: readonly DownloadKey[]): string[] {
  const ids = new Set<string>();
  for (const key of selection) {
    if (key.startsWith('g:')) {
      const id = key.slice(2);
      if (id) ids.add(id);
      continue;
    }
    const rest = key.slice(2);
    const separator = rest.indexOf(':');
    if (separator > 0) ids.add(rest.slice(0, separator));
  }
  return [...ids].sort((a, b) => a.localeCompare(b, 'fr'));
}

export function selectionDifference(
  current: readonly DownloadKey[],
  next: readonly DownloadKey[],
): DownloadKey[] {
  const before = new Set(current);
  return next.filter((key) => !before.has(key));
}
