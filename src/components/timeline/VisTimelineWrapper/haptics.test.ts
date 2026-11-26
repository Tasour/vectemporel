import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HapticDetents, detentPattern, detentStep } from './haptics';

describe('haptic detents', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      ...navigator,
      vibrate: vi.fn(),
    });
  });

  it('adapts the detent step to the visible span', () => {
    expect(detentStep(5000, false)).toBe(500);
    expect(detentStep(1200, false)).toBe(200);
    expect(detentStep(500, false)).toBe(100);
    expect(detentStep(250, false)).toBe(50);
    expect(detentStep(150, false)).toBe(20);
    expect(detentStep(80, false)).toBe(10);
    expect(detentStep(500, true)).toBe(1);
  });

  it('vibrates once per crossed detent, not within the same detent', () => {
    const detents = new HapticDetents();
    expect(detents.update(1000, 500, false, true, 1000)).toBeNull();
    expect(detents.update(1040, 500, false, true, 1010)).toBeNull();
    const crossed = detents.update(1100, 500, false, true, 1020);
    expect(crossed?.pattern).toBe(5);
    expect(navigator.vibrate).toHaveBeenCalledTimes(1);
    expect(detents.update(1100, 500, false, true, 1100)).toBeNull();
    expect(navigator.vibrate).toHaveBeenCalledTimes(1);
  });

  it('uses a distinct pattern for major detents', () => {
    const detents = new HapticDetents();
    detents.update(1990, 500, false, true, 1000);
    const major = detents.update(2000, 500, false, true, 1100);
    expect(major?.pattern).toEqual([8, 16, 8]);
  });

  it('does nothing when haptics are disabled', () => {
    const detents = new HapticDetents();
    detents.update(1000, 500, false, false, 1000);
    expect(detents.update(1100, 500, false, false, 1010)).toBeNull();
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });

  it('uses one-year detents in precision mode', () => {
    expect(detentPattern(1, 1001)).toBe(5);
    expect(detentStep(500, true)).toBe(1);
  });
});
