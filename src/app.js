/* Atlas historique mondial — une seule vue : la carte.
 * Réimplémentation originale : aucun code du frontend Chronas n'est copié.
 * Données © Chronas, CC BY-SA 4.0 (fichier DATA-LICENSE.md). */
import { MAP_META, FEATURES, describe, searchNames, ATTRIBUTION, formatPopulation, areaByName } from './map/data.js';
import { createMapRenderer } from './map/renderer.js';
import { decodePos, encodePos, fitBounds } from './map/projection.js';

const SEED = 20261121;
const mulberry32 = (seed) => () => {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

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
  const root = document.getElementById('app');
  root.replaceChildren();

  const bar = el('header', 'map-bar');
  const brand = el('div', 'map-brand');
  brand.append(
    el('strong', '', 'HISTOIRE DU MONDE'),
    el('span', '', `Atlas historique · ${MAP_META.year} · ${MAP_META.areas} régions`),
  );
  const search = document.createElement('input');
  search.type = 'search';
  search.id = 'region-search';
  search.className = 'region-search';
  search.placeholder = 'Rechercher une région…';
  search.setAttribute('aria-label', 'Rechercher une région historique');
  search.setAttribute('aria-controls', 'region-suggestions');
  search.setAttribute('aria-expanded', 'false');
  search.setAttribute('autocomplete', 'off');
  const suggestions = el('ul', 'region-suggestions');
  suggestions.id = 'region-suggestions';
  suggestions.setAttribute('role', 'listbox');
  suggestions.setAttribute('aria-label', 'Régions correspondantes');
  suggestions.hidden = true;
  const searchWrap = el('div', 'region-search-wrap');
  searchWrap.append(search, suggestions);

  const lucky = el('button', 'map-btn', '✦ Hasard');
  lucky.type = 'button';
  const reset = el('button', 'map-btn', '↺ Recentrer');
  reset.type = 'button';
  bar.append(brand, searchWrap, lucky, reset);

  const layout = el('div', 'map-layout');
  const stage = el('main', 'map-stage');
  stage.id = 'map-stage';
  const canvas = el('canvas', 'world-map');
  canvas.id = 'world-map';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Carte mondiale. Flèches pour déplacer, plus et moins pour zoomer. Utilisez la recherche pour choisir une région.');
  stage.appendChild(canvas);

  const zoomBar = el('div', 'map-zoom');
  zoomBar.setAttribute('role', 'group');
  zoomBar.setAttribute('aria-label', 'Zoom de la carte');
  const zoomIn = el('button', 'map-btn', '+');
  zoomIn.type = 'button';
  zoomIn.setAttribute('aria-label', 'Zoomer');
  const zoomOut = el('button', 'map-btn', '−');
  zoomOut.type = 'button';
  zoomOut.setAttribute('aria-label', 'Dézoomer');
  zoomBar.append(zoomIn, zoomOut);
  stage.appendChild(zoomBar);

  const readout = el('p', 'map-readout');
  readout.id = 'map-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  stage.appendChild(readout);

  const aside = el('aside', 'map-panel');
  aside.id = 'map-panel';
  aside.setAttribute('aria-label', 'Détails de la région sélectionnée');
  const placeholder = el('p', 'map-empty', 'Choisissez une région sur la carte ou via la recherche.');
  aside.appendChild(placeholder);

  layout.append(stage, aside);
  const footer = el('footer', 'map-footer');
  footer.append(el('span', '', ATTRIBUTION), el('span', '', `graine ${SEED} · généré le ${MAP_META.retrieved_at} · API ${MAP_META.api_version}`));

  root.append(bar, layout, footer);

  const params = readParams();
  const year = Number(params.get('year')) || MAP_META.year;
  const initialName = params.get('value');
  const initialPos = decodePos(params.get('pos'));

  let selected = null;
  let suggestionIndex = -1;
  let suggestionsList = [];
  let luckyCounter = 0;

  const renderer = createMapRenderer(canvas, {
    onSelect: (name) => select(name),
    onView: (camera) => {
      params.set('pos', encodePos(camera));
      writeUrl(params);
    },
  });

  function renderPanel(name) {
    const info = name ? describe(name) : null;
    aside.replaceChildren();
    if (!info) {
      const empty = el('p', 'map-empty', 'Choisissez une région sur la carte ou via la recherche.');
      aside.appendChild(empty);
      return;
    }
    const kicker = el('p', 'view-kicker', 'Région historique');
    const title = el('h1', 'region-title', info.name);
    title.id = 'region-title';
    aside.append(kicker, title);
    const list = el('dl', 'region-facts');
    const fields = [
      ['État', info.state],
      ['Culture', info.culture],
      ['Religion', info.religion],
      ['Capitale', info.capital],
      ['Population', formatPopulation(info.population)],
    ];
    for (const [label, value] of fields) {
      list.appendChild(el('dt', '', label));
      list.appendChild(el('dd', '', value));
    }
    aside.appendChild(list);
    if (year !== MAP_META.year) {
      aside.appendChild(el('p', 'map-note', `Année demandée : ${year}. Le snapshot local contient l'année ${MAP_META.year}.`));
    }
    aside.appendChild(el('p', 'map-source', 'Source : Chronas · CC BY-SA 4.0'));
  }

  function announce(name) {
    if (!name) {
      readout.textContent = `${FEATURES.length} régions affichées · année ${year}.`;
      return;
    }
    const area = areaByName(name);
    readout.textContent = `${name} · ${area?.capital || 'capitale inconnue'} · ${area?.culture || 'culture inconnue'}.`;
  }

  function select(name, { move = true } = {}) {
    if (!name) return;
    selected = name;
    params.set('type', 'area');
    params.set('value', name);
    params.set('year', String(year));
    writeUrl(params);
    renderer.setSelected(name);
    if (move) {
      const info = describe(name);
      if (info?.bounds) renderer.setView(fitBounds(info.bounds, renderer.size(), 80));
    }
    renderPanel(name);
    announce(name);
    suggestions.hidden = true;
    search.value = '';
    search.setAttribute('aria-expanded', 'false');
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
      item.id = `suggestion-${index}`;
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
      suggestions.hidden = true;
      search.setAttribute('aria-expanded', 'false');
    }
  });

  lucky.addEventListener('click', () => {
    const random = mulberry32(SEED + luckyCounter * 7919);
    luckyCounter += 1;
    const feature = FEATURES[Math.floor(random() * FEATURES.length)];
    if (feature) {
      select(feature.name);
      readout.textContent = `Hasard : ${feature.name}. ${readout.textContent}`;
    }
  });
  reset.addEventListener('click', () => {
    const info = selected ? describe(selected) : null;
    renderer.setView(info?.bounds ? fitBounds(info.bounds, renderer.size(), 80) : { lat: 20, lon: 0, zoom: 1.6 });
  });
  zoomIn.addEventListener('click', () => renderer.zoom(0.6));
  zoomOut.addEventListener('click', () => renderer.zoom(-0.6));

  canvas.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 160 : 60;
    if (event.key === 'ArrowLeft') renderer.pan(step, 0);
    else if (event.key === 'ArrowRight') renderer.pan(-step, 0);
    else if (event.key === 'ArrowUp') renderer.pan(0, step);
    else if (event.key === 'ArrowDown') renderer.pan(0, -step);
    else if (event.key === '+' || event.key === '=') renderer.zoom(0.6);
    else if (event.key === '-') renderer.zoom(-0.6);
    else return;
    event.preventDefault();
  });

  if (initialPos) renderer.setView(initialPos);
  if (initialName) select(initialName, { move: !initialPos });
  else {
    params.set('type', 'area');
    params.set('year', String(year));
    if (!initialPos) params.set('pos', encodePos(renderer.getView()));
    writeUrl(params);
    announce(null);
  }

  window.VATLAS = {
    getState: () => ({
      view: 'map',
      selected,
      year,
      camera: renderer.getView(),
      meta: { ...MAP_META },
      features: FEATURES.length,
    }),
    selectRegion: (name) => select(name),
    diagnostics: () => ({ seed: SEED, features: FEATURES.length, areas: MAP_META.areas }),
  };
  document.documentElement.dataset.mapReady = 'true';
}

/* Enregistrement du service worker : indispensable au fonctionnement hors ligne.
 * Aucune portée inhabituelle, aucun script tiers, repli silencieux si indisponible. */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* mode en ligne dégradé */ });
  }, { once: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
registerServiceWorker();
