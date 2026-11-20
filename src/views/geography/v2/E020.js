import { register } from './registry.js';

/* Lentille E020 — SECONDE PASSE (V2), vue GEOGRAPHIE.
 *
 * Thème : frontières et pays — comment délimiter, mesurer et représenter un
 * territoire. Les dix chantiers E020-01 … E020-10 sont réellement implémentés
 * ci-dessous et décrits dans UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E020.md. La
 * passe 1 (src/views/geography/E020.js) est laissée intacte et sert uniquement
 * de référence : aucun fichier partagé n'est modifié.
 *
 * Le « pays » du laboratoire est un modèle mathématique déterministe : un
 * contour polaire fait d'harmoniques, jamais une frontière réelle ni une
 * coordonnée du jeu de données. Le badge du chantier 10 le dit explicitement.
 * Les grandeurs (périmètre, aire, rugosité, degrés de voisinage) sont
 * recalculées depuis leur formule au chargement, puis réécrites en texte réel
 * dans des éléments sémantiques ; le canvas n'est qu'une surcouche.
 *
 * Contrat V2 : register('E020', ctx => {...}), ctx = { viewId, stage, layout,
 * css, el, reducedMotion() }. Une seule feuille CSS `geography-v2-e020`, des
 * identifiants préfixés `geography-v2-e020-*`, un seul radiogroupe, une seule
 * région live `role="status" aria-live="polite"`, une seule boucle rAF mise en
 * pause sur `document.hidden` et sur `ctx.reducedMotion()`, des cibles ≥ 36 px,
 * un focus visible, aucun journal de débogage, aucun appel réseau, aucune
 * valeur aléatoire. Français intégral.
 */

const CSS_ID = 'geography-v2-e020';

const ID = {
  panel: 'geography-v2-e020-panel',
  title: 'geography-v2-e020-title',
  mode: 'geography-v2-e020-mode',
  modePerimetre: 'geography-v2-e020-mode-perimetre',
  modeAire: 'geography-v2-e020-mode-aire',
  modeVoisinage: 'geography-v2-e020-mode-voisinage',
  tol: 'geography-v2-e020-tol',
  tolOut: 'geography-v2-e020-tol-value',
  canvas: 'geography-v2-e020-canvas',
  canvasDesc: 'geography-v2-e020-canvas-desc',
  legend: 'geography-v2-e020-legend',
  notions: 'geography-v2-e020-notions',
  mesures: 'geography-v2-e020-mesures',
  voisins: 'geography-v2-e020-voisins',
  modePrev: 'geography-v2-e020-mode-prev',
  modeNext: 'geography-v2-e020-mode-next',
  tolPrev: 'geography-v2-e020-tol-prev',
  tolNext: 'geography-v2-e020-tol-next',
  play: 'geography-v2-e020-play',
  readout: 'geography-v2-e020-readout',
  badge: 'geography-v2-e020-badge',
};

/* ---------- Constantes géométriques déterministes ---------- */

const N_FIN = 240;        /* contour de référence, 240 sommets */
const N_GROS = 24;        /* mesure grossière, 24 sommets (pas de mesure) */
const ECHELLE_KM = 800;   /* 1 unité normalisée = 800 km */
const R_REFERENCE = 0.30; /* rayon moyen du cercle de référence */
const Y_MIN = 0.16;
const Y_MAX = 0.84;
const X_MERIDIEN = 0.62;
const MAX_DPR = 2;        /* densité de pixels plafonnée (performance) */

const MODES = {
  perimetre: 'Périmètre et paradoxe de la côte',
  aire: 'Aire et taux d’occupation',
  voisinage: 'Voisinage, enclaves et exclaves',
};
const ORDRE_MODES = ['perimetre', 'aire', 'voisinage'];
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

/* État de module : survit au `stage.innerHTML = ''` de la coque (E020-10). */
const S = {
  mode: 'perimetre',
  simpl: 0,
  sweep: 0.15,
  playing: false,
  reduced: false,
  lastTs: 0,
  rafId: 0,
  listenersInstalled: false,
  nodes: null,
  cells: {},
};

/* ---------- E020-01 : contour déterministe et boîte englobante ---------- */

const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
const entier = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const pct = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');

/* Rayon polaire : harmoniques déterministes, dont deux de haute fréquence
 * (17 et 41) qui produisent le détail côtier exploité au chantier 03. */
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

/* ---------- Feuille de style unique (V2 : classe + ids préfixés) ---------- */

const CSS = `
.geography-v2-e020-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);font-size:11px;line-height:1.6;
}
.geography-v2-e020-panel h2{
  margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e);
}
.geography-v2-e020-panel h3{margin:12px 0 4px;font-size:11px;color:var(--gold,#e6b96f)}
.geography-v2-e020-panel p{margin:5px 0;max-width:68ch}
.geography-v2-e020-panel .geography-v2-e020-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e020-panel table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
}
.geography-v2-e020-panel caption{
  text-align:left;margin-bottom:4px;color:var(--muted,#a8a198);
}
.geography-v2-e020-panel th,.geography-v2-e020-panel td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e020-panel th{color:var(--gold-bright,#f4d69e);font-weight:600}
.geography-v2-e020-panel td{font-variant-numeric:tabular-nums}
#geography-v2-e020-mode{
  margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px;
}
#geography-v2-e020-mode legend{padding:0 4px;color:var(--gold,#e6b96f)}
.geography-v2-e020-panel .geography-v2-e020-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
.geography-v2-e020-panel .geography-v2-e020-choix input{
  min-width:20px;min-height:20px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e020-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e020-valeur{
  font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600;
}
#geography-v2-e020-canvas{
  display:block;width:100%;height:320px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.32);touch-action:manipulation;
}
#geography-v2-e020-canvas:focus-visible{outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-v2-e020-legend,.geography-v2-e020-help{font-size:10px;color:var(--muted,#a8a198)}
#geography-v2-e020-readout{
  min-height:64px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e020-readout strong{color:var(--gold-bright,#f4d69e)}
.geography-v2-e020-panel .geography-v2-e020-row{
  display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0;
}
.geography-v2-e020-panel .geography-v2-e020-btn{
  flex:1 1 auto;min-width:0;width:auto;min-height:44px;margin:0;padding:6px 10px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  touch-action:manipulation;transition:border-color .18s,background-color .18s;
}
.geography-v2-e020-panel .geography-v2-e020-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e020-panel .geography-v2-e020-btn[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.16);
}
.geography-v2-e020-panel .geography-v2-e020-btn:focus-visible,
.geography-v2-e020-panel input:focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.geography-v2-e020-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.geography-v2-e020-panel[data-geography-v2-e020-reduced="1"] .geography-v2-e020-btn,
.geography-v2-e020-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  .geography-v2-e020-panel .geography-v2-e020-btn,.geography-v2-e020-badge{
    transition:none!important;animation:none!important;
  }
}
@media (max-width:620px){
  .geography-v2-e020-panel{font-size:10px;padding:9px}
  #geography-v2-e020-canvas{height:260px}
  .geography-v2-e020-panel .geography-v2-e020-choix{margin-right:4px}
  .geography-v2-e020-panel .geography-v2-e020-btn{flex:1 1 44%}
}
@media (forced-colors:active){
  .geography-v2-e020-panel{border:1px solid CanvasText}
  .geography-v2-e020-panel .geography-v2-e020-btn[aria-pressed="true"]{
    outline:2px solid Highlight;
  }
}
`;

/* ---------- E020-10 : texte sémantique, lisible sans animation ---------- */

function faitsStatiques(ctx) {
  const conteneur = ctx.el('div', 'geography-v2-e020-faits');
  const textes = [
    'Une frontière est une ligne conventionnelle qui sépare deux territoires ; elle peut suivre un accident naturel (rivière, crête) ou une construction géométrique (méridien, parallèle).',
    'Le « paradoxe de la côte » désigne le fait que la longueur mesurée d’un contour augmente quand le pas de mesure diminue : un détail fin est invisible à grossière échelle.',
    'L’aire d’un polygone se calcule par la formule du lacet ; le taux d’occupation compare cette aire à celle de la boîte englobante, qui est toujours un rectangle de référence plus grand.',
    'Une enclave est un territoire entièrement entouré par un autre ; une exclave est séparée du territoire principal par un corridor ou par un État tiers.',
  ];
  textes.forEach((texte) => {
    conteneur.appendChild(ctx.el('p', 'geography-v2-e020-fait', texte));
  });
  return conteneur;
}

function tableauNotions(ctx) {
  const table = ctx.el('table', 'geography-v2-e020-table');
  table.id = ID.notions;
  table.appendChild(ctx.el('caption', '',
    'Notions de délimitation : chaque repère est décrit par un signe, jamais par la seule couleur.'));
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Notion', 'Définition', 'Repère non coloré'].forEach((titre) => {
    const th = ctx.el('th', '', titre);
    th.setAttribute('scope', 'col');
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
      const cellule = ctx.el(index === 0 ? 'th' : 'td', '', texte);
      if (index === 0) cellule.setAttribute('scope', 'row');
      tr.appendChild(cellule);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* E020-03/04/06/08 : grandeurs chiffrées en texte indexable, avec références. */
const MESURES = [
  ['perimetreGros', 'Périmètre à 24 sommets', () => `${entier(L_GROS)} km`],
  ['perimetreFin', 'Périmètre à 240 sommets', () => `${entier(L_FIN)} km`],
  ['detail', 'Gain de détail (240 / 24)', () => `×${fmt(L_FIN / L_GROS)}`],
  ['rugosite', 'Rugosité vs cercle de référence', () => `${fmt(RUGOSITE)}× (${entier(L_CERCLE)} km)`],
  ['aire', 'Aire du polygone', () => `${entier(AIRE_POLY)} km²`],
  ['occupation', 'Taux d’occupation de la boîte', () => `${pct(OCCUPATION)} % (${entier(AIRE_BOITE)} km²)`],
  ['carre', 'Côté du carré de même aire', () => `${entier(COTE_REFERENCE)} km`],
  ['riviere', 'Frontière naturelle (rivière)', () => `${entier(L_RIVIERE)} km`],
  ['meridien', 'Frontière géométrique (méridien)', () => `${entier(L_MERIDIEN)} km`],
  ['degre', 'Degré moyen du graphe', () => `${fmt(DEGRE_MOYEN)} (chaîne ${fmt(DEGRE_CHAINE)}, complet 5)`],
];

function tableauMesures(ctx) {
  const table = ctx.el('table', 'geography-v2-e020-table');
  table.id = ID.mesures;
  table.appendChild(ctx.el('caption', '',
    'Grandeurs recalculées depuis leur formule ; trois d’entre elles sont comparées à une référence explicite.'));
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Valeur'].forEach((titre) => {
    const th = ctx.el('th', '', titre);
    th.setAttribute('scope', 'col');
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  const cells = {};
  MESURES.forEach(([key, label]) => {
    const tr = document.createElement('tr');
    const th = ctx.el('th', '', label);
    th.setAttribute('scope', 'row');
    const td = ctx.el('td', '', '—');
    cells[key] = td;
    tr.append(th, td);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  S.cells = cells;
  return table;
}

function tableauVoisins(ctx) {
  const table = ctx.el('table', 'geography-v2-e020-table');
  table.id = ID.voisins;
  table.appendChild(ctx.el('caption', '',
    `Degrés du graphe de voisinage (référence : chaîne = ${fmt(DEGRE_CHAINE)}, graphe complet = 5).`));
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Pays', 'Degré', 'Voisins'].forEach((titre) => {
    const th = ctx.el('th', '', titre);
    th.setAttribute('scope', 'col');
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  const d = degrees();
  SOMMETS.forEach((s) => {
    const voisins = ARETES.filter(([u, v]) => u === s || v === s).map(([u, v]) => (u === s ? v : u));
    const tr = document.createElement('tr');
    const th = ctx.el('th', '', `Pays ${s}`);
    th.setAttribute('scope', 'row');
    tr.appendChild(th);
    tr.appendChild(ctx.el('td', '', String(d[s])));
    tr.appendChild(ctx.el('td', '', voisins.map((v) => `Pays ${v}`).join(' · ')));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function buildPanel(ctx) {
  let panel = document.getElementById(ID.panel);
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    return {
      panel,
      fresh: false,
      radios: [
        document.getElementById(ID.modePerimetre),
        document.getElementById(ID.modeAire),
        document.getElementById(ID.modeVoisinage),
      ],
      tol: document.getElementById(ID.tol),
      tolOut: document.getElementById(ID.tolOut),
      canvas: document.getElementById(ID.canvas),
      readout: document.getElementById(ID.readout),
      legend: document.getElementById(ID.legend),
      play: document.getElementById(ID.play),
      modePrev: document.getElementById(ID.modePrev),
      modeNext: document.getElementById(ID.modeNext),
      tolPrev: document.getElementById(ID.tolPrev),
      tolNext: document.getElementById(ID.tolNext),
    };
  }

  panel = ctx.el('section', 'geography-v2-e020-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const titre = ctx.el('h2', 'geography-v2-e020-title', 'Frontières et pays V2 : délimiter et mesurer un territoire');
  titre.id = ID.title;
  const intro = ctx.el('p', '',
    'Une frontière ne se dessine pas toute seule : elle résulte d’un choix de tracé, '
    + 'd’une échelle de mesure et d’une règle de simplification. Ce laboratoire rend '
    + 'ces choix visibles et mesurables sur un pays fictif déterministe, sans toucher '
    + 'à la carte d’origine ni à ses données.');

  /* E020-10 : choix unique → radiogroupe explicite, jamais aria-pressed. */
  const fieldset = ctx.el('fieldset', '');
  fieldset.id = ID.mode;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.appendChild(ctx.el('legend', '', 'Mesure à observer (choix unique)'));
  const radios = [];
  [['perimetre', 'Périmètre', ID.modePerimetre],
    ['aire', 'Aire', ID.modeAire],
    ['voisinage', 'Voisinage', ID.modeVoisinage]].forEach(([valeur, libelle, id]) => {
    const lab = ctx.el('label', 'geography-v2-e020-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e020-mode';
    radio.id = id;
    radio.value = valeur;
    radio.checked = S.mode === valeur;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(libelle));
    fieldset.appendChild(lab);
    radios.push(radio);
  });

  const sousTitreTol = ctx.el('h3', '', 'Simplifier le contour');
  const tolRow = ctx.el('p', '');
  const tolLabel = document.createElement('label');
  tolLabel.setAttribute('for', ID.tol);
  tolLabel.appendChild(document.createTextNode('Tolérance de Douglas–Peucker : '));
  const tolOut = ctx.el('span', 'geography-v2-e020-valeur', NIVEAUX[S.simpl].label);
  tolOut.id = ID.tolOut;
  tolLabel.appendChild(tolOut);
  tolRow.appendChild(tolLabel);
  const tol = document.createElement('input');
  tol.type = 'range';
  tol.id = ID.tol;
  tol.min = '1';
  tol.max = String(NIVEAUX.length);
  tol.step = '1';
  tol.value = String(S.simpl + 1);
  tol.setAttribute('aria-label',
    'Tolérance de simplification du contour : 1 aucune, 2 légère, 3 forte');
  tolRow.appendChild(tol);

  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);
  canvas.setAttribute('aria-label',
    'Laboratoire de frontières V2 : contour, boîte englobante, frontière naturelle et '
    + 'géométrique, enclave et exclave, graphe de voisinage. Équivalent clavier : '
    + 'flèches gauche et droite pour changer de mesure, flèches haut et bas pour '
    + 'changer la tolérance, Espace pour lancer ou arrêter le balayage de la règle.');
  const canvasDesc = ctx.el('p', 'geography-v2-e020-help',
    'Le dessin illustre les formules ; les grandeurs sont données en texte dans le tableau '
    + 'et la région live ci-dessous. Clavier : ← → mesure, ↑ ↓ tolérance, Espace balayage.');
  canvasDesc.id = ID.canvasDesc;

  const legende = ctx.el('p', 'geography-v2-e020-legend', `${MODES[S.mode]} · ${REPERES[S.mode]}`);
  legende.id = ID.legend;

  /* E020-09 : commandes nommées, cibles ≥ 36 px, en plus du clavier canvas. */
  const row = ctx.el('div', 'geography-v2-e020-row');
  const button = (id, text, aria) => {
    const b = ctx.el('button', 'geography-v2-e020-btn', text);
    b.type = 'button';
    b.id = id;
    b.setAttribute('aria-label', aria);
    return b;
  };
  const modePrev = button(ID.modePrev, '◀ Mesure', 'Mesure précédente');
  const modeNext = button(ID.modeNext, 'Mesure ▶', 'Mesure suivante');
  const tolPrev = button(ID.tolPrev, 'Tolérance −', 'Diminuer la tolérance de simplification');
  const tolNext = button(ID.tolNext, 'Tolérance +', 'Augmenter la tolérance de simplification');
  const play = ctx.el('button', 'geography-v2-e020-btn',
    S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  row.append(modePrev, modeNext, tolPrev, tolNext, play);

  /* Une seule région live du module. */
  const readout = ctx.el('p', 'geography-v2-e020-readout');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const note = ctx.el('p', '',
    'Le pays dessiné est un modèle mathématique déterministe : aucune frontière réelle '
    + 'ni coordonnée du jeu de données n’intervient dans ce laboratoire. La vue '
    + 'Géographie d’origine reste intacte et utilisable sans ce panneau.');

  panel.append(titre, intro, faitsStatiques(ctx));
  panel.append(ctx.el('h3', '', 'Notions de délimitation'), tableauNotions(ctx));
  panel.append(ctx.el('h3', '', 'Mesures vérifiables'), tableauMesures(ctx));
  panel.append(fieldset, sousTitreTol, tolRow, canvas, canvasDesc, legende, row);
  panel.append(ctx.el('h3', '', 'Voisinage du pays fictif'), tableauVoisins(ctx));
  panel.append(readout, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host) : ctx.stage;
  if (aside && typeof aside.insertBefore === 'function') aside.insertBefore(panel, aside.firstChild);
  else if (host && typeof host.appendChild === 'function') host.appendChild(panel);

  return {
    panel, fresh: true, radios, tol, tolOut, canvas, readout, legend,
    play, modePrev, modeNext, tolPrev, tolNext,
  };
}

/* ---------- E020-03/04/06/08 : texte de la région live ---------- */

function updateReadout() {
  const n = S.nodes;
  if (!n || !n.readout) return;
  n.readout.textContent = '';
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const ajouter = (texte, value) => {
    n.readout.appendChild(document.createTextNode(texte));
    n.readout.appendChild(fort(value));
  };

  ajouter('Périmètre : ', `${entier(L_GROS)} km`);
  n.readout.appendChild(document.createTextNode(' à 24 sommets contre '));
  ajouter('', `${entier(L_FIN)} km`);
  n.readout.appendChild(document.createTextNode(` à 240 sommets (gain de détail ×${fmt(L_FIN / L_GROS)}). Rugosité : `));
  ajouter('', `${fmt(RUGOSITE)}×`);
  n.readout.appendChild(document.createTextNode(` le cercle de référence (${entier(L_CERCLE)} km). `));

  n.readout.appendChild(document.createTextNode('Aire : '));
  ajouter('', `${entier(AIRE_POLY)} km²`);
  n.readout.appendChild(document.createTextNode(` = ${pct(OCCUPATION)} % de la boîte (${entier(AIRE_BOITE)} km²) ; carré équivalent `));
  ajouter('', `${entier(COTE_REFERENCE)} km`);
  n.readout.appendChild(document.createTextNode(' de côté. '));

  n.readout.appendChild(document.createTextNode('Frontières : rivière '));
  ajouter('', `${entier(L_RIVIERE)} km`);
  n.readout.appendChild(document.createTextNode(' contre méridien '));
  ajouter('', `${entier(L_MERIDIEN)} km`);
  n.readout.appendChild(document.createTextNode(' sur la même étendue nord–sud. '));

  n.readout.appendChild(document.createTextNode('Voisinage : degré moyen '));
  ajouter('', fmt(DEGRE_MOYEN));
  n.readout.appendChild(document.createTextNode(` (référence chaîne ${fmt(DEGRE_CHAINE)}, complet 5) ; 1 enclave, 1 exclave. `));
  n.readout.appendChild(document.createTextNode(`Mesure affichée : ${MODES[S.mode]}.`));
}

function fillMesures() {
  MESURES.forEach(([key, , value]) => {
    const cellule = S.cells[key];
    if (cellule) cellule.textContent = value();
  });
}

function syncControls() {
  const n = S.nodes;
  if (!n) return;
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
  if (n.panel) n.panel.dataset.geographyV2E020Reduced = S.reduced ? '1' : '0';
  fillMesures();
  updateReadout();
  drawLab();
}

/* ---------- Dessin du laboratoire (E020-02, 05, 06, 07, 08) ---------- */

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
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 360;
  const cssH = cv.clientHeight || 320;
  const dpr = Math.min(MAX_DPR, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
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
    const cotePx = (COTE_REFERENCE / ECHELLE_KM) * size;
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

/* ---------- E020-09 : une seule boucle rAF, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    try { cancelAnimationFrame(S.rafId); } catch { /* environnement sans rAF */ }
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced || !S.playing) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced || !S.playing) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.sweep = (S.sweep + dt * 0.00009) % 1;
  }
  S.lastTs = ts;
  drawLab();
  S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  if (S.listenersInstalled) return;
  S.listenersInstalled = true;
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else startLoop();
    });
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = (event) => {
        S.reduced = !!(event && event.matches);
        if (S.reduced) stopLoop(); else startLoop();
        if (S.nodes && S.nodes.panel) {
          S.nodes.panel.dataset.geographyV2E020Reduced = S.reduced ? '1' : '0';
        }
      };
      if (typeof query.addEventListener === 'function') query.addEventListener('change', onChange);
      else if (typeof query.addListener === 'function') query.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }
}

/* ---------- E020-10 : badge d'honnêteté sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e020-badge',
    'Pays schématique V2 : géométrie déterministe de démonstration. Aucune frontière réelle ni coordonnée du jeu de données dans ce laboratoire.');
  badge.id = ID.badge;
  map.appendChild(badge);
}

/* ---------- Écouteurs de contrôles (posés une seule fois) ---------- */

function wirePanel(ctx) {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  const stepMode = (delta) => {
    const i = ORDRE_MODES.indexOf(S.mode);
    S.mode = ORDRE_MODES[(i + delta + ORDRE_MODES.length) % ORDRE_MODES.length];
    syncControls();
  };
  const stepTol = (delta) => {
    S.simpl = Math.max(0, Math.min(NIVEAUX.length - 1, S.simpl + delta));
    syncControls();
  };
  const togglePlay = () => {
    S.playing = !S.playing;
    if (S.playing) startLoop(); else stopLoop();
    syncControls();
  };

  n.radios.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      S.mode = radio.value;
      syncControls();
    });
  });
  if (n.tol) n.tol.addEventListener('input', () => {
    const i = Math.max(1, Math.min(NIVEAUX.length, Math.round(Number(n.tol.value))));
    S.simpl = i - 1;
    syncControls();
  });
  if (n.modePrev) n.modePrev.addEventListener('click', () => stepMode(-1));
  if (n.modeNext) n.modeNext.addEventListener('click', () => stepMode(1));
  if (n.tolPrev) n.tolPrev.addEventListener('click', () => stepTol(-1));
  if (n.tolNext) n.tolNext.addEventListener('click', () => stepTol(1));
  if (n.play) n.play.addEventListener('click', togglePlay);

  if (n.canvas) n.canvas.addEventListener('keydown', (event) => {
    let utilise = true;
    if (event.key === 'ArrowLeft') stepMode(-1);
    else if (event.key === 'ArrowRight') stepMode(1);
    else if (event.key === 'ArrowUp') stepTol(1);
    else if (event.key === 'ArrowDown') stepTol(-1);
    else if (event.key === ' ' || event.key === 'Spacebar') togglePlay();
    else utilise = false;
    if (utilise) { event.preventDefault(); }
  });
  void ctx; /* signature conservée pour d'éventuels ajustements locaux */
}

/* ---------- Point d'entrée unique ---------- */

register('E020', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }
  if (S.reduced) S.playing = false;

  S.nodes = buildPanel(ctx);
  addMapBadge(ctx);
  syncControls();
  wirePanel(ctx);
  installGlobalListeners();
  if (S.playing) startLoop();
});
