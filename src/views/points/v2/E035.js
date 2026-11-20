import { register } from './registry.js';

/* Lentille V2 E035 — raccourcis locaux documentés, sans conflit routeur.
 * Domaine D : navigation & clavier de la vue Points (passe V2).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E035.md — chantiers E035-01 à E035-10.
 * Fichier possédé : src/views/points/v2/E035.js uniquement. Lectures seules :
 * src/views/points/E035.js et UNIFIED_AUDIT/POINTS/views/E035.md (modèles de la
 * passe 1), src/views/points.js, src/platform/keyboard.js. La passe 1, le
 * routeur clavier, la coque, le CSS global et les registres ne sont ni édités
 * ni doublés.
 *
 * Contrat : module ESM, un seul register('E035', (ctx) => { … }), une seule
 * feuille ctx.css('points-v2-e035', …). ctx = { viewId:'pointsv2', stage, layout }
 * enrichi de css / el / reducedMotion (v2/registry.js:28-37). Le routeur clavier
 * et la passe 1 restent seuls propriétaires des touches : cette lentille
 * n'installe AUCUN gestionnaire 'keydown', ne vole aucun focus, n'ajoute aucune
 * région live, n'écrit dans aucun état et n'intercepte aucun raccourci. Elle
 * n'installe qu'un observateur 'focusin' purement lecture seule (chantier 07).
 *
 * Invariants :
 * - IDs DOM tous préfixés points-v2-e035-, uniques, avec garde d'existence ;
 * - tout sélecteur CSS commence par .points-v2-e035 ;
 * - zéro journalisation, zéro appel réseau, zéro aléa, zéro minuteur, zéro
 *   boucle d'animation, zéro réinterprétation de balisage, zéro boucle de rendu ;
 * - français partout (commentaires, libellés, texte du guide).
 */

const CSS_ID = 'points-v2-e035';
const PANEL_ID = 'points-v2-e035-shortcuts';
const TITLE_ID = 'points-v2-e035-title';
const LOCAL_ID = 'points-v2-e035-local';
const ACTIONS_ID = 'points-v2-e035-actions';
const GLOBAL_ID = 'points-v2-e035-global';
const CONTRACT_ID = 'points-v2-e035-contract';
const BINDINGS_ID = 'points-v2-e035-bindings';
const HINT_ID = 'points-v2-e035-filter-hint';
const ESCAPE_ID = 'points-v2-e035-escape';
const METRIC_ID = 'points-v2-e035-metric';
const FILTER_SELECTOR = '.points-filters select';

/* E035-01, E035-09 : une seule feuille, injectée une fois par ctx.css. Chaque
 * sélecteur commence par .points-v2-e035 : aucun effet hors de cette lentille.
 * Le guide est un bloc en flux normal en fin de .points-layout : jamais une
 * modale, jamais superposé, jamais tabulable. Repli 620 px / mouvement réduit /
 * contraste forcé inclus. */
const CSS = `
  .points-v2-e035 {
    font: inherit; font-size: 10px; line-height: 1.5;
    color: var(--ink-soft, #d8d8d8); overflow-wrap: anywhere;
    font-variant-numeric: tabular-nums;
  }
  .points-v2-e035-panel {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line, #5b5b5b); border-left: 3px solid var(--gold, #e6b96f);
    border-radius: 10px; background: rgba(8,11,16,.55);
  }
  .points-v2-e035-title {
    margin: 0 0 6px; color: var(--gold-bright, #e9c98f);
    font-family: var(--serif, serif); font-size: 14px; font-weight: 600;
  }
  .points-v2-e035-subtitle {
    margin: 8px 0 4px; color: var(--ink-soft, #d8d8d8);
    font-family: var(--serif, serif); font-size: 11px; font-weight: 600;
  }
  .points-v2-e035-lede { margin: 0 0 8px; color: var(--muted, #9a9a9a); }
  .points-v2-e035-keys { margin: 0 0 8px; padding: 0; list-style: none; }
  .points-v2-e035-row { display: flex; gap: 8px; margin: 0 0 4px; }
  .points-v2-e035-kbd {
    flex: 0 0 96px; padding: 1px 5px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 4px;
    color: var(--gold-bright, #e9c98f); font: inherit; font-size: 9px; text-align: center;
  }
  .points-v2-e035-row-label { flex: 1 1 auto; min-width: 0; }
  .points-v2-e035-scope {
    display: inline-block; margin: 0 0 6px; padding: 1px 6px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 999px;
    color: var(--muted, #9a9a9a); font-size: 9px;
  }
  .points-v2-e035-bindings { margin: 0 0 8px; }
  .points-v2-e035-binding-key { color: var(--gold-bright, #e9c98f); font-size: 9px; }
  .points-v2-e035-binding-label { margin: 0 0 4px 0; color: var(--muted, #9a9a9a); }
  .points-v2-e035-contract,
  .points-v2-e035-escape,
  .points-v2-e035-metric { margin: 5px 0 0; }
  .points-v2-e035-contract { color: var(--gold-bright, #e9c98f); }
  .points-v2-e035-escape { color: var(--ink-soft, #d8d8d8); }
  .points-v2-e035-metric { color: var(--muted, #9a9a9a); font-size: 9px; }
  .points-v2-e035-filter-hint {
    margin: 5px 0 0; color: var(--muted, #9a9a9a); font-size: 9px; line-height: 1.4;
  }
  .points-v2-e035-filter-hint[data-v2-e035-active="1"] { color: var(--gold-bright, #e9c98f); }
  @media (max-width: 620px) {
    .points-v2-e035-kbd { flex-basis: 76px; }
    .points-v2-e035-row { flex-wrap: wrap; gap: 2px 8px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e035, .points-v2-e035 * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    .points-v2-e035-panel { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    .points-v2-e035-title, .points-v2-e035-kbd, .points-v2-e035-binding-key,
    .points-v2-e035-contract, .points-v2-e035-scope,
    .points-v2-e035-filter-hint[data-v2-e035-active="1"] { color: CanvasText; }
  }
`;

/* E035-02 à E035-04 : inventaire fidèle au contrat clavier relevé (passe 1,
 * keyboard.js:43-51, 123-196, 211-219). Aucune touche n'est promise qui ne
 * soit pas dans le code ; aucune touche n'est ajoutée. Les axes de la vue
 * Points sont horizont='point' (bouclé) et vertical='era' (borné). */
const LOCAL_ROWS = [
  ['←', 'point précédent : axe horizontal des points, avec bouclage.'],
  ['→', 'point suivant : axe horizontal des points, avec bouclage.'],
  ['↑', 'ère précédente : axe vertical des ères, borne basse.'],
  ['↓', 'ère suivante : axe vertical des ères, borne haute.'],
];

const ACTION_ROWS = [
  ['Entrée', 'hors contrôle : ouvrir ou fermer le détail du point.'],
  ['Espace', 'dans la vue Points : basculer le détail du point.'],
  ['Échap', 'fermer une modale, sinon revenir au Monde.'],
];

const GLOBAL_ROWS = [
  ['1–6', 'changer de vue : raccourci global du routeur, non implémenté ici.'],
  ['6 / p', 'accès direct à la vue Points : raccourci global du routeur.'],
  ['?', 'ouvrir ou fermer l’aide générale de la coque.'],
];

/* E035-06 : propriété des équivalents clavier. Le guide DOCUMENTE les porteurs
 * existants (passe 1 et routeur) ; il n'ajoute aucun équivalent clavier sur ses
 * propres nœuds et ne réimplémente aucune des six touches f/v/b/n/d/0. */
const BINDING_ROWS = [
  ['f v b n d 0', 'raccourcis locaux : portés par la passe 1, non réimplémentés ici.'],
  ['← → ↑ ↓', 'axes de la vue : portés par le routeur, non interceptés ici.'],
  ['Échap', 'porté par le routeur ; l’équivalent tactile reste sur les boutons de la coque.'],
];

let renderCount = 0;
let focusBound = false;
let refs = { hint: null, selects: [] };

/* E035-10 : garde d'existence pour toute ID préfixée points-v2-e035. Un nœud
 * retrouvé dans un parent différent est déplacé dans le parent courant, jamais
 * cloné : la coque reconstruisant le stage, un nœud de la rendu précédente est
 * détaché et n'est donc pas retrouvé par getElementById. */
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

/* E035-07 : observation lecture seule du focus dans les deux filtres, sans
 * déplacement de focus, sans consommation de touche. Les flèches y sont
 * suspendues pour la navigation de scène : le routeur (keyboard.js:59-63,
 * :129) et la passe 1 (isEditable) ignorent tous deux les champs SELECT. */
function refreshFilterHint() {
  const { hint, selects } = refs;
  if (!hint) return;
  const active = selects.some((select) => document.activeElement === select);
  setData(hint, 'v2E035Active', active ? '1' : '0');
}

function onFocusIn() {
  refreshFilterHint();
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  const layout = ctx.layout;
  renderCount += 1;
  ctx.css(CSS_ID, CSS);

  /* E035-01, E035-10 : un seul panneau, non modal, sans tabindex, en flux. */
  const panel = ensureNode(make, PANEL_ID, 'section', 'points-v2-e035 points-v2-e035-panel', layout);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  setData(panel, 'v2E035Modal', '0');
  setData(panel, 'v2E035Keydown', '0');
  setData(panel, 'v2E035Renders', String(renderCount));

  const title = make('h2', 'points-v2-e035-title', 'Guide des raccourcis — vue Points');
  title.id = TITLE_ID;
  const lede = make('p', 'points-v2-e035-lede', 'Ce guide décrit les touches déjà actives dans la vue Points. Il n’installe aucun gestionnaire de touche, ne détourne aucun raccourci du routeur ni de la passe 1 et ne déplace jamais le focus.');

  /* E035-02 : deux axes distincts (horizontal = point, vertical = ère). */
  const localHeading = make('h3', 'points-v2-e035-subtitle', 'Axes de navigation (locaux)');
  const local = make('ul', 'points-v2-e035-keys');
  local.id = LOCAL_ID;
  LOCAL_ROWS.forEach(([key, label]) => {
    const row = make('li', 'points-v2-e035-row');
    row.append(make('kbd', 'points-v2-e035-kbd', key), make('span', 'points-v2-e035-row-label', label));
    local.appendChild(row);
  });

  /* E035-03 : actions locales (Entrée, Espace, Échap). */
  const actionsHeading = make('h3', 'points-v2-e035-subtitle', 'Actions locales');
  const actions = make('ul', 'points-v2-e035-keys');
  actions.id = ACTIONS_ID;
  ACTION_ROWS.forEach(([key, label]) => {
    const row = make('li', 'points-v2-e035-row');
    row.append(make('kbd', 'points-v2-e035-kbd', key), make('span', 'points-v2-e035-row-label', label));
    actions.appendChild(row);
  });

  /* E035-04 : raccourcis globaux signalés comme externes à la lentille. */
  const global = make('div', 'points-v2-e035');
  global.id = GLOBAL_ID;
  global.appendChild(make('p', 'points-v2-e035-scope', 'Raccourcis globaux — propriété du routeur, non implémentés ici'));
  const globalList = make('ul', 'points-v2-e035-keys');
  GLOBAL_ROWS.forEach(([key, label]) => {
    const row = make('li', 'points-v2-e035-row');
    row.append(make('kbd', 'points-v2-e035-kbd', key), make('span', 'points-v2-e035-row-label', label));
    globalList.appendChild(row);
  });
  global.appendChild(globalList);

  /* E035-05 : engagement « zéro keydown », falsifiable par relecture. */
  const contract = make('p', 'points-v2-e035-contract', 'Contrat : zéro écouteur « keydown » dans E035 V2. Le routeur et la passe 1 gardent la main sur toutes les touches ; ce guide se contente de les décrire.');
  contract.id = CONTRACT_ID;

  /* E035-06 : qui porte l'équivalent clavier de chaque contrôle. */
  const bindingsHeading = make('h3', 'points-v2-e035-subtitle', 'Équivalents clavier — propriété des contrôles');
  const bindings = make('dl', 'points-v2-e035-bindings');
  bindings.id = BINDINGS_ID;
  BINDING_ROWS.forEach(([key, label]) => {
    bindings.appendChild(make('dt', 'points-v2-e035-binding-key', key));
    bindings.appendChild(make('dd', 'points-v2-e035-binding-label', label));
  });

  /* E035-08 : priorité de Échap, sans écouteur local. */
  const escape = make('p', 'points-v2-e035-escape', 'Priorité Échap : fermer une modale d’abord ; hors modale, revenir au Monde. Aucun écouteur Échap n’est installé dans cette lentille.');
  escape.id = ESCAPE_ID;
  setData(escape, 'v2E035Escape', 'modal-first');

  /* E035-10 : métrique de rendu, visible et dédupliquée. */
  const metric = make('p', 'points-v2-e035-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(
    title, lede,
    localHeading, local,
    actionsHeading, actions,
    global, contract,
    bindingsHeading, bindings,
    escape, metric
  );

  /* E035-07 : indice de suspension dans le bloc des filtres. */
  const selects = Array.from(layout.querySelectorAll(FILTER_SELECTOR));
  const filters = layout.querySelector('.points-filters');
  const hintHost = filters || panel;
  const hint = ensureNode(make, HINT_ID, 'p', 'points-v2-e035 points-v2-e035-filter-hint', hintHost);
  write(hint, 'Dans les filtres (domaine, famille), les flèches changent l’option native : le routeur et la passe 1 ignorent les champs éditables. Appuyez sur Tab pour quitter le filtre.');

  /* E035-09 : préférence de mouvement réduit, publiée en texte et en données. */
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  setData(panel, 'v2E035Reduced', reduced ? '1' : '0');

  setData(panel, 'v2E035Axes', String(LOCAL_ROWS.length));
  setData(panel, 'v2E035Actions', String(ACTION_ROWS.length));
  setData(panel, 'v2E035Global', String(GLOBAL_ROWS.length));
  setData(panel, 'v2E035Bindings', String(BINDING_ROWS.length));

  refs = { hint, selects };
  refreshFilterHint();
  write(metric, `Installations : ${renderCount} · axes : ${LOCAL_ROWS.length} · actions : ${ACTION_ROWS.length} · raccourcis globaux décrits : ${GLOBAL_ROWS.length} · liaisons documentées : ${BINDING_ROWS.length} · gestionnaires de touche : 0 · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  /* E035-10 : un seul observateur 'focusin', sous garde module ; aucun
   * gestionnaire de touche n'est jamais installé. */
  if (!focusBound) {
    document.addEventListener('focusin', onFocusIn, true);
    focusBound = true;
  }
}

register('E035', (ctx) => {
  install(ctx);
});
