/** Surcouche de graduation et de grandes périodes au-dessus de la timeline. */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { formatYearForDisplay } from '@/utils/yearUtils';
import { graduationStep } from './graduation';
import styles from './TimelineOverlay.module.css';

export interface TimelineOverlayProps {
  start: number | null;
  end: number | null;
}

export interface TimelineOverlayHandle {
  /** Dessin impératif pendant le geste, sans rendu React. */
  draw: (start: number, end: number) => void;
  /** Bascule DOM ↔ canvas au début/fin du geste. */
  setGesture: (active: boolean) => void;
}

interface Period {
  label: string;
  from: number;
  to: number;
  tone: string;
}

const PERIODS: Period[] = [
  { label: 'Antiquité', from: -2000, to: 500, tone: styles['toneAntiquity'] ?? '' },
  { label: 'Moyen Âge', from: 500, to: 1500, tone: styles['toneMedieval'] ?? '' },
  { label: 'Temps modernes', from: 1500, to: 1800, tone: styles['toneModern'] ?? '' },
  { label: 'Contemporain', from: 1800, to: 2000, tone: styles['toneContemporary'] ?? '' },
];

const PERIOD_COLORS = ['#8a6b1f', '#6b4f8a', '#1f6b78', '#8a3f4f'];

export const TimelineOverlay = forwardRef<TimelineOverlayHandle, TimelineOverlayProps>(
  function TimelineOverlay({ start, end }, ref) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [width, setWidth] = useState(0);
    const gestureRef = useRef(false);
    // Dernière fenêtre connue : la bascule DOM→canvas doit pouvoir dessiner
    // avant de masquer les graduations DOM, même si la ref impérative a été
    // créée lors d'un rendu plus ancien.
    const rangeRef = useRef<{ start: number | null; end: number | null }>({ start: null, end: null });
    rangeRef.current = { start, end };

    const draw = (from: number, to: number): void => {
      const canvas = canvasRef.current;
      if (!canvas || to <= from) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w <= 0 || h <= 0) return;
      if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
        canvas.width = Math.round(w * ratio);
        canvas.height = Math.round(h * ratio);
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const span = to - from;
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      const x = (year: number) => ((year - from) / span) * w;

      PERIODS.forEach((period, index) => {
        const left = Math.max(0, x(period.from));
        const right = Math.min(w, x(period.to));
        if (right <= left) return;
        ctx.globalAlpha = dark ? 0.38 : 0.16;
        ctx.fillStyle = PERIOD_COLORS[index] ?? '#8a6b1f';
        ctx.fillRect(left, 0, right - left, h);
      });
      ctx.globalAlpha = 1;
      // Les grandes périodes conservent leur libellé pendant le geste.
      ctx.font = '700 10px Inter, system-ui, sans-serif';
      ctx.textBaseline = 'top';
      PERIODS.forEach((period) => {
        const rawLeft = x(period.from);
        const rawRight = x(period.to);
        const left = Math.max(0, rawLeft);
        const right = Math.min(w, rawRight);
        if (right - left <= 14) return;
        ctx.globalAlpha = dark ? 0.85 : 0.75;
        ctx.fillStyle = dark ? 'rgba(241,236,225,0.92)' : 'rgba(43,40,35,0.86)';
        ctx.fillText(period.label, left + 4, 3, right - left - 8);
      });
      ctx.globalAlpha = 1;

      const step = graduationStep(span, w);
      const first = Math.ceil(from / step) * step;
      ctx.strokeStyle = dark ? 'rgba(241,236,225,0.42)' : 'rgba(43,40,35,0.42)';
      ctx.fillStyle = dark ? 'rgba(241,236,225,0.62)' : 'rgba(43,40,35,0.58)';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textBaseline = 'top';
      let count = 0;
      for (let year = first; year <= to && count < 32; year += step) {
        const px = x(year);
        ctx.beginPath();
        ctx.moveTo(px, h - 12);
        ctx.lineTo(px, h);
        ctx.stroke();
        ctx.fillText(formatYearForDisplay(year), px + 4, h - 24);
        count += 1;
      }
      canvas.dataset['tickCount'] = String(count);
    };

    useImperativeHandle(ref, () => ({
      draw,
      setGesture: (active: boolean) => {
        if (gestureRef.current === active) return;
        gestureRef.current = active;
        const { start: from, end: to } = rangeRef.current;
        // On peint d'abord : masquer les graduations DOM avant d'avoir un
        // canvas valide laissait la frise entièrement vide.
        if (active && from !== null && to !== null && to > from) draw(from, to);
        if (overlayRef.current) overlayRef.current.style.opacity = active ? '0' : '1';
        if (canvasRef.current) canvasRef.current.style.opacity = active ? '1' : '0';
      },
    }));

    useEffect(() => {
      const element = overlayRef.current;
      if (!element || typeof ResizeObserver === 'undefined') return undefined;
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) setWidth(entry.contentRect.width);
      });
      observer.observe(element);
      setWidth(element.getBoundingClientRect().width);
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      if (!gestureRef.current && start !== null && end !== null) draw(start, end);
    }, [start, end, width]);

    const { ticks, periods } = useMemo(() => {
      if (start === null || end === null || end <= start) return { ticks: [], periods: [] };
      const span = end - start;
      const step = graduationStep(span, width);
      const first = Math.ceil(start / step) * step;
      const ticksList: number[] = [];
      for (let year = first; year <= end && ticksList.length < 32; year += step) {
        ticksList.push(year);
      }
      const position = (value: number) => ((value - start) / span) * 100;
      const periodsList = PERIODS.map((period) => {
        const from = Math.max(period.from, start);
        const to = Math.min(period.to, end);
        if (to <= from) return null;
        const fullLeft = position(period.from);
        const fullWidth = position(period.to) - fullLeft;
        const visibleWidth = position(to) - position(from);
        const labelLeft = position(from) - fullLeft + Math.min(1.5, visibleWidth / 4);
        return {
          ...period,
          left: fullLeft,
          width: fullWidth,
          labelLeft,
          showLabel: visibleWidth > 4,
        };
      }).filter((period): period is Period & { left: number; width: number; labelLeft: number; showLabel: boolean } => period !== null);
      return { ticks: ticksList.map((year) => ({ year, left: position(year) })), periods: periodsList };
    }, [start, end, width]);

    if (start === null || end === null) return null;

    return (
      <>
        <div ref={overlayRef} className={styles['overlay']} aria-hidden="true" data-testid="timeline-overlay">
          {periods.map((period) => (
            <div
              key={period.label}
              className={`${styles['period'] ?? ''} ${period.tone}`}
              style={{ left: `${String(period.left)}%`, width: `${String(period.width)}%` }}
              data-period={period.label}
            >
              {period.showLabel ? (
                <span className={styles['periodLabel']} style={{ left: `${String(period.labelLeft)}%` }}>
                  {period.label}
                </span>
              ) : null}
            </div>
          ))}
          {ticks.map((tick) => (
            <div key={tick.year} className={styles['tick']} style={{ left: `${String(tick.left)}%` }}>
              <span className={styles['tickLabel']}>{formatYearForDisplay(tick.year)}</span>
            </div>
          ))}
        </div>
        <canvas
          ref={canvasRef}
          className={styles['overlayCanvas']}
          aria-hidden="true"
          data-testid="timeline-overlay-canvas"
        />
      </>
    );
  }
);

export default TimelineOverlay;
