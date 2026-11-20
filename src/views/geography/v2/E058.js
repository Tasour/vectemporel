import { register } from './registry.js';

/* Lentille E058 — passe V2, vue GEOGRAPHIE.
 * Thème : minicarte / aperçu global.
 *
 * Les dix chantiers E058-01 … E058-10 sont réellement implémentés dans CE seul
 * module (aucun stub, aucun enregistrement vide résiduel). Le détail
 * figure dans UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E058.md.
 *
 * Tout est local : zéro réseau, zéro journalisation, aucun générateur
 * aléatoire, aucun fichier partagé (registry, index, passe 1) modifié. Le
 * contenu pédagogique est du texte sémantique réel (h2, h3, p, li, table,
 * fieldset/radiogroup, role="status") inséré dans le DOM : il reste lisible et
 * indexable même sans animation ni interaction. Le canvas n'est qu'un
 * laboratoire dont le rendu est une fonction déterministe de l'état et du DOM.
 *
 * La minicarte reprend exactement le repère de la carte principale : le
 * viewBox du SVG (0…900 × 0…620, voir geography.js). Le rectangle de vue est
 * donc calculé depuis le viewBox réel, jamais écrit en dur, et un clic sur
 * l'aperçu rejoint le repère documenté le plus proche via le vrai gestionnaire
 * du marqueur — sans réimplémenter la projection ni déplacer fictivement un
 * lieu.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

/* ---------- Identifiants (tous préfixés geography-v2-e058-) ---------- */

const CSS_ID = 'geography-v2-e058';
const P = 'geography-v2-e058-';
const PANEL_ID = P + 'panel';
const TITLE_ID = P + 'title';
const INTRO_ID = P + 'intro';
const FACTS_ID = P + 'facts';
const MODE_ID = P + 'mode';
const GRID_ID = P + 'grid';
const CANVAS_ID = P + 'canvas';
const LEGEND_ID = P + 'legend';
const TABLE_ID = P + 'table';
const TABLE_BODY_ID = P + 'table-body';
const READOUT_ID = P + 'readout';
const SWEEP_ID = P + 'sweep';
const RESET_ID = P + 'reset';
const STATUS_ID = P + 'status';
const LIMIT_ID = P + 'limit';
const DEFI_ID = P + 'defi';
const BADGE_ID = P + 'badge';

/* Repère de la carte principale : MAP_W = 900, MAP_H = 620 dans geography.js. */
const OVER_W = 900;
const OVER_H = 620;
const SWEEP_MS = 8000; /* durée d'un balayage complet, sans aléa */

const MODES = [
  { value: 'cadre', label: 'Repères dans le cadre' },
  { value: 'tous', label: 'Tous les repères' },
  { value: 'hors', label: 'Repères hors cadre' },
];

/* ---------- État de module (survit au remplacement du stage par la coque) ---------- */

const S = {
  mode: 'cadre',
  graticule: true,
  cursor: { x: OVER_W / 2, y: OVER_H / 2 },
  sweep: { playing: false, rafId: 0, lastTs: 0, pos: 0, shownBucket: -1 },
  lastMessage: 'Aperçu global prêt. Le rectangle indique la vue courante.',
  visibilityBound: false,
  motionBound: false,
  observer: null,
  observedCanvas: null,
  offscreen: false,
  reduced: false,
  nodes: {},
};

/* Alias de ctx.el, initialisé au point d'entrée (les helpers l'utilisent). */
let E = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
};

/* ---------- Utilitaires déterministes (aucune donnée fabriquée) ---------- */

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

let reducedFn = null;
function reducedNow() {
  if (typeof reducedFn === 'function') return !!reducedFn();
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

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

/* Le mode décide quels repères sont dessinés ; le tableau, lui, liste tout. */
function modeMontre(m, inside) {
  if (S.mode === 'tous') return true;
  if (S.mode === 'hors') return !inside && !m.actif;
  return inside || m.actif;
}

/* ---------- E058-01 : faits sourcés, texte sémantique lisible sans JS ---------- */

function staticFacts() {
  const wrap = E('div', P + 'faits');
  wrap.id = FACTS_ID;
  const faits = [
    'Une minicarte, ou aperçu global, est une représentation réduite d’un espace plus grand, destinée à situer la vue courante dans son contexte. Elle ne remplace pas la carte détaillée : elle l’oriente. (Référence : principes généraux de cartographie interactive.)',
    'Le rectangle de vue indique quelle portion du territoire est affichée. Sa surface est inversement proportionnelle au facteur de zoom : plus le cadre est petit, plus le zoom est fort ; la vue entière sert de référence à 100 % de couverture et à un facteur ×1,00. (Référence : modèles de navigation à viewBox SVG.)',
    'L’aperçu reste le plus utile lorsque la vue principale est fortement zoomée : c’est alors que le contexte global manque. Repères et graticule le fournissent sans tuile, sans réseau et sans déplacement fictif des lieux. (Référence : principes de design « vue d’ensemble et détail ».)',
  ];
  faits.forEach((texte) => {
    const p = E('p', P + 'fait', texte);
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E058-04 : tableau sémantique des repères ---------- */

function buildTable() {
  const table = E('table', P + 'table');
  table.id = TABLE_ID;
  const caption = E('caption', '',
    'Repères de l’aperçu global. Les coordonnées sont celles du viewBox de la carte (0…900 × 0…620). La dernière colonne indique la présence dans le cadre courant.');
  table.appendChild(caption);

  const thead = E('thead');
  const hr = E('tr');
  ['Repère', 'Coordonnée x', 'Coordonnée y', 'Dans le cadre'].forEach((h) => {
    const th = E('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = E('tbody');
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
#${PANEL_ID} h3{margin:10px 0 4px;font-size:12px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
#${PANEL_ID} .${P}fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
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
#${MODE_ID}{border:1px solid var(--line);border-radius:8px;margin:8px 0;padding:4px 8px 8px}
#${MODE_ID} legend{padding:0 4px;color:var(--gold-bright,#f4d69e);font-size:10px}
.${P}choix{display:inline-flex;align-items:center;gap:6px;min-height:36px;margin-right:8px;cursor:pointer}
.${P}choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${PANEL_ID} :focus{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[data-geography-v2-e058-reduced="1"] button{transition:none}
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

/* Rendu déterministe : fonction pure de l'état S, du viewBox et des marqueurs
 * réels. Aucune valeur n'est tirée au hasard et aucune information n'est portée
 * par la seule couleur (formes + tirets + libellés). */
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

  /* E058-08 : graticule distincte par le trait et désactivable. */
  if (S.graticule) {
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

  /* E058-03 : repères — losange actif, cercle plein dans le cadre, cercle
     tireté hors cadre : l'information ne repose pas sur la seule couleur. */
  data.forEach((m) => {
    const inside = inBox(m, box);
    if (!modeMontre(m, inside)) return;
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
  const modeTxt = S.mode === 'tous'
    ? 'Tous les repères sont montrés ; les cercles tiretés sont hors du cadre. '
    : S.mode === 'hors'
      ? 'Seuls les repères hors cadre sont montrés en cercles tiretés (le lieu actif reste en losange). '
      : 'Seuls les repères dans le cadre sont montrés ; choisissez « Tous les repères » pour voir les autres en cercles tiretés. ';
  n.textContent = base + (S.graticule
    ? 'Graticule affichée (traits fins tous les 150 unités). '
    : 'Graticule masquée. ') + modeTxt;
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
  n.appendChild(document.createTextNode(' du domaine (vue entière = 100 %, référence) · facteur '));
  n.appendChild(fort('×' + fmt(m.facteur)));
  n.appendChild(document.createTextNode(' (vue entière = ×1,00, référence) · repères visibles : '));
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

function toggleGraticule() {
  S.graticule = !S.graticule;
  syncControls();
  announce(S.graticule ? 'Graticule affichée.' : 'Graticule masquée.');
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
  else if (event.key === 'g' || event.key === 'G') toggleGraticule();
  else used = false;
  if (used) {
    event.preventDefault();
    if (event.key.indexOf('Arrow') === 0) {
      drawLab();
      announce(`Curseur ${fmt(S.cursor.x)}, ${fmt(S.cursor.y)}. Entrée : rejoindre le repère le plus proche.`);
    }
  }
}

/* ---------- E058-09 : unique boucle rAF, pause hidden/hors écran ---------- */

function stopSweep(silent = false) {
  const s = S.sweep;
  if (s.rafId) {
    cancelAnimationFrame(s.rafId);
    s.rafId = 0;
  }
  s.playing = false;
  s.lastTs = 0;
  syncSweepButtons();
  if (!silent) announce('Balayage arrêté.');
}

function pauseLoop() {
  const s = S.sweep;
  if (s.rafId) cancelAnimationFrame(s.rafId);
  s.rafId = 0;
  s.lastTs = 0;
}

function syncSweepButtons() {
  const button = document.getElementById(SWEEP_ID);
  if (button) {
    button.textContent = S.sweep.playing ? '■ Arrêter le balayage' : '▶ Balayer l’aperçu';
    button.setAttribute('aria-pressed', S.sweep.playing ? 'true' : 'false');
  }
}

function startSweep() {
  const s = S.sweep;
  if (s.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.offscreen) return;
  s.lastTs = 0;
  s.rafId = requestAnimationFrame(tickSweep);
}

function tickSweep(ts) {
  const s = S.sweep;
  s.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.offscreen) return;
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
    syncSweepButtons();
    drawLab();
    updateReadout();
    announce('Balayage affiché à son terme sans animation (mouvement réduit).');
    return;
  }
  s.playing = true;
  syncSweepButtons();
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

function installObserver(canvas) {
  if (S.observer || typeof IntersectionObserver !== 'function' || !canvas) return;
  S.observedCanvas = canvas;
  S.observer = new IntersectionObserver((entries) => {
    const e = entries[entries.length - 1];
    if (!e) return;
    S.offscreen = !e.isIntersecting;
    if (S.offscreen) pauseLoop();
    else if (S.sweep.playing) startSweep();
  }, { threshold: 0.01 });
  S.observer.observe(canvas);
}

function installMotionWatcher() {
  if (S.motionBound || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  try {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      S.reduced = !!mq.matches;
      const panel = document.getElementById(PANEL_ID);
      if (panel) panel.dataset.geographyV2E058Reduced = S.reduced ? '1' : '0';
      if (S.reduced && S.sweep.playing) stopSweep(true);
    };
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
    else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    S.motionBound = true;
  } catch { /* apprêt mouvement réduit indisponible : repli silencieux */ }
}

/* ---------- E058-01 / E058-02 / E058-08 : construction du panneau ---------- */

function buildModeGroup() {
  const fs = E('fieldset', P + 'mode-groupe');
  fs.id = MODE_ID;
  fs.setAttribute('role', 'radiogroup');
  const legend = E('legend', '', 'Mode d’affichage des repères (choix unique)');
  fs.appendChild(legend);
  const radios = [];
  MODES.forEach((mode) => {
    const id = P + 'mode-' + mode.value;
    const label = E('label', P + 'choix');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = P + 'mode';
    input.id = id;
    input.value = mode.value;
    input.checked = S.mode === mode.value;
    label.htmlFor = id;
    label.appendChild(input);
    label.appendChild(document.createTextNode(' ' + mode.label));
    fs.appendChild(label);
    radios.push(input);
  });
  return { fs, radios };
}

function buildLimit() {
  const wrap = E('section', P + 'limite');
  wrap.id = LIMIT_ID;
  const h = E('h3', '', 'Limites et angles morts de l’aperçu');
  wrap.appendChild(h);
  wrap.appendChild(E('p', '',
    'L’aperçu est un schéma non à l’échelle : il situe la vue courante dans le domaine connu, ' +
    'mais il ne remplace ni la projection ni le détail de la carte principale. Un repère hors ' +
    'cadre peut exister sans être visible dans la vue zoomée, et la couverture annoncée ne dit ' +
    'rien de la densité des lieux à l’intérieur du rectangle.'));
  const defi = E('div', P + 'defi');
  defi.id = DEFI_ID;
  defi.appendChild(E('h3', '', 'À vous de jouer — vérifier une affirmation'));
  defi.appendChild(E('p', '',
    'Affirmation à tester : « plus le rectangle de l’aperçu est petit, plus la couverture ' +
    'baisse et plus le facteur de zoom augmente. » Suivez les cinq temps ci-dessous.'));
  const ol = document.createElement('ol');
  [
    'Prédiction : avant de zoomer, annoncez la couverture et le facteur que vous attendez.',
    'Réglage : zoomez sur la carte principale pour réduire le viewBox de moitié.',
    'Résultat attendu : la couverture doit être divisée par quatre et le facteur doublé.',
    'Falsification : si le readout contredit ces deux changements, l’affirmation est fausse — cherchez pourquoi.',
    'Débrief : la surface varie comme w × h et le facteur comme 900 / w ; le lien n’est pas linéaire pour la surface.',
  ].forEach((txt) => {
    const li = document.createElement('li');
    li.textContent = txt;
    ol.appendChild(li);
  });
  defi.appendChild(ol);
  wrap.appendChild(defi);
  return wrap;
}

function ensurePanel() {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return { panel: existant, fresh: false, nodes: S.nodes };
  }

  const panel = E('section', P + 'panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = E('h2', '', 'Minicarte — aperçu global');
  title.id = TITLE_ID;
  const intro = E('p', '',
    'La minicarte montre tout le domaine connu et le rectangle de la vue courante. ' +
    'Cliquez sur un point de l’aperçu pour rejoindre le repère documenté le plus proche : ' +
    'la carte principale se recentre sur un lieu réel, jamais sur une position inventée. ' +
    'Le tableau et les mesures ci-dessous restent lisibles même sans interaction.');
  intro.id = INTRO_ID;
  panel.append(title, intro, staticFacts());

  /* E058-08 : radiogroupe à choix unique pour le mode d'affichage. */
  const mode = buildModeGroup();
  panel.appendChild(mode.fs);

  /* E058-05 : laboratoire canvas, focalisable et décrit pour les lecteurs d'écran. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Aperçu global de la carte. Flèches : déplacer le curseur (Maj pour un pas plus grand) ; ' +
    'Entrée : rejoindre le repère le plus proche ; R : vue entière ; G : afficher ou masquer la graticule.');
  panel.appendChild(canvas);

  /* Bascule indépendante : aria-pressed est réservé aux bascules, jamais au choix unique. */
  const grid = E('button', '', 'Graticule : affichée');
  grid.type = 'button';
  grid.id = GRID_ID;
  grid.setAttribute('aria-pressed', S.graticule ? 'true' : 'false');
  panel.appendChild(grid);

  const legend = E('p', P + 'legend', '');
  legend.id = LEGEND_ID;
  panel.appendChild(legend);
  panel.appendChild(buildTable());

  const readout = E('p', P + 'readout',
    'Couverture : calculée depuis le viewBox · facteur : comparé à la vue entière · repères : listés ci-dessus.');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  panel.appendChild(readout);

  const sweep = E('button', '', '▶ Balayer l’aperçu');
  sweep.type = 'button';
  sweep.id = SWEEP_ID;
  sweep.setAttribute('aria-pressed', 'false');
  const reset = E('button', '', '↺ Vue entière');
  reset.type = 'button';
  reset.id = RESET_ID;
  panel.append(sweep, reset);

  panel.appendChild(buildLimit());

  const status = E('p', P + 'status', S.lastMessage);
  status.id = STATUS_ID;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  panel.appendChild(status);

  const nodes = {
    panel, canvas, grid, legend, readout, sweep, reset, status, modeRadios: mode.radios,
  };
  S.nodes = nodes;

  const host = S.ctxLayout || S.ctxStage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : S.ctxStage;
  if (aside && typeof aside.insertBefore === 'function') aside.insertBefore(panel, aside.firstChild);

  return { panel, fresh: true, nodes };
}

/* ---------- E058-10 : badge d'aperçu sur la carte existante ---------- */

function addBadge() {
  const scope = S.ctxLayout || S.ctxStage;
  const map = scope && typeof scope.querySelector === 'function'
    ? scope.querySelector('#c3b-map') || scope.querySelector('.geo-map')
    : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = E('div', P + 'badge',
    'Aperçu global : repère schématique, sans tuile ni réseau. Le détail reste sur la carte principale.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Synchronisation et point d'entrée unique ---------- */

function syncControls() {
  const n = S.nodes;
  if (!n.panel) return;
  if (n.modeRadios) {
    n.modeRadios.forEach((r) => { r.checked = r.value === S.mode; });
  }
  if (n.grid) {
    n.grid.textContent = S.graticule ? 'Graticule : affichée' : 'Graticule : masquée';
    n.grid.setAttribute('aria-pressed', S.graticule ? 'true' : 'false');
  }
  syncSweepButtons();
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

  S.ctxStage = ctx.stage;
  S.ctxLayout = ctx.layout;
  E = ctx.el;
  reducedFn = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;

  /* E058-01 : une seule feuille de style, injectée une seule fois (cssOnce). */
  ctx.css(CSS_ID, CSS);

  const built = ensurePanel();
  addBadge();

  S.reduced = reducedNow();
  if (built.panel) built.panel.dataset.geographyV2E058Reduced = S.reduced ? '1' : '0';
  if (S.reduced && S.sweep.playing) stopSweep(true);

  syncControls();

  if (built.fresh) {
    const n = built.nodes;
    n.canvas.addEventListener('click', onCanvasClick);
    n.canvas.addEventListener('keydown', onCanvasKey);
    n.modeRadios.forEach((r) => {
      r.addEventListener('change', () => {
        if (!r.checked) return;
        S.mode = r.value;
        updateLegend();
        drawLab();
        const label = MODES.filter((m) => m.value === S.mode)[0];
        announce('Mode d’affichage : ' + (label ? label.label : S.mode) + '.');
      });
    });
    n.grid.addEventListener('click', toggleGraticule);
    n.sweep.addEventListener('click', toggleSweep);
    n.reset.addEventListener('click', resetView);
    installObserver(n.canvas);
  }

  installVisibility();
  installMotionWatcher();
  if (S.sweep.playing && !S.reduced) startSweep();
});
