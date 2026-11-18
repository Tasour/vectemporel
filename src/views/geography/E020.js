import { register } from './registry.js';

/* Lentille E020 — vue GEOGRAPHIE.
 * Thème : frontières et pays — comment délimiter, mesurer et représenter un territoire.
 *
 * Les dix chantiers E020-01 … E020-10 sont réellement implémentés ci-dessous
 * et décrits dans UNIFIED_AUDIT/GEOGRAPHIE/views/E020.md. Le sujet n'est pas
 * une carte de frontières réelles (le jeu de données n'en fournit pas) mais
 * la manière de délimiter et de mesurer un territoire : contour, projection,
 * paradoxe de la côte, aire au lacet, simplification de Douglas–Peucker,
 * frontières naturelles/géométriques, enclave/exclave et graphe de voisinage.
 * Le « pays » du laboratoire est donc un modèle mathématique déterministe,
 * explicitement signalé comme tel par le badge (chantier 10).
 *
 * Contrat : register('E020', ctx => {...}), ctx = { viewId, stage, layout,
 * css, el, reducedMotion() }. Un seul appel à ctx.css('geography-e020', …),
 * des identifiants préfixés geography-e020-*, aucun appel réseau, aucune
 * graine aléatoire, aucune console, une seule boucle rAF mise en pause sur
 * document.hidden. Le texte pédagogique est du HTML sémantique réel, lisible
 * sans animation ; le canvas n'est qu'un laboratoire.
 */

const CSS_ID = 'geography-e020';
const PANEL_ID = 'geography-e020-panel';
const TITLE_ID = 'geography-e020-title';
const MODE_ID = 'geography-e020-mode';
const TOL_ID = 'geography-e020-tol';
const TOL_OUT_ID = 'geography-e020-tol-value';
const CANVAS_ID = 'geography-e020-canvas';
const READOUT_ID = 'geography-e020-readout';
const PLAY_ID = 'geography-e020-play';
const LEGEND_ID = 'geography-e020-legend';
const HELP_ID = 'geography-e020-help';
const TABLE_ID = 'geography-e020-table';
const VOISINS_ID = 'geography-e020-voisins';
const BADGE_ID = 'geography-e020-badge';

/* ---------- Constantes géométriques déterministes ---------- */

const N_FIN = 240;        /* contour de référence, 240 sommets */
const N_GROS = 24;        /* mesure grossière, 24 sommets (pas de mesure) */
const ECHELLE_KM = 800;   /* 1 unité normalisée = 800 km */
const R_REFERENCE = 0.30; /* rayon moyen du cercle de référence */
const Y_MIN = 0.16;
const Y_MAX = 0.84;
const X_MERIDIEN = 0.62;
const MODES = {
  perimetre: 'Périmètre et paradoxe de la côte',
  aire: 'Aire et taux d’occupation',
  voisinage: 'Voisinage, enclaves et exclaves',
};
const REPERES = {
  perimetre: 'trait plein = contour ; tirets = boîte englobante ; doubles flèches = pas de mesure',
  aire: 'hachures = aire occupée ; tirets = boîte englobante ; le carré de référence a la même aire',
  voisinage: 'rond = pays ; trait = adjacency ; croix = enclave ; losange = exclave ; tirets = boîte',
};
const NIVEAUX = [
  { eps: 0, label: 'aucune · 240 sommets' },
  { eps: 0.004, label: 'légère' },
  { eps: 0.012, label: 'forte' },
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  mode: 'perimetre',
  simpl: 0,
  sweep: 0.15,
  playing: false,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- E020-01 : contour déterministe et boîte englobante ---------- */

const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
const entier = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const pct = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');

/* Rayon polaire : harmoniques déterministes, dont deux de haute fréquence
 * (17 et 41) qui produisent le détail côtier du chantier 03. */
function rayon(theta) {
  return 0.30
    + 0.05 * Math.cos(3 * theta)
    + 0.03 * Math.sin(5 * theta)
    + 0.012 * Math.sin(17 * theta)
    + 0.006 * Math.cos(41 * theta);
}

function pointContour(theta) {
  const r = rayon(theta);
  return { x: 0.5 + r * Math.cos(theta), y: 0.5 + r * Math.sin(theta) };
}

function contour(n) {
  const pts = [];
  for (let k = 0; k < n; k += 1) pts.push(pointContour((2 * Math.PI * k) / n));
  return pts;
}

function boiteEnglobante(pts) {
  let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
  pts.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  return { minX, maxX, minY, maxY };
}

/* ---------- E020-03 : périmètre, paradoxe de la côte ---------- */

function perimetre(pts) {
  let somme = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    somme += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return somme * ECHELLE_KM;
}

/* ---------- E020-04 : aire par la formule du lacet (shoelace) ---------- */

function aire(pts) {
  let somme = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    somme += a.x * b.y - b.x * a.y;
  }
  return (Math.abs(somme) / 2) * ECHELLE_KM * ECHELLE_KM;
}

/* ---------- E020-05 : simplification de Douglas–Peucker ---------- */

function distanceSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function douglasPeucker(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const a = pts[0];
  const b = pts[pts.length - 1];
  let maxD = -1;
  let idx = -1;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const d = distanceSegment(pts[i], a, b);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > eps) {
    const gauche = douglasPeucker(pts.slice(0, idx + 1), eps);
    const droite = douglasPeucker(pts.slice(idx), eps);
    return gauche.slice(0, -1).concat(droite);
  }
  return [a, b];
}

function simplifier(pts, eps) {
  if (eps <= 0) return pts.slice();
  const h = Math.floor(pts.length / 2);
  const haut = douglasPeucker(pts.slice(0, h + 1), eps);
  const bas = douglasPeucker(pts.slice(h).concat([pts[0]]), eps);
  return haut.slice(0, -1).concat(bas.slice(0, -1));
}

/* ---------- E020-06 : frontière naturelle (rivière) et géométrique ---------- */

function xRiviere(y) {
  return 0.5 + 0.07 * Math.sin(8 * y + 0.6) + 0.02 * Math.sin(21 * y);
}

function longueurRiviere() {
  const pas = 200;
  let somme = 0;
  let precedent = { x: xRiviere(Y_MIN), y: Y_MIN };
  for (let i = 1; i <= pas; i += 1) {
    const y = Y_MIN + ((Y_MAX - Y_MIN) * i) / pas;
    const courant = { x: xRiviere(y), y };
    somme += Math.hypot(courant.x - precedent.x, courant.y - precedent.y);
    precedent = courant;
  }
  return somme * ECHELLE_KM;
}

/* ---------- E020-08 : graphe de voisinage déterministe ---------- */

const SOMMETS = ['A', 'B', 'C', 'D', 'E', 'F'];
const ARETES = [['A', 'B'], ['A', 'C'], ['B', 'C'], ['B', 'D'], ['C', 'E'], ['D', 'E'], ['E', 'F']];
const POS_VOISINS = {
  A: [0.12, 0.24], B: [0.36, 0.10], C: [0.30, 0.48],
  D: [0.64, 0.18], E: [0.56, 0.58], F: [0.86, 0.46],
};

function degrees() {
  const d = {};
  SOMMETS.forEach((s) => { d[s] = 0; });
  ARETES.forEach(([u, v]) => { d[u] += 1; d[v] += 1; });
  return d;
}

/* ---------- Précalcul (aucune valeur tirée au hasard) ---------- */

const CONTOUR_FIN = contour(N_FIN);
const CONTOUR_GROS = contour(N_GROS);
const CONTOURS_SIMPLIFIES = NIVEAUX.map((n) => simplifier(CONTOUR_FIN, n.eps));
const BOITE = boiteEnglobante(CONTOUR_FIN);
const CUM = [0];
for (let i = 0; i < CONTOUR_FIN.length; i += 1) {
  const a = CONTOUR_FIN[i];
  const b = CONTOUR_FIN[(i + 1) % CONTOUR_FIN.length];
  CUM.push(CUM[i] + Math.hypot(b.x - a.x, b.y - a.y));
}
const TOTAL_NORM = CUM[CUM.length - 1];

const L_GROS = perimetre(CONTOUR_GROS);
const L_FIN = perimetre(CONTOUR_FIN);
const L_CERCLE = 2 * Math.PI * R_REFERENCE * ECHELLE_KM;
const RUGOSITE = L_FIN / L_CERCLE;
const AIRE_POLY = aire(CONTOUR_FIN);
const AIRE_BOITE = (BOITE.maxX - BOITE.minX) * (BOITE.maxY - BOITE.minY) * ECHELLE_KM * ECHELLE_KM;
const OCCUPATION = (AIRE_POLY / AIRE_BOITE) * 100;
const COTE_REFERENCE = Math.sqrt(AIRE_POLY);
const L_RIVIERE = longueurRiviere();
const L_MERIDIEN = (Y_MAX - Y_MIN) * ECHELLE_KM;
const DEGRE_MOYEN = (2 * ARETES.length) / SOMMETS.length;
const DEGRE_CHAINE = (2 * (SOMMETS.length - 1)) / SOMMETS.length;

function pointAtdeplacement(s) {
  const cible = s * TOTAL_NORM;
  let i = 0;
  while (i < CUM.length - 2 && CUM[i + 1] < cible) i += 1;
  const a = CONTOUR_FIN[i];
  const b = CONTOUR_FIN[(i + 1) % CONTOUR_FIN.length];
  const segment = CUM[i + 1] - CUM[i] || 1;
  const t = Math.max(0, Math.min(1, (cible - CUM[i]) / segment));
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/* ---------- Feuille de style unique ---------- */

const CSS = `
#geography-e020-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e020-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e020-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e020-panel p{margin:5px 0;max-width:68ch}
#geography-e020-panel .geography-e020-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e020-table,#geography-e020-voisins{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
}
#geography-e020-table caption,#geography-e020-voisins caption{
  text-align:left;margin-bottom:4px;color:var(--muted);
}
#geography-e020-table th,#geography-e020-table td,
#geography-e020-voisins th,#geography-e020-voisins td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
#geography-e020-table th,#geography-e020-voisins th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e020-mode{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e020-mode legend{padding:0 4px;color:var(--muted)}
#geography-e020-panel .geography-e020-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e020-panel .geography-e020-choix input{
  min-width:20px;min-height:20px;accent-color:var(--gold,#e6b96f);
}
#geography-e020-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
.geography-e020-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e020-canvas{
  display:block;width:100%;height:320px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e020-legend,#geography-e020-help{font-size:10px;color:var(--muted)}
#geography-e020-readout{
  min-height:64px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e020-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e020-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#geography-e020-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e020-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e020-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e020-panel[data-geography-e020-reduced="1"] button,
.geography-e020-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e020-panel button,.geography-e020-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e020-panel{font-size:10px;padding:9px}
  #geography-e020-canvas{height:260px}
  #geography-e020-panel .geography-e020-choix{margin-right:4px}
}
`;

/* ---------- Texte sémantique, lisible sans JS ---------- */

function faitsStatiques() {
  const conteneur = document.createElement('div');
  const textes = [
    'Une frontière est une ligne conventionnelle qui sépare deux territoires ; elle peut suivre un accident naturel (rivière, crête) ou une construction géométrique (méridien, parallèle).',
    'Le « paradoxe de la côte » désigne le fait que la longueur mesurée d’un contour augmente quand le pas de mesure diminue : un détail fin est invisible à grossière échelle.',
    'L’aire d’un polygone se calcule par la formule du lacet ; le taux d’occupation compare cette aire à celle de la boîte englobante, qui est toujours un rectangle de référence plus grand.',
    'Une enclave est un territoire entièrement entouré par un autre ; une exclave est séparée du territoire principal par un corridor ou par un État tiers.',
  ];
  textes.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e020-fait';
    p.textContent = texte;
    conteneur.appendChild(p);
  });
  return conteneur;
}

function tableauStatique() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Notions de délimitation : chaque repère est décrit par un signe, jamais par la seule couleur.';
  table.appendChild(caption);
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Notion', 'Définition', 'Repère non coloré'].forEach((titre) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = titre;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  [
    ['Frontière naturelle', 'Suit un accident du terrain, ici une rivière sinueuse', 'Trait plein + mot « rivière »'],
    ['Frontière géométrique', 'Ligne droite conventionnelle, ici un méridien', 'Tirets + mot « méridien »'],
    ['Enclave / exclave', 'Territoire inclus / territoire détaché', 'Croix / losange + étiquette'],
    ['Simplification', 'Réduction du nombre de sommets à tolérance donnée', 'Points aux sommets retenus'],
  ].forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((texte, index) => {
      const cellule = document.createElement(index === 0 ? 'th' : 'td');
      if (index === 0) cellule.scope = 'row';
      cellule.textContent = texte;
      tr.appendChild(cellule);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function tableauVoisins() {
  const table = document.createElement('table');
  table.id = VOISINS_ID;
  const caption = document.createElement('caption');
  caption.textContent = `Degrés du graphe de voisinage (référence : chaîne = ${fmt(DEGRE_CHAINE)}, graphe complet = 5).`;
  table.appendChild(caption);
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Pays', 'Degré', 'Voisins'].forEach((titre) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = titre;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  const d = degrees();
  SOMMETS.forEach((s) => {
    const voisins = ARETES.filter(([u, v]) => u === s || v === s).map(([u, v]) => (u === s ? v : u));
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = `Pays ${s}`;
    tr.appendChild(th);
    const tdDegre = document.createElement('td');
    tdDegre.textContent = String(d[s]);
    tr.appendChild(tdDegre);
    const tdVoisins = document.createElement('td');
    tdVoisins.textContent = voisins.map((v) => `Pays ${v}`).join(' · ');
    tr.appendChild(tdVoisins);
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
      radios: [
        document.getElementById('geography-e020-mode-perimetre'),
        document.getElementById('geography-e020-mode-aire'),
        document.getElementById('geography-e020-mode-voisinage'),
      ],
      tol: document.getElementById(TOL_ID),
      tolOut: document.getElementById(TOL_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e020-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const titre = ctx.el('h2', '', 'Frontières et pays : délimiter et mesurer un territoire');
  titre.id = TITLE_ID;
  const intro = ctx.el('p', '', 'Une frontière ne se dessine pas toute seule : elle résulte d’un choix de tracé, d’une échelle de mesure et d’une règle de simplification. Ce laboratoire rend ces choix visibles et mesurables sur un pays fictif déterministe.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = MODE_ID;
  const legende = document.createElement('legend');
  legende.textContent = 'Mesure à observer (choix unique)';
  fieldset.appendChild(legende);
  [['perimetre', 'Périmètre'], ['aire', 'Aire'], ['voisinage', 'Voisinage']].forEach(([valeur, libelle]) => {
    const lab = ctx.el('label', 'geography-e020-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e020-mode';
    radio.id = `geography-e020-mode-${valeur}`;
    radio.value = valeur;
    radio.checked = S.mode === valeur;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(libelle));
    fieldset.appendChild(lab);
  });

  const sousTitre = ctx.el('h3', '', 'Simplifier le contour');
  const tolRow = ctx.el('p', '');
  const tolLabel = document.createElement('label');
  tolLabel.setAttribute('for', TOL_ID);
  tolLabel.appendChild(document.createTextNode('Tolérance de Douglas–Peucker : '));
  const tolOut = document.createElement('span');
  tolOut.id = TOL_OUT_ID;
  tolOut.className = 'geography-e020-valeur';
  tolLabel.appendChild(tolOut);
  tolRow.appendChild(tolLabel);
  const tol = document.createElement('input');
  tol.type = 'range';
  tol.id = TOL_ID;
  tol.min = '1';
  tol.max = String(NIVEAUX.length);
  tol.step = '1';
  tol.value = String(S.simpl + 1);
  tol.setAttribute('aria-label', 'Tolérance de simplification du contour : 1 aucune, 2 légère, 3 forte');
  tolRow.appendChild(tol);

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-describedby', HELP_ID);
  canvas.setAttribute('aria-label', 'Laboratoire de frontières : contour, boîte englobante, frontière naturelle et géométrique, enclave et exclave, graphe de voisinage. Flèches gauche et droite : changer de mesure ; flèches haut et bas : changer la tolérance ; Espace : lancer ou arrêter le balayage de la règle de mesure.');

  const legendeTexte = ctx.el('p', 'geography-e020-legend', REPERES[S.mode]);
  legendeTexte.id = LEGEND_ID;
  const aide = ctx.el('p', 'geography-e020-help', 'Clavier : ← → mesure, ↑ ↓ tolérance, Espace balayage ; le bouton anime la règle de mesure le long du contour.');
  aide.id = HELP_ID;

  const readout = ctx.el('p', 'geography-e020-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(titre, intro, faitsStatiques(), tableauStatique(), fieldset, sousTitre, tolRow, canvas, legendeTexte, aide, tableauVoisins(), readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host) : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    fresh: true,
    radios: [
      document.getElementById('geography-e020-mode-perimetre'),
      document.getElementById('geography-e020-mode-aire'),
      document.getElementById('geography-e020-mode-voisinage'),
    ],
    tol,
    tolOut,
    canvas,
    readout,
    play,
    legend: legendeTexte,
  };
}

/* ---------- Dessin du laboratoire ---------- */

function trait(g, pts, P) {
  g.beginPath();
  pts.forEach((p, i) => {
    const xy = P(p);
    if (i === 0) g.moveTo(xy[0], xy[1]); else g.lineTo(xy[0], xy[1]);
  });
  g.closePath();
}

function dessinerGrille(g, ox, oy, size) {
  g.strokeStyle = 'rgba(255,255,255,.08)';
  g.lineWidth = 1;
  g.beginPath();
  for (let k = 1; k < 5; k += 1) {
    const d = (size * k) / 5;
    g.moveTo(ox + d, oy); g.lineTo(ox + d, oy + size);
    g.moveTo(ox, oy + d); g.lineTo(ox + size, oy + d);
  }
  g.stroke();
}

function dessinerBoite(g, ox, oy, size) {
  const bx = ox + BOITE.minX * size;
  const by = oy + BOITE.minY * size;
  const bw = (BOITE.maxX - BOITE.minX) * size;
  const bh = (BOITE.maxY - BOITE.minY) * size;
  g.setLineDash([5, 4]);
  g.strokeStyle = 'rgba(214,207,193,.72)';
  g.lineWidth = 1;
  g.strokeRect(bx, by, bw, bh);
  g.setLineDash([]);
}

function hachures(g, ox, oy, size) {
  g.save();
  trait(g, CONTOUR_FIN, (p) => [ox + p.x * size, oy + p.y * size]);
  g.clip();
  g.strokeStyle = 'rgba(230,185,111,.28)';
  g.lineWidth = 1;
  g.beginPath();
  for (let d = -size; d < size * 2; d += 8) {
    g.moveTo(ox + d, oy);
    g.lineTo(ox + d - size, oy + size);
  }
  g.stroke();
  g.restore();
}

function dessinerRiviere(g, P) {
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 1.8;
  g.setLineDash([]);
  g.beginPath();
  const pas = 120;
  for (let i = 0; i <= pas; i += 1) {
    const y = Y_MIN + ((Y_MAX - Y_MIN) * i) / pas;
    const xy = P({ x: xRiviere(y), y });
    if (i === 0) g.moveTo(xy[0], xy[1]); else g.lineTo(xy[0], xy[1]);
  }
  g.stroke();
}

function dessinerMeridien(g, P) {
  g.strokeStyle = 'rgba(214,207,193,.9)';
  g.lineWidth = 1.6;
  g.setLineDash([6, 4]);
  g.beginPath();
  const a = P({ x: X_MERIDIEN, y: Y_MIN });
  const b = P({ x: X_MERIDIEN, y: Y_MAX });
  g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
  g.stroke();
  g.setLineDash([]);
}

function dessinerEnclaveExclave(g, P, txt) {
  /* Enclave : cercle entièrement inclus dans le contour. */
  const e = P({ x: 0.32, y: 0.42 });
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 1.4;
  g.beginPath(); g.arc(e[0], e[1], 8, 0, 2 * Math.PI); g.stroke();
  g.beginPath();
  g.moveTo(e[0] - 5, e[1] - 5); g.lineTo(e[0] + 5, e[1] + 5);
  g.moveTo(e[0] - 5, e[1] + 5); g.lineTo(e[0] + 5, e[1] - 5);
  g.stroke();
  txt('enclave', e[0] + 11, e[1] + 3);

  /* Exclave : cercle extérieur relié par un corridor. */
  const x = P({ x: 0.86, y: 0.80 });
  g.setLineDash([3, 2]);
  g.beginPath();
  const c = P({ x: 0.80, y: 0.70 });
  g.moveTo(c[0], c[1]); g.lineTo(x[0], x[1]);
  g.stroke();
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(x[0], x[1] - 7); g.lineTo(x[0] + 7, x[1]);
  g.lineTo(x[0], x[1] + 7); g.lineTo(x[0] - 7, x[1]);
  g.closePath(); g.stroke();
  txt('exclave', x[0] - 40, x[1] + 16);
}

function dessinerVoisins(g, cssW, cssH, txt) {
  const gw = 118;
  const gh = 86;
  const gx = Math.max(4, cssW - gw - 12);
  const gy = 12;
  g.fillStyle = 'rgba(8,12,18,.82)';
  g.fillRect(gx, gy, gw, gh);
  g.strokeStyle = 'rgba(230,185,111,.55)';
  g.lineWidth = 1;
  g.strokeRect(gx, gy, gw, gh);
  const Pn = (s) => [gx + 8 + POS_VOISINS[s][0] * (gw - 18), gy + 8 + POS_VOISINS[s][1] * (gh - 18)];
  g.strokeStyle = 'rgba(214,207,193,.7)';
  g.beginPath();
  ARETES.forEach(([u, v]) => {
    const a = Pn(u); const b = Pn(v);
    g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
  });
  g.stroke();
  SOMMETS.forEach((s) => {
    const p = Pn(s);
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.beginPath(); g.arc(p[0], p[1], 3, 0, 2 * Math.PI); g.fill();
    txt(s, p[0] + 4, p[1] - 4);
  });
  void cssH;
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 360;
  const cssH = cv.clientHeight || 320;
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 14;
  const size = Math.max(60, Math.min(cssW - pad * 2 - 8, cssH - pad * 2 - 8));
  const ox = pad + 2;
  const oy = pad + 2;
  const P = (p) => [ox + p.x * size, oy + p.y * size];
  const txt = (s, x, y) => {
    g.fillStyle = 'rgba(244,214,158,.92)';
    g.font = '9px sans-serif';
    g.fillText(s, x, Math.max(9, Math.min(cssH - 3, y)));
  };

  dessinerGrille(g, ox, oy, size);

  if (S.mode === 'aire') {
    hachures(g, ox, oy, size);
    g.fillStyle = 'rgba(120,150,135,.16)';
    trait(g, CONTOUR_FIN, P); g.fill();
  }

  dessinerBoite(g, ox, oy, size);

  const simplifie = CONTOURS_SIMPLIFIES[S.simpl];
  g.fillStyle = 'rgba(120,150,135,.18)';
  trait(g, simplifie, P); g.fill();
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 1.6;
  trait(g, simplifie, P); g.stroke();

  /* E020-05 : les sommets retenus sont marqués (signal non coloré). */
  g.fillStyle = 'rgba(244,214,158,.95)';
  simplifie.forEach((p) => {
    const xy = P(p);
    g.fillRect(xy[0] - 1.5, xy[1] - 1.5, 3, 3);
  });

  dessinerRiviere(g, P);
  dessinerMeridien(g, P);
  dessinerEnclaveExclave(g, P, txt);

  if (S.mode === 'perimetre') {
    const m = P(pointAtdeplacement(S.sweep));
    g.strokeStyle = 'rgba(255,255,255,.95)';
    g.lineWidth = 1.6;
    g.beginPath(); g.arc(m[0], m[1], 5, 0, 2 * Math.PI); g.stroke();
    g.beginPath();
    g.moveTo(m[0] - 9, m[1]); g.lineTo(m[0] + 9, m[1]);
    g.moveTo(m[0], m[1] - 9); g.lineTo(m[0], m[1] + 9);
    g.stroke();
    txt(`${entier(L_FIN)} km · règle ${S.simpl === 0 ? 'fine' : 'simplifiée'}`, ox + 2, oy + size - 4);
  } else if (S.mode === 'aire') {
    const cotePx = COTE_REFERENCE / ECHELLE_KM * size;
    const rx = ox + size - cotePx - 4;
    const ry = oy + 4;
    g.setLineDash([3, 2]);
    g.strokeStyle = 'rgba(255,255,255,.85)';
    g.lineWidth = 1.2;
    g.strokeRect(rx, ry, cotePx, cotePx);
    g.setLineDash([]);
    txt('carré de référence', rx, ry + cotePx + 10);
  } else {
    dessinerVoisins(g, cssW, cssH, txt);
  }

  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '9px sans-serif';
  g.fillText(MODES[S.mode], ox + 2, cssH - 2);
}

/* ---------- E020-03/04/06/08 : mesures annoncées ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const ajouter = (texte, value) => {
    n.appendChild(document.createTextNode(texte));
    n.appendChild(fort(value));
  };

  n.textContent = '';
  ajouter('Périmètre : ', `${entier(L_GROS)} km`);
  n.appendChild(document.createTextNode(` à 24 sommets contre `));
  ajouter('', `${entier(L_FIN)} km`);
  n.appendChild(document.createTextNode(` à 240 sommets (gain de détail ×${fmt(L_FIN / L_GROS)}). Rugosité : `));
  ajouter('', `${fmt(RUGOSITE)}×`);
  n.appendChild(document.createTextNode(` le cercle de référence (${entier(L_CERCLE)} km). `));

  n.appendChild(document.createTextNode('Aire : '));
  ajouter('', `${entier(AIRE_POLY)} km²`);
  n.appendChild(document.createTextNode(` = ${pct(OCCUPATION)} % de la boîte (${entier(AIRE_BOITE)} km²) ; carré équivalent `));
  ajouter('', `${entier(COTE_REFERENCE)} km`);
  n.appendChild(document.createTextNode(' de côté. '));

  n.appendChild(document.createTextNode('Frontières : rivière '));
  ajouter('', `${entier(L_RIVIERE)} km`);
  n.appendChild(document.createTextNode(` contre méridien `));
  ajouter('', `${entier(L_MERIDIEN)} km`);
  n.appendChild(document.createTextNode(' sur la même étendue nord–sud. '));

  n.appendChild(document.createTextNode('Voisinage : degré moyen '));
  ajouter('', fmt(DEGRE_MOYEN));
  n.appendChild(document.createTextNode(` (référence chaîne ${fmt(DEGRE_CHAINE)}, complet 5) ; 1 enclave, 1 exclave.`));
}

function syncControls() {
  const n = S.nodes;
  n.radios.forEach((radio) => {
    if (radio) radio.checked = radio.value === S.mode;
  });
  if (n.tol) n.tol.value = String(S.simpl + 1);
  if (n.tolOut) n.tolOut.textContent = NIVEAUX[S.simpl].label;
  if (n.legend) n.legend.textContent = `${MODES[S.mode]} · ${REPERES[S.mode]}`;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
}

/* ---------- E020-09 : une seule boucle rAF, pause sur document.hidden ---------- */

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
  const reduced = typeof ctxReduced === 'function' ? !!ctxReduced() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00009) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

let ctxReduced = null;

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
        if (panel) panel.dataset.geographyE020Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- E020-10 : badge d'honnêteté sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e020-badge', 'Pays schématique : géométrie déterministe de démonstration. Aucune frontière réelle ni coordonnée du jeu de données dans ce laboratoire.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E020', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE020Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

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
    n.tol.addEventListener('input', () => {
      const i = Math.max(1, Math.min(NIVEAUX.length, Math.round(Number(n.tol.value))));
      S.simpl = i - 1;
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let utilise = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const ordre = ['perimetre', 'aire', 'voisinage'];
        const pas = event.key === 'ArrowRight' ? 1 : -1;
        const i = ordre.indexOf(S.mode);
        S.mode = ordre[(i + pas + ordre.length) % ordre.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const pas = event.key === 'ArrowUp' ? 1 : -1;
        S.simpl = Math.max(0, Math.min(NIVEAUX.length - 1, S.simpl + pas));
      } else if (event.key === ' ' || event.key === 'Spacebar') {
        S.playing = !S.playing;
        if (!S.playing) stopLoop(); else startLoop();
      } else {
        utilise = false;
      }
      if (utilise) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners();
  if (S.playing) startLoop();
});
