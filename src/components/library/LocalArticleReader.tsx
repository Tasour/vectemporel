/** Lecteur d'article entièrement local. */

import React from 'react';
import { useArticle } from '@/features/library/useLibrary';
import { collectionKey, useCollectionsStore } from '@/stores/collectionsStore';
import styles from './Library.module.css';

export interface LocalArticleReaderProps {
  articleId: string | null;
}

function formatRange(from: number, to: number): string {
  const format = (year: number) =>
    year < 0 ? `${String(Math.abs(year))} av. J.-C.` : `${String(year)} ap. J.-C.`;
  return from === to ? format(from) : `${format(from)} — ${format(to)}`;
}

export const LocalArticleReader: React.FC<LocalArticleReaderProps> = ({ articleId }) => {
  const { article, loading, error } = useArticle(articleId);
  const entries = useCollectionsStore((state) => state.entries);
  const add = useCollectionsStore((state) => state.add);
  const remove = useCollectionsStore((state) => state.remove);

  if (!articleId) {
    return <p className={styles['notice']}>Sélectionnez un article pour le lire.</p>;
  }
  if (loading) {
    return <p className={styles['status']} role="status">Ouverture de l’article local…</p>;
  }
  if (error || !article) {
    return <p className={styles['notice']} role="alert">{error ?? 'Article introuvable.'}</p>;
  }

  const key = collectionKey('article', article.id);
  const saved = entries.some((entry) => entry.key === key);
  const continent = article.continents[0] ?? '';
  const epoch = article.epochs[0] ?? '';

  return (
    <article className={styles['reader']} data-testid="local-article-reader">
      <div>
        <p className={styles['eyebrow']}>{article.typeLabel} · {formatRange(article.from, article.to)}</p>
        <h3 className={styles['panelTitle']}>{article.title}</h3>
        {article.description ? <p className={styles['panelSubtitle']}>{article.description}</p> : null}
      </div>

      <div className={styles['readerMeta']}>
        <button
          type="button"
          className={`${styles['button'] ?? ''} ${saved ? styles['buttonDanger'] ?? '' : ''}`}
          onClick={() =>
            saved
              ? remove(key)
              : add({
                  key,
                  kind: 'article',
                  id: article.id,
                  title: article.title,
                  subtitle: article.typeLabel,
                  continent,
                  epoch,
                  addedAt: new Date().toISOString(),
                })
          }
          data-testid="article-collection-toggle"
        >
          {saved ? 'Retirer des collections' : 'Ajouter aux collections'}
        </button>
        {continent ? <span className={styles['badge']}>{continent}</span> : null}
        {epoch ? <span className={`${styles['badge'] ?? ''} ${styles['badgeMuted'] ?? ''}`}>{epoch}</span> : null}
      </div>

      {article.image ? (
        <figure>
          <img
            className={styles['readerImage']}
            src={`data:image/webp;base64,${article.image}`}
            alt={`Illustration de l’article ${article.title}`}
          />
          {article.imageCredit ? (
            <figcaption className={styles['readerCredit']}>
              Image : {article.imageCredit.artist} · {article.imageCredit.license} ·{' '}
              <a
                className={styles['link']}
                href={article.imageCredit.page}
                target="_blank"
                rel="noopener noreferrer"
              >
                Wikimedia Commons
              </a>
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      <p className={styles['readerText']}>{article.extract}</p>
      <p className={styles['readerCredit']}>
        Texte : Wikipédia ({article.articleLicense}).{' '}
        {article.source ? (
          <a className={styles['link']} href={article.source} target="_blank" rel="noopener noreferrer">
            Source
          </a>
        ) : null}
      </p>
    </article>
  );
};

export default LocalArticleReader;
