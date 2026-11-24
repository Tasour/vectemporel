/** Liste des favoris locaux : provinces et articles. */

import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { openProvince } from '@/features/library/openProvince';
import { collectionKey, useCollectionsStore } from '@/stores/collectionsStore';
import { useUIStore } from '@/stores/uiStore';
import type { CollectionEntry } from '@/features/library/types';
import { ROUTES } from '@/routes/routes';
import styles from './Library.module.css';

export interface CollectionsContentProps {
  onClose?: () => void;
}

export const CollectionsContent: React.FC<CollectionsContentProps> = ({ onClose }) => {
  const entries = useCollectionsStore((state) => state.entries);
  const remove = useCollectionsStore((state) => state.remove);
  const clear = useCollectionsStore((state) => state.clear);
  const openRightDrawer = useUIStore((state) => state.openRightDrawer);
  const navigate = useNavigate();
  const [status, setStatus] = useState('');

  const openEntry = async (entry: CollectionEntry) => {
    if (entry.kind === 'article') {
      openRightDrawer({ type: 'article', articleId: entry.id, articleTitle: entry.title });
      return;
    }
    setStatus('Chargement des données de l’année courante…');
    const message = await openProvince(entry.id, entry.title);
    setStatus(message ?? '');
  };

  const sorted = [...entries].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  const articleCount = sorted.filter((entry) => entry.kind === 'article').length;

  return (
    <div className={styles['panel']} data-testid="collections-content">
      <div className={styles['panelHeader']}>
        <div>
          <p className={styles['eyebrow']}>Sur cet appareil</p>
          <h3 className={styles['panelTitle']}>Collections</h3>
          <p className={styles['panelSubtitle']}>
            {sorted.length} élément(s) · {articleCount} article(s)
          </p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className={styles['empty']}>
          <p>Aucun favori pour le moment.</p>
          <button
            type="button"
            className={styles['button']}
            onClick={() => {
              onClose?.();
              void navigate(ROUTES.DISCOVER);
            }}
          >
            Découvrir des articles
          </button>
        </div>
      ) : (
        <>
          <div>
            {sorted.map((entry) => (
              <div key={entry.key} className={styles['collectionRow']} data-testid={`collection-${entry.kind}-${entry.id}`}>
                <div className={styles['collectionInfo']}>
                  <p className={styles['collectionTitle']}>{entry.title}</p>
                  <p className={styles['cardText']}>
                    {entry.kind === 'article' ? 'Article' : 'Province'} · {entry.subtitle || entry.continent}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles['button']}
                  onClick={() => {
                    void openEntry(entry);
                  }}
                  aria-label={`Ouvrir ${entry.title}`}
                >
                  Ouvrir
                </button>
                <button
                  type="button"
                  className={`${styles['iconButton'] ?? ''} ${styles['buttonDanger'] ?? ''}`}
                  onClick={() => remove(collectionKey(entry.kind, entry.id))}
                  aria-label={`Retirer ${entry.title} des collections`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={`${styles['button'] ?? ''} ${styles['buttonDanger'] ?? ''}`}
            onClick={clear}
          >
            Tout effacer
          </button>
        </>
      )}
      <p className={styles['status']} role="status" aria-live="polite">{status}</p>
    </div>
  );
};

export default CollectionsContent;
