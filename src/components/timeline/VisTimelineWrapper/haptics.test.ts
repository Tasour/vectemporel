import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HapticDetents, detentPattern, detentStep } from './haptics';

const vibrate = vi.fn();

describe('haptic detents', () => {
  beforeEach(() => {
    vibrate.mockReset();
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: vibrate,
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
    expect(detents.update(1000, 500, false, 'vibrate', 1000)).toBeNull();
    expect(detents.update(1040, 500, false, 'vibrate', 1010)).toBeNull();
    const crossed = detents.update(1100, 500, false, 'vibrate', 1020);
    expect(crossed?.pattern).toBe(35);
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(detents.update(1100, 500, false, 'vibrate', 1100)).toBeNull();
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('uses a distinct pattern for major detents', () => {
    const detents = new HapticDetents();
    detents.update(1990, 500, false, 'vibrate', 1000);
    const major = detents.update(2000, 500, false, 'vibrate', 1100);
    expect(major?.pattern).toEqual([50, 30, 50]);
  });

  it('returns a visual detent without vibrating in visual mode', () => {
    const detents = new HapticDetents();
    detents.update(1000, 500, false, 'visual', 1000);
    const detent = detents.update(1100, 500, false, 'visual', 1010);
    expect(detent?.status).toBe('visual');
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('uses sound without vibrating in sound mode', () => {
    const detents = new HapticDetents();
    detents.update(1000, 500, false, 'sound', 1000);
    const detent = detents.update(1100, 500, false, 'sound', 1010);
    expect(detent?.status).toBe('sound');
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('uses one-year detents in precision mode', () => {
    expect(detentPattern(1, 1001)).toBe(35);
    expect(detentStep(500, true)).toBe(1);
  });
});
