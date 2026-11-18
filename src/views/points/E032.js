import { register } from './registry.js';

/* Lentille E032 — Navigation & clavier : flèches entre cellules et roving tabindex
 * de la matrice de couverture (domaine D : navigation & clavier).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E032.md — chantiers E032-01 à E032-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque,
 * styles.css, le registre et les autres lentilles ne sont ni édités ni doublés.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, ni vers E030 (ancre de retour), E031 (ordre de
 * tabulation, qui réserve le tabindex des cellules à E032), E033 (Entrée/Espace),
 * E034 (Échap), E035 (raccourcis locaux, qui réserve les flèches à E032–E036),
 * E037 (focus visible global), E039 (focus après filtrage) ou E040 (détail).
 *
 * Invariants :
 * - un seul greffon, un seul CSS, un seul écouteur capture, une seule barre,
 *   une seule région live par rendu ;
 * - un seul point d'entrée de tabulation dans la grille (roving tabindex) ;
 * - les flèches et Début/Fin ne sont interceptées que sur une cellule ou un bouton
 *   d'ère de la matrice, avec preventDefault() seul (le routeur l'honore en
 *   T2-10, keyboard.js:125) : aucun stopPropagation, aucune touche volée ailleurs ;
 * - zéro timer, zéro rAF, zéro réseau, zéro aléa, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e032';
const SCOPE = 'points-e032';
const BAR_ID = 'points-e032-bar';
const COUNTER_ID = 'points-e032-counter';
const HINT_ID = 'points-e032-hint';
const LIVE_ID = 'points-e032-live';

/* Toutes les règles sont préfixées par `.points-e032`, classe posée sur
 * `.points-layout` : aucune fuite hors de cette vue. Les cibles mesurent au
 * moins 36 px ; le focus n'est jamais porté par la seule couleur. */
const CSS = `
.points-e032 .points-e032-bar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  margin: 8px 0; padding: 6px 10px;
  border: 1px solid var(--line-strong); border-radius: 8px;
  background: rgba(8, 11, 16, .55);
  font-size: 11px; line-height: 1.5;
}
.points-e032 .points-e032-counter {
  flex: 0 0 auto; min-height: 36px; padding: 8px 10px;
  border: 1px solid var(--gold); border-radius: 8px;
  color: var(--gold-bright); font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.points-e032 .points-e032-hint {
  flex: 1 1 260px; margin: 0; color: var(--muted-2);
}
.points-e032 .points-e032-live {
  position: absolute !important; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
/* E032-07 — anneau de focus renforcé : contraste, pas de couleur seule. */
.points-e032 .points-grid-row .points-era:focus-visible,
.points-e032 .points-grid-row .points-cell:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 3px;
  box-shadow: 0 0 0 4px rgba(230, 185, 111, .25);
}
/* E032-07 — cible clavier minimale, sans décaler la grille. */
.points-e032 .points-grid-row .points-cell { min-width: 36px; min-height: 36px; }
@media (max-width: 1000px) {
  .points-e032 .points-e032-bar { padding: 4px 8px; }
}
@media (max-width: 620px) {
  .points-e032 .points-e032-bar { flex-direction: column; align-items: stretch; }
  .points-e032 .points-e032-counter { text-align: center; }
}
@media (prefers-reduced-motion: reduce) {
  .points-e032 .points-e032-bar,
  .points-e032 .points-e032-counter,
  .points-e032 .points-grid-row .points-cell { transition: none; }
}
@media (forced-colors: active) {
  .points-e032 .points-e032-bar { background: Canvas; color: CanvasText; border-color: CanvasText; }
  .points-e032 .points-e032-counter {
    background: ButtonFace; color: ButtonText; border-color: ButtonText;
  }
  .points-e032 .points-grid-row .points-era:focus-visible,
  .points-e032 .points-grid-row .points-cell:focus-visible { outline-color: Highlight; }
}
`;

const NAV_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

/* État module, réconcilié à chaque rendu : le shell recrée le stage, donc le
 * layout et la grille courants sont remplacés, tandis que l'écouteur capture
 * unique reste attaché une seule fois et vérifie isConnected avant d'agir. */
let currentLayout = null;
let currentGrid = null;
let rows = [];        // tableau de lignes : [[era, cell, …], …]
let controls = [];    // aplatissement row-major de `rows`
let rovingR = 0;
let rovingC = 0;
let counterNode = null;
let liveNode = null;
let lastLive = '';
let listenerInstalled = false;

function isGridControl(node) {
  return !!node && typeof node.classList === 'object'
    && (node.classList.contains('points-cell') || node.classList.contains('points-era'));
}

/* E032-01 : reconstruire le modèle 2D depuis le DOM réel (aucune donnée codée
 * en dur). Le bouton d'ère est la colonne 0, les cellules de domaine suivent.
 * Les coordonnées sont écrites sur chaque contrôle pour retrouver la position
 * après un focus issu d'une autre lentille (E031, E035). */
function buildModel(grid) {
  rows = Array.from(grid.querySelectorAll('.points-grid-row:not(.is-head)'))
    .map((row) => Array.from(row.children).filter(isGridControl))
    .filter((cells) => cells.length > 0);
  controls = [];
  rows.forEach((cells, r) => {
    cells.forEach((node, c) => {
      node.dataset.e032R = String(r);
      node.dataset.e032C = String(c);
      controls.push(node);
    });
  });
}

/* E032-01 : point d'entrée initial — ligne active (`.is-active`) sinon première,
 * première cellule de la ligne (colonne 1) sinon le bouton d'ère (colonne 0). */
function chooseInitial(grid) {
  if (!rows.length) { rovingR = 0; rovingC = 0; return; }
  const active = Array.from(grid.querySelectorAll('.points-grid-row:not(.is-head)'))
    .findIndex((row) => row.classList.contains('is-active'));
  rovingR = active >= 0 && active < rows.length ? active : 0;
  rovingC = rows[rovingR].length > 1 ? 1 : 0;
}

function cellAt(r, c) {
  if (!rows.length) return null;
  const rr = ((r % rows.length) + rows.length) % rows.length;
  const line = rows[rr];
  const cc = Math.max(0, Math.min(c, line.length - 1));
  return line[cc];
}

/* E032-01 : un seul tabindex 0, tous les autres à -1. Aucun attribut existant
 * n'est écrasé (data-e031-entry et aria-describedby d'E031 sont préservés). */
function setRoving(r, c) {
  if (!controls.length) return;
  rovingR = r;
  rovingC = c;
  controls.forEach((node, i) => {
    node.setAttribute('tabindex', i === flatIndex(r, c) ? '0' : '-1');
  });
}

function flatIndex(r, c) {
  let index = 0;
  for (let rr = 0; rr < r; rr += 1) index += rows[rr].length;
  return index + c;
}

/* E032-05 : libellé vocalisé entièrement dérivé du DOM (nom d'ère, intitulé de
 * colonne, titre de cellule), sans chiffre historique inventé. */
function announceFor(node) {
  const r = parseInt(node.dataset.e032R, 10);
  const c = parseInt(node.dataset.e032C, 10);
  if (isNaN(r) || isNaN(c)) return;
  const domain = currentGrid && currentGrid.querySelector('.points-grid-row.is-head');
  const head = domain ? domain.children[c] : null;
  const domainLabel = head ? String(head.textContent || '').trim() : '';
  const detail = node.title ? String(node.title).trim() : String(node.textContent || '').trim();
  const label = `Case ${flatIndex(r, c) + 1} sur ${controls.length}. `
    + `Ligne ${r + 1} sur ${rows.length}, colonne ${c + 1} sur ${rows[r].length}. `
    + (domainLabel ? `${domainLabel} : ` : '') + detail;
  if (label === lastLive) return;
  lastLive = label;
  if (liveNode) liveNode.textContent = label;
}

/* E032-06 : pastille visible « case / ligne / colonne », information portée par
 * le texte et non par la seule couleur. */
function renderCounter() {
  if (!counterNode) return;
  if (!controls.length) { counterNode.textContent = '0 / 0'; return; }
  counterNode.textContent = `Case ${flatIndex(rovingR, rovingC) + 1}/${controls.length}`
    + ` · ligne ${rovingR + 1}/${rows.length}`
    + ` · colonne ${rovingC + 1}/${rows[rovingR].length}`;
}

function renderState() {
  renderCounter();
  const node = cellAt(rovingR, rovingC);
  if (node) announceFor(node);
}

/* E032-08 : découverabilité — raccourcis exposés aux lecteurs d'écran et aide
 * visible, distincte du bandeau E031 et du panneau E035. */
function decorateControls() {
  controls.forEach((node) => {
    node.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Home End');
  });
}

function ensureNodes(ctx, layout) {
  const matrix = layout.querySelector('.points-matrix');
  const parent = matrix || layout;

  ['points-e032-bar', 'points-e032-live'].forEach((bad) => {
    const stale = document.getElementById(bad === 'points-e032-bar' ? BAR_ID : LIVE_ID);
    if (stale && stale.parentElement && !parent.contains(stale)) stale.remove();
  });

  let bar = document.getElementById(BAR_ID);
  if (!bar) {
    bar = ctx.el('div', 'points-e032-bar');
    bar.id = BAR_ID;
    counterNode = ctx.el('span', 'points-e032-counter', '0 / 0');
    counterNode.id = COUNTER_ID;
    const hint = ctx.el('p', 'points-e032-hint',
      'Matrice : ← → parcourent les cellules d’une ère, ↑ ↓ changent d’ère, '
      + 'Début/Fin vont à la première/dernière case de la ligne. '
      + 'Entrée active la cellule (filtre ou ère) ; Tab quitte la matrice.');
    hint.id = HINT_ID;
    bar.append(counterNode, hint);
  } else {
    counterNode = bar.querySelector('#' + COUNTER_ID);
  }
  const grid = currentGrid;
  if (grid && bar.nextSibling !== grid) parent.insertBefore(bar, grid);
  else if (!grid && bar.parentElement !== parent) parent.appendChild(bar);

  let live = document.getElementById(LIVE_ID);
  if (!live) {
    live = ctx.el('p', 'points-e032-live', '');
    live.id = LIVE_ID;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
  }
  liveNode = live;
  if (live.parentElement !== layout) layout.appendChild(live);
}

/* E032-09 : resynchronisation sur le focus réel, y compris quand il est déplacé
 * par E031 (liens d'évitement) ou E035 (raccourcis locaux). Un seul focusin par
 * grille, posé une fois par rendu. */
function bindFocusin(grid) {
  if (!grid || grid.dataset.e032FocusBound === '1') return;
  grid.dataset.e032FocusBound = '1';
  grid.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!isGridControl(target)) return;
    const r = parseInt(target.dataset.e032R, 10);
    const c = parseInt(target.dataset.e032C, 10);
    if (isNaN(r) || isNaN(c)) return;
    if (r !== rovingR || c !== rovingC) setRoving(r, c);
    renderState();
  });
}

/* E032-02/03/04 : le seul propriétaire des flèches et de Début/Fin dans la
 * matrice. Capture sur window (avant le document, keyboard.js:199) ; le
 * preventDefault() seul suffit : le routeur l'honore en T2-10 et ne bouge donc
 * ni l'ère ni le point pendant la navigation de focus. Aucun stopPropagation,
 * aucune touche interceptée hors de la grille. */
function onKeyDown(event) {
  const layout = currentLayout;
  if (!layout || !layout.isConnected) return;
  if (NAV_KEYS.indexOf(event.key) < 0) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if (!(target instanceof Element) || !isGridControl(target)) return;
  const grid = currentGrid;
  if (!grid || !grid.contains(target)) return;
  if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(target.tagName) >= 0) return;

  let r = parseInt(target.dataset.e032R, 10);
  let c = parseInt(target.dataset.e032C, 10);
  if (isNaN(r) || isNaN(c) || !rows.length) return;

  let nr = r;
  let nc = c;
  if (event.key === 'ArrowLeft') nc = (c - 1 + rows[r].length) % rows[r].length;
  else if (event.key === 'ArrowRight') nc = (c + 1) % rows[r].length;
  else if (event.key === 'ArrowUp') nr = (r - 1 + rows.length) % rows.length;
  else if (event.key === 'ArrowDown') nr = (r + 1) % rows.length;
  else if (event.key === 'Home') nc = 0;
  else if (event.key === 'End') nc = rows[r].length - 1;
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    nc = Math.min(c, rows[nr].length - 1);
  }

  const next = cellAt(nr, nc);
  if (!next || next === target) return;
  event.preventDefault();
  setRoving(nr, nc);
  next.focus({ preventScroll: true });
}

register('E032', (ctx) => {
  if (!ctx || ctx.viewId !== 'points' || !ctx.layout
    || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = ctx.layout;
  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  currentLayout = layout;
  currentGrid = layout.querySelector('.points-grid');

  if (currentGrid) {
    buildModel(currentGrid);
    chooseInitial(currentGrid);
    setRoving(rovingR, rovingC);
    decorateControls();
    ensureNodes(ctx, layout);
    bindFocusin(currentGrid);
    renderState();
  } else {
    ensureNodes(ctx, layout);
  }

  /* E032-10 : miroirs d'état auditables, sans instrumentation ni journal. */
  layout.dataset.pointsE032Css = CSS_ID;
  layout.dataset.pointsE032Controls = String(controls.length);
  layout.dataset.pointsE032Rows = String(rows.length);
  layout.dataset.pointsE032Roving = `${rovingR}:${rovingC}`;
  layout.dataset.pointsE032Motion = (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion())
    ? 'reduce' : 'normal';

  if (!listenerInstalled) {
    window.addEventListener('keydown', onKeyDown, true);
    listenerInstalled = true;
  }
});
