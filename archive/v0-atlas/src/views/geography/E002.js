import { register } from './registry.js';
import { currentCountry } from '../../domain/store.js';

/* Lentille E002 — Graticule : méridiens et parallèles.
 *
 * Surcouche locale de la vue Géographie. Les dix chantiers (E002-01 … E002-10)
 * sont décrits dans UNIFIED_AUDIT/GEOGRAPHIE/views/E002.md. Le graticule est
 * dérivé de l'emprise RÉELLE du pays (currentCountry().bounds), jamais d'une
 * valeur fabriquée : aucune latitude ni longitude n'est inventée. La carte
 * d'origine reste lisible et utilisable sans cette couche (surcouche seulement).
 *
 * Un seul register, un seul identifiant CSS, aucun console.*, aucun réseau,
 * aucun Math.random, une seule boucle rAF (arrêtée sur document.hidden et en
 * prefers-reduced-motion). Tous les identifiants DOM sont préfixés
 * `geography-e002-`. Français intégral.
 */

const CSS_ID = 'geography-e002';

const PANEL_ID = 'geography-e002-panel';
const TITLE_ID = 'geography-e002-title';
const STATUS_ID = 'geography-e002-status';
const READOUT_ID = 'geography-e002-readout';
const CURSOR_ID = 'geography-e002-cursor';
const NOTE_ID = 'geography-e002-note';
const TOGGLE_ID = 'geography-e002-toggle';
const DENSITY_ID = 'geography-e002-density';
const DENSITY_NORMAL_ID = 'geography-e002-density-normal';
const DENSITY_DENSE_ID = 'geography-e002-density-dense';
const LON_PREV_ID = 'geography-e002-lon-prev';
const LON_NEXT_ID = 'geography-e002-lon-next';
const LAT_PREV_ID = 'geography-e002-lat-prev';
const LAT_NEXT_ID = 'geography-e002-lat-next';

const LAYER_ID = 'geography-e002-layer';
const HIGH_LON_ID = 'geography-e002-high-lon';
const HIGH_LAT_ID = 'geography-e002-high-lat';

const MAP_W = 900;
const MAP_H = 620;
const REF_STEP = 15; /* graticule de référence : un trait tous les 15° */
const SVG_NS = 'http://www.w3.org/2000/svg';

/* État module : survit au `stage.replaceChildren()` de la coque (E002-10). */
const S = {
  visible: true,
  density: 'normal',       /* 'normal' | 'dense' : choix unique (radiogroup) */
  lonIndex: -1,
  latIndex: -1,
  bounds: null,
  boundsKey: '',
  lons: [],
  lats: [],
  stepLon: 1,
  stepLat: 1,
  nodes: null,
  listenersInstalled: false,
  raf: 0,
  reduced: false,
};

/* Feuille unique, injectée via ctx.css (garde d'id dans registry.js:13-19).
   Les méridiens et les parallèles se distinguent par la forme du trait
   (pointillé vs tireté) et par le texte, pas par la seule couleur. */
const CSS = `
.geo-layout .geography-e002-graticule{ pointer-events:none; }
.geo-layout .geography-e002-line{ fill:none; stroke:var(--gold,#e6b96f); stroke-width:.6; opacity:.32; }
.geo-layout .geography-e002-line.is-lon{ stroke-dasharray:2 6; }
.geo-layout .geography-e002-line.is-lat{ stroke-dasharray:8 5; }
.geo-layout .geography-e002-label{
  font:9px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  fill:var(--gold-bright,#f4d69e); paint-order:stroke;
  stroke:#070a0e; stroke-width:2.6px; stroke-linejoin:round; letter-spacing:.02em;
}
.geo-layout .geography-e002-label.is-lat{ fill:var(--ink-soft,#d7d1c6); }
.geo-layout .geography-e002-high{ fill:none; stroke:var(--gold-bright,#f4d69e); stroke-width:1.9; opacity:1; }
.geo-layout .geography-e002-high.is-lat{ stroke:#9fc7ff; stroke-dasharray:8 5; }
.geo-layout .geography-e002-layer.is-hidden .geography-e002-line,
.geo-layout .geography-e002-layer.is-hidden .geography-e002-label,
.geo-layout .geography-e002-layer.is-hidden .geography-e002-high{ display:none; }

.geo-panel .geography-e002-panel{
  position:sticky; bottom:0; z-index:4;
  margin:16px 0 0; padding:10px 11px;
  border:1px solid var(--line); border-radius:9px;
  background:rgba(8,11,16,.96); color:var(--ink-soft,#d7d1c6);
  font-size:11px; line-height:1.5;
}
.geo-panel .geography-e002-panel .e002-title{
  margin:0 0 6px; color:var(--gold-bright,#f4d69e);
  font-size:12px; font-weight:700; letter-spacing:.02em;
}
.geo-panel .geography-e002-panel p{ margin:0 0 7px; }
.geo-panel .geography-e002-panel .e002-status{ font-variant-numeric:tabular-nums; }
.geo-panel .geography-e002-panel .e002-readout,
.geo-panel .geography-e002-panel .e002-note{ font-size:10px; line-height:1.55; }
.geo-panel .geography-e002-panel .e002-readout strong{ color:var(--gold-bright,#f4d69e); font-variant-numeric:tabular-nums; }
.geo-panel .geography-e002-panel .e002-cursor{ color:var(--muted,#a8a198); font-size:10px; font-variant-numeric:tabular-nums; }
.geo-panel .geography-e002-panel .e002-row{ display:flex; flex-wrap:wrap; gap:6px; margin:0 0 7px; }
.geo-panel .geography-e002-panel .e002-btn{
  flex:1 1 auto; min-width:0; width:auto; min-height:36px; margin:0;
  padding:5px 8px; border:1px solid var(--line); border-radius:7px;
  background:var(--surface-2,#10151d); color:inherit; font:inherit;
  font-size:10px; cursor:pointer; touch-action:manipulation;
}
.geo-panel .geography-e002-panel .e002-btn:hover{ border-color:var(--gold); color:var(--gold-bright); }
.geo-panel .geography-e002-panel .e002-btn[aria-pressed="true"]{
  border-color:var(--gold); background:rgba(230,185,111,.16); color:var(--gold-bright);
}
.geo-panel .geography-e002-panel .e002-btn:focus-visible,
.geo-panel .geography-e002-panel input:focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e); outline-offset:2px;
}
.geo-panel .geography-e002-panel fieldset{
  margin:0 0 7px; padding:4px 8px 6px; border:1px solid var(--line); border-radius:7px;
}
.geo-panel .geography-e002-panel legend{ padding:0 4px; color:var(--gold,#e6b96f); font-size:10px; }
.geo-panel .geography-e002-panel .e002-choice{
  display:inline-flex; align-items:center; gap:5px; min-height:26px; margin-right:12px; font-size:10px;
}
.geo-panel .geography-e002-panel .e002-choice input{ width:18px; height:18px; accent-color:var(--gold,#e6b96f); }
@media (max-width:620px){
  .geo-panel .geography-e002-panel{ position:static; }
  .geo-panel .geography-e002-panel .e002-btn{ flex:1 1 44%; }
}
@media (forced-colors:active){
  .geo-layout .geography-e002-line,
  .geo-layout .geography-e002-high{ stroke:CanvasText !important; }
  .geo-panel .geography-e002-panel{ border:1px solid CanvasText; }
  .geo-panel .geography-e002-panel .e002-btn[aria-pressed="true"]{ outline:2px solid Highlight; }
}
`;

/* --- utilitaires déterministes (aucun aléa, aucune donnée fabriquée) ------ */

function svgEl(tag) {
  return document.createElementNS(SVG_NS, tag);
}

/* Virgule décimale française, pour un affichage indexable et lisible. */
function fr(value, digits) {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(digits).replace('.', ',');
}

function formatDegree(value, isLon) {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.abs(value);
  if (rounded === 0) return '0°';
  const hemisphere = isLon ? (value < 0 ? 'O' : 'E') : (value < 0 ? 'S' : 'N');
  return `${fr(rounded, rounded % 1 === 0 ? 0 : 1)}° ${hemisphere}`;
}

/* Pas de graticule choisi depuis l'étendue réelle, jamais au hasard. */
function chooseStep(span, dense) {
  const steps = [1, 2, 5, 10, 20, 30];
  const target = dense ? 10 : 5;
  let index = steps.length - 1;
  for (let i = 0; i < steps.length; i += 1) {
    if (span / steps[i] <= target) { index = i; break; }
  }
  while (index > 0 && span / steps[index] < 2) index -= 1; /* au moins deux traits */
  return steps[index];
}

/* Degrés multiples du pas tombant strictement dans l'emprise. */
function degreesBetween(min, max, step) {
  const out = [];
  const first = Math.ceil((min + 1e-9) / step) * step;
  for (let value = first; value <= max - 1e-9 && out.length < 16; value += step) {
    out.push(Math.round(value * 1e6) / 1e6);
  }
  return out;
}

/* Projection identique à geography.js:34-44 (mêmes constantes 900×620). */
const projectLon = (lon, bounds) => ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * MAP_W;
const projectLat = (lat, bounds) => ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * MAP_H;

function validBounds(bounds) {
  if (!bounds) return false;
  return [bounds.minLon, bounds.maxLon, bounds.minLat, bounds.maxLat]
    .every((n) => Number.isFinite(n))
    && bounds.maxLon > bounds.minLon && bounds.maxLat > bounds.minLat;
}

/* --- E002-01 / E002-02 : tracé du graticule et étiquettes de degrés -------- */

function buildGraticule(ctx, bounds) {
  const svg = ctx.layout && ctx.layout.querySelector
    ? ctx.layout.querySelector('.geo-svg') : null;
  if (!svg || !validBounds(bounds)) return null;

  /* Idempotence (E002-10) : le groupe vivant est retiré avant d'être recreé. */
  const previous = svg.querySelector(`#${LAYER_ID}`);
  if (previous) previous.remove();

  const layer = svgEl('g');
  layer.setAttribute('id', LAYER_ID);
  layer.setAttribute('class', 'geography-e002-layer');
  layer.setAttribute('role', 'group');
  layer.setAttribute('aria-label', 'Graticule : méridiens et parallèles calculés depuis l’emprise du pays');

  S.stepLon = chooseStep(bounds.maxLon - bounds.minLon, S.density === 'dense');
  S.stepLat = chooseStep(bounds.maxLat - bounds.minLat, S.density === 'dense');
  S.lons = degreesBetween(bounds.minLon, bounds.maxLon, S.stepLon);
  S.lats = degreesBetween(bounds.minLat, bounds.maxLat, S.stepLat);

  S.lons.forEach((lon) => {
    const x = projectLon(lon, bounds);
    const line = svgEl('line');
    line.setAttribute('class', 'geography-e002-line is-lon');
    line.setAttribute('x1', x.toFixed(2)); line.setAttribute('y1', '0');
    line.setAttribute('x2', x.toFixed(2)); line.setAttribute('y2', String(MAP_H));
    const label = svgEl('text');
    label.setAttribute('class', 'geography-e002-label is-lon');
    label.setAttribute('x', x.toFixed(2)); label.setAttribute('y', '12');
    label.setAttribute('text-anchor', 'middle');
    label.textContent = formatDegree(lon, true);
    layer.append(line, label);
  });

  S.lats.forEach((lat) => {
    const y = projectLat(lat, bounds);
    const line = svgEl('line');
    line.setAttribute('class', 'geography-e002-line is-lat');
    line.setAttribute('x1', '0'); line.setAttribute('y1', y.toFixed(2));
    line.setAttribute('x2', String(MAP_W)); line.setAttribute('y2', y.toFixed(2));
    const label = svgEl('text');
    label.setAttribute('class', 'geography-e002-label is-lat');
    label.setAttribute('x', '6'); label.setAttribute('y', (y - 4).toFixed(2));
    label.textContent = formatDegree(lat, false);
    layer.append(line, label);
  });

  /* E002-05 : les deux traits sélectionnés sont des nœuds stables et nommés. */
  const highLon = svgEl('line');
  highLon.setAttribute('id', HIGH_LON_ID);
  highLon.setAttribute('class', 'geography-e002-high is-lon');
  const highLat = svgEl('line');
  highLat.setAttribute('id', HIGH_LAT_ID);
  highLat.setAttribute('class', 'geography-e002-high is-lat');
  layer.append(highLon, highLat);

  /* Derrière les marqueurs, devant le contour : les traits restent visibles
     sans jamais intercepter un clic (pointer-events:none en CSS). */
  const markers = svg.querySelector('.geo-marker');
  const path = svg.querySelector('.geo-path');
  const anchor = path || markers || null;
  if (anchor) svg.insertBefore(layer, anchor);
  else svg.appendChild(layer);
  return layer;
}

/* --- E002-05 : sélection d'un méridien / d'un parallèle ------------------- */

function clampIndex(index, length) {
  if (length <= 0) return -1;
  return ((index % length) + length) % length;
}

function updateHighlight() {
  const hiLon = document.getElementById(HIGH_LON_ID);
  const hiLat = document.getElementById(HIGH_LAT_ID);
  const iLon = clampIndex(S.lonIndex, S.lons.length);
  const iLat = clampIndex(S.latIndex, S.lats.length);
  S.lonIndex = iLon; S.latIndex = iLat;
  if (hiLon) {
    const on = iLon >= 0;
    const x = on ? projectLon(S.lons[iLon], S.bounds).toFixed(2) : '0';
    hiLon.setAttribute('x1', x); hiLon.setAttribute('x2', x);
    hiLon.setAttribute('y1', '0'); hiLon.setAttribute('y2', String(MAP_H));
    hiLon.style.display = on ? '' : 'none';
  }
  if (hiLat) {
    const on = iLat >= 0;
    const y = on ? projectLat(S.lats[iLat], S.bounds).toFixed(2) : '0';
    hiLat.setAttribute('x1', '0'); hiLat.setAttribute('x2', String(MAP_W));
    hiLat.setAttribute('y1', y); hiLat.setAttribute('y2', y);
    hiLat.style.display = on ? '' : 'none';
  }
}

/* --- E002-06 : coordonnées du pointeur, converties sans réseau ------------ */

function mapPointFromEvent(svg, event) {
  try {
    if (!svg.createSVGPoint || !svg.getScreenCTM) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    /* L'inverse de la matrice tient compte du viewBox courant (zoom/pan). */
    return point.matrixTransform(ctm.inverse());
  } catch {
    return null;
  }
}

function toLatLon(x, y, bounds) {
  return {
    lon: bounds.minLon + (x / MAP_W) * (bounds.maxLon - bounds.minLon),
    lat: bounds.maxLat - (y / MAP_H) * (bounds.maxLat - bounds.minLat),
  };
}

function describe(point) {
  return `${formatDegree(point.lat, false)} · ${formatDegree(point.lon, true)}`;
}

/* --- E002-07 : une seule boucle rAF, pulsation du trait sélectionné -------- */

function stopPulse() {
  if (S.raf) {
    try { cancelAnimationFrame(S.raf); } catch { /* environnement sans rAF */ }
    S.raf = 0;
  }
  const hiLon = document.getElementById(HIGH_LON_ID);
  const hiLat = document.getElementById(HIGH_LAT_ID);
  if (hiLon) hiLon.style.opacity = '1';
  if (hiLat) hiLat.style.opacity = '1';
}

function frame(time) {
  S.raf = 0;
  if (document.hidden || S.reduced || !S.visible) { stopPulse(); return; }
  /* Sinus déterministe : aucune graine, aucun Math.random. */
  const opacity = (0.62 + 0.3 * Math.sin(time / 460)).toFixed(3);
  const hiLon = document.getElementById(HIGH_LON_ID);
  const hiLat = document.getElementById(HIGH_LAT_ID);
  if (hiLon) hiLon.style.opacity = opacity;
  if (hiLat) hiLat.style.opacity = opacity;
  S.raf = requestAnimationFrame(frame);
}

function syncPulse() {
  if (S.reduced || !S.visible || document.hidden || typeof requestAnimationFrame !== 'function') {
    stopPulse(); return;
  }
  if (!S.raf) S.raf = requestAnimationFrame(frame);
}

/* --- E002-08 / E002-09 : mesures affichées et explication indexable ------- */

function fillMeasurements(readout, bounds) {
  if (!readout) return;
  readout.textContent = '';
  if (!validBounds(bounds)) {
    readout.appendChild(document.createTextNode(
      'Mesures indisponibles : l’emprise géographique du pays n’est pas renseignée.'
    ));
    return;
  }
  const spanLon = bounds.maxLon - bounds.minLon;
  const spanLat = bounds.maxLat - bounds.minLat;
  const ratio = REF_STEP / Math.min(S.stepLon, S.stepLat);

  const strong = (text) => {
    const node = document.createElement('strong');
    node.textContent = text;
    return node;
  };
  readout.appendChild(document.createTextNode('Emprise réelle : '));
  readout.appendChild(strong(`${fr(spanLon, 1)}° de longitude`));
  readout.appendChild(document.createTextNode(' × '));
  readout.appendChild(strong(`${fr(spanLat, 1)}° de latitude`));
  readout.appendChild(document.createTextNode(' · traits : '));
  readout.appendChild(strong(`${S.lons.length} méridiens`));
  readout.appendChild(document.createTextNode(' et '));
  readout.appendChild(strong(`${S.lats.length} parallèles`));
  readout.appendChild(document.createTextNode(' · pas '));
  readout.appendChild(strong(`${S.stepLon}° / ${S.stepLat}°`));
  readout.appendChild(document.createTextNode(' contre '));
  readout.appendChild(strong(`${REF_STEP}°`));
  readout.appendChild(document.createTextNode(' de référence, soit '));
  readout.appendChild(strong(`${fr(ratio, 1)}× plus serré`));
  readout.appendChild(document.createTextNode(' (valeurs calculées, sans aléa).'));
}

/* --- panneau (réutilisé entre les rendus, E002-10) ------------------------ */

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function buildPanel(ctx) {
  let panel = document.getElementById(PANEL_ID);
  /* Un panneau d'un rendu précédent peut encore être « connecté » ailleurs :
     on ne le réutilise que s'il appartient au contexte courant (E002-10). */
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    return {
      panel,
      status: document.getElementById(STATUS_ID),
      readout: document.getElementById(READOUT_ID),
      cursor: document.getElementById(CURSOR_ID),
      toggle: document.getElementById(TOGGLE_ID),
      normal: document.getElementById(DENSITY_NORMAL_ID),
      dense: document.getElementById(DENSITY_DENSE_ID),
      lonPrev: document.getElementById(LON_PREV_ID),
      lonNext: document.getElementById(LON_NEXT_ID),
      latPrev: document.getElementById(LAT_PREV_ID),
      latNext: document.getElementById(LAT_NEXT_ID),
      fresh: false,
    };
  }

  panel = ctx.el('section', 'geography-e002-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', 'e002-title', 'Graticule · méridiens et parallèles');
  title.id = TITLE_ID;

  /* E002-04 : bascule indépendante → aria-pressed licite. */
  const toggle = ctx.el('button', 'e002-btn');
  toggle.type = 'button';
  toggle.id = TOGGLE_ID;

  /* E002-03 : choix unique → radiogroup, pas aria-pressed. */
  const density = ctx.el('fieldset', 'e002-density');
  density.id = DENSITY_ID;
  density.appendChild(ctx.el('legend', '', 'Densité du graticule'));
  const normalLabel = ctx.el('label', 'e002-choice');
  const normal = document.createElement('input');
  normal.type = 'radio'; normal.name = 'geography-e002-density';
  normal.id = DENSITY_NORMAL_ID; normal.value = 'normal';
  normalLabel.append(normal, document.createTextNode(' Clair'));
  const denseLabel = ctx.el('label', 'e002-choice');
  const dense = document.createElement('input');
  dense.type = 'radio'; dense.name = 'geography-e002-density';
  dense.id = DENSITY_DENSE_ID; dense.value = 'dense';
  denseLabel.append(dense, document.createTextNode(' Dense'));
  density.append(normalLabel, denseLabel);

  /* E002-05 : quatre pouces nommés, cibles ≥ 36 px. */
  const row = ctx.el('div', 'e002-row');
  const stepper = (id, label) => {
    const button = ctx.el('button', 'e002-btn', label);
    button.type = 'button';
    button.id = id;
    return button;
  };
  const lonPrev = stepper(LON_PREV_ID, '◀ Méridien');
  const lonNext = stepper(LON_NEXT_ID, 'Méridien ▶');
  const latPrev = stepper(LAT_PREV_ID, '◀ Parallèle');
  const latNext = stepper(LAT_NEXT_ID, 'Parallèle ▶');
  row.append(lonPrev, lonNext, latPrev, latNext);

  const cursor = ctx.el('p', 'e002-cursor', 'Survolez la carte pour lire ses coordonnées.');
  cursor.id = CURSOR_ID;

  /* Un seul canal vocal dans cette surcouche (E002-05 / E002-06). */
  const readout = ctx.el('p', 'e002-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* E002-08 : mesures chiffrées, séparées de l'annonce de sélection. */
  const status = ctx.el('p', 'e002-status');
  status.id = STATUS_ID;

  /* E002-09 : texte réel, indexable, compréhensible sans le dessin. */
  const note = ctx.el('p', 'e002-note',
    'Un méridien relie les pôles et porte une longitude (Est/Ouest) ; un parallèle '
    + 'suit une latitude (Nord/Sud). Le graticule est calculé depuis l’emprise réelle '
    + 'du pays : aucune coordonnée n’est inventée. La carte reste lisible si cette '
    + 'surcouche est désactivée.');
  note.id = NOTE_ID;

  panel.append(title, toggle, density, row, cursor, readout, status, note);
  const host = ctx.layout && ctx.layout.querySelector
    ? (ctx.layout.querySelector('.geo-panel') || ctx.stage) : ctx.stage;
  host.appendChild(panel);

  return {
    panel, status, readout, cursor, toggle, normal, dense,
    lonPrev, lonNext, latPrev, latNext, fresh: true,
  };
}

/* --- application de l'état et mise à jour textuelle ---------------------- */

function applyState(ctx) {
  const n = S.nodes;
  const layer = document.getElementById(LAYER_ID);
  if (!n) return;

  if (layer) layer.classList.toggle('is-hidden', !S.visible);

  if (n.toggle) {
    const label = S.visible ? 'Masquer le graticule' : 'Afficher le graticule';
    n.toggle.textContent = label;
    n.toggle.setAttribute('aria-pressed', String(S.visible));
    n.toggle.setAttribute('aria-label', `${label}. Bascule indépendante du graticule de la vue Géographie.`);
    n.toggle.dataset.fk = 'geography-e002-toggle';
  }
  if (n.normal) n.normal.checked = S.density === 'normal';
  if (n.dense) n.dense.checked = S.density === 'dense';

  const iLon = clampIndex(S.lonIndex, S.lons.length);
  const iLat = clampIndex(S.latIndex, S.lats.length);
  if (n.lonPrev) n.lonPrev.setAttribute('aria-label', 'Méridien précédent');
  if (n.lonNext) n.lonNext.setAttribute('aria-label', 'Méridien suivant');
  if (n.latPrev) n.latPrev.setAttribute('aria-label', 'Parallèle précédent');
  if (n.latNext) n.latNext.setAttribute('aria-label', 'Parallèle suivant');

  if (n.status) {
    n.status.textContent = `Affichage : ${S.visible ? 'activé' : 'masqué'} · densité : `
      + `${S.density === 'dense' ? 'dense' : 'clair'} · méridien : `
      + `${iLon >= 0 ? formatDegree(S.lons[iLon], true) : '—'} · parallèle : `
      + `${iLat >= 0 ? formatDegree(S.lats[iLat], false) : '—'} · origine des degrés : emprise du pays.`;
  }
  fillMeasurements(n.readout, S.bounds);
  void ctx; /* ctx conservé dans la signature pour les futurs ajustements locaux */
}

function announceSelection() {
  const n = S.nodes;
  if (!n || !n.readout || !validBounds(S.bounds)) return;
  const iLon = clampIndex(S.lonIndex, S.lons.length);
  const iLat = clampIndex(S.latIndex, S.lats.length);
  const lon = iLon >= 0 ? formatDegree(S.lons[iLon], true) : '—';
  const lat = iLat >= 0 ? formatDegree(S.lats[iLat], false) : '—';
  n.readout.textContent = `Intersection sélectionnée : ${lat}, ${lon}.`;
}

/* --- E002-07 / E002-10 : écouteurs uniques et cycle de vie --------------- */

/* Les contrôles du panneau sont reconstruits à chaque rendu de la coque :
   on ne les relie qu'à leur toute première apparition (nœud `fresh`). */
function wirePanel(ctx) {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  if (n.toggle) n.toggle.addEventListener('click', () => {
    S.visible = !S.visible;
    applyState(ctx);
    syncPulse();
  });
  if (n.normal) n.normal.addEventListener('change', () => {
    if (!n.normal.checked) return;
    S.density = 'normal';
    rebuild(ctx);
  });
  if (n.dense) n.dense.addEventListener('change', () => {
    if (!n.dense.checked) return;
    S.density = 'dense';
    rebuild(ctx);
  });
  const stepLon = (delta) => {
    if (!S.lons.length) return;
    S.lonIndex = clampIndex(S.lonIndex + delta, S.lons.length);
    updateHighlight(); applyState(ctx); announceSelection();
  };
  const stepLat = (delta) => {
    if (!S.lats.length) return;
    S.latIndex = clampIndex(S.latIndex + delta, S.lats.length);
    updateHighlight(); applyState(ctx); announceSelection();
  };
  if (n.lonPrev) n.lonPrev.addEventListener('click', () => stepLon(-1));
  if (n.lonNext) n.lonNext.addEventListener('click', () => stepLon(1));
  if (n.latPrev) n.latPrev.addEventListener('click', () => stepLat(-1));
  if (n.latNext) n.latNext.addEventListener('click', () => stepLat(1));
}

/* Le SVG est lui aussi recréé à chaque rendu : marqueur d'identification
   sur le nœud vivant, pour ne jamais empiler deux fois les mêmes écouteurs. */
function wireMap(ctx) {
  const svg = ctx.layout && ctx.layout.querySelector
    ? ctx.layout.querySelector('.geo-svg') : null;
  if (!svg || svg.dataset.geographyE002Wired === '1') return;
  svg.dataset.geographyE002Wired = '1';

  /* E002-06 : survol non vocal (évite le spam lecteur d'écran) ; clic = annonce. */
  svg.addEventListener('pointermove', (event) => {
    if (!validBounds(S.bounds) || !S.nodes || !S.nodes.cursor) return;
    const point = mapPointFromEvent(svg, event);
    if (!point) return;
    const latlon = toLatLon(point.x, point.y, S.bounds);
    S.nodes.cursor.textContent = `Sous le pointeur : ${describe(latlon)}.`;
  });
  svg.addEventListener('click', (event) => {
    if (!validBounds(S.bounds) || !S.nodes || !S.nodes.readout) return;
    const point = mapPointFromEvent(svg, event);
    if (!point) return;
    S.nodes.readout.textContent = `Point de la carte : ${describe(toLatLon(point.x, point.y, S.bounds))}.`;
  });
}

/* Une seule fois par session : visibilité et préférence de mouvement. */
function installGlobalListeners() {
  if (S.listenersInstalled) return;
  S.listenersInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPulse(); else syncPulse();
  });
  try {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event) => {
      S.reduced = !!(event && event.matches);
      syncPulse();
    };
    if (query.addEventListener) query.addEventListener('change', onChange);
    else if (query.addListener) query.addListener(onChange);
  } catch { /* préférence indisponible : la pulsation reste réversible */ }
}

function rebuild(ctx) {
  const country = currentCountry(); /* lecture seule, aucun écriture dans le store */
  const bounds = country && validBounds(country.bounds) ? country.bounds : null;
  const key = bounds ? JSON.stringify(bounds) : '';
  S.bounds = bounds;
  const countryChanged = key !== S.boundsKey;
  S.boundsKey = key;

  buildGraticule(ctx, bounds);
  if (countryChanged) {
    /* Nouvelle emprise : centre de la plage, indices toujours bornés (E002-10). */
    S.lonIndex = S.lons.length ? Math.floor(S.lons.length / 2) : -1;
    S.latIndex = S.lats.length ? Math.floor(S.lats.length / 2) : -1;
  } else {
    S.lonIndex = clampIndex(S.lonIndex, S.lons.length);
    S.latIndex = clampIndex(S.latIndex, S.lats.length);
  }
  updateHighlight();
  applyState(ctx);
  syncPulse();
}

/* --- point d'entrée unique ------------------------------------------------ */

register('E002', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }

  S.nodes = buildPanel(ctx);
  rebuild(ctx);
  wirePanel(ctx);
  wireMap(ctx);
  installGlobalListeners();
});

/* E002-10 : le panneau et le SVG sont réutilisés s'ils sont encore vivants ;
   sinon ils sont reconstruits sans dupliquer ids, régions live ni écouteurs. */
