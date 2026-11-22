/* Simultanéités : provinces qui partagent le même souverain qu'une province
 * sélectionnée pour l'année courante. Fonctions pures, sans DOM ni réseau.
 * Les lignes des chunks d'année sont [ruler, culture, religion, capitale, population]. */

export const DEFAULT_LIMIT = 5;

function populationOf(row) {
  const value = Number(row?.[4]);
  return Number.isFinite(value) ? value : 0;
}

/* Renvoie au plus `limit - 1` autres provinces, la sélection comptant comme
 * première province du groupe. Tri déterministe : population décroissante,
 * puis ordre alphabétique français. */
export function linkedProvinces(areas, selected, limit = DEFAULT_LIMIT) {
  if (!areas || !selected) return [];
  const own = areas[selected];
  if (!own) return [];
  const ruler = String(own[0] ?? '');
  if (!ruler) return [];
  const size = Math.max(1, Math.trunc(limit));
  return Object.entries(areas)
    .filter(([name, row]) => name !== selected && row && String(row[0] ?? '') === ruler)
    .sort((a, b) => populationOf(b[1]) - populationOf(a[1]) || a[0].localeCompare(b[0], 'fr'))
    .slice(0, size - 1)
    .map(([name, row]) => ({
      name,
      ruler,
      culture: String(row[1] ?? ''),
      capital: String(row[3] ?? ''),
      population: populationOf(row),
    }));
}

/* Paires d'extrémités pour le rendu des arcs. */
export function arcPairs(selected, linked) {
  return linked.map((item) => ({ from: selected, to: item.name }));
}
