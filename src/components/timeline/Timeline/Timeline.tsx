/**
 * Timeline Component
 *
 * Main container component for the timeline navigation bar.
 * Fixed at the bottom of the viewport with expandable height.
 * Uses React Portal to render outside the main DOM hierarchy.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 6.2, 6.4, 6.5
 */

import type React from 'react';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTimelineStore, fetchEpicCoordinates } from '../../../stores/timelineStore';
import type { EpicItem } from '../../../stores/timelineStore';
import { useUIStore } from '../../../stores/uiStore';
import { useMapStore } from '../../../stores/mapStore';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { dateToYear, formatYearForDisplay, MAX_YEAR, MIN_YEAR, yearToDate } from '../../../utils/yearUtils';
import { YEAR_MS } from '../VisTimelineWrapper/kinematics';
import { YearDialog } from '../YearDialog/YearDialog';
import { AutoplayMenu } from '../AutoplayMenu/AutoplayMenu';
import { EpicSearchAutocomplete } from '../EpicSearchAutocomplete/EpicSearchAutocomplete';
import { VisTimelineWrapper, type TimelineItem, type TimelineGroup, type TimelineOptions, type VisTimelineRef, type TimelineClickEvent } from '../VisTimelineWrapper/VisTimelineWrapper';
import { YearMarkerLabel } from '../YearMarkerLabel';
import { TimelineOverlay } from '../TimelineOverlay/TimelineOverlay';
import styles from './Timeline.module.css';

/**
 * Timeline groups configuration - matches production MapTimeline.js
 */
const TIMELINE_GROUPS: TimelineGroup[] = [{
  id: 1,
  content: '',
  className: 'timelineGroup_epics',
}];

/**
 * Timeline component props
 */
export interface TimelineProps {
  /** Epic items to display on the timeline */
  epicItems?: EpicItem[];
  /** Callback when an epic is selected */
  onEpicSelect?: (epic: EpicItem) => void;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Timeline heights in pixels
 */
export const TIMELINE_HEIGHT_COLLAPSED = 110;
export const TIMELINE_HEIGHT_EXPANDED = 280;
export const TIMELINE_HEIGHT_COLLAPSED_MOBILE = 64;
export const TIMELINE_HEIGHT_EXPANDED_MOBILE = 220;

/**
 * Color dot HTML for each epic type — used as a visual category indicator.
 */
const TYPE_DOT_COLORS: Record<string, string> = {
  ew: '#e74c3c',  // war — red
  ee: '#2ecc71',  // empire — green
  ei: '#f39c12',  // discovery — orange
  ps: '#3498db',  // person — blue
  ec: '#f39c12',  // culture — orange
  ebio: '#2ecc71', // biography — green
  eb: '#e74c3c',  // battle — red
};

/**
 * Timeline Component
 *
 * The main container component that orchestrates all timeline functionality.
 * - Fixed position at bottom of viewport
 * - Height transitions between 120px (collapsed) and 400px (expanded)
 * - Contains all sub-components
 * - Manages vis.js timeline instance lifecycle
 *
 * @param props - Timeline component props
 * @returns Timeline React component
 */
export const Timeline: React.FC<TimelineProps> = ({
  epicItems: _epicItems,
  onEpicSelect,
  className,
}) => {
  const {
    selectedYear,
    suggestedYear,
    isExpanded,
    isAutoplayActive,
    isAutoplayMenuOpen,
    isSearchOpen,
    isYearDialogOpen,
    autoplayConfig,
    setYear,
    setAutoplayConfig,
    startAutoplay,
    setNotDefaultView,
    toggleYearDialog,
    getFilteredEpicItems,
    epicItems, // Subscribe to epicItems to trigger re-render when loaded
    epicFilters, // Subscribe to epicFilters to trigger re-render when filters change
    centerOnYearRequest,
    clearCenterOnYearRequest,
  } = useTimelineStore();

  // Get right drawer state to shift timeline away from it
  const rightDrawerOpen = useUIStore((state) => state.rightDrawerOpen);
  const bottomToolsOpen = useUIStore((state) => state.bottomToolsOpen);
  // Get openRightDrawer from uiStore for epic click handling
  // Requirements: 6.3
  const openRightDrawer = useUIStore((state) => state.openRightDrawer);
  // Ref for the vis-timeline wrapper
  const timelineRef = useRef<VisTimelineRef>(null);
  const isMobile = useIsMobile();
  const skipRangeSyncRef = useRef(false);
  const initialWindowReadyRef = useRef(false);
  const lastWindowCenterRef = useRef(selectedYear);
  const lastBufferRef = useRef(0);
  const gestureTimerRef = useRef(0);
  const guardWindowRef = useRef(true);
  const suppressClickRef = useRef(false);
  const hasUserInteractedRef = useRef(false);
  const lastYearCommitRef = useRef(0);

  // Zoom hint visibility — shown briefly on first render
  const [showZoomHint, setShowZoomHint] = useState(true);
  const [overlayRange, setOverlayRange] = useState<{ start: number; end: number } | null>(() => ({
    start: selectedYear - 250,
    end: selectedYear + 250,
  }));

  useEffect(() => {
    const timer = setTimeout(() => setShowZoomHint(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  const closeAutoplayMenu = useCallback(() => {
    useTimelineStore.setState({ isAutoplayMenuOpen: false });
  }, []);

  const getDotHtml = useCallback((subtype: string): string => {
    const color = TYPE_DOT_COLORS[subtype] ?? 'rgba(180,180,180,0.6)';
    return `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${color};margin-right:4px;flex-shrink:0;vertical-align:middle"></span>`;
  }, []);

  /**
   * Get tooltip HTML for epic item based on subtype
   * Matches production Map.js epic item title formatting
   */
  const getEpicTooltipHtml = useCallback((epic: EpicItem): string => {
    const startYear = epic.start.getFullYear();
    const endYear = epic.end.getFullYear();
    const title = epic.content;
    
    switch (epic.subtype) {
      case 'ew': // War - show year range
        return `<img class="tsTicks warIcon timelineTooltipIcon" src="/images/transparent.png" alt="" /><span style="padding-left: 20px">${String(startYear)}-${String(endYear)} </span>: <b>${title}</b>`;
      case 'ei': // Discovery
        return `<img class="tsTicks discoveryIcon timelineTooltipIcon" src="/images/transparent.png" alt="" /><span style="padding-left: 20px">${String(startYear)}</span>: <b>${title}</b>`;
      case 'ps': // Person
        return `<img class="tsTicks esIcon timelineTooltipIcon" src="/images/transparent.png" alt="" /><span style="padding-left: 20px">${String(startYear)}</span>: <b>${title}</b>`;
      default:
        return `<b>${title}</b> (${String(startYear)})`;
    }
  }, []);

  /**
   * Transform EpicItem to TimelineItem format
   * Requirements: 6.2, 6.4, 6.5
   * Matches production Map.js epic item formatting
   */
  const transformEpicToTimelineItem = useCallback((epic: EpicItem, _index: number): TimelineItem => {
    const dot = getDotHtml(epic.subtype);
    const contentHtml = `<div class="warContainer">${dot}${epic.content}</div>`;

    return {
      id: epic.id,
      content: contentHtml,
      start: epic.start,
      end: epic.end,
      group: epic.group,
      type: 'range',
      className: epic.className ?? `timelineItem_${epic.subtype}`,
      title: getEpicTooltipHtml(epic),
    };
  }, [getDotHtml, getEpicTooltipHtml]);

  /**
   * Get filtered epic items and transform to TimelineItem format
   * Requirements: 6.2, 6.4, 6.5
   */
  const timelineItems = useMemo((): TimelineItem[] => {
    const filteredEpics = getFilteredEpicItems();
    console.log('[Timeline] Filtered epic items count:', filteredEpics.length);
    const items = filteredEpics.map((epic, index) => transformEpicToTimelineItem(epic, index));
    if (items.length > 0) {
      console.log('[Timeline] Sample timeline item:', items[0]);
    }
    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- epicItems and epicFilters trigger recompute when store data changes; getFilteredEpicItems reads them internally
  }, [getFilteredEpicItems, transformEpicToTimelineItem, epicItems, epicFilters]);

  /**
   * Timeline options configuration
   * Matches production MapTimeline.js settings
   */
  /**
   * Compute a tighter default view window centered on the selected year (~500yr range)
   */
  const viewStart = useMemo(() => {
    const y = selectedYear - 250;
    const d = new Date(0, 0, 1);
    d.setFullYear(y);
    return d.toISOString();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally computed once on mount; selectedYear changes should not reset the user's scroll position
  }, []);

  const viewEnd = useMemo(() => {
    const y = selectedYear + 250;
    const d = new Date(0, 0, 1);
    d.setFullYear(y);
    return d.toISOString();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally computed once on mount; selectedYear changes should not reset the user's scroll position
  }, []);

  const timelineOptions = useMemo((): TimelineOptions => ({
    width: '100%',
    height: isExpanded
      ? isMobile
        ? TIMELINE_HEIGHT_EXPANDED_MOBILE
        : TIMELINE_HEIGHT_EXPANDED
      : isMobile
        ? TIMELINE_HEIGHT_COLLAPSED_MOBILE
        : TIMELINE_HEIGHT_COLLAPSED,
    min: '-002500-01-01',
    max: '2500-01-01',
    zoomMin: 315360000000,
    stack: isExpanded,
    showCurrentTime: false,
    editable: false,
    showMajorLabels: false,
    showMinorLabels: true,
    horizontalScroll: true,
    zoomable: true,
    // Le déplacement est entièrement piloté par notre cinématique (molette,
    // souris, tactile) : le pan natif de vis-timeline doublerait le geste.
    moveable: false,
    timeAxis: { scale: 'year', step: 100 },
  }), [isExpanded, isMobile]);

  /**
   * Custom time marker for current year
   * Uses 'selectedYear' as the ID to match production CSS class .vis-custom-time.selectedYear
   */
  const customTimes = useMemo(() => ({
    selectedYear: new Date(new Date(0, 1, 1).setFullYear(selectedYear)).toISOString(),
  }), [selectedYear]);

  /**
   * Handle epic item click
   * Requirements: 6.3
   * Opens the right drawer with the epic's Wikipedia article
   * Zooms timeline to show the epic's date range (like production _flyTo)
   * Flies the map to show the epic's related locations
   */
  const handleEpicClick = useCallback((event: TimelineClickEvent) => {
    if (suppressClickRef.current) return;
    if (event.item) {
      // Find the clicked epic item
      const filteredEpics = getFilteredEpicItems();
      const clickedEpic = filteredEpics.find(epic => epic.id === event.item);
      if (clickedEpic) {
        // Call optional callback if provided
        if (onEpicSelect) {
          onEpicSelect(clickedEpic);
        }
        
        // Zoom timeline to show the epic's date range — matches production _flyTo
        // Padding scales with the epic duration (min 50 yrs, 20% of duration)
        if (timelineRef.current) {
          const startYear = clickedEpic.start.getFullYear();
          const endYear = clickedEpic.end.getFullYear();
          const duration = Math.max(1, endYear - startYear);
          const padding = Math.max(50, Math.round(duration * 0.2));
          const zoomStart = new Date(new Date(0, 1, 1).setFullYear(startYear - padding));
          const zoomEnd = new Date(new Date(0, 1, 1).setFullYear(endYear + padding));

          timelineRef.current.setWindow(zoomStart, zoomEnd);

          // Select the item after zoom animation
          setTimeout(() => {
            timelineRef.current?.setSelection([String(event.item)]);
          }, 500);
        }
        
        // Set year to the epic's start year
        setYear(clickedEpic.start.getFullYear());
        setNotDefaultView();
        
        // Fetch epic linked content and fly map to show coordinates
        // This matches production behavior where clicking an epic flies the map
        void fetchEpicCoordinates(clickedEpic.id).then((coordinates) => {
          if (coordinates.length > 0) {
            // Calculate center and bounds of all coordinates
            const lngs = coordinates.map(c => c[0]);
            const lats = coordinates.map(c => c[1]);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            
            // Calculate center
            const centerLng = (minLng + maxLng) / 2;
            const centerLat = (minLat + maxLat) / 2;
            
            // Calculate zoom level matching Mapbox fitBounds approximation:
            // World is 360° wide. Viewport is ~1400px. Tile is 256px at zoom 0.
            // zoom = log2(360 / spread) - log2(viewport/256) clamped to 2..7
            const lngSpread = Math.max(maxLng - minLng, 0.1);
            const latSpread = Math.max(maxLat - minLat, 0.1);
            const zoomLng = Math.log2(360 / lngSpread) - Math.log2(1400 / 256);
            const zoomLat = Math.log2(180 / latSpread) - Math.log2(900 / 256);
            let zoom = Math.min(zoomLng, zoomLat) - 0.5; // -0.5 for padding
            zoom = Math.max(2, Math.min(7, zoom));
            
            console.log('[Timeline] Flying map to epic coordinates:', { centerLng, centerLat, zoom, coordinateCount: coordinates.length });
            
            // Get flyTo from mapStore and fly to the center
            const { flyTo } = useMapStore.getState();
            flyTo({
              latitude: centerLat,
              longitude: centerLng,
              zoom,
              duration: 2000,
            });
          }
        });
        
        // Open right drawer with epic content if wiki URL is available
        // Requirements: 6.3 - WHEN an epic item is clicked, THE UIStore SHALL open the right drawer
        if (clickedEpic.wiki) {
          openRightDrawer({
            type: 'epic',
            epicId: clickedEpic.id,
            epicName: clickedEpic.content,
            wikiUrl: clickedEpic.wiki,
          });
        }
      }
    }
  }, [getFilteredEpicItems, onEpicSelect, openRightDrawer, setNotDefaultView, setYear]);

  /**
   * Handle timeline click (not on an item) - set year
   */
  const handleTimelineClick = useCallback((event: TimelineClickEvent) => {
    if (suppressClickRef.current) return;
    if (!event.item) {
      const clickedYear = event.time.getFullYear();
      setYear(clickedYear);
      setNotDefaultView();
    }
  }, [setNotDefaultView, setYear]);

  /** Recentre la fenêtre sur une année sans répercuter le mouvement sur le store. */
  const centerOnYear = useCallback((year: number, animated = false) => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    skipRangeSyncRef.current = true;
    timeline.moveTo(yearToDate(year), { animation: animated });
    window.setTimeout(() => {
      skipRangeSyncRef.current = false;
    }, animated ? 450 : 60);
  }, []);

  useEffect(() => {
    if (centerOnYearRequest === null) return;
    centerOnYear(centerOnYearRequest);
    clearCenterOnYearRequest();
  }, [centerOnYear, centerOnYearRequest, clearCenterOnYearRequest]);

  const handleYearDialogClose = useCallback(() => {
    useTimelineStore.setState({ isYearDialogOpen: false });
  }, []);

  const handleYearDialogSubmit = useCallback((year: number) => {
    lastWindowCenterRef.current = year;
    setYear(year);
    useTimelineStore.setState({ isYearDialogOpen: false });
    setNotDefaultView();
    // Move the timeline viewport to center on the new year
    if (isMobile) centerOnYear(year, true);
    else if (timelineRef.current) {
      const targetDate = new Date(new Date(0, 1, 1).setFullYear(year));
      timelineRef.current.moveTo(targetDate, { animation: true });
    }
  }, [centerOnYear, isMobile, setNotDefaultView, setYear]);

  const zoomBy = useCallback((factor: number) => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const range = timeline.getWindow();
    const spanMs = range.end.getTime() - range.start.getTime();
    const centerMs = (range.start.getTime() + range.end.getTime()) / 2;
    const nextSpan = Math.min(4500 * YEAR_MS, Math.max(40 * YEAR_MS, spanMs * factor));
    const minCenter = yearToDate(MIN_YEAR).getTime() + nextSpan / 2;
    const maxCenter = yearToDate(MAX_YEAR).getTime() - nextSpan / 2;
    const nextCenter = Math.max(minCenter, Math.min(maxCenter, centerMs));
    const start = new Date(nextCenter - nextSpan / 2);
    const end = new Date(nextCenter + nextSpan / 2);
    timeline.setWindow(start, end);
    const year = dateToYear(new Date(nextCenter));
    setOverlayRange({ start: year - nextSpan / YEAR_MS / 2, end: year + nextSpan / YEAR_MS / 2 });
    setYear(year);
    setNotDefaultView();
  }, [setNotDefaultView, setYear]);

  const resetZoom = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const center = yearToDate(selectedYear).getTime();
    const span = 500 * YEAR_MS;
    timeline.setWindow(new Date(center - span / 2), new Date(center + span / 2));
    setOverlayRange({ start: selectedYear - 250, end: selectedYear + 250 });
    setNotDefaultView();
  }, [selectedYear, setNotDefaultView]);

  const handleYearClick = useCallback(() => {
    toggleYearDialog();
  }, [toggleYearDialog]);

  const handleAutoplayMenuClose = useCallback(() => {
    closeAutoplayMenu();
  }, [closeAutoplayMenu]);

  const handleEpicSearchClose = useCallback(() => {
    useTimelineStore.setState({ isSearchOpen: false });
  }, []);

  const handleEpicSearchSelect = useCallback((epic: EpicItem, startYear: number, endYear: number) => {
    lastWindowCenterRef.current = (startYear + endYear) / 2;
    // Navigate timeline to the epic's date range
    if (timelineRef.current) {
      const startDate = new Date(new Date(0, 1, 1).setFullYear(startYear));
      const endDate = new Date(new Date(0, 1, 1).setFullYear(endYear));
      timelineRef.current.setWindow(startDate, endDate);
    }
    // Set year to the epic's start year
    setYear(startYear);
    useTimelineStore.setState({ isSearchOpen: false });
    setNotDefaultView();
    
    // Call optional callback if provided
    if (onEpicSelect) {
      onEpicSelect(epic);
    }
  }, [setNotDefaultView, setYear, onEpicSelect]);

  const handleAutoplayStart = useCallback(() => {
    startAutoplay();
    closeAutoplayMenu();
  }, [startAutoplay, closeAutoplayMenu]);

  /** Élargit les bornes pour que chaque année sélectionnable puisse rester centrée. */
  const applyDynamicBounds = useCallback((startYear: number, endYear: number) => {
    const span = Math.max(1, endYear - startYear);
    const margin = Math.max(250, Math.ceil(span / 2));
    if (Math.abs(margin - lastBufferRef.current) < 25) return;
    lastBufferRef.current = margin;
    const timeline = timelineRef.current;
    if (!timeline) return;
    timeline.setOptions({
      min: yearToDate(MIN_YEAR - margin).toISOString(),
      max: yearToDate(MAX_YEAR + margin).toISOString(),
    });
  }, []);

  const handleOverlayRangeChanged = useCallback((updateBounds = true) => {
    const windowRange = timelineRef.current?.getWindow();
    if (!windowRange) return;
    const startYear = dateToYear(windowRange.start);
    const endYear = dateToYear(windowRange.end);
    setOverlayRange({ start: startYear, end: endYear });
    if (updateBounds && !useTimelineStore.getState().isGestureActive) applyDynamicBounds(startYear, endYear);
  }, [applyDynamicBounds]);

  /** Remet la fenêtre autour de l'année courante après un saut automatique. */
  const restoreWindow = useCallback((year: number) => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    skipRangeSyncRef.current = true;
    timeline.setWindow(yearToDate(year - 250), yearToDate(year + 250));
    lastWindowCenterRef.current = year;
    window.setTimeout(() => {
      skipRangeSyncRef.current = false;
    }, 80);
  }, []);

  // L'ajout des épopées peut faire recalculer la fenêtre par vis-timeline.
  useEffect(() => {
    if (
      timelineItems.length === 0 ||
      !initialWindowReadyRef.current ||
      hasUserInteractedRef.current ||
      useTimelineStore.getState().isGestureActive
    ) return;
    restoreWindow(useTimelineStore.getState().selectedYear);
  }, [restoreWindow, timelineItems.length]);

  /** Sur mobile, l'année est celle qui passe sous le trait central fixe. */
  const handleRangeChange = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline || !initialWindowReadyRef.current) return;
    const windowRange = timeline.getWindow();
    const center = new Date((windowRange.start.getTime() + windowRange.end.getTime()) / 2);
    const year = dateToYear(center);
    // Un saut brutal vers l'année courante est un défaut d'initialisation de
    // vis-timeline, pas un geste utilisateur : on restaure la fenêtre voulue.
    const gestureActive = useTimelineStore.getState().isGestureActive;
    if (guardWindowRef.current && !gestureActive && Math.abs(year - lastWindowCenterRef.current) > 300) {
      restoreWindow(useTimelineStore.getState().selectedYear);
      return;
    }
    lastWindowCenterRef.current = year;
    handleOverlayRangeChanged(false);
    // Pendant un geste, `onTimeShift` est l'unique écrivain de l'année : lire
    // ici la fenêtre vis-timeline, parfois en retard, provoquait un aller-retour.
    if (gestureActive) return;
    if (!isMobile || skipRangeSyncRef.current) return;
    if (year !== useTimelineStore.getState().selectedYear) {
      setYear(year);
      setNotDefaultView();
    }
  }, [handleOverlayRangeChanged, isMobile, restoreWindow, setNotDefaultView, setYear]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      guardWindowRef.current = false;
    }, 8000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    centerOnYear(useTimelineStore.getState().selectedYear);
  }, [centerOnYear, isMobile]);

  useEffect(() => {
    if (!isMobile || !isAutoplayActive || skipRangeSyncRef.current) return;
    centerOnYear(selectedYear);
  }, [centerOnYear, isAutoplayActive, isMobile, selectedYear]);

  // Create portal container for timeline
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Create a container for the timeline portal
    let container = document.getElementById('timeline-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'timeline-portal';
      container.style.position = 'relative';
      container.style.zIndex = '350';
      document.body.appendChild(container);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPortalContainer(container);

    return () => {
      // Don't remove the container on unmount as it may be reused
    };
  }, []);

  // Determine the current height based on expanded state
  const currentHeight = isExpanded
    ? isMobile
      ? TIMELINE_HEIGHT_EXPANDED_MOBILE
      : TIMELINE_HEIGHT_EXPANDED
    : isMobile
      ? TIMELINE_HEIGHT_COLLAPSED_MOBILE
      : TIMELINE_HEIGHT_COLLAPSED;

  useEffect(() => {
    if (portalContainer) {
      portalContainer.style.setProperty('--timeline-current-height', `${String(currentHeight)}px`);
    }
  }, [currentHeight, portalContainer]);

  // Build class names safely
  const timelineClass = styles['timeline'] ?? '';
  const expandedClass = styles['expanded'] ?? '';
  const collapsedClass = styles['collapsed'] ?? '';
  const stateClass = isExpanded ? expandedClass : collapsedClass;
  const combinedClassName = `${timelineClass} ${stateClass} ${className ?? ''}`.trim();

  // Shift timeline away from open drawers on desktop only
  const timelineRight = rightDrawerOpen && !isMobile ? '35%' : '0';

  const timelineContent = (
    <div
      data-testid="timeline"
      data-year={selectedYear}
      data-span={overlayRange ? Math.round(overlayRange.end - overlayRange.start) : undefined}
      data-expanded={isExpanded}
      className={combinedClassName}
      style={{ height: `${String(currentHeight)}px`, right: timelineRight, transition: 'right 300ms ease-in-out, height 500ms ease-in-out, bottom 280ms cubic-bezier(0.23, 1, 0.32, 1)' }}
      role="navigation"
      aria-label="Timeline navigation"
    >
      <div className={styles['content']}>
        {/* Vis.js Timeline with epic items (Requirements 6.2, 6.4, 6.5) */}
        <VisTimelineWrapper
          key={isMobile ? 'mobile' : 'desktop'}
          ref={timelineRef}
          options={timelineOptions}
          initialStart={viewStart}
          initialEnd={viewEnd}
          items={timelineItems}
          groups={TIMELINE_GROUPS}
          customTimes={isMobile ? {} : customTimes}
          onClick={handleEpicClick}
          onTimelineClick={handleTimelineClick}
          onRangeChange={handleRangeChange}
          onRangeChanged={handleOverlayRangeChanged}
          onInitialWindowApplied={() => {
            initialWindowReadyRef.current = true;
          }}
          onGestureActivity={() => {
            guardWindowRef.current = false;
            hasUserInteractedRef.current = true;
            useTimelineStore.getState().setGestureActive(true);
            window.clearTimeout(gestureTimerRef.current);
            gestureTimerRef.current = window.setTimeout(() => {
              useTimelineStore.getState().setGestureActive(false);
            }, 600);
          }}
          onTimeShift={(year, spanYears) => {
            setOverlayRange({ start: year - spanYears / 2, end: year + spanYears / 2 });
            const now = performance.now();
            if (now - lastYearCommitRef.current < 80) return;
            lastYearCommitRef.current = now;
            if (year !== useTimelineStore.getState().selectedYear) {
              setYear(year);
            }
          }}
          onGestureEnd={(year) => {
            lastYearCommitRef.current = 0;
            if (year !== useTimelineStore.getState().selectedYear) {
              setYear(year);
            }
            setNotDefaultView();
          }}
          manualPan
          onPanEnd={() => {
                    suppressClickRef.current = true;
            window.setTimeout(() => {
              suppressClickRef.current = false;
            }, 120);
          }}
          className={styles['visTimeline'] ?? ''}
        />

        {/* Zoom hint — fades after a few seconds */}
        {showZoomHint && (
          <div className={styles['zoomHint']} aria-hidden="true">
            glisser pour explorer &middot; pincer pour zoomer
          </div>
        )}

        <TimelineOverlay start={overlayRange?.start ?? null} end={overlayRange?.end ?? null} />

        <div className={styles['zoomControls']} role="group" aria-label="Échelle de la timeline">
          <button type="button" onClick={() => { zoomBy(1.5); }} aria-label="Zoom arrière">−</button>
          <button type="button" onClick={resetZoom} aria-label="Revenir à 500 ans">500 ans</button>
          <button type="button" onClick={() => { zoomBy(1 / 1.5); }} aria-label="Zoom avant">+</button>
        </div>

        {isMobile ? <div className={styles['centerLine']} aria-hidden="true" data-testid="timeline-center-line" /> : null}

        {/* Year label on the red marker (like production) */}
        <YearMarkerLabel
          selectedYear={selectedYear}
          suggestedYear={suggestedYear}
          onYearClick={handleYearClick}
        />

        {isMobile && !bottomToolsOpen ? (
          <button
            type="button"
            className={styles['mobileYearBadge']}
            onClick={handleYearClick}
            aria-label={`Choisir l’année ${formatYearForDisplay(selectedYear)}`}
            data-testid="mobile-year-badge"
          >
            {formatYearForDisplay(selectedYear)}
          </button>
        ) : null}

        {/* Autoplay menu (Requirement 9.1-9.7) */}
        {isAutoplayMenuOpen && (
          <AutoplayMenu
            config={autoplayConfig}
            onConfigChange={setAutoplayConfig}
            onStart={handleAutoplayStart}
            onClose={handleAutoplayMenuClose}
          />
        )}

        {/* Epic Search Autocomplete (Requirement 8.1-8.7) */}
        {isSearchOpen && (
          <div className={styles['epicSearchContainer']}>
            <EpicSearchAutocomplete
              epics={getFilteredEpicItems()}
              onSelect={handleEpicSearchSelect}
              onClose={handleEpicSearchClose}
            />
          </div>
        )}
      </div>

      {/* Year dialog (Requirement 7.1-7.10) */}
      <YearDialog
        isOpen={isYearDialogOpen}
        onClose={handleYearDialogClose}
        onSubmit={handleYearDialogSubmit}
        initialYear={selectedYear}
      />
    </div>
  );

  // Use portal to render timeline outside the main DOM hierarchy
  if (!portalContainer) {
    return null;
  }

  return createPortal(timelineContent, portalContainer);
};

export default Timeline;
