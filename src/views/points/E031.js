import { register } from './registry.js';

/* Lentille E031 — Navigation & clavier : ordre de tabulation logique de la matrice (domaine D).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E031.md — chantiers E031-01 à E031-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque,
 * styles.css et les autres lentilles ne sont ni édités ni doublés.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, ni vers E030 (ancre de retour), E032 (roving tabindex
 * et flèches), E033 (Entrée/Espace), E034 (Échap), E035 (raccourcis locaux),
 * E037 (focus visible global), E039 (focus après filtrage) ou E040 (lecture du détail).
 *
 * Périmètre : rendre l'ordre de tabulation de la matrice EXPLICITE et BYPASSABLE.
 * Aucun tabindex positif n'est introduit ; aucun tabindex de cellule n'est modifié
 * (réservé à E032) ; aucune touche n'est interceptée (réservé à E032–E036).
 *
 * Invariants : un seul greffon, un seul CSS, un seul bandeau, deux liens uniques,
 * zéro écouteur global, zéro timer, zéro rAF, zéro réseau, zéro aléa, zéro journalisation.
 */

const CSS_ID = 'points-e031';
const SCOPE = 'points-e031';
const NAV_ID = 'points-e031-nav';
const TO_FILTERS_ID = 'points-e031-to-filters';
const TO_DETAIL_ID = 'points-e031-to-detail';
const NOTE_ID = 'points-e031-note';
const FOCUS_CLASS = 'points-e031-focused';
const NATIVE_FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]';

/* E031-08 / E031-09 : toutes les règles sont préfixées par `.points-e031`,
 * classe posée sur `.points-layout` : aucune fuite hors de cette vue. Les cibles
 * tactiles mesurent au moins 44 px ; deux points de rupture sont documentés. */
const CSS = `
.points-e031 .points-e031-nav {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  margin: 0 0 10px; padding: 8px 10px;
  border: 1px solid var(--line-strong); border-radius: 8px;
  background: rgba(8, 11, 16, .6);
}
.points-e031 .points-e031-nav .points-e031-skip {
  min-height: 44px; padding: 0 12px;
  border: 1px solid var(--line-strong); border-radius: 8px;
  background: rgba(230, 185, 111, .08); color: var(--gold-bright);
  font: inherit; font-size: 12px; cursor: pointer;
}
.points-e031 .points-e031-nav .points-e031-skip:hover { border-color: var(--gold-bright); }
.points-e031 .points-e031-nav .points-e031-skip:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 3px;
}
.points-e031 .points-e031-note {
  flex: 1 1 260px; margin: 0; color: var(--muted-2);
  font-size: 11px; line-height: 1.5;
}
.points-e031 .points-e031-focused { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
@media (max-width: 1000px) {
  .points-e031 .points-e031-nav { padding: 6px 8px; }
}
@media (max-width: 620px) {
  .points-e031 .points-e031-nav { flex-direction: column; align-items: stretch; }
  .points-e031 .points-e031-nav .points-e031-skip { width: 100%; }
  .points-e031 .points-e031-note { flex-basis: auto; }
}
/* E031-08 : aucune transition propre, donc rien à neutraliser, mais le repli
 * explicite garantit l'absence d'animation même si une feuille amont en ajoute. */
@media (prefers-reduced-motion: reduce) {
  .points-e031 .points-e031-nav,
  .points-e031 .points-e031-nav .points-e031-skip { transition: none; }
}
@media (forced-colors: active) {
  .points-e031 .points-e031-nav {
    background: Canvas; color: CanvasText; border-color: CanvasText;
  }
  .points-e031 .points-e031-nav .points-e031-skip {
    background: ButtonFace; color: ButtonText; border-color: ButtonText;
  }
  .points-e031 .points-e031-nav .points-e031-skip:focus-visible { outline-color: Highlight; }
  .points-e031 .points-e031-focused { outline-color: Highlight; }
}
`;

let noteNode = null;

/* E031-02 : lecture seule de l'ordre réel produit par points.js. Aucun chiffre
 * codé en dur : tout est dérivé du DOM. On vérifie que chaque ligne non-en-tête
 * commence par son bouton d'ère, que les cellules suivent, que l'en-tête ne
 * contient aucun contrôle focusable et qu'aucun tabindex positif n'est présent. */
function inspectOrder(layout) {
  const rows = Array.from(layout.querySelectorAll('.points-grid-row:not(.is-head)'));
  const head = layout.querySelector('.points-grid-row.is-head');
  const headFocusable = head
    ? head.querySelectorAll('button, a[href], input, select, textarea, [tabindex]').length
    : 0;
  const positive = Array.from(layout.querySelectorAll('.points-grid [tabindex]'))
    .filter((node) => (parseInt(node.getAttribute('tabindex'), 10) || 0) > 0).length;
  let ordered = headFocusable === 0 && positive === 0;
  let eraCount = 0;
  let cellCount = 0;
  rows.forEach((row) => {
    const kids = Array.from(row.children);
    const era = kids.find((node) => node.classList.contains('points-era'));
    const rowCells = kids.filter((node) => node.classList.contains('points-cell'));
    if (!era || kids[0] !== era || era.tagName !== 'BUTTON' || era.disabled) ordered = false;
    if (!rowCells.length || rowCells.some((cell) => cell.tagName !== 'BUTTON')) ordered = false;
    if (kids.some((node, index) => index > 0 && !node.classList.contains('points-cell'))) ordered = false;
    if (era) eraCount += 1;
    cellCount += rowCells.length;
  });
  return { ordered, eraCount, cellCount, headFocusable, positive };
}

/* E031-04 / E031-05 : déplacement de focus sans modifier le tabindex natif des
 * contrôles. Un conteneur non focusable reçoit un tabindex=-1 temporaire, retiré
 * au premier blur, afin de ne laisser aucune trace dans l'ordre de tabulation. */
function focusNode(node) {
  if (!node || typeof node.focus !== 'function') return;
  const native = node.matches(NATIVE_FOCUSABLE);
  if (!native) node.setAttribute('tabindex', '-1');
  node.focus();
  if (native) return;
  node.classList.add(FOCUS_CLASS);
  const clean = () => {
    node.removeAttribute('tabindex');
    node.classList.remove(FOCUS_CLASS);
    node.removeEventListener('blur', clean);
  };
  node.addEventListener('blur', clean);
}

function noteText(layout, info) {
  const names = Array.from(layout.querySelectorAll('.points-era'))
    .slice(0, 2)
    .map((node) => String(node.textContent || '').trim())
    .filter(Boolean);
  const sample = names.length ? ` (ici : ${names.join(' puis ')})` : '';
  const base = `Ordre de tabulation : le nom d’une ère, puis les cellules de domaine de cette ère, puis l’ère suivante${sample}. Les deux liens ci-dessus quittent la matrice sans la parcourir.`;
  return info.ordered
    ? base
    : `${base} Ordre à vérifier : un contrôle inattendu a été détecté dans la grille.`;
}

/* E031-03 à E031-06 : un seul bandeau <nav> par rendu, inséré avant la grille,
 * avec deux liens d'évitement et une note de lecture statique (hors région live). */
function buildNav(ctx, matrix, grid, info) {
  const stale = document.getElementById(NAV_ID);
  if (stale && !matrix.contains(stale)) stale.remove();

  let nav = stale && matrix.contains(stale) ? stale : null;
  if (!nav) {
    nav = ctx.el('nav', 'points-e031-nav');
    nav.id = NAV_ID;
    nav.setAttribute('aria-label', 'Navigation clavier de la matrice');

    const toFilters = ctx.el('button', 'points-e031-skip', 'Aller aux filtres ↓');
    toFilters.id = TO_FILTERS_ID;
    toFilters.type = 'button';
    toFilters.addEventListener('click', () => {
      const filters = matrix.querySelector('.points-filters');
      focusNode(filters && filters.querySelector('select, button') ? filters.querySelector('select, button') : filters);
    });

    const toDetail = ctx.el('button', 'points-e031-skip', 'Aller au détail du point ↓');
    toDetail.id = TO_DETAIL_ID;
    toDetail.type = 'button';
    toDetail.addEventListener('click', () => {
      const detail = matrix.parentElement && matrix.parentElement.querySelector('.points-detail');
      const title = detail && detail.querySelector('.points-point-title');
      focusNode(title || detail);
    });

    noteNode = ctx.el('p', 'points-e031-note');
    noteNode.id = NOTE_ID;
    nav.append(toFilters, toDetail, noteNode);
  } else {
    noteNode = nav.querySelector('#' + NOTE_ID);
  }

  /* Signature anti-écriture redondante : la note n'est réécrite que si le DOM
   * sous-jacent a changé (nouvelle ère, nouvelle ligne active, nouveau rendu). */
  const text = noteText(matrix, info);
  if (noteNode && noteNode.textContent !== text) noteNode.textContent = text;

  if (grid) {
    if (nav.nextSibling !== grid) matrix.insertBefore(nav, grid);
  } else if (nav.parentElement !== matrix) {
    matrix.appendChild(nav);
  }
  return nav;
}

/* E031-07 : signal d'entrée de matrice sur la première cellule, sans toucher
 * son tabindex (réservé à E032) et sans écraser un aria-describedby existant. */
function markEntry(layout) {
  const first = layout.querySelector('.points-grid-row:not(.is-head) .points-cell');
  if (!first) return;
  first.dataset.e031Entry = '1';
  const described = first.getAttribute('aria-describedby') || '';
  if (!described.split(/\s+/).includes(NOTE_ID)) {
    first.setAttribute('aria-describedby', (described + ' ' + NOTE_ID).trim());
  }
}

register('E031', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  /* E031-01 : injection unique (cssOnce) et ancrage de portée sur la vue. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e031 = '1';

  const matrix = layout.querySelector('.points-matrix');
  if (!matrix) return;
  const grid = matrix.querySelector('.points-grid');

  const info = inspectOrder(layout);
  layout.dataset.e031Cells = String(info.cellCount);
  layout.dataset.e031Eras = String(info.eraCount);
  layout.dataset.e031Order = info.ordered ? 'row-major' : 'a-verifier';
  if (grid) grid.dataset.e031Order = layout.dataset.e031Order;

  buildNav(ctx, matrix, grid, info);
  markEntry(layout);
});
