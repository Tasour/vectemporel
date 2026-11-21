import { register } from './registry.js';

/* Lentille E064 — G. Performance & rendu : DPR ≤ 2 si canvas, snapshots
 * déterministes, zéro réseau.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E064.md — chantiers E064-01 à E064-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le
 * registre, la coque et styles.css ne sont ni édités ni doublés.
 *
 * Fait fondateur : la vue Points est exclusivement DOM/CSS — elle ne possède
 * aucun <canvas> et n'en réclame aucun. Le plafond DPR ≤ 2 est donc une
 * GARDE DÉFENSIVE dormante, pas une contrainte violée : E064 constate
 * l'absence de canvas, expose le plafond, et ne crée jamais de surface de
 * dessin. Le « snapshot » est une signature déterministe dérivée du DOM
 * réel (ère, filtres, point sélectionné, couverture), sans date, sans aléa,
 * sans matériel et sans réseau.
 *
 * Contrat exploité : viewId, stage, layout, css, el. ctx.reducedMotion est
 * volontairement inutilisé : il n'existe aucune animation à neutraliser ici.
 *
 * Invariants : un seul CSS, un seul paragraphe d'instantané par rendu,
 * zéro canvas créé, zéro réseau, zéro aléa, zéro timer, zéro rAF,
 * zéro innerHTML, zéro console.*.
 */

const CSS_ID = 'points-e064';
const SNAPSHOT_ID = 'points-e064-snapshot';
const DPR_CAP = 2; /* E064-02 : plafond unique, codé en dur, jamais deviné. */

/* E064-05 : portée strictement locale. Aucune règle ne touche au reste de
 * l'application ; le paragraphe reste lisible en couleurs forcées. */
const CSS = `
.points-e064-snapshot {
  margin: 0 0 10px;
  color: var(--muted-2);
  font-size: 10px;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
}
@media (forced-colors: active) {
  .points-e064-snapshot { color: CanvasText; }
}
`;

/* E064-02 : bornage déterministe. Une valeur absente ou non finie retombe
 * sur 1 ; aucune valeur matérielle n'est jamais affichée dans le snapshot. */
function clampDpr(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(DPR_CAP, Math.max(1, number));
}

/* E064-03 : garde défensive. Si — et seulement si — un canvas apparaît un
 * jour sous le layout, sa réserve de pixels est bornée à DPR ≤ 2. Cette vue
 * n'en contient aucun : la fonction est appelée sur une liste vide, ne crée
 * rien et n'écrit aucun nœud existant. */
function capCanvasDpr(canvas) {
  if (!canvas || typeof canvas.getContext !== 'function') return 0;
  const rect = typeof canvas.getBoundingClientRect === 'function'
    ? canvas.getBoundingClientRect()
    : null;
  const cssWidth = rect && rect.width ? rect.width : (canvas.clientWidth || 0);
  const cssHeight = rect && rect.height ? rect.height : (canvas.clientHeight || 0);
  if (!cssWidth || !cssHeight) return 0;
  const dpr = clampDpr(window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(cssWidth * dpr));
  const height = Math.max(1, Math.round(cssHeight * dpr));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return dpr;
}

/* E064-04 : signature dérivée du DOM uniquement. Aucune date (E064-07),
 * aucun aléa, aucune lecture de devicePixelRatio, aucune requête (E064-06).
 * Deux rendus du même DOM produisent exactement la même liste. */
function snapshotParts(layout) {
  const title = layout.querySelector('.points-title');
  const era = layout.querySelector('.points-grid-row.is-active .points-era');
  const selects = layout.querySelectorAll('.points-filters select');
  const point = layout.querySelector('.points-point-title');
  const kicker = layout.querySelector('.points-detail .view-kicker');
  let filled = 0;
  const cells = layout.querySelectorAll('.points-cell.has-points');
  for (let i = 0; i < cells.length; i += 1) filled += 1;

  const parts = [];
  parts.push('titre=' + (title ? String(title.textContent || '').trim() : '—'));
  parts.push('ere=' + (era ? String(era.textContent || '').trim() : '—'));
  parts.push('domaine=' + (selects[0] ? selects[0].value : '—'));
  parts.push('famille=' + (selects[1] ? selects[1].value : '—'));
  parts.push('cellules=' + filled);
  parts.push('point=' + (point ? String(point.textContent || '').trim() : '—'));
  if (kicker) parts.push('perimetre=' + String(kicker.textContent || '').trim());
  return parts;
}

register('E064', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  /* E064-10 : cssOnce garantit une seule feuille, même après plusieurs
   * passages sur le même DOM (rendus successifs de la coque). */
  css(CSS_ID, CSS);

  /* E064-01 : constat DOM-only. Aucun canvas n'est créé ; le compteur est
   * exposé pour audabilité. Ici : 0. */
  const canvases = layout.querySelectorAll('canvas');
  layout.dataset.e064Canvas = String(canvases.length);
  for (let i = 0; i < canvases.length; i += 1) capCanvasDpr(canvases[i]);

  /* E064-02 : le plafond est documenté dans le DOM, indépendamment du
   * matériel réel (qui n'est jamais lu pour le contenu). */
  layout.dataset.e064DprCap = String(DPR_CAP);

  /* E064-04 / E064-06 / E064-07 : le snapshot est une pure fonction du DOM. */
  const parts = snapshotParts(layout);
  layout.dataset.e064Signature = parts.join(' | ');
  const text = 'Instantané déterministe — ' + parts.join(' · ') + '.';

  /* E064-09 : non destructif — on ne touche qu'à nos propres nœuds. Un
   * paragraphe égaré hors du layout (rendu précédent) est retiré, jamais un
   * nœud de la vue. E064-10 : un seul paragraphe par rendu. */
  let snapshot = document.getElementById(SNAPSHOT_ID);
  if (snapshot && !layout.contains(snapshot)) {
    snapshot.remove();
    snapshot = null;
  }
  if (!snapshot) {
    snapshot = el('p', 'points-e064-snapshot', text);
    snapshot.id = SNAPSHOT_ID;
    const matrix = layout.querySelector('.points-matrix');
    const title = matrix ? matrix.querySelector('.points-title') : null;
    if (matrix && title && title.nextSibling) matrix.insertBefore(snapshot, title.nextSibling);
    else if (matrix) matrix.appendChild(snapshot);
    else layout.appendChild(snapshot);
  } else {
    /* E064-05 / E064-08 : signature anti-écriture redondante et une seule
     * écriture textContent par changement réel (jamais innerHTML). */
    snapshot.classList.add('points-e064-snapshot');
    if (snapshot.textContent !== text) snapshot.textContent = text;
  }
});
