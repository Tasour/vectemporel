import { describe, expect, it } from 'vitest';
import {
  clamp,
  decayVelocity,
  normalizeWheelDelta,
  smoothedVelocity,
  spanForSpeed,
  timeShift,
} from './kinematics';

describe('timeline kinematics', () => {
  it('widens the window as the gesture gets faster', () => {
    const base = 500 * 365.25 * 24 * 3600 * 1000;
    expect(spanForSpeed(base, 100)).toBeGreaterThanOrEqual(base);
    expect(spanForSpeed(base, 2500)).toBeGreaterThan(base * 2);
  });

  it('bounds the window', () => {
    const base = 500 * 365.25 * 24 * 3600 * 1000;
    expect(spanForSpeed(base, 1_000_000)).toBeLessThanOrEqual(5000 * 365.25 * 24 * 3600 * 1000);
  });

  it('keeps a 1:1 pixel-to-time mapping', () => {
    const span = 1000;
    expect(timeShift(195, 390, span)).toBeCloseTo(500);
  });

  it('decays velocity', () => {
    expect(decayVelocity(1000, 180)).toBeLessThan(1000);
    expect(decayVelocity(1000, 0)).toBe(1000);
  });

  it('smooths velocity and normalizes wheel units', () => {
    expect(smoothedVelocity(0, 100, 100)).toBeGreaterThan(0);
    expect(normalizeWheelDelta(3, 1, 390)).toBe(48);
    expect(normalizeWheelDelta(0.5, 2, 390)).toBe(195);
    expect(clamp(5, 0, 3)).toBe(3);
  });
});
