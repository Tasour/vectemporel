/** Cinématique du défilement temporel : vitesse → date, puis vitesse → zoom. */

export const MIN_SPAN_MS = 40 * 365.25 * 24 * 3600 * 1000;
export const MAX_SPAN_MS = 5000 * 365.25 * 24 * 3600 * 1000;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Convertit les unités de molette en pixels. */
export function normalizeWheelDelta(delta: number, mode: number, width: number): number {
  if (mode === 1) return delta * 16;
  if (mode === 2) return delta * Math.max(width, 1);
  return delta;
}

/** Vitesse lissée en px/s. Une moyenne exponentielle évite les à-coups. */
export function smoothedVelocity(previous: number, deltaPx: number, dtMs: number): number {
  if (dtMs <= 0) return previous;
  const instant = (deltaPx / dtMs) * 1000;
  const alpha = clamp(dtMs / (dtMs + 90), 0.15, 0.85);
  return clamp(previous * (1 - alpha) + instant * alpha, -4000, 4000);
}

/**
 * Plus le geste est rapide, plus la fenêtre est large : une forte accélération
 * vers le futur fait défiler beaucoup d'années tout en dézoomant la timeline.
 */
export function spanForSpeed(baseSpan: number, speedPxPerSecond: number): number {
  const normalized = clamp(Math.abs(speedPxPerSecond) / 900, 0, 24);
  const factor = clamp(1 + 0.8 * Math.log1p(normalized), 1, 8);
  return clamp(baseSpan * factor, MIN_SPAN_MS, MAX_SPAN_MS);
}

/** Décroissance exponentielle de la vitesse après la dernière entrée. */
export function decayVelocity(velocity: number, dtMs: number, tau = 180): number {
  return velocity * Math.exp(-Math.max(dtMs, 0) / tau);
}

/** Déplacement temporel correspondant à un déplacement en pixels. */
export function timeShift(deltaPx: number, width: number, span: number): number {
  return (deltaPx / Math.max(width, 1)) * span;
}

/** Le centre reste dans la plage sélectionnable, même si l'inertie continue. */
export function clampCenterMs(ms: number): number {
  const year = new Date(ms).getFullYear();
  const clamped = clamp(year, -2000, 2000);
  if (clamped === year) return ms;
  const date = new Date(0);
  date.setFullYear(clamped, 0, 1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
