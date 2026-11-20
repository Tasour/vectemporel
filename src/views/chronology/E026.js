import { register } from './registry.js';

/* Lentille E26 — États et annonces (vue Chronologie).
 *
 * Les dix chantiers E26-01 … E26-10 sont décrits dans
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E26.md.
 *
 * E26 est un OBSERVATEUR de l'état de la frise : il ne possède ni le store,
 * ni la sélection, ni la région live de navigation de chronology.js. Tout est
 * résolu depuis le DOM à chaque rendu (E26-01). Une région live propre, hors
 * de #app, ne parle que des transitions non déjà annoncées par la vue (E26-02,
 * E26-04 à E26-07) ; un miroir visuel silencieux rend l'état auditable (E26-03,
 * E26-08, E26-09). Un seul fichier modifié, zéro réseau, zéro console, zéro
 * aléa, zéro timer, zéro rAF, zéro observateur, aucune donnée inventée. */

const CSS_ID = 'chronology-e26';
const LIVE_ID = 'chronology-e26-live';
const CHIP_ID = 'chronology-e26-state';

/* E26-10 : inventaire stable, exposé dans le rapport et dans le miroir. */
const CHANTIERS = Object.freeze([
  'E26-01', 'E26-02', 'E26-03', 'E26-04', 'E26-05',
  'E26-06', 'E26-07', 'E26-08', 'E26-09', 'E26-10',
]);

const CSS = `
  #${LIVE_ID}{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  #${CHIP_ID}{
    position:fixed;right:14px;bottom:12px;z-index:8;pointer-events:none;
    max-width:min(320px,calc(100vw - 28px));padding:6px 9px;
    border:1px solid var(--line,rgba(230,185,111,.35));border-radius:8px;
    background:rgba(8,11,16,.92);color:var(--muted,#c9c9c9);
    font:10px/1.45 system-ui,sans-serif;font-variant-numeric:tabular-nums;
    box-shadow:0 4px 14px rgba(0,0,0,.3);
  }
  #${CHIP_ID} .e26-kicker{
    display:block;margin-bottom:2px;color:var(--gold,#e6b96f);
    font-size:8px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
  }
  #${CHIP_ID} .e26-line{display:block}
  #${CHIP_ID}[data-empty="1"]{border-style:dashed}
  @media (max-width:700px){#${CHIP_ID}{display:none}}
  @media (prefers-reduced-motion:reduce){
    #${CHIP_ID}{transition:none!important;animation:none!important}
  }
`;

/* État de module : uniquement des références DOM, des gardes d'idempotence
 * et la dernière signature observée. Jamais une copie de l'état de la vue. */
const local = {
  live: null,
  signature: null,
  eventId: null,
  empty: null,
  era: null,
  filter: null,
  count: null,
  announced: 0,
};

function byId(id) {
  const node = document.getElementById(id);
  return node && node.isConnected ? node : null;
}

function one(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function all(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function textOf(node) {
  return node ? String(node.textContent || '').replace(/\s+/g, ' ').trim() : '';
}

function firstNumber(value) {
  const found = /(\d+)/.exec(String(value || ''));
  return found ? Number(found[1]) : null;
}

/* E26-09 : 0 et 1 restent au singulier en français. */
function plural(value, oneForm, manyForm) {
  return value > 1 ? manyForm : oneForm;
}

/* E26-01 : résolution intégrale depuis le DOM courant. Aucune valeur
 * mémorisée ne survit à un rendu : la coque reconstruisant #app à chaque
 * changement d'état (shell.js:533), les nœuds sont relus à chaque appel. */
function resolve(ctx) {
  const scope = ctx && ctx.stage && ctx.stage.isConnected ? ctx.stage : document;
  const statusText = textOf(byId('atlas-chrono-status'));

  const band = one(scope, '#atlas-chrono-eras [aria-current="true"]');
  const era = band ? textOf(one(band, 'span')) : '';

  const card = one(scope, '#atlas-chrono-events .event-card[aria-current="true"]');
  const title = textOf(byId('atlas-chrono-event-title'));
  let eventId = card && card.dataset ? (card.dataset.eventId || '') : '';
  if (!eventId && title) {
    /* Sous filtre, la carte courante peut être absente de la liste : le
     * titre de l'aside et les points restent la source de l'identité. */
    const pointLine = one(scope, '#atlas-chrono-points > li[id^="point-"]');
    const parsed = pointLine && /^point-(.+)-\d+$/.exec(pointLine.id || '');
    eventId = parsed ? parsed[1] : `titre:${title}`;
  }

  const yearLine = textOf(one(scope, '#atlas-chrono-aside .aside-year'));
  const pointsTitle = textOf(byId('atlas-chrono-points-title'));
  const points = firstNumber(pointsTitle.replace(/^.*\(/, ''));

  const search = byId('atlas-chrono-search');
  const query = search ? String(search.value || '').trim() : '';
  const toolTag = one(scope, '#atlas-chrono-tools .atlas-chrono-tag[aria-pressed="true"]');
  const tag = textOf(toolTag);
  const filter = query || tag
    ? `${query ? `q:${query.toLowerCase()}` : ''}${tag ? `|t:${tag.toLowerCase()}` : ''}`
    : '';
  const filterLabel = query && tag ? `« ${query} » + ${tag}` : query ? `« ${query} »` : tag;

  const matched = all(scope, '#atlas-chrono-events .event-card[data-event-id]').length;
  const countText = textOf(one(scope, '#atlas-chrono-tools .atlas-chrono-count'));
  const counted = /(\d+)\s*\/\s*(\d+)/.exec(countText);
  let total = counted ? Number(counted[2]) : null;
  if (total === null) {
    const fromStatus = /sur\s+(\d+)/.exec(statusText);
    total = fromStatus ? Number(fromStatus[1]) : null;
  }

  const empty = byId('nav-c2a-empty-filter') ? 'filter'
    : byId('nav-c2a-empty-era') ? 'era'
      : byId('nav-c2a-empty-points') ? 'points'
        : byId('nav-c2a-empty-event') ? 'event'
          : '';

  /* E26-08 : lecture seule des attributs possédés par chronology.js. */
  const bands = all(scope, '#atlas-chrono-eras [aria-current="true"]');
  const cards = all(scope, '#atlas-chrono-events .event-card[aria-current="true"]');
  const toolTags = all(scope, '#atlas-chrono-tools .atlas-chrono-tag[aria-pressed="true"]');
  const asideTags = all(scope, '#atlas-chrono-aside .atlas-chrono-tag[aria-pressed="true"]');
  const coherent = bands.length <= 1 && cards.length <= 1
    && toolTags.length <= 1 && asideTags.length <= 1
    && (!toolTags.length || !asideTags.length || textOf(toolTags[0]) === textOf(asideTags[0]));

  return {
    era, eventId, title, yearLine, points, query, tag, filter, filterLabel,
    matched, total, empty, coherent, statusText,
  };
}

/* E26-04 : la signature est l'identité d'un état observable. Un rendu sans
 * changement produit la même signature et ne réannonce rien. */
function signature(state) {
  return [
    state.era,
    state.eventId,
    state.filter,
    String(state.matched),
    state.total === null ? '' : String(state.total),
    state.empty,
    state.coherent ? '1' : '0',
  ].join('|');
}

/* E26-02 : région live dédiée, créée une seule fois dans <body> (jamais dans
 * #app, qui est vidé par shell.js:533). Aucun doublon : le nom est réservé à
 * E26 et la garde d'existence est vérifiée avant toute création. */
function ensureLive() {
  if (local.live && local.live.isConnected) return local.live;
  let node = document.getElementById(LIVE_ID);
  if (!node) {
    node = document.createElement('p');
    node.id = LIVE_ID;
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    document.body.appendChild(node);
  }
  local.live = node;
  return node;
}

/* E26-03 : miroir visuel, aria-hidden et non cliquable. Il vit dans le layout
 * recréé à chaque rendu ; seule la région live est persistante. */
function ensureChip(ctx) {
  let chip = document.getElementById(CHIP_ID);
  if (!chip) {
    chip = ctx && typeof ctx.el === 'function'
      ? ctx.el('div', 'chronology-e26-state')
      : document.createElement('div');
    chip.id = CHIP_ID;
    chip.setAttribute('aria-hidden', 'true');
    const kicker = document.createElement('span');
    kicker.className = 'e26-kicker';
    kicker.textContent = 'État de la frise';
    const line = document.createElement('span');
    line.className = 'e26-line';
    chip.append(kicker, line);
  }
  const parent = ctx && ctx.layout && ctx.layout.isConnected
    ? ctx.layout
    : (ctx && ctx.stage && ctx.stage.isConnected ? ctx.stage : null);
  if (parent && chip.parentNode !== parent) parent.appendChild(chip);
  return chip;
}

function paintChip(chip, state, sig) {
  chip.dataset.era = state.era;
  chip.dataset.event = state.eventId;
  chip.dataset.filter = state.filter;
  chip.dataset.matched = String(state.matched);
  chip.dataset.total = state.total === null ? '' : String(state.total);
  chip.dataset.empty = state.empty;
  chip.dataset.coherent = state.coherent ? '1' : '0';
  chip.dataset.signature = sig;
  chip.dataset.announced = String(local.announced);
  chip.dataset.chantiers = String(CHANTIERS.length);

  const counter = state.total === null ? `${state.matched} repère(s)` : `${state.matched}/${state.total} repères`;
  const line = chip.querySelector('.e26-line');
  if (!line) return;
  const parts = [
    state.era ? `Ère ${state.era}` : 'Ère —',
    state.title || 'Aucun repère',
    counter,
  ];
  if (state.filterLabel) parts.push(`filtre : ${state.filterLabel}`);
  if (state.empty === 'filter') parts.push('Aucun repère ne correspond au filtre.');
  if (state.empty === 'era') parts.push('Aucun repère documenté pour cette ère.');
  if (state.empty === 'points') parts.push('Aucun point documenté pour ce repère.');
  if (state.empty === 'event') parts.push('Aucun repère sélectionné.');
  if (!state.coherent) parts.push('État ARIA incohérent.');
  line.textContent = parts.join(' · ');
}

function say(message) {
  if (!message) return;
  ensureLive().textContent = message;
  local.announced += 1;
}

/* E26-05 : le repère est nommé par le titre réel de l'aside et par la ligne
 * d'année déjà construite par la vue ; aucun champ historique n'est inventé. */
function eventMessage(state) {
  if (!state.eventId) return 'Aucun repère sélectionné.';
  const suffix = state.points === null
    ? ''
    : ` ${state.points} ${plural(state.points, 'point', 'points')}.`;
  return `Repère sélectionné : ${state.title || 'sans titre'}.${state.yearLine ? ` ${state.yearLine}.` : ''}${suffix}`;
}

/* E26-06 : quatre états vides distincts, tous dérivés des nœuds possédés par
 * la vue (chronology.js:356, 469, 532). */
function emptyMessage(kind, state) {
  if (kind === 'filter') return 'Aucun repère ne correspond au filtre.';
  if (kind === 'era') return 'Aucun repère documenté pour cette ère.';
  if (kind === 'points') return 'Aucun point documenté pour ce repère.';
  if (kind === 'event') return 'Aucun repère sélectionné. Choisissez un repère dans la liste.';
  return '';
}

/* E26-07 : la vue possède déjà #nav-c2a-live (chronology.js:121-136) pour
 * l'ère et le filtre. Son annonce est émise APRÈS le rendu déclenché par set()
 * (chronology.js:325-337, 340-350) : comparer le texte courant de la région
 * provoquerait un doublon. E26 ne parle donc de l'ère et du filtre que si le
 * canal de base n'existe pas du tout, jamais pour le doubler. */
function baseOwnsAnnouncement() {
  return Boolean(byId('nav-c2a-live'));
}

function countMessage(state) {
  return `Filtre : ${state.matched} ${plural(state.matched, 'repère', 'repères')} affiché${state.matched > 1 ? 's' : ''} sur ${state.total === null ? 'un nombre inconnu de' : state.total} repères.`;
}

function eraMessage(state) {
  return `Ère ${state.era || 'inconnue'} : ${state.matched} ${plural(state.matched, 'repère', 'repères')}.`;
}

/* E26-04 : une seule annonce par transition réellement observée. Le premier
 * rendu est silencieux (aucun historique à rattraper), les rendus suivants ne
 * parlent que sur changement d'identité, d'état vide, d'ère ou de filtre. */
function announce(state, sig) {
  const previous = local.signature;
  local.signature = sig;
  if (previous === null) {
    local.eventId = state.eventId;
    local.empty = state.empty;
    local.era = state.era;
    local.filter = state.filter;
    local.count = state.matched;
    return;
  }

  if (state.eventId !== local.eventId) {
    /* Un état vide « aucun repère » porte déjà le même propos : un seul
     * message, pour éviter deux annonces consécutives. */
    const covered = state.empty === 'event' && state.empty !== local.empty;
    if (!covered) say(eventMessage(state));
    local.eventId = state.eventId;
  }

  if (state.empty !== local.empty && state.empty) {
    say(emptyMessage(state.empty, state));
  }
  local.empty = state.empty;

  if (state.era !== local.era && state.era && !baseOwnsAnnouncement()) {
    say(eraMessage(state));
  }
  local.era = state.era;

  if ((state.filter !== local.filter || state.matched !== local.count)
    && state.filter && !baseOwnsAnnouncement()) {
    say(countMessage(state));
  }
  local.filter = state.filter;
  local.count = state.matched;
}

function render(ctx) {
  if (!ctx || !ctx.stage) return;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  ensureLive();
  const chip = ensureChip(ctx);
  if (!chip) return;
  const state = resolve(ctx);
  const sig = signature(state);
  announce(state, sig);
  paintChip(chip, state, sig);
}

register('E26', (ctx) => {
  render(ctx);
});
