/** Vue Découvrir : onglets Articles, Époques, Régions, alimentés par le miroir local. */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { formatRange } from '@/features/library/format';
import { openProvince } from '@/features/library/openProvince';
import { useLibraryData } from '@/features/library/useLibrary';
import type { CatalogGroup, ManifestArticle } from '@/features/library/types';
import { useNavigationStore } from '@/stores/navigationStore';
import { useUIStore } from '@/stores/uiStore';
import styles from './Library.module.css';

type TabId = 'articles' | 'epochs' | 'regions';

const TABS: { id: TabId; label: string }[] = [
  { id: 'articles', label: 'Articles' },
  { id: 'epochs', label: 'Époques' },
  { id: 'regions', label: 'Régions' },
];

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export const DiscoverPage: React.FC = () => {
  const navigate = useNavigate();
  const { catalog, manifest, loading, error } = useLibraryData();
  const openRightDrawer = useUIStore((state) => state.openRightDrawer);
  const openDrawer = useNavigationStore((state) => state.openDrawer);
  const closeDrawer = useNavigationStore((state) => state.closeDrawer);
  const [tab, setTab] = useState<TabId>('articles');
  const [query, setQuery] = useState('');
  const [continent, setContinent] = useState('');
  const [epoch, setEpoch] = useState('');
  const [visibleGroups, setVisibleGroups] = useState(80);
  const [status, setStatus] = useState('');

  const articles = useMemo(() => {
    const needle = normalize(query);
    return (manifest?.articles ?? []).filter((article) => {
      if (continent && !article.continents.includes(continent)) return false;
      if (epoch && !article.epochs.includes(epoch)) return false;
      if (!needle) return true;
      return normalize(`${article.title} ${article.label} ${article.description}`).includes(needle);
    });
  }, [continent, epoch, manifest, query]);

  const groups = useMemo(() => {
    const needle = normalize(query);
    return (catalog?.groups ?? []).filter((group) => {
      if (continent && !group.continents.includes(continent)) return false;
      if (epoch && !group.epochs.includes(epoch)) return false;
      if (!needle) return true;
      return normalize(`${group.title} ${group.items.join(' ')}`).includes(needle);
    });
  }, [catalog, continent, epoch, query]);

  const available = useMemo(
    () => new Set((manifest?.articles ?? []).map((article) => article.id)),
    [manifest],
  );

  const openArticle = (article: ManifestArticle) => {
    openRightDrawer({ type: 'article', articleId: article.id, articleTitle: article.title });
  };

  const openGroup = (group: CatalogGroup) => {
    if (available.has(group.id)) {
      const article = manifest?.articles.find((item) => item.id === group.id);
      if (article) {
        openArticle(article);
        return;
      }
    }
    openDrawer('downloads');
  };

  const openProvinceItem = async (item: string) => {
    setStatus(`Ouverture de ${item}…`);
    const message = await openProvince(item, item);
    setStatus(message ?? '');
  };

  const filteredArticlesByEpoch = (id: string) =>
    (manifest?.articles ?? []).filter((article) => article.epochs.includes(id));
  const filteredGroupsByEpoch = (id: string) =>
    (catalog?.groups ?? []).filter((group) => group.epochs.includes(id));

  return (
    <div className={styles['discover']} data-testid="discover-page">
      <div className={styles['panelHeader']}>
        <div>
          <p className={styles['eyebrow']}>Atlas local · hors ligne</p>
          <h1 className={styles['panelTitle']}>Découvrir</h1>
          <p className={styles['panelSubtitle']}>
            Explorer les fiches téléchargées, les époques et les régions du miroir Chronas.
          </p>
        </div>
        <div className={styles['readerMeta']}>
          <button type="button" className={styles['button']} onClick={() => openDrawer('downloads')}>
            Téléchargements
          </button>
          <button
            type="button"
            className={styles['button']}
            onClick={() => {
              closeDrawer();
              void navigate('/');
            }}
            aria-label="Fermer Découvrir"
          >
            Fermer
          </button>
        </div>
      </div>

      <div className={styles['tabs']} role="tablist" aria-label="Sections de Découvrir">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`${styles['tab'] ?? ''} ${tab === item.id ? styles['tabActive'] ?? '' : ''}`}
            onClick={() => setTab(item.id)}
            data-testid={`discover-tab-${item.id}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles['searchRow']}>
        <input
          aria-label="Rechercher dans Découvrir"
          className={styles['input']}
          type="search"
          value={query}
          placeholder="Rechercher dans le catalogue local"
          onChange={(event) => {
            setQuery(event.target.value);
            setVisibleGroups(80);
          }}
        />
        <select
          aria-label="Filtrer par continent"
          className={styles['select']}
          value={continent}
          onChange={(event) => setContinent(event.target.value)}
        >
          <option value="">Tous les continents</option>
          {(catalog?.continents ?? []).map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </div>

      <div className={styles['discoverBody']}>
        {loading ? <p className={styles['status']} role="status">Ouverture de la bibliothèque locale…</p> : null}
        {error ? <p className={styles['notice']} role="alert">{error}</p> : null}

        {tab === 'articles' ? (
          <section aria-label="Articles téléchargés">
            <div className={styles['readerMeta']}>
              <select
                aria-label="Filtrer les articles par époque"
                className={styles['select']}
                value={epoch}
                onChange={(event) => setEpoch(event.target.value)}
              >
                <option value="">Toutes les époques</option>
                {(catalog?.epochs ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
              <span className={styles['treeCount']}>{articles.length} article(s)</span>
            </div>
            <div className={styles['grid']} style={{ marginTop: 12 }}>
              {articles.map((article) => (
                <button
                  key={article.id}
                  type="button"
                  className={styles['cardButton']}
                  onClick={() => openArticle(article)}
                  data-testid={`discover-article-${article.id}`}
                >
                  <span className={styles['badge']}>{article.typeLabel}</span>
                  <h2 className={styles['cardTitle']}>{article.title}</h2>
                  <p className={styles['cardText']}>{article.description || article.label}</p>
                  <span className={styles['treeCount']}>
                    {article.itemCount} province(s){article.hasImage ? ' · image' : ''}
                  </span>
                </button>
              ))}
            </div>
            {!loading && articles.length === 0 ? (
              <p className={styles['empty']}>Aucun article ne correspond à ces filtres.</p>
            ) : null}
          </section>
        ) : null}

        {tab === 'epochs' ? (
          <section aria-label="Explorer par époque">
            <div className={styles['grid']}>
              {(catalog?.epochs ?? []).map((item) => {
                const selected = epoch === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    className={`${styles['cardButton'] ?? ''} ${selected ? styles['itemChipActive'] ?? '' : ''}`}
                    onClick={() => setEpoch(selected ? '' : item.id)}
                    data-testid={`discover-epoch-${item.id}`}
                  >
                    <h2 className={styles['cardTitle']}>{item.label}</h2>
                    <p className={styles['cardText']}>{formatRange(item.from, item.to)}</p>
                    <span className={styles['treeCount']}>
                      {filteredArticlesByEpoch(item.id).length} article(s) ·{' '}
                      {filteredGroupsByEpoch(item.id).length} groupe(s)
                    </span>
                  </button>
                );
              })}
            </div>
            {epoch ? (
              <div className={styles['notice']} style={{ marginTop: 12 }}>
                <p>Filtre actif : {(catalog?.epochs ?? []).find((item) => item.id === epoch)?.label ?? epoch}</p>
                <div className={styles['readerMeta']}>
                  <button type="button" className={styles['button']} onClick={() => setTab('articles')}>
                    Voir les articles
                  </button>
                  <button type="button" className={styles['button']} onClick={() => setTab('regions')}>
                    Voir les régions
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {tab === 'regions' ? (
          <section aria-label="Explorer par région">
            <div className={styles['grid']} style={{ marginTop: 12 }}>
              {groups.slice(0, visibleGroups).map((group) => (
                <article key={group.id} className={styles['card']} data-testid={`discover-region-${group.id}`}>
                  <div className={styles['readerMeta']}>
                    <span className={styles['badge']}>{group.typeLabel}</span>
                    <span className={available.has(group.id) ? styles['badge'] : `${styles['badge'] ?? ''} ${styles['badgeMuted'] ?? ''}`}>
                      {available.has(group.id) ? 'Fiche disponible' : 'Fiche à préparer'}
                    </span>
                  </div>
                  <h2 className={styles['cardTitle']}>{group.title}</h2>
                  <p className={styles['cardText']}>
                    {group.itemCount} province(s) · {formatRange(group.from, group.to)}
                  </p>
                  <div className={styles['readerMeta']}>
                    <button type="button" className={styles['button']} onClick={() => openGroup(group)}>
                      Ouvrir la fiche
                    </button>
                  </div>
                  <div className={styles['itemList']} style={{ padding: 0 }}>
                    {group.items.slice(0, 6).map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={styles['itemChip']}
                        onClick={() => void openProvinceItem(item)}
                        aria-label={`Ouvrir la province ${item}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            {groups.length > visibleGroups ? (
              <button type="button" className={styles['button']} onClick={() => setVisibleGroups((value) => value + 80)}>
                Afficher plus de régions ({visibleGroups}/{groups.length})
              </button>
            ) : null}
            {!loading && groups.length === 0 ? (
              <p className={styles['empty']}>Aucune région ne correspond à ces filtres.</p>
            ) : null}
          </section>
        ) : null}
      </div>

      <div className={styles['discoverFooter']}>
        <span role="status" aria-live="polite">{status}</span>
        <span>Catalogue : {catalog?.meta.count ?? 0} groupes · {manifest?.count ?? 0} fiches locales</span>
      </div>
    </div>
  );
};

export default DiscoverPage;
