/* Vectemporel — Système solaire.
 *
 * Le pays est une carte 2D : un soleil par période, des planètes pour les
 * événements, des lunes pour les personnages, lieux et repères-clés.
 * Le globe mène ici ; le Récit en reste la lecture narrative.
 */
(() => {
  'use strict';

  const DATA = window.VECTEMPOREL_DATA;
  const META = window.VECTEMPOREL_SPIRAL_META || {};
  const IMAGES = window.VECTEMPOREL_EVENT_IMAGES || {};
  const PLACES = window.VECTEMPOREL_PLACES || {};
  const TAGS = DATA?.tags || {};
  const COUNTRIES = (DATA?.countries || []).filter((country) => country.events?.length);
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));

  const state = {
    initialized: false,
    open: false,
    countryId: null,
    system: null,
    eraIndex: 0,
    planetIndex: 0,
    moonIndex: 0,
    level: 'sun', // sun | planet | moon
    showMoons: true,
    camera: { x: 0, y: 0, scale: 1 },
    drag: null,
    helpOpen: false,
    hideTimer: 0,
  };

  const els = {};
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function formatYear(year) {
    return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
  }

  function formatRange(start, end) {
    return `${formatYear(start)} → ${formatYear(end)}`;
  }

  function tagColor(tag) {
    return TAGS[tag]?.color || '#e6b96f';
  }

  function eraIndexForYear(country, year) {
    for (let i = 0; i < country.eras.length; i += 1) {
      const era = country.eras[i];
      if (year >= era.start && (year < era.end || (i === country.eras.length - 1 && year <= era.end))) return i;
    }
    return -1;
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function buildSystem(countryId) {
    const country = COUNTRIES.find((item) => item.id === countryId) || COUNTRIES[0];
    const meta = META[country.id]?.eras || [];
    const placeAtlas = PLACES[country.id] || {};
    const eras = country.eras.map((era, eraIndex) => {
      const events = country.events
        .filter((event) => eraIndexForYear(country, event.year) === eraIndex)
        .sort((a, b) => a.year - b.year);
      const eraMeta = meta[eraIndex] || {};
      const planets = events.map((event, index) => {
        const moons = [
          ...(eraMeta.actors || []).slice(0, 3).map((actor) => ({
            kind: 'actor', label: actor.label, detail: actor.roles?.join(' · ') || 'Personnage', color: '#e6b96f',
          })),
          ...(eraMeta.places || []).slice(0, 2).map((place) => {
            const atlas = Object.values(placeAtlas).find((item) => item.label === place.label);
            return {
              kind: 'place', label: place.label, detail: [place.hierarchy, ...(place.functions || []).slice(0, 2)].filter(Boolean).join(' · '),
              color: '#7f9cff', source: atlas?.source || null,
            };
          }),
          ...(event.related || [])
            .map((id) => country.events.find((item) => item.id === id))
            .filter(Boolean)
            .slice(0, 2)
            .map((related) => ({
              kind: 'item', label: related.title, detail: `${formatYear(related.year)} · repère lié`, color: '#b28bdd', eventId: related.id,
            })),
        ];
        return {
          event,
          index,
          moons,
          orbit: 86 + index * 29,
          angle: index * GOLDEN + eraIndex * 0.55,
          duration: 46 + index * 5,
        };
      });
      return {
        era,
        index: eraIndex,
        planets,
        x: 320 + eraIndex * 620,
        y: 360 + (eraIndex % 2 ? 130 : -130),
        meta: eraMeta,
      };
    });
    return { country, eras };
  }

  function currentEraNode() {
    return state.system?.eras[state.eraIndex] || null;
  }

  function currentPlanetNode() {
    return currentEraNode()?.planets[state.planetIndex] || null;
  }

  function currentMoon() {
    return currentPlanetNode()?.moons[state.moonIndex] || null;
  }

  function renderWorld() {
    if (!state.system) return;
    els.world.innerHTML = '';
    els.world.classList.remove('is-dragging');
    for (const eraNode of state.system.eras) {
      const sun = make('div', 'sun');
      sun.style.left = `${eraNode.x}px`;
      sun.style.top = `${eraNode.y}px`;
      sun.style.setProperty('--era', eraNode.era.color || '#e6b96f');
      const core = make('div', 'sun-core');
      core.setAttribute('role', 'button');
      core.setAttribute('tabindex', '-1');
      core.setAttribute('aria-label', `Période ${eraNode.era.name}`);
      core.addEventListener('click', () => select('sun', eraNode.index, 0, 0));
      sun.appendChild(core);
      const label = make('div', 'sun-label');
      const name = make('b', '', eraNode.era.name);
      const range = make('span', '', `${formatRange(eraNode.era.start, eraNode.era.end)} · ${eraNode.planets.length} repères`);
      label.append(name, range);
      sun.appendChild(label);

      for (const planet of eraNode.planets) {
        const orbit = make('div', 'solar-orbit');
        orbit.style.setProperty('--r', `${planet.orbit}px`);
        orbit.style.setProperty('--dur', `${planet.duration}s`);
        const pos = make('div', 'planet-pos');
        pos.style.setProperty('--a', `${planet.angle}rad`);
        pos.style.setProperty('--r', `${planet.orbit}px`);
        const bodyWrap = make('div', 'planet-body');
        bodyWrap.style.setProperty('--dur', `${planet.duration}s`);
        const body = make('div', 'planet');
        body.setAttribute('role', 'button');
        body.setAttribute('aria-label', `${planet.event.title}, ${formatYear(planet.event.year)}`);
        body.title = `${planet.event.title} · ${formatYear(planet.event.year)}`;
        const entry = IMAGES[planet.event.id];
        if (entry?.src) {
          const img = make('img');
          img.src = entry.src;
          img.alt = '';
          img.loading = 'lazy';
          img.decoding = 'async';
          body.appendChild(img);
        }
        const year = make('span', 'planet-year', formatYear(planet.event.year));
        bodyWrap.append(body, year);
        pos.appendChild(bodyWrap);
        body.addEventListener('click', (event) => {
          event.stopPropagation();
          select('planet', eraNode.index, planet.index, 0);
        });

        if (state.showMoons) {
          planet.moons.forEach((moon, moonIndex) => {
            const moonOrbit = make('div', 'moon-orbit');
            const mdur = 12 + moonIndex * 4;
            const mr = 24 + moonIndex * 11;
            moonOrbit.style.setProperty('--mdur', `${mdur}s`);
            const moonPos = make('div', 'moon-pos');
            moonPos.style.setProperty('--ma', `${moonIndex * GOLDEN}rad`);
            moonPos.style.setProperty('--mr', `${mr}px`);
            const dot = make('div', 'moon');
            dot.style.setProperty('--moon-color', moon.color);
            dot.style.setProperty('--mdur', `${mdur}s`);
            dot.addEventListener('click', (event) => {
              event.stopPropagation();
              select('moon', eraNode.index, planet.index, moonIndex);
            });
            const labelMoon = make('span', 'moon-label', moon.label);
            moonPos.append(dot, labelMoon);
            moonOrbit.appendChild(moonPos);
            pos.appendChild(moonOrbit);
          });
        }
        orbit.appendChild(pos);
        sun.appendChild(orbit);
      }
      els.world.appendChild(sun);
    }
    updateHighlights();
  }

  function updateHighlights() {
    const suns = [...els.world.querySelectorAll('.sun')];
    suns.forEach((sun, index) => sun.classList.toggle('is-active', index === state.eraIndex));
    const planets = [...els.world.querySelectorAll('.planet')];
    planets.forEach((planet, index) => planet.classList.toggle('is-active', state.level !== 'sun' && index === state.planetIndex));
    const moons = [...els.world.querySelectorAll('.moon')];
    moons.forEach((moon, index) => moon.classList.toggle('is-active', state.level === 'moon' && index === state.moonIndex));
  }

  function renderPanel() {
    const eraNode = currentEraNode();
    if (!eraNode) return;
    const panel = els.panel;
    panel.innerHTML = '';
    if (state.level === 'moon') {
      const moon = currentMoon();
      const planet = currentPlanetNode();
      panel.appendChild(make('div', 'solar-panel-kicker', `Lune · ${moon.kind === 'actor' ? 'personnage' : moon.kind === 'place' ? 'lieu' : 'repère-clé'}`));
      const title = make('h2', '', moon.label);
      title.id = 'solar-title';
      panel.appendChild(title);
      panel.appendChild(make('p', '', moon.detail));
      if (moon.source) {
        const link = make('a', '', 'Source Wikipedia ↗');
        link.href = moon.source;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        panel.appendChild(link);
      }
      if (moon.eventId) {
        const button = make('button', 'solar-panel-item', 'Ouvrir ce repère →');
        button.addEventListener('click', () => window.VECTEMPOREL_APP?.openEvent(moon.eventId));
        panel.appendChild(button);
      }
      const back = make('button', 'solar-panel-item', '← Retour à la planète');
      back.addEventListener('click', () => select('planet', state.eraIndex, state.planetIndex, 0));
      panel.appendChild(back);
      return;
    }
    if (state.level === 'planet') {
      const planet = currentPlanetNode();
      const event = planet.event;
      panel.appendChild(make('div', 'solar-panel-kicker', `${eraNode.era.name} · planète ${state.planetIndex + 1}/${eraNode.planets.length}`));
      const title = make('h2', '', event.title);
      title.id = 'solar-title';
      panel.appendChild(title);
      panel.appendChild(make('div', 'solar-panel-year', formatYear(event.year)));
      const entry = IMAGES[event.id];
      if (entry?.src) {
        const img = make('img', 'solar-panel-img');
        img.src = entry.src;
        img.alt = entry.alt || `Illustration associée à ${event.title}`;
        panel.appendChild(img);
        if (entry.caption) panel.appendChild(make('p', '', entry.caption));
      }
      if (event.subtitle) panel.appendChild(make('p', '', event.subtitle));
      panel.appendChild(make('p', '', event.summary || ''));
      const list = make('div', 'solar-panel-list');
      planet.moons.forEach((moon, index) => {
        const button = make('button', 'solar-panel-item', `${moon.kind === 'actor' ? '◆' : moon.kind === 'place' ? '▣' : '◇'} ${moon.label}`);
        button.addEventListener('click', () => select('moon', state.eraIndex, state.planetIndex, index));
        list.appendChild(button);
      });
      panel.appendChild(list);
      const actions = make('div', 'solar-panel-actions');
      const read = make('button', 'is-primary', 'Lire la fiche');
      read.addEventListener('click', () => window.VECTEMPOREL_APP?.openEvent(event.id));
      const places = make('button', '', 'Explorer les lieux');
      places.addEventListener('click', () => window.VECTEMPOREL_STORY?.openPlaces(state.countryId, state.eraIndex));
      actions.append(read, places);
      panel.appendChild(actions);
      const credit = make('p', '', [entry?.credit, entry?.license].filter(Boolean).join(' · '));
      credit.style.fontSize = '8px';
      credit.style.color = 'var(--muted-2)';
      panel.appendChild(credit);
      return;
    }
    panel.appendChild(make('div', 'solar-panel-kicker', `Soleil ${state.eraIndex + 1} / ${state.system.eras.length}`));
    const title = make('h2', '', eraNode.era.name);
    title.id = 'solar-title';
    panel.appendChild(title);
    panel.appendChild(make('div', 'solar-panel-year', formatRange(eraNode.era.start, eraNode.era.end)));
    panel.appendChild(make('p', '', `${eraNode.planets.length} événements gravitent autour de cette période. Chaque planète porte des lunes : personnages, lieux et repères-clés.`));
    const list = make('div', 'solar-panel-list');
    eraNode.planets.forEach((planet, index) => {
      const button = make('button', 'solar-panel-item', `${formatYear(planet.event.year)} · ${planet.event.title}`);
      button.addEventListener('click', () => select('planet', state.eraIndex, index, 0));
      list.appendChild(button);
    });
    panel.appendChild(list);
  }

  function renderDashboard() {
    if (!state.system || !els.tree) return;
    const eraNode = currentEraNode();
    const planetNode = currentPlanetNode();
    const moon = currentMoon();

    // Fil d’Ariane
    els.crumbs.innerHTML = '';
    const crumbs = [
      { label: state.system.country.name, action: () => close() },
      { label: eraNode.era.name, action: () => select('sun', state.eraIndex, 0, 0) },
      ...(state.level !== 'sun' ? [{ label: planetNode.event.title, action: () => select('planet', state.eraIndex, state.planetIndex, 0) }] : []),
      ...(state.level === 'moon' ? [{ label: moon.label, action: () => {} }] : []),
    ];
    crumbs.forEach((item, index) => {
      if (index) els.crumbs.appendChild(document.createTextNode(' › '));
      const button = make('button', index === crumbs.length - 1 ? 'is-current' : '', item.label);
      button.type = 'button';
      button.addEventListener('click', item.action);
      els.crumbs.appendChild(button);
    });

    // Rang
    els.rank.innerHTML = '';
    if (state.level === 'moon') {
      els.rank.append(make('b', '', String(state.moonIndex + 1)), document.createTextNode(` / ${planetNode.moons.length} lunes · ${moon.kind}`));
    } else if (state.level === 'planet') {
      els.rank.append(make('b', '', String(state.planetIndex + 1)), document.createTextNode(` / ${eraNode.planets.length} événements · ${formatYear(planetNode.event.year)}`));
    } else {
      els.rank.append(make('b', '', String(state.eraIndex + 1)), document.createTextNode(` / ${state.system.eras.length} périodes · ${formatRange(eraNode.era.start, eraNode.era.end)}`));
    }

    // Arbre décisionnel
    els.tree.innerHTML = '';
    els.tree.setAttribute('role', 'tree');
    const addGroup = (label) => {
      const group = make('div', 'solar-tree-level');
      group.appendChild(make('div', 'solar-tree-label', label));
      els.tree.appendChild(group);
      return group;
    };
    const addItem = (group, opts) => {
      const button = make('button', `solar-tree-item${opts.active ? ' is-active' : ''}${opts.kind === 'moon' ? ' solar-tree-moon' : ''}`);
      button.type = 'button';
      button.setAttribute('role', 'treeitem');
      button.setAttribute('aria-level', String(opts.level || 1));
      button.setAttribute('aria-selected', opts.active ? 'true' : 'false');
      button.append(make('i', '', opts.index), make('span', '', opts.label));
      if (opts.suffix) button.appendChild(make('small', '', opts.suffix));
      button.addEventListener('click', opts.onClick);
      group.appendChild(button);
      return button;
    };

    const eraGroup = addGroup('Périodes · ordre chronologique');
    state.system.eras.forEach((node, index) => {
      const active = index === state.eraIndex;
      const button = addItem(eraGroup, {
        index: String(index + 1).padStart(2, '0'),
        label: node.era.name,
        suffix: `${node.planets.length}`,
        active,
        level: 1,
        onClick: () => select('sun', index, 0, 0),
      });
      if (active) button.setAttribute('aria-expanded', 'true');
    });

    const eventGroup = addGroup(`Événements · ${eraNode.era.name}`);
    eraNode.planets.forEach((node, index) => {
      addItem(eventGroup, {
        index: String(index + 1).padStart(2, '0'),
        label: node.event.title,
        suffix: formatYear(node.event.year),
        active: state.level !== 'sun' && index === state.planetIndex,
        level: 2,
        onClick: () => select('planet', state.eraIndex, index, 0),
      });
    });

    if (state.level !== 'sun') {
      const moonGroup = addGroup('Lunes · figures, lieux, repères');
      planetNode.moons.forEach((node, index) => {
        addItem(moonGroup, {
          index: '·', label: node.label, suffix: node.kind,
          active: state.level === 'moon' && index === state.moonIndex,
          level: 3, kind: 'moon',
          onClick: () => select('moon', state.eraIndex, state.planetIndex, index),
        });
      });
    }

    // Actions
    els.prev.disabled = state.level === 'sun' ? state.eraIndex === 0 : state.planetIndex === 0;
    els.next.disabled = state.level === 'sun'
      ? state.eraIndex === state.system.eras.length - 1
      : state.planetIndex >= eraNode.planets.length - 1;
    els.up.disabled = state.level === 'sun';
    els.prev.title = state.level === 'sun' ? 'Période précédente' : 'Événement précédent';
    els.next.title = state.level === 'sun' ? 'Période suivante' : 'Événement suivant';
  }

  function fit() {
    if (!state.system) return;
    const widths = state.system.eras.map((node) => node.x);
    const worldW = Math.max(...widths) + 620;
    const worldH = 1180;
    const rect = els.stage.getBoundingClientRect();
    const mobile = window.innerWidth < 900;
    const left = mobile ? 20 : 330;
    const right = mobile ? rect.width - 20 : rect.width - 380;
    const available = Math.max(320, right - left);
    const scale = clamp(Math.min(available / worldW, rect.height / worldH) * 0.92, 0.16, 1.1);
    state.camera = {
      scale,
      x: left + (available - worldW * scale) / 2,
      y: (rect.height - worldH * scale) / 2,
    };
    applyCamera();
  }

  function focusNode() {
    const eraNode = currentEraNode();
    if (!eraNode) return;
    let x = eraNode.x;
    let y = eraNode.y;
    if (state.level !== 'sun') {
      const planet = currentPlanetNode();
      x += Math.cos(planet.angle) * planet.orbit;
      y += -Math.sin(planet.angle) * planet.orbit;
    }
    const rect = els.stage.getBoundingClientRect();
    const mobile = window.innerWidth < 900;
    const left = mobile ? 20 : 330;
    const right = mobile ? rect.width - 20 : rect.width - 380;
    const centerX = (left + right) / 2;
    const scale = state.level === 'sun' ? 0.82 : 1.05;
    state.camera = {
      scale,
      x: centerX - x * scale,
      y: rect.height / 2 - y * scale,
    };
    applyCamera();
  }

  function applyCamera() {
    const { x, y, scale } = state.camera;
    els.world.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
  }

  function zoom(factor) {
    const rect = els.stage.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const old = state.camera.scale;
    const next = clamp(old * factor, 0.12, 2.4);
    state.camera.x = cx - ((cx - state.camera.x) / old) * next;
    state.camera.y = cy - ((cy - state.camera.y) / old) * next;
    state.camera.scale = next;
    applyCamera();
  }

  function select(level, eraIndex, planetIndex, moonIndex) {
    state.level = level;
    state.eraIndex = clamp(eraIndex, 0, state.system.eras.length - 1);
    const eraNode = currentEraNode();
    state.planetIndex = clamp(planetIndex, 0, Math.max(0, eraNode.planets.length - 1));
    const planet = currentPlanetNode();
    state.moonIndex = clamp(moonIndex, 0, Math.max(0, planet?.moons.length - 1));
    updateHighlights();
    renderPanel();
    renderDashboard();
    focusNode();
  }

  function render() {
    renderWorld();
    renderPanel();
    renderDashboard();
    const country = state.system.country;
    els.context.textContent = `${country.name} · ${state.system.eras.length} systèmes · ${country.events.length} repères`;
  }

  function open(countryId) {
    if (!state.initialized) init();
    if (!els.overlay) return;
    const requested = COUNTRIES.find((country) => country.id === countryId)?.id
      || COUNTRIES.find((country) => country.id === window.VECTEMPOREL_APP?.getCountryId?.())?.id
      || COUNTRIES[0].id;
    state.system = buildSystem(requested);
    state.countryId = requested;
    state.eraIndex = 0;
    state.planetIndex = 0;
    state.moonIndex = 0;
    state.level = 'sun';
    state.showMoons = true;
    clearTimeout(state.hideTimer);
    state.open = true;
    els.overlay.hidden = false;
    render();
    requestAnimationFrame(() => {
      els.overlay.classList.add('is-open');
      fit();
    });
  }

  function close(toGlobe = true) {
    if (!state.open) return;
    state.open = false;
    els.overlay.classList.remove('is-open');
    closeHelp();
    state.hideTimer = window.setTimeout(() => {
      if (!state.open) els.overlay.hidden = true;
    }, 300);
    if (toGlobe) window.VECTEMPOREL_APP?.openGlobe?.();
  }

  function openHelp() {
    state.helpOpen = true;
    els.help.hidden = false;
    requestAnimationFrame(() => els.helpClose.focus({ preventScroll: true }));
  }

  function closeHelp() {
    if (!state.helpOpen) return;
    state.helpOpen = false;
    els.help.hidden = true;
  }

  function onKeyDown(event) {
    if (!state.open) return;
    if (!document.getElementById('reader-overlay')?.hidden) return;
    if (state.helpOpen) {
      if (event.key === 'Escape' || event.key === '?') {
        event.preventDefault();
        closeHelp();
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
      close();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      select('sun', state.eraIndex + delta, 0, 0);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      select('planet', state.eraIndex, state.planetIndex + 1, 0);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (state.level === 'moon') select('planet', state.eraIndex, state.planetIndex, 0);
      else if (state.level === 'planet') select('sun', state.eraIndex, 0, 0);
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (state.level === 'moon') select('planet', state.eraIndex, state.planetIndex, 0);
      else if (state.level === 'planet') select('sun', state.eraIndex, 0, 0);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (state.level === 'sun') select('planet', state.eraIndex, 0, 0);
      else if (state.level === 'planet') window.VECTEMPOREL_APP?.openEvent(currentPlanetNode().event.id);
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      state.showMoons = !state.showMoons;
      renderWorld();
      return;
    }
    if (event.key === '0') {
      event.preventDefault();
      fit();
    }
  }

  function cacheElements() {
    els.overlay = document.getElementById('solar-overlay');
    els.stage = document.getElementById('solar-stage');
    els.world = document.getElementById('solar-world');
    els.panel = document.getElementById('solar-panel');
    els.context = document.getElementById('solar-context');
    els.close = document.getElementById('solar-close');
    els.help = document.getElementById('solar-help');
    els.helpClose = document.getElementById('solar-help-close');
    els.helpBtn = document.getElementById('solar-help-btn');
    els.worldBtn = document.getElementById('solar-world-btn');
    els.recitBtn = document.getElementById('solar-recit-btn');
    els.dashboard = document.getElementById('solar-dashboard');
    els.dashToggle = document.getElementById('solar-dashboard-toggle');
    els.crumbs = document.getElementById('solar-crumbs');
    els.rank = document.getElementById('solar-rank');
    els.tree = document.getElementById('solar-tree');
    els.prev = document.getElementById('solar-prev');
    els.next = document.getElementById('solar-next');
    els.up = document.getElementById('solar-up');
  }

  function bind() {
    els.close?.addEventListener('click', () => close());
    els.overlay?.querySelector('[data-close-solar]')?.addEventListener('click', () => close());
    els.helpBtn?.addEventListener('click', openHelp);
    els.helpClose?.addEventListener('click', closeHelp);
    els.worldBtn?.addEventListener('click', () => close());
    els.recitBtn?.addEventListener('click', () => {
      state.open = false;
      els.overlay.classList.add('is-open');
      window.VECTEMPOREL_STORY?.open(state.countryId);
      window.setTimeout(() => { if (!state.open) els.overlay.hidden = true; }, 300);
    });
    els.dashToggle?.addEventListener('click', () => {
      els.dashboard.classList.toggle('is-collapsed');
      els.dashToggle.textContent = els.dashboard.classList.contains('is-collapsed') ? '+' : '−';
      setTimeout(fit, 300);
    });
    els.prev?.addEventListener('click', () => {
      if (state.level === 'sun') select('sun', state.eraIndex - 1, 0, 0);
      else select('planet', state.eraIndex, state.planetIndex - 1, 0);
    });
    els.next?.addEventListener('click', () => {
      if (state.level === 'sun') select('sun', state.eraIndex + 1, 0, 0);
      else select('planet', state.eraIndex, state.planetIndex + 1, 0);
    });
    els.up?.addEventListener('click', () => {
      if (state.level === 'moon') select('planet', state.eraIndex, state.planetIndex, 0);
      else if (state.level === 'planet') select('sun', state.eraIndex, 0, 0);
      else close();
    });
    document.getElementById('solar-zoom-in')?.addEventListener('click', () => zoom(1.35));
    document.getElementById('solar-zoom-out')?.addEventListener('click', () => zoom(1 / 1.35));
    document.getElementById('solar-zoom-fit')?.addEventListener('click', fit);
    els.stage?.addEventListener('wheel', (event) => {
      event.preventDefault();
      zoom(event.deltaY < 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });
    els.stage?.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.planet, .sun-core, .moon, .solar-panel, button')) return;
      state.drag = { x: event.clientX, y: event.clientY, camera: { ...state.camera } };
      els.world.classList.add('is-dragging');
      els.stage.setPointerCapture(event.pointerId);
    });
    els.stage?.addEventListener('pointermove', (event) => {
      if (!state.drag) return;
      state.camera.x = state.drag.camera.x + (event.clientX - state.drag.x);
      state.camera.y = state.drag.camera.y + (event.clientY - state.drag.y);
      applyCamera();
    });
    const endDrag = (event) => {
      if (!state.drag) return;
      state.drag = null;
      els.world.classList.remove('is-dragging');
      if (els.stage.hasPointerCapture(event.pointerId)) els.stage.releasePointerCapture(event.pointerId);
    };
    els.stage?.addEventListener('pointerup', endDrag);
    els.stage?.addEventListener('pointercancel', endDrag);
    document.addEventListener('keydown', onKeyDown);
    new ResizeObserver(() => { if (state.open) fit(); }).observe(els.stage);
  }

  function init() {
    if (state.initialized) return;
    cacheElements();
    if (!els.overlay) return;
    state.initialized = true;
    bind();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.VECTEMPOREL_SOLAR = {
    open,
    close,
    fit,
    state: () => ({ ...state, countryId: state.countryId }),
  };
})();
