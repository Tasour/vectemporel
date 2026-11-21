import { register } from './registry.js';

/*
 * Lentille E080 — SECONDE PASSE (V2) : étiquettes de lieux (placement,
 * collisions, lisibilité).
 *
 * Les dix chantiers E080-01 … E080-10 sont réellement implémentés ci-dessous.
 * La V2 conserve le cœur de la passe 1 (stratégie naïve à droite, recherche
 * adaptative parmi huit positions, générateur congruentiel à graine fixe) et
 * ajoute : une fiche de vérité à trois faits sourcés, un tableau de mesures
 * recalculées à chaque changement, un défi falsifiable en cinq temps, un
 * bouton de remise à zéro et une boucle rAF unique suspendue à la fois sur
 * document.hidden, hors champ (IntersectionObserver) et en mouvement réduit.
 *
 * Tout le contenu pédagogique est du texte sémantique indexable
 * (h2/h3/p/ol/li/table/caption/th/td) présent dans le DOM : le canvas n'est
 * qu'un laboratoire qui illustre une géométrie déterministe. Aucune
 * coordonnée réelle n'est inventée, aucun fichier partagé n'est modifié.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e080-` (aucune collision avec la passe 1 `geography-e080-`).
 * Zéro console.*, zéro réseau, zéro Math.random, une seule boucle rAF.
 * Français intégral. ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e080';

const ID = {
  panel: 'geography-v2-e080-panel',
  title: 'geography-v2-e080-title',
  facts: 'geography-v2-e080-facts',
  posTable: 'geography-v2-e080-positions',
  rules: 'geography-v2-e080-rules',
  strategy: 'geography-v2-e080-strategy',
  density: 'geography-v2-e080-density',
  densityValue: 'geography-v2-e080-density-value',
  halo: 'geography-v2-e080-halo',
  canvas: 'geography-v2-e080-canvas',
  canvasDesc: 'geography-v2-e080-canvas-desc',
  legend: 'geography-v2-e080-legend',
  measuresTitle: 'geography-v2-e080-measures-title',
  measures: 'geography-v2-e080-measures',
  defiTitle: 'geography-v2-e080-defi-title',
  defi: 'geography-v2-e080-defi',
  readout: 'geography-v2-e080-readout',
  play: 'geography-v2-e080-play',
  reset: 'geography-v2-e080-reset',
  badge: 'geography-v2-e080-badge',
};

/* Espace logique fixe : les mesures ne dépendent pas de la taille de l'écran. */
const W = 320;
const H = 220;
const PAD = 14;
const LABEL_H = 13;

const KINDS = [
  'right', 'left', 'top', 'bottom',
  'topright', 'topleft', 'bottomright', 'bottomleft',
];
const KIND_LABELS = {
  right: 'droite', left: 'gauche', top: 'dessus', bottom: 'dessous',
  topright: 'haut-droite', topleft: 'haut-gauche',
  bottomright: 'bas-droite', bottomleft: 'bas-gauche',
};

/* Noms schématiques : le laboratoire simule des marqueurs, il n'invente
   aucune coordonnée ni aucun lieu vérifié du jeu de données. */
const NAMES = [
  'Aubrac', 'Béarn', 'Correz', 'Durance', 'Esson', 'Franche',
  'Garon', 'Hérault', 'Isère', 'Jura', 'Landes', 'Marne',
  'Nièvre', 'Orne', 'Périg', 'Quercy', 'Rhône', 'Savoie',
  'Tarn', 'Uzes', 'Vendée', 'Westh', 'Yonne', 'Zéland',
];

const STRATEGIES = ['naive', 'adaptive'];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  strategy: 'adaptive',
  density: 14,
  halo: true,
  playing: false,
  reveal: 1,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  inView: true,
  listenersInstalled: false,
  nodes: null,
  cells: {},
  defiSpans: {},
};

/* ---------- Utilitaires déterministes (zéro Math.random) ---------- */

const fmt = (n, d = 2) => {
  if (!Number.isFinite(n)) return '—';
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* E080-05 : générateur linéaire congruentiel à graine fixe, sans hasard. */
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildPlaces(count) {
  const rng = makeRng(0x5EED080);
  const places = [];
  for (let i = 0; i < count; i += 1) {
    places.push({
      name: NAMES[i % NAMES.length],
      nx: 0.08 + rng() * 0.84,
      ny: 0.10 + rng() * 0.80,
    });
  }
  return places;
}

function pointOf(place) {
  return {
    x: PAD + place.nx * (W - 2 * PAD),
    y: PAD + place.ny * (H - 2 * PAD),
  };
}

function labelWidth(name) {
  return 8 + name.length * 6.2;
}

/* E080-02 : huit positions candidates autour du point, dans un ordre fixe. */
function boxFor(kind, px, py, lw, lh) {
  let left;
  let top = py - lh / 2;
  if (kind === 'right') left = px + 8;
  else if (kind === 'left') left = px - 8 - lw;
  else if (kind === 'top') { left = px - lw / 2; top = py - lh - 8; }
  else if (kind === 'bottom') { left = px - lw / 2; top = py + 8; }
  else if (kind === 'topright') { left = px + 8; top = py - lh - 6; }
  else if (kind === 'topleft') { left = px - 8 - lw; top = py - lh - 6; }
  else if (kind === 'bottomright') { left = px + 8; top = py + 6; }
  else { left = px - 8 - lw; top = py + 6; }
  return { left, top, right: left + lw, bottom: top + lh };
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function outOfBounds(box) {
  let d = 0;
  if (box.left < 2) d += 2 - box.left;
  if (box.right > W - 2) d += box.right - (W - 2);
  if (box.top < 2) d += 2 - box.top;
  if (box.bottom > H - 2) d += box.bottom - (H - 2);
  return d;
}

/* E080-04 : placement glouton déterministe (ordre trié y puis x, sans hasard).
   score = collisions × 1000 + débordement + rang × 0,01 : le poids fort sur
   les collisions et le terme de rang garantissent des départages stables. */
function computeLayout(count, strategy) {
  const places = buildPlaces(count);
  const chosen = [];
  let collisions = 0;
  let clean = 0;
  const order = places.map((p, i) => i).sort((a, b) => (
    places[a].ny - places[b].ny || places[a].nx - places[b].nx
  ));
  const kinds = strategy === 'naive' ? ['right'] : KINDS;

  order.forEach((index) => {
    const place = places[index];
    const point = pointOf(place);
    const lw = labelWidth(place.name);
    let best = null;
    kinds.forEach((kind, ki) => {
      const box = boxFor(kind, point.x, point.y, lw, LABEL_H);
      let hits = 0;
      chosen.forEach((c) => { if (overlaps(box, c.box)) hits += 1; });
      const score = hits * 1000 + outOfBounds(box) + ki * 0.01;
      if (!best || score < best.score) best = { box, score, hits, kind };
    });
    collisions += best.hits;
    if (best.hits === 0) clean += 1;
    chosen.push({ index, box: best.box, kind: best.kind, place, point, lw });
  });

  return { places, chosen, collisions, clean, total: places.length };
}

/* Valeurs du défi falsifiable, calculées une fois depuis la même géométrie. */
const NAIVE_COLL_8 = computeLayout(8, 'naive').collisions;
const NAIVE_COLL_20 = computeLayout(20, 'naive').collisions;

const DEFI = {
  prediction: 'En placement naïf (toutes les étiquettes à droite), augmenter le nombre de lieux doit augmenter le nombre de collisions.',
  reglage: 'Choisissez la stratégie « Naïve », puis réglez le curseur de densité de 8 à 20 lieux.',
  attendu: `Les collisions naïves passent de ${NAIVE_COLL_8} à ${NAIVE_COLL_20} : le chevauchement croît avec la densité.`,
  falsification: `Si le compteur n'augmente pas (s'il reste à ${NAIVE_COLL_8} ou s'il baisse), l'affirmation « plus de lieux, plus de collisions en placement fixe » est contredite.`,
  debrief: 'Sans recherche de position, les noms s’empilent dès que les points se resserrent : c’est la densité qui crée le chevauchement, pas le hasard.',
};
const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
.geography-v2-e080-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);
  font-size:11px;line-height:1.6;
}
.geography-v2-e080-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700;
}
.geography-v2-e080-panel h3{
  margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700;
}
.geography-v2-e080-panel p{margin:5px 0;max-width:74ch}
.geography-v2-e080-panel .geography-v2-e080-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e080-panel .geography-v2-e080-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e080-panel .geography-v2-e080-table caption{
  margin-bottom:4px;color:var(--muted,#a8a198);text-align:left;
}
.geography-v2-e080-panel .geography-v2-e080-table th,
.geography-v2-e080-panel .geography-v2-e080-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e080-panel .geography-v2-e080-table thead th{color:var(--gold-bright,#f4d69e)}
.geography-v2-e080-panel .geography-v2-e080-table td{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e080-strategy{
  margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px;
}
#geography-v2-e080-strategy legend{padding:0 4px;color:var(--gold,#e6b96f)}
.geography-v2-e080-panel .geography-v2-e080-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;
  margin:0 8px 0 0;padding:2px 6px;cursor:pointer;
}
.geography-v2-e080-panel .geography-v2-e080-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e080-slider-row{margin:7px 0}
.geography-v2-e080-slider-row label{display:block;color:var(--ink-soft,#d7d1c6)}
.geography-v2-e080-valeur{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
.geography-v2-e080-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e080-panel .geography-v2-e080-halo{
  display:inline-flex;align-items:center;gap:6px;min-height:36px;cursor:pointer;
}
.geography-v2-e080-panel .geography-v2-e080-halo input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
#geography-v2-e080-canvas{
  display:block;width:100%;height:224px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.30);touch-action:manipulation;
}
.geography-v2-e080-panel .geography-v2-e080-legend{font-size:10px;color:var(--muted,#a8a198)}
.geography-v2-e080-panel .geography-v2-e080-defi{margin:6px 0;padding-left:18px;font-size:10px}
.geography-v2-e080-panel .geography-v2-e080-defi li{margin:3px 0}
.geography-v2-e080-panel .geography-v2-e080-defi strong{color:var(--gold,#e6b96f)}
#geography-v2-e080-readout{
  min-height:36px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e080-readout strong{color:var(--gold-bright,#f4d69e)}
.geography-v2-e080-panel .geography-v2-e080-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;
  padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation;
  transition:border-color .18s,background-color .18s,color .18s;
}
.geography-v2-e080-panel .geography-v2-e080-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e080-panel :focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.geography-v2-e080-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.geography-v2-e080-panel[data-geography-v2-e080-reduced="1"] .geography-v2-e080-btn{
  transition:none;
}
@media (prefers-reduced-motion:reduce){
  .geography-v2-e080-panel .geography-v2-e080-btn,
  .geography-v2-e080-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  .geography-v2-e080-panel{font-size:10px;padding:9px}
  #geography-v2-e080-canvas{height:184px}
  .geography-v2-e080-panel .geography-v2-e080-choix{margin-right:4px}
}
@media (forced-colors:active){
  .geography-v2-e080-panel{border:1px solid CanvasText}
}
`;

/* ---------- E080-01 / E080-03 : contenu sémantique statique ---------- */

function staticFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  const faits = [
    'Une étiquette de lieu est un texte attaché à un point : la difficulté n’est pas d’écrire le nom, mais de choisir où le placer sans recouvrir les autres étiquettes ni le point lui-même.',
    'Sur la carte existante de cette vue, le nom est posé à 9 pixels à droite du marqueur, toujours au même endroit : c’est une stratégie naïve, prévisible et lisible quand les lieux sont espacés, mais sans détection de chevauchement.',
    'Une stratégie adaptative essaie huit positions autour du point et retient celle qui heurte le moins d’étiquettes déjà posées ; un contour clair (halo) améliore la lisibilité sur fond sombre. Référence visée : zéro collision.',
  ];
  faits.forEach((texte) => {
    wrap.appendChild(ctx.el('p', 'geography-v2-e080-fait', texte));
  });
  return wrap;
}

/* E080-02 : tableau des huit positions candidates, ordre fixe. */
function staticPositions(ctx) {
  const table = ctx.el('table', 'geography-v2-e080-table');
  table.id = ID.posTable;
  table.appendChild(ctx.el('caption', '',
    'Huit positions candidates, énumérées dans un ordre fixe : la première est celle de la stratégie naïve utilisée par la carte existante.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Rang', 'Position', 'Décalage', 'Usage typique'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const usages = {
    right: 'référence, toujours à droite',
    left: 'point proche du bord droit',
    top: 'espace libre au-dessus',
    bottom: 'espace libre au-dessous',
    topright: 'voisin immédiat à droite',
    topleft: 'voisin immédiat à gauche',
    bottomright: 'chevauchement en haut à droite',
    bottomleft: 'chevauchement en haut à gauche',
  };
  const tbody = document.createElement('tbody');
  KINDS.forEach((kind, i) => {
    const tr = document.createElement('tr');
    const cells = [
      String(i + 1),
      KIND_LABELS[kind],
      kind.indexOf('top') === 0 ? 'haut' : (kind.indexOf('bottom') === 0 ? 'bas' : 'médian'),
      usages[kind],
    ];
    cells.forEach((c, j) => {
      const cell = document.createElement(j === 0 ? 'th' : 'td');
      if (j === 0) cell.setAttribute('scope', 'row');
      cell.textContent = c;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* E080-03 : règles de placement en liste ordonnée (sémantique). */
function staticRules(ctx) {
  const list = ctx.el('ol', '');
  list.id = ID.rules;
  [
    'On traite les lieux dans un ordre déterministe fixe (ordonné par latitude puis longitude simulées), jamais au hasard.',
    'Pour chaque lieu, on calcule la boîte englobante du texte pour chaque position candidate.',
    'On retient la boîte qui heurte le moins de boîtes déjà placées ; un débordement du cadre est pénalisé.',
    'Une collision est un recouvrement de deux rectangles : elle se détecte sans couleur, par comparaison de bornes.',
  ].forEach((texte) => {
    list.appendChild(ctx.el('li', '', texte));
  });
  return list;
}

/* E080-07 : tableau des mesures, valeurs recalculées (texte réel). */
const MEASURE_ROWS = [
  ['naive', 'Collisions — stratégie naïve (référence)', 'toutes les étiquettes à droite'],
  ['adaptive', 'Collisions — stratégie adaptative', 'recherche parmi 8 positions'],
  ['clean', 'Étiquettes sans recouvrement (stratégie active)', 'clean / total'],
  ['rate', 'Taux de réussite (stratégie active)', 'clean ÷ total × 100'],
  ['gain', 'Collisions évitées par l’adaptatif', 'naive − adaptive'],
];

function buildMeasuresTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e080-table');
  table.id = ID.measures;
  table.appendChild(ctx.el('caption', '',
    'Mesures recalculées depuis la géométrie des boîtes et les réglages courants. Référence : 0 collision (cas idéal).'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Méthode', 'Valeur courante'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  MEASURE_ROWS.forEach(([key, label, method]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = label;
    const m = document.createElement('td');
    m.style.fontWeight = '400';
    m.textContent = method;
    const value = document.createElement('td');
    value.textContent = '—';
    S.cells[key] = value;
    tr.append(th, m, value);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function fillMeasuresTable() {
  const naive = computeLayout(S.density, 'naive');
  const adaptive = computeLayout(S.density, 'adaptive');
  const active = S.strategy === 'naive' ? naive : adaptive;
  const taux = active.total > 0 ? (active.clean / active.total) * 100 : 0;
  const c = S.cells;
  if (c.naive) c.naive.textContent = String(naive.collisions);
  if (c.adaptive) c.adaptive.textContent = String(adaptive.collisions);
  if (c.clean) c.clean.textContent = `${active.clean}/${active.total}`;
  if (c.rate) c.rate.textContent = `${fmt(taux)} %`;
  if (c.gain) c.gain.textContent = String(Math.max(0, naive.collisions - adaptive.collisions));
}

/* E080-10 : défi falsifiable en cinq temps. */
function buildDefi(ctx) {
  const list = ctx.el('ol', 'geography-v2-e080-defi');
  list.id = ID.defi;
  DEFI_ETAPES.forEach(([key, label]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = label + ' : ';
    const span = document.createElement('span');
    span.textContent = DEFI[key];
    S.defiSpans[key] = span;
    li.append(strong, span);
    list.appendChild(li);
  });
  return list;
}

/* ---------- E080-06 : panneau et contrôles accessibles ---------- */

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
      naive: document.getElementById(ID.strategy + '-naive'),
      adaptive: document.getElementById(ID.strategy + '-adaptive'),
      density: document.getElementById(ID.density),
      densityOut: document.getElementById(ID.densityValue),
      halo: document.getElementById(ID.halo),
      canvas: document.getElementById(ID.canvas),
      legend: document.getElementById(ID.legend),
      readout: document.getElementById(ID.readout),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
    };
  }

  panel = ctx.el('section', 'geography-v2-e080-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const title = ctx.el('h2', '', 'Étiquettes de lieux : placer sans se chevaucher — laboratoire V2');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Sur une carte, le nom d’un lieu doit rester lisible même quand les points se serrent. '
    + 'Ce laboratoire compare une placement naïve (tout à droite, comme la carte existante) à une '
    + 'recherche de position parmi huit candidats. Les grandeurs sont écrites en toutes lettres '
    + 'dans le bandeau et le tableau : le dessin ne fait qu’illustrer le calcul.');

  /* E080-06 : choix unique → fieldset/radiogroup, jamais aria-pressed. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = ID.strategy;
  fieldset.appendChild(ctx.el('legend', '', 'Stratégie de placement (choix unique)'));
  [['naive', 'Naïve — toujours à droite'], ['adaptive', 'Adaptative — 8 positions']].forEach(([value, label]) => {
    const lab = ctx.el('label', 'geography-v2-e080-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e080-strat';
    radio.id = ID.strategy + '-' + value;
    radio.value = value;
    radio.checked = S.strategy === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });

  const rulesTitle = ctx.el('h3', '', 'Règles de placement');
  const densityRow = ctx.el('div', 'geography-v2-e080-slider-row');
  const densityLabel = document.createElement('label');
  densityLabel.setAttribute('for', ID.density);
  const densityOut = ctx.el('span', 'geography-v2-e080-valeur', '');
  densityOut.id = ID.densityValue;
  densityLabel.append(document.createTextNode('Nombre de lieux simulés : '), densityOut);
  const density = document.createElement('input');
  density.type = 'range';
  density.id = ID.density;
  density.min = '4';
  density.max = '24';
  density.step = '1';
  density.value = String(S.density);
  density.setAttribute('aria-label', 'Nombre de lieux simulés, de 4 à 24');
  densityRow.append(densityLabel, density);

  const haloLabel = ctx.el('label', 'geography-v2-e080-halo');
  const halo = document.createElement('input');
  halo.type = 'checkbox';
  halo.id = ID.halo;
  halo.checked = S.halo;
  haloLabel.appendChild(halo);
  haloLabel.appendChild(document.createTextNode(' Contour clair (halo) autour des noms'));

  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire de placement d’étiquettes. Flèches gauche et droite : changer de stratégie ; '
    + 'flèches haut et bas : changer le nombre de lieux ; H : basculer le halo ; '
    + 'Origine : revenir aux réglages par défaut ; Entrée : réénoncer les mesures.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : les flèches gauche et droite parcourent les deux stratégies, '
    + 'les flèches haut et bas règlent le nombre de lieux par pas de deux, la touche H bascule le '
    + 'halo, Origine restaure les réglages par défaut et Entrée réénonce le bandeau de lecture.');
  canvasDesc.id = ID.canvasDesc;

  const legend = ctx.el('p', 'geography-v2-e080-legend', '');
  legend.id = ID.legend;

  const measuresTitle = ctx.el('h3', '', 'Mesures vérifiables du placement');
  measuresTitle.id = ID.measuresTitle;
  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');
  defiTitle.id = ID.defiTitle;

  const readout = ctx.el('p', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.textContent = 'Le placement est mesuré par recouvrement de boîtes, jamais par couleur.';

  /* Boutons ≥ 36 px (ici 44 px) ; aria-pressed réservé à la bascule d'animation. */
  const play = ctx.el('button', 'geography-v2-e080-btn', '▶ Animer l’apparition');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  const reset = ctx.el('button', 'geography-v2-e080-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const note = ctx.el('p', '',
    'Ce laboratoire est un schéma déterministe à graine fixe (0x5EED080) : aucune donnée '
    + 'géographique mesurée n’est chargée et aucun tirage aléatoire n’intervient. Les noms sont '
    + 'des étiquettes schématiques. La carte d’origine reste utilisable sans ce panneau.');

  panel.append(title, lead, staticFacts(ctx), staticPositions(ctx), rulesTitle, staticRules(ctx),
    fieldset, densityRow, haloLabel, canvas, canvasDesc, legend,
    measuresTitle, buildMeasuresTable(ctx), defiTitle, buildDefi(ctx),
    readout, play, reset, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    fresh: true,
    naive: document.getElementById(ID.strategy + '-naive'),
    adaptive: document.getElementById(ID.strategy + '-adaptive'),
    density, densityOut, halo, canvas, legend, readout, play, reset,
  };
}

/* ---------- E080-09 : badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e080-badge',
    'Étiquettes des lieux : texte SVG placé à droite du marqueur (décalage de 9 px), sans recherche anti-collision. Ce laboratoire illustre une alternative à huit positions.');
  badge.id = ID.badge;
  map.appendChild(badge);
}

/* ---------- E080-08 : rendu du laboratoire (un seul canvas) ---------- */

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 224;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform((cssW * dpr) / W, 0, 0, (cssH * dpr) / H, 0, 0);
  g.clearRect(0, 0, W, H);

  const layout = computeLayout(S.density, S.strategy);
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(PAD, PAD, W - 2 * PAD, H - 2 * PAD);

  const shown = S.playing ? Math.floor(clamp(S.reveal, 0, 1) * layout.chosen.length) : layout.chosen.length;

  /* Points : le carré distingue la stratégie naïve du cercle adaptatif,
     indépendamment de la couleur. */
  layout.chosen.forEach((item) => {
    g.strokeStyle = 'rgba(214,207,193,.65)';
    g.lineWidth = 1;
    if (S.strategy === 'naive') {
      g.strokeRect(item.point.x - 3, item.point.y - 3, 6, 6);
    } else {
      g.beginPath();
      g.arc(item.point.x, item.point.y, 3.5, 0, Math.PI * 2);
      g.stroke();
    }
  });

  /* Étiquettes : fil en tirets vers la boîte, puis texte avec halo optionnel. */
  for (let i = 0; i < shown; i += 1) {
    const item = layout.chosen[i];
    const box = item.box;
    const anchorX = clamp(item.point.x, box.left, box.right);
    const anchorY = clamp(item.point.y, box.top, box.bottom);
    g.strokeStyle = 'rgba(255,255,255,.25)';
    g.lineWidth = 1;
    g.setLineDash([2, 3]);
    g.beginPath();
    g.moveTo(item.point.x, item.point.y);
    g.lineTo(anchorX, anchorY);
    g.stroke();
    g.setLineDash([]);

    const textX = box.left + 1;
    const textY = box.bottom - 3;
    if (S.halo) {
      g.strokeStyle = 'rgba(6,9,14,.95)';
      g.lineWidth = 3;
      g.lineJoin = 'round';
      g.strokeText(item.place.name, textX, textY);
    }
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '11px sans-serif';
    g.fillText(item.place.name, textX, textY);
  }

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(S.strategy === 'naive' ? 'Naïve : carrés, tout à droite' : 'Adaptative : cercles, 8 positions', PAD + 2, PAD + 12);
  g.fillText(`${layout.chosen.length} lieux · ${shown} étiquettes affichées`, PAD + 2, H - PAD - 3);
}

/* ---------- E080-07 : grandeurs chiffrées et statut textuel ---------- */

function updateReadout() {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const naive = computeLayout(S.density, 'naive');
  const adaptive = computeLayout(S.density, 'adaptive');
  const active = S.strategy === 'naive' ? naive : adaptive;
  const taux = active.total > 0 ? (active.clean / active.total) * 100 : 0;

  const strong = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`Sur ${active.total} étiquettes : placement naïf (toutes à droite) `));
  n.appendChild(strong(`${naive.collisions} collision(s)`));
  n.appendChild(document.createTextNode(' ; placement adaptatif (8 positions) '));
  n.appendChild(strong(`${adaptive.collisions} collision(s)`));
  n.appendChild(document.createTextNode('. Référence : '));
  n.appendChild(strong('0 collision, cas idéal'));
  n.appendChild(document.createTextNode('. Stratégie active : '));
  n.appendChild(strong(`${active.clean}/${active.total} sans recouvrement`));
  n.appendChild(document.createTextNode(`, soit un taux de réussite de `));
  n.appendChild(strong(`${fmt(taux)} %`));
  n.appendChild(document.createTextNode(`. L’adaptatif évite ${Math.max(0, naive.collisions - adaptive.collisions)} collision(s). Le halo améliore la lisibilité sans changer ces mesures.`));
}

/* ---------- Application de l'état ---------- */

function applyState() {
  const n = S.nodes;
  if (!n || !n.density) return;
  if (n.naive) n.naive.checked = S.strategy === 'naive';
  if (n.adaptive) n.adaptive.checked = S.strategy === 'adaptive';
  if (n.densityOut) n.densityOut.textContent = String(S.density);
  if (n.halo) n.halo.checked = S.halo;
  if (n.legend) {
    n.legend.textContent = S.strategy === 'naive'
      ? 'Référence : toutes les étiquettes à droite, marqueurs carrés. Les collisions sont comptées par recouvrement de boîtes, jamais par couleur.'
      : 'Huit positions essayées dans un ordre fixe, marqueurs ronds ; le fil en tirets relie le point à l’étiquette retenue.';
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’apparition' : '▶ Animer l’apparition';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E080Reduced = S.reduced ? '1' : '0';
  fillMeasuresTable();
  updateReadout();
  drawLab();
}

function resetState() {
  S.strategy = 'adaptive';
  S.density = 14;
  S.halo = true;
  S.reveal = 1;
  applyState();
}

/* ---------- E080-10 : boucle rAF unique, pauses multiples ---------- */

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
  if (!S.inView || S.reduced || !S.playing) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) { stopLoop(); return; }
  if (!S.inView || S.reduced || !S.playing) { stopLoop(); return; }
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.reveal = (S.reveal + dt * 0.0004) % 1.25;
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
      if (document.hidden) stopLoop(); else startLoop();
    });
  }

  /* Pause hors champ : au plus un canvas dessiné, et seulement à l'écran. */
  if (S.nodes && S.nodes.panel && typeof IntersectionObserver === 'function') {
    try {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { S.inView = !!entry.isIntersecting; });
        if (S.inView) startLoop(); else stopLoop();
      }, { threshold: 0.05 });
      io.observe(S.nodes.panel);
    } catch { /* observation indisponible : la visibilité reste le garde-fou */ }
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = (event) => {
        S.reduced = !!(event && event.matches);
        if (S.reduced) stopLoop(); else startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }
}

/* ---------- E080-06 : câblage des contrôles (une seule fois) ---------- */

function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  [n.naive, n.adaptive].forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      S.strategy = radio.value;
      applyState();
    });
  });

  n.density.addEventListener('input', () => {
    S.density = clamp(Math.round(Number(n.density.value)), 4, 24);
    applyState();
  });
  n.halo.addEventListener('change', () => {
    S.halo = !!n.halo.checked;
    applyState();
  });
  n.play.addEventListener('click', () => {
    S.playing = !S.playing;
    if (!S.playing || S.reduced) stopLoop(); else startLoop();
    applyState();
  });
  n.reset.addEventListener('click', () => {
    resetState();
  });

  n.canvas.addEventListener('keydown', (event) => {
    let used = true;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      S.strategy = event.key === 'ArrowRight' ? 'adaptive' : 'naive';
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      S.density = clamp(S.density + (event.key === 'ArrowUp' ? 2 : -2), 4, 24);
    } else if (event.key === 'h' || event.key === 'H') {
      S.halo = !S.halo;
    } else if (event.key === 'Home') {
      resetState();
      return;
    } else if (event.key === 'Enter') {
      updateReadout();
    } else {
      used = false;
    }
    if (used) {
      event.preventDefault();
      applyState();
    }
  });
}

/* ---------- Point d'entrée unique ---------- */

register('E080', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }
  if (S.reduced) S.playing = false;

  S.nodes = buildPanel(ctx);
  addMapBadge(ctx);
  wirePanel();
  applyState();
  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
