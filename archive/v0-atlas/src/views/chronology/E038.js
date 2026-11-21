import { register } from './registry.js';
import {
  state, set, selectEvent, formatDeepLink, parseDeepLink, hydrateFromHash,
} from '../../domain/store.js';
import { DATASET } from '../../data/dataset.js';

/* Lentille E038 — Deep links de la vue Chronologie (notation courte : E38).
 *
 * La grammaire canonique appartient à store.js : formatDeepLink() écrit la
 * query du hash (#v=…&c=…&e=…&r=…), parseDeepLink() la lit, hydrateFromHash()
 * l'applique et reflectHash() la grave. Cette lentille ne duplique aucune de
 * ces règles : elle se contente de les rendre lisibles, générables,
 * partageables et restaurables depuis la scène Chronologie.
 *
 * Invariants vérifiés par UNIFIED_AUDIT/CHRONOLOGIE/views/E038.md :
 * - aucun fichier partagé modifié, aucun import de vue, aucun cycle ;
 * - zéro console.*, zéro réseau (fetch/XHR/src/@import), zéro Math.random ;
 * - CSS unique injecté par ctx.css('chronology-e38', …) ; ids préfixés e38- ;
 * - un seul écouteur hashchange, une seule région live, aucun timer/rAF ;
 * - lecture du hash bornée et sans exception ; toute écriture est explicite
 *   (clic sur un lien ou sur « Appliquer ») et jamais bouclée.
 */

const CSS_ID = 'chronology-e38';
const PANEL_ID = 'e38-panel';
const READOUT_ID = 'e38-readout';
const ERA_LINK_ID = 'e38-link-era';
const EVENT_LINK_ID = 'e38-link-event';
const INPUT_ID = 'e38-input';
const APPLY_ID = 'e38-apply';
const COPY_ID = 'e38-copy';
const FIELD_ID = 'e38-field';
/* Pas de tiret avant « e38 » : cette région live n'est pas un panneau de
   diagnostic et reste annonçable même quand le tiroir est fermé. */
const LIVE_ID = 'e38status';
const MAX_HASH = 2048;
const MAX_QUERY = 120;
const MAX_TAGS = 12;

const CSS = `
.e38-panel{margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02);color:var(--muted);font-size:10px;line-height:1.5}
.e38-title{margin:0 0 4px;color:var(--gold);font-size:8px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.e38-readout{margin:0;font-variant-numeric:tabular-nums}
.e38-links,.e38-actions{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0 0}
.e38-links a,.e38-actions button{display:inline-flex;align-items:center;min-height:36px;padding:5px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font:inherit;font-size:10px;text-decoration:none;cursor:pointer}
.e38-links a:hover,.e38-actions button:hover{border-color:var(--gold)}
.e38-links a:focus-visible,.e38-actions button:focus-visible,.e38-input:focus-visible,.e38-field:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e38-input,.e38-field{width:100%;min-height:36px;margin:6px 0 0;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--ink);font:inherit;font-size:10px}
.e38-field[hidden]{display:none}
@media (max-width:620px){.e38-links,.e38-actions{flex-direction:column;align-items:stretch}}
@media (prefers-reduced-motion:reduce){.e38-panel *{transition:none!important}}`;

let panel = null;
let refs = null;
let live = null;
let hashHooked = false;
let refreshQueued = false;
let lastInput = null;
let pushCount = 0;
let copyCount = 0;
let applyCount = 0;
let fallbackCount = 0;

/* ---------- lecture sans exception ---------- */

function readHash() {
  try {
    return String(window.location.hash || '').slice(0, MAX_HASH);
  } catch {
    return '';
  }
}

function readParams(hash) {
  const raw = typeof hash === 'string' ? hash.slice(0, MAX_HASH).replace(/^#/, '') : '';
  let params;
  try { params = new URLSearchParams(raw); } catch { return { core: null, q: '', tags: [] }; }
  const core = parseDeepLink(`#${raw}`);
  const q = String(params.get('q') || '').slice(0, MAX_QUERY);
  const tags = String(params.get('t') || '').split(',')
    .map((tag) => tag.trim()).filter(Boolean).slice(0, MAX_TAGS);
  return { core, q, tags };
}

function safeUrl(value) {
  try { return new URL(String(value), window.location.href); } catch { return null; }
}

/* ---------- contexte dérivé du DOM rendu, jamais inventé ---------- */

function domContext(layout) {
  const bands = [...layout.querySelectorAll('.era-band[data-era-id]')];
  const activeBand = bands.find((band) => band.getAttribute('aria-current') === 'true') || null;
  const rows = [...layout.querySelectorAll('li[data-event-id]')];
  const activeRow = rows.find((row) => row.querySelector('button[aria-current="true"]')) || null;
  const search = layout.querySelector('#atlas-chrono-search');
  const tags = [...new Set([...layout.querySelectorAll('.atlas-chrono-tag[aria-pressed="true"][data-tag]')]
    .map((chip) => chip.dataset.tag))].sort();
  return {
    countryId: layout.dataset.countryId || '',
    bands,
    band: activeBand,
    /* Les bandes et les cartes affichées sont celles de l'ère courante :
       leur rang dans le DOM est local. Les index écrits dans le hash sont
       globaux : ils viennent donc de l'état, source unique (store.js). */
    eraIndex: Number.isFinite(state.eraIndex) ? state.eraIndex : 0,
    visibleEraIndex: activeBand ? bands.indexOf(activeBand) : 0,
    eraId: activeBand ? activeBand.dataset.eraId : '',
    rows,
    row: activeRow,
    eventIndex: Number.isFinite(state.eventIndex) ? state.eventIndex : 0,
    visibleEventIndex: activeRow ? rows.indexOf(activeRow) : 0,
    eventId: activeRow ? activeRow.dataset.eventId : '',
    eventYear: activeRow ? activeRow.dataset.year || '' : '',
    title: activeRow ? (activeRow.querySelector('strong')?.textContent || '') : '',
    query: search ? String(search.value || '').slice(0, MAX_QUERY) : '',
    tags,
  };
}

function firstEventInEra(ctx) {
  const country = DATASET.countries.find((item) => item.id === ctx.countryId);
  const era = country?.eras?.[ctx.eraIndex];
  if (!era || !country.events) return ctx.eventIndex;
  const index = country.events.findIndex((event) => event.eraId === era.id);
  return index >= 0 ? index : ctx.eventIndex;
}

function buildHash(ctx, eraIndex, eventIndex) {
  const snapshot = {
    ...state,
    view: 'chronology',
    countryId: ctx.countryId || state.countryId,
    eraIndex,
    eventIndex,
  };
  const params = new URLSearchParams(formatDeepLink(snapshot));
  if (ctx.query) params.set('q', ctx.query);
  if (ctx.tags.length) params.set('t', ctx.tags.join(','));
  return `#${params.toString()}`;
}

function describe(core) {
  if (!core) return 'lien non reconnu';
  const parts = ['Chronologie'];
  if (core.countryId) parts.push(core.countryId);
  if (Number.isFinite(core.eraIndex)) parts.push(`ère ${core.eraIndex + 1}`);
  if (Number.isFinite(core.eventIndex)) parts.push(`repère ${core.eventIndex + 1}`);
  return parts.join(' · ');
}

/* ---------- annonce : région existante réutilisée, sinon région propre ---------- */

function ensureLive() {
  if (live && live.isConnected) return live;
  const inherited = document.getElementById('nav-c2a-live');
  if (inherited && inherited.isConnected) { live = inherited; return live; }
  const existing = document.getElementById(LIVE_ID);
  if (existing) { live = existing; return existing; }
  live = document.createElement('p');
  live.id = LIVE_ID;
  live.className = 'nav-c2-sr-only';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  document.body.appendChild(live);
  return live;
}

function say(message) {
  const node = ensureLive();
  if (node) node.textContent = message;
}

/* ---------- panneau ---------- */

function collectRefs(node) {
  return {
    readout: node.querySelector(`#${READOUT_ID}`),
    eraLink: node.querySelector(`#${ERA_LINK_ID}`),
    eventLink: node.querySelector(`#${EVENT_LINK_ID}`),
    input: node.querySelector(`#${INPUT_ID}`),
    apply: node.querySelector(`#${APPLY_ID}`),
    copy: node.querySelector(`#${COPY_ID}`),
    field: node.querySelector(`#${FIELD_ID}`),
  };
}

function buildPanel(ctx) {
  const node = ctx.el('section', 'e38-panel');
  node.id = PANEL_ID;
  node.setAttribute('aria-label', 'Liens profonds de la Chronologie');

  node.appendChild(ctx.el('p', 'e38-title', 'Deep link · Chronologie'));
  const readout = ctx.el('p', 'e38-readout');
  readout.id = READOUT_ID;
  node.appendChild(readout);

  const links = ctx.el('div', 'e38-links');
  const eraLink = ctx.el('a', '', 'Lien de l’ère');
  eraLink.id = ERA_LINK_ID;
  eraLink.dataset.e38Action = 'link';
  const eventLink = ctx.el('a', '', 'Lien du repère');
  eventLink.id = EVENT_LINK_ID;
  eventLink.dataset.e38Action = 'link';
  links.append(eraLink, eventLink);
  node.appendChild(links);

  const input = document.createElement('input');
  input.type = 'text';
  input.id = INPUT_ID;
  input.className = 'e38-input';
  input.setAttribute('aria-label', 'Lien profond à lire ou à coller');
  node.appendChild(input);

  const actions = ctx.el('div', 'e38-actions');
  const apply = ctx.el('button', '', 'Appliquer le lien');
  apply.type = 'button';
  apply.id = APPLY_ID;
  apply.dataset.e38Action = 'apply';
  const copy = ctx.el('button', '', 'Copier le lien du repère');
  copy.type = 'button';
  copy.id = COPY_ID;
  copy.dataset.e38Action = 'copy';
  actions.append(apply, copy);
  node.appendChild(actions);

  const field = document.createElement('input');
  field.type = 'text';
  field.id = FIELD_ID;
  field.className = 'e38-field';
  field.readOnly = true;
  field.hidden = true;
  field.setAttribute('aria-label', 'Lien à copier manuellement');
  node.appendChild(field);

  const parent = ctx.stage && ctx.stage.isConnected
    ? ctx.stage
    : (ctx.layout && ctx.layout.isConnected ? ctx.layout : null);
  if (parent) parent.appendChild(node);
  return node;
}

function ensurePanel(ctx) {
  if (panel && panel.isConnected) return panel;
  const existing = document.getElementById(PANEL_ID);
  panel = existing || buildPanel(ctx);
  refs = collectRefs(panel);
  if (panel.dataset.e38Wired !== '1') {
    panel.dataset.e38Wired = '1';
    panel.addEventListener('click', handleClick);
  }
  return panel;
}

/* ---------- actions explicites ---------- */

function revealField(url) {
  if (!refs || !refs.field) return;
  refs.field.hidden = false;
  refs.field.value = url;
  refs.field.focus();
  refs.field.select();
  fallbackCount += 1;
  say('Presse-papiers indisponible : le lien est affiché et sélectionné.');
}

function copyEventLink() {
  if (!refs || !refs.eventLink) return;
  const url = safeUrl(refs.eventLink.getAttribute('href'));
  if (!url) { say('Lien indisponible.'); return; }
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      const done = navigator.clipboard.writeText(url.href);
      if (done && typeof done.then === 'function') {
        done.then(() => {
          copyCount += 1;
          say(`Lien copié — ${describe(parseDeepLink(url.hash))}.`);
          refresh();
        }, () => revealField(url.href));
      } else {
        copyCount += 1;
        say(`Lien copié — ${describe(parseDeepLink(url.hash))}.`);
        refresh();
      }
      return;
    }
  } catch {
    // Contexte non sécurisé : repli visible ci-dessous.
  }
  revealField(url.href);
}

function applyCore(core) {
  const fields = [
    ['view', 'view'], ['countryId', 'countryId'], ['eraIndex', 'eraIndex'],
    ['eventIndex', 'eventIndex'], ['pointIndex', 'pointIndex'],
    ['placeIndex', 'placeIndex'], ['scope', 'scope'],
    ['pointFilterDomain', 'pointFilterDomain'],
    ['pointFilterFamily', 'pointFilterFamily'],
    ['detailOpen', 'detailOpen'], ['helpOpen', 'helpOpen'],
  ];
  const patch = {};
  fields.forEach(([key, field]) => {
    if (core[field] !== undefined) patch[key] = core[field];
  });
  if (Object.keys(patch).length) set(patch, 'e38-deep-link');
  /* Le store ne recale pas l'ère depuis l'index du repère dans un lien brut.
     selectEvent() applique sa propre règle : l'ère du repère l'emporte, ce qui
     évite une vue « ère sans repère sélectionné » après restauration. */
  if (patch.eventIndex !== undefined) selectEvent(state.eventIndex);
}

/* Les paramètres propres à la lentille (q, t) sont ignorés par store.js :
   ils sont appliqués aux contrôles locaux, sans toucher au store ni au hash. */
function applyLocal(query, tags) {
  const search = document.getElementById('atlas-chrono-search');
  if (search && search.value !== query) {
    search.value = query;
    search.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const desired = tags.length ? tags[0] : null;
  for (let guard = 0; guard < MAX_TAGS; guard += 1) {
    const pressed = [...document.querySelectorAll('#atlas-chrono-tools .atlas-chrono-tag[aria-pressed="true"][data-tag]')]
      .find((chip) => chip.dataset.tag !== desired);
    if (!pressed) break;
    pressed.click();
  }
  if (desired) {
    const wanted = [...document.querySelectorAll('#atlas-chrono-tools .atlas-chrono-tag[data-tag]')]
      .find((chip) => chip.dataset.tag === desired && chip.getAttribute('aria-pressed') !== 'true');
    if (wanted) wanted.click();
  }
}

function applyFromInput() {
  if (!refs || !refs.input) return;
  const typed = String(refs.input.value || '').trim();
  const url = typed ? safeUrl(typed) : safeUrl(readHash());
  if (!url) { say('Lien illisible : coller une URL complète ou un hash.'); return; }
  const parsed = readParams(url.hash);
  if (!parsed.core) { say('Aucun lien profond reconnu.'); return; }
  applyCore(parsed.core);
  applyLocal(parsed.q, parsed.tags);
  applyCount += 1;
  say(`Lien appliqué — ${describe(parsed.core)}${parsed.q ? ', recherche restaurée' : ''}${parsed.tags.length ? ', thème restauré' : ''}.`);
  refresh();
}

function pushLink(anchor) {
  const hash = anchor.getAttribute('href');
  if (!hash || hash.charAt(0) !== '#') return;
  const url = safeUrl(hash);
  if (!url) { say('Lien indisponible.'); return; }
  try {
    window.history.pushState(window.history.state, '', url.toString());
    pushCount += 1;
    hydrateFromHash();
    say(`Lien ouvert — ${describe(parseDeepLink(url.hash))}.`);
    refresh();
  } catch {
    window.location.hash = hash;
    say('Historique indisponible : lien ouvert sans point de retour.');
  }
}

function handleClick(event) {
  const target = event.target && typeof event.target.closest === 'function'
    ? event.target.closest('[data-e38-action]')
    : null;
  if (!target || !panel || !panel.contains(target)) return;
  const action = target.dataset.e38Action;
  if (action === 'link') {
    event.preventDefault();
    pushLink(target);
  } else if (action === 'apply') {
    applyFromInput();
  } else if (action === 'copy') {
    copyEventLink();
  }
}

function handleHash() {
  const parsed = readParams(readHash());
  say(parsed.core
    ? `URL mise à jour — ${describe(parsed.core)}.`
    : 'URL sans lien profond reconnu.');
  refresh();
}

/* ---------- rafraîchissement idempotent ---------- */

function refresh() {
  const layout = document.querySelector('.chronology-layout');
  if (!layout || !refs) return;
  const ctx = domContext(layout);
  const current = readHash();
  const parsed = readParams(current);
  const eraHash = buildHash(ctx, ctx.eraIndex, firstEventInEra(ctx));
  const eventHash = buildHash(ctx, ctx.eraIndex, ctx.eventIndex);
  const aligned = Boolean(parsed.core)
    && parsed.core.view === 'chronology'
    && (parsed.core.countryId === undefined || parsed.core.countryId === ctx.countryId)
    && (parsed.core.eraIndex === undefined || parsed.core.eraIndex === ctx.eraIndex)
    && (parsed.core.eventIndex === undefined || parsed.core.eventIndex === ctx.eventIndex);

  if (refs.eraLink) refs.eraLink.setAttribute('href', eraHash);
  if (refs.eventLink) refs.eventLink.setAttribute('href', eventHash);
  if (refs.input && (!refs.input.value || refs.input.value === lastInput)) {
    refs.input.value = current;
    lastInput = current;
  }
  if (refs.field && refs.field.hidden) {
    const url = safeUrl(eventHash);
    if (url) refs.field.value = url.href;
  }

  const readable = ctx.countryId
    ? `Chronologie · ${ctx.countryId} · ère ${ctx.eraIndex + 1}${ctx.eraId ? ` (${ctx.eraId})` : ''} · repère ${ctx.eventIndex + 1}${ctx.eventId ? ` (${ctx.eventId}${ctx.eventYear ? `, ${ctx.eventYear}` : ''}${ctx.title ? `, « ${ctx.title} »` : ''})` : ''}`
    : 'Chronologie · aucun pays rendu';
  const status = !parsed.core ? 'URL sans lien reconnu'
    : aligned ? 'URL alignée sur la vue' : 'URL décalée par rapport à la vue';
  const extra = parsed.q || parsed.tags.length
    ? ` · filtre local${parsed.q ? ` « ${parsed.q} »` : ''}${parsed.tags.length ? ` · thème ${parsed.tags.join(',')}` : ''}`
    : '';
  if (refs.readout) {
    refs.readout.textContent = `${readable} — ${status}${extra}. `
      + `Liens générés : 2 · ouverts : ${pushCount} · copiés : ${copyCount} · appliqués : ${applyCount} · replis : ${fallbackCount}.`;
  }
  if (panel) {
    panel.dataset.e38Align = aligned ? 'yes' : 'no';
    panel.dataset.e38Country = ctx.countryId;
    panel.dataset.e38Era = String(ctx.eraIndex);
    panel.dataset.e38Event = String(ctx.eventIndex);
    panel.dataset.e38Visible = `${ctx.visibleEraIndex}/${ctx.visibleEventIndex}`;
    panel.dataset.e38Canonical = current === eventHash ? 'yes' : 'no';
    panel.dataset.e38Counts = `${pushCount}/${copyCount}/${applyCount}/${fallbackCount}`;
  }
}

/* set() émet le rendu avant de graver le hash (reflectHash en fin de set).
   Un rafraîchissement immédiat verrait donc l'URL précédente : on le repousse
   d'une microtâche, coalesnée sur plusieurs rendus consécutifs. */
function queueRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  queueMicrotask(() => {
    refreshQueued = false;
    refresh();
  });
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  ctx.css(CSS_ID, CSS);
  if (!ctx.layout || !ctx.layout.isConnected) return;
  ensureLive();
  ensurePanel(ctx);
  if (!hashHooked) {
    hashHooked = true;
    window.addEventListener('hashchange', handleHash);
  }
  refresh();
  queueRefresh();
}

register('E038', install);
