/** Action partagée entre la sidebar desktop et la barre mobile. */

import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useMapStore } from '@/stores/mapStore';
import { useNavigationStore } from '@/stores/navigationStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useUIStore } from '@/stores/uiStore';
import type { NavItemConfig } from './navConfig';

export function useNavItemAction(): (item: NavItemConfig) => void {
  const navigate = useNavigate();
  const { toggleDrawer } = useNavigationStore();
  const { setSidebarOpen, openRightDrawer } = useUIStore();

  return useCallback(
    (item: NavItemConfig) => {
      setSidebarOpen(false);

      if (item.to) {
        void navigate(item.to);
        return;
      }

      switch (item.action) {
        case 'layers':
        case 'collections':
        case 'settings':
          toggleDrawer(item.action);
          break;
        case 'random': {
          void (async () => {
            const year = useTimelineStore.getState().selectedYear;
            let data = useMapStore.getState().currentAreaData;
            if (!data) {
              await useMapStore.getState().loadAreaData(year);
              data = useMapStore.getState().currentAreaData;
            }
            const keys = Object.keys(data ?? {});
            if (!keys.length) return;
            const random = new Uint32Array(1);
            crypto.getRandomValues(random);
            const provinceId = keys[(random[0] ?? 0) % keys.length];
            if (provinceId) {
              openRightDrawer({ type: 'area', provinceId, provinceName: provinceId });
            }
          })();
          break;
        }
        case 'play': {
          const timeline = useTimelineStore.getState();
          if (timeline.isAutoplayActive) timeline.stopAutoplay();
          else timeline.toggleAutoplayMenu();
          break;
        }
        case 'help':
        case 'info':
          useUIStore.getState().openInfoDialog();
          break;
        default:
          break;
      }
    },
    [navigate, openRightDrawer, setSidebarOpen, toggleDrawer],
  );
}

export default useNavItemAction;
