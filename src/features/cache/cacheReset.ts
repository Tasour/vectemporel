/** Remet à zéro les données périmées lorsqu'un nouveau build est détecté. */

import { BUILD_VERSION } from '@/config/buildVersion';
import { useCollectionsStore, COLLECTIONS_STORAGE_KEY } from '@/stores/collectionsStore';
import { useDownloadStore, DOWNLOAD_STORAGE_KEY } from '@/stores/downloadStore';
import { useMapStore } from '@/stores/mapStore';
import { defaultState, UI_STORAGE_KEY, useUIStore } from '@/stores/uiStore';

const BUILD_KEY = 'vectemporel_build_id';

/** Retourne true lorsque l'application vient de changer de version. */
function readBuildVersion(): string {
  try {
    return localStorage.getItem(BUILD_KEY) ?? '';
  } catch {
    return '';
  }
}

export function resetStaleCache(): boolean {
  if (readBuildVersion() === BUILD_VERSION) return false;

  for (const key of [UI_STORAGE_KEY, COLLECTIONS_STORAGE_KEY, DOWNLOAD_STORAGE_KEY]) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Stockage indisponible : les états mémoire sont réinitialisés ci-dessous.
    }
  }

  useUIStore.setState({ ...defaultState });
  useCollectionsStore.getState().clear();
  useDownloadStore.getState().clear();
  // Aborter d'abord : sinon la réponse en vol se voit opposer un contrôleur
  // remis à null et est silencieusement jetée (carte vide au premier chargement).
  useMapStore.getState().cancelAreaDataRequest();
  useMapStore.setState({
    areaDataCache: new Map(),
    currentAreaData: null,
    isLoadingAreaData: false,
    areaDataAbortController: null,
  });

  try {
    localStorage.setItem(BUILD_KEY, BUILD_VERSION);
  } catch {
    // Le reset mémoire reste effectif même sans persistance de la version.
  }
  return true;
}
