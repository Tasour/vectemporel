/** Actions partagées entre la timeline et la barre basse. */

import { useCallback } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';

export interface TimelineQuickControls {
  isExpanded: boolean;
  isDefaultView: boolean;
  isSearchOpen: boolean;
  isAutoplayMenuOpen: boolean;
  isAutoplayActive: boolean;
  toggleExpand: () => void;
  reset: () => void;
  toggleSearch: () => void;
  toggleAutoplay: () => void;
}

export function useTimelineQuickControls(): TimelineQuickControls {
  const isExpanded = useTimelineStore((state) => state.isExpanded);
  const isDefaultView = useTimelineStore((state) => state.isDefaultView);
  const isSearchOpen = useTimelineStore((state) => state.isSearchOpen);
  const isAutoplayMenuOpen = useTimelineStore((state) => state.isAutoplayMenuOpen);
  const isAutoplayActive = useTimelineStore((state) => state.isAutoplayActive);

  const toggleExpand = useCallback(() => {
    useTimelineStore.getState().toggleExpanded();
  }, []);

  const reset = useCallback(() => {
    const state = useTimelineStore.getState();
    state.setYear(1000);
    state.resetView();
    state.requestCenterOnYear(1000);
  }, []);

  const toggleSearch = useCallback(() => {
    useTimelineStore.getState().toggleSearch();
  }, []);

  const toggleAutoplay = useCallback(() => {
    const state = useTimelineStore.getState();
    if (state.isAutoplayActive) state.stopAutoplay();
    else state.toggleAutoplayMenu();
  }, []);

  return {
    isExpanded,
    isDefaultView,
    isSearchOpen,
    isAutoplayMenuOpen,
    isAutoplayActive,
    toggleExpand,
    reset,
    toggleSearch,
    toggleAutoplay,
  };
}

export default useTimelineQuickControls;
