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
  clamp,
  clampCenterMs,
  decayVelocity,
  normalizeWheelDelta,
  smoothedVelocity,
  spanForSpeed,
  timeShift,
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
  const { options, items = [], groups = [], customTimes = {}, initialStart, initialEnd, onTimelineClick, onRangeChange, onRangeChanged, onInitialWindowApplied, onGestureActivity, onTimeShift, onMouseMove, onClick, manualPan = false, onPanEnd, className } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<VisTimeline | null>(null);
  const itemsDataSetRef = useRef<DataSet<TimelineItem> | null>(null);
  const groupsDataSetRef = useRef<DataSet<TimelineGroup> | null>(null);
  const customTimeIdsRef = useRef(new Set());
  const pointerRef = useRef<{ id: number; x: number; start: number; end: number; width: number } | null>(null);
  const touchRef = useRef<{ identifier: number; x: number; start: number; end: number; width: number } | null>(null);
  const motionRef = useRef({
    velocity: 0,
    baseSpan: 0,
    center: 0,
    span: 0,
    targetSpan: 0,
    lastInput: 0,
    lastFrame: 0,
    frame: 0,
  });
  const callbacksRef = useRef({ onTimelineClick, onRangeChange, onRangeChanged, onInitialWindowApplied, onGestureActivity, onTimeShift, onMouseMove, onClick });

  useEffect(() => {
    callbacksRef.current = { onTimelineClick, onRangeChange, onRangeChanged, onInitialWindowApplied, onGestureActivity, onTimeShift, onMouseMove, onClick };
  }, [onGestureActivity, onInitialWindowApplied, onMouseMove, onClick, onRangeChange, onRangeChanged, onTimeShift, onTimelineClick]);

  const handleClick = useCallback((properties: { event: MouseEvent; time: Date; item: string | null }) => {
    const clickEvent: TimelineClickEvent = { event: properties.event, time: properties.time, item: properties.item };
    if (properties.item) callbacksRef.current.onClick?.(clickEvent);
    else callbacksRef.current.onTimelineClick?.(clickEvent);
  }, []);

  const handleMouseMove = useCallback((properties: { time: Date }) => {
    callbacksRef.current.onMouseMove?.({ time: properties.time });
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!manualPan || event.pointerType === 'touch') return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const timeline = timelineRef.current;
    const container = containerRef.current;
    if (!timeline || !container) return;
    const windowRange = timeline.getWindow();
    pointerRef.current = {
      id: event.pointerId,
      x: event.clientX,
      start: windowRange.start.getTime(),
      end: windowRange.end.getTime(),
      width: Math.max(container.getBoundingClientRect().width, 1),
    };
    container.setPointerCapture(event.pointerId);
  }, [manualPan]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;
    if (pointer?.id !== event.pointerId) return;
    const deltaPx = event.clientX - pointer.x;
    if (Math.abs(deltaPx) < 2) return;
    const span = pointer.end - pointer.start;
    const shift = (deltaPx / pointer.width) * span;
    callbacksRef.current.onGestureActivity?.();
    timelineRef.current?.setWindow(new Date(pointer.start + shift), new Date(pointer.end + shift));
  }, []);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;
    if (pointer?.id !== event.pointerId) return;
    const moved = Math.abs(pointer.x - event.clientX) > 2;
    pointerRef.current = null;
    if (containerRef.current?.hasPointerCapture(event.pointerId)) {
      containerRef.current.releasePointerCapture(event.pointerId);
    }
    if (moved) onPanEnd?.();
  }, [onPanEnd]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!manualPan || event.touches.length !== 1) return;
    const timeline = timelineRef.current;
    const container = containerRef.current;
    if (!timeline || !container) return;
    const touch = event.touches[0];
    if (!touch) return;
    const windowRange = timeline.getWindow();
    touchRef.current = {
      identifier: touch.identifier,
      x: touch.clientX,
      start: windowRange.start.getTime(),
      end: windowRange.end.getTime(),
      width: Math.max(container.getBoundingClientRect().width, 1),
    };
  }, [manualPan]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const pointer = touchRef.current;
    if (!pointer) return;
    const touch = findTouch(event.touches, pointer.identifier);
    if (!touch) return;
    const deltaPx = touch.clientX - pointer.x;
    if (Math.abs(deltaPx) < 2) return;
    const span = pointer.end - pointer.start;
    const shift = (deltaPx / pointer.width) * span;
    callbacksRef.current.onGestureActivity?.();
    timelineRef.current?.setWindow(new Date(pointer.start + shift), new Date(pointer.end + shift));
  }, []);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const pointer = touchRef.current;
    if (!pointer) return;
    const touch = findTouch(event.changedTouches, pointer.identifier);
    const moved = Boolean(touch && Math.abs(pointer.x - touch.clientX) > 2);
    touchRef.current = null;
    if (moved) onPanEnd?.();
  }, [onPanEnd]);

  /** Déplace la fenêtre et détend le zoom dans l'unique boucle d'animation. */
  const runMotion = useCallback(() => {
    const state = motionRef.current;
    const timeline = timelineRef.current;
    const container = containerRef.current;
    if (!timeline || !container) return;
    const step = (now: number) => {
      const dt = state.lastFrame ? Math.min(now - state.lastFrame, 64) : 16;
      state.lastFrame = now;
      const span = state.span;
      const center = state.center;
      const shift = timeShift((state.velocity * dt) / 1000, container.getBoundingClientRect().width, span);
      const nextSpan = span;
      state.velocity = decayVelocity(state.velocity, dt);
      if (Math.abs(state.velocity) < 1 && Math.abs(nextSpan - span) < 1) {
        state.frame = 0;
        state.lastFrame = 0;
        return;
      }
      state.center = clampCenterMs(center + shift);
      if (state.center === center) state.velocity = 0;
      state.span = nextSpan;
      callbacksRef.current.onGestureActivity?.();
      timeline.setWindow(new Date(state.center - nextSpan / 2), new Date(state.center + nextSpan / 2));
      callbacksRef.current.onTimeShift?.(new Date(state.center).getFullYear(), nextSpan / 31536000000);
      state.frame = requestAnimationFrame(step);
    };
    if (!state.frame) {
      state.lastFrame = 0;
      state.frame = requestAnimationFrame(step);
    }
  }, []);

  /** Pavé tactile et molette : la vitesse pilote la date et le zoom. */
  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const timeline = timelineRef.current;
    const container = containerRef.current;
    if (!timeline || !container) return;
    const width = container.getBoundingClientRect().width;
    const rawDelta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
    const deltaPx = normalizeWheelDelta(rawDelta, event.deltaMode, width);
    if (deltaPx === 0) return;
    const now = performance.now();
    const state = motionRef.current;
    const dt = state.lastInput ? clamp(now - state.lastInput, 8, 80) : 16;
    state.lastInput = now;
    const wasIdle = Math.abs(state.velocity) < 1;
    state.velocity = smoothedVelocity(state.velocity, deltaPx, dt);
    const windowRange = timeline.getWindow();
    const span = windowRange.end.getTime() - windowRange.start.getTime();
    if (wasIdle || state.baseSpan === 0) state.baseSpan = span;
    state.targetSpan = spanForSpeed(state.baseSpan, state.velocity);
    state.center = clampCenterMs((windowRange.start.getTime() + windowRange.end.getTime()) / 2 + timeShift(deltaPx, width, span));
    state.span = state.targetSpan;
    callbacksRef.current.onGestureActivity?.();
    timeline.setWindow(new Date(state.center - state.span / 2), new Date(state.center + state.span / 2));
    const shiftedYear = new Date(state.center).getFullYear();
    callbacksRef.current.onTimeShift?.(shiftedYear, state.span / 31536000000);
    runMotion();

  }, [runMotion]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    element.addEventListener('wheel', handleWheel, { passive: false, capture: true });
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
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [handleWheel, runMotion]);

  useImperativeHandle(ref, () => ({
    setWindow: (start: Date, end: Date, opts?: { animation?: boolean }) => timelineRef.current?.setWindow(start, end, opts),
    setSelection: (ids: string[]) => timelineRef.current?.setSelection(ids),
    getWindow: () => timelineRef.current?.getWindow() ?? { start: new Date(), end: new Date() },
    fit: () => timelineRef.current?.fit(),
    moveTo: (time: Date, opts?: { animation?: boolean }) => timelineRef.current?.moveTo(time, opts),
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
      onPointerDown={handlePointerDown}
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
