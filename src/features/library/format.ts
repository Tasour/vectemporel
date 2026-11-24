/** Formatage lisible des années négatives et des plages. */

export function formatYear(year: number): string {
  return year < 0 ? `${String(Math.abs(year))} av. J.-C.` : `${String(year)} ap. J.-C.`;
}

export function formatRange(from: number, to: number): string {
  return from === to ? formatYear(from) : `${formatYear(from)} — ${formatYear(to)}`;
}
