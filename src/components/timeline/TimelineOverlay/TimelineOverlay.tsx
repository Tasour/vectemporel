/** Surcouche de graduation et de grandes périodes au-dessus de la timeline. */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatYearForDisplay } from '@/utils/yearUtils';
import { graduationStep } from './graduation';
import styles from './TimelineOverlay.module.css';

export interface TimelineOverlayProps {
  start: number | null;
  end: number | null;
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

export const TimelineOverlay: React.FC<TimelineOverlayProps> = ({ start, end }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

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
  );
};

export default TimelineOverlay;
