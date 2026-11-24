/** Accès aux fichiers locaux du catalogue et des articles. Aucune URL externe. */

import type { Article, ArticleManifest, Catalog } from './types';

const BASE = './articles/';
const SAFE_ID = /^[A-Za-z0-9_.-]{1,120}$/;

export class LibraryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LibraryError';
  }
}

async function getJson<T>(file: string, signal?: AbortSignal): Promise<T> {
  const init: RequestInit = { cache: 'force-cache' };
  if (signal) init.signal = signal;
  let response: Response;
  try {
    response = await fetch(BASE + file, init);
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new LibraryError('Fichier local inaccessible.');
  }
  if (!response.ok) {
    throw new LibraryError(`Fichier local introuvable (${String(response.status)}).`);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new LibraryError('Fichier local illisible.');
  }
}

function isCatalog(value: unknown): value is Catalog {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Catalog>;
  return Array.isArray(candidate.groups) && Array.isArray(candidate.continents) && Array.isArray(candidate.epochs);
}

function isManifest(value: unknown): value is ArticleManifest {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ArticleManifest>;
  return Array.isArray(candidate.articles) && typeof candidate.count === 'number';
}

export async function loadCatalog(signal?: AbortSignal): Promise<Catalog> {
  const value = await getJson<unknown>('catalog.json', signal);
  if (!isCatalog(value)) throw new LibraryError('Catalogue local invalide.');
  return value;
}

export async function loadManifest(signal?: AbortSignal): Promise<ArticleManifest> {
  const value = await getJson<unknown>('MANIFEST.json', signal);
  if (!isManifest(value)) throw new LibraryError('Manifeste des articles invalide.');
  return value;
}

export async function loadArticle(id: string, signal?: AbortSignal): Promise<Article> {
  if (!SAFE_ID.test(id)) throw new LibraryError('Identifiant d’article invalide.');
  const value = await getJson<unknown>(`${id}.json`, signal);
  if (!value || typeof value !== 'object' || !('extract' in value)) {
    throw new LibraryError('Article local invalide.');
  }
  return value as Article;
}

export function groupIdForEntity(type: 'ruler' | 'culture' | 'religion', code: string): string {
  return `${type}-${code}`;
}
