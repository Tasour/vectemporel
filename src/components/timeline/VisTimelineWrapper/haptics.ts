/**
 * Crans haptiques robustes.
 *
 * `navigator.vibrate` n'existe pas sur iOS et peut être refusé sur Android
 * (DND, économie de batterie, WebView). On détecte, on tente au maximum deux
 * fois, puis on bascule sur le repli visuel.
 */

export type HapticsMode = 'auto' | 'vibrate' | 'visual';
export type HapticsStatus = 'ok' | 'unsupported' | 'refused' | 'blocked' | 'error' | 'visual';

export interface HapticsCapability {
  api: boolean;
  platform: 'android' | 'ios' | 'desktop' | 'unknown';
  brave: boolean;
  touch: boolean;
  standalone: boolean;
  userActivation: boolean;
  userAgent: string;
}

let refusals = 0;
let blocked = false;
let lastStatus: HapticsStatus = 'visual';

export function detectHaptics(): HapticsCapability {
  if (typeof navigator === 'undefined') {
    return {
      api: false,
      platform: 'unknown',
      brave: false,
      touch: false,
      standalone: false,
      userActivation: false,
      userAgent: '',
    };
  }
  const nav = navigator as unknown as {
    userAgent?: string;
    maxTouchPoints?: number;
    vibrate?: unknown;
    brave?: unknown;
    userActivation?: { hasBeenActive?: boolean };
  };
  const userAgent = nav.userAgent ?? '';
  const platform = /android/i.test(userAgent)
    ? 'android'
    : /iphone|ipad|ipod/i.test(userAgent)
      ? 'ios'
      : 'desktop';
  const standalone = typeof matchMedia === 'function'
    && matchMedia('(display-mode: standalone)').matches;
  return {
    api: typeof nav.vibrate === 'function',
    platform,
    brave: Boolean(nav.brave),
    touch: (nav.maxTouchPoints ?? 0) > 0,
    standalone,
    userActivation: nav.userActivation?.hasBeenActive === true,
    userAgent,
  };
}

/** Appel sûr : renvoie le statut réel et coupe après deux refus. */
export function vibrateSafely(pattern: number | number[]): {
  status: HapticsStatus;
  accepted: boolean;
} {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    lastStatus = 'unsupported';
    return { status: 'unsupported', accepted: false };
  }
  if (blocked) {
    lastStatus = 'blocked';
    return { status: 'blocked', accepted: false };
  }
  try {
    const accepted = navigator.vibrate(pattern);
    lastStatus = accepted ? 'ok' : 'refused';
    if (accepted) {
      refusals = 0;
    } else {
      refusals += 1;
      if (refusals >= 2) blocked = true;
    }
    return { status: lastStatus, accepted };
  } catch {
    lastStatus = 'error';
    return { status: 'error', accepted: false };
  }
}

export function getLastHapticsStatus(): HapticsStatus {
  return lastStatus;
}

export function resetHapticsGuard(): void {
  refusals = 0;
  blocked = false;
  lastStatus = 'visual';
}

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
  return Math.floor(year / major) !== Math.floor((year - step) / major) ? [50, 30, 50] : 35;
}

export interface DetentResult {
  step: number;
  year: number;
  pattern: number | number[];
  status: HapticsStatus;
}

export class HapticDetents {
  private lastIndex = Number.NaN;
  private lastAt = 0;

  /** Retourne le cran franchi, ou null si aucun. */
  update(
    year: number,
    spanYears: number,
    fine: boolean,
    mode: HapticsMode,
    nowMs?: number
  ): DetentResult | null {
    if (!Number.isFinite(year)) {
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
    if (now - this.lastAt < 45) {
      this.lastIndex = index;
      return null;
    }
    this.lastIndex = index;
    this.lastAt = now;

    const pattern = detentPattern(step, year);
    let status: HapticsStatus = 'visual';
    if (mode === 'auto' || mode === 'vibrate') {
      status = vibrateSafely(pattern).status;
    }
    return { step, year, pattern, status };
  }

  reset(): void {
    this.lastIndex = Number.NaN;
    this.lastAt = 0;
  }
}

export const hapticDetents = new HapticDetents();
