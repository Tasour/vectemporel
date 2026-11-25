/** Pas « 1-2-5 × 10^n » le plus proche de l'objectif de pixels par graduation. */
export function graduationStep(span: number, width: number): number {
  if (span <= 0 || width <= 0) return 100;
  const target = (span * 90) / width;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const normalized = target / magnitude;
  const factor = normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10;
  return Math.max(1, factor * magnitude);
}
