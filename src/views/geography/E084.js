import { register } from './registry.js';

/* Lentille E084 — vue GEOGRAPHIE.
 * Thème : le cadre englobant (bounding box) des lieux.
 *
 * Les dix chantiers E084-01 … E084-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E084.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau) présent dans le DOM même sans animation ; le canvas
 * n'est qu'un laboratoire qui illustre des calculs déterministes sur les bornes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e084';
const PANEL_ID = 'geography-e084-panel';
const TITLE_ID = 'geography-e084-title';
const MINLAT_ID = 'geography-e084-minlat-value';
const MAXLAT_ID = 'geography-e084-maxlat-value';
const MINLON_ID = 'geography-e084-minlon-value';
const MAXLON_ID = 'geography-e084-maxlon-value';
const PAD_ID = 'geography-e084-pad';
const PAD_OUT_ID = 'geography-e084-pad-value';
const TESTLAT_ID = 'geography-e084-testlat';
const TESTLAT_OUT_ID = 'geography-e084-testlat-value';
const TESTLON_ID = 'geography-e084-testlon';
const TESTLON_OUT_ID = 'geography-e084-testlon-value';
const CANVAS_ID = 'geography-e084-canvas';
const READOUT_ID = 'geography-e084-readout';
const PLAY_ID = 'geography-e084-play';
const LEGEND_ID = 'geography-e084-legend';
const BADGE_ID = 'geography-e084-badge';
const TABLE_ID = 'geography-e084-table';

/* Jeu de démonstration : coordonnées fictives, choisies pour des calculs
   exacts et vérifiables. Elles ne prétendent décrire aucun lieu réel. */
const LIEUX = [
  { id: 'A', lat: 46, lon: 0 },
  { id: 'B', lat: 46, lon: 6 },
  { id: 'C', lat: 51, lon: 6 },
  { id: 'D', lat: 51, lon: 0 },
  { id: 'E', lat: 48.5, lon: 3 },
  { id: 'F', lat: 49.2, lon: 1.5 },
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  padding: 2,
  testLat: 48.5,
  testLon: 3,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée en cache) ---------- */

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

/* Cadre minimal : bornes = minimum et maximum des coordonnées des lieux. */
function bboxMinimal(lieux) {
  let minLat = Infinity; let maxLat = -Infinity;
  let minLon = Infinity; let maxLon = -Infinity;
  lieux.forEach((p) => {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  });
  return { minLat, maxLat, minLon, maxLon };
}

/* Cadre à marge : on élargit chaque borne d'autant de degrés. */
function bboxPadded(base, marge) {
  return {
    minLat: base.minLat - marge,
    maxLat: base.maxLat + marge,
    minLon: base.minLon - marge,
    maxLon: base.maxLon + marge,
  };
}

function centre(b) {
  return { lat: (b.minLat + b.maxLat) / 2, lon: (b.minLon + b.maxLon) / 2 };
}

function mesures(b) {
  const largeur = b.maxLon - b.minLon;
  const hauteur = b.maxLat - b.minLat;
  return {
    largeur,
    hauteur,
    surface: largeur * hauteur,
    diagonale: Math.sqrt(largeur * largeur + hauteur * hauteur),
    centre: centre(b),
  };
}

function estDedans(point, b) {
  return point.lat >= b.minLat && point.lat <= b.maxLat
    && point.lon >= b.minLon && point.lon <= b.maxLon;
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e084-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e084-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e084-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e084-panel p{margin:5px 0;max-width:68ch}
#geography-e084-panel .geography-e084-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e084-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e084-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e084-table th,#geography-e084-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e084-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e084-bornes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 12px;margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e084-bornes span strong{color:var(--gold-bright,#f4d69e);font-variant-numeric:tabular-nums}
.geography-e084-ctrl{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
.geography-e084-ctrl legend{padding:0 4px;color:var(--muted)}
.geography-e084-ctrl label{display:block;min-height:24px;margin:3px 0}
.geography-e084-ctrl input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.geography-e084-val{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#geography-e084-canvas{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e084-legend{font-size:10px;color:var(--muted)}
#geography-e084-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e084-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e084-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e084-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e084-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e084-badge{
  position:absolute;right:16px;bottom:14px;z-index:3;max-width:58%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e084-panel[data-geography-e084-reduced="1"] button,
#geography-e084-panel[data-geography-e084-reduced="1"] .geography-e084-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e084-panel button,.geography-e084-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e084-panel{font-size:10px;padding:9px}
  #geography-e084-canvas{height:200px}
  #geography-e084-bornes{grid-template-columns:1fr}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Le cadre englobant, ou bounding box, d’un ensemble de lieux est le plus petit rectangle qui contient tous les points : il est défini par quatre bornes, la latitude minimale et maximale et la longitude minimale et maximale.',
    'Le cadre minimal est calculé par un simple minimum et un simple maximum sur les coordonnées ; il n’ajoute aucune information et ne retire aucun point : c’est une mesure, pas une hypothèse.',
    'Une marge (padding) élargit le cadre de quelques degrés de chaque côté : elle évite que les points extrêmes collent au bord, mais elle peut multiplier la surface affichée et donner une fausse impression d’étendue.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e084-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Jeu de démonstration à six points fictifs : cadre minimal et cadres à marge (référence : marge 0°.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Marge', 'Largeur (lon)', 'Hauteur (lat)', 'Surface (degrés²)', 'Surface / référence'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const base = bboxMinimal(LIEUX);
  const ref = mesures(base).surface;
  const tbody = document.createElement('tbody');
  [0, 2, 5].forEach((marge) => {
    const m = mesures(bboxPadded(base, marge));
    const cells = [
      `${marge}°`,
      `${fmt(m.largeur)}°`,
      `${fmt(m.hauteur)}°`,
      fmt(m.surface),
      `${(m.surface / ref).toFixed(2).replace('.', ',')}×`,
    ];
    const tr = document.createElement('tr');
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
      minLat: document.getElementById(MINLAT_ID),
      maxLat: document.getElementById(MAXLAT_ID),
      minLon: document.getElementById(MINLON_ID),
      maxLon: document.getElementById(MAXLON_ID),
      pad: document.getElementById(PAD_ID),
      padOut: document.getElementById(PAD_OUT_ID),
      testLat: document.getElementById(TESTLAT_ID),
      testLatOut: document.getElementById(TESTLAT_OUT_ID),
      testLon: document.getElementById(TESTLON_ID),
      testLonOut: document.getElementById(TESTLON_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e084-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Le cadre englobant des lieux');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Un cadre englobant résume six lieux par quatre nombres. Ce laboratoire montre que la marge ajoutée au rectangle n’est pas neutre : elle change la surface affichée et peut faire entrer ou sortir un point testé.');

  const bornesTitle = ctx.el('h3', '', 'Les quatre bornes du cadre minimal');
  const base = bboxMinimal(LIEUX);
  const bornes = ctx.el('div', 'geography-e084-bornes');
  [
    ['Latitude minimale', MINLAT_ID, `${fmt(base.minLat)}°`],
    ['Latitude maximale', MAXLAT_ID, `${fmt(base.maxLat)}°`],
    ['Longitude minimale', MINLON_ID, `${fmt(base.minLon)}°`],
    ['Longitude maximale', MAXLON_ID, `${fmt(base.maxLon)}°`],
  ].forEach(([label, id, valeur]) => {
    const span = document.createElement('span');
    span.appendChild(document.createTextNode(label + ' : '));
    const strong = ctx.el('strong', '', valeur);
    strong.id = id;
    span.appendChild(strong);
    bornes.appendChild(span);
  });

  const padField = document.createElement('fieldset');
  padField.className = 'geography-e084-ctrl';
  const padLegend = document.createElement('legend');
  padLegend.textContent = 'Marge du cadre (en degrés)';
  padField.appendChild(padLegend);
  const padLabel = document.createElement('label');
  padLabel.setAttribute('for', PAD_ID);
  padLabel.appendChild(document.createTextNode('Élargissement de chaque borne : '));
  const padOut = ctx.el('span', 'geography-e084-val', `${S.padding}°`);
  padOut.id = PAD_OUT_ID;
  padLabel.appendChild(padOut);
  padField.appendChild(padLabel);
  const pad = document.createElement('input');
  pad.type = 'range';
  pad.id = PAD_ID;
  pad.min = '0';
  pad.max = '6';
  pad.step = '1';
  pad.value = String(S.padding);
  pad.setAttribute('aria-label', 'Marge ajoutée à chaque borne, de 0 à 6 degrés');
  padField.appendChild(pad);

  const testField = document.createElement('fieldset');
  testField.className = 'geography-e084-ctrl';
  const testLegend = document.createElement('legend');
  testLegend.textContent = 'Point à tester (coordonnées)';
  testField.appendChild(testLegend);

  const latLabel = document.createElement('label');
  latLabel.setAttribute('for', TESTLAT_ID);
  latLabel.appendChild(document.createTextNode('Latitude du point : '));
  const testLatOut = ctx.el('span', 'geography-e084-val', `${fmt(S.testLat)}°`);
  testLatOut.id = TESTLAT_OUT_ID;
  latLabel.appendChild(testLatOut);
  testField.appendChild(latLabel);
  const testLat = document.createElement('input');
  testLat.type = 'range';
  testLat.id = TESTLAT_ID;
  testLat.min = '40';
  testLat.max = '58';
  testLat.step = '0.5';
  testLat.value = String(S.testLat);
  testLat.setAttribute('aria-label', 'Latitude du point à tester, de 40 à 58 degrés par pas de 0,5');
  testField.appendChild(testLat);

  const lonLabel = document.createElement('label');
  lonLabel.setAttribute('for', TESTLON_ID);
  lonLabel.appendChild(document.createTextNode('Longitude du point : '));
  const testLonOut = ctx.el('span', 'geography-e084-val', `${fmt(S.testLon)}°`);
  testLonOut.id = TESTLON_OUT_ID;
  lonLabel.appendChild(testLonOut);
  testField.appendChild(lonLabel);
  const testLon = document.createElement('input');
  testLon.type = 'range';
  testLon.id = TESTLON_ID;
  testLon.min = '-2';
  testLon.max = '8';
  testLon.step = '0.5';
  testLon.value = String(S.testLon);
  testLon.setAttribute('aria-label', 'Longitude du point à tester, de moins 2 à 8 degrés par pas de 0,5');
  testField.appendChild(testLon);

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Cadre minimal en trait plein et cadre à marge en tirets, avec six lieux en cercles et un point testé en croix. Flèches gauche et droite : longitude du point ; flèches haut et bas : latitude du point ; touches plus et moins : marge.');

  const legend = ctx.el('p', 'geography-e084-legend', 'Trait plein = cadre minimal ; tirets = cadre à marge ; cercles lettres = lieux ; croix T = point testé. Les formes distinguent les éléments, indépendamment de la couleur.');
  legend.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e084-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), bornesTitle, bornes,
    padField, testField, canvas, legend, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    minLat: document.getElementById(MINLAT_ID),
    maxLat: document.getElementById(MAXLAT_ID),
    minLon: document.getElementById(MINLON_ID),
    maxLon: document.getElementById(MAXLON_ID),
    pad, padOut,
    testLat, testLatOut, testLon, testLonOut,
    canvas, readout, play, legend,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas dessiné par frame) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 240;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const base = bboxMinimal(LIEUX);
  const padded = bboxPadded(base, S.padding);
  /* Marge d'affichage fixe pour garder le cadre lisible même à marge nulle. */
  const dispMinLon = padded.minLon - 1;
  const dispMaxLon = padded.maxLon + 1;
  const dispMinLat = padded.minLat - 1;
  const dispMaxLat = padded.maxLat + 1;

  const pad = 16;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const toPx = (lon, lat) => [
    pad + ((lon - dispMinLon) / (dispMaxLon - dispMinLon)) * iw,
    pad + ((dispMaxLat - lat) / (dispMaxLat - dispMinLat)) * ih,
  ];
  const rect = (b) => {
    const [x0, y1] = toPx(b.minLon, b.minLat);
    const [x1, y0] = toPx(b.maxLon, b.maxLat);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };

  /* Graticule de fond (repère non chromatique). */
  g.strokeStyle = 'rgba(255,255,255,.10)';
  g.lineWidth = 1;
  g.setLineDash([]);
  const lonStep = (dispMaxLon - dispMinLon) > 14 ? 2 : 1;
  for (let lon = Math.ceil(dispMinLon); lon <= dispMaxLon; lon += lonStep) {
    const [x] = toPx(lon, 0);
    g.beginPath(); g.moveTo(x, pad); g.lineTo(x, pad + ih); g.stroke();
  }
  for (let lat = Math.ceil(dispMinLat); lat <= dispMaxLat; lat += 1) {
    const [, y] = toPx(0, lat);
    g.beginPath(); g.moveTo(pad, y); g.lineTo(pad + iw, y); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.strokeRect(pad, pad, iw, ih);

  /* Cadre à marge : tirets + épaisseur pilotée par la seule animation. */
  const rPad = rect(padded);
  const pulse = 1.4 + 1.2 * (0.5 + 0.5 * Math.cos(S.sweep * Math.PI * 2));
  g.setLineDash([6, 4]);
  g.strokeStyle = 'rgba(230,185,111,.85)';
  g.lineWidth = pulse;
  g.strokeRect(rPad.x, rPad.y, rPad.w, rPad.h);
  g.setLineDash([]);

  /* Cadre minimal : trait plein. */
  const rMin = rect(base);
  g.strokeStyle = 'rgba(244,214,158,.98)';
  g.lineWidth = 2;
  g.strokeRect(rMin.x, rMin.y, rMin.w, rMin.h);

  /* Lieux : cercles + étiquette (jamais la couleur seule). */
  g.fillStyle = 'rgba(214,207,193,.95)';
  g.font = '11px sans-serif';
  LIEUX.forEach((p) => {
    const [x, y] = toPx(p.lon, p.lat);
    g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fill();
    g.fillText(p.id, x + 5, y - 5);
  });

  /* Point testé : croix T, avec indication dedans / dehors par le trait. */
  const [tx, ty] = toPx(S.testLon, S.testLat);
  const dedansMin = estDedans({ lat: S.testLat, lon: S.testLon }, base);
  const dedansPad = estDedans({ lat: S.testLat, lon: S.testLon }, padded);
  g.strokeStyle = 'rgba(255,255,255,.95)';
  g.lineWidth = dedansPad ? 2.6 : 1.3;
  if (!dedansMin) g.setLineDash([2, 2]);
  g.beginPath();
  g.moveTo(tx - 7, ty); g.lineTo(tx + 7, ty);
  g.moveTo(tx, ty - 7); g.lineTo(tx, ty + 7);
  g.stroke();
  g.setLineDash([]);
  g.fillText('T', tx + 9, ty + 4);

  /* Balayage : un point deterministe court sur le pourtour du cadre à marge. */
  const perim = 2 * (rPad.w + rPad.h);
  const d = (S.sweep * perim) % perim;
  let sx; let sy;
  if (d < rPad.w) { sx = rPad.x + d; sy = rPad.y; }
  else if (d < rPad.w + rPad.h) { sx = rPad.x + rPad.w; sy = rPad.y + (d - rPad.w); }
  else if (d < 2 * rPad.w + rPad.h) { sx = rPad.x + rPad.w - (d - rPad.w - rPad.h); sy = rPad.y + rPad.h; }
  else { sx = rPad.x; sy = rPad.y + rPad.h - (d - 2 * rPad.w - rPad.h); }
  g.fillStyle = 'rgba(255,255,255,.9)';
  g.beginPath(); g.arc(sx, sy, 3, 0, Math.PI * 2); g.fill();

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`marge ${S.padding}° — plein = minimal, tirets = élargi`, pad + 2, pad + 13);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const base = bboxMinimal(LIEUX);
  const padded = bboxPadded(base, S.padding);
  const mMin = mesures(base);
  const mPad = mesures(padded);
  const point = { lat: S.testLat, lon: S.testLon };
  const dedansMin = estDedans(point, base);
  const dedansPad = estDedans(point, padded);
  const position = dedansMin
    ? 'dans le cadre minimal et dans le cadre à marge'
    : (dedansPad
      ? 'dans le cadre à marge mais hors du cadre minimal'
      : 'hors des deux cadres');

  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Référence — cadre minimal (marge 0°) : largeur '));
  n.appendChild(fort(`${fmt(mMin.largeur)}°`));
  n.appendChild(document.createTextNode(', hauteur '));
  n.appendChild(fort(`${fmt(mMin.hauteur)}°`));
  n.appendChild(document.createTextNode(', surface '));
  n.appendChild(fort(`${fmt(mMin.surface)} degrés²`));
  n.appendChild(document.createTextNode(`. À marge ${S.padding}° : largeur `));
  n.appendChild(fort(`${fmt(mPad.largeur)}°`));
  n.appendChild(document.createTextNode(', hauteur '));
  n.appendChild(fort(`${fmt(mPad.hauteur)}°`));
  n.appendChild(document.createTextNode(', surface '));
  n.appendChild(fort(`${fmt(mPad.surface)} degrés²`));
  n.appendChild(document.createTextNode(` (soit ${(mPad.surface / mMin.surface).toFixed(2).replace('.', ',')}× la référence), diagonale `));
  n.appendChild(fort(`${fmt(mPad.diagonale)}°`));
  n.appendChild(document.createTextNode(`. Centre : ${fmt(mPad.centre.lat)}° de latitude, ${fmt(mPad.centre.lon)}° de longitude. Point testé (${fmt(S.testLat)}° / ${fmt(S.testLon)}°) : `));
  n.appendChild(fort(position));
  n.appendChild(document.createTextNode('. Une marge élargit la surface sans rien apprendre de nouveau sur les lieux.'));
}

function syncControls() {
  const n = S.nodes;
  if (n.pad) n.pad.value = String(S.padding);
  if (n.padOut) n.padOut.textContent = `${S.padding}°`;
  if (n.testLat) n.testLat.value = String(S.testLat);
  if (n.testLatOut) n.testLatOut.textContent = `${fmt(S.testLat)}°`;
  if (n.testLon) n.testLon.value = String(S.testLon);
  if (n.testLonOut) n.testLonOut.textContent = `${fmt(S.testLon)}°`;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
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
  const reduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00012) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners(ctx) {
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
        if (panel) panel.dataset.geographyE084Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- Badge textuel du cadre sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e084-badge', 'Cadre englobant : bornes = min/max des lat/lon des lieux ; la marge élargit le rectangle.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E084', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE084Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.pad.addEventListener('input', () => {
      S.padding = Math.max(0, Math.min(6, Math.round(Number(n.pad.value))));
      syncControls();
    });
    n.testLat.addEventListener('input', () => {
      S.testLat = Math.max(40, Math.min(58, Math.round(Number(n.testLat.value) * 2) / 2));
      syncControls();
    });
    n.testLon.addEventListener('input', () => {
      S.testLon = Math.max(-2, Math.min(8, Math.round(Number(n.testLon.value) * 2) / 2));
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      const pas = event.shiftKey ? 2 : 0.5;
      if (event.key === 'ArrowLeft') S.testLon = Math.max(-2, Math.min(8, S.testLon - pas));
      else if (event.key === 'ArrowRight') S.testLon = Math.max(-2, Math.min(8, S.testLon + pas));
      else if (event.key === 'ArrowUp') S.testLat = Math.max(40, Math.min(58, S.testLat + pas));
      else if (event.key === 'ArrowDown') S.testLat = Math.max(40, Math.min(58, S.testLat - pas));
      else if (event.key === '+' || event.key === '=') S.padding = Math.max(0, Math.min(6, S.padding + 1));
      else if (event.key === '-' || event.key === '_') S.padding = Math.max(0, Math.min(6, S.padding - 1));
      else used = false;
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners(ctx);
  if (S.playing) startLoop();
});
