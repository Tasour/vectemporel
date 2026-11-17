(() => {
  'use strict';

  const DATA = window.VECTEMPOREL_DATA;
  if (!DATA) {
    console.error('Vectemporel : données introuvables.');
    return;
  }

  const { tags: TAGS, countries: COUNTRIES } = DATA;
  const COUNTRY_BY_ID = new Map(COUNTRIES.map((country) => [country.id, country]));
  const ALL_EVENTS = COUNTRIES.flatMap((country) =>
    country.events.map((event) => ({ ...event, countryId: country.id }))
  );
  const EVENT_BY_ID = new Map(ALL_EVENTS.map((event) => [event.id, event]));
  const ATLAS = window.VECTEMPOREL_ATLAS || { countries: [], counts: { total: 0, available: 0, queued: 0 } };
  const ATLAS_BY_CODE = new Map(ATLAS.countries.map((entry) => [entry.code, entry]));
  const ATLAS_BY_APP_ID = new Map(ATLAS.countries.filter((entry) => entry.appId).map((entry) => [entry.appId, entry]));

  const $ = (id) => document.getElementById(id);
  const els = {
    app: $('app'),
    stage: $('stage'),
    stageWrap: $('stage-wrap'),
    worldBtn: $('world-btn'),
    worldFlag: $('world-flag'),
    worldName: $('world-name'),
    countryFlag: $('country-flag'),
    countryName: $('country-name'),
    countryTagline: $('country-tagline'),
    countryTitle: $('country-title'),
    countryIntro: $('country-intro'),
    eventCount: $('event-count'),
    eraCount: $('era-count'),
    tagCount: $('tag-count'),
    tagList: $('tag-list'),
    clearTags: $('clear-tags'),
    filterSummary: $('filter-summary'),
    eraList: $('era-list'),
    centerEra: $('center-era'),
    rangeLabel: $('range-label'),
    zoomLevel: $('zoom-level'),
    zoomFactor: $('zoom-factor'),
    eraBand: $('era-band'),
    gridLayer: $('grid-layer'),
    stemLayer: $('stem-layer'),
    eventsLayer: $('events-layer'),
    axis: $('axis'),
    ticksLayer: $('ticks-layer'),
    zoomHint: $('zoom-hint'),
    minimap: $('minimap'),
    minimapEras: $('minimap-eras'),
    minimapEvents: $('minimap-events'),
    minimapWindow: $('minimap-window'),
    minimapStart: $('minimap-start'),
    minimapEnd: $('minimap-end'),
    shareBtn: $('share-btn'),
    recentBtn: $('recent-btn'),
    zoomIn: $('zoom-in'),
    zoomOut: $('zoom-out'),
    zoomFit: $('zoom-fit'),
    brand: $('brand'),
    aboutBtn: $('about-btn'),
    aboutOverlay: $('about-overlay'),
    modalClose: $('modal-close'),
    conceptExplore: $('concept-explore'),
    search: $('search'),
    searchInput: $('search-input'),
    searchResults: $('search-results'),
    tooltip: $('tooltip'),
    readerOverlay: $('reader-overlay'),
    reader: $('reader'),
    readerScroll: $('reader-scroll'),
    readerClose: $('reader-close'),
    readerBack: $('reader-back'),
    readerExternal: $('reader-external'),
    readerFooterLink: $('reader-footer-link'),
    readerContext: $('reader-context'),
    readerTitle: $('reader-title'),
    readerTags: $('reader-tags'),
    grokState: $('grok-state'),
    grokBody: $('grok-body'),
    readerRelated: $('reader-related'),
    relatedList: $('related-list'),
    toast: $('toast'),
    globeOverlay: $('globe-overlay'),
    globeStage: $('globe-stage'),
    globeCanvas: $('globe-canvas'),
    globeLoading: $('globe-loading'),
    globeSearch: $('globe-search'),
    globeDetail: $('globe-detail'),
    globeList: $('globe-list'),
    globeListCount: $('globe-list-count'),
    globeTotal: $('globe-total'),
    globeAvailableCount: $('globe-available-count'),
    globeClose: $('globe-close'),
  };

  const SKELETON_HTML = els.grokState.innerHTML;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const numberFormatter = new Intl.NumberFormat('fr-FR');
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');

  const state = {
    countryId: null,
    view: { start: -600, end: 2026 },
    activeTags: new Set(),
    hoverId: null,
    selectedId: null,
    readerEventId: null,
    readerSlug: null,
    readerStack: [],
    readerRequest: 0,
    lastFocus: null,
    searchItems: [],
    searchIndex: -1,
    drag: null,
    pinch: null,
    readersOpen: false,
  };

  let country = null;
  let events = [];
  let eventEls = new Map();
  let stemEls = new Map();
  let eraEls = [];
  let layout = { w: 0, h: 0, padL: 28, padR: 22, plotW: 1, axisY: 300, topBand: 44, maxAbove: 3, maxBelow: 3 };
  let hashTimer = 0;
  let toastTimer = 0;
  let zoomAnim = 0;
  let countrySwapTimer = 0;
  let readerHideTimer = 0;
  let modalHideTimer = 0;
  let hintDismissed = false;
  let pinching = null;
  const stagePointers = new Map();

  let globeRows = new Map();
  let globeSelected = null;
  let globeHideTimer = 0;
  let globeEngineReady = false;
  let globeInitPromise = null;

  /* ---------------------------------------------------------------------- */
  /* Utilitaires                                                            */
  /* ---------------------------------------------------------------------- */

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function formatNumber(value) {
    return numberFormatter.format(value);
  }

  function formatYear(value) {
    const year = Math.round(value);
    if (year < 0) return `${formatNumber(Math.abs(year))} av. J.-C.`;
    if (year === 0) return 'An 1';
    return formatNumber(year);
  }

  function formatEventYears(event) {
    if (event.endYear != null) {
      return `${formatYear(event.year)}–${formatYear(event.endYear)}`;
    }
    return formatYear(event.year);
  }

  function displayArticleName(value) {
    const withTypography = value.replace(/'/g, '’');
    return withTypography.charAt(0).toUpperCase() + withTypography.slice(1);
  }

  function normalizeText(value) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[’']/g, ' ')
      .replace(/[–—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tagColor(event) {
    return TAGS[event.tags[0]]?.color || '#e6b96f';
  }

  function tagLabels(event) {
    return event.tags.map((tag) => TAGS[tag]?.label || tag);
  }

  function isEventVisible(event) {
    return state.activeTags.size === 0 || event.tags.some((tag) => state.activeTags.has(tag));
  }

  function domainSpan(c = country) {
    return c.domain[1] - c.domain[0];
  }

  function yearToX(year) {
    return layout.padL + ((year - state.view.start) / (state.view.end - state.view.start)) * layout.plotW;
  }

  function xToYear(x) {
    return state.view.start + ((x - layout.padL) / layout.plotW) * (state.view.end - state.view.start);
  }

  function clampView(c, start, end, minSpan = 5) {
    const first = c.domain[0];
    const last = c.domain[1];
    const total = last - first;
    let low = Math.min(start, end);
    let high = Math.max(start, end);
    let span = clamp(high - low, Math.min(minSpan, total), total);
    if (low < first) low = first;
    if (low + span > last) low = last - span;
    return { start: low, end: low + span };
  }

  function zoomWord(span) {
    if (span >= 1000) return 'Millénaires';
    if (span >= 100) return 'Siècles';
    if (span >= 30) return 'Générations';
    if (span >= 10) return 'Décennies';
    return 'Années';
  }

  function zoomFactorLabel(span) {
    const factor = domainSpan() / Math.max(span, 0.001);
    if (factor < 1.05) return '×1';
    if (factor < 10) return `×${factor.toFixed(1).replace('.', ',')}`;
    return `×${Math.round(factor)}`;
  }

  function toast(message, duration = 2300) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add('is-visible');
    toastTimer = setTimeout(() => els.toast.classList.remove('is-visible'), duration);
  }

  function scheduleHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(syncHashNow, 220);
  }

  function syncHashNow() {
    if (!country) return;
    const start = Math.round(state.view.start);
    const end = Math.round(state.view.end);
    let hash = `#/${state.countryId}/${start}-${end}`;
    if (state.readerEventId) hash += `/${state.readerEventId}`;
    if (location.hash !== hash) {
      try {
        history.replaceState(null, '', hash);
      } catch {
        /* file:// peut refuser replaceState selon le navigateur. */
      }
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Sélecteur de pays / globe                                               */
  /* ---------------------------------------------------------------------- */

  function updateWorldButton() {
    if (!country) return;
    els.worldFlag.textContent = country.flag;
    els.worldName.textContent = country.name;
    els.worldBtn.style.setProperty('--country', country.color);
    els.worldBtn.setAttribute('aria-label', `Choisir un pays sur le globe — actuellement ${country.name}`);
  }

  /* ---------------------------------------------------------------------- */
  /* Données du pays courant                                                */
  /* ---------------------------------------------------------------------- */

  function countTags(list) {
    const counts = {};
    for (const event of list) {
      for (const tag of event.tags) counts[tag] = (counts[tag] || 0) + 1;
    }
    return counts;
  }

  function countEras(c, list) {
    return c.eras.map((era, index) => {
      const isLast = index === c.eras.length - 1;
      return list.filter((event) =>
        event.year >= era.start && (isLast ? event.year <= era.end : event.year < era.end)
      ).length;
    });
  }

  function currentEraFor(year) {
    if (!country) return null;
    return country.eras.find((era, index) => {
      const isLast = index === country.eras.length - 1;
      return year >= era.start && (isLast ? year <= era.end : year < era.end);
    }) || null;
  }

  function updateCountryCopy(tagCounts) {
    els.countryFlag.textContent = country.flag;
    els.countryName.textContent = country.name;
    els.countryTagline.textContent = country.tagline;
    els.countryTitle.textContent = displayArticleName(country.articleName);
    els.countryIntro.textContent = country.intro;
    els.eventCount.textContent = events.length;
    els.eraCount.textContent = country.eras.length;
    els.tagCount.textContent = Object.keys(tagCounts).length;
    document.title = `${displayArticleName(country.articleName)} — Vectemporel`;
    document.documentElement.style.setProperty('--country', country.color);
  }

  function setCountry(id, options = {}) {
    const next = COUNTRY_BY_ID.get(id);
    if (!next) return;

    const same = state.countryId === id;
    if (!same && !options.keepReader) {
      closeReader({ silent: true, restoreFocus: false });
    }

    state.countryId = id;
    country = next;
    events = ALL_EVENTS.filter((event) => event.countryId === id);

    const tagCounts = countTags(events);
    for (const tag of [...state.activeTags]) {
      if (!tagCounts[tag]) state.activeTags.delete(tag);
    }

    if (options.view) {
      state.view = clampView(next, options.view.start, options.view.end);
    } else if (!same || options.resetView) {
      state.view = { start: next.domain[0], end: next.domain[1] };
    } else {
      state.view = clampView(next, state.view.start, state.view.end);
    }

    if (!options.keepReader) {
      state.selectedId = null;
      state.readerEventId = null;
      state.readerSlug = null;
      state.readerStack = [];
    }
    state.hoverId = null;
    hideTooltip();
    updateWorldButton();
    updateGlobeRows();
    updateCountryCopy(tagCounts);
    buildTags(tagCounts);
    buildEras();
    buildEvents();
    buildMinimap();
    els.minimapStart.textContent = formatYear(country.domain[0]);
    els.minimapEnd.textContent = formatYear(country.domain[1]);

    clearTimeout(countrySwapTimer);
    els.stage.classList.remove('country-swap');
    void els.stage.offsetWidth;
    els.stage.classList.add('country-swap');
    countrySwapTimer = setTimeout(() => els.stage.classList.remove('country-swap'), 500);

    draw();
    scheduleHash();
  }

  /* ---------------------------------------------------------------------- */
  /* Lentilles                                                              */
  /* ---------------------------------------------------------------------- */

  function buildTags(tagCounts) {
    els.tagList.innerHTML = '';
    for (const [id, tag] of Object.entries(TAGS)) {
      const count = tagCounts[id] || 0;
      const active = state.activeTags.has(id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `tag-chip${active ? ' is-active' : ''}`;
      button.dataset.tag = id;
      button.style.setProperty('--tag', tag.color);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.disabled = count === 0 && !active;

      const dot = document.createElement('span');
      dot.className = 'tag-dot';
      const name = document.createElement('span');
      name.className = 'tag-name';
      name.textContent = tag.label;
      const countEl = document.createElement('span');
      countEl.className = 'tag-count';
      countEl.textContent = count;

      button.append(dot, name, countEl);
      button.addEventListener('click', () => toggleTag(id, button));
      els.tagList.appendChild(button);
    }
    updateTagsUi();
  }

  function toggleTag(id, button) {
    if (state.activeTags.has(id)) state.activeTags.delete(id);
    else state.activeTags.add(id);
    button.classList.toggle('is-active', state.activeTags.has(id));
    button.setAttribute('aria-pressed', state.activeTags.has(id) ? 'true' : 'false');
    updateFilterSummary();
    draw();
  }

  function updateTagsUi() {
    for (const button of els.tagList.querySelectorAll('.tag-chip')) {
      const active = state.activeTags.has(button.dataset.tag);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    els.clearTags.hidden = state.activeTags.size === 0;
    updateFilterSummary();
  }

  function updateFilterSummary() {
    const visible = events.filter(isEventVisible).length;
    els.filterSummary.textContent = state.activeTags.size
      ? `${visible} sur ${events.length} événements`
      : `Tous les événements · ${events.length}`;
    els.clearTags.hidden = state.activeTags.size === 0;
  }

  /* ---------------------------------------------------------------------- */
  /* Périodes                                                               */
  /* ---------------------------------------------------------------------- */

  function buildEras() {
    const counts = countEras(country, events);
    els.eraList.innerHTML = '';
    els.eraBand.innerHTML = '';
    eraEls = [];

    country.eras.forEach((era, index) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'era-chip';
      chip.style.setProperty('--era', era.color);
      chip.title = `${era.name} · ${formatYear(era.start)} — ${formatYear(era.end)}`;
      const dot = document.createElement('span');
      dot.className = 'era-dot';
      const name = document.createElement('span');
      name.className = 'era-name';
      name.textContent = era.name;
      const count = document.createElement('span');
      count.className = 'era-count';
      count.textContent = counts[index];
      chip.append(dot, name, count);
      chip.addEventListener('click', () => zoomToEra(era));
      els.eraList.appendChild(chip);

      const block = document.createElement('button');
      block.type = 'button';
      block.className = 'era-block';
      block.style.setProperty('--era', era.color);
      block.title = `${era.name} · ${formatYear(era.start)} — ${formatYear(era.end)}`;
      block.setAttribute('aria-label', `Zoomer sur ${era.name}`);
      const blockName = document.createElement('span');
      blockName.className = 'era-name';
      blockName.textContent = era.name;
      block.append(blockName);
      block.addEventListener('click', () => zoomToEra(era));
      els.eraBand.appendChild(block);

      eraEls.push({ era, chip, block });
    });
  }

  function updateEraPositions(full, activeEra) {
    for (const { era, chip, block } of eraEls) {
      const leftYear = Math.max(era.start, state.view.start);
      const rightYear = Math.min(era.end, state.view.end);
      if (rightYear <= leftYear + 0.01) {
        block.style.display = 'none';
      } else {
        block.style.display = 'block';
        const left = yearToX(leftYear);
        const width = yearToX(rightYear) - left;
        block.style.left = `${left}px`;
        block.style.width = `${Math.max(1, width)}px`;
        block.classList.toggle('is-compact', width < 96);
      }
      const current = !full && activeEra === era;
      block.classList.toggle('is-current', current);
      chip.classList.toggle('is-current', current);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Événements                                                             */
  /* ---------------------------------------------------------------------- */

  function buildEvents() {
    els.eventsLayer.innerHTML = '';
    els.stemLayer.innerHTML = '';
    eventEls = new Map();
    stemEls = new Map();

    for (const event of events) {
      const color = tagColor(event);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `event imp-${event.importance}`;
      button.dataset.eventId = event.id;
      button.style.setProperty('--tag', color);
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute(
        'aria-label',
        `${formatEventYears(event)} — ${event.title}. ${event.subtitle}. Ouvrir l’article Grokipedia.`
      );

      if (event.endYear != null) {
        const span = document.createElement('span');
        span.className = 'event-span';
        span.setAttribute('aria-hidden', 'true');
        button.appendChild(span);
      }

      const dot = document.createElement('span');
      dot.className = 'event-dot';
      dot.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.className = 'event-label';
      const year = document.createElement('span');
      year.className = 'event-year';
      year.textContent = formatEventYears(event);
      const title = document.createElement('span');
      title.className = 'event-title';
      title.textContent = event.title;
      label.append(year, title);

      button.append(dot, label);
      button.addEventListener('click', (eventObject) => {
        eventObject.stopPropagation();
        if (state.drag?.moved) return;
        openEvent(event.id);
      });
      button.addEventListener('mouseenter', () => {
        if (!isEventVisible(event)) return;
        state.hoverId = event.id;
        showTooltip(event);
      });
      button.addEventListener('mouseleave', () => {
        if (state.hoverId === event.id) {
          state.hoverId = null;
          hideTooltip();
        }
      });
      button.addEventListener('focus', () => {
        if (!isEventVisible(event)) return;
        state.hoverId = event.id;
        showTooltip(event);
      });
      button.addEventListener('blur', () => {
        if (state.hoverId === event.id) {
          state.hoverId = null;
          hideTooltip();
        }
      });

      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('class', 'stem-line');
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-opacity', '0.22');
      els.stemLayer.appendChild(line);

      eventEls.set(event.id, button);
      stemEls.set(event.id, line);
      els.eventsLayer.appendChild(button);
    }
  }

  function measureEventLabel(event) {
    if (!measureCtx) return Math.min(280, event.title.length * 7 + 50);
    measureCtx.font = '500 11.5px Inter, system-ui, sans-serif';
    const text = `${formatEventYears(event)}  ${event.title}`;
    return Math.min(280, measureCtx.measureText(text).width + 34);
  }

  function layoutEvents(span, full) {
    const { w, axisY, maxAbove, maxBelow } = layout;
    const labels = { above: Array.from({ length: maxAbove }, () => []), below: Array.from({ length: maxBelow }, () => []) };
    const positions = new Map();
    const viewportPad = 30;

    const visible = events.filter((event) => {
      if (!isEventVisible(event)) return false;
      const x = yearToX(event.year);
      const endX = event.endYear != null ? yearToX(event.endYear) : x;
      return (x >= -viewportPad && x <= w + viewportPad) || (event.endYear != null && endX >= -viewportPad && x <= w + viewportPad);
    });

    const threshold = full ? 3 : span > 900 ? 2 : 1;
    const featuredIds = new Set(country.featuredIds || []);
    const overview = span > domainSpan() * 0.55;
    let eligible;
    if (visible.length <= 14) {
      eligible = visible;
    } else if (overview && featuredIds.size) {
      eligible = visible.filter((event) => featuredIds.has(event.id));
    } else {
      eligible = visible.filter((event) => event.importance >= threshold);
    }
    if (!eligible.length) {
      eligible = visible.filter((event) => event.importance >= threshold);
    }
    eligible.sort((a, b) => b.importance - a.importance || a.year - b.year);

    function free(side, lane, start, end) {
      return labels[side][lane].every((interval) => end < interval[0] - 8 || start > interval[1] + 8);
    }

    eligible.forEach((event, index) => {
      const x = yearToX(event.year);
      const width = measureEventLabel(event);
      const flip = x + 18 + width > w - 8;
      const start = flip ? x - 16 - width : x - 8;
      const end = flip ? x + 8 : x + 16 + width;
      const preferred = index % 2 === 0 ? ['above', 'below'] : ['below', 'above'];
      let placed = null;

      for (const side of preferred) {
        const laneCount = side === 'above' ? maxAbove : maxBelow;
        for (let lane = 0; lane < laneCount; lane += 1) {
          if (free(side, lane, start, end)) {
            labels[side][lane].push([start, end]);
            placed = { side, lane, x, y: side === 'above' ? axisY - 30 - lane * 42 : axisY + 30 + lane * 42, hasLabel: true, flip, width };
            break;
          }
        }
        if (placed) break;
      }
      if (placed) positions.set(event.id, placed);
    });

    const allLanes = [
      ...Array.from({ length: maxAbove }, (_, lane) => ({ side: 'above', lane })),
      ...Array.from({ length: maxBelow }, (_, lane) => ({ side: 'below', lane })),
    ];

    visible.forEach((event, index) => {
      if (positions.has(event.id)) return;
      const x = yearToX(event.year);
      const preferred = index % 2 === 0 ? ['above', 'below'] : ['below', 'above'];
      let placed = null;

      for (const side of preferred) {
        const laneCount = side === 'above' ? maxAbove : maxBelow;
        for (let lane = 0; lane < laneCount; lane += 1) {
          if (free(side, lane, x - 7, x + 7)) {
            labels[side][lane].push([x - 7, x + 7]);
            placed = {
              side,
              lane,
              x,
              y: side === 'above' ? axisY - 30 - lane * 42 : axisY + 30 + lane * 42,
              hasLabel: false,
              flip: false,
              width: 0,
            };
            break;
          }
        }
        if (placed) break;
      }

      if (!placed) {
        let best = null;
        let bestScore = Infinity;
        for (const candidate of allLanes) {
          const intervals = labels[candidate.side][candidate.lane];
          let score = 0;
          for (const interval of intervals) {
            score += Math.max(0, Math.min(x + 7, interval[1]) - Math.max(x - 7, interval[0]));
          }
          if (score < bestScore) {
            bestScore = score;
            best = candidate;
          }
        }
        const lane = best || { side: 'above', lane: 0 };
        placed = {
          side: lane.side,
          lane: lane.lane,
          x,
          y: lane.side === 'above' ? axisY - 30 - lane.lane * 42 : axisY + 30 + lane.lane * 42,
          hasLabel: false,
          flip: false,
          width: 0,
        };
      }
      positions.set(event.id, placed);
    });

    for (const event of events) {
      const el = eventEls.get(event.id);
      const line = stemEls.get(event.id);
      if (!el || !line) continue;
      const position = positions.get(event.id);
      if (!isEventVisible(event) || !position) {
        el.style.display = 'none';
        line.style.display = 'none';
        continue;
      }
      if (position.x < -viewportPad || position.x > w + viewportPad) {
        el.style.display = 'none';
        line.style.display = 'none';
        continue;
      }

      el.style.display = 'block';
      el.style.left = `${position.x}px`;
      el.style.top = `${position.y}px`;
      el.classList.toggle('label-hidden', !position.hasLabel);
      el.classList.toggle('is-flipped', position.flip);
      el.classList.toggle('selected', state.selectedId === event.id);

      if (event.endYear != null) {
        const spanEl = el.querySelector('.event-span');
        if (spanEl) {
          const endX = yearToX(event.endYear);
          spanEl.style.width = `${Math.max(2, endX - position.x)}px`;
        }
      }

      line.style.display = 'block';
      line.setAttribute('x1', position.x);
      line.setAttribute('x2', position.x);
      line.setAttribute('y1', axisY);
      line.setAttribute('y2', position.y);
      line.setAttribute('stroke-opacity', state.selectedId === event.id ? '0.78' : '0.22');
    }

    if (state.hoverId) {
      const hovered = eventEls.get(state.hoverId);
      if (hovered && hovered.style.display !== 'none') positionTooltip(hovered);
      else hideTooltip();
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Graduations, axe, mini-carte                                           */
  /* ---------------------------------------------------------------------- */

  function chooseStep(span, pixelWidth) {
    const target = clamp(Math.floor(pixelWidth / 135), 5, 10);
    const raw = span / target;
    const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];
    for (const step of steps) if (step >= raw) return step;
    return 10000;
  }

  function renderGrid() {
    els.gridLayer.innerHTML = '';
    els.ticksLayer.innerHTML = '';
    const span = state.view.end - state.view.start;
    const step = chooseStep(span, layout.plotW);
    const first = Math.ceil(state.view.start / step) * step;
    const gridFragment = document.createDocumentFragment();
    const tickFragment = document.createDocumentFragment();
    const tickPositions = [];
    let guard = 0;

    for (let year = first; year <= state.view.end + 0.001 && guard < 40; year += step, guard += 1) {
      if (year < state.view.start - 0.001) continue;
      const x = yearToX(year);
      if (x < layout.padL - 30 || x > layout.w - layout.padR + 30) continue;
      tickPositions.push(x);

      const grid = document.createElement('span');
      grid.className = 'grid-line is-major';
      grid.style.left = `${x}px`;
      gridFragment.appendChild(grid);

      const tick = document.createElement('span');
      tick.className = 'tick';
      tick.style.left = `${x}px`;
      tick.style.top = `${layout.axisY}px`;
      if (x < layout.padL + 42) tick.classList.add('edge-left');
      if (x > layout.w - layout.padR - 42) tick.classList.add('edge-right');

      const mark = document.createElement('span');
      mark.className = 'tick-mark';
      const label = document.createElement('span');
      label.className = 'tick-label';
      label.textContent = year === 0 ? 'An 1' : formatYear(year);
      tick.append(mark, label);
      tickFragment.appendChild(tick);
    }

    for (const era of country.eras) {
      const x = yearToX(era.start);
      if (x < layout.padL - 1 || x > layout.w - layout.padR + 1) continue;
      if (tickPositions.some((tickX) => Math.abs(tickX - x) < 3)) continue;
      const grid = document.createElement('span');
      grid.className = 'grid-line is-era';
      grid.style.left = `${x}px`;
      gridFragment.appendChild(grid);
    }

    els.gridLayer.appendChild(gridFragment);
    els.ticksLayer.appendChild(tickFragment);
  }

  function buildMinimap() {
    els.minimapEras.innerHTML = '';
    els.minimapEvents.innerHTML = '';
    const [first, last] = country.domain;
    const total = last - first;

    for (const era of country.eras) {
      const left = ((era.start - first) / total) * 100;
      const width = ((Math.min(era.end, last) - era.start) / total) * 100;
      const block = document.createElement('span');
      block.className = 'minimap-era';
      block.style.setProperty('--era', era.color);
      block.style.left = `${left}%`;
      block.style.width = `${Math.max(0.1, width)}%`;
      els.minimapEras.appendChild(block);
    }

    for (const event of events) {
      const left = ((event.year - first) / total) * 100;
      const tick = document.createElement('span');
      tick.className = 'minimap-event';
      tick.style.setProperty('--tag', tagColor(event));
      tick.style.left = `${left}%`;
      tick.style.height = `${5 + event.importance * 3}px`;
      tick.style.opacity = `${0.5 + event.importance * 0.16}`;
      els.minimapEvents.appendChild(tick);
    }
  }

  function updateMinimapWindow() {
    const [first, last] = country.domain;
    const total = last - first;
    const left = ((state.view.start - first) / total) * 100;
    const width = ((state.view.end - state.view.start) / total) * 100;
    els.minimapWindow.style.left = `${clamp(left, 0, 100)}%`;
    els.minimapWindow.style.width = `${Math.max(0.7, clamp(width, 0, 100))}%`;
  }

  /* ---------------------------------------------------------------------- */
  /* Dessin principal                                                       */
  /* ---------------------------------------------------------------------- */

  function computeLayout() {
    const w = els.stage.clientWidth;
    const h = els.stage.clientHeight;
    if (w < 10 || h < 10) return;
    const topBand = 44;
    const axisY = clamp(topBand + (h - topBand - 54) * 0.58, topBand + 100, h - 68);
    const padL = Math.max(24, Math.min(34, w * 0.02));
    const padR = padL - 6;
    const plotW = Math.max(1, w - padL - padR);
    const maxAbove = clamp(Math.floor((axisY - 30 - (topBand + 24)) / 42) + 1, 1, 5);
    const maxBelow = clamp(Math.floor((h - 64 - axisY - 30) / 42) + 1, 1, 5);
    layout = { w, h, padL, padR, plotW, axisY, topBand, maxAbove, maxBelow };
  }

  function draw(options = {}) {
    if (!country) return;
    computeLayout();
    const span = state.view.end - state.view.start;
    const total = domainSpan();
    const full = span >= total - 0.5;
    const center = (state.view.start + state.view.end) / 2;
    const activeEra = currentEraFor(center);

    els.rangeLabel.textContent = `${formatYear(state.view.start)} — ${formatYear(state.view.end)}`;
    els.centerEra.textContent = full
      ? `Vue d’ensemble · ${country.name}`
      : `${activeEra ? activeEra.name : country.name} · ${country.name}`;
    els.zoomLevel.textContent = zoomWord(span);
    els.zoomFactor.textContent = zoomFactorLabel(span);
    els.axis.style.top = `${layout.axisY}px`;

    updateEraPositions(full, activeEra);
    renderGrid();
    layoutEvents(span, full);
    updateMinimapWindow();
    updateFilterSummary();

    if (options.hash !== false) scheduleHash();
  }

  /* ---------------------------------------------------------------------- */
  /* Zoom, panoramique, interactions de la frise                            */
  /* ---------------------------------------------------------------------- */

  function cancelZoomAnimation() {
    if (zoomAnim) cancelAnimationFrame(zoomAnim);
    zoomAnim = 0;
  }

  function animateView(target, duration = 420) {
    cancelZoomAnimation();
    if (reduceMotion) {
      state.view = target;
      draw();
      return;
    }
    const from = { ...state.view };
    const startedAt = performance.now();
    const tick = (now) => {
      const progress = clamp((now - startedAt) / duration, 0, 1);
      const eased = easeOutCubic(progress);
      state.view = {
        start: lerp(from.start, target.start, eased),
        end: lerp(from.end, target.end, eased),
      };
      draw();
      if (progress < 1) zoomAnim = requestAnimationFrame(tick);
      else zoomAnim = 0;
    };
    zoomAnim = requestAnimationFrame(tick);
  }

  function setView(start, end, options = {}) {
    if (!country) return;
    const target = clampView(country, start, end);
    if (options.animate) {
      animateView(target, options.duration || 420);
    } else {
      cancelZoomAnimation();
      state.view = target;
      draw();
    }
  }

  function zoomBy(factor, anchorX = null, animate = true) {
    const span = state.view.end - state.view.start;
    const total = domainSpan();
    const anchor = anchorX == null ? (state.view.start + state.view.end) / 2 : xToYear(anchorX);
    const newSpan = clamp(span * factor, Math.min(5, total), total);
    const ratio = (anchor - state.view.start) / span;
    const start = anchor - ratio * newSpan;
    setView(start, start + newSpan, { animate, duration: 320 });
  }

  function fitView() {
    if (!country) return;
    setView(country.domain[0], country.domain[1], { animate: true, duration: 520 });
  }

  function zoomToEra(era) {
    const eraSpan = era.end - era.start;
    const padding = Math.max(3, eraSpan * 0.055);
    setView(era.start - padding, era.end + padding, { animate: true, duration: 460 });
  }

  function recentView() {
    if (!country) return;
    const [first, last] = country.domain;
    const span = Math.min(100, last - first);
    setView(Math.max(first, last - span), last, { animate: true, duration: 500 });
  }

  function panByPixels(dx) {
    const span = state.view.end - state.view.start;
    const years = (-dx / layout.plotW) * span;
    setView(state.view.start + years, state.view.end + years);
  }

  function goToYear(year) {
    if (!country) return;
    const span = clamp(domainSpan() * 0.03, 24, 70);
    setView(year - span / 2, year + span / 2, { animate: true, duration: 500 });
    closeSearch();
  }

  function eventView(event) {
    const c = COUNTRY_BY_ID.get(event.countryId);
    const duration = event.endYear != null ? event.endYear - event.year : 0;
    let center = event.endYear != null ? (event.year + event.endYear) / 2 : event.year;
    const minSpan = Math.max(36, domainSpan(c) * 0.02, duration * 1.45);
    const pad = Math.max(minSpan * 0.5, duration * 0.18);
    return clampView(c, center - minSpan / 2 - pad * 0.1, center + minSpan / 2 + pad * 0.1);
  }

  function goToEvent(id) {
    const event = EVENT_BY_ID.get(id);
    if (!event) return;
    const target = eventView(event);
    if (event.countryId !== state.countryId) {
      setCountry(event.countryId, { view: target, keepReader: true });
    } else {
      setView(target.start, target.end, { animate: true, duration: 500 });
    }
    openEvent(id, { focusView: false });
    closeSearch();
  }

  function hideHint() {
    if (hintDismissed) return;
    hintDismissed = true;
    els.zoomHint.classList.add('is-hidden');
  }

  function dismissReadersFocus() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function onWheel(event) {
    if (state.readersOpen || !els.aboutOverlay.hidden) return;
    event.preventDefault();
    hideHint();
    cancelZoomAnimation();
    const rect = els.stage.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, layout.padL, els.stage.clientWidth - layout.padR);
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.15) {
      panByPixels(-(event.deltaX || event.deltaY) * 1.2);
      return;
    }
    const intensity = event.ctrlKey ? 0.0045 : 0.00135;
    const factor = Math.exp(event.deltaY * intensity);
    zoomBy(factor, x, false);
  }

  function midpoint(pointers) {
    const values = [...pointers.values()];
    const a = values[0];
    const b = values[1];
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      distance: Math.hypot(a.x - b.x, a.y - b.y),
    };
  }

  function onStagePointerDown(event) {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    if (event.target.closest('button, a')) return;
    if (state.readersOpen || !els.aboutOverlay.hidden) return;
    cancelZoomAnimation();
    hideHint();
    els.stage.setPointerCapture(event.pointerId);
    stagePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (stagePointers.size === 1) {
      state.drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startView: { ...state.view },
        moved: false,
      };
      els.stage.classList.add('is-dragging');
      hideTooltip();
    } else if (stagePointers.size === 2) {
      state.drag = null;
      const rect = els.stage.getBoundingClientRect();
      const mid = midpoint(stagePointers);
      pinching = {
        distance: Math.max(20, mid.distance),
        midYear: xToYear(clamp(mid.x - rect.left, layout.padL, els.stage.clientWidth - layout.padR)),
        view: { ...state.view },
      };
    }
  }

  function onStagePointerMove(event) {
    if (!stagePointers.has(event.pointerId)) return;
    stagePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (stagePointers.size >= 2 && pinching) {
      const rect = els.stage.getBoundingClientRect();
      const mid = midpoint(stagePointers);
      const midX = clamp(mid.x - rect.left, layout.padL, els.stage.clientWidth - layout.padR);
      const total = domainSpan();
      const baseSpan = pinching.view.end - pinching.view.start;
      const newSpan = clamp((baseSpan * pinching.distance) / Math.max(20, mid.distance), Math.min(5, total), total);
      const ratio = (midX - layout.padL) / layout.plotW;
      const start = pinching.midYear - ratio * newSpan;
      state.view = clampView(country, start, start + newSpan);
      draw();
      return;
    }

    if (state.drag && event.pointerId === state.drag.pointerId) {
      const dx = event.clientX - state.drag.startX;
      if (Math.abs(dx) > 3) state.drag.moved = true;
      if (!state.drag.moved) return;
      const span = state.drag.startView.end - state.drag.startView.start;
      const years = (-dx / layout.plotW) * span;
      state.view = clampView(country, state.drag.startView.start + years, state.drag.startView.end + years);
      draw();
    }
  }

  function onStagePointerUp(event) {
    stagePointers.delete(event.pointerId);
    if (stagePointers.size < 2) pinching = null;
    if (state.drag && state.drag.pointerId === event.pointerId) {
      state.drag = null;
      els.stage.classList.remove('is-dragging');
    }
    if (els.stage.hasPointerCapture(event.pointerId)) {
      els.stage.releasePointerCapture(event.pointerId);
    }
  }

  function onGlobalKeydown(event) {
    if (!document.getElementById('spiral-overlay')?.hidden) return;
    const target = event.target;
    const typing = target instanceof HTMLElement && (
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable
    );

    if (state.globeOpen) {
      if (event.key === 'Escape') {
        closeGlobe();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = [...els.globeOverlay.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')].filter(
          (element) => element.offsetParent !== null
        );
        if (focusable.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
      return;
    }

    if (event.key === 'Escape') {
      if (document.activeElement === els.searchInput) {
        closeSearch();
        els.searchInput.blur();
        return;
      }
      if (!els.searchResults.hidden) {
        closeSearch();
        els.searchInput.blur();
        return;
      }
      if (state.readersOpen) {
        closeReader();
        return;
      }
      if (!els.aboutOverlay.hidden) {
        closeModal();
        return;
      }
    }

    if (state.readersOpen) {
      if (event.key === 'Tab') {
        const focusable = [...els.reader.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(
          (element) => element.offsetParent !== null
        );
        if (focusable.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
      return;
    }

    if (!els.aboutOverlay.hidden || typing) return;

    if (event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
      event.preventDefault();
      els.searchInput.focus();
      els.searchInput.select();
      return;
    }
    if (event.key === '?' || (event.shiftKey && event.key === '/')) {
      event.preventDefault();
      openModal();
      return;
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomBy(0.6);
      hideHint();
      return;
    }
    if (event.key === '-') {
      event.preventDefault();
      zoomBy(1.7);
      hideHint();
      return;
    }
    if (event.key === '0') {
      event.preventDefault();
      fitView();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      panByPixels(layout.plotW * 0.09);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      panByPixels(-layout.plotW * 0.09);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Infobulle                                                              */
  /* ---------------------------------------------------------------------- */

  function showTooltip(event) {
    const node = eventEls.get(event.id);
    if (!node) return;
    els.tooltip.innerHTML = '';

    const date = document.createElement('div');
    date.className = 'tt-date';
    date.textContent = formatEventYears(event);
    if (event.endYear != null) {
      const duration = document.createElement('span');
      duration.textContent = `${Math.round(event.endYear - event.year)} ans`;
      date.appendChild(duration);
    }

    const title = document.createElement('h3');
    title.textContent = event.title;
    const subtitle = document.createElement('p');
    subtitle.className = 'tt-subtitle';
    subtitle.textContent = event.subtitle;

    const summary = document.createElement('p');
    summary.className = 'tt-summary';
    summary.textContent = event.summary;

    const tags = document.createElement('div');
    tags.className = 'tt-tags';
    for (const tag of event.tags) {
      const chip = document.createElement('span');
      chip.className = 'tt-tag';
      chip.style.setProperty('--tag', TAGS[tag]?.color || '#e6b96f');
      chip.textContent = TAGS[tag]?.label || tag;
      tags.appendChild(chip);
    }

    const cta = document.createElement('div');
    cta.className = 'tt-cta';
    cta.textContent = 'Ouvrir dans le lecteur';
    const arrow = document.createElement('span');
    arrow.textContent = '↗';
    cta.appendChild(arrow);

    els.tooltip.append(date, title, subtitle, summary, tags, cta);
    els.tooltip.hidden = false;
    requestAnimationFrame(() => positionTooltip(node));
  }

  function positionTooltip(node) {
    if (els.tooltip.hidden) return;
    const rect = node.getBoundingClientRect();
    const tooltipRect = els.tooltip.getBoundingClientRect();
    const margin = 12;
    let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
    left = clamp(left, margin, window.innerWidth - tooltipRect.width - margin);
    let top = rect.top - tooltipRect.height - 14;
    if (top < 72) top = rect.bottom + 14;
    if (top + tooltipRect.height > window.innerHeight - margin) {
      top = window.innerHeight - tooltipRect.height - margin;
    }
    els.tooltip.style.left = `${left}px`;
    els.tooltip.style.top = `${top}px`;
  }

  function hideTooltip() {
    state.hoverId = null;
    els.tooltip.hidden = true;
    els.tooltip.innerHTML = '';
  }

  /* ---------------------------------------------------------------------- */
  /* Lecteur Grokipedia                                                     */
  /* ---------------------------------------------------------------------- */

  const articleCache = new Map();

  function setReaderLinks(url, search) {
    const target = url || search || `https://grokipedia.com/search?q=${encodeURIComponent(country ? country.name : 'histoire')}`;
    els.readerExternal.href = target;
    els.readerFooterLink.href = target;
  }

  function renderReaderEvent(event) {
    const c = COUNTRY_BY_ID.get(event.countryId);
    els.readerContext.textContent = `${c.name} · ${formatEventYears(event)}`;
    els.readerTitle.textContent = event.title;
    els.readerTags.innerHTML = '';
    for (const tag of event.tags) {
      const hashtag = document.createElement('span');
      hashtag.className = 'reader-hashtag';
      hashtag.style.setProperty('--tag', TAGS[tag]?.color || '#e6b96f');
      hashtag.textContent = TAGS[tag]?.hashtag || `#${tag}`;
      els.readerTags.appendChild(hashtag);
    }
    setReaderLinks(event.grok ? `https://grokipedia.com/page/${event.grok}` : null, `https://grokipedia.com/search?q=${encodeURIComponent(`${event.title} ${event.subtitle}`)}`);

    const related = (event.related || []).map((id) => EVENT_BY_ID.get(id)).filter(Boolean);
    els.readerRelated.hidden = related.length === 0;
    els.relatedList.innerHTML = '';
    for (const item of related) {
      const itemCountry = COUNTRY_BY_ID.get(item.countryId);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'related-chip';
      const flag = document.createElement('span');
      flag.textContent = itemCountry.flag;
      const year = document.createElement('span');
      year.className = 'rc-year';
      year.textContent = formatYear(item.year);
      const title = document.createElement('span');
      title.textContent = item.title;
      chip.append(flag, year, title);
      chip.addEventListener('click', () => openEvent(item.id, { focusView: true }));
      els.relatedList.appendChild(chip);
    }
    els.readerScroll.scrollTop = 0;
  }

  function openReaderPanel() {
    clearTimeout(readerHideTimer);
    state.readersOpen = true;
    els.readerOverlay.hidden = false;
    document.body.classList.add('reader-open');
    requestAnimationFrame(() => els.readerOverlay.classList.add('is-open'));
    setTimeout(() => {
      if (state.readersOpen) els.readerClose.focus({ preventScroll: true });
    }, 60);
  }

  function openEvent(id, options = {}) {
    const event = EVENT_BY_ID.get(id);
    if (!event) return;
    if (!options || typeof options !== 'object') options = {};

    const c = COUNTRY_BY_ID.get(event.countryId);
    if (state.countryId !== event.countryId) {
      setCountry(event.countryId, { view: eventView(event), keepReader: true });
    } else if (options.focusView) {
      const target = eventView(event);
      setView(target.start, target.end, { animate: true, duration: 480 });
    }

    if (!state.readersOpen) {
      state.lastFocus = document.activeElement;
    } else {
      const nextFocus = eventEls.get(event.id);
      if (nextFocus) state.lastFocus = nextFocus;
    }
    state.readerEventId = event.id;
    state.selectedId = event.id;
    state.readerSlug = event.grok || null;
    state.readerStack = event.grok ? [event.grok] : [];
    updateReaderBack();
    renderReaderEvent(event);
    openReaderPanel();
    draw();
    syncHashNow();

    const query = `${event.title} ${event.subtitle} ${c.name}`;
    loadReaderArticle(event.grok, { push: false, query, event });
  }

  function closeReader(options = {}) {
    if (!state.readersOpen && els.readerOverlay.hidden) return;
    const previousFocus = state.lastFocus;
    state.readersOpen = false;
    state.readerEventId = null;
    state.selectedId = null;
    state.readerSlug = null;
    state.readerStack = [];
    state.readerRequest += 1;
    updateReaderBack();
    els.readerOverlay.classList.remove('is-open');
    document.body.classList.remove('reader-open');
    clearTimeout(readerHideTimer);
    readerHideTimer = setTimeout(() => {
      if (!state.readersOpen) els.readerOverlay.hidden = true;
    }, 430);
    hideTooltip();
    if (!options.silent) {
      draw();
      syncHashNow();
    }
    if (options.restoreFocus !== false && previousFocus && previousFocus.isConnected) {
      setTimeout(() => {
        try {
          previousFocus.focus({ preventScroll: true });
        } catch {
          /* ignore */
        }
      }, 80);
    }
  }

  function updateReaderBack() {
    els.readerBack.hidden = state.readerStack.length <= 1;
  }

  function setReaderLoading() {
    els.grokState.hidden = false;
    els.grokState.innerHTML = SKELETON_HTML;
    els.grokBody.hidden = true;
    els.grokBody.innerHTML = '';
  }

  async function loadReaderArticle(slug, options = {}) {
    const request = ++state.readerRequest;
    if (!slug) {
      renderReaderNotFound({ searchUrl: `https://grokipedia.com/search?q=${encodeURIComponent(options.event?.title || 'histoire')}` });
      return;
    }

    if (options.push && state.readerStack[state.readerStack.length - 1] !== slug) {
      state.readerStack.push(slug);
      updateReaderBack();
    }

    setReaderLoading();
    els.readerScroll.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });

    const cached = articleCache.get(slug);
    if (cached) {
      if (request !== state.readerRequest || !state.readersOpen) return;
      if (cached.notFound) renderReaderNotFound(cached);
      else renderReaderArticle(cached);
      return;
    }

    try {
      const query = options.query || options.event?.title || slug.replaceAll('_', ' ');
      const response = await fetch(
        `/api/grokipedia?slug=${encodeURIComponent(slug)}&q=${encodeURIComponent(query)}`
      );
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Réponse illisible.');
      }
      if (request !== state.readerRequest || !state.readersOpen) return;

      if (response.status === 404) {
        articleCache.set(slug, data);
        renderReaderNotFound(data);
        return;
      }
      if (!response.ok) throw new Error(data.message || 'Lecture impossible.');
      if (data.translated !== false) articleCache.set(slug, data);
      renderReaderArticle(data);
    } catch (error) {
      if (request !== state.readerRequest || !state.readersOpen) return;
      renderReaderError(error.message || 'Impossible de joindre Grokipedia.', slug, options);
    }
  }

  function renderReaderTranslationUnavailable(data) {
    els.grokState.hidden = false;
    els.grokBody.hidden = true;
    els.grokBody.innerHTML = '';
    els.grokState.innerHTML = '';

    const box = document.createElement('div');
    box.className = 'reader-message';
    const title = document.createElement('h3');
    title.textContent = 'Traduction française indisponible';
    const text = document.createElement('p');
    text.textContent =
      'L’article n’a pas pu être traduit pour le moment. La source originale reste accessible, ou vous pouvez relancer la traduction.';
    const actions = document.createElement('div');
    actions.className = 'reader-error-actions';

    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'reader-retry';
    retry.textContent = 'Relancer la traduction';
    retry.addEventListener('click', () => {
      articleCache.delete(data.slug);
      const event = state.readerEventId ? EVENT_BY_ID.get(state.readerEventId) : null;
      loadReaderArticle(data.slug, {
        query: event ? `${event.title} ${event.subtitle}` : data.slug,
        event,
      });
    });

    const original = document.createElement('a');
    original.className = 'reader-link-button';
    original.href = data.url || `https://grokipedia.com/page/${encodeURIComponent(data.slug)}`;
    original.target = '_blank';
    original.rel = 'noopener noreferrer';
    original.textContent = 'Lire l’original sur Grokipedia ↗';

    actions.append(retry, original);
    box.append(title, text, actions);
    els.grokState.appendChild(box);
    setReaderLinks(original.href, original.href);
  }

  function renderReaderArticle(data) {
    if (data.translated === false) {
      renderReaderTranslationUnavailable(data);
      return;
    }

    state.readerSlug = data.slug || state.readerSlug;
    els.grokState.hidden = true;
    els.grokBody.hidden = false;
    els.grokBody.lang = 'fr';
    els.grokBody.innerHTML = data.html || '';


    setReaderLinks(data.url, `https://grokipedia.com/search?q=${encodeURIComponent(data.title || '')}`);
    if (state.readerEventId) {
      const event = EVENT_BY_ID.get(state.readerEventId);
      if (event) renderRelated(event);
    }
  }

  function renderRelated(event) {
    const related = (event.related || []).map((id) => EVENT_BY_ID.get(id)).filter(Boolean);
    els.readerRelated.hidden = related.length === 0;
  }

  function renderReaderNotFound(data) {
    els.grokState.hidden = false;
    els.grokBody.hidden = true;
    els.grokState.innerHTML = '';

    const box = document.createElement('div');
    box.className = 'reader-message';
    const title = document.createElement('h3');
    title.textContent = 'Pas de page directe pour ce repère';
    const text = document.createElement('p');
    text.textContent =
      'La page Grokipedia correspondante n’est pas accessible directement. La recherche Grokipedia peut retrouver l’article le plus proche.';
    box.append(title, text);

    if (data.candidates?.length) {
      const list = document.createElement('div');
      list.className = 'reader-candidates';
      for (const candidate of data.candidates) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'reader-candidate';
        const label = document.createElement('span');
        label.textContent = candidate.title;
        const arrow = document.createElement('span');
        arrow.textContent = '↗';
        button.append(label, arrow);
        button.addEventListener('click', () => loadReaderArticle(candidate.slug, { push: true }));
        list.appendChild(button);
      }
      box.appendChild(list);
    }

    const actions = document.createElement('div');
    actions.className = 'reader-error-actions';
    const searchLink = document.createElement('a');
    searchLink.className = 'reader-link-button';
    searchLink.href = data.searchUrl || `https://grokipedia.com/search?q=${encodeURIComponent('histoire')}`;
    searchLink.target = '_blank';
    searchLink.rel = 'noopener noreferrer';
    searchLink.textContent = 'Rechercher sur Grokipedia ↗';
    actions.appendChild(searchLink);
    box.appendChild(actions);
    els.grokState.appendChild(box);

    const searchUrl = data.searchUrl || `https://grokipedia.com/search?q=${encodeURIComponent('histoire')}`;
    setReaderLinks(searchUrl, searchUrl);
  }

  function renderReaderError(message, slug, options) {
    els.grokState.hidden = false;
    els.grokBody.hidden = true;
    els.grokState.innerHTML = '';

    const box = document.createElement('div');
    box.className = 'reader-message';
    const title = document.createElement('h3');
    title.textContent = 'Grokipedia est momentanément muet';
    const text = document.createElement('p');
    text.textContent = message;
    const actions = document.createElement('div');
    actions.className = 'reader-error-actions';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'reader-retry';
    retry.textContent = 'Réessayer';
    retry.addEventListener('click', () => loadReaderArticle(slug, options));
    const external = document.createElement('a');
    external.className = 'reader-link-button';
    external.href = `https://grokipedia.com/page/${encodeURIComponent(slug)}`;
    external.target = '_blank';
    external.rel = 'noopener noreferrer';
    external.textContent = 'Ouvrir sur Grokipedia ↗';
    actions.append(retry, external);
    box.append(title, text, actions);
    els.grokState.appendChild(box);
    setReaderLinks(external.href, `https://grokipedia.com/search?q=${encodeURIComponent(options.event?.title || slug)}`);
  }

  function onReaderBack() {
    if (state.readerStack.length <= 1) return;
    state.readerStack.pop();
    const previous = state.readerStack[state.readerStack.length - 1];
    updateReaderBack();
    const event = state.readerEventId ? EVENT_BY_ID.get(state.readerEventId) : null;
    loadReaderArticle(previous, {
      push: false,
      query: event ? `${event.title} ${event.subtitle}` : previous,
      event,
    });
  }

  function onGrokLink(event) {
    const anchor = event.target.closest('a');
    if (!anchor) return;
    let url;
    try {
      url = new URL(anchor.href, location.href);
    } catch {
      return;
    }
    if (!/(^|\.)grokipedia\.com$/i.test(url.hostname) || !url.pathname.startsWith('/page/')) return;
    event.preventDefault();
    let slug = url.pathname.slice('/page/'.length);
    try {
      slug = decodeURIComponent(slug);
    } catch {
      /* garder la valeur brute */
    }
    if (!slug) return;
    const currentEvent = state.readerEventId ? EVENT_BY_ID.get(state.readerEventId) : null;
    loadReaderArticle(slug, {
      push: true,
      query: currentEvent ? `${currentEvent.title} ${currentEvent.subtitle}` : slug,
      event: currentEvent,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Recherche                                                              */
  /* ---------------------------------------------------------------------- */

  const SEARCH_INDEX = ALL_EVENTS.map((event) => {
    const c = COUNTRY_BY_ID.get(event.countryId);
    return {
      event,
      country: c,
      text: normalizeText(
        [
          event.title,
          event.subtitle,
          event.summary,
          formatEventYears(event),
          c.name,
          ...tagLabels(event),
        ].join(' ')
      ),
      title: normalizeText(event.title),
    };
  });

  function parseYearQuery(query) {
    const raw = query.trim().toLowerCase().replace(/’/g, "'");
    let match = raw.match(/^(\d{1,4})\s*(av\.?\s*j\.?-?\s*c\.?|bc|avant)/);
    if (match) return -Number(match[1]);
    match = raw.match(/^-(\d{1,4})$/);
    if (match) return -Number(match[1]);
    match = raw.match(/^(\d{1,4})$/);
    if (match) return Number(match[1]);
    return null;
  }

  function scoreSearch(entry, query) {
    if (entry.title === query) return 0;
    if (entry.title.startsWith(query)) return 1;
    if (entry.title.includes(query)) return 2;
    return 3;
  }

  function closeSearch() {
    els.searchResults.hidden = true;
    els.searchInput.setAttribute('aria-expanded', 'false');
    state.searchItems = [];
    state.searchIndex = -1;
  }

  function addSearchSection(label) {
    const section = document.createElement('div');
    section.className = 'search-section-label';
    section.textContent = label;
    els.searchResults.appendChild(section);
  }

  function makeSearchItem(item, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-result';
    button.dataset.index = index;
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', 'false');

    if (item.type === 'year') {
      button.classList.add('search-year');
      const flag = document.createElement('span');
      flag.className = 'sr-flag';
      flag.textContent = country ? country.flag : '•';
      const main = document.createElement('span');
      main.className = 'sr-main';
      const title = document.createElement('span');
      title.className = 'sr-title';
      title.textContent = `Aller en ${formatYear(item.year)}`;
      const meta = document.createElement('span');
      meta.className = 'sr-meta';
      meta.textContent = `dans ${country ? country.name : 'ce pays'} · vue centrée`;
      main.append(title, meta);
      const year = document.createElement('span');
      year.className = 'sr-year';
      year.textContent = formatYear(item.year);
      button.append(flag, main, year);
    } else {
      const event = item.event;
      const c = item.country;
      const flag = document.createElement('span');
      flag.className = 'sr-flag';
      flag.textContent = c.flag;
      const main = document.createElement('span');
      main.className = 'sr-main';
      const title = document.createElement('span');
      title.className = 'sr-title';
      title.textContent = event.title;
      const meta = document.createElement('span');
      meta.className = 'sr-meta';
      meta.textContent = `${c.name} · ${tagLabels(event).join(' · ')}`;
      main.append(title, meta);
      const year = document.createElement('span');
      year.className = 'sr-year';
      year.textContent = formatEventYears(event);
      button.append(flag, main, year);
    }

    button.addEventListener('click', () => selectSearchItem(index));
    return button;
  }

  function renderSearch(query) {
    const clean = query.trim();
    if (!clean) {
      closeSearch();
      return;
    }

    els.searchResults.innerHTML = '';
    state.searchItems = [];
    const normalized = normalizeText(clean);
    const year = parseYearQuery(clean);

    if (year !== null) {
      addSearchSection('Aller à une année');
      state.searchItems.push({ type: 'year', year });
    }

    const matches = SEARCH_INDEX.filter((entry) => entry.text.includes(normalized))
      .sort((a, b) => scoreSearch(a, normalized) - scoreSearch(b, normalized) || a.event.year - b.event.year)
      .slice(0, year !== null ? 6 : 8);

    if (matches.length) {
      addSearchSection('Repères');
      for (const entry of matches) state.searchItems.push({ type: 'event', event: entry.event, country: entry.country });
    }

    if (!state.searchItems.length) {
      const empty = document.createElement('div');
      empty.className = 'search-empty';
      empty.textContent = 'Aucun repère trouvé. Essayez « Alésia », « 1789 », « Dreyfus » ou « Berlin ».';
      els.searchResults.appendChild(empty);
    } else {
      state.searchItems.forEach((item, index) => {
        els.searchResults.appendChild(makeSearchItem(item, index));
      });
    }

    state.searchIndex = state.searchItems.length ? 0 : -1;
    els.searchResults.hidden = false;
    els.searchInput.setAttribute('aria-expanded', 'true');
    updateSearchActive();
  }

  function updateSearchActive() {
    const items = [...els.searchResults.querySelectorAll('.search-result')];
    items.forEach((item, index) => {
      const active = index === state.searchIndex;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) item.scrollIntoView({ block: 'nearest' });
    });
  }

  function selectSearchItem(index) {
    const item = state.searchItems[index];
    if (!item) return;
    if (item.type === 'year') {
      goToYear(item.year);
      els.searchInput.value = '';
    } else {
      goToEvent(item.event.id);
      els.searchInput.value = '';
    }
  }

  function onSearchKeydown(event) {
    if (els.searchResults.hidden) {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        renderSearch(els.searchInput.value);
        if (!state.searchItems.length) return;
        event.preventDefault();
      } else {
        return;
      }
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      state.searchIndex = (state.searchIndex + 1) % state.searchItems.length;
      updateSearchActive();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      state.searchIndex = (state.searchIndex - 1 + state.searchItems.length) % state.searchItems.length;
      updateSearchActive();
    } else if (event.key === 'Enter') {
      if (state.searchIndex >= 0) {
        event.preventDefault();
        selectSearchItem(state.searchIndex);
      }
    } else if (event.key === 'Escape') {
      closeSearch();
      els.searchInput.blur();
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Modal concept                                                          */
  /* ---------------------------------------------------------------------- */

  function openModal() {
    clearTimeout(modalHideTimer);
    els.aboutOverlay.hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => els.aboutOverlay.classList.add('is-open'));
    setTimeout(() => els.modalClose.focus({ preventScroll: true }), 50);
  }

  function closeModal() {
    document.body.classList.remove('modal-open');
    els.aboutOverlay.classList.remove('is-open');
    clearTimeout(modalHideTimer);
    modalHideTimer = setTimeout(() => {
      els.aboutOverlay.hidden = true;
    }, 320);
    els.aboutBtn.focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------------------- */
  /* Partage + divers                                                       */
  /* ---------------------------------------------------------------------- */

  async function shareView() {
    syncHashNow();
    const url = location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast('Lien de la vue copié.');
    } catch {
      const area = document.createElement('textarea');
      area.value = url;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        toast('Lien de la vue copié.');
      } catch {
        toast('Copie impossible — le lien est dans la barre d’adresse.');
      }
      area.remove();
    }
  }

  function applyHash(parsed) {
    if (!parsed) return;
    const event = parsed.eventId ? EVENT_BY_ID.get(parsed.eventId) : null;
    if (parsed.countryId !== state.countryId) {
      setCountry(parsed.countryId, {
        view: parsed.view || (event ? eventView(event) : null),
        resetView: !parsed.view,
        keepReader: true,
      });
    } else if (parsed.view) {
      setView(parsed.view.start, parsed.view.end);
    }

    if (event) {
      openEvent(event.id, { focusView: false });
    } else if (state.readersOpen) {
      closeReader();
    }
  }

  function onHashChange() {
    applyHash(parseHash());
  }

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    if (!raw) return null;
    let parts;
    try {
      parts = decodeURIComponent(raw).split('/');
    } catch {
      parts = raw.split('/');
    }
    const countryId = parts[0];
    if (!COUNTRY_BY_ID.has(countryId)) return null;
    const c = COUNTRY_BY_ID.get(countryId);
    let view = null;
    let eventId = null;
    if (parts[1]) {
      const match = parts[1].match(/^(-?\d+)-(-?\d+)$/);
      if (match) {
        const start = Number(match[1]);
        const end = Number(match[2]);
        if (Number.isFinite(start) && Number.isFinite(end) && start !== end) {
          view = clampView(c, start, end);
        }
      }
    }
    if (parts[2] && EVENT_BY_ID.has(parts[2]) && EVENT_BY_ID.get(parts[2]).countryId === countryId) {
      eventId = parts[2];
    }
    return { countryId, view, eventId };
  }

  /* ---------------------------------------------------------------------- */
  /* Globe / atlas des pays                                                 */
  /* ---------------------------------------------------------------------- */

  function currentAtlasEntry() {
    return country ? ATLAS_BY_APP_ID.get(country.id) || null : null;
  }

  function atlasDomainLabel(entry) {
    if (!entry?.domain) return '—';
    return `${formatYear(entry.domain[0])} — ${formatYear(entry.domain[1])}`;
  }

  function updateGlobeRows() {
    for (const [code, row] of globeRows) {
      const entry = ATLAS_BY_CODE.get(code);
      if (!entry) continue;
      row.classList.toggle('is-current', entry.appId === state.countryId);
      row.classList.toggle('is-selected', globeSelected?.code === entry.code);
      row.setAttribute('aria-selected', globeSelected?.code === entry.code ? 'true' : 'false');
    }
  }

  function renderGlobeDetail(entry) {
    if (!entry) {
      els.globeDetail.innerHTML = '<p class="globe-detail-empty">Survolez un pays ou utilisez la recherche.</p>';
      return;
    }

    els.globeDetail.innerHTML = '';
    const top = document.createElement('div');
    top.className = 'globe-detail-top';
    const flag = document.createElement('span');
    flag.className = 'globe-detail-flag';
    flag.textContent = entry.flag;
    const heading = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = entry.name;
    const meta = document.createElement('p');
    meta.className = 'globe-detail-meta';
    meta.textContent = [entry.subregion || entry.region, entry.capital].filter(Boolean).join(' · ');
    heading.append(title, meta);
    top.append(flag, heading);

    const status = document.createElement('div');
    status.className = `globe-status ${entry.available ? 'is-available' : 'is-queued'}`;
    const statusDot = document.createElement('span');
    statusDot.className = 'globe-status-dot';
    const statusLabel = document.createElement('span');
    statusLabel.textContent = entry.available ? 'Frise disponible' : 'Audit à venir';
    status.append(statusDot, statusLabel);

    const summary = document.createElement('p');
    summary.className = 'globe-detail-summary';
    summary.textContent = entry.audit?.summary || entry.audit?.status || '';

    els.globeDetail.append(top, status, summary);

    if (entry.available) {
      const stats = document.createElement('div');
      stats.className = 'globe-detail-stats';
      const stat = (value, label) => {
        const item = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = value;
        const span = document.createElement('span');
        span.textContent = label;
        item.append(strong, span);
        return item;
      };
      stats.append(stat(entry.events, 'repères'), stat(entry.periods, 'périodes'), stat(atlasDomainLabel(entry), 'domaine'));
      els.globeDetail.appendChild(stats);

      if (entry.audit?.focus) {
        const focus = document.createElement('p');
        focus.className = 'globe-detail-focus';
        focus.innerHTML = '<strong>Fil éditorial</strong> ';
        focus.append(document.createTextNode(entry.audit.focus));
        els.globeDetail.appendChild(focus);
      }

      const actions = document.createElement('div');
      actions.className = 'globe-detail-actions';
      const explore = document.createElement('button');
      explore.type = 'button';
      explore.className = 'globe-explore';
      explore.textContent = entry.appId === state.countryId ? 'Revenir à la frise' : 'Explorer la frise';
      explore.addEventListener('click', () => chooseGlobeCountry(entry.code));
      actions.appendChild(explore);
      els.globeDetail.appendChild(actions);

      if (entry.audit?.href) {
        const auditLink = document.createElement('a');
        auditLink.className = 'globe-audit-link';
        auditLink.href = entry.audit.href;
        auditLink.target = '_blank';
        auditLink.rel = 'noopener noreferrer';
        auditLink.textContent = 'Lire l’audit expert ↗';
        els.globeDetail.appendChild(auditLink);
      }
    } else {
      const queued = document.createElement('p');
      queued.className = 'globe-detail-focus';
      queued.textContent = 'Cette frise n’est pas encore publiée. Une vague d’audit est planifiée : périodisation, sources, repères et points de vigilance.';
      els.globeDetail.appendChild(queued);
    }
  }

  function filterGlobeList(query) {
    const normalized = normalizeText(query || '');
    let visible = 0;
    for (const [code, row] of globeRows) {
      const entry = ATLAS_BY_CODE.get(code);
      if (!entry) continue;
      const haystack = normalizeText(
        [entry.name, entry.code, entry.region, entry.subregion, entry.capital].filter(Boolean).join(' ')
      );
      const show = !normalized || haystack.includes(normalized);
      row.style.display = show ? '' : 'none';
      if (show) visible += 1;
    }
    els.globeListCount.textContent = visible;
  }

  function buildGlobeList() {
    els.globeList.innerHTML = '';
    globeRows = new Map();
    const sorted = [...ATLAS.countries].sort((a, b) => {
      if (a.available !== b.available) return Number(b.available) - Number(a.available);
      const region = a.region.localeCompare(b.region, 'fr');
      return region || a.name.localeCompare(b.name, 'fr');
    });

    for (const entry of sorted) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `globe-row ${entry.available ? 'is-available' : 'is-queued'}`;
      row.dataset.code = entry.code;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', 'false');
      row.title = `${entry.name} — ${entry.available ? 'frise disponible' : 'audit à venir'}`;

      const flag = document.createElement('span');
      flag.className = 'globe-row-flag';
      flag.textContent = entry.flag;
      const main = document.createElement('span');
      main.className = 'globe-row-main';
      const name = document.createElement('span');
      name.className = 'globe-row-name';
      name.textContent = entry.name;
      const meta = document.createElement('span');
      meta.className = 'globe-row-meta';
      meta.textContent = [entry.region, entry.capital].filter(Boolean).join(' · ');
      main.append(name, meta);
      const status = document.createElement('span');
      status.className = 'globe-row-status';
      const arrow = document.createElement('span');
      arrow.className = 'globe-row-arrow';
      arrow.textContent = entry.available ? '↗' : '·';

      row.append(flag, main, status, arrow);
      row.addEventListener('click', () => chooseGlobeCountry(entry.code));
      row.addEventListener('mouseenter', () => {
        if (globeEngineReady && window.VECTEMPOREL_GLOBE) {
          window.VECTEMPOREL_GLOBE.setHover(entry.code);
        }
        renderGlobeDetail(entry);
      });
      row.addEventListener('mouseleave', () => {
        if (globeEngineReady && window.VECTEMPOREL_GLOBE) {
          window.VECTEMPOREL_GLOBE.setHover(null);
        }
        renderGlobeDetail(globeSelected || currentAtlasEntry());
      });
      globeRows.set(entry.code, row);
      els.globeList.appendChild(row);
    }
    updateGlobeRows();
    filterGlobeList(els.globeSearch.value);
  }

  function chooseGlobeCountry(code) {
    const entry = ATLAS_BY_CODE.get(code);
    if (!entry) return;

    globeSelected = entry;
    updateGlobeRows();
    renderGlobeDetail(entry);

    if (!entry.available) {
      if (globeEngineReady && window.VECTEMPOREL_GLOBE) {
        window.VECTEMPOREL_GLOBE.setSelected(entry.code);
        window.VECTEMPOREL_GLOBE.setHover(entry.code);
      }
      return;
    }

    if (globeEngineReady && window.VECTEMPOREL_GLOBE) {
      window.VECTEMPOREL_GLOBE.setSelected(entry.code);
    }
    closeGlobe();
    if (entry.appId && COUNTRY_BY_ID.has(entry.appId)) {
      setCountry(entry.appId, { resetView: true });
      if (window.VECTEMPOREL_SOLAR) {
        window.VECTEMPOREL_SOLAR.open(entry.appId);
      } else {
        toast(`${entry.name} · ${entry.events} repères`);
      }
      if (window.innerWidth < 760) {
        setTimeout(() => els.stageWrap.scrollIntoView({ behavior: 'smooth', block: 'start' }), 240);
      }
    }
  }

  function initGlobe() {
    const engine = window.VECTEMPOREL_GLOBE;
    if (!engine) {
      els.globeLoading.textContent = 'Globe 3D indisponible. Utilisez la liste des pays.';
      return;
    }
    if (globeEngineReady) {
      engine.setSelected(globeSelected?.code);
      engine.resize();
      engine.open(globeSelected?.code);
      return;
    }
    if (globeInitPromise) return;

    globeInitPromise = engine
      .init(els.globeCanvas, {
        onHover: (code) => {
          if (!code) {
            renderGlobeDetail(globeSelected || currentAtlasEntry());
            return;
          }
          const entry = ATLAS_BY_CODE.get(code);
          if (entry) renderGlobeDetail(entry);
        },
        onSelect: (code) => chooseGlobeCountry(code),
      })
      .then(() => {
        globeEngineReady = true;
        els.globeLoading.hidden = true;
        if (state.globeOpen) {
          engine.setSelected(globeSelected?.code);
          engine.resize();
          engine.open(globeSelected?.code);
        }
      })
      .catch(() => {
        globeInitPromise = null;
        els.globeLoading.hidden = false;
        els.globeLoading.textContent = 'Globe 3D indisponible. Utilisez la liste des pays.';
      });
  }

  function openGlobe() {
    if (state.readersOpen || !els.aboutOverlay.hidden) return;
    closeSearch();
    hideTooltip();
    clearTimeout(globeHideTimer);
    state.globeOpen = true;
    els.globeOverlay.hidden = false;
    document.body.classList.add('globe-open');
    els.globeSearch.value = '';
    filterGlobeList('');
    const current = currentAtlasEntry();
    globeSelected = current || ATLAS.countries.find((entry) => entry.available) || null;
    if (current) {
      const row = globeRows.get(current.code);
      if (row) requestAnimationFrame(() => row.scrollIntoView({ block: 'nearest' }));
    }
    renderGlobeDetail(globeSelected);
    updateGlobeRows();
    if (globeEngineReady && window.VECTEMPOREL_GLOBE) {
      window.VECTEMPOREL_GLOBE.setSelected(globeSelected?.code);
    }
    requestAnimationFrame(() => els.globeOverlay.classList.add('is-open'));
    initGlobe();
    setTimeout(() => els.globeClose.focus({ preventScroll: true }), 80);
  }

  function closeGlobe() {
    if (!state.globeOpen && els.globeOverlay.hidden) return;
    state.globeOpen = false;
    els.globeOverlay.classList.remove('is-open');
    document.body.classList.remove('globe-open');
    if (globeEngineReady && window.VECTEMPOREL_GLOBE) window.VECTEMPOREL_GLOBE.close();
    clearTimeout(globeHideTimer);
    globeHideTimer = setTimeout(() => {
      if (!state.globeOpen) els.globeOverlay.hidden = true;
    }, 320);
    if (document.activeElement && els.globeOverlay.contains(document.activeElement)) {
      els.worldBtn.focus({ preventScroll: true });
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Branchements                                                           */
  /* ---------------------------------------------------------------------- */

  function bindEvents() {
    els.stage.addEventListener('wheel', onWheel, { passive: false });
    els.stage.addEventListener('pointerdown', onStagePointerDown);
    els.stage.addEventListener('pointermove', onStagePointerMove);
    els.stage.addEventListener('pointerup', onStagePointerUp);
    els.stage.addEventListener('pointercancel', onStagePointerUp);
    els.stage.addEventListener('lostpointercapture', (event) => {
      if (stagePointers.has(event.pointerId)) onStagePointerUp(event);
    });
    els.stage.addEventListener('dblclick', (event) => {
      if (event.target.closest('button, a')) return;
      const rect = els.stage.getBoundingClientRect();
      zoomBy(0.58, event.clientX - rect.left, true);
      hideHint();
    });

    els.zoomIn.addEventListener('click', () => {
      zoomBy(0.6);
      hideHint();
    });
    els.zoomOut.addEventListener('click', () => {
      zoomBy(1.7);
      hideHint();
    });
    els.zoomFit.addEventListener('click', fitView);
    els.recentBtn.addEventListener('click', recentView);
    els.shareBtn.addEventListener('click', shareView);
    els.worldBtn.addEventListener('click', openGlobe);
    els.globeClose.addEventListener('click', closeGlobe);
    for (const closer of els.globeOverlay.querySelectorAll('[data-close-globe]')) {
      closer.addEventListener('click', closeGlobe);
    }
    els.globeSearch.addEventListener('input', () => filterGlobeList(els.globeSearch.value));
    els.globeSearch.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const firstVisible = [...globeRows.values()].find((row) => row.style.display !== 'none');
        if (firstVisible) firstVisible.click();
      }
    });
    els.brand.addEventListener('click', (event) => {
      event.preventDefault();
      closeReader({ silent: true, restoreFocus: false });
      setCountry('france', { resetView: true });
    });

    els.clearTags.addEventListener('click', () => {
      state.activeTags.clear();
      updateTagsUi();
      draw();
    });

    els.aboutBtn.addEventListener('click', openModal);
    els.modalClose.addEventListener('click', closeModal);
    els.conceptExplore.addEventListener('click', () => {
      closeModal();
      els.stage.focus({ preventScroll: true });
    });
    for (const closer of els.aboutOverlay.querySelectorAll('[data-close-modal]')) {
      closer.addEventListener('click', closeModal);
    }

    els.readerClose.addEventListener('click', () => closeReader());
    els.readerBack.addEventListener('click', onReaderBack);
    for (const closer of els.readerOverlay.querySelectorAll('[data-close-reader]')) {
      closer.addEventListener('click', () => closeReader());
    }
    els.grokBody.addEventListener('click', onGrokLink);

    els.searchInput.addEventListener('input', () => renderSearch(els.searchInput.value));
    els.searchInput.addEventListener('focus', () => {
      if (els.searchInput.value.trim()) renderSearch(els.searchInput.value);
    });
    els.searchInput.addEventListener('keydown', onSearchKeydown);
    document.addEventListener('click', (event) => {
      if (!els.search.contains(event.target)) closeSearch();
    });

    document.addEventListener('keydown', onGlobalKeydown);
    window.addEventListener('hashchange', onHashChange);

    els.minimap.addEventListener('pointerdown', onMinimapPointerDown);
    els.minimap.addEventListener('pointermove', onMinimapPointerMove);
    els.minimap.addEventListener('pointerup', onMinimapPointerUp);
    els.minimap.addEventListener('pointercancel', onMinimapPointerUp);

    const observer = new ResizeObserver(() => {
      if (!country) return;
      requestAnimationFrame(() => draw({ hash: false }));
    });
    observer.observe(els.stage);

    window.addEventListener('resize', () => {
      if (state.hoverId) {
        const node = eventEls.get(state.hoverId);
        if (node) positionTooltip(node);
      }
    });
  }

  /* Mini-carte ------------------------------------------------------------- */

  let minimapDrag = null;

  function minimapYearFromClient(clientX) {
    const rect = els.minimap.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    return country.domain[0] + ratio * domainSpan();
  }

  function onMinimapPointerDown(event) {
    if (!country) return;
    event.preventDefault();
    cancelZoomAnimation();
    const rect = els.minimap.getBoundingClientRect();
    const windowRect = els.minimapWindow.getBoundingClientRect();
    const insideWindow =
      event.clientX >= windowRect.left &&
      event.clientX <= windowRect.right &&
      state.view.end - state.view.start < domainSpan() - 0.5;

    if (!insideWindow) {
      const year = minimapYearFromClient(event.clientX);
      const span = state.view.end - state.view.start;
      const target = clampView(country, year - span / 2, year + span / 2);
      state.view = target;
      draw();
    }

    minimapDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startView: { ...state.view },
      width: Math.max(1, rect.width),
    };
    els.minimap.setPointerCapture(event.pointerId);
    els.minimap.style.cursor = 'grabbing';
  }

  function onMinimapPointerMove(event) {
    if (!minimapDrag || minimapDrag.pointerId !== event.pointerId) return;
    const deltaRatio = (event.clientX - minimapDrag.startX) / minimapDrag.width;
    const deltaYears = deltaRatio * domainSpan();
    state.view = clampView(country, minimapDrag.startView.start + deltaYears, minimapDrag.startView.end + deltaYears);
    draw();
  }

  function onMinimapPointerUp(event) {
    if (minimapDrag && minimapDrag.pointerId === event.pointerId) {
      minimapDrag = null;
      els.minimap.style.cursor = 'pointer';
      if (els.minimap.hasPointerCapture(event.pointerId)) els.minimap.releasePointerCapture(event.pointerId);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Démarrage                                                              */
  /* ---------------------------------------------------------------------- */

  function boot() {
    updateWorldButton();
    bindEvents();

    els.globeTotal.textContent = ATLAS.counts.total || ATLAS.countries.length;
    els.globeAvailableCount.textContent = `${ATLAS.counts.available || 0} frises disponibles`;
    buildGlobeList();

    const initial = parseHash();
    const initialCountry = initial?.countryId || 'france';
    setCountry(initialCountry, { view: initial?.view || null });

    if (initial?.eventId) {
      const event = EVENT_BY_ID.get(initial.eventId);
      if (event) {
        if (!initial.view) {
          const target = eventView(event);
          state.view = target;
          draw();
        }
        openEvent(initial.eventId, { focusView: false });
      }
    }

    requestAnimationFrame(() => {
      draw();
      computeLayout();
      if (document.fonts?.ready) {
        document.fonts.ready.then(() => draw({ hash: false }));
      }
    });
  }

  window.VECTEMPOREL_APP = {
    openEvent,
    getCountryId: () => state.countryId,
    setCountry,
    openGlobe,
    closeGlobe,
  };

  boot();
})();
