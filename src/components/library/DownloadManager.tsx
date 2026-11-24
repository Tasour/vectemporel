/** Panneau de sélection hiérarchique : continent → époque → groupe → provinces. */

import React, { useCallback, useMemo, useState } from 'react';
import { effectiveGroupIds, groupSelectionKey, itemSelectionKey } from '@/features/library/selection';
import { useLibraryData } from '@/features/library/useLibrary';
import type { CatalogGroup, DownloadKey } from '@/features/library/types';
import { useDownloadStore } from '@/stores/downloadStore';
import styles from './Library.module.css';

interface TriStateCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  label: string;
  onChange: () => void;
}

const TriStateCheckbox: React.FC<TriStateCheckboxProps> = ({
  checked,
  indeterminate = false,
  label,
  onChange,
}) => {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      className={styles['checkbox']}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
    />
  );
};

interface TreeGroupProps {
  group: CatalogGroup;
  selected: ReadonlySet<DownloadKey>;
  available: ReadonlySet<string>;
  expanded: boolean;
  onToggleGroup: (group: CatalogGroup) => void;
  onToggleItem: (group: CatalogGroup, item: string) => void;
  onToggleExpand: (key: string) => void;
}

const TreeGroup: React.FC<TreeGroupProps> = ({
  group,
  selected,
  available,
  expanded,
  onToggleGroup,
  onToggleItem,
  onToggleExpand,
}) => {
  const groupKey = groupSelectionKey(group.id);
  return (
    <div className={styles['treeLevel']} data-testid={`download-group-${group.id}`}>
      <div className={styles['treeRow']}>
        <TriStateCheckbox
          checked={selected.has(groupKey)}
          label={`Sélectionner la fiche ${group.title}`}
          onChange={() => onToggleGroup(group)}
        />
        <button
          type="button"
          className={styles['treeToggle']}
          onClick={() => onToggleExpand(`g:${group.id}`)}
          aria-expanded={expanded}
        >
          {group.title}
        </button>
        <span className={styles['treeCount']}>
          {available.has(group.id) ? 'Disponible' : 'À préparer'} · {group.itemCount}
        </span>
      </div>
      {expanded ? (
        <div className={styles['itemList']}>
          {group.items.map((item) => {
            const key = itemSelectionKey(group.id, item);
            return (
              <label
                key={key}
                className={`${styles['itemChip'] ?? ''} ${selected.has(key) ? styles['itemChipActive'] ?? '' : ''}`}
              >
                <input
                  className={styles['checkbox']}
                  type="checkbox"
                  checked={selected.has(key)}
                  onChange={() => onToggleItem(group, item)}
                  aria-label={`Sélectionner la province ${item}`}
                />
                {item}
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export const DownloadManager: React.FC = () => {
  const { catalog, manifest, loading, error } = useLibraryData();
  const selected = useDownloadStore((state) => state.selected);
  const selectMany = useDownloadStore((state) => state.selectMany);
  const removeMany = useDownloadStore((state) => state.removeMany);
  const clear = useDownloadStore((state) => state.clear);
  const [continent, setContinent] = useState('');
  const [epoch, setEpoch] = useState('');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [visibleGroups, setVisibleGroups] = useState(60);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const available = useMemo(
    () => new Set((manifest?.articles ?? []).map((article) => article.id)),
    [manifest],
  );
  const normalizedQuery = query.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  const groups = useMemo(
    () =>
      (catalog?.groups ?? []).filter((group) => {
        if (continent && !group.continents.includes(continent)) return false;
        if (epoch && !group.epochs.includes(epoch)) return false;
        if (!normalizedQuery) return true;
        const haystack = `${group.title} ${group.items.join(' ')}`
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      }),
    [catalog, continent, epoch, normalizedQuery],
  );

  const targetGroups = useMemo(() => {
    if (!continent) return groups;
    return groups.filter((group) => group.continents.includes(continent));
  }, [groups, continent]);

  const selectedGroupIds = useMemo(() => effectiveGroupIds(selected), [selected]);
  const readyCount = selectedGroupIds.filter((id) => available.has(id)).length;
  const pendingCount = selectedGroupIds.length - readyCount;

  const toggleExpand = useCallback((key: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const applyKeys = useCallback(
    (keys: DownloadKey[]) => {
      const toAdd = keys.filter((key) => !selectedSet.has(key));
      if (toAdd.length) selectMany(toAdd);
      else removeMany(keys);
    },
    [removeMany, selectMany, selectedSet],
  );

  const onToggleGroup = useCallback(
    (group: CatalogGroup) => applyKeys([groupSelectionKey(group.id)]),
    [applyKeys],
  );
  const onToggleItem = useCallback(
    (group: CatalogGroup, item: string) => applyKeys([itemSelectionKey(group.id, item)]),
    [applyKeys],
  );

  const continentRows = useMemo(() => {
    const rows = new Map<string, CatalogGroup[]>();
    for (const group of groups) {
      for (const id of group.continents) {
        const list = rows.get(id) ?? [];
        list.push(group);
        rows.set(id, list);
      }
    }
    return [...rows.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  }, [groups]);

  const epochRows = useMemo(() => {
    if (!continent) return [];
    const ids = new Set<string>();
    for (const group of groups) {
      if (group.continents.includes(continent)) for (const id of group.epochs) ids.add(id);
    }
    return (catalog?.epochs ?? []).filter((item) => ids.has(item.id));
  }, [catalog, continent, groups]);

  const visible = targetGroups.slice(0, visibleGroups);
  const allSelected = targetGroups.length > 0 && targetGroups.every((group) => selectedSet.has(groupSelectionKey(group.id)));
  const someSelected = targetGroups.some((group) => selectedSet.has(groupSelectionKey(group.id)));

  const exportSelection = () => {
    const payload = {
      catalogue: catalog?.meta.version ?? '',
      selection: selected,
      groupIds: selectedGroupIds,
      generatedAt: new Date().toISOString(),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'vectemporel-selection.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles['panel']} data-testid="download-manager">
      <div className={styles['panelHeader']}>
        <div>
          <p className={styles['eyebrow']}>Bibliothèque locale</p>
          <h3 className={styles['panelTitle']}>Téléchargements</h3>
          <p className={styles['panelSubtitle']}>
            Choisissez un continent, une époque, un groupe ou des provinces. Une province sélectionne la fiche de son groupe.
          </p>
        </div>
      </div>

      <div className={styles['searchRow']}>
        <input
          className={styles['input']}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setVisibleGroups(60);
          }}
          placeholder="Rechercher un peuple, un souverain, une province…"
          aria-label="Rechercher dans le catalogue"
        />
        <select
          className={styles['select']}
          value={continent}
          onChange={(event) => {
            setContinent(event.target.value);
            setEpoch('');
            setVisibleGroups(60);
          }}
          aria-label="Filtrer par continent"
        >
          <option value="">Tous les continents</option>
          {(catalog?.continents ?? []).map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </div>

      {continent ? (
        <select
          className={styles['select']}
          value={epoch}
          onChange={(event) => {
            setEpoch(event.target.value);
            setVisibleGroups(60);
          }}
          aria-label="Filtrer par époque"
        >
          <option value="">Toutes les époques</option>
          {epochRows.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      ) : null}

      <div className={styles['tree']}>
        {continentRows.map(([continentId, continentGroups]) => {
          const continentExpanded = expanded.has(`c:${continentId}`);
          const continentKeys = continentGroups.map((group) => groupSelectionKey(group.id));
          const continentSelected = continentKeys.length > 0 && continentKeys.every((key) => selectedSet.has(key));
          const nestedEpochs = (catalog?.epochs ?? []).filter((item) =>
            continentGroups.some((group) => group.epochs.includes(item.id)),
          );
          return (
            <div key={continentId} className={styles['treeLevel']} data-testid={`download-continent-${continentId}`}>
              <div className={styles['treeRow']}>
                <TriStateCheckbox
                  checked={continentSelected}
                  indeterminate={!continentSelected && continentKeys.some((key) => selectedSet.has(key))}
                  label={`Sélectionner tout le continent ${continentId}`}
                  onChange={() => applyKeys(continentKeys)}
                />
                <button
                  type="button"
                  className={styles['treeToggle']}
                  onClick={() => toggleExpand(`c:${continentId}`)}
                  aria-expanded={continentExpanded}
                >
                  {catalog?.continents.find((item) => item.id === continentId)?.label ?? continentId}
                </button>
                <span className={styles['treeCount']}>{continentGroups.length} groupes</span>
              </div>
              {continentExpanded ? (
                <div className={styles['treeLevelNested']}>
                  {nestedEpochs.map((item) => {
                    const epochExpanded = expanded.has(`e:${continentId}:${item.id}`);
                    const epochGroups = continentGroups.filter((group) => group.epochs.includes(item.id));
                    const epochKeys = epochGroups.map((group) => groupSelectionKey(group.id));
                    const epochSelected = epochKeys.length > 0 && epochKeys.every((key) => selectedSet.has(key));
                    return (
                      <div key={item.id} className={styles['treeLevel']} data-testid={`download-epoch-${item.id}`}>
                        <div className={styles['treeRow']}>
                          <TriStateCheckbox
                            checked={epochSelected}
                            indeterminate={!epochSelected && epochKeys.some((key) => selectedSet.has(key))}
                            label={`Sélectionner toute l'époque ${item.label} en ${continentId}`}
                            onChange={() => applyKeys(epochKeys)}
                          />
                          <button
                            type="button"
                            className={styles['treeToggle']}
                            onClick={() => toggleExpand(`e:${continentId}:${item.id}`)}
                            aria-expanded={epochExpanded}
                          >
                            {item.label}
                          </button>
                          <span className={styles['treeCount']}>{epochGroups.length}</span>
                        </div>
                        {epochExpanded ? (
                          <div className={styles['treeLevelNested']}>
                            {epochGroups.slice(0, visibleGroups).map((group) => (
                              <TreeGroup
                                key={group.id}
                                group={group}
                                selected={selectedSet}
                                available={available}
                                expanded={expanded.has(`g:${group.id}`)}
                                onToggleGroup={onToggleGroup}
                                onToggleItem={onToggleItem}
                                onToggleExpand={toggleExpand}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {visible.length > 0 && continent ? (
        <button
          type="button"
          className={styles['button']}
          onClick={() => setVisibleGroups((value) => value + 60)}
        >
          Afficher plus de groupes ({visible.length}/{targetGroups.length})
        </button>
      ) : null}

      {!loading && groups.length === 0 ? (
        <p className={styles['empty']}>Aucun groupe ne correspond à ces filtres.</p>
      ) : null}
      {error ? <p className={styles['notice']} role="alert">{error}</p> : null}
      {loading ? <p className={styles['status']} role="status">Lecture du catalogue local…</p> : null}

      <div className={styles['notice']}>
        <strong>{selectedGroupIds.length}</strong> fiche(s) sélectionnée(s) ·{' '}
        <strong>{readyCount}</strong> prête(s) localement · <strong>{pendingCount}</strong> à préparer · estimation ~{selectedGroupIds.length * 28} Ko
        <div className={styles['readerMeta']}>
          <button
            type="button"
            className={styles['button']}
            onClick={() => applyKeys(targetGroups.map((group) => groupSelectionKey(group.id)))}
            disabled={allSelected}
          >
            {allSelected ? 'Sélection complète' : someSelected ? 'Compléter la sélection' : 'Tout prendre ici'}
          </button>
          <button type="button" className={styles['button']} onClick={exportSelection} disabled={!selectedGroupIds.length}>
            Exporter la sélection
          </button>
          <button type="button" className={`${styles['button'] ?? ''} ${styles['buttonDanger'] ?? ''}`} onClick={clear} disabled={!selected.length}>
            Effacer
          </button>
        </div>
      </div>
      <p className={styles['status']} role="status" aria-live="polite">
        Sélection enregistrée sur cet appareil.
      </p>
    </div>
  );
};

export default DownloadManager;
