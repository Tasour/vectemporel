/* Sphère historique — composition root : URL, HUD, clavier, données.
 * Aucun code du frontend Chronas n'est copié. Données © Chronas CC BY-SA 4.0. */
import { MAP_META, FEATURES, describe, searchNames, ATTRIBUTION, formatPopulation } from './map/data.js';
import { decodePos, encodePos } from './map/projection.js';
import { createGlobe } from './globe/globe.js';
import { DIMENSIONS } from './globe/texture.js';
import { clampYear, getAreasForYear } from './data/year-store.js';

const SEED = 20261121;
const DEFAULT_VIEW = { lat: 20, lon: 0, zoom: 1.6 };
const ERAS = [
  { label: 'Antiquité', start: -2000, end: -500 },
  { label: 'Classique', start: -500, end: 500 },
  { label: 'Médiéval', start: 500, end: 1500 },
  { label: 'Moderne', start: 1500, end: 2000 },
];

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
  let year = clampYear(params.get('year') ?? MAP_META.year);
  const initialName = params.get('value');
  const initialPos = decodePos(params.get('pos'));

  const brand = el('div', 'hud-brand');
  brand.append(
    el('strong', '', 'HISTOIRE DU MONDE'),
    el('span', '', `-2000 → 2000 · ${MAP_META.areas} régions · ${MAP_META.features} contours`),
  );
  const dimensions = el('div', 'dimension-bar');
  dimensions.id = 'dimension-bar';
  dimensions.setAttribute('role', 'radiogroup');
  dimensions.setAttribute('aria-label', 'Dimension des couleurs');
  let dimension = 'culture';
  for (const item of DIMENSIONS) {
    const button = el('button', 'dimension-btn', item.label);
    button.type = 'button';
    button.dataset.dimension = item.id;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(item.id === dimension));
    button.addEventListener('click', () => {
      dimension = item.id;
      for (const other of dimensions.children) other.setAttribute('aria-checked', String(other === button));
      globe?.setYearAreas(areasForYear, dimension);
      renderCard(selected);
    });
    dimensions.appendChild(button);
  }
  brand.appendChild(dimensions);

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
  const themeButton = el('button', 'hud-btn', '◐');
  themeButton.type = 'button';
  themeButton.id = 'hud-theme-button';
  themeButton.setAttribute('aria-label', 'Basculer le thème clair / sombre');
  const helpButton = el('button', 'hud-btn', '?');
  helpButton.type = 'button';
  helpButton.id = 'hud-help-button';
  helpButton.setAttribute('aria-label', 'Afficher les commandes (touche point d’interrogation)');
  actions.append(tourButton, searchButton, themeButton, helpButton);
  const savedTheme = localStorage.getItem('history-theme');
  if (savedTheme === 'light') document.documentElement.dataset.theme = 'light';

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

  const tooltip = el('div', 'map-tooltip');
  tooltip.id = 'map-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;

  const helpOverlay = el('div', 'hud-overlay');
  helpOverlay.id = 'hud-help';
  helpOverlay.hidden = true;
  helpOverlay.append(el('h2', '', 'Commandes'));
  const help = el('p', 'hud-help');
  help.innerHTML = '<kbd>Glisser</kbd> tourner la sphère · <kbd>Molette</kbd> zoomer<br>'
    + '<kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> tourner · <kbd>+</kbd><kbd>−</kbd> zoomer<br>'
    + '<kbd>/</kbd> recherche · <kbd>?</kbd> aide · <kbd>Échap</kbd> fermer<br>'
    + '<kbd>▶</kbd> tour du monde (manuel uniquement)<br>'
    + '<kbd>Clic</kbd> sélectionner une région · <kbd>Curseur</kbd> changer d’année';
  helpOverlay.appendChild(help);

  const readout = el('p', 'hud-readout');
  readout.id = 'hud-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const error = el('p', 'hud-error');
  error.id = 'hud-error';
  error.hidden = true;

  /* Timeline — F15 à F20. */
  const timeline = el('section', 'timeline');
  timeline.id = 'timeline';
  timeline.setAttribute('aria-label', 'Frise chronologique');
  const eraBands = el('div', 'era-bands');
  eraBands.setAttribute('aria-hidden', 'true');
  for (const era of ERAS) {
    const band = el('span', 'era-band', era.label);
    band.style.left = `${((era.start + 2000) / 4000) * 100}%`;
    band.style.width = `${((era.end - era.start) / 4000) * 100}%`;
    eraBands.appendChild(band);
  }
  const yearLabel = el('button', 'timeline-year', '1000');
  yearLabel.type = 'button';
  yearLabel.id = 'timeline-year';
  yearLabel.setAttribute('aria-label', 'Choisir une année (saisie directe)');
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = 'timeline-range';
  slider.className = 'timeline-range';
  slider.min = '-2000';
  slider.max = '2000';
  slider.step = '1';
  slider.value = String(year);
  slider.setAttribute('aria-label', 'Année');
  const play = el('button', 'hud-btn timeline-play', '▶');
  play.type = 'button';
  play.id = 'timeline-play';
  play.setAttribute('aria-label', 'Lancer la lecture des années');
  play.setAttribute('aria-pressed', 'false');
  const centuries = el('div', 'century-nav');
  centuries.setAttribute('role', 'group');
  centuries.setAttribute('aria-label', 'Sauts de siècle');
  for (const mark of [-2000, -1000, 0, 1000, 2000]) {
    const button = el('button', 'century-btn', String(mark));
    button.type = 'button';
    button.dataset.year = String(mark);
    centuries.appendChild(button);
  }
  const loading = el('span', 'timeline-loading', '');
  loading.id = 'timeline-loading';
  loading.hidden = true;
  timeline.append(eraBands, yearLabel, slider, play, centuries, loading);

  const yearDialog = el('div', 'hud-overlay');
  yearDialog.id = 'year-dialog';
  yearDialog.hidden = true;
  yearDialog.append(el('h2', '', 'Choisir une année'));
  const yearInput = document.createElement('input');
  yearInput.type = 'number';
  yearInput.id = 'year-input';
  yearInput.min = '-2000';
  yearInput.max = '2000';
  yearInput.setAttribute('aria-label', 'Année (entre -2000 et 2000)');
  yearDialog.appendChild(yearInput);

  hud.append(brand, actions, card, tooltip, searchOverlay, helpOverlay, yearDialog, readout, timeline, error);

  let selected = null;
  let areasForYear = null;
  let cities = null;
  let suggestionIndex = -1;
  let suggestionsList = [];

  const globe = createGlobe(canvas, {
    onSelect: (name) => select(name),
    onHover: (name, x, y) => {
      showTooltip(name, x, y);
    },
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

  /* F23 : chargement différé des capitales historiques. */
  import('./data/chronas-cities.js')
    .then(({ CHRONAS_CITIES }) => {
      cities = CHRONAS_CITIES;
      globe?.setCities(cities.cities, year);
    })
    .catch(() => { /* données optionnelles : la carte reste utilisable */ });

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
    card.appendChild(list);
    const current = DIMENSIONS.find((item) => item.id === dimension);
    const row = areasForYear?.[name];
    const value = row ? row[current?.index ?? 1] : undefined;
    card.append(el('p', 'hud-dimension', `${current?.label || 'Dimension'} : ${value ?? info.culture}`));
    const wiki = el('a', 'hud-wiki', 'Article Wikipédia ↗');
    wiki.href = `https://fr.wikipedia.org/wiki/${encodeURIComponent(info.name)}`;
    wiki.target = '_blank';
    wiki.rel = 'noopener noreferrer';
    card.append(wiki, el('p', 'hud-credit', 'Chronas · CC BY-SA 4.0'));
    card.hidden = false;
  }

  function announce(name) {
    if (!name) {
      readout.textContent = `${FEATURES.length} régions · année ${year}. Glissez pour explorer.`;
      return;
    }
    const info = describe(name);
    readout.textContent = `${name} · ${info?.capital || 'capitale inconnue'} · ${info?.culture || 'culture inconnue'}.`;
  }

  function showTooltip(name, x, y) {
    if (!name) { tooltip.hidden = true; return; }
    const area = describe(name);
    tooltip.replaceChildren(
      el('strong', '', name),
      el('span', '', `${area?.culture || 'culture inconnue'} · ${area?.capital || 'capitale inconnue'}`),
    );
    tooltip.style.left = `${x + 14}px`;
    tooltip.style.top = `${y + 14}px`;
    tooltip.hidden = false;
  }

  let yearRequest = 0;
  let autoplayTimer = 0;
  let debounceTimer = 0;

  async function applyYear(next, { updateUrl = true, notify = true } = {}) {
    const target = clampYear(next);
    const request = ++yearRequest;
    year = target;
    yearLabel.textContent = String(target);
    slider.value = String(target);
    params.set('year', String(target));
    if (updateUrl) writeUrl(params);
    loading.hidden = false;
    loading.textContent = `Chargement de ${target}…`;
    try {
      const areas = await getAreasForYear(target);
      if (request !== yearRequest) return;
      areasForYear = areas;
      globe?.setYearAreas(areas, dimension);
      globe?.setCities(cities?.cities || [], target);
      if (selected) renderCard(selected);
      if (notify) announce(selected);
    } catch (issue) {
      if (request !== yearRequest) return;
      error.textContent = `Année ${target} indisponible : ${issue.message}`;
      error.hidden = false;
      readout.textContent = error.textContent;
    } finally {
      if (request === yearRequest) loading.hidden = true;
    }
  }

  function setYear(next, options) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => applyYear(next, options), 120);
  }

  function toggleAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = 0;
      play.textContent = '▶';
      play.setAttribute('aria-pressed', 'false');
      play.setAttribute('aria-label', 'Lancer la lecture des années');
      return;
    }
    play.textContent = '⏸';
    play.setAttribute('aria-pressed', 'true');
    play.setAttribute('aria-label', 'Arrêter la lecture des années');
    autoplayTimer = setInterval(() => {
      const next = year >= 2000 ? -2000 : year + 25;
      applyYear(next);
    }, 900);
  }

  function openYearDialog() {
    helpOverlay.hidden = true;
    searchOverlay.hidden = true;
    yearDialog.hidden = false;
    yearInput.value = '';
    yearInput.placeholder = String(year);
    yearInput.focus();
  }

  yearLabel.addEventListener('click', openYearDialog);
  slider.addEventListener('input', () => setYear(slider.value));
  play.addEventListener('click', toggleAutoplay);
  for (const button of centuries.children) {
    button.addEventListener('click', () => setYear(Number(button.dataset.year)));
  }
  yearInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyYear(yearInput.value);
      yearDialog.hidden = true;
    } else if (event.key === 'Escape') {
      yearDialog.hidden = true;
    }
  });

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
  themeButton.addEventListener('click', () => {
    const light = document.documentElement.dataset.theme === 'light';
    if (light) delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = 'light';
    localStorage.setItem('history-theme', light ? 'dark' : 'light');
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
      yearDialog.hidden = true;
    }
  });

  if (globe) {
    globe.setView(initialPos || DEFAULT_VIEW);
    applyYear(year, { notify: false });
    if (initialName) select(initialName, { move: !initialPos });
    else {
      params.set('type', 'area');
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
    setYear: (value) => applyYear(value),
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
