import { register } from './registry.js';

/* Lentille E093 — vue GEOGRAPHIE.
 * Thème : distance du grand cercle (formule de haversine) entre lieux.
 *
 * Les dix chantiers E093-01 … E093-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E093.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, listes, libellés) présent dans le DOM même sans
 * animation ; le canvas n'est qu'un laboratoire qui illustre la formule.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e093';
const PANEL_ID = 'geography-e093-panel';
const TITLE_ID = 'geography-e093-title';
const FROM_ID = 'geography-e093-from';
const TO_ID = 'geography-e093-to';
const R_ID = 'geography-e093-radius';
const R_OUT_ID = 'geography-e093-radius-value';
const CANVAS_ID = 'geography-e093-canvas';
const READOUT_ID = 'geography-e093-readout';
const COMPARE_ID = 'geography-e093-compare';
const PLAY_ID = 'geography-e093-play';
const LEGEND_ID = 'geography-e093-legend';
const BADGE_ID = 'geography-e093-badge';
const TABLE_ID = 'geography-e093-table';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/* Rayon moyen de référence (km) : toutes les grandeurs du tableau statique
   sont recalculées avec cette valeur. 2πR ≈ 40 030 km. */
const R_DEFAUT = 6371;
const R_MIN = 6350;
const R_MAX = 6400;

/* Lieux de référence : coordonnées canoniques énoncées, jamais fabriquées.
   latitude positive = nord, longitude positive = est. */
const LIEUX = [
  { id: 'paris', nom: 'Paris', lat: 48.8566, lon: 2.3522 },
  { id: 'lyon', nom: 'Lyon', lat: 45.7640, lon: 4.8357 },
  { id: 'marseille', nom: 'Marseille', lat: 43.2965, lon: 5.3698 },
  { id: 'newyork', nom: 'New York', lat: 40.7128, lon: -74.0060 },
  { id: 'tokyo', nom: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { id: 'sydney', nom: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { id: 'capetown', nom: 'Le Cap', lat: -33.9249, lon: 18.4241 },
  { id: 'reykjavik', nom: 'Reykjavik', lat: 64.1466, lon: -21.9426 },
];

/* Paires du tableau statique (valeurs recalculées par haversine, R = 6371). */
const PAIRES_REFERENCE = [
  ['paris', 'lyon'],
  ['paris', 'newyork'],
  ['paris', 'tokyo'],
  ['paris', 'sydney'],
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  from: 'paris',
  to: 'lyon',
  rayon: R_DEFAUT,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

/* Regroupement français des milliers (espace insécable fine U+202F). */
function grouper(entier) {
  return String(entier).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
}

function fmt(n, d) {
  const digits = d === undefined ? 1 : d;
  const neg = n < 0;
  const parts = Math.abs(n).toFixed(digits).split('.');
  parts[0] = grouper(parts[0]);
  return (neg ? '−' : '') + parts.join(',');
}

function lieuParId(id) {
  return LIEUX.find((p) => p.id === id) || LIEUX[0];
}

/* Angle central δ (radians) par haversine — stable même à faible distance. */
function angleCentral(a, b) {
  const p1 = a.lat * DEG;
  const p2 = b.lat * DEG;
  const dp = p2 - p1;
  const dl = (b.lon - a.lon) * DEG;
  const s = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const h = Math.max(0, Math.min(1, s));
  return 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/* Angle central par la loi des cosinus sphériques (comparaison numérique). */
function angleCosinus(a, b) {
  const p1 = a.lat * DEG;
  const p2 = b.lat * DEG;
  const dl = (b.lon - a.lon) * DEG;
  const c = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl);
  return Math.acos(Math.max(-1, Math.min(1, c)));
}

function mesures(a, b, rayon) {
  const delta = angleCentral(a, b);
  const deltaCos = angleCosinus(a, b);
  return {
    delta,
    distance: rayon * delta,
    distanceCos: rayon * deltaCos,
    ecart: Math.abs(rayon * deltaCos - rayon * delta),
    part: (delta / (2 * Math.PI)) * 100,
    tour: 2 * Math.PI * rayon,
  };
}

/* Coordonnées cartésiennes unitaires d'un lieu (pour l'interpolation slerp). */
function vecteurUnitaire(p) {
  const phi = p.lat * DEG;
  const lam = p.lon * DEG;
  const cp = Math.cos(phi);
  return { x: cp * Math.cos(lam), y: cp * Math.sin(lam), z: Math.sin(phi) };
}

/* Point de l'orthodrome à la fraction t (0 = départ, 1 = arrivée). */
function pointSurArc(a, b, t) {
  const A = vecteurUnitaire(a);
  const B = vecteurUnitaire(b);
  const delta = angleCentral(a, b);
  const sinD = Math.sin(delta);
  if (Math.abs(sinD) < 1e-12 || delta < 1e-12) {
    return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
  }
  const wa = Math.sin((1 - t) * delta) / sinD;
  const wb = Math.sin(t * delta) / sinD;
  const x = wa * A.x + wb * B.x;
  const y = wa * A.y + wb * B.y;
  const z = wa * A.z + wb * B.z;
  return { lat: Math.asin(Math.max(-1, Math.min(1, z))) * RAD, lon: Math.atan2(y, x) * RAD };
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e093-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e093-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e093-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e093-panel p{margin:5px 0;max-width:68ch}
#geography-e093-panel .geography-e093-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e093-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e093-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e093-table th,#geography-e093-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e093-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e093-choix{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
#geography-e093-choix .geography-e093-champ{flex:1 1 150px;display:flex;flex-direction:column;gap:3px}
#geography-e093-choix label{color:var(--muted)}
#geography-e093-from,#geography-e093-to{
  width:100%;min-height:44px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--ink);font:inherit;font-size:11px;
}
#geography-e093-radius{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e093-radius-value{color:var(--gold-bright,#f4d69e);font-variant-numeric:tabular-nums}
#geography-e093-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.22);touch-action:none;
}
#geography-e093-panel .geography-e093-legend{margin:4px 0;color:var(--muted);font-size:10px}
#geography-e093-panel .geography-e093-readout{
  margin:8px 0;padding:7px 9px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);font-variant-numeric:tabular-nums;
}
#geography-e093-panel .geography-e093-compare{margin:6px 0;color:var(--muted);font-size:10px}
#geography-e093-play{
  min-width:44px;min-height:44px;margin-top:4px;padding:6px 12px;
  border:1px solid var(--gold,#e6b96f);border-radius:8px;
  background:transparent;color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
}
#geography-e093-play:hover{background:rgba(230,185,111,.12)}
#geography-e093-from:focus-visible,#geography-e093-to:focus-visible,
#geography-e093-radius:focus-visible,#geography-e093-canvas:focus-visible,
#geography-e093-play:focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e093-badge{
  position:absolute;left:10px;bottom:10px;z-index:3;max-width:60%;
  padding:5px 8px;border:1px solid var(--line);border-radius:7px;
  background:rgba(8,12,18,.86);color:var(--muted);font-size:9px;line-height:1.45;pointer-events:none;
}
@media (max-width:620px){
  #geography-e093-choix{flex-direction:column}
  #geography-e093-canvas{height:200px}
  .geography-e093-badge{max-width:80%;font-size:8px}
}
@media (prefers-reduced-motion:reduce){
  #geography-e093-panel *{transition:none!important;animation:none!important}
}
`;

/* ---------- Contenu sémantique statique (lisible sans JS) ---------- */

function staticFacts(ctx) {
  const frag = document.createDocumentFragment();

  const lede = ctx.el('p', '',
    'Sur une sphère, le chemin le plus court entre deux lieux suit un grand cercle. '
    + 'La formule de haversine donne la longueur de cet arc à partir des seules latitudes '
    + 'et longitudes des deux points et d’un rayon choisi. Aucune tuile ni mesure terrain n’est nécessaire.');

  const faits = [
    'Un grand cercle est l’intersection de la sphère avec un plan passant par son centre : '
    + 'l’équateur et tous les méridiens en sont des exemples. L’arc de grand cercle entre deux '
    + 'points réalise la distance minimale à la surface.',
    'La haversine s’écrit a = sin²(Δφ/2) + cos φ₁ · cos φ₂ · sin²(Δλ/2), puis δ = 2 · atan2(√a, √1−a) '
    + 'et d = R · δ. Le carré du sinus half-angle reste stable quand les deux lieux sont très proches.',
    'Le résultat dépend du rayon R retenu : 6 371 km est le rayon moyen, 6 357 km le rayon polaire '
    + 'et 6 378 km le rayon équatorial. La Terre étant aplatie, la haversine donne un ordre de grandeur, '
    + 'pas une mesure géodésique.',
  ];

  frag.appendChild(lede);
  faits.forEach((texte) => {
    frag.appendChild(ctx.el('p', 'geography-e093-fait', texte));
  });
  return frag;
}

function staticTable(ctx) {
  const table = ctx.el('table');
  table.id = TABLE_ID;
  const caption = ctx.el('caption', '',
    'Distances du grand cercle depuis Paris, calculées par haversine avec R = 6 371 km '
    + '(tour de Terre théorique 2πR ≈ 40 030 km).');
  table.appendChild(caption);

  const thead = ctx.el('thead');
  const headRow = ctx.el('tr');
  ['Trajets', 'Distance (km)', 'Angle central δ', 'Part du tour de Terre'].forEach((t) => {
    headRow.appendChild(ctx.el('th', '', t));
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = ctx.el('tbody');
  PAIRES_REFERENCE.forEach(([idA, idB]) => {
    const a = lieuParId(idA);
    const b = lieuParId(idB);
    const m = mesures(a, b, R_DEFAUT);
    const row = ctx.el('tr');
    [a.nom + ' → ' + b.nom, fmt(m.distance, 0) + ' km',
      fmt(m.delta * RAD, 2) + '°', fmt(m.part, 2) + ' %'].forEach((t) => {
      row.appendChild(ctx.el('td', '', t));
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- Construction du panneau ---------- */

function ensurePanel(ctx) {
  const deja = document.getElementById(PANEL_ID);
  if (deja) {
    return {
      panel: deja, fresh: false,
      from: document.getElementById(FROM_ID),
      to: document.getElementById(TO_ID),
      rayon: document.getElementById(R_ID),
      rayonOut: document.getElementById(R_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      compare: document.getElementById(COMPARE_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', '');
  panel.id = PANEL_ID;

  const title = ctx.el('h2', '', 'Distance grand cercle — la formule de haversine');
  title.id = TITLE_ID;
  panel.appendChild(title);
  panel.appendChild(staticFacts(ctx));
  panel.appendChild(staticTable(ctx));

  const h3 = ctx.el('h3', '', 'Laboratoire : deux lieux, un rayon, un arc');
  panel.appendChild(h3);

  /* Deux listes déroulantes = deux choix uniques natifs, sans aria-pressed. */
  const choix = ctx.el('div');
  choix.id = 'geography-e093-choix';
  const champFrom = ctx.el('div', 'geography-e093-champ');
  const labelFrom = document.createElement('label');
  labelFrom.setAttribute('for', FROM_ID);
  labelFrom.textContent = 'Lieu de départ';
  const from = document.createElement('select');
  from.id = FROM_ID;
  LIEUX.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nom + ' (' + fmt(p.lat, 4) + '°, ' + fmt(p.lon, 4) + '°)';
    from.appendChild(opt);
  });
  champFrom.append(labelFrom, from);

  const champTo = ctx.el('div', 'geography-e093-champ');
  const labelTo = document.createElement('label');
  labelTo.setAttribute('for', TO_ID);
  labelTo.textContent = 'Lieu d’arrivée';
  const to = document.createElement('select');
  to.id = TO_ID;
  LIEUX.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nom + ' (' + fmt(p.lat, 4) + '°, ' + fmt(p.lon, 4) + '°)';
    to.appendChild(opt);
  });
  champTo.append(labelTo, to);
  choix.append(champFrom, champTo);
  panel.appendChild(choix);

  /* Curseur de rayon : la distance est proportionnelle à R. */
  const rayonRow = ctx.el('p', '');
  const rayonLabel = document.createElement('label');
  rayonLabel.setAttribute('for', R_ID);
  rayonLabel.appendChild(document.createTextNode('Rayon R utilisé : '));
  const rayonOut = document.createElement('span');
  rayonOut.id = R_OUT_ID;
  rayonLabel.appendChild(rayonOut);
  rayonRow.appendChild(rayonLabel);
  panel.appendChild(rayonRow);

  const rayon = document.createElement('input');
  rayon.type = 'range';
  rayon.id = R_ID;
  rayon.min = String(R_MIN);
  rayon.max = String(R_MAX);
  rayon.step = '1';
  rayon.value = String(S.rayon);
  rayon.setAttribute('aria-label', 'Rayon de la Terre en kilomètres, de 6 350 à 6 400');
  panel.appendChild(rayon);

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Orthodrome tracée sur une grille équirectangulaire. Flèches gauche et droite : changer le lieu d’arrivée ; flèches haut et bas : ajuster le rayon.');
  panel.appendChild(canvas);

  const legend = ctx.el('p', 'geography-e093-legend',
    'Trait tireté = arc de grand cercle ; croix = extrémités ; cercle plein = voyageur. '
    + 'Aucune information n’est portée par la seule couleur.');
  legend.id = LEGEND_ID;
  panel.appendChild(legend);

  const readout = ctx.el('p', 'geography-e093-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  panel.appendChild(readout);

  const compare = ctx.el('p', 'geography-e093-compare');
  compare.id = COMPARE_ID;
  panel.appendChild(compare);

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le voyage' : '▶ Animer le voyage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  panel.appendChild(play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true, from, to, rayon, rayonOut, canvas,
    readout, compare, play, legend,
  };
}

/* ---------- Laboratoire canvas (un seul canvas, DPR ≤ 2) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 230;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 14;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const toPx = (p) => [pad + ((p.lon + 180) / 360) * iw, pad + ((90 - p.lat) / 180) * ih];

  /* Graticule équirectangulaire rectangulaire : repère de lecture. */
  g.strokeStyle = 'rgba(255,255,255,.14)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);
  g.beginPath();
  for (let lon = -180; lon <= 180; lon += 60) {
    const [x] = toPx({ lon, lat: 0 });
    g.moveTo(x, pad); g.lineTo(x, pad + ih);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = toPx({ lon: 0, lat });
    g.moveTo(pad, y); g.lineTo(pad + iw, y);
  }
  g.stroke();

  const a = lieuParId(S.from);
  const b = lieuParId(S.to);

  /* Orthodrome : on échantillonne l'interpolation sphérique, pas une droite. */
  g.setLineDash([7, 5]);
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.beginPath();
  const steps = 72;
  for (let i = 0; i <= steps; i += 1) {
    const [x, y] = toPx(pointSurArc(a, b, i / steps));
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
  g.setLineDash([]);

  /* Extrémités : croix + cercle, distinctes même en niveaux de gris. */
  [a, b].forEach((p, index) => {
    const [x, y] = toPx(p);
    g.strokeStyle = 'rgba(255,255,255,.95)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x - 6, y); g.lineTo(x + 6, y);
    g.moveTo(x, y - 6); g.lineTo(x, y + 6);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.font = '10px sans-serif';
    g.fillText(p.nom, x + 8, y - 6 - index * 0);
  });

  /* Voyageur : position déterministe = f(S.sweep), jamais aléatoire. */
  const t = Math.max(0, Math.min(1, S.sweep));
  const [vx, vy] = toPx(pointSurArc(a, b, t));
  g.fillStyle = 'rgba(230,185,111,.95)';
  g.beginPath();
  g.arc(vx, vy, 4.5, 0, 2 * Math.PI);
  g.fill();

  g.fillStyle = 'rgba(214,207,193,.8)';
  g.font = '10px sans-serif';
  g.fillText('Arc de grand cercle · R = ' + fmt(S.rayon, 0) + ' km', pad + 2, cssH - pad - 4);
}

/* ---------- Readout chiffré et comparaison numérique ---------- */

function updateReadout() {
  const a = lieuParId(S.from);
  const b = lieuParId(S.to);
  const m = mesures(a, b, S.rayon);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };

  const n = S.nodes.readout;
  if (n) {
    n.textContent = '';
    n.appendChild(document.createTextNode(a.nom + ' → ' + b.nom + ' · distance grand cercle '));
    n.appendChild(fort(fmt(m.distance, 1) + ' km'));
    n.appendChild(document.createTextNode(' (R = ' + fmt(S.rayon, 0) + ' km) ; angle central δ = '));
    n.appendChild(fort(fmt(m.delta * RAD, 2) + '°'));
    n.appendChild(document.createTextNode(' ; soit '));
    n.appendChild(fort(fmt(m.part, 2) + ' %'));
    n.appendChild(document.createTextNode(' du tour de Terre théorique ' + fmt(m.tour, 0) + ' km. '
      + 'La distance est proportionnelle à R : doubler R double d.'));
  }

  const c = S.nodes.compare;
  if (c) {
    c.textContent = 'Contrôle de cohérence — loi des cosinus sphériques : '
      + fmt(m.distanceCos, 1) + ' km ; écart avec la haversine : '
      + fmt(m.ecart * 1000, 2) + ' m. Les deux formules concordent ; la haversine reste '
      + 'mieux conditionnée quand les deux lieux sont très proches (sinus half-angle).';
  }
}

function syncControls() {
  const n = S.nodes;
  if (n.from) n.from.value = S.from;
  if (n.to) n.to.value = S.to;
  if (n.rayon) n.rayon.value = String(S.rayon);
  if (n.rayonOut) n.rayonOut.textContent = fmt(S.rayon, 0) + ' km (moyen : 6 371 km)';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le voyage' : '▶ Animer le voyage';
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
  const reduced = typeof ctxReducedMotion === 'function' ? !!ctxReducedMotion() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00018) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

let ctxReducedMotion = null;

function installGlobalListeners(ctx) {
  ctxReducedMotion = ctx.reducedMotion;
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
        if (panel) panel.dataset.geographyE093Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
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
  const badge = ctx.el('div', 'geography-e093-badge',
    'Les distances annoncées suivent l’arc de grand cercle (haversine, R = 6 371 km), '
    + 'pas une ligne droite tracée sur la carte schématique.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E093', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE093Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.from.addEventListener('change', () => { S.from = n.from.value; syncControls(); });
    n.to.addEventListener('change', () => { S.to = n.to.value; syncControls(); });
    n.rayon.addEventListener('input', () => {
      S.rayon = Math.max(R_MIN, Math.min(R_MAX, Math.round(Number(n.rayon.value))));
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
        const i = LIEUX.findIndex((p) => p.id === S.to);
        S.to = LIEUX[(i + step + LIEUX.length) % LIEUX.length].id;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 1 : -1;
        S.rayon = Math.max(R_MIN, Math.min(R_MAX, S.rayon + step));
      } else if (event.key === 'Home') {
        S.to = LIEUX[0].id;
      } else if (event.key === 'End') {
        S.to = LIEUX[LIEUX.length - 1].id;
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
