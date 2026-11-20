import { register } from './registry.js';

/* Lentille V2 E073 — H. Responsive & mobile : défilement latéral borné de la frise.
 * Thème canonique : UNIFIED_AUDIT/CHRONOLOGIE/V2/themes.json:81 — « H. Responsive &
 * mobile — défilement latéral borné de la frise ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E073.md — chantiers E073-01 à E073-10.
 * Fichier possédé : src/views/chronology/v2/E073.js uniquement. Aucun fichier
 * partagé n'est modifié (registry.js, index.js, styles.css, src/views/chronology.js),
 * la passe 1 et toute autre lentille restent intactes.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } et les helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion(). Une seule
 * feuille CSS via ctx.css('chronology-v2-e073', …). Tous les IDs DOM sont préfixés
 * chronology-v2-e073- et protégés par une garde d'existence (multi-rendus).
 *
 * Invariants : un seul register('E073', install) ; un seul écouteur « scroll » par
 * conteneur, marqué en dataset ; aucun rAF, aucun minuteur, aucun aléa, aucun appel
 * réseau, aucune journalisation, aucun HTML brut, aucune région live supplémentaire.
 * Le module n'écrit que dans ses propres nœuds et n'invente aucune donnée historique.
 */

const CSS_ID = 'chronology-v2-e073';
const SCROLLER_ID = 'chronology-v2-e073-scroller';
const TOOLS_ID = 'chronology-v2-e073-tools';
const PREV_ID = 'chronology-v2-e073-prev';
const NEXT_ID = 'chronology-v2-e073-next';
const POSITION_ID = 'chronology-v2-e073-position';
const PANEL_ID = 'chronology-v2-e073-panel';
const TITLE_ID = 'chronology-v2-e073-title';
const LEDE_ID = 'chronology-v2-e073-lede';
const STEP_ID = 'chronology-v2-e073-step';
const MOTION_ID = 'chronology-v2-e073-motion';
const ANCHOR_ID = 'chronology-v2-e073-anchor';
const FOCUS_ID = 'chronology-v2-e073-focus';
const RENDERS_ID = 'chronology-v2-e073-renders';
const BILAN_ID = 'chronology-v2-e073-bilan';
const HOST_ID = 'atlas-chrono-main';

/* Sélecteur tolérant : la passe 2 peut renommer la liste d'ères. On se contente
   de lire et d'encadrer le nœud, jamais de renommer ses classes ni ses textes. */
const ERA_LIST_SELECTOR = '.atlas-chrono-era-list, [data-era-list], [class*="era-list"]';

/* E073-01 à E073-09 : feuille unique. Le conteneur est le seul axe horizontal :
   sa largeur est bornée à 100 % du parent, le débordement y est confiné et la
   page ne déborde pas. La liste devient une bande nowrap à largeur de contenu. */
const CSS = `
  #${SCROLLER_ID} {
    box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0;
    overflow-x: auto; overflow-y: hidden;
    overscroll-behavior-inline: contain;
    scroll-behavior: smooth; scroll-snap-type: inline proximity;
    -webkit-overflow-scrolling: touch; scrollbar-width: thin;
    padding: 4px 3px 8px; margin: 0;
    border: 1px solid var(--line); border-radius: 10px;
    background: rgba(255,255,255,.02);
  }
  #${SCROLLER_ID} > ol, #${SCROLLER_ID} > ul {
    display: flex; flex-wrap: nowrap; gap: 6px;
    width: max-content; min-width: 100%;
    margin: 0; padding: 0; list-style: none;
  }
  #${SCROLLER_ID} > ol > li, #${SCROLLER_ID} > ul > li {
    flex: 0 0 auto; min-width: 116px; scroll-snap-align: start;
  }
  #${SCROLLER_ID}:focus-visible,
  #${TOOLS_ID} .v2e073-nav:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  #${SCROLLER_ID}[data-e073-at-end="1"] { border-right-color: var(--gold); }
  #${SCROLLER_ID}[data-e073-at-start="1"] { border-left-color: var(--gold); }
  #${TOOLS_ID} {
    display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
    margin: 0 0 6px;
  }
  #${TOOLS_ID} .v2e073-nav {
    min-width: 44px; min-height: 44px; padding: 0 12px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: var(--surface-2); color: var(--gold-bright);
    font: inherit; font-size: 18px; line-height: 1; cursor: pointer;
  }
  #${TOOLS_ID} .v2e073-nav[aria-disabled="true"] { opacity: .45; cursor: default; }
  #${POSITION_ID} {
    margin: 0; color: var(--muted); font-size: 10px;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} {
    margin: 14px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .v2e073-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .v2e073-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .v2e073-list { margin: 0; padding: 0; }
  #${PANEL_ID} .v2e073-row {
    display: flex; gap: 10px; margin: 0 0 3px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  #${PANEL_ID} .v2e073-key { flex: 0 0 148px; margin: 0; color: var(--muted); }
  #${PANEL_ID} .v2e073-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
  #${PANEL_ID} .v2e073-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }
  @media (max-width: 620px) {
    #${SCROLLER_ID} > ol > li, #${SCROLLER_ID} > ul > li { min-width: 104px; }
    #${PANEL_ID} .v2e073-row { flex-wrap: wrap; gap: 1px 8px; }
    #${PANEL_ID} .v2e073-key { flex-basis: 100%; }
  }
  /* E073-07 : le défilement reste instantané quand le système le demande ;
     aucune animation propre n'est créée par ailleurs. */
  @media (prefers-reduced-motion: reduce) {
    #${SCROLLER_ID} { scroll-behavior: auto; scroll-snap-type: none; }
  }
  /* E073-04 et E073-09 : les bornes et le focus restent lisibles sans couleur. */
  @media (forced-colors: active) {
    #${SCROLLER_ID}, #${PANEL_ID}, #${TOOLS_ID} .v2e073-nav {
      border-color: CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .v2e073-title, #${PANEL_ID} .v2e073-key,
    #${PANEL_ID} .v2e073-val, #${PANEL_ID} .v2e073-bilan,
    #${POSITION_ID} { color: CanvasText; }
  }
`;

let installs = 0;
let state = {
  scroller: null, list: null, tools: null, prev: null, next: null,
  position: null, panel: null, step: 0, reduced: false, bound: false,
  anchored: 'non évalué', bounds: { start: true, end: false, max: 0, x: 0 },
};

/* E073-10 : garde d'existence. La coque reconstruisant le stage, un nœud de la
   rendu précédente est détaché : on le réutilise et on le déplace dans le parent
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

/* E073-06 : le pas est dérivé de la largeur réelle de la première carte, lue
   dans le DOM ; aucune amplitude en pixels n'est codée en dur dans le libellé. */
function measureStep(scroller) {
  const list = scroller.querySelector(ERA_LIST_SELECTOR) || scroller.firstElementChild;
  const first = list && list.firstElementChild;
  if (!first || typeof first.getBoundingClientRect !== 'function') return 0;
  return Math.max(0, Math.round(first.getBoundingClientRect().width));
}

/* E073-04 et E073-05 : bornes et position calculées depuis scrollWidth,
   clientWidth et scrollLeft, jamais depuis une constante. Les boutons reçoivent
   aria-disabled plutôt que disabled afin de rester dans l'ordre de tabulation. */
function updateBounds() {
  const scroller = state.scroller;
  if (!scroller) return;
  const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const x = Math.max(0, Math.min(max, Math.round(scroller.scrollLeft)));
  const start = x <= 1;
  const end = max - x <= 1;
  state.bounds = { start, end, max, x };

  setData(scroller, 'e073Max', String(max));
  setData(scroller, 'e073Offset', String(x));
  setData(scroller, 'e073AtStart', start ? '1' : '0');
  setData(scroller, 'e073AtEnd', end ? '1' : '0');
  if (state.prev) {
    setData(state.prev, 'e073AtBound', start ? '1' : '0');
    state.prev.setAttribute('aria-disabled', start ? 'true' : 'false');
  }
  if (state.next) {
    setData(state.next, 'e073AtBound', end ? '1' : '0');
    state.next.setAttribute('aria-disabled', end ? 'true' : 'false');
  }
  write(state.position, max
    ? `Position du défilement : ${x} / ${max} px · ${Math.round((x / max) * 100)} %.`
    : `Position du défilement : ${x} / ${max} px · frise entièrement visible.`);
}

/* E073-08 : l'ère courante est rendue visible par un ajustement local de
   scrollLeft, sans déplacer la page ni voler le focus. Une seule fois par
   conteneur, marquée en dataset. */
function anchorCurrent() {
  const scroller = state.scroller;
  if (!scroller || scroller.dataset.e073Anchored === '1') return;
  const current = scroller.querySelector('[aria-current="true"], .is-active');
  if (!current || typeof current.getBoundingClientRect !== 'function') {
    state.anchored = 'aucune ère courante';
    return;
  }
  const box = scroller.getBoundingClientRect();
  const target = current.getBoundingClientRect();
  if (target.left < box.left) scroller.scrollLeft -= box.left - target.left + 4;
  else if (target.right > box.right) scroller.scrollLeft += target.right - box.right + 4;
  setData(scroller, 'e073Anchored', '1');
  state.anchored = 'ère courante alignée dans le conteneur';
}

function onScroll() {
  updateBounds();
}

function onPrev() {
  const scroller = state.scroller;
  if (scroller) scroller.scrollLeft = Math.max(0, scroller.scrollLeft - state.step);
}

function onNext() {
  const scroller = state.scroller;
  if (scroller) scroller.scrollLeft = scroller.scrollLeft + state.step;
}

/* E073-10 : un seul écouteur par nœud, gardé par dataset. Sur un rendu suivant,
   le nouveau conteneur reçoit son propre écouteur ; l'ancien est détaché. */
function bindScroll(scroller) {
  if (scroller.dataset.e073Scroll === '1') return;
  scroller.addEventListener('scroll', onScroll, { passive: true });
  setData(scroller, 'e073Scroll', '1');
}

function bindButton(button, handler) {
  if (button.dataset.e073Bound === '1') return;
  button.addEventListener('click', handler);
  setData(button, 'e073Bound', '1');
}

function addRow(list, make, key, id) {
  const row = make('div', 'v2e073-row');
  const dt = make('dt', 'v2e073-key', key);
  const dd = make('dd', 'v2e073-val');
  dd.id = id;
  row.append(dt, dd);
  list.appendChild(row);
  return dd;
}

/* E073-01, E073-02, E073-05, E073-07, E073-08 et E073-09 : état affiché en
   texte visible ordinaire, sans région live et sans écriture redondante. */
function paint() {
  const panel = state.panel;
  if (!panel || !panel.isConnected) return;
  const b = state.bounds;

  write(state.step, `${state.step} px — largeur de la première carte mesurée dans le DOM.`);
  write(state.motion, state.reduced
    ? 'Instantané (auto) : mouvement réduit demandé par le système.'
    : 'Fluide (smooth) : le repli système force « auto » si le mouvement réduit est demandé.');
  write(state.anchor, `Ère courante : ${state.anchored}.`);
  write(state.focus, 'Région défilante : tabindex 0, rôle region et nom accessible ; la position est lisible en texte, sans région live.');
  write(state.renders, String(installs));
  write(state.bilan, `Bornes : ${b.start ? 'début atteint' : 'intérieur'} · ${b.end ? 'fin atteinte' : 'intérieur'} · décalage ${b.x} px sur ${b.max} px. La frise est le seul axe horizontal ; la page ne déborde pas.`);

  setData(panel, 'e073AtStart', b.start ? '1' : '0');
  setData(panel, 'e073AtEnd', b.end ? '1' : '0');
  setData(panel, 'e073Max', String(b.max));
  setData(panel, 'e073Step', String(state.step));
  setData(panel, 'e073Reduced', state.reduced ? '1' : '0');
  setData(panel, 'e073Renders', String(installs));
  setData(panel, 'e073Bound', state.bound ? '1' : '0');
}

const install = (ctx) => {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installs += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(HOST_ID) || ctx.stage || ctx.layout;
  if (!host || typeof host.appendChild !== 'function') return;

  /* E073-01 : le conteneur de défilement encadre la liste d'ères existante. */
  const scroller = ensureNode(make, SCROLLER_ID, 'div', 'v2e073-scroller', host);
  scroller.setAttribute('role', 'region');
  scroller.setAttribute('aria-label', 'Frise chronologique — défilement horizontal borné');
  scroller.tabIndex = 0;

  const list = scroller.querySelector(ERA_LIST_SELECTOR)
    || host.querySelector(ERA_LIST_SELECTOR)
    || scroller.firstElementChild;
  if (list && list.parentElement !== scroller) {
    if (list.parentElement) list.parentElement.insertBefore(scroller, list);
    scroller.appendChild(list);
  }

  /* E073-03 : commandes pas-à-pas placées avant le conteneur, jamais dedans. */
  const tools = ensureNode(make, TOOLS_ID, 'div', 'v2e073-tools', host);
  if (scroller.previousElementSibling !== tools) host.insertBefore(tools, scroller);

  const prev = ensureNode(make, PREV_ID, 'button', 'v2e073-nav', tools);
  prev.type = 'button';
  prev.setAttribute('aria-label', 'Faire défiler la frise vers la gauche');
  write(prev, '‹');

  const next = ensureNode(make, NEXT_ID, 'button', 'v2e073-nav', tools);
  next.type = 'button';
  next.setAttribute('aria-label', 'Faire défiler la frise vers la droite');
  write(next, '›');

  const position = ensureNode(make, POSITION_ID, 'p', 'v2e073-position', tools);

  const panel = ensureNode(make, PANEL_ID, 'section', 'v2e073-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'v2e073-title', 'Défilement latéral borné de la frise');
  title.id = TITLE_ID;
  const lede = make('p', 'v2e073-lede', 'Ce panneau décrit le bornage horizontal de la frise : le conteneur reste dans la colonne, la Position est lisible en texte et les commandes sont désactivées aux extrémités.');
  lede.id = LEDE_ID;

  const dl = make('dl', 'v2e073-list');
  const step = addRow(dl, make, 'Pas de défilement', STEP_ID);
  const motion = addRow(dl, make, 'Comportement de défilement', MOTION_ID);
  const anchor = addRow(dl, make, 'Ancrage de l’ère courante', ANCHOR_ID);
  const focus = addRow(dl, make, 'Accès clavier', FOCUS_ID);
  const renders = addRow(dl, make, 'Rendus du greffon', RENDERS_ID);
  const bilan = make('p', 'v2e073-bilan');
  bilan.id = BILAN_ID;

  /* replaceChildren plutôt que HTML brut : aucun ID en doublon ne subsiste. */
  panel.replaceChildren(title, lede, dl, bilan);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  state = {
    scroller, list, tools, prev, next, position, panel,
    step: measureStep(scroller), reduced, bound: false,
    anchored: 'non évalué', bounds: { start: true, end: false, max: 0, x: 0 },
  };
  setData(scroller, 'e073Reduced', reduced ? '1' : '0');

  bindScroll(scroller);
  bindButton(prev, onPrev);
  bindButton(next, onNext);
  state.bound = scroller.dataset.e073Scroll === '1';

  anchorCurrent();
  updateBounds();
  paint();
};

register('E073', install);
