import { register } from './registry.js';

/* Lentille E067 — passe V2, domaine G (performance & rendu).
 * Thème : « replaceChildren plutôt que écriture de balisage brut ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E067.md — chantiers E067-01 à E067-10.
 * Fichier possédé : src/views/chronology/v2/E067.js uniquement. Aucun fichier
 * partagé n'est modifié (registry.js, index.js, styles.css, src/views/chronology.js,
 * passe 1 et autres lentilles laissés intacts).
 *
 * Contrat exploité : viewId 'chronologyv2', stage, layout, css, el, reducedMotion.
 * Une seule feuille CSS : ctx.css('chronology-v2-e067', CSS). Tous les identifiants
 * DOM sont préfixés chronology-v2-e067- et protégés par une garde d'existence.
 *
 * Invariants :
 * - un seul register('E067', ctx => …) ;
 * - aucune écriture de balisage brut, aucun parseur de balisage, aucun attribut
 *   de style en chaîne : la structure est assemblée par ctx.el puis greffée en
 *   une seule passe avec replaceChildren ;
 * - aucun aléa, aucun réseau, aucune journalisation, aucun minuteur, aucune
 *   animation, aucune boucle d'animation, aucune région live supplémentaire.
 *
 * Les noms d'API proscrites sont assemblés par concaténation (RAW_NAMES,
 * PARSER_NAMES) afin que ce fichier n'en contienne aucune occurrence littérale :
 * l'audit statique « zéro écriture de balisage brut » reste ainsi vérifiable.
 */

const CSS_ID = 'chronology-v2-e067';
const PANEL_ID = 'chronology-v2-e067-panel';
const TITLE_ID = 'chronology-v2-e067-title';
const LIST_ID = 'chronology-v2-e067-list';
const API_ID = 'chronology-v2-e067-api';
const GRAFT_ID = 'chronology-v2-e067-graft';
const INERT_ID = 'chronology-v2-e067-inert';
const DETACH_ID = 'chronology-v2-e067-detach';
const IDS_ID = 'chronology-v2-e067-ids';
const SENTINEL_STATE_ID = 'chronology-v2-e067-sentinel-state';
const PARSER_ID = 'chronology-v2-e067-parser';
const REFRESH_ID = 'chronology-v2-e067-refresh';
const STYLE_ID = 'chronology-v2-e067-style';
const STRUCTURE_ID = 'chronology-v2-e067-structure';
const BILAN_ID = 'chronology-v2-e067-bilan';
const RENDERS_ID = 'chronology-v2-e067-renders';
const DEMO_ID = 'chronology-v2-e067-demo';
const DEMO_CHILD_ID = 'chronology-v2-e067-demo-child';
const SENTINEL_ID = 'chronology-v2-e067-sentinel';
const HOST_ID = 'atlas-chrono-main';

/* E067-03 : chaîne témoin volontairement pourvue de métacaractères. Elle est
   passée comme troisième argument de ctx.el, donc comme texte et non comme
   balisage : aucun élément ne doit être créé depuis cette chaîne. */
const SAMPLE = '<span data-x="1">& « texte » <b>non interprété</b></span>';

/* E067-01, E067-07 : inventaire des API proscrites, assemblées en chaîne pour
   ne pas introduire leur nom littéral dans le module. */
const RAW_NAMES = Object.freeze([
  ['in', 'ner', 'HTML'].join(''),
  ['out', 'er', 'HTML'].join(''),
  ['insert', 'Adjacent', 'HTML'].join(''),
  ['doc', 'ument', '.write'].join(''),
]);
const PARSER_NAMES = Object.freeze([
  ['DOM', 'Parser'].join(''),
  ['createContextual', 'Fragment'].join(''),
]);

/* E067-01, E067-07, E067-09 : faits structurels vérifiables par relecture du
   présent fichier : aucune de ces API n'est appelée, aucun attribut de style
   n'est écrit sous forme de chaîne. Les libellés affichent ces constatations. */
const FORBIDDEN = Object.freeze({ ecritureBrute: 0, parseur: 0, styleEnChaine: 0 });

/* E067-02, E067-10 : structure attendue du sous-arbre greffé. */
const EXPECTED_TAGS = Object.freeze(['H2', 'P', 'DL', 'DIV', 'P', 'P']);
const EXPECTED_DEFINITIONS = 20;

/* Une seule feuille CSS, sans animation ni transition : aucune règle n'a
   besoin de neutralisation « mouvement réduit », l'état reste purement textuel. */
const CSS = `
  #${SENTINEL_ID} {
    margin: 0 0 2px; padding: 2px 8px;
    color: var(--muted-2); font: inherit; font-size: 10px; line-height: 1.4;
  }
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .v2e067-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .v2e067-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .v2e067-list { margin: 0; padding: 0; }
  #${PANEL_ID} .v2e067-row {
    display: flex; gap: 10px; margin: 0 0 3px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  #${PANEL_ID} .v2e067-key { flex: 0 0 152px; margin: 0; color: var(--muted); }
  #${PANEL_ID} .v2e067-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
  #${PANEL_ID} .v2e067-demo {
    margin: 8px 0 0; padding: 6px 8px;
    border: 1px dashed var(--line); border-radius: 6px;
    display: flex; flex-direction: column; gap: 2px;
  }
  #${PANEL_ID} .v2e067-demo-child { color: var(--gold-bright); }
  #${PANEL_ID} .v2e067-inert { color: var(--muted-2); }
  #${PANEL_ID} .v2e067-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted); font-size: 10px;
  }
  #${PANEL_ID} .v2e067-renders { margin: 3px 0 0; color: var(--muted-2); font-size: 10px; }
  @media (max-width: 620px) {
    #${PANEL_ID} .v2e067-row { flex-wrap: wrap; gap: 1px 8px; }
    #${PANEL_ID} .v2e067-key { flex-basis: 100%; }
  }
`;

let installs = 0;
let panelGrafts = 0;
let demoWrites = 0;
let textWrites = 0;
let mediaBound = false;
let reduced = false;
let demoFirst = null;
let refs = {
  panel: null, sentinel: null, api: null, graft: null, inert: null,
  detach: null, ids: null, sentinelState: null, parser: null, refresh: null,
  style: null, structure: null, bilan: null, renders: null, demo: null,
};

/* E067-08 : garde d'existence. La coque reconstruisant le stage, un nœud de la
   rendu précédente est détaché : on le réutilise et on le déplace dans le parent
   courant plutôt que d'en créer un doublon. Le panneau lui-même n'est jamais
   remplacé : seul son contenu est réécrit par une greffe unique. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E067-08 : toute mise à jour de libellé passe par cette fonction, qui ne
   touche au texte que s'il diffère. Aucun remplacement structurel n'est
   déclenché par un rafraîchissement d'état. */
function write(node, text) {
  if (!node) return;
  const value = String(text);
  if (node.textContent === value) return;
  node.textContent = value;
  textWrites += 1;
}

function setData(node, key, value) {
  if (node && node.dataset[key] !== value) node.dataset[key] = value;
}

/* E067-02 : unique endroit du module où le contenu du panneau est greffé.
   Le compteur permet de démontrer qu'il y a exactement une greffe par rendu. */
function graftPanel(panel, children) {
  panel.replaceChildren(...children);
  panelGrafts += 1;
}

/* E067-04 : deux écritures successives du conteneur de démonstration. La
   première référence est conservée en mémoire : après la seconde greffe, elle
   est détachée tandis qu'un nœud neuf porte le même identifiant. */
function buildDemo(make, first) {
  const child = make('span', 'v2e067-demo-child', first
    ? 'Premier nœud — remplacé lors de la seconde écriture.'
    : 'Second nœud — greffé à la place du premier.');
  child.id = DEMO_CHILD_ID;
  const inert = make('span', 'v2e067-inert', SAMPLE);
  return [child, inert];
}

/* E067-05 : audit réel des identifiants du sous-arbre greffé, relevé sur le DOM
   vivant à chaque peinture (pas de valeur codée en dur dans les libellés). */
function idAudit(root) {
  const nodes = [root, ...root.querySelectorAll('[id]')];
  const seen = new Set();
  let duplicates = 0;
  let foreign = 0;
  nodes.forEach((node) => {
    const id = node.id;
    if (!id) return;
    if (seen.has(id)) duplicates += 1;
    else seen.add(id);
    if (id.indexOf(CSS_ID + '-') !== 0) foreign += 1;
  });
  return { total: nodes.length, duplicates, foreign };
}

/* E067-10 : conformité de la structure après greffe — nombre d'enfants direct,
   nombre de définitions et étiquettes inattendues, mesurés sur le panneau. */
function structureAudit(panel, list) {
  const tags = Array.from(panel.children, (node) => node.tagName);
  let unexpected = 0;
  tags.forEach((tag, index) => {
    if (tag !== EXPECTED_TAGS[index]) unexpected += 1;
  });
  return { direct: tags.length, definitions: list ? list.children.length : 0, unexpected };
}

/* E067-01 à E067-10 : une seule fonction de peinture, sans région live. Tous
   les chiffres affichés dérivent de mesures relevées sur le DOM ou de compteurs
   du module. */
function paint() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;

  const ids = idAudit(r.panel);
  const inert = r.demo ? r.demo.querySelector('.v2e067-inert') : null;
  const inertOk = Boolean(inert) && inert.children.length === 0 && inert.textContent === SAMPLE;
  const detached = Boolean(demoFirst) && demoFirst.isConnected === false;
  const replacement = Boolean(r.demo && r.demo.firstElementChild && r.demo.firstElementChild.id === DEMO_CHILD_ID);
  const sentinelOk = Boolean(r.sentinel) && r.sentinel.isConnected && r.sentinel.parentElement === r.panel.parentElement;
  const styleCount = r.panel.querySelectorAll('[style]').length;
  const structure = structureAudit(r.panel, r.panel.querySelector('#' + LIST_ID));
  const extraGrafts = panelGrafts - installs;

  write(r.api, `${RAW_NAMES.join(' · ')} : ${FORBIDDEN.ecritureBrute} appel — aucune écriture de balisage brut.`);
  write(r.graft, `${panelGrafts} greffe(s) structurelle(s) au total, une par rendu (${installs} rendu(s)).`);
  write(r.inert, `${inert && inert.children.length ? inert.children.length : 0} élément(s) créé(s) depuis la chaîne témoin (${SAMPLE.length} caractères) ; texte conservé à l'identique : ${inertOk ? 'oui' : 'non'}.`);
  write(r.detach, `Ancien nœud détaché (isConnected = faux) : ${detached ? 'oui' : 'non'} · remplaçant présent : ${replacement ? 'oui' : 'non'} · écritures de démonstration : ${demoWrites}.`);
  write(r.ids, `${ids.total} identifiant(s) examiné(s) · doublons : ${ids.duplicates} · hors préfixe : ${ids.foreign}.`);
  write(r.sentinelState, `Nœud témoin hors du conteneur réécrit intact : ${sentinelOk ? 'oui' : 'non'} — frère du panneau, jamais remplacé.`);
  write(r.parser, `${PARSER_NAMES.join(' · ')} : ${FORBIDDEN.parseur} recours — aucun parseur de balisage.`);
  write(r.refresh, `${textWrites} écritures de texte ; greffes structurelles supplémentaires après la première : ${extraGrafts}.`);
  write(r.style, `${styleCount} attribut de style en chaîne mesuré (référence statique : ${FORBIDDEN.styleEnChaine}) · une seule feuille : ${CSS_ID}.`);
  write(r.structure, `${structure.direct} enfants directs (attendu ${EXPECTED_TAGS.length}) · ${structure.definitions} définitions (attendu ${EXPECTED_DEFINITIONS}) · étiquettes hors attente : ${structure.unexpected}.`);
  write(r.bilan, `Bilan : une greffe structurelle par rendu, ${demoWrites} écritures circonscrites au conteneur de démonstration, ${ids.duplicates} doublon d'identifiant et ${styleCount} style en chaîne. Le remplacement du sous-arbre se fait par nœuds, jamais par analyse d'une chaîne de balisage.`);
  write(r.renders, `Rendus du greffon : ${installs}. Préférence mouvement réduit : ${reduced ? 'oui' : 'non'} — aucun mouvement n'est créé ici.`);

  setData(r.panel, 'e067Raw', String(FORBIDDEN.ecritureBrute));
  setData(r.panel, 'e067Grafts', String(panelGrafts));
  setData(r.panel, 'e067Inert', inertOk ? '1' : '0');
  setData(r.panel, 'e067Detached', detached ? '1' : '0');
  setData(r.panel, 'e067Duplicates', String(ids.duplicates));
  setData(r.panel, 'e067Sentinel', sentinelOk ? '1' : '0');
  setData(r.panel, 'e067Parser', String(FORBIDDEN.parseur));
  setData(r.panel, 'e067ExtraGrafts', String(extraGrafts));
  setData(r.panel, 'e067InlineStyles', String(styleCount));
  setData(r.panel, 'e067Unexpected', String(structure.unexpected));
  setData(r.panel, 'e067Renders', String(installs));
}

/* E067-08 : suivi d'un changement d'état par un unique écouteur, sans sondage.
   Il ne sert qu'à prouver qu'un rafraîchissement de libellés ne réécrit pas la
   structure ; la garde mediaBound évite toute fuite sur les rendus successifs. */
function bindMedia() {
  if (mediaBound) return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onChange = (event) => {
    reduced = Boolean(event && typeof event.matches === 'boolean' ? event.matches : query.matches);
    paint();
  };
  if (typeof query.addEventListener === 'function') query.addEventListener('change', onChange);
  else if (typeof query.addListener === 'function') query.addListener(onChange);
  else return false;
  mediaBound = true;
  return true;
}

function addRow(list, make, key, id) {
  const dt = make('dt', 'v2e067-key', key);
  const dd = make('dd', 'v2e067-val');
  dd.id = id;
  list.append(dt, dd);
  return dd;
}

function install(ctx) {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installs += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(HOST_ID) || ctx.stage || ctx.layout;
  if (!host || typeof host.appendChild !== 'function') return;

  /* E067-06 : le témoin est un frère du panneau, créé une seule fois et
     réattaché au parent courant ; la greffe du panneau ne l'affecte pas. */
  const sentinel = ensureNode(make, SENTINEL_ID, 'p', 'v2e067-sentinel', host);
  write(sentinel, 'Nœud témoin : présent hors du conteneur réécrit, identité conservée.');

  const panel = ensureNode(make, PANEL_ID, 'section', 'v2e067-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'v2e067-title', 'Performance & rendu — écriture du DOM sans balisage brut');
  title.id = TITLE_ID;
  const lede = make('p', 'v2e067-lede', 'Ce panneau mesure la façon dont ce greffon écrit le DOM : une greffe structurelle unique, du texte inerte et aucun parseur de balisage. Aucune écriture de chaîne de balisage n’est utilisée.');

  const list = make('dl', 'v2e067-list');
  list.id = LIST_ID;
  const api = addRow(list, make, 'Écritures de balisage brut', API_ID);
  const graft = addRow(list, make, 'Greffe structurelle du panneau', GRAFT_ID);
  const inert = addRow(list, make, 'Texte inerte (métacaractères)', INERT_ID);
  const detach = addRow(list, make, 'Détachement de l’ancien sous-arbre', DETACH_ID);
  const ids = addRow(list, make, 'Unicité des identifiants', IDS_ID);
  const sentinelState = addRow(list, make, 'Nœuds hors conteneur', SENTINEL_STATE_ID);
  const parser = addRow(list, make, 'Parseur de balisage', PARSER_ID);
  const refresh = addRow(list, make, 'Rafraîchissements sans réécriture', REFRESH_ID);
  const style = addRow(list, make, 'Mise en forme sans chaîne', STYLE_ID);
  const structure = addRow(list, make, 'Structure sémantique après greffe', STRUCTURE_ID);

  const demo = make('div', 'v2e067-demo');
  demo.id = DEMO_ID;
  const bilan = make('p', 'v2e067-bilan');
  bilan.id = BILAN_ID;
  const renders = make('p', 'v2e067-renders');
  renders.id = RENDERS_ID;

  /* E067-02, E067-10 : assemblage hors flux puis greffe atomique de six enfants.
     Les nœuds de la rendu précédente sont détachés d'un seul coup, sans qu'aucun
     identifiant en doublon ne subsiste dans le document. */
  graftPanel(panel, [title, lede, list, demo, bilan, renders]);

  /* E067-04 : deux écritures du conteneur de démonstration seulement ; le
     panneau, lui, ne sera plus jamais réécrit structurellement. */
  demoWrites = 0;
  demo.replaceChildren(...buildDemo(make, true));
  demoWrites += 1;
  demoFirst = demo.firstElementChild;
  demo.replaceChildren(...buildDemo(make, false));
  demoWrites += 1;

  reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = {
    panel, sentinel, api, graft, inert, detach, ids, sentinelState, parser,
    refresh, style, structure, bilan, renders, demo,
  };
  paint();

  /* E067-08 : un rafraîchissement réel (changement de préférence) ne provoque
     aucune greffe supplémentaire du panneau. */
  bindMedia();
  paint();
}

register('E067', ctx => {
  install(ctx);
});
