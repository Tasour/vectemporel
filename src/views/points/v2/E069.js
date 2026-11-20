import { register } from './registry.js';

/* Lentille E069 — passe V2 (module POINTS/V2 E069). Domaine G : performance &
 * rendu. Thème canonique : « G. Performance & rendu — budget ≤ 6 canvas par
 * frame ». Rapport : UNIFIED_AUDIT/POINTS/V2/views/E069.md — chantiers
 * E069-V2-01 à E069-V2-10, tous distincts des dix chantiers de la passe 1.
 *
 * Fichier possédé : ce module uniquement. Ni la passe 1 (src/views/points/E069.js),
 * ni la vue (src/views/points.js), ni registry.js, index.js, styles.css, ni
 * aucune autre lentille ne sont édités ou doublés. Le panneau V2 est AJOUTÉ
 * au DOM déjà produit ; il ne retire et ne réécrit aucun nœud de la passe 1.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Une seule feuille via ctx.css('points-v2-e069', CSS), intégralement préfixée
 * .points-v2-e069 ; tous les IDs créés sont préfixés points-v2-e069- ; tout DOM
 * est bâti avec ctx.el, jamais par réinterprétation de balisage.
 *
 * Invariants : un seul register ; une seule mesure par rendu, en lecture seule ;
 * aucun canvas créé ni dessiné, aucun contexte 2D ouvert, aucune boucle
 * d'animation, aucun minuteur, aucun observateur continu, aucun aléa, aucun
 * réseau, aucune sortie de débogage. Chaque état porte un mot ET une forme,
 * jamais la couleur seule.
 */

const CSS_ID = 'points-v2-e069';
const SCOPE = 'points-v2-e069';
const PANEL_ID = 'points-v2-e069-panel';
const TITLE_ID = 'points-v2-e069-title';
const BUDGET_ID = 'points-v2-e069-budget';
const COUNT_ID = 'points-v2-e069-count';
const SURFACE_ID = 'points-v2-e069-surface';
const BATCHES_ID = 'points-v2-e069-batches';
const ALERT_ID = 'points-v2-e069-alert';
const OWN_ID = 'points-v2-e069-own';
const LOOP_ID = 'points-v2-e069-loop';
const DEFERRED_ID = 'points-v2-e069-deferred';
const FALLBACK_ID = 'points-v2-e069-fallback';
const RENDERS_ID = 'points-v2-e069-renders';
const GAUGE_ID = 'points-v2-e069-gauge';
const FILL_ID = 'points-v2-e069-fill';
const LOTS_ID = 'points-v2-e069-lots';
const REDUCED_ATTR = 'data-v2-e069-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* E069-V2-01 : le plafond normatif est déclaré UNE seule fois. Tous les
 * chiffres affichés, le pas des lots et la saturation de la jauge en dérivent :
 * aucun « 6 » n'est recopié dans un libellé. */
const CANVAS_BUDGET = 6;

/* E069-V2-01 / V2-05 / V2-09 : feuille unique, chaque sélecteur ancré sur
 * .points-v2-e069. Le panneau reste un bloc en flux : il n'ajoute aucun arrêt
 * Tab, ne recouvre ni la matrice ni le détail. Le dépassement ajoute une forme
 * (bordure épaisse et pointillée) au mot « DÉPASSEMENT ». */
const CSS = `
.points-v2-e069 .points-v2-e069-panel {
  box-sizing: border-box;
  margin: 12px 0 6px; padding: 10px 12px 12px;
  border: 1px solid var(--line); border-left: 3px solid var(--gold);
  border-radius: 10px; background: rgba(8, 11, 16, .55);
  color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
  font-variant-numeric: tabular-nums; overflow-wrap: anywhere; max-width: 100%;
}
.points-v2-e069 .points-v2-e069-title {
  margin: 0 0 6px; color: var(--gold-bright);
  font-family: var(--serif); font-size: 14px; font-weight: 600;
  letter-spacing: 0; text-transform: none;
}
.points-v2-e069 .points-v2-e069-lede { margin: 0 0 8px; color: var(--muted); }
.points-v2-e069 .points-v2-e069-list { margin: 0; }
.points-v2-e069 .points-v2-e069-row {
  display: flex; gap: 10px; margin: 0 0 3px;
  padding: 0 0 3px; border-bottom: 1px solid var(--line);
}
.points-v2-e069 .points-v2-e069-key { flex: 0 0 168px; margin: 0; color: var(--muted); }
.points-v2-e069 .points-v2-e069-val {
  flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright);
}
.points-v2-e069 .points-v2-e069-gauge {
  height: 8px; margin: 8px 0 6px; overflow: hidden;
  border: 1px solid var(--line-strong); border-radius: 5px;
}
.points-v2-e069 .points-v2-e069-fill {
  display: block; height: 100%; width: 0; background: var(--gold);
}
.points-v2-e069 .points-v2-e069-lots {
  margin: 2px 0 8px; padding-left: 18px; color: var(--muted);
}
.points-v2-e069 .points-v2-e069-alert {
  display: inline-block; padding: 1px 7px;
  border: 1px solid var(--line-strong); border-radius: 4px; font-weight: 600;
}
.points-v2-e069 .points-v2-e069-alert[data-e069-over="1"] {
  border-width: 2px; border-style: dashed;
}
.points-v2-e069 .points-v2-e069-bilan {
  margin: 8px 0 0; padding-top: 7px;
  border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
}
/* E069-V2-09 : aucune transition n'est créée ; neutralisation défensive d'un
 * mouvement éventuellement hérité de la coque, et repli en contraste forcé. */
.points-v2-e069[` + REDUCED_ATTR + `="1"] .points-v2-e069-panel,
.points-v2-e069[` + REDUCED_ATTR + `="1"] .points-v2-e069-panel * {
  transition: none !important; animation: none !important;
}
@media (prefers-reduced-motion: reduce) {
  .points-v2-e069 .points-v2-e069-panel,
  .points-v2-e069 .points-v2-e069-panel * {
    transition: none !important; animation: none !important;
  }
}
@media (max-width: 620px) {
  .points-v2-e069 .points-v2-e069-row { flex-wrap: wrap; gap: 1px 8px; }
  .points-v2-e069 .points-v2-e069-key { flex-basis: 100%; }
}
@media (forced-colors: active) {
  .points-v2-e069 .points-v2-e069-panel {
    border: 1px solid CanvasText; border-left: 3px solid CanvasText;
    background: Canvas; color: CanvasText;
  }
  .points-v2-e069 .points-v2-e069-title,
  .points-v2-e069 .points-v2-e069-key,
  .points-v2-e069 .points-v2-e069-val,
  .points-v2-e069 .points-v2-e069-lots,
  .points-v2-e069 .points-v2-e069-alert,
  .points-v2-e069 .points-v2-e069-bilan { color: CanvasText; }
  .points-v2-e069 .points-v2-e069-fill { background: CanvasText; }
  .points-v2-e069 .points-v2-e069-alert[data-e069-over="1"] {
    outline: 1px solid Highlight;
  }
}
`;

let installs = 0;

/* E069-V2-10 : garde d'existence et d'unicité pour toute ID préfixée. La coque
 * reconstruisant son conteneur à chaque rendu, un nœud du rendu précédent est
 * détaché : il est retrouvé par ID, déplacé dans le nouveau parent, puis ses
 * éventuels doublons sont retirés. Jamais de clone, jamais de nœud périmé. */
function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function ensureNode(make, id, tagName, className, parent) {
  let node = typeof document !== 'undefined' && typeof document.getElementById === 'function'
    ? document.getElementById(id) : null;
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  const found = nodesById(id);
  found.forEach((other) => { if (other !== node && typeof other.remove === 'function') other.remove(); });
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E069-V2-10 : déduplication des écritures — deux rendus sans changement ne
 * touchent pas au texte ni aux attributs, donc ne réveillent rien d'inutile. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setAttr(node, name, value) {
  if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
}

/* E069-V2-02 / V2-03 / V2-04 / V2-05 / V2-08 : unique source de vérité, lue
 * dans le DOM de la vue en lecture seule. Aucun canvas n'est créé, modifié ou
 * redimensionné ; la mesure est instantanée, recalculée à chaque rendu. */
function canvasReport(layout) {
  const found = layout && typeof layout.getElementsByTagName === 'function'
    ? layout.getElementsByTagName('canvas') : [];
  const nodes = Array.prototype.slice.call(found);
  let surface = 0;
  nodes.forEach((node) => {
    const width = Number(node.width) || 0;
    const height = Number(node.height) || 0;
    surface += width * height;
  });
  const count = nodes.length;
  const deferred = Math.max(0, count - CANVAS_BUDGET);
  const names = nodes.slice(CANVAS_BUDGET).map((node, index) => (
    node.id ? '#' + node.id : 'n° ' + (CANVAS_BUDGET + index + 1)
  ));
  return {
    count,
    surface,
    deferred,
    names,
    lots: Math.max(1, Math.ceil(count / CANVAS_BUDGET)),
    over: count > CANVAS_BUDGET,
  };
}

/* E069-V2-04 : plan de rendu en lots d'au plus CANVAS_BUDGET canvas. Le plan
 * est décrit par une liste sémantique, jamais exécuté : aucune boucle, aucun
 * minuteur, aucun ordonnanceur de frame. */
function writeLots(make, list, count) {
  const rows = [];
  for (let start = 0; start < count; start += CANVAS_BUDGET) {
    const end = Math.min(start + CANVAS_BUDGET, count);
    rows.push(make('li', 'points-v2-e069-lot',
      'Lot ' + (rows.length + 1) + ' : canvas ' + (start + 1) + ' à ' + end + ' (' + (end - start) + ').'));
  }
  if (!rows.length) rows.push(make('li', 'points-v2-e069-lot', 'Aucun canvas à planifier : aucun lot requis.'));
  list.replaceChildren(...rows);
}

function row(make, id, label) {
  const line = make('div', 'points-v2-e069-row');
  const key = make('dt', 'points-v2-e069-key', label);
  const value = make('dd', 'points-v2-e069-val');
  value.id = id;
  line.append(key, value);
  return line;
}

function install(ctx) {
  if (!ctx || typeof ctx.el !== 'function' || typeof ctx.css !== 'function') return;
  if (VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;

  installs += 1;
  ctx.css(CSS_ID, CSS);                                   /* V2-01 : une feuille. */
  layout.classList.add(SCOPE);

  /* Ancrage non destructif : après la jauge de la passe 1 si elle existe, sinon
   * après le titre de la matrice, sinon en fin de matrice (repli sur layout). */
  const make = ctx.el;
  const matrix = layout.querySelector('.points-matrix');
  const parent = matrix || layout;
  let anchor = null;
  if (matrix) {
    anchor = document.getElementById('points-e069-budget') || matrix.querySelector('.points-title');
  }
  if (anchor && anchor.parentElement !== parent) anchor = null;

  const panel = ensureNode(make, PANEL_ID, 'section', 'points-v2-e069-panel', parent);
  panel.setAttribute('role', 'region');
  setAttr(panel, 'aria-labelledby', TITLE_ID);
  if (anchor && anchor.nextSibling) parent.insertBefore(panel, anchor.nextSibling);
  else if (!anchor) parent.appendChild(panel);

  const title = make('h2', 'points-v2-e069-title', 'Budget de canvas par frame — lecture V2');
  title.id = TITLE_ID;
  const lede = make('p', 'points-v2-e069-lede',
    'Ce panneau mesure les canvas attachés à la vue Points et décrit un plan de rendu limité à six canvas par frame. La lentille ne crée aucun canvas et ne dessine rien.');

  const gauge = make('div', 'points-v2-e069-gauge');
  gauge.id = GAUGE_ID;
  gauge.setAttribute('aria-hidden', 'true');
  const fill = make('span', 'points-v2-e069-fill');
  fill.id = FILL_ID;
  gauge.appendChild(fill);

  const lots = make('ul', 'points-v2-e069-lots');
  lots.id = LOTS_ID;

  const list = make('dl', 'points-v2-e069-list');
  list.append(
    row(make, BUDGET_ID, '01 · Plafond normatif'),
    row(make, COUNT_ID, '02 · Canvas recensés'),
    row(make, SURFACE_ID, '03 · Surface cumulée'),
    row(make, BATCHES_ID, '04 · Lots de rendu'),
    row(make, ALERT_ID, '05 · État du budget'),
    row(make, OWN_ID, '06 · Canvas créés ici'),
    row(make, LOOP_ID, '07 · Boucles et minuteurs'),
    row(make, DEFERRED_ID, '08 · Canvas différés'),
    row(make, FALLBACK_ID, '09 · Mouvement et contraste'),
    row(make, RENDERS_ID, '10 · Rendus et unicité')
  );

  const bilan = make('p', 'points-v2-e069-bilan',
    'Mesure instantanée, recalculée à chaque rendu : elle décrit le DOM tel qu’il est, sans modifier le rendu des canvas existants.');
  panel.replaceChildren(title, lede, gauge, lots, list, bilan);

  const report = canvasReport(layout);
  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = Boolean(ctx.reducedMotion()); }
    catch { reduced = false; }
  }
  setAttr(layout, REDUCED_ATTR, reduced ? '1' : '0');

  write(document.getElementById(BUDGET_ID), CANVAS_BUDGET + ' canvas au plus par frame.');
  write(document.getElementById(COUNT_ID), report.count + ' canvas attachés à cette vue.');
  write(document.getElementById(SURFACE_ID),
    report.surface + ' pixels² cumulés (largeur × hauteur des attributs).');
  write(document.getElementById(BATCHES_ID),
    report.lots + (report.lots > 1 ? ' lots planifiés.' : ' lot planifié.'));
  write(document.getElementById(ALERT_ID), report.over ? 'DÉPASSEMENT' : 'DANS LE BUDGET');
  write(document.getElementById(OWN_ID), '0 canvas créé par la lentille E069.');
  write(document.getElementById(LOOP_ID), '0 boucle d’animation, 0 minuteur, 0 observateur : mesure au rendu.');
  write(document.getElementById(DEFERRED_ID), report.deferred
    ? report.deferred + ' canvas au-delà du premier lot : ' + report.names.join(', ') + '.'
    : 'Aucun canvas différé : tout tient dans le premier lot.');
  write(document.getElementById(FALLBACK_ID),
    'Mouvement réduit : ' + (reduced ? 'oui' : 'non') + ' · contraste forcé pris en charge.');
  write(document.getElementById(RENDERS_ID),
    installs + (installs > 1 ? ' rendus' : ' rendu') + ' · 1 panneau · 1 feuille CSS · 1 greffon.');

  writeLots(make, document.getElementById(LOTS_ID), report.count);
  const fillWidth = Math.min(100, Math.round((report.count / CANVAS_BUDGET) * 100));
  setAttr(document.getElementById(FILL_ID), 'style', 'width:' + fillWidth + '%');
  setAttr(document.getElementById(ALERT_ID), 'data-e069-over', report.over ? '1' : '0');
  setAttr(panel, 'data-v2-e069-budget', String(CANVAS_BUDGET));
  setAttr(panel, 'data-v2-e069-count', String(report.count));
  setAttr(panel, 'data-v2-e069-surface', String(report.surface));
  setAttr(panel, 'data-v2-e069-lots', String(report.lots));
  setAttr(panel, 'data-v2-e069-over', report.over ? '1' : '0');
  setAttr(panel, 'data-v2-e069-own', '0');
  setAttr(panel, 'data-v2-e069-loop', '0');
  setAttr(panel, 'data-v2-e069-deferred', String(report.deferred));
  setAttr(panel, REDUCED_ATTR, reduced ? '1' : '0');
  setAttr(panel, 'data-v2-e069-renders', String(installs));
}

/* Un seul register, sous la forme ctx => { … } attendue par le contrat V2. Toute
 * anomalie est neutralisée par le registre (registry.js) sans journalisation. */
register('E069', (ctx) => { install(ctx); });
