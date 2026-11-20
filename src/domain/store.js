/* État unique de Vectemporel. Aucune vue ne possède son propre état permanent.
 * Machine à états — audit T4 (UNIFIED_AUDIT/NAVIGATION/views/t4-etat-atlas.md).
 * T4-01 : une seule porte d'écriture (set), validée et journalisée.
 */
import { DATASET } from '../data/dataset.js';

const listeners = new Set();

// ATLAS-COQUE-09 / coordination atlas-recit : cadence d'auto-lecture configurable.
export const DEFAULT_AUTOPLAY_MS = 5000;

const VIEWS = ['globe', 'chronology', 'recit', 'geography', 'constellation', 'points'];
const VIEW_LABELS = Object.freeze({
  globe: 'Monde', chronology: 'Chronologie', recit: 'Récit',
  geography: 'Géographie', constellation: 'Constellation', points: 'Points',
});
// T4-08 : hiérarchie explicite, macro (0) → micro (2).
// 'points' est une vue micro transversale (matrice des points validés).
export const VIEW_LEVEL = Object.freeze({
  globe: 0, chronology: 1, constellation: 1, geography: 2, recit: 2, points: 2,
});
const MAX_HISTORY = 12; // T4-05 : profondeur d'annulation bornée.

// T4-02 / arbitrage avec T2 : convention unique des bornes d'index.
// Les repères, ères et lieux sont clampés ; les points du récit rebouclent
// volontairement (boucle d'auto-lecture, keyboard.js:246-261). Ce contrat
// doit rester identique à window.VECTEMPOREL_KEYS.navigationBounds().
export const INDEX_MODES = Object.freeze({
  event: 'clamp', era: 'clamp', point: 'wrap', place: 'clamp',
});

const WRITABLE_KEYS = new Set([
  'view', 'previousView', 'countryId', 'eraIndex', 'eventIndex', 'pointIndex',
  'placeIndex', 'scope', 'playing', 'detailOpen', 'helpOpen', 'autoplayMs',
  'pointFilterDomain', 'pointFilterFamily',
]);
const INTERNAL_KEYS = new Set(['revision', 'notice', 'noticeRevision', 'rejectedWrites']);
const KNOWN_KEYS = new Set([...WRITABLE_KEYS, ...INTERNAL_KEYS]);

export const state = {
  view: 'globe',        // globe | chronology | recit | geography | constellation | points
  previousView: null,   // T4-04 : vue quittée à la dernière transition
  countryId: null,
  eraIndex: 0,
  eventIndex: 0,
  pointIndex: 0,
  placeIndex: 0,
  pointFilterDomain: '*',
  pointFilterFamily: '*',
  scope: 'era',         // era | country
  playing: false,
  detailOpen: false,
  helpOpen: false,      // ATLAS-COQUE-05 : état désormais déclaré (coque + clavier)
  autoplayMs: DEFAULT_AUTOPLAY_MS,
  // Filtres de la vue Points (surface voisine) : '*' = aucun filtre.
  pointFilterDomain: '*',
  pointFilterFamily: '*',
  // Champs internes : journal et annonces, non écrivables via set() (T4-01, T4-07).
  revision: 0,
  notice: '',
  noticeRevision: 0,
  rejectedWrites: 0,
};

// T4-05 : pile d'historique, module-privée, bornée, sans doublons consécutifs.
const history = [];

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(reason) {
  for (const listener of listeners) listener(state, reason);
}

// T4-02 : entier borné, repli déterministe sur 0 (aucun aléa).
function boundedIndex(value, max) {
  const top = Math.max(0, Math.trunc(Number.isFinite(max) ? max : 0));
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(top, Math.trunc(number)));
}

// T4-01 : conversion et validation d'une seule clé ; undefined = refus.
function coerce(key, value) {
  switch (key) {
    case 'view':
      return VIEWS.includes(value) ? value : undefined;
    case 'previousView':
      return value === null ? null : (VIEWS.includes(value) ? value : undefined);
    case 'countryId':
      if (value === null || value === '') return null;
      return DATASET.countries.some((country) => country.id === value) ? value : undefined;
    case 'eraIndex': case 'eventIndex': case 'pointIndex': case 'placeIndex': {
      const number = Number(value);
      return Number.isFinite(number) ? Math.trunc(number) : 0;
    }
    case 'scope':
      return value === 'era' || value === 'country' ? value : undefined;
    case 'playing': case 'detailOpen': case 'helpOpen':
      return Boolean(value);
    case 'autoplayMs': {
      const number = Number(value);
      return Number.isFinite(number) ? number : undefined;
    }
    case 'pointFilterDomain': case 'pointFilterFamily':
      return typeof value === 'string' && value ? value : '*';
    default:
      return undefined;
  }
}

function filteredPlaces(places) {
  return (places || []).filter((place) => place && place.lat !== null && place.lon !== null);
}

// T4-06 : retrouver l'objet sélectionné par identité dans la nouvelle collection.
function preservedPlaceIn(nextPlaces) {
  const before = currentPlaces();
  const previous = before[boundedIndex(state.placeIndex, before.length - 1)];
  if (!previous) return 0;
  const found = nextPlaces.findIndex((place) => place.id === previous.id);
  return found >= 0 ? found : 0;
}

function preservedPlaceForScope(scope) {
  const country = currentCountry();
  const event = currentEvent();
  return preservedPlaceIn(filteredPlaces(scope === 'country' ? country?.places : event?.places));
}

function preservedPointIndex(nextEvent) {
  const previous = currentPoint();
  if (!previous || !nextEvent) return 0;
  const found = (nextEvent.points || []).findIndex((point) => point.id === previous.id);
  return found >= 0 ? found : 0;
}

// T4-03 : une seule modale maximum, quelle que soit la source du patch.
function resolveModals(changes) {
  const keys = Object.keys(changes);
  let help = Object.prototype.hasOwnProperty.call(changes, 'helpOpen') ? changes.helpOpen : state.helpOpen;
  let detail = Object.prototype.hasOwnProperty.call(changes, 'detailOpen') ? changes.detailOpen : state.detailOpen;
  if (!help || !detail) return { helpOpen: help, detailOpen: detail };
  const helpRequested = keys.includes('helpOpen') && changes.helpOpen === true;
  const detailRequested = keys.includes('detailOpen') && changes.detailOpen === true;
  if (detailRequested && !helpRequested) help = false;
  else if (helpRequested && !detailRequested) detail = false;
  else if (helpRequested && detailRequested) {
    if (keys.indexOf('helpOpen') > keys.indexOf('detailOpen')) detail = false;
    else help = false;
  } else {
    detail = false; // état corrompu sans demande explicite : l'aide gagne
  }
  return { helpOpen: help, detailOpen: detail };
}

// T4-07 : annonces dérivées du DATASET et d'étiquettes d'interface, jamais inventées.
function buildNotice(reason) {
  const country = currentCountry();
  const event = currentEvent();
  switch (reason) {
    case 'country':
      return country ? `Pays ${country.name}. ${country.events.length} repères disponibles.` : 'Aucun pays sélectionné.';
    case 'era': {
      const era = currentEra();
      return era ? `Ère ${era.name}.` : 'Ère indisponible.';
    }
    case 'event':
      return event ? `Repère ${state.eventIndex + 1} sur ${country ? country.events.length : 0} : ${event.title}.` : 'Repère indisponible.';
    case 'point':
      return event ? `Point ${state.pointIndex + 1} sur ${event.points.length} du repère ${event.title}.` : 'Point indisponible.';
    case 'place': {
      const place = currentPlaces()[state.placeIndex];
      return place ? `Lieu ${place.label}.` : 'Lieu indisponible.';
    }
    case 'scope':
      return state.scope === 'era' ? 'Périmètre : lieux du repère.' : 'Périmètre : lieux du pays.';
    case 'view':
      return `Vue ${VIEW_LABELS[state.view] || state.view}${state.previousView ? `, depuis ${VIEW_LABELS[state.previousView] || state.previousView}` : ''}.`;
    case 'back':
      return `Retour à la vue ${VIEW_LABELS[state.view] || state.view}.`;
    case 'help':
      return state.helpOpen ? 'Aide clavier ouverte.' : 'Aide clavier fermée.';
    case 'detail':
      return state.detailOpen && event ? `Détail ouvert : ${event.title}.` : 'Détail fermé.';
    case 'play':
      return state.playing ? 'Lecture automatique en cours.' : 'Lecture automatique en pause.';
    case 'autoplay':
      return `Cadence de lecture : ${Math.round(state.autoplayMs / 1000)} secondes.`;
    case 'chrono-filter':
      return 'Filtre de la chronologie actualisé.';
    case 'filter':
      return 'Filtre des points actualisé.';
    case 'deep-link':
      return 'État restauré depuis le lien.';
    default:
      return 'État de l’atlas actualisé.';
  }
}

// T4-02 : bornage inconditionnel, après commit, sur la sélection courante.
function normalizeIndices() {
  const country = currentCountry();
  state.eraIndex = boundedIndex(state.eraIndex, (country?.eras.length || 1) - 1);
  state.eventIndex = boundedIndex(state.eventIndex, (country?.events.length || 1) - 1);
  const pointTotal = state.view === 'points'
    ? (currentCountry()?.points.length || 1)
    : (currentEvent()?.points.length || 1);
  state.pointIndex = boundedIndex(state.pointIndex, pointTotal - 1);
  state.placeIndex = boundedIndex(state.placeIndex, (currentPlaces().length || 1) - 1);
}

// ATLAS-COQUE-05 : action centrale, unique porte d'écriture de l'état.
export function set(patch, reason = 'update') {
  const source = patch && typeof patch === 'object' ? patch : {};
  const emittedReason = typeof reason === 'string' && reason ? reason : 'update';
  let changes = {};
  let rejected = 0;
  for (const key of Object.keys(source)) {
    if (!WRITABLE_KEYS.has(key)) { rejected += 1; continue; }
    const value = coerce(key, source[key]);
    if (value === undefined) { rejected += 1; continue; }
    changes[key] = value;
  }

  // T4-06 : un changement de périmètre conserve le lieu par identité,
  // y compris quand la vue écrit directement set({ scope }) (geography.js:337).
  if (Object.prototype.hasOwnProperty.call(changes, 'scope')
      && changes.scope !== state.scope
      && !Object.prototype.hasOwnProperty.call(changes, 'placeIndex')) {
    changes = { ...changes, placeIndex: preservedPlaceForScope(changes.scope) };
  }

  // T4-03 et T4-10 : invariants garantis à l'écriture.
  Object.assign(changes, resolveModals(changes));
  if (changes.helpOpen || changes.detailOpen) changes.playing = false;
  const nextView = Object.prototype.hasOwnProperty.call(changes, 'view') ? changes.view : state.view;
  if (changes.playing && nextView !== 'recit') changes.playing = false;
  if (Object.prototype.hasOwnProperty.call(changes, 'autoplayMs')) {
    changes.autoplayMs = Math.max(1000, Math.min(60000, Math.round(changes.autoplayMs)));
  }

  Object.assign(state, changes);
  normalizeIndices();
  state.revision += 1;
  state.rejectedWrites += rejected;
  state.notice = buildNotice(emittedReason);
  state.noticeRevision += 1;
  emit(emittedReason);
  reflectHash(); // T4-09 : réflexion canonique, sans boucle.
}

// T4-04 / T4-05 : transition avec mémoire d'origine et historique borné.
function pushHistory(view) {
  if (!view || !VIEWS.includes(view)) return;
  if (history[history.length - 1] === view) return;
  history.push(view);
  if (history.length > MAX_HISTORY) history.shift();
}

function transition(patch, reason, options = {}) {
  let next = patch;
  if (options.record && typeof patch.view === 'string' && patch.view !== state.view) {
    pushHistory(state.view);
    next = { ...patch, previousView: state.view };
  }
  set(next, reason);
}

export function selectCountry(id) {
  const country = DATASET.countries.find((item) => item.id === id);
  if (!country) return false;
  transition({
    countryId: id, eraIndex: 0, eventIndex: 0, pointIndex: 0, placeIndex: 0,
    scope: 'era', detailOpen: false, helpOpen: false, playing: false, view: 'chronology',
  }, 'country', { record: true });
  return true;
}

export function selectEra(index) {
  const country = currentCountry();
  if (!country || !country.eras.length) return;
  const eraIndex = boundedIndex(index, country.eras.length - 1);
  const era = country.eras[eraIndex];
  const first = country.events.findIndex((event) => event.eraId === era.id);
  const nextEvent = first >= 0 ? country.events[first] : null;
  const nextPlaces = filteredPlaces(state.scope === 'country' ? country.places : nextEvent?.places);
  set({
    eraIndex,
    eventIndex: first >= 0 ? first : 0,
    pointIndex: preservedPointIndex(nextEvent),
    placeIndex: preservedPlaceIn(nextPlaces),
    detailOpen: false,
  }, 'era');
}

export function selectEvent(index) {
  const country = currentCountry();
  if (!country || !country.events.length) return;
  const eventIndex = boundedIndex(index, country.events.length - 1);
  const event = country.events[eventIndex];
  const eraIndex = country.eras.findIndex((era) => era.id === event.eraId);
  const nextPlaces = filteredPlaces(state.scope === 'country' ? country.places : event.places);
  set({
    eventIndex,
    eraIndex: eraIndex >= 0 ? eraIndex : 0,
    pointIndex: preservedPointIndex(event),
    placeIndex: preservedPlaceIn(nextPlaces),
  }, 'event');
}

export function stepEvent(delta) {
  selectEvent(state.eventIndex + delta);
}

export function stepEra(delta) {
  selectEra(state.eraIndex + delta);
}

// ATLAS-COQUE-09 : les deux modales s'excluent, goView les ferme toutes les deux.
// T4-06 : goView ne touche jamais à la sélection.
export function goView(view) {
  if (!VIEWS.includes(view)) return;
  transition({ view, detailOpen: false, helpOpen: false, playing: false }, 'view', { record: true });
}

// T4-04 : retour à la vue d'origine ; T4-05 : dépile l'historique.
export function goBack() {
  let target = history.pop();
  while (target && target === state.view) target = history.pop();
  if (!target) target = 'globe';
  const previousView = history.length ? history[history.length - 1] : null;
  set({ view: target, previousView, detailOpen: false, helpOpen: false, playing: false }, 'back');
  return target;
}

export function getHistory() {
  return history.slice();
}

export function clearHistory() {
  history.length = 0;
}

// ATLAS-COQUE-05 : actions centralisées, le routeur ne manipule plus l'état brut.
export function stepPoint(delta) {
  const total = currentEvent()?.points.length || 0;
  if (!total) return;
  const step = Number.isFinite(Number(delta)) ? Math.trunc(Number(delta)) : 0;
  set({ pointIndex: boundedIndex((state.pointIndex + step + total * 2) % total, total - 1) }, 'point');
}

export function stepPlace(delta) {
  const total = currentPlaces().length;
  if (!total) return;
  const step = Number.isFinite(Number(delta)) ? Math.trunc(Number(delta)) : 0;
  set({ placeIndex: boundedIndex(state.placeIndex + step, total - 1) }, 'place');
}

export function togglePlay() {
  set({ playing: !state.playing }, 'play');
}

// Bornes accessibles : 1 s mini (WCAG 2.2.2), 60 s maxi.
export function setAutoplayMs(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value)) return;
  const autoplayMs = Math.max(1000, Math.min(60000, Math.round(value)));
  if (autoplayMs === state.autoplayMs) return;
  set({ autoplayMs }, 'autoplay');
}

export function toggleScope() {
  const scope = state.scope === 'era' ? 'country' : 'era';
  set({ scope, placeIndex: preservedPlaceForScope(scope) }, 'scope');
}

export function toggleHelp() {
  set({ helpOpen: !state.helpOpen, detailOpen: false }, 'help');
}

export function toggleDetail() {
  if (!currentEvent()) return;
  set({ detailOpen: !state.detailOpen, helpOpen: false }, 'detail');
}

export function closeModal() {
  if (state.helpOpen) set({ helpOpen: false }, 'help');
  else if (state.detailOpen) set({ detailOpen: false }, 'detail');
}

export function closeAllModals() {
  if (!state.helpOpen && !state.detailOpen) return;
  set({ helpOpen: false, detailOpen: false }, 'modal');
}

export function currentCountry() {
  return DATASET.countries.find((country) => country.id === state.countryId) || null;
}

export function currentEra() {
  return currentCountry()?.eras[state.eraIndex] || null;
}

export function currentEvent() {
  return currentCountry()?.events[state.eventIndex] || null;
}

export function currentPoint() {
  return currentEvent()?.points[state.pointIndex] || null;
}

export function currentPlaces() {
  const country = currentCountry();
  if (!country) return [];
  const event = currentEvent();
  const linked = event?.places || [];
  return (state.scope === 'country' ? country.places : linked).filter((place) => place.lat !== null && place.lon !== null);
}

export function countryByCode(code) {
  return DATASET.countries.find((country) => country.code === code) || null;
}

// T4-01 : instantané en lecture seule pour les consommateurs.
export function getSnapshot() {
  return Object.freeze({ ...state });
}

// T4-07 : annonce versionnée, même quand le texte se répète.
export function getNotice() {
  return Object.freeze({ text: state.notice, revision: state.noticeRevision });
}

// T4-06 : sélection adressable, dérivée des identifiants du jeu de données.
export function selectionSnapshot() {
  const country = currentCountry();
  const era = currentEra();
  const event = currentEvent();
  const point = currentPoint();
  const place = currentPlaces()[state.placeIndex] || null;
  return Object.freeze({
    countryId: state.countryId,
    eraId: era?.id || null,
    eventId: event?.id || null,
    pointId: point?.id || null,
    placeId: place?.id || null,
    scope: state.scope,
  });
}

// T4-08 : macro → micro, transitions explicites et fil dérivé du store.
export function viewLevel(view = state.view) {
  return VIEW_LEVEL[view] ?? 0;
}

export function selectionTrail() {
  const country = currentCountry();
  const era = currentEra();
  const event = currentEvent();
  const trail = [Object.freeze({ level: 'monde', label: 'Monde', view: 'globe' })];
  if (!country) return trail;
  trail.push(Object.freeze({ level: 'pays', label: country.name, view: 'chronology' }));
  if (era) trail.push(Object.freeze({ level: 'ère', label: era.name, view: 'chronology' }));
  if (event) trail.push(Object.freeze({ level: 'repère', label: event.title, view: 'chronology' }));
  if (event && state.view === 'recit') {
    trail.push(Object.freeze({ level: 'point', label: `Point ${state.pointIndex + 1}`, view: 'recit' }));
  }
  return trail;
}

export function goDeeper() {
  if (state.helpOpen || state.detailOpen) return false;
  if (state.view === 'globe') {
    if (!state.countryId) return false;
    goView('chronology');
    return true;
  }
  if (state.view === 'chronology') {
    goView('recit');
    return true;
  }
  return false;
}

export function goShallower() {
  if (state.helpOpen || state.detailOpen) {
    closeModal();
    return true;
  }
  if (viewLevel() >= 2) {
    goView('chronology');
    return true;
  }
  if (state.view === 'chronology') {
    goView('globe');
    return true;
  }
  return false;
}

// T4-02 : miroir canonique du hook du routeur (VECTEMPOREL_KEYS.navigationBounds).
// Même forme : { mode, index, total } ; le store reste propriétaire du mode.
export function getBounds() {
  const country = currentCountry();
  return Object.freeze({
    event: Object.freeze({ mode: INDEX_MODES.event, index: state.eventIndex, total: country?.events.length || 0 }),
    era: Object.freeze({ mode: INDEX_MODES.era, index: state.eraIndex, total: country?.eras.length || 0 }),
    point: Object.freeze({ mode: INDEX_MODES.point, index: state.pointIndex, total: currentEvent()?.points.length || 0 }),
    place: Object.freeze({ mode: INDEX_MODES.place, index: state.placeIndex, total: currentPlaces().length }),
  });
}

// T4-10 : un seul prédicat de cohérence, vérifiable sans rejouer les vues.
export function getDiagnostics() {
  const country = currentCountry();
  const eras = country?.eras.length || 0;
  const events = country?.events.length || 0;
  const points = currentEvent()?.points.length || 0;
  const places = currentPlaces().length;
  const diagnostics = {
    noUnknownStateKeys: Object.keys(state).every((key) => KNOWN_KEYS.has(key)),
    indicesBounded: state.eraIndex === boundedIndex(state.eraIndex, eras - 1)
      && state.eventIndex === boundedIndex(state.eventIndex, events - 1)
      && state.pointIndex === boundedIndex(state.pointIndex, points - 1)
      && state.placeIndex === boundedIndex(state.placeIndex, places - 1),
    modalsExclusive: !(state.helpOpen && state.detailOpen),
    playingCoherent: !state.playing || (state.view === 'recit' && !state.helpOpen && !state.detailOpen),
    previousViewCoherent: state.previousView === null || VIEWS.includes(state.previousView),
    historyBounded: history.length <= MAX_HISTORY,
    selectionCoherent: !country || (state.eraIndex < eras && state.eventIndex < events),
    boundsModesCoherent: (() => {
      const router = typeof window === 'undefined' ? null : window.VECTEMPOREL_KEYS?.navigationBounds?.();
      if (!router) return true;
      return Object.keys(INDEX_MODES).every((key) => !router[key] || router[key].mode === INDEX_MODES[key]);
    })(),
    deepLinkReady,
  };
  return Object.freeze({ ...diagnostics, allCoherent: Object.values(diagnostics).every(Boolean) });
}

// T4-09 : deep links locaux, zéro réseau, réflexion par replaceState (pas d'historique ajouté).
let deepLinkReady = false;
let deepLinkReflect = true;
let suppressReflect = false;
let lastReflectedHash = null;

export function formatDeepLink(snapshot = state) {
  const params = new URLSearchParams();
  params.set('v', VIEWS.includes(snapshot.view) ? snapshot.view : 'globe');
  params.set('c', snapshot.countryId || '');
  params.set('e', String(boundedIndex(snapshot.eraIndex, 999)));
  params.set('r', String(boundedIndex(snapshot.eventIndex, 999)));
  params.set('p', String(boundedIndex(snapshot.pointIndex, 999)));
  params.set('l', String(boundedIndex(snapshot.placeIndex, 999)));
  params.set('s', snapshot.scope === 'country' ? 'country' : 'era');
  params.set('fd', snapshot.pointFilterDomain || '*');
  params.set('ff', snapshot.pointFilterFamily || '*');
  if (snapshot.detailOpen) params.set('d', '1');
  if (snapshot.helpOpen) params.set('h', '1');
  return params.toString();
}

/* Anciens liens du POC : #/france/1789-1799/fr-revolution.
 * Adaptateur sans réseau : pays, ère par année, repère par identifiant. */
function parseLegacyLink(raw) {
  const parts = raw.replace(/^\//, '').split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const country = DATASET.countries.find((item) => item.id === parts[0]);
  if (!country) return null;
  const year = Number(String(parts[1]).match(/-?\d{1,5}/)?.[0] ?? NaN);
  const out = { view: 'chronology', countryId: country.id, detailOpen: false };
  if (Number.isFinite(year)) {
    const eraIndex = country.eras.findIndex((era) => year >= era.start && year <= era.end);
    if (eraIndex >= 0) out.eraIndex = eraIndex;
    const eventIndex = country.events.findIndex((event) => event.year === year);
    if (eventIndex >= 0) out.eventIndex = eventIndex;
  }
  const slug = parts[2];
  if (slug) {
    const eventIndex = country.events.findIndex((event) => event.id === slug);
    if (eventIndex >= 0) {
      out.eventIndex = eventIndex;
      out.eraIndex = country.eras.findIndex((era) => country.events[eventIndex].eraId === era.id);
      out.detailOpen = true;
    }
  }
  return out;
}

export function parseDeepLink(hash) {
  if (typeof hash !== 'string') return null;
  const raw = hash.replace(/^#/, '');
  if (!raw) return null;
  if (raw.startsWith('/')) return parseLegacyLink(raw);
  let params;
  try { params = new URLSearchParams(raw); } catch { return null; }
  const out = {};
  let recognized = 0;
  const view = params.get('v');
  if (view !== null) {
    if (!VIEWS.includes(view)) return null;
    out.view = view;
    recognized += 1;
  }
  const countryId = params.get('c');
  if (countryId !== null) {
    if (countryId !== '' && !DATASET.countries.some((country) => country.id === countryId)) return null;
    out.countryId = countryId || null;
    recognized += 1;
  }
  for (const [param, field] of [['e', 'eraIndex'], ['r', 'eventIndex'], ['p', 'pointIndex'], ['l', 'placeIndex']]) {
    const value = params.get(param);
    if (value === null) continue;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return null;
    out[field] = Math.trunc(number);
    recognized += 1;
  }
  const scope = params.get('s');
  if (scope !== null) {
    if (scope !== 'era' && scope !== 'country') return null;
    out.scope = scope;
    recognized += 1;
  }
  for (const [param, field] of [['fd', 'pointFilterDomain'], ['ff', 'pointFilterFamily']]) {
    const value = params.get(param);
    if (value === null || !value) continue;
    out[field] = value;
    recognized += 1;
  }
  if (params.get('d') === '1') { out.detailOpen = true; recognized += 1; }
  if (params.get('h') === '1') { out.helpOpen = true; recognized += 1; }
  return recognized ? out : null;
}

export function hydrateFromHash() {
  if (typeof window === 'undefined') return false;
  const parsed = parseDeepLink(window.location.hash);
  if (!parsed) return false;
  clearHistory();
  set({
    view: parsed.view ?? state.view,
    countryId: Object.prototype.hasOwnProperty.call(parsed, 'countryId') ? parsed.countryId : state.countryId,
    eraIndex: parsed.eraIndex ?? state.eraIndex,
    eventIndex: parsed.eventIndex ?? state.eventIndex,
    pointIndex: parsed.pointIndex ?? state.pointIndex,
    placeIndex: parsed.placeIndex ?? state.placeIndex,
    scope: parsed.scope ?? state.scope,
    pointFilterDomain: parsed.pointFilterDomain ?? state.pointFilterDomain,
    pointFilterFamily: parsed.pointFilterFamily ?? state.pointFilterFamily,
    detailOpen: parsed.detailOpen ?? false,
    helpOpen: parsed.helpOpen ?? false,
    playing: false,
  }, 'deep-link');
  return true;
}

function reflectHash() {
  if (!deepLinkReady || !deepLinkReflect || suppressReflect || typeof window === 'undefined') return;
  const encoded = formatDeepLink(state);
  if (encoded === lastReflectedHash) return;
  lastReflectedHash = encoded;
  suppressReflect = true;
  try {
    const url = new URL(window.location.href);
    url.hash = encoded;
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // file:// ou historique indisponible : l'hydratation reste active, la gravure est ignorée.
  }
  suppressReflect = false;
}

export function initDeepLinks(options = {}) {
  if (typeof window === 'undefined') return false;
  if (options.reflect === false) deepLinkReflect = false;
  if (deepLinkReady) return false;
  deepLinkReady = true;
  window.addEventListener('hashchange', () => {
    if (suppressReflect) return;
    hydrateFromHash();
  });
  const applied = hydrateFromHash();
  reflectHash();
  return applied;
}

// Amorçage automatique : l'URL décrit toujours l'état, sans aucun fichier supplémentaire.
initDeepLinks();
