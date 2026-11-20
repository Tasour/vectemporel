import { register } from './registry.js';

/* Lentille V2 E006 — Laboratoire de lecture géodésique WGS 84.
 *
 * Seconde passe sur le référentiel et les coordonnées géodésiques. Dix
 * chantiers inédits (E006-01 … E006-10), tous réellement implémentés : aucun
 * stub, aucune fonction vide. Là où la passe 1 déposait une fiche de lecture
 * dans le panneau, cette lentille construit un laboratoire autonome : une
 * coupe méridienne de l'ellipsoïde dessinée sur canvas à partir de formules
 * déterministes, un radiogroupe pour choisir le modèle de Terre, un curseur de
 * latitude, un tableau de grandeurs et une annonce accessible.
 *
 * Contraintes : un seul import, un seul register, une seule feuille de styles
 * `geography-v2-e006`, tous les identifiants préfixés `geography-v2-e006-`,
 * zéro journalisation, zéro requête réseau, aucune source d'aléa, zéro écriture
 * HTML brute, au plus une requête d'animation en vol avec pause sur
 * document.hidden et respect de ctx.reducedMotion(). Le texte est sémantique
 * (h2, p, fieldset, legend, label, table, details) et reste indexable :
 * le canvas n'est qu'un complément visuel, jamais le seul support d'une info.
 *
 * Les nombres sont des CONSTANTES NORMATIVES (WGS 84 / GRS 80, NIMA TM 8350.2)
 * et des grandeurs recalculées à chaque interaction depuis les formules :
 * N = a/√(1 − e² sin²φ), M = a(1 − e²)/(1 − e² sin²φ)^(3/2),
 * θ = atan((1 − f)² tan φ), e² = f(2 − f). Aucune altitude, aucune grille
 * géoïdale et aucune transformation de datum n'est inventée.
 */

const PFX = 'geography-v2-e006';
const CSS_ID = 'geography-v2-e006';

/* ---- Constantes normatives WGS 84 / GRS 80 ------------------------------- */
const A = 6378137;                  // demi-grand axe équatorial, mètres
const F = 1 / 298.257223563;       // aplatissement normatif
const E2 = F * (2 - F);             // excentricité au carré, dérivée de f
const B = A * (1 - F);              // demi-petit axe polaire, mètres (dérivé)
const RAD = Math.PI / 180;
const ARC = 180 / Math.PI;
const NARROW = '\u202f';            // espace insécable fine
const MINUS = '\u2212';             // signe moins typographique

/* Amplitude du laboratoire. L'aplatissement réel (≈ 1/298) est imperceptible
   à l'écran : il est amplifié ×25 sur le dessin uniquement, et cette
   amplification est annoncée en toutes lettres dans le canvas et le texte. */
const EXAG = 25;
const MIN_LAT = -89.9;
const MAX_LAT = 89.9;
const DEFAULT_LAT = 48.857;
const CANVAS_W = 340;
const CANVAS_H = 176;

/* État de module : survit aux re-renders complets de la coque. */
let ctxRef = null;
let layoutRef = null;
let rafId = 0;
let lastFrame = 0;
let targetLat = DEFAULT_LAT;
let shownLat = DEFAULT_LAT;
let model = 'ellipsoid';            // 'ellipsoid' | 'sphere'
let targetMinor = A - (A - B) * EXAG;
let shownMinor = targetMinor;
let dom = {};
let listeners = [];

/* ---------- utilitaires déterministes (aucun aléa) ---------- */

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function group(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
}

function dec(value, digits) {
  if (!finite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  return `${value < 0 ? MINUS : ''}${fixed.replace('.', ',')}`;
}

function fmt(value) {
  if (!finite(value)) return '—';
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3;
  const parts = dec(value, digits).split(',');
  return `${group(parts[0])}${parts[1] ? `,${parts[1]}` : ''}`;
}

/* Degrés décimaux → degrés, minutes, secondes + hémisphère. */
function dms(value, positive, negative) {
  if (!finite(value)) return '—';
  const hemisphere = value < 0 ? negative : positive;
  const absolute = Math.abs(value);
  let degrees = Math.floor(absolute);
  let minutesFloat = (absolute - degrees) * 60;
  let minutes = Math.floor(minutesFloat);
  let seconds = Math.round((minutesFloat - minutes) * 600) / 10;
  if (seconds >= 60) { seconds = 0; minutes += 1; }
  if (minutes >= 60) { minutes = 0; degrees += 1; }
  return `${degrees}° ${String(minutes).padStart(2, '0')}′ ${seconds.toFixed(1).replace('.', ',').padStart(4, '0')}″ ${hemisphere}`;
}

function reduced() {
  return Boolean(ctxRef && typeof ctxRef.reducedMotion === 'function' && ctxRef.reducedMotion());
}

function on(node, type, fn) {
  if (!node || typeof node.addEventListener !== 'function') return;
  node.addEventListener(type, fn);
  listeners.push({ node, type, fn });
}

/* ---------- formules géodésiques (E006-05, E006-07, E006-08) ---------- */

function metrics(latDeg, which) {
  const choice = which || model;
  const sin = Math.sin(latDeg * RAD);
  const cos = Math.cos(latDeg * RAD);
  if (choice === 'sphere') {
    /* Sur une sphère, M = N = a et la normale passe par le centre : θ = φ.
       Le degré de longitude dépend tout de même de cos φ. */
    const degree = A * RAD;
    return {
      N: A, M: A, theta: latDeg, gapDeg: 0, gapMetres: 0,
      degLat: degree, degLon: degree * cos,
    };
  }
  const denominator = Math.sqrt(1 - E2 * sin * sin);
  const N = A / denominator;                              // rayon vertical
  const M = (A * (1 - E2)) / (denominator ** 3);          // rayon méridien
  const theta = Math.atan((1 - F) * (1 - F) * Math.tan(latDeg * RAD)) * ARC;
  const gapDeg = latDeg - theta;
  return {
    N,
    M,
    theta,
    gapDeg,
    gapMetres: Math.abs(gapDeg) * M * RAD,
    degLat: M * RAD,
    degLon: N * cos * RAD,
  };
}

function minorFor(choice) {
  return choice === 'sphere' ? A : A - (A - B) * EXAG;
}

/* ---------- dessin du laboratoire (E006-04 : formules déterministes) ---------- */

function drawCanvas() {
  const canvas = dom.canvas;
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const pxW = Math.round(CANVAS_W * dpr);
  const pxH = Math.round(CANVAS_H * dpr);
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }
  const g = canvas.getContext('2d');
  if (!g || typeof g.setTransform !== 'function') return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, CANVAS_W, CANVAS_H);

  const cx = CANVAS_W / 2;
  const cy = 94;
  const rx = 132;
  const ry = rx * (shownMinor / A);

  /* Fond. */
  g.fillStyle = 'rgba(8,12,18,0.55)';
  g.fillRect(0, 0, CANVAS_W, CANVAS_H);

  /* Axes équatorial et polaire, en pointillés (jamais portés par la couleur). */
  g.setLineDash([4, 4]);
  g.strokeStyle = 'rgba(214,224,236,0.28)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cx - rx - 10, cy);
  g.lineTo(cx + rx + 10, cy);
  g.moveTo(cx, cy - ry - 10);
  g.lineTo(cx, cy + ry + 10);
  g.stroke();
  g.setLineDash([]);

  /* Coupe méridienne : x = a·cos t, y = b'·sin t, 180 segments (polyligne
     déterministe, aucune API de courbe non garantie). */
  g.strokeStyle = 'rgba(214,224,236,0.72)';
  g.lineWidth = 1.5;
  g.beginPath();
  for (let i = 0; i <= 180; i += 1) {
    const t = (i * 2 * Math.PI) / 180;
    const x = cx + rx * Math.cos(t);
    const y = cy - ry * Math.sin(t);
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.stroke();

  /* Point de latitude φ : X = N cos φ, Y = N(1 − e²) sin φ sur l'ellipsoïde,
     puis angle paramétrique t = atan2(Y/b, X/a) reporté sur le dessin. */
  const m = metrics(shownLat, model);
  const trueMinor = model === 'sphere' ? A : B;
  const X = m.N * Math.cos(shownLat * RAD);
  const Y = model === 'sphere'
    ? A * Math.sin(shownLat * RAD)
    : m.N * (1 - E2) * Math.sin(shownLat * RAD);
  const t = Math.atan2(Y / trueMinor, X / A);
  const px = cx + rx * Math.cos(t);
  const py = cy - ry * Math.sin(t);

  /* Rayon géocentrique (centre → point), en pointillés. */
  g.setLineDash([3, 3]);
  g.strokeStyle = 'rgba(214,224,236,0.55)';
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(px, py);
  g.stroke();
  g.setLineDash([]);

  /* Normale à la coupe (direction géodésique) : gradient de x²/rx² + y²/ry². */
  let nx = Math.cos(t) / rx;
  let ny = -Math.sin(t) / ry;
  const norm = Math.hypot(nx, ny) || 1;
  nx /= norm;
  ny /= norm;
  g.strokeStyle = '#e6b96f';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(px - nx * 22, py - ny * 22);
  g.lineTo(px + nx * 22, py + ny * 22);
  g.stroke();

  g.fillStyle = '#f4d69e';
  g.beginPath();
  g.arc(px, py, 4, 0, 2 * Math.PI);
  g.fill();

  /* Étiquettes textuelles : aucune information n'est portée par la seule
     couleur — les deux directions sont nommées. */
  g.font = '10px sans-serif';
  g.textAlign = 'left';
  g.fillStyle = 'rgba(214,224,236,0.85)';
  g.fillText(`φ = ${dec(shownLat, 1)}°`, 10, 16);
  g.fillStyle = '#e6b96f';
  g.fillText('normale · géodésique', 10, 32);
  g.fillStyle = 'rgba(214,224,236,0.65)';
  g.fillText('rayon · géocentrique', 10, 46);
  g.textAlign = 'right';
  g.fillStyle = 'rgba(244,214,158,0.9)';
  g.fillText(model === 'sphere' ? 'sphère de rayon a' : 'ellipsoïde GRS 80', CANVAS_W - 10, 16);
  g.fillStyle = 'rgba(214,224,236,0.6)';
  g.textAlign = 'left';
  g.fillText(model === 'sphere'
    ? 'aplatissement nul : normale et rayon confondus'
    : `aplatissement amplifié ×${EXAG} pour la lecture`, 10, CANVAS_H - 8);
}

/* ---------- boucle rAF unique, pause et mouvement réduit (E006-10) ---------- */

function ensureRaf() {
  if (rafId || (typeof document !== 'undefined' && document.hidden)) return;
  if (reduced()) {
    shownLat = targetLat;
    shownMinor = targetMinor;
    drawCanvas();
    return;
  }
  lastFrame = 0;
  rafId = requestAnimationFrame(frame);
}

function frame(now) {
  rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) { lastFrame = 0; return; }
  const dt = lastFrame ? Math.min(64, now - lastFrame) : 16;
  lastFrame = now;
  const k = 1 - Math.exp(-dt / 110);
  shownLat += (targetLat - shownLat) * k;
  shownMinor += (targetMinor - shownMinor) * k;
  if (Math.abs(targetLat - shownLat) < 0.01) shownLat = targetLat;
  if (Math.abs(targetMinor - shownMinor) < 1) shownMinor = targetMinor;
  drawCanvas();
  if (shownLat !== targetLat || shownMinor !== targetMinor) {
    rafId = requestAnimationFrame(frame);
  } else {
    lastFrame = 0;
  }
}

function onVisibility() {
  if (typeof document === 'undefined') return;
  if (document.hidden) {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    lastFrame = 0;
  } else if (shownLat !== targetLat || shownMinor !== targetMinor) {
    ensureRaf();
  }
}

/* ---------- texte sémantique et grandeurs (E006-05, 07, 08, 09) ---------- */

const ROWS = [
  'Latitude géodésique φ',
  'Équivalent en degrés, minutes, secondes',
  'Modèle de Terre',
  'Rayon méridien M',
  'Rayon de courbure vertical N',
  'Un degré de latitude',
  'Un degré de longitude',
  'Latitude géocentrique θ',
  'Écart géodésique − géocentrique',
];

function updateTable() {
  if (!dom.cells) return;
  const m = metrics(targetLat, model);
  const values = [
    `${dec(targetLat, 2)}°`,
    dms(targetLat, 'N', 'S'),
    model === 'sphere' ? 'Sphère de rayon a' : 'Ellipsoïde WGS 84 / GRS 80',
    `${fmt(m.M)} m`,
    `${fmt(m.N)} m`,
    `${fmt(m.degLat)} m`,
    `${fmt(m.degLon)} m`,
    `${dec(m.theta, 4)}°`,
    `${fmt(m.gapMetres)} m`,
  ];
  values.forEach((value, index) => {
    if (dom.cells[index]) dom.cells[index].textContent = value;
  });
}

function updateReadout() {
  if (!dom.readout) return;
  const m = metrics(targetLat, model);
  const name = model === 'sphere'
    ? 'sphère de rayon a = 6 378 137 m'
    : 'ellipsoïde WGS 84 / GRS 80';
  dom.readout.textContent = `Modèle ${name} à φ = ${dec(targetLat, 2)}° : rayon méridien M ≈ ${fmt(m.M)} m, rayon vertical N ≈ ${fmt(m.N)} m. Un degré de latitude mesure ≈ ${fmt(m.degLat)} m et un degré de longitude ≈ ${fmt(m.degLon)} m. L'écart entre latitude géodésique et géocentrique est de ≈ ${fmt(m.gapMetres)} m. Toutes ces valeurs sont recalculées depuis les constantes WGS 84.`;
}

function recompute(animate) {
  updateTable();
  updateReadout();
  if (animate) ensureRaf();
  else {
    shownLat = targetLat;
    shownMinor = targetMinor;
    drawCanvas();
  }
}

/* ---------- interactions ---------- */

function setLat(value, animate) {
  targetLat = clamp(Math.round(value * 10) / 10, MIN_LAT, MAX_LAT);
  if (dom.range && String(targetLat) !== dom.range.value) dom.range.value = String(targetLat);
  recompute(animate !== false);
}

function setModel(value) {
  if (value !== 'sphere' && value !== 'ellipsoid') return;
  model = value;
  targetMinor = minorFor(model);
  recompute(true);
}

function reset() {
  model = 'ellipsoid';
  targetMinor = minorFor(model);
  if (dom.radios) {
    dom.radios.forEach((radio) => { radio.checked = radio.value === model; });
  }
  setLat(DEFAULT_LAT, true);
}

function onCanvasKey(event) {
  let next = targetLat;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = targetLat + 0.5;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = targetLat - 0.5;
  else if (event.key === 'PageUp') next = targetLat + 5;
  else if (event.key === 'PageDown') next = targetLat - 5;
  else if (event.key === 'Home') next = MIN_LAT;
  else if (event.key === 'End') next = MAX_LAT;
  else return;
  event.preventDefault();
  event.stopPropagation();
  setLat(next, true);
}

/* ---------- nettoyage entre deux rendus (E006-10 : idempotence) ---------- */

function teardown() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  lastFrame = 0;
  listeners.forEach(({ node, type, fn }) => {
    try { node.removeEventListener(type, fn); } catch { /* nœud détaché */ }
  });
  listeners = [];
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
  if (layoutRef && typeof layoutRef.querySelectorAll === 'function') {
    Array.from(layoutRef.querySelectorAll(`[id^="${PFX}-"]`)).forEach((node) => node.remove());
  }
  dom = {};
  layoutRef = null;
}

/* ---------- greffon ---------- */

register('E006', (ctx) => {
  ctxRef = ctx;
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const el = ctx.el;
  const css = ctx.css;
  if (typeof el !== 'function' || typeof css !== 'function') return;

  /* E006-02 : feuille unique, identifiants tous préfixés, focus visible,
     cibles ≥ 36 px, aucune info portée par la seule couleur. */
  css(CSS_ID, `
  #${PFX}-panel{margin:14px 0 6px;padding:12px;border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:10px;background:rgba(255,255,255,.02);color:var(--ink)}
  #${PFX}-title{margin:0 0 6px;color:var(--gold-bright);font-size:13px;font-weight:700}
  .${PFX}-lead{margin:0 0 10px;color:var(--muted);font-size:11px;line-height:1.55}
  .${PFX}-fieldset{margin:0 0 10px;padding:8px;border:1px solid var(--line);border-radius:8px}
  .${PFX}-fieldset legend{padding:0 4px;color:var(--gold-bright);font-size:10px;font-weight:600}
  .${PFX}-choices{display:flex;flex-wrap:wrap;gap:6px}
  .${PFX}-choice{display:inline-flex;align-items:center;gap:5px;min-height:36px;padding:0 9px;border:1px solid var(--line);border-radius:7px;color:var(--muted);font-size:11px;cursor:pointer}
  .${PFX}-choice input{width:16px;height:16px;accent-color:var(--gold)}
  .${PFX}-choice input:checked + span{color:var(--gold-bright);font-weight:700}
  .${PFX}-choice:focus-within{outline:2px solid var(--gold-bright);outline-offset:2px}
  #${PFX}-latitude-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0 0 8px}
  #${PFX}-latitude{min-height:36px;flex:1 1 180px;accent-color:var(--gold)}
  #${PFX}-latitude-label{min-width:120px;color:var(--ink-soft);font-size:11px;font-variant-numeric:tabular-nums}
  #${PFX}-canvas{display:block;width:100%;max-width:${CANVAS_W}px;height:auto;margin:0 0 8px;border:1px solid var(--line);border-radius:8px;touch-action:none;cursor:ew-resize}
  #${PFX}-canvas:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  .${PFX}-table{width:100%;border-collapse:collapse;margin:0 0 8px;font-size:11px}
  .${PFX}-table caption{margin-bottom:4px;color:var(--gold-bright);font-size:10px;text-align:left}
  .${PFX}-table th,.${PFX}-table td{padding:5px 6px;border-bottom:1px solid var(--line);text-align:left;font-variant-numeric:tabular-nums}
  .${PFX}-table td{color:var(--ink-soft);text-align:right}
  #${PFX}-readout{margin:0 0 8px;padding:7px 8px;border-left:2px solid var(--gold);color:var(--ink-soft);font-size:11px;line-height:1.5;background:rgba(230,185,111,.06)}
  #${PFX}-reset{min-height:36px;padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font:inherit;font-size:11px;cursor:pointer}
  #${PFX}-reset:hover{border-color:var(--gold)}
  #${PFX}-reset:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  #${PFX}-limits,#${PFX}-challenge{margin-top:10px;border-top:1px solid var(--line);padding-top:8px}
  #${PFX}-limits summary,#${PFX}-challenge summary{min-height:36px;display:flex;align-items:center;color:var(--gold-bright);font-size:11px;cursor:pointer}
  #${PFX}-limits summary:focus-visible,#${PFX}-challenge summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  #${PFX}-limits p,#${PFX}-challenge p{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.55}
  #${PFX}-challenge ol{margin:6px 0 0;padding-left:18px;color:var(--muted);font-size:10px;line-height:1.55}
  @media (max-width:620px){#${PFX}-panel{padding:10px}#${PFX}-canvas{max-width:100%}}
  @media (prefers-reduced-motion:reduce){#${PFX}-canvas{cursor:default}}`);

  teardown();
  const layout = ctx.layout;
  const panel = layout.querySelector('.geo-panel');
  if (!panel) return;
  layoutRef = layout;

  /* E006-01 : contenu sémantique, lisible et indexable sans le canvas. */
  const section = el('section', '');
  section.id = `${PFX}-panel`;
  section.setAttribute('aria-labelledby', `${PFX}-title`);
  const heading = el('h2', '', 'Laboratoire de lecture géodésique WGS 84');
  heading.id = `${PFX}-title`;
  const lead = el('p', `${PFX}-lead`, 'Ce laboratoire rend visibles les hypothèses géodésiques de la carte. Choisissez un modèle de Terre puis une latitude : la coupe méridienne, les rayons de courbure, les degrés et l’équivalent en degrés, minutes et secondes sont recalculés depuis les constantes WGS 84. Aucune altitude, aucun datum historique et aucune grille géoïdale ne sont supposés : seules les formules normatives sont appliquées.');
  section.append(heading, lead);

  /* E006-06 : radiogroupe natif pour le choix unique du modèle. */
  const fieldset = el('fieldset', `${PFX}-fieldset`);
  fieldset.id = `${PFX}-model-group`;
  fieldset.appendChild(el('legend', '', 'Modèle de Terre (choix unique)'));
  const choices = el('div', `${PFX}-choices`);
  choices.setAttribute('role', 'radiogroup');
  choices.setAttribute('aria-label', 'Modèle de Terre');
  const radios = [];
  [
    { value: 'ellipsoid', label: 'Ellipsoïde WGS 84 / GRS 80' },
    { value: 'sphere', label: 'Sphère de rayon a' },
  ].forEach((option) => {
    const labelNode = el('label', `${PFX}-choice`);
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `${PFX}-model`;
    input.value = option.value;
    input.id = `${PFX}-radio-${option.value}`;
    input.checked = option.value === model;
    on(input, 'change', () => setModel(input.value));
    labelNode.append(input, el('span', '', option.label));
    choices.appendChild(labelNode);
    radios.push(input);
  });
  fieldset.appendChild(choices);
  section.appendChild(fieldset);

  /* E006-03 : curseur de latitude, avec valeur textuelle visible. */
  const row = el('div', '');
  row.id = `${PFX}-latitude-row`;
  const range = document.createElement('input');
  range.type = 'range';
  range.min = String(MIN_LAT);
  range.max = String(MAX_LAT);
  range.step = '0.1';
  range.value = String(targetLat);
  range.id = `${PFX}-latitude`;
  range.setAttribute('aria-label', 'Latitude géodésique en degrés');
  on(range, 'input', () => setLat(Number(range.value), true));
  const rangeLabel = el('label', `${PFX}-latitude-label`, '');
  rangeLabel.id = `${PFX}-latitude-label`;
  rangeLabel.htmlFor = range.id;
  row.append(rangeLabel, range);
  section.appendChild(row);

  /* E006-04 : canvas laboratoire, tabindex et équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = `${PFX}-canvas`;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Coupe méridienne : la flèche montre la normale géodésique, le pointillé le rayon géocentrique. Flèches pour ajuster la latitude par pas d’un demi-degré, Page précédente et Page suivante par pas de cinq degrés, Début et Fin pour les extrémités.');
  on(canvas, 'keydown', onCanvasKey);
  section.appendChild(canvas);

  /* E006-05 / 07 / 08 : tableau de grandeurs en texte sémantique. */
  const table = document.createElement('table');
  table.className = `${PFX}-table`;
  table.id = `${PFX}-table`;
  table.appendChild(el('caption', '', 'Grandeurs recalculées pour la latitude choisie'));
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Grandeur', 'Valeur'].forEach((label) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  tbody.id = `${PFX}-tbody`;
  const cells = [];
  ROWS.forEach((label) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = label;
    const td = document.createElement('td');
    cells.push(td);
    tr.append(th, td);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  section.appendChild(table);

  /* E006-10 : annonce accessible, texte visible, indexable, région live unique. */
  const readout = el('p', '', '');
  readout.id = `${PFX}-readout`;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  section.appendChild(readout);

  /* E006-10 : réinitialisation (bouton ≥ 36 px, focus visible). */
  const resetBtn = el('button', '', 'Réinitialiser le laboratoire');
  resetBtn.type = 'button';
  resetBtn.id = `${PFX}-reset`;
  on(resetBtn, 'click', reset);
  section.appendChild(resetBtn);

  /* E006-09 : défi falsifiable en cinq temps. */
  const challenge = el('details', '');
  challenge.id = `${PFX}-challenge`;
  challenge.appendChild(el('summary', '', 'Défi : spherère ou ellipsoïde ?'));
  const steps = document.createElement('ol');
  [
    'Prédiction : sur une sphère, un degré de latitude reste identique à l’équateur et à 60° ; sur l’ellipsoïde, il doit croître vers le pôle.',
    'Réglage : placez le curseur à 60°, puis comparez les deux modèles.',
    'Résultat attendu : ellipsoïde ≈ 111,41 km pour 1° de latitude et ≈ 19 km d’écart géodésique ; sphère ≈ 111,32 km et écart nul.',
    'Falsification : si l’écart reste non nul en modèle sphère, la relation θ = φ n’est pas appliquée ; si le degré de latitude ne change pas entre les modèles, la formule M·π/180 est incorrecte.',
    'Débrief : revenez à 48,857° et à l’ellipsoïde, puis confrontez le tableau au rapport de passe 1.',
  ].forEach((text) => steps.appendChild(el('li', '', text)));
  challenge.appendChild(steps);
  section.appendChild(challenge);

  /* E006-09 : limites et angles morts, explicitement énoncés. */
  const limits = el('details', '');
  limits.id = `${PFX}-limits`;
  limits.appendChild(el('summary', '', 'Limites et angles morts'));
  limits.appendChild(el('p', '', 'L’aplatissement est amplifié ×25 sur le dessin pour être visible : la coupe n’est pas à l’échelle. Le laboratoire ne porte aucune altitude : la relation h = H + N et l’ondulation géoïdale ne sont pas évaluées. Aucun datum historique (ED50, NTF) n’est transformé et aucune époque ITRF n’est corrigée. Enfin, la carte hôte utilise une projection schématique : les distances apparentes à l’écran ne sont pas les distances géodésiques calculées ici.'));
  section.appendChild(limits);

  panel.appendChild(section);

  /* Miroir d'état auditable, sans duplication de contenu visible. */
  const m = metrics(targetLat, model);
  layout.setAttribute('data-geography-v2-e006-model', model);
  layout.setAttribute('data-geography-v2-e006-lat', String(targetLat));
  layout.setAttribute('data-geography-v2-e006-M', String(Math.round(m.M)));
  layout.setAttribute('data-geography-v2-e006-N', String(Math.round(m.N)));
  layout.setAttribute('data-geography-v2-e006-gap', String(Math.round(m.gapMetres)));

  dom = { panel: section, canvas, range, rangeLabel, readout, tbody, cells, radios };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);

  /* Valeurs initiales cohérentes avec le texte statique, sans animation. */
  recompute(false);
});
