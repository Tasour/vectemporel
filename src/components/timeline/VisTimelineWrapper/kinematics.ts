/**
 * Cinématique du défilement temporel : vitesse → date, puis vitesse → zoom.
 *
 * Deux règles structurent le modèle :
 *  1. la distance temporelle est calculée avec la fenêtre au début du geste
 *     (`baseSpan`), jamais avec la fenêtre déjà élargie — sinon chaque pixel
 *     de l'inertie vaut de plus en plus d'années et le geste s'emballe ;
 *  2. le zoom n'est déclenché que par une vitesse *soutenue*, pas par un cran
 *     de molette isolé.
 *
 * Toutes les fonctions sont pures ou mutent un `GestureState` explicite : les
 * tests d'ergonomie simulent exactement le même chemin que le composant.
 */

export const YEAR_MS = 365.25 * 24 * 3600 * 1000;

export const MIN_SPAN_MS = 40 * YEAR_MS;
export const MAX_SPAN_MS = 4500 * YEAR_MS;

export const MIN_YEAR = -2000;
export const MAX_YEAR = 2000;
export const WINDOW_MARGIN_YEARS = 250;

/** Une molette est calibrée sur une règle virtuelle, pas sur la largeur réelle. */
export const WHEEL_REFERENCE_WIDTH = 700;
export const MIN_WHEEL_DT_MS = 32;
export const MIN_DRAG_DT_MS = 8;
export const MAX_INPUT_DT_MS = 120;
export const MAX_FRAME_DT_MS = 64;

/** Vitesse lissée : moyenne exponentielle, bornée. */
export const VELOCITY_TAU_MS = 70;
export const MAX_VELOCITY = 2500;

/** Zoom : déclenché seulement après un geste soutenu et rapide. */
export const ZOOM_MIN_SAMPLES = 3;
export const ZOOM_MIN_DISTANCE = 150;
export const ZOOM_MIN_SPEED = 700;
export const ZOOM_SPEED_REF = 1200;
export const ZOOM_GAIN = 0.45;
export const MAX_ZOOM_FACTOR = 2.5;
export const ZOOM_TAU_MS = 100;

/** Inertie : glisse maximum de 60 % de la largeur de référence. */
export const INERTIA_TAU_MS = 120;
export const COAST_BUDGET_RATIO = 0.6;
export const GESTURE_GAP_MS = 260;

export interface GestureState {
  velocity: number;
  baseSpan: number;
  span: number;
  targetSpan: number;
  center: number;
  referenceWidth: number;
  samples: number;
  distance: number;
  kind: 'wheel' | 'drag' | null;
  /** Reste vrai tant que le geste n'a pas été au calme assez longtemps. */
  active: boolean;
  lastInput: number;
  lastFrame: number;
  frame: number;
}

export interface GestureInput {
  deltaPx: number;
  centerMs: number;
  spanMs: number;
  width: number;
  now: number;
  kind: 'wheel' | 'drag';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Millisecondes correspondant au 1er janvier d'une année. */
export function msForYear(year: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, 0, 1);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

/** Convertit les unités de molette en pixels virtuels. */
export function normalizeWheelDelta(delta: number, mode: number, width: number): number {
  if (mode === 1) return delta * 20;
  if (mode === 2) return delta * Math.max(width, 1);
  return delta;
}

/** Vitesse lissée en px/s. Une moyenne exponentielle évite les à-coups. */
export function smoothedVelocity(previous: number, deltaPx: number, dtMs: number): number {
  const dt = Math.max(dtMs, MIN_DRAG_DT_MS);
  const instant = (deltaPx / dt) * 1000;
  const alpha = clamp(dt / (dt + VELOCITY_TAU_MS), 0.05, 0.5);
  return clamp(previous * (1 - alpha) + instant * alpha, -MAX_VELOCITY, MAX_VELOCITY);
}

/**
 * Plus le geste est rapide, plus la fenêtre est large — mais le facteur reste
 * borné à 2,5 et une faible vitesse ne dézoome pas.
 */
export function spanForSpeed(baseSpan: number, speedPxPerSecond: number): number {
  if (Math.abs(speedPxPerSecond) < ZOOM_MIN_SPEED) {
    return clamp(baseSpan, MIN_SPAN_MS, MAX_SPAN_MS);
  }
  const normalized = clamp(Math.abs(speedPxPerSecond) / ZOOM_SPEED_REF, 0, 12);
  const factor = clamp(1 + ZOOM_GAIN * Math.log1p(normalized), 1, MAX_ZOOM_FACTOR);
  return clamp(baseSpan * factor, MIN_SPAN_MS, MAX_SPAN_MS);
}

/** Décroissance exponentielle de la vitesse après la dernière entrée. */
export function decayVelocity(velocity: number, dtMs: number, tau = INERTIA_TAU_MS): number {
  return velocity * Math.exp(-Math.max(dtMs, 0) / tau);
}

/** Correspondance pixel → temps, à l'échelle de référence du geste. */
export function timeShift(deltaPx: number, referenceWidth: number, span: number): number {
  return (deltaPx / Math.max(referenceWidth, 1)) * span;
}

/** Le centre reste dans la plage sélectionnable. */
export function clampCenterMs(ms: number): number {
  const year = new Date(ms).getFullYear();
  const clamped = clamp(year, MIN_YEAR, MAX_YEAR);
  if (clamped === year) return ms;
  return msForYear(clamped);
}

/** La fenêtre entière reste dans les bornes vis-timeline (année ± marge). */
export function clampCenterForSpan(centerMs: number, spanMs: number): number {
  const half = Math.min(spanMs, MAX_SPAN_MS) / 2;
  const min = msForYear(MIN_YEAR - WINDOW_MARGIN_YEARS) + half;
  const max = msForYear(MAX_YEAR + WINDOW_MARGIN_YEARS) - half;
  if (min > max) return (min + max) / 2;
  return clamp(centerMs, min, max);
}

export function createGestureState(): GestureState {
  return {
    velocity: 0,
    baseSpan: 0,
    span: 0,
    targetSpan: 0,
    center: 0,
    referenceWidth: WHEEL_REFERENCE_WIDTH,
    samples: 0,
    distance: 0,
    kind: null,
    active: false,
    lastInput: 0,
    lastFrame: 0,
    frame: 0,
  };
}

/**
 * Enregistre un déplacement (molette, souris ou tactile) et retourne la
 * fenêtre à appliquer immédiatement. Le zoom n'est qu'une cible : c'est
 * `advanceMotion` qui l'interpole dans l'unique boucle rAF.
 */
export function applyGestureInput(state: GestureState, input: GestureInput): {
  center: number;
  span: number;
  targetSpan: number;
} {
  const width = Math.max(input.width, 1);
  const isNewGesture =
    state.kind === null ||
    state.kind !== input.kind ||
    !state.active ||
    input.now - state.lastInput > GESTURE_GAP_MS;

  if (isNewGesture) {
    state.baseSpan = clamp(input.spanMs, MIN_SPAN_MS, MAX_SPAN_MS);
    state.span = state.baseSpan;
    state.targetSpan = state.baseSpan;
    state.center = input.centerMs;
    state.samples = 0;
    state.distance = 0;
    state.velocity = 0;
  }

  state.kind = input.kind;
  state.active = true;
  state.referenceWidth = input.kind === 'wheel' ? WHEEL_REFERENCE_WIDTH : width;

  const floor = input.kind === 'wheel' ? MIN_WHEEL_DT_MS : MIN_DRAG_DT_MS;
  const rawDt = state.lastInput ? input.now - state.lastInput : floor;
  const dt = clamp(rawDt, floor, MAX_INPUT_DT_MS);
  state.lastInput = input.now;

  const shift = timeShift(input.deltaPx, state.referenceWidth, state.baseSpan);
  state.center = clampCenterForSpan(state.center + shift, state.baseSpan);

  const cap = Math.min(MAX_VELOCITY, (COAST_BUDGET_RATIO * state.referenceWidth) / (INERTIA_TAU_MS / 1000));
  state.velocity = clamp(smoothedVelocity(state.velocity, input.deltaPx, dt), -cap, cap);
  state.samples += 1;
  state.distance += Math.abs(input.deltaPx);

  const sustained =
    state.samples >= ZOOM_MIN_SAMPLES || state.distance >= ZOOM_MIN_DISTANCE;
  const fastEnough = Math.abs(state.velocity) >= ZOOM_MIN_SPEED;

  state.targetSpan = sustained && fastEnough
    ? spanForSpeed(state.baseSpan, state.velocity)
    : state.baseSpan;

  // Un cran isolé ou un glisser lent ne doit ni zoomer ni glisser. En revanche
  // on laisse la vitesse s'accumuler pendant les premières frames d'un flick,
  // sinon un geste rapide jamais atteint le seuil de zoom.
  const isolatedWheel = input.kind === 'wheel' && state.samples === 1 && state.distance < ZOOM_MIN_DISTANCE;
  if (isolatedWheel || Math.abs(state.velocity) < ZOOM_MIN_SPEED / 2) {
    state.velocity = 0;
  }

  state.lastFrame = 0;
  return { center: state.center, span: state.span, targetSpan: state.targetSpan };
}

/**
 * Avance d'une frame d'animation : inertie sur `baseSpan`, interpolation du zoom
 * vers `targetSpan`, puis réancrage de l'échelle à l'arrêt.
 */
export function advanceMotion(state: GestureState, now: number): {
  center: number;
  span: number;
  active: boolean;
} {
  const dt = state.lastFrame ? clamp(now - state.lastFrame, 1, MAX_FRAME_DT_MS) : 16;
  state.lastFrame = now;

  const target = state.targetSpan > 0 ? state.targetSpan : state.span;
  const nextSpan = target + (state.span - target) * Math.exp(-dt / ZOOM_TAU_MS);
  const shift = timeShift((state.velocity * dt) / 1000, state.referenceWidth, state.baseSpan);
  const nextCenter = clampCenterForSpan(state.center + shift, nextSpan);

  state.velocity = decayVelocity(state.velocity, dt);
  if (shift !== 0 && nextCenter === state.center) state.velocity = 0;
  state.center = nextCenter;
  state.span = nextSpan;

  // On ne clôt le geste qu'après un silence : sinon une rafale de crans serait
  // décutée en gestes indépendants et ne déclencherait jamais le zoom.
  const quiet = now - state.lastInput > GESTURE_GAP_MS;
  // Délai absolu : si les frames sont rares (GPU occupé), le temps simulé par
  // `dt` avance moins vite que l'horloge. On garantit quand même la fin du
  // geste ~1,2 s après la dernière entrée.
  const expired = now - state.lastInput > GESTURE_GAP_MS + 1000;
  const settled =
    expired ||
    (quiet &&
      Math.abs(state.velocity) < 15 &&
      Math.abs(nextSpan - target) <= Math.max(1, state.baseSpan * 0.002));

  if (settled) {
    state.velocity = 0;
    state.span = target;
    state.targetSpan = target;
    state.baseSpan = target; // réancrage : le geste suivant part de l'échelle visible
    state.samples = 0;
    state.distance = 0;
    state.kind = null;
    state.active = false;
    state.lastFrame = 0;
    return { center: state.center, span: state.span, active: false };
  }

  return { center: state.center, span: state.span, active: true };
}
