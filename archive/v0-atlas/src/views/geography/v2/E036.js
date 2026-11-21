import { register } from './registry.js';

/* Lentille E036 — passe V2, vue GEOGRAPHIE.
 * Thème : tropiques et cercles polaires (obliquité, déclinaison, durée du jour).
 *
 * Les dix chantiers E036-01 … E036-10 sont réellement implémentés (aucun stub) ;
 * leur description est dans UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E036.md.
 * Tout est local : zéro réseau, zéro journalisation, aucun générateur aléatoire,
 * aucun fichier partagé ni module de la passe 1 modifié. Le contenu pédagogique
 * est du texte sémantique réel (h2, h3, p, dl, table, fieldset, label, ol) inséré
 * dans le DOM : il reste lisible et indexable même sans animation ni interaction.
 * Le canvas n'est qu'un laboratoire qui illustre des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e036';
const P = 'geography-v2-e036-';
const PANEL_ID = P + 'panel';
const TITLE_ID = P + 'title';
const GLOSSARY_ID = P + 'glossary';
const TABLE_ID = P + 'table';
const ZONE_ID = P + 'zone';
const EPS_ID = P + 'obliquite';
const EPS_NUM_ID = P + 'obliquite-number';
const EPS_OUT_ID = P + 'obliquite-value';
const DAY_ID = P + 'jour';
const DAY_NUM_ID = P + 'jour-number';
const DAY_OUT_ID = P + 'jour-value';
const LAT_ID = P + 'latitude';
const LAT_NUM_ID = P + 'latitude-number';
const LAT_OUT_ID = P + 'latitude-value';
const CANVAS_ID = P + 'canvas';
const LEGEND_ID = P + 'legend';
const READOUT_ID = P + 'readout';
const PLAY_ID = P + 'play';
const DEFI_ID = P + 'defi';
const BADGE_ID = P + 'badge';

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

/* Graine fixe (aucun hasard) : cinq latitudes témoins reproductibles. */
const GRAINE = 0x45e036;

const ORDER_ZONE = ['tropical', 'tempere', 'polaire'];
const ZONES = {
  tropical: { label: 'Tropical (|φ| ≤ ε)', lat: EPS_REF },
  tempere: { label: 'Tempéré (entre les deux)', lat: 45 },
  polaire: { label: 'Polair (|φ| ≥ 90° − ε)', lat: 90 - EPS_REF },
};
const DASHES = {
  polaire: [2, 4],
  tropical: [7, 5],
  equator: [],
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
  offscreen: false,
  visibilityBound: false,
  motionBound: false,
  observersInstalled: false,
  observedCanvas: null,
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
    pts.push(-80 + rnd() * 160);   /* latitudes témoines dans [−80°, 80°]. */
  }
  S.points = pts;
  return pts;
}

/* Contrôle croisé : à l'équateur, tan(0) = 0 donc H0 = π/2 et jour = 12 h,
 * quelle que soit la déclinaison. Un écart non nul invaliderait la formule. */
function controleEquateur(delta) {
  const jour = dayLength(0, delta);
  return { jour, ecart: Math.abs(jour - 12) };
}

/* Contrôle croisé des solstices : δ(172) ≈ +ε, δ(355) ≈ −ε. */
function controleSolstices(eps) {
  const dEte = declination(172, eps);
  const dHiver = declination(355, eps);
  return {
    dEte,
    dHiver,
    valide: Math.abs(dEte - eps) < 0.1 && Math.abs(dHiver + eps) < 0.1,
  };
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
#${PANEL_ID} .geography-v2-e036-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PANEL_ID} .geography-v2-e036-note{color:var(--muted)}
#${GLOSSARY_ID}{margin:6px 0;max-width:68ch}
#${GLOSSARY_ID} dt{color:var(--gold-bright,#f4d69e);font-weight:600;margin-top:5px}
#${GLOSSARY_ID} dd{margin:1px 0 4px 12px;color:var(--ink-soft,#d7d1c6)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${ZONE_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${ZONE_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .geography-v2-e036-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .geography-v2-e036-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} label{display:block;margin:7px 0 2px}
#${PANEL_ID} input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} input[type="number"]{
  width:72px;min-height:36px;margin-left:8px;padding:4px 6px;border:1px solid var(--line);
  border-radius:6px;background:rgba(0,0,0,.25);color:var(--ink);font:inherit;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e036-val{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#${CANVAS_ID}{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:44px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${DEFI_ID} ol{margin:5px 0;padding-left:20px}
#${DEFI_ID} li{margin:3px 0;max-width:68ch}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-v2-e036-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[data-geography-v2-e036-reduced="1"] button,
#${PANEL_ID}[data-geography-v2-e036-reduced="1"] .geography-v2-e036-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.geography-v2-e036-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:190px}
  #${PANEL_ID} .geography-v2-e036-choix{margin-right:4px}
}
`;

/* ---------- Construction du texte sémantique (lisible sans JS) ---------- */

function staticFacts() {
  const wrap = E('div', 'geography-v2-e036-groupe');
  wrap.appendChild(E('h3', '', 'Trois faits à retenir'));
  const faits = [
    'L’axe de la Terre est incliné de ε ≈ 23,4° (23°26′) sur le plan de son orbite : c’est l’obliquité. Cette inclinaison, qui varie lentement entre 22,1° et 24,5° sur environ 41 000 ans (cycles de Milankovitch), est la cause des saisons.',
    'Le Soleil est au zénith (à 90° au-dessus de l’horizon) à la latitude φ = δ, où δ est la déclinaison solaire. δ oscillant entre −ε et +ε au cours de l’année, seules les régions situées entre les deux tropiques (|φ| ≤ ε) peuvent voir le Soleil au zénith.',
    'Aux solstices, la latitude φ = ±(90° − ε) définit les cercles polaires : au-delà, le Soleil ne se couche pas (jour polaire) ou ne se lève pas (nuit polaire) pendant au moins une journée.',
  ];
  faits.forEach((texte) => wrap.appendChild(E('p', 'geography-v2-e036-fait', texte)));
  return wrap;
}

function staticGlossary() {
  const wrap = E('div', 'geography-v2-e036-groupe');
  wrap.appendChild(E('h3', '', 'Lexique — définitions à la première occurrence'));
  const dl = E('dl');
  dl.id = GLOSSARY_ID;
  const termes = [
    ['Obliquité ε', 'Inclinaison de l’axe de rotation terrestre sur le plan de l’orbite, ≈ 23,4° aujourd’hui. Elle fixe les tropiques à ±ε et les cercles polaires à ±(90° − ε).'],
    ['Déclinaison solaire δ', 'Latitude où le Soleil est au zénith à un instant donné ; elle oscille entre −ε et +ε au cours de l’année (modèle de Cooper).'],
    ['Zénith', 'Point du ciel situé exactement à la verticale d’un observateur ; le Soleil l’atteint quand φ = δ.'],
    ['Angle horaire H₀', 'Angle parcouru par le Soleil entre son lever et son passage au méridien ; cos(H₀) = −tan(φ)·tan(δ) donne la durée du jour 24·H₀/π.'],
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
  table.appendChild(E('caption', '', `Les cinq parallèles remarquables, recalculés depuis ε = ${deg(EPS_REF)} (référence actuelle ≈ 23°26′).`));

  const thead = E('thead');
  const hr = E('tr');
  ['Parallèle', 'Latitude', 'Phénomène'].forEach((h) => {
    const th = E('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = E('tbody');
  const lignes = [
    ['Équateur', '0°', 'Zénith à l’équinoxe (δ = 0).'],
    ['Tropique du Cancer', `+${deg(tropicLat(EPS_REF))}`, 'Limite nord du zénith (δ max).'],
    ['Tropique du Capricorne', `−${deg(tropicLat(EPS_REF))}`, 'Limite sud du zénith (δ min).'],
    ['Cercle arctique', `+${deg(polarLat(EPS_REF))}`, 'Limite du jour polaire boréal.'],
    ['Cercle antarctique', `−${deg(polarLat(EPS_REF))}`, 'Limite de la nuit polaire australe.'],
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
  const wrap = E('section', 'geography-v2-e036-groupe');
  wrap.id = DEFI_ID;
  wrap.appendChild(E('h3', '', 'Défi falsifiable — vérifier la durée du jour'));
  const ol = E('ol');
  const etapes = [
    'Prédiction : à l’équateur, la durée du jour reste-t-elle de 12 h quelle que soit la saison ?',
    'Réglage : placer la latitude à 0° puis parcourir les jours 80, 172 et 355.',
    'Résultat attendu : le readout affiche 12,0 h et un écart de +0,0 h à chaque fois, tandis qu’à 45° le jour 172 donne environ 15,4 h.',
    'Falsification : si le contrôle croisé à l’équateur s’écarte de 12 h de plus de 0,001 h, la formule cos(H₀) = −tan(φ)·tan(δ) est fausse.',
    'Débrief : le tableau statique et le readout dynamique doivent donner les mêmes latitudes ; sinon le dessin est trompeur.',
  ];
  etapes.forEach((t) => ol.appendChild(E('li', '', t)));
  wrap.appendChild(ol);
  return wrap;
}

/* Ligne de curseur : label + lecture numérique + range + saisie numérique. */
function rangeRow(labelText, id, numId, outId, min, max, step, value, aria) {
  const row = E('div', 'geography-v2-e036-curseur');
  const lab = document.createElement('label');
  lab.setAttribute('for', id);
  lab.appendChild(document.createTextNode(labelText + ' : '));
  const out = E('span', 'geography-v2-e036-val');
  out.id = outId;
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

  const num = document.createElement('input');
  num.type = 'number';
  num.id = numId;
  num.min = String(min);
  num.max = String(max);
  num.step = String(step);
  num.value = String(value);
  num.setAttribute('aria-label', aria + ' (saisie numérique)');
  row.appendChild(num);
  return { row, input, num, out };
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: ORDER_ZONE.map((v) => document.getElementById(P + 'zone-' + v)),
      eps: document.getElementById(EPS_ID),
      epsNum: document.getElementById(EPS_NUM_ID),
      epsOut: document.getElementById(EPS_OUT_ID),
      day: document.getElementById(DAY_ID),
      dayNum: document.getElementById(DAY_NUM_ID),
      dayOut: document.getElementById(DAY_OUT_ID),
      lat: document.getElementById(LAT_ID),
      latNum: document.getElementById(LAT_NUM_ID),
      latOut: document.getElementById(LAT_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = E('section', 'geography-v2-e036-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = E('h2', '', 'Tropiques et cercles polaires — géométrie des saisons');
  title.id = TITLE_ID;
  const lead = E('p', '', 'Quatre parallèles remarquables découlent d’un seul nombre : l’obliquité de la Terre. Ce laboratoire V2 relie l’inclinaison de l’axe, la déclinaison du Soleil et la durée du jour à des formules que l’on peut manipuler et vérifier.');

  const fieldset = E('fieldset');
  fieldset.id = ZONE_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Zone de la latitude choisie (choix unique)');
  fieldset.appendChild(E('legend', '', 'Zone de la latitude choisie (choix unique)'));
  ORDER_ZONE.forEach((value) => {
    const lab = E('label', 'geography-v2-e036-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + 'zone';
    radio.id = P + 'zone-' + value;
    radio.value = value;
    radio.checked = S.zone === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(ZONES[value].label));
    fieldset.appendChild(lab);
  });

  const eps = rangeRow('Obliquité ε', EPS_ID, EPS_NUM_ID, EPS_OUT_ID, EPS_MIN, EPS_MAX, 0.1, S.eps, 'Inclinaison de l’axe, de 20 à 27 degrés');
  const day = rangeRow('Jour de l’année N', DAY_ID, DAY_NUM_ID, DAY_OUT_ID, DAY_MIN, DAY_MAX, 1, Math.round(S.day), 'Jour de l’année, de 1 à 365');
  const lat = rangeRow('Latitude φ', LAT_ID, LAT_NUM_ID, LAT_OUT_ID, LAT_MIN, LAT_MAX, 1, S.lat, 'Latitude observée, de moins 90 à plus 90 degrés');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Coupe méridienne de la Terre. Flèches gauche et droite : changer de jour ; flèches haut et bas : changer la latitude ; Page précédente et Page suivante : changer l’obliquité ; Début et Fin : latitude −90 ou +90 degrés.');

  const legendText = E('p', 'geography-v2-e036-legend');
  legendText.id = LEGEND_ID;

  const readout = E('p', 'geography-v2-e036-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = E('button', '', S.playing ? '■ Arrêter l’animation' : '▶ Animer les saisons');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(
    title, lead, staticFacts(), staticGlossary(), staticTable(), fieldset,
    eps.row, day.row, lat.row, canvas, legendText, readout, play, staticDefi(),
  );

  const host = ctx.layout || ctx.stage;
  const cible = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  cible.insertBefore(panel, cible.firstChild);

  return {
    panel, fresh: true,
    radios: ORDER_ZONE.map((v) => document.getElementById(P + 'zone-' + v)),
    eps: eps.input, epsNum: eps.num, epsOut: eps.out,
    day: day.input, dayNum: day.num, dayOut: day.out,
    lat: lat.input, latNum: lat.num, latOut: lat.out,
    canvas, readout, play, legend: legendText,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas, une seule frame) ---------- */

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
  if (!cv || !cv.isConnected || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 230;
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const cx = cssW * 0.54;
  const cy = cssH * 0.46;
  const R = Math.max(20, Math.min(cssW * 0.30, cssH * 0.34));
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
    { lat: polarLat(S.eps), txt: `Cercle +${deg(polarLat(S.eps))}`, dash: DASHES.polaire, color: 'rgba(210,215,225,.95)' },
    { lat: tropicLat(S.eps), txt: `Tropique +${deg(tropicLat(S.eps))}`, dash: DASHES.tropical, color: 'rgba(244,214,158,.95)' },
    { lat: 0, txt: 'Équateur 0°', dash: DASHES.equator, color: 'rgba(255,255,255,.9)' },
    { lat: -tropicLat(S.eps), txt: `Tropique −${deg(tropicLat(S.eps))}`, dash: DASHES.tropical, color: 'rgba(244,214,158,.95)' },
    { lat: -polarLat(S.eps), txt: `Cercle −${deg(polarLat(S.eps))}`, dash: DASHES.polaire, color: 'rgba(210,215,225,.95)' },
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

  /* Cinq latitudes témoines reproductibles (graine fixe) : cercles vides. */
  g.strokeStyle = 'rgba(244,214,158,.75)';
  g.lineWidth = 1.2;
  pointsTemoins().forEach((phi) => {
    const pt = surface(phi);
    g.beginPath();
    g.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
    g.stroke();
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
  g.fillText(`ε = ${deg(S.eps)} · graine ${GRAINE.toString(16)}`, cx + R + 8, cy - R + 2);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const delta = declination(S.day, S.eps);
  const dJour = dayLength(S.lat, delta);
  const dEquateur = dayLength(0, delta);      /* référence = 12 h. */
  const ctrl = controleEquateur(delta);
  const solst = controleSolstices(S.eps);
  const pole = polarLat(S.eps);
  const trop = tropicLat(S.eps);
  const z = zoneOf(S.lat, S.eps);
  const fort = (texte) => E('strong', '', texte);
  const ligne = (texte) => E('span', '', texte);

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

  const l3 = document.createElement('span');
  l3.style.display = 'block';
  l3.appendChild(document.createTextNode(`Contrôle croisé : équateur ${nf(ctrl.jour)} h (écart ${nf(ctrl.ecart, 3)} h, `));
  l3.appendChild(fort(ctrl.ecart < 0.001 ? 'formule vérifiée' : 'formule à rejeter'));
  l3.appendChild(document.createTextNode(`) ; solstices δ(172) = ${deg(solst.dEte)}, δ(355) = ${deg(solst.dHiver)} — `));
  l3.appendChild(fort(solst.valide ? 'cohérents avec ±ε' : 'incohérents'));
  l3.appendChild(document.createTextNode(`. Graine ${GRAINE.toString(16)} : cinq latitudes témoines reproductibles.`));
  n.appendChild(l3);
}

function syncControls() {
  const n = S.nodes;
  (n.radios || []).forEach((radio, i) => {
    if (radio) radio.checked = ORDER_ZONE[i] === S.zone;
  });
  if (n.eps && document.activeElement !== n.eps) n.eps.value = String(S.eps);
  if (n.epsNum && document.activeElement !== n.epsNum) n.epsNum.value = String(S.eps);
  if (n.epsOut) n.epsOut.textContent = deg(S.eps);
  if (n.day && document.activeElement !== n.day) n.day.value = String(Math.round(S.day));
  if (n.dayNum && document.activeElement !== n.dayNum) n.dayNum.value = String(Math.round(S.day));
  if (n.dayOut) n.dayOut.textContent = `N° ${Math.round(S.day)}`;
  if (n.lat && document.activeElement !== n.lat) n.lat.value = String(S.lat);
  if (n.latNum && document.activeElement !== n.latNum) n.latNum.value = String(S.lat);
  if (n.latOut) n.latOut.textContent = deg(S.lat);
  if (n.legend) {
    n.legend.textContent = `Traits : équateur continu, tropiques en tirets, cercles polaires en pointillés ; le losange marque la latitude choisie, le point blanc le zénith, les cercles vides les cinq latitudes témoines (graine ${GRAINE.toString(16)}). Aucune information ne repose sur la seule couleur (zone : ${ZONES[S.zone].label}).`;
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer les saisons';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E036Reduced = S.reduced ? '1' : '0';
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
  const badge = E('div', 'geography-v2-e036-badge', 'Parallèles et durée du jour calculés par formules déterministes (obliquité, déclinaison de Cooper, cosinus de l’angle horaire), sans donnée externe. Coupe schématique non à l’échelle.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E036', (ctx) => {
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
    n.radios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.zone = radio.value;
        S.lat = ZONES[S.zone].lat;
        syncControls();
      });
    });
    n.eps.addEventListener('input', () => {
      S.eps = clamp(Math.round(Number(n.eps.value) * 10) / 10, EPS_MIN, EPS_MAX);
      S.zone = zoneOf(S.lat, S.eps);
      syncControls();
    });
    n.epsNum.addEventListener('change', () => {
      const v = Number(n.epsNum.value);
      if (Number.isFinite(v)) {
        S.eps = clamp(Math.round(v * 10) / 10, EPS_MIN, EPS_MAX);
        S.zone = zoneOf(S.lat, S.eps);
      }
      syncControls();
    });
    n.day.addEventListener('input', () => {
      S.day = clamp(Math.round(Number(n.day.value)), DAY_MIN, DAY_MAX);
      syncControls();
    });
    n.dayNum.addEventListener('change', () => {
      const v = Number(n.dayNum.value);
      if (Number.isFinite(v)) S.day = clamp(Math.round(v), DAY_MIN, DAY_MAX);
      syncControls();
    });
    n.lat.addEventListener('input', () => {
      S.lat = clamp(Math.round(Number(n.lat.value)), LAT_MIN, LAT_MAX);
      S.zone = zoneOf(S.lat, S.eps);
      syncControls();
    });
    n.latNum.addEventListener('change', () => {
      const v = Number(n.latNum.value);
      if (Number.isFinite(v)) {
        S.lat = clamp(Math.round(v), LAT_MIN, LAT_MAX);
        S.zone = zoneOf(S.lat, S.eps);
      }
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
      } else if (event.key === 'Home' || event.key === 'End') {
        S.lat = event.key === 'Home' ? LAT_MIN : LAT_MAX;
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

  installGlobalListeners(ctx);
  startLoop();
});
