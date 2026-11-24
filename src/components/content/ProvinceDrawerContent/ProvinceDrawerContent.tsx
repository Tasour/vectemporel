/**
 * ProvinceDrawerContent Component
 *
 * Displays detailed province information in the right drawer with
 * tabbed navigation matching the map tooltip categories:
 *   Ruler | Culture | Religion | Religion General
 *
 * Each tab shows the entity's color + name as a header, then embeds that
 * entity's Wikipedia article.
 */

import type React from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ProvinceDrawerContent.module.css';
import { formatPopulation } from '@/utils/formatUtils';
import { LocalArticleReader } from '@/components/library/LocalArticleReader';
import { useArticle } from '@/features/library/useLibrary';
import { collectionKey, useCollectionsStore } from '@/stores/collectionsStore';
import { useNavigationStore } from '@/stores/navigationStore';
import type { EntityMetadata, MetadataEntry, ProvinceData } from '@/api/types';
import { getEntityMetadata, getReligionGeneralMetadata } from './ProvinceDrawerContent.utils';

export interface ProvinceDrawerContentProps {
  /** Province ID (name) */
  provinceId: string;
  /** Province data tuple: [ruler, culture, religion, capital, population] */
  provinceData: ProvinceData;
  /** Entity metadata for colors and names */
  metadata: EntityMetadata | null;
  /** Optional Wikipedia URL for the province */
  wikiUrl?: string;
}

type TabId = 'ruler' | 'culture' | 'religion' | 'religionGeneral';

interface EntityTabConfig {
  id: TabId;
  dataIndex: number;
  metadataKey: keyof EntityMetadata;
  labelKey: string;
  labelFallback: string;
  icon: string;
  isDerived?: boolean;
}

const ENTITY_TABS: EntityTabConfig[] = [
  { id: 'ruler', dataIndex: 0, metadataKey: 'ruler', labelKey: 'map.ruler', labelFallback: 'Ruler', icon: '👑' },
  { id: 'culture', dataIndex: 1, metadataKey: 'culture', labelKey: 'map.culture', labelFallback: 'Culture', icon: '🎭' },
  { id: 'religion', dataIndex: 2, metadataKey: 'religion', labelKey: 'map.religion', labelFallback: 'Religion', icon: '⛪' },
  { id: 'religionGeneral', dataIndex: -1, metadataKey: 'religionGeneral', labelKey: 'map.religionGeneral', labelFallback: 'Religion Gen.', icon: '☯️', isDerived: true },
];

interface EntityRowProps {
  label: string;
  entry: MetadataEntry;
  icon: string;
}

const EntityRow: React.FC<EntityRowProps> = ({ label, entry, icon }) => (
  <div className={styles['entityRow']} data-testid="entity-row">
    <div
      className={styles['colorChip']}
      style={{ backgroundColor: entry.color }}
      data-testid="color-chip"
      aria-hidden="true"
    />
    <span className={styles['entityLabel']} data-testid="entity-label">
      {label}:
    </span>
    <span className={styles['entityName']} data-testid="entity-name">
      {entry.name}
    </span>
    <span className={styles['entityIcon']} data-testid="entity-icon" aria-hidden="true">
      {icon}
    </span>
  </div>
);

interface EntityArticlePanelProps {
  articleId: string | null;
  entityName: string;
}

const EntityArticlePanel: React.FC<EntityArticlePanelProps> = ({ articleId, entityName }) => {
  const { article } = useArticle(articleId);
  const openDrawer = useNavigationStore((state) => state.openDrawer);
  if (!articleId) {
    return <p className={styles['localNotice']}>Aucune fiche locale associée à « {entityName} ».</p>;
  }
  if (!article) {
    return (
      <>
        <p className={styles['localNotice']}>
          La fiche locale de « {entityName} » n’est pas encore téléchargée.
        </p>
        <button
          type="button"
          className={styles['localButton']}
          onClick={() => openDrawer('downloads')}
        >
          Ouvrir les téléchargements
        </button>
      </>
    );
  }
  return <LocalArticleReader articleId={articleId} />;
};

export const ProvinceDrawerContent: React.FC<ProvinceDrawerContentProps> = ({
  provinceId,
  provinceData,
  metadata,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('ruler');
  const entries = useCollectionsStore((state) => state.entries);
  const addCollection = useCollectionsStore((state) => state.add);
  const removeCollection = useCollectionsStore((state) => state.remove);

  const [, , religionId, , population] = provinceData;
  const formattedPopulation = formatPopulation(population);
  const religionGeneralEntry = getReligionGeneralMetadata(religionId, metadata);

  // Precompute entity entries and their local article identifiers.
  const entityEntries = useMemo(() => {
    return ENTITY_TABS.map((cfg) => {
      if (cfg.isDerived) {
        return {
          cfg,
          entityId: religionGeneralEntry.name,
          entry: religionGeneralEntry,
          articleId: null,
        };
      }
      const entityId = provinceData[cfg.dataIndex] as string;
      const entry = getEntityMetadata(entityId, cfg.metadataKey, metadata);
      const articleId = entityId ? `${cfg.id}-${entityId}` : null;
      return { cfg, entityId, entry, articleId };
    });
  }, [provinceData, metadata, religionGeneralEntry]);

  const tabLabel = (id: TabId): string => {
    const cfg = ENTITY_TABS.find(tab => tab.id === id);
    return cfg ? t(cfg.labelKey, cfg.labelFallback) : id;
  };

  const TAB_ORDER: TabId[] = ['ruler', 'culture', 'religion', 'religionGeneral'];

  const renderTabPanel = (): React.ReactNode => {
    const found = entityEntries.find((e) => e.cfg.id === activeTab);
    if (!found) return null;
    const { entry, articleId, cfg } = found;
    return (
      <>
        <section className={styles['entitySection']} aria-label={`${tabLabel(activeTab)} details`}>
          <EntityRow label={t(cfg.labelKey, cfg.labelFallback)} entry={entry} icon={cfg.icon} />
          <div className={styles['populationRow']} data-testid="population-row">
            <span className={styles['populationLabel']}>
              {provinceId}
            </span>
            <span className={styles['populationValue']} data-testid="population-value">
              {formattedPopulation}
            </span>
          </div>
        </section>
        <section
          className={styles['articleSection']}
          data-testid="article-section"
          aria-label={`Fiche locale pour ${entry.name}`}
        >
          <EntityArticlePanel articleId={articleId} entityName={entry.name} />
        </section>
      </>
    );
  };

  const provinceKey = collectionKey('province', provinceId);
  const provinceSaved = entries.some((entry) => entry.key === provinceKey);

  return (
    <div className={styles['container']} data-testid="province-drawer-content">
      <div className={styles['entitySection']}>
        <button
          type="button"
          className={styles['localButton']}
          data-testid="province-collection-toggle"
          onClick={() =>
            provinceSaved
              ? removeCollection(provinceKey)
              : addCollection({
                  key: provinceKey,
                  kind: 'province',
                  id: provinceId,
                  title: provinceId,
                  subtitle: 'Province',
                  continent: '',
                  epoch: '',
                  addedAt: new Date().toISOString(),
                })
          }
        >
          {provinceSaved ? 'Retirer des collections' : 'Ajouter aux collections'}
        </button>
      </div>
      <div
        role="tablist"
        aria-label="Province information tabs"
        className={styles['tabList']}
        data-testid="province-tabs"
      >
        {TAB_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`tab-panel-${id}`}
            id={`tab-${id}`}
            className={`${styles['tabButton'] ?? ''} ${activeTab === id ? (styles['tabButtonActive'] ?? '') : ''}`}
            onClick={() => setActiveTab(id)}
            data-testid={`province-tab-${id}`}
          >
            {tabLabel(id)}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`tab-panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className={styles['tabPanel']}
      >
        {renderTabPanel()}
      </div>
    </div>
  );
};

export default ProvinceDrawerContent;
