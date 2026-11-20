import { register } from './registry.js';

/* Lentille E049 — Raccourcis clavier, gestion du focus et pièges de tabulation
 * (domaine C : ergonomie et accessibilité de la vue Chronologie).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md — chantiers E049-01 à E049-10.
 * Fichier possédé : src/views/chronology/E049.js uniquement. Lectures seules :
 * src/views/chronology.js, src/views/chronology/registry.js,
 * src/views/chronology/index.js, src/platform/keyboard.js, src/ui/shell.js,
 * styles.css. Aucun fichier partagé n'est modifié.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Le registre
 * de cette vue ne fournit pas say() : la lentille n'ajoute AUCUNE région live,
 * elle n'écrit dans aucune des régions existantes et se contente d'afficher son
 * état en texte visible, dédupliqué, hors aria-live.
 *
 * Invariants :
 * - un seul register('E049', install), un seul ctx.css('chronology-e049', …) ;
 * - un seul écouteur documentaire (focusin), enregistré sous une garde unique ;
 * - aucun gestionnaire de touche : '?' , Échap, Entrée, Espace et les flèches
 *   restent au routeur (keyboard.js) ; aucun vol de focus, aucun piège de Tab ;
 * - aucun timer, aucune boucle d'animation, aucun aléa, aucun réseau, aucune
 *   journalisation, aucun HTML brut.
 */

const CSS_ID = 'chronology-e049';
const PANEL_ID = 'e049-keyboard-panel';
const TITLE_ID = 'e049-keyboard-title';
const KEYS_ID = 'e049-keys';
const FOCUS_ID = 'e049-focus';
const TABS_ID = 'e049-tabs';
const METRIC_ID = 'e049-metric';
const HINT_ID = 'e049-search-hint';
const MAIN_ID = 'atlas-chrono-main';
const ASIDE_ID = 'atlas-chrono-aside';
const TOOLS_ID = 'atlas-chrono-tools';
const SEARCH_ID = 'atlas-chrono-search';

/* E049-01, E049-06, E049-07, E049-08, E049-09 : une seule feuille, injectée
   une fois par ctx.css. Le panneau est un bloc en flux normal en fin de colonne
   (jamais une modale, jamais superposé, jamais tabindex=-1) : il n'ajoute aucun
   arrêt Tab et ne masque ni la frise ni la fiche. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e049-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e049-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e049-keys { margin: 0 0 8px; padding: 0; list-style: none; }
  #${PANEL_ID} .e049-key { display: flex; gap: 8px; margin: 0 0 4px; }
  #${PANEL_ID} .e049-kbd {
    flex: 0 0 88px; padding: 1px 5px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    color: var(--gold-bright); font: inherit; font-size: 9px;
    text-align: center;
  }
  #${PANEL_ID} .e049-key-label { flex: 1 1 auto; min-width: 0; }
  #${PANEL_ID} .e049-note,
  #${PANEL_ID} .e049-focus,
  #${PANEL_ID} .e049-tabs,
  #${PANEL_ID} .e049-metric { margin: 5px 0 0; }
  #${PANEL_ID} .e049-note { color: var(--muted); }
  #${PANEL_ID} .e049-focus { color: var(--gold-bright); }
  #${PANEL_ID} .e049-tabs,
  #${PANEL_ID} .e049-metric { color: var(--muted-2); font-size: 9px; }
  #${HINT_ID} {
    flex: 1 1 100%; margin: 0; color: var(--muted-2);
    font-size: 9px; line-height: 1.4;
  }
  #${HINT_ID}[data-e049-active="1"] { color: var(--gold-bright); }
  @media (max-width: 620px) {
    #${PANEL_ID} .e049-kbd { flex-basis: 76px; }
    #${PANEL_ID} .e049-key { flex-wrap: wrap; gap: 2px 8px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, #${HINT_ID} { transition: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e049-title, #${PANEL_ID} .e049-kbd,
    #${PANEL_ID} .e049-focus { color: CanvasText; }
  }
`;

/* E049-01 à E049-08 : libellés fidèles au routeur (keyboard.js:43-51,
   59-63, 129-196). Aucune touche n'est promise qui ne soit pas dans le code. */
const KEY_ROWS = [
  ['← / →', 'repère précédent / suivant : axe horizontal de la Chronologie.'],
  ['↑ / ↓', 'ère précédente / suivante : axe vertical de la Chronologie.'],
  ['Tab', 'parcourir les contrôles ; sortir du champ de recherche.'],
  ['Entrée', 'ouvrir le détail hors contrôle ; sur une carte, activation native.'],
  ['Espace', 'ouvrir le détail dans la Chronologie.'],
  ['Échap', 'fermer une modale, sinon revenir au Monde.'],
  ['?', 'ouvrir ou fermer l’aide générale de la coque.'],
  ['1–6 · c m r g s p', 'changer de vue : raccourcis globaux du routeur.'],
];

let installCount = 0;
let focusSamples = 0;
let focusBound = false;
let refs = { panel: null, focus: null, tabs: null, metric: null, hint: null, search: null, reduced: false };

/* E049-10 : garde d'existence pour toute ID préfixée e049. Un nœud déjà
   présent est réutilisé et déplacé dans le parent courant ; la coque
   reconstruisant #app (shell.js:533), un nœud de la rendu précédent est
   détaché et n'est donc pas retrouvé par getElementById. */
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

function describeFocus(target) {
  if (!(target instanceof Element)) return 'Focus courant : aucun contrôle actif.';
  const name = target.id ? `#${target.id}` : target.tagName.toLowerCase();
  const label = target.getAttribute('aria-label') || (target.textContent || '').trim().slice(0, 42);
  return `Focus courant : ${name}${label ? ` — « ${label} »` : ''}.`;
}

/* E049-02 et E049-04 : mesure en lecture seule de l'ordre de tabulation réel.
   Le panneau et son indice n'ont aucun tabindex : ils n'ajoutent aucun arrêt. */
function refresh() {
  const { panel, focus, tabs, metric, hint, search, reduced } = refs;
  if (!panel || !panel.isConnected) return;

  write(focus, describeFocus(document.activeElement));

  if (hint && search) {
    write(hint, 'Recherche : les flèches sont suspendues tant que le champ a le focus. Tab pour en sortir, puis ← → pour changer de repère.');
    const active = document.activeElement === search ? '1' : '0';
    if (hint.dataset.e049Active !== active) hint.dataset.e049Active = active;
  }

  const roots = [document.getElementById(MAIN_ID), document.getElementById(ASIDE_ID)].filter(Boolean);
  let stops = 0;
  let bands = 0;
  let cards = 0;
  let untyped = 0;
  roots.forEach((root) => {
    const candidates = root.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    stops += candidates.length;
    candidates.forEach((node) => {
      if (node.classList.contains('era-band')) bands += 1;
      if (node.classList.contains('event-card')) cards += 1;
      if (node.tagName === 'BUTTON' && !node.getAttribute('type')) untyped += 1;
    });
  });
  write(tabs, `Arrêts Tab dans la vue : ${stops} (bandes d’ère : ${bands} · cartes : ${cards}). Boutons sans attribut type : ${untyped}.`);
  panel.dataset.e049TabStops = String(stops);
  panel.dataset.e049Untyped = String(untyped);
  panel.dataset.e049Reduced = reduced ? '1' : '0';
  write(metric, `Installations : ${installCount} · changements de focus observés : ${focusSamples} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);
}

/* E049-03 et E049-05 : un seul écouteur, purement observationnel. Il ne fait
   ni preventDefault, ni stopPropagation, ni focus(), ni écriture live. */
function onFocusIn(event) {
  focusSamples += 1;
  if (refs.panel && refs.panel.isConnected) {
    refs.panel.dataset.e049Focus = event.target instanceof Element
      ? (event.target.id || event.target.tagName.toLowerCase())
      : 'inconnu';
  }
  refresh();
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e049-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e049-title', 'Clavier, focus et tabulation');
  title.id = TITLE_ID;

  const lede = make('p', 'e049-lede', 'Panneau de lecture : il décrit le contrat clavier existant. Il n’ajoute aucun raccourci, ne détourne aucune touche et ne déplace jamais le focus.');

  const keys = make('ul', 'e049-keys');
  keys.id = KEYS_ID;
  KEY_ROWS.forEach(([key, description]) => {
    const row = make('li', 'e049-key');
    row.append(make('kbd', 'e049-kbd', key), make('span', 'e049-key-label', description));
    keys.appendChild(row);
  });

  const searchNote = make('p', 'e049-note', 'Le routeur ignore les touches dès qu’un champ de formulaire a le focus : c’est pourquoi les flèches se taisent dans la recherche.');
  const focus = make('p', 'e049-focus');
  focus.id = FOCUS_ID;
  const tabs = make('p', 'e049-tabs');
  tabs.id = TABS_ID;
  const metric = make('p', 'e049-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(title, lede, keys, searchNote, focus, tabs, metric);

  const search = document.getElementById(SEARCH_ID);
  const tools = document.getElementById(TOOLS_ID);
  let hint = null;
  if (search && tools) {
    hint = ensureNode(make, HINT_ID, 'p', 'e049-search-hint', tools);
  }

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { panel, focus, tabs, metric, hint, search, reduced };
  refresh();

  if (!focusBound) {
    document.addEventListener('focusin', onFocusIn, true);
    focusBound = true;
  }
}

register('E049', install);
