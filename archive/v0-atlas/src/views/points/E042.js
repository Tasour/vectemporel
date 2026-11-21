import { register } from './registry.js';

/* Lentille E042 — Accessibilité & ARIA : aria-label unique par contrôle (domaine E).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E042.md — chantiers E042-01 à E042-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le store
 * et styles.css ne sont ni édités ni doublés : la lentille garantit un nom
 * accessible unique par contrôle et complète les relations ARIA du DOM déjà
 * produit par la vue, sans modifier le comportement d'aucun contrôle.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres ou le détail : l'étiquetage reste
 * correct avec un ctx minimal.
 *
 * Coexistence : E002/E004/E013/E040 posent déjà des libellés, E004 pose des
 * identifiants référencés, E044/E049 écrivent des rôles. E042 est ADDITIF :
 * il conserve tout attribut déjà présent, ne l'enrichit qu'en cas de doublon
 * de libellé et n'ajoute aucune région live (déjà portée par E002/E004).
 *
 * Invariants : un seul CSS, un seul jeu d'IDs préfixés points-e042-, aucun
 * aria-label dupliqué, zéro écouteur global, zéro timer, zéro rAF, zéro réseau,
 * zéro aléa, zéro innerHTML, zéro console.*. Installation idempotente.
 */

const CSS_ID = 'points-e042';
const SCOPE = 'points-e042';
const PFX = 'points-e042-';

const ID = {
  matrixTitle: PFX + 'matrix-title',
  detailTitle: PFX + 'detail-title',
  detailDesc: PFX + 'detail-desc',
  grid: PFX + 'grid',
  nav: PFX + 'nav',
  domain: PFX + 'filter-domain',
  family: PFX + 'filter-family',
};

const CSS = `
.points-e042 .points-era,
.points-e042 .points-cell,
.points-e042 .points-filters select,
.points-e042 .points-filters button,
.points-e042 .points-nav button { min-height: 36px; min-width: 36px; }
.points-e042 .points-era:focus-visible,
.points-e042 .points-cell:focus-visible,
.points-e042 .points-filters select:focus-visible,
.points-e042 .points-filters button:focus-visible,
.points-e042 .points-nav button:focus-visible {
  outline: 2px solid var(--gold-bright, #e6b96f);
  outline-offset: 2px;
}
.points-e042-desc {
  margin: 0 0 8px;
  color: var(--muted-2, #98a2b3);
  font-size: 11px;
  line-height: 1.4;
}
@media (max-width: 620px) {
  .points-e042 .points-nav button { min-height: 44px; }
}
.points-e042[data-e042-reduced="1"] .points-era,
.points-e042[data-e042-reduced="1"] .points-cell,
.points-e042[data-e042-reduced="1"] .points-filters button,
.points-e042[data-e042-reduced="1"] .points-nav button { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-e042 .points-era,
  .points-e042 .points-cell,
  .points-e042 .points-filters button,
  .points-e042 .points-nav button { transition: none; }
}
@media (forced-colors: active) {
  .points-e042 .points-era:focus-visible,
  .points-e042 .points-cell:focus-visible,
  .points-e042 .points-filters select:focus-visible,
  .points-e042 .points-filters button:focus-visible,
  .points-e042 .points-nav button:focus-visible { outline-color: Highlight; }
}
`;

function txt(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

/* Un générateur par rendu. Un libellé déjà posé par une autre lentille est
 * conservé : E042 ne le remplace que s'il est dupliqué, en ajoutant un suffixe
 * déterministe obtenu depuis la position réelle du contrôle. */
function labeller() {
  const used = new Set();
  return function label(node, fallback, key) {
    if (!node || typeof node.getAttribute !== 'function') return '';
    const existing = txt(node.getAttribute('aria-label'));
    const base = existing || txt(fallback);
    let candidate = base;
    if (used.has(candidate)) {
      let n = 2;
      while (used.has(candidate)) candidate = `${base} (${key || n++})`;
    }
    used.add(candidate);
    if (candidate !== existing) node.setAttribute('aria-label', candidate);
    return candidate;
  };
}

/* Un ID existant est TOUJOURS conservé (E004 référence le sien depuis la
 * grille) ; l'ID préfixé n'est créé que si le nœud n'en a aucun. */
function effectiveId(node, proposed, root) {
  if (!node) return '';
  const current = txt(node.id);
  if (current) return current;
  const stale = document.getElementById(proposed);
  if (stale && stale !== node && !root.contains(stale) && typeof stale.remove === 'function') stale.remove();
  node.id = proposed;
  return proposed;
}

function putIfAbsent(node, attr, value) {
  if (!node || !txt(value)) return;
  if (!txt(node.getAttribute(attr))) node.setAttribute(attr, value);
}

/* Fusion additive d'une relation ARIA : les identifiants d'autrui survivent. */
function mergeRefs(node, attr, ids) {
  if (!node) return;
  const current = txt(node.getAttribute(attr)).split(/\s+/).filter(Boolean);
  const next = [...new Set([...current, ...ids.filter(Boolean)])];
  if (next.length) node.setAttribute(attr, next.join(' '));
}

register('E042', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  const root = layout;
  const label = labeller();

  /* E042-01 : CSS unique, portée sur la vue et marqueur de rendu. */
  css(CSS_ID, CSS);
  root.classList.add(SCOPE);
  root.dataset.e042 = '1';

  const matrix = root.querySelector('.points-matrix');
  const detail = root.querySelector('.points-detail');
  const grid = root.querySelector('.points-grid');
  const filters = root.querySelector('.points-filters');
  const nav = root.querySelector('.points-nav');

  /* E042-09 : noms des repères, sans écraser les IDs/relations déjà posés. */
  const matrixTitle = matrix ? matrix.querySelector('.points-title') : null;
  putIfAbsent(matrix, 'aria-labelledby', effectiveId(matrixTitle, ID.matrixTitle, root));
  let detailTitle = detail ? detail.querySelector('.points-point-title') : null;
  if (!detailTitle && detail) detailTitle = detail.querySelector('.view-kicker');
  putIfAbsent(detail, 'aria-labelledby', effectiveId(detailTitle, ID.detailTitle, root));

  /* E042-07 : le groupe grille porte un nom accessible sans écraser les
   * boutons natifs (role=grid imposerait une restructuration des lignes). */
  effectiveId(grid, ID.grid, root);
  putIfAbsent(grid, 'role', 'group');
  if (grid && !txt(grid.getAttribute('aria-labelledby')) && !txt(grid.getAttribute('aria-label'))) {
    label(grid, 'Matrice de couverture des points validés', 'grid');
  }

  /* E042-02 : un nom unique par bouton d'ère, dérivé de son libellé visible
   * et de sa position (robuste même si deux ères portaient le même nom). */
  root.querySelectorAll('.points-era').forEach((button, index) => {
    label(button, `Ère ${index + 1} : ${txt(button.textContent) || 'sans nom'}`, `era-${index + 1}`);
  });

  /* E042-03 : un nom unique par cellule, depuis le title écrit par la vue
   * (coordonnée ère × domaine + compte) — source de vérité non réinterprétée. */
  root.querySelectorAll('.points-cell').forEach((cell, index) => {
    const title = txt(cell.getAttribute('title'));
    const base = title || `Cellule ${index + 1}`;
    const match = base.match(/(\d+)\s*point/);
    const suffix = match && Number(match[1]) === 0 ? ' — aucun point' : '';
    label(cell, `Cellule ${index + 1} — ${base}${suffix}`, `cell-${index + 1}`);
  });

  /* E042-04 et E042-05 : filtres et réinitialisation, noms distincts. */
  if (filters) {
    const selects = filters.querySelectorAll('select');
    effectiveId(selects[0], ID.domain, root);
    effectiveId(selects[1], ID.family, root);
    label(selects[0], 'Filtrer les points par domaine', 'filter-domain');
    label(selects[1], 'Filtrer les points par famille', 'filter-family');
    label(filters.querySelector('button'), 'Réinitialiser les filtres de la matrice de points', 'reset');
  }

  /* E042-06 : navigation étiquetée, flèches décoratives exclues du nom. */
  if (nav) {
    effectiveId(nav, ID.nav, root);
    putIfAbsent(nav, 'role', 'navigation');
    label(nav, 'Navigation entre les points validés', 'nav');
    const buttons = nav.querySelectorAll('button');
    label(buttons[0], 'Point précédent', 'prev');
    label(buttons[1], 'Point suivant', 'next');
  }

  /* E042-07 (suite) : l'ère courante est marquée par aria-current (choix
   * unique, jamais aria-pressed). On ne retire que le marqueur posé par E042. */
  root.querySelectorAll('.points-grid-row').forEach((row) => {
    const era = row.querySelector('.points-era');
    if (row.classList.contains('is-active')) {
      putIfAbsent(era, 'aria-current', 'true');
      if (era) era.dataset.e042Current = '1';
      row.dataset.e042Current = '1';
    } else if (era && era.dataset.e042Current === '1') {
      era.removeAttribute('aria-current');
      delete era.dataset.e042Current;
      delete row.dataset.e042Current;
    }
  });

  /* E042-08 : description additive du détail, sans région live supplémentaire
   * (E002/E004 en portent déjà une). Le nœud est réutilisé, jamais dupliqué. */
  if (detail) {
    const kicker = detail.querySelector('.view-kicker');
    const subject = detail.querySelector('.points-point-title');
    const parts = [];
    if (subject) parts.push(`Point affiché : ${txt(subject.textContent)}.`);
    if (kicker) parts.push(`Périmètre : ${txt(kicker.textContent)}.`);
    const text = parts.join(' ') || 'Détail du point sélectionné.';
    let desc = detail.querySelector('#' + ID.detailDesc);
    if (desc && desc.parentElement !== detail) desc.remove();
    desc = detail.querySelector('#' + ID.detailDesc);
    if (!desc) {
      desc = el('p', 'points-e042-desc', text);
      desc.id = ID.detailDesc;
      detail.insertBefore(desc, detail.firstChild);
    } else {
      desc.textContent = text;
    }
    mergeRefs(detail, 'aria-describedby', [ID.detailDesc]);
  }

  /* E042-10 : couplage mouvement réduit (attribut JS + media query CSS). */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    root.setAttribute('data-e042-reduced', '1');
  } else {
    root.removeAttribute('data-e042-reduced');
  }
});
