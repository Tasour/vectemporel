import { describe, expect, it } from 'vitest';
import { graduationStep } from './graduation';

describe('graduationStep', () => {
  it('grows with the visible span', () => {
    expect(graduationStep(500, 390)).toBeLessThan(graduationStep(4000, 390));
  });

  it('uses a 1-2-5 decade sequence', () => {
    for (const span of [100, 500, 1200, 2500, 4000]) {
      const step = graduationStep(span, 390);
      const power = 10 ** Math.floor(Math.log10(step));
      expect([1, 2, 5, 10]).toContain(step / power);
    }
  });

  it('keeps a bounded graduation count', () => {
    const span = 4000;
    const step = graduationStep(span, 390);
    expect(Math.ceil(span / step)).toBeLessThanOrEqual(48);
  });
});
