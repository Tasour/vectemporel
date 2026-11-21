import { register } from './registry.js';

/* Lentille E034 — Navigation clavier de la vue Récit.
 *
 * Les dix chantiers (E034-01 … E034-10) sont décrits dans
 * UNIFIED_AUDIT/RECIT/views/E034.md. Tout est local : aucun appel réseau,
 * aucune graine aléatoire, aucun appel à la console, aucune modification des
 * fichiers partagés (registry.js, index.js, recit.js, styles.css, README…).
 *
 * La coque reconstruisant le DOM de la vue à chaque changement d'état
 * (shell.js : `root.innerHTML = ''`), les greffons ne conservent AUCUNE
 * référence de nœud : les handlers délégués, installés une seule fois,
 * re-résolvent le layout courant à chaque événement. Les nœuds injectés dans
 * le layout sont donc recréés à chaque rendu ; la région live, elle, vit dans
 * <body> et survit aux reconstructions.
 */

const CSS_ID = 'recit-e034';
const LIVE_ID = 'e034-focus-live';
const SKIP_ID = 'e034-skip';
const BAR_ID = 'e034-keys';
const BACK_ID = 'e034-back-to-text';
const POS_ID = 'e034-tab-pos';
const ENDS_ID = 'e034-ends';
const FIRST_ID = 'e034-end-first';
const LAST_ID = 'e034-end-last';

/* Paires de la barre d'aide : touches → action réelle dans la vue. */
const RACCOURCIS = [
  ['← →', 'point précédent / suivant'],
  ['↑ ↓', 'parcourir le fil du repère'],
  ['Début / Fin', 'premier / dernier point du fil'],
  ['Entrée', 'ouvrir le détail du repère'],
  ['Espace', 'lancer ou arrêter la lecture'],
  ['/', 'atteindre la recherche du fil'],
  [']', 'repère suivant'],
  ['?', 'ouvrir l’aide clavier'],
  ['Échap', 'revenir au monde'],
];

/* Feuille unique, injectée via ctx.css (garde d'id dans le registre).
   Toutes les classes créées sont préfixées `recit-e034-`. */
const CSS = `
.recit-e034-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.recit-e034-host .recit-e034-skip{position:absolute;left:-9999px;top:6px;z-index:60;
  padding:8px 12px;border:1px solid var(--gold,#e6b96f);border-radius:8px;
  background:var(--surface-2,#2b2f35);color:var(--gold-bright,#f4d69e);font-size:11px;text-decoration:none}
.recit-e034-host .recit-e034-skip:focus{left:8px;top:8px}
.recit-e034-host .recit-e034-bar{margin:10px 0 6px;padding:9px 11px;
  border:1px solid var(--line,rgba(255,255,255,.1));border-radius:9px;
  background:rgba(255,255,255,.025)}
.recit-e034-host .recit-e034-bar-title{margin:0 0 6px;color:var(--muted,#a9a49a);
  font-size:9px;letter-spacing:.1em;text-transform:uppercase}
.recit-e034-host .recit-e034-list{display:grid;grid-template-columns:max-content 1fr;
  gap:2px 10px;margin:0;font-size:10px;line-height:1.45}
.recit-e034-host .recit-e034-list dt{color:var(--gold-bright,#f4d69e);
  font-variant-numeric:tabular-nums;white-space:nowrap}
.recit-e034-host .recit-e034-list dd{margin:0;color:var(--muted,#a9a49a)}
.recit-e034-host .recit-e034-back{margin:0 0 8px;min-height:30px;padding:3px 9px;
  border:1px solid var(--line,rgba(255,255,255,.1));border-radius:7px;
  background:transparent;color:var(--ink-soft,#d7d1c6);font-size:10px;cursor:pointer}
.recit-e034-host .recit-e034-pos{margin-left:8px;color:var(--muted-2,#8c8d91);
  font-size:9px;font-variant-numeric:tabular-nums;white-space:nowrap}
.recit-e034-host .recit-e034-ends{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
.recit-e034-host .recit-e034-ends button{min-height:32px;padding:4px 10px;
  border:1px solid var(--line,rgba(255,255,255,.1));border-radius:7px;
  background:transparent;color:var(--muted,#a9a49a);font-size:10px;cursor:pointer}
.recit-e034-host .recit-e034-ends button[disabled]{opacity:.35;cursor:not-allowed}
.recit-e034-host :is(button,a,input,summary,[tabindex]):focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;border-radius:6px}
@media (prefers-reduced-motion:reduce){
  .recit-e034-host *{scroll-behavior:auto!important;transition:none!important}
}
.recit-e034-host[data-e034-reduced="1"] *{scroll-behavior:auto!important;transition:none!important}
@media (max-width:620px){
  .recit-e034-host .recit-e034-bar{padding:8px}
  .recit-e034-host .recit-e034-list{font-size:9px}
  .recit-e034-host .recit-e034-ends button{min-height:36px}
}
`;

/* État module : un seul pointeur, aucune référence de nœud de rendu. */
const S = {
  stage: null,
  listenersInstalled: false,
  lastFocusMessage: '',
  reduced: false,
};

function byId(id) {
  return document.getElementById(id);
}

function getHost() {
  const stage = S.stage;
  if (!stage || typeof stage.querySelector !== 'function') return null;
  const host = stage.querySelector('.recit-layout.recit-e034-host');
  return host || null;
}

function isEditable(node) {
  return !!(node && (node.isContentEditable
    || ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(node.tagName) >= 0));
}

/* E034-02, E034-05, E034-06 : un nœud du layout courant, créé s'il manque
   ou récupéré s'il appartient déjà au layout (idempotence d'un même rendu). */
function ensureNode(host, id, tag, className, parent) {
  if (!host || !parent) return null;
  let node = byId(id);
  if (node && !host.contains(node)) {
    try { if (node.parentNode) node.parentNode.removeChild(node); } catch { /* ignoré */ }
    node = null;
  }
  if (!node) {
    node = document.createElement(tag);
    node.id = id;
    if (className) node.className = className;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E034-03 : région live persistante dans <body>, hors du layout recyclé. */
function ensureLive() {
  let node = byId(LIVE_ID);
  if (node && node.isConnected) return node;
  node = document.createElement('p');
  node.id = LIVE_ID;
  node.className = 'recit-e034-sr';
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('aria-atomic', 'true');
  document.body.appendChild(node);
  return node;
}

function announceFocus(message) {
  if (!message || message === S.lastFocusMessage) return;
  S.lastFocusMessage = message;
  const node = ensureLive();
  if (node) node.textContent = message;
}

function labelOf(node) {
  if (!node) return '';
  const aria = (node.getAttribute('aria-label') || '').trim();
  if (aria) return aria;
  const title = (node.getAttribute('title') || '').trim();
  if (title) return title;
  return (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function roleOf(node) {
  const tag = node && node.tagName ? node.tagName : '';
  if (tag === 'BUTTON') return 'bouton';
  if (tag === 'A') return 'lien';
  if (tag === 'INPUT') return node.type === 'search' ? 'champ de recherche' : 'champ';
  if (tag === 'SUMMARY') return 'interrupteur de détails';
  return 'élément';
}

/* E034-04 : ensemble des éléments réellement atteignables par Tab, relu à
   chaque focus pour rester juste après une reconstruction du DOM. */
function focusablesOf(host) {
  if (!host || typeof host.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(host.querySelectorAll(
    'a[href],button:not([disabled]),input:not([disabled]),summary,[tabindex]:not([tabindex="-1"])'
  ));
}

function onFocusIn(event) {
  const host = getHost();
  const target = event && event.target;
  if (!host || !target || typeof target.closest !== 'function') return;
  if (!host.contains(target)) return;

  const list = focusablesOf(host);
  const index = list.indexOf(target);
  const label = labelOf(target);
  const role = roleOf(target);

  const chip = byId(POS_ID);
  if (chip && chip.isConnected) {
    chip.textContent = index >= 0 ? `Tab ${index + 1} / ${list.length}` : '';
  }
  const message = index >= 0
    ? `Focus : « ${label} », ${role}, ${index + 1} sur ${list.length}.`
    : `Focus : « ${label} », ${role}.`;
  announceFocus(message);
}

function focusTitle() {
  const title = byId('recit-point-title');
  if (!title) return;
  try { title.focus({ preventScroll: true }); } catch { title.focus(); }
}

function focusThreadCurrent(host) {
  if (!host) return;
  const current = host.querySelector('.c3a-thread-item[aria-current="step"]');
  const items = host.querySelectorAll('.c3a-thread-item:not([disabled])');
  const target = current || items[0];
  if (!target) return;
  try { target.focus({ preventScroll: true }); } catch { target.focus(); }
}

/* E034-06 : sauter à une extrémité du fil en activant le bouton existant,
   afin de laisser le store et la restauration de focus faire leur travail. */
function jumpExtremity(host, which) {
  if (!host || typeof host.querySelectorAll !== 'function') return;
  const items = Array.prototype.slice.call(host.querySelectorAll('.c3a-thread-item:not([disabled])'));
  if (!items.length) return;
  const target = which === 'first' ? items[0] : items[items.length - 1];
  if (typeof target.click === 'function') target.click();
}

function onKeyDown(event) {
  if (!event || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if (!target || typeof target.closest !== 'function') return;
  const host = getHost();
  if (!host || !host.contains(target) || isEditable(target)) return;

  const key = event.key;
  if (key === 'Home' || key === 'End') {
    /* Déjà pris en charge par le garde-fou de recit.js à l'intérieur du fil. */
    if (target.closest('#c3a-thread')) return;
    event.preventDefault();
    event.stopPropagation();
    jumpExtremity(host, key === 'Home' ? 'first' : 'last');
    return;
  }
  if (key === '/') {
    const search = host.querySelector('#c3a-search');
    if (!search) return;
    event.preventDefault();
    event.stopPropagation();
    try { search.focus(); } catch { /* ignoré */ }
    return;
  }
  if (key === ']') {
    const buttons = Array.prototype.slice.call(host.querySelectorAll('.recit-actions button'));
    const next = buttons.find((button) => !button.disabled
      && (button.textContent || '').indexOf('Repère suivant') >= 0);
    if (!next) return;
    event.preventDefault();
    event.stopPropagation();
    next.click();
  }
}

function onClick(event) {
  const target = event && event.target;
  if (!target || typeof target.closest !== 'function') return;
  const host = getHost();
  if (!host || !host.contains(target)) return;

  if (target.closest('#' + SKIP_ID)) {
    if (event.preventDefault) event.preventDefault();
    focusThreadCurrent(host);
    return;
  }
  if (target.closest('#' + BACK_ID)) { focusTitle(); return; }
  if (target.closest('#' + FIRST_ID)) { jumpExtremity(host, 'first'); return; }
  if (target.closest('#' + LAST_ID)) { jumpExtremity(host, 'last'); }
}

function installListeners() {
  if (S.listenersInstalled) return;
  S.listenersInstalled = true;
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onClick);
}

/* E034-01 / 02 / 04 / 05 / 06 / 09 : mobilier de navigation injecté dans le
   layout. Les nœuds sont recréés à chaque rendu, jamais référencés en module. */
function buildFurniture(host, el) {
  const body = host.querySelector('.recit-body') || host;
  const title = byId('recit-point-title');

  const skip = ensureNode(host, SKIP_ID, 'a', 'recit-e034-skip', body);
  if (skip) {
    skip.setAttribute('href', '#c3a-thread');
    skip.textContent = 'Aller au fil du récit';
    if (body.firstChild !== skip) body.insertBefore(skip, body.firstChild);
  }

  const bar = ensureNode(host, BAR_ID, 'aside', 'recit-e034-bar', body);
  if (bar) {
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Raccourcis clavier du récit');
    bar.tabIndex = 0;

    const heading = el('p', 'recit-e034-bar-title', 'Raccourcis clavier du récit');
    const back = el('button', 'recit-e034-back', '↑ Revenir au texte');
    back.id = BACK_ID;
    back.type = 'button';
    const position = el('span', 'recit-e034-pos', '');
    position.id = POS_ID;
    position.setAttribute('aria-hidden', 'true');
    const list = el('dl', 'recit-e034-list');
    RACCOURCIS.forEach(([key, action]) => {
      list.appendChild(el('dt', '', key));
      list.appendChild(el('dd', '', action));
    });
    bar.replaceChildren(heading, back, position, list);

    if (title && title.parentElement === body) {
      if (title.nextSibling !== bar) body.insertBefore(bar, title.nextSibling);
    } else {
      body.insertBefore(bar, skip ? skip.nextSibling : body.firstChild);
    }
  }

  const ends = ensureNode(host, ENDS_ID, 'div', 'recit-e034-ends', body);
  if (ends) {
    ends.setAttribute('role', 'group');
    ends.setAttribute('aria-label', 'Extrémités du fil du repère');
    const first = el('button', '', '⇤ Premier point');
    first.id = FIRST_ID;
    first.type = 'button';
    first.setAttribute('aria-keyshortcuts', 'Home');
    const last = el('button', '', 'Dernier point ⇥');
    last.id = LAST_ID;
    last.type = 'button';
    last.setAttribute('aria-keyshortcuts', 'End');
    ends.replaceChildren(first, last);
    if (bar && bar.parentElement === body) {
      if (bar.nextSibling !== ends) body.insertBefore(ends, bar.nextSibling);
    } else {
      body.appendChild(ends);
    }
  }
}

function syncEnds(host) {
  if (!host) return;
  const items = host.querySelectorAll('.c3a-thread-item:not([disabled])');
  const empty = !items || !items.length;
  const first = byId(FIRST_ID);
  const last = byId(LAST_ID);
  if (first) first.disabled = empty;
  if (last) last.disabled = empty;
}

register('E034', (ctx) => {
  try {
    const { stage, layout, css, el: makeEl, reducedMotion } = ctx || {};
    if (!layout || typeof document === 'undefined' || typeof css !== 'function') return;
    S.stage = stage || layout.parentNode || document.body;

    css(CSS_ID, CSS);
    layout.classList.add('recit-e034-host');

    try { S.reduced = !!(reducedMotion && reducedMotion()); } catch { S.reduced = false; }
    layout.dataset.e034Reduced = S.reduced ? '1' : '0';

    const make = (tag, className, text) => {
      if (typeof makeEl === 'function') return makeEl(tag, className, text);
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    ensureLive();
    buildFurniture(layout, make);
    syncEnds(layout);
    installListeners();
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu du récit. */
  }
});
