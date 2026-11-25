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

  it('keeps internal borders close to the fill color', () => {
    const fill = '#6c8bd0';
    const border = darkenColor(fill);
    const luminance = (hex: string): number => {
      const value = Number.parseInt(hex.slice(1), 16);
      const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
      return channels.reduce((sum, channel) => sum + channel, 0) / 3;
    };
    const ratio = luminance(border) / luminance(fill);
    expect(ratio).toBeGreaterThan(0.75);
    expect(ratio).toBeLessThan(0.9);
  });
});
