/**
 * Crans haptiques de la timeline.
 *
 * `navigator.vibrate` est le seul accès web à la vibration : Android/Chrome en
 * HTTPS. Sur iOS, l'API est absente et l'appel est simplement ignoré.
 */

/** Pas du cran en années, selon l'échelle visible. */
export function detentStep(spanYears: number, fine: boolean): number {
  if (fine) return 1;
  if (spanYears >= 2000) return 500;
  if (spanYears >= 1000) return 200;
  if (spanYears >= 500) return 100;
  if (spanYears >= 200) return 50;
  if (spanYears >= 100) return 20;
  return 10;
}

/** Motif de vibration : cran normal ou cran majeur (décade de crans). */
export function detentPattern(step: number, year: number): number | number[] {
  const major = step * 10;
  return Math.floor(year / major) !== Math.floor((year - step) / major) ? [8, 16, 8] : 5;
}

export interface DetentResult {
  step: number;
  year: number;
  pattern: number | number[];
}

export class HapticDetents {
  private lastIndex = Number.NaN;
  private lastAt = 0;

  /** Retourne le cran franchi, ou null si aucun. */
  update(year: number, spanYears: number, fine: boolean, enabled: boolean, nowMs?: number): DetentResult | null {
    if (!enabled || !Number.isFinite(year)) {
      this.lastIndex = Number.NaN;
      return null;
    }
    const step = detentStep(spanYears, fine);
    const index = Math.floor(year / step);
    if (!Number.isFinite(this.lastIndex)) {
      this.lastIndex = index;
      return null;
    }
    if (index === this.lastIndex) return null;

    const now = nowMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now - this.lastAt < 24) {
      this.lastIndex = index;
      return null;
    }
    this.lastIndex = index;
    this.lastAt = now;

    const pattern = detentPattern(step, year);
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Vibration refusée (permission, iOS, etc.) : le geste continue.
      }
    }
    return { step, year, pattern };
  }

  reset(): void {
    this.lastIndex = Number.NaN;
    this.lastAt = 0;
  }
}

export const hapticDetents = new HapticDetents();
