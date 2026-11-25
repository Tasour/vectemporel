/** Surcouche de graduation et de grandes périodes au-dessus de la timeline. */

import React, { useMemo } from 'react';
import { formatYearForDisplay } from '@/utils/yearUtils';
import styles from './TimelineOverlay.module.css';

export interface TimelineOverlayProps {
  start: number | null;
  end: number | null;
}

const PERIODS = [
  { label: 'Antiquité', from: -2000, to: 500 },
  { label: 'Moyen Âge', from: 500, to: 1500 },
  { label: 'Temps modernes', from: 1500, to: 1800 },
  { label: 'Contemporain', from: 1800, to: 2000 },
];

export const TimelineOverlay: React.FC<TimelineOverlayProps> = ({ start, end }) => {
  const { ticks, periods } = useMemo(() => {
    if (start === null || end === null || end <= start) return { ticks: [], periods: [] };
    const span = end - start;
    const step = span > 1200 ? 500 : span > 400 ? 100 : span > 80 ? 20 : 10;
    const first = Math.ceil(start / step) * step;
    const ticksList: number[] = [];
    for (let year = first; year <= end && ticksList.length < 24; year += step) {
      ticksList.push(year);
    }
    const position = (value: number) => ((value - start) / span) * 100;
    const periodsList = PERIODS.map((period) => {
      const from = Math.max(period.from, start);
      const to = Math.min(period.to, end);
      if (to <= from) return null;
      return { ...period, left: position(from), width: position(to) - position(from) };
    }).filter((period): period is { label: string; from: number; to: number; left: number; width: number } => period !== null);
    return { ticks: ticksList.map((year) => ({ year, left: position(year) })), periods: periodsList };
  }, [start, end]);

  if (start === null || end === null) return null;

  return (
    <div className={styles['overlay']} aria-hidden="true" data-testid="timeline-overlay">
      {periods.map((period) => (
        <div key={period.label} className={styles['period']} style={{ left: `${String(period.left)}%`, width: `${String(period.width)}%` }}>
          <span className={styles['periodLabel']}>{period.label}</span>
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
