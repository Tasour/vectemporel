/* Géographie locale : contour du pays et lieux vérifiés, sans tuile distante.
 * Audit atlas-geographie : chantiers ATLAS-GEO-01..10 (UNIFIED_AUDIT/views/atlas-geographie.md).
 * Refonte navigation c3-recherche-atlas : C3-05, C3-06, C3-07, C3-09, C3-10.
 * Aucune coordonnée, date ou coordonnée de repli n'est inventée : seules les
 * valeurs de src/data/dataset.js sont projetées.
 */
import { state, currentCountry, currentEra, currentPlaces, set, goView } from '../domain/store.js';
import { runEnhancements } from './geography/index.js';
import { runEnhancements as runEnhancementsV2 } from './geography/v2/index.js';

const MAP_W = 900;
const MAP_H = 620;
const STYLE_ID = 'atlas-geographie-css';
const LIST_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
let keyGuardInstalled = false;

/* C3-05 / C3-09 : etats locaux de navigation, conserves a travers les rendus. */
const c3bLocal = { query: '', frame: 'all' };
const c3bOrigin = { era: 0, country: 0 };

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svgEl(tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

/* ATLAS-GEO-02 : projection schématique robuste, jamais de coordonnée fabriquée. */
function project(point, bounds, width, height) {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return null;
  if (!bounds) return null;
  const spanLon = bounds.maxLon - bounds.minLon;
  const spanLat = bounds.maxLat - bounds.minLat;
  if (!Number.isFinite(spanLon) || !Number.isFinite(spanLat) || spanLon <= 0 || spanLat <= 0) return null;
  return {
    x: ((point.lon - bounds.minLon) / spanLon) * width,
    y: ((bounds.maxLat - point.lat) / spanLat) * height,
  };
}

/* ATLAS-GEO-03 : appartenance honnête au cadre affiché (pas de déplacement fictif). */
function inFrame(point, bounds) {
  if (!point || !bounds) return false;
  return point.lat >= bounds.minLat && point.lat <= bounds.maxLat
    && point.lon >= bounds.minLon && point.lon <= bounds.maxLon;
}

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

/* ATLAS-GEO-10 : style local, idempotent, sans aucune ressource externe. */
function ensureGeoStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
  /* atlas-geographie : règles locales, zéro réseau, préfixe .geo- / #atlas-geo-. */
  .geo-map { min-height: 260px; }
  .geo-svg { display: block; touch-action: none; }
  .geo-hit { fill: transparent; stroke: none; }
  .geo-marker:focus { outline: none; }
  .geo-marker:focus .geo-ring { stroke: #ffffff; stroke-width: 2.5; }
  .geo-controls { position: absolute; right: 18px; top: 14px; display: flex; gap: 6px; z-index: 3; }
  .geo-controls button { min-width: 44px; min-height: 44px; border: 1px solid var(--line); border-radius: 8px; background: rgba(8,12,18,.86); color: var(--ink); font-size: 15px; cursor: pointer; }
  .geo-controls button:hover { border-color: var(--gold); color: var(--gold-bright); }
  .geo-controls button:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  .geo-empty { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; text-align: center; color: var(--muted); font-size: 13px; pointer-events: none; }
  .geo-legend { margin: 14px 0 6px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: rgba(255,255,255,.02); color: var(--muted); font-size: 10px; line-height: 1.7; }
  .geo-path { fill: none; stroke: var(--gold); stroke-width: 1.1; stroke-dasharray: 4 4; opacity: .55; }
  .geo-path-node { fill: var(--gold); opacity: .55; }
  .geo-offlist { margin: 4px 0 0; padding: 0; list-style: none; }
  .geo-offlist li + li { margin-top: 4px; }
  @media (max-width: 620px) {
    .geo-controls { right: 8px; top: 8px; }
    .geo-controls button { min-width: 40px; min-height: 40px; font-size: 13px; }
    .geo-legend { font-size: 9px; }
  }`;
  document.head.appendChild(style);
}

/* C3-10 : bloc CSS isole pour la navigation fine, injecte une seule fois. */
function ensureNavC3bStyle() {
  if (document.getElementById('nav-c3b')) return;
  const style = document.createElement('style');
  style.id = 'nav-c3b';
  style.textContent = `
  .c3b-tools { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin:8px 0 6px; }
  .c3b-search { flex:1 1 150px; min-width:130px; min-height:34px; padding:6px 8px; border:1px solid var(--line); border-radius:8px; background:rgba(255,255,255,.03); color:var(--ink); font:inherit; font-size:10px; }
  .c3b-search::placeholder { color:var(--muted-2); }
  .c3b-group { display:flex; flex-wrap:wrap; gap:4px; }
  .c3b-filter { min-height:28px; padding:3px 8px; border:1px solid var(--line); border-radius:999px; background:transparent; color:var(--muted); font-size:9px; cursor:pointer; }
  .c3b-filter[aria-pressed="true"] { border-color:var(--gold); color:var(--gold-bright); background:rgba(230,185,111,.1); }
  .c3b-filter:focus-visible, .c3b-search:focus-visible, .c3b-place-item:focus-visible, .c3b-reset:focus-visible { outline:2px solid var(--gold-bright); outline-offset:2px; }
  .c3b-status { min-height:12px; margin:0 0 8px; color:var(--muted); font-size:9px; line-height:1.4; font-variant-numeric:tabular-nums; }
  .c3b-places { list-style:none; margin:6px 0 0; padding:0; }
  .c3b-places li + li { margin-top:3px; }
  .c3b-place-item { width:100%; min-height:32px; padding:5px 8px; border:1px solid var(--line); border-radius:7px; background:transparent; color:var(--muted); font-size:10px; text-align:left; cursor:pointer; }
  .c3b-place-item[aria-current="true"] { border-color:var(--gold); color:var(--gold-bright); background:rgba(230,185,111,.1); }
  .c3b-offtag { color:var(--muted-2); font-size:8px; }
  .c3b-empty { padding:12px; border:1px dashed var(--line); border-radius:8px; color:var(--muted); font-size:10px; }
  .c3b-empty p { margin:0; }
  .c3b-reset { min-height:30px; margin-top:6px; padding:0 10px; border:1px solid var(--line); border-radius:8px; background:transparent; color:var(--gold-bright); font-size:9px; cursor:pointer; }
  @media (max-width:620px) { .c3b-tools { flex-direction:column; align-items:stretch; } .c3b-search { width:100%; } .c3b-place-item { min-height:36px; } }`;
  document.head.appendChild(style);
}

/* C3-06 : le routeur global ecoute en capture sur document ; la navigation
   dans la liste doit etre traitee en capture fenetre, avant lui. */
function installListKeyGuard() {
  if (keyGuardInstalled || typeof window === 'undefined') return;
  keyGuardInstalled = true;
  window.addEventListener('keydown', (event) => {
    if (state.view !== 'geography' || !(event.target instanceof Element)) return;
    if (!LIST_KEYS.includes(event.key)) return;
    if (!event.target.closest('#c3b-places')) return;
    const buttons = Array.from(document.querySelectorAll('#c3b-places .c3b-place-item'));
    if (!buttons.length) return;
    event.preventDefault();
    event.stopPropagation();
    const pos = buttons.indexOf(document.activeElement);
    let next = pos;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else if (event.key === 'ArrowDown') next = pos < 0 ? 0 : Math.min(pos + 1, buttons.length - 1);
    else next = pos < 0 ? buttons.length - 1 : Math.max(pos - 1, 0);
    buttons.forEach((button) => { button.tabIndex = -1; });
    buttons[next].tabIndex = 0;
    buttons[next].focus();
  }, true);
}

/* ATLAS-GEO-05 : transformation de vue locale au module, jamais dans le store. */
const viewState = { key: null, box: { x: 0, y: 0, w: MAP_W, h: MAP_H } };

function viewKey(country, scope, eraIndex) {
  return `${country?.id || '-'}|${scope}|${eraIndex}`;
}

export function renderGeography(stage) {
  ensureGeoStyles();
  ensureNavC3bStyle();
  installListKeyGuard();
  const country = currentCountry();
  if (!country) {
    /* ATLAS-GEO-01 : état vide explicite, même si la coque filtre normalement ce cas. */
    const fallback = el('div', 'geo-layout');
    const emptyMap = el('div', 'geo-map');
    const empty = el('div', 'geo-empty', 'Aucun pays sélectionné. Choisissez un pays sur le globe.');
    empty.setAttribute('role', 'status');
    emptyMap.appendChild(empty);
    fallback.appendChild(emptyMap);
    stage.appendChild(fallback);
    return;
  }

  const era = currentEra();
  const places = currentPlaces();
  /* ATLAS-GEO-08 : un seul index d'affichage, borne, pour carte, kicker et panneau. */
  const active = places.length ? clamp(state.placeIndex, 0, places.length - 1) : 0;

  /* C3-05 : recherche et filtre de perimeter, calcules depuis les champs reels. */
  const query = c3bLocal.query.trim().toLowerCase();
  const matchesPlace = (place) => {
    const framed = inFrame(place, country.bounds);
    if (c3bLocal.frame === 'framed' && !framed) return false;
    if (c3bLocal.frame === 'off' && framed) return false;
    if (!query) return true;
    return [place.label, place.hierarchy, ...(place.historical || []), ...(place.functions || [])]
      .filter(Boolean).join(' ').toLowerCase().includes(query);
  };
  const visible = places.map((place, index) => ({ place, index })).filter(({ place }) => matchesPlace(place));
  const visibleFramed = visible.filter(({ place }) => inFrame(place, country.bounds));
  const visibleOff = visible.filter(({ place }) => !inFrame(place, country.bounds));
  const markerFocusIndex = visibleFramed.some((entry) => entry.index === active)
    ? active : (visibleFramed.length ? visibleFramed[0].index : -1);
  const listFocusIndex = visible.some((entry) => entry.index === active)
    ? active : (visible.length ? visible[0].index : -1);

  const key = viewKey(country, state.scope, state.eraIndex);
  if (viewState.key !== key) {
    viewState.key = key;
    viewState.box = { x: 0, y: 0, w: MAP_W, h: MAP_H };
  }
  const box = viewState.box;

  const layout = el('div', 'geo-layout');
  const map = el('div', 'geo-map');
  map.id = 'c3b-map';
  map.tabIndex = 0;
  map.setAttribute('role', 'region');
  map.setAttribute('aria-label', 'Carte schématique locale. Touches : plus et moins pour zoomer, zéro pour réinitialiser, flèches pour changer de lieu.');

  const svg = svgEl('svg');
  svg.setAttribute('viewBox', `${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.w.toFixed(2)} ${box.h.toFixed(2)}`);
  svg.setAttribute('class', 'geo-svg');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  /* ATLAS-GEO-07 : description machine du SVG, ids uniques. */
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-labelledby', 'atlas-geo-svg-title atlas-geo-svg-desc');
  const title = svgEl('title');
  title.id = 'atlas-geo-svg-title';
  title.textContent = `Carte schématique — ${country.name}`;
  const desc = svgEl('desc');
  desc.id = 'atlas-geo-svg-desc';
  desc.textContent = 'Représentation sans tuile ni réseau : contour du pays, lieux vérifiés dans le cadre et chemin chronologique de l’ère courante.';
  svg.append(title, desc);

  /* ATLAS-GEO-05 : viewBox bornée, conservée dans le cache de module. */
  const applyBox = (x, y, w, h) => {
    box.w = clamp(w, MAP_W / 8, MAP_W);
    box.h = box.w * (MAP_H / MAP_W);
    box.x = clamp(x, 0, MAP_W - box.w);
    box.y = clamp(y, 0, MAP_H - box.h);
    svg.setAttribute('viewBox', `${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.w.toFixed(2)} ${box.h.toFixed(2)}`);
  };
  const zoomBy = (factor) => {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const nw = clamp(box.w * factor, MAP_W / 8, MAP_W);
    const nh = nw * (MAP_H / MAP_W);
    applyBox(cx - ((cx - box.x) / box.w) * nw, cy - ((cy - box.y) / box.h) * nh, nw, nh);
  };
  const resetBox = () => applyBox(0, 0, MAP_W, MAP_H);

  /* Contour : seuls les sommets projectables sont conserves (ATLAS-GEO-02). */
  if (country.outline.length) {
    const points = country.outline
      .map(([lon, lat]) => project({ lon, lat }, country.bounds, MAP_W, MAP_H))
      .filter(Boolean);
    if (points.length > 2) {
      const polygon = svgEl('polygon');
      polygon.setAttribute('points', points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
      polygon.setAttribute('class', 'geo-outline');
      svg.appendChild(polygon);
    }
  }

  /* ATLAS-GEO-04 : chemin chronologique, construit depuis les annees reelles. */
  let pathLabel = '';
  if (state.scope === 'era' && era && country.events) {
    const nodes = country.events
      .filter((event) => event.eraId === era.id)
      .slice()
      .sort((a, b) => a.year - b.year)
      .flatMap((event) => (event.places || []).flatMap((place) => {
        if (!inFrame(place, country.bounds)) return [];
        const p = project(place, country.bounds, MAP_W, MAP_H);
        return p ? [{ ...p, title: event.title, year: event.year, label: place.label }] : [];
      }));
    if (nodes.length >= 2) {
      const line = svgEl('polyline');
      line.setAttribute('points', nodes.map((n) => `${n.x.toFixed(1)},${n.y.toFixed(1)}`).join(' '));
      line.setAttribute('class', 'geo-path');
      svg.appendChild(line);
      nodes.forEach((node) => {
        const dot = svgEl('circle');
        dot.setAttribute('cx', node.x.toFixed(1));
        dot.setAttribute('cy', node.y.toFixed(1));
        dot.setAttribute('r', '2.2');
        dot.setAttribute('class', 'geo-path-node');
        const nodeTitle = svgEl('title');
        nodeTitle.textContent = `${node.title} · ${formatYear(node.year)} · ${node.label}`;
        dot.appendChild(nodeTitle);
        svg.appendChild(dot);
      });
      pathLabel = `${formatYear(nodes[0].year)} → ${formatYear(nodes[nodes.length - 1].year)}`;
    }
  }

  /* ATLAS-GEO-03 / C3-05 : seuls les lieux dans le cadre retenus par le filtre
     recoivent un marqueur ; aucun lieu n'est deplace. */
  visibleFramed.forEach(({ place, index }) => {
    const p = project(place, country.bounds, MAP_W, MAP_H);
    if (!p) return;
    const isActive = index === active;
    /* ATLAS-GEO-06 : marqueur focalisable, etiquete, avec cible tactile elargie. */
    const group = svgEl('g');
    group.setAttribute('class', `geo-marker${isActive ? ' is-active' : ''}`);
    group.setAttribute('role', 'button');
    group.setAttribute('tabindex', index === markerFocusIndex ? '0' : '-1');
    group.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    group.setAttribute('aria-label', `${place.label}${place.hierarchy ? ` · ${place.hierarchy}` : ''}${isActive ? ' · lieu actif' : ''}`);
    const hit = svgEl('circle');
    hit.setAttribute('cx', p.x.toFixed(1));
    hit.setAttribute('cy', p.y.toFixed(1));
    hit.setAttribute('r', '14');
    hit.setAttribute('class', 'geo-hit');
    const circle = svgEl('circle');
    circle.setAttribute('cx', p.x.toFixed(1));
    circle.setAttribute('cy', p.y.toFixed(1));
    circle.setAttribute('r', isActive ? '7' : '4');
    circle.setAttribute('class', 'geo-ring');
    const label = svgEl('text');
    label.setAttribute('x', (p.x + 9).toFixed(1));
    label.setAttribute('y', (p.y + 3).toFixed(1));
    label.textContent = place.label;
    group.append(hit, circle, label);
    group.addEventListener('click', () => set({ placeIndex: index }, 'place'));
    group.addEventListener('focus', () => {
      if (state.placeIndex !== index) set({ placeIndex: index }, 'place');
    });
    svg.appendChild(group);
  });

  map.append(svg);

  /* ATLAS-GEO-01 / C3-07 : etat vide visible sur la carte, annonce et distinct. */
  if (!visible.length) {
    const message = places.length
      ? 'Aucun lieu ne correspond à cette recherche ou à ce périmètre. Modifiez les filtres du panneau.'
      : 'Aucun lieu localisé pour ce périmètre. Changez de repère ou de période, ou élargissez le périmètre.';
    const overlay = el('div', 'geo-empty', message);
    overlay.setAttribute('role', 'status');
    map.appendChild(overlay);
  }

  /* ATLAS-GEO-05 : commandes de zoom, accessibles et testables. */
  const controls = el('div', 'geo-controls');
  const control = (glyph, label, action, fk) => {
    const button = el('button', '', glyph);
    button.type = 'button';
    button.title = label;
    button.dataset.fk = fk;
    button.setAttribute('aria-label', label);
    button.addEventListener('click', action);
    return button;
  };
  controls.append(
    control('+', 'Zoom avant (touche +)', () => zoomBy(0.8), 'c3b-zoom-in'),
    control('−', 'Zoom arrière (touche -)', () => zoomBy(1.25), 'c3b-zoom-out'),
    control('↺', 'Réinitialiser la vue (touche 0)', resetBox, 'c3b-zoom-reset'),
  );
  map.appendChild(controls);

  svg.addEventListener('wheel', (event) => {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 0.85 : 1.18);
  }, { passive: false });

  let drag = null;
  svg.addEventListener('pointerdown', (event) => {
    if (event.target.closest && event.target.closest('.geo-marker')) return;
    drag = { x: event.clientX, y: event.clientY, ox: box.x, oy: box.y, w: box.w, h: box.h };
    try { svg.setPointerCapture(event.pointerId); } catch { /* capture non disponible : glisser ignore */ }
  });
  svg.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((event.clientX - drag.x) * drag.w) / (rect.width || 1);
    const dy = ((event.clientY - drag.y) * drag.h) / (rect.height || 1);
    applyBox(drag.ox - dx, drag.oy - dy, drag.w, drag.h);
  });
  const endDrag = () => { drag = null; };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  /* ATLAS-GEO-05 : raccourcis libres, non captures par le routeur clavier global. */
  map.addEventListener('keydown', (event) => {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      event.stopPropagation();
      zoomBy(0.8);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      event.stopPropagation();
      zoomBy(1.25);
    } else if (event.key === '0') {
      event.preventDefault();
      event.stopPropagation();
      resetBox();
    }
  });

  const panel = el('aside', 'geo-panel');
  panel.appendChild(el('div', 'view-kicker', `Lieu ${places.length ? active + 1 : 0} / ${places.length} · ${state.scope === 'era' ? 'repère' : 'pays'}`));

  /* C3-05 : barre d'outils a emplacement fixe, avant la liste et le panneau. */
  const tools = el('div', 'c3b-tools');
  tools.id = 'c3b-tools';
  const search = document.createElement('input');
  search.type = 'search';
  search.id = 'c3b-search';
  search.className = 'c3b-search';
  search.placeholder = 'Rechercher un lieu du périmètre…';
  search.setAttribute('aria-label', `Rechercher parmi les ${places.length} lieux du périmètre`);
  search.setAttribute('aria-controls', 'c3b-places');
  search.dataset.fk = 'c3b-search';
  search.value = c3bLocal.query;
  search.addEventListener('input', () => {
    c3bLocal.query = search.value;
    set({}, 'c3b-filter');
  });
  tools.appendChild(search);
  const group = el('div', 'c3b-group');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Filtre de cadre');
  [['all', 'Tous'], ['framed', 'Dans le cadre'], ['off', 'Hors du cadre']].forEach(([value, label]) => {
    const button = el('button', 'c3b-filter', label);
    button.type = 'button';
    button.dataset.fk = `c3b-frame-${value}`;
    button.dataset.frame = value;
    button.setAttribute('aria-pressed', c3bLocal.frame === value ? 'true' : 'false');
    button.setAttribute('aria-controls', 'c3b-places');
    button.addEventListener('click', () => {
      c3bLocal.frame = value;
      set({}, 'c3b-filter');
    });
    group.appendChild(button);
  });
  tools.appendChild(group);
  panel.appendChild(tools);

  /* C3-07 : statut compte et annonce, distinct du message de la carte. */
  const status = el('div', 'c3b-status');
  status.id = 'c3b-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const statusParts = [`${visible.length} lieu(x) affiché(s) sur ${places.length}`];
  if (query) statusParts.push(`recherche : « ${c3bLocal.query.trim()} »`);
  statusParts.push(`cadre : ${c3bLocal.frame === 'all' ? 'tous' : c3bLocal.frame === 'framed' ? 'dans le cadre' : 'hors du cadre'}`);
  status.textContent = `${statusParts.join(' · ')} · ${state.scope === 'era' ? 'repère' : 'pays'}.`;
  panel.appendChild(status);

  const place = places[active];
  if (place) {
    panel.appendChild(el('h2', 'geo-title', place.label));
    if ((place.historical || []).length) panel.appendChild(el('p', 'geo-history', `Noms historiques : ${place.historical.join(' · ')}`));
    panel.appendChild(el('p', 'geo-functions', (place.functions || []).join(' · ') || place.hierarchy || 'Lieu documenté'));
    if ((place.contestations || []).length) panel.appendChild(el('p', 'geo-debate', `Mémoires : ${place.contestations.join(' · ')}`));
    panel.appendChild(el('p', 'geo-coords', `${place.lat?.toFixed(3)}, ${place.lon?.toFixed(3)}`));
    panel.appendChild(el('p', 'geo-source', place.source || 'Source de coordonnée non renseignée'));
  } else {
    panel.appendChild(el('p', '', 'Aucun lieu localisé pour ce périmètre.'));
  }

  /* C3-06 : liste ordonnee unique, synchronisee avec les marqueurs. */
  if (visibleOff.length) {
    panel.appendChild(el('p', 'geo-functions', `Hors du cadre affiché (${visibleOff.length}) : listés sans déplacement fictif.`));
  }
  const list = el('ol', 'c3b-places');
  list.id = 'c3b-places';
  list.setAttribute('aria-label', `Lieux filtrés de ${country.name}`);
  visible.forEach(({ place: entry, index }) => {
    const li = el('li');
    const isActive = index === active;
    const button = el('button', 'c3b-place-item');
    button.type = 'button';
    button.dataset.fk = `c3b-place-${index}`;
    button.dataset.placeIndex = String(index);
    button.setAttribute('aria-controls', 'c3b-map');
    button.tabIndex = index === listFocusIndex ? 0 : -1;
    if (isActive) button.setAttribute('aria-current', 'true');
    button.appendChild(document.createTextNode(entry.label));
    if (!inFrame(entry, country.bounds)) button.appendChild(el('span', 'c3b-offtag', ' · hors du cadre affiché'));
    button.addEventListener('click', () => set({ placeIndex: index }, 'place'));
    li.appendChild(button);
    list.appendChild(li);
  });
  panel.appendChild(list);

  if (!visible.length) {
    const empty = el('div', 'c3b-empty');
    empty.id = 'c3b-empty';
    empty.setAttribute('role', 'status');
    empty.appendChild(el('p', '', 'Aucun lieu ne correspond à ces critères dans ce périmètre.'));
    empty.appendChild(el('button', 'c3b-reset', 'Réinitialiser les filtres'));
    const reset = empty.querySelector('.c3b-reset');
    reset.type = 'button';
    reset.dataset.fk = 'c3b-reset';
    reset.addEventListener('click', () => {
      c3bLocal.query = '';
      c3bLocal.frame = 'all';
      set({}, 'c3b-filter');
    });
    panel.appendChild(empty);
  }

  /* ATLAS-GEO-07 : légende des symboles et des commandes. */
  const legend = el('div', 'geo-legend');
  legend.appendChild(el('div', '', 'Légende · symboles'));
  legend.appendChild(el('div', '', '● lieu affiché · ◎ lieu sélectionné · ┄ chemin chronologique'));
  legend.appendChild(el('div', '', 'Les lieux hors du cadre sont listés à droite, sans déplacement fictif.'));
  if (pathLabel) legend.appendChild(el('div', '', `Chemin : ${pathLabel} (années du jeu de données).`));
  legend.appendChild(el('div', '', 'Clavier : ← → lieu · ↑ ↓ parcourent la liste · + − zoom · 0 vue initiale · Espace périmètre.'));
  panel.appendChild(legend);

  /* C3-09 : bascule de périmètre avec retour a l'index d'origine. */
  const currentScope = state.scope;
  const nextScope = currentScope === 'era' ? 'country' : 'era';
  const scope = el('button', '', nextScope === 'country' ? 'Voir tous les lieux du pays' : 'Revenir aux lieux du repère');
  scope.type = 'button';
  scope.dataset.fk = 'c3b-scope';
  scope.addEventListener('click', () => {
    c3bOrigin[currentScope] = state.placeIndex;
    set({ scope: nextScope, placeIndex: c3bOrigin[nextScope] || 0 }, 'scope');
  });
  panel.appendChild(scope);
  const back = el('button', '', '← Chronologie');
  back.type = 'button';
  back.dataset.fk = 'c3b-back';
  back.addEventListener('click', () => goView('chronology'));
  panel.appendChild(back);

  layout.append(map, panel);
  stage.appendChild(layout);
  runEnhancements({ viewId: 'geography', stage, layout });
  runEnhancementsV2({ viewId: 'geographyv2', stage, layout });
}
