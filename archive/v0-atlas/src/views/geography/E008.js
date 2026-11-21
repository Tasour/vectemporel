import { register } from './registry.js';

/* Lentille E008 — vue GEOGRAPHIE.
 * Thème : hémisphères nord/sud/est/ouest.
 *
 * Les dix chantiers E008-01 … E008-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E008.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, liste de définitions, tableaux) présent dans le DOM même sans
 * animation ; le canvas n'est qu'un laboratoire qui illustre des formules
 * deterministes (signes de la latitude et de la longitude, trigonométrie).
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e008';
const PANEL_ID = 'geography-e008-panel';
const TITLE_ID = 'geography-e008-title';
const HEMIS_ID = 'geography-e008-hemisphere';
const LAT_ID = 'geography-e008-lat';
const LAT_OUT_ID = 'geography-e008-lat-value';
const LON_ID = 'geography-e008-lon';
const LON_OUT_ID = 'geography-e008-lon-value';
const DECL_ID = 'geography-e008-decl';
const DECL_OUT_ID = 'geography-e008-decl-value';
const CANVAS_ID = 'geography-e008-canvas';
const READOUT_ID = 'geography-e008-readout';
const PLAY_ID = 'geography-e008-play';
const LEGEND_ID = 'geography-e008-legend';
const BADGE_ID = 'geography-e008-badge';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const OBLIQUITY = 23.44;         // inclinaison moyenne de l'axe terrestre
const KM_PER_DEG = 111.32;       // degré de grand cercle (référence équatoriale)
const EARTH_RADIUS = 6371;       // rayon moyen, km (repère, non une donnée de projet)

/* E008-01 : frontières canoniques, aucune coordonnée inventée. */
const HEMISPHERES = [
  { value: 'nord', label: 'Nord', boundary: 'Équateur (0° de latitude)', condition: 'latitude > 0°' },
  { value: 'sud', label: 'Sud', boundary: 'Équateur (0° de latitude)', condition: 'latitude < 0°' },
  { value: 'est', label: 'Est', boundary: 'Méridien de Greenwich (0° de longitude)', condition: 'longitude > 0° et ≤ 180°' },
  { value: 'ouest', label: 'Ouest', boundary: 'Méridien de Greenwich et 180°', condition: 'longitude < 0° et ≥ −180°' },
];
const ORDER = ['nord', 'est', 'sud', 'ouest'];
const LABELS = {
  nord: 'Hémisphère Nord',
  sud: 'Hémisphère Sud',
  est: 'Hémisphère Est',
  ouest: 'Hémisphère Ouest',
};

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  hemisphere: 'nord',
  lat: 48,
  lon: 2,
  declination: 0,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules deterministes (E008-02, E008-03, E008-04) ---------- */

const fmt = (n, digits) => {
  const d = digits === undefined ? 1 : digits;
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};

/* E008-02 : classification par le signe, frontières explicites. */
function hemisphereOf(lat, lon) {
  return {
    ns: lat > 0 ? 'nord' : (lat < 0 ? 'sud' : 'équateur'),
    ew: lon > 0 ? 'est' : (lon < 0 ? 'ouest' : 'méridien'),
  };
}

function classifyPhrase(lat, lon) {
  const { ns, ew } = hemisphereOf(lat, lon);
  if (ns === 'équateur' && ew === 'méridien') return 'au croisement de l’équateur et du méridien de Greenwich';
  if (ns === 'équateur') return `sur l’équateur, ${ew === 'est' ? 'à l’est' : 'à l’ouest'} du méridien de Greenwich`;
  if (ew === 'méridien') return `sur le méridien de Greenwich, dans l’hémisphère ${ns}`;
  return `dans les hémisphères ${ns} et ${ew}`;
}

/* E008-03 : grandeur chiffrée comparée à une référence (l'équateur). */
function longitudeDegreeKm(lat) {
  const c = Math.max(-90, Math.min(90, lat));
  return KM_PER_DEG * Math.cos(c * RAD);
}

/* E008-04 : hauteur du soleil à midi, h = 90° − |φ − δ|. */
function solarNoonHeight(lat, decl) {
  return Math.max(0, 90 - Math.abs(lat - decl));
}

function measures() {
  return {
    lat: S.lat,
    lon: S.lon,
    decl: S.declination,
    ...hemisphereOf(S.lat, S.lon),
    phrase: classifyPhrase(S.lat, S.lon),
    lonKm: longitudeDegreeKm(S.lat),
    solar: solarNoonHeight(S.lat, S.declination),
    solarEquator: solarNoonHeight(0, S.declination),
  };
}

/* ---------- Feuille de style unique, injectée une seule fois (E008-10) ---------- */

const CSS = `
#geography-e008-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e008-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e008-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e008-panel p{margin:5px 0;max-width:68ch}
#geography-e008-panel dl{margin:8px 0}
#geography-e008-panel dt{margin-top:6px;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e008-panel dd{margin:1px 0 0 12px;color:var(--ink-soft,#d7d1c6)}
#geography-e008-panel .geography-e008-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-e008-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
.geography-e008-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
.geography-e008-table th,.geography-e008-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
.geography-e008-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e008-hemisphere{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e008-hemisphere legend{padding:0 4px;color:var(--muted)}
#geography-e008-panel .geography-e008-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e008-panel .geography-e008-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e008-panel input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.geography-e008-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e008-canvas{
  display:block;width:100%;height:260px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e008-legend{font-size:10px;color:var(--muted)}
#geography-e008-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e008-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e008-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e008-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e008-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e008-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e008-panel[data-geography-e008-reduced="1"] button,
#geography-e008-panel[data-geography-e008-reduced="1"] .geography-e008-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e008-panel button,.geography-e008-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e008-panel{font-size:10px;padding:9px}
  #geography-e008-canvas{height:210px}
  #geography-e008-panel .geography-e008-choix{margin-right:4px}
}
`;

/* ---------- Contenu sémantique, lisible sans animation (E008-01) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'L’équateur (0° de latitude) est le grand cercle qui partage la Terre en hémisphère nord et hémisphère sud. Le méridien de Greenwich (0° de longitude), prolongé par son antipode à 180°, partage la Terre en hémisphère est et hémisphère ouest.',
    'Un point appartient à un seul hémisphère nord/sud et à un seul hémisphère est/ouest : le signe de sa latitude donne le premier, le signe de sa longitude donne le second. Sur l’équateur ou sur le méridien de Greenwich, le point est exactement sur la frontière.',
    'Les tropiques (environ 23,44° de latitude) et les cercles polaires (environ 66,56°) découlent de l’inclinaison de l’axe terrestre : ils bornent la zone où le soleil peut passer au zénith et celles où survivent le jour et la nuit polaires.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e008-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticDefinitions() {
  const dl = document.createElement('dl');
  HEMISPHERES.forEach((h) => {
    const dt = document.createElement('dt');
    dt.textContent = `Hémisphère ${h.label.toLowerCase()}`;
    const dd = document.createElement('dd');
    dd.textContent = `${h.boundary} — ${h.condition}.`;
    dl.append(dt, dd);
  });
  return dl;
}

function staticTables() {
  const wrap = document.createElement('div');

  const t1 = document.createElement('table');
  t1.className = 'geography-e008-table';
  const c1 = document.createElement('caption');
  c1.textContent = 'Les quatre hémisphères et leur frontière exacte.';
  t1.appendChild(c1);
  const h1 = document.createElement('tr');
  ['Hémisphère', 'Frontière', 'Condition'].forEach((t) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = t;
    h1.appendChild(th);
  });
  const thead1 = document.createElement('thead');
  thead1.appendChild(h1);
  t1.appendChild(thead1);
  const tbody1 = document.createElement('tbody');
  HEMISPHERES.forEach((h) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = h.label;
    tr.appendChild(th);
    [h.boundary, h.condition].forEach((v) => {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    });
    tbody1.appendChild(tr);
  });
  t1.appendChild(tbody1);

  const t2 = document.createElement('table');
  t2.className = 'geography-e008-table';
  const c2 = document.createElement('caption');
  c2.textContent = 'Grandeurs comparées à leur référence équatoriale.';
  t2.appendChild(c2);
  const h2 = document.createElement('tr');
  ['Grandeur', 'Formule', 'Référence'].forEach((t) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = t;
    h2.appendChild(th);
  });
  const thead2 = document.createElement('thead');
  thead2.appendChild(h2);
  t2.appendChild(thead2);
  const tbody2 = document.createElement('tbody');
  [
    ['Degré de longitude à φ', '111,32 × cos(φ) km', '111,32 km à l’équateur'],
    ['Hauteur du soleil à midi', '90° − |φ − δ|', '90° à l’équateur à l’équinoxe'],
    ['Déclinaison δ du soleil', 'entre −23,44° et +23,44°', '0° aux équinoxes'],
  ].forEach((row, i) => {
    const tr = document.createElement('tr');
    row.forEach((v, j) => {
      const cell = document.createElement(j === 0 ? 'th' : 'td');
      if (j === 0) cell.scope = 'row';
      cell.textContent = v;
      tr.appendChild(cell);
    });
    tbody2.appendChild(tr);
  });
  t2.appendChild(tbody2);

  wrap.append(t1, t2);
  return wrap;
}

function sliderRow(labelText, inputId, outId, min, max, step, value, ariaLabel) {
  const p = document.createElement('p');
  const label = document.createElement('label');
  label.setAttribute('for', inputId);
  label.appendChild(document.createTextNode(labelText + ' : '));
  const out = document.createElement('span');
  out.id = outId;
  out.className = 'geography-e008-value';
  label.appendChild(out);
  p.appendChild(label);

  const input = document.createElement('input');
  input.type = 'range';
  input.id = inputId;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.setAttribute('aria-label', ariaLabel);
  p.appendChild(input);
  return { p, input, out };
}

/* ---------- Construction du panneau (E008-01, E008-06, E008-07) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      hemispheres: HEMISPHERES.map((h) => document.getElementById(`geography-e008-hemi-${h.value}`)),
      lat: document.getElementById(LAT_ID),
      latOut: document.getElementById(LAT_OUT_ID),
      lon: document.getElementById(LON_ID),
      lonOut: document.getElementById(LON_OUT_ID),
      decl: document.getElementById(DECL_ID),
      declOut: document.getElementById(DECL_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e008-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Hémisphères nord, sud, est et ouest');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Deux grands cercles suffisent à découper la Terre en quatre hémisphères : l’équateur pour le nord et le sud, le méridien de Greenwich pour l’est et l’ouest. Le laboratoire ci-dessous ne fait que projeter des signes et des formules.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = HEMIS_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Hémisphère mis en évidence (choix unique)';
  fieldset.appendChild(legend);
  HEMISPHERES.forEach((h) => {
    const lab = ctx.el('label', 'geography-e008-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e008-hemi';
    radio.id = `geography-e008-hemi-${h.value}`;
    radio.value = h.value;
    radio.checked = S.hemisphere === h.value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(h.label));
    fieldset.appendChild(lab);
  });

  const sub = ctx.el('h3', '', 'Placer un point');
  const latRow = sliderRow('Latitude φ', LAT_ID, LAT_OUT_ID, -90, 90, 1, S.lat, 'Latitude du point, de moins 90 à plus 90 degrés');
  const lonRow = sliderRow('Longitude λ', LON_ID, LON_OUT_ID, -180, 180, 1, S.lon, 'Longitude du point, de moins 180 à plus 180 degrés');
  const declRow = sliderRow('Déclinaison δ du soleil', DECL_ID, DECL_OUT_ID, -23.4, 23.4, 0.1, S.declination, 'Déclinaison solaire, de moins 23,4 à plus 23,4 degrés');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Globe schématique : les hachures désignent l’hémisphère choisi, le tiret long l’équateur, le pointillé le méridien de Greenwich. Flèches gauche et droite : changer d’hémisphère ; flèches haut et bas : changer la latitude.');

  const legendText = ctx.el('p', 'geography-e008-legend');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e008-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le méridien');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(
    title, lead, staticFacts(), staticDefinitions(), staticTables(), fieldset, sub,
    latRow.p, latRow.input, lonRow.p, lonRow.input, declRow.p, declRow.input,
    canvas, legendText, readout, play,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    hemispheres: HEMISPHERES.map((h) => document.getElementById(`geography-e008-hemi-${h.value}`)),
    lat: latRow.input, latOut: latRow.out,
    lon: lonRow.input, lonOut: lonRow.out,
    decl: declRow.input, declOut: declRow.out,
    canvas, readout, play, legend: legendText,
  };
}

/* ---------- Laboratoire canvas (E008-05, E008-08) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 260;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const cx = cssW / 2;
  const cy = cssH / 2;
  const R = Math.max(20, Math.min(cssW, cssH) / 2 - 28);
  const px = (lat, lon) => [cx + R * Math.sin(lon * RAD) * Math.cos(lat * RAD), cy - R * Math.sin(lat * RAD)];

  /* Disque du globe. */
  g.beginPath();
  g.arc(cx, cy, R, 0, 2 * Math.PI);
  g.fillStyle = 'rgba(255,255,255,.02)';
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 1;
  g.stroke();

  /* E008-06 : hachures de l'hémisphère choisi — jamais la couleur seule. */
  const h = S.hemisphere;
  const half = h === 'nord' ? [cx - R, cy - R, 2 * R, R]
    : h === 'sud' ? [cx - R, cy, 2 * R, R]
      : h === 'est' ? [cx, cy - R, R, 2 * R]
        : [cx - R, cy - R, R, 2 * R];
  g.save();
  g.beginPath();
  g.arc(cx, cy, R, 0, 2 * Math.PI);
  g.clip();
  g.beginPath();
  g.rect(half[0], half[1], half[2], half[3]);
  g.clip();
  g.strokeStyle = 'rgba(244,214,158,.22)';
  g.lineWidth = 1;
  for (let d = -2 * R; d <= 2 * R; d += 9) {
    g.beginPath();
    g.moveTo(cx + d, cy - R);
    g.lineTo(cx + d - 2 * R, cy + R);
    g.stroke();
  }
  g.restore();

  /* Graticule : parallèles et méridiens en traits fins. */
  g.strokeStyle = 'rgba(214,207,193,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  [-60, -30, 30, 60].forEach((lat) => {
    const y = cy - R * Math.sin(lat * RAD);
    const span = R * Math.cos(lat * RAD);
    g.beginPath();
    g.moveTo(cx - span, y);
    g.lineTo(cx + span, y);
    g.stroke();
  });
  [-120, -60, 60, 120].forEach((lon) => {
    g.beginPath();
    for (let lat = -90; lat <= 90; lat += 5) {
      const [x, y] = px(lat, lon);
      if (lat === -90) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  });

  /* E008-01 : équateur (tiret long) et méridien de Greenwich (pointillé). */
  if (g.setLineDash) g.setLineDash([8, 4]);
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(cx - R, cy);
  g.lineTo(cx + R, cy);
  g.stroke();
  if (g.setLineDash) g.setLineDash([2, 4]);
  g.strokeStyle = 'rgba(255,255,255,.9)';
  g.beginPath();
  g.moveTo(cx, cy - R);
  g.lineTo(cx, cy + R);
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);

  /* E008-08 : méridien balayé, position deterministe = f(S.sweep). */
  const sweepLon = -180 + S.sweep * 360;
  if (g.setLineDash) g.setLineDash([3, 5]);
  g.strokeStyle = 'rgba(255,255,255,.55)';
  g.lineWidth = 1.2;
  g.beginPath();
  for (let lat = -90; lat <= 90; lat += 5) {
    const [x, y] = px(lat, sweepLon);
    if (lat === -90) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);

  /* E008-02 : marqueur du point, en forme de croix + cercle. */
  const [mx, my] = px(S.lat, S.lon);
  const faceCachee = Math.cos(S.lat * RAD) * Math.cos(S.lon * RAD) < 0;
  g.strokeStyle = 'rgba(244,214,158,.98)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(mx - 6, my); g.lineTo(mx + 6, my);
  g.moveTo(mx, my - 6); g.lineTo(mx, my + 6);
  g.stroke();
  g.beginPath();
  g.arc(mx, my, 9, 0, 2 * Math.PI);
  if (faceCachee && g.setLineDash) g.setLineDash([3, 3]);
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);

  /* Étiquettes : Nord / Sud / Est / Ouest, puis nom de l'hémisphère choisi. */
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '11px sans-serif';
  g.fillText('N', cx - 4, cy - R - 6);
  g.fillText('S', cx - 4, cy + R + 14);
  g.fillText('E', cx + R + 6, cy + 4);
  g.fillText('O', cx - R - 16, cy + 4);
  g.fillStyle = 'rgba(244,214,158,.98)';
  g.fillText(LABELS[h], 8, cssH - 8);
  if (faceCachee) g.fillText('point sur la face cachée', 8, 16);
}

/* E008-03 / E008-04 : lecture chiffrée dans une région live. */
function updateReadout() {
  const m = measures();
  const n = S.nodes.readout;
  if (!n) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`Point à ${Math.abs(m.lat)}° ${m.lat < 0 ? 'S' : 'N'}, ${Math.abs(m.lon)}° ${m.lon < 0 ? 'O' : 'E'} — `));
  n.appendChild(fort(`${m.phrase}`));
  n.appendChild(document.createTextNode('. Degré de longitude : '));
  n.appendChild(fort(`${fmt(m.lonKm)} km`));
  n.appendChild(document.createTextNode(` (référence ${fmt(KM_PER_DEG)} km à l’équateur). Soleil à midi, δ = ${fmt(m.decl)}° : hauteur `));
  n.appendChild(fort(`${fmt(m.solar)}°`));
  n.appendChild(document.createTextNode(`, contre ${fmt(m.solarEquator)}° à l’équateur pour la même déclinaison.`));
}

function syncControls() {
  const n = S.nodes;
  n.hemispheres.forEach((radio, i) => {
    if (radio) radio.checked = S.hemisphere === HEMISPHERES[i].value;
  });
  if (n.lat) n.lat.value = String(S.lat);
  if (n.latOut) n.latOut.textContent = `${S.lat > 0 ? '+' : ''}${S.lat}°`;
  if (n.lon) n.lon.value = String(S.lon);
  if (n.lonOut) n.lonOut.textContent = `${S.lon > 0 ? '+' : ''}${S.lon}°`;
  if (n.decl) n.decl.value = String(S.declination);
  if (n.declOut) n.declOut.textContent = `${S.declination > 0 ? '+' : ''}${fmt(S.declination)}°`;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le méridien';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.legend) {
    n.legend.textContent = `${LABELS[S.hemisphere]} en hachures · tiret long = équateur, pointillé = méridien de Greenwich. La forme du trait et le texte distinguent les repères, indépendamment de la couleur.`;
  }
  /* E008-10 : miroir d'état idempotent, observable sans journalisation. */
  if (n.panel) {
    const d = n.panel.dataset;
    d.geographyE008Hemisphere = S.hemisphere;
    d.geographyE008Lat = String(S.lat);
    d.geographyE008Lon = String(S.lon);
    d.geographyE008Playing = S.playing ? '1' : '0';
    d.geographyE008Sweep = fmt(S.sweep, 2);
  }
  updateReadout();
  drawLab();
}

/* ---------- Boucle rAF unique, pause sur document.hidden (E008-08) ---------- */

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
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00006) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.nodes.panel) S.nodes.panel.dataset.geographyE008Sweep = fmt(S.sweep, 2);
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
        if (panel) panel.dataset.geographyE008Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* E008-09 : badge de la carte existante, sans toucher à son rendu. */
function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e008-badge', 'Repères : équateur 0° de latitude, méridien de Greenwich 0° de longitude. Nord/Sud par le signe de la latitude, Est/Ouest par le signe de la longitude.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E008', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE008Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.hemispheres.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.hemisphere = radio.value;
        syncControls();
      });
    });
    n.lat.addEventListener('input', () => {
      S.lat = Math.max(-90, Math.min(90, Math.round(Number(n.lat.value))));
      syncControls();
    });
    n.lon.addEventListener('input', () => {
      S.lon = Math.max(-180, Math.min(180, Math.round(Number(n.lon.value))));
      syncControls();
    });
    n.decl.addEventListener('input', () => {
      S.declination = Math.max(-23.4, Math.min(23.4, Math.round(Number(n.decl.value) * 10) / 10));
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
        const i = ORDER.indexOf(S.hemisphere);
        S.hemisphere = ORDER[(i + step + ORDER.length) % ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 5 : -5;
        S.lat = Math.max(-90, Math.min(90, S.lat + step));
      } else if (event.key === 'Home') {
        S.lat = 0;
        S.lon = 0;
        S.hemisphere = 'nord';
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
  if (S.playing) startLoop();
});
