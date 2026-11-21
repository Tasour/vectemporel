import { register } from './registry.js';
import {
  getSnapshot,
  currentCountry,
  currentEra,
  currentEvent,
  getBounds,
  getDiagnostics,
  selectionSnapshot,
  selectionTrail,
} from '../../domain/store.js';

/* Lentille E40 — Cohérence inter-vues de la Chronologie.
 *
 * La Chronologie n'est qu'une projection de l'état unique décrit dans
 * `store.js` et partagé avec le Monde, le Récit, la Géographie, la
 * Constellation et la Matrice des points. Cette lentille rend ces accords
 * **falsifiables** dans un unique panneau, réinterroge le DOM courant à chaque
 * rendu et ne réconcilie que des miroirs appartenant à sa propre vue.
 *
 * Toutes les valeurs affichées sont recalculées depuis le store, le DOM rendu,
 * l'API publique `window.VATLAS` ou le lien local : aucune donnée historique
 * n'est inventée, aucun fichier partagé n'est modifié.
 *
 * Zéro réseau, zéro `Math.random`, zéro `console.*`, zéro rAF, un seul panneau,
 * un seul abonnement `hashchange`, une seule microtâche de rafraîchissement —
 * cf. E40-01 à E40-10.
 */

const CSS_ID = 'chronology-e40';
const PANEL_ID = 'chronology-e40-coherence';

const CSS = `
  #${PANEL_ID}{
    position:absolute;right:14px;top:76px;z-index:7;
    max-width:min(360px,46%);padding:8px 11px;pointer-events:none;
    border:1px solid var(--line);border-radius:9px;
    background:rgba(8,11,16,.92);color:var(--muted);
    font-size:10px;line-height:1.45;font-variant-numeric:tabular-nums;
  }
  #${PANEL_ID} .e40-kicker{
    display:block;margin:0 0 4px;color:var(--gold);font-size:9px;
    font-weight:600;letter-spacing:.14em;text-transform:uppercase;
  }
  #${PANEL_ID} .e40-line{display:flex;gap:6px;margin:0 0 2px}
  #${PANEL_ID} .e40-label{flex:0 0 92px;color:var(--ink-soft)}
  #${PANEL_ID} .e40-value{flex:1 1 auto;color:var(--ink)}
  #${PANEL_ID} .e40-value[data-tone="warn"]{color:var(--red)}
  #${PANEL_ID} .e40-value[data-tone="ok"]{color:var(--gold-bright)}
  @media (max-width:900px){
    #${PANEL_ID}{left:12px;right:auto;top:auto;bottom:12px;max-width:min(340px,70%)}
  }
  @media (max-width:620px){
    #${PANEL_ID}{left:8px;right:8px;bottom:8px;max-width:none;font-size:9px}
    #${PANEL_ID} .e40-label{flex-basis:80px}
  }
  @media (prefers-reduced-motion:reduce){#${PANEL_ID}{transition:none}}
`;

const CHANTIERS = Object.freeze([
  'E40-01', 'E40-02', 'E40-03', 'E40-04', 'E40-05',
  'E40-06', 'E40-07', 'E40-08', 'E40-09', 'E40-10',
]);

/* État module : le contexte le plus récent, jamais une capture périmée. */
let latest = null;
let applies = 0;
let microQueued = false;
let hashListener = false;

function arr(value) {
  if (Array.isArray(value)) return value;
  /* `querySelectorAll` renvoie une NodeList, pas un tableau : la convertir
     explicitement plutôt que la confondre avec une collection vide. */
  if (value && typeof value.length === 'number' && typeof value.item === 'function') {
    return Array.from(value);
  }
  return [];
}

function textOf(selector) {
  const node = document.querySelector(selector);
  return node ? (node.textContent || '').trim() : '';
}

function publicApi() {
  if (typeof window === 'undefined' || !window.VATLAS) return null;
  return typeof window.VATLAS === 'object' ? window.VATLAS : null;
}

function routerApi() {
  if (typeof window === 'undefined' || !window.VECTEMPOREL_KEYS) return null;
  return typeof window.VECTEMPOREL_KEYS === 'object' ? window.VECTEMPOREL_KEYS : null;
}

function afterCommit(fn) {
  if (typeof queueMicrotask === 'function') queueMicrotask(fn);
  else Promise.resolve().then(fn);
}

/* Le store grave le hash APRÈS `emit` (store.js:251 puis :252). Une microtâche
   Unique relit donc le panneau après la réflexion, sans timer ni rAF. */
function scheduleRefresh() {
  if (microQueued) return;
  microQueued = true;
  afterCommit(() => { microQueued = false; refresh(); });
}

function put(panel, key, value, tone) {
  if (!panel) return;
  const node = panel.querySelector(`[data-e40-value="${key}"]`);
  if (!node) return;
  if (node.textContent !== value) node.textContent = value;
  const nextTone = tone || '';
  if (node.dataset.tone !== nextTone) {
    if (nextTone) node.dataset.tone = nextTone;
    else delete node.dataset.tone;
  }
}

function buildPanel(ctx) {
  if (document.getElementById(PANEL_ID)) return;
  const panel = ctx.el('div', 'e40-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Contrôle de cohérence inter-vues de la Chronologie');
  panel.appendChild(ctx.el('span', 'e40-kicker', 'Cohérence inter-vues · E40'));
  const keys = [
    ['id', 'Pays courant'],
    ['total', 'Repères du pays'],
    ['era', 'Ère active'],
    ['event', 'Repère courant'],
    ['trail', 'Fil de situation'],
    ['link', 'Lien local'],
    ['markers', 'Repères uniques'],
    ['store', 'Diagnostic store'],
    ['bounds', 'Bornes partagées'],
    ['guards', 'Greffon'],
  ];
  for (const [key, label] of keys) {
    const line = ctx.el('p', 'e40-line');
    line.dataset.e40 = key;
    const value = ctx.el('span', 'e40-value', '—');
    value.dataset.e40Value = key;
    line.append(ctx.el('span', 'e40-label', label), value);
    panel.appendChild(line);
  }
  ctx.stage.appendChild(panel);
}

/* E40-01 à E40-10 : un seul point de lecture, réinterrogeant le DOM courant
   et l'état vivant à chaque appel (rendu, microtâche, hashchange). */
function refresh() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;

  const ctx = latest;
  const layout = ctx && ctx.layout ? ctx.layout : null;
  const snap = getSnapshot();
  const country = currentCountry();
  const era = currentEra();
  const event = currentEvent();
  const sel = selectionSnapshot();
  const bounds = getBounds();
  const diag = getDiagnostics();
  const api = publicApi();
  const pos = api && typeof api.position === 'function' ? api.position() : null;
  const apiCountry = api && typeof api.countries === 'function'
    ? arr(api.countries()).find((item) => item && item.id === snap.countryId) || null
    : null;
  const statusText = textOf('#atlas-chrono-status');
  const filtering = statusText.indexOf('Recherche dans les') === 0;

  /* E40-01 — identité du pays : état, miroir du layout, titre et API publique. */
  const layoutId = layout && layout.dataset ? (layout.dataset.countryId || '') : '';
  const apiId = pos && typeof pos.countryId === 'string' ? pos.countryId : null;
  const h1Text = textOf('#atlas-chrono-title');
  const expectedH1 = country ? `Chronologie · ${country.name}` : '';
  /* `VATLAS` n'est publié qu'après le premier `mount` (app.js:129 puis :135) :
     son absence est une inconnue, pas une divergence. */
  const idOk = (!snap.countryId && !layoutId && !apiId)
    || (!!snap.countryId && layoutId === snap.countryId && (apiId === null || apiId === snap.countryId));
  const nameOk = h1Text === expectedH1;
  const identityOk = idOk && nameOk;
  put(panel, 'id',
    country
      ? `${country.name} · ${country.code || '—'} · ${identityOk ? 'aligné' : 'divergent'}`
      : `aucun pays sélectionné · ${identityOk ? 'aligné' : 'divergent'}`,
    identityOk ? 'ok' : 'warn');

  /* E40-02 — total de repères : store, catalogue public et situation publique. */
  const countryTotal = country ? country.events.length : 0;
  const apiTotal = apiCountry && Number.isFinite(apiCountry.events) ? apiCountry.events : null;
  const posTotal = pos && Number.isFinite(pos.eventCount) ? pos.eventCount : null;
  const totals = [countryTotal, apiTotal, posTotal].filter((value) => value !== null);
  const totalsOk = totals.length > 0 && totals.every((value) => value === totals[0]);
  put(panel, 'total',
    `${countryTotal} repères · public ${apiTotal === null ? '—' : apiTotal} · situation ${posTotal === null ? '—' : posTotal} · ${totalsOk ? 'concordant' : 'divergent'}`,
    totalsOk ? 'ok' : 'warn');

  /* E40-03 — bande d'ère : un seul aria-current, cohérent avec l'état partagé. */
  const bands = arr(document.querySelectorAll('.era-band.atlas-chrono-band'));
  const markedBands = bands.filter((band) => band.getAttribute('aria-current') === 'true');
  const markedEraId = markedBands.length === 1 ? (markedBands[0].dataset.eraId || '') : '';
  const eraOk = era
    ? (markedBands.length === 1 && markedEraId === era.id && sel.eraId === era.id)
    : markedBands.length === 0;
  const publicEraOk = !pos || !era || pos.eraName === era.name;
  put(panel, 'era',
    `${era ? era.name : 'aucune ère'} · marqueurs ${markedBands.length}/${bands.length} · public ${pos ? (pos.eraName || '—') : '—'} · ${eraOk && publicEraOk ? 'conforme' : 'divergent'}`,
    eraOk && publicEraOk ? 'ok' : 'warn');

  /* E40-04 — repère courant : carte active, fiche, rang et situation publique.
     Sous filtre, l'absence de carte active est un cas documenté, pas un défaut. */
  const cards = arr(document.querySelectorAll('#atlas-chrono-events .event-card'));
  const markedCards = cards.filter((card) => card.getAttribute('aria-current') === 'true');
  const markedEventId = markedCards.length === 1 ? (markedCards[0].dataset.eventId || '') : '';
  const kicker = textOf('.chronology-aside .aside-kicker');
  const expectedKicker = event ? `Repère ${snap.eventIndex + 1} / ${countryTotal}` : '';
  const kickerOk = !event || kicker === expectedKicker;
  const markOk = !event
    ? markedCards.length === 0
    : (markedCards.length === 0
      ? filtering
      : (markedCards.length === 1 && markedEventId === event.id && sel.eventId === event.id));
  const titleOk = !event || textOf('#atlas-chrono-event-title') === event.title;
  const publicEventOk = !pos || !event || pos.eventTitle === event.title;
  const eventOk = markOk && kickerOk && titleOk && publicEventOk;
  put(panel, 'event',
    `${event ? event.title : 'aucun repère'} · cartes ${markedCards.length}/${cards.length}${filtering && !markedCards.length ? ' (filtré)' : ''} · fiche ${titleOk ? 'conforme' : 'divergent'} · ${eventOk ? 'conforme' : 'divergent'}`,
    eventOk ? 'ok' : 'warn');

  /* E40-05 — fil local de la Chronologie contre le fil canonique du store et
     le fil de la coque ; seuls les niveaux communs sont comparés. */
  const trailNode = document.getElementById('nav-c2a-trail');
  const crumbs = trailNode
    ? arr(trailNode.querySelectorAll('.nav-c2-crumb')).map((node) => (node.textContent || '').trim())
    : [];
  const shellTrail = document.querySelector('.shell-trail');
  const shellCrumbs = shellTrail
    ? arr(shellTrail.querySelectorAll('.crumb')).map((node) => (node.textContent || '').trim())
    : [];
  const expectedTrail = selectionTrail().map((step) => step.label);
  const localTrailOk = expectedTrail.every((label, index) => crumbs[index] === label);
  const shellTrailOk = expectedTrail.every((label, index) => shellCrumbs[index] === label);
  const trailOk = localTrailOk && shellTrailOk;
  put(panel, 'trail',
    `local ${crumbs.length} · coque ${shellCrumbs.length} · ${expectedTrail.length} niveaux ${trailOk ? 'conformes' : 'divergents'}`,
    trailOk ? 'ok' : 'warn');

  /* E40-06 — lien local : le hash est la sérialisation canonique de l'état. */
  let linkText = 'miroir indisponible';
  let linkOk = false;
  try {
    const params = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    const v = params.get('v');
    const c = params.get('c') || '';
    const e = params.get('e');
    const r = params.get('r');
    linkOk = (v === null || v === 'chronology')
      && c === (snap.countryId || '')
      && (e === null || Number(e) === snap.eraIndex)
      && (r === null || Number(r) === snap.eventIndex);
    linkText = `v=${v || '—'} · c=${c || '—'} · e=${e === null ? '—' : e} · r=${r === null ? '—' : r} · ${linkOk ? 'conforme' : 'à restaurer'}`;
  } catch (_) {
    linkOk = false;
  }
  put(panel, 'link', linkText, linkOk ? 'ok' : 'warn');

  /* E40-07 — unicité des repères de situation, sans troisième région live. */
  const trails = document.querySelectorAll('#nav-c2a-trail').length;
  const lives = document.querySelectorAll('#nav-c2a-live').length;
  const progresses = document.querySelectorAll('#nav-c2a-progress').length;
  const panelSilent = panel.getAttribute('role') === 'group' && !panel.hasAttribute('aria-live');
  const markersOk = trails === 1 && lives === 1 && progresses === 1 && panelSilent;
  put(panel, 'markers',
    `fil ${trails}/1 · live ${lives}/1 · progression ${progresses}/1 · E40 sans live · ${markersOk ? 'conforme' : 'divergent'}`,
    markersOk ? 'ok' : 'warn');

  /* E40-08 — prédicat de cohérence unique du store (store.js:517-542). */
  const checks = [
    'noUnknownStateKeys', 'indicesBounded', 'modalsExclusive', 'playingCoherent',
    'previousViewCoherent', 'historyBounded', 'selectionCoherent',
    'boundsModesCoherent', 'deepLinkReady',
  ];
  const failed = diag ? checks.filter((key) => diag[key] === false) : checks.slice();
  const storeOk = !!diag && diag.allCoherent === true && failed.length === 0;
  put(panel, 'store',
    failed.length ? `${checks.length - failed.length}/${checks.length} · défaut ${failed[0]}`
      : `${checks.length}/${checks.length} prédicats · cohérent`,
    storeOk ? 'ok' : 'warn');

  /* E40-09 — bornes du routeur contre celles du store : les mêmes index
     pilotent le Récit, la Géographie et la Matrice des points. */
  const router = routerApi();
  const routerBounds = router && typeof router.navigationBounds === 'function'
    ? router.navigationBounds() : null;
  const parts = [];
  let boundsOk = true;
  for (const key of ['event', 'era', 'point', 'place']) {
    const storeBound = bounds[key] || {};
    const mode = storeBound.mode || '—';
    const index = Number.isFinite(storeBound.index) ? storeBound.index : 0;
    const total = Number.isFinite(storeBound.total) ? storeBound.total : 0;
    const routeBound = routerBounds ? routerBounds[key] : null;
    const aligned = !routeBound
      || (routeBound.mode === mode && routeBound.index === index && routeBound.total === total);
    if (!aligned) boundsOk = false;
    const short = { event: 'evt', era: 'ère', point: 'pt', place: 'lieu' }[key];
    parts.push(`${short} ${mode} ${index}/${total}`);
  }
  const snapBoundsOk = snap.eventIndex === bounds.event.index && snap.eraIndex === bounds.era.index
    && snap.pointIndex === bounds.point.index && snap.placeIndex === bounds.place.index;
  boundsOk = boundsOk && snapBoundsOk;
  put(panel, 'bounds',
    `${parts.join(' · ')} · ${boundsOk ? 'conformes' : 'divergents'}`,
    boundsOk ? 'ok' : 'warn');

  /* E40-10 — idempotence : un panneau, une feuille CSS, un abonnement. */
  const panels = document.querySelectorAll(`#${PANEL_ID}`).length;
  const guardsOk = panels === 1;
  put(panel, 'guards',
    `appliqué ${applies}× · panneaux ${panels} · CSS ${document.getElementById(CSS_ID) ? 1 : 0} · abonnement ${hashListener ? 1 : 0} · ${guardsOk ? 'stable' : 'doublon'}`,
    guardsOk ? 'ok' : 'warn');
}

if (typeof window !== 'undefined') {
  /* Surface de vérification en lecture seule, additivité sans effet au rendu. */
  window.VECTEMPOREL_E40 = Object.freeze({
    chantiers: () => CHANTIERS.slice(),
    state: () => Object.freeze({
      applies,
      panels: typeof document === 'undefined' ? 0 : document.querySelectorAll(`#${PANEL_ID}`).length,
      css: typeof document === 'undefined' ? false : !!document.getElementById(CSS_ID),
      hashListener,
    }),
  });
}

register('E40', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.el !== 'function') return;
  latest = ctx;
  applies += 1;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);

  /* Le registre ne purge pas ses tableaux : un seul abonnement, installé une
     fois, qui relit `latest` et le DOM courant — jamais un ctx périmé. */
  if (!hashListener && typeof window !== 'undefined') {
    hashListener = true;
    window.addEventListener('hashchange', refresh);
  }

  buildPanel(ctx);
  refresh();

  /* Le hash est récrit après `emit` et VATLAS publié après le premier `mount` :
     une seule microtâche par salve corrige ces deux décalages temporels. */
  scheduleRefresh();
});
