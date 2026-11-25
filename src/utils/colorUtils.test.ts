import { describe, expect, it } from 'vitest';
import { darkenColor } from './colorUtils';

describe('darkenColor', () => {
  it('returns a valid 7-character hex color for rgb metadata', () => {
    const result = darkenColor('rgb(17,128,51)');
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('returns the same shade for the same fill color', () => {
    expect(darkenColor('rgb(108,139,208)')).toBe(darkenColor('rgb(108,139,208)'));
  });

  it('falls back to neutral for an unparsable color', () => {
    expect(darkenColor(undefined)).toBe('#3a3731');
    expect(darkenColor('not-a-color')).toBe('#3a3731');
  });

  it('handles short hex colors', () => {
    expect(darkenColor('#abc')).toMatch(/^#[0-9a-f]{6}$/);
  });
});
