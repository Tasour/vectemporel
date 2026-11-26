/**
 * VisTimelineWrapper Component
 * React wrapper for vis-timeline library with epic item rendering support.
 * Requirements: 5.1, 10.1, 10.7, 10.8, 11.1, 11.2
 */

import React, { forwardRef, useRef, useEffect, useCallback, useImperativeHandle, type ForwardedRef } from 'react';
import { Timeline as VisTimeline } from 'vis-timeline';
import { DataSet } from 'vis-data';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import {
  advanceMotion,
  applyGestureInput,
  clamp,
  clampCenterForSpan,
  createGestureState,
  DRAG_GESTURE_GAP_MS,
  MAX_SPAN_MS,
  MIN_SPAN_MS,
  normalizeWheelDelta,
  resetGestureToWindow,
  type GestureState,
  YEAR_MS,
} from './kinematics';
import styles from './VisTimelineWrapper.module.css';

export const EPIC_ITEM_CLASS = 'epic-item';

function findTouch(
  list: { length: number; item(index: number): React.Touch | null },
  identifier: number,
): React.Touch | undefined {
  for (let index = 0; index < list.length; index += 1) {
    const touch = list.item(index);
    if (touch?.identifier === identifier) return touch;
  }
  return undefined;
}

export interface TimelineOptions {
  width?: string;
  height?: number;
  zoomMin?: number;
  zoomMax?: number;
  min?: string;
  max?: string;
  start?: string;
  end?: string;
  stack?: boolean;
  showCurrentTime?: boolean;
  editable?: boolean;
  showMajorLabels?: boolean;
  showMinorLabels?: boolean;
  horizontalScroll?: boolean;
  zoomable?: boolean;
  moveable?: boolean;
  timeAxis?: { scale: 'millisecond' | 'second' | 'minute' | 'hour' | 'weekday' | 'day' | 'week' | 'month' | 'year'; step: number };
}

export interface TimelineItem {
  id: string;
  content: string;
  start: Date | string;
  end?: Date | string;
  group?: number;
  type?: 'box' | 'point' | 'range' | 'background';
  className?: string;
  style?: string;
  editable?: boolean;
  title?: string;
}

export interface TimelineGroup {
  id: number;
  content: string;
  className?: string;
  style?: string;
  nestedGroups?: number[];
  visible?: boolean;
}

export interface TimelineClickEvent {
  event: MouseEvent;
  time: Date;
  item: string | null;
}

export interface TimelineMouseEvent {
  time: Date;
}

export interface VisTimelineRef {
  setWindow: (start: Date, end: Date, options?: { animation?: boolean }) => void;
  setSelection: (ids: string[]) => void;
  getWindow: () => { start: Date; end: Date };
  fit: () => void;
  moveTo: (time: Date, options?: { animation?: boolean }) => void;
  zoomIn: (percentage: number) => void;
  zoomOut: (percentage: number) => void;
  setOptions: (options: TimelineOptions) => void;
}

export interface VisTimelineWrapperProps {
  options: TimelineOptions;
  items?: TimelineItem[];
  groups?: TimelineGroup[];
  customTimes?: Record<string, string | Date>;
  onTimelineClick?: (event: TimelineClickEvent) => void;
  onRangeChange?: () => void;
  onRangeChanged?: () => void;
  onInitialWindowApplied?: () => void;
  /** Signale un changement de fenêtre issu d'un geste utilisateur. */
  onGestureActivity?: () => void;
  /** Fin du geste : permet de committer l'année finale une seule fois. */
  onGestureEnd?: (year: number) => void;
  /** Cran haptique : appelé à chaque frame de geste. */
  onHaptic?: (year: number, spanYears: number, fine: boolean) => void;
  /** Année et largeur de fenêtre atteintes par le geste, sans round-trip vis. */
  onTimeShift?: (year: number, spanYears: number) => void;
  onMouseMove?: (event: TimelineMouseEvent) => void;
  onClick?: (event: TimelineClickEvent) => void;
  /** Fenêtre initiale appliquée à la création du timeline */
  initialStart?: string;
  initialEnd?: string;
  /** Active le défilement tactile manuel (mobile) */
  manualPan?: boolean;
  /** Appelé après un glisser pour supprimer le clic résiduel */
  onPanEnd?: () => void;
  className?: string;
}

function VisTimelineWrapperComponent(
  props: VisTimelineWrapperProps,
  ref: ForwardedRef<VisTimelineRef>
): React.JSX.Element {
  const { options, items = [], groups = [], customTimes = {}, initialStart, initialEnd, onTimelineClick, onRangeChange, onRangeChanged, onInitialWindowApplied, onGestureActivity, onGestureEnd, onHaptic, onTimeShift, onMouseMove, onClick, manualPan = false, onPanEnd, className } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<VisTimeline | null>(null);
  const itemsDataSetRef = useRef<DataSet<TimelineItem> | null>(null);
  const groupsDataSetRef = useRef<DataSet<TimelineGroup> | null>(null);
  const customTimeIdsRef = useRef(new Set());
  const pointerRef = useRef<{ id: number; x: number; width: number } | null>(null);
  const touchRef = useRef<{ identifier: number; x: number; initialX: number; width: number } | null>(null);
  const motionRef = useRef<GestureState>(createGestureState());
  const settleTimerRef = useRef(0);
  const precisionRef = useRef(false);
  const precisionTimerRef = useRef(0);
  const lastWindowCommitRef = useRef(0);
  const callbacksRef = useRef({ onTimelineClick, onRangeChange, onRangeChanged, onInitialWindowApplied, onGestureActivity, onGestureEnd, onHaptic, onTimeShift, onMouseMove, onClick });

  useEffect(() => {
    callbacksRef.current = { onTimelineClick, onRangeChange, onRangeChanged, onInitialWindowApplied, onGestureActivity, onGestureEnd, onHaptic, onTimeShift, onMouseMove, onClick };
  }, [onGestureActivity, onGestureEnd, onHaptic, onInitialWindowApplied, onMouseMove, onClick, onRangeChange, onRangeChanged, onTimeShift, onTimelineClick]);

  const handleClick = useCallback((properties: { event: MouseEvent; time: Date; item: string | null }) => {
    const clickEvent: TimelineClickEvent = { event: properties.event, time: properties.time, item: properties.item };
    if (properties.item) callbacksRef.current.onClick?.(clickEvent);
    else callbacksRef.current.onTimelineClick?.(clickEvent);
  }, []);

  const handleMouseMove = useCallback((properties: { time: Date }) => {
    callbacksRef.current.onMouseMove?.({ time: properties.time });
  }, []);

  /**
   * Termine le geste même si les frames rAF sont rares (carte WebGL occupée) :
   * sans ce garde-fou, l'animation peut durer plusieurs secondes de plus.
   */
  const finishMotion = useCallback(() => {
    const state = motionRef.current;
    const timeline = timelineRef.current;
    if (!timeline || !state.active) return;
    if (state.frame) {
      cancelAnimationFrame(state.frame);
      state.frame = 0;
    }
    state.velocity = 0;
    state.span = state.targetSpan || state.span;
    state.targetSpan = state.span;
    state.baseSpan = state.span;
    state.distance = 0;
    state.kind = null;
    state.active = false;
    if (containerRef.current) delete containerRef.current.dataset['gesture'];
    timeline.setWindow(
      new Date(state.center - state.span / 2),
      new Date(state.center + state.span / 2)
    );
    callbacksRef.current.onTimeShift?.(new Date(state.center).getFullYear(), state.span / YEAR_MS);
    callbacksRef.current.onGestureEnd?.(new Date(state.center).getFullYear());
  }, []);

  /** Déplace la fenêtre et détend le zoom dans l'unique boucle d'animation. */
  const runMotion = useCallback(() => {
    const state = motionRef.current;
    const timeline = timelineRef.current;
    if (!timeline) return;
    const step = (now: number) => {
      const motion = advanceMotion(state, now);
      callbacksRef.current.onGestureActivity?.();
      const motionYear = new Date(motion.center).getFullYear();
      callbacksRef.current.onTimeShift?.(motionYear, motion.span / YEAR_MS);
      callbacksRef.current.onHaptic?.(motionYear, motion.span / YEAR_MS, precisionRef.current);
      // vis-timeline redessine son canvas à chaque setWindow : pendant le geste
      // on plafonne à 30 Hz, le badge et nos graduations restent à la rAF.
      if (now - lastWindowCommitRef.current >= (motion.active ? 30 : 0) || !motion.active) {
        timeline.setWindow(
          new Date(motion.center - motion.span / 2),
          new Date(motion.center + motion.span / 2)
        );
        lastWindowCommitRef.current = now;
      }
      if (!motion.active) {
        if (containerRef.current) delete containerRef.current.dataset['gesture'];
        callbacksRef.current.onGestureEnd?.(new Date(motion.center).getFullYear());
        state.frame = 0;
      } else {
        state.frame = requestAnimationFrame(step);
      }
    };
    if (!state.frame) {
      state.lastFrame = 0;
      state.frame = requestAnimationFrame(step);
    }
  }, []);

  /** Applique une entrée au modèle et publie la fenêtre résultante. */
  const applyInput = useCallback((deltaPx: number, kind: 'wheel' | 'drag', width: number, clientX: number, fine = false) => {
    const timeline = timelineRef.current;
    const container = containerRef.current;
    if (!timeline || !container) return;
    const windowRange = timeline.getWindow();
    const rect = container.getBoundingClientRect();
    const anchorOffset = rect.width > 0 ? (clientX - rect.left) / rect.width - 0.5 : 0;
    const result = applyGestureInput(motionRef.current, {
      deltaPx,
      centerMs: (windowRange.start.getTime() + windowRange.end.getTime()) / 2,
      spanMs: windowRange.end.getTime() - windowRange.start.getTime(),
      width,
      now: performance.now(),
      kind,
      anchorOffset,
      fine,
    });

    // Mouvement réduit : translation immédiate à la cible, sans inertie ni zoom animé.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const state = motionRef.current;
      state.velocity = 0;
      state.span = result.targetSpan;
      state.targetSpan = result.targetSpan;
      state.baseSpan = result.targetSpan;
      result.span = result.targetSpan;
    }

    // Marquer le geste avant toute écriture : le garde-fou de fenêtre lit ce
    // drapeau de façon synchrone dans `rangechange`.
    callbacksRef.current.onGestureActivity?.();
    timeline.setWindow(
      new Date(result.center - result.span / 2),
      new Date(result.center + result.span / 2)
    );
    const resultYear = new Date(result.center).getFullYear();
    callbacksRef.current.onTimeShift?.(resultYear, result.span / YEAR_MS);
    callbacksRef.current.onHaptic?.(resultYear, result.span / YEAR_MS, fine);
    runMotion();
    window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(finishMotion, DRAG_GESTURE_GAP_MS + 300);
  }, [finishMotion, runMotion]);

  /**
   * Capture native : vis-timeline arrête la propagation des pointerdown sur ses
   * éléments personnalisés (notamment le libellé de l'année). Sans capture, un
   * glisser commencé sur le libellé ne déplace pas la timeline.
   */
  const handlePointerDown = useCallback((event: PointerEvent) => {
    if (!manualPan || event.pointerType === 'touch') return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;
    const state = motionRef.current;
    if (state.frame) {
      cancelAnimationFrame(state.frame);
      state.frame = 0;
    }
    state.velocity = 0;
    state.active = false;
    state.kind = null;
    state.targetSpan = state.span;
    state.baseSpan = state.span;
    callbacksRef.current.onGestureActivity?.();
    pointerRef.current = {
      id: event.pointerId,
      x: event.clientX,
      width: Math.max(container.getBoundingClientRect().width, 1),
    };
    try {
      container.setPointerCapture(event.pointerId);
    } catch {
      // Les événements synthétiques de test n'ont pas de capture active.
    }
  }, [manualPan]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;
    if (pointer?.id !== event.pointerId) return;
    const deltaPx = event.clientX - pointer.x;
    pointer.x = event.clientX;
    if (Math.abs(deltaPx) < 1) return;
    applyInput(deltaPx, 'drag', pointer.width, event.clientX, event.shiftKey || event.metaKey || precisionRef.current);
  }, [applyInput]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;
    if (pointer?.id !== event.pointerId) return;
    // Le dernier pointermove peut être coalescé avec le pointerup : on applique
    // le delta restant avant de fermer le geste.
    const remaining = event.clientX - pointer.x;
    if (Math.abs(remaining) >= 1) applyInput(remaining, 'drag', pointer.width, event.clientX);
    const moved = Math.abs(pointer.x - event.clientX) > 2;
    pointerRef.current = null;
    if (containerRef.current?.hasPointerCapture(event.pointerId)) {
      containerRef.current.releasePointerCapture(event.pointerId);
    }
    if (moved) onPanEnd?.();
  }, [applyInput, onPanEnd]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!manualPan || event.touches.length !== 1) return;
    const container = containerRef.current;
    if (!container) return;
    const touch = event.touches[0];
    if (!touch) return;
    touchRef.current = {
      identifier: touch.identifier,
      x: touch.clientX,
      initialX: touch.clientX,
      width: Math.max(container.getBoundingClientRect().width, 1),
    };
    window.clearTimeout(precisionTimerRef.current);
    precisionTimerRef.current = window.setTimeout(() => {
      const current = touchRef.current;
      if (current && Math.abs(current.x - current.initialX) > 4) return;
      precisionRef.current = true;
      container.dataset['precision'] = 'on';
      if (typeof navigator.vibrate === 'function') navigator.vibrate(8);
    }, 300);
  }, [manualPan]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const pointer = touchRef.current;
    if (!pointer) return;
    const touch = findTouch(event.touches, pointer.identifier);
    if (!touch) return;
    const deltaPx = touch.clientX - pointer.x;
    pointer.x = touch.clientX;
    window.clearTimeout(precisionTimerRef.current);
    // Si l'appui long a été déclenché par un ralentissement du main thread
    // alors que le doigt bougeait, on annule dès le premier mouvement franc.
    if (precisionRef.current && Math.abs(touch.clientX - pointer.initialX) > 4) {
      precisionRef.current = false;
      if (containerRef.current) delete containerRef.current.dataset['precision'];
    }
    if (Math.abs(deltaPx) < 1) return;
    applyInput(deltaPx, 'drag', pointer.width, touch.clientX, precisionRef.current);
  }, [applyInput]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const pointer = touchRef.current;
    if (!pointer) return;
    const touch = findTouch(event.changedTouches, pointer.identifier);
    if (touch) {
      const remaining = touch.clientX - pointer.x;
      if (Math.abs(remaining) >= 1) applyInput(remaining, 'drag', pointer.width, touch.clientX, precisionRef.current);
    }
    const moved = Boolean(touch && Math.abs(pointer.x - touch.clientX) > 2);
    touchRef.current = null;
    window.clearTimeout(precisionTimerRef.current);
    precisionRef.current = false;
    if (containerRef.current) delete containerRef.current.dataset['precision'];
    if (moved) onPanEnd?.();
  }, [applyInput, onPanEnd]);

  /** Pavé tactile et molette : la vitesse pilote la date et le zoom. */
  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const timeline = timelineRef.current;
    if (!timeline) return;

    // Ctrl/⌘ + molette : zoom explicite et réversible, ancré sous le curseur.
    if (event.ctrlKey || event.metaKey) {
      const range = timeline.getWindow();
      const span = range.end.getTime() - range.start.getTime();
      const center = (range.start.getTime() + range.end.getTime()) / 2;
      const offset = width > 0 ? (event.clientX - rect.left) / width - 0.5 : 0;
      const nextSpan = clamp(span * Math.exp(event.deltaY * 0.0015), MIN_SPAN_MS, MAX_SPAN_MS);
      if (Math.abs(nextSpan - span) < 1) return;
      const anchorTime = center + offset * span;
      const nextCenter = clampCenterForSpan(anchorTime - offset * nextSpan, nextSpan);
      resetGestureToWindow(motionRef.current, nextCenter, nextSpan);
      timeline.setWindow(new Date(nextCenter - nextSpan / 2), new Date(nextCenter + nextSpan / 2));
      callbacksRef.current.onGestureActivity?.();
      callbacksRef.current.onTimeShift?.(new Date(nextCenter).getFullYear(), nextSpan / YEAR_MS);
      callbacksRef.current.onGestureEnd?.(new Date(nextCenter).getFullYear());
      return;
    }

    const rawDelta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
    const deltaPx = normalizeWheelDelta(rawDelta, event.deltaMode, width);
    if (deltaPx === 0) return;
    applyInput(deltaPx, 'wheel', width, event.clientX, event.shiftKey);
  }, [applyInput]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    element.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    element.addEventListener('pointerdown', handlePointerDown, { capture: true });
    const onVisibilityChange = () => {
      const state = motionRef.current;
      if (document.hidden) {
        cancelAnimationFrame(state.frame);
        state.frame = 0;
      } else if (state.targetSpan > 0) {
        runMotion();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      element.removeEventListener('wheel', handleWheel, { capture: true });
      element.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearTimeout(settleTimerRef.current);
      window.clearTimeout(precisionTimerRef.current);
    };
  }, [handlePointerDown, handleWheel, runMotion]);

  useImperativeHandle(ref, () => ({
    setWindow: (start: Date, end: Date, opts?: { animation?: boolean }) => {
      resetGestureToWindow(
        motionRef.current,
        (start.getTime() + end.getTime()) / 2,
        end.getTime() - start.getTime()
      );
      timelineRef.current?.setWindow(start, end, opts);
    },
    setSelection: (ids: string[]) => timelineRef.current?.setSelection(ids),
    getWindow: () => timelineRef.current?.getWindow() ?? { start: new Date(), end: new Date() },
    fit: () => {
      const state = motionRef.current;
      state.seeded = false;
      timelineRef.current?.fit();
    },
    moveTo: (time: Date, opts?: { animation?: boolean }) => {
      const timeline = timelineRef.current;
      if (timeline) {
        const range = timeline.getWindow();
        resetGestureToWindow(
          motionRef.current,
          time.getTime(),
          range.end.getTime() - range.start.getTime()
        );
      }
      timeline?.moveTo(time, opts);
    },
    zoomIn: (percentage: number) => timelineRef.current?.zoomIn(percentage),
    zoomOut: (percentage: number) => timelineRef.current?.zoomOut(percentage),
    setOptions: (options: TimelineOptions) => timelineRef.current?.setOptions(options),
  }), []);

  useEffect(() => {
    if (!containerRef.current) return;
    itemsDataSetRef.current = new DataSet<TimelineItem>();
    groupsDataSetRef.current = new DataSet<TimelineGroup>();
    const timeline = new VisTimeline(containerRef.current, itemsDataSetRef.current, groupsDataSetRef.current, options);
    timelineRef.current = timeline;
    const applyInitialWindow = () => {
      if (initialStart && initialEnd) timeline.setWindow(new Date(initialStart), new Date(initialEnd));
      callbacksRef.current.onInitialWindowApplied?.();
    };
    const initialWindowTimer = window.setTimeout(applyInitialWindow, 0);
    // Store references so off() uses the same function objects as on()
    const handleRangeChange = () => callbacksRef.current.onRangeChange?.();
    const handleRangeChanged = () => callbacksRef.current.onRangeChanged?.();
    timeline.on('click', handleClick);
    timeline.on('rangechange', handleRangeChange);
    timeline.on('rangechanged', handleRangeChanged);
    timeline.on('mouseMove', handleMouseMove);
    const customTimeIds = customTimeIdsRef.current;
    const motion = motionRef.current;
    return () => {
      window.clearTimeout(initialWindowTimer);
      timeline.off('click', handleClick);
      timeline.off('rangechange', handleRangeChange);
      timeline.off('rangechanged', handleRangeChanged);
      timeline.off('mouseMove', handleMouseMove);
      cancelAnimationFrame(motion.frame);
      motion.frame = 0;
      timeline.destroy();
      timelineRef.current = null;
      itemsDataSetRef.current = null;
      groupsDataSetRef.current = null;
      customTimeIds.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- vis-timeline instance created once on mount; options/callbacks are read via refs or stable references
  }, []);

  useEffect(() => {
    if (!itemsDataSetRef.current) return;
    itemsDataSetRef.current.clear();
    const processedItems = items.map((item) => ({
      ...item,
      className: item.className ? `${item.className} ${EPIC_ITEM_CLASS}` : EPIC_ITEM_CLASS,
      type: item.type ?? (item.end ? 'range' : 'point'),
    }));
    if (processedItems.length > 0) {
      itemsDataSetRef.current.add(processedItems);
    }
  }, [items]);

  useEffect(() => {
    if (!groupsDataSetRef.current) return;
    groupsDataSetRef.current.clear();
    if (groups.length > 0) groupsDataSetRef.current.add(groups);
  }, [groups]);

  useEffect(() => {
    if (!timelineRef.current) return;
    const timeline = timelineRef.current;
    const currentIds = customTimeIdsRef.current;
    Object.entries(customTimes).forEach(([id, time]) => {
      const timeValue = typeof time === 'string' ? new Date(time) : time;
      if (currentIds.has(id)) {
        try { timeline.setCustomTime(timeValue, id); } catch { /* ignore */ }
      } else {
        try { timeline.addCustomTime(timeValue, id); currentIds.add(id); } catch { /* ignore */ }
      }
    });
  }, [customTimes]);

  useEffect(() => {
    if (!timelineRef.current) return;
    timelineRef.current.setOptions(options);
  }, [options]);

  const containerClassName = className ? `${styles['container'] ?? ''} ${className}` : (styles['container'] ?? '');
  return (
    <div
      ref={containerRef}
      className={containerClassName}
      data-testid="vis-timeline"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    />
  );
}

export const VisTimelineWrapper = forwardRef(VisTimelineWrapperComponent);
export default VisTimelineWrapper;
