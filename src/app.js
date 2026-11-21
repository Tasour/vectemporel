/* Sphère historique — composition root : URL, HUD, clavier, données.
 * Aucun code du frontend Chronas n'est copié. Données © Chronas CC BY-SA 4.0. */
import { MAP_META, FEATURES, describe, searchNames, ATTRIBUTION, formatPopulation } from './map/data.js';
import { decodePos, encodePos } from './map/projection.js';
import { createGlobe } from './globe/globe.js';

const SEED = 20261121;
const DEFAULT_VIEW = { lat: 20, lon: 0, zoom: 1.6 };

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function readParams() {
  let raw = window.location.search.replace(/^\?/, '');
  if (!raw && window.location.hash) raw = window.location.hash.replace(/^#\/?/, '');
  try { return new URLSearchParams(raw); } catch { return new URLSearchParams(); }
}

function writeUrl(params) {
  try {
    const url = new URL(window.location.href);
    url.search = params.toString();
    url.hash = '';
    window.history.replaceState(null, '', url);
  } catch { /* URL non writable : l'état reste interne */ }
}

function mount() {
  const hud = document.getElementById('hud');
  const canvas = document.getElementById('globe-canvas');
  const params = readParams();
  const year = Number(params.get('year')) || MAP_META.year;
  const initialName = params.get('value');
  const initialPos = decodePos(params.get('pos'));

  const brand = el('div', 'hud-brand');
  brand.append(
    el('strong', '', 'HISTOIRE DU MONDE'),
    el('span', '', `${MAP_META.year} · ${MAP_META.areas} régions · ${MAP_META.features} contours`),
  );

  const actions = el('div', 'hud-actions');
  const searchButton = el('button', 'hud-btn', '⌕');
  searchButton.type = 'button';
  searchButton.id = 'hud-search-button';
  searchButton.setAttribute('aria-label', 'Rechercher une région (touche slash)');
  const tourButton = el('button', 'hud-btn', '▶');
  tourButton.type = 'button';
  tourButton.id = 'hud-tour-button';
  tourButton.setAttribute('aria-label', 'Lancer le tour du monde');
  tourButton.setAttribute('aria-pressed', 'false');
  const helpButton = el('button', 'hud-btn', '?');
  helpButton.type = 'button';
  helpButton.id = 'hud-help-button';
  helpButton.setAttribute('aria-label', 'Afficher les commandes (touche point d’interrogation)');
  actions.append(tourButton, searchButton, helpButton);

  const card = el('section', 'hud-card');
  card.id = 'hud-card';
  card.setAttribute('aria-label', 'Région sélectionnée');
  card.hidden = true;

  const searchOverlay = el('div', 'hud-overlay');
  searchOverlay.id = 'hud-search';
  searchOverlay.hidden = true;
  searchOverlay.append(el('h2', '', 'Rechercher une région'));
  const search = document.createElement('input');
  search.type = 'search';
  search.id = 'region-search';
  search.placeholder = 'Berry, Finnmark, Aachen…';
  search.setAttribute('aria-label', 'Nom de la région');
  search.setAttribute('aria-controls', 'region-suggestions');
  search.setAttribute('aria-expanded', 'false');
  search.setAttribute('autocomplete', 'off');
  const suggestions = el('ul', 'hud-suggestions');
  suggestions.id = 'region-suggestions';
  suggestions.setAttribute('role', 'listbox');
  suggestions.setAttribute('aria-label', 'Régions correspondantes');
  searchOverlay.append(search, suggestions);

  const helpOverlay = el('div', 'hud-overlay');
  helpOverlay.id = 'hud-help';
  helpOverlay.hidden = true;
  helpOverlay.append(el('h2', '', 'Commandes'));
  const help = el('p', 'hud-help');
  help.innerHTML = '<kbd>Glisser</kbd> tourner la sphère · <kbd>Molette</kbd> zoomer<br>'
    + '<kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> tourner · <kbd>+</kbd><kbd>−</kbd> zoomer<br>'
    + '<kbd>/</kbd> recherche · <kbd>?</kbd> aide · <kbd>Échap</kbd> fermer<br>'
    + '<kbd>▶</kbd> tour du monde (manuel uniquement)<br>'
    + '<kbd>Clic</kbd> sélectionner une région';
  helpOverlay.appendChild(help);

  const readout = el('p', 'hud-readout');
  readout.id = 'hud-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const error = el('p', 'hud-error');
  error.id = 'hud-error';
  error.hidden = true;

  hud.append(brand, actions, card, searchOverlay, helpOverlay, readout, error);

  let selected = null;
  let suggestionIndex = -1;
  let suggestionsList = [];

  const globe = createGlobe(canvas, {
    onSelect: (name) => select(name),
    onView: (camera) => {
      params.set('pos', encodePos(camera));
      writeUrl(params);
    },
    onError: (message) => {
      error.textContent = `Impossible d'afficher la sphère : ${message}. Essayez un navigateur avec WebGL.`;
      error.hidden = false;
      readout.textContent = error.textContent;
      document.documentElement.dataset.globeError = message;
    },
  });

  function renderCard(name) {
    const info = name ? describe(name) : null;
    card.replaceChildren();
    if (!info) {
      card.hidden = true;
      return;
    }
    card.append(el('p', 'hud-kicker', 'Région historique'), el('h2', 'hud-title', info.name));
    const list = el('dl', 'hud-facts');
    for (const [label, value] of [
      ['État', info.state],
      ['Culture', info.culture],
      ['Religion', info.religion],
      ['Capitale', info.capital],
      ['Population', formatPopulation(info.population)],
    ]) {
      list.appendChild(el('dt', '', label));
      list.appendChild(el('dd', '', value));
    }
    card.append(list, el('p', 'hud-credit', 'Chronas · CC BY-SA 4.0'));
    card.hidden = false;
  }

  function announce(name) {
    if (!name) {
      readout.textContent = `${FEATURES.length} régions · année ${MAP_META.year}. Glissez pour explorer.`;
      return;
    }
    const info = describe(name);
    readout.textContent = `${name} · ${info?.capital || 'capitale inconnue'} · ${info?.culture || 'culture inconnue'}.`;
  }

  function select(name, { move = true } = {}) {
    if (!name) return;
    selected = name;
    params.set('type', 'area');
    params.set('value', name);
    params.set('year', String(year));
    writeUrl(params);
    globe?.setSelected(name);
    if (move) globe?.focusRegion(name);
    renderCard(name);
    announce(name);
    searchOverlay.hidden = true;
    search.setAttribute('aria-expanded', 'false');
    search.value = '';
  }

  function setSuggestions(query) {
    suggestionsList = searchNames(query);
    suggestionIndex = -1;
    suggestions.replaceChildren();
    if (!suggestionsList.length) {
      suggestions.hidden = true;
      search.setAttribute('aria-expanded', 'false');
      return;
    }
    suggestionsList.forEach((name, index) => {
      const item = el('li', 'suggestion', name);
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      item.addEventListener('mousedown', (event) => { event.preventDefault(); select(name); });
      suggestions.appendChild(item);
    });
    suggestions.hidden = false;
    search.setAttribute('aria-expanded', 'true');
  }

  function highlight(index) {
    suggestionIndex = index;
    [...suggestions.children].forEach((item, position) => {
      item.setAttribute('aria-selected', String(position === index));
      item.classList.toggle('active', position === index);
    });
  }

  function openSearch() {
    helpOverlay.hidden = true;
    searchOverlay.hidden = false;
    search.focus();
  }

  function toggleHelp() {
    searchOverlay.hidden = true;
    helpOverlay.hidden = !helpOverlay.hidden;
  }

  tourButton.addEventListener('click', () => {
    const active = globe?.toggleTour();
    tourButton.textContent = active ? '⏸' : '▶';
    tourButton.setAttribute('aria-pressed', String(Boolean(active)));
    tourButton.setAttribute('aria-label', active ? 'Arrêter le tour du monde' : 'Lancer le tour du monde');
    readout.textContent = active ? 'Tour du monde en cours.' : 'Tour du monde arrêté.';
  });
  searchButton.addEventListener('click', openSearch);
  helpButton.addEventListener('click', toggleHelp);
  search.addEventListener('input', () => setSuggestions(search.value));
  search.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' && suggestionsList.length) {
      event.preventDefault();
      highlight((suggestionIndex + 1) % suggestionsList.length);
    } else if (event.key === 'ArrowUp' && suggestionsList.length) {
      event.preventDefault();
      highlight((suggestionIndex - 1 + suggestionsList.length) % suggestionsList.length);
    } else if (event.key === 'Enter') {
      const name = suggestionsList[suggestionIndex >= 0 ? suggestionIndex : 0];
      if (name) { event.preventDefault(); select(name); }
    } else if (event.key === 'Escape') {
      searchOverlay.hidden = true;
      search.setAttribute('aria-expanded', 'false');
    }
  });

  canvas.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') globe?.rotateBy(-6, 0);
    else if (event.key === 'ArrowRight') globe?.rotateBy(6, 0);
    else if (event.key === 'ArrowUp') globe?.rotateBy(0, -6);
    else if (event.key === 'ArrowDown') globe?.rotateBy(0, 6);
    else if (event.key === '+' || event.key === '=') globe?.zoomBy(0.5);
    else if (event.key === '-') globe?.zoomBy(-0.5);
    else return;
    event.preventDefault();
  });

  document.addEventListener('keydown', (event) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '');
    if (event.key === '/' && !typing) { event.preventDefault(); openSearch(); }
    else if (event.key === '?' && !typing) { event.preventDefault(); toggleHelp(); }
    else if (event.key === 'Escape') {
      searchOverlay.hidden = true;
      helpOverlay.hidden = true;
    }
  });

  if (globe) {
    globe.setView(initialPos || DEFAULT_VIEW);
    if (initialName) select(initialName, { move: !initialPos });
    else {
      params.set('type', 'area');
      params.set('year', String(year));
      params.set('pos', encodePos(globe.getView()));
      writeUrl(params);
      announce(null);
    }
  }

  window.VATLAS = {
    getState: () => ({
      view: 'globe',
      selected,
      year,
      camera: globe?.getView() || { ...DEFAULT_VIEW },
      meta: { ...MAP_META },
      features: FEATURES.length,
      webgl: Boolean(globe),
      attribution: ATTRIBUTION,
      seed: SEED,
      touring: Boolean(globe?.isTouring?.()),
    }),
    selectRegion: (name) => select(name),
    diagnostics: () => ({ seed: SEED, features: FEATURES.length, areas: MAP_META.areas, webgl: Boolean(globe) }),
  };
  document.documentElement.dataset.globeReady = 'true';
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* mode en ligne dégradé */ });
  }, { once: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
registerServiceWorker();
