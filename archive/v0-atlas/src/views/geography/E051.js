import { register } from './registry.js';

/* Lentille E051 — vue GEOGRAPHIE.
 * Thème : recentrage sur le pays.
 *
 * Les dix chantiers E051-01 … E051-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E051.md et tous réellement implémentés.
 * La lentille calcule l'emprise réelle du pays depuis le contour SVG rendu
 * (repli sur les marqueurs, puis sur les bornes du jeu de données), puis
 * recentre le viewBox sur un cadrage « pays entier » avec marge ajustable.
 * Tout est local : aucune requête réseau, aucune graine aléatoire, aucune
 * console, aucun fichier partagé modifié. Le contenu pédagogique est du texte
 * sémantique réel (titres, paragraphes, tableau) présent dans le DOM dès la
 * construction ; le canvas n'est qu'un laboratoire qui illustre des grandeurs
 * recalculées à chaque rendu.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const PFX = 'geography-e051';

/* Constantes miroir de geography.js:10-11 (documentées comme telles : risque
 * de dérive si la coque change). */
const MAP_W = 900;
const MAP_H = 620;
const ASPECT = MAP_W / MAP_H;

/* Présences de marge : la valeur est une fraction de la plus grande dimension
 * de l'emprise du pays. Trois choix exclusifs => radiogroup (pas aria-pressed). */
const PADS = [
  { key: 'serre', label: 'Serré — 5 %', value: 0.05 },
  { key: 'normal', label: 'Normal — 12 %', value: 0.12 },
  { key: 'large', label: 'Large — 25 %', value: 0.25 },
];

const DURATION_MS = 900;

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

/* ---------- utilitaires déterministes (aucun aléa) ---------- */

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

/* E051-02 : emprise du pays depuis le DOM réel, sans donnée inventée. */
function measureExtent(svg) {
  const outline = svg && svg.querySelector('.geo-outline');
  const fromOutline = extentFrom(parsePoints(outline && outline.getAttribute('points')));
  if (fromOutline && fromOutline.w > 0 && fromOutline.h > 0) {
    return { extent: fromOutline, source: 'contour' };
  }
  /* Repli 1 : centres des marqueurs réellement rendus. */
  const marks = [];
  if (svg) {
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

/* E051-03 : cadrage « pays entier » respectant le ratio du viewBox, puis
 * borné au domaine de la carte (exactement comme applyBox de la coque). */
function computeFit(extent, padFrac) {
  const pad = padFrac * Math.max(extent.w, extent.h);
  let wantW = extent.w + 2 * pad;
  let wantH = extent.h + 2 * pad;
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

/* E051-04 : grandeurs recalculées, dont une comparée à une référence. */
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

/* E051-09 : lecture / écriture du viewBox avec garde anti-retour. */
function readBox() {
  const raw = S.svg && S.svg.getAttribute('viewBox');
  if (!raw) return { ...S.fullBox };
  const parts = raw.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((v) => !Number.isFinite(v))
    || parts[2] <= 0 || parts[3] <= 0) return { ...S.fullBox };
  return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
}

function writeBox(box) {
  if (!S.svg) return;
  S.suppress += 1;
  try {
    S.svg.setAttribute('viewBox',
      `${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.w.toFixed(2)} ${box.h.toFixed(2)}`);
  } finally {
    S.suppress -= 1;
  }
  S.current = { ...box };
}

/* ---------- Laboratoire canvas (E051-05 / E051-08) ---------- */

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
  g.strokeRect(X(0) + 0.5, Y(0) + 0.5, MAP_W * scale - 1, MAP_H * scale - 1);
  g.setLineDash([]);

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
  const cross = (cx, cy, color) => {
    g.save();
    g.strokeStyle = color;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(X(cx) - 5, Y(cy)); g.lineTo(X(cx) + 5, Y(cy));
    g.moveTo(X(cx), Y(cy) - 5); g.lineTo(X(cx), Y(cy) + 5);
    g.stroke();
    g.restore();
  };
  cross(MAP_W / 2, MAP_H / 2, 'rgba(180,180,180,.8)');
  cross(S.extent.cx, S.extent.cy, 'rgba(244,214,158,1)');

  /* Légende du laboratoire, en français, directement sur le canvas. */
  g.font = '10px system-ui, sans-serif';
  g.fillStyle = 'rgba(255,255,255,.85)';
  g.fillText('— trait plein : cadrage pays', X(0) + 6, Y(0) + 14);
  g.fillStyle = 'rgba(255,255,255,.65)';
  g.fillText('┄ pointillés : cadre courant', X(0) + 6, Y(0) + 27);
  g.fillStyle = 'rgba(180,180,180,.75)';
  g.fillText('▭ tirets : vue complète (référence)', X(0) + 6, Y(0) + 40);
}

/* ---------- Statut et tableau ---------- */

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
    ['Facteur de zoom',
      `${fmt2(m.zoom)} × — référence : vue complète 1,00 ×`],
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

/* E051-09 : une seule boucle rAF, annulée et recréée à chaque démarrage. */
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
  if (reduced || !S.svg) {
    writeBox(to);
    drawLab(to);
    refreshReadout(to);
    announce(`${message} (affichage instantané : mouvement réduit).`);
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
      a.elapsed += Math.max(0, delta);
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
  announce(`Transition vers le cadrage demandé…`);
}

/* E051-07 / E051-09 : garde-fou de visibilité, installé une seule fois. */
function installVisibilityWatch() {
  if (S.visibilityBound || typeof document === 'undefined') return;
  S.visibilityBound = true;
  document.addEventListener('visibilitychange', () => {
    if (S.anim && !document.hidden) S.anim.last = null;
  });
}

/* ---------- CSS isolé (E051-01) ---------- */

const CSS = `
#${PFX}-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PFX}-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PFX}-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PFX}-panel p{margin:5px 0;max-width:70ch}
#${PFX}-panel .${PFX}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PFX}-formule{
  display:block;margin:6px 0;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(0,0,0,.22);color:var(--ink-soft,#d7d1c6);font-size:10px;
  line-height:1.7;overflow-wrap:anywhere;font-variant-numeric:tabular-nums;
}
#${PFX}-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums}
#${PFX}-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${PFX}-table th,#${PFX}-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${PFX}-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${PFX}-pads{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${PFX}-pads legend{padding:0 4px;color:var(--muted)}
#${PFX}-panel .${PFX}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:6px;
  padding:2px 6px;cursor:pointer;
}
#${PFX}-panel .${PFX}-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#${PFX}-actions{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 6px}
#${PFX}-actions button{
  min-height:36px;min-width:36px;padding:6px 10px;border:1px solid var(--line);border-radius:8px;
  background:transparent;color:var(--gold-bright,#f4d69e);font-size:10px;cursor:pointer;
}
#${PFX}-actions button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.10)}
#${PFX}-actions button:focus-visible,#${PFX}-panel input:focus-visible{
  outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
#${PFX}-canvas{
  display:block;width:100%;height:220px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);
}
#${PFX}-readout{color:var(--gold-bright,#f4d69e);font-variant-numeric:tabular-nums}
#${PFX}-status{margin:6px 0;color:var(--muted);font-variant-numeric:tabular-nums;min-height:14px}
@media (max-width:620px){
  #${PFX}-actions button{min-height:44px}
  #${PFX}-canvas{height:200px}
}
@media (forced-colors:active){
  #${PFX}-actions button{border:1px solid CanvasText}
}
`;

/* ---------- Point d'entrée ---------- */

register('E051', (ctx) => {
  const layout = ctx.layout || ctx.stage;
  const svg = layout && layout.querySelector ? layout.querySelector('.geo-svg') : null;
  if (!layout || !svg) return;

  ctx.css(PFX, CSS);
  installVisibilityWatch();
  stopAnim(true);

  S.ctx = ctx;
  S.svg = svg;
  /* Le domaine complet reste 900×620 quoi que fasse la coque : c'est le
   * repère fixe auquel on compare le facteur de zoom. */
  S.fullBox = { x: 0, y: 0, w: MAP_W, h: MAP_H };

  const measured = measureExtent(svg);
  S.extent = measured.extent;
  S.source = measured.source;
  S.fit = computeFit(S.extent, S.pad);
  S.metrics = computeMetrics(S.extent, S.fit);
  S.current = readBox();

  /* E051-01 : panneau sémantique, texte complet présent sans animation. */
  const host = layout.querySelector('.geo-panel') || layout;
  const panel = ctx.el('section', '');
  panel.id = PFX + '-panel';
  panel.setAttribute('aria-labelledby', PFX + '-title');

  const title = ctx.el('h2', '', 'Recentrage sur le pays');
  title.id = PFX + '-title';
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', '',
    'Cet outil calcule l’emprise du pays à partir de son contour réellement rendu, puis cale le cadre de la carte sur cette emprise avec une marge réglable. Il ne charge aucune donnée : chaque nombre ci-dessous est recalculé depuis le contour et le viewBox affichés.'));

  const sourceLabel = {
    contour: 'du contour du pays',
    marqueurs: 'des lieux affichés (contour indisponible)',
    'vue-complète': 'de la vue complète (aucun contour ni marqueur exploitable)',
  }[S.source];
  panel.appendChild(ctx.el('p', PFX + '-fait',
    `Emprise mesurée ${sourceLabel} : ${fmt0(S.extent.w)} unités de large sur ${fmt0(S.extent.h)} unités de haut (domaine de référence : ${MAP_W} × ${MAP_H}).`));

  /* E051-04 : formule explicite, lisible en texte. */
  const formula = ctx.el('code', '',
    'facteur de zoom = 900 / largeur_du_cadre ; part occupée = (emprise_largeur × emprise_hauteur) / (cadre_largeur × cadre_hauteur) ; marge = fraction de la plus grande dimension de l’emprise. Le cadrage garde le ratio 900/620 puis est borné au domaine de la carte.');
  formula.id = PFX + '-formule';
  panel.appendChild(formula);

  /* E051-04 : tableau de mesures, rempli immédiatement (sans JS différé). */
  const table = ctx.el('table', '');
  table.id = PFX + '-table';
  table.appendChild(ctx.el('caption', '', 'Mesures du recentrage (recalculées à chaque action)'));
  const tableBody = document.createElement('tbody');
  table.appendChild(tableBody);
  panel.appendChild(table);

  const readout = ctx.el('p', PFX + '-readout', '');
  readout.id = PFX + '-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  panel.appendChild(readout);

  /* E051-06 : marges en radiogroup (choix exclusif), pas aria-pressed. */
  const pads = ctx.el('fieldset', PFX + '-pads');
  pads.id = PFX + '-pads';
  pads.appendChild(ctx.el('legend', '', 'Marge autour du pays'));
  const padInputs = {};
  PADS.forEach((p) => {
    const label = ctx.el('label', PFX + '-choix');
    const input = ctx.el('input', '');
    input.type = 'radio';
    input.name = PFX + '-pad';
    input.id = PFX + '-pad-' + p.key;
    input.value = p.key;
    input.checked = p.value === S.pad;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      S.pad = p.value;
      S.fit = computeFit(S.extent, S.pad);
      S.metrics = computeMetrics(S.extent, S.fit);
      stopAnim(true);
      writeBox(S.fit);
      drawLab(S.fit);
      refreshReadout(S.fit);
      announce(`Marge ${p.label} appliquée : le pays est recadré sur ${fmt2(S.metrics.zoom)} ×.`);
    });
    padInputs[p.key] = input;
    label.append(input, ctx.el('span', '', p.label));
    pads.appendChild(label);
  });
  panel.appendChild(pads);

  /* E051-05 / E051-08 : laboratoire canvas, illustration seulement. */
  const canvas = ctx.el('canvas', '');
  canvas.id = PFX + '-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Schéma du recentrage : trait plein pour le cadrage pays, pointillés pour le cadre courant, tirets pour la vue complète.');
  canvas.setAttribute('tabindex', '0');
  panel.appendChild(canvas);
  panel.appendChild(ctx.el('p', '',
    'Dans le schéma, le trait plein délimite le cadrage recentré, les pointillés le cadre actuellement affiché et les tirets la vue complète de référence. Le contour du pays est jaune, les croix marquent les centres de la carte et du pays : l’information ne repose jamais sur la seule couleur.'));

  /* E051-06 : commandes accessibles et nommées. */
  const actions = ctx.el('div', PFX + '-actions');
  actions.id = PFX + '-actions';
  const recenter = ctx.el('button', '', 'Recentrer sur le pays');
  recenter.type = 'button';
  recenter.id = PFX + '-recenter';
  recenter.addEventListener('click', () => {
    S.fit = computeFit(S.extent, S.pad);
    S.metrics = computeMetrics(S.extent, S.fit);
    transition(S.fit, `Pays recentré : ${fmt2(S.metrics.zoom)} × la vue complète.`);
  });

  const reset = ctx.el('button', '', 'Vue complète');
  reset.type = 'button';
  reset.id = PFX + '-reset';
  reset.addEventListener('click', () => {
    transition({ ...S.fullBox }, 'Retour à la vue complète (référence 1,00 ×).');
  });

  const stop = ctx.el('button', '', 'Arrêter la transition');
  stop.type = 'button';
  stop.id = PFX + '-stop';
  stop.addEventListener('click', () => {
    stopAnim(false);
    drawLab(readBox());
    refreshReadout(readBox());
  });
  actions.append(recenter, reset, stop);
  panel.appendChild(actions);

  /* E051-07 : statut annoncé une seule fois. */
  const status = ctx.el('p', PFX + '-status', 'Panneau prêt. Le cadre est affiché tel quel.');
  status.id = PFX + '-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  panel.appendChild(status);

  /* E051-10 : limite falsifiable, texte stable et lisible sans JS. */
  panel.appendChild(ctx.el('h3', '', 'Limite et angle mort'));
  panel.appendChild(ctx.el('p', '',
    'Le recentrage porte sur la projection schématique de la coque, pas sur une étendue géodésique réelle : une marge en unités de vue n’est pas une distance au sol. Prédiction : le facteur de zoom doit être d’autant plus grand que l’emprise du pays est petite. Réglage : augmentez la marge ou zoomez manuellement. Résultat attendu : le facteur affiché augmente quand le cadre se resserre, et la part occupée par le pays grandit. Falsification : si le facteur reste à 1,00 × alors que le pays occupe une fraction visible du domaine, ou si le cadrage sort du domaine 900 × 620, l’outil est en défaut. Débrief : le calcul ne tient compte ni de la déformation de la projection ni des territoires hors contour rendu.'));

  S.dom = { canvas, tableBody, readout, status, pads, recenter, reset, stop };

  /* E051-01 : idempotence — on remplace toute instance précédente. */
  const previous = host.querySelector('#' + PFX + '-panel');
  if (previous && previous !== panel) previous.remove();
  host.appendChild(panel);

  /* E051-05 / E051-09 : dessin initial immédiat, puis suivi du viewBox. */
  drawLab(S.current);
  refreshReadout(S.current);

  if (typeof MutationObserver !== 'undefined') {
    if (S.boxObserver) S.boxObserver.disconnect();
    S.boxObserver = new MutationObserver(() => {
      if (S.suppress > 0) return;
      S.current = readBox();
      if (!S.anim) {
        drawLab(S.current);
        refreshReadout(S.current);
      }
    });
    S.boxObserver.observe(svg, { attributes: true, attributeFilter: ['viewBox'] });
  }

  if (!S.resizeBound && typeof window !== 'undefined' && window.addEventListener) {
    S.resizeBound = true;
    window.addEventListener('resize', () => drawLab(S.anim ? lerpBox(S.anim.from, S.anim.to,
      clamp(S.anim.elapsed / DURATION_MS, 0, 1)) : readBox()), { passive: true });
  }

  announce('Recentrage prêt : choisissez une marge puis « Recentrer sur le pays ».');
});
