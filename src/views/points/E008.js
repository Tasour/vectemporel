import { register } from './registry.js';

/* Lentille E008 — A. Matrice & grille : tri stable des colonnes de domaines.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E008.md — chantiers E008-01 à E008-10.
 * Fichier possédé : ce module uniquement. Le rendu de la vue (src/views/points.js)
 * n'est ni édité ni doublé : E008 ajoute une commande de tri LOCALE dans
 * .points-matrix et réordonne les colonnes déjà présentes dans .points-grid.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers store.js, dataset.js, ni vers une autre lentille.
 *
 * Invariants :
 * - un seul CSS, une seule barre, un seul état de tri, un seul signal DOM ;
 * - tri stable : à clé égale, l'ordre DOM d'origine est préservé (index) ;
 * - aucun nœud n'est recréé : appendChild déplace les cellules existantes ;
 * - aucune région live propre : E041 possède la région live de la vue ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e008';
const BAR_ID = 'points-e008-sortbar';
const STATUS_ID = 'points-e008-status';
const NAME_ID = 'points-e008-sort-name';
const COUNT_ID = 'points-e008-sort-count';
const ORIGIN_ID = 'points-e008-sort-origin';

const CSS = `
  #${BAR_ID} {
    display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
    margin: 8px 0; padding: 8px 10px;
    border: 1px solid var(--line-strong); border-radius: 10px;
    background: rgba(8, 11, 16, .6);
  }
  #${BAR_ID} fieldset {
    display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
    margin: 0; padding: 0; border: 0; min-inline-size: 0;
  }
  #${BAR_ID} legend {
    float: left; margin: 0 8px 0 0; padding: 0;
    color: var(--gold); font-size: 12px; font-weight: 600;
  }
  #${BAR_ID} .points-e008-option {
    display: inline-flex; align-items: center; gap: 6px;
    min-height: 36px; padding: 6px 10px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    color: var(--ink-soft); font-size: 12px; cursor: pointer;
  }
  #${BAR_ID} .points-e008-option:hover { border-color: var(--gold-bright); }
  #${BAR_ID} .points-e008-option:focus-within {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  #${BAR_ID} .points-e008-option:has(input:checked) {
    border-color: var(--gold-bright); background: rgba(230, 185, 111, .12);
    color: var(--gold-bright);
  }
  #${BAR_ID} .points-e008-option input {
    width: 16px; height: 16px; margin: 0; accent-color: var(--gold-bright);
  }
  #${STATUS_ID} {
    margin: 0 0 8px; color: var(--muted-2); font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  @media (max-width: 560px) {
    #${BAR_ID} legend { float: none; width: 100%; margin-bottom: 4px; }
    #${BAR_ID} .points-e008-option { min-height: 44px; flex: 1 1 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${BAR_ID} .points-e008-option { transition: none; }
  }
  @media (forced-colors: active) {
    #${BAR_ID} .points-e008-option:focus-within,
    #${BAR_ID} .points-e008-option:has(input:checked) { outline: 2px solid CanvasText; }
  }
`;

let bar = null;              // barre de tri, recréée à chaque rendu neuf
let statusNode = null;       // état courant, lisible sans interpréter la couleur
let grid = null;             // .points-grid courant
let currentColumns = null;   // colonnes lues dans le DOM courant
let currentMode = 'origin';  // 'origin' | 'name' | 'count'
let originalDomains = [];    // ordre DOM d'origine, référence de stabilité
const appliedGrids = new WeakSet(); // grilles déjà triées, signature anti-écriture

/* Aucun nœud n'est recréé : les cellules sont déplacées, pas remplacées. */
function readColumns(target) {
  const header = target.querySelector('.points-grid-row.is-head');
  if (!header) return null;
  const headCells = Array.from(header.children);
  if (headCells.length < 2) return null;
  const domains = headCells.slice(1).map((cell) => (cell.textContent || '').trim());
  const rows = Array.from(target.querySelectorAll('.points-grid-row'))
    .filter((row) => row !== header && row.querySelector('.points-cell'));
  const rowCells = rows.map((row) => Array.from(row.querySelectorAll('.points-cell')));
  return { header, headCells, domains, rows, rowCells };
}

/* Le compte vient du titre « … · … · N point(s) », sinon du texte de la cellule. */
function cellCount(cell) {
  const title = cell.getAttribute('title') || '';
  const match = title.match(/(\d+)\s+point\(s?\)\s*$/);
  if (match) return Number(match[1]);
  const raw = (cell.textContent || '').trim();
  return /^\d+$/.test(raw) ? Number(raw) : 0;
}

/* Décoré-sort-undécoré : chaque domaine porte son index d'origine, ce qui rend
 * le tri stable même quand Array.prototype.sort serait instable. */
function buildOrder(columns, mode, origin) {
  const { domains, rowCells } = columns;
  const totals = domains.map(() => 0);
  rowCells.forEach((cells) => {
    cells.forEach((cell, pos) => {
      if (pos < totals.length) totals[pos] += cellCount(cell);
    });
  });
  const items = domains.map((name, pos) => {
    const fromOrigin = origin.indexOf(name);
    return { name, pos, total: totals[pos], origin: fromOrigin < 0 ? pos : fromOrigin };
  });
  const tie = (a, b) => a.origin - b.origin;
  if (mode === 'name') items.sort((a, b) => a.name.localeCompare(b.name, 'fr') || tie(a, b));
  else if (mode === 'count') items.sort((a, b) => (b.total - a.total) || tie(a, b));
  else items.sort(tie);
  return {
    order: items.map((item) => item.pos),
    total: totals.reduce((sum, value) => sum + value, 0),
    count: domains.length,
  };
}

function applyOrder(columns, order) {
  const { header, headCells, rows, rowCells } = columns;
  order.forEach((pos) => {
    const head = headCells[pos + 1];
    if (head) header.appendChild(head); // l'étiquette « Ère » reste en première colonne
  });
  /* Références figées à la lecture : jamais réindexer depuis le DOM courant,
   * sinon l'en-tête et les lignes divergeraient après plusieurs tris. */
  rows.forEach((row, index) => {
    const cells = rowCells[index];
    order.forEach((pos) => {
      if (cells[pos]) row.appendChild(cells[pos]); // déplace sans recréer
    });
  });
}

function modeLabel(mode) {
  if (mode === 'name') return 'nom (A→Z)';
  if (mode === 'count') return 'points (décroissant)';
  return 'ordre d’origine';
}

function refresh(force) {
  if (!grid || !grid.isConnected || !currentColumns || !statusNode) return;
  if (appliedGrids.has(grid) && grid.dataset.e008Sort === currentMode && !force) return;
  const { order, total, count } = buildOrder(currentColumns, currentMode, originalDomains);
  applyOrder(currentColumns, order);
  grid.dataset.e008Sort = currentMode;
  appliedGrids.add(grid);
  statusNode.textContent = `Tri actuel : ${modeLabel(currentMode)}. ${count} domaines · ${total} points comptés dans la grille · départage stable par ordre d’origine.`;
}

function buildBar(ctx) {
  bar = ctx.el('div', 'points-e008-bar');
  bar.id = BAR_ID;
  const fieldset = ctx.el('fieldset');
  fieldset.appendChild(ctx.el('legend', '', 'Tri des domaines'));
  const options = [
    [ORIGIN_ID, 'origin', 'Ordre d’origine'],
    [NAME_ID, 'name', 'Nom (A→Z)'],
    [COUNT_ID, 'count', 'Points (décroissant)'],
  ];
  options.forEach(([id, value, text]) => {
    const option = ctx.el('label', 'points-e008-option');
    const input = ctx.el('input');
    input.type = 'radio';
    input.name = 'points-e008-sort';
    input.id = id;
    input.value = value;
    input.checked = value === currentMode;
    input.setAttribute('aria-label', `Trier les domaines : ${text}`);
    input.addEventListener('change', () => {
      if (!input.checked) return;
      currentMode = value;
      refresh(true);
    });
    option.append(input, ctx.el('span', '', text));
    fieldset.appendChild(option);
  });
  bar.appendChild(fieldset);
  statusNode = ctx.el('p', 'points-e008-status', '');
  statusNode.id = STATUS_ID;
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  ctx.css(CSS_ID, CSS);
  const stage = ctx.stage && ctx.stage.isConnected ? ctx.stage : null;
  if (!stage) return;
  const layout = stage.querySelector('.points-layout');
  const matrix = layout && layout.querySelector('.points-matrix');
  const target = matrix && matrix.querySelector('.points-grid');
  if (!target) return;
  const columns = readColumns(target);
  if (!columns || columns.domains.length === 0) return;

  /* Une barre déconnectée marque un rendu neuf : on re-détecte l'ordre d'origine. */
  if (!bar || !bar.isConnected || bar.parentElement !== matrix) {
    bar = null;
    statusNode = null;
    originalDomains = columns.domains.slice();
  }
  grid = target;
  currentColumns = columns;
  if (!bar || !statusNode) buildBar(ctx);
  matrix.insertBefore(bar, target);
  matrix.insertBefore(statusNode, target);
  refresh(false);
}

register('E008', (ctx) => install(ctx));
