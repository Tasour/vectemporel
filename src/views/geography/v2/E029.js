import { register } from './registry.js';

/* Lentille E029 — vue GEOGRAPHIE (V2).
 * Thème : altimétrie et courbes de niveau (modèle de relief déterministe,
 * équidistance, tracé des isolignes par interpolation, lecture de pente,
 * coupe topographique, formes de relief, repères d'altitude).
 *
 * Les dix chantiers E029-01 … E029-10 sont réellement implémentés et décrits
 * dans UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E029.md. Préfixe unique :
 * geography-v2-e029-. Tout est local : aucune requête réseau, aucune graine
 * aléatoire, aucune console, aucun fichier partagé modifié. Le savoir est du
 * texte sémantique réel (titres, paragraphes, tableau, légendes) présent dans
 * le DOM ; le canvas n'est qu'un laboratoire qui illustre des formules
 * déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const P = 'geography-v2-e029';
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const MODE_ID = P + '-mode';
const EQUI_ID = P + '-equidistance';
const EQUI_OUT_ID = P + '-equidistance-value';
const POS_ID = P + '-position';
const POS_OUT_ID = P + '-position-value';
const RELIEF_ID = P + '-relief';
const CANVAS_ID = P + '-canvas';
const READOUT_ID = P + '-readout';
const LEGEND_ID = P + '-legend';
const BADGE_ID = P + '-badge';
const HELP_ID = P + '-help';
const PLAY_ID = P + '-play';
const TABLE_ID = P + '-table';
const REDUCED_ATTR = 'data-' + P + '-reduced';

/* Constantes du relief schématique (toutes choisies, aucune tirée au hasard). */
const SOMMET_X = 0.42;       // position du sommet de la colline (x normalisé)
const SOMMET_Y = 0.38;       // position du sommet de la colline (y normalisé, nord en haut)
const RAYON2 = 0.09;         // rayon² de la gaussienne, en unités normalisées
const HAUT_COLLINE = 900;    // hauteur de la colline gaussienne au centre (m)
const PENTE_NS = 220;        // inclinaison régionale nord → sud (m sur la carte)
const PENTE_EO = 50;         // inclinaison régional ouest → est (m sur la carte)
const LARGEUR_CARTE_M = 12000; // 12 km représentés d'un bord à l'autre de la carte
const EQUI_MIN = 20;
const EQUI_MAX = 200;
const EQUI_STEP = 20;
const EQUI_DEF = 50;
const PENTE_REF = 8;         // pente maximale usuelle d'une route de montagne (%)
const A = { x: 0.02, y: 0.78 };
const B = { x: 0.90, y: 0.02 };

const MODES = {
  courbes: 'Courbes de niveau',
  profil: 'Coupe topographique',
  pente: 'Lecture de la pente',
  formes: 'Formes de relief',
};
const MODE_ORDER = ['courbes', 'profil', 'pente', 'formes'];

const FORMES = {
  sommet: {
    label: 'Sommet',
    texte: 'Courbes fermées concentriques : l’altitude augmente vers le centre. Les hachures (petits traits) pointent vers l’extérieur, du côté de la descente.',
  },
  col: {
    label: 'Col',
    texte: 'Deux sommets voisins sont reliés par un passage plus bas, en forme de selle ou de sablier : les courbes se resserrent puis s’écartent de part et d’autre du col.',
  },
  vallee: {
    label: 'Vallée',
    texte: 'Les courbes forment des V dont la pointe regarde l’amont, vers les altitudes plus hautes ; le fond de la vallée suit la direction des pointes.',
  },
  crete: {
    label: 'Crête',
    texte: 'Les courbes forment des U dont la pointe regarde l’aval, vers les altitudes plus basses ; la ligne de crête sépare deux versants.',
  },
};
const FORME_ORDER = ['sommet', 'col', 'vallee', 'crete'];

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  mode: 'courbes',
  equi: EQUI_DEF,
  u: 0.45,
  relief: 'sommet',
  playing: false,
  sweep: 0,
  inView: true,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  observer: null,
  nodes: {},
  grid: null,
  gridKey: '',
  stats: null,
};

/* ---------- Formules déterministes (E029-03, E029-04, E029-06) ---------- */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function fmtInt(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}
function fmt2(n) {
  return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
}

/* E029-03 : h(x, y) = 900·exp(−d²/0,09) + 220·(1 − y) + 50·(1 − x).
 * Même position → même altitude : aucune graine, aucune donnée réseau. */
function altitude(x, y) {
  const dx = x - SOMMET_X;
  const dy = y - SOMMET_Y;
  const colline = HAUT_COLLINE * Math.exp(-(dx * dx + dy * dy) / RAYON2);
  return Math.max(0, colline + PENTE_NS * (1 - y) + PENTE_EO * (1 - x));
}

/* E029-06 : gradient analytique du même modèle, en mètres par unité normalisée. */
function gradient(x, y) {
  const dx = x - SOMMET_X;
  const dy = y - SOMMET_Y;
  const colline = HAUT_COLLINE * Math.exp(-(dx * dx + dy * dy) / RAYON2);
  return {
    dhdx: colline * (-2 * dx / RAYON2) - PENTE_EO,
    dhdy: colline * (-2 * dy / RAYON2) - PENTE_NS,
  };
}
function pentePourcent(x, y) {
  const g = gradient(x, y);
  return Math.sqrt(g.dhdx * g.dhdx + g.dhdy * g.dhdy) / LARGEUR_CARTE_M * 100;
}
/* Distance horizontale entre deux courbes consécutives : d = équidistance / pente. */
function ecartCourbes(equi, pct) {
  return pct > 0.0001 ? equi / (pct / 100) : Infinity;
}

/* Transect A → B, utilisé à la fois en plan et en coupe (E029-07). */
function transect(u) {
  const t = clamp(u, 0, 1);
  return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t };
}

/* ---------- Grille et isolignes (E029-05) ---------- */

function ensureGrid(nx, ny) {
  const key = nx + 'x' + ny;
  if (S.grid && S.gridKey === key) return S.grid;
  const grid = new Float64Array(nx * ny);
  let mn = Infinity;
  let mx = -Infinity;
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const h = altitude(i / (nx - 1), j / (ny - 1));
      grid[j * nx + i] = h;
      if (h < mn) mn = h;
      if (h > mx) mx = h;
    }
  }
  S.grid = grid;
  S.gridKey = key;
  S.stats = { mn, mx, maxH: mx };
  return grid;
}

/* Niveaux multiples de l'équidistance contenus dans la plage de la grille. */
function levelsFor(equi, mn, mx) {
  const out = [];
  const first = Math.ceil(mn / equi) * equi;
  for (let L = first; L <= mx + 1e-9; L += equi) out.push(L);
  return out;
}

/* Marching squares : interpolation linéaire sur les arêtes, sans aléa. */
function drawContours(g, grid, nx, ny, X, Y, levels, highlight) {
  levels.forEach((level) => {
    const hi = highlight !== null && Math.abs(level - highlight) < 0.5;
    g.strokeStyle = hi ? 'rgba(255,255,255,.96)' : 'rgba(244,214,158,.70)';
    g.lineWidth = hi ? 2.6 : 1.15;
    g.setLineDash([]);
    for (let j = 0; j < ny - 1; j += 1) {
      const y0 = j / (ny - 1);
      const y1 = (j + 1) / (ny - 1);
      for (let i = 0; i < nx - 1; i += 1) {
        const x0 = i / (nx - 1);
        const x1 = (i + 1) / (nx - 1);
        const v0 = grid[j * nx + i];
        const v1 = grid[j * nx + i + 1];
        const v2 = grid[(j + 1) * nx + i + 1];
        const v3 = grid[(j + 1) * nx + i];
        const pts = [];
        const edge = (va, vb, ax, ay, bx, by) => {
          if ((va < level && vb >= level) || (vb < level && va >= level)) {
            const t = (level - va) / (vb - va);
            pts.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
          }
        };
        edge(v0, v1, x0, y0, x1, y0);
        edge(v1, v2, x1, y0, x1, y1);
        edge(v3, v2, x0, y1, x1, y1);
        edge(v0, v3, x0, y0, x0, y1);
        if (pts.length === 2) {
          g.beginPath();
          g.moveTo(X(pts[0][0]), Y(pts[0][1]));
          g.lineTo(X(pts[1][0]), Y(pts[1][1]));
          g.stroke();
        } else if (pts.length === 4) {
          /* Cas ambigu (selle) : appariement déterministe des arêtes. */
          g.beginPath();
          g.moveTo(X(pts[0][0]), Y(pts[0][1]));
          g.lineTo(X(pts[1][0]), Y(pts[1][1]));
          g.moveTo(X(pts[2][0]), Y(pts[2][1]));
          g.lineTo(X(pts[3][0]), Y(pts[3][1]));
          g.stroke();
        }
      }
    }
  });
}

/* ---------- Feuille de style unique (E029-02) ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PANEL_ID} code{font-size:10px;color:var(--gold-bright,#f4d69e)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${MODE_ID},#${RELIEF_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${MODE_ID} legend,#${RELIEF_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} .${P}-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${EQUI_ID},#${POS_ID}{display:block}
#${CANVAS_ID}{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${PANEL_ID} .${P}-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,
#${PANEL_ID}[${REDUCED_ATTR}="1"] .${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:200px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* ---------- Contenu sémantique, lisible sans le laboratoire (E029-01, E029-09) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une courbe de niveau (ou isoligne) relie tous les points d’une carte qui ont la même altitude. Elle ne se coupe jamais, sauf dans le cas particulier d’une falaise.',
    'L’équidistance est l’intervalle d’altitude entre deux courbes consécutives : plus elle est petite, plus le relief est détaillé. Un écartement serré des courbes indique une pente forte, un écartement large une pente faible.',
    'Le dénivelé est la différence d’altitude entre deux points ; la pente se calcule en divisant ce dénivelé par la distance horizontale, et s’exprime en pourcentage (1 m pour 100 m = 1 %).',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Repères d’altitude (ordres de grandeur, mètres) comparés à l’altitude maximale du relief modèle.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Repère', 'Altitude (m)', 'Rapport au relief modèle'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Everest', 8849],
    ['Mont Blanc', 4808],
    ['Monte Rosa', 4634],
    ['Cervin', 4478],
    ['Aiguille Verte', 4122],
  ];
  const ref = S.stats ? S.stats.maxH : 1000;
  lignes.forEach((cells) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = cells[0];
    tr.appendChild(th);
    const td1 = document.createElement('td');
    td1.textContent = fmtInt(cells[1]) + ' m';
    tr.appendChild(td1);
    const td2 = document.createElement('td');
    td2.textContent = fmt2(cells[1] / ref) + ' ×';
    tr.appendChild(td2);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function rangeRow(labelText, id, outId, min, max, step, value, aria) {
  const row = document.createElement('div');
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.appendChild(document.createTextNode(labelText + ' : '));
  const out = document.createElement('span');
  out.className = P + '-valeur';
  out.id = outId;
  label.appendChild(out);
  row.appendChild(label);
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
      radios: MODE_ORDER.map((m) => document.getElementById(P + '-mode-' + m)),
      reliefs: FORME_ORDER.map((f) => document.getElementById(P + '-relief-' + f)),
      equi: document.getElementById(EQUI_ID),
      equiOut: document.getElementById(EQUI_OUT_ID),
      pos: document.getElementById(POS_ID),
      posOut: document.getElementById(POS_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      legend: document.getElementById(LEGEND_ID),
      play: document.getElementById(PLAY_ID),
    };
  }

  /* La grille est calculée avant le tableau, pour connaître le relief max. */
  ensureGrid(48, 32);

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Altimétrie et courbes de niveau');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '',
    'Ce laboratoire montre comment un relief schématique se lit sur une carte : des courbes de niveau reliées par une équidistance, une coupe topographique, une pente mesurée et comparée à une référence, puis les grandes formes du relief.');

  /* E029-03 : la formule est du texte explicite, pas une image. */
  const formule = ctx.el('p', P + '-fait',
    'Modèle déterministe : h(x, y) = 900·exp(−d²/0,09) + 220·(1 − y) + 50·(1 − x), avec d² la distance au sommet. Aucun nombre n’est tiré au hasard : la même position donne toujours la même altitude.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = MODE_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Vue du laboratoire, choix unique');
  const legend = document.createElement('legend');
  legend.textContent = 'Vue du laboratoire (choix unique)';
  fieldset.appendChild(legend);
  MODE_ORDER.forEach((value) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-mode';
    radio.id = P + '-mode-' + value;
    radio.value = value;
    radio.checked = S.mode === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(MODES[value]));
    fieldset.appendChild(lab);
  });

  const reliefSet = document.createElement('fieldset');
  reliefSet.id = RELIEF_ID;
  reliefSet.setAttribute('role', 'radiogroup');
  reliefSet.setAttribute('aria-label', 'Forme de relief à expliquer, choix unique');
  const reliefLegend = document.createElement('legend');
  reliefLegend.textContent = 'Forme de relief à expliquer (choix unique)';
  reliefSet.appendChild(reliefLegend);
  FORME_ORDER.forEach((value) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-relief';
    radio.id = P + '-relief-' + value;
    radio.value = value;
    radio.checked = S.relief === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(FORMES[value].label));
    reliefSet.appendChild(lab);
  });

  const equi = rangeRow('Équidistance', EQUI_ID, EQUI_OUT_ID,
    EQUI_MIN, EQUI_MAX, EQUI_STEP, S.equi,
    'Équidistance entre deux courbes de niveau, de 20 à 200 mètres');
  const pos = rangeRow('Position sur le transect A → B', POS_ID, POS_OUT_ID,
    0, 100, 1, Math.round(S.u * 100),
    'Position en pourcentage le long de la coupe du point A au point B');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire d’altimétrie. Flèches gauche et droite : changer de vue ; flèches haut et bas : déplacer le point sur le transect ; plus et moins : modifier l’équidistance ; Espace : lancer ou arrêter l’animation.');

  const legendText = ctx.el('p', P + '-legend', '');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const help = ctx.el('p', P + '-sr',
    'Commandes du laboratoire : boutons radio pour choisir la vue et la forme de relief ; curseurs pour l’équidistance et la position sur la coupe ; flèches gauche et droite sur le graphique pour changer de vue, flèches haut et bas pour déplacer le point, plus et moins pour l’équidistance, Espace pour lancer ou arrêter l’animation de montée du niveau.');
  help.id = HELP_ID;
  panel.setAttribute('aria-describedby', help.id);

  const play = ctx.el('button', '', '▶ Animer la montée du niveau');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', 'false');
  play.setAttribute('aria-controls', CANVAS_ID);

  panel.append(title, lead, staticFacts(), formule, fieldset, reliefSet,
    equi.row, pos.row, canvas, legendText, readout, staticTable(), help, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: MODE_ORDER.map((m) => document.getElementById(P + '-mode-' + m)),
    reliefs: FORME_ORDER.map((f) => document.getElementById(P + '-relief-' + f)),
    equi: equi.input, equiOut: equi.out,
    pos: pos.input, posOut: pos.out,
    canvas, readout, legend: legendText, play,
  };
}

/* ---------- Rendu du laboratoire (E029-05, E029-07, E029-08) ---------- */

function ring(g, cx, cy, rx, ry, dash) {
  g.setLineDash(dash || []);
  g.beginPath();
  if (typeof g.ellipse === 'function') g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  else {
    g.save();
    g.translate(cx, cy);
    g.scale(rx, ry);
    g.arc(0, 0, 1, 0, Math.PI * 2);
    g.restore();
  }
  g.stroke();
  g.setLineDash([]);
}

function chevron(g, cx, cy, w, h, versHaut, dash) {
  const s = versHaut ? -1 : 1;
  g.setLineDash(dash || []);
  g.beginPath();
  g.moveTo(cx - w, cy);
  g.lineTo(cx, cy + s * h);
  g.lineTo(cx + w, cy);
  g.stroke();
  g.setLineDash([]);
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  /* DPR plafonné à 2 (aucun dépassement de budget de pixels). */
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

  const pad = 22;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const stats = S.stats || { mn: 0, mx: 1000, maxH: 1000 };
  const { mn, mx } = stats;

  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);

  const cross = (x, y, color) => {
    g.strokeStyle = color || 'rgba(255,255,255,.95)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(x - 6, y); g.lineTo(x + 6, y);
    g.moveTo(x, y - 6); g.lineTo(x, y + 6);
    g.stroke();
  };

  const nbCourbes = levelsFor(S.equi, mn, mx).length;
  const point = transect(S.u);
  const pente = pentePourcent(point.x, point.y);

  if (S.mode === 'courbes') {
    /* E029-05 : isolignes obtenues par interpolation sur la grille. */
    const X = (v) => pad + v * iw;
    const Y = (v) => pad + v * ih; /* y=0 au nord, en haut */
    const grid = ensureGrid(48, 32);
    const levels = levelsFor(S.equi, mn, mx);
    const hi = S.playing
      ? Math.round((mn + S.sweep * (mx - mn)) / S.equi) * S.equi
      : null;
    drawContours(g, grid, 48, 32, X, Y, levels, hi);

    /* Hachures : petits traits orientés vers la descente (jamais la couleur seule). */
    g.strokeStyle = 'rgba(214,207,193,.45)';
    g.lineWidth = 1;
    for (let u = 0.05; u <= 0.95; u += 0.05) {
      const pt = transect(u);
      const gr = gradient(pt.x, pt.y);
      const m = Math.sqrt(gr.dhdx * gr.dhdx + gr.dhdy * gr.dhdy) || 1;
      const dx = -gr.dhdx / m;
      const dy = -gr.dhdy / m;
      g.beginPath();
      g.moveTo(X(pt.x), Y(pt.y));
      g.lineTo(X(pt.x) + dx * 7, Y(pt.y) + dy * 7);
      g.stroke();
    }

    /* Transect A → B et point de lecture. */
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.setLineDash([5, 4]);
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(X(A.x), Y(A.y));
    g.lineTo(X(B.x), Y(B.y));
    g.stroke();
    g.setLineDash([]);
    cross(X(point.x), Y(point.y));
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '10px sans-serif';
    g.fillText('A', X(A.x) - 10, Y(A.y) + 4);
    g.fillText('B', X(B.x) + 4, Y(B.y) + 4);
    g.beginPath();
    g.arc(X(SOMMET_X), Y(SOMMET_Y), 3, 0, Math.PI * 2);
    g.fill();
    g.fillText('Sommet', X(SOMMET_X) + 6, Y(SOMMET_Y) - 6);
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '11px sans-serif';
    g.fillText('Courbes de niveau · équidistance ' + fmtInt(S.equi) + ' m · ' + nbCourbes + ' courbes', pad + 2, pad + 13);
  } else if (S.mode === 'profil') {
    /* E029-07 : coupe le long du transect, altitude en ordonnée. */
    const X = (u) => pad + u * iw;
    const Y = (h) => pad + (1 - clamp(h / mx, 0, 1)) * ih;
    levelsFor(S.equi, mn, mx).forEach((L) => {
      g.strokeStyle = 'rgba(244,214,158,.22)';
      g.setLineDash([2, 4]);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(pad, Y(L)); g.lineTo(pad + iw, Y(L));
      g.stroke();
    });
    g.setLineDash([]);

    g.fillStyle = 'rgba(244,214,158,.10)';
    g.beginPath();
    g.moveTo(X(0), Y(0));
    for (let k = 0; k <= 120; k += 1) {
      const u = k / 120;
      const pt = transect(u);
      g.lineTo(X(u), Y(altitude(pt.x, pt.y)));
    }
    g.lineTo(X(1), Y(0));
    g.closePath();
    g.fill();

    g.strokeStyle = 'rgba(244,214,158,.95)';
    g.lineWidth = 2;
    g.beginPath();
    for (let k = 0; k <= 120; k += 1) {
      const u = k / 120;
      const pt = transect(u);
      const h = altitude(pt.x, pt.y);
      if (k === 0) g.moveTo(X(u), Y(h));
      else g.lineTo(X(u), Y(h));
    }
    g.stroke();

    const hCour = altitude(point.x, point.y);
    g.strokeStyle = 'rgba(255,255,255,.6)';
    g.setLineDash([2, 3]);
    g.beginPath(); g.moveTo(X(S.u), pad); g.lineTo(X(S.u), Y(0)); g.stroke();
    g.setLineDash([]);
    cross(X(S.u), Y(hCour));
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '11px sans-serif';
    g.fillText('Coupe A → B · 12 km · ' + fmtInt(mx) + ' m au plus haut', pad + 2, pad + 13);
    g.font = '10px sans-serif';
    g.fillText('A', pad, cssH - pad - 4);
    g.fillText('B', pad + iw - 10, cssH - pad - 4);
    g.fillText(fmtInt(hCour) + ' m', clamp(X(S.u) + 8, pad, pad + iw - 52), clamp(Y(hCour) - 8, pad + 26, pad + ih));
  } else if (S.mode === 'pente') {
    /* E029-06 : triangle pente = dénivelé / distance horizontale, comparé à 8 %. */
    const demiH = Math.max(20, ih * 0.30);
    const baseY = pad + ih * 0.72;
    const largeur = Math.min(iw * 0.40, 200);
    const x1 = pad + 16;
    const x2 = pad + 16 + iw * 0.52;

    const triangle = (ox, runPx, pct, dash, label) => {
      const montée = runPx * pct / 100;
      const rise = Math.min(demiH, montée);
      const run = pct > 0 ? rise * 100 / pct : runPx;
      g.strokeStyle = dash.length ? 'rgba(214,207,193,.85)' : 'rgba(244,214,158,.95)';
      g.lineWidth = 2;
      g.setLineDash(dash);
      g.beginPath();
      g.moveTo(ox, baseY);
      g.lineTo(ox + run, baseY - rise);
      g.stroke();
      g.setLineDash([]);
      g.strokeStyle = 'rgba(255,255,255,.35)';
      g.lineWidth = 1;
      g.setLineDash([2, 3]);
      g.beginPath();
      g.moveTo(ox, baseY); g.lineTo(ox + run, baseY);
      g.moveTo(ox + run, baseY); g.lineTo(ox + run, baseY - rise);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = 'rgba(244,214,158,.95)';
      g.font = '10px sans-serif';
      g.fillText(label, ox, baseY + 14);
      g.fillText(fmt2(pct) + ' %', ox + 4, baseY - rise - 6);
      return run;
    };

    triangle(x1, largeur, pente, [], 'Pente au point de lecture');
    triangle(x2, largeur, PENTE_REF, [6, 4], 'Référence : route de montagne');

    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '11px sans-serif';
    g.fillText('Dénivelé ' + fmtInt(S.equi) + ' m · écart horizontal ' + fmtInt(ecartCourbes(S.equi, pente)) + ' m', pad + 2, pad + 13);
    g.font = '10px sans-serif';
    g.fillStyle = 'rgba(214,207,193,.85)';
    g.fillText('Trait plein : terrain. Tirets : référence à ' + fmtInt(PENTE_REF) + ' %.', pad + 2, cssH - pad - 4);
  } else {
    /* E029-08 : formes de relief schématiques, distinctes par leur forme. */
    const quartW = iw / 2;
    const quartH = ih / 2;
    const boites = [
      { key: 'sommet', cx: pad + quartW * 0.5, cy: pad + quartH * 0.5 },
      { key: 'col', cx: pad + quartW * 1.5, cy: pad + quartH * 0.5 },
      { key: 'vallee', cx: pad + quartW * 0.5, cy: pad + quartH * 1.5 },
      { key: 'crete', cx: pad + quartW * 1.5, cy: pad + quartH * 1.5 },
    ];
    boites.forEach((b) => {
      const actif = b.key === S.relief;
      g.strokeStyle = actif ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.14)';
      g.lineWidth = actif ? 1.6 : 1;
      g.setLineDash([]);
      g.strokeRect(b.cx - quartW * 0.44, b.cy - quartH * 0.42, quartW * 0.88, quartH * 0.80);
      g.strokeStyle = actif ? 'rgba(255,255,255,.95)' : 'rgba(244,214,158,.68)';
      g.lineWidth = actif ? 2 : 1.2;
      if (b.key === 'sommet') {
        [0.34, 0.24, 0.14].forEach((r) => ring(g, b.cx, b.cy, r * quartW, r * quartH * 0.7, []));
      } else if (b.key === 'col') {
        ring(g, b.cx - quartW * 0.22, b.cy, 0.16 * quartW, 0.26 * quartH, []);
        ring(g, b.cx + quartW * 0.22, b.cy, 0.16 * quartW, 0.26 * quartH, []);
        ring(g, b.cx - quartW * 0.22, b.cy, 0.08 * quartW, 0.14 * quartH, []);
        ring(g, b.cx + quartW * 0.22, b.cy, 0.08 * quartW, 0.14 * quartH, []);
      } else {
        const up = b.key === 'vallee';
        [0.10, 0.20, 0.30].forEach((dy, i) => {
          chevron(g, b.cx, b.cy + (i - 1) * 0.16 * quartH,
            (0.20 + i * 0.06) * quartW, 0.14 * quartH, up, []);
        });
      }
      g.fillStyle = actif ? 'rgba(255,255,255,.95)' : 'rgba(214,207,193,.8)';
      g.font = (actif ? 'bold ' : '') + '10px sans-serif';
      g.fillText(FORMES[b.key].label, b.cx - quartW * 0.40, b.cy + quartH * 0.32);
    });
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '11px sans-serif';
    g.fillText('Formes de relief — la forme des traits suffit à les distinguer', pad + 2, pad + 12);
  }
}

/* ---------- Lecture chiffrée (E029-04, E029-06, E029-09) ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const stats = S.stats || { mn: 0, mx: 1000 };
  const point = transect(S.u);
  const h = altitude(point.x, point.y);
  const pente = pentePourcent(point.x, point.y);
  const ecart = ecartCourbes(S.equi, pente);
  const nb = levelsFor(S.equi, stats.mn, stats.mx).length;
  const depassement = pente > PENTE_REF;

  n.textContent = '';
  const strong = (t) => { const s = document.createElement('strong'); s.textContent = t; return s; };
  const add = (t) => n.appendChild(document.createTextNode(t));

  add('Équidistance ');
  n.appendChild(strong(fmtInt(S.equi) + ' m'));
  add(' : ' + fmtInt(nb) + ' courbes de ' + fmtInt(stats.mn) + ' m à ' + fmtInt(stats.mx) + ' m. ');
  add('Au point du transect : altitude ');
  n.appendChild(strong(fmtInt(h) + ' m'));
  add(', pente locale ');
  n.appendChild(strong(fmt2(pente) + ' %'));
  add('. Écart horizontal entre courbes ≈ ');
  n.appendChild(strong(fmtInt(ecart) + ' m'));
  add('. Référence — pente maximale d’une route de montagne ' + fmtInt(PENTE_REF) + ' % : ');
  n.appendChild(strong(depassement ? 'pente dépassée' : 'pente admissible'));
  add('. ' + FORMES[S.relief].label + ' : ' + FORMES[S.relief].texte);
}

function updateLegend() {
  const n = S.nodes.legend;
  if (!n) return;
  if (S.mode === 'courbes') {
    n.textContent = 'Trait doré : courbe de niveau. Croix blanche : point de lecture. Trait tireté A → B : coupe. Petits traits : hachures vers la descente. Le trait blanc marque le niveau animé.';
  } else if (S.mode === 'profil') {
    n.textContent = 'Trait plein : coupe topographique. Traits horizontaux tiretés : niveaux espacés de l’équidistance. Croix : point de lecture. La pente est la déclivité de ce profil.';
  } else if (S.mode === 'pente') {
    n.textContent = 'Trait plein : pente du terrain au point de lecture. Tirets : référence de 8 %. La distance horizontale est déduite de d = équidistance / pente.';
  } else {
    n.textContent = 'Cercles concentriques : sommet. Sablier : col. V pointant amont : vallée. U pointant aval : crête. La forme du trait distingue chaque cas, même sans couleur.';
  }
}

function syncControls() {
  const n = S.nodes;
  n.radios.forEach((radio, i) => { if (radio) radio.checked = MODE_ORDER[i] === S.mode; });
  n.reliefs.forEach((radio, i) => { if (radio) radio.checked = FORME_ORDER[i] === S.relief; });
  if (n.equi) n.equi.value = String(S.equi);
  if (n.equiOut) n.equiOut.textContent = fmtInt(S.equi) + ' m';
  if (n.pos) n.pos.value = String(Math.round(S.u * 100));
  if (n.posOut) n.posOut.textContent = Math.round(S.u * 100) + ' %';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer la montée du niveau';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateLegend();
  updateReadout();
  drawLab();
}

/* ---------- E029-10 : boucle rAF unique, pause sur document.hidden et hors écran ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function canRun() {
  return typeof document === 'undefined' ? false : (!document.hidden && S.inView);
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (!canRun()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (!canRun()) return;
  const reduced = typeof ctxReducedMotion === 'function' ? ctxReducedMotion() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (!reduced) S.sweep = (S.sweep + dt * 0.00012) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (!reduced) S.rafId = requestAnimationFrame(tick);
}

let ctxReducedMotion = null;
let ctxLayout = null;
let ctxStage = null;

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
        if (panel) panel.setAttribute(REDUCED_ATTR, mq.matches ? '1' : '0');
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  if (!S.observer && S.nodes.panel && typeof IntersectionObserver === 'function') {
    try {
      S.observer = new IntersectionObserver((entries) => {
        const e = entries[0];
        S.inView = !e || e.isIntersecting;
        if (!S.inView) stopLoop();
        else if (S.playing) startLoop();
      });
      S.observer.observe(S.nodes.panel);
    } catch { /* observation indisponible : la boucle reste active. */ }
  }
}

/* Rappel du cadre schématique, posé sur la carte sans toucher à la donnée. */
function addMapBadge() {
  const scope = ctxLayout || ctxStage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = document.createElement('div');
  badge.className = P + '-badge';
  badge.id = BADGE_ID;
  badge.textContent = 'Altimétrie schématique : relief gaussien déterministe, isolignes interpolées, pente = dénivelé / distance et comparaison à une route de montagne de 8 %.';
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E029', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctxStage = ctx.stage;
  ctxLayout = ctx.layout || ctx.stage;
  ctxReducedMotion = typeof ctx.reducedMotion === 'function' ? () => !!ctx.reducedMotion() : () => false;

  /* E029-02 : une seule feuille de style, injectée une seule fois. */
  ctx.css('geography-v2-e029', CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge();

  const reduced = ctxReducedMotion();
  S.nodes.panel.setAttribute(REDUCED_ATTR, reduced ? '1' : '0');
  if (reduced) {
    S.playing = false;
    S.sweep = 1;
  }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.mode = radio.value;
        syncControls();
      });
    });
    n.reliefs.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.relief = radio.value;
        syncControls();
      });
    });
    n.equi.addEventListener('input', () => {
      S.equi = clamp(Math.round(Number(n.equi.value) / EQUI_STEP) * EQUI_STEP, EQUI_MIN, EQUI_MAX);
      syncControls();
    });
    n.pos.addEventListener('input', () => {
      S.u = clamp(Number(n.pos.value) / 100, 0, 1);
      syncControls();
    });
    n.play.addEventListener('click', () => {
      if (ctxReducedMotion()) {
        S.sweep = 1;
        S.playing = false;
        stopLoop();
        syncControls();
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = MODE_ORDER.indexOf(S.mode);
        S.mode = MODE_ORDER[(i + step + MODE_ORDER.length) % MODE_ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 5 : -5;
        S.u = clamp(S.u + step / 100, 0, 1);
      } else if (event.key === '+' || event.key === '=') {
        S.equi = clamp(S.equi + EQUI_STEP, EQUI_MIN, EQUI_MAX);
      } else if (event.key === '-' || event.key === '−') {
        S.equi = clamp(S.equi - EQUI_STEP, EQUI_MIN, EQUI_MAX);
      } else if (event.key === 'Home' || event.key === 'End') {
        S.u = event.key === 'Home' ? 0 : 1;
      } else if (event.key === ' ' || event.key === 'Spacebar') {
        if (ctxReducedMotion()) S.sweep = 1;
        else {
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

  installGlobalListeners();
  if (S.playing) startLoop();
});
