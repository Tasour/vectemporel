import { register } from './registry.js';

/* Lentille E007 — seconde passe (V2), vue GEOGRAPHIE.
 * Thème : latitude et longitude, lecture des coordonnées.
 *
 * Les dix chantiers E007-01 … E007-10 sont réellement implémentés ci-dessous
 * et documentés dans UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E007.md. V2 ajoute à la
 * passe 1 une distance de grand cercle (haversine) comparée à un point de
 * référence, des repères déterministes issus d'une graine affichée, et un
 * équivalent clavier étoffé. Tout est local : aucune requête réseau, aucune
 * valeur aléatoire, aucune sortie console, aucun fichier partagé modifié.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e007';
const PANEL_ID = 'geography-v2-e007-panel';
const TITLE_ID = 'geography-v2-e007-title';
const FMT_DEC_ID = 'geography-v2-e007-format-decimal';
const FMT_DMS_ID = 'geography-v2-e007-format-dms';
const LAT_ID = 'geography-v2-e007-lat';
const LON_ID = 'geography-v2-e007-lon';
const LAT_OUT_ID = 'geography-v2-e007-lat-value';
const LON_OUT_ID = 'geography-v2-e007-lon-value';
const CANVAS_ID = 'geography-v2-e007-canvas';
const READOUT_ID = 'geography-v2-e007-readout';
const DIST_ID = 'geography-v2-e007-distance';
const PLAY_ID = 'geography-v2-e007-play';
const HEMI_ID = 'geography-v2-e007-hemisphere';
const CROSS_ID = 'geography-v2-e007-crossref';
const LEGEND_ID = 'geography-v2-e007-legend';
const FACTS_ID = 'geography-v2-e007-facts';

const RAD = Math.PI / 180;
/* Constantes de référence classiques, jamais inventées. */
const EQUATOR_LON_KM = 111.32; /* 1° de longitude à l'équateur. */
const LAT_DEG_KM = 111.19;     /* 40 030 km / 360. */
const EARTH_R_KM = 6371;       /* Rayon moyen utilisé par l'haversine. */
const REF = { lat: 48.8566, lon: 2.3522, nom: 'Paris (référence)' };
const SEED = 20261118;         /* Graine affichée : aucune valeur aléatoire. */

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  lat: REF.lat,
  lon: REF.lon,
  format: 'decimal',
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  onScreen: true,
  io: null,
  ioCanvas: null,
  visibilityBound: false,
  motionBound: false,
  scope: null,
  nodes: {},
  fresh: false,
};

/* ---------- Formules déterministes (E007-02, -05, -06, -10) ---------- */

const fmt = (n, d = 2) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* Générateur déterministe (mulberry32) — aucune source aléatoire native. */
function mulberry32(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Repères fixes calculés une fois depuis la graine : reproductibles à l'identique. */
const REPERES = (() => {
  const rnd = mulberry32(SEED);
  const points = [];
  for (let i = 0; i < 12; i += 1) {
    points.push([-180 + rnd() * 360, -90 + rnd() * 180]);
  }
  return points;
})();

/* Décimal ↔ degrés-minutes-secondes, hémisphère déduit du signe. */
function toDMS(value, isLat) {
  const hemi = isLat ? (value < 0 ? 'S' : 'N') : (value < 0 ? 'O' : 'E');
  const abs = Math.abs(value);
  let deg = Math.floor(abs);
  let min = Math.floor((abs - deg) * 60);
  let sec = Math.round(((abs - deg) * 60 - min) * 60 * 100) / 100;
  if (sec >= 60) { sec = 0; min += 1; }
  if (min >= 60) { min = 0; deg += 1; }
  return { deg, min, sec, hemi };
}

function dmsText(value, isLat) {
  const t = toDMS(value, isLat);
  return `${t.deg}° ${String(t.min).padStart(2, '0')}′ ${fmt(t.sec, 2).padStart(5, '0')}″ ${t.hemi}`;
}

function coordText(value, isLat, format) {
  const hemi = isLat ? (value < 0 ? 'S' : 'N') : (value < 0 ? 'O' : 'E');
  return format === 'dms' ? dmsText(value, isLat) : `${fmt(Math.abs(value), 4)}° ${hemi}`;
}

/* Hémisphères et quadrant, énoncés en toutes lettres. */
function hemisphereInfo(lat, lon) {
  const ns = lat < 0 ? 'Sud' : 'Nord';
  const ew = lon < 0 ? 'Ouest' : 'Est';
  return { ns, ew, quadrant: `${ns}-${ew}` };
}

/* Longueur d'un degré de longitude à une latitude donnée. */
function lonKmAtLat(lat) {
  return EQUATOR_LON_KM * Math.cos(clamp(lat, -90, 90) * RAD);
}

/* Distance de grand cercle (haversine) au point de référence. */
function haversine(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/* Relevé en lecture seule de la coordonnée affichée par la vue de base. */
function parseCoords(text) {
  if (!text) return null;
  const parts = String(text).split(',');
  if (parts.length < 2) return null;
  const lat = parseFloat(parts[0].replace(',', '.'));
  const lon = parseFloat(parts[1].replace(',', '.'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

/* ---------- Feuille de style unique, injectée une seule fois (E007-01) ---------- */

const CSS = `
#geography-v2-e007-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-v2-e007-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-v2-e007-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-v2-e007-panel p{margin:5px 0;max-width:68ch}
#geography-v2-e007-facts p{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-v2-e007-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-v2-e007-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-v2-e007-table th,#geography-v2-e007-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-v2-e007-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e007-format{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-v2-e007-format legend{padding:0 4px;color:var(--muted)}
#geography-v2-e007-panel .geography-v2-e007-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-v2-e007-panel .geography-v2-e007-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#geography-v2-e007-panel input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.geography-v2-e007-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e007-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-v2-e007-legend{font-size:10px;color:var(--muted)}
#geography-v2-e007-hemisphere,#geography-v2-e007-crossref,#geography-v2-e007-distance,#geography-v2-e007-readout{
  min-height:30px;padding:7px 8px;margin:6px 0;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e007-readout strong,.geography-v2-e007-value strong{color:var(--gold-bright,#f4d69e)}
#geography-v2-e007-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-v2-e007-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-v2-e007-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-v2-e007-panel[data-geography-v2-e007-reduced="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-v2-e007-panel button{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-v2-e007-panel{font-size:10px;padding:9px}
  #geography-v2-e007-canvas{height:190px}
  #geography-v2-e007-panel .geography-v2-e007-choix{margin-right:4px}
}
`;

/* ---------- Contenu sémantique, lisible sans animation (E007-01) ---------- */

function staticFacts() {
  const wrap = document.getElementById(FACTS_ID);
  if (wrap && wrap.isConnected) return wrap;
  const div = document.createElement('div');
  div.id = FACTS_ID;
  const faits = [
    'La latitude mesure l’angle entre l’équateur et le point, de 0° à l’équateur jusqu’à 90° aux pôles : elle indique le Nord ou le Sud.',
    'La longitude mesure l’angle entre le méridien de Greenwich et celui du point, de 0° à 180° vers l’Est ou vers l’Ouest.',
    'Une même grandeur s’écrit en degrés décimaux (48,8566°) ou en degrés-minutes-secondes (48° 51′ 24″ N) : ce sont deux écritures équivalentes.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.textContent = texte;
    div.appendChild(p);
  });
  return div;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = 'geography-v2-e007-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Grandeurs chiffrées — référence : 1° de longitude = 111,32 km à l’équateur.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Formule', 'Valeur'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['1° de latitude', '40 030 km / 360', '≈ 111,19 km'],
    ['1° de longitude à l’équateur', '111,32 km × cos(0°)', '111,32 km (référence)'],
    ['1° de longitude à 48,86° (Paris)', '111,32 km × cos(48,86°)', '≈ 73,3 km'],
    ['Distance Paris → point choisi', 'haversine(rayon 6 371 km)', 'voir mesure ci-dessous'],
  ];
  lignes.forEach((cells) => {
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

/* ---------- E007-01 / E007-08 : panneau et contrôles accessibles ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      dec: document.getElementById(FMT_DEC_ID),
      dms: document.getElementById(FMT_DMS_ID),
      lat: document.getElementById(LAT_ID),
      lon: document.getElementById(LON_ID),
      latOut: document.getElementById(LAT_OUT_ID),
      lonOut: document.getElementById(LON_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      distance: document.getElementById(DIST_ID),
      hemi: document.getElementById(HEMI_ID),
      cross: document.getElementById(CROSS_ID),
      play: document.getElementById(PLAY_ID),
    };
  }

  const panel = ctx.el('section', 'geography-v2-e007-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Lire une coordonnée géographique (V2)');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Latitude et longitude forment une paire d’angles qui repère un point sur le globe. Ce laboratoire V2 montre comment les lire, les écrire, estimer la distance que recouvre un degré et mesurer l’écart à un point de référence par la formule de l’haversine.');

  /* E007-08 : choix unique -> fieldset/legend + radiogroup explicite. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = 'geography-v2-e007-format';
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-labelledby', 'geography-v2-e007-format-legend');
  const legend = document.createElement('legend');
  legend.id = 'geography-v2-e007-format-legend';
  legend.textContent = 'Écriture des coordonnées (choix unique)';
  fieldset.appendChild(legend);
  [['decimal', 'Degrés décimaux', FMT_DEC_ID], ['dms', 'Degrés-minutes-secondes', FMT_DMS_ID]].forEach(([value, label, id]) => {
    const lab = ctx.el('label', 'geography-v2-e007-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e007-format';
    radio.id = id;
    radio.value = value;
    radio.checked = S.format === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });

  const sub = ctx.el('h3', '', 'Choisir un point');

  const latRow = ctx.el('p', '');
  const latLabel = document.createElement('label');
  latLabel.setAttribute('for', LAT_ID);
  latLabel.appendChild(document.createTextNode('Latitude : '));
  const latOut = ctx.el('span', 'geography-v2-e007-value');
  latOut.id = LAT_OUT_ID;
  latLabel.appendChild(latOut);
  latRow.appendChild(latLabel);
  const lat = document.createElement('input');
  lat.type = 'range';
  lat.id = LAT_ID;
  lat.min = '-90';
  lat.max = '90';
  lat.step = 'any';
  lat.value = String(S.lat);
  lat.setAttribute('aria-label', 'Latitude, de moins 90 à 90 degrés');

  const lonRow = ctx.el('p', '');
  const lonLabel = document.createElement('label');
  lonLabel.setAttribute('for', LON_ID);
  lonLabel.appendChild(document.createTextNode('Longitude : '));
  const lonOut = ctx.el('span', 'geography-v2-e007-value');
  lonOut.id = LON_OUT_ID;
  lonLabel.appendChild(lonOut);
  lonRow.appendChild(lonLabel);
  const lon = document.createElement('input');
  lon.type = 'range';
  lon.id = LON_ID;
  lon.min = '-180';
  lon.max = '180';
  lon.step = 'any';
  lon.value = String(S.lon);
  lon.setAttribute('aria-label', 'Longitude, de moins 180 à 180 degrés');

  /* E007-04 : canvas focalisable, étiqueté, avec équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Graticule latitude-longitude. Flèches gauche et droite : changer la longitude de 5 degrés ; flèches haut et bas : changer la latitude de 5 degrés ; Page précédente et Page suivante : 10 degrés ; Origine : revenir à Paris.');

  const legendText = ctx.el('p', 'geography-v2-e007-legend', `Repères : traits pleins = équateur et méridien de Greenwich ; tirets = parallèles et méridiens tous les 30° ; croix = point choisi ; pointillés = méridien balayé ; petits cercles = repères fixes issus de la graine ${SEED}. Le style de trait distingue les repères, indépendamment de la couleur.`);
  legendText.id = LEGEND_ID;

  const hemi = ctx.el('p', '', '');
  hemi.id = HEMI_ID;
  const cross = ctx.el('p', '', '');
  cross.id = CROSS_ID;
  const distance = ctx.el('p', '', '');
  distance.id = DIST_ID;
  const readout = ctx.el('p', 'geography-v2-e007-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* E007-08 : bascule indépendante -> aria-pressed autorisé. */
  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sub, latRow, lat, lonRow, lon, canvas, legendText, hemi, cross, distance, readout, play);

  const host = ctx.layout || ctx.stage;
  S.scope = host;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    dec: document.getElementById(FMT_DEC_ID),
    dms: document.getElementById(FMT_DMS_ID),
    lat, lon, latOut, lonOut, canvas,
    readout, distance, hemi, cross, play,
  };
}

/* ---------- E007-04 / E007-10 : graticule déterministe (un seul canvas) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 230;
  /* E007-10 : DPR plafonné à 2. */
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 18;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const toPx = (lon, lat) => [
    pad + ((clamp(lon, -180, 180) + 180) / 360) * iw,
    pad + ((90 - clamp(lat, -90, 90)) / 180) * ih,
  ];

  g.strokeStyle = 'rgba(255,255,255,.14)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);

  /* Méridiens et parallèles tous les 30° : tirets. */
  g.strokeStyle = 'rgba(214,207,193,.45)';
  if (g.setLineDash) g.setLineDash([6, 5]);
  for (let lon = -150; lon <= 150; lon += 30) {
    const [x] = toPx(lon, 0);
    g.beginPath(); g.moveTo(x, pad); g.lineTo(x, pad + ih); g.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = toPx(0, lat);
    g.beginPath(); g.moveTo(pad, y); g.lineTo(pad + iw, y); g.stroke();
  }
  if (g.setLineDash) g.setLineDash([]);

  /* Équateur et méridien de Greenwich : traits pleins plus épais. */
  g.strokeStyle = 'rgba(244,214,158,.85)';
  g.lineWidth = 1.6;
  const [, yEq] = toPx(0, 0);
  g.beginPath(); g.moveTo(pad, yEq); g.lineTo(pad + iw, yEq); g.stroke();
  const [xGr] = toPx(0, 0);
  g.beginPath(); g.moveTo(xGr, pad); g.lineTo(xGr, pad + ih); g.stroke();

  /* Repères fixes déterministes : cercles avec contour, jamais la couleur seule. */
  g.strokeStyle = 'rgba(214,207,193,.55)';
  g.lineWidth = 1;
  REPERES.forEach(([lon, lat]) => {
    const [x, y] = toPx(lon, lat);
    g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.stroke();
  });

  /* Méridien balayé : seul élément animé, position déterministe = f(S.sweep). */
  const sweepLon = -180 + S.sweep * 360;
  const [xSw] = toPx(sweepLon, 0);
  if (g.setLineDash) g.setLineDash([2, 4]);
  g.strokeStyle = 'rgba(255,255,255,.75)';
  g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(xSw, pad); g.lineTo(xSw, pad + ih); g.stroke();
  if (g.setLineDash) g.setLineDash([]);

  /* Point choisi : croix cerclée, jamais la couleur seule. */
  const [mx, my] = toPx(S.lon, S.lat);
  g.strokeStyle = 'rgba(244,214,158,1)';
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(mx - 7, my); g.lineTo(mx + 7, my);
  g.moveTo(mx, my - 7); g.lineTo(mx, my + 7);
  g.stroke();
  g.beginPath(); g.arc(mx, my, 3, 0, Math.PI * 2); g.stroke();

  /* Étiquettes d'orientation et valeurs. */
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText('N', pad + iw / 2 - 3, pad + 11);
  g.fillText('S', pad + iw / 2 - 3, pad + ih - 4);
  g.fillText('O', pad + 3, pad + ih / 2 + 4);
  g.fillText('E', pad + iw - 11, pad + ih / 2 + 4);
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.fillText(`${coordText(S.lat, true, S.format)} · ${coordText(S.lon, false, S.format)}`, pad + 3, pad + 13);
}

/* ---------- E007-03 / -05 / -06 / -09 : lectures et readout ---------- */

function updateHemisphere() {
  const n = S.nodes.hemi;
  if (!n) return;
  const h = hemisphereInfo(S.lat, S.lon);
  n.textContent = `Hémisphère ${h.ns} et hémisphère ${h.ew} : quadrant ${h.quadrant}. Un signe négatif indique le Sud pour la latitude et l’Ouest pour la longitude ; zéro est sur l’équateur ou le méridien de Greenwich.`;
}

function updateCrossref() {
  const n = S.nodes.cross;
  if (!n) return;
  const scope = S.scope || (typeof document !== 'undefined' ? document : null);
  const source = scope && typeof scope.querySelector === 'function'
    ? scope.querySelector('.geo-coords') : null;
  const coords = source ? parseCoords(source.textContent) : null;
  if (!coords) {
    n.textContent = 'Aucun lieu actif pourvu de coordonnées dans le panneau de la vue de base.';
    return;
  }
  const h = hemisphereInfo(coords.lat, coords.lon);
  n.textContent = `Lieu actif relevé dans la vue : latitude ${fmt(coords.lat, 3)}°, longitude ${fmt(coords.lon, 3)}° — hémisphères ${h.ns} et ${h.ew}. Relevé en lecture seule : l’état de l’atlas n’est pas modifié.`;
}

function updateDistance() {
  const n = S.nodes.distance;
  if (!n) return;
  const km = haversine(REF.lat, REF.lon, S.lat, S.lon);
  n.textContent = `Distance de grand cercle entre le point choisi et ${REF.nom} (${fmt(REF.lat, 4)}°, ${fmt(REF.lon, 4)}°) : ${fmt(km, 0)} km, calculée par l’haversine avec un rayon de ${fmt(EARTH_R_KM, 0)} km. À titre de comparaison, 1° de latitude vaut environ ${fmt(LAT_DEG_KM, 2)} km : l’écart représente donc ${fmt(km / LAT_DEG_KM, 0)} degrés de latitude environ.`;
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const h = hemisphereInfo(S.lat, S.lon);
  const km = lonKmAtLat(S.lat);
  const pct = (km / EQUATOR_LON_KM) * 100;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Point : latitude '));
  n.appendChild(fort(coordText(S.lat, true, S.format)));
  n.appendChild(document.createTextNode(', longitude '));
  n.appendChild(fort(coordText(S.lon, false, S.format)));
  n.appendChild(document.createTextNode(`. Quadrant ${h.quadrant}. À cette latitude, 1° de longitude vaut `));
  n.appendChild(fort(`${fmt(km, 1)} km`));
  n.appendChild(document.createTextNode(', soit '));
  n.appendChild(fort(`${fmt(pct, 0)} %`));
  n.appendChild(document.createTextNode(` des ${fmt(EQUATOR_LON_KM, 2)} km de référence à l’équateur ; 1° de latitude ≈ ${fmt(LAT_DEG_KM, 2)} km. Le méridien balayé illustre la convergence des méridiens vers les pôles. Graine de reproduction : ${SEED}.`));
}

function syncControls() {
  const n = S.nodes;
  if (n.dec) n.dec.checked = S.format === 'decimal';
  if (n.dms) n.dms.checked = S.format === 'dms';
  if (n.lat) n.lat.value = String(S.lat);
  if (n.lon) n.lon.value = String(S.lon);
  if (n.latOut) n.latOut.textContent = coordText(S.lat, true, S.format);
  if (n.lonOut) n.lonOut.textContent = coordText(S.lon, false, S.format);
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateHemisphere();
  updateCrossref();
  updateDistance();
  updateReadout();
  drawLab();
}

/* ---------- E007-07 : boucle rAF unique, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function reduced() { return !!S.reduced; }

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen || reduced()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen || reduced()) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing) S.sweep = (S.sweep + dt * 0.00008) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
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
        S.reduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyV2E007Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- E007-10 : IntersectionObserver, sobriété, reproductibilité ---------- */

function ensureObserver(canvas) {
  if (typeof IntersectionObserver !== 'function') { S.onScreen = true; return; }
  if (S.io && S.ioCanvas === canvas) return;
  if (S.io) S.io.disconnect();
  S.io = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    S.onScreen = entry ? entry.isIntersecting : true;
    if (!S.onScreen) stopLoop();
    else if (S.playing) startLoop();
  }, { threshold: 0.01 });
  S.io.observe(canvas);
  S.ioCanvas = canvas;
}

/* ---------- Point d'entrée ---------- */

register('E007', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.reduced = typeof ctx.reducedMotion === 'function'
    ? !!ctx.reducedMotion()
    : (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false);

  S.nodes = ensurePanel(ctx);
  S.nodes.panel.dataset.geographyV2E007Reduced = S.reduced ? '1' : '0';
  if (S.reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.dec, n.dms].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.format = radio.value;
        syncControls();
      });
    });
    n.lat.addEventListener('input', () => {
      S.lat = clamp(Number(n.lat.value), -90, 90);
      syncControls();
    });
    n.lon.addEventListener('input', () => {
      S.lon = clamp(Number(n.lon.value), -180, 180);
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft') S.lon = clamp(S.lon - 5, -180, 180);
      else if (event.key === 'ArrowRight') S.lon = clamp(S.lon + 5, -180, 180);
      else if (event.key === 'ArrowUp') S.lat = clamp(S.lat + 5, -90, 90);
      else if (event.key === 'ArrowDown') S.lat = clamp(S.lat - 5, -90, 90);
      else if (event.key === 'PageUp') S.lon = clamp(S.lon + 10, -180, 180);
      else if (event.key === 'PageDown') S.lon = clamp(S.lon - 10, -180, 180);
      else if (event.key === 'Home') { S.lat = REF.lat; S.lon = REF.lon; }
      else used = false;
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
    ensureObserver(n.canvas);
  }

  installGlobalListeners();
  if (S.playing) startLoop();
});
