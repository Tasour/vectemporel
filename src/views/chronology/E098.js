import { register } from './registry.js';

/* E098 — détection du viewport, densité et adaptation aux grands écrans.
   Lentille autonome, en lecture seule sur le DOM de la chronologie : elle
   n'importe aucun autre module de la vue, n'écrit aucun fichier partagé et ne
   modifie ni le store ni le rendu de base. Le script injecté par chronology.js
   ne contient qu'une seule requête média (chronology.js:83) et aucune détection
   JavaScript du viewport : la lentille comble ce vide sans toucher à la source.
   Invariants : un seul enregistrement, un seul bloc de styles, des identifiants
   préfixés e098 protégés par des gardes d'existence, aucun appel réseau, aucun
   aléa, aucune journalisation, aucun timer ni boucle d'animation propre. Le
   français est la seule langue utilisée, y compris dans les commentaires. */

const CSS_ID = 'chronology-e098';
const HINT_ID = 'e098-hint';
const BTN_ID = 'e098-density-btn';
const READOUT_ID = 'e098-readout';

/* E098-01 — bloc CSS unique, injecté par ctx.css (qui possède sa propre
   garde par identifiant dans registry.js:13-19). Aucune règle de styles.css
   n'est modifiée : l'adaptation est portée par des sélecteurs à deux classes,
   donc plus spécifiques que ceux de styles.css:194, :205 et de la feuille
   injectée par chronology.js:36-91. */
const CSS = `
.e098-hint { margin:0 0 12px; color:var(--muted-2); font-size:8px; line-height:1.5; }
.e098-btn {
  min-height:36px; padding:6px 12px; border:1px solid var(--line); border-radius:8px;
  background:transparent; color:var(--gold-bright); font:inherit; font-size:10px; cursor:pointer;
}
.e098-btn:hover { border-color:var(--gold); }
.e098-btn:focus-visible { outline:2px solid var(--gold-bright); outline-offset:2px; }
.e098-readout {
  margin:8px 0 12px; padding:6px 10px; border:1px solid var(--line); border-radius:7px;
  background:rgba(255,255,255,.02); color:var(--muted); font-size:9px;
  line-height:1.5; font-variant-numeric:tabular-nums;
}
/* E098-05 — densités pilotées par le bouton, sans toucher à .event-list nue. */
.e098-density-compacte .event-list { grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:7px; }
.e098-density-compacte .event-card { min-height:130px; }
.e098-density-dense .event-list { grid-template-columns:repeat(auto-fill,minmax(118px,1fr)); gap:6px; }
.e098-density-dense .event-card { min-height:112px; }
.e098-density-dense .event-card strong { font-size:14px; }
.e098-density-dense .event-card img { height:60px; }
/* E098-04 — bornes d'affichage alignées sur les ruptures réelles de
   styles.css:316 (1000 px) et :339 (620 px). */
.e098-viewport-compact .atlas-chrono-era-list > li { flex:1 1 45%; }
/* E098-05 — grands écrans : l'aside suit la largeur sans excéder une mesure
   lisible, la liste plafonne son nombre de colonnes et les bandes cessent de
   s'étirer. Aucune valeur n'est portée par la seule couleur. */
@media (min-width:1600px) {
  .e098-viewport-tres-large.chronology-layout,
  .e098-viewport-ultra-large.chronology-layout { grid-template-columns:minmax(0,1fr) clamp(380px,26vw,480px); }
  .e098-viewport-tres-large .chronology-main,
  .e098-viewport-ultra-large .chronology-main { padding:32px 40px 44px; }
  .e098-viewport-tres-large .chronology-aside,
  .e098-viewport-ultra-large .chronology-aside { padding:30px 28px 40px; }
  .e098-viewport-tres-large .event-list,
  .e098-viewport-ultra-large .event-list { grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); max-width:1680px; }
  .e098-viewport-tres-large .atlas-chrono-era-list > li,
  .e098-viewport-ultra-large .atlas-chrono-era-list > li { flex:0 1 170px; }
}
@media (min-width:2200px) {
  .e098-viewport-ultra-large.chronology-layout { grid-template-columns:minmax(0,1fr) clamp(380px,20vw,520px); }
  .e098-viewport-ultra-large .chronology-main { padding:36px 4vw 48px; }
  .e098-viewport-ultra-large .event-list { grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); max-width:1800px; }
}
@media (prefers-reduced-motion:reduce) {
  .e098-btn { transition:none !important; }
}`;

/* Fonctions substituables à chaque rendu par celles de ctx. Les replis
   locaux gardent les écouteurs module-level opérationnels même si un rendu
   ultérieur fournit un contexte incomplet. */
let create = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};
let prefersReduced = () => false;

/* E098-02 — état module-level partagé par les écouteurs uniques : le layout
   courant est remplacé à chaque rendu par la coque (shell.js:137), les
   écouteurs, eux, survivent. densityMode survit explicitement au re-render. */
let currentLayout = null;
let currentList = null;
let currentClass = '';
let densityMode = 'confort';
let listenersInstalled = false;
let mediaList = null;
let motionQuery = null;

const THRESHOLDS = ['(min-width: 620px)', '(min-width: 1000px)', '(min-width: 1600px)', '(min-width: 2200px)'];
const VIEWPORTS = ['compact', 'etroit', 'large', 'tres-large', 'ultra-large'];
const MODES = ['confort', 'compacte', 'dense'];

/* E098-03 — libellés français, jamais une info portée par la seule couleur. */
const VIEWPORT_LABELS = {
  compact: 'compact (moins de 620 px)',
  etroit: 'étroit (620 à 999 px)',
  large: 'large (1 000 à 1 599 px)',
  'tres-large': 'très large (1 600 à 2 199 px)',
  'ultra-large': 'ultra-large (2 200 px et plus)',
};
const MODE_LABELS = {
  confort: 'confort',
  compacte: 'compacte',
  dense: 'dense',
};

function viewportWidth() {
  if (typeof window === 'undefined') return 0;
  const value = window.innerWidth;
  return Number.isFinite(value) ? value : 0;
}

/* E098-02 — quatre requêtes média alignées sur les ruptures réelles ; aucun
   matchMedia n'existe dans chronology.js (chronology.js:83 n'est qu'une règle
   CSS). Repli sur innerWidth si l'API est absente. */
function detectClass() {
  if (mediaList && mediaList.length === THRESHOLDS.length) {
    const m = mediaList.map((query) => Boolean(query.matches));
    if (m[3]) return 'ultra-large';
    if (m[2]) return 'tres-large';
    if (m[1]) return 'large';
    if (m[0]) return 'etroit';
    return 'compact';
  }
  const width = viewportWidth();
  if (width >= 2200) return 'ultra-large';
  if (width >= 1600) return 'tres-large';
  if (width >= 1000) return 'large';
  if (width >= 620) return 'etroit';
  return 'compact';
}

/* E098-06 — mesure de densité tirée du DOM réel, sans donnée inventée :
   nombre de cartes et nombre de pistes calculées par le navigateur sur
   .event-list (styles.css:205). getComputedStyle est borné en garde. */
function measureGrid(list) {
  if (!list) return { cards: 0, columns: 0 };
  const cards = list.querySelectorAll('.event-card').length;
  let columns = 0;
  try {
    const tracks = window.getComputedStyle(list).gridTemplateColumns || '';
    if (tracks && tracks !== 'none') columns = tracks.split(/\s+/).filter(Boolean).length;
  } catch {
    columns = 0;
  }
  if (!Number.isFinite(columns) || columns < 0) columns = 0;
  return { cards, columns };
}

function describe(cls, cards, columns) {
  const count = cards
    ? `${cards} repère(s) affiché(s) sur ${columns || '?'} colonne(s)`
    : 'aucun repère affiché';
  const motion = prefersReduced() ? 'mouvement réduit actif' : 'mouvement réduit non demandé';
  return `Détection du viewport : ${VIEWPORT_LABELS[cls] || cls}. Densité ${MODE_LABELS[densityMode] || densityMode}. ${count}. ${motion}.`;
}

/* E098-09 — garde d'existence : réutilise un nœud déjà présent, le déplace
   dans le parent courant, et ne duplique jamais d'identifiant. */
function ensureNode(parent, id, tag, cls) {
  if (!parent) return null;
  let node = document.getElementById(id);
  if (!node || node.tagName !== tag.toUpperCase()) {
    node = create(tag, cls);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  node.className = cls;
  return node;
}

function placeAfter(anchor, node) {
  if (anchor && node && typeof anchor.after === 'function' && node.previousElementSibling !== anchor) {
    anchor.after(node);
  }
}

/* E098-07 — un seul gestionnaire d'événements, aucune boucle rAF, aucun timer :
   la densité est recalculée uniquement sur transition de rupture ou sur rendu.
   Le bouton est une action (pas une bascule aria-pressed, pas un choix unique
   relevant d'un radiogroupe) : son libellé porte l'état courant et l'action
   suivante. */
function ensureControls(layout, main) {
  const tools = layout.querySelector('#atlas-chrono-tools') || document.getElementById('atlas-chrono-tools');
  const hint = ensureNode(main, HINT_ID, 'p', 'e098-hint');
  if (hint) {
    hint.textContent = 'Affichage adaptatif : la densité des repères suit la largeur de l’écran. Le bouton « Densité » permet de la fixer manuellement.';
    placeAfter(main.querySelector('.atlas-chrono-hint'), hint);
  }

  const button = ensureNode(tools || main, BTN_ID, 'button', 'e098-btn');
  if (button) {
    if (button.dataset.e098Bound !== '1') {
      button.dataset.e098Bound = '1';
      button.type = 'button';
      button.addEventListener('click', onCycle);
    }
    const label = MODE_LABELS[densityMode] || densityMode;
    button.textContent = `Densité : ${label} — cliquer pour changer`;
    button.setAttribute('aria-label', `Densité d’affichage : ${label}. Activer pour passer au mode suivant.`);
  }

  const readout = ensureNode(main, READOUT_ID, 'p', 'e098-readout');
  if (readout) {
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('aria-atomic', 'true');
    if (tools && tools.isConnected) placeAfter(tools, readout);
  }
  return readout;
}

function onCycle() {
  const index = MODES.indexOf(densityMode);
  densityMode = MODES[(index + 1) % MODES.length];
  apply();
}

/* E098-04 / E098-08 — classes miroir sur le layout, attributs auditable et
   readout. reducedMotion() est relu à chaque application. */
function apply() {
  const layout = currentLayout;
  if (!layout || !layout.isConnected) return;
  const cls = currentClass || detectClass();
  currentClass = cls;

  VIEWPORTS.forEach((name) => layout.classList.remove(`e098-viewport-${name}`));
  MODES.forEach((name) => layout.classList.remove(`e098-density-${name}`));
  layout.classList.add(`e098-viewport-${cls}`);
  layout.classList.add(`e098-density-${densityMode}`);

  layout.dataset.e098Viewport = cls;
  layout.dataset.e098Density = densityMode;
  layout.dataset.e098Width = String(viewportWidth());
  layout.dataset.e098Reduced = prefersReduced() ? '1' : '0';

  const list = currentList && currentList.isConnected
    ? currentList
    : layout.querySelector('#atlas-chrono-events');
  currentList = list || null;
  const { cards, columns } = measureGrid(list);
  layout.dataset.e098Cards = String(cards);
  layout.dataset.e098Columns = String(columns);

  const main = layout.querySelector('.chronology-main') || document.getElementById('atlas-chrono-main');
  const readout = ensureControls(layout, main);
  if (readout) readout.textContent = describe(cls, cards, columns);
}

function onViewportChange() {
  currentClass = detectClass();
  apply();
}

/* E098-02 / E098-08 — écouteurs uniques au niveau module. Le même handler
   sert aux quatre ruptures de largeur, au repli resize et à la préférence de
   mouvement réduit : une seule installation, même après dix rendus. */
function ensureHooks() {
  if (listenersInstalled) return;
  listenersInstalled = true;
  if (typeof window === 'undefined') return;

  if (typeof window.matchMedia === 'function') {
    mediaList = THRESHOLDS.map((query) => window.matchMedia(query));
    mediaList.forEach((query) => {
      if (typeof query.addEventListener === 'function') query.addEventListener('change', onViewportChange);
      else if (typeof query.addListener === 'function') query.addListener(onViewportChange);
    });
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (typeof motionQuery.addEventListener === 'function') motionQuery.addEventListener('change', onViewportChange);
    else if (typeof motionQuery.addListener === 'function') motionQuery.addListener(onViewportChange);
  } else if (typeof window.addEventListener === 'function') {
    window.addEventListener('resize', onViewportChange);
  }
}

function install(ctx) {
  if (!ctx) return;
  if (ctx.viewId !== undefined && ctx.viewId !== 'chronology') return;

  create = ctx.el || create;
  prefersReduced = ctx.reducedMotion || prefersReduced;
  ctx.css(CSS_ID, CSS);

  /* E098-10 — replis si le contexte est incomplet ou le layout déconnecté. */
  const layout = (ctx.layout && ctx.layout.isConnected ? ctx.layout : null)
    || document.querySelector('.chronology-layout');
  if (!layout) return;

  currentLayout = layout;
  currentList = layout.querySelector('#atlas-chrono-events') || document.getElementById('atlas-chrono-events');
  if (currentList && !currentList.isConnected) currentList = null;

  ensureHooks();
  currentClass = detectClass();
  apply();
}

register('E098', install);
