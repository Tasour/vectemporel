import { register } from './registry.js';

/* Lentille POINTS E002 — Cellules has-points vs vides (jamais la couleur seule).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E002.md — chantiers E002-01 à E002-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Tout est dérivé du DOM rendu par points.js : la classe
 * `has-points` porte l'état réel, le nom de l'ère vient de `.points-era`, le
 * domaine de l'en-tête `.points-grid-row.is-head`. Aucune valeur inventée.
 *
 * Invariants :
 * - un seul greffon, une seule feuille CSS (ctx.css / cssOnce) ;
 * - tous les identifiants préfixés `points-e002-` ;
 * - aucun `innerHTML`, aucune écriture destructive du balisage existant ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.* ;
 * - la distinction remplie/vide repose sur la FORME (glyphe + bordure) et le
 *   TEXTE, jamais sur la couleur seule.
 */

const CSS_ID = 'points-e002';

const ID = {
  legend: 'points-e002-legend',
  coverage: 'points-e002-coverage',
};

/* Feuille unique. Les deux glyphes (losange plein ◇/◆) et le style de bordure
 * (pleine vs pointillée) codent l'état SANS couleur : la couleur existante de
 * `has-points` devient redondante, jamais nécessaire. Les règles ne visent que
 * `.points-cell` et les deux ancres `points-e002-`, sans fuite hors de la vue. */
const CSS = `
  .points-cell[data-e002-state="filled"]::before{content:"\\25C6\\00A0";font-style:normal}
  .points-cell[data-e002-state="empty"]::before{content:"\\25C7\\00A0";font-style:normal}
  .points-cell[data-e002-state="filled"]{border-style:solid !important}
  .points-cell[data-e002-state="empty"]{border-style:dashed !important}
  .points-cell:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  #${ID.legend}{margin:6px 0 4px;color:var(--ink-soft);font-size:10px;line-height:1.5}
  #${ID.legend} .e002-key{color:var(--gold-bright);font-weight:700}
  #${ID.coverage}{margin:0 0 10px;color:var(--muted);font-size:10px;font-variant-numeric:tabular-nums}
  @media (forced-colors:active){
    .points-cell[data-e002-state="filled"]{border:2px solid CanvasText !important}
    .points-cell[data-e002-state="empty"]{border:1px dashed CanvasText !important}
  }
  @media (prefers-contrast:more){
    .points-cell[data-e002-state="filled"]{border-width:2px !important}
  }
  @media (prefers-reduced-motion:reduce){ .points-cell::before{transition:none} }
`;

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function childrenOf(node) {
  return node && node.children ? Array.prototype.slice.call(node.children) : [];
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* Place un nœud dans la matrice juste avant la grille, sans le dupliquer. */
function place(matrix, node, before) {
  if (node.parentNode !== matrix || (before && node.nextSibling !== before)) {
    matrix.insertBefore(node, before || null);
  }
}

/* Étiquette accessible : l'état est énoncé en premier, le reste est dérivé. */
function ariaLabel(state, count, era, domain) {
  const where = `ère ${era || 'inconnue'}, domaine ${domain || 'inconnu'}`;
  if (state === 'filled') {
    const n = /^\d+$/.test(count) ? Number(count) : 1;
    return `Case remplie : ${count} point${plural(n, '', 's')} — ${where}.`;
  }
  return `Case vide : aucun point — ${where}.`;
}

function apply(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const matrix = layout.querySelector('.points-matrix');
  const grid = layout.querySelector('.points-grid');
  if (!matrix || !grid || typeof matrix.insertBefore !== 'function') return;

  /* E002-10 — feuille unique injectée par cssOnce (idempotent entre rendus). */
  ctx.css(CSS_ID, CSS);

  const head = grid.querySelector('.points-grid-row.is-head');
  const domains = childrenOf(head).slice(1).map(txt);
  const rows = nodes(grid, '.points-grid-row:not(.is-head)');

  let filled = 0;
  let empty = 0;

  rows.forEach((row) => {
    const era = txt(row.querySelector('.points-era')) || txt(childrenOf(row)[0]);
    const cells = nodes(row, '.points-cell');

    cells.forEach((cell, index) => {
      const domain = domains[index] || '';
      const state = cell.classList.contains('has-points') ? 'filled' : 'empty';
      const count = txt(cell);

      /* E002-01 — signal binaire dérivé de la classe réelle du DOM. */
      if (cell.dataset) cell.dataset.e002State = state;
      if (state === 'filled') filled += 1;
      else empty += 1;

      /* E002-02 / E002-03 — forme (via ::before en CSS) et étiquette lisible. */
      put(cell, 'aria-label', ariaLabel(state, count, era, domain));

      /* E002-08 — le title existant est préservé et préfixé une seule fois. */
      if (cell.dataset && cell.dataset.e002Titled !== '1') {
        const base = cell.getAttribute('title') || '';
        const prefix = state === 'filled' ? 'Remplie' : 'Vide';
        put(cell, 'title', base ? `${prefix} · ${base}` : prefix);
        cell.dataset.e002Titled = '1';
      }
    });
  });

  /* E002-06 — compteurs dérivés du nombre réel de cellules parcourues. */
  const total = filled + empty;

  /* E002-05 — légende insérée dans la matrice, avant la grille. */
  let legend = document.getElementById(ID.legend);
  if (legend && legend.parentNode !== matrix) legend.remove();
  if (!legend) {
    legend = ctx.el('p', 'e002-legend');
    legend.id = ID.legend;
  }
  legend.replaceChildren(
    ctx.el('span', '', 'Lecture de la matrice — '),
    ctx.el('strong', 'e002-key', '◆ case remplie'),
    ctx.el('span', '', ' (au moins un point validé) · '),
    ctx.el('strong', 'e002-key', '◇ case vide'),
    ctx.el('span', '', ' (aucun point) : la forme et le trait de bordure distinguent les cases, jamais la couleur.')
  );
  place(matrix, legend, grid);

  /* E002-04 — récapitulatif chiffré en région live, dérivé du DOM. */
  let coverage = document.getElementById(ID.coverage);
  if (coverage && coverage.parentNode !== matrix) coverage.remove();
  if (!coverage) {
    coverage = ctx.el('p', 'e002-coverage');
    coverage.id = ID.coverage;
    put(coverage, 'role', 'status');
    put(coverage, 'aria-live', 'polite');
  }
  coverage.textContent = total
    ? `${filled} case${plural(filled, '', 's')} remplie${plural(filled, '', 's')} · `
      + `${empty} case${plural(empty, '', 's')} vide${plural(empty, '', 's')} · ${total} cellules au total.`
    : 'Aucune cellule dans la matrice.';
  place(matrix, coverage, grid);

  /* E002-07 — la grille décrit la légende et le récapitulatif, en préservant
   * toute relation déjà portée par une autre lentille. */
  const existing = (grid.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  const refs = [ID.legend, ID.coverage].filter((id) => document.getElementById(id));
  const merged = Array.from(new Set(existing.concat(refs))).join(' ');
  if (merged) put(grid, 'aria-describedby', merged);

  /* E002-09 — la feuille couvre forced-colors / prefers-contrast / mouvement
   * réduit : aucun timer, aucune rAF, aucune animation propre à la lentille. */
  void ctx.reducedMotion;
}

register('E002', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
