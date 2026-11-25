/** Assombrit une couleur CSS hex/rgb pour les frontières internes. */

function parseColor(color: string): [number, number, number] | null {
  const value = color.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const digits = hex[1] ?? '';
    if (digits.length === 3) {
      const a = digits.charAt(0);
      const b = digits.charAt(1);
      const c = digits.charAt(2);
      return [
        Number.parseInt(a + a, 16),
        Number.parseInt(b + b, 16),
        Number.parseInt(c + c, 16),
      ];
    }
    return [
      Number.parseInt(digits.slice(0, 2), 16),
      Number.parseInt(digits.slice(2, 4), 16),
      Number.parseInt(digits.slice(4, 6), 16),
    ];
  }
  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(value);
  if (rgb) return [Number(rgb[1] ?? 0), Number(rgb[2] ?? 0), Number(rgb[3] ?? 0)];
  return null;
}

export function darkenColor(color: string | undefined, amount = 0.35): string {
  const parsed = color ? parseColor(color) : null;
  if (!parsed) return '#3a3731';
  const factor = Math.max(0, Math.min(1, 1 - amount));
  const [red, green, blue] = parsed.map((value) => Math.round(Math.max(0, Math.min(255, value * factor))));
  return `#${[red, green, blue].map((value) => String(value).padStart(2, '0')).join('')}`;
}
