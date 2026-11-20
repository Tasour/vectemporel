import { register } from './registry.js';

/* Lentille V2 E035 — raccourcis locaux documentés, sans conflit routeur.
 * Domaine D : navigation & clavier de la vue Chronologie (passe V2).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E035.md — chantiers E035-01 à E035-10.
 * Fichier possédé : src/views/chronology/v2/E035.js uniquement. Lectures seules :
 * src/views/chronology/E049.js et UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md (modèles
 * de qualité de la passe 1). Aucun fichier partagé n'est modifié.
 *
 * Contrat : module ESM, un seul register('E035', …), une seule feuille
 * ctx.css('chronology-v2-e035', …). ctx = { viewId:'chronologyv2', stage, layout }
 * enrichi de css / el / reducedMotion. Le routeur clavier reste l'unique
 * propriétaire des touches : cette lentille n'installe AUCUN gestionnaire
 * 'keydown', ne vole aucun focus, n'ajoute aucune région live, n'écrit dans
 * aucune donnée et n'intercepte aucun raccourci.
 *
 * Invariants :
 * - IDs DOM tous préfixés chronology-v2-e035-, uniques, avec garde d'existence ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML, zéro timer, zéro rAF ;
 * - français partout (commentaires, libellés, texte du guide).
 */

const CSS_ID = 'chronology-v2-e035';
const PANEL_ID = 'chronology-v2-e035-shortcuts';
const TITLE_ID = 'chronology-v2-e035-title';
const LOCAL_ID = 'chronology-v2-e035-local';
const ACTIONS_ID = 'chronology-v2-e035-actions';
const GLOBAL_ID = 'chronology-v2-e035-global';
const CONTRACT_ID = 'chronology-v2-e035-contract';
const BINDINGS_ID = 'chronology-v2-e035-bindings';
const HINT_ID = 'chronology-v2-e035-search-hint';
const ESCAPE_ID = 'chronology-v2-e035-escape';
const METRIC_ID = 'chronology-v2-e035-metric';
const MAIN_ID = 'atlas-chrono-main';
const TOOLS_ID = 'atlas-chrono-tools';
const SEARCH_ID = 'atlas-chrono-search';

/* E035-01, E035-09 : une seule feuille, injectée une fois par ctx.css. Le guide
   est un bloc en flux normal en fin de colonne : jamais une modale, jamais
   superposé, jamais tabulable. Il n'ajoute aucun arrêt Tab et ne masque ni la
   frise ni la fiche. Repli reduced-motion et forced-colors inclus. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e035-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e035-subtitle {
    margin: 8px 0 4px; color: var(--ink-soft);
    font-family: var(--serif); font-size: 11px; font-weight: 600;
  }
  #${PANEL_ID} .e035-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e035-keys { margin: 0 0 8px; padding: 0; list-style: none; }
  #${PANEL_ID} .e035-row { display: flex; gap: 8px; margin: 0 0 4px; }
  #${PANEL_ID} .e035-kbd {
    flex: 0 0 96px; padding: 1px 5px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    color: var(--gold-bright); font: inherit; font-size: 9px;
    text-align: center;
  }
  #${PANEL_ID} .e035-row-label { flex: 1 1 auto; min-width: 0; }
  #${PANEL_ID} .e035-scope {
    display: inline-block; margin: 0 0 6px; padding: 1px 6px;
    border: 1px solid var(--line-strong); border-radius: 999px;
    color: var(--muted); font-size: 9px;
  }
  #${PANEL_ID} .e035-bindings { margin: 0 0 8px; }
  #${PANEL_ID} .e035-bindings dt { color: var(--gold-bright); font-size: 9px; }
  #${PANEL_ID} .e035-bindings dd { margin: 0 0 4px 0; color: var(--muted); }
  #${PANEL_ID} .e035-contract,
  #${PANEL_ID} .e035-escape,
  #${PANEL_ID} .e035-metric { margin: 5px 0 0; }
  #${PANEL_ID} .e035-contract { color: var(--gold-bright); }
  #${PANEL_ID} .e035-escape { color: var(--ink-soft); }
  #${PANEL_ID} .e035-metric { color: var(--muted-2); font-size: 9px; }
  #${HINT_ID} {
    margin: 5px 0 0; color: var(--muted-2);
    font-size: 9px; line-height: 1.4;
  }
  #${HINT_ID}[data-e035-active="1"] { color: var(--gold-bright); }
  @media (max-width: 620px) {
    #${PANEL_ID} .e035-kbd { flex-basis: 76px; }
    #${PANEL_ID} .e035-row { flex-wrap: wrap; gap: 2px 8px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, #${HINT_ID} { transition: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e035-title, #${PANEL_ID} .e035-kbd,
    #${PANEL_ID} .e035-bindings dt, #${PANEL_ID} .e035-contract,
    #${PANEL_ID} .e035-scope, #${HINT_ID}[data-e035-active="1"] { color: CanvasText; }
  }
`;

/* E035-02 à E035-04 : inventaire fidèle au contrat clavier existant du routeur
   (passe 1, keyboard.js:43-51, 129-196). Aucune touche n'est promise qui ne
   soit pas dans le code ; aucune touche n'est ajoutée. */
const LOCAL_ROWS = [
  ['←', 'repère précédent : axe horizontal des repères.'],
  ['→', 'repère suivant : axe horizontal des repères.'],
  ['↑', 'ère précédente : axe vertical des ères.'],
  ['↓', 'ère suivante : axe vertical des ères.'],
];

const ACTION_ROWS = [
  ['Entrée', 'hors contrôle : ouvrir le détail du repère.'],
  ['Espace', 'dans la Chronologie : basculer le détail.'],
  ['Échap', 'fermer une modale, sinon revenir au Monde.'],
];

const GLOBAL_ROWS = [
  ['1–6', 'changer de vue : raccourci global du routeur, non implémenté ici.'],
  ['c m r g s p', 'accès direct aux vues : raccourcis globaux du routeur.'],
  ['?', 'ouvrir ou fermer l’aide générale de la coque.'],
];

/* E035-06 : propriété des équivalents clavier. Le guide DOCUMENTE les porteurs
   d'aria-keyshortcuts existants ; il n'en ajoute aucun sur ses propres nœuds. */
const BINDING_ROWS = [
  ['← → ↑ ↓', 'axe de la frise — aucun aria-keyshortcuts ajouté par E035.'],
  ['Entrée / Espace', 'détail — géré par le routeur, pas par cette lentille.'],
  ['Échap', 'déjà porté par le bouton « Retour au monde » (Escape).'],
];

let renderCount = 0;
let focusBound = false;
let refs = { panel: null, hint: null, search: null, reduced: false };

/* E035-10 : garde d'existence pour toute ID préfixée chronology-v2-e035. Un
   nœud déjà présent est réutilisé et déplacé dans le parent courant : la coque
   reconstruisant #app, un nœud de la rendu précédent est détaché et n'est donc
   pas retrouvé par getElementById. */
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

/* E035-07 : observation lecture seule du focus, sans preventDefault, sans
   stopPropagation et sans focus(). Aucun écouteur de touche n'est installé. */
function refreshSearch() {
  const { hint, search } = refs;
  if (!hint) return;
  const active = Boolean(search && document.activeElement === search);
  setData(hint, 'e035Active', active ? '1' : '0');
}

function onFocusIn() {
  refreshSearch();
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  renderCount += 1;
  ctx.css(CSS_ID, CSS);

  const fallback = ctx.layout.nodeType === 1 ? ctx.layout : document.body;
  const host = document.getElementById(MAIN_ID) || fallback;

  /* E035-01, E035-10 : un seul panneau, non modal, sans tabindex. */
  const panel = ensureNode(make, PANEL_ID, 'section', 'e035-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  setData(panel, 'e035Modal', '0');
  setData(panel, 'e035Keydown', '0');
  setData(panel, 'e035Renders', String(renderCount));

  const title = make('h2', 'e035-title', 'Guide des raccourcis locaux');
  title.id = TITLE_ID;
  const lede = make('p', 'e035-lede', 'Ce guide décrit les touches déjà actives dans la Chronologie. Il n’installe aucun gestionnaire de touche, ne détourne aucun raccourci du routeur et ne déplace jamais le focus.');

  /* E035-02 : axes de navigation locaux (quatre flèches). */
  const localHeading = make('h3', 'e035-subtitle', 'Axes de navigation (locaux)');
  const local = make('ul', 'e035-keys');
  local.id = LOCAL_ID;
  LOCAL_ROWS.forEach(([key, label]) => {
    const row = make('li', 'e035-row');
    row.append(make('kbd', 'e035-kbd', key), make('span', 'e035-row-label', label));
    local.appendChild(row);
  });

  /* E035-03 : actions locales (Entrée, Espace, Échap). */
  const actionsHeading = make('h3', 'e035-subtitle', 'Actions locales');
  const actions = make('ul', 'e035-keys');
  actions.id = ACTIONS_ID;
  ACTION_ROWS.forEach(([key, label]) => {
    const row = make('li', 'e035-row');
    row.append(make('kbd', 'e035-kbd', key), make('span', 'e035-row-label', label));
    actions.appendChild(row);
  });

  /* E035-04 : raccourcis globaux signalés comme externes à la lentille. */
  const global = make('div', 'e035-global');
  global.id = GLOBAL_ID;
  global.appendChild(make('p', 'e035-scope', 'Raccourcis globaux — propriété du routeur, non implémentés ici'));
  const globalList = make('ul', 'e035-keys');
  GLOBAL_ROWS.forEach(([key, label]) => {
    const row = make('li', 'e035-row');
    row.append(make('kbd', 'e035-kbd', key), make('span', 'e035-row-label', label));
    globalList.appendChild(row);
  });
  global.appendChild(globalList);

  /* E035-05 : engagement « zéro keydown », falsifiable par relecture. */
  const contract = make('p', 'e035-contract', 'Contrat : zéro écouteur « keydown » dans E035. Les touches appartiennent au routeur ; le guide se contente de les décrire.');
  contract.id = CONTRACT_ID;

  /* E035-06 : qui porte l'équivalent clavier de chaque contrôle. */
  const bindingsHeading = make('h3', 'e035-subtitle', 'Équivalents clavier — propriété des contrôles');
  const bindings = make('dl', 'e035-bindings');
  bindings.id = BINDINGS_ID;
  BINDING_ROWS.forEach(([key, label]) => {
    bindings.appendChild(make('dt', 'e035-binding-key', key));
    bindings.appendChild(make('dd', 'e035-binding-label', label));
  });

  /* E035-08 : priorité de Échap, sans écouteur local. */
  const escape = make('p', 'e035-escape', 'Priorité Échap : fermer une modale d’abord ; hors modale, revenir au Monde. Le bouton « Retour au monde » conserve son aria-keyshortcuts « Escape ».');
  escape.id = ESCAPE_ID;
  setData(escape, 'e035Escape', 'modal-first');

  /* E035-10 : métrique de rendu, visible et dédupliquée. */
  const metric = make('p', 'e035-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(
    title, lede,
    localHeading, local,
    actionsHeading, actions,
    global, contract,
    bindingsHeading, bindings,
    escape, metric
  );

  /* E035-07 : indice de suspension dans le champ de recherche. */
  const search = document.getElementById(SEARCH_ID);
  const tools = document.getElementById(TOOLS_ID);
  const hintHost = tools || panel;
  const hint = ensureNode(make, HINT_ID, 'p', 'e035-search-hint', hintHost);
  write(hint, 'Dans le champ de recherche, les flèches sont suspendues : le routeur ignore les touches dans un champ éditable.');

  /* E035-09 : préférence de mouvement réduit, publiée en texte et en données. */
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  setData(panel, 'e035Reduced', reduced ? '1' : '0');

  setData(panel, 'e035Axes', String(LOCAL_ROWS.length));
  setData(panel, 'e035Actions', String(ACTION_ROWS.length));
  setData(panel, 'e035Global', String(GLOBAL_ROWS.length));
  setData(panel, 'e035Bindings', String(BINDING_ROWS.length));

  refs = { panel, hint, search, reduced };
  refreshSearch();
  write(metric, `Installations : ${renderCount} · axes : ${LOCAL_ROWS.length} · actions : ${ACTION_ROWS.length} · raccourcis globaux décrits : ${GLOBAL_ROWS.length} · gestionnaires de touche : 0 · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  if (!focusBound) {
    document.addEventListener('focusin', onFocusIn, true);
    focusBound = true;
  }
}

register('E035', (ctx) => {
  install(ctx);
});
