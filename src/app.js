/* Sphère historique — composition root : URL, HUD, clavier, données.
 * Aucun code du frontend Chronas n'est copié. Données © Chronas CC BY-SA 4.0. */
import { MAP_META, FEATURES, describe, searchNames, ATTRIBUTION, formatPopulation } from './map/data.js';
import { decodePos, encodePos } from './map/projection.js';
import { createGlobe } from './globe/globe.js';
import { DIMENSIONS } from './globe/texture.js';
import {
  createLabelRenderer, buildLabels, buildModernLabels, combineLabels, LABEL_MODES,
} from './globe/labels.js';
import { createEpicTimeline, epicYear, categoryOf, EPICS } from './timeline/epics.js';
import {
  MIN_YEAR, MAX_YEAR, SPAN, SCALE_LABELS, CENTURY_STEPS, centuryPositionToYear,
  centuryStart, densityBuckets, positionToYear, yearToPosition, yearToCenturyPosition,
} from './timeline/scale.js';
import { getProvinceTimeline } from './data/province-timeline-store.js';
import { TRAILS } from './data/trails.js';
import { TURNING_POINTS } from './data/turning-points.js';
import { ANOMALIES } from './data/anomalies.js';
import { DATA_QUALITY } from './data/data-quality.js';
import { linkedProvinces, arcPairs } from './globe/simultaneity.js';
import { createTrailPlayer } from './story/trails.js';
import { createLearnPanel } from './learning/learn-ui.js';
import { createScrolly } from './reports/scrolly.js';
import { createHistography } from './histography/index.js';
import { createSubjectField } from './histography/subject.js';
import { PixiTimeline } from './timeline/pixi-timeline.js';
import { CHRONAS_LABELS } from './data/chronas-labels.js';
import { clampYear, getAreasForYear } from './data/year-store.js';

const SEED = 20261121;
const DEFAULT_VIEW = { lat: 20, lon: 0, zoom: 1.6 };
const ERAS = [
  { label: 'Antiquité', start: MIN_YEAR, end: -500 },
  { label: 'Classique', start: -500, end: 500 },
  { label: 'Médiéval', start: 500, end: 1500 },
  { label: 'Moderne', start: 1500, end: MAX_YEAR },
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
  let scaleMode = params.get('scale') === 'recent' ? 'recent' : 'linear';
  let zoomMode = params.get('zoom') === 'century' ? 'century' : 'global';
  let centuryBase = centuryStart(year);
  const positionOf = (value) => (zoomMode === 'century'
    ? yearToCenturyPosition(value, centuryBase) : yearToPosition(value, scaleMode));
  const yearOfPosition = (position) => (zoomMode === 'century'
    ? centuryPositionToYear(position, centuryBase) : positionToYear(position, scaleMode));
  /* Mesure ergonomique : délai gesture → effet, exposé seulement aux tests. */
  let gestureStart = 0;
  document.addEventListener('pointerdown', () => { gestureStart = performance.now(); }, { capture: true });
  document.addEventListener('keydown', (event) => {
    if (!event.repeat) gestureStart = performance.now();
  }, { capture: true });
  function markAction(name) {
    window.__vatlasLastAction = {
      name,
      latency: gestureStart ? Math.max(0, Math.round(performance.now() - gestureStart)) : 0,
    };
  }

  let showArcs = params.get('arcs') === '1';
  const PROGRESS_KEY = 'vectemporel-progress-v1';
  function loadProgress() {
    try {
      const data = JSON.parse(localStorage.getItem(PROGRESS_KEY));
      if (data && Array.isArray(data.regions)) return { regions: [], trails: [], centuries: [], ...data };
    } catch { /* stockage indisponible */ }
    return { regions: [], trails: [], centuries: [] };
  }
  const localProgress = loadProgress();
  function trackProgress(kind, value) {
    if (!localProgress[kind] || localProgress[kind].includes(value)) return;
    localProgress[kind].push(value);
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(localProgress)); } catch { /* ignoré */ }
  }

  let showSun = params.get('sun') === '1';
  let showWire = params.get('wire') === '1';
  let arcLinks = [];
  const navHistory = [];
  let navIndex = -1;
  let replayingNav = false;
  function recordNav() {
    if (replayingNav) return;
    const entry = { year, selected };
    const last = navHistory[navIndex];
    if (last && last.year === entry.year && last.selected === entry.selected) return;
    navHistory.splice(navIndex + 1);
    navHistory.push(entry);
    if (navHistory.length > 60) navHistory.shift();
    navIndex = navHistory.length - 1;
    renderHistoryList();
  }
  function navigateNav(delta) {
    const next = navIndex + delta;
    if (next < 0 || next >= navHistory.length) return;
    navIndex = next;
    const entry = navHistory[next];
    replayingNav = true;
    applyYear(entry.year);
    if (entry.selected) select(entry.selected);
    replayingNav = false;
    readout.textContent = `Historique : ${entry.year}${entry.selected ? ` · ${entry.selected}` : ''}.`;
  }

  /* Tab navigation parcimonieuse dans les grilles : un seul arrêt Tab,
   * puis les flèches pour circuler (roving tabindex). */
  function enableRoving(container, selector) {
    if (!container) return;
    const items = [...container.querySelectorAll(selector)];
    if (!items.length) return;
    items.forEach((item, index) => item.setAttribute('tabindex', index === 0 ? '0' : '-1'));
    for (const item of items) {
      item.addEventListener('focus', () => {
        for (const other of items) other.setAttribute('tabindex', other === item ? '0' : '-1');
      });
    }
    container.addEventListener('keydown', (event) => {
      const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      const current = items.indexOf(document.activeElement);
      if (current < 0) return;
      event.preventDefault();
      let next = current;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = items.length - 1;
      else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % items.length;
      else next = (current - 1 + items.length) % items.length;
      items[next].focus();
    });
  }

  function renderHistoryList() {
    const host = document.getElementById('history-list');
    if (!host) return;
    host.replaceChildren();
    const recent = navHistory.slice(-5);
    for (const [position, entry] of recent.entries()) {
      const absolute = navHistory.length - recent.length + position;
      const button = el('button', 'history-item', `${entry.year}${entry.selected ? ` · ${entry.selected}` : ''}`);
      button.type = 'button';
      button.setAttribute('aria-label', `Revenir à ${entry.year}${entry.selected ? `, ${entry.selected}` : ''}`);
      button.addEventListener('click', () => navigateNav(absolute - navIndex));
      host.appendChild(button);
    }
    if (!recent.length) host.appendChild(el('p', 'history-empty', 'Aucun déplacement enregistré.'));
  }
  const initialName = params.get('value');
  const initialPos = decodePos(params.get('pos'));

  const brand = el('div', 'hud-brand');
  const buildAsset = document.querySelector('link[rel="manifest"]')?.href || '';
  const buildHash = new URL(buildAsset, location.href).searchParams.get('v') || '';
  const versionLabel = `v0.2.0${buildHash ? ` · ${buildHash.slice(0, 7)}` : ''}`;
  brand.append(
    el('strong', '', 'HISTOIRE DU MONDE'),
    el('span', 'hud-version', versionLabel),
    el('span', '', `-2000 → 2000 · ${MAP_META.areas} régions · ${MAP_META.features} contours`),
  );
  const dimensions = el('div', 'dimension-bar');
  dimensions.id = 'dimension-bar';
  dimensions.setAttribute('role', 'radiogroup');
  dimensions.setAttribute('aria-label', 'Dimension des couleurs');
  let dimension = 'culture';
  let empireRuler = null;
  let dimensionBeforeEmpire = 'culture';
  function empireAreas(areas, ruler) {
    const result = {};
    for (const [name, row] of Object.entries(areas || {})) {
      result[name] = [...row, String(row?.[0]) === String(ruler) ? 'empire' : 'autre'];
    }
    return result;
  }
  function applyDimension() {
    if (empireRuler) globe?.setYearAreas(empireAreas(areasForYear, empireRuler), 'empire');
    else globe?.setYearAreas(areasForYear, dimension);
    refreshLabels();
  }
  for (const item of DIMENSIONS) {
    const button = el('button', 'dimension-btn', item.label);
    button.type = 'button';
    button.dataset.dimension = item.id;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(item.id === dimension));
    button.addEventListener('click', () => {
      if (item.id === 'empire') {
        if (empireRuler) {
          empireRuler = null;
          dimension = dimensionBeforeEmpire;
          readout.textContent = 'Focus empire désactivé.';
        } else if (selected && areasForYear?.[selected]) {
          empireRuler = String(areasForYear[selected][0] || '');
          dimensionBeforeEmpire = dimension;
          dimension = 'empire';
          const count = Object.values(areasForYear).filter((row) => String(row?.[0]) === empireRuler).length;
          readout.textContent = `Empire ${empireRuler} : ${count} régions mises en évidence.`;
        } else {
          readout.textContent = 'Sélectionnez d’abord une région pour isoler son empire.';
        }
      } else {
        empireRuler = null;
        dimension = item.id;
      }
      for (const other of dimensions.children) {
        const id = other.dataset.dimension;
        other.setAttribute('aria-checked', String(id === (empireRuler ? 'empire' : dimension)));
      }
      applyDimension();
      renderCard(selected);
    });
    dimensions.appendChild(button);
  }
  brand.appendChild(dimensions);

  const labelBar = el('div', 'label-bar');
  labelBar.id = 'label-bar';
  labelBar.setAttribute('role', 'radiogroup');
  labelBar.setAttribute('aria-label', 'Affichage des libellés');
  let labelMode = 'off';
  for (const mode of LABEL_MODES) {
    const button = el('button', 'label-btn', mode.label);
    button.type = 'button';
    button.dataset.mode = mode.id;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(mode.id === labelMode));
    button.addEventListener('click', () => {
      labelMode = mode.id;
      for (const other of labelBar.children) other.setAttribute('aria-checked', String(other === button));
      refreshLabels();
    });
    labelBar.appendChild(button);
  }
  brand.appendChild(labelBar);

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
  const displayButton = el('button', 'hud-btn', '☷');
  displayButton.type = 'button';
  displayButton.id = 'hud-display-button';
  displayButton.setAttribute('aria-label', 'Affichage des couleurs, libellés et événements');
  displayButton.setAttribute('aria-expanded', 'false');
  const reviewButton = el('button', 'hud-btn', '✦');
  reviewButton.type = 'button';
  reviewButton.id = 'hud-review-button';
  reviewButton.setAttribute('aria-label', 'Mode révision active (touche É)');
  const arcsButton = el('button', 'hud-btn', '⌁');
  arcsButton.type = 'button';
  arcsButton.id = 'hud-arcs-button';
  arcsButton.setAttribute('aria-label', 'Afficher les simultanéités (touche S)');
  arcsButton.setAttribute('aria-pressed', String(showArcs));
  const trailsButton = el('button', 'hud-btn', '❖');
  trailsButton.type = 'button';
  trailsButton.id = 'hud-trails-button';
  trailsButton.setAttribute('aria-label', 'Récits guidés (touche T)');
  trailsButton.setAttribute('aria-expanded', 'false');
  const sunButton = el('button', 'hud-btn', '☀');
  sunButton.type = 'button';
  sunButton.id = 'hud-sun-button';
  sunButton.setAttribute('aria-label', 'Afficher l’ombre solaire stylisée (touche Y)');
  sunButton.setAttribute('aria-pressed', 'false');
  const wireButton = el('button', 'hud-btn', '▦');
  wireButton.type = 'button';
  wireButton.id = 'hud-wire-button';
  wireButton.setAttribute('aria-label', 'Afficher la sphère en fil de fer (touche W)');
  wireButton.setAttribute('aria-pressed', 'false');
  const learnButton = el('button', 'hud-btn', '✧');
  learnButton.type = 'button';
  learnButton.id = 'hud-learn-button';
  learnButton.setAttribute('aria-label', 'Ouvrir les défis d’apprentissage (touche L)');
  learnButton.setAttribute('aria-expanded', 'false');
  const qualityButton = el('button', 'hud-btn', '⚑');
  qualityButton.type = 'button';
  qualityButton.id = 'hud-quality-button';
  qualityButton.setAttribute('aria-label', 'Voir les anomalies de capitale extraites de Chronas');
  qualityButton.setAttribute('aria-expanded', 'false');
  const compareButton = el('button', 'hud-btn', 'A/B');
  compareButton.type = 'button';
  compareButton.id = 'hud-compare-button';
  compareButton.setAttribute('aria-label', 'Comparer deux années (touche A)');
  compareButton.setAttribute('aria-expanded', 'false');
  const helpButton = el('button', 'hud-btn', '?');
  helpButton.type = 'button';
  helpButton.id = 'hud-help-button';
  helpButton.setAttribute('aria-label', 'Afficher les commandes (touche point d’interrogation)');
  /* Mobile : quatre actions primaires dans la zone pouce ; les bascules
   * secondaires rejoignent le tiroir Affichage via .hud-actions-more. */
  const actionsMore = el('div', 'hud-actions-more');
  actionsMore.id = 'hud-actions-more';
  const histographyButton = el('button', 'hud-btn', 'HIST');
  histographyButton.type = 'button';
  histographyButton.id = 'hud-histography-button';
  histographyButton.setAttribute('aria-label', 'Ouvrir la frise Histographie');
  histographyButton.setAttribute('aria-pressed', 'false');
  actionsMore.append(tourButton, arcsButton, sunButton, wireButton, histographyButton, qualityButton, compareButton, reviewButton, themeButton, helpButton);
  const toolsButton = el('button', 'hud-btn', '⋯');
  toolsButton.type = 'button';
  toolsButton.id = 'hud-tools-button';
  toolsButton.setAttribute('aria-label', 'Ouvrir les outils (13 commandes)');
  toolsButton.setAttribute('aria-expanded', 'false');
  toolsButton.setAttribute('aria-controls', 'hud-actions-more');
  toolsButton.addEventListener('click', () => {
    const open = !document.body.classList.contains('tools-open');
    document.body.classList.toggle('tools-open', open);
    toolsButton.setAttribute('aria-expanded', String(open));
  });
  actions.append(searchButton, displayButton, trailsButton, learnButton, toolsButton, actionsMore);
  const savedTheme = localStorage.getItem('history-theme');
  if (savedTheme === 'light') document.documentElement.dataset.theme = 'light';

  const card = el('section', 'hud-card');
  card.id = 'hud-card';
  card.setAttribute('aria-label', 'Région sélectionnée');
  card.setAttribute('role', 'dialog');
  card.hidden = true;
  const cardClose = el('button', 'hud-close', '✕');
  cardClose.type = 'button';
  cardClose.id = 'hud-card-close';
  cardClose.setAttribute('aria-label', 'Fermer la fiche');
  card.appendChild(cardClose);

  const displayPanel = el('div', 'hud-overlay display-panel');
  displayPanel.id = 'display-panel';
  displayPanel.hidden = true;
  displayPanel.append(el('h2', '', 'Affichage'));
  const toolsSection = el('div', 'display-tools');
  toolsSection.id = 'display-tools';
  toolsSection.appendChild(el('h3', '', 'Outils'));
  const toolButton = (label, id, handler) => {
    const button = el('button', 'hm-btn', label);
    button.type = 'button';
    button.id = id;
    button.addEventListener('click', handler);
    toolsSection.appendChild(button);
    return button;
  };
  toolButton('Recentrer la vue', 'tool-reset', () => {
    globe?.setView(DEFAULT_VIEW);
    readout.textContent = 'Vue recentrée.';
  });
  toolButton('Revenir à 1000', 'tool-year', () => applyYear(1000));
  toolButton('Copier le lien', 'tool-copy', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      readout.textContent = 'Lien copié dans le presse-papiers.';
    } catch {
      readout.textContent = 'Copie indisponible : sélectionnez l’adresse dans la barre du navigateur.';
    }
  });
  toolButton('Plein écran', 'tool-fullscreen', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      readout.textContent = 'Plein écran refusé par le navigateur.';
    }
  });
  toolButton('Mode zen', 'tool-zen', () => toggleZen());
  const historySection = el('div', 'history-section');
  historySection.id = 'history-section';
  historySection.appendChild(el('h3', '', 'Historique récent'));
  const historyList = el('div', 'history-list');
  historyList.id = 'history-list';
  historySection.appendChild(historyList);
  const historyClear = el('button', 'hm-btn', 'Effacer l’historique');
  historyClear.type = 'button';
  historyClear.id = 'history-clear';
  historyClear.addEventListener('click', () => {
    navHistory.length = 0;
    navIndex = -1;
    renderHistoryList();
    readout.textContent = 'Historique effacé.';
  });
  historySection.appendChild(historyClear);
  toolsSection.appendChild(historySection);
  toolButton('Exporter le profil', 'tool-export', () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      progress: localProgress,
      srs: learn?.srs() ?? null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'vectemporel-profil.json';
    link.click();
    URL.revokeObjectURL(link.href);
    readout.textContent = 'Profil exporté en JSON local.';
  });
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = 'application/json';
  importInput.id = 'tool-import';
  importInput.className = 'sr-only';
  importInput.setAttribute('aria-label', 'Importer un profil JSON local');
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      for (const key of ['regions', 'trails', 'centuries']) {
        if (Array.isArray(data?.progress?.[key])) {
          localProgress[key] = [...new Set([...localProgress[key], ...data.progress[key]])];
        }
      }
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(localProgress)); } catch { /* ignoré */ }
      readout.textContent = `Profil importé : ${localProgress.regions.length} régions, ${localProgress.trails.length} jalons.`;
    } catch {
      readout.textContent = 'Import impossible : fichier JSON invalide.';
    }
    importInput.value = '';
  });
  toolsSection.appendChild(importInput);
  toolButton('Importer un profil', 'tool-import-button', () => importInput.click());
  displayPanel.appendChild(toolsSection);
  const themeSection = el('div', 'display-tools');
  themeSection.id = 'display-theme';
  themeSection.appendChild(el('h3', '', 'Thème'));
  const themeGroup = el('div', 'theme-group');
  themeGroup.id = 'theme-group';
  themeGroup.setAttribute('role', 'radiogroup');
  themeGroup.setAttribute('aria-label', 'Choix du thème');
  for (const [label, mode] of [['Sombre', 'dark'], ['Clair', 'light'], ['Système', 'system']]) {
    const button = el('button', 'hm-btn', label);
    button.type = 'button';
    button.dataset.theme = mode;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
    button.addEventListener('click', () => applyTheme(mode));
    themeGroup.appendChild(button);
  }
  themeSection.appendChild(themeGroup);
  displayPanel.appendChild(themeSection);
  const reportsSection = el('div', 'display-tools');
  reportsSection.id = 'display-reports';
  reportsSection.appendChild(el('h3', '', 'Récits d’un item'));
  for (const [label, id, reportId] of [
    ['Lignée du Dauphiné', 'report-open-dauphine', 'dauphine'],
    ['Histoire du catholicisme', 'report-open-catholicisme', 'catholicisme'],
  ]) {
    const button = el('button', 'hm-btn', label);
    button.type = 'button';
    button.id = id;
    button.addEventListener('click', () => openReport(reportId));
    reportsSection.appendChild(button);
  }
  displayPanel.appendChild(reportsSection);

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

  const arcHost = el('div', 'arc-host');
  arcHost.id = 'arc-host';
  const arcTip = el('div', 'arc-tip');
  arcTip.id = 'arc-tip';
  arcTip.setAttribute('role', 'status');
  arcTip.setAttribute('aria-live', 'polite');
  arcTip.hidden = true;

  const helpOverlay = el('div', 'hud-overlay');
  helpOverlay.id = 'hud-help';
  helpOverlay.hidden = true;
  helpOverlay.append(el('h2', '', 'Commandes'));
  const help = el('p', 'hud-help');
  help.innerHTML = '<kbd>Glisser</kbd> tourner la sphère · <kbd>Molette</kbd> zoomer vers le curseur<br>'
    + '<kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> tourner · <kbd>Maj+flèches</kbd> rotation fine<br>'
    + '<kbd>+</kbd><kbd>−</kbd> zoomer · <kbd>R</kbd> recentrer · <kbd>Double-clic</kbd> zoomer<br>'
    + '<kbd>/</kbd> recherche · <kbd>É</kbd> révision · <kbd>?</kbd> aide · <kbd>Échap</kbd> fermer<br>'
    + '<kbd>T</kbd> récits · <kbd>L</kbd> apprendre · <kbd>A</kbd> comparer · <kbd>H</kbd> Histomap<br>'
    + '<kbd>Ctrl+K</kbd> recherche · <kbd>Z</kbd> mode zen · <kbd>Y</kbd> ombre · <kbd>W</kbd> fil de fer<br>'
    + '<kbd>Alt+←/→</kbd> historique · <kbd>▶</kbd> tour du monde (manuel uniquement)<br>'
    + '<kbd>Clic</kbd> sélectionner une région · <kbd>Curseur</kbd> changer d’année';
  helpOverlay.appendChild(help);

  const readout = el('p', 'hud-readout');
  readout.id = 'hud-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const error = el('p', 'hud-error');
  error.id = 'hud-error';
  error.hidden = true;

  /* Widget de budget réservé au pont devtools : jamais en production. */
  let budgetWidget = null;
  if (params.has('devtools')) {
    budgetWidget = el('div', 'budget-widget');
    budgetWidget.id = 'budget-widget';
    budgetWidget.setAttribute('role', 'status');
    budgetWidget.textContent = 'Budget : mesure en cours…';
  }

  /* Timeline — F15 à F20. */
  const timeline = el('section', 'timeline');
  timeline.id = 'timeline';
  timeline.setAttribute('aria-label', 'Frise chronologique');
  const eraBands = el('div', 'era-bands');
  eraBands.setAttribute('aria-hidden', 'true');
  for (const era of ERAS) {
    const band = el('span', 'era-band', era.label);
    band.style.left = `${((era.start - MIN_YEAR) / SPAN) * 100}%`;
    band.style.width = `${((era.end - era.start) / SPAN) * 100}%`;
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
  slider.min = '0';
  slider.max = zoomMode === 'century' ? String(CENTURY_STEPS) : '1000';
  slider.step = '1';
  slider.value = String(positionOf(year));
  slider.setAttribute('aria-label', `Année sur l'échelle ${SCALE_LABELS[scaleMode].toLowerCase()}`);
  slider.setAttribute('aria-valuetext', String(year));
  const play = el('button', 'hud-btn timeline-play', '▶');
  play.type = 'button';
  play.id = 'timeline-play';
  play.setAttribute('aria-label', 'Lancer la lecture des années');
  play.setAttribute('aria-pressed', 'false');
  const scrub = el('div', 'timeline-scrub');
  scrub.append(yearLabel, slider, play);
  const centuries = el('div', 'century-nav');
  centuries.setAttribute('role', 'group');
  centuries.setAttribute('aria-label', 'Sauts de siècle');
  for (const mark of [-2000, -1000, 0, 1000, 2000]) {
    const button = el('button', 'century-btn', String(mark));
    button.type = 'button';
    button.dataset.year = String(mark);
    centuries.appendChild(button);
  }
  const turningStrip = el('div', 'turning-strip');
  turningStrip.id = 'turning-strip';
  turningStrip.setAttribute('role', 'group');
  turningStrip.setAttribute('aria-label', 'Points de rupture détectés dans Chronas');
  for (const point of TURNING_POINTS.points) {
    const badge = el('button', 'turning-badge', point.year < 0 ? `−${-point.year}` : String(point.year));
    badge.type = 'button';
    badge.dataset.year = String(point.year);
    badge.setAttribute('aria-label', `Rupture en ${point.year} : ${point.rulers} régions changent de souverain. Ouvrir.`);
    badge.addEventListener('click', () => {
      applyYear(point.year, { notify: false });
      params.set('turn', String(point.year));
      writeUrl(params);
      if (point.provinces[0]) select(point.provinces[0]);
      showTurningProvinces(point);
      readout.textContent = `${point.label} · extrait Chronas CC BY-SA 4.0.`;
      for (const other of turningStrip.children) other.setAttribute('aria-current', String(other === badge));
    });
    turningStrip.appendChild(badge);
  }
  const turningProvinces = el('div', 'turning-provinces');
  turningProvinces.id = 'turning-provinces';
  turningProvinces.hidden = true;
  function showTurningProvinces(point) {
    centuries.hidden = true;
    turningStrip.hidden = true;
    turningProvinces.hidden = false;
    turningProvinces.replaceChildren();
    const back = el('button', 'turning-back', '← Repères');
    back.type = 'button';
    back.addEventListener('click', () => {
      turningProvinces.hidden = true;
      centuries.hidden = false;
      turningStrip.hidden = false;
    });
    turningProvinces.appendChild(back);
    for (const name of point.provinces) {
      const button = el('button', 'turning-province', name);
      button.type = 'button';
      button.setAttribute('aria-label', `Ouvrir ${name}, province de la rupture de ${point.year}`);
      button.addEventListener('click', () => {
        select(name);
        readout.textContent = `${name} · rupture de ${point.year} · extrait Chronas CC BY-SA 4.0.`;
      });
      turningProvinces.appendChild(button);
    }
  }
  const marks = el('div', 'timeline-marks');
  marks.id = 'timeline-marks';
  marks.append(centuries, turningStrip, turningProvinces);
  const minimapRow = el('div', 'timeline-minimap-row');
  const minimap = el('div', 'timeline-minimap');
  const density = el('div', 'timeline-minimap-density');
  density.setAttribute('aria-hidden', 'true');
  function renderDensity(list) {
    const counts = densityBuckets(list.map(epicYear), 80);
    const peak = Math.max(1, ...counts);
    density.replaceChildren();
    for (const count of counts) {
      const bar = el('span', 'minimap-bar');
      bar.style.height = `${Math.round((count / peak) * 100)}%`;
      density.appendChild(bar);
    }
  }
  renderDensity(EPICS);
  const minimapRange = document.createElement('input');
  minimapRange.type = 'range';
  minimapRange.id = 'timeline-minimap-range';
  minimapRange.className = 'timeline-minimap-range';
  minimapRange.min = '0';
  minimapRange.max = '1000';
  minimapRange.step = '1';
  minimapRange.value = String(yearToPosition(year, 'linear'));
  minimapRange.setAttribute('aria-label', 'Repères de la frise (échelle linéaire)');
  minimapRange.setAttribute('aria-valuetext', String(year));
  minimap.append(density, minimapRange);
  const scaleButton = el('button', 'timeline-scale', SCALE_LABELS[scaleMode]);
  scaleButton.type = 'button';
  scaleButton.id = 'timeline-scale';
  scaleButton.setAttribute('aria-pressed', String(scaleMode === 'recent'));
  scaleButton.setAttribute('aria-label', 'Basculer l’échelle de la frise entre linéaire et récents');
  const histomapButton = el('button', 'timeline-scale', 'Histomap');
  histomapButton.type = 'button';
  histomapButton.id = 'hud-histomap-button';
  histomapButton.setAttribute('aria-pressed', 'false');
  histomapButton.setAttribute('aria-label', 'Ouvrir l’Histomap des familles culturelles (touche H)');
  const turningListButton = el('button', 'timeline-scale', 'Ruptures');
  turningListButton.type = 'button';
  turningListButton.id = 'timeline-turning';
  turningListButton.setAttribute('aria-label', 'Ouvrir la liste verticale des ruptures');
  const zoomButton = el('button', 'timeline-scale', zoomMode === 'century' ? 'Siècle' : '4 001 ans');
  zoomButton.type = 'button';
  zoomButton.id = 'timeline-zoom';
  zoomButton.setAttribute('aria-pressed', String(zoomMode === 'century'));
  zoomButton.setAttribute('aria-label', 'Basculer le zoom de la frise entre 4 001 ans et un siècle');
  minimapRow.append(minimap, scaleButton, zoomButton, turningListButton, histomapButton);
  turningListButton.addEventListener('click', () => {
    markAction('ruptures');
    turningDrawer.hidden = !turningDrawer.hidden;
    document.body.classList.toggle('turning-open', !turningDrawer.hidden);
  });
  const loading = el('span', 'timeline-loading', '');
  loading.id = 'timeline-loading';
  loading.hidden = true;
  const epicHost = el('div', 'epic-host');
  epicHost.id = 'epic-host';
  timeline.append(epicHost, eraBands, scrub, marks, minimapRow, loading);

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

  const reviewPanel = el('section', 'hud-overlay review-panel');
  reviewPanel.id = 'review-panel';
  reviewPanel.setAttribute('role', 'dialog');
  reviewPanel.setAttribute('aria-label', 'Révision active');
  reviewPanel.hidden = true;
  const reviewClose = el('button', 'hud-close review-close', '✕');
  reviewClose.type = 'button';
  reviewClose.id = 'review-close';
  reviewClose.setAttribute('aria-label', 'Fermer la révision');
  const reviewMeta = el('p', 'review-meta');
  reviewMeta.id = 'review-meta';
  const reviewPrompt = el('p', 'review-prompt');
  reviewPrompt.id = 'review-prompt';
  const reviewOptions = el('div', 'review-options');
  reviewOptions.id = 'review-options';
  for (let index = 0; index < 4; index += 1) {
    const option = el('button', 'review-option', '');
    option.type = 'button';
    option.dataset.option = String(index);
    reviewOptions.appendChild(option);
  }
  const reviewSkip = el('button', 'review-skip', 'Je ne sais pas');
  reviewSkip.type = 'button';
  reviewSkip.id = 'review-skip';
  const reviewFeedback = el('p', 'review-feedback');
  reviewFeedback.id = 'review-feedback';
  reviewFeedback.setAttribute('role', 'status');
  reviewFeedback.setAttribute('aria-live', 'polite');
  const reviewSource = el('p', 'review-source');
  reviewSource.id = 'review-source';
  const reviewNext = el('button', 'review-next', 'Suivant →');
  reviewNext.type = 'button';
  reviewNext.id = 'review-next';
  reviewNext.hidden = true;
  reviewPanel.append(reviewClose, reviewMeta, reviewPrompt, reviewOptions, reviewSkip, reviewFeedback, reviewSource, reviewNext);

  const trailsPanel = el('section', 'hud-overlay trails-panel');
  trailsPanel.id = 'trails-panel';
  trailsPanel.setAttribute('role', 'dialog');
  trailsPanel.setAttribute('aria-label', 'Récits guidés');
  trailsPanel.hidden = true;
  const trailsClose = el('button', 'hud-close review-close', '✕');
  trailsClose.type = 'button';
  trailsClose.id = 'trails-close';
  trailsClose.setAttribute('aria-label', 'Fermer les récits');
  const trailsKicker = el('p', 'trails-kicker', 'Récits guidés');
  trailsKicker.id = 'trails-kicker';
  const trailsTitle = el('h2', 'trails-title', 'Dix parcours dans Chronas');
  trailsTitle.id = 'trails-title';
  const trailsList = el('div', 'trails-list');
  trailsList.id = 'trails-list';
  const trailFilters = el('div', 'trail-filters');
  const difficultyFilter = document.createElement('select');
  difficultyFilter.id = 'trail-difficulty';
  difficultyFilter.className = 'trail-select';
  difficultyFilter.setAttribute('aria-label', 'Filtrer les récits par difficulté');
  for (const value of ['tous', 'débutant', 'intermédiaire', 'expert']) {
    const option = el('option', '', value === 'tous' ? 'Toutes les difficultés' : value);
    option.value = value;
    difficultyFilter.appendChild(option);
  }
  const tagFilter = document.createElement('select');
  tagFilter.id = 'trail-tag';
  tagFilter.className = 'trail-select';
  tagFilter.setAttribute('aria-label', 'Filtrer les récits par thème');
  const allTags = el('option', '', 'Tous les thèmes');
  allTags.value = 'tous';
  tagFilter.appendChild(allTags);
  for (const tag of [...new Set(TRAILS.trails.flatMap((trail) => trail.tags))].sort((a, b) => a.localeCompare(b, 'fr'))) {
    const option = el('option', '', tag);
    option.value = tag;
    tagFilter.appendChild(option);
  }
  function filterTrails() {
    const difficulty = difficultyFilter.value;
    const tag = tagFilter.value;
    let shown = 0;
    for (const item of trailsList.children) {
      const visible = (difficulty === 'tous' || item.dataset.difficulty === difficulty)
        && (tag === 'tous' || item.dataset.tags.split('|').includes(tag));
      item.hidden = !visible;
      if (visible) shown += 1;
    }
    trailsList.dataset.visible = String(shown);
  }
  difficultyFilter.addEventListener('change', filterTrails);
  tagFilter.addEventListener('change', filterTrails);
  trailFilters.append(difficultyFilter, tagFilter);
  for (const trail of TRAILS.trails) {
    const item = el('button', 'trail-item');
    item.type = 'button';
    item.dataset.trail = trail.id;
    item.dataset.difficulty = trail.difficulty;
    item.dataset.tags = trail.tags.join('|');
    item.append(el('strong', '', trail.title), el('span', `${trail.difficulty} · ${trail.duration} min · ${trail.tags.join(', ')}`), el('span', '', trail.subtitle));
    item.addEventListener('click', () => startTrail(trail.id, 0));
    trailsList.appendChild(item);
  }
  filterTrails();
  const trailsStep = el('div', 'trails-step');
  trailsStep.id = 'trails-step';
  trailsStep.hidden = true;
  const trailsStepKicker = el('p', 'trails-step-kicker');
  trailsStepKicker.id = 'trails-step-kicker';
  const trailsStepTitle = el('h3', 'trails-step-title');
  trailsStepTitle.id = 'trails-step-title';
  const trailsStepText = el('p', 'trails-step-text');
  trailsStepText.id = 'trails-step-text';
  const trailsFacts = el('dl', 'trails-facts');
  trailsFacts.id = 'trails-facts';
  const trailsEvidence = el('p', 'trails-evidence');
  trailsEvidence.id = 'trails-evidence';
  const trailsNav = el('div', 'trails-nav');
  const trailsPrev = el('button', 'trails-btn', '← Précédent');
  trailsPrev.type = 'button';
  trailsPrev.id = 'trails-prev';
  const trailsNext = el('button', 'trails-btn trails-btn-next', 'Suivant →');
  trailsNext.type = 'button';
  trailsNext.id = 'trails-next';
  const trailsStop = el('button', 'trails-btn trails-btn-quiet', 'Quitter');
  trailsStop.type = 'button';
  trailsStop.id = 'trails-stop';
  trailsNav.append(trailsPrev, trailsNext, trailsStop);
  trailsStep.append(trailsStepKicker, trailsStepTitle, trailsStepText, trailsFacts, trailsEvidence, trailsNav);
  trailsPanel.append(trailsClose, trailsKicker, trailsTitle, trailFilters, trailsList, trailsStep);

  const histomapPanel = el('section', 'hud-overlay histomap-panel');
  histomapPanel.id = 'histomap-panel';
  histomapPanel.setAttribute('role', 'dialog');
  histomapPanel.setAttribute('aria-label', 'Histomap des familles culturelles');
  histomapPanel.hidden = true;
  const hmHead = el('div', 'hm-head');
  hmHead.appendChild(el('h2', '', 'Histomap — qui vivait où, à chaque siècle'));
  const hmClose = el('button', 'hm-close', '✕');
  hmClose.type = 'button';
  hmClose.id = 'histomap-close';
  hmClose.setAttribute('aria-label', 'Fermer l’Histomap');
  hmHead.appendChild(hmClose);
  const hmTools = el('div', 'hm-tools');
  const hmScale = el('button', 'hm-btn', SCALE_LABELS[scaleMode]);
  hmScale.type = 'button';
  hmScale.id = 'histomap-scale';
  hmScale.setAttribute('aria-pressed', String(scaleMode === 'recent'));
  hmScale.setAttribute('aria-label', 'Échelle de l’Histomap');
  hmTools.appendChild(hmScale);
  const hmHost = el('div', 'hm-host');
  hmHost.id = 'hm-host';
  histomapPanel.append(hmHead, hmTools, hmHost);

  const learnPanel = el('section', 'hud-overlay learn-panel');
  learnPanel.id = 'learn-panel';
  learnPanel.setAttribute('role', 'dialog');
  learnPanel.setAttribute('aria-label', 'Défis d’apprentissage locaux');
  learnPanel.hidden = true;

  const histographyPanel = el('div', 'histography-panel');
  histographyPanel.id = 'histography-panel';
  histographyPanel.setAttribute('role', 'dialog');
  histographyPanel.setAttribute('aria-label', 'Frise des événements historiques');
  histographyPanel.hidden = true;
  const histographyClose = el('button', 'histo-close', 'Fermer ✕');
  histographyClose.type = 'button';
  histographyClose.id = 'histography-close';
  histographyClose.addEventListener('click', () => closeHistography());
  const histographyHost = el('div', 'histography-host');
  histographyHost.id = 'histography-host';
  histographyPanel.append(histographyClose, histographyHost);
  const histographyDrawer = el('button', 'histo-drawer-button', '☰');
  histographyDrawer.type = 'button';
  histographyDrawer.id = 'histography-drawer';
  histographyDrawer.setAttribute('aria-label', 'Afficher les catégories');
  histographyDrawer.addEventListener('click', () => document.body.classList.toggle('histo-drawer'));
  histographyPanel.appendChild(histographyDrawer);

  const subjectPanel = el('section', 'hud-overlay subject-panel');
  subjectPanel.id = 'subject-panel';
  subjectPanel.setAttribute('role', 'dialog');
  subjectPanel.setAttribute('aria-label', 'Articles Wikipédia du sujet');
  subjectPanel.hidden = true;
  const subjectHost = el('div', 'subject-host');
  subjectHost.id = 'subject-host';
  subjectPanel.appendChild(subjectHost);

  const reportPanel = el('section', 'hud-overlay report-panel');
  reportPanel.id = 'report-panel';
  reportPanel.setAttribute('role', 'dialog');
  reportPanel.setAttribute('aria-label', 'Récit de la province');
  reportPanel.hidden = true;
  const reportClose = el('button', 'hm-close', '✕');
  reportClose.type = 'button';
  reportClose.id = 'report-close';
  reportClose.setAttribute('aria-label', 'Fermer le récit');
  const reportHost = el('div', 'report-host');
  reportHost.id = 'report-host';
  reportPanel.append(reportClose, reportHost);

  const qualityPanel = el('section', 'hud-overlay quality-panel');
  qualityPanel.id = 'quality-panel';
  qualityPanel.setAttribute('role', 'dialog');
  qualityPanel.setAttribute('aria-label', 'Anomalies de capitales dans Chronas');
  qualityPanel.hidden = true;
  const qualityClose = el('button', 'hm-close', '✕');
  qualityClose.type = 'button';
  qualityClose.id = 'quality-close';
  qualityClose.setAttribute('aria-label', 'Fermer les anomalies');
  const qualityTitle = el('h2', '', 'Qualité des données');
  const qualityMeta = el('p', 'quality-meta', `${ANOMALIES.meta.count} extraits Chronas : capitales qui changent sans changement de souverain. L'an 1 est exclu comme artefact.`);
  const qualityList = el('div', 'quality-list');
  qualityList.id = 'quality-list';
  for (const item of ANOMALIES.items.slice(0, 12)) {
    const button = el('button', 'quality-item');
    button.type = 'button';
    button.append(el('strong', '', `${item.year} · ${item.province}`), el('span', '', `${item.from} → ${item.to}`));
    button.addEventListener('click', () => {
      applyYear(item.year, { notify: false });
      select(item.province);
      readout.textContent = `${item.province} en ${item.year} : capitale ${item.from} → ${item.to}. Extrait Chronas CC BY-SA 4.0.`;
    });
    qualityList.appendChild(button);
  }
  qualityPanel.append(qualityClose, qualityTitle, qualityMeta, qualityList);

  const turningDrawer = el('section', 'hud-overlay turning-drawer');
  turningDrawer.id = 'turning-drawer';
  turningDrawer.setAttribute('role', 'dialog');
  turningDrawer.setAttribute('aria-label', 'Liste des ruptures par siècle');
  turningDrawer.hidden = true;
  const turningDrawerTitle = el('h2', '', 'Ruptures détectées');
  const centuryCount = new Set(TURNING_POINTS.points.map((point) => Math.floor(point.year / 100))).size;
  const turningDrawerMeta = el('p', 'learn-meta', `${TURNING_POINTS.points.length} extraits Chronas · ${centuryCount} siècles`);
  const turningDrawerList = el('div', 'turning-drawer-list');
  turningDrawerList.id = 'turning-drawer-list';
  let currentCentury = null;
  for (const point of TURNING_POINTS.points) {
    const century = Math.floor(point.year / 100) * 100;
    if (century !== currentCentury) {
      currentCentury = century;
      turningDrawerList.appendChild(el('h3', 'turning-century', century < 0 ? `${-century} av. J.-C.` : `${century} apr. J.-C.`));
    }
    const item = el('button', 'turning-drawer-item', `${point.year < 0 ? `−${-point.year}` : point.year} · ${point.provinces[0] || ''}`);
    item.type = 'button';
    item.setAttribute('aria-label', `Rupture en ${point.year}, ${point.rulers} régions`);
    item.addEventListener('click', () => {
      applyYear(point.year, { notify: false });
      if (point.provinces[0]) select(point.provinces[0]);
      showTurningProvinces(point);
      markAction('rupture');
      turningDrawer.hidden = true;
      document.body.classList.remove('turning-open');
    });
    turningDrawerList.appendChild(item);
  }
  turningDrawer.append(turningDrawerTitle, turningDrawerMeta, turningDrawerList);

  const comparePanel = el('section', 'hud-overlay compare-panel');
  comparePanel.id = 'compare-panel';
  comparePanel.setAttribute('role', 'dialog');
  comparePanel.setAttribute('aria-label', 'Comparer deux années');
  comparePanel.hidden = true;
  const compareClose = el('button', 'hm-close', '✕');
  compareClose.type = 'button';
  compareClose.id = 'compare-close';
  compareClose.setAttribute('aria-label', 'Fermer la comparaison');
  const compareTitle = el('h2', '', 'Comparer deux années');
  const compareInputs = el('div', 'compare-inputs');
  const compareA = document.createElement('input');
  compareA.type = 'number';
  compareA.id = 'compare-a';
  compareA.min = String(MIN_YEAR);
  compareA.max = String(MAX_YEAR);
  compareA.value = '1000';
  compareA.setAttribute('aria-label', 'Première année');
  const compareB = document.createElement('input');
  compareB.type = 'number';
  compareB.id = 'compare-b';
  compareB.min = String(MIN_YEAR);
  compareB.max = String(MAX_YEAR);
  compareB.value = '1500';
  compareB.setAttribute('aria-label', 'Deuxième année');
  compareInputs.append(compareA, compareB);
  const comparePresets = el('div', 'compare-presets');
  comparePresets.id = 'compare-presets';
  for (const [label, a, b] of [
    ['Antiquité → Moyen Âge', -500, 500], ['Médiéval → Moderne', 1000, 1500], ['Moderne → Contemporain', 1800, 2000],
  ]) {
    const preset = el('button', 'hm-btn', label);
    preset.type = 'button';
    preset.addEventListener('click', () => {
      compareA.value = String(a);
      compareB.value = String(b);
      runCompare(a, b);
    });
    comparePresets.appendChild(preset);
  }
  const compareCurrent = el('button', 'hm-btn', 'Comparer avec l’année courante');
  compareCurrent.type = 'button';
  compareCurrent.id = 'compare-current';
  compareCurrent.addEventListener('click', () => {
    compareB.value = String(year);
    runCompare(Number(compareA.value), year);
  });
  const compareRun = el('button', 'hm-btn', 'Comparer');
  compareRun.type = 'button';
  compareRun.id = 'compare-run';
  const compareResult = el('p', 'compare-result');
  compareResult.id = 'compare-result';
  compareResult.setAttribute('role', 'status');
  compareResult.setAttribute('aria-live', 'polite');
  const compareBars = el('div', 'compare-bars');
  compareBars.id = 'compare-bars';
  comparePanel.append(compareClose, compareTitle, compareInputs, comparePresets, compareRun, compareCurrent, compareResult, compareBars);

  const navControls = el('div', 'nav-controls');
  navControls.id = 'nav-controls';
  navControls.setAttribute('role', 'group');
  navControls.setAttribute('aria-label', 'Navigation de la sphère');
  const zoomIn = el('button', 'hud-btn', '+');
  zoomIn.type = 'button';
  zoomIn.id = 'nav-zoom-in';
  zoomIn.setAttribute('aria-label', 'Zoomer');
  const zoomOut = el('button', 'hud-btn', '−');
  zoomOut.type = 'button';
  zoomOut.id = 'nav-zoom-out';
  zoomOut.setAttribute('aria-label', 'Dézoomer');
  const recenter = el('button', 'hud-btn', '⌖');
  recenter.type = 'button';
  recenter.id = 'nav-recenter';
  recenter.setAttribute('aria-label', 'Recentrer la sphère');
  navControls.append(zoomIn, zoomOut, recenter);

  hud.append(brand, actions, card, tooltip, arcHost, arcTip, searchOverlay, helpOverlay, yearDialog, reviewPanel, trailsPanel, histomapPanel, learnPanel, qualityPanel, turningDrawer, comparePanel, reportPanel, histographyPanel, subjectPanel, readout, timeline, navControls, displayPanel, error);

  const friseCanvas = el('div', 'pixi-timeline-host');
  timeline.prepend(friseCanvas);
  const friseEvents = [
    ...EPICS.map((epic) => ({ id: epic[0], year: epicYear(epic), title: epic[1], category: categoryOf(epic[4]) })),
    ...TURNING_POINTS.points.map((point) => ({ id: `turn-${point.year}`, year: point.year, title: point.label || 'Rupture', category: 'rupture' })),
  ];
  const friseTimeline = new PixiTimeline(friseCanvas, {
    events: friseEvents, mode: 'years', title: 'Frise des événements', year,
    onYear: (value) => { if (Number.isFinite(value)) applyYear(value, { notify: false, reopenCard: false }); },
    onSelect: (event) => { if (Number.isFinite(event.year)) applyYear(event.year); },
  });
  if (budgetWidget) hud.appendChild(budgetWidget);

  const panelIndicator = el('div', 'panel-indicator');
  panelIndicator.id = 'panel-indicator';
  hud.appendChild(panelIndicator);

  /* Aide au survol sur les contrôles nommés (hors canvas, qui garde son
   * aria-label mais aucun title natif afin d'éviter une double infobulle). */
  for (const node of document.querySelectorAll('[aria-label]')) {
    if (node.id !== 'globe-canvas' && !node.title) node.title = node.getAttribute('aria-label');
  }

  /* Premier lancement : bandeau non modal, trois étapes, mémorisé localement. */
  if (!localStorage.getItem('vectemporel-onboarded')) {
    const steps = [
      'Tournez la sphère en glissant ; cliquez une région pour ouvrir sa fiche.',
      'La frise couvre 4 001 ans : curseur, siècles, échelle et minimap.',
      '❖ récits, ✧ apprentissage, ⚑ qualité des données : tout est local.',
    ];
    let step = 0;
    const banner = el('div', 'onboarding');
    banner.id = 'onboarding';
    banner.setAttribute('role', 'status');
    const bannerText = el('p', 'onboarding-text', steps[0]);
    const next = el('button', 'onboarding-next', 'Suivant →');
    next.type = 'button';
    next.addEventListener('click', () => {
      step += 1;
      if (step >= steps.length) {
        banner.remove();
        localStorage.setItem('vectemporel-onboarded', '1');
      } else {
        bannerText.textContent = steps[step];
      }
    });
    const skip = el('button', 'onboarding-skip', 'Passer');
    skip.type = 'button';
    skip.addEventListener('click', () => {
      banner.remove();
      localStorage.setItem('vectemporel-onboarded', '1');
    });
    banner.append(bannerText, next, skip);
    hud.appendChild(banner);
  }

  const labelRenderer = createLabelRenderer(document.getElementById('globe-labels'));
  const epicTimeline = createEpicTimeline(epicHost, (epic) => {
    const target = epicYear(epic);
    applyYear(target);
    readout.textContent = `${epic[1]} · ${categoryOf(epic[4])} · ${target}.`;
  });
  epicTimeline.filter.addEventListener('change', () => {
    renderDensity(epicTimeline.visible());
    if (epicTimeline.filter.value === 'all') params.delete('epic');
    else params.set('epic', epicTimeline.filter.value);
    writeUrl(params);
  });

  const mobileQuery = window.matchMedia('(max-width: 760px)');
  function arrangeControls() {
    const mobile = mobileQuery.matches;
    document.body.classList.toggle('is-mobile', mobile);
    const barsTarget = mobile ? displayPanel : brand;
    for (const bar of [dimensions, labelBar]) {
      if (bar.parentElement !== barsTarget) barsTarget.appendChild(bar);
    }
    const pickerTarget = mobile ? displayPanel : epicHost;
    if (epicTimeline.controls.parentElement !== pickerTarget) {
      pickerTarget.appendChild(epicTimeline.controls);
    }
    if (reviewButton.parentElement !== actionsMore) actionsMore.appendChild(reviewButton);
    if (!mobile) {
      displayPanel.hidden = true;
      displayButton.setAttribute('aria-expanded', 'false');
    }
  }
  arrangeControls();
  mobileQuery.addEventListener?.('change', arrangeControls);

  function toggleDisplayPanel() {
    displayPanel.hidden = !displayPanel.hidden;
    /* Sur mobile, les bascules secondaires vivent dans le panneau Affichage
     * plutôt que de flotter au-dessus de la frise. */
    if (mobileQuery.matches) {
      if (displayPanel.hidden) actions.appendChild(actionsMore);
      else displayPanel.appendChild(actionsMore);
    }
    document.body.classList.toggle('display-open', !displayPanel.hidden);
    displayButton.setAttribute('aria-expanded', String(!displayPanel.hidden));
    if (!displayPanel.hidden && !reviewPanel.hidden) closeReview();
  }

  function reviewSnapshot() {
    if (!reviewSession || !learning) {
      return { active: !reviewPanel.hidden, seed: reviewSeed, total: 0, position: 0, correct: 0 };
    }
    return {
      active: !reviewPanel.hidden,
      seed: reviewSeed,
      ...reviewSession.progress(),
      summary: learning.srsSummary(srsState),
    };
  }

  function renderReviewQuestion() {
    const question = reviewSession.current();
    if (!question) {
      reviewMeta.textContent = `Session terminée · graine ${reviewSeed}`;
      reviewPrompt.textContent = 'Bien joué. Relance une session pour continuer.';
      reviewOptions.replaceChildren();
      reviewSkip.hidden = true;
      reviewSource.textContent = '';
      reviewNext.textContent = 'Nouvelle session';
      reviewNext.hidden = false;
      return;
    }
    const progress = reviewSession.progress();
    const summary = learning.srsSummary(srsState);
    reviewMeta.textContent = `Carte ${progress.position + 1}/${progress.total} · graine ${reviewSeed} · dues ${summary.due} · réussites ${summary.correct}`;
    reviewPrompt.textContent = question.prompt;
    reviewSkip.hidden = false;
    reviewFeedback.textContent = '';
    reviewSource.textContent = `Source : Chronas · ${question.source.field} · ${question.year} · CC BY-SA 4.0`;
    reviewNext.hidden = true;
    [...reviewOptions.children].forEach((button, index) => {
      button.textContent = `${index + 1}. ${question.options[index]}`;
      button.disabled = false;
      button.className = 'review-option';
      button.hidden = false;
    });
  }

  function startReviewSession() {
    reviewSession = learning.createSession({
      pool: learning.getQuestionPool(),
      srs: srsState,
      seed: reviewSeed,
      limit: 10,
    });
    renderReviewQuestion();
  }

  async function openReview() {
    closeCard();
    searchOverlay.hidden = true;
    helpOverlay.hidden = true;
    yearDialog.hidden = true;
    displayPanel.hidden = true;
    displayButton.setAttribute('aria-expanded', 'false');
    reviewPanel.hidden = false;
    if (!learning) {
      learning = await import('./learning/review.js');
      srsState = learning.loadSrs();
      startReviewSession();
    } else if (!reviewSession || reviewSession.progress().done) {
      startReviewSession();
    }
    reviewClose.focus();
  }

  function closeReview() {
    reviewPanel.hidden = true;
    reviewButton.focus?.();
  }

  function answerReview(index) {
    const result = reviewSession?.answer(index);
    if (!result) return;
    learning.saveSrs(srsState);
    [...reviewOptions.children].forEach((button, position) => {
      button.disabled = true;
      if (position === result.answerIndex) button.classList.add('correct');
      else if (position === index && !result.correct) button.classList.add('wrong');
    });
    reviewFeedback.textContent = result.correct
      ? 'Correct — carte promue à la boîte suivante.'
      : `Réponse : ${result.question.options[result.answerIndex]} — carte revenue en boîte 1.`;
    reviewNext.hidden = false;
    reviewNext.focus();
  }

  function skipReview() {
    reviewSession?.skip();
    learning.saveSrs(srsState);
    const question = reviewSession?.current();
    reviewFeedback.textContent = question
      ? `Réponse : ${question.options[question.answerIndex]} — carte revenue en boîte 1.`
      : 'Session terminée.';
    reviewNext.hidden = false;
    reviewNext.focus();
  }

  let selected = null;
  let learning = null;
  let srsState = null;
  let reviewSession = null;
  const reviewSeed = 20261121;
  let cardReturnFocus = null;
  let areasForYear = null;
  let provinceTimelineToken = 0;
  let provinceTimelineData = null;
  let capitalIndex = new Map();
  let cities = null;
  let suggestionIndex = -1;
  let suggestionsList = [];

  const globe = createGlobe(canvas, {
    onSelect: (name) => select(name),
    onZoneSelect: (zone) => {
      const key = String(zone.value || '').toLowerCase();
      const id = /cathol/i.test(key) ? 'catholicisme'
        : zone.features.includes('Dauphiné') ? 'dauphine' : null;
      const label = CHRONAS_LABELS.names[dimension]?.[zone.value] || zone.value;
      if (id) openReport(id);
      else readout.textContent = `${label} · ${zone.count} provinces · aucun récit local.`;
    },
    onHover: (name, x, y) => showTooltip(name, x, y),
    onFrame: (view) => {
      labelRenderer.update((lon, lat) => globe?.project(lon, lat), view.zoom);
      updateArcMarkers();
    },
    onCitySelect: (name) => {
      const area = capitalIndex.get(normalizeName(name))?.[0];
      if (area) {
        select(area);
        readout.textContent = `Capitale ${name} · ${readout.textContent}`;
      }
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
      refreshCapitalIndex(areasForYear);
      globe?.setCities(capitalsForYear(areasForYear), year);
    })
    .catch(() => { /* données optionnelles : la carte reste utilisable */ });

  const PROVINCE_DIMENSIONS = [
    { id: 'ruler', label: 'Souverain' },
    { id: 'culture', label: 'Culture' },
    { id: 'religion', label: 'Religion' },
    { id: 'capital', label: 'Capitale' },
    { id: 'population', label: 'Population' },
  ];

  function localizeTimelineValue(dimension, value) {
    if (dimension === 'population') return `${value} hab`;
    if (dimension === 'capital') return value;
    return CHRONAS_LABELS.names[dimension]?.[value] || value;
  }

  let provincePixi = null;
  function renderProvinceTimeline(name) {
    const token = ++provinceTimelineToken;
    const host = el('section', 'province-timeline');
    host.id = 'province-timeline';
    host.appendChild(el('h3', 'pt-title', 'Chronologie de la région'));
    const pixiHost = el('div', 'pixi-timeline-host');
    host.appendChild(pixiHost);
    const status = el('p', 'pt-status', 'Chargement de la chronologie…');
    host.appendChild(status);
    card.appendChild(host);

    getProvinceTimeline(name).then((timeline) => {
      if (token !== provinceTimelineToken || !host.isConnected) return;
      provinceTimelineData = timeline;
      status.hidden = true;
      if (!timeline) {
        status.textContent = 'Chronologie indisponible pour cette région.';
        status.hidden = false;
        return;
      }

      const options = [];
      const rows = el('div', 'pt-rows');
      for (const dimension of PROVINCE_DIMENSIONS) {
        const entries = (timeline[dimension.id] || []).slice(0, 40);
        if (!entries.length) continue;
        const row = el('div', 'pt-row');
        row.appendChild(el('span', 'pt-name', dimension.label));
        const track = el('div', 'pt-track');
        track.setAttribute('aria-hidden', 'true');
        const now = el('span', 'pt-now');
        now.style.left = `${((year + 2000) / 4000) * 100}%`;
        track.appendChild(now);
        for (const [entryYear, value] of entries) {
          const dot = el('span', entryYear === year ? 'pt-dot active' : 'pt-dot');
          dot.style.left = `${((entryYear + 2000) / 4000) * 100}%`;
          track.appendChild(dot);
          options.push({ dimension: dimension.id, year: entryYear, label: localizeTimelineValue(dimension.id, value) });
        }
        track.addEventListener('click', (event) => {
          const rect = track.getBoundingClientRect();
          const target = -2000 + ((event.clientX - rect.left) / rect.width) * 4000;
          let best = null;
          let distance = Infinity;
          for (const entry of entries) {
            const current = Math.abs(entry[0] - target);
            if (current < distance) { distance = current; best = entry; }
          }
          if (best && distance <= 100) applyYear(best[0]);
        });
        row.appendChild(track);
        rows.appendChild(row);
      }
      host.appendChild(rows);

      if (provincePixi) { provincePixi.destroy(); provincePixi = null; }
      const provinceEvents = PROVINCE_DIMENSIONS.flatMap((dimension) =>
        (timeline[dimension.id] || []).slice(0, 40).map(([entryYear, value]) => ({
          id: `${dimension.id}-${entryYear}`, year: entryYear,
          title: `${dimension.label} : ${localizeTimelineValue(dimension.id, value)}`,
          category: dimension.id,
        })));
      provincePixi = new PixiTimeline(pixiHost, {
        events: provinceEvents, mode: 'province', title: `Chronologie de ${name}`, year,
        onYear: (value) => { if (Number.isFinite(value)) applyYear(value, { notify: false, reopenCard: false }); },
        onSelect: (event) => applyYear(event.year),
      });

      const picker = el('select', 'pt-select');
      picker.id = 'province-event-select';
      picker.setAttribute('aria-label', 'Aller à un repère de la chronologie provinciale');
      const empty = el('option', '', 'Aller à un repère…');
      empty.value = '';
      picker.appendChild(empty);
      options.sort((a, b) => a.year - b.year || a.label.localeCompare(b.label, 'fr'));
      options.forEach((option, index) => {
        const node = el('option', '', `${option.year} · ${option.label}`);
        node.value = String(index);
        picker.appendChild(node);
      });
      picker.addEventListener('change', () => {
        const option = options[Number(picker.value)];
        if (option) applyYear(option.year);
      });
      host.appendChild(picker);
    }).catch(() => {
      if (token !== provinceTimelineToken) return;
      status.textContent = 'Chronologie indisponible.';
      status.hidden = false;
    });
  }

  function openCard() {
    const wasHidden = card.hidden;
    card.hidden = false;
    document.body.classList.add('card-open');
    if (mobileQuery.matches && wasHidden) {
      cardReturnFocus = document.activeElement;
      requestAnimationFrame(() => cardClose.focus());
    }
  }

  function closeCard() {
    card.hidden = true;
    document.body.classList.remove('card-open');
    displayPanel.hidden = true;
    displayButton.setAttribute('aria-expanded', 'false');
    (cardReturnFocus || canvas).focus?.();
    cardReturnFocus = null;
  }

  function renderCard(name, open = true) {
    const info = name ? describe(name) : null;
    card.replaceChildren();
    card.appendChild(cardClose);
    if (!info) {
      provinceTimelineToken += 1;
      provinceTimelineData = null;
      card.hidden = true;
      document.body.classList.remove('card-open');
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
    if (name === 'Dauphiné') {
      const reportButton = el('button', 'hud-dimension', 'Lire la lignée du Dauphiné →');
      reportButton.type = 'button';
      reportButton.id = 'card-report';
      reportButton.addEventListener('click', () => openReport('dauphine'));
      card.append(reportButton);
    }
    if (/cathol/i.test(String(info.religion || ''))) {
      const religionButton = el('button', 'hud-dimension', 'Lire l’histoire du catholicisme →');
      religionButton.type = 'button';
      religionButton.id = 'card-report-religion';
      religionButton.addEventListener('click', () => openReport('catholicisme'));
      card.append(religionButton);
    }
    renderProvinceTimeline(name);
    if (open) openCard();
    else {
      card.hidden = true;
      document.body.classList.remove('card-open');
    }
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

  function normalizeName(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('fr')
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  }

  function refreshCapitalIndex(areas) {
    capitalIndex = new Map();
    for (const [name, row] of Object.entries(areas || {})) {
      const capital = Array.isArray(row) ? row[3] : row?.capital;
      const key = normalizeName(capital);
      if (!key) continue;
      if (!capitalIndex.has(key)) capitalIndex.set(key, []);
      capitalIndex.get(key).push(name);
    }
    for (const names of capitalIndex.values()) names.sort((a, b) => a.localeCompare(b, 'fr'));
  }

  function refreshLabels() {
    if (!labelRenderer || labelMode === 'off' || !areasForYear) {
      labelRenderer?.setLabels([]);
      return;
    }
    if (labelMode === 'modern') {
      labelRenderer.setLabels(buildModernLabels());
      return;
    }
    const effective = labelMode === 'capitals'
      ? 'capital'
      : (dimension === 'population' ? 'ruler' : dimension);
    const historical = buildLabels(areasForYear, effective, globe?.zones());
    labelRenderer.setLabels(labelMode === 'both'
      ? combineLabels(historical, buildModernLabels())
      : historical);
  }

  function capitalsForYear(areas) {
    const wanted = new Set(capitalIndex.keys());
    const seen = new Set();
    return (cities?.cities || []).filter(([lon, lat, name, start, end, capital]) => {
      if (!capital) return false;
      const key = normalizeName(name);
      if (!wanted.has(key) || seen.has(key)) return false;
      seen.add(key);
      return year >= start && (!end || year <= end);
    });
  }

  let yearRequest = 0;
  let autoplayTimer = 0;
  let debounceTimer = 0;
  let loadingTimer = 0;

  async function applyYear(next, { updateUrl = true, notify = true, reopenCard = true } = {}) {
    const target = clampYear(next);
    const request = ++yearRequest;
    year = target;
    if (zoomMode === 'century' && (target < centuryBase || target > centuryBase + 99)) {
      centuryBase = centuryStart(target);
    }
    trackProgress('centuries', centuryStart(target));
    recordNav();
    friseTimeline.setYear(target, { notify: false });
    yearLabel.textContent = String(target);
    slider.max = zoomMode === 'century' ? String(CENTURY_STEPS) : '1000';
    slider.value = String(positionOf(target));
    slider.setAttribute('aria-valuetext', String(target));
    minimapRange.value = String(yearToPosition(target, 'linear'));
    minimapRange.setAttribute('aria-valuetext', String(target));
    params.set('year', String(target));
    if (updateUrl) writeUrl(params);
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => {
      if (request === yearRequest) {
        loading.textContent = `Chargement de ${target}…`;
        loading.hidden = false;
      }
    }, 800);
    try {
      const areas = await getAreasForYear(target);
      if (request !== yearRequest) return;
      areasForYear = areas;
      refreshCapitalIndex(areas);
      if (empireRuler) globe?.setYearAreas(empireAreas(areas, empireRuler), 'empire');
      else globe?.setYearAreas(areas, dimension);
      refreshLabels();
      globe?.setCities(capitalsForYear(areas), target);
      if (selected && reopenCard) renderCard(selected);
      if (notify) announce(selected);
      refreshArcs();
      if (showSun) globe?.setSunYear(target, true);
      if (histomap && !histomapPanel.hidden) histomap.render(target);
    } catch (issue) {
      if (request !== yearRequest) return;
      error.textContent = `Année ${target} indisponible : ${issue.message}`;
      error.hidden = false;
      readout.textContent = error.textContent;
    } finally {
      clearTimeout(loadingTimer);
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
  function setZoomMode(mode) {
    zoomMode = mode === 'century' ? 'century' : 'global';
    if (zoomMode === 'century') centuryBase = centuryStart(year);
    zoomButton.textContent = zoomMode === 'century' ? 'Siècle' : '4 001 ans';
    zoomButton.setAttribute('aria-pressed', String(zoomMode === 'century'));
    slider.max = zoomMode === 'century' ? String(CENTURY_STEPS) : '1000';
    slider.value = String(positionOf(year));
    params.set('zoom', zoomMode);
    writeUrl(params);
    readout.textContent = zoomMode === 'century'
      ? `Zoom siècle ${centuryBase}–${centuryBase + 99}.`
      : 'Frise complète : 4 001 ans.';
  }

  zoomButton.addEventListener('click', () => setZoomMode(zoomMode === 'century' ? 'global' : 'century'));
  slider.addEventListener('input', () => setYear(yearOfPosition(slider.value)));
  minimapRange.addEventListener('input', () => {
    if (zoomMode === 'century') setZoomMode('global');
    setYear(positionToYear(minimapRange.value, 'linear'));
  });
  scaleButton.addEventListener('click', () => {
    scaleMode = scaleMode === 'linear' ? 'recent' : 'linear';
    scaleButton.textContent = SCALE_LABELS[scaleMode];
    scaleButton.setAttribute('aria-pressed', String(scaleMode === 'recent'));
    slider.setAttribute('aria-label', `Année sur l'échelle ${SCALE_LABELS[scaleMode].toLowerCase()}`);
    slider.value = String(positionOf(year));
    histomap?.setMode(scaleMode);
    params.set('scale', scaleMode);
    writeUrl(params);
    readout.textContent = scaleMode === 'recent'
      ? 'Échelle récents : les siècles récents occupent plus de place.'
      : 'Échelle linéaire : les 4 001 ans sont régulièrement répartis.';
  });
  play.addEventListener('click', toggleAutoplay);
  for (const button of centuries.children) {
    button.addEventListener('click', () => {
      setYear(Number(button.dataset.year));
      if (zoomMode === 'century') {
        centuryBase = centuryStart(Number(button.dataset.year));
        slider.value = String(positionOf(Number(button.dataset.year)));
      }
    });
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

  function refreshArcs() {
    if (!showArcs) {
      arcLinks = [];
      globe?.setArcs([]);
      renderArcMarkers();
      return;
    }
    arcLinks = linkedProvinces(areasForYear, selected, 5);
    globe?.setArcs(arcPairs(selected, arcLinks));
    renderArcMarkers();
    const ruler = String(areasForYear?.[selected]?.[0] ?? '');
    const label = ruler ? localizeTimelineValue('ruler', ruler) : 'souverain inconnu';
    readout.textContent = arcLinks.length
      ? `Simultanéité en ${year} : ${arcLinks.length + 1} régions sous ${label} · ${arcLinks.map((item) => `${item.name}, ${item.population} hab`).join(' ; ')}.`
      : `Aucune autre région ne partage ce souverain en ${year}.`;
  }

  function renderArcMarkers() {
    arcHost.replaceChildren();
    arcTip.hidden = true;
    if (!showArcs) return;
    for (const item of arcLinks) {
      const dot = el('button', 'arc-marker', '');
      dot.type = 'button';
      dot.dataset.name = item.name;
      dot.setAttribute('aria-label', `${item.name} : ${item.population} habitants, même souverain en ${year}. Ouvrir la fiche.`);
      const show = () => {
        arcTip.textContent = `${item.name} · ${localizeTimelineValue('ruler', item.ruler)} · ${item.population} hab · ${year} · Chronas CC BY-SA 4.0`;
        arcTip.hidden = false;
      };
      dot.addEventListener('pointerenter', show);
      dot.addEventListener('focus', show);
      dot.addEventListener('pointerleave', () => { arcTip.hidden = true; });
      dot.addEventListener('blur', () => { arcTip.hidden = true; });
      dot.addEventListener('click', () => select(item.name));
      arcHost.appendChild(dot);
    }
    updateArcMarkers();
  }

  function updateArcMarkers() {
    if (!showArcs) return;
    const points = globe?.arcScreenPoints?.() || [];
    for (const point of points) {
      const dot = [...arcHost.children].find((child) => child.dataset.name === point.name);
      if (!dot) continue;
      dot.hidden = !point.visible;
      dot.style.transform = `translate(${Math.round(point.x)}px, ${Math.round(point.y)}px) translate(-50%, -50%)`;
    }
  }

  function toggleArcs() {
    markAction('arcs');
    showArcs = !showArcs;
    arcsButton.setAttribute('aria-pressed', String(showArcs));
    params.set('arcs', showArcs ? '1' : '0');
    writeUrl(params);
    refreshArcs();
    if (!showArcs) readout.textContent = 'Simultanéités masquées.';
  }

  arcsButton.addEventListener('click', toggleArcs);

  function select(name, { move = true, open = true } = {}) {
    if (!name) return;
    selected = name;
    trackProgress('regions', name);
    recordNav();
    params.set('type', 'area');
    params.set('value', name);
    params.set('year', String(year));
    writeUrl(params);
    globe?.setSelected(name);
    if (move) globe?.focusRegion(name);
    if (open && SUBJECT_BY_NAME[name]) { openSubject(SUBJECT_BY_NAME[name]); announce(name); refreshArcs(); return; }
    renderCard(name, open);
    announce(name);
    refreshArcs();
    searchOverlay.hidden = true;
    search.setAttribute('aria-expanded', 'false');
    search.value = '';
  }

  /* --- Récits guidés -------------------------------------------------- */
  const trailPlayer = createTrailPlayer(TRAILS.trails, {
    onStep: (snapshot) => renderTrailStep(snapshot),
    onEnd: () => { readout.textContent = 'Récit terminé.'; },
  });
  let trailFactsToken = 0;
  let histomap = null;
  let histomapAbort = null;

  function openTrails() {
    markAction('trails');
    closeAllPanels();
    trailsPanel.hidden = false;
    trailsButton.setAttribute('aria-expanded', 'true');
    if (!trailPlayer.state().active) {
      trailsList.hidden = false;
      trailsStep.hidden = true;
      trailsKicker.textContent = 'Récits guidés';
      trailsTitle.textContent = 'Dix parcours dans Chronas';
    }
    if (mobileQuery.matches) requestAnimationFrame(() => trailsClose.focus());
  }

  function closeTrails() {
    trailsPanel.hidden = true;
    trailsButton.setAttribute('aria-expanded', 'false');
  }

  function stopTrail() {
    trailPlayer.stop();
    closeTrails();
    params.delete('trail');
    params.delete('step');
    writeUrl(params);
    readout.textContent = 'Récit quitté.';
    canvas.focus?.();
  }

  function startTrail(id, stepIndex = 0) {
    trailsPanel.hidden = false;
    trailsButton.setAttribute('aria-expanded', 'true');
    const snapshot = trailPlayer.start(id, stepIndex);
    if (snapshot) trackProgress('trails', `${snapshot.id}:${snapshot.index}`);
  }

  function renderTrailStep(snapshot) {
    const step = snapshot.step;
    if (!step) return;
    trailsPanel.hidden = false;
    trailsButton.setAttribute('aria-expanded', 'true');
    trailsList.hidden = true;
    trailsStep.hidden = false;
    trailsKicker.textContent = `Étape ${snapshot.index + 1} sur ${snapshot.total}`;
    trailsTitle.textContent = snapshot.title;
    trailsStepKicker.textContent = `${step.year} · ${step.province}`;
    trailsStepTitle.textContent = step.title;
    trailsStepText.textContent = step.text;
    trailsFacts.replaceChildren();
    const factFields = [
      ['Souverain', 'ruler'], ['Culture', 'culture'], ['Capitale', 'capital'], ['Population', 'population'],
    ];
    const factCells = [];
    for (const [label] of factFields) {
      trailsFacts.appendChild(el('dt', '', label));
      const value = el('dd', '', '…');
      factCells.push(value);
      trailsFacts.appendChild(value);
    }
    const factToken = ++trailFactsToken;
    getProvinceTimeline(step.province).then((timeline) => {
      if (factToken !== trailFactsToken || trailPlayer.state().step !== step) return;
      factFields.forEach(([label, field], index) => {
        let value = null;
        for (const [start, entry] of timeline?.[field] || []) {
          if (start <= step.year) value = entry;
          else break;
        }
        factCells[index].textContent = value === null ? '—' : localizeTimelineValue(field, value);
      });
    }).catch(() => {
      if (factToken !== trailFactsToken) return;
      for (const cell of factCells) cell.textContent = '—';
    });
    const fieldLabel = {
      ruler: 'souverain', culture: 'culture', religion: 'religion', capital: 'capitale', population: 'population',
    }[step.evidence.field] || step.evidence.field;
    trailsEvidence.textContent = `Preuve : Chronas, ${fieldLabel} « ${step.evidence.value} » en ${step.year} · CC BY-SA 4.0`;
    trailsPrev.disabled = snapshot.first;
    trailsNext.textContent = snapshot.last ? 'Terminer' : 'Suivant →';
    applyYear(step.year, { updateUrl: false, notify: false, reopenCard: false });
    select(step.province, { move: true, open: false });
    params.set('trail', snapshot.id);
    params.set('step', String(snapshot.index));
    writeUrl(params);
    readout.textContent = `${step.title} · ${step.province} · ${step.year}.`;
  }

  const zenExit = el('button', 'zen-exit', 'Quitter le mode zen ✕');
  zenExit.type = 'button';
  zenExit.id = 'zen-exit';
  zenExit.hidden = true;
  zenExit.addEventListener('click', () => toggleZen(false));
  hud.appendChild(zenExit);

  function toggleZen(force) {
    const active = typeof force === 'boolean' ? force : !document.body.classList.contains('zen');
    document.body.classList.toggle('zen', active);
    zenExit.hidden = !active;
    const button = document.getElementById('tool-zen');
    if (button) button.textContent = active ? 'Quitter le mode zen' : 'Mode zen';
    if (active) closeAllPanels();
    readout.textContent = active ? 'Mode zen : seules la sphère et la frise restent visibles.' : 'Mode zen désactivé.';
  }

  function closeAllPanels() {
    if (!trailsPanel.hidden) closeTrails();
    if (!histomapPanel.hidden) closeHistomap();
    if (!qualityPanel.hidden) closeQuality();
    if (!comparePanel.hidden) closeCompare();
    if (!learnPanel.hidden) closeLearn();
    if (!reportPanel.hidden) closeReport();
    if (!histographyPanel.hidden) closeHistography();
    if (!subjectPanel.hidden) closeSubject();
    if (!turningDrawer.hidden) {
      turningDrawer.hidden = true;
      document.body.classList.remove('turning-open');
    }
    if (document.body.classList.contains('tools-open')) {
      document.body.classList.remove('tools-open');
      toolsButton.setAttribute('aria-expanded', 'false');
    }
    if (!searchOverlay.hidden) { searchOverlay.hidden = true; search.setAttribute('aria-expanded', 'false'); }
    if (!helpOverlay.hidden) helpOverlay.hidden = true;
    if (!yearDialog.hidden) yearDialog.hidden = true;
    if (!displayPanel.hidden) toggleDisplayPanel();
  }

  let learn = null;
  function openLearn() {
    markAction('learn');
    closeAllPanels();
    if (!learn) {
      learn = createLearnPanel(learnPanel, {
        getState: () => window.VATLAS.getState(),
        getFacts: (name) => {
          const info = describe(name);
          return info ? { ...info, populationLabel: formatPopulation(info.population) } : null;
        },
        getProgress: () => ({
          trails: localProgress.trails.length,
          centuries: localProgress.centuries.length,
        }),
        applyYear: (value) => applyYear(value),
        startTrail: (id, index) => startTrail(id, index),
        readout: (text) => { readout.textContent = text; },
        closeLearn,
      });
    }
    learnPanel.hidden = false;
    learnButton.setAttribute('aria-expanded', 'true');
    learn.open();
  }
  function closeLearn() {
    learnPanel.hidden = true;
    learnButton.setAttribute('aria-expanded', 'false');
  }
  learnButton.addEventListener('click', () => {
    if (learnPanel.hidden) openLearn(); else closeLearn();
  });

  function toggleSun() {
    markAction('sun');
    showSun = !showSun;
    sunButton.setAttribute('aria-pressed', String(showSun));
    globe?.setSunYear(year, showSun);
    params.set('sun', showSun ? '1' : '0');
    writeUrl(params);
    readout.textContent = showSun
      ? `Ombre solaire stylisée pour l’année ${year} (déterministe, pas une éphéméride).`
      : 'Ombre solaire masquée.';
  }

  function toggleWire() {
    markAction('wire');
    showWire = !showWire;
    wireButton.setAttribute('aria-pressed', String(showWire));
    globe?.setWireframe(showWire);
    params.set('wire', showWire ? '1' : '0');
    writeUrl(params);
    readout.textContent = showWire ? 'Sphère en fil de fer.' : 'Rendu vectoriel restauré.';
  }

  sunButton.addEventListener('click', toggleSun);
  wireButton.addEventListener('click', toggleWire);

  trailsButton.addEventListener('click', () => {
    if (trailsPanel.hidden) openTrails();
    else closeTrails();
  });
  trailsClose.addEventListener('click', () => {
    if (trailPlayer.state().active) stopTrail();
    else closeTrails();
  });
  trailsPrev.addEventListener('click', () => trailPlayer.prev());
  trailsNext.addEventListener('click', () => {
    if (trailPlayer.state().last) stopTrail();
    else trailPlayer.next();
  });
  trailsStop.addEventListener('click', stopTrail);

  /* --- Comparaison A/B ------------------------------------------------ */
  let comparePair = null;
  async function runCompare(a = Number(compareA.value), b = Number(compareB.value)) {
    const first = clampYear(a);
    const second = clampYear(b);
    compareA.value = String(first);
    compareB.value = String(second);
    comparePair = [first, second];
    params.set('compare', `${first},${second}`);
    writeUrl(params);
    compareResult.textContent = 'Chargement des deux années…';
    try {
      const [areasA, areasB] = await Promise.all([getAreasForYear(first), getAreasForYear(second)]);
      let totalA = 0;
      let totalB = 0;
      let rulers = 0;
      let cultures = 0;
      for (const [name, row] of Object.entries(areasA)) {
        totalA += Number(row?.[4]) || 0;
        const other = areasB[name];
        if (!other) continue;
        totalB += Number(other[4]) || 0;
        if (String(row[0]) !== String(other[0])) rulers += 1;
        if (String(row[1]) !== String(other[1])) cultures += 1;
      }
      const biggest = Object.keys(areasB)
        .filter((name) => areasA[name])
        .sort((x, y) => Math.abs((Number(areasB[y][4]) || 0) - (Number(areasA[y][4]) || 0))
          - Math.abs((Number(areasB[x][4]) || 0) - (Number(areasA[x][4]) || 0)))
        .slice(0, 3)
        .map((name) => `${name} (${((Number(areasB[name][4]) || 0) - (Number(areasA[name][4]) || 0) >= 0 ? '+' : '')}${Math.round((Number(areasB[name][4]) || 0) - (Number(areasA[name][4]) || 0))} hab)`);
      compareResult.textContent = `${first} → ${second} : population ${Math.round(totalA / 1000)} k → ${Math.round(totalB / 1000)} k (${totalB >= totalA ? '+' : ''}${Math.round((totalB - totalA) / 1000)} k), ${rulers} souverains et ${cultures} cultures différents. Plus fortes variations : ${biggest.join(' ; ') || 'aucune'}.`;
      compareBars.replaceChildren();
      const maxCount = Math.max(rulers, cultures, 1);
      for (const [label, value, max] of [
        ['Population', Math.abs(totalB - totalA), Math.max(totalA, totalB, 1)],
        ['Souverains', rulers, maxCount],
        ['Cultures', cultures, maxCount],
      ]) {
        const row = el('div', 'compare-bar-row');
        const track = el('div', 'compare-bar-track');
        const fill = el('span', 'compare-bar-fill');
        fill.style.width = `${Math.round((value / max) * 100)}%`;
        track.appendChild(fill);
        row.append(el('span', 'compare-bar-label', label), track, el('span', 'compare-bar-value', String(Math.round(value))));
        compareBars.appendChild(row);
      }
    } catch (issue) {
      compareResult.textContent = `Comparaison indisponible : ${issue.message}`;
    }
  }

  function openCompare() {
    markAction('compare');
    closeAllPanels();
    comparePanel.hidden = false;
    compareButton.setAttribute('aria-expanded', 'true');
  }
  function closeCompare() {
    comparePanel.hidden = true;
    compareButton.setAttribute('aria-expanded', 'false');
    params.delete('compare');
    writeUrl(params);
  }
  let histography = null;
  let histoPixi = null;
  function openHistography() {
    closeAllPanels();
    markAction('histographie');
    histographyPanel.hidden = false;
    histographyButton.setAttribute('aria-pressed', 'true');
    document.body.classList.add('histography-open');
    histography = createHistography(histographyHost, {
      province: selected === 'Dauphiné' ? selected : null,
      onEvent: (event) => {
        if (event.report) openReport(event.report);
        else readout.textContent = `${event.title} · ${event.source}`;
      },
    });
    const histoPixiHost = el('div', 'pixi-timeline-host');
    histographyHost.appendChild(histoPixiHost);
    const histoEvents = [
      ...EPICS.map((epic) => ({
        id: epic[0], year: epicYear(epic), title: epic[1],
        category: categoryOf(epic[4]), report: epic[4] === 'religion' ? 'catholicisme' : null,
      })),
      ...TURNING_POINTS.points.map((point) => ({
        id: `turn-${point.year}`, year: point.year, title: point.label || 'Rupture', category: 'rupture',
      })),
    ];
    histoPixi = new PixiTimeline(histoPixiHost, {
      events: histoEvents, mode: 'events', title: 'Histographie', year,
      onYear: (value) => { if (Number.isFinite(value)) applyYear(value, { notify: false, reopenCard: false }); },
      onSelect: (event) => {
        if (event.report) openReport(event.report);
        else readout.textContent = `${event.title} · Chronas CC BY-SA 4.0`;
      },
    });
    params.set('histography', '1');
    writeUrl(params);
  }
  function closeHistography() {
    if (histoPixi) { histoPixi.destroy(); histoPixi = null; }
    if (histography) { histography.destroy(); histography = null; }
    histographyPanel.hidden = true;
    histographyButton.setAttribute('aria-pressed', 'false');
    document.body.classList.remove('histography-open', 'histo-drawer');
    params.delete('histography');
    writeUrl(params);
  }
  histographyButton.addEventListener('click', () => {
    if (histographyPanel.hidden) openHistography(); else closeHistography();
  });

  const SUBJECT_BY_NAME = { Dauphiné: 'dauphine' };
  let subjectField = null;
  let subjectId = null;
  async function openSubject(id) {
    closeAllPanels();
    subjectPanel.hidden = false;
    subjectId = id;
    params.set('subject', id);
    writeUrl(params);
    if (subjectField) { subjectField.destroy(); subjectField = null; }
    try {
      const response = await fetch(`./src/data/subjects/${id}.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      subjectField = await createSubjectField(subjectHost, data, {
        onClose: closeSubject,
        year,
        onYear: (value) => { if (Number.isFinite(value)) applyYear(value, { notify: false, reopenCard: false }); },
        onArticle: (article) => {
          const report = id === 'dauphine' && /dauphin/i.test(article.title) ? 'dauphine' : null;
          if (report) openReport(report);
          else readout.textContent = `${article.title} · Wikipédia FR · CC BY-SA 4.0`;
        },
      });
    } catch (issue) {
      subjectHost.textContent = `Sujet non généré : ${id} (${issue.message}).`;
    }
  }
  function closeSubject() {
    if (subjectField) { subjectField.destroy(); subjectField = null; }
    subjectPanel.hidden = true;
    subjectId = null;
    params.delete('subject');
    writeUrl(params);
  }

  let scrolly = null;
  let reportId = null;
  async function openReport(id = 'dauphine') {
    closeAllPanels();
    markAction('report');
    reportPanel.hidden = false;
    reportId = id;
    params.set('report', id);
    writeUrl(params);
    if (scrolly && reportId === id) return;
    if (scrolly) { scrolly.destroy(); scrolly = null; }
    try {
      const response = await fetch(`./public/reports/${id}.html`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const documentReport = new DOMParser().parseFromString(await response.text(), 'text/html');
      const reportStyles = [...documentReport.querySelectorAll('style')];
      reportHost.replaceChildren(...reportStyles, documentReport.querySelector('main') || documentReport.body);
      scrolly = createScrolly(reportHost, {
        onYear: (year) => { if (Number.isFinite(year)) applyYear(year, { notify: false }); },
      });
    } catch (issue) {
      reportHost.textContent = `Récit indisponible : ${issue.message}`;
    }
  }
  function closeReport() {
    if (scrolly) { scrolly.destroy(); scrolly = null; }
    reportPanel.hidden = true;
    params.delete('report');
    writeUrl(params);
  }
  reportClose.addEventListener('click', closeReport);

  function openQuality() {
    markAction('quality');
    closeAllPanels();
    qualityPanel.hidden = false;
    qualityButton.setAttribute('aria-expanded', 'true');
  }
  function closeQuality() {
    qualityPanel.hidden = true;
    qualityButton.setAttribute('aria-expanded', 'false');
  }
  qualityButton.addEventListener('click', () => {
    if (qualityPanel.hidden) openQuality(); else closeQuality();
  });
  qualityClose.addEventListener('click', closeQuality);

  compareButton.addEventListener('click', () => {
    if (comparePanel.hidden) openCompare(); else closeCompare();
  });
  compareClose.addEventListener('click', closeCompare);
  compareRun.addEventListener('click', () => runCompare());

  /* --- Histomap (mode secondaire de la chronologie) ------------------- */
  const TRAIL_BY_FAMILY = {
    'Chinois': 'asie', 'Indien': 'savoir', 'Islamique': 'islam', 'Européen': 'europe',
    'Amériques': 'soie', 'Asie orientale et du Sud-Est': 'asie', 'non classé': null,
  };
  function openTrailForFamily(family, year) {
    const id = TRAIL_BY_FAMILY[family];
    const trail = TRAILS.trails.find((item) => item.id === id);
    if (!trail) {
      readout.textContent = `Aucun récit associé à « ${family} » dans Chronas.`;
      return;
    }
    let index = 0;
    let distance = Infinity;
    trail.steps.forEach((step, position) => {
      const delta = Math.abs(step.year - year);
      if (delta < distance) { distance = delta; index = position; }
    });
    if (!histomapPanel.hidden) closeHistomap();
    startTrail(id, index);
  }

  let hmPixi = null;
  async function openHistomap() {
    markAction('histomap');
    closeAllPanels();
    histomapPanel.hidden = false;
    document.body.classList.add('histomap-open');
    histomapButton.setAttribute('aria-pressed', 'true');
    params.set('histomap', '1');
    writeUrl(params);
    if (histomap) {
      histomap.setMode(scaleMode);
      histomap.render(year);
      return;
    }
    histomapAbort = new AbortController();
    try {
      const response = await fetch('./src/data/histomap.json', { signal: histomapAbort.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const { createHistomap } = await import('./histomap/stream.js');
      histomap = createHistomap(hmHost, data, {
        onYear: (value) => applyYear(value),
        onTrail: (family, value) => openTrailForFamily(family, value),
      });
      histomap.setMode(scaleMode);
      histomap.render(year);

      const hmPixiHost = el('div', 'pixi-timeline-host');
      hmHost.appendChild(hmPixiHost);
      const hmEvents = [];
      for (let index = 0; index < data.years.length; index += 5) {
        for (const [family, values] of Object.entries(data.series)) {
          hmEvents.push({
            id: `${family}-${index}`, year: data.years[index],
            title: `${family} · ${Number(values[index]).toLocaleString('fr-FR')} hab`,
            category: family,
          });
        }
      }
      hmPixi = new PixiTimeline(hmPixiHost, {
        events: hmEvents, mode: 'families', title: 'Histomap des familles culturelles', year,
        onYear: (value) => { if (Number.isFinite(value)) applyYear(value, { notify: false, reopenCard: false }); },
        onSelect: (event) => applyYear(event.year),
      });
    } catch (issue) {
      if (issue.name !== 'AbortError') hmHost.textContent = 'Histomap indisponible.';
    } finally {
      histomapAbort = null;
    }
  }

  function closeHistomap() {
    if (hmPixi) { hmPixi.destroy(); hmPixi = null; }
    histomapPanel.hidden = true;
    document.body.classList.remove('histomap-open');
    histomapButton.setAttribute('aria-pressed', 'false');
    histomapAbort?.abort();
    histomapAbort = null;
    params.delete('histomap');
    writeUrl(params);
    canvas.focus?.();
  }

  histomapButton.addEventListener('click', () => {
    if (histomapPanel.hidden) openHistomap();
    else closeHistomap();
  });
  hmClose.addEventListener('click', closeHistomap);
  hmScale.addEventListener('click', () => scaleButton.click());

  let suggestionActions = [];

  /* Recherche locale enrichie : régions, puis souverains / cultures / religions
   * de l'année courante. Chaque résultat porte son action, sans réseau. */
  function smartSuggestions(query) {
    const needle = query.trim().toLowerCase();
    const results = [];
    if (!needle || !areasForYear) return results;
    const fields = [
      ['ruler', 0, 'État'], ['culture', 1, 'Culture'], ['religion', 2, 'Religion'],
    ];
    for (const [field, index, label] of fields) {
      const groups = new Map();
      for (const [name, row] of Object.entries(areasForYear)) {
        const code = String(row?.[index] ?? '');
        if (!code) continue;
        const display = localizeTimelineValue(field, code);
        if (!`${code} ${display}`.toLowerCase().includes(needle)) continue;
        if (!groups.has(code)) groups.set(code, []);
        groups.get(code).push({ name, population: Number(row?.[4]) || 0 });
      }
      for (const [code, members] of [...groups].slice(0, 4)) {
        members.sort((a, b) => b.population - a.population || a.name.localeCompare(b.name, 'fr'));
        const text = `${label} ${localizeTimelineValue(field, code)} · ${members.length} régions`;
        results.push({
          text,
          weight: members[0].population,
          action: () => {
            select(members[0].name);
            readout.textContent = `${label} ${code} : ${members.length} régions en ${year}. Extrait Chronas CC BY-SA 4.0.`;
          },
        });
      }
    }
    /* Index de référence : retrouve un souverain ou une culture même si
     * l'année courante ne le porte plus. */
    for (const reference of DATA_QUALITY.meta.reference_years) {
      const index = DATA_QUALITY.indexes[reference];
      if (!index) continue;
      for (const item of index.rulers) {
        if (results.length >= 12) break;
        const display = localizeTimelineValue('ruler', item.code);
        if (!`${item.code} ${display}`.toLowerCase().includes(needle)) continue;
        if (results.some((result) => result.text.includes(item.code))) continue;
        results.push({
          weight: item.count,
          text: `État ${display} · ${item.count} régions (${reference})`,
          action: () => {
            applyYear(reference);
            readout.textContent = `État ${item.code} : ${item.count} régions en ${reference}. Extrait Chronas.`;
          },
        });
      }
      for (const item of index.cultures) {
        if (results.length >= 12) break;
        const display = localizeTimelineValue('culture', item.code);
        if (!`${item.code} ${display}`.toLowerCase().includes(needle)) continue;
        if (results.some((result) => result.text.includes(item.code))) continue;
        results.push({
          weight: item.population,
          text: `Culture ${display} · ${Math.round(item.population / 1000)} k hab (${reference})`,
          action: () => {
            applyYear(reference);
            readout.textContent = `Culture ${item.code} : ${Math.round(item.population / 1000)} k habitants en ${reference}. Extrait Chronas.`;
          },
        });
      }
    }
    /* Palette de commandes : les bascules secondaires restent accessibles
     * au clavier sans reproduire les boutons dans le HUD mobile. */
    const commands = [
      ['ombre solaire', 'Basculer l’ombre solaire', () => toggleSun()],
      ['fil de fer', 'Basculer le rendu fil de fer', () => toggleWire()],
      ['simultanéité', 'Basculer les arcs de simultanéité', () => toggleArcs()],
      ['anomalies', 'Ouvrir la qualité des données', () => openQuality()],
      ['comparer', 'Ouvrir la comparaison A/B', () => openCompare()],
      ['ruptures', 'Ouvrir la liste des ruptures', () => turningListButton.click()],
    ];
    for (const [keyword, label, action] of commands) {
      if (!keyword.includes(needle)) continue;
      results.push({ text: `Commande · ${label}`, weight: 0, action });
    }
    return results.sort((a, b) => (b.weight || 0) - (a.weight || 0) || a.text.localeCompare(b.text, 'fr'));
  }

  function setSuggestions(query) {
    const names = searchNames(query);
    const semantic = smartSuggestions(query);
    suggestionsList = [...names, ...semantic.map((item) => item.text)];
    suggestionActions = [
      ...names.map((name) => () => select(name)),
      ...semantic.map((item) => item.action),
    ];
    suggestionIndex = -1;
    suggestions.replaceChildren();
    if (!suggestionsList.length) {
      suggestions.hidden = true;
      search.setAttribute('aria-expanded', 'false');
      return;
    }
    suggestionsList.forEach((text, index) => {
      const item = el('li', 'suggestion', text);
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      item.addEventListener('mousedown', (event) => { event.preventDefault(); suggestionActions[index]?.(); });
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
    closeAllPanels();
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
  function applyTheme(mode) {
    const effective = mode === 'system'
      ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : mode;
    if (effective === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    localStorage.setItem('history-theme', mode);
    for (const button of themeGroup.children) {
      button.setAttribute('aria-checked', String(button.dataset.theme === mode));
    }
    globe?.setTheme(effective);
    for (const timeline of [friseTimeline, histoPixi, hmPixi, provincePixi]) timeline?.setTheme(effective);
    themeButton.setAttribute('aria-label', `Thème ${effective === 'light' ? 'clair' : 'sombre'} — basculer`);
    readout.textContent = `Thème ${effective === 'light' ? 'clair' : 'sombre'}.`;
  }
  applyTheme(localStorage.getItem('history-theme') || 'system');
  themeButton.addEventListener('click', () => {
    const current = localStorage.getItem('history-theme') || 'system';
    applyTheme(current === 'light' ? 'dark' : 'light');
  });
  displayButton.addEventListener('click', toggleDisplayPanel);
  reviewButton.addEventListener('click', openReview);
  reviewClose.addEventListener('click', closeReview);
  reviewNext.addEventListener('click', () => {
    if (!reviewSession || reviewSession.progress().done) startReviewSession();
    else renderReviewQuestion();
  });
  reviewSkip.addEventListener('click', skipReview);
  for (const button of reviewOptions.children) {
    button.addEventListener('click', () => answerReview(Number(button.dataset.option)));
  }
  cardClose.addEventListener('click', closeCard);
  zoomIn.addEventListener('click', () => globe?.zoomBy(0.6));
  zoomOut.addEventListener('click', () => globe?.zoomBy(-0.6));
  recenter.addEventListener('click', () => {
    if (selected) globe?.focusRegion(selected);
    else globe?.setView(DEFAULT_VIEW);
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
      const index = suggestionIndex >= 0 ? suggestionIndex : 0;
      if (suggestionsList[index]) { event.preventDefault(); suggestionActions[index]?.(); }
    } else if (event.key === 'Escape') {
      searchOverlay.hidden = true;
      search.setAttribute('aria-expanded', 'false');
      search.blur();
      canvas.focus?.();
    }
  });

  canvas.addEventListener('keydown', (event) => {
    const fine = event.shiftKey ? 2 : 6;
    if (event.key === 'ArrowLeft') globe?.rotateBy(-fine, 0);
    else if (event.key === 'ArrowRight') globe?.rotateBy(fine, 0);
    else if (event.key === 'ArrowUp') globe?.rotateBy(0, -fine);
    else if (event.key === 'ArrowDown') globe?.rotateBy(0, fine);
    else if (event.key === '+' || event.key === '=') globe?.zoomBy(0.5);
    else if (event.key === '-') globe?.zoomBy(-0.5);
    else if (event.key.toLowerCase() === 'r') {
      if (selected) globe?.focusRegion(selected);
      else globe?.setView(DEFAULT_VIEW);
    } else return;
    event.preventDefault();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('zen')) {
      toggleZen(false);
      return;
    }
    if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      navigateNav(event.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '');
    if (!reviewPanel.hidden && !typing) {
      if (/^[1-4]$/.test(event.key) && reviewOptions.children[Number(event.key) - 1]?.disabled === false) {
        event.preventDefault();
        answerReview(Number(event.key) - 1);
        return;
      }
      if (event.key === 'Enter' && !reviewNext.hidden) {
        event.preventDefault();
        reviewNext.click();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeReview();
        return;
      }
    }
    if (event.key === 'É' || event.key === 'é') { event.preventDefault(); openReview(); }
    else if (event.key === '/' && !typing) { event.preventDefault(); openSearch(); }
    else if (event.key === '?' && !typing) { event.preventDefault(); toggleHelp(); }
    else if (event.key.toLowerCase() === 't' && !typing) {
      event.preventDefault();
      if (trailsPanel.hidden) openTrails();
      else closeTrails();
    }
    else if (event.key.toLowerCase() === 's' && !typing) { event.preventDefault(); toggleArcs(); }
    else if (event.key.toLowerCase() === 'l' && !typing) {
      event.preventDefault();
      if (learnPanel.hidden) openLearn(); else closeLearn();
    }
    else if (event.key.toLowerCase() === 'z' && !typing) { event.preventDefault(); toggleZen(); }
    else if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      openSearch();
    }
    else if (event.key.toLowerCase() === 'y' && !typing) { event.preventDefault(); toggleSun(); }
    else if (event.key.toLowerCase() === 'w' && !typing) { event.preventDefault(); toggleWire(); }
    else if (event.key.toLowerCase() === 'h' && !typing) {
      event.preventDefault();
      if (histomapPanel.hidden) openHistomap();
      else closeHistomap();
    }
    else if (event.key.toLowerCase() === 'a' && !typing) {
      event.preventDefault();
      if (comparePanel.hidden) openCompare(); else closeCompare();
    }
    else if (event.key === 'Escape') {
      if (!histomapPanel.hidden) closeHistomap();
      if (!comparePanel.hidden) closeCompare();
      if (!qualityPanel.hidden) closeQuality();
      if (!learnPanel.hidden) closeLearn();
      if (!reportPanel.hidden) closeReport();
      if (!histographyPanel.hidden) closeHistography();
      if (!turningDrawer.hidden) {
      turningDrawer.hidden = true;
      document.body.classList.remove('turning-open');
    }
      if (!card.hidden && mobileQuery.matches) closeCard();
      searchOverlay.hidden = true;
      helpOverlay.hidden = true;
      yearDialog.hidden = true;
      if (!trailsPanel.hidden) {
        if (trailPlayer.state().active) stopTrail();
        else closeTrails();
      }
      if (!displayPanel.hidden) toggleDisplayPanel();
    }
  });

  if (globe) {
    globe.setView(initialPos || DEFAULT_VIEW);
    applyYear(year, { notify: false });
    if (showSun) globe.setSunYear(year, true);
    if (showWire) globe.setWireframe(true);
    else if ((navigator.hardwareConcurrency || 8) <= 4) {
      showWire = true;
      wireButton.setAttribute('aria-pressed', 'true');
      globe.setWireframe(true);
      readout.textContent = 'Mode silhouette activé automatiquement (appareil peu puissant).';
    }
    if (initialName) select(initialName, { move: !initialPos });
    else {
      params.set('type', 'area');
      params.set('pos', encodePos(globe.getView()));
      writeUrl(params);
      announce(null);
    }
    const initialTrail = params.get('trail');
    if (initialTrail && trailPlayer.has(initialTrail)) {
      startTrail(initialTrail, Number(params.get('step') || 0));
    }
    if (params.has('subject')) openSubject(params.get('subject'));
    if (params.has('report')) openReport(params.get('report'));
    if (params.get('histography') === '1') openHistography();
    const initialEpic = params.get('epic');
    if (initialEpic) {
      epicTimeline.setFilter(initialEpic);
      renderDensity(epicTimeline.visible());
    }
    if (params.get('histomap') === '1') openHistomap();
    if (params.has('compare')) {
      const [a, b] = params.get('compare').split(',').map(Number);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        openCompare();
        runCompare(a, b);
      }
    }
    const initialTurn = Number(params.get('turn'));
    if (Number.isInteger(initialTurn)) {
      const badge = turningStrip.querySelector(`[data-year="${initialTurn}"]`);
      if (badge) badge.setAttribute('aria-current', 'true');
    }
  }

  window.VATLAS = {
    getState: () => ({
      view: 'globe',
      selected,
      year,
      scale: scaleMode,
      zoom: zoomMode,
      camera: globe?.getView() || { ...DEFAULT_VIEW },
      meta: { ...MAP_META },
      features: FEATURES.length,
      webgl: Boolean(globe),
      attribution: ATTRIBUTION,
      seed: SEED,
      touring: Boolean(globe?.isTouring?.()),
      mesh: globe?.statistics?.() || null,
      labels: labelRenderer.count(),
      labelsHidden: Number(document.getElementById('globe-labels').dataset.collisions || 0),
      labelMode,
      epics: epicTimeline.count,
      epicFilter: epicTimeline.filter.value,
      epicVisible: epicTimeline.visible().length,
      provinceTimeline: Boolean(provinceTimelineData),
      review: reviewSnapshot(),
      trail: trailPlayer.state(),
      turn: turningStrip.querySelector('[aria-current="true"]')?.dataset.year ?? null,
      arcs: { enabled: showArcs, linked: arcLinks.map((item) => item.name) },
      histomap: histomap ? histomap.getState() : { open: false, year, mode: scaleMode, samples: 161 },
      history: { index: navIndex, length: navHistory.length },
      lastAction: window.__vatlasLastAction || null,
      report: { id: reportId, open: !reportPanel.hidden, step: scrolly?.current() ?? 0 },
      subject: { id: subjectId, open: !subjectPanel.hidden, ...(subjectField?.state() || {}) },
      histography: histography?.state() ?? null,
      compare: comparePair,
      empire: { active: Boolean(empireRuler), ruler: empireRuler },
      sun: { enabled: showSun, year: globe?.statistics?.().sunYear ?? null },
      wireframe: showWire,
      zen: document.body.classList.contains('zen'),
      anomalies: ANOMALIES.meta.count,
      qualityOpen: !qualityPanel.hidden,
      learning: {
        open: !learnPanel.hidden,
        summary: learn?.srs() ?? null,
        progress: {
          regions: localProgress.regions.length,
          trails: localProgress.trails.length,
          centuries: localProgress.centuries.length,
        },
      },
    }),
    selectRegion: (name) => select(name),
    setYear: (value) => applyYear(value),
    startTrail: (id, step) => startTrail(id, step),
    navigateHistory: (delta) => navigateNav(delta),
    compareYears: (a, b) => runCompare(a, b),
    focusEmpire: (on = true) => {
      const button = document.querySelector('.dimension-btn[data-dimension="empire"]');
      if (Boolean(empireRuler) !== on) button?.click();
    },
    openTrailForFamily: (family, year) => openTrailForFamily(family, year),
    openReport,
    openSubject,
    closeSubject,
    toggleSun,
    toggleWire,
    openLearn,
    closeLearn,
    toggleZen,
    closeAllPanels,
    openSearch,
    setLearnSection: (id) => {
      openLearn();
      learnPanel.querySelector(`.learn-tab[data-section="${id}"]`)?.click();
    },
    setScale: (mode) => {
      if ((mode === 'recent') !== (scaleMode === 'recent')) scaleButton.click();
    },
    setEpicFilter: (value) => {
      epicTimeline.setFilter(value);
      renderDensity(epicTimeline.visible());
      if (value === 'all') params.delete('epic');
      else params.set('epic', value);
      writeUrl(params);
    },
    setZoom: (mode) => setZoomMode(mode),
    cityScreenPoints: () => globe?.cityScreenPoints?.() || [],
    pickAt: (x, y) => globe?.pick?.(x, y) ?? null,
    setView: (view) => globe?.setView(view),
    diagnostics: () => ({ seed: SEED, features: FEATURES.length, areas: MAP_META.areas, webgl: Boolean(globe) }),
  };
  /* Appui long sur une action primaire : déplie les options secondaires. */
  let longPressTimer = 0;
  actions.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('#hud-actions > .hud-btn')) return;
    longPressTimer = window.setTimeout(() => {
      document.body.classList.add('actions-expanded');
      markAction('appui-long');
      readout.textContent = 'Options secondaires dépliées.';
    }, 600);
  });
  const clearLongPress = () => { window.clearTimeout(longPressTimer); };
  actions.addEventListener('pointerup', clearLongPress);
  actions.addEventListener('pointercancel', clearLongPress);
  actions.addEventListener('pointerleave', clearLongPress);

  for (const link of document.querySelectorAll('.skip-link')) {
    link.addEventListener('click', () => {
      const target = document.querySelector(link.getAttribute('href'));
      target?.focus?.();
    });
  }

  enableRoving(dimensions, '.dimension-btn');
  enableRoving(labelBar, '.label-btn');
  enableRoving(trailsList, '.trail-item');
  enableRoving(turningStrip, '.turning-badge');
  enableRoving(turningDrawerList, '.turning-drawer-item');
  enableRoving(learnPanel.querySelector('.learn-tabs'), '.learn-tab');
  enableRoving(comparePresets, '.hm-btn');
  enableRoving(document.getElementById('history-list'), '.history-item');

  document.documentElement.dataset.globeReady = 'true';
  if (budgetWidget) {
    const resources = performance.getEntriesByType('resource');
    const bytes = resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
    budgetWidget.textContent = `Budget : ${resources.length} requêtes · ${Math.round(bytes / 1024)} Ko · dernière action : ${window.__vatlasLastAction?.latency ?? 0} ms`;
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    /* Un nouveau SW prend le contrôle : recharger une seule fois pour
     * afficher immédiatement la nouvelle version, sans boucle. */
    if (!hadController || sessionStorage.getItem('history-sw-reloaded')) return;
    sessionStorage.setItem('history-sw-reloaded', '1');
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* mode en ligne dégradé */ });
  }, { once: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
registerServiceWorker();
