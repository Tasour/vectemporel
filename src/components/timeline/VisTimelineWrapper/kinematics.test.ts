import { describe, expect, it } from 'vitest';
import {
  advanceMotion,
  applyGestureInput,
  clamp,
  clampCenterForSpan,
  clampCenterMs,
  createGestureState,
  decayVelocity,
  MAX_SPAN_MS,
  MIN_SPAN_MS,
  msForYear,
  normalizeWheelDelta,
  smoothedVelocity,
  spanForSpeed,
  timeShift,
  YEAR_MS,
} from './kinematics';

type Kind = 'wheel' | 'drag';

interface Sample {
  deltaPx: number;
  dtMs: number;
}

interface Simulation {
  year: number;
  spanYears: number;
  maxFrameShiftYears: number;
  frames: number;
}

/**
 * Simule exactement le chemin du composant : entrées, frames rAF intercalées,
 * puis stabilisation. `span0` est de 500 ans et l'année de départ 1000.
 */
function simulate(
  samples: Sample[],
  options: { width: number; kind: Kind; startYear?: number; settleMs?: number; lagYears?: number }
): Simulation {
  let now = 1000;
  let center = msForYear(options.startYear ?? 1000);
  let span = 500 * YEAR_MS;
  const state = createGestureState();
  // Le composant initialise aussi l'état au chargement, avant tout geste.
  state.baseSpan = span;
  state.span = span;
  state.targetSpan = span;
  state.center = center;
  state.seeded = true;
  let maxFrameShiftYears = 0;
  let frames = 0;

  const advanceUntil = (until: number): void => {
    let guard = 0;
    while (now < until && guard < 1000) {
      now += 16;
      guard += 1;
      const motion = advanceMotion(state, now);
      frames += 1;
      maxFrameShiftYears = Math.max(
        maxFrameShiftYears,
        Math.abs(motion.center - center) / YEAR_MS
      );
      center = motion.center;
      span = motion.span;
      if (!motion.active) break;
    }
    now = until;
  };

  for (const sample of samples) {
    advanceUntil(now + sample.dtMs);
    const result = applyGestureInput(state, {
      deltaPx: sample.deltaPx,
      centerMs: center - (options.lagYears ?? 0) * YEAR_MS,
      spanMs: span,
      width: options.width,
      now,
      kind: options.kind,
    });
    center = result.center;
    span = result.span;
  }

  advanceUntil(now + (options.settleMs ?? 1600));
  return {
    year: new Date(center).getFullYear(),
    spanYears: span / YEAR_MS,
    maxFrameShiftYears,
    frames,
  };
}

function burst(count: number, deltaPx: number, dtMs: number): Sample[] {
  return Array.from({ length: count }, () => ({ deltaPx, dtMs }));
}

describe('timeline kinematics — primitives', () => {
  it('widens the window only with sustained speed, and bounds it', () => {
    const base = 500 * YEAR_MS;
    expect(spanForSpeed(base, 0)).toBe(base);
    expect(spanForSpeed(base, 400)).toBe(base);
    expect(spanForSpeed(base, 800)).toBeGreaterThan(base);
    expect(spanForSpeed(base, 1200)).toBeGreaterThan(base);
    expect(spanForSpeed(base, 100_000)).toBeLessThanOrEqual(MAX_SPAN_MS);
    expect(spanForSpeed(MIN_SPAN_MS, 0)).toBeGreaterThanOrEqual(MIN_SPAN_MS);
  });

  it('keeps a 1:1 pixel-to-time mapping', () => {
    expect(timeShift(195, 390, 1000)).toBeCloseTo(500);
    expect(timeShift(100, 700, 500)).toBeCloseTo(500 / 7);
  });

  it('decays velocity and smooths wheel units', () => {
    expect(decayVelocity(1000, 0)).toBe(1000);
    expect(decayVelocity(1000, 120)).toBeLessThan(500);
    expect(smoothedVelocity(0, 100, 100)).toBeGreaterThan(0);
    expect(normalizeWheelDelta(3, 1, 390)).toBe(60);
    expect(normalizeWheelDelta(0.5, 2, 390)).toBe(195);
    expect(clamp(5, 0, 3)).toBe(3);
  });

  it('clamps the whole window, not only its center', () => {
    const half = (500 * YEAR_MS) / 2;
    const min = msForYear(-2250) + half;
    const max = msForYear(2250) - half;
    expect(Math.abs(clampCenterForSpan(msForYear(-1999), 500 * YEAR_MS) - min)).toBeLessThan(2 * YEAR_MS);
    expect(Math.abs(clampCenterForSpan(msForYear(1999), 500 * YEAR_MS) - max)).toBeLessThan(2 * YEAR_MS);
    expect(clampCenterMs(msForYear(5000))).toBe(msForYear(2000));
  });
});

describe('timeline ergonomics — calibrated gestures', () => {
  it('one wheel notch translates precisely and does not zoom', () => {
    const result = simulate([{ deltaPx: 100, dtMs: 16 }], { width: 390, kind: 'wheel' });
    const shift = result.year - 1000;
    expect(shift).toBeGreaterThan(60);
    expect(shift).toBeLessThan(90);
    expect(result.spanYears / 500).toBeLessThan(1.02);
    expect(result.maxFrameShiftYears).toBeLessThan(50);
  });

  it('three rapid notches move further and start widening the window', () => {
    const result = simulate(burst(3, 100, 40), { width: 390, kind: 'wheel' });
    const shift = result.year - 1000;
    expect(shift).toBeGreaterThan(250);
    expect(shift).toBeLessThan(450);
    expect(result.spanYears / 500).toBeGreaterThan(1.2);
    expect(result.spanYears / 500).toBeLessThan(1.6);
  });

  it('a fast burst reaches a distant year and zooms out without runaway', () => {
    const result = simulate(burst(10, 100, 12), { width: 390, kind: 'wheel' });
    const shift = result.year - 1000;
    expect(shift).toBeGreaterThan(600);
    expect(result.spanYears / 500).toBeGreaterThan(1.45);
    expect(result.maxFrameShiftYears).toBeLessThan(result.spanYears * 0.2);
  });

  it('a slow 100px drag stays 1:1 on mobile', () => {
    const result = simulate(burst(10, 10, 16), { width: 390, kind: 'drag' });
    expect(result.year - 1000).toBeGreaterThanOrEqual(123);
    expect(result.year - 1000).toBeLessThanOrEqual(133);
    expect(result.spanYears / 500).toBeLessThan(1.02);
  });

  it('a slow 100px drag stays 1:1 on desktop', () => {
    const result = simulate(burst(10, 10, 16), { width: 1658, kind: 'drag' });
    expect(result.year - 1000).toBeGreaterThanOrEqual(28);
    expect(result.year - 1000).toBeLessThanOrEqual(34);
  });

  it('a fast flick zooms out and coasts less than one window', () => {
    const result = simulate(burst(6, 50, 16), { width: 390, kind: 'drag' });
    expect(result.year - 1000).toBeGreaterThan(300);
    expect(result.spanYears / 500).toBeGreaterThan(1.25);
    expect(result.maxFrameShiftYears).toBeLessThan(result.spanYears * 0.2);
  });

  it('never rewinds when the reported window lags behind the gesture', () => {
    const samples = burst(10, 20, 30);
    const lagged = simulate(samples, { width: 390, kind: 'drag', lagYears: 120 });
    const reference = simulate(samples, { width: 390, kind: 'drag' });
    expect(lagged.year).toBeGreaterThanOrEqual(1000);
    expect(Math.abs(lagged.year - reference.year)).toBeLessThan(20);
  });

  it('drag and wheel share the same direction', () => {
    const forwards = simulate(burst(8, 30, 20), { width: 390, kind: 'drag' });
    const backwards = simulate(burst(8, -30, 20), { width: 390, kind: 'drag' });
    expect(forwards.year).toBeGreaterThan(1000);
    expect(backwards.year).toBeLessThan(1000);
    expect(Math.abs(forwards.year - 1000)).toBeCloseTo(Math.abs(backwards.year - 1000), -1);
  });

  it('never leaves the selectable range, even under a long burst', () => {
    const forwards = simulate(burst(40, 100, 12), { width: 390, kind: 'wheel' });
    const backwards = simulate(burst(40, -100, 12), { width: 390, kind: 'wheel' });
    expect(forwards.year).toBeLessThanOrEqual(2000);
    expect(backwards.year).toBeGreaterThanOrEqual(-2000);
    expect(forwards.spanYears).toBeLessThanOrEqual(MAX_SPAN_MS / YEAR_MS);
  });

  it('settles within one second after the last input', () => {
    const result = simulate(burst(5, 100, 20), {
      width: 390,
      kind: 'wheel',
      settleMs: 1000,
    });
    expect(result.maxFrameShiftYears).toBeLessThan(result.spanYears * 0.2);
    expect(result.frames).toBeLessThan(80);
  });
});
