/* Routeur clavier unique : une touche, un handler, une action. */
import { state, goView, stepEvent, stepEra, set, selectEvent, currentEvent } from '../domain/store.js';

const VIEWS = ['globe', 'chronology', 'recit', 'geography', 'constellation'];

function editable(target) {
  return target instanceof HTMLElement && (
    target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
}

function openPointDetail() {
  set({ detailOpen: !state.detailOpen }, 'detail');
}

function handle(event) {
  if (editable(event.target)) return;

  if (event.key === '?') {
    event.preventDefault();
    set({ helpOpen: !state.helpOpen }, 'help');
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    if (state.detailOpen) set({ detailOpen: false }, 'detail');
    else if (state.view !== 'globe') goView('globe');
    return;
  }
  if (/^[1-5]$/.test(event.key)) {
    event.preventDefault();
    goView(VIEWS[Number(event.key) - 1]);
    return;
  }
  const keys = { r: 'recit', c: 'chronology', g: 'geography', s: 'constellation', m: 'globe' };
  const next = keys[event.key.toLowerCase()];
  if (next && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    goView(next);
    return;
  }

  if (state.view === 'globe') return;

  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault();
    if (state.view === 'recit') set({ pointIndex: (currentEvent()?.points.length || 1) <= state.pointIndex + 1 ? 0 : state.pointIndex + 1 }, 'point');
    else if (state.view === 'geography') set({ placeIndex: state.placeIndex + 1 }, 'place');
    else stepEvent(1);
    return;
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (state.view === 'recit') set({ pointIndex: Math.max(0, state.pointIndex - 1) }, 'point');
    else if (state.view === 'geography') set({ placeIndex: Math.max(0, state.placeIndex - 1) }, 'place');
    else if (event.key === 'ArrowUp') stepEra(-1);
    else stepEvent(-1);
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    openPointDetail();
    return;
  }
  if (event.key === ' ') {
    event.preventDefault();
    if (state.view === 'recit') set({ playing: !state.playing }, 'play');
    else if (state.view === 'geography') set({ scope: state.scope === 'era' ? 'country' : 'era' }, 'scope');
    else openPointDetail();
  }
}

document.addEventListener('keydown', handle, true);
window.VECTEMPOREL_KEYS = { handle };

// La lecture du récit est la seule boucle temporelle ; elle s'arrête si l'onglet est masqué.
let timer = 0;
window.setInterval(() => {
  if (document.hidden || !state.playing || state.view !== 'recit') return;
  const total = currentEvent()?.points.length || 0;
  if (!total) return;
  set({ pointIndex: (state.pointIndex + 1) % total }, 'play');
}, 5000);

export function initKeyboard() {}
