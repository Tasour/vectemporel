/* Sphère historique — composition root : URL, HUD, clavier, données.
 * Aucun code du frontend Chronas n'est copié. Données © Chronas CC BY-SA 4.0. */
import { MAP_META, FEATURES, describe, searchNames, ATTRIBUTION, formatPopulation } from './map/data.js';
import { decodePos, encodePos } from './map/projection.js';
import { createGlobe } from './globe/globe.js';
import { DIMENSIONS } from './globe/texture.js';
import {
  createLabelRenderer, buildLabels, buildModernLabels, combineLabels, LABEL_MODES,
} from './globe/labels.js';
import { createEpicTimeline, epicYear, categoryOf } from './timeline/epics.js';
import { getProvinceTimeline } from './data/province-timeline-store.js';
import { CHRONAS_LABELS } from './data/chronas-labels.js';
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
      refreshLabels();
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
  const helpButton = el('button', 'hud-btn', '?');
  helpButton.type = 'button';
  helpButton.id = 'hud-help-button';
  helpButton.setAttribute('aria-label', 'Afficher les commandes (touche point d’interrogation)');
  actions.append(tourButton, searchButton, displayButton, reviewButton, themeButton, helpButton);
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
  help.innerHTML = '<kbd>Glisser</kbd> tourner la sphère · <kbd>Molette</kbd> zoomer vers le curseur<br>'
    + '<kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> tourner · <kbd>Maj+flèches</kbd> rotation fine<br>'
    + '<kbd>+</kbd><kbd>−</kbd> zoomer · <kbd>R</kbd> recentrer · <kbd>Double-clic</kbd> zoomer<br>'
    + '<kbd>/</kbd> recherche · <kbd>É</kbd> révision · <kbd>?</kbd> aide · <kbd>Échap</kbd> fermer<br>'
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
  const epicHost = el('div', 'epic-host');
  epicHost.id = 'epic-host';
  timeline.append(epicHost, eraBands, yearLabel, slider, play, centuries, loading);

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

  hud.append(brand, actions, card, tooltip, searchOverlay, helpOverlay, yearDialog, reviewPanel, readout, timeline, navControls, displayPanel, error);

  const labelRenderer = createLabelRenderer(document.getElementById('globe-labels'));
  const epicTimeline = createEpicTimeline(epicHost, (epic) => {
    const target = epicYear(epic);
    applyYear(target);
    readout.textContent = `${epic[1]} · ${categoryOf(epic[4])} · ${target}.`;
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
    if (epicTimeline.picker.parentElement !== pickerTarget) {
      pickerTarget.appendChild(epicTimeline.picker);
    }
    const reviewTarget = mobile ? displayPanel : actions;
    if (reviewButton.parentElement !== reviewTarget) reviewTarget.appendChild(reviewButton);
    if (!mobile) {
      displayPanel.hidden = true;
      displayButton.setAttribute('aria-expanded', 'false');
    }
  }
  arrangeControls();
  mobileQuery.addEventListener?.('change', arrangeControls);

  function toggleDisplayPanel() {
    displayPanel.hidden = !displayPanel.hidden;
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
    onHover: (name, x, y) => showTooltip(name, x, y),
    onFrame: (view) => labelRenderer.update((lon, lat) => globe?.project(lon, lat), view.zoom),
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

  function renderProvinceTimeline(name) {
    const token = ++provinceTimelineToken;
    const host = el('section', 'province-timeline');
    host.id = 'province-timeline';
    host.appendChild(el('h3', 'pt-title', 'Chronologie de la région'));
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

  function renderCard(name) {
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
    renderProvinceTimeline(name);
    openCard();
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
    const historical = buildLabels(areasForYear, effective);
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

  async function applyYear(next, { updateUrl = true, notify = true } = {}) {
    const target = clampYear(next);
    const request = ++yearRequest;
    year = target;
    yearLabel.textContent = String(target);
    slider.value = String(target);
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
      globe?.setYearAreas(areas, dimension);
      refreshLabels();
      globe?.setCities(capitalsForYear(areas), target);
      if (selected) renderCard(selected);
      if (notify) announce(selected);
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
      const name = suggestionsList[suggestionIndex >= 0 ? suggestionIndex : 0];
      if (name) { event.preventDefault(); select(name); }
    } else if (event.key === 'Escape') {
      searchOverlay.hidden = true;
      search.setAttribute('aria-expanded', 'false');
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
    else if (event.key === 'Escape') {
      if (!card.hidden && mobileQuery.matches) closeCard();
      searchOverlay.hidden = true;
      helpOverlay.hidden = true;
      yearDialog.hidden = true;
      if (!displayPanel.hidden) toggleDisplayPanel();
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
      mesh: globe?.statistics?.() || null,
      labels: labelRenderer.count(),
      labelMode,
      epics: epicTimeline.count,
      provinceTimeline: Boolean(provinceTimelineData),
      review: reviewSnapshot(),
    }),
    selectRegion: (name) => select(name),
    setYear: (value) => applyYear(value),
    cityScreenPoints: () => globe?.cityScreenPoints?.() || [],
    setView: (view) => globe?.setView(view),
    diagnostics: () => ({ seed: SEED, features: FEATURES.length, areas: MAP_META.areas, webgl: Boolean(globe) }),
  };
  document.documentElement.dataset.globeReady = 'true';
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
