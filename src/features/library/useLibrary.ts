/** Hooks de chargement du catalogue local et des articles. */
/* eslint-disable react-hooks/set-state-in-effect -- synchronisation explicite avec AbortController */

import { useEffect, useState } from 'react';
import { LibraryError, loadArticle, loadCatalog, loadManifest } from './libraryApi';
import type { Article, ArticleManifest, Catalog } from './types';

const MAX_CACHED_ARTICLES = 20;
const articleCache = new Map<string, Article>();

function cacheArticle(article: Article): void {
  articleCache.delete(article.id);
  articleCache.set(article.id, article);
  while (articleCache.size > MAX_CACHED_ARTICLES) {
    const oldest = articleCache.keys().next().value;
    if (oldest === undefined) break;
    articleCache.delete(oldest);
  }
}

export interface LibraryData {
  catalog: Catalog | null;
  manifest: ArticleManifest | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useLibraryData(): LibraryData {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [manifest, setManifest] = useState<ArticleManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([loadCatalog(controller.signal), loadManifest(controller.signal)])
      .then(([nextCatalog, nextManifest]) => {
        if (cancelled) return;
        setCatalog(nextCatalog);
        setManifest(nextManifest);
      })
      .catch((reason: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        setError(reason instanceof LibraryError ? reason.message : 'Chargement local impossible.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [attempt]);

  return {
    catalog,
    manifest,
    loading,
    error,
    reload: () => setAttempt((value) => value + 1),
  };
}

export interface ArticleState {
  article: Article | null;
  loading: boolean;
  error: string | null;
}

export function useArticle(id: string | null): ArticleState {
  const [state, setState] = useState<ArticleState>(() => ({
    article: id ? articleCache.get(id) ?? null : null,
    loading: Boolean(id && !articleCache.has(id)),
    error: null,
  }));

  useEffect(() => {
    if (!id) {
      setState({ article: null, loading: false, error: null });
      return undefined;
    }
    const cached = articleCache.get(id);
    if (cached) {
      setState({ article: cached, loading: false, error: null });
      return undefined;
    }
    const controller = new AbortController();
    let cancelled = false;
    setState({ article: null, loading: true, error: null });
    loadArticle(id, controller.signal)
      .then((article) => {
        if (cancelled) return;
        cacheArticle(article);
        setState({ article, loading: false, error: null });
      })
      .catch((reason: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        setState({
          article: null,
          loading: false,
          error: reason instanceof LibraryError ? reason.message : 'Article local illisible.',
        });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id]);

  return state;
}
