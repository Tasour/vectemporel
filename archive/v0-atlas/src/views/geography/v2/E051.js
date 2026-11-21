import { register } from './registry.js';

/* V2 — lentille E051 (vague GEOGRAPHIE).
 * Thème : recentrage sur le pays.
 *
 * Les dix chantiers E051-01 … E051-10 sont RÉELLEMENT implémentés ici :
 *   01 section sémantique isolée + CSS préfixé, lisible sans JS, idempotente ;
 *   02 emprise du pays mesurée sur le DOM réel (contour → marqueurs → domaine) ;
 *   03 cadrage « pays entier » avec marge ajustable, ratio 900/620, borné ;
 *   04 grandeurs chiffrées et référence explicite (tableau + formule en texte) ;
 *   05 laboratoire canvas déterministe (DPR ≤ 2, aucune graine aléatoire) ;
 *   06 marges en radiogroupe à choix unique, boutons ≥ 36 px, focus visible ;
 *   07 readout chiffré et statut annoncés en role=status aria-live=polite ;
 *   08 repères non chromatiques (tirets, pointillés, croix, légende, forced-colors) ;
 *   09 transition rAF unique avec pause sur document.hidden, reducedMotion(),
 *      synchronisation viewBox et redimensionnement ;
 *   10 réversibilité, garde-fous et limite falsifiable en cinq temps.
 *
 * Tout est local : aucune requête réseau, aucune graine aléatoire, aucun appel
 * à la console, aucun fichier partagé modifié. Le contenu pédagogique est du
 * texte sémantique réel (titres, paragraphes, tableau, fieldset, liste)
 * présent dans le DOM dès la construction ; le canvas n'est qu'un laboratoire
 * dont chaque grandeur est aussi écrite en toutes lettres dans le readout.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

/* ---------- Identifiants (tous préfixés geography-v2-e051-) ---------- */

const CSS_ID = 'geography-v2-e051';
const PANEL_ID = 'geography-v2-e051-panel';
const TITLE_ID = 'geography-v2-e051-title';
const INTRO_ID = 'geography-v2-e051-intro';
const FAIT_CLASS = 'geography-v2-e051-fait';
const FORMULE_ID = 'geography-v2-e051-formule';
const TABLE_ID = 'geography-v2-e051-table';
const READOUT_ID = 'geography-v2-e051-readout';
const PADS_ID = 'geography-v2-e051-pads';
const PAD_NAME = 'geography-v2-e051-pad';
const CANVAS_ID = 'geography-v2-e051-canvas';
const ACTIONS_ID = 'geography-v2-e051-actions';
const RECENTER_ID = 'geography-v2-e051-recenter';
const RESET_ID = 'geography-v2-e051-reset';
const STOP_ID = 'geography-v2-e051-stop';
const STATUS_ID = 'geography-v2-e051-status';
const LIMITE_ID = 'geography-v2-e051-limite';
const DEFI_ID = 'geography-v2-e051-defi';

/* Constantes miroir de geography.js (documentées comme telles : risque de
 * dérive si la coque change). */
const MAP_W = 900;
const MAP_H = 620;
const ASPECT = MAP_W / MAP_H;
const DURATION_MS = 900;
const SEED = 0xE051;

/* Présences de marge : fraction de la plus grande dimension de l'emprise.
 * Trois choix exclusifs => radiogroupe (pas d'aria-pressed détourné). */
const PADS = [
  { key: 'serre', label: 'Serré — 5 %', value: 0.05 },
  { key: 'normal', label: 'Normal — 12 %', value: 0.12 },
  { key: 'large', label: 'Large — 25 %', value: 0.25 },
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  pad: 0.12,
  ctx: null,
  svg: null,
  dom: {},
  fullBox: { x: 0, y: 0, w: MAP_W, h: MAP_H },
  extent: null,
  fit: null,
  metrics: null,
  current: null,
  source: 'contour',
  anim: null,
  visibilityBound: false,
  resizeBound: false,
  boxObserver: null,
  suppress: 0,
};

/* ---------- Utilitaires déterministes (aucun aléa) ---------- */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function fmt0(value) {
  if (!Number.isFinite(value)) return '—';
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

function fmt1(value) {
  if (!Number.isFinite(value)) return '—';
  return (Math.round(value * 10) / 10).toFixed(1).replace('.', ',');
}

function fmt2(value) {
  if (!Number.isFinite(value)) return '—';
  return (Math.round(value * 100) / 100).toFixed(2).replace('.', ',');
}

/* Graine affichée, jamais de tirage imprévisible : le décalage des tirets du
 * laboratoire est dérivé d'une graine fixe, donc reproductible à l'identique. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const DASH_PHASE = Math.floor(mulberry32(SEED)() * 8);

function parsePoints(raw) {
  if (!raw) return [];
  const out = [];
  raw.trim().split(/[\s,]+/).forEach((token, index, all) => {
    const pair = token.split(',');
    if (pair.length !== 2) return;
    const x = Number(pair[0]);
    const y = Number(pair[1]);
    if (Number.isFinite(x) && Number.isFinite(y)) out.push({ x, y, i: index, n: all.length });
  });
  return out;
}

function extentFrom(points) {
  if (!points.length) return null;
  let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  if (![minX, maxX, minY, maxY].every(Number.isFinite)) return null;
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY,
    cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, points };
}

/* [E051-02] Emprise du pays depuis le DOM réel, sans donnée inventée. */
function measureExtent(svg) {
  const outline = svg && svg.querySelector ? svg.querySelector('.geo-outline') : null;
  const fromOutline = extentFrom(parsePoints(outline && outline.getAttribute('points')));
  if (fromOutline && fromOutline.w > 0 && fromOutline.h > 0) {
    return { extent: fromOutline, source: 'contour' };
  }
  /* Repli 1 : centres des marqueurs réellement rendus. */
  const marks = [];
  if (svg && svg.querySelectorAll) {
    svg.querySelectorAll('.geo-marker .geo-ring').forEach((ring) => {
      const x = Number(ring.getAttribute('cx'));
      const y = Number(ring.getAttribute('cy'));
      if (Number.isFinite(x) && Number.isFinite(y)) marks.push({ x, y });
    });
  }
  const fromMarks = extentFrom(marks);
  if (fromMarks && fromMarks.w > 0 && fromMarks.h > 0) {
    return { extent: fromMarks, source: 'marqueurs' };
  }
  /* Repli final : aucun contour ni marqueur exploitable — on cale la vue sur
     le domaine complet et on le dit explicitement (aucune donnée inventée). */
  return {
    extent: extentFrom([{ x: 0, y: 0 }, { x: MAP_W, y: MAP_H }]),
    source: 'vue-complète',
  };
}

/* [E051-03] Cadrage « pays entier » respectant le ratio du viewBox, puis
 * borné au domaine de la carte (exactement comme applyBox de la coque). */
function computeFit(extent, padFrac) {
  const pad = padFrac * Math.max(extent.w, extent.h);
  const wantW = extent.w + 2 * pad;
  const wantH = extent.h + 2 * pad;
  let w = wantW;
  let h = w / ASPECT;
  if (h < wantH) { h = wantH; w = h * ASPECT; }
  w = clamp(w, MAP_W / 8, MAP_W);
  h = w / ASPECT;
  if (h > MAP_H) { h = MAP_H; w = h * ASPECT; }
  let x = extent.cx - w / 2;
  let y = extent.cy - h / 2;
  x = clamp(x, 0, MAP_W - w);
  y = clamp(y, 0, MAP_H - h);
  return { x, y, w, h, pad, wantW, wantH };
}

/* [E051-04] Grandeurs recalculées, dont une comparée à une référence. */
function computeMetrics(extent, fit) {
  const zoom = MAP_W / fit.w;
  const coverage = (extent.w * extent.h) / (fit.w * fit.h);
  const padPct = Math.max(extent.w, extent.h) > 0
    ? (fit.pad / Math.max(extent.w, extent.h)) * 100 : 0;
  const offset = Math.hypot(extent.cx - MAP_W / 2, extent.cy - MAP_H / 2);
  const diag = Math.hypot(MAP_W, MAP_H);
  return {
    zoom,
    coverage,
    padPct,
    offset,
    offsetPct: diag > 0 ? (offset / diag) * 100 : 0,
    extentW: extent.w,
    extentH: extent.h,
    frameW: fit.w,
    frameH: fit.h,
  };
}

/* [E051-09] Lecture / écriture du viewBox avec garde anti-retour. */
function readBox() {
  const raw = S.svg && S.svg.getAttribute ? S.svg.getAttribute('viewBox') : null;
  if (!raw) return { ...S.fullBox };
  const parts = raw.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((v) => !Number.isFinite(v))
    || parts[2] <= 0 || parts[3] <= 0) return { ...S.fullBox };
  return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
}

function writeBox(box) {
  if (!S.svg || !S.svg.setAttribute) return;
  S.suppress += 1;
  try {
    S.svg.setAttribute('viewBox',
      `${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.w.toFixed(2)} ${box.h.toFixed(2)}`);
  } finally {
    S.suppress -= 1;
  }
  S.current = { ...box };
}

/* ---------- [E051-05 / E051-08] Laboratoire canvas ---------- */

function drawLab(box) {
  const canvas = S.dom.canvas;
  if (!canvas || !S.extent || !S.fit) return;
  const cssW = Math.max(1, canvas.clientWidth || 320);
  const cssH = Math.max(1, canvas.clientHeight || 210);
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pxW = Math.round(cssW * dpr);
  const pxH = Math.round(cssH * dpr);
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }
  const g = canvas.getContext('2d');
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const padPx = 10;
  const scale = Math.min((cssW - 2 * padPx) / MAP_W, (cssH - 2 * padPx) / MAP_H);
  const offX = (cssW - MAP_W * scale) / 2;
  const offY = (cssH - MAP_H * scale) / 2;
  const X = (x) => offX + x * scale;
  const Y = (y) => offY + y * scale;

  /* Fond : domaine complet de la carte (référence 1,00 ×). */
  g.fillStyle = 'rgba(255,255,255,.03)';
  g.fillRect(X(0), Y(0), MAP_W * scale, MAP_H * scale);
  g.strokeStyle = 'rgba(180,180,180,.55)';
  g.lineWidth = 1;
  g.setLineDash([4, 4]);
  g.lineDashOffset = -DASH_PHASE;
  g.strokeRect(X(0) + 0.5, Y(0) + 0.5, MAP_W * scale - 1, MAP_H * scale - 1);
  g.setLineDash([]);
  g.lineDashOffset = 0;

  /* Contour du pays : forme pleine, jamais la seule couleur. */
  g.beginPath();
  S.extent.points.forEach((p, i) => {
    if (i === 0) g.moveTo(X(p.x), Y(p.y)); else g.lineTo(X(p.x), Y(p.y));
  });
  g.closePath();
  g.fillStyle = 'rgba(230,185,111,.16)';
  g.fill();
  g.strokeStyle = 'rgba(230,185,111,.95)';
  g.lineWidth = 1.4;
  g.stroke();

  /* Cadre courant (pointillés) et cible recentrée (trait plein). */
  const drawFrame = (b, color, dash, width) => {
    g.save();
    g.strokeStyle = color;
    g.lineWidth = width;
    g.setLineDash(dash);
    g.strokeRect(X(b.x), Y(b.y), b.w * scale, b.h * scale);
    g.restore();
  };
  drawFrame(box, 'rgba(255,255,255,.80)', [2, 4], 1.4);
  drawFrame(S.fit, 'rgba(120,220,170,.95)', [], 2);

  /* Croix des centres : repère textuel, distinct du trait de couleur. */
  const cross = (cx, cy, color, label) => {
    g.save();
    g.strokeStyle = color;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(X(cx) - 5, Y(cy)); g.lineTo(X(cx) + 5, Y(cy));
    g.moveTo(X(cx), Y(cy) - 5); g.lineTo(X(cx), Y(cy) + 5);
    g.stroke();
    g.font = '9px system-ui, sans-serif';
    g.fillStyle = color;
    g.fillText(label, X(cx) + 7, Y(cy) - 6);
    g.restore();
  };
  cross(MAP_W / 2, MAP_H / 2, 'rgba(180,180,180,.85)', 'C carte');
  cross(S.extent.cx, S.extent.cy, 'rgba(244,214,158,1)', 'C pays');

  /* Légende du laboratoire, en français, directement sur le canvas. */
  g.font = '10px system-ui, sans-serif';
  g.fillStyle = 'rgba(255,255,255,.85)';
  g.fillText('— trait plein : cadrage pays', X(0) + 6, Y(0) + 14);
  g.fillStyle = 'rgba(255,255,255,.65)';
  g.fillText('┄ pointillés : cadre courant', X(0) + 6, Y(0) + 27);
  g.fillStyle = 'rgba(180,180,180,.75)';
  g.fillText('▭ tirets : vue complète (référence)', X(0) + 6, Y(0) + 40);
}

/* ---------- [E051-04 / E051-07] Statut et tableau ---------- */

function announce(message) {
  const status = S.dom.status;
  if (status) status.textContent = message;
}

function refreshReadout(box) {
  const m = S.metrics;
  if (!m || !S.dom.tableBody) return;
  const currentZoom = box && box.w > 0 ? MAP_W / box.w : m.zoom;
  const rows = [
    ['Emprise du pays (unités de vue)', `${fmt0(m.extentW)} × ${fmt0(m.extentH)}`],
    ['Cadre recentré (unités de vue)', `${fmt0(m.frameW)} × ${fmt0(m.frameH)}`],
    ['Facteur de zoom', `${fmt2(m.zoom)} × — référence : vue complète 1,00 ×`],
    ['Part du cadre occupée par le pays', `${fmt1(m.coverage * 100)} %`],
    ['Marge ajoutée', `${fmt0(S.fit ? S.fit.pad : 0)} u (${fmt0(m.padPct)} %)`],
    ['Décalage du centre', `${fmt0(m.offset)} u (${fmt1(m.offsetPct)} % de la diagonale)`],
    ['Zoom actuellement affiché', `${fmt2(currentZoom)} ×`],
  ];
  S.dom.tableBody.replaceChildren(...rows.map(([label, value]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = label;
    const td = document.createElement('td');
    td.textContent = value;
    tr.append(th, td);
    return tr;
  }));
  if (S.dom.readout) {
    S.dom.readout.textContent =
      `Recentrage : ${fmt2(m.zoom)} × la vue complète, ${fmt1(m.coverage * 100)} % du cadre occupé, marge ${fmt0(m.padPct)} %.`;
  }
}

/* ---------- [E051-09] Transition rAF unique avec pause ---------- */

function stopAnim(silent) {
  const a = S.anim;
  if (!a) return;
  if (a.rafId !== null) cancelAnimationFrame(a.rafId);
  S.anim = null;
  if (!silent) announce('Transition arrêtée.');
}

function ease(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerpBox(a, b, k) {
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    w: a.w + (b.w - a.w) * k,
    h: a.h + (b.h - a.h) * k,
  };
}

function transition(to, message) {
  stopAnim(true);
  const from = readBox();
  const reduced = Boolean(S.ctx && typeof S.ctx.reducedMotion === 'function' && S.ctx.reducedMotion());
  if (reduced || !S.svg || typeof requestAnimationFrame !== 'function' || document.hidden) {
    writeBox(to);
    drawLab(to);
    refreshReadout(to);
    announce(`${message}${reduced ? ' (affichage instantané : mouvement réduit).' : '.'}`);
    return;
  }
  const a = { rafId: null, from, to, elapsed: 0, last: null };
  S.anim = a;
  const frame = (ts) => {
    if (S.anim !== a) return;
    if (a.last === null) a.last = ts;
    const delta = ts - a.last;
    a.last = ts;
    if (!document.hidden) {
      a.elapsed += Math.max(0, Math.min(80, delta));
      const t = clamp(a.elapsed / DURATION_MS, 0, 1);
      const box = lerpBox(a.from, a.to, ease(t));
      writeBox(box);
      drawLab(box);
      refreshReadout(box);
      if (t >= 1) {
        writeBox(a.to);
        drawLab(a.to);
        refreshReadout(a.to);
        S.anim = null;
        announce(message);
        return;
      }
    }
    a.rafId = requestAnimationFrame(frame);
  };
  a.rafId = requestAnimationFrame(frame);
  announce('Transition vers le cadrage demandé…');
}

/* [E051-09] Garde-fou de visibilité, installé une seule fois. */
function installVisibilityWatch() {
  if (S.visibilityBound || typeof document === 'undefined') return;
  S.visibilityBound = true;
  document.addEventListener('visibilitychange', () => {
    if (S.anim && !document.hidden) S.anim.last = null;
  });
}

/* ---------- [E051-01] Feuille de style unique, isolée et préfixée ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${FAIT_CLASS}{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${FORMULE_ID}{
  display:block;margin:6px 0;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(0,0,0,.22);color:var(--ink-soft,#d7d1c6);font-size:10px;
  line-height:1.7;overflow-wrap:anywhere;font-variant-numeric:tabular-nums;
}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${PADS_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${PADS_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .geography-v2-e051-choix{
  display:inline-flex;align-items:center;gap:6px;min-height:36px;margin-right:6px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .geography-v2-e051-choix input{
  min-width:24px;min-height:24px;width:24px;height:24px;accent-color:var(--gold,#e6b96f);
}
#${ACTIONS_ID}{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 6px}
#${PANEL_ID} button{
  min-height:44px;min-width:44px;padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} :focus-visible,#${PADS_ID} input:focus-visible{
  outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
#${CANVAS_ID}{
  display:block;width:100%;height:220px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);
}
#${READOUT_ID}{color:var(--gold-bright,#f4d69e);font-variant-numeric:tabular-nums}
#${STATUS_ID}{margin:6px 0;color:var(--muted);font-variant-numeric:tabular-nums;min-height:14px}
#${LIMITE_ID}{margin:8px 0;padding:7px 9px;border:1px dashed var(--line);border-radius:8px;color:var(--muted)}
#${DEFI_ID}{margin:6px 0;padding-left:22px;color:var(--ink-soft,#d7d1c6)}
#${DEFI_ID} li{margin:3px 0}
@media (max-width:620px){
  #${PANEL_ID} button{min-height:44px}
  #${CANVAS_ID}{height:200px}
}
@media (forced-colors:active){
  #${PANEL_ID} button,#${CANVAS_ID}{border:1px solid CanvasText}
}
`;

/* ---------- Construction du panneau sémantique ---------- */

function applyExtentText() {
  const sourceLabel = {
    contour: 'du contour du pays',
    marqueurs: 'des lieux affichés (contour indisponible)',
    'vue-complète': 'de la vue complète (aucun contour ni marqueur exploitable)',
  }[S.source];
  return `Emprise mesurée ${sourceLabel} : ${fmt0(S.extent.w)} unités de large sur ${fmt0(S.extent.h)} unités de haut (domaine de référence : ${MAP_W} × ${MAP_H}).`;
}

function buildPanel(ctx) {
  const panel = ctx.el('section', '');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Recentrage sur le pays');
  title.id = TITLE_ID;
  panel.appendChild(title);

  const intro = ctx.el('p', '');
  intro.id = INTRO_ID;
  intro.textContent = 'Cet outil calcule l’emprise du pays à partir de son contour réellement rendu, puis cale le cadre de la carte sur cette emprise avec une marge réglable. Il ne charge aucune donnée : chaque nombre ci-dessous est recalculé depuis le contour et le viewBox affichés.';
  panel.appendChild(intro);

  /* [E051-02 / E051-04] Fait chiffré, texte réel présent dès la construction. */
  panel.appendChild(ctx.el('p', FAIT_CLASS, applyExtentText()));
  panel.appendChild(ctx.el('p', FAIT_CLASS,
    'La mesure vient du DOM réellement rendu par la coque. Si le contour manque, la lentille se replie sur les marqueurs, puis sur le domaine complet, et annonce toujours la source retenue : aucune coordonnée n’est inventée.'));
  panel.appendChild(ctx.el('p', FAIT_CLASS,
    `Toutes les grandeurs sont recalculées à chaque action ; la graine de reproductibilité du laboratoire est ${SEED.toString(16).toUpperCase()} et le décalage des tirets en découle sans tirage aléatoire.`));

  /* [E051-04] Formule explicite, lisible en texte. */
  const formula = ctx.el('code', '',
    'facteur de zoom = 900 / largeur_du_cadre ; part occupée = (emprise_largeur × emprise_hauteur) / (cadre_largeur × cadre_hauteur) ; marge = fraction de la plus grande dimension de l’emprise. Le cadrage garde le ratio 900/620 puis est borné au domaine de la carte.');
  formula.id = FORMULE_ID;
  panel.appendChild(formula);

  /* [E051-04] Tableau de mesures, avec en-tête explicite. */
  const table = ctx.el('table', '');
  table.id = TABLE_ID;
  table.appendChild(ctx.el('caption', '', 'Mesures du recentrage (recalculées à chaque action)'));
  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  ['Grandeur', 'Valeur'].forEach((label) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    hrow.appendChild(th);
  });
  thead.appendChild(hrow);
  table.appendChild(thead);
  const tableBody = document.createElement('tbody');
  table.appendChild(tableBody);
  panel.appendChild(table);

  /* [E051-07] Readout chiffré, région de statut polie. */
  const readout = ctx.el('p', '', '');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  panel.appendChild(readout);

  /* [E051-06] Marges en radiogroupe (choix exclusif), pas aria-pressed. */
  const pads = ctx.el('fieldset', '');
  pads.id = PADS_ID;
  pads.setAttribute('role', 'radiogroup');
  pads.appendChild(ctx.el('legend', '', 'Marge autour du pays (choix unique)'));
  const padRadios = [];
  PADS.forEach((p) => {
    const label = ctx.el('label', 'geography-v2-e051-choix');
    const input = ctx.el('input', '');
    input.type = 'radio';
    input.name = PAD_NAME;
    input.id = `${PADS_ID}-${p.key}`;
    input.value = p.key;
    input.checked = p.value === S.pad;
    input.setAttribute('role', 'radio');
    input.setAttribute('aria-checked', input.checked ? 'true' : 'false');
    input.addEventListener('change', () => {
      if (!input.checked) return;
      S.pad = p.value;
      S.fit = computeFit(S.extent, S.pad);
      S.metrics = computeMetrics(S.extent, S.fit);
      stopAnim(true);
      writeBox(S.fit);
      drawLab(S.fit);
      refreshReadout(S.fit);
      syncRadios();
      announce(`Marge ${p.label} appliquée : le pays est recadré sur ${fmt2(S.metrics.zoom)} ×.`);
    });
    padRadios.push({ input, value: p.value, label: p.label });
    label.append(input, ctx.el('span', '', p.label));
    pads.appendChild(label);
  });
  function syncRadios() {
    padRadios.forEach(({ input, value }) => {
      const on = value === S.pad;
      input.checked = on;
      input.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }
  panel.appendChild(pads);

  /* [E051-05 / E051-08] Laboratoire canvas, illustration seulement. */
  const canvas = ctx.el('canvas', '');
  canvas.id = CANVAS_ID;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Schéma du recentrage : trait plein pour le cadrage pays, pointillés pour le cadre courant, tirets pour la vue complète, croix pour les centres. Flèches gauche et droite pour changer de marge, Entrée pour recentrer.');
  canvas.setAttribute('tabindex', '0');
  panel.appendChild(canvas);
  panel.appendChild(ctx.el('p', '',
    'Dans le schéma, le trait plein délimite le cadrage recentré, les pointillés le cadre actuellement affiché et les tirets la vue complète de référence. Le contour du pays est jaune, les croix marquent les centres de la carte et du pays : l’information ne repose jamais sur la seule couleur.'));
  panel.appendChild(ctx.el('p', '',
    'Équivalent clavier : avec le schéma sélectionné, les flèches gauche et droite parcourent les trois marges et la touche Entrée applique le recentrage. Aucune action n’est réservée à la souris.'));

  /* [E051-06] Commandes accessibles et nommées. */
  const actions = ctx.el('div', '');
  actions.id = ACTIONS_ID;
  const recenter = ctx.el('button', '', 'Recentrer sur le pays');
  recenter.type = 'button';
  recenter.id = RECENTER_ID;
  recenter.addEventListener('click', () => {
    S.fit = computeFit(S.extent, S.pad);
    S.metrics = computeMetrics(S.extent, S.fit);
    transition(S.fit, `Pays recentré : ${fmt2(S.metrics.zoom)} × la vue complète.`);
  });

  const reset = ctx.el('button', '', 'Vue complète');
  reset.type = 'button';
  reset.id = RESET_ID;
  reset.addEventListener('click', () => {
    transition({ ...S.fullBox }, 'Retour à la vue complète (référence 1,00 ×).');
  });

  const stop = ctx.el('button', '', 'Arrêter la transition');
  stop.type = 'button';
  stop.id = STOP_ID;
  stop.addEventListener('click', () => {
    stopAnim(false);
    drawLab(readBox());
    refreshReadout(readBox());
  });
  actions.append(recenter, reset, stop);
  panel.appendChild(actions);

  /* [E051-07] Statut annoncé une seule fois. */
  const status = ctx.el('p', '', 'Panneau prêt. Le cadre est affiché tel quel.');
  status.id = STATUS_ID;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  panel.appendChild(status);

  /* [E051-10] Limite et défi falsifiable en cinq temps. */
  const limite = ctx.el('p', '');
  limite.id = LIMITE_ID;
  limite.textContent = 'Le recentrage porte sur la projection schématique de la coque, pas sur une étendue géodésique réelle : une marge en unités de vue n’est pas une distance au sol. Le calcul ignore la déformation de la projection et tout territoire hors contour rendu.';
  panel.appendChild(ctx.el('h3', '', 'Limite et angle mort'));
  panel.appendChild(limite);

  const defi = ctx.el('ol', '');
  defi.id = DEFI_ID;
  [
    'Prédiction : le facteur de zoom doit être d’autant plus grand que l’emprise du pays est petite.',
    'Réglage : choisissez une marge (5, 12 ou 25 %) puis « Recentrer sur le pays ».',
    'Résultat attendu : le facteur affiché augmente quand le cadre se resserre et la part occupée par le pays grandit.',
    'Falsification : si le facteur reste à 1,00 × alors que le pays occupe une fraction visible du domaine, ou si le cadrage sort du domaine 900 × 620, l’outil est en défaut.',
    'Débrief : le calcul ne tient compte ni de la déformation de la projection ni des territoires hors contour rendu.',
  ].forEach((text) => defi.appendChild(ctx.el('li', '', text)));
  panel.appendChild(defi);

  return { panel, tableBody, readout, status, padRadios, syncRadios, canvas };
}

/* ---------- Point d'entrée unique, idempotent ---------- */

register('E051', (ctx) => {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout || ctx.stage;
  if (!layout) return;

  ctx.css(CSS_ID, CSS);
  installVisibilityWatch();
  stopAnim(true);

  S.ctx = ctx;
  S.svg = layout.querySelector ? layout.querySelector('.geo-svg') : null;
  /* Le domaine complet reste 900×620 quoi que fasse la coque : c'est le
   * repère fixe auquel on compare le facteur de zoom. */
  S.fullBox = { x: 0, y: 0, w: MAP_W, h: MAP_H };

  const measured = measureExtent(S.svg);
  S.extent = measured.extent;
  S.source = measured.source;
  S.fit = computeFit(S.extent, S.pad);
  S.metrics = computeMetrics(S.extent, S.fit);
  S.current = readBox();

  const nodes = buildPanel(ctx);
  S.dom = {
    canvas: nodes.canvas,
    tableBody: nodes.tableBody,
    readout: nodes.readout,
    status: nodes.status,
  };

  /* Équivalent clavier du laboratoire (flèches = marge, Entrée = recentrer). */
  nodes.canvas.addEventListener('keydown', (event) => {
    const idx = PADS.findIndex((p) => p.value === S.pad);
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const next = PADS[(idx + step + PADS.length) % PADS.length];
      const radio = nodes.padRadios.find((r) => r.value === next.value);
      if (radio) radio.input.checked = true;
      radio.input.dispatchEvent(new Event('change'));
    } else if (event.key === 'Enter' || event.key === ' ') {
      document.getElementById(RECENTER_ID).click();
    } else {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  });

  /* Idempotence : on remplace toute instance précédente du panneau. */
  const host = layout.querySelector('.geo-panel') || layout;
  const previous = host.querySelector('#' + PANEL_ID);
  if (previous && previous !== nodes.panel) previous.remove();
  host.appendChild(nodes.panel);

  /* Dessin initial immédiat, puis suivi du viewBox et du redimensionnement. */
  drawLab(S.current);
  refreshReadout(S.current);

  if (typeof MutationObserver !== 'undefined' && S.svg) {
    if (S.boxObserver) S.boxObserver.disconnect();
    S.boxObserver = new MutationObserver(() => {
      if (S.suppress > 0) return;
      S.current = readBox();
      if (!S.anim) {
        drawLab(S.current);
        refreshReadout(S.current);
      }
    });
    S.boxObserver.observe(S.svg, { attributes: true, attributeFilter: ['viewBox'] });
  }

  if (!S.resizeBound && typeof window !== 'undefined' && window.addEventListener) {
    S.resizeBound = true;
    window.addEventListener('resize', () => {
      drawLab(S.anim ? lerpBox(S.anim.from, S.anim.to,
        clamp(S.anim.elapsed / DURATION_MS, 0, 1)) : readBox());
    }, { passive: true });
  }

  announce('Recentrage prêt : choisissez une marge puis « Recentrer sur le pays ».');
});
