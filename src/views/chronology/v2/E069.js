import { register } from './registry.js';

/* Lentille E069 — passe V2, domaine G (performance & rendu).
 * Thème canonique : « G. Performance & rendu — budget ≤ 6 canvas par frame »
 * (UNIFIED_AUDIT/CHRONOLOGIE/V2/themes.json:76).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E069.md — chantiers
 * E069-01 à E069-10. Fichier possédé : src/views/chronology/v2/E069.js
 * uniquement. Aucun fichier partagé n'est modifié (registry.js, index.js,
 * styles.css, src/views/chronology.js, passe 1 et autres lentilles intacts).
 *
 * Contrat exploité : viewId 'chronologyv2', stage, layout ; helpers ctx.css,
 * ctx.el, ctx.reducedMotion. Une seule feuille via ctx.css('chronology-v2-e069', CSS).
 * Tous les IDs DOM sont préfixés chronology-v2-e069- et protégés par une garde
 * d'existence.
 *
 * Invariants :
 * - un seul register('E069', install) ;
 * - aucun canvas créé, aucun contexte 2D ouvert, aucune boucle rAF, aucun
 *   minuteur, aucun aléa, aucun réseau, aucune journalisation, aucun HTML brut ;
 * - le budget est mesuré et planifié en lecture seule : la lentille ne dessine
 *   jamais et ne détourne aucun canvas existant.
 */

const CSS_ID = 'chronology-v2-e069';
const PANEL_ID = 'chronology-v2-e069-panel';
const TITLE_ID = 'chronology-v2-e069-title';
const BUDGET_ID = 'chronology-v2-e069-budget';
const COUNT_ID = 'chronology-v2-e069-count';
const SURFACE_ID = 'chronology-v2-e069-surface';
const BATCHES_ID = 'chronology-v2-e069-batches';
const ALERT_ID = 'chronology-v2-e069-alert';
const OWN_ID = 'chronology-v2-e069-own';
const RAF_ID = 'chronology-v2-e069-raf';
const DEFERRED_ID = 'chronology-v2-e069-deferred';
const FALLBACK_ID = 'chronology-v2-e069-fallback';
const RENDERS_ID = 'chronology-v2-e069-renders';
const GAUGE_ID = 'chronology-v2-e069-gauge';
const FILL_ID = 'chronology-v2-e069-fill';
const LOTS_ID = 'chronology-v2-e069-lots';
const HOST_ID = 'atlas-chrono-main';

/* E069-01 : le seuil normatif est exprimé une seule fois dans le module.
   Tous les chiffres affichés en dérivent, aucun n'est recopié dans un libellé. */
const CANVAS_BUDGET = 6;

/* E069-01, E069-05, E069-09 : feuille unique. Le panneau est un bloc en flux
   normal : il n'ajoute aucun arrêt Tab, ne recouvre ni la frise ni la fiche.
   La jauge et le badge portent l'état par la forme et le texte, jamais par la
   seule couleur. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .v2e069-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .v2e069-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .v2e069-list { margin: 0; }
  #${PANEL_ID} .v2e069-row {
    display: flex; gap: 10px; margin: 0 0 3px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  #${PANEL_ID} .v2e069-key { flex: 0 0 168px; margin: 0; color: var(--muted); }
  #${PANEL_ID} .v2e069-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
  #${PANEL_ID} .v2e069-gauge {
    height: 8px; margin: 8px 0 6px; overflow: hidden;
    border: 1px solid var(--line-strong); border-radius: 5px;
  }
  #${PANEL_ID} .v2e069-fill { display: block; height: 100%; width: 0; background: var(--gold); }
  #${PANEL_ID} .v2e069-lots { margin: 2px 0 8px; padding-left: 18px; color: var(--muted); }
  #${PANEL_ID} .v2e069-alert {
    display: inline-block; padding: 1px 7px;
    border: 1px solid var(--line-strong); border-radius: 4px; font-weight: 600;
  }
  /* E069-05 : le dépassement ajoute une forme (bordure épaisse et pointillée)
     en plus du mot « DÉPASSEMENT », pour rester lisible sans couleur. */
  #${PANEL_ID} .v2e069-alert[data-e069-over="1"] { border-width: 2px; border-style: dashed; }
  #${PANEL_ID} .v2e069-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .v2e069-row { flex-wrap: wrap; gap: 1px 8px; }
    #${PANEL_ID} .v2e069-key { flex-basis: 100%; }
  }
  /* E069-09 : aucune transition n'est créée ; neutralisation défensive d'un
     mouvement éventuellement hérité de la coque. */
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .v2e069-title,
    #${PANEL_ID} .v2e069-key,
    #${PANEL_ID} .v2e069-val,
    #${PANEL_ID} .v2e069-lots,
    #${PANEL_ID} .v2e069-bilan { color: CanvasText; }
    #${PANEL_ID} .v2e069-fill { background: CanvasText; }
  }
`;

let installs = 0;

/* E069-10 : garde d'existence pour toute ID préfixée. La coque reconstruisant
   son conteneur, un nœud de la rendu précédent est détaché : getElementById ne
   le retrouve pas et un nœud frais est créé, sans doublon dans le document. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E069-10 : déduplication des écritures. Deux rendus sans changement ne
   touchent pas au textContent, donc ne réveillent aucun observateur inutile. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setAttr(node, name, value) {
  if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
}

/* E069-02, E069-03, E069-04, E069-05 et E069-08 : unique source de vérité,
   lue dans le DOM en lecture seule. Aucun canvas n'est créé ni modifié. */
function canvasReport() {
  const nodes = Array.from(document.getElementsByTagName('canvas'));
  let surface = 0;
  nodes.forEach((node) => {
    const width = Number(node.width) || 0;
    const height = Number(node.height) || 0;
    surface += width * height;
  });
  const count = nodes.length;
  const deferred = Math.max(0, count - CANVAS_BUDGET);
  const names = nodes.slice(CANVAS_BUDGET).map((node, index) => (
    node.id ? `#${node.id}` : `n° ${CANVAS_BUDGET + index + 1}`
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

/* E069-04 : plan de rendu en lots d'au plus CANVAS_BUDGET canvas. Le plan est
   décrit par une liste sémantique, jamais exécuté : aucune boucle d'animation. */
function writeLots(make, list, count) {
  const rows = [];
  for (let start = 0; start < count; start += CANVAS_BUDGET) {
    const end = Math.min(start + CANVAS_BUDGET, count);
    rows.push(make('li', 'v2e069-lot', `Lot ${rows.length + 1} : canvas ${start + 1} à ${end} (${end - start}).`));
  }
  if (!rows.length) rows.push(make('li', 'v2e069-lot', 'Aucun canvas à planifier : aucun lot requis.'));
  list.replaceChildren(...rows);
}

function row(make, id, label) {
  const line = make('div', 'v2e069-row');
  const key = make('dt', 'v2e069-key', label);
  const value = make('dd', 'v2e069-val');
  value.id = id;
  line.append(key, value);
  return line;
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installs += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(HOST_ID) || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'v2e069-panel', host);
  panel.setAttribute('role', 'region');
  setAttr(panel, 'aria-labelledby', TITLE_ID);

  const title = make('h2', 'v2e069-title', 'Budget de canvas par frame');
  title.id = TITLE_ID;
  const lede = make('p', 'v2e069-lede', 'Panneau de lecture : il mesure les canvas présents et décrit un plan de rendu limité à six canvas par frame. La lentille ne crée aucun canvas et ne dessine rien.');

  const gauge = make('div', 'v2e069-gauge');
  gauge.id = GAUGE_ID;
  const fill = make('span', 'v2e069-fill');
  fill.id = FILL_ID;
  gauge.appendChild(fill);

  const lots = make('ul', 'v2e069-lots');
  lots.id = LOTS_ID;

  const list = make('dl', 'v2e069-list');
  list.append(
    row(make, BUDGET_ID, '01 · Plafond normatif'),
    row(make, COUNT_ID, '02 · Canvas recensés'),
    row(make, SURFACE_ID, '03 · Surface cumulée'),
    row(make, BATCHES_ID, '04 · Lots de rendu'),
    row(make, ALERT_ID, '05 · État du budget'),
    row(make, OWN_ID, '06 · Canvas créés ici'),
    row(make, RAF_ID, '07 · Boucles et minuteurs'),
    row(make, DEFERRED_ID, '08 · Canvas différés'),
    row(make, FALLBACK_ID, '09 · Mouvement et contraste'),
    row(make, RENDERS_ID, '10 · Rendus et unicité')
  );

  const bilan = make('p', 'v2e069-bilan', 'Mesure instantanée, recalculée à chaque rendu : elle décrit le DOM tel qu’il est, sans modifier le rendu des canvas existants.');
  panel.replaceChildren(title, lede, gauge, lots, list, bilan);

  const report = canvasReport();
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;

  write(document.getElementById(BUDGET_ID), `${CANVAS_BUDGET} canvas au plus par frame.`);
  write(document.getElementById(COUNT_ID), `${report.count} canvas présents dans le document.`);
  write(document.getElementById(SURFACE_ID), `${report.surface} pixels² cumulés (largeur × hauteur des attributs).`);
  write(document.getElementById(BATCHES_ID), `${report.lots} lot${report.lots > 1 ? 's' : ''} planifié${report.lots > 1 ? 's' : ''}.`);
  write(document.getElementById(ALERT_ID), report.over ? 'DÉPASSEMENT' : 'DANS LE BUDGET');
  write(document.getElementById(OWN_ID), '0 canvas créé par la lentille E069.');
  write(document.getElementById(RAF_ID), '0 boucle d’animation, 0 minuteur : mesure au rendu.');
  write(document.getElementById(DEFERRED_ID), report.deferred
    ? `${report.deferred} canvas au-delà du premier lot : ${report.names.join(', ')}.`
    : 'Aucun canvas différé : tout tient dans le premier lot.');
  write(document.getElementById(FALLBACK_ID), `Mouvement réduit : ${reduced ? 'oui' : 'non'} · contraste forcé pris en charge.`);
  write(document.getElementById(RENDERS_ID), `${installs} rendu${installs > 1 ? 's' : ''} · 1 panneau · 1 feuille CSS · 1 greffon.`);

  writeLots(make, document.getElementById(LOTS_ID), report.count);
  setAttr(document.getElementById(FILL_ID), 'style', `width:${Math.min(100, Math.round((report.count / CANVAS_BUDGET) * 100))}%`);
  setAttr(document.getElementById(ALERT_ID), 'data-e069-over', report.over ? '1' : '0');
  setAttr(panel, 'data-e069-budget', String(CANVAS_BUDGET));
  setAttr(panel, 'data-e069-count', String(report.count));
  setAttr(panel, 'data-e069-surface', String(report.surface));
  setAttr(panel, 'data-e069-lots', String(report.lots));
  setAttr(panel, 'data-e069-over', report.over ? '1' : '0');
  setAttr(panel, 'data-e069-own', '0');
  setAttr(panel, 'data-e069-raf', '0');
  setAttr(panel, 'data-e069-timers', '0');
  setAttr(panel, 'data-e069-deferred', String(report.deferred));
  setAttr(panel, 'data-e069-reduced', reduced ? '1' : '0');
  setAttr(panel, 'data-e069-renders', String(installs));
}

register('E069', install);
