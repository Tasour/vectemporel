import { register } from './registry.js';

/* Lentille E050 — passe V2, vue GEOGRAPHIE.
 * Thème : panoramique — le déplacement de la fenêtre de vue (viewBox).
 *
 * Les dix chantiers E050-01 … E050-10 sont réellement implémentés (aucun stub) ;
 * leur description est dans UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E050.md.
 * Tout est local : zéro réseau, zéro journalisation, aucun générateur aléatoire
 * (graine fixe 45e050 + mulberry32), aucun fichier partagé ni module de la
 * passe 1 modifié. Le contenu pédagogique est du texte sémantique réel
 * (h2, h3, p, dl, table, fieldset, label, ul, figure/figcaption) inséré dans le
 * DOM : il reste lisible et indexable même sans animation ni interaction. Le
 * canvas n'est qu'un laboratoire qui illustre des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e050';
const P = 'geography-v2-e050-';

const MAP_W = 900;                 // largeur du cadre carte, unités SVG (vue)
const MAP_H = 620;                 // hauteur du cadre carte, unités SVG (vue)
const MIN_W = MAP_W / 8;           // zoom maximal de la vue (112,5 unités)
const ASPECT = MAP_H / MAP_W;      // rapport de forme du cadre
const SWEEP_MS = 9000;             // période du balayage panoramique continu
const GRAINE = 0x45e050;           // graine fixe : points témoins reproductibles
const NARROW = '\u202f';           // espace insécable fine (typographie française)
const MINUS = '\u2212';            // signe moins typographique
const RAD = Math.PI / 180;

/* Quatre fenêtres de référence ; les valeurs sont recalculées et bornées par
   clampBox() au moment de l'usage, jamais présentées comme des mesures de terrain. */
const PRESETS = [
  { key: 'plein', nom: 'Plein cadre', x: 0, y: 0, w: MAP_W },
  { key: 'nord-ouest', nom: 'Nord-ouest', x: 0, y: 0, w: 300 },
  { key: 'centre', nom: 'Centre', x: 300, y: MAP_H / 2 - 100, w: 300 },
  { key: 'sud-est', nom: 'Sud-est', x: MAP_W - 300, y: MAP_H - 206.6667, w: 300 },
];

const GLOSSAIRE = [
  ['viewBox', 'La fenêtre rectangulaire (x, y, largeur, hauteur) d’un dessin vectoriel : la partie du monde réellement affichée dans le cadre.'],
  ['panoramique', 'Le déplacement de cette fenêtre à l’intérieur d’un cadre fixe, sans changer l’échelle : on tire le dessin, pas le monde.'],
  ['échelle relative', 'Le rapport MAP_W / largeur de la fenêtre : ×1 au plein cadre, ×8 au zoom maximal.'],
  ['unité carte', 'Une unité du repère SVG interne ; un pixel écran en vaut largeur / largeur_écran.'],
];

/* État de module : la vue reconstruit son DOM à chaque rendu, donc l'état survit
   au `stage.innerHTML = ''` de la coque. Les écouteurs globaux sont posés une seule fois. */
const S = {
  selected: 0,
  box: { x: 0, y: 0, w: MAP_W, h: MAP_H },
  mapWidth: 480,            // largeur affichée de la carte, modifiable au curseur
  grid: false,
  playing: false,
  sweep: 0,                 // phase du balayage, déterministe
  lastTs: 0,
  rafId: 0,
  reduced: false,
  offscreen: false,
  visibilityBound: false,
  motionBound: false,
  observersInstalled: false,
  observedCanvas: null,
  intersection: null,
  resize: null,
  points: null,
  nodes: {},
  panelNode: null,
  boundPanel: null,
  tickCount: 0,
};

/* Alias de ctx.el, initialisé au point d'entrée (les helpers l'utilisent). */
let E = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* Formatage décimal maison : regroupement par espaces fines, signe moins typographique. */
function num(value, digits) {
  if (!finite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? MINUS : ''}${grouped}${parts[1] ? `,${parts[1]}` : ''}`;
}

/* E050-02 — bornage de la fenêtre, règle unique qui fait foi pour tout déplacement. */
function clampBox(x, y, w) {
  const fw = clamp(finite(w) ? w : MAP_W, MIN_W, MAP_W);
  const fh = fw * ASPECT;
  return {
    w: fw,
    h: fh,
    x: clamp(finite(x) ? x : 0, 0, MAP_W - fw),
    y: clamp(finite(y) ? y : 0, 0, MAP_H - fh),
  };
}

/* E050-05 — échelle relative au cadre complet. */
function scaleOf(box) {
  return box && box.w > 0 ? MAP_W / box.w : 1;
}

/* E050-03 — traduction d'un déplacement d'écran en unités carte. */
function screenToMap(dxPx, dyPx, box, rectW, rectH) {
  if (!box) return { dx: 0, dy: 0 };
  const rw = finite(rectW) && rectW > 0 ? rectW : 1;
  const rh = finite(rectH) && rectH > 0 ? rectH : 1;
  return { dx: (dxPx * box.w) / rw, dy: (dyPx * box.h) / rh };
}

function panBy(box, dxMap, dyMap) {
  return clampBox(box.x - dxMap, box.y - dyMap, box.w);
}

/* E050-02 — lecture du viewBox réellement affiché par la vue (.geo-svg). */
function readViewBox(layout) {
  const svg = layout && typeof layout.querySelector === 'function'
    ? layout.querySelector('.geo-svg') : null;
  const raw = svg ? svg.getAttribute('viewBox') : null;
  if (!raw) return null;
  const parts = raw.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !finite(n))) return null;
  return clampBox(parts[0], parts[1], parts[2]);
}

/* PRNG déterministe : même graine, mêmes points, à chaque rendu. */
function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* E050-05 — cinq points témoins reproductibles, jamais aléatoires. */
function pointsTemoins() {
  if (S.points) return S.points;
  const rnd = mulberry32(GRAINE);
  const pts = [];
  for (let i = 0; i < 5; i += 1) {
    pts.push({ x: 40 + rnd() * (MAP_W - 80), y: 40 + rnd() * (MAP_H - 80) });
  }
  S.points = pts;
  return pts;
}

/* E050-06 — toutes les grandeurs d'une fenêtre, recalculées depuis leur formule. */
function measures(box, mapWidth) {
  const w = finite(mapWidth) && mapWidth > 0 ? mapWidth : 480;
  const h = Math.round((w * MAP_H) / MAP_W);
  const scale = scaleOf(box);
  const pxToMap = box.w / w;
  const ex = screenToMap(40, 0, box, w, h);
  /* Contrôle croisé : dx par la formule directe et dx par (échelle × référence). */
  const refDx = 40 * (MAP_W / w);          // 40 px au plein cadre
  const cross = refDx * scale;             // même résultat via l'échelle relative
  return {
    w, h, scale, pxToMap, dx: ex.dx,
    bornesX: MAP_W - box.w,
    bornesY: MAP_H - box.h,
    refDx, cross,
    coherent: Math.abs(ex.dx - cross) < 1e-6,
  };
}

/* ---------- Feuille de styles unique, cadrée par l'attribut de la coque ---------- */

const CSS = `
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-panel {
  margin: 12px 0 6px; padding: 10px 12px;
  border: 1px solid var(--line); border-left: 3px solid var(--gold);
  border-radius: 8px; background: rgba(255,255,255,.02);
  color: var(--muted); font-size: 11px; line-height: 1.6;
}
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-panel h2 {
  margin: 0 0 6px; color: var(--gold-bright); font-size: 13px; font-weight: 600;
}
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-panel h3 {
  margin: 10px 0 5px; color: var(--gold-bright); font-size: 11px; font-weight: 600;
}
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-lede { margin: 0 0 8px; }
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-fait {
  margin: 0 0 6px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-value { color: var(--ink); }
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-glossaire { margin: 4px 0 8px; }
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-glossaire dt {
  color: var(--gold-bright); font-weight: 600; margin-top: 5px;
}
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-glossaire dd { margin: 1px 0 4px; }
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-table {
  width: 100%; border-collapse: collapse; margin: 6px 0 8px; font-size: 10px;
}
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-table caption {
  text-align: left; color: var(--gold-bright); margin-bottom: 4px;
}
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-table th,
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-table td {
  border: 1px solid var(--line); padding: 3px 5px; text-align: right;
  font-variant-numeric: tabular-nums;
}
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-table th:first-child,
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-table td:first-child { text-align: left; }
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-table th { color: var(--gold-bright); }
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-field {
  border: 1px solid var(--line); border-radius: 8px; margin: 8px 0; padding: 6px 8px;
}
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-field legend { color: var(--gold-bright); padding: 0 4px; }
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-group {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px;
}
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-preset {
  min-height: 44px; min-width: 44px; padding: 6px 8px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--muted); font: inherit; font-size: 10px;
  line-height: 1.35; text-align: left; cursor: pointer;
}
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-preset:hover { border-color: var(--gold); color: var(--gold-bright); }
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-preset[aria-checked="true"] {
  border-color: var(--gold-bright); color: var(--gold-bright);
  background: rgba(230,185,111,.10); box-shadow: 0 0 0 1px var(--gold-bright) inset;
}
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-readout {
  margin: 8px 0; padding: 7px 9px; min-height: 34px;
  border: 1px dashed var(--line); border-radius: 7px;
  color: var(--gold-bright); font-variant-numeric: tabular-nums;
}
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-figure { margin: 8px 0; text-align: center; }
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-canvas {
  display: block; width: 100%; max-width: 320px; height: auto; aspect-ratio: 900 / 620;
  margin: 0 auto; touch-action: none; cursor: grab;
}
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-canvas:active { cursor: grabbing; }
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-caption { margin-top: 5px; font-size: 10px; color: var(--muted); }
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 8px 0; }
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-controls label { min-height: 36px; display: inline-flex; align-items: center; }
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-range { flex: 1 1 160px; min-height: 36px; accent-color: var(--gold); }
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-btn {
  min-height: 44px; min-width: 44px; padding: 6px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--gold-bright); font: inherit; font-size: 10px; cursor: pointer;
}
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-btn:hover { border-color: var(--gold); }
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-btn[aria-pressed="true"] {
  border-color: var(--gold-bright); background: rgba(230,185,111,.10);
}
.geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-panel :focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px; box-shadow: 0 0 0 3px rgba(230,185,111,.14);
}
@media (max-width: 620px) {
  .geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-panel { padding: 9px 10px; font-size: 10px; }
  .geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-group { grid-template-columns: 1fr; }
  .geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-canvas { max-width: 280px; }
}
@media (prefers-reduced-motion: reduce) {
  .geo-layout[data-geography-v2-e050="on"] .geography-v2-e050-panel * {
    transition: none !important; animation: none !important; scroll-behavior: auto !important;
  }
}
`;

/* ---------- Laboratoire canvas : dessin déterministe ---------- */

function drawLab() {
  const n = S.nodes;
  const cv = n.canvas;
  const box = S.box;
  if (!cv || typeof cv.getContext !== 'function' || !box) return;
  const painter = cv.getContext('2d');
  if (!painter) return;

  const cssW = clamp(cv.clientWidth || 320, 160, 320);
  const cssH = cssW * ASPECT;
  const dpr = clamp((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 1, 2);
  const pxW = Math.round(cssW * dpr);
  const pxH = Math.round(cssH * dpr);
  if (cv.width !== pxW || cv.height !== pxH) {
    cv.width = pxW;
    cv.height = pxH;
  }
  painter.setTransform(dpr, 0, 0, dpr, 0, 0);
  painter.clearRect(0, 0, cssW, cssH);

  let theme = null;
  try { theme = typeof getComputedStyle === 'function' ? getComputedStyle(cv) : null; } catch { /* repli */ }
  const color = (name, fallback) => {
    const v = theme ? theme.getPropertyValue(name).trim() : '';
    return v || fallback;
  };
  const ink = color('--ink', '#e8e6e0');
  const gold = color('--gold', '#d9b166');
  const bright = color('--gold-bright', '#f0d18c');
  const muted = color('--muted', '#9aa0a8');
  const sx = cssW / MAP_W;
  const sy = cssH / MAP_H;

  /* Cadre complet. */
  painter.strokeStyle = muted;
  painter.lineWidth = 1;
  painter.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);

  /* E050-08 — grille de repérage, activée par la bascule indépendante. */
  if (S.grid) {
    painter.strokeStyle = muted;
    painter.globalAlpha = 0.35;
    painter.lineWidth = 1;
    painter.setLineDash([2, 4]);
    for (let i = 1; i < 6; i += 1) {
      const gx = (i * cssW) / 6;
      const gy = (i * cssH) / 6;
      painter.beginPath();
      painter.moveTo(gx, 0);
      painter.lineTo(gx, cssH);
      painter.moveTo(0, gy);
      painter.lineTo(cssW, gy);
      painter.stroke();
    }
    painter.setLineDash([]);
    painter.globalAlpha = 1;
  }

  /* Points témoins reproductibles (graine affichée) : des pastilles, pas du hasard. */
  pointsTemoins().forEach((pt) => {
    painter.fillStyle = ink;
    painter.beginPath();
    painter.arc(pt.x * sx, pt.y * sy, 1.6, 0, Math.PI * 2);
    painter.fill();
  });

  /* Fenêtre visible (viewBox). */
  const wx = box.x * sx;
  const wy = box.y * sy;
  const ww = box.w * sx;
  const wh = box.h * sy;
  painter.fillStyle = 'rgba(230,185,111,.10)';
  painter.fillRect(wx, wy, ww, wh);
  painter.strokeStyle = bright;
  painter.lineWidth = 2;
  painter.strokeRect(wx + 1, wy + 1, Math.max(1, ww - 2), Math.max(1, wh - 2));

  /* Poignées de coin : la forme, pas la couleur, signale la fenêtre. */
  painter.fillStyle = bright;
  [[wx, wy], [wx + ww, wy], [wx, wy + wh], [wx + ww, wy + wh]].forEach(([hx, hy]) => {
    painter.beginPath();
    painter.rect(hx - 2.5, hy - 2.5, 5, 5);
    painter.fill();
  });

  /* Centre de la fenêtre : repère de déplacement. */
  const cx = (box.x + box.w / 2) * sx;
  const cy = (box.y + box.h / 2) * sy;
  painter.strokeStyle = gold;
  painter.lineWidth = 1;
  painter.beginPath();
  painter.moveTo(cx - 5, cy);
  painter.lineTo(cx + 5, cy);
  painter.moveTo(cx, cy - 5);
  painter.lineTo(cx, cy + 5);
  painter.stroke();

  /* Étiquette d'échelle, redondée en texte sous le canvas. */
  painter.fillStyle = ink;
  painter.font = `${Math.max(9, Math.round(cssW * 0.045))}px sans-serif`;
  painter.fillText(`×${num(scaleOf(box), 1)}`, 6, cssH - 6);
}

/* ---------- Région live unique ---------- */

function updateReadout(cause) {
  const n = S.nodes;
  if (!n.readout) return;
  const box = S.box;
  const m = measures(box, S.mapWidth);
  const preset = PRESETS[S.selected];
  const verbs = {
    balayage: 'Balayage en cours',
    preset: `Fenêtre « ${preset.nom} »`,
    clavier: 'Déplacement au clavier',
    glisser: 'Déplacement par glisser',
    grille: 'Grille de repérage',
    largeur: 'Largeur de carte modifiée',
    demarrage: 'Panoramique lancé',
    arret: 'Panoramique arrêté',
    initial: 'Fenêtre initiale',
  };
  const croise = m.coherent
    ? `contrôle croisé cohérent (${num(m.dx, 1)} = ${num(m.cross, 1)})`
    : 'contrôle croisé en échec';
  n.readout.textContent =
    `${verbs[cause] || 'Fenêtre'} · viewBox x ${num(box.x, 1)}, y ${num(box.y, 1)}, ` +
    `largeur ${num(box.w, 1)}, hauteur ${num(box.h, 1)} · échelle ×${num(m.scale, 2)} ` +
    `par rapport au cadre complet · bornes x [0 ; ${num(m.bornesX, 1)}], ` +
    `y [0 ; ${num(m.bornesY, 1)}] · 40 px déplacent la fenêtre de ${num(m.dx, 1)} unité(s) carte ` +
    `(référence plein cadre ${num(m.refDx, 1)}, ${croise}).`;
}

/* ---------- Synchronisation des contrôles et du texte dérivé ---------- */

function syncControls(cause) {
  const n = S.nodes;
  if (S.radios) {
    S.radios.forEach((radio, i) => {
      const on = i === S.selected;
      radio.setAttribute('aria-checked', on ? 'true' : 'false');
      radio.tabIndex = on ? 0 : -1;
    });
  }
  if (n.range) {
    n.range.value = String(S.mapWidth);
    if (n.rangeValue) n.rangeValue.textContent = `${num(S.mapWidth, 0)} px`;
  }
  if (n.gridBtn) {
    n.gridBtn.setAttribute('aria-pressed', S.grid ? 'true' : 'false');
    n.gridBtn.textContent = S.grid ? 'Grille : affichée' : 'Grille : masquée';
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le panoramique' : '▶ Lancer le panoramique';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E050Reduced = S.reduced ? '1' : '0';
  if (n.boxText) {
    const b = S.box;
    n.boxText.textContent =
      `ViewBox de la maquette : x ${num(b.x, 1)}, y ${num(b.y, 1)}, largeur ${num(b.w, 1)}, ` +
      `hauteur ${num(b.h, 1)} (unités SVG d'un cadre ${MAP_W} × ${MAP_H}).`;
  }
  if (n.mesureDx) {
    const m = measures(S.box, S.mapWidth);
    n.mesureDx.textContent =
      `un glisser de 40 px sur une carte de ${num(m.w, 0)} px déplace la fenêtre de ` +
      `${num(m.dx, 1)} unité(s) carte, soit ${num(m.pxToMap, 3)} unité(s) par pixel écran.`;
  }
  if (cause) updateReadout(cause);
  drawLab();
}

/* ---------- Sélection d'une fenêtre (radiogroupe, choix unique) ---------- */

function applyPreset(index, cause) {
  S.selected = clamp(index, 0, PRESETS.length - 1);
  const p = PRESETS[S.selected];
  S.box = clampBox(p.x, p.y, p.w);
  S.sweep = S.selected * (SWEEP_MS / PRESETS.length);
  syncControls(cause || 'preset');
}

/* ---------- Boucle rAF unique, pause sur document.hidden et hors écran ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced || S.offscreen) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced || S.offscreen) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing) S.sweep = (S.sweep + dt) % SWEEP_MS;
  }
  S.lastTs = ts;
  if (S.playing) {
    const phase = (S.sweep / SWEEP_MS) * Math.PI * 2;
    const spanX = (MAP_W - S.box.w) / 2;
    const spanY = (MAP_H - S.box.h) / 2;
    const cx = MAP_W / 2 + spanX * Math.sin(phase);
    const cy = MAP_H / 2 + spanY * Math.sin(phase * 0.7 + RAD);
    S.box = clampBox(cx - S.box.w / 2, cy - S.box.h / 2, S.box.w);
    drawLab();
    /* Une annonce toutes les ~15 frames : la région live reste lisible. */
    S.tickCount += 1;
    if (S.tickCount >= 15) {
      S.tickCount = 0;
      updateReadout('balayage');
    }
    S.rafId = requestAnimationFrame(tick);
  }
}

function installGlobalListeners(ctx) {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : mq.matches;
        if (S.reduced) { S.playing = false; stopLoop(); }
        else startLoop();
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source vivante. */ }
  }
}

/* Observateurs : pause hors écran et redessin lors d'un changement de taille. */
function installObservers() {
  const cv = S.nodes.canvas;
  if (!cv || !cv.isConnected || typeof IntersectionObserver !== 'function') return;
  if (!S.observersInstalled) {
    S.observersInstalled = true;
    S.intersection = new IntersectionObserver((entrees) => {
      const e = entrees[entrees.length - 1];
      S.offscreen = !e.isIntersecting;
      if (S.offscreen) stopLoop(); else startLoop();
    }, { rootMargin: '40px' });
    if (typeof ResizeObserver === 'function') S.resize = new ResizeObserver(() => drawLab());
  }
  if (S.observedCanvas !== cv) {
    if (S.observedCanvas && S.intersection) S.intersection.unobserve(S.observedCanvas);
    if (S.observedCanvas && S.resize) S.resize.unobserve(S.observedCanvas);
    S.observedCanvas = cv;
    S.intersection.observe(cv);
    if (S.resize) S.resize.observe(cv);
  }
}

/* ---------- Construction de la fiche sémantique ---------- */

function staticTable() {
  const table = E('table', 'geography-v2-e050-table');
  table.id = P + 'table';
  const caption = E('caption', '', 'Fenêtres de référence — grandeurs recalculées depuis le viewBox et l’échelle relative.');
  table.appendChild(caption);
  const thead = E('thead');
  const hr = E('tr');
  ['Fenêtre', 'x', 'y', 'Largeur', 'Hauteur', 'Échelle'].forEach((t) => {
    const th = E('th', '', t);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = E('tbody');
  PRESETS.forEach((p) => {
    const b = clampBox(p.x, p.y, p.w);
    const tr = E('tr');
    [p.nom, num(b.x, 1), num(b.y, 1), num(b.w, 1), num(b.h, 1), `×${num(scaleOf(b), 2)}`]
      .forEach((t) => tr.appendChild(E('td', '', t)));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function buildPanel(ctx, layout) {
  const panel = E('section', 'geography-v2-e050-panel');
  panel.id = P + 'panel';
  panel.setAttribute('aria-label', 'Panoramique — déplacement de la fenêtre de vue');
  panel.dataset.sim = 'panoramique-fenetre-vue';

  panel.appendChild(E('h2', '', 'Panoramique — déplacer la fenêtre, pas le monde'));
  const lede = E('p', 'geography-v2-e050-lede',
    'La carte est un dessin vectoriel cadré par un viewBox (x, y, largeur, hauteur). ' +
    'Déplacer la carte revient à translater cette fenêtre dans un cadre fixe de ' +
    `${MAP_W} × ${MAP_H} unités ; zoomer revient à réduire sa largeur. Toutes les valeurs ci-dessous ` +
    'sont écrites en texte et recalculées depuis leur formule : le schéma n’apporte aucune information exclusive.');
  panel.appendChild(lede);

  /* E050-01 — lexique défini à la première occurrence. */
  panel.appendChild(E('h3', '', 'Lexique'));
  const dl = E('dl', 'geography-v2-e050-glossaire');
  dl.id = P + 'glossaire';
  GLOSSAIRE.forEach(([terme, def]) => {
    dl.appendChild(E('dt', '', terme));
    dl.appendChild(E('dd', '', def));
  });
  panel.appendChild(dl);

  /* E050-04 — tableau statique recalculé, lisible sans JS actif. */
  panel.appendChild(E('h3', '', 'Fenêtres de référence'));
  panel.appendChild(staticTable());

  const boxText = E('p', 'geography-v2-e050-fait', '');
  boxText.id = P + 'box-text';
  panel.appendChild(boxText);

  /* E050-09 — radiogroupe de fenêtres : choix unique, pas d'aria-pressed. */
  const field = E('fieldset', 'geography-v2-e050-field');
  field.setAttribute('role', 'radiogroup');
  field.setAttribute('aria-label', 'Choisir une fenêtre de visualisation (choix unique)');
  const legend = E('legend', '', 'Fenêtre de visualisation');
  field.appendChild(legend);
  const group = E('div', 'geography-v2-e050-group');
  group.id = P + 'group';
  PRESETS.forEach((p, i) => {
    const radio = E('button', 'geography-v2-e050-preset', `${p.nom} — largeur ${num(p.w, 0)}`);
    radio.type = 'button';
    radio.id = P + `radio-${i}`;
    radio.setAttribute('role', 'radio');
    radio.setAttribute('aria-checked', i === S.selected ? 'true' : 'false');
    radio.tabIndex = i === S.selected ? 0 : -1;
    group.appendChild(radio);
  });
  field.appendChild(group);
  panel.appendChild(field);

  /* E050-07 — région live unique. */
  const readout = E('p', 'geography-v2-e050-readout', '');
  readout.id = P + 'readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  panel.appendChild(readout);

  /* E050-05 — laboratoire canvas, redondé par le texte. */
  const figure = E('figure', 'geography-v2-e050-figure');
  figure.id = P + 'figure';
  const canvas = E('canvas', 'geography-v2-e050-canvas');
  canvas.id = P + 'canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Maquette du viewBox : un rectangle clair se déplace dans le cadre 900 sur 620, ' +
    'avec quatre poignées, une croix centrale et cinq points témoins. ' +
    'Flèches pour déplacer, Plus et Moins pour zoomer, zéro pour le plein cadre.');
  canvas.setAttribute('aria-describedby', P + 'clavier');
  const caption = E('figcaption', 'geography-v2-e050-caption',
    'Maquette non à l’échelle du terrain : le rectangle clair est la fenêtre visible, les croix ses poignées, ' +
    'le trait central son centre et les pastilles cinq points témoins reproductibles (graine 45e050). ' +
    'Bornes et échelle sont écrites en texte dans le tableau et le statut.');
  caption.id = P + 'caption';
  figure.append(canvas, caption);
  panel.appendChild(figure);

  /* E050-08 — repères en glyphes, jamais la seule couleur. */
  const legendText = E('p', 'geography-v2-e050-fait',
    'E050-08 · Repères : ▭ fenêtre visible · ✛ centre · ┄ grille de repérage (bouton ci-dessous) · ' +
    '● points témoins. La forme, le contraste et les poignées distinguent la fenêtre, même en niveaux de gris.');
  legendText.id = P + 'legend';
  panel.appendChild(legendText);

  /* E050-06 — trois grandeurs chiffrées, dont une comparée à une référence. */
  const ul = E('ul');
  ul.id = P + 'mesures';
  const m = measures(S.box, S.mapWidth);
  [
    `Cadre de référence : ${MAP_W} × ${MAP_H} unités SVG, échelle ×1 : c’est la fenêtre « Plein cadre ».`,
    `Zoom maximal de la vue : largeur ${num(MIN_W, 1)} unités, soit une échelle ×${num(MAP_W / MIN_W, 0)} par rapport au cadre complet.`,
    `Fenêtre courante : largeur ${num(S.box.w, 1)} → échelle ×${num(m.scale, 2)}.`,
    `Référence : 40 px au plein cadre déplacent ${num(m.refDx, 1)} unités carte ; ici ${num(m.dx, 1)} unité(s), soit un rapport de ${num(m.scale, 2)}.`,
  ].forEach((t) => ul.appendChild(E('li', '', t)));
  const dxLi = E('li', '', '');
  dxLi.id = P + 'mesure-dx';
  ul.appendChild(dxLi);
  panel.appendChild(ul);

  /* E050-03 — curseur de largeur de carte, synchronisé avec les formules. */
  const controls = E('div', 'geography-v2-e050-controls');
  const rangeLabel = E('label', '', 'Largeur de la carte : ');
  const rangeValue = E('span', '', `${num(S.mapWidth, 0)} px`);
  rangeValue.id = P + 'range-value';
  rangeLabel.setAttribute('for', P + 'range');
  rangeLabel.appendChild(rangeValue);
  const range = E('input', 'geography-v2-e050-range');
  range.type = 'range';
  range.id = P + 'range';
  range.min = '240';
  range.max = '720';
  range.step = '20';
  range.value = String(S.mapWidth);
  controls.append(rangeLabel, range);

  /* E050-08 (suite) — bascule indépendante : aria-pressed légitime ici. */
  const gridBtn = E('button', 'geography-v2-e050-btn', S.grid ? 'Grille : affichée' : 'Grille : masquée');
  gridBtn.type = 'button';
  gridBtn.id = P + 'grid';
  gridBtn.setAttribute('aria-pressed', S.grid ? 'true' : 'false');
  gridBtn.setAttribute('aria-controls', P + 'canvas');
  controls.appendChild(gridBtn);

  /* Bouton de pas discret, utile en mouvement réduit. */
  const stepBtn = E('button', 'geography-v2-e050-btn', 'Fenêtre suivante');
  stepBtn.type = 'button';
  stepBtn.id = P + 'step';
  stepBtn.setAttribute('aria-controls', P + 'canvas');
  controls.appendChild(stepBtn);

  /* E050-10 — commande de balayage (une seule boucle rAF). */
  const play = E('button', 'geography-v2-e050-btn', S.playing ? '■ Arrêter le panoramique' : '▶ Lancer le panoramique');
  play.type = 'button';
  play.id = P + 'play';
  play.setAttribute('aria-controls', P + 'readout');
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  controls.appendChild(play);
  panel.appendChild(controls);

  /* E050-09 — équipement clavier du schéma. */
  const clavier = E('p', 'geography-v2-e050-fait',
    'E050-09 · Clavier : Tab atteint les quatre fenêtres, la maquette, puis les boutons. ' +
    '← → déplacent la fenêtre de 40 unités carte, ↑ ↓ de 30, + et − zooment, 0 revient au plein cadre. ' +
    'Sur un radio, les flèches changent de fenêtre. Le glisser à la souris fait le même travail.');
  clavier.id = P + 'clavier';
  panel.appendChild(clavier);

  /* E050-10 — limite falsifiable en cinq temps, alignée sur les angles morts. */
  const limite = E('p', 'geography-v2-e050-fait',
    'E050-10 · Limite et vérification : 1) prédire qu’un glisser de 40 px vers la droite recule la fenêtre ; ' +
    '2) régler la fenêtre « Centre » ; 3) attendre la valeur annoncée dans le statut ; ' +
    '4) falsifier si le déplacement mesuré diffère de dx_écran × largeur / largeur_écran ; ' +
    '5) débrief : la maquette ignore preserveAspectRatio (des marges peuvent apparaître si le conteneur n’a pas le ratio 900/620), ' +
    'l’inertie, la capture du pointeur et l’état propre de la vue : elle modélise la géométrie du viewBox, pas le rendu réel.');
  limite.id = P + 'limite';
  panel.appendChild(limite);

  const host = layout.querySelector('.geo-panel') || layout;
  host.appendChild(panel);

  return {
    panel, canvas, readout, boxText, range, rangeValue, gridBtn, stepBtn, play,
    fresh: S.panelNode !== panel,
  };
}

/* ---------- Point d'entrée ---------- */

register('E050', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  E = typeof ctx.el === 'function' ? ctx.el : E;
  ctx.css(CSS_ID, CSS);

  const layout = ctx.layout;
  layout.setAttribute('data-geography-v2-e050', 'on');

  /* Instantané déterministe du viewBox réel, avec repli au plein cadre. */
  const initial = readViewBox(layout);
  S.box = initial ? clampBox(initial.x, initial.y, initial.w) : clampBox(0, 0, MAP_W);
  if (!initial) S.selected = 0;
  layout.setAttribute('data-geography-v2-e050-viewbox',
    initial ? `${initial.x},${initial.y},${initial.w},${initial.h}` : 'none');
  layout.setAttribute('data-geography-v2-e050-seed', GRAINE.toString(16));
  layout.setAttribute('data-geography-v2-e050-presets', String(PRESETS.length));

  S.nodes = buildPanel(ctx, layout);
  S.radios = Array.from(S.nodes.panel.querySelectorAll('.geography-v2-e050-preset'));
  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.reduced) { S.playing = false; stopLoop(); }

  installGlobalListeners(ctx);
  installObservers();
  syncControls('initial');

  if (S.nodes.fresh && S.boundPanel !== S.nodes.panel) {
    S.boundPanel = S.nodes.panel;
    const n = S.nodes;

    S.radios.forEach((radio, i) => {
      radio.addEventListener('click', () => applyPreset(i, 'preset'));
    });

    n.range.addEventListener('input', () => {
      const v = Number(n.range.value);
      S.mapWidth = finite(v) ? clamp(v, 240, 720) : S.mapWidth;
      syncControls('largeur');
    });

    n.gridBtn.addEventListener('click', () => {
      S.grid = !S.grid;
      syncControls('grille');
    });

    n.stepBtn.addEventListener('click', () => {
      applyPreset((S.selected + 1) % PRESETS.length, 'preset');
    });

    n.play.addEventListener('click', () => {
      if (S.reduced) {
        applyPreset((S.selected + 1) % PRESETS.length, 'preset');
        S.playing = false;
        stopLoop();
        syncControls('arret');
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) { stopLoop(); updateReadout('arret'); }
      else { S.lastTs = 0; startLoop(); updateReadout('demarrage'); }
      syncControls();
    });

    /* Clavier : déplacement, zoom et fenêtres sur la maquette et les radios. */
    n.panel.addEventListener('keydown', (event) => {
      const target = event.target;
      const isRadio = target && target.classList && target.classList.contains('geography-v2-e050-preset');
      if (isRadio && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        const dir = (event.key === 'ArrowRight' || event.key === 'ArrowDown') ? 1 : -1;
        applyPreset((S.selected + dir + PRESETS.length) % PRESETS.length, 'preset');
        S.radios[S.selected].focus();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (target !== n.canvas) return;
      const b = S.box;
      if (event.key === 'ArrowRight') S.box = panBy(b, -40, 0);
      else if (event.key === 'ArrowLeft') S.box = panBy(b, 40, 0);
      else if (event.key === 'ArrowDown') S.box = panBy(b, 0, -30);
      else if (event.key === 'ArrowUp') S.box = panBy(b, 0, 30);
      else if (event.key === '+' || event.key === '=') {
        S.box = clampBox(b.x + b.w * 0.1, b.y + b.h * 0.1, b.w * 0.8);
      } else if (event.key === '-' || event.key === '_') {
        S.box = clampBox(b.x - b.w * 0.125, b.y - b.h * 0.125, b.w * 1.25);
      } else if (event.key === '0') {
        applyPreset(0, 'preset');
        event.preventDefault();
        event.stopPropagation();
        return;
      } else return;
      event.preventDefault();
      event.stopPropagation();
      syncControls('clavier');
    });

    /* Glisser sur la maquette, même relation que la vue. */
    let drag = null;
    n.canvas.addEventListener('pointerdown', (event) => {
      drag = { x: event.clientX, y: event.clientY, box: S.box };
      try { n.canvas.setPointerCapture(event.pointerId); } catch { /* capture indisponible */ }
    });
    n.canvas.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const rect = n.canvas.getBoundingClientRect();
      const moved = screenToMap(event.clientX - drag.x, event.clientY - drag.y, drag.box, rect.width, rect.height);
      S.box = panBy(drag.box, moved.dx, moved.dy);
      syncControls('glisser');
    });
    const endDrag = () => { drag = null; };
    n.canvas.addEventListener('pointerup', endDrag);
    n.canvas.addEventListener('pointercancel', endDrag);
  }

  S.panelNode = S.nodes.panel;
});
