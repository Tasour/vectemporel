import { register } from './registry.js';

/* Lentille E094 (V2) — vue GEOGRAPHIE.
 * Thème : itinéraires et chemins entre lieux — orthodromie, loxodromie,
 * chemin en deux temps.
 *
 * Les dix chantiers E094-01 … E094-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E094.md et réellement implémentés ici :
 * aucun stub, aucune fonction vide. Tout est local : aucune requête réseau,
 * aucune graine aléatoire, aucune sortie de débogage, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, listes, radiogroupe, défi) présent dans le DOM même
 * sans animation ni interaction ; le canvas n'est qu'un laboratoire qui
 * illustre des formules déterministes.
 *
 * Les deux repères A et B sont des points SCHÉMATIQUES définis par leur
 * latitude et leur longitude : ils ne désignent aucun lieu réel du jeu de
 * données (aucune coordonnée n'est inventée ni attribuée à un lieu existant).
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e094- (identifiants, classes, attributs et
 * bloc CSS) : aucune collision avec la passe 1.
 */

const P = 'geography-v2-e094';

/* Identifiants, tous préfixés geography-v2-e094-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const FAITS_ID = P + '-faits';
const TABLE_ID = P + '-table';
const PATHSET_ID = P + '-pathset';
const PATH_PREFIX = P + '-path-';
const LAT_ID = P + '-lat';
const LON_ID = P + '-lon';
const LAT_OUT_ID = P + '-lat-value';
const LON_OUT_ID = P + '-lon-value';
const CANVAS_ID = P + '-canvas';
const LEGEND_ID = P + '-legend';
const READOUT_ID = P + '-readout';
const MESURES_ID = P + '-mesures';
const CLAVIER_ID = P + '-clavier';
const PLAY_ID = P + '-play';
const RESET_ID = P + '-reset';
const DEFI_ID = P + '-defi';
const DEBRIEF_ID = P + '-debrief';
const DEBRIEF_BTN_ID = P + '-debrief-btn';
const MAP_BADGE_ID = P + '-map-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

const NARROW = '\u202f'; // espace fine (milliers)
const MINUS = '\u2212';  // signe moins typographique
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
/* Rayon de référence de la sphère, en kilomètres (grandeur explicitée). */
const R = 6371;
const VITESSE = 0.00022; // fraction du tracé parcourue par milliseconde

const PATHS = {
  ortho: 'Orthodromie (grand cercle)',
  loxo: 'Loxodromie (cap constant)',
  deux: 'Chemin en deux temps',
};
const DASHES = { ortho: [], loxo: [7, 5], deux: [2, 4] };
const ORDER = ['ortho', 'loxo', 'deux'];
const LAT_MAX = 60;
const LON_MAX = 80;

/* État de module : survit au vidage du `stage` par la coque. */
const S = {
  path: 'ortho',
  lat: 40,
  lon: 60,
  playing: false,
  t: 0,
  lastTs: 0,
  rafId: 0,
  onScreen: true,
  visibilityBound: false,
  motionBound: false,
  io: null,
  ioCanvas: null,
  readoutText: '',
  nodes: {},
};

/* ---------- Formules déterministes (E094-05) ---------- */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

/* Groupe les milliers par une espace fine, sans dépendre d'une locale. */
function km(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
}

function num(n, digits = 2) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  const fixed = Math.abs(n).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${n < 0 ? MINUS : ''}${grouped}${parts[1] ? ',' + parts[1] : ''}`;
}

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
  if (Math.abs(lam2) < 1e-9) {
    /* Même méridien : les trois tracés coïncident. */
    loxo = R * Math.abs(phi2);
  } else if (Math.abs(phi2) < 1e-9) {
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

/* Points (latitude, longitude) d'un tracé, échantillonnés déterministement. */
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

/* Valeurs de référence recalculées une seule fois depuis les formules. */
const DEMO = (() => {
  const d = distances(40, 60);
  return {
    d,
    lat: 40,
    lon: 60,
    unDegLat: (R * Math.PI) / 180,
    unDegLon45: (R * Math.cos(45 * RAD) * Math.PI) / 180,
    tour45: 2 * Math.PI * R * Math.cos(45 * RAD),
    meridien40: R * 40 * RAD,
    ecartLoxo: d.loxo - d.ortho,
    ecartDeux: d.deux - d.ortho,
    facteurLoxo: d.loxo / d.ortho,
    facteurDeux: d.deux / d.ortho,
  };
})();

/* ---------- E094-01 : faits sourcés, texte sémantique lisible sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  wrap.id = FAITS_ID;
  const faits = [
    'Un itinéraire est une suite ordonnée de lieux reliés par des segments : sa longueur totale est la somme des longueurs des segments, et chaque segment relie deux points déterminés. Sur une sphère, plusieurs tracés peuvent relier les mêmes points sans avoir la même longueur.',
    'Le plus court chemin entre deux points de la sphère suit un grand cercle : c’est l’orthodromie. On calcule sa longueur avec la formule de l’haversine, à partir des latitudes et des différences de longitude, avec un rayon de référence R = 6 371 km.',
    'La loxodromie garde un cap constant : elle apparaît droite sur une carte de Mercator mais n’est pas le plus court chemin. Un chemin en deux temps (d’abord un méridien, puis un parallèle) est plus long encore : l’écart mesure le coût du détour. (Référence : géodésie élémentaire.)',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  const note = document.createElement('p');
  note.className = P + '-note';
  note.textContent = 'Les repères A (0°, 0°) et B du laboratoire sont des points schématiques définis par leur latitude et leur longitude ; ils ne désignent aucun lieu réel du jeu de données. Aucune coordonnée n’est attribuée à un lieu existant.';
  wrap.appendChild(note);
  return wrap;
}

/* ---------- E094-02 : tableau de référence, valeurs recalculées ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Échelles de distance sur la sphère de référence (rayon R = 6 371 km), recalculées depuis les formules.';
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

  const tbody = document.createElement('tbody');
  const lignes = [
    ['1° de latitude', 'R · π/180', '≈ ' + num(DEMO.unDegLat) + ' km'],
    ['1° de longitude à l’équateur', 'R · cos(0°) · π/180', '≈ ' + num(DEMO.unDegLat) + ' km'],
    ['1° de longitude à 45°', 'R · cos(45°) · π/180', '≈ ' + num(DEMO.unDegLon45) + ' km'],
    ['Tour du parallèle à 45°', '2π · R · cos(45°)', '≈ ' + km(DEMO.tour45) + ' km'],
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

/* ---------- E094-08 : liste textuelle de repères chiffrés ---------- */

function staticList(id, entrees) {
  const list = document.createElement('ul');
  list.id = id;
  entrees.forEach((texte) => {
    const item = document.createElement('li');
    item.textContent = texte;
    list.appendChild(item);
  });
  return list;
}

function staticMesures() {
  return staticList(MESURES_ID, [
    'Rayon de référence : R = ' + km(R) + ' km ; un degré de latitude vaut R · π/180 ≈ ' +
      num(DEMO.unDegLat) + ' km.',
    'À B(40° N, 60° E) : orthodromie ≈ ' + km(DEMO.d.ortho) + ' km — c’est la référence 1,00.',
    'Loxodromie ≈ ' + km(DEMO.d.loxo) + ' km, soit ' + num(DEMO.facteurLoxo) +
      '× la référence : le cap constant allonge le trajet d’environ ' +
      km(DEMO.ecartLoxo) + ' km.',
    'Chemin en deux temps ≈ ' + km(DEMO.d.deux) + ' km, soit ' + num(DEMO.facteurDeux) +
      '× la référence : le détour par le méridien puis le parallèle ajoute environ ' +
      km(DEMO.ecartDeux) + ' km.',
    'Fait falsifiable : si l’écart en longitude est nul, B est sur le même méridien que A et les trois tracés valent ' +
      km(DEMO.meridien40) + ' km (R · 40° · π/180) : aucun détour n’est alors possible.',
  ]);
}

/* ---------- Feuille de style unique, injectée une seule fois via ctx.css ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-left:3px solid var(--gold,#e6b96f);
  border-radius:10px;background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p,#${PANEL_ID} ul{margin:5px 0;max-width:68ch}
#${PANEL_ID} ul{padding-left:18px}
#${PANEL_ID} li{margin:3px 0}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PANEL_ID} .${P}-note{color:var(--muted);font-style:italic}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${PATHSET_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${PATHSET_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:6px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
.${P}-range{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.${P}-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;max-width:360px;height:220px;margin:8px 0;
  border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.28);touch-action:manipulation;
}
#${LEGEND_ID},#${CLAVIER_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID},#${DEBRIEF_ID}{
  min-height:44px;padding:7px 8px;margin:6px 0;border:1px dashed var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink);font-size:10px;font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${DEBRIEF_ID}[hidden]{display:none}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} button[aria-pressed="true"]{border-color:var(--gold-bright,#f4d69e);background:rgba(230,185,111,.14)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-map-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,
#${PANEL_ID}[${REDUCED_ATTR}="1"] .${P}-map-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-map-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:190px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
  #${TABLE_ID}{font-size:9px}
}
`;

/* ---------- E094-06 : laboratoire canvas unique et déterministe ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 360;
  const cssH = cv.clientHeight || 220;
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
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
  const encre = 'rgba(244,214,158,.98)';

  /* Graticule schématique : repères de latitude et de longitude. */
  g.strokeStyle = 'rgba(255,255,255,.12)';
  g.lineWidth = 1;
  if (g.setLineDash) g.setLineDash([]);
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
    if (g.setLineDash) g.setLineDash(selected ? [] : (DASHES[key] || []));
    g.strokeStyle = selected ? encre : 'rgba(214,207,193,.42)';
    g.lineWidth = selected ? 2.4 : 1.2;
    g.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = toPx(p);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    });
    g.stroke();
  });
  if (g.setLineDash) g.setLineDash([]);

  /* Repères A (carré) et B (losange) : formes, pas couleurs. */
  const [ax, ay] = toPx({ lat: 0, lon: 0 });
  const [bx, by] = toPx({ lat: S.lat, lon: S.lon });
  g.fillStyle = encre;
  g.fillRect(ax - 4, ay - 4, 8, 8);
  g.beginPath();
  g.moveTo(bx, by - 5); g.lineTo(bx + 5, by); g.lineTo(bx, by + 5); g.lineTo(bx - 5, by);
  g.closePath(); g.fill();
  g.font = '11px sans-serif';
  g.textAlign = 'left';
  g.fillText('A', ax + 7, ay - 6);
  g.fillText('B', bx + 7, by - 6);

  /* Disque mobile sur le tracé sélectionné : position déterministe = f(S.t). */
  const pts = pathPoints(S.path, S.lat, S.lon, 96);
  const idx = clamp(Math.floor(S.t * (pts.length - 1)), 0, pts.length - 1);
  const [mx, my] = toPx(pts[idx]);
  g.beginPath(); g.arc(mx, my, 4.5, 0, Math.PI * 2); g.fill();
  g.beginPath();
  g.moveTo(mx - 7, my); g.lineTo(mx + 7, my);
  g.moveTo(mx, my - 7); g.lineTo(mx, my + 7);
  g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1; g.stroke();

  g.fillStyle = encre;
  g.fillText(PATHS[S.path], pad + 2, pad + 13);
  g.fillText('B : ' + S.lat + '° N, ' + S.lon + '° E (schématique)', pad + 2, cssH - pad - 4);
}

/* ---------- E094-07 : région de statut unique, relatée en texte ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const d = distances(S.lat, S.lon);
  const fort = (texte) => {
    const st = document.createElement('strong');
    st.textContent = texte;
    return st;
  };
  const facteur = (v) => (v > 0 ? v / d.ortho : 1);
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode('De A (0°, 0°) à B (' + S.lat + '° N, ' + S.lon +
    '° E), sur une sphère de rayon 6 371 km — référence orthodromique '));
  frag.appendChild(fort('1,00 = ' + km(d.ortho) + ' km'));
  frag.appendChild(document.createTextNode(' ; loxodromie '));
  frag.appendChild(fort(km(d.loxo) + ' km (' + fmt(facteur(d.loxo)) + '×)'));
  frag.appendChild(document.createTextNode(' ; chemin en deux temps '));
  frag.appendChild(fort(km(d.deux) + ' km (' + fmt(facteur(d.deux)) + '×)'));
  frag.appendChild(document.createTextNode('. Le cap constant et le chemin en deux temps allongent le trajet : l’orthodromie reste le plus court.'));
  const texte = frag.textContent;
  if (texte === S.readoutText) return; // évite de saturer la région live.
  S.readoutText = texte;
  n.textContent = '';
  n.appendChild(frag);
}

/* ---------- Construction du panneau (texte sémantique) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant, fresh: false,
      radios: ORDER.map((k) => document.getElementById(PATH_PREFIX + k)),
      lat: document.getElementById(LAT_ID),
      lon: document.getElementById(LON_ID),
      latOut: document.getElementById(LAT_OUT_ID),
      lonOut: document.getElementById(LON_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      reset: document.getElementById(RESET_ID),
      debriefBtn: document.getElementById(DEBRIEF_BTN_ID),
      debrief: document.getElementById(DEBRIEF_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Itinéraires et chemins entre lieux');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Comparer trois façons de relier deux repères — l’orthodromie, la loxodromie et un chemin en deux temps — montre que le « plus court chemin » dépend de la contrainte que l’on impose au trajet.');

  /* E094-01, E094-02 : faits sourcés et tableau lisible sans canvas. */
  const faits = staticFacts();
  const table = staticTable();

  /* E094-03 : type de tracé -> radiogroupe (choix unique). */
  const fieldset = document.createElement('fieldset');
  fieldset.id = PATHSET_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Type de tracé entre A et B (choix unique)');
  const legend = document.createElement('legend');
  legend.textContent = 'Type de tracé entre A et B (choix unique)';
  fieldset.appendChild(legend);
  const radios = ORDER.map((key) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-path';
    radio.id = PATH_PREFIX + key;
    radio.value = key;
    radio.checked = S.path === key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(PATHS[key]));
    fieldset.appendChild(lab);
    return radio;
  });

  const sub = ctx.el('h3', '', 'Placer le repère B');

  /* E094-04 : deux curseurs bornés et étiquetés. */
  const latRow = ctx.el('p', '');
  const latLabel = document.createElement('label');
  latLabel.setAttribute('for', LAT_ID);
  latLabel.appendChild(document.createTextNode('Latitude de B : '));
  const latOut = document.createElement('span');
  latOut.id = LAT_OUT_ID;
  latOut.className = P + '-value';
  latLabel.appendChild(latOut);
  latRow.appendChild(latLabel);
  const lat = document.createElement('input');
  lat.type = 'range';
  lat.id = LAT_ID;
  lat.min = '0';
  lat.max = String(LAT_MAX);
  lat.step = '5';
  lat.value = String(S.lat);
  lat.className = P + '-range';
  lat.setAttribute('aria-label', 'Latitude du repère B, de 0 à 60 degrés');

  const lonRow = ctx.el('p', '');
  const lonLabel = document.createElement('label');
  lonLabel.setAttribute('for', LON_ID);
  lonLabel.appendChild(document.createTextNode('Écart en longitude de B : '));
  const lonOut = document.createElement('span');
  lonOut.id = LON_OUT_ID;
  lonOut.className = P + '-value';
  lonLabel.appendChild(lonOut);
  lonRow.appendChild(lonLabel);
  const lon = document.createElement('input');
  lon.type = 'range';
  lon.id = LON_ID;
  lon.min = '0';
  lon.max = String(LON_MAX);
  lon.step = '5';
  lon.value = String(S.lon);
  lon.className = P + '-range';
  lon.setAttribute('aria-label', 'Écart en longitude du repère B, de 0 à 80 degrés');

  /* E094-06 : canvas focalisable, étiqueté, avec équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Croquis des trois tracés entre le repère A et le repère B. Flèche gauche ou droite : changer de type de tracé. Flèche haut ou bas : ajuster la latitude de B. Page précédente ou page suivante : ajuster l’écart en longitude de B. Entrée ou espace : lancer ou arrêter le parcours.');
  canvas.setAttribute('aria-describedby', CLAVIER_ID);

  /* E094-08 / E094-09 : légende des codes visuels non chromatiques. */
  const legendText = ctx.el('p', '', 'Repères sans couleur : trait plein = orthodromie, tirets = loxodromie, pointillés = chemin en deux temps ; le tracé choisi est épaissi. Carré = A (départ), losange = B (arrivée), disque barré d’une croix = parcours en cours. La forme et le motif distinguent tout, même sans couleur.');
  legendText.id = LEGEND_ID;

  /* E094-07 : région de statut unique, annoncée aux technologies d'assistance. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');

  /* E094-08 : repères chiffrés recalculés depuis leur formule. */
  const mesures = staticMesures();

  /* E094-09 : équivalent clavier explicite. */
  const clavier = ctx.el('p', '', 'Clavier : Tab atteint les trois tracés, les deux curseurs, le parcours, la réinitialisation puis le schéma. Sur le schéma, ← → changent de tracé, ↑ ↓ ajustent la latitude, Page précédente et Page suivante ajustent la longitude, Entrée ou Espace commande le parcours. Le parcours est une bascule indépendante : son état est toujours écrit, jamais porté par le seul pixel.');
  clavier.id = CLAVIER_ID;

  /* E094-10 : bascule indépendante -> aria-pressed autorisé. */
  const play = ctx.el('button', '', S.playing ? '■ Arrêter le parcours' : '▶ Animer le parcours');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  play.setAttribute('aria-controls', CANVAS_ID);

  const reset = ctx.el('button', '', 'Réinitialiser le laboratoire');
  reset.type = 'button';
  reset.id = RESET_ID;

  /* E094-10 : défi en cinq temps, débrief révélé par aria-expanded. */
  const defi = ctx.el('p', '', 'À vous de jouer — 1) Prédire : à B(40° N, 60° E), quel tracé est le plus court et lequel est le plus long ? 2) Réglage : placez la latitude à 40° et l’écart en longitude à 60°, puis essayez les trois tracés. 3) Résultat attendu : orthodromie ≈ ' + km(DEMO.d.ortho) + ' km, loxodromie ≈ ' + km(DEMO.d.loxo) + ' km (' + num(DEMO.facteurLoxo) + '×), chemin en deux temps ≈ ' + km(DEMO.d.deux) + ' km (' + num(DEMO.facteurDeux) + '×). 4) Falsification : mettez l’écart en longitude à 0° — B est alors sur le même méridien que A et les trois tracés doivent coïncider à ' + km(DEMO.meridien40) + ' km ; si un écart subsistait, l’hypothèse « l’orthodromie est le plus court chemin » serait réfutée — vérifiez. 5) Débrief : vérifiez votre raisonnement ci-dessous.');
  defi.id = DEFI_ID;
  const debriefBtn = ctx.el('button', '', 'Révéler le débrief');
  debriefBtn.type = 'button';
  debriefBtn.id = DEBRIEF_BTN_ID;
  debriefBtn.setAttribute('aria-expanded', 'false');
  debriefBtn.setAttribute('aria-controls', DEBRIEF_ID);
  const debrief = ctx.el('p', '', 'Débrief : toutes les longueurs découlent de formules déterministes avec R = 6 371 km. L’orthodromie (haversine) est le plus court chemin sur la sphère ; la loxodromie garde un cap constant et s’allonge dès que la longitude varie ; le chemin en deux temps paie le détour par un méridien puis un parallèle. Quand l’écart en longitude est nul, le terme de parallèle disparaît et les trois formules coïncident : le détour vient donc bien de la composante est-ouest. Les repères sont schématiques, pas des lieux réels.');
  debrief.id = DEBRIEF_ID;
  debrief.hidden = true;

  panel.append(title, lead, faits, table, fieldset, sub, latRow, lat, lonRow, lon,
    canvas, legendText, readout, mesures, clavier, play, reset, defi, debriefBtn, debrief);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true, radios, lat, lon, latOut, lonOut, canvas, readout,
    play, reset, debriefBtn, debrief,
  };
}

/* ---------- Synchronisation de tous les contrôles et du dessin ---------- */

function syncControls() {
  const n = S.nodes;
  const reduced = reducedNow();
  if (reduced) S.playing = false;
  n.radios.forEach((radio, i) => {
    if (radio) radio.checked = ORDER[i] === S.path;
  });
  if (n.lat) n.lat.value = String(clamp(Math.round(S.lat), 0, LAT_MAX));
  if (n.lon) n.lon.value = String(clamp(Math.round(S.lon), 0, LON_MAX));
  if (n.latOut) n.latOut.textContent = S.lat + '°';
  if (n.lonOut) n.lonOut.textContent = S.lon + '°';
  if (n.play) {
    n.play.textContent = reduced
      ? '▸ Avancer d’un pas (mouvement réduit)'
      : (S.playing ? '■ Arrêter le parcours' : '▶ Animer le parcours');
    n.play.setAttribute('aria-pressed', !reduced && S.playing ? 'true' : 'false');
    n.play.title = reduced
      ? 'Le parcours animé est désactivé ; un clic avance le disque d’un pas discret.'
      : '';
  }
  if (n.debriefBtn) {
    n.debriefBtn.textContent = S.debriefOuvert ? 'Masquer le débrief' : 'Révéler le débrief';
    n.debriefBtn.setAttribute('aria-expanded', S.debriefOuvert ? 'true' : 'false');
  }
  if (n.debrief) n.debrief.hidden = !S.debriefOuvert;
  if (n.panel) n.panel.setAttribute(REDUCED_ATTR, reduced ? '1' : '0');
  updateReadout();
  drawLab();
}

/* ---------- E094-09 : boucle rAF unique, pause sur document.hidden ---------- */

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
  if (!S.onScreen || reducedNow()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

/* Un seul pas discret, utilisé en mouvement réduit ou au clavier. */
function stepMarker() {
  S.t = (S.t + 0.1) % 1;
  syncControls();
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen || reducedNow()) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.t = (S.t + dt * VITESSE) % 1;
  }
  S.lastTs = ts;
  syncControls();
  if (S.playing && !reducedNow()) S.rafId = requestAnimationFrame(tick);
}

/* Source unique de la préférence de mouvement (ctx.reducedMotion + repli). */
let reducedProvider = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
};
function reducedNow() { return !!reducedProvider(); }

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
        if (mq.matches) { S.playing = false; stopLoop(); }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : reducedNow() reste la source. */ }
  }
}

/* ---------- E094-09 : IntersectionObserver et badge sur la carte ---------- */

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

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(MAP_BADGE_ID)) return;
  const badge = ctx.el('div', P + '-map-badge', 'Le trait ┄ de la carte relie les lieux par année : c’est un itinéraire chronologique, pas un itinéraire géographique le plus court.');
  badge.id = MAP_BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée unique, idempotent ---------- */

register('E094', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(P, CSS);

  if (typeof ctx.reducedMotion === 'function') reducedProvider = () => !!ctx.reducedMotion();

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  if (reducedNow()) S.playing = false;
  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio, i) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.path = ORDER[i];
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
      if (reducedNow() || typeof requestAnimationFrame !== 'function') {
        S.playing = false;
        stopLoop();
        stepMarker(); // palier discret : jamais d'animation en mouvement réduit.
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.reset.addEventListener('click', () => {
      S.path = 'ortho';
      S.lat = 40;
      S.lon = 60;
      S.t = 0;
      S.playing = false;
      stopLoop();
      syncControls();
    });
    n.debriefBtn.addEventListener('click', () => {
      S.debriefOuvert = !S.debriefOuvert;
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
        if (reducedNow()) stepMarker();
        else {
          S.playing = !S.playing;
          if (!S.playing) stopLoop(); else startLoop();
        }
      } else used = false;
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
    ensureObserver(n.canvas);
  }

  installGlobalListeners();
  if (S.playing && !reducedNow()) startLoop();
});
