import { register } from './registry.js';

/* Lentille E036 — vue GEOGRAPHIE.
 * Thème : tropiques et cercles polaires.
 *
 * Les dix chantiers E036-01 … E036-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E036.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, fieldset) présent dans le DOM même sans animation ;
 * le canvas n'est qu'un laboratoire qui illustre des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e036';
const PANEL_ID = 'geography-e036-panel';
const TITLE_ID = 'geography-e036-title';
const EPS_ID = 'geography-e036-obliquite';
const EPS_OUT_ID = 'geography-e036-obliquite-value';
const DAY_ID = 'geography-e036-jour';
const DAY_OUT_ID = 'geography-e036-jour-value';
const LAT_ID = 'geography-e036-latitude';
const LAT_OUT_ID = 'geography-e036-latitude-value';
const ZONE_ID = 'geography-e036-zone';
const CANVAS_ID = 'geography-e036-canvas';
const READOUT_ID = 'geography-e036-readout';
const PLAY_ID = 'geography-e036-play';
const LEGEND_ID = 'geography-e036-legend';
const BADGE_ID = 'geography-e036-badge';
const TABLE_ID = 'geography-e036-table';

/* Constantes physiques (valeurs canoniques, aucune donnée fabriquée). */
const RAD = Math.PI / 180;
const EPS_REF = 23.44;   /* obliquité actuelle ≈ 23°26′ (référence affichée). */
const EPS_MIN = 20;
const EPS_MAX = 27;
const DAY_MIN = 1;
const DAY_MAX = 365;
const LAT_MIN = -90;
const LAT_MAX = 90;
const LAT_CLAMP = 89.9;  /* évite la tangente infinie aux pôles. */

const ORDER_ZONE = ['tropical', 'tempere', 'polaire'];
const ZONES = {
  tropical: { label: 'Tropical (|φ| ≤ ε)', motif: 'tirets longs', dash: [7, 5], lat: EPS_REF },
  tempere: { label: 'Tempéré (entre les deux)', motif: 'trait continu', dash: [], lat: 45 },
  polaire: { label: 'Polair (|φ| ≥ 90° − ε)', motif: 'pointillés', dash: [2, 4], lat: 90 - EPS_REF },
};

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  eps: EPS_REF,
  day: 172,       /* 21 juin : solstice d'été boréal par défaut. */
  lat: 45,
  zone: 'tempere',
  playing: false,
  reduced: false,
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
const nf = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
const deg = (n, d = 1) => `${n < 0 ? '−' : ''}${nf(Math.abs(n), d)}°`;

const tropicLat = (eps) => eps;            /* tropique = ±ε. */
const polarLat = (eps) => 90 - eps;        /* cercle polaire = ±(90° − ε). */

/* Déclinaison solaire δ (degrés) : approximation de Cooper,
 * δ = −ε · cos(2π (N + 10) / 365), N = jour de l'année. */
function declination(day, eps) {
  return -eps * Math.cos((2 * Math.PI * (day + 10)) / 365);
}

/* Durée du jour (heures) à la latitude phi pour la déclinaison delta.
 * cos(H0) = −tan(phi)·tan(delta) ; jour = 24·H0/π. */
function dayLength(phi, delta) {
  const u = -Math.tan(clamp(phi, -LAT_CLAMP, LAT_CLAMP) * RAD)
          * Math.tan(clamp(delta, -EPS_MAX, EPS_MAX) * RAD);
  if (u > 1) return 0;        /* soleil ne se lève pas : nuit polaire. */
  if (u < -1) return 24;      /* soleil ne se couche pas : jour polaire. */
  return (24 * Math.acos(u)) / Math.PI;
}

function zoneOf(phi, eps) {
  const a = Math.abs(phi);
  if (a <= eps + 1e-9) return 'tropical';
  if (a >= 90 - eps - 1e-9) return 'polaire';
  return 'tempere';
}

function seasonOf(day) {
  if (day >= 75 && day <= 86) return 'équinoxe de printemps';
  if (day >= 165 && day <= 180) return 'solstice d’été';
  if (day >= 260 && day <= 274) return 'équinoxe d’automne';
  if (day >= 348 || day <= 5) return 'solstice d’hiver';
  return 'cours de l’année';
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e036-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e036-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e036-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e036-panel p{margin:5px 0;max-width:68ch}
#geography-e036-panel .geography-e036-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e036-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e036-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e036-table th,#geography-e036-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e036-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e036-zone{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e036-zone legend{padding:0 4px;color:var(--muted)}
#geography-e036-panel .geography-e036-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e036-panel .geography-e036-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e036-panel .geography-e036-cursor{margin:7px 0}
#geography-e036-panel .geography-e036-cursor label{display:block;margin-bottom:2px}
#geography-e036-panel input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e036-panel .geography-e036-val{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#geography-e036-canvas{
  display:block;width:100%;height:260px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e036-legend{font-size:10px;color:var(--muted)}
#geography-e036-readout{
  min-height:44px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e036-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e036-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e036-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e036-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e036-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e036-panel[data-geography-e036-reduced="1"] button,
#geography-e036-panel[data-geography-e036-reduced="1"] .geography-e036-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e036-panel button,.geography-e036-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e036-panel{font-size:10px;padding:9px}
  #geography-e036-canvas{height:220px}
  #geography-e036-panel .geography-e036-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'L’axe de la Terre est incliné de ε ≈ 23,4° (23°26′) sur le plan de son orbite : c’est l’obliquité. Cette inclinaison, qui varie lentement entre 22,1° et 24,5° sur environ 41 000 ans (cycles de Milankovitch), est la cause des saisons.',
    'Le Soleil est au zénith (à 90° au-dessus de l’horizon) à la latitude φ = δ, où δ est la déclinaison solaire. δ oscillant entre −ε et +ε au cours de l’année, seules les régions situées entre les deux tropiques (|φ| ≤ ε) peuvent voir le Soleil au zénith. Aux solstices, δ = ±ε et le zénith atteint précisément les tropiques.',
    'Aux solstices, la latitude φ = ±(90° − ε) définit les cercles polaires : au-delà, le Soleil ne se couche pas (jour polaire) ou ne se lève pas (nuit polaire) pendant au moins une journée. Plus on se rapproche du pôle, plus cette période dure.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e036-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = `Les cinq parallèles remarquables, calculés pour l’obliquité de référence ε = ${deg(EPS_REF)} (valeur actuelle ≈ 23°26′).`;
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Parallèle', 'Latitude', 'Phénomène'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Équateur', '0°', 'Zénith à l’équinoxe (δ = 0).'],
    ['Tropique du Cancer', `+${deg(tropicLat(EPS_REF))}`, 'Limite nord du zénith (δ max).'],
    ['Tropique du Capricorne', `−${deg(tropicLat(EPS_REF))}`, 'Limite sud du zénith (δ min).'],
    ['Cercle arctique', `+${deg(polarLat(EPS_REF))}`, 'Limite du jour polaire boréal.'],
    ['Cercle antarctique', `−${deg(polarLat(EPS_REF))}`, 'Limite de la nuit polaire australe.'],
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
  row.className = 'geography-e036-cursor';
  const lab = document.createElement('label');
  lab.setAttribute('for', id);
  lab.appendChild(document.createTextNode(labelText + ' : '));
  const out = document.createElement('span');
  out.id = outId;
  out.className = 'geography-e036-val';
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
      radios: ORDER_ZONE.map((v) => document.getElementById(`geography-e036-zone-${v}`)),
      eps: document.getElementById(EPS_ID),
      epsOut: document.getElementById(EPS_OUT_ID),
      day: document.getElementById(DAY_ID),
      dayOut: document.getElementById(DAY_OUT_ID),
      lat: document.getElementById(LAT_ID),
      latOut: document.getElementById(LAT_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e036-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Tropiques et cercles polaires');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Quatre parallèles remarquables découlent d’un seul nombre : l’obliquité de la Terre. Ce laboratoire relie l’inclinaison de l’axe, la déclinaison du Soleil et la durée du jour à quelques formules que l’on peut manipuler.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = ZONE_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Zone de la latitude choisie (choix unique)';
  fieldset.appendChild(legend);
  ORDER_ZONE.forEach((value) => {
    const lab = ctx.el('label', 'geography-e036-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e036-zone';
    radio.id = `geography-e036-zone-${value}`;
    radio.value = value;
    radio.checked = S.zone === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(ZONES[value].label));
    fieldset.appendChild(lab);
  });

  const eps = rangeRow('Obliquité ε', EPS_ID, EPS_OUT_ID, EPS_MIN, EPS_MAX, 0.1, S.eps, 'Inclinaison de l’axe, de 20 à 27 degrés');
  const day = rangeRow('Jour de l’année N', DAY_ID, DAY_OUT_ID, DAY_MIN, DAY_MAX, 1, Math.round(S.day), 'Jour de l’année, de 1 à 365');
  const lat = rangeRow('Latitude φ', LAT_ID, LAT_OUT_ID, LAT_MIN, LAT_MAX, 1, S.lat, 'Latitude observée, de moins 90 à plus 90 degrés');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Coupe méridienne de la Terre. Flèches gauche et droite : changer de jour ; flèches haut et bas : changer la latitude ; Page précédente et Page suivante : changer l’obliquité.');

  const legendText = ctx.el('p', 'geography-e036-legend', '');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e036-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter l’animation' : '▶ Animer les saisons');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset,
    eps.row, day.row, lat.row, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: ORDER_ZONE.map((v) => document.getElementById(`geography-e036-zone-${v}`)),
    eps: eps.input, epsOut: eps.out,
    day: day.input, dayOut: day.out,
    lat: lat.input, latOut: lat.out,
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

  const cx = cssW * 0.54;
  const cy = cssH * 0.48;
  const R = Math.max(20, Math.min(cssW * 0.30, cssH * 0.36));
  const delta = declination(S.day, S.eps) * RAD;

  /* Vecteurs du repère terrestre dans la coupe : â = axe nord, êq = équateur. */
  const ax = -Math.sin(delta);
  const ay = -Math.cos(delta);
  const eqx = Math.cos(delta);
  const eqy = -Math.sin(delta);
  const surface = (phiDeg) => {
    const phi = phiDeg * RAD;
    return {
      x: cx + R * (Math.cos(phi) * eqx + Math.sin(phi) * ax),
      y: cy + R * (Math.cos(phi) * eqy + Math.sin(phi) * ay),
    };
  };

  /* Globe et axe de rotation. */
  g.setLineDash([]);
  g.fillStyle = 'rgba(120,170,215,.10)';
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  g.setLineDash([5, 4]);
  g.strokeStyle = 'rgba(244,214,158,.75)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(cx - R * 1.15 * ax, cy - R * 1.15 * ay);
  g.lineTo(cx + R * 1.15 * ax, cy + R * 1.15 * ay);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText('N', cx + R * 1.2 * ax - 4, cy + R * 1.2 * ay + 4);

  /* Terminateur (jour à gauche, nuit à droite) et rayons solaires. */
  g.setLineDash([3, 4]);
  g.strokeStyle = 'rgba(255,255,255,.4)';
  g.beginPath();
  g.moveTo(cx, cy - R);
  g.lineTo(cx, cy + R);
  g.stroke();
  g.setLineDash([]);

  g.strokeStyle = 'rgba(244,214,158,.85)';
  g.lineWidth = 1.5;
  const rayYs = [cy - R * 0.55, cy, cy + R * 0.55];
  rayYs.forEach((ry) => arrow(g, 6, ry, cx - R - 6, ry, 6));
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText('Soleil', 8, cy - R - 8);

  /* Parallèles remarquables : styles de trait distincts (non chromatiques). */
  const paralleles = [
    { lat: polarLat(S.eps), txt: `Cercle +${deg(polarLat(S.eps))}`, dash: [2, 4], color: 'rgba(210,215,225,.95)' },
    { lat: tropicLat(S.eps), txt: `Tropique +${deg(tropicLat(S.eps))}`, dash: [7, 5], color: 'rgba(244,214,158,.95)' },
    { lat: 0, txt: 'Équateur 0°', dash: [], color: 'rgba(255,255,255,.9)' },
    { lat: -tropicLat(S.eps), txt: `Tropique −${deg(tropicLat(S.eps))}`, dash: [7, 5], color: 'rgba(244,214,158,.95)' },
    { lat: -polarLat(S.eps), txt: `Cercle −${deg(polarLat(S.eps))}`, dash: [2, 4], color: 'rgba(210,215,225,.95)' },
  ];
  paralleles.forEach((p) => {
    const pt = surface(p.lat);
    const nx = (pt.x - cx) / R;
    const ny = (pt.y - cy) / R;
    g.setLineDash(p.dash);
    g.strokeStyle = p.color;
    g.lineWidth = p.lat === 0 ? 2.2 : 1.6;
    g.beginPath();
    g.moveTo(pt.x - ny * 7, pt.y + nx * 7);
    g.lineTo(pt.x + ny * 7, pt.y - nx * 7);
    g.stroke();
    g.setLineDash([]);
    if (pt.x > cx) {
      g.fillStyle = p.color;
      g.font = '9px sans-serif';
      g.fillText(p.txt, pt.x + 9, pt.y + 3);
    }
  });

  /* Point subsolaire (zénith) : toujours sur le bord éclairé. */
  const sub = surface(delta / RAD);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(sub.x, sub.y, 4.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.9)';
  g.font = '9px sans-serif';
  g.fillText('Zénith', sub.x - 16, sub.y - 8);

  /* Marqueur de la latitude choisie : losange, indépendant de la couleur. */
  const chosen = surface(S.lat);
  g.save();
  g.translate(chosen.x, chosen.y);
  g.rotate(Math.PI / 4);
  g.fillStyle = '#f4d69e';
  g.fillRect(-4, -4, 8, 8);
  g.restore();
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  const zoneTxt = { tropical: 'zone tropicale', tempere: 'zone tempérée', polaire: 'zone polaire' }[zoneOf(S.lat, S.eps)];
  g.fillText(`φ = ${deg(S.lat)} (${zoneTxt})`, 8, cssH - 20);
  g.fillText(`Jour ${Math.round(S.day)} · δ = ${deg(declination(S.day, S.eps))} · ${seasonOf(S.day)}`, 8, cssH - 6);
  g.fillStyle = 'rgba(255,255,255,.6)';
  g.fillText('ε = ' + deg(S.eps), cx + R + 8, cy - R + 2);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const delta = declination(S.day, S.eps);
  const dJour = dayLength(S.lat, delta);
  const dEquateur = dayLength(0, delta);      /* référence = 12 h. */
  const pole = polarLat(S.eps);
  const trop = tropicLat(S.eps);
  const z = zoneOf(S.lat, S.eps);
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
  l1.appendChild(document.createTextNode(`Déclinaison δ = ${deg(delta)} (${seasonOf(S.day)}, jour ${Math.round(S.day)}) ; tropiques ±${deg(trop)} et cercles polaires ±${deg(pole)}, pour ε = ${deg(S.eps)} (réf. ${deg(EPS_REF)}). `));
  l1.appendChild(fort(`Zénith possible : |φ| ≤ ${deg(trop)}.`));
  n.appendChild(l1);

  const l2 = document.createElement('span');
  l2.style.display = 'block';
  l2.appendChild(document.createTextNode(`Durée du jour à φ = ${deg(S.lat)} : `));
  l2.appendChild(fort(`${nf(dJour)} h`));
  l2.appendChild(document.createTextNode(` ; équateur (réf.) ${nf(dEquateur)} h, soit `));
  const ecart = dJour - dEquateur;
  l2.appendChild(fort(`${ecart >= 0 ? '+' : '−'}${nf(Math.abs(ecart))} h`));
  l2.appendChild(document.createTextNode(` par rapport à la référence.`));
  n.appendChild(l2);

  let etat;
  if (z === 'tropical') etat = 'Latitude dans la bande des tropiques : le Soleil peut y être au zénith.';
  else if (z === 'polaire') {
    etat = delta * S.lat >= 0
      ? 'Latitude au-delà du cercle polaire : jour polaire (24 h) à cette saison.'
      : 'Latitude au-delà du cercle polaire : nuit polaire (0 h) à cette saison.';
  } else etat = 'Latitude tempérée : ni zénith, ni jour ou nuit polaire.';
  n.appendChild(ligne(etat));
}

function syncControls() {
  const n = S.nodes;
  (n.radios || []).forEach((radio, i) => {
    if (radio) radio.checked = ORDER_ZONE[i] === S.zone;
  });
  if (n.eps) n.eps.value = String(S.eps);
  if (n.epsOut) n.epsOut.textContent = deg(S.eps);
  if (n.day) n.day.value = String(Math.round(S.day));
  if (n.dayOut) n.dayOut.textContent = `N° ${Math.round(S.day)}`;
  if (n.lat) n.lat.value = String(S.lat);
  if (n.latOut) n.latOut.textContent = deg(S.lat);
  if (n.legend) {
    n.legend.textContent = `Traits : équateur continu, tropiques en tirets, cercles polaires en pointillés ; le losange marque la latitude choisie, le point blanc le zénith. Aucune information ne repose sur la seule couleur (zone : ${ZONES[S.zone].label}).`;
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer les saisons';
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
    if (S.playing) {
      const before = Math.round(S.day);
      S.day += dt * 0.01;                /* ≈ 10 jours par seconde, reproductible. */
      if (S.day > DAY_MAX) S.day -= DAY_MAX;
      if (Math.round(S.day) !== before) syncControls();
    }
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
        if (panel) panel.dataset.geographyE036Reduced = mq.matches ? '1' : '0';
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
  const badge = ctx.el('div', 'geography-e036-badge', 'Les parallèles et la durée du jour sont calculés par des formules déterministes (obliquité, déclinaison, cosinus de l’angle horaire), sans donnée externe. Coupe schématique non à l’échelle.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E036', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.reduced = reduced;
  S.nodes.panel.dataset.geographyE036Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    (S.nodes.radios || []).forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.zone = radio.value;
        S.lat = ZONES[S.zone].lat;
        syncControls();
      });
    });

    S.nodes.eps.addEventListener('input', () => {
      S.eps = clamp(Math.round(Number(S.nodes.eps.value) * 10) / 10, EPS_MIN, EPS_MAX);
      S.zone = zoneOf(S.lat, S.eps);
      syncControls();
    });
    S.nodes.day.addEventListener('input', () => {
      S.day = clamp(Math.round(Number(S.nodes.day.value)), DAY_MIN, DAY_MAX);
      syncControls();
    });
    S.nodes.lat.addEventListener('input', () => {
      S.lat = clamp(Math.round(Number(S.nodes.lat.value)), LAT_MIN, LAT_MAX);
      S.zone = zoneOf(S.lat, S.eps);
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
        const step = event.key === 'ArrowRight' ? 5 : -5;
        S.day += step;
        if (S.day > DAY_MAX) S.day -= DAY_MAX;
        if (S.day < DAY_MIN) S.day += DAY_MAX;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 5 : -5;
        S.lat = clamp(S.lat + step, LAT_MIN, LAT_MAX);
        S.zone = zoneOf(S.lat, S.eps);
      } else if (event.key === 'PageUp' || event.key === 'PageDown') {
        const step = event.key === 'PageUp' ? 0.5 : -0.5;
        S.eps = clamp(Math.round((S.eps + step) * 10) / 10, EPS_MIN, EPS_MAX);
        S.zone = zoneOf(S.lat, S.eps);
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
  if (S.playing && !S.reduced) startLoop();
});
