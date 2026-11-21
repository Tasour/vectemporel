import { register } from './registry.js';

/* Lentille V2 E036 — navigation entre repères par j / k, décrite et rendue
 * découvrable (domaine D : navigation & clavier de la vue Chronologie).
 *
 * Thème : UNIFIED_AUDIT/CHRONOLOGIE/V2/themes.json, clé « E036 ».
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E036.md — chantiers
 * E036-01 à E036-10. Fichier possédé : src/views/chronology/v2/E036.js
 * uniquement. Modèles lus : src/views/chronology/E049.js et
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md. Aucun fichier partagé n'est
 * modifié : ni registry.js, ni index.js, ni styles.css, ni
 * src/views/chronology.js, ni la passe 1, ni une autre lentille V2.
 *
 * Constat de départ : le routeur (keyboard.js:27-32, 160-166) ne mappe ni
 * « j » ni « k » ; son axe horizontal des repères est ← / → (keyboard.js:43-51,
 * 171-177) et l'indice 8 px de la vue (chronology.js:231) ne cite que les
 * flèches. Les lettres j et k sont donc libres, comme l'étaient « / », « t »,
 * « [ » et « ] » pour E020. Cette lentille ajoute une navigation locale j / k
 * ET la décrit dans un aide-mémoire visible : j = repère suivant, k = repère
 * précédent. Elle n'appelle pas le store : elle clique les boutons natifs
 * « Repère suivant → » / « ← Repère précédent » (chronology.js:508-526), qui
 * restent la source de vérité de la sélection et de la restauration du focus.
 *
 * Contrat exploité : module ESM, un seul import de register, un seul
 * register('E036', ctx => { … }), ctx = { viewId:'chronologyv2', stage, layout }
 * enrichi de ctx.css(id, règles), ctx.el(balise, classe, texte),
 * ctx.reducedMotion(). Une seule feuille CSS via ctx.css('chronology-v2-e036', …).
 *
 * Invariants :
 * - tous les IDs DOM sont préfixés chronology-v2-e036-, uniques, avec garde
 *   d'existence (idempotence multi-rendus) ;
 * - un seul écouteur keydown, en phase bouillante, posé après celui du routeur
 *   en capture : aucun preventDefault sur une touche réservée, aucun vol de
 *   focus, aucune région live ajoutée (E041 reste maître des annonces) ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML (replaceChildren), zéro timer, zéro animation, zéro réseau ;
 * - français partout (commentaires, libellés, rapport).
 */

const CSS_ID = 'chronology-v2-e036';
const PANEL_ID = 'chronology-v2-e036-panel';
const TITLE_ID = 'chronology-v2-e036-title';
const LEGEND_ID = 'chronology-v2-e036-legend';
const CONTRACT_ID = 'chronology-v2-e036-contract';
const POSITION_ID = 'chronology-v2-e036-position';
const BOUND_ID = 'chronology-v2-e036-bound';
const ACTION_ID = 'chronology-v2-e036-action';
const DEFER_ID = 'chronology-v2-e036-defer';
const METRIC_ID = 'chronology-v2-e036-metric';
const HINT_ID = 'chronology-v2-e036-search-hint';
const MAIN_ID = 'atlas-chrono-main';
const TOOLS_ID = 'atlas-chrono-tools';
const SEARCH_ID = 'atlas-chrono-search';
const STATUS_ID = 'atlas-chrono-status';
const ASIDE_ID = 'atlas-chrono-aside';

/* E036-01, E036-06, E036-07, E036-09 : une seule feuille injectée une fois par
   ctx.css. L'aide-mémoire est un bloc en flux normal en fin de colonne : jamais
   une modale, jamais superposé, jamais tabulable. Il n'ajoute aucun arrêt Tab
   et ne masque ni la frise ni la fiche. Aucune transition n'est créée. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e036-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e036-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e036-legend { margin: 0 0 8px; padding: 0; list-style: none; }
  #${PANEL_ID} .e036-row { display: flex; gap: 8px; margin: 0 0 4px; }
  #${PANEL_ID} .e036-key {
    flex: 0 0 84px; padding: 1px 5px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    color: var(--gold-bright); font: inherit; font-size: 9px; text-align: center;
  }
  #${PANEL_ID} .e036-label { flex: 1 1 auto; min-width: 0; }
  /* E036-05 : la position est en gras et précédée d'un libellé explicite,
     jamais portée par la seule couleur. */
  #${PANEL_ID} .e036-position { color: var(--gold-bright); font-weight: 600; }
  #${PANEL_ID} .e036-bound,
  #${PANEL_ID} .e036-action { margin: 5px 0 0; color: var(--ink-soft); }
  #${PANEL_ID} .e036-defer,
  #${PANEL_ID} .e036-contract,
  #${PANEL_ID} .e036-metric { margin: 5px 0 0; color: var(--muted-2); font-size: 9px; }
  #${PANEL_ID} .e036-contract { color: var(--muted); }
  #${PANEL_ID}[data-e036-last="j"] { border-left-color: var(--gold-bright); }
  #${PANEL_ID}[data-e036-last="k"] { border-left-color: var(--line-strong); }
  #${HINT_ID} {
    flex: 1 1 100%; margin: 0; color: var(--muted-2);
    font-size: 9px; line-height: 1.4;
  }
  #${HINT_ID}[data-e036-active="1"] { color: var(--gold-bright); }
  /* E036-09 : repli 390×844 — la légende se répartit sans débordement. */
  @media (max-width: 620px) {
    #${PANEL_ID} .e036-key { flex-basis: 68px; }
    #${PANEL_ID} .e036-row { flex-wrap: wrap; gap: 2px 8px; }
  }
  /* E036-09 : aucune animation propre, même si la coque en ajoute. */
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, #${HINT_ID} {
      transition: none !important; animation: none !important;
    }
  }
  /* E036-09 : couleurs forcées — la lisière et le gras restent les vecteurs
     redondants de l'état de navigation. */
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e036-title, #${PANEL_ID} .e036-key,
    #${PANEL_ID} .e036-position, #${HINT_ID}[data-e036-active="1"] { color: CanvasText; }
  }
`;

/* E036-01 : légende fidèle au contrat observé. Les flèches sont citées comme
   équivalent du routeur (E035 les documente) sans être réimplémentées ici. */
const LEGEND = [
  ['j', 'repère suivant : même action que le bouton « Repère suivant → » de la fiche.'],
  ['k', 'repère précédent : même action que le bouton « ← Repère précédent » de la fiche.'],
  ['← / →', 'équivalent du routeur sur l’axe horizontal des repères, décrit par E035.'],
  ['Tab', 'parcourir les contrôles ; j et k se taisent dans un champ de texte.'],
];

/* E036-02 : touches déjà prises par le routeur (keyboard.js:127 pour les
 * modificateurs, :134-166 pour ?/Échap/1-6/c-m-r-g-s-p, :171-196 pour les
 * flèches et Entrée/Espace). « j » et « k » n'en font pas partie : le conflit
 * attendu est de zéro et il est publié en données observables. */
const RESERVED = new Set([
  '?', 'Escape', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  '1', '2', '3', '4', '5', '6', 'c', 'm', 'r', 'g', 's', 'p',
]);
const LOCAL_KEYS = ['j', 'k'];
const DIALOG_SELECTOR = '[aria-modal="true"], [role="dialog"], dialog[open]';

let renderCount = 0;
let keyBound = false;
let jCount = 0;
let kCount = 0;
let deferCount = 0;
let boundaryHits = 0;
let refs = {
  panel: null, position: null, bound: null, action: null, defer: null,
  metric: null, hint: null, search: null, stage: null, reduced: false,
  last: 'aucune navigation pour l’instant',
  lastDefer: 'aucune touche cédée pour l’instant',
  lastBound: 'borne non atteinte',
};

/* E036-10 : garde d'existence pour toute ID préfixée chronology-v2-e036.
   Un nœud déjà présent est réutilisé et déplacé dans le parent courant : la
   coque reconstruisant le stage, un nœud du rendu précédent est détaché et
   n'est donc pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E036-10 : une seule fonction d'écriture, dédupliquée, pour ne pas provoquer
   de mutations redondantes à chaque rafraîchissement. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setData(node, key, value) {
  if (!node) return;
  const name = `data-e036-${key}`;
  const next = String(value);
  if (node.getAttribute(name) !== next) node.setAttribute(name, next);
}

/* E036-06 : les deux boutons natifs restent les porteurs de l'action. On ne
   pose aria-keyshortcuts que s'ils n'en ont déjà aucun, comme E020 le fait
   pour les puces de filtre : aucune propriété existante n'est écrasée. */
function navButtons() {
  const aside = document.getElementById(ASIDE_ID);
  const buttons = aside ? Array.from(aside.querySelectorAll('.aside-actions button')) : [];
  let prev = null;
  let next = null;
  buttons.forEach((button) => {
    const label = (button.textContent || '').trim();
    if (/précédent/i.test(label)) prev = button;
    if (/suivant/i.test(label)) next = button;
  });
  return { prev, next };
}

function annotate(button, key, portee) {
  if (!button) return false;
  if (!button.hasAttribute('aria-keyshortcuts')) button.setAttribute('aria-keyshortcuts', key);
  setData(button, 'scope', portee);
  return button.getAttribute('aria-keyshortcuts') === key;
}

/* E036-05 : toute position affichée est dérivée du texte réel du statut de la
   vue (chronology.js:248-256), jamais codée en dur dans la lentille. */
function readPosition() {
  const status = document.getElementById(STATUS_ID);
  const texte = status ? (status.textContent || '').replace(/\s+/g, ' ').trim() : '';
  const motif = texte.match(/Repère\s+(\d+)\s*\/\s*(\d+)\s*dans l['’]?ère\s*·\s*rang global\s+(\d+)\s*\/\s*(\d+)/i);
  if (motif) {
    return `Repère ${motif[1]}/${motif[2]} dans l’ère · rang global ${motif[3]}/${motif[4]} (lu dans #${STATUS_ID}).`;
  }
  return texte
    ? `Position lue dans #${STATUS_ID} : ${texte.slice(0, 140)}`
    : 'Position indisponible : le statut de la vue est absent du document.';
}

/* E036-01 à E036-10 : tout l'état observable est recalculé depuis le DOM réel,
   en texte visible et en attributs data-, jamais dans une région live. */
function refresh() {
  const { panel, position, bound, action, defer, metric, reduced, hint, search } = refs;
  if (!panel || !panel.isConnected) return;

  const { prev, next } = navButtons();
  const annotes = (annotate(prev, 'k', 'repere-precedent') ? 1 : 0)
    + (annotate(next, 'j', 'repere-suivant') ? 1 : 0);
  const conflits = LOCAL_KEYS.filter((key) => RESERVED.has(key)).length;

  const active = Boolean(search && document.activeElement === search);
  if (hint) {
    write(hint, 'Navigation des repères : « j » suivant · « k » précédent. Les touches se taisent dans le champ de recherche, comme les flèches du routeur.');
    if (hint.dataset.e036Active !== (active ? '1' : '0')) hint.dataset.e036Active = active ? '1' : '0';
  }

  write(position, readPosition());
  write(bound, `Bornes : ${refs.lastBound}. Boutons désactivés : précédent ${prev && prev.disabled ? 'oui' : 'non'} · suivant ${next && next.disabled ? 'oui' : 'non'}.`);
  write(action, `Dernière navigation : ${refs.last}. Touches « j » : ${jCount} · « k » : ${kCount} · bornes atteintes : ${boundaryHits}.`);
  write(defer, `Touches cédées : ${deferCount} · dernier motif : ${refs.lastDefer}.`);
  write(metric, `Rendus : ${renderCount} · conflits avec le routeur : ${conflits} · boutons annotés : ${annotes}/2 · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  setData(panel, 'renders', renderCount);
  setData(panel, 'conflicts', conflits);
  setData(panel, 'annotated', annotes);
  setData(panel, 'j', jCount);
  setData(panel, 'k', kCount);
  setData(panel, 'defers', deferCount);
  setData(panel, 'boundaries', boundaryHits);
  setData(panel, 'last', refs.last.startsWith('repère suivant') ? 'j'
    : refs.last.startsWith('repère précédent') ? 'k' : 'aucun');
  setData(panel, 'reduced', reduced ? '1' : '0');
  setData(panel, 'view', ctxView());
}

function ctxView() {
  return refs.viewId || 'chronologyv2';
}

function defer(label) {
  deferCount += 1;
  refs.lastDefer = label;
  if (refs.panel && refs.panel.isConnected) refresh();
}

/* E036-03, E036-04, E036-07, E036-08 : unique écouteur, en phase bouillante :
   le routeur (capture, keyboard.js:199) a toujours le premier mot. Le clic sur
   le bouton natif laisse ses propres gestionnaires (chronology.js:516-526)
   changer la sélection et poser focusIntent. Aucun preventDefault sauf sur nos
   deux touches, aucun focus(), aucune écriture live. */
function onKeyDown(event) {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (key !== 'j' && key !== 'k') return;

  const target = event.target;
  if (target instanceof HTMLElement
      && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) {
    defer('champ éditable : le routeur et E036 se taisent');
    return;
  }
  if (document.querySelector(DIALOG_SELECTOR)) {
    defer('modale ouverte : gel du stage, navigation suspendue');
    return;
  }
  const stage = refs.stage;
  if (!stage || !stage.isConnected) return;
  const focused = document.activeElement;
  if (focused && focused !== document.body && !stage.contains(focused)) {
    defer('focus hors de la vue : aucune navigation locale');
    return;
  }

  const { prev, next } = navButtons();
  const button = key === 'j' ? next : prev;
  if (!button) return;
  if (button.disabled) {
    boundaryHits += 1;
    refs.lastBound = key === 'j'
      ? 'fin de frise : « j » sans effet, bouton suivant désactivé'
      : 'début de frise : « k » sans effet, bouton précédent désactivé';
    refs.last = refs.lastBound;
    refresh();
    return;
  }

  event.preventDefault();
  button.click();
  if (key === 'j') jCount += 1;
  else kCount += 1;
  refs.lastBound = 'borne non atteinte';
  refs.last = key === 'j' ? 'repère suivant ( j )' : 'repère précédent ( k )';
  refresh();
}

/* E036-07 : l'indice du champ de recherche suit le focus réel, sans déplacement
   ni écouteur de touche supplémentaire. */
function onFocusIn() {
  const { hint, search } = refs;
  if (!hint) return;
  const active = Boolean(search && document.activeElement === search);
  if (hint.dataset.e036Active !== (active ? '1' : '0')) hint.dataset.e036Active = active ? '1' : '0';
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;
  if (ctx.viewId && ctx.viewId !== 'chronologyv2') return;

  renderCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e036-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e036-title', 'Navigation des repères : j / k');
  title.id = TITLE_ID;

  const lede = make('p', 'e036-lede', 'Aide-mémoire : « j » avance d’un repère, « k » revient d’un repère. Les deux touches activent les boutons natifs de la fiche ; le routeur clavier garde la priorité sur toutes ses touches.');

  const legend = make('ul', 'e036-legend');
  legend.id = LEGEND_ID;
  LEGEND.forEach(([key, label]) => {
    const row = make('li', 'e036-row');
    row.append(make('kbd', 'e036-key', key), make('span', 'e036-label', label));
    legend.appendChild(row);
  });

  const contract = make('p', 'e036-contract', 'Contrat : « j » et « k » ne figurent dans aucune map du routeur. Aucune touche réservée n’est réimplémentée, aucun raccourci global n’est détourné ; dans un champ de texte, les deux touches se taisent.');
  contract.id = CONTRACT_ID;

  const position = make('p', 'e036-position');
  position.id = POSITION_ID;
  const bound = make('p', 'e036-bound');
  bound.id = BOUND_ID;
  const action = make('p', 'e036-action');
  action.id = ACTION_ID;
  const defer = make('p', 'e036-defer');
  defer.id = DEFER_ID;
  const metric = make('p', 'e036-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(title, lede, legend, contract, position, bound, action, defer, metric);

  const search = document.getElementById(SEARCH_ID);
  const tools = document.getElementById(TOOLS_ID);
  let hint = null;
  if (search && tools) hint = ensureNode(make, HINT_ID, 'p', 'e036-hint', tools);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = {
    panel, position, bound, action, defer, metric, hint, search,
    stage: ctx.stage || null, reduced, viewId: ctx.viewId || 'chronologyv2',
    last: 'aucune navigation pour l’instant',
    lastDefer: 'aucune touche cédée pour l’instant',
    lastBound: 'borne non atteinte',
  };
  refresh();

  if (!keyBound) {
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('focusin', onFocusIn, true);
    keyBound = true;
  }
}

register('E036', (ctx) => {
  install(ctx);
});
