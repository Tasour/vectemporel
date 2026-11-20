import { register } from './registry.js';

/* Lentille E031 — vue GEOGRAPHIE.
 * Thème : courants océaniques (dérive de surface, paramètre de Coriolis,
 * transport et spirale d'Ekman, gyres subtropicaux, circulation
 * thermohaline).
 *
 * Les dix chantiers E031-01 … E031-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E031.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau) présent dans le DOM même sans animation ; le canvas
 * n'est qu'un laboratoire qui illustre des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e031';
const PANEL_ID = 'geography-e031-panel';
const TITLE_ID = 'geography-e031-title';
const VIEW_ID = 'geography-e031-view';
const LAT_ID = 'geography-e031-lat';
const LAT_OUT_ID = 'geography-e031-lat-value';
const WIND_ID = 'geography-e031-vent';
const WIND_OUT_ID = 'geography-e031-vent-value';
const TEMP_ID = 'geography-e031-temp';
const TEMP_OUT_ID = 'geography-e031-temp-value';
const SAL_ID = 'geography-e031-sal';
const SAL_OUT_ID = 'geography-e031-sal-value';
const CANVAS_ID = 'geography-e031-canvas';
const READOUT_ID = 'geography-e031-readout';
const PLAY_ID = 'geography-e031-play';
const LEGEND_ID = 'geography-e031-legend';
const BADGE_ID = 'geography-e031-badge';

/* Constantes physiques (valeurs canoniques, aucune donnée fabriquée). */
const RAD = Math.PI / 180;
const OMEGA = 7.2921159e-5;   // vitesse angulaire de la Terre (rad/s)
const RHO_SEA = 1025;         // masse volumique de l'eau de mer (kg/m³)
const RHO_AIR = 1.225;        // masse volumique de l'air (kg/m³)
const CD = 1.3e-3;            // coefficient de traînée surface-air
const KM = 0.05;              // viscosité tourbillonnaire verticale (m²/s)
const SURF_FRACTION = 0.025;  // dérive de surface ≈ 2,5 % du vent
const RHO0 = 1027;            // densité de référence (kg/m³)
const T0 = 10;                // température de référence (°C)
const S0 = 35;                // salinité de référence (psu)
const ALPHA = 2.0e-4;         // dilatation thermique (1/°C)
const BETA = 7.6e-4;          // contraction haline (1/psu)
const LAT_FLOOR = 5;          // latte plancher pour les formules à 1/f

const VIEWS = {
  ekman: 'Spirale d’Ekman',
  gyre: 'Gyre subtropical',
  thermo: 'Circulation thermohaline',
};
const VIEW_ORDER = ['ekman', 'gyre', 'thermo'];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  view: 'ekman',
  lat: 45,
  wind: 10,
  temp: 10,
  sal: 35,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visible: true,
  visibilityBound: false,
  motionBound: false,
  observer: null,
  nodes: {},
};

/* ---------- Formules déterministes ---------- */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const nf = (n, d = 2) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');

function coriolis(lat) {
  return 2 * OMEGA * Math.sin(clamp(lat, -85, 85) * RAD);
}

function fSafe(lat) {
  return Math.max(Math.abs(coriolis(lat)), Math.abs(coriolis(LAT_FLOOR)));
}

function inertialHours(lat) {
  return (2 * Math.PI) / fSafe(lat) / 3600;
}

function windStress(u) {
  return RHO_AIR * CD * u * u;
}

function surfaceDrift(u) {
  return SURF_FRACTION * u;
}

function ekmanTransport(u, lat) {
  return windStress(u) / (RHO_SEA * fSafe(lat));
}

function ekmanDepth(lat) {
  return Math.PI * Math.sqrt((2 * KM) / fSafe(lat));
}

function ekmanScale(lat) {
  return Math.sqrt((2 * KM) / fSafe(lat));
}

function density(t, s) {
  return RHO0 * (1 - ALPHA * (t - T0) + BETA * (s - S0));
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e031-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e031-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e031-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e031-panel p{margin:5px 0;max-width:68ch}
#geography-e031-panel .geography-e031-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e031-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e031-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e031-table th,#geography-e031-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e031-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e031-view{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e031-view legend{padding:0 4px;color:var(--muted)}
#geography-e031-panel .geography-e031-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e031-panel .geography-e031-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e031-panel .geography-e031-cursor{margin:7px 0}
#geography-e031-panel .geography-e031-cursor label{display:block;margin-bottom:2px}
#geography-e031-panel input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e031-panel .geography-e031-val{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#geography-e031-canvas{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e031-legend{font-size:10px;color:var(--muted)}
#geography-e031-readout{
  min-height:44px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e031-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e031-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e031-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e031-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e031-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e031-panel[data-geography-e031-reduced="1"] button,
#geography-e031-panel[data-geography-e031-reduced="1"] .geography-e031-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e031-panel button,.geography-e031-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e031-panel{font-size:10px;padding:9px}
  #geography-e031-canvas{height:200px}
  #geography-e031-panel .geography-e031-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un courant océanique est un mouvement d’eau de mer, horizontal ou vertical, entretenu par le vent, par les différences de densité et par la rotation de la Terre.',
    'Près de la surface, le vent entraîne l’eau ; la force de Coriolis la dévie vers la droite dans l’hémisphère nord et vers la gauche dans l’hémisphère sud. En profondeur, ce mouvement s’affaiblit et tourne : c’est la spirale d’Ekman.',
    'La circulation thermohaline est portée par la densité : une eau froide et salée est plus dense, coule, puis remonte lentement ailleurs, formant un « tapis roulant » mondial.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e031-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = 'geography-e031-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Grands courants et transports approximatifs (1 Sv = 10⁶ m³/s) — ordres de grandeur de référence.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Courant', 'Type', 'Transport (Sv)', 'Vitesse (m/s)'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Courant circumpolaire antarctique', 'Vent / gyre', '137', '0,3–0,5'],
    ['Gulf Stream', 'Vent / gyre', '30', '1,0–2,5'],
    ['Kuroshio', 'Vent / gyre', '20', '1,0–2,0'],
    ['Courant de Humboldt', 'Remontée', '10–15', '0,2–0,4'],
    ['Tapis roulant thermohalin', 'Densité', '15–20', '0,01–0,05'],
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

function rangeRow(labelText, id, outId, min, max, step, value, aria) {
  const row = document.createElement('div');
  row.className = 'geography-e031-cursor';
  const lab = document.createElement('label');
  lab.setAttribute('for', id);
  lab.appendChild(document.createTextNode(labelText + ' : '));
  const out = document.createElement('span');
  out.id = outId;
  out.className = 'geography-e031-val';
  lab.appendChild(out);
  row.appendChild(lab);
  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.setAttribute('aria-label', aria);
  row.appendChild(input);
  return { row, input, out };
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: VIEW_ORDER.map((v) => document.getElementById(`geography-e031-view-${v}`)),
      lat: document.getElementById(LAT_ID),
      latOut: document.getElementById(LAT_OUT_ID),
      wind: document.getElementById(WIND_ID),
      windOut: document.getElementById(WIND_OUT_ID),
      temp: document.getElementById(TEMP_ID),
      tempOut: document.getElementById(TEMP_OUT_ID),
      sal: document.getElementById(SAL_ID),
      salOut: document.getElementById(SAL_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e031-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Courants océaniques');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Du vent à la densité : ce laboratoire relie la force de Coriolis, le transport d’Ekman et la circulation thermohaline à quelques formules que l’on peut manipuler.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = VIEW_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Vue du laboratoire (choix unique)';
  fieldset.appendChild(legend);
  VIEW_ORDER.forEach((value) => {
    const lab = ctx.el('label', 'geography-e031-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e031-view';
    radio.id = `geography-e031-view-${value}`;
    radio.value = value;
    radio.checked = S.view === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(VIEWS[value]));
    fieldset.appendChild(lab);
  });

  const lat = rangeRow('Latitude', LAT_ID, LAT_OUT_ID, -80, 80, 5, S.lat, 'Latitude observée, de moins 80 à plus 80 degrés');
  const wind = rangeRow('Vent', WIND_ID, WIND_OUT_ID, 0, 30, 1, S.wind, 'Vitesse du vent, de 0 à 30 mètres par seconde');
  const temp = rangeRow('Température', TEMP_ID, TEMP_OUT_ID, -2, 30, 1, S.temp, 'Température de l’eau, de moins 2 à 30 degrés Celsius');
  const sal = rangeRow('Salinité', SAL_ID, SAL_OUT_ID, 30, 38, 0.5, S.sal, 'Salinité, de 30 à 38 unités pratiques');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Laboratoire des courants océaniques. Flèches gauche et droite : changer de vue ; flèches haut et bas : changer la latitude.');

  const legendText = ctx.el('p', 'geography-e031-legend', VIEWS[S.view] + ' · la forme des flèches et les repères distinguent les phénomènes, indépendamment de la couleur.');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e031-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter l’animation' : '▶ Animer le courant');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset,
    lat.row, wind.row, temp.row, sal.row, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: VIEW_ORDER.map((v) => document.getElementById(`geography-e031-view-${v}`)),
    lat: lat.input, latOut: lat.out,
    wind: wind.input, windOut: wind.out,
    temp: temp.input, tempOut: temp.out,
    sal: sal.input, salOut: sal.out,
    canvas, readout, play, legend: legendText,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas) ---------- */

function arrow(g, x1, y1, x2, y2, head = 7) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.moveTo(x2, y2);
  g.lineTo(x2 - head * Math.cos(a - 0.5), y2 - head * Math.sin(a - 0.5));
  g.moveTo(x2, y2);
  g.lineTo(x2 - head * Math.cos(a + 0.5), y2 - head * Math.sin(a + 0.5));
  g.stroke();
}

function drawEkman(g, cssW, cssH, pad, iw, ih) {
  const cx = pad + iw * 0.5;
  const cy = pad + ih * 0.58;
  const scale = Math.min(iw, ih) * 0.34;
  const north = coriolis(S.lat) >= 0;
  const sens = north ? -1 : 1; // déviation à droite (N) / à gauche (S)

  /* Vent vers l'est. */
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2.5;
  arrow(g, cx - scale * 0.9, pad + 24, cx + scale * 0.55, pad + 24, 10);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText('Vent', cx + scale * 0.6, pad + 27);

  /* Spirale : longueur décroissante, rotation avec la profondeur. */
  g.lineWidth = 2;
  for (let k = 0; k <= 4; k += 1) {
    const z = k; // profondeur en unités d'échelle e
    const mag = Math.exp(-z);
    const ang = sens * (Math.PI / 4 + z);
    const ex = cx + Math.cos(ang) * scale * 0.8 * mag;
    const ey = cy - Math.sin(ang) * scale * 0.8 * mag;
    g.strokeStyle = `rgba(214,207,193,${(0.95 - k * 0.16).toFixed(2)})`;
    arrow(g, cx, cy, ex, ey, 7);
    g.fillStyle = 'rgba(214,207,193,.65)';
    g.fillText(`−${nf(z * ekmanScale(S.lat), 0)} m`, 4 + pad, cy + 4 + z * 16);
  }

  /* Marqueur animé : suit la spirale, position déterministe = f(S.sweep). */
  const z = S.sweep * 4;
  const mag = Math.exp(-z);
  const ang = sens * (Math.PI / 4 + z);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(cx + Math.cos(ang) * scale * 0.8 * mag, cy - Math.sin(ang) * scale * 0.8 * mag, 4, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(north ? 'Hémisphère nord : dévie à droite' : 'Hémisphère sud : dévie à gauche', pad + 2, cssH - pad - 18);
  g.fillText(`Épaisseur d’Ekman ≈ ${nf(ekmanDepth(S.lat), 0)} m`, pad + 2, cssH - pad - 4);
}

function drawGyre(g, cssW, cssH, pad, iw, ih) {
  const cx = pad + iw * 0.5;
  const cy = pad + ih * 0.5;
  const rx = iw * 0.33;
  const ry = ih * 0.3;
  const north = coriolis(S.lat) >= 0;
  const dir = north ? 1 : -1; // horaire (N) / antihoraire (S)

  /* Bassin schématique. */
  g.strokeStyle = 'rgba(255,255,255,.18)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.stroke();

  /* Flèches de circulation le long du gyre. */
  g.lineWidth = 2.5;
  g.strokeStyle = 'rgba(214,207,193,.85)';
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2;
    const a2 = a + dir * 0.42;
    const x1 = cx + Math.cos(a) * rx;
    const y1 = cy + Math.sin(a) * ry;
    const x2 = cx + Math.cos(a2) * rx;
    const y2 = cy + Math.sin(a2) * ry;
    arrow(g, x1, y1, x2, y2, 7);
  }

  /* Marqueur animé sur le pourtour. */
  const a = S.sweep * Math.PI * 2 * dir;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 4.5, 0, Math.PI * 2);
  g.fill();

  /* Vents alignés : alizés à l'équateur, westerlies au pôle. */
  g.strokeStyle = 'rgba(244,214,158,.8)';
  g.lineWidth = 1.5;
  arrow(g, cx - rx, cy + ry + 16, cx + rx * 0.2, cy + ry + 16, 6);
  arrow(g, cx + rx, cy - ry - 16, cx - rx * 0.2, cy - ry - 16, 6);

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(north ? 'Hémisphère nord : sens horaire' : 'Hémisphère sud : sens antihoraire', pad + 2, cssH - pad - 4);
}

function drawThermo(g, cssW, cssH, pad, iw, ih) {
  const left = pad + iw * 0.16;
  const right = pad + iw * 0.84;
  const top = pad + ih * 0.28;
  const bot = pad + ih * 0.78;
  const rho = density(S.temp, S.sal);
  const dense = rho >= RHO0;

  /* Couche de surface (chaude) et fond (froid). */
  g.setLineDash([]);
  g.lineWidth = 2.5;
  g.strokeStyle = 'rgba(244,214,158,.9)';
  arrow(g, left, top, right, top, 8);
  g.fillStyle = 'rgba(244,214,158,.9)';
  g.font = '10px sans-serif';
  g.fillText('Surface : eau chaude vers le pôle', left, top - 8);

  g.strokeStyle = 'rgba(170,205,235,.9)';
  arrow(g, right - 8, bot, left + 8, bot, 8);
  g.fillStyle = 'rgba(170,205,235,.9)';
  g.fillText('Profondeur : retour d’eau froide', left, bot + 16);

  /* Plongée / remontée : l'épaisseur du trait porte l'état de densité. */
  g.lineWidth = dense ? 4 : 1.5;
  g.strokeStyle = 'rgba(214,207,193,.95)';
  if (dense) {
    arrow(g, right, top, right, bot, 9);
    g.fillText('Plongée (eau dense)', right - 96, (top + bot) / 2);
  } else {
    arrow(g, right, bot, right, top, 9);
    g.fillText('Pas de plongée (eau légère)', right - 120, (top + bot) / 2);
  }
  g.lineWidth = 1.5;
  arrow(g, left, bot, left, top, 7);

  /* Marqueur animé sur la boucle. */
  const t = S.sweep;
  let mx;
  let my;
  if (t < 0.4) { mx = left + (t / 0.4) * (right - left); my = top; }
  else if (t < 0.65) { mx = right; my = top + ((t - 0.4) / 0.25) * (bot - top); }
  else if (t < 0.9) { mx = right - ((t - 0.65) / 0.25) * (right - left); my = bot; }
  else { mx = left; my = bot - ((t - 0.9) / 0.1) * (bot - top); }
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(mx, my, 4.5, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`Densité ρ ≈ ${nf(rho, 2)} kg/m³ (réf. ${nf(RHO0, 0)} à ${T0} °C / ${S0} psu)`, pad + 2, cssH - pad - 4);
}

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

  const pad = 16;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);

  g.strokeStyle = 'rgba(255,255,255,.14)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);

  if (S.view === 'ekman') drawEkman(g, cssW, cssH, pad, iw, ih);
  else if (S.view === 'gyre') drawGyre(g, cssW, cssH, pad, iw, ih);
  else drawThermo(g, cssW, cssH, pad, iw, ih);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const f = coriolis(S.lat);
  const pole = 2 * OMEGA;
  const drift = surfaceDrift(S.wind);
  const transport = ekmanTransport(S.wind, S.lat);
  const prof = ekmanDepth(S.lat);
  const rho = density(S.temp, S.sal);

  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const ligne = (texte) => {
    const p = document.createElement('span');
    p.style.display = 'block';
    p.textContent = texte;
    return p;
  };

  n.textContent = '';
  const l1 = document.createElement('span');
  l1.style.display = 'block';
  l1.appendChild(document.createTextNode(`Coriolis f = ${nf(f * 1e5, 3)}×10⁻⁵ s⁻¹ (pôle : ${nf(pole * 1e5, 3)}×10⁻⁵) ; période d’inertie `));
  l1.appendChild(fort(`${nf(inertialHours(S.lat), 1)} h`));
  n.appendChild(l1);

  const l2 = document.createElement('span');
  l2.style.display = 'block';
  l2.appendChild(document.createTextNode(`Contrainte du vent ${nf(windStress(S.wind), 3)} N/m² ; dérive de surface `));
  l2.appendChild(fort(`${nf(drift, 2)} m/s`));
  l2.appendChild(document.createTextNode(` (≈ 2,5 % du vent, référence 0,30 m/s en océan ouvert) ; transport d’Ekman `));
  l2.appendChild(fort(`${nf(transport, 2)} m²/s`));
  n.appendChild(l2);

  n.appendChild(ligne(`Couche d’Ekman ≈ ${nf(prof, 0)} m (viscosité ${nf(KM, 2)} m²/s) ; ` +
    `densité ${nf(rho, 2)} kg/m³ (réf. ${nf(RHO0, 0)}), ` +
    (rho >= RHO0 ? 'eau dense : plongée possible.' : 'eau légère : pas de plongée.')));
}

function syncControls() {
  const n = S.nodes;
  (n.radios || []).forEach((radio, i) => {
    if (radio) radio.checked = VIEW_ORDER[i] === S.view;
  });
  if (n.lat) n.lat.value = String(S.lat);
  if (n.latOut) n.latOut.textContent = `${S.lat}°`;
  if (n.wind) n.wind.value = String(S.wind);
  if (n.windOut) n.windOut.textContent = `${S.wind} m/s`;
  if (n.temp) n.temp.value = String(S.temp);
  if (n.tempOut) n.tempOut.textContent = `${S.temp} °C`;
  if (n.sal) n.sal.value = String(S.sal);
  if (n.salOut) n.salOut.textContent = `${nf(S.sal, 1)} psu`;
  if (n.legend) n.legend.textContent = VIEWS[S.view] + ' · la forme des flèches et les repères distinguent les phénomènes, indépendamment de la couleur.';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer le courant';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
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
  if (!S.visible) return;
  if (S.reduced) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.visible || S.reduced) return;
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
        if (panel) panel.dataset.geographyE031Reduced = mq.matches ? '1' : '0';
        if (mq.matches) {
          S.playing = false;
          stopLoop();
        }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }

  if (!S.observer && typeof IntersectionObserver === 'function' && typeof document !== 'undefined') {
    const cv = S.nodes.canvas;
    if (cv) {
      S.observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          S.visible = entry.isIntersecting;
          if (S.visible) { if (S.playing) startLoop(); }
          else stopLoop();
        }
      }, { threshold: 0.01 });
      S.observer.observe(cv);
    }
  }
}

/* ---------- Badge informatif sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e031-badge', 'Les flèches illustrent des courants schématiques à partir de formules déterministes (Coriolis, Ekman, densité), sans donnée externe.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E031', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.reduced = reduced;
  S.nodes.panel.dataset.geographyE031Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    (S.nodes.radios || []).forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.view = radio.value;
        syncControls();
      });
    });

    S.nodes.lat.addEventListener('input', () => {
      S.lat = clamp(Math.round(Number(S.nodes.lat.value) / 5) * 5, -80, 80);
      syncControls();
    });
    S.nodes.wind.addEventListener('input', () => {
      S.wind = clamp(Math.round(Number(S.nodes.wind.value)), 0, 30);
      syncControls();
    });
    S.nodes.temp.addEventListener('input', () => {
      S.temp = clamp(Math.round(Number(S.nodes.temp.value)), -2, 30);
      syncControls();
    });
    S.nodes.sal.addEventListener('input', () => {
      S.sal = clamp(Math.round(Number(S.nodes.sal.value) * 2) / 2, 30, 38);
      syncControls();
    });

    S.nodes.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });

    S.nodes.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = VIEW_ORDER.indexOf(S.view);
        S.view = VIEW_ORDER[(i + step + VIEW_ORDER.length) % VIEW_ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 5 : -5;
        S.lat = clamp(S.lat + step, -80, 80);
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
