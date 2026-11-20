/* Vue Constellation optionnelle : figée, légendée, synchronisée à l'arbre. */
/* Audit atlas-constellation : positions déterministes et décoratives, zéro réseau.
   Tout est local : aucun fetch, aucune URL de ressource, aucun href/src généré ici. */
import { state, currentCountry, selectEra, selectEvent, set, goView } from '../domain/store.js';
import { runEnhancements } from './constellation/index.js';
import { runEnhancements as runEnhancementsV2 } from './constellation/v2/index.js';

const CSS_ID = 'atlas-constellation-css';
const NOTE_ID = 'constellation-note';

/* Dernier contrôle focalisé, mémorisé entre deux rendus complets du shell.
   Le shell recrée le DOM à chaque set() : sans cette clé, le focus retombe sur <body>. */
let focusMemory = null;

const CSS = `
/* Bloc injecté par src/views/constellation.js — aucun ajout dans styles.css. */
.constellation-layout { padding: 18px 20px 26px; }
.constellation-head {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 16px;
}
.constellation-title {
  margin: 0; font-family: var(--serif); font-size: 20px; font-weight: 450;
}
.constellation-kicker {
  margin: 0; color: var(--gold); font-size: 8px; font-weight: 600;
  letter-spacing: .16em; text-transform: uppercase;
}
.constellation-legend { flex-wrap: wrap; gap: 8px 16px; }
.constellation-field {
  margin-top: 16px;
  min-height: clamp(360px, 54vh, 520px);
  overflow: hidden;
  contain: layout paint;
}
.constellation-edges {
  position: absolute; inset: 0; width: 100%; height: 100%;
  pointer-events: none; z-index: 0;
}
.constellation-edges line {
  stroke: rgba(244, 214, 158, .16);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.constellation-edges line.is-path {
  stroke: rgba(230, 185, 111, .65);
  stroke-width: 1.6;
}
.constellation-edges line.is-moon { stroke: rgba(178, 139, 221, .35); }
.constellation-edges line.is-moon.is-path { stroke: rgba(178, 139, 221, .85); }
.const-layer { position: absolute; inset: 0; pointer-events: none; }
.const-layer-suns { z-index: 1; }
.const-layer-planets { z-index: 2; }
.const-layer-moons { z-index: 3; }
.constellation-field button { pointer-events: auto; }
.const-sun, .const-planet, .const-moon {
  position: absolute; left: var(--x); top: var(--y); margin: 0;
}
.const-sun {
  display: grid; place-items: center;
  width: 42px; height: 42px;
  transform: translate(-50%, -50%);
  color: var(--ink); font-size: 11px; font-variant-numeric: tabular-nums;
  overflow: visible;
}
.const-sun::after {
  top: calc(100% + 4px); left: 50%; width: 160px;
  transform: translateX(-50%);
  color: var(--ink-soft); font-size: 9px; text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  content: attr(data-label);
}
.const-sun.is-active::after { color: var(--gold-bright); font-weight: 600; }
.const-planet {
  display: grid; place-items: center;
  width: var(--const-node-size, 28px); height: var(--const-node-size, 28px);
  transform: translate(-50%, -50%);
  color: var(--ink-soft);
  font-size: 9px; font-variant-numeric: tabular-nums;
}
.const-planet::after {
  top: calc(100% + 3px); left: 50%; width: 118px;
  transform: translateX(-50%);
  color: var(--muted); font-size: 8px; line-height: 1.2; text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  content: attr(data-label);
}
.const-planet.is-active::after { color: var(--gold-bright); }
.const-moon {
  width: 14px; height: 14px;
  transform: translate(-50%, -50%);
  border: 1px solid var(--violet); border-radius: 50%;
  background: var(--surface-2); cursor: pointer;
}
.const-moon.is-active { background: var(--violet); box-shadow: 0 0 10px rgba(178,139,221,.55); }
.const-moon::after {
  top: calc(100% + 2px); left: 50%; width: 90px;
  transform: translateX(-50%);
  color: var(--muted); font-size: 7px; text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  content: attr(data-label); opacity: 0;
}
.const-moon.is-active::after, .const-moon:focus-visible::after { opacity: 1; }
.constellation-empty {
  position: absolute; top: 50%; left: 50%; z-index: 4;
  margin: 0; width: min(90%, 420px);
  transform: translate(-50%, -50%);
  color: var(--muted); font-size: 11px; line-height: 1.5; text-align: center;
}
.constellation-caption {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 16px;
  margin-top: 14px;
}
.constellation-note {
  flex: 1 1 420px; max-width: 820px;
  margin: 0; color: var(--muted-2); font-size: 9px; line-height: 1.55;
}
.constellation-state { margin: 0; color: var(--gold); font-size: 9px; }
.constellation-back {
  min-height: 36px; padding: 0 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(255,255,255,.03); color: var(--ink-soft);
  font-size: 9px; cursor: pointer;
}
.constellation-back:hover { border-color: var(--gold); color: var(--gold-bright); }
.constellation-empty-shell { display: grid; place-items: center; height: 100%; gap: 10px; color: var(--muted); }
@media (max-width: 1000px) {
  .constellation-field { min-height: 420px; }
}
@media (max-width: 620px) {
  .constellation-layout { padding: 14px 12px 24px; }
  .constellation-title { font-size: 17px; }
  .constellation-legend { gap: 6px 10px; }
  .constellation-field { margin-top: 12px; min-height: 380px; }
  .constellation-edges line { stroke-width: .8; }
  .const-sun::after { width: 118px; font-size: 8px; }
  .const-planet::after { width: 84px; font-size: 7px; }
  .constellation-note { flex-basis: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .constellation-field * { animation: none !important; transition: none !important; }
}
`;

function injectCss() {
  if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/* 0° = haut. Coordonnées en pourcentage, partagées par les boutons et le SVG. */
function polar(cx, cy, radius, degrees) {
  const radians = (degrees - 90) * Math.PI / 180;
  return {
    x: clamp(cx + radius * Math.cos(radians), 10, 90),
    y: clamp(cy + radius * Math.sin(radians), 12, 88),
  };
}

function addLine(edges, from, to, isPath, kind) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', from.x.toFixed(2));
  line.setAttribute('y1', from.y.toFixed(2));
  line.setAttribute('x2', to.x.toFixed(2));
  line.setAttribute('y2', to.y.toFixed(2));
  line.setAttribute('class', `const-edge${isPath ? ' is-path' : ''}${kind ? ` is-${kind}` : ''}`);
  edges.appendChild(line);
}

function makeLayer(field, className, label) {
  const layer = el('div', `const-layer ${className}`);
  layer.setAttribute('role', 'group');
  layer.setAttribute('aria-label', label);
  field.appendChild(layer);
  return layer;
}

function rememberFocus(field) {
  field.addEventListener('focusin', (event) => {
    const node = event.target instanceof Element ? event.target.closest('[data-const-key]') : null;
    if (node && field.contains(node)) focusMemory = node.dataset.constKey;
  });
}

export function renderConstellation(stage) {
  injectCss();
  const country = currentCountry();
  if (!country) {
    const shell = el('div', 'constellation-empty-shell');
    shell.appendChild(el('p', '', 'Aucun pays sélectionné : la constellation n’a pas de données à afficher.'));
    const back = el('button', 'constellation-back', '← Revenir au globe');
    back.type = 'button';
    back.addEventListener('click', () => goView('globe'));
    shell.appendChild(back);
    stage.appendChild(shell);
    return;
  }

  const eras = country.eras || [];
  const events = country.events || [];
  const activeEraIndex = clamp(state.eraIndex, 0, Math.max(0, eras.length - 1));
  const activeEra = eras[activeEraIndex] || null;
  const activeEvent = events[state.eventIndex] || null;
  const eraEvents = activeEra ? events.filter((event) => event.eraId === activeEra.id) : [];
  const points = activeEvent?.points || [];
  const pointIndex = clamp(state.pointIndex, 0, Math.max(0, points.length - 1));

  /* Index global calculé une seule fois : aucun indexOf répété par planète. */
  const globalIndexById = new Map(events.map((event, index) => [event.id, index]));

  const layout = el('div', 'constellation-layout');
  const head = el('div', 'constellation-head');
  head.appendChild(el('h2', 'constellation-title', `Constellation · ${country.name}`));
  head.appendChild(el('p', 'constellation-kicker', 'Vue optionnelle · figée'));
  const legend = el('div', 'constellation-legend');
  legend.append(
    el('span', 'legend-sun', 'Ère'),
    el('span', 'legend-planet', 'Repère'),
    el('span', 'legend-moon', 'Point vérifié du repère')
  );
  head.appendChild(legend);
  layout.appendChild(head);

  const field = el('div', 'constellation-field');
  field.setAttribute('role', 'group');
  field.setAttribute('aria-label', `Constellation de ${country.name} : ères, repères et points vérifiés`);
  field.setAttribute('aria-describedby', NOTE_ID);
  field.style.setProperty('--const-node-size', `${eraEvents.length > 16 ? 18 : eraEvents.length > 9 ? 22 : 28}px`);
  rememberFocus(field);

  const edges = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  edges.setAttribute('class', 'constellation-edges');
  edges.setAttribute('viewBox', '0 0 100 100');
  edges.setAttribute('preserveAspectRatio', 'none');
  edges.setAttribute('aria-hidden', 'true');
  edges.setAttribute('focusable', 'false');
  field.appendChild(edges);

  const sunLayer = makeLayer(field, 'const-layer-suns', `Ères de ${country.name}`);
  const planetLayer = makeLayer(field, 'const-layer-planets',
    activeEra ? `Repères de l’ère ${activeEra.name}` : 'Aucun repère');
  const moonLayer = makeLayer(field, 'const-layer-moons',
    activeEvent ? `Points vérifiés du repère ${activeEvent.title}` : 'Aucun point');

  /* Les soleils sont répartis sur un cercle : ils ne se superposent plus. */
  const sunRadius = eras.length > 1 ? 22 : 0;
  const sunPositions = eras.map((era, index) => polar(
    50, 50, sunRadius, (index * 360) / Math.max(1, eras.length)
  ));
  const sunAnchor = sunPositions[activeEraIndex] || { x: 50, y: 50 };

  eras.forEach((era, eraIndex) => {
    const position = sunPositions[eraIndex];
    const isActive = eraIndex === activeEraIndex;
    const label = `${era.name} · ${formatYear(era.start)} – ${formatYear(era.end)}`;
    const sun = el('button', `const-sun${isActive ? ' is-active' : ''}`, String(eraIndex + 1));
    sun.type = 'button';
    sun.dataset.constKey = `sun:${eraIndex}`;
    sun.dataset.label = label;
    sun.style.setProperty('--x', `${position.x.toFixed(2)}%`);
    sun.style.setProperty('--y', `${position.y.toFixed(2)}%`);
    sun.style.setProperty('--era', era.color);
    sun.title = label;
    sun.setAttribute('aria-label', `Ère ${era.name}, ${formatYear(era.start)} à ${formatYear(era.end)}${isActive ? ', ère sélectionnée' : ''}`);
    if (isActive) sun.setAttribute('aria-current', 'true');
    sun.addEventListener('click', () => {
      focusMemory = `sun:${eraIndex}`;
      selectEra(eraIndex);
    });
    sunLayer.appendChild(sun);
  });

  /* Les planètes tournent autour du centre ; le trait part du soleil de l'ère active. */
  const planetRadius = clamp(14 + eraEvents.length * 1.8, 18, 34);
  let activePlanetPosition = sunAnchor;
  eraEvents.forEach((event, planetIndex) => {
    const globalIndex = globalIndexById.get(event.id) ?? 0;
    const isActive = globalIndex === state.eventIndex;
    const position = polar(50, 50, planetRadius, (planetIndex * 137.5) % 360);
    addLine(edges, sunAnchor, position, isActive);
    if (isActive) activePlanetPosition = position;

    const label = `${formatYear(event.year)} · ${event.title}`;
    const planet = el('button', `const-planet${isActive ? ' is-active' : ''}`, String(planetIndex + 1));
    planet.type = 'button';
    planet.dataset.constKey = `planet:${globalIndex}`;
    planet.dataset.label = label;
    planet.style.setProperty('--x', `${position.x.toFixed(2)}%`);
    planet.style.setProperty('--y', `${position.y.toFixed(2)}%`);
    planet.title = label;
    planet.setAttribute('aria-label', `Repère ${planetIndex + 1} : ${event.title}, ${formatYear(event.year)}${isActive ? ', repère sélectionné' : ''}`);
    if (isActive) planet.setAttribute('aria-current', 'true');
    planet.addEventListener('click', () => {
      focusMemory = `planet:${globalIndex}`;
      selectEvent(globalIndex);
    });
    planetLayer.appendChild(planet);
  });

  /* Les lunes sont les points vérifiés du repère actif (chantier 01). */
  points.forEach((point, index) => {
    const isActive = index === pointIndex;
    const position = polar(activePlanetPosition.x, activePlanetPosition.y, 9,
      (index * 360) / Math.max(1, points.length));
    addLine(edges, activePlanetPosition, position, isActive, 'moon');

    const sources = point.sources || [];
    const sourceText = sources.length
      ? `${sources.length} source${sources.length > 1 ? 's' : ''} locale${sources.length > 1 ? 's' : ''}`
      : 'aucune source associée';
    const label = `${point.kind}${sources.length ? ` · ${sources.length} src` : ''}`;
    const moon = el('button', `const-moon${isActive ? ' is-active' : ''}`);
    moon.type = 'button';
    moon.dataset.constKey = `moon:${index}`;
    moon.dataset.label = label;
    moon.style.setProperty('--x', `${position.x.toFixed(2)}%`);
    moon.style.setProperty('--y', `${position.y.toFixed(2)}%`);
    moon.title = `${point.kind} · confiance ${point.confidence} · ${sourceText}`;
    moon.setAttribute('aria-label', `Point ${index + 1} : ${point.kind}, confiance ${point.confidence}, ${sourceText}${isActive ? ', point sélectionné' : ''}`);
    if (isActive) moon.setAttribute('aria-current', 'true');
    moon.addEventListener('click', () => {
      focusMemory = `moon:${index}`;
      set({ pointIndex: index, detailOpen: true }, 'point');
    });
    moonLayer.appendChild(moon);
  });

  if (!eras.length) {
    field.appendChild(el('p', 'constellation-empty', 'Aucune ère définie pour ce pays : la constellation est vide.'));
  } else if (!eraEvents.length) {
    field.appendChild(el('p', 'constellation-empty', `Aucun repère dans l’ère ${activeEra.name}. Choisissez une autre ère ou revenez à la chronologie.`));
  }
  layout.appendChild(field);

  const caption = el('div', 'constellation-caption');
  const note = el('p', 'constellation-note',
    'Vue optionnelle figée : les positions sont déterministes et décoratives (angle 137,5°, rayon calculé depuis le nombre de repères) ; elles ne codent ni date, ni importance, ni lieu. La date figure dans l’étiquette et le détail. Les lunes sont les points vérifiés du repère, ouvrables dans le détail. Données locales, zéro appel réseau, aucune orbite animée. ← → changer de repère · ↑ ↓ changer d’ère · Entrée ouvrir le détail · Tab parcourir ères, repères et points.');
  note.id = NOTE_ID;
  caption.appendChild(note);
  const eraText = activeEra ? activeEra.name : '—';
  const eventText = activeEvent ? `${activeEvent.title} (${formatYear(activeEvent.year)})` : '—';
  const pointText = points.length ? `${pointIndex + 1} / ${points.length}` : 'aucun';
  caption.appendChild(el('p', 'constellation-state', `Ère : ${eraText} · Repère : ${eventText} · Point : ${pointText}`));
  const back = el('button', 'constellation-back', '← Chronologie');
  back.type = 'button';
  back.addEventListener('click', () => goView('chronology'));
  caption.appendChild(back);
  layout.appendChild(caption);

  stage.appendChild(layout);
  runEnhancements({ viewId: 'constellation', stage, layout });
  runEnhancementsV2({ viewId: 'constellationv2', stage, layout });

  /* Restauration du focus après le re-render complet du shell. */
  if (focusMemory && state.view === 'constellation' && !state.detailOpen && !state.helpOpen) {
    const target = Array.from(field.querySelectorAll('[data-const-key]'))
      .find((node) => node.dataset.constKey === focusMemory);
    if (target) target.focus({ preventScroll: true });
  }
}
