/* Vectemporel — Récit : période → panorama → lieux.
 *
 * Parcours narratif entièrement clavier :
 *   1. on choisit une période ;
 *   2. on parcourt les repères de cette période comme un mini-film ;
 *   3. on navigue de lieu en lieu grâce aux coordonnées vérifiées de l'atlas.
 *
 * Aucun texte n'est inventé : le récit utilise les titres, sous-titres,
 * résumés, tags, acteurs et lieux déjà présents dans les données vérifiées.
 */
(() => {
  'use strict';

  const DATA = window.VECTEMPOREL_DATA;
  const IMAGES = window.VECTEMPOREL_EVENT_IMAGES || {};
  const PLACES = window.VECTEMPOREL_PLACES || {};
  const OUTLINES = window.VECTEMPOREL_OUTLINES || {};
  const TAGS = DATA?.tags || {};
  const COUNTRIES = (DATA?.countries || []).filter((country) => country.events?.length);
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const state = {
    initialized: false,
    open: false,
    countryId: null,
    story: null,
    mode: 'eras',
    eraIndex: 0,
    eventIndex: 0,
    placeIndex: 0,
    playing: false,
    playTimer: 0,
    helpOpen: false,
    lastFocus: null,
    hideTimer: 0,
  };

  const els = {};

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function formatYear(year) {
    if (year < 0) return `${Math.abs(year)} av. J.-C.`;
    return String(year);
  }

  function formatRange(start, end) {
    return `${formatYear(start)} → ${formatYear(end)}`;
  }

  function tagColor(tag) {
    return TAGS[tag]?.color || '#e6b96f';
  }

  function tagLabel(tag) {
    return TAGS[tag]?.label || tag;
  }

  function eraIndexForYear(country, year) {
    for (let i = 0; i < country.eras.length; i += 1) {
      const era = country.eras[i];
      if (year >= era.start && (year < era.end || (i === country.eras.length - 1 && year <= era.end))) return i;
    }
    return -1;
  }

  function buildStory(countryId) {
    const country = COUNTRIES.find((item) => item.id === countryId) || COUNTRIES[0];
    const placeAtlas = PLACES[country.id] || {};
    const eras = country.eras.map((era, index) => {
      const eventIds = new Set();
      const events = country.events
        .filter((event) => eraIndexForYear(country, event.year) === index)
        .sort((a, b) => a.year - b.year)
        .map((event) => {
          eventIds.add(event.id);
          return event;
        });
      const allPlaces = Object.values(placeAtlas).map((place) => ({
        ...place,
        eventIds: place.events.filter((id) => eventIds.has(id)),
      }));
      let places = allPlaces.filter((place) => place.eventIds.length);
      if (!places.length) places = allPlaces;
      const located = places.filter((place) => place.lat !== null && place.lon !== null);
      return { ...era, index, events, places, located };
    });
    return { country, eras };
  }

  function currentEra() {
    return state.story?.eras[state.eraIndex] || null;
  }

  function currentEvent() {
    return currentEra()?.events[state.eventIndex] || null;
  }

  function currentPlace() {
    return currentEra()?.places[state.placeIndex] || null;
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function svg(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
    return node;
  }

  function imageFor(event, className) {
    const holder = make('div', className);
    const entry = IMAGES[event.id];
    if (entry?.src) {
      const img = make('img');
      img.src = entry.src;
      img.alt = entry.alt || `Illustration associée à ${event.title}`;
      img.decoding = 'async';
      img.draggable = false;
      img.addEventListener('error', () => {
        holder.innerHTML = '';
        holder.style.background = 'linear-gradient(135deg, #111827, #3b2f1f)';
      }, { once: true });
      holder.appendChild(img);
    } else {
      holder.style.background = 'linear-gradient(135deg, #111827, #3b2f1f)';
    }
    return holder;
  }

  function creditFor(event) {
    const entry = IMAGES[event.id];
    if (!entry) return '';
    return [entry.credit, entry.license].filter(Boolean).join(' · ');
  }

  function splitSentences(text) {
    return String(text || '')
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  /* ---------------------------------------------------------------------- */
  /* Étape 1 : périodes                                                     */
  /* ---------------------------------------------------------------------- */

  function renderEras() {
    const stage = els.stage;
    stage.className = 'story-stage story-eras';
    stage.innerHTML = '';
    const head = make('div', 'story-eras-head');
    head.appendChild(make('div', 'story-eyebrow', 'Étape 1 / 3 · Choisir une période'));
    const title = make('h1', '', state.story.country.name);
    title.id = 'story-page-title';
    head.appendChild(title);
    head.appendChild(make('p', '', `${state.story.eras.length} périodes · ${state.story.country.events.length} repères. Utilisez les flèches, puis Entrée pour entrer dans le récit.`));
    stage.appendChild(head);

    const grid = make('div', 'story-era-grid');
    const cardRefs = [];
    state.story.eras.forEach((era, index) => {
      const card = make('button', 'story-era-card');
      card.type = 'button';
      card.style.setProperty('--era', era.color || '#8a6fb2');
      card.setAttribute('aria-label', `${era.name}, ${formatRange(era.start, era.end)}, ${era.events.length} repères. Ouvrir le récit.`);
      const visual = make('div', 'story-era-visual');
      const cover = era.events.find((event) => IMAGES[event.id]?.src);
      if (cover) {
        const img = make('img');
        img.src = IMAGES[cover.id].src;
        img.alt = '';
        img.decoding = 'async';
        visual.appendChild(img);
      }
      visual.appendChild(make('span', 'story-era-index', `0${index + 1}`));
      card.appendChild(visual);
      const body = make('div', 'story-era-body');
      body.appendChild(make('div', 'story-era-name', era.name));
      body.appendChild(make('div', 'story-era-range', formatRange(era.start, era.end)));
      const foot = make('div', 'story-era-foot');
      foot.appendChild(make('span', '', `${era.events.length} repères`));
      foot.appendChild(make('b', '', `${era.places.length} lieux`));
      body.appendChild(foot);
      card.appendChild(body);
      card.addEventListener('click', () => {
        state.eraIndex = index;
        state.eventIndex = 0;
        state.placeIndex = 0;
        setMode('panorama');
      });
      card.addEventListener('mouseenter', () => {
        if (state.eraIndex !== index) {
          state.eraIndex = index;
          updateSelection(cardRefs);
        }
      });
      grid.appendChild(card);
      cardRefs.push(card);
    });
    stage.appendChild(grid);
    state.eraRefs = cardRefs;
    updateSelection(cardRefs);
    focusSelected(cardRefs);
  }

  function updateSelection(refs) {
    refs.forEach((node, index) => node.classList.toggle('is-selected', index === state.eraIndex));
  }

  /* ---------------------------------------------------------------------- */
  /* Étape 2 : panorama narratif                                            */
  /* ---------------------------------------------------------------------- */

  function renderPanorama() {
    const era = currentEra();
    const event = currentEvent();
    if (!era || !event) return;
    const stage = els.stage;
    stage.className = 'story-stage is-panorama';
    stage.innerHTML = '';

    const slide = make('div', 'story-slide');
    slide.appendChild(imageFor(event, 'story-slide-media'));
    const caption = IMAGES[event.id]?.caption;
    if (caption) {
      const note = make('div', 'story-slide-caption', caption);
      slide.querySelector('.story-slide-media').appendChild(note);
    }

    const text = make('div', 'story-slide-text');
    const kicker = make('div', 'story-slide-kicker');
    kicker.appendChild(make('span', '', era.name));
    kicker.appendChild(make('span', '', `Repère ${state.eventIndex + 1} / ${era.events.length}`));
    text.appendChild(kicker);
    text.appendChild(make('div', 'story-slide-year', formatYear(event.year)));
    const title = make('h2', 'story-slide-title', event.title);
    title.id = 'story-page-title';
    text.appendChild(title);
    if (event.subtitle) text.appendChild(make('p', 'story-slide-subtitle', event.subtitle));
    text.appendChild(make('div', 'story-story-label', 'Le récit'));
    splitSentences(event.summary).forEach((sentence, index) => {
      const paragraph = make('p', 'story-sentence', sentence);
      paragraph.style.animationDelay = `${index * 0.16}s`;
      text.appendChild(paragraph);
    });
    const meta = make('div', 'story-meta-row');
    for (const tag of event.tags || []) {
      const pill = make('span', 'story-pill is-tag', tagLabel(tag));
      pill.style.setProperty('--tag', tagColor(tag));
      meta.appendChild(pill);
    }
    if (creditFor(event)) meta.appendChild(make('span', 'story-pill', creditFor(event)));
    text.appendChild(meta);
    text.appendChild(make('div', 'story-pill', 'Récit construit à partir des repères vérifiés · aucune anecdote inventée'));
    const placesButton = make('button', 'story-place-action', 'Explorer les lieux de cette période →');
    placesButton.type = 'button';
    placesButton.addEventListener('click', () => {
      state.placeIndex = 0;
      setMode('places');
    });
    text.appendChild(placesButton);
    slide.appendChild(text);
    stage.appendChild(slide);

    const strip = make('div', 'story-filmstrip');
    era.events.forEach((item, index) => {
      const button = make('button', 'story-film-item');
      button.type = 'button';
      button.title = `${item.title} · ${formatYear(item.year)}`;
      button.setAttribute('aria-label', `Aller à ${item.title}, ${formatYear(item.year)}`);
      if (index === state.eventIndex) button.classList.add('is-active');
      const image = make('img');
      image.src = IMAGES[item.id]?.src || '';
      image.alt = '';
      image.decoding = 'async';
      button.appendChild(image);
      button.appendChild(make('span', '', item.title));
      button.appendChild(make('b', '', formatYear(item.year)));
      button.addEventListener('click', () => {
        state.eventIndex = index;
        renderPanorama();
        updateChrome();
      });
      strip.appendChild(button);
    });
    stage.appendChild(strip);
  }

  /* ---------------------------------------------------------------------- */
  /* Étape 3 : navigation géographique                                      */
  /* ---------------------------------------------------------------------- */

  function projectPlaces(places, width, height) {
    const located = places.filter((place) => place.lat !== null && place.lon !== null);
    if (!located.length) return null;
    const lats = located.map((place) => place.lat);
    const lons = located.map((place) => place.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const padLat = Math.max((maxLat - minLat) * 0.18, 0.25);
    const padLon = Math.max((maxLon - minLon) * 0.18, 0.25);
    const a = minLat - padLat;
    const b = maxLat + padLat;
    const c = minLon - padLon;
    const d = maxLon + padLon;
    return {
      width,
      height,
      point(place) {
        return {
          x: ((place.lon - c) / (d - c)) * width,
          y: ((b - place.lat) / (b - a)) * height,
        };
      },
    };
  }

  function renderPlaces() {
    const era = currentEra();
    const event = currentEvent();
    if (!era) return;
    const stage = els.stage;
    stage.className = 'story-stage is-places';
    stage.innerHTML = '';

    const map = make('div', 'story-map');
    map.appendChild(make('div', 'story-map-label', `${era.name} · ${formatRange(era.start, era.end)}`));
    const W = 1000;
    const H = 700;
    const projection = projectPlaces(era.places, W, H);
    const svgRoot = svg('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true' });
    const layer = svg('g', { class: 'story-map-layer' });
    if (projection) {
      const outline = OUTLINES[state.story.country.id];
      if (outline) {
        for (const ring of outline.rings) {
          const points = ring
            .map(([lon, lat]) => projection.point({ lon, lat }))
            .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
            .join(' ');
          layer.appendChild(svg('polygon', { class: 'story-map-outline', points }));
        }
      }
      const grid = svg('g', { class: 'story-map-grid' });
      for (let i = 1; i < 8; i += 1) {
        grid.appendChild(svg('line', { x1: (W / 8) * i, y1: 0, x2: (W / 8) * i, y2: H }));
      }
      for (let i = 1; i < 6; i += 1) {
        grid.appendChild(svg('line', { x1: 0, y1: (H / 6) * i, x2: W, y2: (H / 6) * i }));
      }
      layer.appendChild(grid);

      const ordered = era.located.slice().sort((a, b) => {
        const ay = a.events.find((id) => era.events.some((eventItem) => eventItem.id === id)) || '';
        const by = b.events.find((id) => era.events.some((eventItem) => eventItem.id === id)) || '';
        return ay.localeCompare(by);
      });
      const pathPoints = ordered.map((place) => projection.point(place));
      if (pathPoints.length > 1) {
        layer.appendChild(svg('polyline', {
          class: 'story-map-path',
          points: pathPoints.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' '),
        }));
      }
      ordered.forEach((place) => {
        const point = projection.point(place);
        const index = era.located.indexOf(place);
        const group = svg('g', { class: `story-place-marker${place === currentPlace() ? ' is-active' : ''}` });
        group.appendChild(svg('circle', { cx: point.x.toFixed(1), cy: point.y.toFixed(1), r: place === currentPlace() ? 7 : 4.5 }));
        const label = svg('text', { x: (point.x + 10).toFixed(1), y: (point.y + 3).toFixed(1) });
        label.textContent = place.label;
        group.appendChild(label);
        group.addEventListener('click', () => {
          state.placeIndex = era.places.indexOf(place);
          renderPlaces();
          updateChrome();
        });
        layer.appendChild(group);
        place._index = index;
      });
    }
    svgRoot.appendChild(layer);
    map.appendChild(svgRoot);
    if (!projection) {
      const empty = make('div', 'story-place-history', 'Aucune coordonnée vérifiée pour les lieux de cette période.');
      empty.style.position = 'absolute';
      empty.style.top = '45%';
      empty.style.left = '10%';
      map.appendChild(empty);
    }
    stage.appendChild(map);

    const panel = make('div', 'story-place-panel');
    const place = currentPlace();
    if (place) {
      panel.appendChild(make('div', 'story-place-index', `Lieu ${state.placeIndex + 1} / ${era.places.length} · ${place.hierarchy || 'lieu'}`));
      const title = make('h2', 'story-place-name', place.label);
      title.id = 'story-page-title';
      panel.appendChild(title);
      if (place.historical?.length) {
        panel.appendChild(make('p', 'story-place-history', `Anciens noms : ${place.historical.join(' · ')}`));
      }
      const functions = make('div', 'story-place-section');
      functions.appendChild(make('h3', '', 'Fonctions'));
      functions.appendChild(make('p', '', place.functions?.join(' · ') || 'Non renseigné'));
      panel.appendChild(functions);
      if (place.contestations?.length) {
        const debates = make('div', 'story-place-section');
        debates.appendChild(make('h3', '', 'Mémoires & contestations'));
        debates.appendChild(make('p', '', place.contestations.join(' · ')));
        panel.appendChild(debates);
      }
      const linked = era.events.filter((item) => place.eventIds?.includes(item.id));
      if (linked.length) {
        const section = make('div', 'story-place-section');
        section.appendChild(make('h3', '', 'Repères ici'));
        linked.forEach((item) => {
          const button = make('button', 'story-event-link');
          button.type = 'button';
          const year = make('b', '', formatYear(item.year));
          button.append(year, document.createTextNode(item.title));
          button.addEventListener('click', () => {
            state.eventIndex = era.events.indexOf(item);
            setMode('panorama');
          });
          section.appendChild(button);
        });
        panel.appendChild(section);
      }
      if (place.source) {
        const source = make('div', 'story-place-section');
        source.appendChild(make('h3', '', 'Coordonnée'));
        const link = make('a', '', 'Voir la source Wikipedia ↗');
        link.href = place.source;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        source.appendChild(link);
        source.appendChild(make('p', '', `${place.lat?.toFixed(4)}, ${place.lon?.toFixed(4)}`));
        panel.appendChild(source);
      }
      const back = make('button', 'story-back-link', '← Retour au récit');
      back.type = 'button';
      back.addEventListener('click', () => setMode('panorama'));
      panel.appendChild(back);
    } else {
      panel.appendChild(make('p', 'story-place-history', 'Aucun lieu associé à cette période dans le corpus.'));
    }
    stage.appendChild(panel);

    if (projection && place && place.lat !== null) {
      const point = projection.point(place);
      const zoom = 1.25;
      const tx = W / 2 - point.x * zoom;
      const ty = H / 2 - point.y * zoom;
      requestAnimationFrame(() => {
        layer.style.transformOrigin = '0 0';
        layer.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${zoom})`;
      });
    }
    state.mapLayer = layer;
  }

  /* ---------------------------------------------------------------------- */
  /* Chrome, clavier, ouverture                                             */
  /* ---------------------------------------------------------------------- */

  const HELP = {
    eras: [
      ['Périodes', [
        ['← →', 'Choisir une période'],
        ['1–9', 'Période directe'],
        ['Entrée', 'Entrer dans le récit'],
        ['Échap', 'Retour à la queue'],
      ]],
      ['Général', [
        ['?', 'Aide clavier'],
        ['Tab', 'Parcourir les boutons'],
      ]],
    ],
    panorama: [
      ['Récit', [
        ['← →', 'Repère précédent / suivant'],
        ['↑ ↓', 'Période précédente / suivante'],
        ['Espace', 'Lecture automatique'],
        ['Entrée', 'Explorer les lieux'],
        ['Échap', 'Choisir une période'],
      ]],
      ['Général', [
        ['?', 'Aide clavier'],
        ['Tab', 'Parcourir les boutons'],
      ]],
    ],
    places: [
      ['Lieux', [
        ['← →', 'Lieu précédent / suivant'],
        ['Entrée', 'Retour au repère'],
        ['Échap', 'Retour au récit'],
      ]],
      ['Général', [
        ['?', 'Aide clavier'],
        ['Tab', 'Parcourir les boutons'],
      ]],
    ],
  };

  function renderHelp() {
    els.helpGrid.innerHTML = '';
    for (const [group, rows] of HELP[state.mode]) {
      const section = make('div', 'story-help-group');
      section.appendChild(make('h3', '', group));
      for (const [key, description] of rows) {
        const row = make('div', 'story-help-row');
        row.appendChild(make('span', '', description));
        row.appendChild(make('kbd', '', key));
        section.appendChild(row);
      }
      els.helpGrid.appendChild(section);
    }
  }

  function updateChrome() {
    const modeNames = { eras: 'Périodes', panorama: 'Panorama', places: 'Lieux' };
    const era = currentEra();
    els.breadcrumb.innerHTML = '';
    Object.entries(modeNames).forEach(([mode, label], index) => {
      if (index > 0) els.breadcrumb.appendChild(make('span', '', ' › '));
      els.breadcrumb.appendChild(mode === state.mode ? make('b', '', label) : make('span', '', label));
    });
    els.context.textContent = `${state.story.country.name} · ${era ? era.name : ''}`;

    els.keys.innerHTML = '';
    const hints = state.mode === 'eras'
      ? [['← →', 'période'], ['↵', 'ouvrir'], ['?', 'aide']]
      : state.mode === 'panorama'
        ? [['← →', 'repère'], ['↑ ↓', 'période'], ['espace', 'lecture'], ['↵', 'lieux'], ['?', 'aide']]
        : [['← →', 'lieu'], ['↵', 'récit'], ['?', 'aide']];
    for (const [key, label] of hints) {
      const span = make('span');
      span.appendChild(make('kbd', '', key));
      span.appendChild(document.createTextNode(label));
      els.keys.appendChild(span);
    }

    els.dots.innerHTML = '';
    if (state.mode === 'eras') {
      state.story.eras.forEach((item, index) => {
        const dot = make('span', `story-dot${index === state.eraIndex ? ' is-active' : ''}`);
        dot.style.setProperty('--era', item.color);
        els.dots.appendChild(dot);
      });
    } else if (state.mode === 'panorama') {
      era.events.forEach((item, index) => {
        els.dots.appendChild(make('span', `story-dot${index === state.eventIndex ? ' is-active' : ''}`));
      });
    } else {
      era.places.forEach((item, index) => {
        els.dots.appendChild(make('span', `story-dot${index === state.placeIndex ? ' is-active' : ''}`));
      });
    }

    els.play.hidden = state.mode !== 'panorama';
    els.play.textContent = state.playing ? '❚❚' : '▶';
    els.play.setAttribute('aria-label', state.playing ? 'Arrêter la lecture' : 'Lancer la lecture automatique');
    els.overlay.setAttribute('aria-label', `Récit · ${state.story.country.name}`);
  }

  function focusSelected(refs) {
    const node = refs?.[state.eraIndex];
    if (node?.isConnected) node.focus({ preventScroll: true });
  }

  function focusCurrent() {
    if (state.mode === 'eras') focusSelected(state.eraRefs);
    else if (state.mode === 'panorama') els.stage.querySelector('.story-film-item.is-active')?.focus({ preventScroll: true });
    else els.stage.querySelector('.story-back-link')?.focus({ preventScroll: true });
  }

  function render() {
    if (!state.story) return;
    if (state.mode === 'eras') renderEras();
    else if (state.mode === 'panorama') renderPanorama();
    else renderPlaces();
    updateChrome();
    renderHelp();
    focusCurrent();
  }

  function setMode(mode) {
    state.mode = mode;
    stopPlay();
    render();
    if (mode === 'eras') focusSelected(state.eraRefs);
    else if (mode === 'panorama') {
      const button = els.stage.querySelector('.story-place-action');
      button?.focus({ preventScroll: true });
      els.stage.querySelector('.story-slide-text')?.scrollTo({ top: 0 });
    } else {
      els.stage.querySelector('.story-back-link')?.focus({ preventScroll: true });
    }
  }

  function stopPlay() {
    if (state.playTimer) window.clearInterval(state.playTimer);
    state.playTimer = 0;
    state.playing = false;
  }

  function togglePlay() {
    if (state.mode !== 'panorama') return;
    if (state.playing) {
      stopPlay();
    } else {
      state.playing = true;
      state.playTimer = window.setInterval(() => {
        const era = currentEra();
        if (!era) return;
        state.eventIndex = (state.eventIndex + 1) % era.events.length;
        renderPanorama();
        updateChrome();
      }, 5500);
    }
    updateChrome();
  }

  function previous() {
    if (state.mode === 'eras') state.eraIndex = clamp(state.eraIndex - 1, 0, state.story.eras.length - 1);
    else if (state.mode === 'panorama') state.eventIndex = clamp(state.eventIndex - 1, 0, currentEra().events.length - 1);
    else if (currentEra().places.length) state.placeIndex = clamp(state.placeIndex - 1, 0, currentEra().places.length - 1);
    render();
    if (state.mode === 'eras') focusSelected(state.eraRefs);
  }

  function next() {
    if (state.mode === 'eras') state.eraIndex = clamp(state.eraIndex + 1, 0, state.story.eras.length - 1);
    else if (state.mode === 'panorama') state.eventIndex = clamp(state.eventIndex + 1, 0, currentEra().events.length - 1);
    else if (currentEra().places.length) state.placeIndex = clamp(state.placeIndex + 1, 0, currentEra().places.length - 1);
    render();
    if (state.mode === 'eras') focusSelected(state.eraRefs);
  }

  function openHelp() {
    state.helpOpen = true;
    renderHelp();
    els.help.hidden = false;
    requestAnimationFrame(() => {
      els.help.classList.add('is-open');
      els.helpClose.focus({ preventScroll: true });
    });
  }

  function closeHelp() {
    if (!state.helpOpen) return;
    state.helpOpen = false;
    els.help.classList.remove('is-open');
    window.setTimeout(() => {
      if (!state.helpOpen) els.help.hidden = true;
    }, 240);
  }

  function open(countryId, mode = 'eras') {
    if (!state.initialized) init();
    if (!els.overlay || !DATA) return;
    const requested = COUNTRIES.find((country) => country.id === countryId)?.id
      || COUNTRIES.find((country) => country.id === window.VECTEMPOREL_APP?.getCountryId?.())?.id
      || COUNTRIES[0].id;
    if (!state.story || state.story.country.id !== requested) {
      state.story = buildStory(requested);
      state.countryId = requested;
      state.eraIndex = 0;
      state.eventIndex = 0;
      state.placeIndex = 0;
    }
    state.lastFocus = document.activeElement;
    clearTimeout(state.hideTimer);
    els.overlay.hidden = false;
    state.open = true;
    setMode(mode);
    requestAnimationFrame(() => {
      els.overlay.classList.add('is-open');
      if (mode === 'eras') focusSelected(state.eraRefs);
    });
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    stopPlay();
    closeHelp();
    els.overlay.classList.remove('is-open');
    state.hideTimer = window.setTimeout(() => {
      if (!state.open) els.overlay.hidden = true;
    }, 300);
    if (state.lastFocus?.isConnected) {
      window.setTimeout(() => state.lastFocus.focus({ preventScroll: true }), 40);
    }
  }

  function onKeyDown(event) {
    if (!state.open) return;
    if (state.helpOpen) {
      if (event.key === 'Escape' || event.key === '?') {
        event.preventDefault();
        closeHelp();
      } else if (event.key === 'Tab') {
        const focusable = [...els.help.querySelectorAll('button')];
        if (focusable.length && event.shiftKey && document.activeElement === focusable[0]) {
          event.preventDefault();
          focusable[focusable.length - 1].focus();
        } else if (focusable.length && !event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
          event.preventDefault();
          focusable[0].focus();
        }
      }
      return;
    }
    if (event.key === '?') {
      event.preventDefault();
      openHelp();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (state.mode === 'panorama') setMode('eras');
      else if (state.mode === 'places') setMode('panorama');
      else close();
      return;
    }
    if (state.mode === 'eras' && /^[1-9]$/.test(event.key)) {
      const index = Number(event.key) - 1;
      if (index < state.story.eras.length) {
        event.preventDefault();
        state.eraIndex = index;
        render();
        focusSelected(state.eraRefs);
      }
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (state.mode === 'panorama' && event.key === 'ArrowUp') {
        state.eraIndex = clamp(state.eraIndex - 1, 0, state.story.eras.length - 1);
        state.eventIndex = 0;
        render();
      } else previous();
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (state.mode === 'panorama' && event.key === 'ArrowDown') {
        state.eraIndex = clamp(state.eraIndex + 1, 0, state.story.eras.length - 1);
        state.eventIndex = 0;
        render();
      } else next();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (state.mode === 'eras') {
        state.eventIndex = 0;
        state.placeIndex = 0;
        setMode('panorama');
      } else if (state.mode === 'panorama') {
        state.placeIndex = 0;
        setMode('places');
      } else setMode('panorama');
      return;
    }
    if (event.key === ' ' && state.mode === 'panorama') {
      event.preventDefault();
      togglePlay();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = [...els.overlay.querySelectorAll('button:not([disabled]), a[href]')]
        .filter((node) => node.offsetParent !== null && !els.help.contains(node));
      if (!focusable.length) return;
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

  function cacheElements() {
    els.overlay = document.getElementById('story-overlay');
    els.stage = document.getElementById('story-stage');
    els.breadcrumb = document.getElementById('story-breadcrumb');
    els.context = document.getElementById('story-context');
    els.keys = document.getElementById('story-keys');
    els.dots = document.getElementById('story-dots');
    els.prev = document.getElementById('story-prev');
    els.next = document.getElementById('story-next');
    els.play = document.getElementById('story-play');
    els.close = document.getElementById('story-close');
    els.openBtn = document.getElementById('story-btn');
    els.help = document.getElementById('story-help');
    els.helpGrid = document.getElementById('story-help-grid');
    els.helpBtn = document.getElementById('story-help-btn');
    els.helpClose = document.getElementById('story-help-close');
  }

  function bind() {
    els.openBtn?.addEventListener('click', () => open());
    els.close?.addEventListener('click', close);
    els.overlay?.querySelector('[data-close-story]')?.addEventListener('click', close);
    els.prev?.addEventListener('click', previous);
    els.next?.addEventListener('click', next);
    els.play?.addEventListener('click', togglePlay);
    els.helpBtn?.addEventListener('click', openHelp);
    els.helpClose?.addEventListener('click', closeHelp);
    document.addEventListener('keydown', onKeyDown);
  }

  function init() {
    if (state.initialized) return;
    cacheElements();
    if (!els.overlay || !DATA) return;
    state.initialized = true;
    bind();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.VECTEMPOREL_STORY = {
    open,
    close,
    openEra: (countryId, eraIndex) => {
      open(countryId, 'panorama');
      state.eraIndex = clamp(eraIndex, 0, state.story.eras.length - 1);
      state.eventIndex = 0;
      render();
    },
    state: () => ({
      mode: state.mode,
      era: state.eraIndex,
      event: state.eventIndex,
      place: state.placeIndex,
      open: state.open,
    }),
  };
})();
