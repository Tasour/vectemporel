import { register } from './registry.js';

/* Lentille E079 — passe V2, domaine H « Responsive & mobile ».
 * Thème : « écran étroit sans débordement horizontal ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E079.md — chantiers E079-01 à E079-10.
 * Fichier possédé : src/views/chronology/v2/E079.js uniquement. Aucun fichier
 * partagé n'est modifié (registry.js, index.js, styles.css, src/views/chronology.js,
 * passe 1 et autres lentilles laissés intacts).
 *
 * Contrat exploité : viewId 'chronologyv2', stage, layout, css, el, reducedMotion.
 * Une seule feuille CSS : ctx.css('chronology-v2-e079', CSS). Tous les IDs DOM
 * sont préfixés chronology-v2-e079- et protégés par une garde d'existence.
 *
 * Invariants :
 * - un seul register('E079', install) ;
 * - le panneau est un bloc en flux normal : jamais de positionnement absolu,
 *   jamais de tabindex, jamais de superposition sur la frise ou la fiche ;
 * - zéro animation, zéro transition propre, zéro boucle rAF, zéro minuteur,
 *   zéro aléa, zéro réseau, zéro journalisation, zéro HTML brut ;
 * - un seul écouteur « resize » passif, posé sous une garde, uniquement pour
 *   rafraîchir les mesures de largeur ; aucune écriture live, aucun vol de focus.
 */

const CSS_ID = 'chronology-v2-e079';
const PANEL_ID = 'chronology-v2-e079-panel';
const TITLE_ID = 'chronology-v2-e079-title';
const S01_ID = 'chronology-v2-e079-s01';
const S02_ID = 'chronology-v2-e079-s02';
const S03_ID = 'chronology-v2-e079-s03';
const S04_ID = 'chronology-v2-e079-s04';
const S05_ID = 'chronology-v2-e079-s05';
const S06_ID = 'chronology-v2-e079-s06';
const S07_ID = 'chronology-v2-e079-s07';
const S08_ID = 'chronology-v2-e079-s08';
const S09_ID = 'chronology-v2-e079-s09';
const S10_ID = 'chronology-v2-e079-s10';
const BILAN_ID = 'chronology-v2-e079-bilan';
const HOST_ID = 'atlas-chrono-main';

/* E079-01 à E079-09 : feuille unique. Le panneau se protège lui-même contre le
   débordement (box-sizing, min-width:0, overflow-wrap:anywhere, max-width:100%).
   Le bloc « repli étroit » neutralise les sources de débordement relevées dans
   les fichiers sources en lecture seule : grille à colonne fixe (styles.css:194),
   largeur minimale du champ (chronology.js:49), pistes minimales des cartes
   (styles.css:205), titres longs (chronology.js:228 :440), fil de situation
   (styles.css:107-108), en-têtes de point (styles.css:227) et sources
   (chronology.js:493-499). Aucune couleur, aucune police, aucune animation
   n'est modifiée : seules la largeur et la coupe des mots sont ciblées. */
const CSS = `
  #${PANEL_ID} {
    box-sizing: border-box; max-width: 100%; min-width: 0;
    margin: 16px 0 0; padding: 10px 12px 12px;
    overflow-wrap: anywhere;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums;
  }
  #${PANEL_ID} .v2e079-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .v2e079-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .v2e079-list { margin: 0; padding: 0; }
  #${PANEL_ID} .v2e079-row {
    display: flex; flex-wrap: wrap; gap: 1px 10px; margin: 0 0 4px;
    padding: 0 0 4px; border-bottom: 1px solid var(--line);
  }
  #${PANEL_ID} .v2e079-key { flex: 1 1 168px; min-width: 0; margin: 0; color: var(--muted); }
  #${PANEL_ID} .v2e079-val { flex: 2 1 200px; min-width: 0; margin: 0; color: var(--gold-bright); }
  #${PANEL_ID} .v2e079-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }
  /* E079-01, E079-03, E079-04, E079-05, E079-06, E079-07, E079-08 :
     repli(documenté) sous 620 px. Les largeurs minimales héritées sont
     annulées et les libellés longs peuvent se couper, jamais déborder. */
  @media (max-width: 620px) {
    .chronology-layout { grid-template-columns: minmax(0, 1fr); }
    .chronology-main, .chronology-aside { min-width: 0; }
    #atlas-chrono-search { min-width: 0; }
    .event-list.atlas-chrono-events { grid-template-columns: minmax(0, 1fr); }
    .atlas-chrono-h1, .aside-title, .event-card strong,
    .nav-c2-trail-item, .point-sources li { overflow-wrap: anywhere; }
    .point-head { flex-wrap: wrap; }
    #${PANEL_ID} .v2e079-key { flex-basis: 100%; }
  }
  /* E079-09 : l'état reste lisible en couleurs forcées, par le texte et la
     bordure, sans dépendre de la seule teinte dorée. */
  @media (forced-colors: active) {
    #${PANEL_ID} {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .v2e079-title, #${PANEL_ID} .v2e079-key,
    #${PANEL_ID} .v2e079-val, #${PANEL_ID} .v2e079-bilan { color: CanvasText; }
  }
  /* E079-10 : neutralisation défensive d'un mouvement éventuellement hérité
     de la coque ; la lentille ne crée elle-même aucune animation. */
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
`;

function occurrences(pattern) {
  return (CSS.match(pattern) || []).length;
}

/* E079-01, E079-03, E079-04, E079-05, E079-06, E079-09, E079-10 : audit de la
   feuille unique, calculé une fois depuis sa chaîne source. Aucun chiffre
   n'est codé en dur dans les libellés : chaque valeur affichée dérive de cette
   mesure ou du DOM réel. */
const NARROW_AUDIT = Object.freeze({
  narrow620: occurrences(/@media\s*\(max-width:\s*620px\)/g),
  wrapAnywhere: occurrences(/overflow-wrap:\s*anywhere/g),
  minZero: occurrences(/min-width:\s*0/g),
  gridMin: occurrences(/minmax\(0,\s*1fr\)/g),
  forced: occurrences(/@media\s*\(forced-colors:\s*active\)/g),
  reduced: occurrences(/@media\s*\(prefers-reduced-motion:\s*reduce\)/g),
});

let installs = 0;
let resizeBound = false;
let refs = {
  panel: null, layout: null, stage: null, view: null, getReduced: null,
  s01: null, s02: null, s03: null, s04: null, s05: null,
  s06: null, s07: null, s08: null, s09: null, s10: null, bilan: null,
};

/* E079-10 : garde d'existence. La coque reconstruisant le stage, un nœud de la
   rendu précédent est détaché : on le réutilise et on le déplace dans le parent
   courant plutôt que d'en créer un doublon. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setData(node, key, value) {
  if (node && node.dataset[key] !== value) node.dataset[key] = value;
}

function parsePx(value) {
  return (String(value || '').match(/-?\d+(?:\.\d+)?px/g) || [])
    .map((token) => Math.round(parseFloat(token)));
}

function overflowOf(node) {
  if (!node) return 0;
  const over = node.scrollWidth - node.clientWidth;
  return over > 0 ? over : 0;
}

function styleOf(view, node) {
  return view && node && typeof view.getComputedStyle === 'function'
    ? view.getComputedStyle(node)
    : null;
}

function countOverflow(nodes) {
  let total = 0;
  for (let i = 0; i < nodes.length; i += 1) if (overflowOf(nodes[i]) > 0) total += 1;
  return total;
}

/* E079-01 à E079-10 : les dix mesures sont lues dans le DOM rendu et dans la
   feuille unique, puis affichées en texte visible ordinaire, sans région live.
   Chaque ligne porte son propre attribut data-e079-* : effet DOM observable,
   indépendant de toute couleur. */
function refresh() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;
  const view = r.view || (typeof window !== 'undefined' ? window : null);
  const vw = view ? view.innerWidth : 0;
  const reduced = typeof r.getReduced === 'function' ? Boolean(r.getReduced()) : false;
  const style = (node) => styleOf(view, node);

  /* E079-01 — grille à colonne fixe (styles.css:194, repli :316). */
  const columns = parsePx(style(r.layout)?.gridTemplateColumns);
  write(r.s01, columns.length
    ? `Pistes de la grille : ${columns.join(' + ')} px (${columns.length} colonne${columns.length > 1 ? 's' : ''}).`
    : 'Grille non mesurable sur ce rendu.');
  setData(r.s01, 'e079Columns', String(columns.length));

  /* E079-02 — marges internes de la colonne narrative (styles.css:195). */
  const main = document.getElementById(HOST_ID);
  const ms = style(main);
  const mainW = main ? main.clientWidth : 0;
  const pad = ms ? Math.round(parseFloat(ms.paddingLeft || 0) + parseFloat(ms.paddingRight || 0)) : 0;
  write(r.s02, `Colonne narrative : ${mainW} px dont ${pad} px de marges internes ; largeur utile ${mainW - pad} px.`);
  setData(r.s02, 'e079MainWidth', String(mainW));
  setData(r.s02, 'e079Padding', String(pad));

  /* E079-03 — largeur minimale du champ de recherche (chronology.js:49). */
  const search = document.getElementById('atlas-chrono-search');
  const searchMin = style(search)?.minWidth || '—';
  const searchOver = overflowOf(search);
  write(r.s03, `Recherche : largeur minimale ${searchMin}, débordement ${searchOver} px.`);
  setData(r.s03, 'e079SearchMin', searchMin);
  setData(r.s03, 'e079SearchOver', String(searchOver));

  /* E079-04 — pistes minimales des cartes (styles.css:205, repli :339). */
  const events = document.getElementById('atlas-chrono-events');
  const tracks = parsePx(style(events)?.gridTemplateColumns);
  write(r.s04, `Grille des repères : ${tracks.length} colonne(s) — ${tracks.join(' + ') || '—'} px.`);
  setData(r.s04, 'e079EventColumns', String(tracks.length));

  /* E079-05 — titres longs non cassables (chronology.js:228, :424). */
  const titles = document.querySelectorAll('#atlas-chrono-title, .aside-title, .event-card strong');
  const titleOver = countOverflow(titles);
  write(r.s05, `Titres débordants : ${titleOver} sur ${titles.length} (titre de vue, titre de fiche, cartes).`);
  setData(r.s05, 'e079TitleOver', String(titleOver));

  /* E079-06 — fil de situation (chronology.js:143-169, styles.css:107-108). */
  const trail = document.getElementById('nav-c2a-trail');
  const trailOver = overflowOf(trail);
  write(r.s06, `Fil de situation : débordement horizontal ${trailOver} px.`);
  setData(r.s06, 'e079TrailOver', String(trailOver));

  /* E079-07 — en-têtes de point en flex non replié (styles.css:227). */
  const heads = document.querySelectorAll('.point-head');
  const headOver = countOverflow(heads);
  write(r.s07, `En-têtes de point débordants : ${headOver} sur ${heads.length}.`);
  setData(r.s07, 'e079HeadOver', String(headOver));

  /* E079-08 — libellés de sources longs (chronology.js:493-499). */
  const sources = document.querySelectorAll('.point-sources li');
  const sourceOver = countOverflow(sources);
  write(r.s08, `Sources débordantes : ${sourceOver} sur ${sources.length}.`);
  setData(r.s08, 'e079SourceOver', String(sourceOver));

  /* E079-09 — débordement racine et contenu masqué par le stage (styles.css:102). */
  const root = document.documentElement;
  const rootOver = Math.max(0, root.scrollWidth - root.clientWidth);
  const stageOver = overflowOf(r.stage);
  write(r.s09, `Débordement racine : ${rootOver} px · contenu débordant masqué dans le stage : ${stageOver} px.`);
  setData(r.s09, 'e079RootOver', String(rootOver));
  setData(r.s09, 'e079StageOver', String(stageOver));

  /* E079-10 — idempotence et bilan : tout dérive des mesures ci-dessus. */
  const panels = document.querySelectorAll(`#${PANEL_ID}`).length;
  write(r.s10, `Rendus : ${installs} · panneaux présents : ${panels} · largeur d'écran : ${vw} px.`);
  setData(r.s10, 'e079Renders', String(installs));
  setData(r.s10, 'e079Panels', String(panels));

  const signals = [searchOver, trailOver, headOver, sourceOver, rootOver, stageOver]
    .filter((value) => value > 0).length;
  write(r.bilan, `Bilan écran étroit (${vw} px) : ${signals} signal(aux) de débordement · ${NARROW_AUDIT.narrow620} repli 620 px, ${NARROW_AUDIT.wrapAnywhere} coupe(s) de mots, ${NARROW_AUDIT.minZero} largeur(s) minimale(s) remise(s) à zéro, ${NARROW_AUDIT.gridMin} grille(s) en minmax(0,1fr) · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);
  setData(r.panel, 'e079Viewport', String(vw));
  setData(r.panel, 'e079Signals', String(signals));
  setData(r.panel, 'e079Reduced', reduced ? '1' : '0');
  setData(r.panel, 'e079NarrowRules', String(NARROW_AUDIT.narrow620));
  setData(r.panel, 'e079Renders', String(installs));
}

/* E079-10 : un seul écouteur « resize » passif, sans minuteur ni sondage. La
   garde resizeBound évite toute fuite sur les rendus successifs. */
function onResize() {
  if (refs.panel && refs.panel.isConnected) refresh();
}

function bindResize() {
  if (resizeBound) return true;
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return false;
  window.addEventListener('resize', onResize, { passive: true });
  resizeBound = true;
  return true;
}

function addRow(list, make, key, id) {
  const row = make('div', 'v2e079-row');
  const dt = make('dt', 'v2e079-key', key);
  const dd = make('dd', 'v2e079-val');
  dd.id = id;
  row.append(dt, dd);
  list.appendChild(row);
  return dd;
}

function install(ctx) {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installs += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(HOST_ID) || ctx.stage || ctx.layout;
  if (!host || typeof host.appendChild !== 'function') return;

  const panel = ensureNode(make, PANEL_ID, 'section', 'v2e079-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'v2e079-title', 'Écran étroit — aucun débordement horizontal');
  title.id = TITLE_ID;
  const lede = make('p', 'v2e079-lede', 'Panneau de mesure : il lit les largeurs réelles de la frise et signale tout débordement à 390 px. Il ajoute des repliements défensifs, sans éditer les fichiers partagés ni détourner le routeur.');

  const list = make('dl', 'v2e079-list');
  const s01 = addRow(list, make, 'S01 · Grille et pistes', S01_ID);
  const s02 = addRow(list, make, 'S02 · Marges internes', S02_ID);
  const s03 = addRow(list, make, 'S03 · Champ de recherche', S03_ID);
  const s04 = addRow(list, make, 'S04 · Pistes des cartes', S04_ID);
  const s05 = addRow(list, make, 'S05 · Titres longs', S05_ID);
  const s06 = addRow(list, make, 'S06 · Fil de situation', S06_ID);
  const s07 = addRow(list, make, 'S07 · En-têtes de point', S07_ID);
  const s08 = addRow(list, make, 'S08 · Sources de point', S08_ID);
  const s09 = addRow(list, make, 'S09 · Débordement racine', S09_ID);
  const s10 = addRow(list, make, 'S10 · Idempotence', S10_ID);

  const bilan = make('p', 'v2e079-bilan');
  bilan.id = BILAN_ID;

  /* replaceChildren plutôt que concaténer du balisage : les nœuds de la rendu
     précédente sont détachés, donc aucun ID en doublon ne subsiste. */
  panel.replaceChildren(title, lede, list, bilan);

  const view = ctx.stage && ctx.stage.ownerDocument
    ? ctx.stage.ownerDocument.defaultView
    : (typeof window !== 'undefined' ? window : null);
  refs = {
    panel, layout: ctx.layout, stage: ctx.stage || null, view,
    getReduced: ctx.reducedMotion,
    s01, s02, s03, s04, s05, s06, s07, s08, s09, s10, bilan,
  };
  refresh();

  bindResize();
  refresh();
}

register('E079', install);
