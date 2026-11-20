import { register } from './registry.js';

/* Lentille E001 — passe V2, vue GEOGRAPHIE.
 * Thème : projections cartographiques (Mercator, équirectangulaire, Robinson).
 *
 * Les dix chantiers E001-01 … E001-10 sont réellement implémentés (aucun stub) ;
 * leur description est dans UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E001.md.
 * Tout est local : zéro réseau, zéro journalisation, aucun générateur aléatoire,
 * aucun fichier partagé ou module de la passe 1 modifié. Le contenu pédagogique est du texte
 * sémantique réel (h2, h3, p, dl, table, fieldset, label, ol) inséré dans le
 * DOM : il reste lisible et indexable même sans animation ni interaction. Le
 * canvas n'est qu'un laboratoire qui illustre des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e001';
const P = 'geography-v2-e001-';
const PANEL_ID = P + 'panel';
const TITLE_ID = P + 'title';
const GLOSSARY_ID = P + 'glossary';
const TABLE_ID = P + 'table';
const PROJ_ID = P + 'projection';
const LAT_ID = P + 'lat';
const LAT_NUM_ID = P + 'lat-number';
const LAT_OUT_ID = P + 'lat-value';
const CANVAS_ID = P + 'canvas';
const LEGEND_ID = P + 'legend';
const READOUT_ID = P + 'readout';
const PLAY_ID = P + 'play';
const DEFI_ID = P + 'defi';
const BADGE_ID = P + 'badge';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const EARTH_X = 0.8487;
const EARTH_Y = 1.3523;
/* Graine fixe (aucun hasard) : cinq points témoins reproductibles. */
const GRAINE = 0x45e001;

/* Tables canoniques de Robinson (pas de 5° de 0° à 90°). */
const ROB_X = [1.0000, 0.9986, 0.9954, 0.9900, 0.9822, 0.9730, 0.9600, 0.9427, 0.9216, 0.8962, 0.8679, 0.8350, 0.7986, 0.7597, 0.7186, 0.6732, 0.6213, 0.5722, 0.5322];
const ROB_Y = [0.0000, 0.0620, 0.1240, 0.1860, 0.2480, 0.3100, 0.3720, 0.4340, 0.4958, 0.5571, 0.6176, 0.6769, 0.7346, 0.7903, 0.8435, 0.8936, 0.9394, 0.9761, 1.0000];

const LABELS = {
  mercator: 'Mercator — trait plein',
  equirect: 'Équirectangulaire — tirets',
  robinson: 'Robinson — pointillés',
};
const DASHES = { mercator: [], equirect: [7, 5], robinson: [2, 4] };
const ORDRE = ['mercator', 'equirect', 'robinson'];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  projection: 'mercator',
  lat: 60,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  offscreen: false,
  visibilityBound: false,
  motionBound: false,
  observersInstalled: false,
  observedCanvas: null,
  resizeCanvas: null,
  points: null,
  nodes: {},
};

/* Alias de ctx.el, initialisé au point d'entrée (les helpers l'utilisent). */
let E = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

/* PRNG déterministe : même graine, mêmes points, à chaque rendu. */
function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pointsTemoins() {
  if (S.points) return S.points;
  const rnd = mulberry32(GRAINE);
  const pts = [];
  for (let i = 0; i < 5; i += 1) {
    pts.push({ lon: -170 + rnd() * 340, lat: -70 + rnd() * 140 });
  }
  S.points = pts;
  return pts;
}

function robIndex(lat) {
  return clamp(Math.abs(lat) / 5, 0, 18);
}

function robInterp(table, lat) {
  const i = robIndex(lat);
  const lo = Math.floor(i);
  const hi = Math.min(18, lo + 1);
  return table[lo] + (table[hi] - table[lo]) * (i - lo);
}

/* Dérivée méridienne de Y (par radian), par différence centrale sur la table. */
function robYPrime(lat) {
  const c = Math.round(clamp(Math.abs(lat), 0, 90) / 5);
  const a = Math.max(0, c - 1);
  const b = Math.min(18, c + 1);
  const perDeg = (ROB_Y[b] - ROB_Y[a]) / ((b - a) * 5);
  return perDeg * DEG;
}

function mercY(latDeg) {
  const p = clamp(latDeg, -85, 85);
  return Math.log(Math.tan(Math.PI / 4 + (p * RAD) / 2));
}

/* Contrôle croisé : dérivée finie de y(φ) comparée à sec(φ). */
function controleMercator(latDeg) {
  const p = clamp(latDeg, -80, 80);
  const pasDeg = 0.25;
  const derivee = (mercY(p + pasDeg) - mercY(p - pasDeg)) / (2 * pasDeg * RAD);
  const sec = 1 / Math.cos(p * RAD);
  return { derivee, sec, ecart: Math.abs(derivee - sec) };
}

function measures(latDeg) {
  const phi = clamp(latDeg, -80, 80) * RAD;
  const cos = Math.cos(phi);
  const sec = 1 / cos;
  const y0 = robYPrime(0);
  const yp = robYPrime(latDeg);
  const xr = robInterp(ROB_X, latDeg);
  return {
    lat: Math.round(latDeg),
    mercK: sec,
    mercArea: sec * sec,
    equiMerid: 1,
    equiArea: sec,
    robMerid: y0 > 0 ? yp / y0 : 1,
    robArea: cos > 0 ? (EARTH_X * xr * EARTH_Y * yp) / cos : 1,
  };
}

function projectFor(kind, lonDeg, latDeg) {
  if (kind === 'equirect') {
    return { u: lonDeg / 180, v: latDeg / 85 };
  }
  if (kind === 'mercator') {
    const yMax = Math.log(Math.tan(Math.PI / 4 + (85 * RAD) / 2));
    return { u: lonDeg / 180, v: mercY(latDeg) / yMax };
  }
  const a = clamp(Math.abs(latDeg), 0, 90);
  const x = robInterp(ROB_X, a);
  const y = robInterp(ROB_Y, a) * (latDeg < 0 ? -1 : 1);
  return { u: (lonDeg / 180) * x, v: y / ROB_Y[18] };
}

/* ---------- Feuille de style unique, tous ids préfixés ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
#${PANEL_ID} .geography-v2-e001-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PANEL_ID} .geography-v2-e001-note{color:var(--muted)}
#${GLOSSARY_ID}{margin:6px 0;max-width:68ch}
#${GLOSSARY_ID} dt{color:var(--gold-bright,#f4d69e);font-weight:600;margin-top:5px}
#${GLOSSARY_ID} dd{margin:1px 0 4px 12px;color:var(--ink-soft,#d7d1c6)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${PROJ_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${PROJ_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .geography-v2-e001-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .geography-v2-e001-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${LAT_ID}{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#${LAT_NUM_ID}{
  width:64px;min-height:36px;margin-left:8px;padding:4px 6px;border:1px solid var(--line);
  border-radius:6px;background:rgba(0,0,0,.25);color:var(--ink);font:inherit;
  font-variant-numeric:tabular-nums;
}
#${LAT_OUT_ID}{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;height:220px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${DEFI_ID} ol{margin:5px 0 5px 0;padding-left:20px}
#${DEFI_ID} li{margin:3px 0;max-width:68ch}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-v2-e001-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[data-geography-v2-e001-reduced="1"] button,
#${PANEL_ID}[data-geography-v2-e001-reduced="1"] .geography-v2-e001-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.geography-v2-e001-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:180px}
  #${PANEL_ID} .geography-v2-e001-choix{margin-right:4px}
}
`;

/* ---------- Construction du texte sémantique (lisible sans JS) ---------- */

function staticFacts() {
  const wrap = E('div', 'geography-v2-e001-groupe');
  wrap.appendChild(E('h3', '', 'Trois faits à retenir'));
  const faits = [
    'Une projection transforme le globe, surface courbe, en un plan : elle conserve certaines propriétés et en sacrifie d’autres.',
    'Mercator est conforme : les angles et les petites formes sont conservés, mais les aires sont fortement agrandies vers les pôles.',
    'L’équirectangulaire garde un espacement régulier des parallèles ; Robinson est un compromis qui réduit l’étirement polaire sans être strictement équivalent.',
  ];
  faits.forEach((texte) => wrap.appendChild(E('p', 'geography-v2-e001-fait', texte)));
  return wrap;
}

function staticGlossary() {
  const wrap = E('div', 'geography-v2-e001-groupe');
  wrap.appendChild(E('h3', '', 'Lexique — définitions à la première occurrence'));
  const dl = E('dl');
  dl.id = GLOSSARY_ID;
  const termes = [
    ['Projection', 'Transformation du globe (surface courbe) vers un plan : choix de propriétés conservées et sacrifiées.'],
    ['Conforme', 'Propriété d’une projection qui conserve les angles et les petites formes ; Mercator est conforme.'],
    ['Équivalente', 'Propriété d’une projection qui conserve les aires ; aucune des trois projections comparées ne l’est strictement.'],
    ['Échelle locale', 'Facteur qui multiplie une petite longueur en un point, comparé à sa valeur à l’équateur (référence 1,00).'],
  ];
  termes.forEach(([terme, definition]) => {
    dl.appendChild(E('dt', '', terme));
    dl.appendChild(E('dd', '', definition));
  });
  wrap.appendChild(dl);
  return wrap;
}

function staticTable() {
  const table = E('table');
  table.id = TABLE_ID;
  table.appendChild(E('caption', '', 'Valeurs recalculées depuis les formules, référence : 1,00 à l’équateur.'));

  const thead = E('thead');
  const hr = E('tr');
  ['Projection', 'Propriété', 'Échelle à 0°', 'Échelle à 60°', 'Aires à 60°'].forEach((h) => {
    const th = E('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const m0 = measures(0);
  const m60 = measures(60);
  const tbody = E('tbody');
  const lignes = [
    ['Mercator', 'Conforme (angles conservés)', fmt(m0.mercK), fmt(m60.mercK), fmt(m60.mercArea)],
    ['Équirectangulaire', 'Ni conforme ni équivalente', fmt(m0.equiMerid), fmt(m60.equiMerid), fmt(m60.equiArea)],
    ['Robinson', 'Compromis visuel', fmt(m0.robMerid), fmt(m60.robMerid), fmt(m60.robArea)],
  ];
  lignes.forEach((cells) => {
    const tr = E('tr');
    cells.forEach((c, i) => {
      const cell = E(i === 0 ? 'th' : 'td', '', c);
      if (i === 0) cell.scope = 'row';
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function staticDefi() {
  const wrap = E('section', 'geography-v2-e001-groupe');
  wrap.id = DEFI_ID;
  wrap.appendChild(E('h3', '', 'Défi falsifiable — vérifier l’étirement de Mercator'));
  const ol = E('ol');
  const etapes = [
    'Prédiction : à 60° de latitude, l’échelle de Mercator est-elle supérieure à celle de l’équateur ?',
    'Réglage : placer le curseur de latitude à 60° et choisir successivement chaque projection.',
    'Résultat attendu : Mercator affiche 2,00× en échelle et 4,00× en aires ; Robinson reste proche de 1,00×.',
    'Falsification : si le contrôle croisé (dérivée finie de y) s’écarte de sec(φ) de plus de 0,01, la formule est fausse.',
    'Débrief : le tableau statique et le readout dynamique doivent donner les mêmes nombres ; sinon le dessin est trompeur.',
  ];
  etapes.forEach((t) => ol.appendChild(E('li', '', t)));
  wrap.appendChild(ol);
  return wrap;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      mercator: document.getElementById(P + 'proj-mercator'),
      equirect: document.getElementById(P + 'proj-equirect'),
      robinson: document.getElementById(P + 'proj-robinson'),
      lat: document.getElementById(LAT_ID),
      latNum: document.getElementById(LAT_NUM_ID),
      latOut: document.getElementById(LAT_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = E('section', 'geography-v2-e001-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = E('h2', '', 'Projections cartographiques — comparaison raisonnée');
  title.id = TITLE_ID;
  const lead = E('p', '', 'Comparer Mercator, équirectangulaire et Robinson montre que toute carte est un choix : aucune projection ne conserve à la fois les angles, les aires et les distances. Le laboratoire ci-dessous recalcule chaque grandeur à partir de sa formule.');

  const fieldset = E('fieldset');
  fieldset.id = PROJ_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Projection affichée (choix unique)');
  fieldset.appendChild(E('legend', '', 'Projection affichée (choix unique)'));
  ORDRE.forEach((value) => {
    const libelle = value === 'mercator' ? 'Mercator' : value === 'equirect' ? 'Équirectangulaire' : 'Robinson';
    const lab = E('label', 'geography-v2-e001-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + 'proj';
    radio.id = P + 'proj-' + value;
    radio.value = value;
    radio.checked = S.projection === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(libelle));
    fieldset.appendChild(lab);
  });

  const hObs = E('h3', '', 'Observer la déformation');
  const latRow = E('p', '');
  const latLabel = document.createElement('label');
  latLabel.setAttribute('for', LAT_ID);
  latLabel.appendChild(document.createTextNode('Latitude observée : '));
  const latOut = document.createElement('span');
  latOut.id = LAT_OUT_ID;
  latLabel.appendChild(latOut);
  latRow.appendChild(latLabel);

  const lat = document.createElement('input');
  lat.type = 'range';
  lat.id = LAT_ID;
  lat.min = '0';
  lat.max = '80';
  lat.step = '5';
  lat.value = String(S.lat);
  lat.setAttribute('aria-label', 'Latitude observée, de 0 à 80 degrés');

  const latNum = document.createElement('input');
  latNum.type = 'number';
  latNum.id = LAT_NUM_ID;
  latNum.min = '0';
  latNum.max = '80';
  latNum.step = '5';
  latNum.value = String(S.lat);
  latNum.setAttribute('aria-label', 'Latitude observée en degrés, saisie numérique');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Graticule de la projection choisie. Flèches gauche et droite : changer de projection ; flèches haut et bas : changer la latitude ; Début et Fin : 0 ou 80 degrés.');

  const legendText = E('p', 'geography-v2-e001-legend');
  legendText.id = LEGEND_ID;

  const readout = E('p', 'geography-v2-e001-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = E('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(
    title, lead, staticFacts(), staticGlossary(), staticTable(), fieldset,
    hObs, latRow, lat, latNum, canvas, legendText, readout, play, staticDefi(),
  );

  const host = ctx.layout || ctx.stage;
  const cible = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  cible.insertBefore(panel, cible.firstChild);

  return {
    panel, fresh: true,
    mercator: document.getElementById(P + 'proj-mercator'),
    equirect: document.getElementById(P + 'proj-equirect'),
    robinson: document.getElementById(P + 'proj-robinson'),
    lat, latNum, latOut, canvas, readout, play, legend: legendText,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas, une seule frame) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || !cv.isConnected || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 220;
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 16;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const toPx = (p) => [pad + ((p.u + 1) / 2) * iw, pad + ((1 - (p.v + 1) / 2) * ih)];

  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);

  g.strokeStyle = 'rgba(214,207,193,.55)';
  g.lineWidth = 1;
  if (g.setLineDash) g.setLineDash(DASHES[S.projection] || []);
  for (let lon = -180; lon <= 180; lon += 30) {
    g.beginPath();
    for (let lat = -85; lat <= 85; lat += 5) {
      const [x, y] = toPx(projectFor(S.projection, lon, lat));
      if (lat === -85) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    g.beginPath();
    for (let lon = -180; lon <= 180; lon += 5) {
      const [x, y] = toPx(projectFor(S.projection, lon, lat));
      if (lon === -180) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }

  /* Parallèle observé : trait épais + croix, jamais la couleur seule. */
  if (g.setLineDash) g.setLineDash([]);
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.beginPath();
  for (let lon = -180; lon <= 180; lon += 4) {
    const [x, y] = toPx(projectFor(S.projection, lon, S.lat));
    if (lon === -180) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
  const [mx, my] = toPx(projectFor(S.projection, 0, S.lat));
  g.beginPath();
  g.moveTo(mx - 6, my); g.lineTo(mx + 6, my);
  g.moveTo(mx, my - 6); g.lineTo(mx, my + 6);
  g.stroke();

  /* Cinq points témoins reproductibles (graine fixe) : carrés, forme distincte. */
  g.strokeStyle = 'rgba(244,214,158,.9)';
  g.lineWidth = 1.5;
  pointsTemoins().forEach((pt) => {
    const [x, y] = toPx(projectFor(S.projection, pt.lon, pt.lat));
    g.strokeRect(x - 3, y - 3, 6, 6);
  });

  /* Méridien balayé : seul élément animé, position déterministe = f(S.sweep). */
  const sweepLon = -180 + S.sweep * 360;
  if (g.setLineDash) g.setLineDash([3, 3]);
  g.strokeStyle = 'rgba(255,255,255,.85)';
  g.lineWidth = 1.5;
  g.beginPath();
  for (let lat = -85; lat <= 85; lat += 5) {
    const [x, y] = toPx(projectFor(S.projection, sweepLon, lat));
    if (lat === -85) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(LABELS[S.projection], pad + 2, pad + 13);
  g.fillText(`${S.lat}° de latitude · graine ${GRAINE.toString(16)}`, pad + 2, cssH - pad - 4);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const m = measures(S.lat);
  const ctrl = controleMercator(S.lat);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const verifie = ctrl.ecart < 0.01;
  n.textContent = '';
  n.appendChild(document.createTextNode(`À ${m.lat}° (référence : 1,00 à l’équateur) — Mercator : échelle `));
  n.appendChild(fort(`${fmt(m.mercK)}×`));
  n.appendChild(document.createTextNode(', aires '));
  n.appendChild(fort(`${fmt(m.mercArea)}×`));
  n.appendChild(document.createTextNode(' ; équirectangulaire : échelle méridienne 1,00×, aires '));
  n.appendChild(fort(`${fmt(m.equiArea)}×`));
  n.appendChild(document.createTextNode(' ; Robinson : échelle méridienne '));
  n.appendChild(fort(`${fmt(m.robMerid)}×`));
  n.appendChild(document.createTextNode(', aires '));
  n.appendChild(fort(`${fmt(m.robArea)}×`));
  n.appendChild(document.createTextNode(`. Contrôle croisé : dérivée finie ${fmt(ctrl.derivee)} vs sec ${fmt(ctrl.sec)} — `));
  n.appendChild(fort(verifie ? 'écart < 0,01 (formule vérifiée)' : 'écart ≥ 0,01 (formule à rejeter)'));
  n.appendChild(document.createTextNode(`. Graine ${GRAINE.toString(16)} : cinq points témoins reproductibles.`));
}

function syncControls() {
  const n = S.nodes;
  if (n.mercator) n.mercator.checked = S.projection === 'mercator';
  if (n.equirect) n.equirect.checked = S.projection === 'equirect';
  if (n.robinson) n.robinson.checked = S.projection === 'robinson';
  if (n.lat && document.activeElement !== n.lat) n.lat.value = String(S.lat);
  if (n.latNum && document.activeElement !== n.latNum) n.latNum.value = String(S.lat);
  if (n.latOut) n.latOut.textContent = `${S.lat}°`;
  if (n.legend) {
    n.legend.textContent = LABELS[S.projection]
      + ' · le style de trait (plein, tirets, pointillés), la croix et les carrés distinguent la projection, indépendamment de la couleur.';
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E001Reduced = S.reduced ? '1' : '0';
  updateReadout();
  drawLab();
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
    if (S.playing) S.sweep = (S.sweep + dt * 0.00007) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing) S.rafId = requestAnimationFrame(tick);
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
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source. */ }
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
    if (typeof ResizeObserver === 'function') {
      S.resize = new ResizeObserver(() => drawLab());
    }
  }
  if (S.observedCanvas !== cv) {
    if (S.observedCanvas && S.intersection) S.intersection.unobserve(S.observedCanvas);
    if (S.observedCanvas && S.resize) S.resize.unobserve(S.observedCanvas);
    S.observedCanvas = cv;
    S.intersection.observe(cv);
    if (S.resize) S.resize.observe(cv);
  }
}

/* Badge textuel sur la carte existante, sans toucher au SVG d'origine. */
function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? scope.querySelector('.geo-map') : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = E('div', 'geography-v2-e001-badge', 'Carte locale : projection schématique équirectangulaire (formules linéaires sur lat/lon). Le panneau V2 compare les projections exactes.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E001', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  E = typeof ctx.el === 'function' ? ctx.el : E;
  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);
  installObservers();

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.reduced) { S.playing = false; stopLoop(); }
  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.mercator, n.equirect, n.robinson].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.projection = radio.value;
        syncControls();
      });
    });
    n.lat.addEventListener('input', () => {
      S.lat = clamp(Math.round(Number(n.lat.value) / 5) * 5, 0, 80);
      syncControls();
    });
    n.latNum.addEventListener('change', () => {
      const v = Number(n.latNum.value);
      S.lat = Number.isFinite(v) ? clamp(Math.round(v / 5) * 5, 0, 80) : S.lat;
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
        const pas = event.key === 'ArrowRight' ? 1 : -1;
        const i = ORDRE.indexOf(S.projection);
        S.projection = ORDRE[(i + pas + ORDRE.length) % ORDRE.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        S.lat = clamp(S.lat + (event.key === 'ArrowUp' ? 5 : -5), 0, 80);
      } else if (event.key === 'Home' || event.key === 'End') {
        S.lat = event.key === 'Home' ? 0 : 80;
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
  startLoop();
});
