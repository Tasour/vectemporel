import { register } from './registry.js';

/* Lentille V2 E010 — Laboratoire de houle et de vagues en eau profonde.
 *
 * Seconde passe sur le domaine des océans. Là où la passe 1 décrivait la
 * colonne d'eau (pression, lumière, son), cette lentille s'intéresse à la
 * SURFACE : relation de dispersion en eau profonde, profondeur d'influence,
 * énergie d'une vague et limite de déferlement. Dix chantiers inédits, tous
 * réellement implémentés.
 *
 * Contraintes : un seul import, un seul register, un seul identifiant CSS
 * `geography-v2-e010`, tous les id préfixés `geography-v2-e010-`, aucune
 * ressource réseau, aucun appel à la console, aucun `Math.random`, une seule
 * boucle rAF avec pause sur `document.hidden` et respect de `reducedMotion()`.
 * Le texte est sémantique (h2, p, table, fieldset, label) et reste lisible et
 * indexable sans JavaScript : le canvas n'est qu'un complément déterministe.
 */

const PFX = 'geography-v2-e010';
const G = 9.81;                 // m/s², pesanteur
const RHO = 1025;               // kg/m³, masse volumique de l'eau de mer
const FOOTBALL = 105;           // m, longueur d'un terrain de football (référence)
const WALK_KMH = 5;             // km/h, allure d'un piéton (référence)
const BREAK_LIMIT = 1 / 7;      // pente limite de déferlement théorique
const T_MIN = 2;
const T_MAX = 20;
const H_MIN = 0.5;
const H_MAX = 6;
const STEP = 0.5;
const CW = 320;                 // largeur logique du canvas, px CSS
const CH = 220;                 // hauteur logique du canvas, px CSS
const PAD = 16;
const MID = 64;                 // ligne d'eau au repos

const MODES = [
  { id: 'longueur', label: 'Longueur d’onde', dash: [], note: 'double flèche au-dessus d’une longueur d’onde' },
  { id: 'celerite', label: 'Célérité', dash: [8, 5], note: 'flèche de propagation vers la droite' },
  { id: 'energie', label: 'Énergie', dash: [2, 4], note: 'aire hachée sous la surface' },
];

/* État de module : survit aux re-renders complets de la coque. */
let ctxRef = null;
let layoutRef = null;
let rafId = 0;
let lastTs = 0;
let phase = 0;
let playing = false;
let mode = 'longueur';
let period = 10;                // s
let height = 2;                 // m, hauteur significative
let reducedPref = false;
let motionBound = false;
let dom = {};
let listeners = [];

/* ---------- utilitaires déterministes (aucun aléa) ---------- */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function group(value) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

function dec(value, digits) {
  return Number(value).toFixed(digits).replace('.', ',');
}

function fmt(value, digits) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1000) return group(value);
  return dec(value, digits === undefined ? 1 : digits);
}

function reduced() {
  if (ctxRef && typeof ctxRef.reducedMotion === 'function') {
    try { return Boolean(ctxRef.reducedMotion()); } catch { /* repli sur le drapeau */ }
  }
  return reducedPref;
}

function on(node, type, fn) {
  if (!node || typeof node.addEventListener !== 'function') return;
  node.addEventListener(type, fn);
  listeners.push({ node, type, fn });
}

/* ---------- formules explicites (eau profonde) ---------- */

/* Longueur d'onde de dispersion en eau profonde : L = g·T² / (2π). */
function longueur(T) {
  return (G * T * T) / (2 * Math.PI);
}

/* Célérité de phase : c = L / T = g·T / (2π). */
function celerite(T) {
  return (G * T) / (2 * Math.PI);
}

/* Mesures regroupées, toutes recalculées depuis T et H. */
function measures(T, Hgt) {
  const L = longueur(T);
  const c = celerite(T);
  const d = L / 2;                       // profondeur d'influence ≈ L/2
  const s = Hgt / L;                     // pente (raideur)
  const E = (RHO * G * Hgt * Hgt) / 16;  // énergie par unité de surface, J/m²
  const Eref = (RHO * G * 1 * 1) / 16;   // référence H = 1 m
  return {
    T, Hgt, L, c, cKmh: c * 3.6, d, s, E,
    field: L / FOOTBALL,
    walk: (c * 3.6) / WALK_KMH,
    eref: E / Eref,
    breaking: s > BREAK_LIMIT,
  };
}

/* ---------- dessin du laboratoire (formules déterministes) ---------- */

function drawCanvas() {
  const cv = dom.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const pxW = Math.round(CW * dpr);
  const pxH = Math.round(CH * dpr);
  if (cv.width !== pxW || cv.height !== pxH) {
    cv.width = pxW;
    cv.height = pxH;
  }
  const g = cv.getContext('2d');
  if (!g || typeof g.setTransform !== 'function') return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, CW, CH);

  const m = measures(period, height);
  const x0 = PAD;
  const x1 = CW - PAD;
  const span = x1 - x0;
  const kVis = (2 * 2 * Math.PI) / span;   // deux longueurs d'onde affichées
  const amp = clamp(10 + height * 2.5, 12, 28); // amplitude visuelle bornée
  const baseY = MID + span / 4;            // L/2 à l'échelle horizontale

  /* Eau sous la surface : hachures de plus en plus serrées avec la profondeur. */
  g.save();
  g.beginPath();
  g.rect(0, MID, CW, CH - MID);
  g.clip();
  for (let y = MID; y < CH; y += 1) {
    const step = 18 - Math.floor(((y - MID) / (CH - MID)) * 10);
    g.strokeStyle = y >= baseY ? 'rgba(214,224,236,0.10)' : 'rgba(214,224,236,0.055)';
    g.lineWidth = 1;
    if ((y - MID) % Math.max(4, step) === 0) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(CW, y);
      g.stroke();
    }
  }
  g.restore();

  /* Ligne d'eau au repos. */
  g.setLineDash([3, 4]);
  g.strokeStyle = 'rgba(214,224,236,0.35)';
  g.beginPath();
  g.moveTo(x0, MID);
  g.lineTo(x1, MID);
  g.stroke();
  g.setLineDash([]);

  /* Profondeur d'influence L/2 : ligne en tirets + libellé. */
  g.strokeStyle = 'rgba(244,214,158,0.55)';
  g.setLineDash([6, 4]);
  g.beginPath();
  g.moveTo(x0, baseY);
  g.lineTo(x1, baseY);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(244,214,158,0.9)';
  g.font = '9px sans-serif';
  g.textAlign = 'left';
  g.fillText(`fond d’influence ≈ L/2 = ${fmt(m.d)} m`, x0 + 2, baseY - 4);

  /* Surface sinusoïdale échantillonnée de façon déterministe. */
  g.strokeStyle = 'rgba(230,185,111,0.95)';
  g.lineWidth = 1.8;
  g.beginPath();
  for (let x = x0; x <= x1; x += 2) {
    const y = MID - amp * Math.sin(kVis * (x - x0) - phase);
    if (x === x0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();

  /* Crêtes et creux : repères non chromatiques. */
  g.fillStyle = 'rgba(214,224,236,0.6)';
  g.font = '9px sans-serif';
  g.fillText('crête', x0 + 2, MID - amp - 4);
  g.fillText('creux', x0 + 2, MID + amp + 10);

  /* Annotation de la grandeur mise en avant (style de trait = code non chromatique). */
  constActiveMode(g, m, x0, x1, span, amp, mode);

  /* Échelle explicite du gradient horizontal. */
  g.fillStyle = 'rgba(244,214,158,0.9)';
  g.font = '10px sans-serif';
  g.textAlign = 'left';
  g.fillText(`T = ${dec(period, 1)} s · H = ${dec(height, 1)} m · profondeur schématisée à l’échelle horizontale`, x0, 14);
}

function constActiveMode(g, m, x0, x1, span, amp, active) {
  const st = MODES.find((x) => x.id === active) || MODES[0];
  g.strokeStyle = '#f4d69e';
  g.fillStyle = '#f4d69e';
  g.lineWidth = 1.6;
  if (typeof g.setLineDash === 'function') g.setLineDash(st.dash);

  if (active === 'longueur') {
    const y = MID - amp - 14;
    g.beginPath();
    g.moveTo(x0, y); g.lineTo(x0 + span / 2, y);
    g.moveTo(x0, y - 4); g.lineTo(x0, y + 4);
    g.moveTo(x0 + span / 2, y - 4); g.lineTo(x0 + span / 2, y + 4);
    g.stroke();
    g.font = '10px sans-serif';
    g.textAlign = 'center';
    g.fillText(`L = ${fmt(m.L)} m`, x0 + span / 4, y - 5);
  } else if (active === 'celerite') {
    const y = 30;
    g.beginPath();
    g.moveTo(x0 + 30, y); g.lineTo(x1 - 30, y);
    g.moveTo(x1 - 30, y); g.lineTo(x1 - 38, y - 4);
    g.moveTo(x1 - 30, y); g.lineTo(x1 - 38, y + 4);
    g.stroke();
    g.font = '10px sans-serif';
    g.textAlign = 'center';
    g.fillText(`c = ${fmt(m.c)} m/s (${fmt(m.cKmh)} km/h)`, (x0 + x1) / 2, y - 5);
  } else {
    const y = MID + amp + 20;
    g.beginPath();
    g.moveTo(x0, y); g.lineTo(x1, y);
    g.stroke();
    g.font = '10px sans-serif';
    g.textAlign = 'center';
    g.fillText(`E = ${fmt(m.E, 0)} J/m² = ${fmt(m.eref)}× E(1 m)`, (x0 + x1) / 2, y + 12);
  }
  if (typeof g.setLineDash === 'function') g.setLineDash([]);
  g.textAlign = 'left';
}

/* ---------- boucle rAF unique, pause et mouvement réduit ---------- */

function loop(ts) {
  rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) { lastTs = 0; return; }
  if (!playing || reduced()) { lastTs = 0; return; }
  if (lastTs) {
    const dt = Math.min(64, ts - lastTs);
    phase = (phase + dt * 0.0016) % (Math.PI * 2);
  }
  lastTs = ts;
  drawCanvas();
  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  if (rafId) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!playing || reduced()) return;
  lastTs = 0;
  rafId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  lastTs = 0;
}

function onVisibility() {
  if (typeof document === 'undefined') return;
  if (document.hidden) stopLoop();
  else if (playing) startLoop();
}

function onMotionChange() {
  if (ctxRef && typeof ctxRef.reducedMotion === 'function') {
    try { reducedPref = Boolean(ctxRef.reducedMotion()); } catch { /* inchangé */ }
  }
  if (reducedPref) {
    playing = false;
    stopLoop();
  }
  if (dom.panel) dom.panel.dataset.geographyV2E010Reduced = reducedPref ? '1' : '0';
  updatePlay();
  if (playing) startLoop();
}

/* ---------- texte sémantique et annonce accessible ---------- */

function updateReadout() {
  if (!dom.readout) return;
  const m = measures(period, height);
  dom.readout.textContent = ''
    + `À T = ${dec(period, 1)} s et H = ${dec(height, 1)} m (eau profonde, g = 9,81 m/s²) — `
    + `longueur d’onde : ${fmt(m.L)} m, soit ${fmt(m.field)}× la longueur d’un terrain de football (105 m) ; `
    + `célérité : ${fmt(m.c)} m/s (${fmt(m.cKmh)} km/h), soit ${fmt(m.walk)}× l’allure d’un piéton (5 km/h) ; `
    + `profondeur d’influence : ${fmt(m.d)} m ; énergie : ${fmt(m.E, 0)} J/m², soit ${fmt(m.eref)}× celle d’une vague de 1 m (E ∝ H²). `
    + (m.breaking
      ? `Pente H/L = ${dec(m.s, 3)} > 1/7 : cette vague est thermodynamiquement vouée à déferler.`
      : `Pente H/L = ${dec(m.s, 3)} : sous la limite de déferlement théorique (1/7).`);
}

function updateTable() {
  if (!dom.tbody) return;
  const m = measures(period, height);
  const rows = [
    ['Période T', `${dec(m.T, 1)} s`],
    ['Longueur d’onde L = g·T²/(2π)', `${fmt(m.L)} m`],
    ['Célérité c = L/T', `${fmt(m.c)} m/s`],
    ['Profondeur d’influence L/2', `${fmt(m.d)} m`],
    ['Énergie E = ρ·g·H²/16', `${fmt(m.E, 0)} J/m²`],
  ];
  while (dom.tbody.firstChild) dom.tbody.removeChild(dom.tbody.firstChild);
  rows.forEach(([name, value]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = name;
    const td = document.createElement('td');
    td.textContent = value;
    tr.append(th, td);
    dom.tbody.appendChild(tr);
  });
}

function updatePlay() {
  if (!dom.play) return;
  dom.play.textContent = playing ? '■ Arrêter la propagation' : '▶ Animer la propagation';
  dom.play.setAttribute('aria-pressed', playing ? 'true' : 'false');
}

function updateLegend() {
  if (!dom.legend) return;
  const st = MODES.find((x) => x.id === mode) || MODES[0];
  dom.legend.textContent = `${st.label} mise en avant : ${st.note}. Le style de trait distingue la grandeur, indépendamment de la couleur ; les hachures, de plus en plus serrées, et le libellé « fond d’influence » distinguent la profondeur.`;
}

function recompute(animate) {
  updateTable();
  updateReadout();
  updateLegend();
  updatePlay();
  drawCanvas();
  if (animate && playing && !reduced()) startLoop();
}

/* ---------- interactions ---------- */

function setPeriod(value) {
  period = clamp(Math.round(value / STEP) * STEP, T_MIN, T_MAX);
  if (dom.period && String(period) !== dom.period.value) dom.period.value = String(period);
  if (dom.periodLabel) dom.periodLabel.textContent = `Période : ${dec(period, 1)} s`;
  recompute(false);
}

function setHeight(value) {
  height = clamp(Math.round(value / STEP) * STEP, H_MIN, H_MAX);
  if (dom.height && String(height) !== dom.height.value) dom.height.value = String(height);
  if (dom.heightLabel) dom.heightLabel.textContent = `Hauteur : ${dec(height, 1)} m`;
  recompute(false);
}

function setMode(value) {
  if (!MODES.some((x) => x.id === value)) return;
  mode = value;
  if (dom.radios) dom.radios.forEach((r) => { r.checked = r.value === mode; });
  recompute(false);
}

function togglePlay() {
  playing = !playing && !reduced();
  if (playing) startLoop(); else stopLoop();
  updatePlay();
}

function onCanvasKey(event) {
  let next = null;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = period + STEP;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = period - STEP;
  else if (event.key === 'Home') next = T_MIN;
  else if (event.key === 'End') next = T_MAX;
  else return;
  event.preventDefault();
  event.stopPropagation();
  setPeriod(next);
}

/* ---------- nettoyage entre deux rendus ---------- */

function teardown() {
  stopLoop();
  playing = false;
  phase = 0;
  listeners.forEach(({ node, type, fn }) => {
    try { node.removeEventListener(type, fn); } catch { /* nœud déjà détaché */ }
  });
  listeners = [];
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
  if (motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onMotionChange);
      else if (typeof mq.removeListener === 'function') mq.removeListener(onMotionChange);
    } catch { /* préférence indisponible */ }
    motionBound = false;
  }
  const roots = [layoutRef];
  roots.forEach((root) => {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    Array.from(root.querySelectorAll(`[id^="${PFX}-"]`)).forEach((node) => node.remove());
  });
  dom = {};
  layoutRef = null;
}

/* ---------- greffon ---------- */

register('E010', (ctx) => {
  ctxRef = ctx;
  if (!ctx || typeof document === 'undefined' || typeof ctx.el !== 'function' || typeof ctx.css !== 'function') return;
  const el = ctx.el;
  const css = ctx.css;
  const scope = ctx.layout || ctx.stage;
  if (!scope || typeof scope.querySelector !== 'function') return;

  /* E010-10 : feuille de style unique, tous les sélecteurs préfixés. */
  css('geography-v2-e010', `
  #${PFX}-panel{margin:14px 0 6px;padding:12px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02);color:var(--ink)}
  #${PFX}-title{margin:0 0 6px;color:var(--gold-bright);font-size:13px;font-weight:700}
  .${PFX}-lead{margin:0 0 8px;color:var(--muted);font-size:11px;line-height:1.55;max-width:68ch}
  .${PFX}-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold);font-size:11px;line-height:1.55;max-width:68ch}
  .${PFX}-fieldset{margin:10px 0 8px;padding:8px;border:1px solid var(--line);border-radius:8px}
  .${PFX}-fieldset legend{padding:0 4px;color:var(--gold-bright);font-size:10px;font-weight:600}
  .${PFX}-choices{display:flex;flex-wrap:wrap;gap:6px}
  .${PFX}-choice{display:inline-flex;align-items:center;gap:5px;min-height:36px;padding:0 9px;border:1px solid var(--line);border-radius:7px;color:var(--muted);font-size:11px;cursor:pointer}
  .${PFX}-choice input{width:16px;height:16px;accent-color:var(--gold)}
  .${PFX}-choice input:checked + span{color:var(--gold-bright);font-weight:700}
  .${PFX}-choice:focus-within{outline:2px solid var(--gold-bright);outline-offset:2px}
  .${PFX}-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0 0 8px}
  .${PFX}-range{min-height:36px;flex:1 1 160px;accent-color:var(--gold)}
  .${PFX}-range-label{min-width:118px;color:var(--ink-soft);font-size:11px;font-variant-numeric:tabular-nums}
  #${PFX}-canvas{display:block;width:100%;max-width:${CW}px;height:auto;margin:6px 0 8px;border:1px solid var(--line);border-radius:8px;background:rgba(8,12,18,.5);touch-action:none}
  #${PFX}-canvas:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  .${PFX}-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:11px}
  .${PFX}-table caption{margin-bottom:4px;color:var(--gold-bright);font-size:10px;text-align:left}
  .${PFX}-table th,.${PFX}-table td{padding:5px 6px;border-bottom:1px solid var(--line);text-align:left;font-variant-numeric:tabular-nums}
  .${PFX}-table td{color:var(--ink-soft);text-align:right}
  #${PFX}-readout{margin:8px 0;padding:7px 8px;border-left:2px solid var(--gold);background:rgba(230,185,111,.06);color:var(--ink-soft);font-size:11px;line-height:1.55}
  .${PFX}-btn{display:inline-block;min-height:44px;margin:6px 6px 0 0;padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font:inherit;font-size:11px;cursor:pointer}
  .${PFX}-btn:hover{border-color:var(--gold)}
  .${PFX}-btn:focus-visible,#${PFX}-limits summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  #${PFX}-limits{margin-top:10px;border-top:1px solid var(--line);padding-top:8px}
  #${PFX}-limits summary{min-height:36px;display:flex;align-items:center;color:var(--gold-bright);font-size:11px;cursor:pointer}
  #${PFX}-limits p{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.55}
  .${PFX}-badge{position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;border:1px solid var(--gold);border-radius:6px;background:rgba(8,12,18,.9);color:var(--gold-bright);font-size:10px;line-height:1.4;pointer-events:none}
  @media (prefers-reduced-motion:reduce){#${PFX}-canvas{cursor:default}}
  @media (max-width:620px){#${PFX}-range-label{min-width:100px}.${PFX}-fait{font-size:10px}}`);

  teardown();
  const panel = scope.querySelector('.geo-panel') || scope;
  layoutRef = scope;

  /* E010-01 : contenu sémantique lisible sans JavaScript. */
  const section = el('section', '');
  section.id = `${PFX}-panel`;
  section.setAttribute('aria-labelledby', `${PFX}-title`);
  const heading = el('h2', '', 'Houle et vagues : lire la surface de l’océan');
  heading.id = `${PFX}-title`;
  section.appendChild(heading);
  section.appendChild(el('p', `${PFX}-lead`, 'La surface de la mer n’est pas immobile : le vent crée des vagues dont la période fixe la longueur et la vitesse. En eau profonde, une relation simple relie la période à la longueur d’onde, à la célérité et à la profondeur où le mouvement devient négligeable. Choisissez une période et une hauteur : le laboratoire recalcule toutes les grandeurs.'));

  /* Faits de cadrage : texte réel, indexable, sans dépendance au canvas. */
  [
    'Une vague de vent a une période courte (quelques secondes) ; une houle est une vague déjà formée qui se propage loin de sa zone de genèse, avec une période plus longue et une surface plus régulière.',
    'En eau profonde (profondeur supérieure à la moitié de la longueur d’onde), la longueur d’onde vaut L = g·T²/(2π) et la célérité c = g·T/(2π) : une houle de 10 s mesure environ 156 m et avance à environ 56 km/h.',
    'L’énergie d’une vague croît comme le carré de sa hauteur (E ∝ H²) : doubler la hauteur multiplie l’énergie par quatre. Le mouvement de l’eau s’atténue avec la profondeur et devient négligeable vers L/2.',
  ].forEach((texte) => section.appendChild(el('p', `${PFX}-fait`, texte)));

  /* E010-02 : tableau de référence des cinq régimes (valeurs de L = g·T²/(2π)). */
  const refTable = document.createElement('table');
  refTable.className = `${PFX}-table`;
  const refCaption = el('caption', '', 'Régimes de vagues : longueur d’onde et profondeur d’influence calculées par L = g·T²/(2π), avec g = 9,81 m/s².');
  const refHead = document.createElement('thead');
  const refHeadRow = document.createElement('tr');
  ['Période', 'Régime', 'Longueur d’onde', 'Influence ≈ L/2'].forEach((t) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = t;
    refHeadRow.appendChild(th);
  });
  refHead.appendChild(refHeadRow);
  const refBody = document.createElement('tbody');
  [
    ['4 s', 'vagues de vent', '25 m', '12,5 m'],
    ['8 s', 'houle courte', '100 m', '50 m'],
    ['12 s', 'houle', '225 m', '112,5 m'],
    ['16 s', 'houle longue', '400 m', '200 m'],
    ['20 s', 'houle très longue', '625 m', '312,5 m'],
  ].forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((c, i) => {
      const cell = document.createElement(i === 0 || i === 1 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      cell.textContent = c;
      tr.appendChild(cell);
    });
    refBody.appendChild(tr);
  });
  refTable.append(refCaption, refHead, refBody);
  section.appendChild(refTable);

  /* E010-03 : radiogroupe natif pour le choix unique de grandeur. */
  const fieldset = el('fieldset', `${PFX}-fieldset`);
  fieldset.id = `${PFX}-group`;
  fieldset.appendChild(el('legend', '', 'Grandeur mise en avant (choix unique)'));
  const choices = el('div', `${PFX}-choices`);
  const radios = [];
  MODES.forEach((m) => {
    const labelNode = el('label', `${PFX}-choice`);
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `${PFX}-mode`;
    input.value = m.id;
    input.id = `${PFX}-radio-${m.id}`;
    input.checked = m.id === mode;
    on(input, 'change', () => { if (input.checked) setMode(m.id); });
    labelNode.append(input, el('span', '', m.label));
    choices.appendChild(labelNode);
    radios.push(input);
  });
  fieldset.appendChild(choices);
  section.appendChild(fieldset);

  /* E010-04 : curseur de période, formules de dispersion. */
  const rowT = el('div', '');
  rowT.id = `${PFX}-period-row`;
  const periodLabel = el('label', `${PFX}-range-label`, `Période : ${dec(period, 1)} s`);
  periodLabel.id = `${PFX}-period-label`;
  periodLabel.htmlFor = `${PFX}-period`;
  const periodRange = document.createElement('input');
  periodRange.type = 'range';
  periodRange.min = String(T_MIN);
  periodRange.max = String(T_MAX);
  periodRange.step = String(STEP);
  periodRange.value = String(period);
  periodRange.id = `${PFX}-period`;
  periodRange.className = `${PFX}-range`;
  periodRange.setAttribute('aria-label', 'Période de la houle, de 2 à 20 secondes, par pas de 0,5 seconde');
  on(periodRange, 'input', () => setPeriod(Number(periodRange.value)));
  rowT.append(periodLabel, periodRange);
  section.appendChild(rowT);

  /* E010-05 : curseur de hauteur significative, énergie ∝ H² et déferlement. */
  const rowH = el('div', '');
  rowH.id = `${PFX}-height-row`;
  const heightLabel = el('label', `${PFX}-range-label`, `Hauteur : ${dec(height, 1)} m`);
  heightLabel.id = `${PFX}-height-label`;
  heightLabel.htmlFor = `${PFX}-height`;
  const heightRange = document.createElement('input');
  heightRange.type = 'range';
  heightRange.min = String(H_MIN);
  heightRange.max = String(H_MAX);
  heightRange.step = String(STEP);
  heightRange.value = String(height);
  heightRange.id = `${PFX}-height`;
  heightRange.className = `${PFX}-range`;
  heightRange.setAttribute('aria-label', 'Hauteur significative de la houle, de 0,5 à 6 mètres, par pas de 0,5 mètre');
  on(heightRange, 'input', () => setHeight(Number(heightRange.value)));
  rowH.append(heightLabel, heightRange);
  section.appendChild(rowH);

  /* E010-06 : canvas déterministe, tabindex et équivalent clavier ; E010-08 codes non chromatiques. */
  const canvas = document.createElement('canvas');
  canvas.id = `${PFX}-canvas`;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Surface d’une houle en eau profonde : flèches gauche et droite pour changer la période par pas de 0,5 seconde, Début et Fin pour les extrémités. La ligne en tirets marque la profondeur d’influence L sur deux.');
  on(canvas, 'keydown', onCanvasKey);
  section.appendChild(canvas);
  const legend = el('p', `${PFX}-lead`, '');
  legend.id = `${PFX}-legend`;
  section.appendChild(legend);

  /* Tableau dynamique des grandeurs calculées — texte sémantique. */
  const dynTable = document.createElement('table');
  dynTable.className = `${PFX}-table`;
  dynTable.id = `${PFX}-table`;
  dynTable.appendChild(el('caption', '', 'Grandeurs recalculées pour les réglages courants'));
  const dynHead = document.createElement('thead');
  const dynHeadRow = document.createElement('tr');
  ['Grandeur', 'Valeur'].forEach((t) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = t;
    dynHeadRow.appendChild(th);
  });
  dynHead.appendChild(dynHeadRow);
  const tbody = document.createElement('tbody');
  tbody.id = `${PFX}-tbody`;
  dynTable.append(dynHead, tbody);
  section.appendChild(dynTable);

  /* E010-07 : annonce accessible, texte visible et indexable. */
  const readout = el('p', '', '');
  readout.id = `${PFX}-readout`;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  section.appendChild(readout);

  /* Commandes : bascule de lecture (aria-pressed légitime) et réinitialisation. */
  const play = el('button', `${PFX}-btn`, '▶ Animer la propagation');
  play.type = 'button';
  play.id = `${PFX}-play`;
  play.setAttribute('aria-pressed', 'false');
  on(play, 'click', togglePlay);
  section.appendChild(play);
  const reset = el('button', `${PFX}-btn`, 'Réinitialiser le laboratoire');
  reset.type = 'button';
  reset.id = `${PFX}-reset`;
  on(reset, 'click', () => { setMode('longueur'); setPeriod(10); setHeight(2); });
  section.appendChild(reset);

  /* E010-10 : limites explicites du modèle. */
  const limits = el('details', '');
  limits.id = `${PFX}-limits`;
  limits.appendChild(el('summary', '', 'Limites du modèle en eau profonde'));
  limits.appendChild(el('p', '', 'Les formules L = g·T²/(2π) et c = g·T/(2π) supposent une profondeur supérieure à L/2 : en eau peu profonde, la célérité dépend aussi de la profondeur et ces relations ne s’appliquent plus. La hauteur significative est une statistique de la houle, pas la hauteur d’une vague isolée. Le dessin schématise le mouvement à l’échelle horizontale et n’est pas une simulation hydrodynamique.'));
  section.appendChild(limits);

  panel.appendChild(section);

  /* E010-09 : badge textuel sur la carte existante, garde anti-doublon par id. */
  const map = scope.querySelector('.geo-map');
  if (map && !document.getElementById(`${PFX}-badge`)) {
    const badge = el('div', `${PFX}-badge`, 'Cette carte ne trace que des lieux terrestres : les vagues et la houle ne figurent pas dans la projection affichée.');
    badge.id = `${PFX}-badge`;
    map.appendChild(badge);
  }

  dom = {
    panel: section, canvas, readout, tbody, legend, play,
    period: periodRange, periodLabel, height: heightRange, heightLabel, radios,
  };

  /* Mouvement réduit : source = ctx.reducedMotion(), synchronisée via matchMedia. */
  reducedPref = reduced();
  section.dataset.geographyV2E010Reduced = reducedPref ? '1' : '0';
  if (reducedPref) playing = false;
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
  if (!motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMotionChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onMotionChange);
      motionBound = true;
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }

  /* Valeurs initiales cohérentes avec le texte statique, sans animation. */
  recompute(false);
});
