import { register } from './registry.js';
import { currentCountry } from '../../domain/store.js';

/* Lentille GÉOGRAPHIE E003 — échelle cartographique et barre d'échelle.
 *
 * Dix chantiers (E003-01..E003-10) réellement implémentés, appliqués à chaque
 * rendu de la vue géographie par `runEnhancements`. La vue de base est une
 * projection schématique : aucun tuile, aucun réseau, aucune coordonnée
 * inventée. Toutes les grandeurs affichées ici sont recalculées depuis les
 * bornes du pays (lecture seule de `currentCountry()`) et le `viewBox` réel du
 * SVG, observé sans jamais être modifié. Aucun appel à la console, aucun aléa,
 * une seule boucle rAF (barre animée) avec pause sur `document.hidden`.
 *
 * Lecture sans JS : la vue reste entièrement lisible et utilisable ; le module
 * n'ajoute que des compléments en texte sémantique (p, legend, summary, status)
 * et ne retire ni ne masque aucun contenu existant.
 */

const PFX = 'geography-e003';

/* Constantes miroir, documentées comme telles (risque de dérive) :
 * MAP_W/MAP_H = geography.js:10-11 ; formule de projection = geography.js:43-51. */
const MAP_W = 900;
const MAP_H = 620;
const KM_DEG_LAT = 110.574;      // km par degré de latitude (arc méridien moyen)
const KM_DEG_LON_EQ = 111.320;   // km par degré de longitude à l'équateur
const R_EARTH = 6371.0088;       // rayon terrestre moyen (UIA), km
const PX_MM = 0.28;              // pixel écran de référence OGC, millimètres
const KM_PER_MI = 1.609344;      // mile international
const BAR_TARGET_PX = 132;       // longueur visée pour la barre avant arrondi
const NICE = [1, 2, 5];
const GRID_STEPS = [10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005];
const SVG_NS = 'http://www.w3.org/2000/svg';

/* État de module : survit aux re-renders complets de la coque. */
let ctxRef = null;
let layoutRef = null;
let mapRef = null;
let svgRef = null;
let boundsRef = null;
let moRef = null;
let roRef = null;
let rafId = 0;
let lastFrame = 0;
let barPx = 0;
let barTarget = 0;
let unit = 'km';
let measuring = false;
let points = [];
let cursor = null;
let dom = {};

/* ---------- utilitaires déterministes (aucun aléa) ---------- */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function group(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

function dec(value, digits) {
  return value.toFixed(digits).replace('.', ',');
}

function fmtDistance(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 100) return group(Math.round(value));
  if (value >= 10) return dec(value, 0);
  if (value >= 1) return dec(value, 1);
  return dec(value, 2);
}

function fmtScale(value) {
  if (!Number.isFinite(value) || value <= 0) return '—';
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)) - 2);
  return group(Math.round(value / magnitude) * magnitude);
}

function fmtLat(lat) {
  return `${dec(Math.abs(lat), 2)}° ${lat >= 0 ? 'N' : 'S'}`;
}

function fmtLon(lon) {
  return `${dec(Math.abs(lon), 2)}° ${lon >= 0 ? 'E' : 'O'}`;
}

function svgNode(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  if (attrs) Object.keys(attrs).forEach((key) => node.setAttribute(key, String(attrs[key])));
  return node;
}

function reduced() {
  return Boolean(ctxRef && typeof ctxRef.reducedMotion === 'function' && ctxRef.reducedMotion());
}

/* ---------- géométrie et mesures ---------- */

function readBox() {
  const raw = svgRef && svgRef.getAttribute('viewBox');
  if (!raw) return null;
  const parts = raw.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((v) => !Number.isFinite(v)) || parts[2] <= 0 || parts[3] <= 0) return null;
  return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
}

/* E003-01 / E003-02 / E003-06 : toutes les grandeurs dérivent du viewBox et
 * des bornes réelles. `preserveAspectRatio="xMidYMid meet"` impose l'échelle
 * minimale des deux axes pour convertir unités de vue ↔ pixels CSS. */
function computeMetrics() {
  const box = readBox();
  if (!box || !boundsRef || !svgRef) return null;
  const rect = svgRef.getBoundingClientRect();
  const cssW = rect.width > 0 ? rect.width : svgRef.clientWidth;
  const cssH = rect.height > 0 ? rect.height : svgRef.clientHeight;
  if (!cssW || !cssH) return null;
  const spanLon = boundsRef.maxLon - boundsRef.minLon;
  const spanLat = boundsRef.maxLat - boundsRef.minLat;
  if (!(spanLon > 0 && spanLat > 0)) return null;
  const latMid = (boundsRef.minLat + boundsRef.maxLat) / 2;
  const kmPerUnitX = (spanLon / MAP_W) * KM_DEG_LON_EQ * Math.cos((latMid * Math.PI) / 180);
  const kmPerUnitY = (spanLat / MAP_H) * KM_DEG_LAT;
  if (!(kmPerUnitX > 0 && kmPerUnitY > 0)) return null;
  const pxPerUnit = Math.min(cssW / box.w, cssH / box.h);
  const kmPerPx = kmPerUnitX / pxPerUnit;
  return { box, cssW, cssH, pxPerUnit, spanLon, spanLat, latMid, kmPerUnitX, kmPerUnitY, kmPerPx };
}

/* Distance orthodromique (haversine) entre deux points lat/lon du jeu de données. */
function haversine(a, b) {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLon = (b.lon - a.lon) * toRad;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h = s1 * s1 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * s2 * s2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toLonLat(x, y) {
  if (!boundsRef) return null;
  return {
    lon: boundsRef.minLon + (x / MAP_W) * (boundsRef.maxLon - boundsRef.minLon),
    lat: boundsRef.maxLat - (y / MAP_H) * (boundsRef.maxLat - boundsRef.minLat),
  };
}

function niceDistance(target) {
  if (!(target > 0)) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(target)));
  let best = NICE[0];
  for (let i = 0; i < NICE.length; i += 1) {
    if (NICE[i] * power <= target) best = NICE[i] * power;
  }
  return best;
}

function clientToMap(clientX, clientY) {
  const box = readBox();
  if (!box || !svgRef) return null;
  const rect = svgRef.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const scale = Math.min(rect.width / box.w, rect.height / box.h);
  const offX = (rect.width - box.w * scale) / 2;
  const offY = (rect.height - box.h * scale) / 2;
  return {
    x: box.x + (clientX - rect.left - offX) / scale,
    y: box.y + (clientY - rect.top - offY) / scale,
  };
}

/* ---------- rendu ---------- */

function renderBar() {
  if (!dom.bar) return;
  dom.bar.style.width = `${Math.max(2, barPx).toFixed(1)}px`;
}

/* E003-09 : unique boucle rAF du module ; interpolatine la longueur de la
 * barre vers sa cible, s'arrête dès convergence et se met en pause à la
 * fermeture de l'onglet. `prefers-reduced-motion` court-circuite l'animation. */
function ensureRaf() {
  if (rafId || (typeof document !== 'undefined' && document.hidden)) return;
  if (reduced()) { barPx = barTarget; renderBar(); return; }
  lastFrame = 0;
  rafId = requestAnimationFrame(frame);
}

function frame(now) {
  rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) { lastFrame = 0; return; }
  const dt = lastFrame ? Math.min(64, now - lastFrame) : 16;
  lastFrame = now;
  barPx += (barTarget - barPx) * (1 - Math.exp(-dt / 90));
  if (Math.abs(barTarget - barPx) < 0.4) barPx = barTarget;
  renderBar();
  if (barPx !== barTarget) rafId = requestAnimationFrame(frame);
  else lastFrame = 0;
}

/* E003-05 : quadrillage de degrés, groupes SVG décoratifs et non bloquants.
 * Le pas est choisi dans une liste fixe pour rester lisible à chaque zoom. */
function drawGrid(m) {
  if (!dom.grid) return;
  while (dom.grid.firstChild) dom.grid.removeChild(dom.grid.firstChild);
  const spanLonVisible = m.box.w * (m.spanLon / MAP_W);
  const spanLatVisible = m.box.h * (m.spanLat / MAP_H);
  const spanDeg = Math.max(spanLonVisible, spanLatVisible);
  let step = GRID_STEPS[GRID_STEPS.length - 1];
  for (let i = 0; i < GRID_STEPS.length; i += 1) {
    if (spanDeg / GRID_STEPS[i] <= 6) { step = GRID_STEPS[i]; break; }
  }
  const leftLon = boundsRef.minLon + (m.box.x / MAP_W) * m.spanLon;
  const rightLon = boundsRef.minLon + ((m.box.x + m.box.w) / MAP_W) * m.spanLon;
  const topLat = boundsRef.maxLat - (m.box.y / MAP_H) * m.spanLat;
  const bottomLat = boundsRef.maxLat - ((m.box.y + m.box.h) / MAP_H) * m.spanLat;
  const i0 = Math.ceil(leftLon / step);
  const i1 = Math.floor(rightLon / step);
  const j0 = Math.ceil(bottomLat / step);
  const j1 = Math.floor(topLat / step);
  let drawn = 0;
  for (let i = i0; i <= i1 && drawn < 40; i += 1, drawn += 1) {
    const lon = i * step;
    const x = ((lon - boundsRef.minLon) / m.spanLon) * MAP_W;
    dom.grid.appendChild(svgNode('line', {
      x1: x.toFixed(2), y1: m.box.y.toFixed(2), x2: x.toFixed(2), y2: (m.box.y + m.box.h).toFixed(2),
      class: `${PFX}-grid-line`,
    }));
    const label = svgNode('text', { x: (x + 3).toFixed(2), y: (m.box.y + 11).toFixed(2), class: `${PFX}-grid-label` });
    label.textContent = `${dec(lon, 2)}°`;
    dom.grid.appendChild(label);
  }
  for (let j = j0; j <= j1 && drawn < 80; j += 1, drawn += 1) {
    const lat = j * step;
    const y = ((boundsRef.maxLat - lat) / m.spanLat) * MAP_H;
    dom.grid.appendChild(svgNode('line', {
      x1: m.box.x.toFixed(2), y1: y.toFixed(2), x2: (m.box.x + m.box.w).toFixed(2), y2: y.toFixed(2),
      class: `${PFX}-grid-line`,
    }));
    const label = svgNode('text', { x: (m.box.x + 4).toFixed(2), y: (y - 4).toFixed(2), class: `${PFX}-grid-label` });
    label.textContent = `${dec(lat, 2)}°`;
    dom.grid.appendChild(label);
  }
}

/* E003-04 : tracé du relevé, avec numéros texte (jamais la seule couleur). */
function renderMeasureLayer() {
  if (!dom.measureLayer) return;
  while (dom.measureLayer.firstChild) dom.measureLayer.removeChild(dom.measureLayer.firstChild);
  if (points.length === 2) {
    dom.measureLayer.appendChild(svgNode('line', {
      x1: points[0].x.toFixed(2), y1: points[0].y.toFixed(2),
      x2: points[1].x.toFixed(2), y2: points[1].y.toFixed(2),
      class: `${PFX}-measure-line`,
    }));
  }
  points.forEach((point, index) => {
    dom.measureLayer.appendChild(svgNode('circle', {
      cx: point.x.toFixed(2), cy: point.y.toFixed(2), r: '4', class: `${PFX}-measure-dot`,
    }));
    const label = svgNode('text', {
      x: (point.x + 7).toFixed(2), y: (point.y - 7).toFixed(2), class: `${PFX}-measure-label`,
    });
    label.textContent = String(index + 1);
    dom.measureLayer.appendChild(label);
  });
  if (measuring && cursor) {
    dom.measureLayer.appendChild(svgNode('line', {
      x1: (cursor.x - 9).toFixed(2), y1: cursor.y.toFixed(2),
      x2: (cursor.x + 9).toFixed(2), y2: cursor.y.toFixed(2), class: `${PFX}-cross`,
    }));
    dom.measureLayer.appendChild(svgNode('line', {
      x1: cursor.x.toFixed(2), y1: (cursor.y - 9).toFixed(2),
      x2: cursor.x.toFixed(2), y2: (cursor.y + 9).toFixed(2), class: `${PFX}-cross`,
    }));
  }
}

function recompute(animate) {
  const m = computeMetrics();
  if (!m || !dom.ratio) return;
  /* E003-02 : fraction representative. 0,28 mm = 2,8e-7 km ; N = km/px ÷ 2,8e-7. */
  const denominator = m.kmPerPx / (PX_MM / 1e6);
  dom.ratio.textContent = `Échelle numérique : 1 : ${fmtScale(denominator)} (pixel de référence ${dec(PX_MM, 2)} mm).`;
  /* E003-06 : honnêteté sur l'anisotropie de la projection schématique. */
  const ratio = m.kmPerUnitY / m.kmPerUnitX;
  dom.aniso.textContent = `1 unité de vue ≈ ${dec(m.kmPerUnitX, 2)} km est–ouest · ${dec(m.kmPerUnitY, 2)} km nord–sud (rapport ${dec(ratio, 2)}). Barre calibrée est–ouest.`;
  /* E003-01 + E003-03 : distance ronde dans l'unité choisie, puis longueur
   * pixels exacte pour cette distance au zoom courant. */
  const factor = unit === 'mi' ? KM_PER_MI : 1;
  const kmPerUnitHere = m.kmPerPx / factor;
  const target = niceDistance(BAR_TARGET_PX * kmPerUnitHere);
  barTarget = clamp(target / kmPerUnitHere, 8, Math.max(8, m.cssW - 24));
  dom.barEnd.textContent = `${fmtDistance(target)} ${unit}`;
  drawGrid(m);
  renderMeasureLayer();
  if (animate && !reduced()) ensureRaf();
  else { barPx = barTarget; renderBar(); }
}

/* ---------- interactions ---------- */

function placePoint(raw) {
  const box = readBox();
  if (!raw || !box || !boundsRef || !dom.readout) return;
  const point = {
    x: clamp(raw.x, box.x, box.x + box.w),
    y: clamp(raw.y, box.y, box.y + box.h),
  };
  const latlon = toLonLat(point.x, point.y);
  if (!latlon) return;
  const placed = { ...point, ...latlon };
  if (points.length >= 2) points = [];
  points.push(placed);
  if (points.length === 1) {
    dom.readout.textContent = `Point 1 : ${fmtLat(placed.lat)}, ${fmtLon(placed.lon)}. Posez le point 2.`;
  } else {
    const distance = haversine(points[0], points[1]);
    dom.readout.textContent = `Distance relevée : ${fmtDistance(distance)} km · point 1 (${fmtLat(points[0].lat)}, ${fmtLon(points[0].lon)}) → point 2 (${fmtLat(points[1].lat)}, ${fmtLon(points[1].lon)}).`;
  }
  renderMeasureLayer();
}

function setMeasuring(on) {
  measuring = on;
  if (dom.toggle) {
    dom.toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    dom.toggle.textContent = on ? 'Quitter le relevé' : 'Activer le relevé';
  }
  if (dom.measure) dom.measure.classList.toggle('is-active', on);
  if (on) {
    const box = readBox();
    cursor = box ? { x: box.x + box.w / 2, y: box.y + box.h / 2 } : null;
    if (dom.readout) dom.readout.textContent = 'Relevé actif : cliquez deux fois sur la carte, ou déplacez le curseur avec les flèches puis Entrée.';
  } else if (dom.readout && points.length < 2) {
    dom.readout.textContent = 'Relevé désactivé.';
  }
  renderMeasureLayer();
}

function onSvgClick(event) {
  if (!measuring) return;
  const raw = clientToMap(event.clientX, event.clientY);
  if (raw) placePoint(raw);
}

function onZoneKey(event) {
  if (!measuring || !dom.zone) return;
  const box = readBox();
  if (!box) return;
  if (!cursor) cursor = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  const stepX = box.w / 36;
  const stepY = box.h / 36;
  if (event.key === 'ArrowRight') cursor.x += stepX;
  else if (event.key === 'ArrowLeft') cursor.x -= stepX;
  else if (event.key === 'ArrowDown') cursor.y += stepY;
  else if (event.key === 'ArrowUp') cursor.y -= stepY;
  else if (event.key === 'Enter' || event.key === ' ') placePoint(cursor);
  else if (event.key === 'Backspace' || event.key === 'Delete') {
    points = [];
    if (dom.readout) dom.readout.textContent = 'Points effacés.';
  } else if (event.key === 'Escape') {
    setMeasuring(false);
    event.preventDefault();
    event.stopPropagation();
    return;
  } else return;
  cursor.x = clamp(cursor.x, box.x, box.x + box.w);
  cursor.y = clamp(cursor.y, box.y, box.y + box.h);
  event.preventDefault();
  event.stopPropagation();
  renderMeasureLayer();
}

function onToggle() { setMeasuring(!measuring); }

function onReset() {
  points = [];
  if (dom.readout) dom.readout.textContent = 'Points effacés.';
  renderMeasureLayer();
}

function onVisibility() {
  if (typeof document === 'undefined') return;
  if (document.hidden) {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    lastFrame = 0;
  } else if (barPx !== barTarget) ensureRaf();
}

function onResize() { recompute(true); }

function onSvgInteraction() { recompute(true); }

/* ---------- nettoyage entre deux rendus ---------- */

function teardown() {
  if (moRef) { try { moRef.disconnect(); } catch { /* observateur déjà mort */ } moRef = null; }
  if (roRef) { try { roRef.disconnect(); } catch { /* observateur déjà mort */ } roRef = null; }
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  lastFrame = 0;
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
  if (typeof window !== 'undefined') window.removeEventListener('resize', onResize);
  if (svgRef) {
    svgRef.removeEventListener('click', onSvgClick);
    svgRef.removeEventListener('wheel', onSvgInteraction);
    svgRef.removeEventListener('pointerup', onSvgInteraction);
  }
  if (dom.zone) dom.zone.removeEventListener('keydown', onZoneKey);
  if (dom.toggle) dom.toggle.removeEventListener('click', onToggle);
  if (dom.reset) dom.reset.removeEventListener('click', onReset);
  [mapRef, layoutRef, svgRef].forEach((root) => {
    if (!root) return;
    Array.from(root.querySelectorAll(`[id^="${PFX}-"]`)).forEach((node) => node.remove());
  });
  dom = {};
  svgRef = null;
  mapRef = null;
  layoutRef = null;
  boundsRef = null;
}

/* ---------- greffon ---------- */

register('E003', (ctx) => {
  ctxRef = ctx;
  const layout = ctx.layout;
  const el = ctx.el;
  if (!layout || typeof el !== 'function') return;

  ctx.css('geography-e003', `
  #geography-e003-scale, #geography-e003-measure, #geography-e003-compass{position:absolute;z-index:4;box-sizing:border-box}
  .geography-e003-card{padding:9px 11px;border:1px solid var(--line);border-radius:9px;background:rgba(8,12,18,.9);color:var(--ink);box-shadow:0 6px 18px rgba(0,0,0,.32);font:11px/1.45 inherit;font-variant-numeric:tabular-nums}
  #geography-e003-scale{left:16px;bottom:14px;max-width:min(300px,54%)}
  #geography-e003-measure{left:16px;top:14px;max-width:min(312px,56%)}
  #geography-e003-compass{right:16px;bottom:14px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 9px;border:1px solid var(--line);border-radius:9px;background:rgba(8,12,18,.9);color:var(--muted);font-size:9px;text-align:center}
  .geography-e003-head{margin:0 0 6px;color:var(--gold-bright);font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase}
  .geography-e003-bar{display:flex;height:9px;margin-top:2px;border:1px solid var(--ink-soft);border-radius:2px;overflow:hidden}
  .geography-e003-seg{flex:1 1 0;background:var(--ink)}
  .geography-e003-seg.is-alt{background:transparent}
  .geography-e003-bar-labels{display:flex;justify-content:space-between;margin-top:2px;color:var(--ink-soft);font-size:9px}
  .geography-e003-ratio,.geography-e003-aniso{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.4}
  .geography-e003-aniso{color:var(--muted-2);font-size:9px}
  .geography-e003-units{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:7px 0 0;padding:0;border:0}
  .geography-e003-units legend{float:left;margin-right:4px;padding:0;color:var(--muted);font-size:9px}
  .geography-e003-unit-label{display:inline-flex;align-items:center;gap:4px;min-height:36px;padding:0 7px;border:1px solid var(--line);border-radius:6px;color:var(--muted);font-size:10px;cursor:pointer}
  .geography-e003-unit-label input{width:16px;height:16px;accent-color:var(--gold)}
  .geography-e003-unit-label input:checked + span{color:var(--gold-bright);font-weight:600}
  .geography-e003-btn{min-height:36px;margin:0 6px 0 0;padding:5px 10px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--muted);font:inherit;font-size:10px;cursor:pointer}
  .geography-e003-btn[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.1)}
  .geography-e003-btn:hover{border-color:var(--gold)}
  .geography-e003-btn:focus-visible,.geography-e003-unit-label:focus-within,.geography-e003-zone:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  .geography-e003-zone{min-height:28px;margin-top:6px;padding:4px 6px;border:1px dashed var(--line);border-radius:6px;color:var(--muted-2);font-size:9px}
  .geography-e003-hint{margin:5px 0 0;color:var(--muted-2);font-size:9px;line-height:1.35}
  .geography-e003-readout{margin:6px 0 0;padding-top:6px;border-top:1px solid var(--line);color:var(--ink-soft);font-size:10px;line-height:1.45}
  #geography-e003-grid,#geography-e003-measure-layer{pointer-events:none}
  .geography-e003-grid-line{stroke:rgba(244,214,158,.17);stroke-width:.8;stroke-dasharray:3 5}
  .geography-e003-grid-label{fill:var(--muted-2);font-size:9px;paint-order:stroke;stroke:#070a0e;stroke-width:3}
  .geography-e003-measure-line{stroke:var(--gold-bright);stroke-width:1.6;stroke-dasharray:5 3}
  .geography-e003-measure-dot{fill:#070a0e;stroke:var(--gold-bright);stroke-width:1.6}
  .geography-e003-measure-label{fill:var(--gold-bright);font-size:10px;font-weight:700;paint-order:stroke;stroke:#070a0e;stroke-width:3}
  .geography-e003-cross{stroke:var(--blue,#8ab4f8);stroke-width:1.2}
  #geography-e003-note{margin-top:12px;padding-top:8px;border-top:1px solid var(--line)}
  #geography-e003-note summary{min-height:36px;display:flex;align-items:center;color:var(--gold-bright);font-size:10px;cursor:pointer}
  #geography-e003-note summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  #geography-e003-note p{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.55}
  @media (max-width:620px){
    #geography-e003-scale{left:8px;bottom:8px;max-width:64%;padding:7px 8px}
    #geography-e003-measure{left:8px;top:8px;max-width:70%;padding:7px 8px}
    #geography-e003-compass{right:8px;bottom:8px;padding:5px 6px}
    .geography-e003-aniso{display:none}
    .geography-e003-btn{min-height:40px}
  }
  @media (prefers-reduced-motion:reduce){.geography-e003-cross{stroke-width:1}}`);

  teardown();

  const map = layout.querySelector('.geo-map');
  const svg = layout.querySelector('svg.geo-svg');
  if (!map || !svg) return;
  layoutRef = layout;
  mapRef = map;
  svgRef = svg;
  try {
    const country = typeof currentCountry === 'function' ? currentCountry() : null;
    boundsRef = country && country.bounds ? country.bounds : null;
  } catch {
    boundsRef = null;
  }

  /* E003-01 / E003-02 / E003-03 : carte d'échelle ancrée en bas à gauche. */
  const scaleCard = el('div', 'geography-e003-card');
  scaleCard.id = 'geography-e003-scale';
  scaleCard.appendChild(el('p', 'geography-e003-head', 'Échelle cartographique'));
  const bar = el('div', 'geography-e003-bar');
  for (let i = 0; i < 4; i += 1) bar.appendChild(el('i', `geography-e003-seg${i % 2 ? ' is-alt' : ''}`));
  const barLabels = el('div', 'geography-e003-bar-labels');
  const barEnd = el('span', 'geography-e003-bar-end', '—');
  barLabels.append(el('span', '', '0'), barEnd);
  const ratio = el('p', 'geography-e003-ratio', 'Échelle indisponible.');
  const aniso = el('p', 'geography-e003-aniso', '');
  const units = el('fieldset', 'geography-e003-units');
  units.appendChild(el('legend', '', 'Unité'));
  [['km', 'km'], ['mi', 'mi']].forEach(([value, label]) => {
    const labelNode = el('label', 'geography-e003-unit-label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'geography-e003-unit';
    input.value = value;
    input.id = `geography-e003-unit-${value}`;
    input.checked = unit === value;
    input.addEventListener('change', () => { unit = value; recompute(true); });
    labelNode.append(input, el('span', '', label));
    units.appendChild(labelNode);
  });
  scaleCard.append(bar, barLabels, ratio, aniso, units);

  /* E003-04 / E003-10 : relevé de distance et annonce accessible. */
  const measureCard = el('div', 'geography-e003-card');
  measureCard.id = 'geography-e003-measure';
  const toggle = el('button', 'geography-e003-btn', 'Activer le relevé');
  toggle.type = 'button';
  toggle.id = 'geography-e003-measure-toggle';
  toggle.setAttribute('aria-pressed', 'false');
  toggle.setAttribute('aria-controls', 'geography-e003-readout');
  const reset = el('button', 'geography-e003-btn', 'Effacer les points');
  reset.type = 'button';
  reset.id = 'geography-e003-measure-reset';
  const zone = el('div', 'geography-e003-zone', 'Flèches : curseur · Entrée : poser · Échap : quitter');
  zone.id = 'geography-e003-zone';
  zone.tabIndex = 0;
  zone.setAttribute('role', 'group');
  zone.setAttribute('aria-label', 'Relevé de distance au clavier : flèches pour déplacer le curseur, Entrée pour poser un point, Échap pour quitter');
  const readout = el('p', 'geography-e003-readout', 'Aucun relevé.');
  readout.id = 'geography-e003-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  measureCard.append(
    el('p', 'geography-e003-head', 'Relevé de distance'),
    toggle, reset, zone,
    el('p', 'geography-e003-hint', 'Deux clics sur la carte mesurent la distance orthodromique entre les points.'),
    readout,
  );

  /* E003-06 : indication d'orientation textuelle (jamais la seule couleur). */
  const compass = el('div', '');
  compass.id = 'geography-e003-compass';
  compass.append(el('span', '', '↑ N'), el('span', '', 'haut = nord'));

  map.append(scaleCard, measureCard, compass);

  /* E003-08 : contenu pédagogique en texte sémantique, lisible sans JS. */
  const panel = layout.querySelector('.geo-panel');
  if (panel) {
    const note = el('details', '');
    note.id = 'geography-e003-note';
    note.appendChild(el('summary', '', 'Comment lire cette échelle'));
    note.appendChild(el('p', '', 'La barre est calibrée d’est en ouest à la latitude moyenne du pays : elle change de longueur au zoom, mais représente toujours la même distance au sol. Le rapport « 1 : N » suppose un pixel de 0,28 mm (référence d’écran OGC) ; la taille réelle de votre écran peut différer.'));
    note.appendChild(el('p', '', 'La projection est schématique et non conforme : les distances nord–sud et est–ouest n’ont pas le même rapport. Le relevé calcule une distance orthodromique depuis les coordonnées du jeu de données ; la barre reste une approximation locale.'));
    panel.appendChild(note);
  }

  /* Groupes SVG de surcouche : jamais modifiés par la vue hôte. */
  const grid = svgNode('g', { id: 'geography-e003-grid', 'aria-hidden': 'true' });
  const measureLayer = svgNode('g', { id: 'geography-e003-measure-layer', 'aria-hidden': 'true' });
  svg.append(grid, measureLayer);

  dom = {
    bar, barEnd, ratio, aniso, zone, toggle, reset, readout,
    grid, measureLayer, measure: measureCard,
  };

  /* E003-07 : observation du viewBox et des dimensions ; le module ne touche
   * jamais à l'état de zoom de la vue hôte, il ne fait que le refléter. */
  if (typeof MutationObserver !== 'undefined') {
    moRef = new MutationObserver((records) => {
      if (records.some((record) => record.attributeName === 'viewBox')) recompute(true);
    });
    moRef.observe(svg, { attributes: true, attributeFilter: ['viewBox'] });
  }
  if (typeof ResizeObserver !== 'undefined') {
    roRef = new ResizeObserver(onResize);
    roRef.observe(svg);
  } else if (typeof window !== 'undefined') {
    window.addEventListener('resize', onResize);
  }
  svg.addEventListener('wheel', onSvgInteraction);
  svg.addEventListener('pointerup', onSvgInteraction);
  svg.addEventListener('click', onSvgClick);
  zone.addEventListener('keydown', onZoneKey);
  toggle.addEventListener('click', onToggle);
  reset.addEventListener('click', onReset);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);

  /* Nouveau pays : on repart de zéro pour ne pas afficher un relevé obsolète. */
  points = [];
  cursor = null;
  measuring = false;
  toggle.textContent = 'Activer le relevé';
  toggle.setAttribute('aria-pressed', 'false');
  readout.textContent = 'Aucun relevé.';

  recompute(false);
});
