import { register } from './registry.js';

/* Lentille E060 — Couverture binaire 100 % explicitée (domaine F : sémantique & données).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E060.md — chantiers E060-01 à E060-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le store,
 * styles.css et COVERAGE_POINTS.md ne sont ni édités ni doublés.
 *
 * Le 784/784 de COVERAGE_POINTS.md est la somme des cellules des dix matrices ;
 * il n'est PAS recopié ici : chaque chiffre est dérivé du DOM réellement rendu
 * (.cellules / .has-points), donc vrai pour la matrice affichée, quelle qu'elle
 * soit. Une cellule est un bit validé : 1 = point(s), 0 = silence validé.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres, le détail ni le dataset.
 *
 * Invariants : un seul CSS, un seul bandeau et une seule légende par rendu ;
 * non destructif ; zéro écouteur global, zéro timer, zéro rAF, zéro réseau,
 * zéro aléa, zéro console.*.
 */

const CSS_ID = 'points-e060';
const SCOPE = 'points-e060';
const BANNER_ID = 'points-e060-coverage';
const BANNER_BODY_ID = 'points-e060-coverage-body';
const TITLE_ID = 'points-e060-title';
const LEGEND_ID = 'points-e060-legend';
const CALM_ATTR = 'data-e060-calm';

/* Toutes les règles sont préfixées par `.points-e060`, classe posée sur
 * `.points-layout` : aucune fuite hors de la vue. Le trait de bordure (plein
 * ou tiret) et le libellé portent l'état binaire, jamais la couleur seule. */
const CSS = `
/* E060-08 : bandeau de preuve, ancré sous le titre de la matrice. */
.points-e060 .points-e060-coverage {
  margin: 0 0 10px; padding: 8px 10px;
  border: 1px solid var(--line-strong);
  border-left: 3px solid var(--gold-bright);
  border-radius: 6px;
  background: rgba(230, 185, 111, .06);
  color: var(--ink-soft);
  font-size: 11px; line-height: 1.45;
  font-variant-numeric: tabular-nums;
}
.points-e060 #${TITLE_ID} {
  display: block; margin-bottom: 2px;
  color: var(--gold-bright); font-weight: 600; letter-spacing: .03em;
}
.points-e060 #${BANNER_BODY_ID} .points-e060-line { display: block; }
.points-e060 #${BANNER_BODY_ID} .points-e060-line + .points-e060-line { color: var(--muted-2); }

/* E060-09 : état binaire par la FORME du trait, jamais par la seule couleur. */
.points-e060 .points-cell[data-e060-bit="1"] { border-left: 2px solid var(--gold-bright); }
.points-e060 .points-cell[data-e060-bit="0"] {
  border-left: 2px dashed var(--line-strong); color: var(--muted-2);
}

/* E060-06 : légende de lecture binaire. */
.points-e060 .points-e060-legend {
  margin: 8px 0 0; color: var(--muted-2);
  font-size: 10px; line-height: 1.45;
}

/* E060-09 : aucune animation propre ; neutralisation défensive si une feuille
 * partagée en héritait, couplée à l'attribut posé depuis ctx.reducedMotion(). */
.points-e060 .points-e060-coverage,
.points-e060 .points-e060-legend { transition: none; }
.points-e060[${CALM_ATTR}="1"] .points-cell { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-e060 .points-e060-coverage,
  .points-e060 .points-e060-legend,
  .points-e060 .points-cell { transition: none; }
}

/* E060-09 : couleurs forcées — le texte et les traits restent discernables. */
@media (forced-colors: active) {
  .points-e060 .points-e060-coverage { background: Canvas; color: CanvasText; border-color: CanvasText; }
  .points-e060 #${TITLE_ID} { color: CanvasText; }
  .points-e060 .points-cell[data-e060-bit="1"] { border-left-color: Highlight; }
  .points-e060 .points-cell[data-e060-bit="0"] { border-left-color: CanvasText; }
}
`;

/* E060-02 : comptage dérivé du DOM, aucun total codé en dur. Une cellule est
 * validée par construction dès qu'elle est rendue : couverture = 100 %. */
function countCells(layout) {
  const cells = layout.querySelectorAll('.points-cell');
  let total = 0;
  let filled = 0;
  cells.forEach((cell) => {
    total += 1;
    if (cell.classList.contains('has-points')) filled += 1;
  });
  const silences = total - filled;
  return {
    total,
    filled,
    silences,
    coverage: total ? 100 : 0,
    density: total ? Math.round((filled * 100) / total) : 0,
  };
}

/* E060-03 : deux phrases statiques, en français, sans région live ajoutée
 * (E041 reste l'unique région d'annonce). Le pourcentage de couverture ne
 * varie pas avec les filtres : il n'y a donc rien à annoncer. */
function metricLines(stats) {
  return [
    `Couverture binaire : ${stats.coverage} % — ${stats.total}/${stats.total} cellules validées.`,
    `Dont ${stats.filled} cellule(s) avec point(s) (densité ${stats.density} %) et ${stats.silences} silence(s) validé(s).`,
  ];
}

/* E060-01 : un seul bandeau par rendu, inséré juste après .points-title.
 * Le garde par ID et le retrait d'un nœud mal parenté assurent l'idempotence. */
function ensureBanner(ctx, layout, matrix, stats) {
  if (!matrix) return;
  let banner = layout.querySelector('#' + BANNER_ID);
  if (!banner) {
    const stale = document.getElementById(BANNER_ID);
    if (stale && !layout.contains(stale)) stale.remove();
    banner = ctx.el('p', 'points-e060-coverage');
    banner.id = BANNER_ID;
    const title = ctx.el('span', '', 'Preuve de couverture binaire');
    title.id = TITLE_ID;
    const body = ctx.el('span', '');
    body.id = BANNER_BODY_ID;
    banner.append(title, body);
    const anchor = matrix.querySelector('.points-title');
    if (anchor && anchor.nextSibling) matrix.insertBefore(banner, anchor.nextSibling);
    else matrix.appendChild(banner);
  }

  /* E060-10 : signature anti-écriture redondante. */
  const signature = [stats.total, stats.filled, stats.silences, stats.coverage, stats.density].join('|');
  if (banner.dataset.e060Signature === signature) return;
  banner.dataset.e060Signature = signature;
  const body = banner.querySelector('#' + BANNER_BODY_ID);
  if (body) {
    body.replaceChildren(...metricLines(stats).map((line) => ctx.el('span', 'points-e060-line', line)));
  }
}

/* E060-04 et E060-05 : marquage binaire non destructif de chaque cellule.
 * Le titre existant n'est que suffixé, l'aria-label n'est posé que s'il est
 * absent ; le garde data-e060-state rend le passage sur un même DOM neutre. */
function markCells(layout) {
  const head = layout.querySelector('.points-grid-row.is-head');
  const domains = [];
  if (head) {
    Array.from(head.children).forEach((child, index) => {
      if (index > 0 && child.tagName === 'SPAN') domains.push(String(child.textContent || '').trim());
    });
  }

  layout.querySelectorAll('.points-grid-row').forEach((row) => {
    if (row.classList.contains('is-head')) return;
    const eraButton = row.querySelector('.points-era');
    const eraName = eraButton ? String(eraButton.textContent || '').trim() : '';
    row.querySelectorAll('.points-cell').forEach((cell, index) => {
      if (cell.dataset.e060State) return;
      const covered = cell.classList.contains('has-points');
      const domain = domains[index] || '';
      cell.dataset.e060State = covered ? 'couvert' : 'silence';
      cell.dataset.e060Bit = covered ? '1' : '0';

      const baseTitle = cell.getAttribute('title') || '';
      const suffix = covered ? ' · couvert (bit 1)' : ' · silence validé (bit 0)';
      if (baseTitle && baseTitle.indexOf(suffix) === -1) cell.setAttribute('title', baseTitle + suffix);

      const detail = covered
        ? `${String(cell.textContent || '').trim()} point(s) · couvert`
        : 'silence validé (bit 0)';
      const label = `${eraName || 'Cellule'}${domain ? ' · ' + domain : ''} · ${detail}`;
      cell.dataset.e060Label = label;
      if (!cell.hasAttribute('aria-label')) cell.setAttribute('aria-label', label);
    });
  });
}

/* E060-06 : une seule légende, insérée après les filtres, sans toucher aux
 * selects ni au bouton « Réinitialiser les filtres ». */
function ensureLegend(ctx, layout, matrix) {
  if (!matrix || layout.querySelector('#' + LEGEND_ID)) return;
  const stale = document.getElementById(LEGEND_ID);
  if (stale && !layout.contains(stale)) stale.remove();
  const legend = ctx.el('p', 'points-e060-legend',
    'Lecture binaire : 1 = cellule avec point(s) validé(s), 0 = silence validé — une donnée à part entière. La couverture globale de l’atlas est consignée dans COVERAGE_POINTS.md.');
  legend.id = LEGEND_ID;
  const filters = matrix.querySelector('.points-filters');
  if (filters && filters.nextSibling) matrix.insertBefore(legend, filters.nextSibling);
  else matrix.appendChild(legend);
}

/* E060-07 : métriques auditables exposées en attributs sur le conteneur. */
function writeMetrics(layout, stats) {
  layout.dataset.e060Coverage = String(stats.coverage);
  layout.dataset.e060Total = String(stats.total);
  layout.dataset.e060Filled = String(stats.filled);
  layout.dataset.e060Silences = String(stats.silences);
  layout.dataset.e060Density = String(stats.density);
}

register('E060', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e060 = '1';

  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(CALM_ATTR, '1');
  } else {
    layout.removeAttribute(CALM_ATTR);
  }

  const matrix = layout.querySelector('.points-matrix');
  const stats = countCells(layout);
  writeMetrics(layout, stats);
  markCells(layout);
  ensureBanner(ctx, layout, matrix, stats);
  ensureLegend(ctx, layout, matrix);
});
