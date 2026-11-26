/**
 * Cinématique du défilement temporel.
 *
 * Un seul intégrateur : chaque pixel est converti avec le **span instantané**
 * (pas celui du début du geste), et le span suit la vitesse. L'accélération
 * n'est donc pas ajoutée après coup : c'est l'élargissement de la fenêtre qui
 * fait que les pixels suivants couvrent davantage d'années.
 *
 *   Δt = (dx / largeur) × S(t)
 *   S_cible = S₀ × g(v),  g(v) = 1 + k·ln(1 + max(0, (|v| − v₀)/v₀))
 *
 * Le centre interne fait foi : il n'est jamais réinitialisé depuis une fenêtre
 * vis-timeline en retard pendant un geste.
 */

export const YEAR_MS = 365.25 * 24 * 3600 * 1000;

export const MIN_SPAN_MS = 40 * YEAR_MS;
export const MAX_SPAN_MS = 4500 * YEAR_MS;

export const MIN_YEAR = -2000;
export const MAX_YEAR = 2000;
export const WINDOW_MARGIN_YEARS = 250;

/** Règle virtuelle de la molette : même durée par cran sur tous les écrans. */
export const WHEEL_REFERENCE_WIDTH = 700;
export const MIN_WHEEL_DT_MS = 32;
export const MIN_DRAG_DT_MS = 8;
export const MAX_INPUT_DT_MS = 120;
export const MAX_FRAME_DT_MS = 64;

/** Vitesse lissée. */
export const VELOCITY_TAU_MS = 65;
export const MAX_VELOCITY = 3000;

/** Courbe vitesse → échelle : morte sous v₀, logarithmique ensuite. */
export const ZOOM_MIN_SPEED = 650;
export const ZOOM_SPEED_REF = 900;
export const ZOOM_GAIN = 0.9;
export const MAX_ZOOM_FACTOR = 2.5;
export const ZOOM_TAU_MS = 70;

/** Inertie : glisse maximum de 60 % de la largeur de référence. */
export const INERTIA_TAU_MS = 120;
export const COAST_BUDGET_RATIO = 0.6;

/** Un glisser peut marquer une pause sans devenir un nouveau geste. */
export const WHEEL_GESTURE_GAP_MS = 260;

/** Facteur du mode précision : 0,2 an par pixel au lieu de ~1,28. */
export const FINE_FACTOR = 0.2;
export const DRAG_GESTURE_GAP_MS = 700;



export interface GestureState {
  velocity: number;
  /** Échelle au début du geste (réancrée à l'arrêt). */
  baseSpan: number;
  /** Span instantané, utilisé pour convertir chaque pixel. */
  span: number;
  targetSpan: number;
  center: number;
  referenceWidth: number;
  /** Position du point d'ancrage du zoom, en fraction du span depuis le centre. */
  anchorOffset: number;
  distance: number;
  kind: 'wheel' | 'drag' | null;
  active: boolean;
  /** Le centre a-t-il déjà été initialisé depuis une fenêtre réelle ? */
  seeded: boolean;
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
  /** −0,5 = bord gauche, 0 = centre, +0,5 = bord droit. */
  anchorOffset?: number;
  /** Mode précision : déplacement ×0,2 et span plafonné à 1 an/pixel. */
  fine?: boolean;
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
  const alpha = clamp(dt / (dt + VELOCITY_TAU_MS), 0.08, 0.6);
  return clamp(previous * (1 - alpha) + instant * alpha, -MAX_VELOCITY, MAX_VELOCITY);
}

/**
 * Échelle cible pour une vitesse donnée. Continue : aucune marche à un seuil,
 * un cran isolé (≈ 700 px/s) ne zoome pas, une rafale élargit progressivement.
 */
export function spanForSpeed(baseSpan: number, speedPxPerSecond: number): number {
  const excess = Math.abs(speedPxPerSecond) - ZOOM_MIN_SPEED;
  const span = excess <= 0
    ? baseSpan
    : baseSpan * (1 + ZOOM_GAIN * Math.log1p(excess / ZOOM_SPEED_REF));
  return clamp(span, MIN_SPAN_MS, MAX_SPAN_MS);
}

/** Décroissance exponentielle de la vitesse après la dernière entrée. */
export function decayVelocity(velocity: number, dtMs: number, tau = INERTIA_TAU_MS): number {
  return velocity * Math.exp(-Math.max(dtMs, 0) / tau);
}

/** Correspondance pixel → temps, à l'échelle courante. */
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
    anchorOffset: 0,
    distance: 0,
    kind: null,
    active: false,
    seeded: false,
    lastInput: 0,
    lastFrame: 0,
    frame: 0,
  };
}

/**
 * Réaligne l'état sur une fenêtre choisie par l'extérieur (dialogue d'année,
 * autoplay, restauration). C'est le seul chemin autorisé à changer le centre
 * hors geste : une fenêtre vis-timeline en retard ne peut pas l'écraser.
 */
export function resetGestureToWindow(
  state: GestureState,
  centerMs: number,
  spanMs: number
): void {
  const span = clamp(spanMs, MIN_SPAN_MS, MAX_SPAN_MS);
  state.center = centerMs;
  state.baseSpan = span;
  state.span = span;
  state.targetSpan = span;
  state.velocity = 0;
  state.distance = 0;
  state.kind = null;
  state.active = false;
  state.seeded = true;
  state.lastFrame = 0;
}

/**
 * Enregistre un déplacement et retourne la fenêtre à appliquer immédiatement.
 * Le déplacement utilise `state.span` (échelle courante), pas `baseSpan`.
 */
export function applyGestureInput(state: GestureState, input: GestureInput): {
  center: number;
  span: number;
  targetSpan: number;
} {
  const width = Math.max(input.width, 1);
  const gap = input.kind === 'wheel' ? WHEEL_GESTURE_GAP_MS : DRAG_GESTURE_GAP_MS;
  const isNewGesture =
    state.kind === null ||
    state.kind !== input.kind ||
    !state.active ||
    input.now - state.lastInput > gap;

  if (isNewGesture) {
    const span = clamp(input.spanMs, MIN_SPAN_MS, MAX_SPAN_MS);
    state.baseSpan = span;
    state.span = span;
    state.targetSpan = span;

    // Le centre interne fait foi. Une fenêtre vis-timeline en retard ne doit
    // jamais réinitialiser le geste : seules les actions externes passent par
    // `resetGestureToWindow`.
    if (!state.seeded) {
      state.center = input.centerMs;
      state.seeded = true;
    }

    state.distance = 0;
    state.velocity = 0;
  }

  state.kind = input.kind;
  state.active = true;
  state.anchorOffset = clamp(input.anchorOffset ?? 0, -0.5, 0.5);
  state.referenceWidth = input.kind === 'wheel' ? WHEEL_REFERENCE_WIDTH : width;

  const floor = input.kind === 'wheel' ? MIN_WHEEL_DT_MS : MIN_DRAG_DT_MS;
  const dt = clamp(
    state.lastInput ? input.now - state.lastInput : floor,
    floor,
    MAX_INPUT_DT_MS
  );
  state.lastInput = input.now;

  // Le pixel est converti à l'échelle instantanée : c'est ici que l'accélération
  // s'intègre au mouvement, puisque `state.span` grandit avec la vitesse.
  // Glisser = molette : le doigt attrape le contenu. Vers la droite, les
  // années antérieures passent sous le doigt (passé) ; vers la gauche, futur.
  const direction = input.kind === 'drag' ? -1 : 1;
  const effectiveDelta = input.deltaPx * direction;
  const precision = input.fine ? FINE_FACTOR : 1;
  const shift = timeShift(effectiveDelta * precision, state.referenceWidth, state.span);
  state.center = clampCenterForSpan(state.center + shift, state.span);

  const cap = Math.min(
    MAX_VELOCITY,
    (COAST_BUDGET_RATIO * state.referenceWidth) / (INERTIA_TAU_MS / 1000)
  );
  state.velocity = clamp(smoothedVelocity(state.velocity, effectiveDelta, dt), -cap, cap);
  state.distance += Math.abs(effectiveDelta);

  // Sous le seuil de zoom, le geste reste précis : pas d'inertie. Un cran de
  // molette isolé translate lui aussi sans glisser.
  if (
    Math.abs(state.velocity) < ZOOM_MIN_SPEED ||
    (input.kind === 'wheel' && state.distance < 150)
  ) {
    state.velocity = 0;
  }

  state.targetSpan = spanForSpeed(state.baseSpan, state.velocity);

  if (input.fine) {
    // Garantit au plus 1 an/pixel : le span ne dépasse pas la largeur en années.
    const fineSpan = clamp(input.width * YEAR_MS, MIN_SPAN_MS, MAX_SPAN_MS);
    state.targetSpan = Math.min(state.targetSpan, fineSpan);
    state.velocity = 0;
  }

  state.lastFrame = 0;
  return { center: state.center, span: state.span, targetSpan: state.targetSpan };
}

/**
 * Avance d'une frame : interpolation du span vers la cible, puis déplacement
 * avec ce span interpolé. L'inertie conserve l'échelle atteinte (pas de retour).
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
  const shift = timeShift((state.velocity * dt) / 1000, state.referenceWidth, nextSpan);
  // Ancre le zoom sous le doigt/curseur : le temps sous ce point reste fixe.
  const anchorTime = state.center + state.anchorOffset * state.span;
  const nextCenter = clampCenterForSpan(
    anchorTime - state.anchorOffset * nextSpan + shift,
    nextSpan
  );

  state.velocity = decayVelocity(state.velocity, dt);
  if (shift !== 0 && nextCenter === state.center) state.velocity = 0;
  state.center = nextCenter;
  state.span = nextSpan;

  const quiet = now - state.lastInput > (state.kind === 'wheel' ? WHEEL_GESTURE_GAP_MS : DRAG_GESTURE_GAP_MS);
  const expired = now - state.lastInput > DRAG_GESTURE_GAP_MS + 800;
  const settled =
    expired ||
    (quiet &&
      Math.abs(state.velocity) < 15 &&
      Math.abs(nextSpan - target) <= Math.max(1, state.baseSpan * 0.002));

  if (settled) {
    state.velocity = 0;
    state.span = target;
    state.center = msForYear(new Date(state.center).getFullYear());
    state.targetSpan = target;
    state.baseSpan = target; // réancrage : le geste suivant part de l'échelle visible
    state.distance = 0;
    state.kind = null;
    state.active = false;
    state.lastFrame = 0;
    return { center: state.center, span: state.span, active: false };
  }

  return { center: state.center, span: state.span, active: true };
}
