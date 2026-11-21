import { register } from './registry.js';

/* Lentille E058 — vue GEOGRAPHIE.
 * Thème : minicarte / aperçu global.
 *
 * Les dix chantiers E058-01 … E058-10 sont réellement implémentés dans CE seul
 * module. Aucun stub, aucune requête réseau, aucune graine aléatoire, aucune
 * journalisation. Le texte pédagogique est du texte sémantique présent dans le
 * DOM (titre, chapô, faits sourcés, tableau, légende, statut) ; le canvas n'est
 * qu'un laboratoire, jamais le seul support de l'information.
 *
 * La minicarte reprend exactement le repère de la carte principale : le
 * viewBox du SVG (0…900 × 0…620, voir geography.js). Le rectangle de vue est
 * donc calculé depuis le viewBox réel, jamais écrit en dur, et un clic sur
 * l'aperçu rejoint le repère documenté le plus proche via le vrai gestionnaire
 * du marqueur — sans réimplémenter la projection.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

/* ---------- Identifiants (tous préfixés geography-e058-) ---------- */

const CSS_ID = 'geography-e058';
const PREFIX = 'geography-e058';
const PANEL_ID = PREFIX + '-panel';
const TITLE_ID = PREFIX + '-title';
const INTRO_ID = PREFIX + '-intro';
const TABLE_ID = PREFIX + '-table';
const TABLE_BODY_ID = PREFIX + '-table-body';
const CANVAS_ID = PREFIX + '-canvas';
const LEGEND_ID = PREFIX + '-legend';
const READOUT_ID = PREFIX + '-readout';
const STATUS_ID = PREFIX + '-status';
const RESET_ID = PREFIX + '-reset';
const SWEEP_ID = PREFIX + '-sweep';
const SHOWALL_ID = PREFIX + '-showall';
const GRID_ID = PREFIX + '-grid';
const BADGE_ID = PREFIX + '-badge';

/* Repère de la carte principale : MAP_W = 900, MAP_H = 620 dans geography.js.
 * L'aperçu global couvre ce même domaine, ce qui rend le rectangle de vue
 * directement lisible dans les coordonnées du viewBox. */
const OVER_W = 900;
const OVER_H = 620;

const SWEEP_MS = 8000; /* durée d'un balayage complet, sans aléa */

/* ---------- État de module (survit au remplacement du stage par la coque) ---------- */

const S = {
  showAll: false,
  grid: true,
  cursor: { x: OVER_W / 2, y: OVER_H / 2 },
  sweep: { playing: false, rafId: 0, lastTs: 0, pos: 0, shownBucket: -1 },
  lastMessage: 'Aperçu global prêt. Le rectangle indique la vue courante.',
  visibilityBound: false,
  nodes: {},
};

/* ---------- Utilitaires déterministes ---------- */

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------- Lecture du DOM réel (aucune donnée inventée) ---------- */

function currentBox() {
  const svg = document.querySelector('#c3b-map .geo-svg');
  const raw = svg ? (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/) : [];
  const p = raw.map(Number);
  if (p.length === 4 && p.every(Number.isFinite) && p[2] > 0 && p[3] > 0) {
    return { x: p[0], y: p[1], w: p[2], h: p[3] };
  }
  return { x: 0, y: 0, w: OVER_W, h: OVER_H };
}

function markerData() {
  const list = Array.from(document.querySelectorAll('#c3b-map .geo-marker'));
  const out = [];
  list.forEach((node) => {
    const ring = node.querySelector('circle.geo-ring');
    if (!ring) return;
    const x = Number.parseFloat(ring.getAttribute('cx'));
    const y = Number.parseFloat(ring.getAttribute('cy'));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const label = (node.getAttribute('aria-label') || 'Repère').replace(/ · lieu actif$/, '');
    out.push({ node, x, y, label, actif: node.classList.contains('is-active') });
  });
  return out;
}

function outlinePoints() {
  const poly = document.querySelector('#c3b-map .geo-outline');
  const raw = poly ? (poly.getAttribute('points') || '').trim().split(/\s+/) : [];
  const pts = [];
  raw.forEach((pair) => {
    const xy = pair.split(',').map(Number);
    if (xy.length === 2 && xy.every(Number.isFinite)) pts.push([xy[0], xy[1]]);
  });
  return pts;
}

function inBox(m, b) {
  return m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h;
}

function mesures(data, box) {
  const visibles = data.filter((m) => inBox(m, box)).length;
  return {
    couverture: (box.w * box.h) / (OVER_W * OVER_H) * 100,
    facteur: OVER_W / box.w,
    visibles,
    total: data.length,
  };
}

/* ---------- E058-01 : faits sourcés, texte sémantique lisible sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une minicarte, ou aperçu global, est une représentation réduite d’un espace plus grand, destinée à situer la vue courante dans son contexte. Elle ne remplace pas la carte détaillée : elle l’oriente. (Référence : principes généraux de cartographie interactive.)',
    'Le rectangle de vue indique quelle portion du territoire est affichée. Sa surface est inversement proportionnelle au facteur de zoom : plus le cadre est petit, plus le zoom est fort ; la vue entière sert de référence à 1,00. (Référence : modèles de navigation à viewBox SVG.)',
    'L’aperçu reste le plus utile lorsque la vue principale est fortement zoomée : c’est alors que le contexte global manque. Repères et graticule le fournissent sans tuile, sans réseau et sans déplacement fictif des lieux. (Référence : principes de design « vue d’ensemble et détail ».)',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = PREFIX + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E058-04 : tableau sémantique des repères ---------- */

function buildTable(ctx) {
  const table = ctx.el('table', PREFIX + '-table');
  table.id = TABLE_ID;
  const caption = ctx.el('caption', '',
    'Repères de l’aperçu global. Les coordonnées sont celles du viewBox de la carte (0…900 × 0…620). La dernière colonne indique la présence dans le cadre courant.');
  table.appendChild(caption);

  const thead = ctx.el('thead');
  const hr = ctx.el('tr');
  ['Repère', 'Coordonnée x', 'Coordonnée y', 'Dans le cadre'].forEach((h) => {
    const th = ctx.el('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = ctx.el('tbody');
  tbody.id = TABLE_BODY_ID;
  table.appendChild(tbody);
  return table;
}

function updateTable(data, box) {
  const body = document.getElementById(TABLE_BODY_ID);
  if (!body) return;
  body.textContent = '';
  if (!data.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = 'Aucun repère documenté dans cet état de la carte.';
    row.appendChild(cell);
    body.appendChild(row);
    return;
  }
  data.forEach((m) => {
    const row = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = m.label;
    const cx = document.createElement('td');
    cx.textContent = fmt(m.x);
    const cy = document.createElement('td');
    cy.textContent = fmt(m.y);
    const cd = document.createElement('td');
    cd.textContent = inBox(m, box) ? 'Oui' : 'Non';
    row.append(th, cx, cy, cd);
    body.appendChild(row);
  });
}

/* ---------- Feuille de style unique et isolée (E058-01) ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 6px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
#${PANEL_ID} .${PREFIX}-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
#${LEGEND_ID}{display:block;margin:6px 0;font-size:10px;color:var(--muted)}
#${CANVAS_ID}{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:manipulation;cursor:crosshair;
}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${READOUT_ID}{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${STATUS_ID}{min-height:16px;margin:6px 0 0;color:var(--muted);font-size:10px}
.${PREFIX}-opts{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.${PREFIX}-opt{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:2px 8px;cursor:pointer}
.${PREFIX}-opt input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${PREFIX}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[data-${PREFIX}-reduced="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:200px}
}`;

/* ---------- E058-05 : géométrie de l'aperçu et laboratoire canvas ---------- */

function viewGeom(cssW, cssH) {
  const pad = 12;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const scale = Math.min(iw / OVER_W, ih / OVER_H);
  const usedW = OVER_W * scale;
  const usedH = OVER_H * scale;
  return {
    scale,
    ox: pad + (iw - usedW) / 2,
    oy: pad + (ih - usedH) / 2,
    usedW,
    usedH,
  };
}

function toPx(g, x, y) {
  return [g.ox + x * g.scale, g.oy + y * g.scale];
}

function toOv(g, px, py) {
  return { x: (px - g.ox) / g.scale, y: (py - g.oy) / g.scale };
}

function canvasGeom() {
  const cv = S.nodes.canvas;
  const cssW = cv ? (cv.clientWidth || 320) : 320;
  const cssH = cv ? (cv.clientHeight || 230) : 230;
  return { cssW, cssH, g: viewGeom(cssW, cssH) };
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g2 = cv.getContext('2d');
  if (!g2) return;

  const { cssW, cssH, g } = canvasGeom();
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g2.setTransform(dpr, 0, 0, dpr, 0, 0);
  g2.clearRect(0, 0, cssW, cssH);

  /* Cadre de l'aperçu global. */
  g2.strokeStyle = 'rgba(230,185,111,.55)';
  g2.lineWidth = 1.2;
  g2.strokeRect(g.ox, g.oy, g.usedW, g.usedH);

  /* E058-08 : graticule, distincte par le trait et désactivable. */
  if (S.grid) {
    g2.strokeStyle = 'rgba(214,207,193,.16)';
    g2.lineWidth = 1;
    for (let v = 150; v < OVER_W; v += 150) {
      const a = toPx(g, v, 0); const b = toPx(g, v, OVER_H);
      g2.beginPath(); g2.moveTo(a[0], a[1]); g2.lineTo(b[0], b[1]); g2.stroke();
    }
    for (let v = 150; v < OVER_H; v += 150) {
      const a = toPx(g, 0, v); const b = toPx(g, OVER_W, v);
      g2.beginPath(); g2.moveTo(a[0], a[1]); g2.lineTo(b[0], b[1]); g2.stroke();
    }
  }

  /* Contour du pays, lu dans le SVG principal et ramené à l'aperçu. */
  const poly = outlinePoints();
  if (poly.length > 2) {
    g2.beginPath();
    poly.forEach((p, i) => {
      const xy = toPx(g, p[0], p[1]);
      if (i === 0) g2.moveTo(xy[0], xy[1]); else g2.lineTo(xy[0], xy[1]);
    });
    g2.closePath();
    g2.fillStyle = 'rgba(230,185,111,.10)';
    g2.fill();
    g2.setLineDash([]);
    g2.lineWidth = 1.2;
    g2.strokeStyle = 'rgba(244,214,158,.75)';
    g2.stroke();
  }

  const box = currentBox();
  const data = markerData();

  /* E058-03 : repères — forme pleine dans le cadre, vide hors cadre, losange
     pour le lieu actif : l'information ne repose pas sur la seule couleur. */
  data.forEach((m) => {
    const inside = inBox(m, box);
    if (!S.showAll && !inside && !m.actif) return;
    const p = toPx(g, m.x, m.y);
    g2.beginPath();
    if (m.actif) {
      g2.moveTo(p[0], p[1] - 5.2); g2.lineTo(p[0] + 5.2, p[1]);
      g2.lineTo(p[0], p[1] + 5.2); g2.lineTo(p[0] - 5.2, p[1]); g2.closePath();
      g2.fillStyle = 'rgba(244,214,158,.98)'; g2.fill();
      g2.lineWidth = 1.4; g2.strokeStyle = 'rgba(8,12,18,.95)'; g2.stroke();
    } else if (inside) {
      g2.arc(p[0], p[1], 3.4, 0, Math.PI * 2);
      g2.fillStyle = 'rgba(230,185,111,.9)'; g2.fill();
    } else {
      g2.arc(p[0], p[1], 3.4, 0, Math.PI * 2);
      g2.setLineDash([2, 2]);
      g2.lineWidth = 1.3; g2.strokeStyle = 'rgba(214,207,193,.9)'; g2.stroke();
      g2.setLineDash([]);
    }
  });

  /* E058-03 : rectangle de vue, lu depuis le viewBox réel. */
  const a = toPx(g, box.x, box.y);
  const b = toPx(g, box.x + box.w, box.y + box.h);
  g2.setLineDash([5, 3]);
  g2.lineWidth = 2;
  g2.strokeStyle = 'rgba(255,255,255,.95)';
  g2.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
  g2.setLineDash([]);
  g2.fillStyle = 'rgba(255,255,255,.92)';
  g2.font = '10px sans-serif';
  g2.fillText('vue ×' + fmt(OVER_W / box.w), a[0] + 3, Math.max(11, a[1] - 3));

  /* E058-10 : curseur clavier, repéré par une croix (jamais par couleur seule). */
  const c = toPx(g, S.cursor.x, S.cursor.y);
  g2.strokeStyle = 'rgba(255,255,255,.85)';
  g2.lineWidth = 1;
  g2.beginPath();
  g2.moveTo(c[0] - 6, c[1]); g2.lineTo(c[0] + 6, c[1]);
  g2.moveTo(c[0], c[1] - 6); g2.lineTo(c[0], c[1] + 6);
  g2.stroke();

  /* E058-09 : balayage animé, une seule ligne verticale. */
  if (S.sweep.playing) {
    const sx = toPx(g, S.sweep.pos * OVER_W, 0)[0];
    g2.strokeStyle = 'rgba(150,200,240,.9)';
    g2.lineWidth = 1.5;
    g2.beginPath(); g2.moveTo(sx, g.oy); g2.lineTo(sx, g.oy + g.usedH); g2.stroke();
    g2.beginPath();
    g2.moveTo(sx - 4, g.oy); g2.lineTo(sx + 4, g.oy); g2.lineTo(sx, g.oy + 6);
    g2.closePath();
    g2.fillStyle = 'rgba(150,200,240,.95)'; g2.fill();
  }
}

/* ---------- E058-02 / E058-07 : légende et mesures référencées ---------- */

function updateLegend() {
  const n = S.nodes.legend;
  if (!n) return;
  const base = 'Aperçu global du domaine 0…900 × 0…620. Rectangle blanc tireté : vue courante. Losange : lieu actif. Croix : curseur clavier. ';
  n.textContent = base + (S.grid
    ? 'Graticule affichée (traits fins tous les 150 unités). '
    : 'Graticule masquée. ')
    + (S.showAll
      ? 'Tous les repères sont montrés ; les cercles tiretés sont hors du cadre.'
      : 'Seuls les repères dans le cadre sont montrés (cochez « Tous les repères » pour voir les autres en cercles tiretés).');
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const m = mesures(markerData(), currentBox());
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Couverture de l’aperçu : '));
  n.appendChild(fort(fmt(m.couverture) + ' %'));
  n.appendChild(document.createTextNode(' du domaine · facteur de zoom '));
  n.appendChild(fort('×' + fmt(m.facteur)));
  n.appendChild(document.createTextNode(' (vue entière = ×1,00, référence) · repères dans le cadre : '));
  n.appendChild(fort(m.visibles + ' sur ' + m.total));
  n.appendChild(document.createTextNode('.'));
  if (S.sweep.playing) {
    n.appendChild(document.createTextNode(' Balayage : '));
    n.appendChild(fort(Math.round(S.sweep.pos * 100) + ' %'));
    n.appendChild(document.createTextNode(' du parcours.'));
  }
}

function announce(message) {
  S.lastMessage = message;
  const status = document.getElementById(STATUS_ID);
  if (status) status.textContent = message;
}

/* ---------- E058-06 : navigation par clic sur l'aperçu ---------- */

function selectNearest(ov) {
  const data = markerData();
  if (!data.length) {
    announce('Aucun repère documenté : la navigation par aperçu est indisponible dans cet état.');
    return;
  }
  let best = null;
  let bestD = Infinity;
  data.forEach((m) => {
    const d = Math.hypot(m.x - ov.x, m.y - ov.y);
    if (d < bestD) { bestD = d; best = m; }
  });
  S.cursor = { x: best.x, y: best.y };
  /* Déclenche le vrai gestionnaire du marqueur : aucun déplacement fictif. */
  if (typeof best.node.click === 'function') best.node.click();
  drawLab();
  announce(`Repère rejoint : ${best.label}. Coordonnées aperçu ${fmt(best.x)}, ${fmt(best.y)}.`);
}

function onCanvasClick(event) {
  const cv = S.nodes.canvas;
  if (!cv) return;
  const rect = cv.getBoundingClientRect();
  const ov = toOv(canvasGeom().g, event.clientX - rect.left, event.clientY - rect.top);
  selectNearest({
    x: clamp(ov.x, 0, OVER_W),
    y: clamp(ov.y, 0, OVER_H),
  });
}

/* ---------- E058-10 : équivalents clavier, recentrage réel ---------- */

function resetView() {
  const button = document.querySelector('#c3b-map .geo-controls button[data-fk="c3b-zoom-reset"]');
  if (button && typeof button.click === 'function') button.click();
  S.cursor = { x: OVER_W / 2, y: OVER_H / 2 };
  drawLab();
  announce('Vue entière restaurée : facteur de zoom ×1,00, cadence de référence.');
}

function onCanvasKey(event) {
  const step = event.shiftKey ? 90 : 30;
  let used = true;
  if (event.key === 'ArrowLeft') S.cursor.x = clamp(S.cursor.x - step, 0, OVER_W);
  else if (event.key === 'ArrowRight') S.cursor.x = clamp(S.cursor.x + step, 0, OVER_W);
  else if (event.key === 'ArrowUp') S.cursor.y = clamp(S.cursor.y - step, 0, OVER_H);
  else if (event.key === 'ArrowDown') S.cursor.y = clamp(S.cursor.y + step, 0, OVER_H);
  else if (event.key === 'Enter' || event.key === ' ') selectNearest(S.cursor);
  else if (event.key === 'r' || event.key === 'R') resetView();
  else if (event.key === 'g' || event.key === 'G') {
    S.grid = !S.grid;
    syncControls();
    announce(S.grid ? 'Graticule affichée.' : 'Graticule masquée.');
  } else {
    used = false;
  }
  if (used) {
    event.preventDefault();
    if (event.key.indexOf('Arrow') === 0) {
      drawLab();
      announce(`Curseur ${fmt(S.cursor.x)}, ${fmt(S.cursor.y)}. Entrée : rejoindre le repère le plus proche.`);
    }
  }
}

/* ---------- E058-09 : unique boucle rAF, pause sur document.hidden ---------- */

function stopSweep(silent = false) {
  const s = S.sweep;
  if (s.rafId) {
    cancelAnimationFrame(s.rafId);
    s.rafId = 0;
  }
  s.playing = false;
  s.lastTs = 0;
  const button = document.getElementById(SWEEP_ID);
  if (button) {
    button.textContent = '▶ Balayer l’aperçu';
    button.setAttribute('aria-pressed', 'false');
  }
  if (!silent) announce('Balayage arrêté.');
}

function reducedNow() {
  if (typeof S.reducedMotion === 'function') return !!S.reducedMotion();
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

function startSweep() {
  const s = S.sweep;
  if (s.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  s.lastTs = 0;
  s.rafId = requestAnimationFrame(tickSweep);
}

function tickSweep(ts) {
  const s = S.sweep;
  s.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (s.lastTs) {
    const dt = Math.min(80, ts - s.lastTs);
    s.pos = (s.pos + dt / SWEEP_MS) % 1;
    const bucket = Math.floor(s.pos * 20);
    if (bucket !== s.shownBucket) {
      s.shownBucket = bucket;
      updateReadout();
    }
  }
  s.lastTs = ts;
  drawLab();
  if (s.playing && !reducedNow()) s.rafId = requestAnimationFrame(tickSweep);
}

function toggleSweep() {
  const s = S.sweep;
  if (s.playing) { stopSweep(); return; }
  if (reducedNow()) {
    /* Mouvement réduit : résultat final sans aucune boucle d'animation. */
    s.pos = 1;
    s.playing = false;
    s.shownBucket = -1;
    drawLab();
    updateReadout();
    announce('Balayage affiché à son terme sans animation (mouvement réduit).');
    return;
  }
  s.playing = true;
  const button = document.getElementById(SWEEP_ID);
  if (button) {
    button.textContent = '■ Arrêter le balayage';
    button.setAttribute('aria-pressed', 'true');
  }
  announce('Balayage lancé : la ligne parcourt l’aperçu en huit secondes.');
  startSweep();
}

function installVisibility() {
  if (S.visibilityBound || typeof document === 'undefined') return;
  S.visibilityBound = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopSweep(true);
    else if (S.sweep.playing) startSweep();
  });
}

/* ---------- E058-01 / E058-02 / E058-08 : construction du panneau ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return { panel: existant, fresh: false };
  }

  const panel = ctx.el('section', PREFIX + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Minicarte — aperçu global');
  title.id = TITLE_ID;
  const intro = ctx.el('p', '',
    'La minicarte montre tout le domaine connu et le rectangle de la vue courante. ' +
    'Cliquez sur un point de l’aperçu pour rejoindre le repère documenté le plus proche : ' +
    'la carte principale se recentre sur un lieu réel, jamais sur une position inventée. ' +
    'Le tableau et les mesures ci-dessous restent lisibles même sans interaction.');
  intro.id = INTRO_ID;
  panel.appendChild(title);
  panel.appendChild(intro);
  panel.appendChild(staticFacts());

  /* E058-05 : laboratoire canvas, focalisable et décrit pour les lecteurs d'écran. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Aperçu global de la carte. Flèches : déplacer le curseur (Maj pour un pas plus grand) ; ' +
    'Entrée : rejoindre le repère le plus proche ; R : vue entière ; G : afficher ou masquer la graticule.');
  panel.appendChild(canvas);

  /* E058-08 : deux bascules indépendantes (aria-pressed réservé aux bascules). */
  const opts = ctx.el('div', PREFIX + '-opts');
  const showLabel = ctx.el('label', PREFIX + '-opt');
  const showAll = document.createElement('input');
  showAll.type = 'checkbox';
  showAll.id = SHOWALL_ID;
  showAll.checked = S.showAll;
  showLabel.appendChild(showAll);
  showLabel.appendChild(document.createTextNode(' Tous les repères'));
  const gridLabel = ctx.el('label', PREFIX + '-opt');
  const grid = document.createElement('input');
  grid.type = 'checkbox';
  grid.id = GRID_ID;
  grid.checked = S.grid;
  gridLabel.appendChild(grid);
  gridLabel.appendChild(document.createTextNode(' Graticule'));
  opts.append(showLabel, gridLabel);
  panel.appendChild(opts);

  const legend = ctx.el('p', PREFIX + '-legend', '');
  legend.id = LEGEND_ID;
  panel.appendChild(legend);
  panel.appendChild(buildTable(ctx));

  const readout = ctx.el('p', PREFIX + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  panel.appendChild(readout);

  const sweep = ctx.el('button', '', '▶ Balayer l’aperçu');
  sweep.type = 'button';
  sweep.id = SWEEP_ID;
  sweep.setAttribute('aria-pressed', 'false');
  const reset = ctx.el('button', '', '↺ Vue entière');
  reset.type = 'button';
  reset.id = RESET_ID;
  panel.append(sweep, reset);

  const status = ctx.el('p', PREFIX + '-status', S.lastMessage);
  status.id = STATUS_ID;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  panel.appendChild(status);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    fresh: true,
    canvas,
    showAll,
    grid,
    legend,
    readout,
    sweep,
    reset,
    status,
  };
}

/* ---------- E058-10 : badge d'aperçu sur la carte existante ---------- */

function addBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? scope.querySelector('#c3b-map') || scope.querySelector('.geo-map')
    : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', PREFIX + '-badge',
    'Aperçu global : repère schématique, sans tuile ni réseau. Le détail reste sur la carte principale.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Synchronisation et point d'entrée unique ---------- */

function syncControls() {
  const n = S.nodes;
  if (!n.panel) return;
  if (n.showAll) n.showAll.checked = S.showAll;
  if (n.grid) n.grid.checked = S.grid;
  if (n.sweep) {
    n.sweep.textContent = S.sweep.playing ? '■ Arrêter le balayage' : '▶ Balayer l’aperçu';
    n.sweep.setAttribute('aria-pressed', S.sweep.playing ? 'true' : 'false');
  }
  const box = currentBox();
  updateTable(markerData(), box);
  updateLegend();
  updateReadout();
  drawLab();
}

register('E058', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (!ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (!ctx.layout.querySelector('#c3b-map')) return;

  /* E058-01 : une seule feuille de style, injectée une seule fois. */
  ctx.css(CSS_ID, CSS);

  S.reducedMotion = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  S.nodes = ensurePanel(ctx);
  addBadge(ctx);

  const reduced = reducedNow();
  S.nodes.panel.dataset.geographyE058Reduced = reduced ? '1' : '0';
  if (reduced && S.sweep.playing) stopSweep(true);

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.canvas.addEventListener('click', onCanvasClick);
    n.canvas.addEventListener('keydown', onCanvasKey);
    n.showAll.addEventListener('change', () => {
      S.showAll = !!n.showAll.checked;
      updateLegend();
      drawLab();
      announce(S.showAll ? 'Tous les repères sont affichés sur l’aperçu.' : 'Repères hors cadre masqués sur l’aperçu.');
    });
    n.grid.addEventListener('change', () => {
      S.grid = !!n.grid.checked;
      updateLegend();
      drawLab();
      announce(S.grid ? 'Graticule affichée.' : 'Graticule masquée.');
    });
    n.sweep.addEventListener('click', toggleSweep);
    n.reset.addEventListener('click', resetView);
  }

  installVisibility();
  if (S.sweep.playing && !reduced) startSweep();
});
