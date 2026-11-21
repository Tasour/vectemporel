import { register } from './registry.js';

/* V2 — lentille E008 (vue GEOGRAPHIE).
 * Thème : les quatre hémisphères définis par deux grands cercles (équateur,
 * méridien de Greenwich et son antipode). Dix chantiers E008-01 … E008-10,
 * tous implémentés et décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E008.md.
 *
 * Contract : register('E008', (ctx) => {…}) avec
 *   ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 *   css('geography-v2-e008', …) — une seule feuille, un seul identifiant.
 *   Tous les id DOM sont préfixés geography-v2-e008-.
 *
 * Règles absolues : texte sémantique indexable présent sans animation ;
 * canvas purement déterministe (aucune graine aléatoire) ; une seule boucle
 * requestAnimationFrame avec pause sur document.hidden ; respect de
 * reducedMotion() ; aucune journalisation, aucun appel réseau, aucune graine
 * aléatoire ; français.
 */

/* ---------- Identifiants (préfixe V2) ---------- */
const CSS_ID = 'geography-v2-e008';
const PANEL_ID = 'geography-v2-e008-panel';
const TITLE_ID = 'geography-v2-e008-title';
const RADIO_GROUP_ID = 'geography-v2-e008-hemisphere';
const RADIO_NAME = 'geography-v2-e008-hemi';
const LAT_ID = 'geography-v2-e008-lat';
const LAT_OUT_ID = 'geography-v2-e008-lat-value';
const LON_ID = 'geography-v2-e008-lon';
const LON_OUT_ID = 'geography-v2-e008-lon-value';
const DECL_ID = 'geography-v2-e008-decl';
const DECL_OUT_ID = 'geography-v2-e008-decl-value';
const CANVAS_ID = 'geography-v2-e008-canvas';
const LEGEND_ID = 'geography-v2-e008-legend';
const READOUT_ID = 'geography-v2-e008-readout';
const PLAY_ID = 'geography-v2-e008-play';
const RESET_ID = 'geography-v2-e008-reset';
const BADGE_ID = 'geography-v2-e008-badge';

/* ---------- Constantes de repère (génériques, pas des données de projet) ---------- */
const RAD = Math.PI / 180;
const KM_PER_DEG = 111.32;       // degré de grand cercle à l'équateur
const OBLIQUITY = 23.44;         // inclinaison moyenne de l'axe terrestre
const POLAR_CIRCLE = 90 - OBLIQUITY; // ≈ 66,56° : cercle polaire

/* E008-01 : frontières canoniques, aucune coordonnée inventée. */
const HEMISPHERES = [
  { value: 'nord', label: 'Nord', boundary: 'Équateur (0° de latitude)', condition: 'latitude > 0°' },
  { value: 'sud', label: 'Sud', boundary: 'Équateur (0° de latitude)', condition: 'latitude < 0°' },
  { value: 'est', label: 'Est', boundary: 'Méridien de Greenwich (0°) et son antipode (180°)', condition: '0° < longitude ≤ 180°' },
  { value: 'ouest', label: 'Ouest', boundary: 'Méridien de Greenwich (0°) et son antipode (180°)', condition: '−180° ≤ longitude < 0°' },
];
const ORDER = ['nord', 'est', 'sud', 'ouest'];
const LABELS = {
  nord: 'Hémisphère Nord',
  sud: 'Hémisphère Sud',
  est: 'Hémisphère Est',
  ouest: 'Hémisphère Ouest',
};

/* État de module : survit au `stage.innerHTML = ''` de la coque (E008-10). */
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

/* ---------- Formules déterministes (E008-02, E008-03, E008-04) ---------- */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const fmt = (n, digits) => {
  const d = digits === undefined ? 1 : digits;
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};

/* E008-02 : classification par le seul signe, frontières explicites. */
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
  return KM_PER_DEG * Math.cos(clamp(lat, -90, 90) * RAD);
}

/* E008-04 : hauteur du soleil à midi, h = max(0, 90 − |φ − δ|). */
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
#geography-v2-e008-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-v2-e008-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-v2-e008-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-v2-e008-panel p{margin:5px 0;max-width:68ch}
#geography-v2-e008-panel dl{margin:8px 0}
#geography-v2-e008-panel dt{margin-top:6px;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e008-panel dd{margin:1px 0 0 12px;color:var(--ink-soft,#d7d1c6)}
.geography-v2-e008-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
.geography-v2-e008-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
.geography-v2-e008-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
.geography-v2-e008-table th,.geography-v2-e008-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
.geography-v2-e008-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e008-hemisphere{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-v2-e008-hemisphere legend{padding:0 4px;color:var(--muted)}
#geography-v2-e008-panel .geography-v2-e008-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-v2-e008-panel .geography-v2-e008-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-v2-e008-panel input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.geography-v2-e008-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e008-canvas{
  display:block;width:100%;height:264px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-v2-e008-legend{font-size:10px;color:var(--muted)}
#geography-v2-e008-readout{
  min-height:36px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e008-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-v2-e008-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-v2-e008-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-v2-e008-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-v2-e008-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-v2-e008-panel[data-geography-v2-e008-reduced="1"] button,
#geography-v2-e008-panel[data-geography-v2-e008-reduced="1"] .geography-v2-e008-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-v2-e008-panel button,.geography-v2-e008-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-v2-e008-panel{font-size:10px;padding:9px}
  #geography-v2-e008-canvas{height:214px}
  #geography-v2-e008-panel .geography-v2-e008-choix{margin-right:4px}
}
`;

/* ---------- Contenu sémantique, lisible sans animation (E008-01) ---------- */

function buildFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'L’équateur (0° de latitude) est le grand cercle qui partage la Terre en hémisphère nord et hémisphère sud. Le méridien de Greenwich (0° de longitude), prolongé par son antipode à 180°, partage la Terre en hémisphère est et hémisphère ouest.',
    'Un point appartient à un seul hémisphère nord/sud et à un seul hémisphère est/ouest : le signe de sa latitude donne le premier, le signe de sa longitude donne le second. Sur l’équateur ou sur le méridien de Greenwich, le point est exactement sur la frontière et n’est classé dans aucun camp.',
    `L’inclinaison de l’axe terrestre (≈ ${fmt(OBLIQUITY)}°) fixe les tropiques (≈ ${fmt(OBLIQUITY)}° de latitude), limite nord/sud du zénith solaire, et les cercles polaires (≈ ${fmt(POLAR_CIRCLE)}°), au-delà desquels apparaissent le jour et la nuit polaires.`,
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-v2-e008-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function buildDefinitions() {
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

function makeTable(captionText, headers, rows) {
  const table = document.createElement('table');
  table.className = 'geography-v2-e008-table';
  const caption = document.createElement('caption');
  caption.textContent = captionText;
  table.appendChild(caption);
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headers.forEach((t) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = t;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    row.forEach((v, j) => {
      const cell = document.createElement(j === 0 ? 'th' : 'td');
      if (j === 0) cell.scope = 'row';
      cell.textContent = v;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function buildTables() {
  const wrap = document.createElement('div');
  wrap.appendChild(makeTable(
    'Les quatre hémisphères et leur frontière exacte.',
    ['Hémisphère', 'Frontière', 'Condition'],
    HEMISPHERES.map((h) => [h.label, h.boundary, h.condition]),
  ));
  wrap.appendChild(makeTable(
    'Grandeurs comparées à leur référence équatoriale.',
    ['Grandeur', 'Formule', 'Référence'],
    [
      ['Degré de longitude à φ', `${fmt(KM_PER_DEG)} × cos(φ) km`, `${fmt(KM_PER_DEG)} km à l’équateur`],
      ['Hauteur du soleil à midi', '90° − |φ − δ|', '90° à l’équateur à l’équinoxe'],
      ['Déclinaison δ du soleil', `entre −${fmt(OBLIQUITY)}° et +${fmt(OBLIQUITY)}°`, '0° aux équinoxes'],
    ],
  ));
  return wrap;
}

function sliderRow(labelText, inputId, outId, min, max, step, value, ariaLabel) {
  const p = document.createElement('p');
  const label = document.createElement('label');
  label.setAttribute('for', inputId);
  label.appendChild(document.createTextNode(labelText + ' : '));
  const out = document.createElement('span');
  out.id = outId;
  out.className = 'geography-v2-e008-value';
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
      hemispheres: HEMISPHERES.map((h) => document.getElementById(`${RADIO_NAME}-${h.value}`)),
      lat: document.getElementById(LAT_ID),
      latOut: document.getElementById(LAT_OUT_ID),
      lon: document.getElementById(LON_ID),
      lonOut: document.getElementById(LON_OUT_ID),
      decl: document.getElementById(DECL_ID),
      declOut: document.getElementById(DECL_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      reset: document.getElementById(RESET_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-v2-e008-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Hémisphères nord, sud, est et ouest');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Deux grands cercles suffisent à découper la Terre en quatre hémisphères : l’équateur pour le nord et le sud, le méridien de Greenwich pour l’est et l’ouest. Le laboratoire ci-dessous ne fait que projeter des signes et des formules déterministes ; aucune donnée n’est inventée.');

  /* E008-06 : radiogroupe explicite (choix unique), pas des bascules indépendantes. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = RADIO_GROUP_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Hémisphère mis en évidence');
  const legend = document.createElement('legend');
  legend.textContent = 'Hémisphère mis en évidence (choix unique)';
  fieldset.appendChild(legend);
  HEMISPHERES.forEach((h) => {
    const lab = ctx.el('label', 'geography-v2-e008-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = RADIO_NAME;
    radio.id = `${RADIO_NAME}-${h.value}`;
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

  /* E008-05 / E008-09 : canvas focalisable, nommé et décrit. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Globe schématique : les hachures désignent l’hémisphère choisi, le tiret long l’équateur, le pointillé le méridien de Greenwich. Flèches gauche et droite : changer d’hémisphère ; flèches haut et bas : changer la latitude par pas de cinq degrés ; Origine : revenir à zéro degré.');
  canvas.setAttribute('aria-describedby', LEGEND_ID);

  const legendText = ctx.el('p', 'geography-v2-e008-legend');
  legendText.id = LEGEND_ID;

  /* E008-03 / E008-04 : lecture chiffrée dans une région live. */
  const readout = ctx.el('p', 'geography-v2-e008-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le méridien');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  const reset = ctx.el('button', '', '↺ Réinitialiser');
  reset.type = 'button';
  reset.id = RESET_ID;

  panel.append(
    title, lead, buildFacts(), buildDefinitions(), buildTables(), fieldset, sub,
    latRow.p, latRow.input, lonRow.p, lonRow.input, declRow.p, declRow.input,
    canvas, legendText, readout, play, reset,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    hemispheres: HEMISPHERES.map((h) => document.getElementById(`${RADIO_NAME}-${h.value}`)),
    lat: latRow.input, latOut: latRow.out,
    lon: lonRow.input, lonOut: lonRow.out,
    decl: declRow.input, declOut: declRow.out,
    canvas, readout, play, reset, legend: legendText,
  };
}

/* ---------- Laboratoire canvas déterministe (E008-05) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 264;
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
  /* Projection orthographique centrée sur (0°, 0°) — purement déterministe. */
  const px = (lat, lon) => [cx + R * Math.sin(lon * RAD) * Math.cos(lat * RAD), cy - R * Math.sin(lat * RAD)];

  g.beginPath();
  g.arc(cx, cy, R, 0, 2 * Math.PI);
  g.fillStyle = 'rgba(255,255,255,.02)';
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 1;
  g.stroke();

  /* E008-05 : hachures de l'hémisphère choisi — la forme, jamais la couleur seule. */
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

  /* E008-08 : méridien balayé = fonction déterministe du seul S.sweep. */
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

  /* E008-02 : marqueur du point en croix + cercle, cercle pointillé si face cachée. */
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

  /* Étiquettes N/S/E/O et nom de l'hémisphère choisi. */
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

/* E008-03 / E008-04 : lecture chiffrée dans une région live (role=status). */
function updateReadout() {
  const m = measures();
  const n = S.nodes.readout;
  if (!n) return;
  const strong = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`Point à ${Math.abs(m.lat)}° ${m.lat < 0 ? 'S' : 'N'}, ${Math.abs(m.lon)}° ${m.lon < 0 ? 'O' : 'E'} — `));
  n.appendChild(strong(m.phrase));
  n.appendChild(document.createTextNode('. Degré de longitude : '));
  n.appendChild(strong(`${fmt(m.lonKm)} km`));
  n.appendChild(document.createTextNode(` (référence ${fmt(KM_PER_DEG)} km à l’équateur). Soleil à midi, δ = ${fmt(m.decl)}° : hauteur `));
  n.appendChild(strong(`${fmt(m.solar)}°`));
  n.appendChild(document.createTextNode(`, contre ${fmt(m.solarEquator)}° à l’équateur pour la même déclinaison.`));
}

function syncControls() {
  const n = S.nodes;
  n.hemispheres.forEach((radio, i) => {
    if (radio) radio.checked = S.hemisphere === HEMISPHERES[i].value;
  });
  if (n.lat) {
    n.lat.value = String(S.lat);
    n.lat.setAttribute('aria-valuetext', `${S.lat} degrés de latitude`);
  }
  if (n.latOut) n.latOut.textContent = `${S.lat > 0 ? '+' : ''}${S.lat}°`;
  if (n.lon) {
    n.lon.value = String(S.lon);
    n.lon.setAttribute('aria-valuetext', `${S.lon} degrés de longitude`);
  }
  if (n.lonOut) n.lonOut.textContent = `${S.lon > 0 ? '+' : ''}${S.lon}°`;
  if (n.decl) {
    n.decl.value = String(S.declination);
    n.decl.setAttribute('aria-valuetext', `${fmt(S.declination)} degrés de déclinaison`);
  }
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
    d.geographyV2E008Hemisphere = S.hemisphere;
    d.geographyV2E008Lat = String(S.lat);
    d.geographyV2E008Lon = String(S.lon);
    d.geographyV2E008Declination = String(S.declination);
    d.geographyV2E008Playing = S.playing ? '1' : '0';
    d.geographyV2E008Sweep = fmt(S.sweep, 2);
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

function prefersReduced() {
  if (typeof ctxReduced === 'function') return !!ctxReduced();
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch { return false; }
  }
  return false;
}

let ctxReduced = null;

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  const reduced = prefersReduced();
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00006) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.nodes.panel) S.nodes.panel.dataset.geographyV2E008Sweep = fmt(S.sweep, 2);
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
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
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyV2E008Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* E008-09 : badge de la carte existante, sans toucher à son rendu. */
function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-v2-e008-badge', 'Repères : équateur 0° de latitude, méridien de Greenwich 0° de longitude. Nord/Sud par le signe de la latitude, Est/Ouest par le signe de la longitude.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E008', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;

  /* E008-10 : une seule feuille injectée, un seul identifiant. */
  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyV2E008Reduced = reduced ? '1' : '0';
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
      S.lat = clamp(Math.round(Number(n.lat.value)), -90, 90);
      syncControls();
    });
    n.lon.addEventListener('input', () => {
      S.lon = clamp(Math.round(Number(n.lon.value)), -180, 180);
      syncControls();
    });
    n.decl.addEventListener('input', () => {
      S.declination = clamp(Math.round(Number(n.decl.value) * 10) / 10, -23.4, 23.4);
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.reset.addEventListener('click', () => {
      S.hemisphere = 'nord';
      S.lat = 48;
      S.lon = 2;
      S.declination = 0;
      S.sweep = 0;
      syncControls();
    });
    /* Équivalence clavier du laboratoire (E008-09). */
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = ORDER.indexOf(S.hemisphere);
        S.hemisphere = ORDER[(i + step + ORDER.length) % ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 5 : -5;
        S.lat = clamp(S.lat + step, -90, 90);
      } else if (event.key === 'Home' || event.key === 'Origin') {
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

  installGlobalListeners();
  if (S.playing) startLoop();
});
