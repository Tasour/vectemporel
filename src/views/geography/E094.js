import { register } from './registry.js';

/* Lentille E094 — vue GEOGRAPHIE.
 * Thème : itinéraires et chemins entre lieux.
 *
 * Les dix chantiers E094-01 … E094-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E094.md. Les dix sont réellement implémentés.
 *
 * Tout est local : aucune requête réseau, aucune graine aléatoire, aucune
 * console, aucun fichier partagé modifié. Le contenu pédagogique est du texte
 * sémantique réel (titres, paragraphes, tableau,fieldset, étiquettes) présent
 * dans le DOM : il reste lisible et indexable sans animation ni interaction.
 * Le canvas n'est qu'un laboratoire : toutes les longueurs qu'il illustre sont
 * recalculées par des formules deterministes et écrites en toutes lettres dans
 * un paragraphe role="status" aria-live="polite" et dans un tableau statique.
 *
 * Les deux repères A et B du laboratoire sont des points SCHÉMATIQUES définis
 * par leur latitude et longitude ; ils ne désignent aucun lieu réel du jeu de
 * données (aucune coordonnée n'est inventée ni attribuée à un lieu existant).
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e094';
const PANEL_ID = 'geography-e094-panel';
const TITLE_ID = 'geography-e094-title';
const PATH_FIELD_ID = 'geography-e094-path-field';
const LAT_ID = 'geography-e094-lat';
const LON_ID = 'geography-e094-lon';
const LAT_OUT_ID = 'geography-e094-lat-value';
const LON_OUT_ID = 'geography-e094-lon-value';
const CANVAS_ID = 'geography-e094-canvas';
const READOUT_ID = 'geography-e094-readout';
const PLAY_ID = 'geography-e094-play';
const LEGEND_ID = 'geography-e094-legend';
const BADGE_ID = 'geography-e094-badge';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
/* Rayon de référence de la sphère, en kilomètres (grandeur explicitée). */
const R = 6371;

const PATHS = {
  ortho: 'Orthodromie (grand cercle)',
  loxo: 'Loxodromie (cap constant)',
  deux: 'Chemin en deux temps',
};
const DASHES = { ortho: [], loxo: [7, 5], deux: [2, 4] };
const ORDER = ['ortho', 'loxo', 'deux'];
const LAT_MAX = 60;
const LON_MAX = 80;

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  path: 'ortho',
  lat: 40,
  lon: 60,
  playing: false,
  t: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules deterministes (aucune donnée fabriquée) ---------- */

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

/* Groupe les milliers par une espace simple, sans dépendre d'une locale. */
function km(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* Paramètre méridien de Mercator : psi(phi) = ln(tan(pi/4 + phi/2)). */
function psi(phiRad) {
  return Math.log(Math.tan(Math.PI / 4 + phiRad / 2));
}

function phiFromPsi(p) {
  return (2 * Math.atan(Math.exp(p)) - Math.PI / 2) * DEG;
}

function unitVec(latRad, lonRad) {
  const c = Math.cos(latRad);
  return [c * Math.cos(lonRad), c * Math.sin(lonRad), Math.sin(latRad)];
}

/* Longueurs des trois tracés entre A(0°,0°) et B(lat,lon), en km. */
function distances(latDeg, lonDeg) {
  const phi2 = latDeg * RAD;
  const lam2 = lonDeg * RAD;
  const hav = Math.sin(phi2 / 2) ** 2 + Math.cos(phi2) * Math.sin(lam2 / 2) ** 2;
  const ortho = 2 * R * Math.asin(clamp(Math.sqrt(hav), 0, 1));

  const dpsi = psi(phi2);
  let loxo;
  if (Math.abs(phi2) < 1e-9) {
    /* Trajet est-ouest le long d'un parallèle. */
    loxo = R * Math.cos(phi2) * Math.abs(lam2);
  } else {
    /* Cap constant theta : tan(theta) = dlambda / dpsi,
       d = R * |dphi| / cos(theta). */
    loxo = R * Math.abs(phi2) * Math.sqrt(dpsi * dpsi + lam2 * lam2) / Math.abs(dpsi);
  }

  /* Méridien depuis A jusqu'à la latitude de B, puis parallèle jusqu'à B. */
  const deux = R * Math.abs(phi2) + R * Math.cos(phi2) * Math.abs(lam2);
  return { ortho, loxo, deux };
}

/* Points (latitude, longitude) d'un tracé, échantillonnés deterministement. */
function pathPoints(path, latDeg, lonDeg, count) {
  const n = Math.max(2, count);
  const out = [];
  if (path === 'loxo') {
    const dpsi = psi(latDeg * RAD);
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      out.push({ lat: phiFromPsi(dpsi * t), lon: lonDeg * t });
    }
    return out;
  }
  if (path === 'deux') {
    const half = Math.floor(n / 2);
    for (let i = 0; i <= half; i += 1) out.push({ lat: (latDeg * i) / half, lon: 0 });
    const rest = n - half;
    for (let j = 1; j <= rest; j += 1) out.push({ lat: latDeg, lon: (lonDeg * j) / rest });
    return out;
  }
  /* Orthodromie : interpolation linéaire des vecteurs unitaires (slerp). */
  const v1 = unitVec(0, 0);
  const v2 = unitVec(latDeg * RAD, lonDeg * RAD);
  const dot = clamp(v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2], -1, 1);
  const delta = Math.acos(dot);
  if (delta < 1e-9) return [{ lat: 0, lon: 0 }];
  const s = Math.sin(delta);
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const a = Math.sin((1 - t) * delta) / s;
    const b = Math.sin(t * delta) / s;
    const x = a * v1[0] + b * v2[0];
    const y = a * v1[1] + b * v2[1];
    const z = a * v1[2] + b * v2[2];
    out.push({ lat: Math.asin(clamp(z, -1, 1)) * DEG, lon: Math.atan2(y, x) * DEG });
  }
  return out;
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e094-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e094-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e094-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e094-panel p{margin:5px 0;max-width:68ch}
#geography-e094-panel .geography-e094-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e094-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e094-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e094-table th,#geography-e094-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e094-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e094-path-field{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e094-path-field legend{padding:0 4px;color:var(--muted)}
#geography-e094-panel .geography-e094-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e094-panel .geography-e094-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#geography-e094-panel .geography-e094-curseur{margin:6px 0}
#geography-e094-panel .geography-e094-curseur label{display:block;color:var(--muted)}
#geography-e094-lat,#geography-e094-lon{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.geography-e094-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e094-canvas{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e094-legend{font-size:10px;color:var(--muted)}
#geography-e094-readout{
  min-height:44px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e094-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e094-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e094-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e094-panel button:disabled{opacity:.5;cursor:not-allowed;border-color:var(--line);background:rgba(255,255,255,.02)}
#geography-e094-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e094-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e094-panel[data-geography-e094-reduced="1"] button,
#geography-e094-panel[data-geography-e094-reduced="1"] .geography-e094-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e094-panel button,.geography-e094-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e094-panel{font-size:10px;padding:9px}
  #geography-e094-canvas{height:200px}
  #geography-e094-panel .geography-e094-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un itinéraire est une suite ordonnée de lieux reliés par des segments : sa longueur totale est la somme des longueurs des segments, et chaque segment relie deux points déterminés.',
    'Sur une sphère, le plus court chemin entre deux points suit un grand cercle : c’est l’orthodromie. On calcule sa longueur avec la formule de l’haversine, à partir des latitudes et des différences de longitude.',
    'La loxodromie garde un cap constant : elle apparaît droite sur une carte de Mercator mais n’est pas le plus court chemin. Un chemin en deux temps (d’abord un méridien, puis un parallèle) est plus long encore : l’écart mesure le coût du détour.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e094-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = 'geography-e094-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Échelles de distance sur la sphère de référence (rayon 6 371 km).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Formule', 'Valeur de référence'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const unDegLat = (R * Math.PI) / 180;
  const unDegLon45 = (R * Math.cos(45 * RAD) * Math.PI) / 180;
  const tour45 = 2 * Math.PI * R * Math.cos(45 * RAD);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['1° de latitude', 'R · π/180', `≈ ${fmt(unDegLat)} km`],
    ['1° de longitude à l’équateur', 'R · cos(0°) · π/180', `≈ ${fmt(unDegLat)} km`],
    ['1° de longitude à 45°', 'R · cos(45°) · π/180', `≈ ${fmt(unDegLon45)} km`],
    ['Tour du parallèle à 45°', '2π · R · cos(45°)', `≈ ${km(tour45)} km`],
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

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      ortho: document.getElementById('geography-e094-path-ortho'),
      loxo: document.getElementById('geography-e094-path-loxo'),
      deux: document.getElementById('geography-e094-path-deux'),
      lat: document.getElementById(LAT_ID),
      lon: document.getElementById(LON_ID),
      latOut: document.getElementById(LAT_OUT_ID),
      lonOut: document.getElementById(LON_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e094-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Itinéraires et chemins entre lieux');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Comparer trois façons de relier deux repères — l’orthodromie, la loxodromie et un chemin en deux temps — montre que le « plus court chemin » dépend de la contrainte que l’on impose au trajet.');
  const caveat = ctx.el('p', '', 'Les deux repères A et B du laboratoire sont des points schématiques définis par leur latitude et leur longitude ; ils ne désignent aucun lieu réel du jeu de données.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = PATH_FIELD_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Type de tracé entre A et B (choix unique)';
  fieldset.appendChild(legend);
  ORDER.forEach((value) => {
    const lab = ctx.el('label', 'geography-e094-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e094-path';
    radio.id = `geography-e094-path-${value}`;
    radio.value = value;
    radio.checked = S.path === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(PATHS[value]));
    fieldset.appendChild(lab);
  });

  const sub = ctx.el('h3', '', 'Placer le repère B');

  const latRow = ctx.el('p', 'geography-e094-curseur');
  const latLabel = document.createElement('label');
  latLabel.setAttribute('for', LAT_ID);
  latLabel.appendChild(document.createTextNode('Latitude de B : '));
  const latOut = document.createElement('span');
  latOut.id = LAT_OUT_ID;
  latOut.className = 'geography-e094-valeur';
  latLabel.appendChild(latOut);
  latRow.appendChild(latLabel);
  const lat = document.createElement('input');
  lat.type = 'range';
  lat.id = LAT_ID;
  lat.min = '0';
  lat.max = String(LAT_MAX);
  lat.step = '5';
  lat.value = String(S.lat);
  lat.setAttribute('aria-label', 'Latitude du repère B, de 0 à 60 degrés');

  const lonRow = ctx.el('p', 'geography-e094-curseur');
  const lonLabel = document.createElement('label');
  lonLabel.setAttribute('for', LON_ID);
  lonLabel.appendChild(document.createTextNode('Écart en longitude de B : '));
  const lonOut = document.createElement('span');
  lonOut.id = LON_OUT_ID;
  lonOut.className = 'geography-e094-valeur';
  lonLabel.appendChild(lonOut);
  lonRow.appendChild(lonLabel);
  const lon = document.createElement('input');
  lon.type = 'range';
  lon.id = LON_ID;
  lon.min = '0';
  lon.max = String(LON_MAX);
  lon.step = '5';
  lon.value = String(S.lon);
  lon.setAttribute('aria-label', 'Écart en longitude du repère B, de 0 à 80 degrés');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Croquis des trois tracés entre le repère A et le repère B. Flèche gauche ou droite : changer de type de tracé. Flèche haut ou bas : ajuster la latitude de B. Page précédente ou page suivante : ajuster l’écart en longitude de B. Entrée ou espace : lancer ou arrêter le parcours.');

  const legendText = ctx.el('p', 'geography-e094-legend', 'Traits : plein = orthodromie, tirets = loxodromie, pointillés = chemin en deux temps. Carré = A (départ), losange = B (arrivée), disque = parcours en cours ; la forme distingue les repères, pas la couleur.');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e094-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le parcours' : '▶ Animer le parcours');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, caveat, staticFacts(), staticTable(), fieldset, sub, latRow, lat, lonRow, lon, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    ortho: document.getElementById('geography-e094-path-ortho'),
    loxo: document.getElementById('geography-e094-path-loxo'),
    deux: document.getElementById('geography-e094-path-deux'),
    lat, lon, latOut, lonOut, canvas, readout, play, legend: legendText,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas, un seul dessin/frame) ---------- */

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

  const pad = 18;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const toPx = (p) => [pad + (p.lon / LON_MAX) * iw, pad + (1 - p.lat / LAT_MAX) * ih];

  /* Graticule schématique : repères de latitude et de longitude. */
  g.strokeStyle = 'rgba(255,255,255,.12)';
  g.lineWidth = 1;
  g.setLineDash([]);
  for (let lam = 0; lam <= LON_MAX; lam += 20) {
    const [x] = toPx({ lat: 0, lon: lam });
    g.beginPath(); g.moveTo(x, pad); g.lineTo(x, pad + ih); g.stroke();
  }
  for (let phi = 0; phi <= LAT_MAX; phi += 15) {
    const [, y] = toPx({ lat: phi, lon: 0 });
    g.beginPath(); g.moveTo(pad, y); g.lineTo(pad + iw, y); g.stroke();
  }
  g.strokeRect(pad, pad, iw, ih);

  /* Les trois tracés, du plus « neutre » au plus « détourné ». */
  ORDER.forEach((key) => {
    const pts = pathPoints(key, S.lat, S.lon, 96);
    const selected = key === S.path;
    g.setLineDash(selected ? [] : (DASHES[key] || []));
    g.strokeStyle = selected ? 'rgba(244,214,158,.98)' : 'rgba(214,207,193,.42)';
    g.lineWidth = selected ? 2.4 : 1.2;
    g.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = toPx(p);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    });
    g.stroke();
  });
  g.setLineDash([]);

  /* Repères A (carré) et B (losange) : formes, pas couleurs. */
  const [ax, ay] = toPx({ lat: 0, lon: 0 });
  const [bx, by] = toPx({ lat: S.lat, lon: S.lon });
  g.fillStyle = 'rgba(244,214,158,.98)';
  g.fillRect(ax - 4, ay - 4, 8, 8);
  g.beginPath();
  g.moveTo(bx, by - 5); g.lineTo(bx + 5, by); g.lineTo(bx, by + 5); g.lineTo(bx - 5, by);
  g.closePath(); g.fill();
  g.font = '11px sans-serif';
  g.fillText('A', ax + 7, ay - 6);
  g.fillText('B', bx + 7, by - 6);

  /* Disque mobile sur le tracé sélectionné : position deterministe = f(S.t). */
  const pts = pathPoints(S.path, S.lat, S.lon, 96);
  const idx = clamp(Math.floor(S.t * (pts.length - 1)), 0, pts.length - 1);
  const [mx, my] = toPx(pts[idx]);
  g.beginPath(); g.arc(mx, my, 4.5, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(mx - 7, my); g.lineTo(mx + 7, my);
  g.moveTo(mx, my - 7); g.lineTo(mx, my + 7); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1; g.stroke();

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(PATHS[S.path], pad + 2, pad + 13);
  g.fillText(`B : ${S.lat}° N, ${S.lon}° E (schématique)`, pad + 2, cssH - pad - 4);
}

function updateReadout() {
  const d = distances(S.lat, S.lon);
  const n = S.nodes.readout;
  if (!n) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const facteur = (v) => v > 0 ? v / d.ortho : 1;
  n.textContent = '';
  n.appendChild(document.createTextNode(`De A (0°, 0°) à B (${S.lat}° N, ${S.lon}° E), sur une sphère de rayon 6 371 km — `));
  n.appendChild(document.createTextNode('référence orthodromique 1,00 = '));
  n.appendChild(fort(`${km(d.ortho)} km`));
  n.appendChild(document.createTextNode(' ; loxodromie '));
  n.appendChild(fort(`${km(d.loxo)} km (${fmt(facteur(d.loxo))}×)`));
  n.appendChild(document.createTextNode(' ; chemin en deux temps '));
  n.appendChild(fort(`${km(d.deux)} km (${fmt(facteur(d.deux))}×)`));
  n.appendChild(document.createTextNode('. Le cap constant et le chemin en deux temps allongent le trajet : l’orthodromie reste le plus court.'));
}

function syncControls() {
  const n = S.nodes;
  /* Une préférence de mouvement réduit active interdit toute lecture : on
     normalise l'état ici pour que le libellé et aria-pressed restent vrais. */
  const reduced = reducedNow();
  if (reduced) S.playing = false;
  if (n.ortho) n.ortho.checked = S.path === 'ortho';
  if (n.loxo) n.loxo.checked = S.path === 'loxo';
  if (n.deux) n.deux.checked = S.path === 'deux';
  if (n.lat) n.lat.value = String(S.lat);
  if (n.lon) n.lon.value = String(S.lon);
  if (n.latOut) n.latOut.textContent = `${S.lat}°`;
  if (n.lonOut) n.lonOut.textContent = `${S.lon}°`;
  if (n.play) {
    n.play.disabled = reduced;
    n.play.textContent = reduced
      ? '▣ Mouvement réduit — parcours désactivé'
      : (S.playing ? '■ Arrêter le parcours' : '▶ Animer le parcours');
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
    n.play.title = reduced
      ? 'Le parcours animé est désactivé par la préférence de mouvement réduit.'
      : '';
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
  if (reducedNow()) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  const reduced = reducedNow();
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.t = (S.t + dt * 0.00022) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

/* Source de vérité de la préférence de mouvement, mémorisée à l'entrée. */
let reducedSource = () => false;
function ctxReduced() { return reducedSource(); }
/* Accès normalisé (toujours booléen) utilisé par les commandes et la boucle. */
function reducedNow() { return !!ctxReduced(); }

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
        if (panel) panel.dataset.geographyE094Reduced = mq.matches ? '1' : '0';
        if (mq.matches) { S.playing = false; stopLoop(); syncControls(); }
        else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- Annotation du chemin chronologique déjà présent sur la carte ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e094-badge', 'Le trait ┄ de la carte relie les lieux par année : c’est un itinéraire chronologique, pas un itinéraire géographique le plus court.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E094', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  reducedSource = () => {
    if (typeof ctx.reducedMotion === 'function') return !!ctx.reducedMotion();
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
      catch { return false; }
    }
    return false;
  };

  const reduced = !!reducedSource();
  S.nodes.panel.dataset.geographyE094Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.ortho, n.loxo, n.deux].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.path = radio.value;
        syncControls();
      });
    });
    n.lat.addEventListener('input', () => {
      S.lat = clamp(Math.round(Number(n.lat.value) / 5) * 5, 0, LAT_MAX);
      syncControls();
    });
    n.lon.addEventListener('input', () => {
      S.lon = clamp(Math.round(Number(n.lon.value) / 5) * 5, 0, LON_MAX);
      syncControls();
    });
    n.play.addEventListener('click', () => {
      if (reducedNow()) return;
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = ORDER.indexOf(S.path);
        S.path = ORDER[(i + step + ORDER.length) % ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 5 : -5;
        S.lat = clamp(S.lat + step, 0, LAT_MAX);
      } else if (event.key === 'PageUp' || event.key === 'PageDown') {
        const step = event.key === 'PageUp' ? 5 : -5;
        S.lon = clamp(S.lon + step, 0, LON_MAX);
      } else if (event.key === 'Enter' || event.key === ' ') {
        if (!reducedNow()) {
          S.playing = !S.playing;
          if (!S.playing) stopLoop(); else startLoop();
        }
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
