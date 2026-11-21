import { register } from './registry.js';

/* Lentille M25 — Navigation par flèches (domaine C : ergonomie & interaction).
 *
 * M25 est un OBSERVATEUR des flèches, jamais un troisième propriétaire :
 * - globe.js:202-230 détient onHostKeyDown (flèches, Home/End, Entrée) ;
 * - globe.js:233-245 détient onChoicesKeyDown (flèches sur la liste) ;
 * - keyboard.js:169 rend la main sur state.view === 'globe' ;
 * - M05.js:288 gère + / - / PageUp / PageDown sur l'hôte ;
 * - M13.js:186 gère Échap au niveau document.
 * M25 n'installe aucun écouteur de touche : la cible est lue via onHover/onLeave,
 * déjà alimentés par highlight() (globe.js:186-200). Aucune boucle d'animation,
 * aucun timer, aucun observateur d'intersection, aucun réseau, aucun aléa,
 * aucune trace.
 *
 * Dix chantiers : UNIFIED_AUDIT/MONDE/views/M25.md (M25-01 à M25-10).
 */

const CSS_ID = 'monde-m25';
const PANEL_ID = 'monde-m25-nav';
const CURSOR_ID = 'monde-m25-cursor';
const RAIL_ID = 'monde-m25-rail';
const PREV_ID = 'monde-m25-prev';
const NEXT_ID = 'monde-m25-next';

const CHANTIERS = Object.freeze([
  'M25-01', 'M25-02', 'M25-03', 'M25-04', 'M25-05',
  'M25-06', 'M25-07', 'M25-08', 'M25-09', 'M25-10',
]);

const CSS = `
  #${PANEL_ID} {
    position: absolute; left: 16px; bottom: 16px; z-index: 6;
    max-width: min(340px, 52vw); padding: 9px 11px;
    border: 1px solid var(--line); border-radius: 10px;
    background: rgba(8, 11, 16, .94); color: var(--muted);
    font-size: 12px; line-height: 1.4; font-variant-numeric: tabular-nums;
    box-shadow: 0 6px 20px rgba(0, 0, 0, .35);
  }
  #${PANEL_ID} .monde-m25-kicker {
    display: block; margin-bottom: 5px;
    font-size: 9px; letter-spacing: .14em; text-transform: uppercase;
    color: var(--ink-soft);
  }
  #${CURSOR_ID} { margin: 0 0 2px; min-height: 20px; color: var(--ink); }
  #${CURSOR_ID} .monde-m25-ordinal {
    color: var(--gold-bright); font-weight: 700; white-space: nowrap;
  }
  #${CURSOR_ID} .monde-m25-name { font-weight: 600; }
  #${RAIL_ID} { display: flex; flex-wrap: wrap; gap: 4px; margin: 7px 0; }
  #${RAIL_ID} .monde-m25-pip {
    min-width: 24px; min-height: 22px; padding: 2px 4px;
    display: inline-flex; align-items: center; justify-content: center;
    border: 1px solid var(--line); border-radius: 4px;
    text-align: center; color: var(--muted);
    transition: border-color .12s ease, background-color .12s ease, opacity .12s ease;
  }
  #${RAIL_ID} .monde-m25-pip[data-m25-state="past"] { opacity: .55; }
  #${RAIL_ID} .monde-m25-pip[data-m25-state="next"] { opacity: .8; }
  #${RAIL_ID} .monde-m25-pip.is-current {
    border-color: var(--gold); color: var(--gold-bright); opacity: 1;
    background: rgba(230, 185, 111, .16); font-weight: 700;
  }
  .monde-m25-controls { display: flex; gap: 8px; }
  .monde-m25-step {
    flex: 1 1 0; min-width: 44px; min-height: 44px; padding: 0 12px;
    display: inline-flex; align-items: center; justify-content: center;
    border: 1px solid var(--line); border-radius: 8px;
    background: rgba(230, 185, 111, .1); color: var(--ink);
    font: inherit; font-size: 20px; line-height: 1; cursor: pointer;
    touch-action: manipulation; user-select: none; -webkit-tap-highlight-color: transparent;
    transition: border-color .12s ease, background-color .12s ease, transform .06s ease;
  }
  .monde-m25-step:hover { border-color: var(--gold); background: rgba(230, 185, 111, .18); }
  .monde-m25-step:active { transform: translateY(1px); background: rgba(230, 185, 111, .26); }
  .monde-m25-step:focus-visible { outline: 3px solid var(--gold-bright); outline-offset: 2px; }
  @media (max-width: 700px) {
    #${PANEL_ID} { left: 8px; bottom: 8px; max-width: min(280px, calc(100vw - 16px)); font-size: 11px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID} * { transition: none !important; animation: none !important; }
    .monde-m25-step:active { transform: none; }
  }
`;

/* État module unique : les callbacks du registre s'accumulent (registry.js:50),
 * ils lisent donc ce pointeur et non une closure d'un rendu précédent (M13). */
let ctxRef = null;
let countriesRef = [];
let cursor = -1;
let previousIndex = -1;
let direction = 0;      // -1 = arrière, 0 = inconnu, +1 = avant
let steps = 0;          // transitions de curseur OBSERVÉES (pas des frappes)
let wraps = 0;          // rebouclages aux extrémités, focus clavier uniquement
let leaves = 0;
let installs = 0;
let subscribed = false;
let emptyAnnounced = false;
let reduced = false;

function byId(id) {
  const node = document.getElementById(id);
  return node && node.isConnected ? node : null;
}

function countryButtons() {
  const scope = document.getElementById('globe-choices');
  if (!scope || typeof scope.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(scope.querySelectorAll('button[data-index]'));
}

/* M25-05 : le DOM est trié par nom (globe.js:395) mais data-index est l'index
 * du jeu de données. On sélectionne donc par data-index, jamais par position. */
function buttonFor(index) {
  const buttons = countryButtons();
  for (let i = 0; i < buttons.length; i += 1) {
    if (Number(buttons[i].dataset.index) === index) return buttons[i];
  }
  return null;
}

function selectedIndex() {
  const id = ctxRef && ctxRef.state ? ctxRef.state.countryId : null;
  const index = countriesRef.findIndex((country) => country && country.id === id);
  return index >= 0 ? index : 0;
}

/* M25-02 : résolution par identité, puis id, puis code. */
function indexOfPayload(payload) {
  if (!payload) return -1;
  const country = payload.country;
  if (country && typeof country === 'object') {
    let index = countriesRef.indexOf(country);
    if (index >= 0) return index;
    if (country.id) {
      index = countriesRef.findIndex((item) => item && item.id === country.id);
      if (index >= 0) return index;
    }
  }
  const code = payload.code || (country && country.code);
  if (code) {
    const index = countriesRef.findIndex((item) => item && item.code === code);
    if (index >= 0) return index;
  }
  return -1;
}

/* M25-07 : le rebouclage n'est compté que si le focus est dans une surface de
 * navigation clavier ; un survol souris ne doit pas le faire progresser. */
function keyboardSource() {
  const active = document.activeElement;
  if (!active) return false;
  const host = ctxRef && ctxRef.host;
  if (host && (active === host || (typeof host.contains === 'function' && host.contains(active)))) return true;
  return !!(active.closest && active.closest('button[data-index]'));
}

function ensureNodes(ctx) {
  ctx.css(CSS_ID, CSS);

  let panel = byId(PANEL_ID);
  if (!panel) {
    panel = ctx.el('div', 'monde-m25-nav');
    panel.id = PANEL_ID;

    const kicker = ctx.el('span', 'monde-m25-kicker', 'Navigation entre pays');
    panel.appendChild(kicker);

    const label = ctx.el('p', 'monde-m25-cursor');
    label.id = CURSOR_ID;
    label.setAttribute('aria-hidden', 'true'); // M25-03 : say() et M13 vocalisent déjà.
    label.append(ctx.el('span', 'monde-m25-ordinal'), ctx.el('span', 'monde-m25-name'));
    panel.appendChild(label);

    const rail = ctx.el('div', 'monde-m25-rail');
    rail.id = RAIL_ID;
    rail.setAttribute('aria-hidden', 'true'); // M25-04 : repère purement visuel.
    panel.appendChild(rail);

    const group = ctx.el('div', 'monde-m25-controls');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Parcourir les pays');

    const prev = ctx.el('button', 'monde-m25-step', '◀');
    prev.id = PREV_ID;
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Pays précédent, flèche gauche');

    const next = ctx.el('button', 'monde-m25-step', '▶');
    next.id = NEXT_ID;
    next.type = 'button';
    next.setAttribute('aria-label', 'Pays suivant, flèche droite');

    group.append(prev, next);
    panel.appendChild(group);

    const parent = ctx.scene && ctx.scene.isConnected ? ctx.scene : document.body;
    parent.appendChild(panel);
  }

  /* M25-08 : marqueur par nœud — un panneau recréé après re-render reçoit ses
   * deux clics, un panneau conservé ne les reçoit pas deux fois. */
  const prev = byId(PREV_ID);
  const next = byId(NEXT_ID);
  if (prev && !prev.dataset.m25Bound) {
    prev.dataset.m25Bound = '1';
    prev.addEventListener('click', () => step(-1));
  }
  if (next && !next.dataset.m25Bound) {
    next.dataset.m25Bound = '1';
    next.addEventListener('click', () => step(1));
  }
  return panel;
}

function buildRail(total) {
  const rail = byId(RAIL_ID);
  if (!rail || rail.childElementCount === total) return;
  rail.replaceChildren();
  for (let i = 0; i < total; i += 1) {
    const pip = document.createElement('span');
    pip.className = 'monde-m25-pip';
    pip.textContent = String(i + 1).padStart(2, '0');
    pip.dataset.m25Pip = String(i);
    rail.appendChild(pip);
  }
}

/* Deux parties stables dans le readout : ordinal coloré, nom du pays. Les nœuds
 * sont réutilisés à chaque peinture ; ils sont recréés seulement si un rendu
 * antérieur (ou un rechargement à chaud) a laissé un texte brut. */
function readoutNodes(label) {
  let ord = label.querySelector('.monde-m25-ordinal');
  let name = label.querySelector('.monde-m25-name');
  if (!ord || !name) {
    label.replaceChildren();
    ord = document.createElement('span');
    ord.className = 'monde-m25-ordinal';
    name = document.createElement('span');
    name.className = 'monde-m25-name';
    label.append(ord, name);
  }
  return { ord, name };
}

/* M25-03/04/06/07 : un seul point de peinture, dérivé de l'état module. */
function paint() {
  const total = countriesRef.length;
  const host = ctxRef && ctxRef.host;
  if (host && host.isConnected) {
    host.dataset.m25Nav = total === 0 ? 'empty' : (cursor >= 0 ? 'cursor' : 'ready');
    host.dataset.m25Total = String(total);
    host.dataset.m25Index = cursor >= 0 ? String(cursor) : '';
    host.dataset.m25Steps = String(steps);
    host.dataset.m25Wraps = String(wraps);
    host.dataset.m25Leaves = String(leaves);
    host.dataset.m25Last = direction > 0 ? 'next' : (direction < 0 ? 'prev' : '');
  }

  const label = byId(CURSOR_ID);
  if (!label) return;
  buildRail(total);
  const { ord, name } = readoutNodes(label);

  if (!total) {
    ord.textContent = '';
    name.textContent = 'Navigation par flèches indisponible : aucun pays documenté.';
  } else if (cursor < 0) {
    ord.textContent = '';
    name.textContent = `Flèches gauche / droite : ${total} pays disponibles.`;
  } else {
    const country = countriesRef[cursor];
    const ordinal = String(cursor + 1).padStart(2, '0');
    const count = String(total).padStart(2, '0');
    const suffix = reduced ? ' · aperçu statique' : '';
    /* Ordinal et nom séparés : la flèche de direction redondante disparaît,
     * les boutons ◀ ▶ et la pastille courante portent déjà cette information. */
    ord.textContent = `${ordinal}/${count}`;
    name.textContent = ` · ${country ? country.name : '—'}${suffix}`;
  }

  const rail = byId(RAIL_ID);
  if (rail) {
    const pips = rail.children;
    for (let i = 0; i < pips.length; i += 1) {
      const pip = pips[i];
      pip.classList.toggle('is-current', i === cursor);
      pip.dataset.m25State = i === cursor
        ? 'current'
        : (cursor < 0 ? 'idle' : (i < cursor ? 'past' : 'next'));
    }
  }

  /* M25-06 : tabindex roving aligné sur la cible des flèches, sans toucher à
   * aria-current (sélection, globe.js:414) ni aux sélecteurs des tests. */
  const activeIndex = cursor >= 0 ? cursor : selectedIndex();
  countryButtons().forEach((button) => {
    const index = Number(button.dataset.index);
    if (index === cursor) button.setAttribute('data-m25-cursor', 'true');
    else button.removeAttribute('data-m25-cursor');
    button.tabIndex = index === activeIndex ? 0 : -1;
  });
}

function applyCursor(index) {
  if (!Number.isInteger(index) || index < 0 || index >= countriesRef.length) return;
  if (index === cursor) {
    paint();
    return;
  }
  previousIndex = cursor;
  cursor = index;
  steps += 1;
  if (previousIndex >= 0) {
    direction = index > previousIndex ? 1 : -1;
    const total = countriesRef.length;
    if (total > 1 && Math.abs(index - previousIndex) === total - 1 && keyboardSource()) wraps += 1;
  } else {
    direction = 0;
  }
  paint();
}

/* M25-05 : on déplace le CURSEUR, jamais la sélection. Le focus sur le bouton
 * pays déclenche highlight() (globe.js:419), donc onHover et say() existants. */
function step(delta) {
  const total = countriesRef.length;
  if (!total) return;
  const from = cursor >= 0 ? cursor : selectedIndex();
  const target = delta > 0 ? (from + 1) % total : (from - 1 + total) % total;
  const button = buttonFor(target);
  if (button) {
    button.focus({ preventScroll: true });
    return;
  }
  /* Repli : liste absente, globe.js n'a rien annoncé — on parle alors ici. */
  applyCursor(target);
  const country = countriesRef[target];
  if (country && ctxRef && typeof ctxRef.say === 'function') {
    ctxRef.say(`Navigation : ${country.name}, pays ${target + 1} sur ${total}.`);
  }
}

/* M25-01/08 : un seul abonnement aux callbacks du registre. */
function subscribeOnce(ctx) {
  if (subscribed || typeof ctx.onHover !== 'function') return;
  subscribed = true;
  ctx.onHover((payload) => {
    applyCursor(indexOfPayload(payload));
  });
  if (typeof ctx.onLeave === 'function') {
    ctx.onLeave(() => {
      /* Le curseur survit à la sortie de survol : il mémorise la dernière cible
       * des flèches. Seul le compteur de sorties progresse (M25-07). */
      leaves += 1;
      paint();
    });
  }
}

/* M25-10 : surface de diagnostic en lecture seule, aucun mutateur exposé. */
function exposeDiagnostic() {
  window.VECTEMPOREL_M25 = {
    cursor: () => ({
      index: cursor,
      total: countriesRef.length,
      code: cursor >= 0 && countriesRef[cursor] ? countriesRef[cursor].code || null : null,
    }),
    diag: () => ({
      installs,
      steps,
      wraps,
      leaves,
      subscribed,
      reduced,
      nodes: byId(PANEL_ID) ? 1 : 0,
    }),
    chantiers: () => CHANTIERS.slice(),
  };
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  installs += 1;
  ctxRef = ctx;
  countriesRef = Array.isArray(ctx.countries) ? ctx.countries : [];
  try { reduced = !!(ctx.reducedMotion && ctx.reducedMotion()); }
  catch { reduced = false; }

  ensureNodes(ctx);
  subscribeOnce(ctx);
  paint();

  if (!countriesRef.length && !emptyAnnounced) {
    emptyAnnounced = true;
    if (typeof ctx.say === 'function') {
      ctx.say('Navigation par flèches indisponible : aucun pays documenté.');
    }
  }
  exposeDiagnostic();
}

register('M25', install);
