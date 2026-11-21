import { register } from './registry.js';

/* Lentille E026 — vue GEOGRAPHIE.
 * Thème : tectonique des plaques et séismes.
 *
 * Les dix chantiers E026-01 … E026-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E026.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, fieldset) présent dans le DOM même sans animation ;
 * le canvas n'est qu'un laboratoire qui illustre des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const PANEL_ID = 'geography-e026-panel';
const TITLE_ID = 'geography-e026-title';
const BOUND_ID = 'geography-e026-boundary';
const MAG_ID = 'geography-e026-magnitude';
const MAG_OUT_ID = 'geography-e026-magnitude-value';
const CANVAS_ID = 'geography-e026-canvas';
const READOUT_ID = 'geography-e026-readout';
const PLAY_ID = 'geography-e026-play';
const LEGEND_ID = 'geography-e026-legend';
const BADGE_ID = 'geography-e026-badge';
const TABLE_ID = 'geography-e026-table';

/* Grandeurs canoniques (formules, aucune donnée fabriquée). */
const ENERGY_A = 4.8;   /* log10 E[J] = 4,8 + 1,5 Mw (relation énergie-magnitude) */
const ENERGY_B = 1.5;
const KT_J = 4.184e12;  /* 1 kilotonne de TNT = 4,184 × 10¹² J */
const MAG_REF = 5;      /* séisme de référence : Mw 5 */

const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

/* Métadonnées des trois types de frontière (code non chromatique = trait). */
const BOUNDARIES = {
  divergent: {
    label: 'Divergente (dorsale)',
    dash: [],
    code: 'trait plein — flèches qui s’écartent',
    regime: 'failles normales',
    depth: 'séismes superficiels, moins de 30 km',
    volcan: 'volcanisme basaltique',
    aria: 'Frontière divergente : deux plaques s’écartent, une dorsale et un soulèvement de magma.',
  },
  convergent: {
    label: 'Convergente (subduction)',
    dash: [7, 5],
    code: 'tirets — flèche plongeante',
    regime: 'failles inverses',
    depth: 'foyers jusqu’à environ 700 km',
    volcan: 'volcanisme explosif',
    aria: 'Frontière convergente : une plaque plonge sous l’autre, fosse et foyers profonds.',
  },
  transform: {
    label: 'Transformante (faille)',
    dash: [2, 4],
    code: 'pointillés — flèches anti-parallèles',
    regime: 'failles transformantes',
    depth: 'séismes superficiels, moins de 30 km',
    volcan: 'pas de volcanisme',
    aria: 'Frontière transformante : deux plaques glissent en sens opposé le long d’une faille.',
  },
};
const ORDER = ['divergent', 'convergent', 'transform'];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  boundary: 'convergent',
  magTenths: 70, // Mw 7,0
  playing: false,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes et formatage français ---------- */

const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
const sup = (n) => String(n).split('').map((d) => SUP[d] || d).join('');
const mag = () => S.magTenths / 10;
const energyJ = (mw) => Math.pow(10, ENERGY_A + ENERGY_B * mw);
const ratioRef = (mw) => Math.pow(10, ENERGY_B * (mw - MAG_REF));
const tntKt = (mw) => energyJ(mw) / KT_J;

function fmtEnergy(j) {
  const exp = Math.floor(Math.log10(j));
  const mant = j / Math.pow(10, exp);
  return `${fmt1(mant)} × 10${sup(exp)} J`;
}

function fmtRatio(r) {
  if (r >= 1000) {
    const exp = Math.floor(Math.log10(r));
    return `${fmt1(r / Math.pow(10, exp))} × 10${sup(exp)}`;
  }
  return `${fmt1(r)} fois`;
}

function fmtTnt(kt) {
  if (kt >= 1000) return `${fmt1(kt / 1000)} Mt`;
  return `${fmt1(kt)} kt`;
}

function phaseState(p) {
  if (p < 0.72) return { stress: p / 0.72, rupture: false, name: 'accumulation' };
  if (p < 0.80) return { stress: 1, rupture: true, name: 'rupture' };
  return { stress: (1 - (p - 0.80) / 0.20), rupture: false, name: 'relaxation' };
}

function phaseText(phase, mw) {
  const st = phaseState(phase);
  if (st.name === 'rupture') {
    return `Cycle sismique — rupture : séisme de magnitude Mw ${fmt1(mw)} déclenché, l’énergie stockée est libérée sous forme d’ondes.`;
  }
  if (st.name === 'accumulation') {
    return `Cycle sismique — accumulation élastique : la contrainte monte à ${Math.round(st.stress * 100)} % du seuil de rupture.`;
  }
  return `Cycle sismique — relaxation : la contrainte redescend à ${Math.round(st.stress * 100)} % après le séisme.`;
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e026-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e026-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e026-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e026-panel p{margin:5px 0;max-width:70ch}
#geography-e026-panel .geography-e026-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e026-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e026-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e026-table th,#geography-e026-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e026-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e026-boundary{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e026-boundary legend{padding:0 4px;color:var(--muted)}
#geography-e026-panel .geography-e026-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e026-panel .geography-e026-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e026-magnitude{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e026-magnitude-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e026-canvas{
  display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e026-legend{font-size:10px;color:var(--muted)}
#geography-e026-readout{
  min-height:46px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e026-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e026-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e026-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e026-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e026-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e026-panel[data-geography-e026-reduced="1"] button,
#geography-e026-panel[data-geography-e026-reduced="1"] .geography-e026-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e026-panel button,.geography-e026-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e026-panel{font-size:10px;padding:9px}
  #geography-e026-canvas{height:200px}
  #geography-e026-panel .geography-e026-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'La lithosphère est découpée en plaques qui se déplacent de quelques centimètres par an ; la grande majorité des séismes se produit à leurs frontières.',
    'La magnitude de moment Mw est logarithmique : le logarithme décimal de l’énergie libérée, en joules, vaut 4,8 + 1,5 Mw. Un gain d’une unité multiplie l’énergie par environ 31,6.',
    'Le rebond élastique explique le séisme : la contrainte s’accumule puis la roche rompt. La profondeur maximale des foyers dépend du type de frontière — environ 700 km en subduction, moins de 30 km ailleurs.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e026-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Énergie libérée selon la magnitude Mw (référence : Mw 5 = 1,00 fois). Valeurs recalculées par la formule log10 E = 4,8 + 1,5 Mw.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Magnitude Mw', 'Énergie (J)', 'Rapport à Mw 5', 'Équivalent TNT'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  [5, 6, 7, 8, 9].forEach((mw) => {
    const tr = document.createElement('tr');
    const cells = [fmt1(mw), fmtEnergy(energyJ(mw)), fmtRatio(ratioRef(mw)), fmtTnt(tntKt(mw))];
    cells.forEach((c, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      cell.textContent = c;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: {
        divergent: document.getElementById('geography-e026-bound-divergent'),
        convergent: document.getElementById('geography-e026-bound-convergent'),
        transform: document.getElementById('geography-e026-bound-transform'),
      },
      mag: document.getElementById(MAG_ID),
      magOut: document.getElementById(MAG_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e026-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Tectonique des plaques et séismes');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Comparer les frontières de plaques permet de comprendre où et pourquoi la Terre tremble : le régime de faille commande la profondeur des foyers, et la magnitude commande l’énergie libérée.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = BOUND_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Type de frontière (choix unique)';
  fieldset.appendChild(legend);
  const radios = {};
  ORDER.forEach((key) => {
    const lab = ctx.el('label', 'geography-e026-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e026-bound';
    radio.id = `geography-e026-bound-${key}`;
    radio.value = key;
    radio.checked = S.boundary === key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(BOUNDARIES[key].label));
    fieldset.appendChild(lab);
    radios[key] = radio;
  });

  const sub = ctx.el('h3', '', 'Observer le cycle sismique');
  const magRow = ctx.el('p', '');
  const magLabel = document.createElement('label');
  magLabel.setAttribute('for', MAG_ID);
  magLabel.appendChild(document.createTextNode('Magnitude de moment Mw : '));
  const magOut = document.createElement('span');
  magOut.id = MAG_OUT_ID;
  magLabel.appendChild(magOut);
  magRow.appendChild(magLabel);

  const mag = document.createElement('input');
  mag.type = 'range';
  mag.id = MAG_ID;
  mag.min = '50';
  mag.max = '90';
  mag.step = '1';
  mag.value = String(S.magTenths);
  mag.setAttribute('aria-label', 'Magnitude de moment Mw, de 5,0 à 9,0');
  mag.setAttribute('aria-valuetext', `Mw ${fmt1(mag())}`);

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Coupe schématique de la frontière de plaques choisie. Flèches gauche et droite : changer de frontière ; flèches haut et bas : changer la magnitude.');

  const legendText = ctx.el('p', 'geography-e026-legend');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e026-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le cycle' : '▶ Animer le cycle');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sub, magRow, mag, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return { panel, fresh: true, radios, mag, magOut, canvas, readout, play, legend: legendText };
}

/* ---------- Rendu du laboratoire (un seul canvas deterministe) ---------- */

function arrow(g, x1, y1, x2, y2, dash, color, width) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = width || 2;
  if (g.setLineDash) g.setLineDash(dash || []);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const h = 9;
  if (g.setLineDash) g.setLineDash([]);
  g.beginPath();
  g.moveTo(x2, y2);
  g.lineTo(x2 - h * Math.cos(ang - 0.5), y2 - h * Math.sin(ang - 0.5));
  g.lineTo(x2 - h * Math.cos(ang + 0.5), y2 - h * Math.sin(ang + 0.5));
  g.closePath();
  g.fillStyle = color;
  g.fill();
  g.restore();
}

function cross(g, x, y, r) {
  g.save();
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 1.4;
  if (g.setLineDash) g.setLineDash([]);
  g.beginPath();
  g.moveTo(x - r, y); g.lineTo(x + r, y);
  g.moveTo(x, y - r); g.lineTo(x, y + r);
  g.stroke();
  g.restore();
}

function drawDivergent(g, geo) {
  const { L, R, T, B, cx, surfaceY, plateH, dash } = geo;
  g.fillStyle = 'rgba(90,130,170,.10)';
  g.fillRect(L, T, R - L, surfaceY - T);
  g.fillStyle = 'rgba(130,85,45,.14)';
  g.fillRect(L, surfaceY, R - L, B - surfaceY);

  g.save();
  g.fillStyle = 'rgba(255,255,255,.07)';
  g.strokeStyle = 'rgba(214,207,193,.5)';
  g.lineWidth = 1;
  if (g.setLineDash) g.setLineDash(dash);
  g.fillRect(L, surfaceY, cx - 10 - L, plateH);
  g.strokeRect(L, surfaceY, cx - 10 - L, plateH);
  g.fillRect(cx + 10, surfaceY, R - (cx + 10), plateH);
  g.strokeRect(cx + 10, surfaceY, R - (cx + 10), plateH);
  g.restore();

  g.save();
  g.fillStyle = 'rgba(230,185,111,.20)';
  g.strokeStyle = 'rgba(230,185,111,.7)';
  g.beginPath();
  g.moveTo(cx - 12, B); g.lineTo(cx + 12, B); g.lineTo(cx, surfaceY + 4);
  g.closePath(); g.fill();
  if (g.setLineDash) g.setLineDash([3, 3]);
  g.stroke();
  g.restore();

  arrow(g, cx - 26, surfaceY - 12, cx - 66, surfaceY - 12, dash, 'rgba(244,214,158,.95)', 2);
  arrow(g, cx + 26, surfaceY - 12, cx + 66, surfaceY - 12, dash, 'rgba(244,214,158,.95)', 2);
  arrow(g, cx, B - 16, cx, surfaceY + 12, [3, 3], 'rgba(230,185,111,.9)', 2);
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '10px sans-serif';
  g.fillText('Dorsale · failles normales · < 30 km · volcanisme basaltique', L + 4, B - 6);
}

function drawConvergent(g, geo) {
  const { L, R, T, B, cx, surfaceY, plateH, dash } = geo;
  g.fillStyle = 'rgba(90,130,170,.10)';
  g.fillRect(L, T, R - L, surfaceY - T);
  g.fillStyle = 'rgba(130,85,45,.14)';
  g.fillRect(L, surfaceY, R - L, B - surfaceY);

  const sx = cx;
  const sy = surfaceY;
  const ex = R - 16;
  const ey = B - 12;
  const th = plateH * 0.8;
  g.save();
  g.fillStyle = 'rgba(255,255,255,.07)';
  g.strokeStyle = 'rgba(214,207,193,.55)';
  g.lineWidth = 1;
  if (g.setLineDash) g.setLineDash(dash);
  g.beginPath();
  g.moveTo(L, sy); g.lineTo(sx, sy); g.lineTo(ex, ey);
  g.lineTo(ex - th, ey); g.lineTo(sx - th * 0.4, sy + th); g.lineTo(L, sy + th);
  g.closePath(); g.fill(); g.stroke();
  g.fillRect(sx, sy, R - sx, plateH);
  g.strokeRect(sx, sy, R - sx, plateH);
  g.restore();

  arrow(g, L + 16, sy - 12, sx - 28, sy - 12, dash, 'rgba(244,214,158,.95)', 2);
  arrow(g, sx + 18, sy + 18, sx + (R - sx) * 0.42, sy + (B - sy) * 0.34, dash, 'rgba(244,214,158,.95)', 2);
  arrow(g, R - 12, sy - 12, R - 44, sy - 12, dash, 'rgba(214,207,193,.85)', 1.5);

  for (let i = 0; i < 6; i += 1) {
    const t = 0.12 + i * 0.14;
    cross(g, sx + (ex - sx) * t, sy + (ey - sy) * t - th * 0.4, 3);
  }

  g.save();
  g.fillStyle = 'rgba(230,185,111,.35)';
  g.strokeStyle = 'rgba(230,185,111,.85)';
  const vx = sx + (R - sx) * 0.42;
  g.beginPath();
  g.moveTo(vx - 8, sy); g.lineTo(vx + 8, sy); g.lineTo(vx, sy - 18);
  g.closePath(); g.fill(); g.stroke();
  g.restore();

  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '10px sans-serif';
  g.fillText('Fosse · failles inverses · foyers jusqu’à ~700 km · volcanisme explosif', L + 4, B - 6);
}

function drawTransform(g, geo) {
  const { L, R, T, B, dash } = geo;
  const mid = T + (B - T) / 2;
  g.fillStyle = 'rgba(255,255,255,.05)';
  g.fillRect(L, T, R - L, mid - T);
  g.fillStyle = 'rgba(255,255,255,.09)';
  g.fillRect(L, mid, R - L, B - mid);

  g.save();
  g.strokeStyle = 'rgba(244,214,158,.9)';
  g.lineWidth = 2;
  if (g.setLineDash) g.setLineDash(dash);
  g.beginPath(); g.moveTo(L, mid); g.lineTo(R, mid); g.stroke();
  g.restore();

  arrow(g, L + (R - L) * 0.26, T + (mid - T) / 2, L + (R - L) * 0.50, T + (mid - T) / 2, dash, 'rgba(244,214,158,.95)', 2);
  arrow(g, L + (R - L) * 0.74, mid + (B - mid) / 2, L + (R - L) * 0.50, mid + (B - mid) / 2, dash, 'rgba(244,214,158,.95)', 2);

  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '10px sans-serif';
  g.fillText('Vue de dessus · failles transformantes · < 30 km · sans volcanisme', L + 4, B - 6);
}

function drawStressGauge(g, geo, stress, rupture) {
  const { R, T, B } = geo;
  const gw = Math.min(120, (R - geo.L) * 0.38);
  const gx = R - gw - 6;
  const gy = B - 26;
  g.save();
  g.strokeStyle = 'rgba(214,207,193,.6)';
  g.lineWidth = 1;
  if (g.setLineDash) g.setLineDash([]);
  g.strokeRect(gx, gy, gw, 9);
  g.fillStyle = rupture ? 'rgba(244,214,158,.95)' : 'rgba(230,185,111,.7)';
  g.fillRect(gx + 1, gy + 1, Math.max(0, Math.min(1, stress)) * (gw - 2), 7);
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '9px sans-serif';
  g.fillText('Contrainte', gx, gy - 3);
  if (rupture) {
    g.strokeStyle = 'rgba(244,214,158,.95)';
    g.lineWidth = 2;
    for (let k = 0; k < 8; k += 1) {
      const a = (k * Math.PI) / 4;
      const bx = geo.cx + Math.cos(a) * 8;
      const by = geo.surfaceY + Math.sin(a) * 8;
      g.beginPath();
      g.moveTo(geo.cx + Math.cos(a) * 14, geo.surfaceY + Math.sin(a) * 14);
      g.lineTo(bx, by);
      g.stroke();
    }
  }
  g.restore();
  void T;
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 250;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 16;
  const L = pad;
  const R = cssW - pad;
  const T = pad;
  const B = cssH - pad;
  const geo = {
    L, R, T, B,
    cx: L + (R - L) / 2,
    surfaceY: T + (B - T) * 0.42,
    plateH: (B - T) * 0.16,
    dash: BOUNDARIES[S.boundary].dash,
  };

  if (S.boundary === 'divergent') drawDivergent(g, geo);
  else if (S.boundary === 'convergent') drawConvergent(g, geo);
  else drawTransform(g, geo);

  const st = phaseState(S.phase);
  drawStressGauge(g, geo, st.stress, st.rupture);

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(BOUNDARIES[S.boundary].label, L + 2, T + 12);
  g.fillText(`Mw ${fmt1(mag())}`, R - 60, T + 12);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const mw = mag();
  const j = energyJ(mw);
  const r = ratioRef(mw);
  const kt = tntKt(mw);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(phaseText(S.phase, mw) + ' Énergie libérée : '));
  n.appendChild(fort(fmtEnergy(j)));
  n.appendChild(document.createTextNode(` (référence Mw ${fmt1(MAG_REF)} = ${fmtEnergy(energyJ(MAG_REF))}) ; soit `));
  n.appendChild(fort(fmtRatio(r)));
  n.appendChild(document.createTextNode(` l’énergie du séisme de référence, et l’équivalent de `));
  n.appendChild(fort(fmtTnt(kt)));
  n.appendChild(document.createTextNode(' de TNT. Le trait du schéma distingue la frontière, indépendamment de la couleur.'));
}

function syncControls() {
  const n = S.nodes;
  ORDER.forEach((key) => {
    if (n.radios && n.radios[key]) n.radios[key].checked = S.boundary === key;
  });
  if (n.mag) {
    n.mag.value = String(S.magTenths);
    n.mag.setAttribute('aria-valuetext', `Mw ${fmt1(mag())}`);
  }
  if (n.magOut) n.magOut.textContent = `Mw ${fmt1(mag())}`;
  if (n.legend) {
    const b = BOUNDARIES[S.boundary];
    n.legend.textContent = `${b.label} — ${b.code} ; ${b.regime} ; ${b.depth} ; ${b.volcan}.`;
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le cycle' : '▶ Animer le cycle';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.canvas) n.canvas.setAttribute('aria-label', BOUNDARIES[S.boundary].aria + ` Magnitude Mw ${fmt1(mag())}. Flèches gauche et droite : changer de frontière ; flèches haut et bas : changer la magnitude.`);
  updateReadout();
  drawLab();
}

/* ---------- Boucle rAF unique, pause sur document.hidden ---------- */

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
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  const reduced = typeof ctxReduced === 'function' ? !!ctxReduced() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.phase = (S.phase + dt * 0.00016) % 1;
  }
  S.lastTs = ts;
  updateReadout();
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

let ctxReduced = null;

function installGlobalListeners(ctx) {
  ctxReduced = ctx.reducedMotion;
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE026Reduced = mq.matches ? '1' : '0';
        if (mq.matches) { stopLoop(); updateReadout(); drawLab(); }
        else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- Badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e026-badge', 'Schéma conceptuel — coupe transversale non à l’échelle ; profondeurs et distances sont des ordres de grandeur indicatifs.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E026', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css('geography-e026', CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE026Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    ORDER.forEach((key) => {
      const radio = n.radios[key];
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.boundary = key;
        syncControls();
      });
    });
    n.mag.addEventListener('input', () => {
      S.magTenths = Math.max(50, Math.min(90, Math.round(Number(n.mag.value))));
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = ORDER.indexOf(S.boundary);
        S.boundary = ORDER[(i + step + ORDER.length) % ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 1 : -1;
        S.magTenths = Math.max(50, Math.min(90, S.magTenths + step));
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners(ctx);
  if (S.playing && !reduced) startLoop();
});
