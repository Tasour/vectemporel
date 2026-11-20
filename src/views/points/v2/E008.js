import { register } from './registry.js';

/* Lentille POINTS E008 — passe 2 (V2) : A. Matrice & grille, tri stable des
 * colonnes de domaines (domaine A).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E008.md — chantiers E008-01 à E008-10.
 * Fichier possédé : ce module uniquement. Aucun fichier de la passe 1
 * (src/views/points/E008.js) ni aucun fichier partagé (vue points.js, coque,
 * styles.css, registry.js, index.js) n'est modifié. La lentille ajoute sa
 * propre barre de tri LOCALE dans .points-matrix et réordonne les cellules
 * déjà produites par la vue : aucun nœud n'est créé pour les données.
 *
 * Contrat exploité : viewId ('pointsv2'), stage, layout, css(id, rules),
 * el(tag, cls, text), reducedMotion(). Aucune dépendance vers store.js,
 * dataset.js ni vers une autre lentille. Aucun nom de domaine, aucun
 * millésime et aucun total ne sont codés en dur : tout est dérivé du DOM.
 *
 * Invariants : une seule feuille (ctx.css), une seule portée (.points-v2-e008),
 * une seule barre, un seul état de tri, un seul signal par grille, des id
 * préfixés et gardés contre le doublon, zéro innerHTML, zéro réseau, zéro
 * aléa, zéro timer, zéro rAF, zéro écouteur global, aucun appel à la console.
 * Les signaux de donnée sont distincts de ceux de la passe 1 (data-e008-sort)
 * pour ne pas écraser ses marqueurs sur le DOM partagé.
 */

const CSS_ID = 'points-v2-e008';
const SCOPE = 'points-v2-e008';
const BAR_ID = 'points-v2-e008-sortbar';
const STATUS_ID = 'points-v2-e008-status';
const FIELDSET_ID = 'points-v2-e008-fieldset';
const ORIGIN_ID = 'points-v2-e008-sort-origin';
const NAME_ID = 'points-v2-e008-sort-name';
const COUNT_ID = 'points-v2-e008-sort-count';
const RADIO_NAME = 'points-v2-e008-sort';
const BAR_CLASS = 'points-v2-e008-bar';
const OPTION_CLASS = 'points-v2-e008-option';
const STATUS_CLASS = 'points-v2-e008-status';

/* Attributs littéraux (plutôt que dataset camelCase) : la casse de `dataset`
 * insérerait un tiret avant V, E et chaque chiffre, ce qui casserait le
 * préfixe imposé points-v2-e008-. */
const REDUCED_ATTR = 'data-points-v2-e008-reduced';
const DATA_SCOPE = 'data-points-v2-e008-scope';
const DATA_SORT = 'data-points-v2-e008-sort';
const DATA_TOTAL = 'data-points-v2-e008-total';
const DATA_DOMAINS = 'data-points-v2-e008-domains';
const DATA_COUNTS = 'data-points-v2-e008-counts';

const OWNED_IDS = [BAR_ID, STATUS_ID, FIELDSET_ID, ORIGIN_ID, NAME_ID, COUNT_ID];

const MODES = [
  { id: ORIGIN_ID, value: 'origin', label: 'Ordre d’origine' },
  { id: NAME_ID, value: 'name', label: 'Nom (A→Z)' },
  { id: COUNT_ID, value: 'count', label: 'Points (décroissant)' },
];

/* Chaque sélecteur commence littéralement par `.points-v2-e008`, y compris
 * à l'intérieur des @media : aucune règle ne peut fuir hors de la vue Points.
 * Aucune animation de position : le tri est une mutation instantanée du DOM. */
const CSS = `
  /* E008-01 : barre strictement locale à .points-matrix. */
  .points-v2-e008 .points-v2-e008-bar {
    display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
    margin: 8px 0 0; padding: 8px 10px;
    border: 1px solid var(--line-strong); border-radius: 10px;
    background: rgba(8, 11, 16, .6);
  }
  .points-v2-e008 .points-v2-e008-bar fieldset {
    display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
    margin: 0; padding: 0; border: 0; min-inline-size: 0;
  }
  .points-v2-e008 .points-v2-e008-bar legend {
    float: left; margin: 0 8px 0 0; padding: 0;
    color: var(--gold); font-size: 12px; font-weight: 600;
  }
  /* E008-09 : cibles tactiles ≥ 36 px, focus visible, état coché lisible. */
  .points-v2-e008 .points-v2-e008-option {
    display: inline-flex; align-items: center; gap: 6px;
    min-height: 36px; padding: 6px 10px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    color: var(--ink-soft); font-size: 12px; cursor: pointer;
    transition: background-color .18s linear, border-color .18s linear;
  }
  .points-v2-e008 .points-v2-e008-option:hover { border-color: var(--gold-bright); }
  .points-v2-e008 .points-v2-e008-option:focus-within,
  .points-v2-e008 .points-v2-e008-option:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  .points-v2-e008 .points-v2-e008-option:has(input:checked) {
    border-color: var(--gold-bright); background: rgba(230, 185, 111, .12);
    color: var(--gold-bright);
  }
  .points-v2-e008 .points-v2-e008-option input {
    width: 16px; height: 16px; margin: 0; accent-color: var(--gold-bright);
  }
  /* E008-08 : l'état court est porté par le texte, jamais par la seule couleur. */
  .points-v2-e008 .points-v2-e008-status {
    margin: 0 0 8px; color: var(--muted-2); font-size: 12px;
    line-height: 1.4; font-variant-numeric: tabular-nums;
  }
  /* E008-09 : mouvement réduit, couplage JS (attribut) ET media query. */
  .points-v2-e008[data-points-v2-e008-reduced="1"] .points-v2-e008-option { transition: none; }
  @media (max-width: 560px) {
    .points-v2-e008 .points-v2-e008-bar legend { float: none; width: 100%; margin-bottom: 4px; }
    .points-v2-e008 .points-v2-e008-option { min-height: 44px; flex: 1 1 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e008 .points-v2-e008-option { transition: none; }
  }
  @media (forced-colors: active) {
    .points-v2-e008 .points-v2-e008-option:focus-within,
    .points-v2-e008 .points-v2-e008-option:has(input:checked) { outline: 2px solid CanvasText; }
  }
  @media print {
    .points-v2-e008 .points-v2-e008-bar,
    .points-v2-e008 .points-v2-e008-status { display: none; }
  }
`;

/* État de module : survit au remplacement du contenu du stage par la coque.
 * Le mode choisi est réappliqué à la grille neuve (E008-10). */
const S = {
  mode: 'origin',
  grid: null,
  columns: null,
  originalDomains: [],
  bar: null,
  status: null,
  radios: [],
  bound: false,
  applied: new WeakSet(),
};

/* E008-02 : les domaines sont lus dans l'en-tête rendu par points.js; aucune
 * liste n'est recopiée. Les cellules sont mémorisées par référence : jamais
 * réindexées depuis le DOM courant, sinon en-tête et lignes divergeraient. */
function readColumns(target) {
  if (!target || typeof target.querySelector !== 'function') return null;
  const header = target.querySelector('.points-grid-row.is-head');
  if (!header) return null;
  const headCells = Array.from(header.children);
  if (headCells.length < 2) return null;
  const domains = headCells.slice(1).map((cell) => (cell.textContent || '').trim());
  if (domains.length === 0) return null;
  const rows = Array.from(target.querySelectorAll('.points-grid-row'))
    .filter((row) => row !== header && row.querySelector('.points-cell'));
  const rowCells = rows.map((row) => Array.from(row.querySelectorAll('.points-cell')));
  return { header, headCells, domains, rows, rowCells };
}

/* E008-04 : le compte vient du titre « … · … · N point(s) » écrit par la vue,
 * avec repli sur le texte numérique de la cellule. */
function cellCount(cell) {
  const title = cell.getAttribute('title') || '';
  const match = title.match(/(\d+)\s+point\(s?\)\s*$/);
  if (match) return Number(match[1]);
  const raw = (cell.textContent || '').trim();
  return /^\d+$/.test(raw) ? Number(raw) : 0;
}

/* E008-03 : décorer-trier-décorer. Chaque domaine porte son index d'origine,
 * ce qui rend le tri stable même si Array.prototype.sort ne l'était pas. */
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
    totals,
    total: totals.reduce((sum, value) => sum + value, 0),
    count: domains.length,
  };
}

/* E008-05 / E008-06 : une seule permutation, appliquée à l'en-tête et à
 * toutes les lignes via des références figées. appendChild DÉPLACE les nœuds
 * existants : attributs, écouteurs et classes survivent au tri. La première
 * colonne (« Ère ») reste épinglée car le tri part de headCells[pos + 1]. */
function applyOrder(columns, order) {
  const { header, headCells, rows, rowCells } = columns;
  order.forEach((pos) => {
    const head = headCells[pos + 1];
    if (head) header.appendChild(head);
  });
  rows.forEach((row, index) => {
    const cells = rowCells[index];
    order.forEach((pos) => {
      if (cells[pos]) row.appendChild(cells[pos]);
    });
  });
}

function modeLabel(mode) {
  if (mode === 'name') return 'nom (A→Z)';
  if (mode === 'count') return 'points (décroissant)';
  return 'ordre d’origine';
}

/* E008-05 / E008-08 / E008-10 : écriture bornée et observable. Le signal
 * data-points-v2-e008-sort permet de vérifier le mode sans lire la feuille. */
function refresh(force) {
  const { grid, columns, status } = S;
  if (!grid || !grid.isConnected || !columns || !status || !status.isConnected) return;
  if (!force && S.applied.has(grid) && grid.getAttribute(DATA_SORT) === S.mode) return;
  const result = buildOrder(columns, S.mode, S.originalDomains);
  applyOrder(columns, result.order);
  S.applied.add(grid);
  grid.setAttribute(DATA_SORT, S.mode);
  grid.setAttribute(DATA_TOTAL, String(result.total));
  grid.setAttribute(DATA_DOMAINS, String(result.count));
  grid.setAttribute(DATA_COUNTS, result.totals.join('|'));
  status.textContent = `Tri des domaines (V2) : ${modeLabel(S.mode)}. ${result.count} domaines · ${result.total} points comptés dans la grille · départage stable par ordre d’origine.`;
  S.radios.forEach((radio) => {
    if (radio) radio.checked = radio.value === S.mode;
  });
}

/* E008-01 / E008-07 : radiogroupe natif, choice unique, aucun aria-pressed.
 * Tout est construit par ctx.el : aucun innerHTML, aucune donnée inventée. */
function buildBar(ctx) {
  const bar = ctx.el('div', BAR_CLASS);
  bar.id = BAR_ID;

  const fieldset = ctx.el('fieldset');
  fieldset.id = FIELDSET_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Tri des domaines (choix unique)');
  fieldset.appendChild(ctx.el('legend', '', 'Tri des domaines'));

  const radios = [];
  MODES.forEach((m) => {
    const option = ctx.el('label', OPTION_CLASS);
    const input = ctx.el('input');
    input.type = 'radio';
    input.name = RADIO_NAME;
    input.id = m.id;
    input.value = m.value;
    input.checked = m.value === S.mode;
    input.setAttribute('aria-label', `Trier les domaines : ${m.label}`);
    option.append(input, ctx.el('span', '', m.label));
    fieldset.appendChild(option);
    radios.push(input);
  });
  bar.appendChild(fieldset);

  const status = ctx.el('p', STATUS_CLASS, '');
  status.id = STATUS_ID;

  S.bar = bar;
  S.status = status;
  S.radios = radios;
  S.bound = false;
}

/* Les seuls écouteurs sont ceux des trois inputs, locaux à la barre. Aucun
 * document.addEventListener, aucune interception de touche du routeur. */
function bindListeners() {
  S.radios.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      S.mode = radio.value;
      refresh(true);
    });
  });
  S.bound = true;
}

/* E008-10 : garde anti-doublon explicite. Au plus un nœud vivant par id
 * possédé ; un nœud périmé (ancien rendu encore attaché ailleurs) est retiré. */
function enforceUniqueIds(keep) {
  if (typeof document === 'undefined') return;
  OWNED_IDS.forEach((id) => {
    const nodes = document.querySelectorAll('#' + id);
    for (let i = 0; i < nodes.length; i += 1) {
      if (nodes[i] !== keep[id] && nodes[i].parentNode) {
        nodes[i].parentNode.removeChild(nodes[i]);
      }
    }
  });
}

function apply(ctx) {
  /* E008-01 : filtre sur la vue V2 et gardes de type pour un ctx minimal. */
  if (!ctx || ctx.viewId !== 'pointsv2') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const stage = ctx.stage && ctx.stage.isConnected && typeof ctx.stage.querySelector === 'function'
    ? ctx.stage
    : null;

  /* E008-10 : une seule feuille injectée (cssOnce du registre) et une seule
   * portée ancrée sur le conteneur de la vue. */
  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.setAttribute(DATA_SCOPE, '1');

  /* E008-09 : couplage explicite à ctx.reducedMotion(), sans matchMedia propre
   * ni écouteur global. La media query CSS protège aussi les ctx minimaux. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  /* E008-01 : la barre vit dans .points-matrix, jamais dans le document entier. */
  const matrix = layout.querySelector('.points-matrix')
    || (stage && stage.querySelector('.points-matrix'));
  if (!matrix) return;
  const grid = matrix.querySelector('.points-grid')
    || (stage && stage.querySelector('.points-grid'));
  if (!grid || !grid.isConnected || grid.parentElement !== matrix) return;

  const columns = readColumns(grid);
  if (!columns || columns.domains.length === 0) return;

  /* E008-10 : une barre déconnectée ou déplacée marque un rendu neuf. */
  const barHere = S.bar && S.bar.isConnected && S.bar.parentElement === matrix ? S.bar : null;
  const fresh = !barHere;
  if (fresh) {
    S.originalDomains = columns.domains.slice();
    S.bar = null;
    S.status = null;
    S.radios = [];
    S.bound = false;
  } else if (typeof document !== 'undefined') {
    const stale = document.getElementById(BAR_ID);
    if (stale && stale !== S.bar && stale.parentNode) stale.parentNode.removeChild(stale);
  }

  S.grid = grid;
  S.columns = columns;

  if (!S.bar || !S.status || S.radios.length === 0) buildBar(ctx);

  enforceUniqueIds({
    [BAR_ID]: S.bar,
    [STATUS_ID]: S.status,
    [FIELDSET_ID]: S.bar.querySelector('#' + FIELDSET_ID),
    [ORIGIN_ID]: S.radios[0],
    [NAME_ID]: S.radios[1],
    [COUNT_ID]: S.radios[2],
  });

  /* E008-01 : insertBefore déplace les nœuds existants au même emplacement à
   * chaque rendu : aucune duplication, aucune fuite d'écouteur. */
  matrix.insertBefore(S.bar, grid);
  matrix.insertBefore(S.status, grid);

  if (fresh || !S.bound) bindListeners();
  refresh(false);
}

register('E008', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
