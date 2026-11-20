import { register } from './registry.js';

/* Lentille POINTS E032 — passe 2 (V2) : Navigation & clavier — flèches, sauts
 * directs et roving tabindex de la matrice (domaine D). Dix chantiers V2,
 * E032-01 à E032-10, décrits dans UNIFIED_AUDIT/POINTS/V2/views/E032.md.
 *
 * La vue points.js appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1. Ce module est donc un greffon INDÉPENDANT :
 * tout identifiant, toute classe, tout attribut de données et l'id de feuille
 * sont préfixés `points-v2-e032` / `v2-e032`, pour ne jamais écraser les
 * marqueurs `points-e032` / `e032` déjà montés par la passe 1 sur le même DOM.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, les filtres internes ou une autre lentille.
 * Aucune écriture destructive : la grille, ses boutons et le détail sont lus ;
 * seuls tabindex, aria-keyshortcuts et les données de coordonnées V2 sont
 * complétés, jamais le title des cellules ni les écouteurs click de la vue.
 *
 * Coexistence avec la passe 1 : E032 V1 pose un écouteur capture sur window et
 * appelle preventDefault() quand il a déplacé le focus. Le gestionnaire V2 est
 * posé en phase boucle SUR LA GRILLE (jamais global) et commence par un test
 * `event.defaultPrevented` : si V1 a déjà traité la touche, V2 s'abstient de
 * tout double déplacement et se contente de resynchroniser sa pastille via le
 * focusin. Les touches que V1 ne gère pas (PageUp/PageDown) restent entièrement
 * à la charge de V2.
 *
 * Invariants : un seul enregistrement, une seule feuille, une seule barre, une
 * seule région live, un seul point d'entrée de tabulation ; écouteurs posés une
 * seule fois par grille ; tout DOM créé par ctx.el (jamais innerHTML) ; zéro
 * réseau, zéro aléa, zéro timer, zéro rAF, zéro écouteur global, zéro console.*
 */

const CSS_ID = 'points-v2-e032';
const SCOPE = 'points-v2-e032';
const BAR_ID = 'points-v2-e032-bar';
const COUNTER_ID = 'points-v2-e032-counter';
const HINT_ID = 'points-v2-e032-hint';
const LIVE_ID = 'points-v2-e032-live';
const REDUCED_ATTR = 'data-v2-e032-reduced';
const BOUND_ATTR = 'data-v2-e032-bound';
const VIEW_IDS = ['pointsv2', 'points'];

/* E032-03/04/05 : les touches gouvernées par la lentille. PageUp/PageDown sont
 * la contribution propre de la passe 2 (V1 ne gère que ← → ↑ ↓ Début Fin). */
const NAV_KEYS = [
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End', 'PageUp', 'PageDown',
];
const KEYSHORTCUTS = NAV_KEYS.join(' ');

/* E032-01 : attributs de coordonnées V2, distincts de `data-e032-r`/`-c` de la
 * passe 1 pour ne pas écraser ses signaux sur les mêmes nœuds. */
const ATTR_R = 'data-v2-e032-r';
const ATTR_C = 'data-v2-e032-c';

/* Chaque sélecteur commence littéralement par `.points-v2-e032`, y compris à
 * l'intérieur des @media : aucune règle ne peut fuir hors de la vue Points.
 * L'anneau de focus n'apparaît que sur :focus-visible (jamais au clic souris),
 * la cible atteint 44 px et le repli forced-colors garde un repère non
 * colorimétrique. */
const CSS = `
.points-v2-e032 .points-v2-e032-bar {
  box-sizing: border-box;
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  margin: 10px 0 4px; padding: 8px 10px;
  border: 1px solid var(--line-strong); border-radius: 8px;
  background: rgba(8, 11, 16, .6);
  font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums;
}
.points-v2-e032 .points-v2-e032-counter {
  flex: 0 0 auto; min-height: 36px; padding: 8px 10px;
  border: 1px solid var(--gold); border-radius: 8px;
  color: var(--gold-bright); white-space: nowrap;
}
.points-v2-e032 .points-v2-e032-hint {
  flex: 1 1 260px; margin: 0; color: var(--muted-2);
}
.points-v2-e032 .points-v2-e032-live {
  position: absolute !important; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
/* E032-08 : anneau de focus renforcé — contraste, pas la couleur seule. */
.points-v2-e032 .points-grid-row .points-era:focus-visible,
.points-v2-e032 .points-grid-row .points-cell:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 3px;
  box-shadow: 0 0 0 4px rgba(230, 185, 111, .25);
}
/* E032-08 : cible clavier minimale sans décaler la géométrie de la grille. */
.points-v2-e032 .points-grid-row .points-cell {
  min-width: 36px; min-height: 36px;
  transition: box-shadow .18s linear, outline-color .18s linear;
}
.points-v2-e032[data-v2-e032-reduced="1"] .points-grid-row .points-cell {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .points-v2-e032 .points-grid-row .points-cell { transition: none; }
}
@media (max-width: 1000px) {
  .points-v2-e032 .points-v2-e032-bar { padding: 6px 8px; }
}
@media (max-width: 620px) {
  .points-v2-e032 .points-v2-e032-bar { flex-direction: column; align-items: stretch; }
  .points-v2-e032 .points-v2-e032-counter { text-align: center; }
  .points-v2-e032 .points-grid-row .points-cell { min-width: 44px; min-height: 44px; }
}
@media (forced-colors: active) {
  .points-v2-e032 .points-v2-e032-bar {
    background: Canvas; color: CanvasText; border-color: CanvasText;
  }
  .points-v2-e032 .points-v2-e032-counter {
    background: ButtonFace; color: ButtonText; border-color: ButtonText;
  }
  .points-v2-e032 .points-grid-row .points-era:focus-visible,
  .points-v2-e032 .points-grid-row .points-cell:focus-visible { outline-color: Highlight; }
}
@media print {
  .points-v2-e032 .points-v2-e032-bar { display: none; }
}
`;

/* État module, réconcilié à chaque rendu : le shell recrée le stage, donc le
 * layout et la grille courants sont remplacés, tandis qu'un seul gestionnaire
 * est posé par grille (garde par attribut sur la grille elle-même). */
let currentLayout = null;
let currentGrid = null;
let rows = [];        // [[era, cell, …], …]
let controls = [];    // aplatissement row-major de `rows`
let rovingR = 0;
let rovingC = 0;
let counterNode = null;
let liveNode = null;
let lastLive = '';

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function isGridControl(node) {
  return !!node && typeof node.classList === 'object'
    && (node.classList.contains('points-cell') || node.classList.contains('points-era'));
}

/* E032-01 : reconstruire le modèle 2D depuis le DOM réel (aucune donnée codée
 * en dur). Le bouton d'ère est la colonne 0, les cellules de domaine suivent.
 * Les coordonnées V2 sont écrites sur chaque contrôle pour retrouver la
 * position après un focus issu d'une autre lentille. */
function buildModel(grid) {
  rows = Array.from(grid.querySelectorAll('.points-grid-row:not(.is-head)'))
    .map((row) => Array.from(row.children).filter(isGridControl))
    .filter((cells) => cells.length > 0);
  controls = [];
  rows.forEach((cells, r) => {
    cells.forEach((node, c) => {
      setAttr(node, ATTR_R, String(r));
      setAttr(node, ATTR_C, String(c));
      controls.push(node);
    });
  });
}

/* E032-02 : point d'entrée initial — ligne active (`.is-active`) sinon première,
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

function flatIndex(r, c) {
  let index = 0;
  for (let rr = 0; rr < r; rr += 1) index += rows[rr].length;
  return index + c;
}

/* E032-02 : un seul tabindex 0, tous les autres à -1. Les attributs posés par
 * la passe 1 ou par d'autres lentilles (data-e031-entry, aria-describedby)
 * sont préservés : seul l'attribut tabindex est écrit. */
function setRoving(r, c) {
  if (!controls.length) return;
  rovingR = r;
  rovingC = c;
  controls.forEach((node, i) => {
    setAttr(node, 'tabindex', i === flatIndex(r, c) ? '0' : '-1');
  });
}

/* E032-06 : libellé vocalisé entièrement dérivé du DOM (nom d'ère, intitulé de
 * colonne, titre de cellule), sans chiffre historique inventé. Écrit dans la
 * région live dédiée de V2, dédupliqué par `lastLive`. */
function announceFor(node) {
  const r = parseInt(getAttr(node, ATTR_R), 10);
  const c = parseInt(getAttr(node, ATTR_C), 10);
  if (isNaN(r) || isNaN(c)) return;
  const head = currentGrid && currentGrid.querySelector('.points-grid-row.is-head');
  const col = head ? head.children[c] : null;
  const domainLabel = col ? String(col.textContent || '').trim() : '';
  const detail = getAttr(node, 'title') || String(node.textContent || '').trim();
  const label = 'Case ' + (flatIndex(r, c) + 1) + ' sur ' + controls.length + '. '
    + 'Ligne ' + (r + 1) + ' sur ' + rows.length
    + ', colonne ' + (c + 1) + ' sur ' + rows[r].length + '. '
    + (domainLabel ? domainLabel + ' : ' : '') + detail;
  if (label === lastLive) return;
  lastLive = label;
  if (liveNode) liveNode.textContent = label;
}

/* E032-07 : pastille visible « case / ligne / colonne », information portée
 * par le texte et non par la seule couleur."
 */
function renderCounter() {
  if (!counterNode) return;
  if (!controls.length) { counterNode.textContent = '0 / 0'; return; }
  counterNode.textContent = 'Case ' + (flatIndex(rovingR, rovingC) + 1) + '/' + controls.length
    + ' · ligne ' + (rovingR + 1) + '/' + rows.length
    + ' · colonne ' + (rovingC + 1) + '/' + rows[rovingR].length;
}

/* E032-08/09 : raccourcis exposés aux lecteurs d'écran et aide visible,
 * distincte du bandeau E031 et du panneau E035 de la passe 1. */
function decorateControls() {
  controls.forEach((node) => { setAttr(node, 'aria-keyshortcuts', KEYSHORTCUTS); });
}

/* E032-10 : au plus une barre et une région live par rendu. Tout nœud périmé
 * portant un id V2 est retiré avant réinsertion, y compris via stage. */
function ensureNodes(ctx, layout, stage) {
  const matrix = query(layout, '.points-matrix');
  const parent = matrix || layout;
  const root = isElement(stage) ? stage : (typeof document !== 'undefined' ? document : null);

  [BAR_ID, LIVE_ID].forEach((id) => {
    const stale = root && root.querySelector ? root.querySelector('#' + id) : null;
    if (stale && stale.parentElement && !parent.contains(stale)) removeNode(stale);
  });

  let bar = query(layout, '#' + BAR_ID);
  if (!isElement(bar)) {
    bar = ctx.el('div', 'points-v2-e032-bar');
    bar.id = BAR_ID;
    counterNode = ctx.el('span', 'points-v2-e032-counter', '0 / 0');
    counterNode.id = COUNTER_ID;
    const hint = ctx.el('p', 'points-v2-e032-hint',
      'Matrice V2 : ← → parcourent les cellules d’une ère, ↑ ↓ changent d’ère, '
      + 'Début/Fin vont à la première/dernière colonne, PageHaut/PageBas à la '
      + 'première/dernière ère. Tab quitte la matrice.');
    hint.id = HINT_ID;
    bar.append(counterNode, hint);
  } else {
    counterNode = query(bar, '#' + COUNTER_ID);
  }
  const grid = currentGrid;
  if (grid && bar.nextSibling !== grid) parent.insertBefore(bar, grid);
  else if (!grid && bar.parentElement !== parent) parent.appendChild(bar);

  let live = query(layout, '#' + LIVE_ID);
  if (!isElement(live)) {
    live = ctx.el('p', 'points-v2-e032-live', '');
    live.id = LIVE_ID;
    setAttr(live, 'role', 'status');
    setAttr(live, 'aria-live', 'polite');
    setAttr(live, 'aria-atomic', 'true');
  }
  liveNode = live;
  if (live.parentElement !== layout) layout.appendChild(live);
}

/* E032-03/04/05/06 : unique gestionnaire clavier, posé en phase boucle sur la
 * grille (jamais global). Le test `defaultPrevented` garantit la coexistence
 * avec le capture window de la passe 1 : si V1 a déjà déplacé le focus, V2 ne
 * fait que synchroniser sa pastille (via focusin) et ne double pas le geste. */
function onKeyDown(event) {
  if (event.defaultPrevented) return;
  const grid = currentGrid;
  if (!grid || !grid.isConnected) return;
  if (NAV_KEYS.indexOf(event.key) < 0) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if (!(target instanceof Element) || !isGridControl(target)) return;
  if (!grid.contains(target)) return;
  if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(target.tagName) >= 0) return;

  let r = parseInt(getAttr(target, ATTR_R), 10);
  let c = parseInt(getAttr(target, ATTR_C), 10);
  if (isNaN(r) || isNaN(c) || !rows.length) return;

  let nr = r;
  let nc = c;
  if (event.key === 'ArrowLeft') nc = (c - 1 + rows[r].length) % rows[r].length;
  else if (event.key === 'ArrowRight') nc = (c + 1) % rows[r].length;
  else if (event.key === 'ArrowUp') nr = (r - 1 + rows.length) % rows.length;
  else if (event.key === 'ArrowDown') nr = (r + 1) % rows.length;
  else if (event.key === 'Home') nc = 0;
  else if (event.key === 'End') nc = rows[r].length - 1;
  else if (event.key === 'PageUp') nr = 0;
  else if (event.key === 'PageDown') nr = rows.length - 1;
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown'
    || event.key === 'PageUp' || event.key === 'PageDown') {
    nc = Math.min(c, rows[nr].length - 1);
  }

  const next = cellAt(nr, nc);
  if (!next || next === target) return;
  event.preventDefault();
  setRoving(nr, nc);
  next.focus({ preventScroll: true });
  renderCounter();
  announceFor(next);
}

/* E032-09 : resynchronisation sur le focus réel, y compris quand il est déplacé
 * par la passe 1, E031 ou E035. Un seul focusin par grille ; il met à jour le
 * roving et la pastille mais n'annonce pas, pour ne pas doubler la région live
 * de la passe 1. */
function bindGrid(grid) {
  if (!grid || getAttr(grid, BOUND_ATTR) === '1') return;
  setAttr(grid, BOUND_ATTR, '1');
  grid.addEventListener('keydown', onKeyDown);
  grid.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!isGridControl(target)) return;
    const r = parseInt(getAttr(target, ATTR_R), 10);
    const c = parseInt(getAttr(target, ATTR_C), 10);
    if (isNaN(r) || isNaN(c)) return;
    if (r !== rovingR || c !== rovingC) setRoving(r, c);
    renderCounter();
  });
}

/* E032-10 : unique point d'entrée, gardes structurelles, feuille unique,
 * portée unique, ids dédupliqués, repli silencieux sur structure inattendue. */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;
  const stage = isElement(ctx.stage) ? ctx.stage : layout;
  const grid = query(layout, '.points-grid');

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(layout, REDUCED_ATTR, '1');
  else if (typeof layout.hasAttribute === 'function' && layout.hasAttribute(REDUCED_ATTR)) {
    layout.removeAttribute(REDUCED_ATTR);
  }

  currentLayout = layout;
  currentGrid = isElement(grid) ? grid : null;
  lastLive = '';

  if (currentGrid) {
    buildModel(currentGrid);
    chooseInitial(currentGrid);
    setRoving(rovingR, rovingC);
    decorateControls();
    ensureNodes(ctx, layout, stage);
    bindGrid(currentGrid);
    renderCounter();
  } else {
    ensureNodes(ctx, layout, stage);
  }

  /* E032-10 : miroirs d'état auditables, sans instrumentation ni journal. */
  if (layout.dataset) {
    layout.dataset.pointsV2E032Css = CSS_ID;
    layout.dataset.pointsV2E032Controls = String(controls.length);
    layout.dataset.pointsV2E032Rows = String(rows.length);
    layout.dataset.pointsV2E032Roving = rovingR + ':' + rovingC;
    layout.dataset.pointsV2E032Motion = reduced ? 'reduce' : 'normal';
  }
}

register('E032', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
