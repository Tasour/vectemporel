import { register } from './registry.js';

/* Lentille E06 — états et annonces (vue Chronologie).
 *
 * La vue reconstruit tout son DOM à chaque changement de store : les états
 * (ère courante, repère courant, filtre, bornes, états vides) sont recalculés
 * dans `chronology.js`, et les annonces passent par la région live C2
 * `#nav-c2a-live`. Cette lentille n'impose pas une seconde source de vérité :
 * elle lit l'état **déjà rendu**, compare deux rendus successifs, répare les
 * `aria-current` désynchronisés et émet au plus une annonce par changement.
 *
 * Aucun MutationObserver, aucun écouteur dupliqué, aucune écriture dans le
 * store, aucun réseau, aucun aléa, aucun `console.*`.
 */

const CSS_ID = 'chronology-e06';
const PANEL_ID = 'e06-state-panel';
const TRACE_ID = 'e06-announce-trace';
const LIVE_ID = 'nav-c2a-live';
const FALLBACK_LIVE_ID = 'e06-live-fallback';
const TRACE_LIMIT = 8;

const FIELDS = [
  ['Pays', 'country'],
  ['Ère', 'era'],
  ['Repère', 'event'],
  ['Rang global', 'rank'],
  ['Filtre', 'filter'],
  ['Repères affichés', 'shown'],
  ['Borne', 'bound'],
  ['État vide', 'empty'],
  ['Annonces', 'count'],
];

const EMPTY_MESSAGES = {
  filter: 'Aucun repère ne correspond au filtre.',
  era: 'Aucun repère documenté pour cette ère.',
  points: 'Aucun point documenté pour ce repère.',
  event: 'Aucun repère sélectionné. Choisissez un repère dans la liste pour afficher ses points.',
};

const CSS = `
.e06-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.e06-panel{margin:14px 0;padding:10px 12px;border:1px dashed rgba(230,185,111,.45);
  border-radius:8px;background:rgba(255,255,255,.02);color:var(--muted);
  font-size:10px;line-height:1.55}
.e06-title{margin:0 0 8px;color:var(--gold);font-family:var(--serif);
  font-size:12px;font-weight:450}
.e06-dl{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 10px;margin:0}
.e06-dl dt{color:var(--muted-2)}
.e06-dl dd{margin:0;color:var(--ink-soft);font-variant-numeric:tabular-nums;
  overflow-wrap:anywhere}
.e06-trace-title{margin:10px 0 4px;color:var(--ink-soft);font-family:var(--serif);
  font-size:11px;font-weight:450}
.e06-trace{margin:0;padding-left:18px;color:var(--muted-2);font-size:9px}
@media (max-width:620px){.e06-dl{grid-template-columns:1fr}.e06-dl dd{margin-bottom:4px}}
@media (prefers-reduced-motion:reduce){.e06-panel *{transition:none!important}}`;

/* État de module : `apply` est rejoué à chaque rendu, ces pointeurs sont la
 * seule mémoire de la lentille (aucun écouteur n'est réattaché). */
let previous = null;
let lastMessage = '';
let sequence = 0;
let fields = null;
let traceNode = null;

function byId(id) {
  return document.getElementById(id);
}

function textOf(node) {
  return node ? String(node.textContent || '').trim() : '';
}

/* E06-01 : lecture du rendu, jamais du store. Tout ce qui est observé est
 * déjà dans le DOM produit par `chronology.js` (attributs ARIA, classes,
 * valeur du champ de recherche, texte du statut). */
function readState(ctx) {
  const root = ctx && (ctx.layout || ctx.stage);
  if (!root || typeof root.querySelector !== 'function') return null;

  const band = root.querySelector('.era-band[aria-current="true"]');
  const card = root.querySelector('.event-card[aria-current="true"]');
  const search = root.querySelector('#atlas-chrono-search');
  const tag = root.querySelector('.atlas-chrono-tag[aria-pressed="true"]');
  const status = textOf(root.querySelector('#atlas-chrono-status'));
  const query = search ? String(search.value || '').trim() : '';
  const activeTag = tag ? (tag.dataset.tag || textOf(tag)) : '';
  const rankMatch = status.match(/rang global\s*(\d+)\s*\/\s*(\d+)/);
  const actions = root.querySelector('.aside-actions');
  const buttons = actions ? actions.querySelectorAll('button') : [];
  const emptyKey = ['filter', 'era', 'points', 'event']
    .find((key) => root.querySelector(`#nav-c2a-empty-${key}`)) || '';

  return {
    country: root.dataset.countryId || '—',
    era: band ? textOf(band.querySelector('span')) : '—',
    event: card ? textOf(card.querySelector('strong')) : '—',
    eventId: card ? (card.dataset.eventId || card.id.replace(/^event-btn-/, '')) : '',
    rank: rankMatch ? `${rankMatch[1]}/${rankMatch[2]}` : '—',
    filter: query && activeTag ? 'both' : query ? 'query' : activeTag ? 'tag' : 'none',
    shown: root.querySelectorAll('#atlas-chrono-events > li[id^="event-"]').length,
    bound: buttons.length && buttons[0].disabled ? 'start'
      : buttons.length && buttons[buttons.length - 1].disabled ? 'end'
        : 'none',
    empty: emptyKey,
    status,
  };
}

/* E06-02 à E06-06 : une seule annonce par rendu, par ordre de priorité —
 * sélection de repère > état vide > borne atteinte > compteurs/filtre. */
function messageFor(before, after) {
  if (after.eventId && (!before || before.eventId !== after.eventId)) {
    const where = after.era && after.era !== '—' ? ` dans l'ère ${after.era}` : '';
    const rank = after.rank !== '—' ? `, rang ${after.rank}` : '';
    return `Repère sélectionné : ${after.event}${rank}${where}.`;
  }
  if (after.empty && (!before || before.empty !== after.empty)
    && EMPTY_MESSAGES[after.empty]) {
    return EMPTY_MESSAGES[after.empty];
  }
  if (before && after.bound !== before.bound && after.bound !== 'none') {
    return after.bound === 'start'
      ? 'Début de la chronologie : aucun repère précédent.'
      : 'Fin de la chronologie : aucun repère suivant.';
  }
  if (after.status && (!before || before.status !== after.status)) {
    const prefix = after.filter !== 'none' ? `Filtre (${after.filter}) : ` : '';
    return `${prefix}${after.status}`;
  }
  return '';
}

/* E06-07 : réutiliser la région C2 existante ; repli déterministe et unique
 * si elle a disparu. Jamais deux régions live concurrentes. */
function ensureLive() {
  const existing = byId(LIVE_ID) || byId(FALLBACK_LIVE_ID);
  if (existing && existing.isConnected) return existing;
  const node = document.createElement('p');
  node.id = FALLBACK_LIVE_ID;
  node.className = 'e06-sr';
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('aria-atomic', 'true');
  document.body.appendChild(node);
  return node;
}

function writeLive(message) {
  if (!message || message === lastMessage) return;
  const live = ensureLive();
  if (!live) return;
  live.textContent = message;
  lastMessage = message;
  sequence += 1;
  if (!traceNode || !traceNode.isConnected) return;
  const item = document.createElement('li');
  item.textContent = `${sequence}. ${message}`;
  traceNode.insertBefore(item, traceNode.firstChild);
  while (traceNode.children.length > TRACE_LIMIT) traceNode.removeChild(traceNode.lastChild);
}

/* E06-05 : l'état actif ne doit pas être porté par la seule classe visuelle.
 * On cible uniquement les bandes et cartes, jamais le fil C2 (`aria-current`
 * = "location") ni les puces de thèmes (`aria-pressed`). */
function reconcileCurrent(root) {
  root.querySelectorAll('.era-band, .event-card').forEach((node) => {
    const active = node.classList.contains('is-active');
    const current = node.getAttribute('aria-current');
    if (active && current !== 'true') node.setAttribute('aria-current', 'true');
    else if (!active && current === 'true') node.removeAttribute('aria-current');
    const state = active ? 'active' : 'idle';
    if (node.dataset.e06State !== state) node.dataset.e06State = state;
  });
}

/* E06-09 : panneau de diagnostic, marqué dès sa création pour être masqué
 * par la feuille de `_diagnostics.js` dès le premier rendu. */
function buildPanel(ctx, root) {
  const existing = byId(PANEL_ID);
  if (existing && existing.isConnected) return existing;
  const make = ctx.el || ((tag, className, label) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (label !== undefined) node.textContent = label;
    return node;
  });

  const panel = make('section', 'e06-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'État et annonces — diagnostic de la lentille E06');
  panel.setAttribute('data-chronology-diagnostic', '');
  panel.appendChild(make('h2', 'e06-title', 'État & annonces · E06'));

  const list = make('dl', 'e06-dl');
  fields = {};
  FIELDS.forEach(([label, key]) => {
    const term = make('dt', '', label);
    const value = make('dd', '', '—');
    list.append(term, value);
    fields[key] = value;
  });
  panel.appendChild(list);

  panel.appendChild(make('h3', 'e06-trace-title', 'Dernières annonces'));
  traceNode = make('ol', 'e06-trace');
  traceNode.id = TRACE_ID;
  panel.appendChild(traceNode);
  root.appendChild(panel);
  return panel;
}

function updatePanel(state) {
  if (!fields) return;
  const values = {
    country: state.country,
    era: state.era,
    event: state.event,
    rank: state.rank,
    filter: state.filter,
    shown: String(state.shown),
    bound: state.bound,
    empty: state.empty || 'aucun',
    count: String(sequence),
  };
  Object.keys(values).forEach((key) => {
    const node = fields[key];
    if (node && node.textContent !== values[key]) node.textContent = values[key];
  });
}

register('E06', (ctx) => {
  if (!ctx || !ctx.stage) return;
  ctx.css(CSS_ID, CSS);
  const root = ctx.layout || ctx.stage;
  if (!root || typeof root.querySelector !== 'function') return;

  reconcileCurrent(root);

  const state = readState(ctx);
  if (!state) return;

  /* E06-08 : état de filtre exposé en attributs, dérivés du rendu. */
  if (root.dataset.e06Filter !== state.filter) root.dataset.e06Filter = state.filter;
  const shown = String(state.shown);
  if (root.dataset.e06Matches !== shown) root.dataset.e06Matches = shown;
  if (root.dataset.e06Bound !== state.bound) root.dataset.e06Bound = state.bound;

  buildPanel(ctx, root);
  updatePanel(state);

  /* E06-10 : le premier rendu n'annonce rien ; seules les transitions sont
   * vocalisées, une fois par rendu, avec déduplication par message identique. */
  if (previous) writeLive(messageFor(previous, state));
  previous = state;
});
