import { register } from './registry.js';

/* Lentille E041 — navigation clavier entre ères et bandes, ancres uniques.
 * Domaine :orientation clavier et adressage de la vue chronologie.
 *
 * La vue construit déjà des bandes d’ères (`chronology.js:281-305`) et des
 * cartes de repères (`:374-413`) sous forme de boutons, avec un indice de
 * touches en texte (`:231`) et une restauration de focus après clic (`:17`,
 * `:199-205`). E041 complète ce dispositif sans modifier le fichier partagé :
 * tabulation roving dans les deux groupes, ancres déterministes uniques, table
 * des ancres, sauts vers l’état courant, annonces vocales mesurées et gardes
 * d’idempotence. Aucune donnée historique n’est inventée : tous les libellés
 * sont lus dans le DOM rendu. Zéro réseau, zéro aléa, zéro console, aucune
 * boucle requestAnimationFrame propre à la lentille. */

const CSS_ID = 'chronology-e041';
const BAR_ID = 'e041-bar';
const INDEX_ID = 'e041-index';
const HELP_ID = 'e041-help';
const COUNT_ID = 'e041-count';
const JUMP_ERA_ID = 'e041-jump-era';
const JUMP_EVENT_ID = 'e041-jump-event';
const LIVE_ID = 'e041-live';

const CSS = `
  #${BAR_ID}{
    display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;
    margin:0 0 10px;padding:8px 10px;
    border:1px solid var(--line);border-radius:8px;
    background:rgba(255,255,255,.02);
  }
  #${BAR_ID} .e041-help{
    flex:1 1 100%;margin:0;color:var(--muted-2);
    font-size:9px;line-height:1.5;
  }
  #${BAR_ID} .e041-btn{
    min-height:36px;padding:6px 10px;
    border:1px solid var(--line);border-radius:7px;
    background:transparent;color:var(--gold-bright);
    font:inherit;font-size:10px;font-weight:600;cursor:pointer;
    transition:border-color .18s,background-color .18s;
  }
  #${BAR_ID} .e041-btn:hover:not(:disabled){
    border-color:var(--gold);background:rgba(230,185,111,.08);
  }
  #${BAR_ID} .e041-btn:disabled{opacity:.45;cursor:default}
  #${BAR_ID} .e041-btn:focus-visible,
  #${INDEX_ID} .e041-link:focus-visible{
    outline:2px solid var(--gold-bright);outline-offset:2px;
  }
  #${BAR_ID} .e041-count{
    flex:1 1 220px;min-width:0;margin:0;color:var(--muted);
    font-size:9px;line-height:1.4;font-variant-numeric:tabular-nums;
  }
  #${INDEX_ID}{
    flex:1 1 100%;margin:2px 0 0;padding:6px 0 0;
    border-top:1px solid var(--line);
  }
  #${INDEX_ID} .e041-group{margin:0 0 6px}
  #${INDEX_ID} .e041-group-title{
    margin:0 0 3px;color:var(--muted);font-size:9px;
    font-weight:600;letter-spacing:.06em;text-transform:uppercase;
  }
  #${INDEX_ID} .e041-links{
    display:flex;flex-wrap:wrap;gap:4px 8px;margin:0;padding:0;list-style:none;
  }
  #${INDEX_ID} .e041-link{
    display:inline-block;max-width:100%;padding:2px 6px;
    border:1px solid transparent;border-radius:6px;
    color:var(--muted);font-size:9px;text-decoration:none;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  }
  #${INDEX_ID} .e041-link:hover{border-color:var(--line);color:var(--gold-bright)}
  #${INDEX_ID} .e041-link[aria-current="location"]{
    border-color:var(--line-strong);color:var(--gold-bright);
    text-decoration:underline;text-underline-offset:2px;
  }
  .e041-anchor{display:inline-block;width:0;height:0;overflow:hidden;pointer-events:none}
  .e041-live{
    position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
    overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
  }
  [data-e041-reduced="1"] #${BAR_ID} .e041-btn{transition:none}
  @media (prefers-reduced-motion:reduce){
    #${BAR_ID} .e041-btn{transition:none}
  }
  @media (max-width:620px){
    #${BAR_ID}{padding:7px 8px}
    #${BAR_ID} .e041-btn{flex:1 1 auto}
  }
`;

/* Curseurs et dernière cible focalisée : conservés entre deux rendus de la
   coque, qui reconstruit tout le DOM (chronology.js:539, shell.js:137). */
let bandCursor = 0;
let cardCursor = 0;
let focusZone = null; /* 'bands' | 'cards' | null */
let focusId = '';

function bandNodes() {
  const nav = document.getElementById('atlas-chrono-eras');
  if (!nav) return [];
  return Array.prototype.slice.call(nav.querySelectorAll('.era-band'));
}

function cardNodes() {
  const list = document.getElementById('atlas-chrono-events');
  if (!list) return [];
  return Array.prototype.slice.call(list.querySelectorAll('.event-card'));
}

function indexOfCurrent(list) {
  const found = list.findIndex((node) => node.getAttribute('aria-current') === 'true');
  return found >= 0 ? found : 0;
}

function clampCursor(cursor, length, fallback) {
  if (!length) return 0;
  if (!Number.isFinite(cursor)) return fallback;
  return Math.max(0, Math.min(length - 1, cursor));
}

/* E041-03 : une ancre par conteneur de bande/carte, dérivée de son rang.
   La recherche d’un id libre est déterministe (suffixe -2, -3…), sans aléa.
   Le nœud d’origine n’est jamais renommé : les ids de la vue (`era-*`,
   `event-*`, `event-btn-*`, chronology.js:286/378/387) restent intacts. */
function ensureAnchor(node, base, index) {
  if (!node) return '';
  let anchor = node.firstElementChild;
  if (!anchor || !anchor.classList || !anchor.classList.contains('e041-anchor')) {
    anchor = document.createElement('span');
    anchor.className = 'e041-anchor';
    anchor.setAttribute('aria-hidden', 'true');
    node.insertBefore(anchor, node.firstChild);
  }
  const stem = `e041-anchor-${base}-${index}`;
  let candidate = stem;
  let suffix = 2;
  while (true) {
    const taken = document.getElementById(candidate);
    if (!taken || taken === anchor) break;
    candidate = `${stem}-${suffix}`;
    suffix += 1;
  }
  if (anchor.id !== candidate) anchor.id = candidate;
  anchor.setAttribute('data-e041-anchor', candidate);
  return candidate;
}

function anchorIdOf(node) {
  const first = node && node.firstElementChild;
  return first && first.classList && first.classList.contains('e041-anchor')
    ? (first.id || '')
    : '';
}

function syncAnchors(bandList, cardList) {
  bandList.forEach((band, index) => {
    ensureAnchor(band.parentNode, 'era', index);
    band.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown Home End');
  });
  cardList.forEach((card, index) => {
    ensureAnchor(card.parentNode, 'event', index);
    card.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight Home End');
  });
}

/* E041-01 et E041-02 : une seule cible dans l’ordre de tabulation par groupe. */
function setRoving(list, cursor) {
  if (!list.length) return 0;
  const at = Math.max(0, Math.min(list.length - 1, cursor));
  list.forEach((node, index) => {
    node.tabIndex = index === at ? 0 : -1;
    node.setAttribute('data-e041-tab', index === at ? '0' : '-1');
  });
  return at;
}

/* E041-07 : région live unique, posée dans <body> pour survivre au innerHTML
   de la coque, distincte de #nav-c2a-live (chronology.js:119-138). */
function ensureLive() {
  let node = document.getElementById(LIVE_ID);
  if (!node) {
    node = document.createElement('p');
    node.id = LIVE_ID;
    node.className = 'e041-live';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    document.body.appendChild(node);
  }
  return node;
}

function say(message) {
  const live = ensureLive();
  if (live && message) live.textContent = message;
}

function bandLabel(band) {
  const span = band.querySelector('span');
  return span ? span.textContent.trim() : 'Ère';
}

function cardLabel(card) {
  const strong = card.querySelector('strong');
  return strong ? strong.textContent.trim() : 'Repère';
}

function markFocus(node, zone) {
  if (!node) return;
  focusZone = zone;
  focusId = node.id || '';
}

/* E041-06 : après un re-rendu, le focus est rendu au même bouton logique
   uniquement si aucun contrôle de la vue n’a déjà le focus (recherche, E041,
   autre lentille). Le contrôle concurrent garde toujours la priorité. */
function restoreFocus() {
  if (!focusZone || !focusId) return;
  const active = document.activeElement;
  if (active && (active.matches('input, select, textarea') || active.closest('#e041-bar'))) return;
  if (active && (active.closest('#atlas-chrono-eras') || active.closest('#atlas-chrono-events'))) return;
  const target = document.getElementById(focusId);
  if (target && typeof target.focus === 'function') {
    target.focus({ preventScroll: true });
  } else {
    focusZone = null;
    focusId = '';
  }
}

function focusBand(index) {
  const list = bandNodes();
  if (!list.length) return;
  bandCursor = setRoving(list, index);
  const node = list[bandCursor];
  markFocus(node, 'bands');
  node.focus();
  say(`Bande ${bandCursor + 1} sur ${list.length} : ${bandLabel(node)}. Entrée ouvre cette ère.`);
}

function focusCard(index) {
  const list = cardNodes();
  if (!list.length) return;
  cardCursor = setRoving(list, index);
  const node = list[cardCursor];
  markFocus(node, 'cards');
  node.focus();
  say(`Repère ${cardCursor + 1} sur ${list.length} : ${cardLabel(node)}. Entrée ouvre le détail.`);
}

function onBandKeydown(event) {
  const band = event.target.closest('.era-band');
  if (!band) return;
  const key = event.key;
  if (key !== 'ArrowUp' && key !== 'ArrowDown' && key !== 'ArrowLeft'
    && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') return;
  event.preventDefault();
  event.stopPropagation();
  const list = bandNodes();
  const at = list.indexOf(band);
  if (at < 0) return;
  bandCursor = at;
  if (key === 'Home') focusBand(0);
  else if (key === 'End') focusBand(list.length - 1);
  else focusBand(at + (key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 1));
}

function onCardKeydown(event) {
  const card = event.target.closest('.event-card');
  if (!card) return;
  const key = event.key;
  if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') return;
  event.preventDefault();
  event.stopPropagation();
  const list = cardNodes();
  const at = list.indexOf(card);
  if (at < 0) return;
  cardCursor = at;
  if (key === 'Home') focusCard(0);
  else if (key === 'End') focusCard(list.length - 1);
  else focusCard(at + (key === 'ArrowLeft' ? -1 : 1));
}

function onMainKeydown(event) {
  if (event.key !== 'Escape') return;
  const target = event.target;
  const tag = target && target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA'
    || (target && target.isContentEditable)) return;
  const main = document.getElementById('atlas-chrono-main');
  if (!main || !target || !main.contains(target)) return;
  const jump = document.getElementById(JUMP_ERA_ID);
  if (!jump) return;
  event.preventDefault();
  event.stopPropagation();
  jump.focus();
  say('Retour aux commandes de navigation clavier.');
}

function addLinkGroup(ctx, parent, title, list, kind, labelFn) {
  const group = ctx.el('div', 'e041-group');
  group.appendChild(ctx.el('p', 'e041-group-title', title));
  const ul = ctx.el('ul', 'e041-links');
  list.forEach((node, index) => {
    const li = ctx.el('li');
    const link = ctx.el('a', 'e041-link', `${index + 1}. ${labelFn(node)}`);
    const anchor = anchorIdOf(node.parentNode);
    if (anchor) link.href = `#${anchor}`;
    link.setAttribute('data-e041-kind', kind);
    link.setAttribute('data-e041-index', String(index));
    li.appendChild(link);
    ul.appendChild(li);
  });
  group.appendChild(ul);
  parent.appendChild(group);
}

function buildBar(ctx, bandList, cardList) {
  const bar = ctx.el('div', 'e041-bar');
  bar.id = BAR_ID;
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Navigation clavier entre ères et repères');

  const help = ctx.el('p', 'e041-help',
    'Navigation clavier : dans les bandes d’ères, ↑/↓ ou ←/→ parcourent les bandes, Début/Fin vont à la première/dernière, Entrée ouvre l’ère. '
    + 'Dans les repères, ←/→ parcourent les cartes ; Échap ramène aux commandes. Les liens ci-dessous pointent vers des ancres uniques.');
  help.id = HELP_ID;
  bar.appendChild(help);

  const jumpEra = ctx.el('button', 'e041-btn', 'Aller à l’ère courante');
  jumpEra.type = 'button';
  jumpEra.id = JUMP_ERA_ID;
  jumpEra.setAttribute('aria-controls', 'atlas-chrono-eras');
  const jumpEvent = ctx.el('button', 'e041-btn', 'Aller au repère courant');
  jumpEvent.type = 'button';
  jumpEvent.id = JUMP_EVENT_ID;
  jumpEvent.setAttribute('aria-controls', 'atlas-chrono-events');
  bar.append(jumpEra, jumpEvent);

  const count = ctx.el('p', 'e041-count');
  count.id = COUNT_ID;
  bar.appendChild(count);

  const index = ctx.el('nav', 'e041-index');
  index.id = INDEX_ID;
  index.setAttribute('aria-label', 'Ancres uniques — accès clavier aux ères et aux repères');
  addLinkGroup(ctx, index, 'Ères', bandList, 'era', bandLabel);
  addLinkGroup(ctx, index, 'Repères', cardList, 'event', cardLabel);
  bar.appendChild(index);

  return bar;
}

function markCurrentLink(link) {
  const links = Array.prototype.slice.call(document.querySelectorAll(`#${INDEX_ID} .e041-link`));
  links.forEach((node) => node.removeAttribute('aria-current'));
  if (link) link.setAttribute('aria-current', 'location');
}

function wire() {
  const nav = document.getElementById('atlas-chrono-eras');
  if (nav && !nav.dataset.e041Bound) {
    nav.dataset.e041Bound = '1';
    nav.addEventListener('keydown', onBandKeydown);
    nav.addEventListener('focusin', (event) => {
      const band = event.target.closest('.era-band');
      if (!band) return;
      const list = bandNodes();
      bandCursor = Math.max(0, list.indexOf(band));
      markFocus(band, 'bands');
      setRoving(list, bandCursor);
    });
  }

  const list = document.getElementById('atlas-chrono-events');
  if (list && !list.dataset.e041Bound) {
    list.dataset.e041Bound = '1';
    list.addEventListener('keydown', onCardKeydown);
    list.addEventListener('focusin', (event) => {
      const card = event.target.closest('.event-card');
      if (!card) return;
      const cards = cardNodes();
      cardCursor = Math.max(0, cards.indexOf(card));
      markFocus(card, 'cards');
      setRoving(cards, cardCursor);
    });
  }

  const main = document.getElementById('atlas-chrono-main');
  if (main && !main.dataset.e041Bound) {
    main.dataset.e041Bound = '1';
    main.addEventListener('keydown', onMainKeydown);
  }

  const jumpEra = document.getElementById(JUMP_ERA_ID);
  if (jumpEra && !jumpEra.dataset.e041Bound) {
    jumpEra.dataset.e041Bound = '1';
    jumpEra.addEventListener('click', () => focusBand(bandCursor));
  }
  const jumpEvent = document.getElementById(JUMP_EVENT_ID);
  if (jumpEvent && !jumpEvent.dataset.e041Bound) {
    jumpEvent.dataset.e041Bound = '1';
    jumpEvent.addEventListener('click', () => focusCard(cardCursor));
  }

  const index = document.getElementById(INDEX_ID);
  if (index && !index.dataset.e041Bound) {
    index.dataset.e041Bound = '1';
    index.addEventListener('click', (event) => {
      const link = event.target.closest('.e041-link');
      if (!link) return;
      event.preventDefault();
      const kind = link.getAttribute('data-e041-kind');
      const at = Number(link.getAttribute('data-e041-index'));
      if (kind === 'era') focusBand(at);
      else if (kind === 'event') focusCard(at);
      markCurrentLink(link);
    });
    index.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const link = event.target.closest('.e041-link');
      if (!link) return;
      event.preventDefault();
      event.stopPropagation();
      const jump = document.getElementById(JUMP_ERA_ID);
      if (jump) jump.focus();
    });
  }
}

function refreshBar(bandList, cardList) {
  const count = document.getElementById(COUNT_ID);
  if (count) {
    const anchors = Array.prototype.slice.call(document.querySelectorAll('[data-e041-anchor]'));
    const ids = anchors.map((node) => node.id);
    const unique = new Set(ids).size;
    count.textContent = `Bandes d’ères : ${bandList.length} · repères : ${cardList.length}`
      + ` · ancres uniques : ${unique}/${ids.length}.`;
  }
  const jumpEra = document.getElementById(JUMP_ERA_ID);
  if (jumpEra) jumpEra.disabled = bandList.length === 0;
  const jumpEvent = document.getElementById(JUMP_EVENT_ID);
  if (jumpEvent) jumpEvent.disabled = cardList.length === 0;
}

register('E041', (ctx) => {
  if (!ctx || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'chronology') return;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);

  const main = document.getElementById('atlas-chrono-main');
  if (!main || !document.getElementById('atlas-chrono-eras')) return;
  const bandList = bandNodes();
  const cardList = cardNodes();
  if (!bandList.length && !cardList.length) return;

  syncAnchors(bandList, cardList);

  bandCursor = clampCursor(bandCursor, bandList.length, indexOfCurrent(bandList));
  cardCursor = clampCursor(cardCursor, cardList.length, indexOfCurrent(cardList));
  setRoving(bandList, bandCursor);
  setRoving(cardList, cardCursor);

  if (ctx.layout) {
    ctx.layout.setAttribute('data-e041', '1');
    if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
      ctx.layout.setAttribute('data-e041-reduced', '1');
    } else {
      ctx.layout.removeAttribute('data-e041-reduced');
    }
  }

  if (!document.getElementById(BAR_ID)) {
    const status = document.getElementById('atlas-chrono-status');
    const bar = buildBar(ctx, bandList, cardList);
    if (status && status.parentNode === main) status.parentNode.insertBefore(bar, status.nextSibling);
    else main.insertBefore(bar, main.firstChild);
    wire();
  }
  refreshBar(bandList, cardList);
  restoreFocus();
});
