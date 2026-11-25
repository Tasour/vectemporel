/** Construit un paquet local téléchargeable à partir des fiches sélectionnées. */

import { loadArticle } from './libraryApi';
import type { ArticleManifest } from './types';

export interface DownloadBundleOptions {
  groupIds: readonly string[];
  manifest: ArticleManifest;
  locale: string;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

export interface DownloadBundle {
  filename: string;
  blob: Blob;
  count: number;
}

/** Les articles locaux contiennent déjà leurs vignettes et crédits en data URL. */
export async function buildDownloadBundle({
  groupIds,
  manifest,
  locale,
  onProgress,
  signal,
}: DownloadBundleOptions): Promise<DownloadBundle> {
  const ids = new Set(groupIds);
  const targets = manifest.articles.filter((article) => ids.has(article.id));
  if (targets.length === 0) throw new Error('Aucune fiche disponible localement.');

  const articles = [];
  for (const [index, target] of targets.entries()) {
    if (signal?.aborted) throw new DOMException('Téléchargement annulé', 'AbortError');
    try {
      articles.push(await loadArticle(target.id, signal));
    } catch {
      // Une fiche absente du miroir est consignée sans bloquer les autres.
    }
    onProgress?.(index + 1, targets.length);
  }
  if (articles.length === 0) throw new Error('Aucun fichier d’article lisible.');

  const payload = {
    schema: 1,
    locale,
    generatedAt: new Date().toISOString(),
    source: manifest.source,
    catalogue: manifest.date,
    count: articles.length,
    articles,
  };
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    filename: `vectemporel-${locale}-articles-${String(articles.length)}-${stamp}.json`,
    blob: new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    count: articles.length,
  };
}

/** Déclenche le téléchargement navigateur d'un paquet déjà construit. */
export function saveBundle(bundle: DownloadBundle): void {
  const url = URL.createObjectURL(bundle.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = bundle.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
