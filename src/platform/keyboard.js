/* Routeur clavier unique : une touche, un handler, une action. */
import {
  state, subscribe, goView, stepEvent, stepEra, stepPoint, stepPlace,
  toggleHelp, toggleDetail, closeModal, togglePlay, toggleScope,
  currentEvent, currentCountry, currentPlaces,
  setAutoplayMs, DEFAULT_AUTOPLAY_MS,
} from '../domain/store.js';

export { DEFAULT_AUTOPLAY_MS, setAutoplayMs };

/* T2-02 / M4 : VIEW_TAXONOMY est la source unique (app.js:20-26). On la lit
 * au runtime via window.VATLAS (app.js:133) pour éviter un import circulaire ;
 * le repli local est strictement identique lorsque VATLAS n'est pas publié. */
const FALLBACK_VIEWS = Object.freeze([
  Object.freeze({ id: 'globe', digit: '1', letter: 'm', label: 'Monde', level: 1 }),
  Object.freeze({ id: 'chronology', digit: '2', letter: 'c', label: 'Chrono', level: 2 }),
  Object.freeze({ id: 'recit', digit: '3', letter: 'r', label: 'Récit', level: 3 }),
  Object.freeze({ id: 'geography', digit: '4', letter: 'g', label: 'Géo', level: 4 }),
  Object.freeze({ id: 'constellation', digit: '5', letter: 's', label: 'Const', level: 5 }),
  Object.freeze({ id: 'points', digit: '6', letter: 'p', label: 'Points', level: 6 }),
]);
function taxonomyViews() {
  const published = window.VATLAS?.taxonomy;
  return Array.isArray(published) && published.length === FALLBACK_VIEWS.length
    ? published : FALLBACK_VIEWS;
}
const SHORTCUT_MAP = new Map();
const SHORTCUT_SET = new Set(FALLBACK_VIEWS.map((view) => view.id));
for (const view of FALLBACK_VIEWS) {
  SHORTCUT_MAP.set(view.digit, view.id);
  SHORTCUT_MAP.set(view.letter, view.id);
}
/* Résolution via le catalogue public M4, avec repli sur la map locale. */
function resolveViewKey(key) {
  const published = window.VATLAS?.resolveView;
  if (typeof published === 'function') {
    const resolved = published(key);
    if (SHORTCUT_SET.has(resolved)) return resolved;
  }
  return SHORTCUT_MAP.get(key) || null;
}

/* T2-04 : axe unique des flèches par vue. Le globe est géré par globe.js. */
const AXIS_BY_VIEW = Object.freeze({
  globe: Object.freeze({ horizontal: 'country', vertical: 'country' }),
  chronology: Object.freeze({ horizontal: 'event', vertical: 'era' }),
  recit: Object.freeze({ horizontal: 'point', vertical: 'point' }),
  geography: Object.freeze({ horizontal: 'place', vertical: 'place' }),
  constellation: Object.freeze({ horizontal: 'event', vertical: 'era' }),
  points: Object.freeze({ horizontal: 'point', vertical: 'era' }),
});

/* T2-03 : ordre de priorité, du plus contraignant au plus global. */
const DISPATCH_ORDER = Object.freeze([
  'modifier', 'editable', 'activation-native', 'help', 'escape',
  'modal-freeze', 'view', 'scene',
]);

function editable(target) {
  return target instanceof HTMLElement && (
    target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
}

/* T2-05 : activation native de Entrée/Espace, y compris sur SVG et rôles de commande. */
function isControl(target) {
  if (!(target instanceof Element)) return false;
  const role = target.getAttribute('role');
  return ['BUTTON', 'A', 'SUMMARY', 'INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    || ['button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'option',
      'slider', 'spinbutton'].includes(role)
    || (target.hasAttribute('tabindex') && target.getAttribute('tabindex') !== '-1');
}

/* T2-08 : région live dédiée aux actions que la coque n'annonce pas. */
const LIVE_ID = 'nav-t2-live';
const CSS_ID = 'nav-t2';
const lastAnnounce = { text: '' };

function ensureCss() {
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = '.sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}';
  document.head.appendChild(style);
}

function ensureLive() {
  let node = document.getElementById(LIVE_ID);
  if (node) return node;
  if (!document.body) return null;
  ensureCss();
  node = document.createElement('p');
  node.id = LIVE_ID;
  node.className = 'sr-only';
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('aria-atomic', 'true');
  document.body.appendChild(node);
  return node;
}

function announce(text) {
  if (!text || text === lastAnnounce.text) return;
  lastAnnounce.text = text;
  const node = ensureLive();
  if (node) node.textContent = text;
}

/* T2-04 : un seul point de passage pour les flèches de scène. */
function navigate(view, axis, delta) {
  const def = AXIS_BY_VIEW[view];
  if (!def) return false;
  const kind = axis === 'vertical' ? def.vertical : def.horizontal;
  if (kind === 'event') stepEvent(delta);
  else if (kind === 'era') stepEra(delta);
  else if (kind === 'point') stepPoint(delta);
  else if (kind === 'place') stepPlace(delta);
  else return false; // 'country' : gestion locale dans globe.js
  return true;
}

function handle(event) {
  // T2-10 : respecter un gestionnaire local ayant déjà consommé la touche.
  if (event.defaultPrevented) return;
  // ATLAS-COQUE-09 : les raccourcis globaux ignorent les combinaisons du navigateur.
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if (editable(target)) return;

  // T2-05 : l'activation native d'un contrôle passe avant tout raccourci.
  if ((event.key === 'Enter' || event.key === ' ') && isControl(target)) return;

  // T2-06 : '?' = bascule d'aide exclusive, toujours disponible.
  if (event.key === '?') {
    event.preventDefault();
    toggleHelp();
    announce(state.helpOpen ? 'Aide clavier ouverte. Échap pour fermer.' : 'Aide clavier fermée.');
    return;
  }

  // Échap ne consomme l'événement que s'il y a réellement une action.
  if (event.key === 'Escape') {
    if (state.helpOpen || state.detailOpen) {
      event.preventDefault();
      closeModal();
      announce('Fermeture. Retour à la scène.');
    } else if (state.view !== 'globe') {
      event.preventDefault();
      goView('globe');
      announce('Retour au monde.');
    }
    return;
  }

  // T2-01 : le gel de modale précède les touches de vue (macro).
  if (state.helpOpen || state.detailOpen) return;

  // T2-02 : map unique pour 1–5 et r/c/g/s/m.
  const key = /^[a-z]$/i.test(event.key) ? event.key.toLowerCase() : event.key;
  const view = resolveViewKey(key);
  if (view) {
    event.preventDefault();
    goView(view);
    return;
  }

  // Les flèches/Entrée/Espace du globe sont gérées par globe.js.
  if (state.view === 'globe') return;

  if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    const vertical = event.key === 'ArrowDown' || event.key === 'ArrowUp';
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    navigate(state.view, vertical ? 'vertical' : 'horizontal', delta);
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    toggleDetail();
    return;
  }

  if (event.key === ' ') {
    event.preventDefault();
    if (state.view === 'recit') {
      togglePlay();
      announce(state.playing ? 'Lecture du récit activée.' : 'Lecture du récit arrêtée.');
    } else if (state.view === 'geography') {
      toggleScope();
      announce(state.scope === 'country' ? 'Périmètre élargi au pays.' : 'Périmètre limité au repère.');
    } else {
      toggleDetail();
    }
  }
}

document.addEventListener('keydown', handle, true);

/* T2-03/04/05/07/09/10 : contrat auditable du routeur. */
window.VECTEMPOREL_KEYS = {
  handle,
  setAutoplayMs,
  map: Object.fromEntries(SHORTCUT_MAP),
  order: DISPATCH_ORDER,
  axis: AXIS_BY_VIEW,
  isControl,
  announce,
  modalState: () => ({ help: state.helpOpen, detail: state.detailOpen }),
  helpMap: () => [
    ...taxonomyViews().map((v) => ({ key: `${v.digit} / ${v.letter}`, label: v.label, view: v.id, level: v.level })),
    { key: '← →', label: 'axe horizontal de la vue', view: state.view },
    { key: '↑ ↓', label: 'axe vertical de la vue', view: state.view },
    { key: 'Entrée', label: 'ouvrir le détail (hors monde)', view: state.view },
    { key: 'Espace', label: 'lecture du récit ou périmètre géographique', view: state.view },
    { key: 'Échap', label: 'fermer la modale ou revenir au monde', view: state.view },
    { key: '?', label: 'ouvrir / fermer l’aide', view: state.view },
  ],
  touchEquivalents: () => Object.fromEntries([
    ...taxonomyViews().map((v) => [v.digit, `[data-fk="tab-${v.id}"]`]),
    ...taxonomyViews().map((v) => [v.letter, `[data-fk="tab-${v.id}"]`]),
    ['?', '[data-fk="help-toggle"]'],
  ]),
  /* Alignement M4 (app.js:20-26) et contrôle de collision des lettres. */
  taxonomyAligned: () => taxonomyViews().every((view, index) => {
    const fallback = FALLBACK_VIEWS[index];
    return Boolean(view && fallback && view.id === fallback.id
      && view.digit === fallback.digit && view.letter === fallback.letter
      && view.label === fallback.label && view.level === fallback.level);
  }),
  conflicts: () => {
    const reserved = new Set(['?', 'Escape', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
    const views = taxonomyViews();
    return views.filter((view, index) => reserved.has(view.letter)
      || views.findIndex((other) => other.letter === view.letter) !== index
      || views.findIndex((other) => other.digit === view.digit) !== index
    ).map((view) => view.id);
  },
  navigationBounds: () => ({
    event: { mode: 'clamp', index: state.eventIndex, total: currentCountry()?.events.length || 0 },
    era: { mode: 'clamp', index: state.eraIndex, total: currentCountry()?.eras.length || 0 },
    point: { mode: 'wrap', index: state.pointIndex, total: currentEvent()?.points.length || 0 },
    place: { mode: 'clamp', index: state.placeIndex, total: currentPlaces().length },
  }),
};

/* La lecture du récit est la seule boucle temporelle ; elle s'arrête si l'onglet
   est masqué ou si une modale est ouverte. Coordination atlas-recit :
   la cadence est lue dans l'état (autoplayMs) et réordonnancée à chaque changement. */
let autoplayTimer = 0;
function scheduleAutoplay() {
  window.clearTimeout(autoplayTimer);
  autoplayTimer = window.setTimeout(() => {
    if (!document.hidden && state.playing && state.view === 'recit'
      && !state.helpOpen && !state.detailOpen) {
      const total = currentEvent()?.points.length || 0;
      if (total) stepPoint(1);
    }
    scheduleAutoplay();
  }, Math.max(1000, state.autoplayMs || DEFAULT_AUTOPLAY_MS));
}
scheduleAutoplay();

subscribe((_current, reason) => {
  if (reason === 'autoplay') scheduleAutoplay();
});

/* T2-10 : point d'entrée idempotent. */
export function initKeyboard() {
  ensureCss();
  ensureLive();
}
