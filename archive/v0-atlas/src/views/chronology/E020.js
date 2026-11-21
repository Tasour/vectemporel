import { register } from './registry.js';
import {
  state,
  currentCountry,
  currentEra,
  currentEvent,
  selectionTrail,
  formatDeepLink,
  parseDeepLink,
} from '../../domain/store.js';

/* Lentille E020 — Cohérence inter-vues de la Chronologie (domaine D : données & sémantique).
 *
 * La chronologie n'est qu'une projection de l'état unique décrit dans `store.js`
 * et partagé avec le Monde, le Récit, la Géographie, la Constellation et la
 * Matrice des points. Cette lentille rend ces accords **falsifiables** dans un
 * panneau de contrôle, vérifie le miroir `data-country-id` et réconcilie
 * défensivement celui de `data-view` — sans jamais écrire dans un fichier
 * partagé, sans modifier l'état, sans toucher à un sélecteur de test.
 *
 * Toutes les valeurs affichées sont recalculées depuis `store.js` et le DOM
 * courant ; aucune donnée historique n'est inventée. Un seul panneau, un seul
 * jeu d'écouteurs, un seul observateur (E20-10).
 *
 * Zéro réseau, zéro aléa, zéro console, zéro `requestAnimationFrame`.
 * Les dix chantiers sont documentés dans UNIFIED_AUDIT/CHRONOLOGIE/views/E20.md.
 */

const CSS_ID = 'chronology-e20';
const PANEL_ID = 'chronology-e20-coherence';

const CSS = `
  #${PANEL_ID}{
    position:absolute;right:14px;top:86px;z-index:6;
    max-width:min(330px,42%);padding:8px 11px;pointer-events:none;
    border:1px solid var(--line);border-radius:9px;
    background:rgba(8,11,16,.9);color:var(--muted);
    font-size:10px;line-height:1.45;font-variant-numeric:tabular-nums;
  }
  #${PANEL_ID} .chronology-e20-kicker{
    display:block;margin:0 0 4px;color:var(--gold);font-size:9px;
    font-weight:600;letter-spacing:.14em;text-transform:uppercase;
  }
  #${PANEL_ID} p{display:flex;gap:6px;margin:0 0 2px}
  #${PANEL_ID} .chronology-e20-label{flex:0 0 88px;color:var(--ink-soft)}
  #${PANEL_ID} .chronology-e20-value{flex:1 1 auto;color:var(--ink);min-width:0}
  #${PANEL_ID} .chronology-e20-value[data-tone="warn"]{color:var(--red)}
  #${PANEL_ID} .chronology-e20-value[data-tone="ok"]{color:var(--gold-bright)}
  @media (max-width:700px){
    #${PANEL_ID}{left:8px;right:8px;top:8px;max-width:none;font-size:9px}
    #${PANEL_ID} .chronology-e20-label{flex-basis:76px}
  }
  @media (prefers-reduced-motion:reduce){#${PANEL_ID}{box-shadow:none}}
`;

/* État module : le contexte le plus récent, jamais une capture périmée. */
let latest = null;
let applies = 0;
let observer = null;
let observedLayout = null;
let hashInstalled = false;

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function textOf(selector) {
  const node = document.querySelector(selector);
  return node ? (node.textContent || '').trim() : '';
}

function put(panel, key, value, tone) {
  if (!panel) return;
  const node = panel.querySelector(`[data-e20-value="${key}"]`);
  if (!node) return;
  if (node.textContent !== value) node.textContent = value;
  const nextTone = tone || '';
  if (node.dataset.tone !== nextTone) {
    if (nextTone) node.dataset.tone = nextTone;
    else delete node.dataset.tone;
  }
}

/* E20-05 : toutes les grandeurs sont recalculées depuis le store, exactement
   comme le fait la vue (chronology.js:233-237). Aucun chiffre codé en dur. */
function derive() {
  const country = currentCountry();
  const era = currentEra();
  const event = currentEvent();
  const events = country ? arr(country.events) : [];
  const eraEvents = era ? events.filter((item) => item.eraId === era.id) : [];
  const posInEra = event ? eraEvents.findIndex((item) => item.id === event.id) + 1 : 0;
  return {
    country,
    era,
    event,
    eras: country ? arr(country.eras).length : 0,
    events: events.length,
    eraEvents: eraEvents.length,
    posInEra,
    points: event ? arr(event.points).length : 0,
  };
}

function buildPanel(ctx) {
  if (document.getElementById(PANEL_ID)) return;
  const panel = ctx.el('section', 'chronology-e20-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-label', 'Contrôle de cohérence inter-vues de la chronologie');
  panel.appendChild(ctx.el('span', 'chronology-e20-kicker', 'Cohérence inter-vues'));
  const keys = [
    ['identity', 'Pays courant'],
    ['view', 'Vue déclarée'],
    ['era', 'Ère courante'],
    ['event', 'Repère courant'],
    ['totals', 'Compteurs'],
    ['trail', 'Fil de situation'],
    ['link', 'Lien local'],
    ['landmarks', 'Repères uniques'],
    ['aside', 'Fiche du repère'],
    ['guards', 'Greffon'],
  ];
  for (const [key, label] of keys) {
    const line = ctx.el('p', 'chronology-e20-line');
    line.dataset.e20 = key;
    const value = ctx.el('span', 'chronology-e20-value', '—');
    value.dataset.e20Value = key;
    line.append(ctx.el('span', 'chronology-e20-label', label), value);
    panel.appendChild(line);
  }
  ctx.stage.appendChild(panel);
}

/* E20-01 à E20-10 : un seul point de lecture, réinterrogeant le DOM courant. */
function refresh() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  const ctx = latest;
  const d = derive();
  const stateId = state.countryId || null;
  const layout = ctx && ctx.layout ? ctx.layout : document.querySelector('.chronology-layout');

  /* E20-01 — identité du pays : en-tête et miroir du layout contre l'état. */
  const title = document.getElementById('atlas-chrono-title');
  const titleText = title ? (title.textContent || '').trim() : '';
  const expectedTitle = d.country ? `Chronologie · ${d.country.name}` : '';
  const layoutId = layout && layout.dataset ? (layout.dataset.countryId || '') : '';
  const idOk = layoutId === (stateId || '') && titleText === expectedTitle;
  put(panel, 'identity',
    d.country
      ? `${d.country.name} · ${d.country.code || '—'} · ${idOk ? 'aligné' : 'divergent'}`
      : `aucun pays sélectionné · ${idOk ? 'aligné' : 'divergent'}`,
    idOk ? 'ok' : 'warn');

  /* E20-02 — miroir `data-view` : réconciliation défensive vers 'chronology'. */
  const declared = layout && layout.dataset ? (layout.dataset.view || '') : '';
  const viewOk = declared === 'chronology' && state.view === 'chronology';
  if (!viewOk && layout && layout.dataset && state.view === 'chronology') {
    layout.dataset.view = 'chronology';
  }
  put(panel, 'view',
    `attendu « chronology » · lu « ${declared || '—'} » · ${viewOk ? 'conforme' : 'corrigé'}`,
    viewOk ? 'ok' : 'warn');

  /* E20-03 — bande d'ère : exactement un aria-current, sur la bonne ère. */
  const bands = Array.prototype.slice.call(document.querySelectorAll('#atlas-chrono-eras .era-band'));
  const markedBands = bands.filter((band) => band.getAttribute('aria-current') === 'true');
  const activeBands = bands.filter((band) => band.classList.contains('is-active'));
  const expectedBand = d.era
    ? bands.find((band) => band.getAttribute('data-era-id') === d.era.id)
    : null;
  const indexOk = expectedBand ? bands.indexOf(expectedBand) === state.eraIndex : true;
  const eraOk = d.era
    ? (markedBands.length === 1 && markedBands[0] === expectedBand
      && activeBands.length === 1 && activeBands[0] === expectedBand && indexOk)
    : (markedBands.length === 0 && activeBands.length === 0);
  put(panel, 'era',
    `bandes ${bands.length} · marqueurs ${markedBands.length} · ère ${state.eraIndex + 1}/${d.eras} · ${d.era ? d.era.name : 'aucune'} · ${eraOk ? 'conforme' : 'divergent'}`,
    eraOk ? 'ok' : 'warn');

  /* E20-04 — repère courant : unicité de aria-current dans la liste rendue. */
  const cards = Array.prototype.slice.call(document.querySelectorAll('#atlas-chrono-events .event-card'));
  const markedCards = cards.filter((card) => card.getAttribute('aria-current') === 'true');
  const activeCards = cards.filter((card) => card.classList.contains('is-active'));
  const expectedCard = d.event
    ? cards.find((card) => card.getAttribute('data-event-id') === d.event.id)
    : null;
  let eventOk;
  let eventText;
  if (!d.event) {
    eventOk = markedCards.length === 0 && activeCards.length === 0;
    eventText = `aucun repère · marqueurs ${markedCards.length}`;
  } else if (!expectedCard) {
    /* Le filtre local peut masquer le repère courant sans changer l'état. */
    eventOk = markedCards.length === 0 && activeCards.length === 0;
    eventText = `repère « ${d.event.title} » masqué par le filtre · marqueurs ${markedCards.length}`;
  } else {
    eventOk = markedCards.length === 1 && markedCards[0] === expectedCard
      && activeCards.length === 1 && activeCards[0] === expectedCard;
    eventText = `${d.event.title} · marqueurs ${markedCards.length} · rang global ${state.eventIndex + 1}/${d.events}`;
  }
  put(panel, 'event', `${eventText} · ${eventOk ? 'conforme' : 'divergent'}`, eventOk ? 'ok' : 'warn');

  /* E20-05 — compteurs dérivés contre les inscriptions visibles. */
  const status = textOf('#atlas-chrono-status');
  const progress = textOf('#nav-c2a-progress');
  /* En mode filtre, la vue remplace le suffixe de position par un périmètre
     de recherche (chronology.js:249-255) : le contrôle s'_aligne sur ce cas. */
  const filtering = status.indexOf('Recherche dans les') === 0;
  const statusOk = !d.country || filtering || (
    status.indexOf(`Repère ${d.posInEra}/${d.eraEvents} dans l'ère`) !== -1
    && status.indexOf(`rang global ${state.eventIndex + 1}/${d.events}`) !== -1
  );
  const progressOk = !d.country || (
    progress.indexOf(`Ère ${state.eraIndex + 1}/${d.eras}`) !== -1
    && progress.indexOf(`repère ${d.posInEra}/${d.eraEvents} dans l'ère`) !== -1
    && progress.indexOf(`rang global ${state.eventIndex + 1}/${d.events}`) !== -1
    && progress.indexOf(`points du repère ${d.points}.`) !== -1
  );
  const totalsOk = statusOk && progressOk;
  put(panel, 'totals',
    `${d.eras} ères · ${d.events} repères · ${d.eraEvents} dans l'ère · ${d.points} points · ${totalsOk ? 'concordant' : 'à vérifier'}`,
    totalsOk ? 'ok' : 'warn');

  /* E20-06 — fil de situation local aligné sur selectionTrail() du store. */
  const expectedTrail = selectionTrail().map((step) => step.label);
  const crumbs = Array.prototype.slice
    .call(document.querySelectorAll('#nav-c2a-trail .nav-c2-crumb'))
    .map((node) => (node.textContent || '').trim());
  const commonOk = expectedTrail.every((label, index) => crumbs[index] === label);
  const currentCrumb = document.querySelector('#nav-c2a-trail .nav-c2-crumb.is-current');
  const currentOk = expectedTrail.length >= 3
    ? !!currentCrumb && (currentCrumb.textContent || '').trim() === expectedTrail[expectedTrail.length - 1]
    : true;
  const pointsCrumbOk = (crumbs[4] || '').indexOf(`Points du repère (${d.points})`) !== -1;
  const trailOk = commonOk && currentOk && pointsCrumbOk;
  put(panel, 'trail', `${crumbs.slice(0, 4).join(' › ') || '—'} · ${trailOk ? 'conforme' : 'divergent'}`,
    trailOk ? 'ok' : 'warn');

  /* E20-07 — miroir du lien local : hash ↔ sérialisation canonique du store. */
  let linkText = 'miroir indisponible';
  let linkOk = true;
  let linkTone = 'ok';
  try {
    const parsed = parseDeepLink(window.location.hash);
    const raw = (window.location.hash || '').replace(/^#/, '');
    linkOk = !!parsed
      && parsed.view === state.view
      && (parsed.countryId || null) === stateId
      && parsed.eraIndex === state.eraIndex
      && parsed.eventIndex === state.eventIndex
      && raw === formatDeepLink(state);
    linkText = parsed
      ? `v=${parsed.view} · c=${parsed.countryId || '—'} · e=${parsed.eraIndex} · r=${parsed.eventIndex} · ${linkOk ? 'conforme' : 'divergent'}`
      : `hash illisible · ${linkOk ? 'conforme' : 'divergent'}`;
    linkTone = linkOk ? 'ok' : 'warn';
  } catch (_) {
    linkTone = 'warn';
  }
  put(panel, 'link', linkText, linkTone);

  /* E20-08 — unicité des repères de situation, sans troisième région live. */
  const lives = document.querySelectorAll('#nav-c2a-live').length;
  const trails = document.querySelectorAll('#nav-c2a-trail').length;
  const progresses = document.querySelectorAll('#nav-c2a-progress').length;
  const statuses = document.querySelectorAll('#atlas-chrono-status').length;
  const live = document.getElementById('nav-c2a-live');
  const liveOk = !!live && live.getAttribute('role') === 'status'
    && live.getAttribute('aria-live') === 'polite';
  const landmarksOk = lives === 1 && trails === 1 && progresses === 1 && statuses === 1 && liveOk;
  put(panel, 'landmarks',
    `live ${lives}/1 · fil ${trails}/1 · progression ${progresses}/1 · statut ${statuses}/1 · E20 sans live`,
    landmarksOk ? 'ok' : 'warn');

  /* E20-09 — fiche latérale alignée sur le repère courant et ses sources. */
  const aside = document.getElementById('atlas-chrono-aside');
  const asideTitle = document.getElementById('atlas-chrono-event-title');
  const pointsTitle = document.getElementById('atlas-chrono-points-title');
  const pointNodes = aside ? arr(aside.querySelectorAll('.point')) : [];
  const sourceNodes = aside ? arr(aside.querySelectorAll('[data-source-id]')) : [];
  const sourceIds = d.country ? arr(d.country.sources).map((source) => source && source.id) : [];
  const sourcesOk = sourceNodes.every((node) => sourceIds.indexOf(node.getAttribute('data-source-id')) !== -1);
  const titleOk = !d.event || (!!asideTitle && (asideTitle.textContent || '').trim() === d.event.title);
  const pointsHeadingOk = !d.event
    || (!!pointsTitle && (pointsTitle.textContent || '').trim() === `Points du repère (${d.points})`);
  const pointCountOk = !d.event || pointNodes.length === d.points;
  const labelledOk = !d.event
    || !!(aside && aside.getAttribute('aria-labelledby') === 'atlas-chrono-event-title');
  const asideOk = titleOk && pointsHeadingOk && pointCountOk && sourcesOk && labelledOk;
  put(panel, 'aside',
    `${d.event ? d.event.title : 'aucun repère'} · points ${pointNodes.length}/${d.points} · sources ${sourceNodes.length} · ${asideOk ? 'conforme' : 'divergent'}`,
    asideOk ? 'ok' : 'warn');

  /* E20-10 — idempotence : un panneau, un observateur, un écouteur de hash. */
  const panels = document.querySelectorAll(`#${PANEL_ID}`).length;
  const guardsOk = panels === 1;
  put(panel, 'guards',
    `appliqué ${applies}× · panneaux ${panels} · observateur ${observer ? 1 : 0} · écouteur ${hashInstalled ? 1 : 0}`,
    guardsOk ? 'ok' : 'warn');
}

/* E20-02 : un seul observateur d'attributs, réarmé si le layout change
   d'identité (coque reconstruite). La réécriture est gardée par égalité, donc
   elle ne boucle pas : au plus deux callbacks par dérive. */
function ensureObserver(layout) {
  if (typeof MutationObserver === 'undefined' || !layout) return;
  if (observer && observedLayout === layout) return;
  if (observer) observer.disconnect();
  observer = new MutationObserver(() => { refresh(); });
  observer.observe(layout, { attributes: true, attributeFilter: ['data-country-id', 'data-view'] });
  observedLayout = layout;
}

register('E20', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  if (state.view !== 'chronology') return;
  if (!document.getElementById('atlas-chrono-main')) return;

  latest = ctx;
  applies += 1;
  buildPanel(ctx);
  refresh();
  ensureObserver(ctx.layout);

  if (!hashInstalled && typeof window !== 'undefined') {
    hashInstalled = true;
    window.addEventListener('hashchange', refresh);
  }
});
