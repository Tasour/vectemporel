import { register } from './registry.js';

/*
 * Lentille E092 — SECONDE PASSE (V2) : altitude des lieux (vue GEOGRAPHIE).
 *
 * Les dix chantiers (E092-01 … E092-10) sont réellement implémentés dans CE
 * seul module, sans stub et sans toucher à la passe 1 ni au registre :
 *   E092-01  staticFacts()          — section sémantique, lede et trois faits sourcés
 *   E092-02  staticGlossary()       — glossaire de huit termes, définis à la 1re occurrence
 *   E092-03  staticReferenceTable() / buildModelsTable() — surfaces et modèles recalculés
 *   E092-04  fieldset radiogroup    — quatre repères de démonstration, choix unique
 *   E092-05  sliderRow() ×3         — altitude A, altitude B, distance A → B, bornées
 *   E092-06  drawLab()              — profil canvas déterministe, repères non chromatiques
 *   E092-07  updateReadout()        — readout chiffré + tableau des mesures courantes
 *   E092-08  startLoop()/tick()     — une seule boucle rAF, pause document.hidden
 *   E092-09  buildSteps()/buildKeys()/addMapBadge()/buildDefi() — procédure, clavier, badge, défi
 *   E092-10  CSS + applyState()     — accessibilité, mouvement réduit, robustesse d'état + remise à zéro
 *
 * Contrat : register('E092', (ctx) => { … }) avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Feuille unique injectée via ctx.css('geography-v2-e092', …). Tous les
 * identifiants DOM sont préfixés `geography-v2-e092-` : aucune collision avec
 * la passe 1 (`geography-e092-`). Un seul register, une seule boucle rAF, un
 * seul canvas dessiné par frame, DPR plafonné à 2.
 *
 * Zéro console, zéro réseau, zéro Math.random, aucun fichier partagé modifié.
 * Tout le contenu substantiel est du texte sémantique indexable présent dans
 * le DOM : le canvas n'est qu'un laboratoire qui illustre des formules déjà
 * écrites en toutes lettres dans le readout, le tableau des mesures et les
 * tableaux statiques. Français intégral.
 *
 * Rigueur des chiffres : aucune altitude de lieu réel n'est inventée ; les
 * quatre repères sont des « valeurs de démonstration ». Température, pression,
 * pente et angle sont recalculés depuis l'atmosphère standard, comparés à la
 * référence explicite 0 m / 15 °C / 1 013,25 hPa.
 */

const CSS_ID = 'geography-v2-e092';

const ID = {
  panel: 'geography-v2-e092-panel',
  title: 'geography-v2-e092-title',
  lead: 'geography-v2-e092-lead',
  facts: 'geography-v2-e092-facts',
  glossary: 'geography-v2-e092-glossary',
  refs: 'geography-v2-e092-references',
  preset: 'geography-v2-e092-preset',
  altA: 'geography-v2-e092-alt-a',
  altAValue: 'geography-v2-e092-alt-a-value',
  altALabel: 'geography-v2-e092-alt-a-label',
  altB: 'geography-v2-e092-alt-b',
  altBValue: 'geography-v2-e092-alt-b-value',
  altBLabel: 'geography-v2-e092-alt-b-label',
  distance: 'geography-v2-e092-distance',
  distanceValue: 'geography-v2-e092-distance-value',
  distanceLabel: 'geography-v2-e092-distance-label',
  canvas: 'geography-v2-e092-canvas',
  canvasDesc: 'geography-v2-e092-canvas-desc',
  legend: 'geography-v2-e092-legend',
  readout: 'geography-v2-e092-readout',
  progress: 'geography-v2-e092-progress',
  models: 'geography-v2-e092-models',
  mesuresTitle: 'geography-v2-e092-mesures-title',
  mesures: 'geography-v2-e092-mesures',
  steps: 'geography-v2-e092-steps',
  keys: 'geography-v2-e092-keys',
  defiTitle: 'geography-v2-e092-defi-title',
  defi: 'geography-v2-e092-defi',
  badgeText: 'geography-v2-e092-badge-text',
  play: 'geography-v2-e092-play',
  reset: 'geography-v2-e092-reset',
  badge: 'geography-v2-e092-badge',
};

/* Constantes publiques de l'atmosphère standard (modèle, pas une mesure locale). */
const P0 = 1013.25;          // hPa : pression au niveau de la mer
const T0 = 15;               // °C  : température au niveau de la mer
const LAPSE = 0.0065;        // °C/m : gradient thermique standard
const P_COEF = 2.25577e-5;   // 1/m : LAPSE / 288,15 K
const P_EXP = 5.25588;       // exposant g·M/(R·L) de la formule barométrique
const H_SCALE = 8400;        // m : hauteur d'échelle de l'approximation exponentielle
const H_MIN = -600;          // m : borne basse de l'échelle du profil
const H_MAX = 9200;          // m : borne haute de l'échelle du profil
const NARROW = '\u202f';     // espace insécable fine (typographie française)
const RAD = Math.PI / 180;

/* E092-04 : quatre repères de démonstration, jamais des lieux réels. */
const PRESETS = [
  { key: 'mer', label: 'Niveau de la mer (0 m)', altitude: 0 },
  { key: 'plaine', label: 'Plaine de démonstration (200 m)', altitude: 200 },
  { key: 'col', label: 'Col de démonstration (1 500 m)', altitude: 1500 },
  { key: 'sommet', label: 'Sommet de démonstration (4 000 m)', altitude: 4000 },
];
const PRESET_KEYS = PRESETS.map((p) => p.key);

/* E092-09 : défi falsifiable en cinq temps, aligné sur les deux modèles. */
const DEFI = {
  prediction: 'En montant de 0 m à 1 000 m, la pression standard passe-t-elle à environ 900 hPa (≈ 89 % de P0) ou à environ 500 hPa (≈ 50 %) ? Et, à 8 400 m, vaut-elle environ 37 % de P0 ?',
  reglage: 'Réglez le lieu A sur 0 m puis sur 1 000 m et relevez la pression dans le tableau des mesures courantes. Réglez ensuite A sur 8 400 m et comparez la pression standard à l’approximation exponentielle.',
  attendu: 'À 1 000 m : 898,7 hPa, soit 88,7 % de P0 (≈ 89 %), et non 50 %. À 8 400 m : l’approximation exponentielle donne 372,8 hPa, soit 36,8 % ≈ 1/e de P0.',
  falsification: 'Si vous lisez 50 % à 1 000 m, vous avez traité la hauteur d’échelle de 8 400 m comme si elle valait 1 000 m. Si vous lisez 37 % à 1 000 m, vous avez confondu l’altitude avec l’échelle de décroissance : le facteur 1/e s’obtient à 8 400 m, pas à 1 000 m.',
  debrief: 'P(h) = P0·(1 − 2,25577·10⁻⁵·h)^5,25588. Près du sol, P(h) ≈ P0·exp(−h/8 400) : on perd environ 1/8 400 de la pression par mètre, soit ≈ 11,9 % à 1 000 m (88,1 % en exponentiel contre 88,7 % en standard). Le facteur 1/e ≈ 36,8 % n’intervient qu’à h = 8 400 m. Aucune mesure locale n’est inventée : deux modèles publics sont comparés à la référence 0 m.',
};
const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  hA: 1200,
  hB: 3000,
  distance: 20,
  preset: '',
  playing: false,
  phase: 0,
  rafId: 0,
  lastTs: 0,
  reduced: false,
  inView: true,
  listenersInstalled: false,
  nodes: null,
  mapRef: null,
  cells: {},
  defiSpans: null,
};

/* ---------- utilitaires déterministes (aucun aléa) ---------- */

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function groupe(n) {
  const s = String(Math.round(Math.abs(n)));
  let out = '';
  for (let i = 0; i < s.length; i += 1) {
    if (i && (s.length - i) % 3 === 0) out += NARROW;
    out += s[i];
  }
  return (n < 0 ? '\u2212' : '') + out;
}

const signe = (n) => (n >= 0 ? '+' : '\u2212');

function fmt(n, d = 1) {
  if (!Number.isFinite(n)) return '—';
  const p = 10 ** d;
  const v = Math.abs(n) < 0.5 / p ? 0 : n;
  const fixed = (Math.round(v * p) / p).toFixed(d);
  const parts = fixed.split('.');
  const entiere = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return parts[1] ? `${entiere},${parts[1]}` : entiere;
}

/* E092-03 / E092-07 : grandeurs recalculées depuis les formules publiques. */
const temperature = (h) => T0 - LAPSE * h;
const pressureStd = (h) => P0 * Math.pow(1 - P_COEF * h, P_EXP);
const pressureExp = (h) => P0 * Math.exp(-h / H_SCALE);

/* Hauteur du profil au paramètre t. Formule unique partagée par le dessin du
   curseur et par le message d'état : le point animé et l'altitude annoncée ne
   peuvent jamais diverger. */
function profileHeight(t, m) {
  const amp = Math.min(220, Math.abs(m.delta) * 0.08);
  return m.hA + m.delta * t + amp * Math.sin(6 * Math.PI * t);
}

function measures() {
  const delta = S.hB - S.hA;
  const tA = temperature(S.hA);
  const tB = temperature(S.hB);
  const pA = pressureStd(S.hA);
  const pExpA = pressureExp(S.hA);
  const pente = S.distance > 0 ? (delta / (1000 * S.distance)) * 100 : 0;
  const angle = S.distance > 0 ? Math.atan(delta / (1000 * S.distance)) / RAD : 0;
  return {
    hA: S.hA, hB: S.hB, delta, distance: S.distance,
    tA, tB, dT: tB - tA,
    pA, pExpA, ecartModeles: pExpA - pA,
    partP0: (pA / P0) * 100,
    pente, angle,
  };
}

function badgeText() {
  return 'Altitude A : ' + groupe(S.hA) + ' m · référence : niveau de la mer (0 m) — panneau V2, aucune ressource distante.';
}

/* ---------- E092-01 / E092-02 / E092-03 : contenu sémantique statique ---------- */

function staticFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  const faits = [
    'L’altitude d’un lieu est sa distance verticale signée à un niveau de référence, par convention le niveau moyen des mers. Un lieu peut être au-dessus (altitude positive) ou au-dessous (altitude négative) de ce zéro.',
    'Le chiffre dépend de la surface choisie : la hauteur orthométrique est comptée depuis le géoïde, la hauteur ellipsoïdale depuis l’ellipsoïde. L’écart entre ces deux surfaces peut atteindre une centaine de mètres selon l’endroit.',
    'Dans la troposphère, l’atmosphère standard fait baisser la température de 0,0065 °C par mètre : à 1 000 m, la pression n’est plus qu’environ 89 % de sa valeur au niveau de la mer (1 013,25 hPa).',
  ];
  faits.forEach((texte) => wrap.appendChild(ctx.el('p', 'geography-v2-e092-fait', texte)));
  return wrap;
}

function staticGlossary(ctx) {
  const dl = ctx.el('dl', 'geography-v2-e092-glossaire');
  dl.id = ID.glossary;
  const termes = [
    ['Altitude', 'Distance verticale signée d’un point à un niveau de référence, en général le niveau moyen des mers ; elle se mesure en mètres.'],
    ['Niveau de référence', 'Surface de départ à partir de laquelle on compte l’altitude : c’est le zéro conventionnel d’un système de hauteurs.'],
    ['Géoïde', 'Surface de gravité constante qui prolonge le niveau moyen des mers sous les continents ; elle sert de référence aux altitudes orthométriques.'],
    ['Ellipsoïde', 'Surface mathématique de révolution (WGS84 pour le GPS) utilisée pour les coordonnées ; elle sert de référence aux altitudes ellipsoïdales.'],
    ['Hauteur orthométrique', 'Altitude comptée depuis le géoïde : c’est celle que fournit un nivellement et que portent les cartes terrestres.'],
    ['Hauteur ellipsoïdale', 'Altitude comptée depuis l’ellipsoïde : c’est celle que calcule directement un récepteur GPS avant conversion.'],
    ['Dénivelé', 'Différence d’altitude entre deux lieux : Δh = h₂ − h₁. Son signe indique si l’on monte ou si l’on descend.'],
    ['Isohypse', 'Courbe reliant, sur une carte, tous les points de même altitude : c’est l’équivalent d’une courbe de niveau.'],
  ];
  termes.forEach(([terme, definition]) => {
    dl.append(ctx.el('dt', '', terme), ctx.el('dd', '', definition));
  });
  return dl;
}

function staticReferenceTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e092-table');
  table.id = ID.refs;
  table.appendChild(ctx.el('caption', '',
    'Surfaces de référence : une altitude n’a de sens que si l’on nomme la surface depuis laquelle elle est comptée.'));
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Surface ou modèle', 'Rôle', 'Valeur de référence'].forEach((h) => {
    const th = ctx.el('th', '', h);
    th.setAttribute('scope', 'col');
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  const lignes = [
    ['Niveau moyen des mers', 'Zéro conventionnel des cartes terrestres', '0 m, par définition'],
    ['Géoïde', 'Prolonge le niveau des mers sous les continents', 'Zéro sur l’océan, variable ailleurs'],
    ['Ellipsoïde WGS84', 'Référence des coordonnées GPS', 'Écart au géoïde : jusqu’à environ 100 m'],
    ['Atmosphère standard', 'Modèle de température et de pression', '15 °C et 1 013,25 hPa à 0 m'],
  ];
  lignes.forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((c, i) => {
      const cellule = ctx.el(i === 0 ? 'th' : 'td', '', c);
      if (i === 0) cellule.setAttribute('scope', 'row');
      tr.appendChild(cellule);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function buildModelsTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e092-table');
  table.id = ID.models;
  table.appendChild(ctx.el('caption', '',
    'Modèles standards recalculés depuis les formules : référence = 0 m, 15 °C et 1 013,25 hPa.'));
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Altitude (m)', 'Écart à 0 m (m)', 'Température ISA (°C)', 'Pression standard (hPa)', 'Part de P0 (%)'].forEach((h) => {
    const th = ctx.el('th', '', h);
    th.setAttribute('scope', 'col');
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  [0, 1000, 2000, 3000, 4000].forEach((h) => {
    const tr = document.createElement('tr');
    const valeurs = [
      groupe(h), (h === 0 ? '0' : '+' + groupe(h)),
      fmt(temperature(h)), fmt(pressureStd(h)), fmt((pressureStd(h) / P0) * 100),
    ];
    valeurs.forEach((v) => tr.appendChild(ctx.el('td', 'geography-v2-e092-num', v)));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* E092-07 : second tableau, recalculé à chaque réglage (V2). */
const MODEL_ROWS = [
  ['ecart', 'Écart à 0 m', 'hA − 0 m'],
  ['delta', 'Dénivelé A → B', 'hB − hA'],
  ['dT', 'Écart de température', '−0,0065 × Δh'],
  ['tA', 'Température ISA en A', '15 − 0,0065·hA'],
  ['pA', 'Pression standard en A', '1 013,25·(1 − 2,25577·10⁻⁵·hA)^5,25588'],
  ['part', 'Part de P0', 'P(hA) / 1 013,25 × 100'],
  ['pExp', 'Approximation exponentielle', '1 013,25·exp(−hA/8 400)'],
  ['ecartModeles', 'Écart entre modèles', 'Pexp(hA) − Pstandard(hA)'],
  ['pente', 'Pente moyenne', 'Δh / (1 000·distance) × 100'],
  ['angle', 'Angle moyen', 'arctan(Δh / (1 000·distance))'],
];

function buildMesuresTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e092-table');
  table.id = ID.mesures;
  table.appendChild(ctx.el('caption', '',
    'Grandeurs du réglage courant, recalculées depuis les formules et comparées à la référence 0 m.'));
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Formule déterministe', 'Résultat courant'].forEach((h) => {
    const th = ctx.el('th', '', h);
    th.setAttribute('scope', 'col');
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  MODEL_ROWS.forEach(([key, label, formule]) => {
    const tr = document.createElement('tr');
    const th = ctx.el('th', '', label);
    th.setAttribute('scope', 'row');
    const form = ctx.el('td', '', formule);
    const value = ctx.el('td', 'geography-v2-e092-num', '—');
    S.cells[key] = value;
    tr.append(th, form, value);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function fillMesuresTable() {
  const m = measures();
  const c = S.cells;
  if (c.ecart) c.ecart.textContent = `${signe(m.hA)}${groupe(Math.abs(m.hA))} m`;
  if (c.delta) c.delta.textContent = `${signe(m.delta)}${groupe(Math.abs(m.delta))} m`;
  if (c.dT) c.dT.textContent = `${signe(m.dT)}${fmt(Math.abs(m.dT))} °C`;
  if (c.tA) c.tA.textContent = `${fmt(m.tA)} °C`;
  if (c.pA) c.pA.textContent = `${fmt(m.pA)} hPa`;
  if (c.part) c.part.textContent = `${fmt(m.partP0)} %`;
  if (c.pExp) c.pExp.textContent = `${fmt(m.pExpA)} hPa`;
  if (c.ecartModeles) c.ecartModeles.textContent = `${signe(m.ecartModeles)}${fmt(Math.abs(m.ecartModeles))} hPa`;
  if (c.pente) c.pente.textContent = `${fmt(m.pente)} %`;
  if (c.angle) c.angle.textContent = `${fmt(m.angle)}°`;
}

/* E092-09 : procédure, raccourcis et défi falsifiable (texte réel). */
function buildSteps(ctx) {
  const ol = ctx.el('ol', 'geography-v2-e092-defi');
  ol.id = ID.steps;
  const etapes = [
    'Repérer la surface de référence indiquée par la source : le plus souvent le niveau moyen des mers.',
    'Lire l’altitude du lieu A et la comparer au zéro conventionnel de 0 m (niveau de la mer).',
    'Calculer le dénivelé vers le lieu B : Δh = h₂ − h₁, en conservant le signe.',
    'En déduire l’écart de température standard : ΔT = −0,0065 × Δh, exprimé en degrés Celsius.',
    'Vérifier la source de l’altitude avant de citer le chiffre : hauteur orthométrique et hauteur ellipsoïdale ne sont pas interchangeables.',
  ];
  etapes.forEach((texte) => ol.appendChild(ctx.el('li', '', texte)));
  return ol;
}

function buildKeysTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e092-table');
  table.id = ID.keys;
  table.appendChild(ctx.el('caption', '',
    'Clavier du profil : le canevas est focalisable et chaque action a un équivalent textuel.'));
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Touche', 'Action'].forEach((h) => {
    const th = ctx.el('th', '', h);
    th.setAttribute('scope', 'col');
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  const lignes = [
    ['← / →', 'Diminuer / augmenter l’altitude A de 100 m'],
    ['↑ / ↓', 'Diminuer / augmenter l’altitude B de 100 m'],
    ['Début', 'Ramener l’altitude A au niveau de la mer (0 m)'],
    ['Fin', 'Porter l’altitude A à 9 000 m'],
    ['Espace', 'Lancer ou arrêter l’ascension animée'],
    ['Suppr', 'Rétablir les valeurs par défaut (1 200 m, 3 000 m, 20 km)'],
  ];
  lignes.forEach(([touche, action]) => {
    const tr = document.createElement('tr');
    const th = ctx.el('th', '', touche);
    th.setAttribute('scope', 'row');
    tr.append(th, ctx.el('td', '', action));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function buildDefi(ctx) {
  const list = ctx.el('ol', 'geography-v2-e092-defi');
  list.id = ID.defi;
  const spans = {};
  DEFI_ETAPES.forEach(([key, label]) => {
    const li = document.createElement('li');
    const strong = ctx.el('strong', '', label + ' : ');
    const span = ctx.el('span', '', DEFI[key]);
    spans[key] = span;
    li.append(strong, span);
    list.appendChild(li);
  });
  S.defiSpans = spans;
  return list;
}

/* ---------- E092-04 / E092-05 : contrôles ---------- */

function sliderRow(ctx, key, titre, min, max, labelId, valueId, ariaLabel) {
  const row = ctx.el('div', 'geography-v2-e092-slider-row');
  const label = document.createElement('label');
  label.id = labelId;
  label.setAttribute('for', key);
  label.appendChild(document.createTextNode(titre + ' : '));
  const out = ctx.el('span', 'geography-v2-e092-valeur', '');
  out.id = valueId;
  label.appendChild(out);
  const input = document.createElement('input');
  input.type = 'range';
  input.id = key;
  input.min = String(min);
  input.max = String(max);
  input.step = key === ID.distance ? '1' : '100';
  input.value = String(key === ID.altA ? S.hA : (key === ID.altB ? S.hB : S.distance));
  input.className = 'geography-v2-e092-curseur';
  input.setAttribute('aria-label', ariaLabel);
  row.append(label, input);
  return { row, label, out, input };
}

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function buildPanel(ctx) {
  let panel = document.getElementById(ID.panel);
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    return {
      panel, fresh: false,
      radios: PRESET_KEYS.map((k) => document.getElementById(ID.preset + '-' + k)),
      altA: document.getElementById(ID.altA),
      altB: document.getElementById(ID.altB),
      distance: document.getElementById(ID.distance),
      altAOut: document.getElementById(ID.altAValue),
      altBOut: document.getElementById(ID.altBValue),
      distOut: document.getElementById(ID.distanceValue),
      canvas: document.getElementById(ID.canvas),
      legend: document.getElementById(ID.legend),
      readout: document.getElementById(ID.readout),
      progress: document.getElementById(ID.progress),
      badgeText: document.getElementById(ID.badgeText),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
    };
  }

  panel = ctx.el('section', 'geography-v2-e092-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);
  panel.dataset.geographyV2E092Chantiers = '10';

  const title = ctx.el('h2', '', 'Altitude des lieux : lire une hauteur, la comparer, la corriger — laboratoire V2');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Une altitude n’est jamais un nombre isolé : elle se compte depuis une surface de référence et se corrige selon le modèle employé. Ce laboratoire sépare la hauteur du lieu, son dénivelé et les grandeurs atmosphériques qui en découlent. '
    + 'Toutes les grandeurs sont écrites en toutes lettres dans le bandeau de lecture et dans les tableaux : le dessin ne fait qu’illustrer le calcul.');
  lead.id = ID.lead;

  /* E092-04 : choix unique → fieldset/radiogroup, jamais aria-pressed. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = ID.preset;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.appendChild(ctx.el('legend', '', 'Repère d’altitude (choix unique, valeurs de démonstration)'));
  PRESETS.forEach((p) => {
    const lab = ctx.el('label', 'geography-v2-e092-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e092-preset';
    radio.id = ID.preset + '-' + p.key;
    radio.value = p.key;
    radio.checked = S.preset === p.key;
    lab.append(radio, document.createTextNode(p.label));
    fieldset.appendChild(lab);
  });

  const hLab = ctx.el('h3', '', 'Laboratoire : profil vertical et grandeurs dérivées');
  const a = sliderRow(ctx, ID.altA, 'Altitude du lieu A', -500, 9000, ID.altALabel, ID.altAValue,
    'Altitude du lieu A, de moins cinq cents à neuf mille mètres, pas de cent mètres');
  const b = sliderRow(ctx, ID.altB, 'Altitude du lieu B', -500, 9000, ID.altBLabel, ID.altBValue,
    'Altitude du lieu B, de moins cinq cents à neuf mille mètres, pas de cent mètres');
  const d = sliderRow(ctx, ID.distance, 'Distance horizontale A → B', 1, 100, ID.distanceLabel, ID.distanceValue,
    'Distance horizontale entre les lieux A et B, de un à cent kilomètres');

  /* E092-06 / E092-09 : canvas focalisable, étiqueté, équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Profil schématique d’altitude entre les lieux A et B. Le trait pointillé marque le niveau de la mer à zéro mètre ; la zone hachée est au-dessous. Le triangle est le lieu A, le carré le lieu B, chacun accompagné de sa lettre. '
    + 'Flèches gauche et droite : altitude A ; haut et bas : altitude B ; Début : zéro mètre ; Fin : neuf mille mètres ; Espace : ascension animée ; Suppr : valeurs par défaut. '
    + 'Toutes les valeurs chiffrées sont données dans le message d’état et les tableaux.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : les flèches gauche et droite règlent l’altitude A par pas de 100 m, les flèches haut et bas l’altitude B, Début ramène A à 0 m, Fin le porte à 9 000 m, Espace lance ou arrête l’ascension et Suppr rétablit les valeurs par défaut. '
    + 'Chaque valeur est aussi écrite dans le tableau des mesures courantes et dans le bandeau.');
  canvasDesc.id = ID.canvasDesc;

  const legend = ctx.el('p', 'geography-v2-e092-legend',
    'Le triangle (A) et le carré (B), accompagnés de leur lettre, distinguent les lieux indépendamment de la couleur. Le trait pointillé est le zéro de référence ; les hachures signalent les altitudes négatives.');
  legend.id = ID.legend;

  /* E092-07 : bandeau de lecture, annoncé aux technologies d'assistance. */
  const readout = ctx.el('p', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.textContent = 'Le modèle d’altitude est prêt.';

  const progress = ctx.el('p', '', '');
  progress.id = ID.progress;

  const badgeText = ctx.el('p', 'geography-v2-e092-badge-text', badgeText());
  badgeText.id = ID.badgeText;

  /* E092-10 : boutons ≥ 36 px (ici 44 px) ; aria-pressed pour la bascule. */
  const play = ctx.el('button', 'geography-v2-e092-btn', '▶ Animer l’ascension');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  const reset = ctx.el('button', 'geography-v2-e092-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const modelsTitle = ctx.el('h3', '', 'Tableau des modèles standards');
  const mesuresTitle = ctx.el('h3', '', 'Mesures vérifiables du réglage courant');
  mesuresTitle.id = ID.mesuresTitle;
  const stepsTitle = ctx.el('h3', '', 'Procédure de lecture en cinq temps');
  const keysTitle = ctx.el('h3', '', 'Raccourcis clavier du profil');
  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');
  defiTitle.id = ID.defiTitle;

  const note = ctx.el('p', '',
    'Ce laboratoire est un schéma déterministe : les quatre repères sont des valeurs de démonstration, jamais des lieux réels ; aucune ressource distante, aucune requête réseau et aucun tirage aléatoire n’interviennent. '
    + 'Les grandeurs ci-dessus sont des textes réels, lisibles et indexables même sans animation ; la carte d’origine reste utilisable sans ce panneau.');

  panel.append(
    title, lead, staticFacts(ctx), staticGlossary(ctx),
    ctx.el('h3', '', 'Les surfaces de référence'), staticReferenceTable(ctx),
    fieldset, hLab, a.row, a.input, b.row, b.input, d.row, d.input,
    canvas, canvasDesc, legend, readout, progress, badgeText, play, reset,
    modelsTitle, buildModelsTable(ctx), mesuresTitle, buildMesuresTable(ctx),
    stepsTitle, buildSteps(ctx), keysTitle, buildKeysTable(ctx),
    defiTitle, buildDefi(ctx), note,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: PRESET_KEYS.map((k) => document.getElementById(ID.preset + '-' + k)),
    altA: a.input, altB: b.input, distance: d.input,
    altAOut: a.out, altBOut: b.out, distOut: d.out,
    canvas, legend, readout, progress, badgeText, play, reset,
  };
}

/* ---------- E092-09 : badge sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  S.mapRef = map || null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e092-badge', badgeText());
  badge.id = ID.badge;
  map.appendChild(badge);
}

function updateMapBadge() {
  const badge = document.getElementById(ID.badge);
  if (badge) badge.textContent = badgeText();
}

/* ---------- E092-06 : rendu du laboratoire (un seul canvas) ---------- */

function marker(g, x, y, forme, lettre) {
  g.fillStyle = 'rgba(244,214,158,.98)';
  if (forme === 'triangle') {
    g.beginPath();
    g.moveTo(x, y - 7);
    g.lineTo(x - 6, y + 5);
    g.lineTo(x + 6, y + 5);
    g.closePath();
    g.fill();
  } else {
    g.fillRect(x - 6, y - 6, 12, 12);
  }
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.font = 'bold 9px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(lettre, x, y - 14);
}

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 250;
  /* DPR plafonné à 2, tampon redimensionné seulement quand c'est nécessaire. */
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const padL = 44;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const plotW = Math.max(40, cssW - padL - padR);
  const plotH = Math.max(40, cssH - padT - padB);
  const yOf = (h) => padT + (1 - (h - H_MIN) / (H_MAX - H_MIN)) * plotH;
  const xOf = (t) => padL + t * plotW;

  g.strokeStyle = 'rgba(255,255,255,.18)';
  g.lineWidth = 1;
  g.strokeRect(padL, padT, plotW, plotH);

  /* Repère non chromatique : hachures au-dessous du zéro conventionnel. */
  const yZero = yOf(0);
  g.save();
  g.beginPath();
  g.rect(padL, yZero, plotW, Math.max(0, padT + plotH - yZero));
  g.clip();
  g.strokeStyle = 'rgba(214,207,193,.10)';
  g.lineWidth = 1;
  for (let x = padL - plotH; x < padL + plotW; x += 8) {
    g.beginPath();
    g.moveTo(x, padT + plotH);
    g.lineTo(x + plotH, padT + plotH - plotH);
    g.stroke();
  }
  g.restore();

  /* Graduations : le trait à 0 m est la référence, en pointillé plus visible. */
  g.font = '9px sans-serif';
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  for (let h = 0; h <= 9000; h += 1000) {
    const y = yOf(h);
    g.strokeStyle = h === 0 ? 'rgba(244,214,158,.75)' : 'rgba(255,255,255,.10)';
    if (g.setLineDash) g.setLineDash(h === 0 ? [5, 4] : []);
    g.beginPath();
    g.moveTo(padL, y);
    g.lineTo(padL + plotW, y);
    g.stroke();
    if (g.setLineDash) g.setLineDash([]);
    g.fillStyle = h === 0 ? 'rgba(244,214,158,.95)' : 'rgba(214,207,193,.75)';
    g.fillText(groupe(h), padL - 5, y);
  }

  /* Profil schématique : fonction périodique déterministe, aucun aléa. */
  const m = measures();
  const steps = 60;
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    pts.push({ x: xOf(t), y: yOf(profileHeight(t, m)) });
  }
  g.beginPath();
  g.moveTo(pts[0].x, yOf(H_MIN));
  pts.forEach((p) => g.lineTo(p.x, p.y));
  g.lineTo(pts[pts.length - 1].x, yOf(H_MIN));
  g.closePath();
  g.fillStyle = 'rgba(230,185,111,.10)';
  g.fill();

  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.stroke();

  marker(g, pts[0].x, pts[0].y, 'triangle', 'A');
  marker(g, pts[pts.length - 1].x, pts[pts.length - 1].y, 'carre', 'B');

  /* Curseur d'ascension : même formule que le readout, sans quantification. */
  const cpX = xOf(S.phase);
  const cpY = yOf(profileHeight(S.phase, m));
  g.beginPath();
  g.arc(cpX, cpY, 4, 0, Math.PI * 2);
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.fill();
  g.strokeStyle = 'rgba(8,12,18,.9)';
  g.lineWidth = 1;
  g.stroke();

  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText('Profil schématique · A → B sur ' + fmt(S.distance, 0) + ' km', padL, cssH - 8);
  g.textAlign = 'right';
  g.fillStyle = 'rgba(214,207,193,.8)';
  g.fillText('0 m = niveau de la mer', padL + plotW, cssH - 8);
}

/* ---------- E092-07 : lectures et région de statut ---------- */

function updateReadout() {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const m = measures();
  const add = (t) => n.appendChild(document.createTextNode(t));
  const put = (t) => {
    const s = document.createElement('strong');
    s.textContent = t;
    n.appendChild(s);
  };
  n.textContent = '';
  add('Altitude A = '); put(`${groupe(m.hA)} m`);
  add(' ; écart à la référence 0 m (niveau de la mer) = ');
  put(`${signe(m.hA)}${groupe(Math.abs(m.hA))} m`);
  add('. Dénivelé A → B : Δh = ');
  put(`${signe(m.delta)}${groupe(Math.abs(m.delta))} m`);
  add('. Température ISA : '); put(`${fmt(m.tA)} °C`);
  add(' en A, soit '); put(`${signe(m.dT)}${fmt(Math.abs(m.dT))} °C`);
  add(' en B (référence 15 °C à 0 m). Pression standard : ');
  put(`${fmt(m.pA)} hPa`);
  add(' en A, soit '); put(`${fmt(m.partP0)} %`);
  add(' de P0 = 1 013,25 hPa ; l’approximation exponentielle donne ');
  put(`${fmt(m.pExpA)} hPa`);
  add(' (écart ');
  put(`${signe(m.ecartModeles)}${fmt(Math.abs(m.ecartModeles))} hPa`);
  add('). Pente moyenne sur '); put(`${fmt(S.distance, 0)} km`);
  add(' : '); put(`${fmt(m.pente)} %`);
  add(' (angle '); put(`${fmt(m.angle)}°`);
  add(').');
}

function updateProgress() {
  const n = S.nodes && S.nodes.progress;
  if (!n) return;
  const m = measures();
  const hCourant = profileHeight(S.phase, m);
  n.textContent = `Ascension : ${fmt(S.phase * 100, 0)} % du parcours · altitude courante ${groupe(hCourant)} m · température ${fmt(temperature(hCourant))} °C.`;
}

/* ---------- application de l'état ---------- */

function applyState() {
  const n = S.nodes;
  if (!n || !n.altA || !n.altB || !n.distance) return;

  n.radios.forEach((r) => { if (r) r.checked = r.value === S.preset; });
  n.altA.value = String(S.hA);
  n.altB.value = String(S.hB);
  n.distance.value = String(S.distance);
  if (n.altAOut) n.altAOut.textContent = `${groupe(S.hA)} m`;
  if (n.altBOut) n.altBOut.textContent = `${groupe(S.hB)} m`;
  if (n.distOut) n.distOut.textContent = `${fmt(S.distance, 0)} km`;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’ascension' : '▶ Animer l’ascension';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E092Reduced = S.reduced ? '1' : '0';
  if (S.defiSpans) {
    DEFI_ETAPES.forEach(([key]) => {
      const span = S.defiSpans[key];
      if (span) span.textContent = DEFI[key];
    });
  }
  updateMapBadge();
  if (n.badgeText) n.badgeText.textContent = badgeText();
  fillMesuresTable();
  updateReadout();
  updateProgress();
  drawLab();
}

/* ---------- E092-08 : boucle rAF unique, pauses multiples ---------- */

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
  /* Progression déterministe : horodatage seul, jamais de tirage aléatoire. */
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.phase += dt * 0.00016;
    if (S.phase > 1) S.phase -= 1;
  }
  S.lastTs = ts;
  updateProgress();
  drawLab();
  if (S.playing && !S.reduced) S.rafId = requestAnimationFrame(tick);
}

/* ---------- pilotes et robustesse (E092-09 / E092-10) ---------- */

function setPreset(value) {
  const p = PRESETS.find((item) => item.key === value);
  if (!p) return;
  S.preset = p.key;
  S.hA = p.altitude;
  S.phase = 0;
  applyState();
}

function setAltA(value) {
  S.hA = clamp(Math.round(Number(value) / 100) * 100, -500, 9000);
  S.preset = (PRESETS.find((p) => p.altitude === S.hA) || {}).key || '';
  S.phase = 0;
  applyState();
}

function setAltB(value) {
  S.hB = clamp(Math.round(Number(value) / 100) * 100, -500, 9000);
  S.phase = 0;
  applyState();
}

function setDistance(value) {
  S.distance = clamp(Math.round(Number(value)), 1, 100);
  applyState();
}

function togglePlay() {
  S.playing = !S.playing;
  if (!S.playing || S.reduced) stopLoop(); else startLoop();
  applyState();
}

function resetState() {
  S.hA = 1200;
  S.hB = 3000;
  S.distance = 20;
  S.preset = '';
  S.playing = false;
  S.phase = 0;
  stopLoop();
  applyState();
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
        const entry = entries[entries.length - 1];
        S.inView = entry ? !!entry.isIntersecting : true;
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
        if (S.reduced) { S.playing = false; stopLoop(); }
        applyState();
        if (!S.reduced) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }
}

function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  n.radios.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      setPreset(radio.value);
    });
  });
  n.altA.addEventListener('input', () => setAltA(n.altA.value));
  n.altB.addEventListener('input', () => setAltB(n.altB.value));
  n.distance.addEventListener('input', () => setDistance(n.distance.value));
  n.play.addEventListener('click', togglePlay);
  n.reset.addEventListener('click', resetState);

  /* E092-09 : équivalent clavier complet du laboratoire. */
  n.canvas.addEventListener('keydown', (event) => {
    let used = true;
    if (event.key === 'ArrowLeft') setAltA(S.hA - 100);
    else if (event.key === 'ArrowRight') setAltA(S.hA + 100);
    else if (event.key === 'ArrowUp') setAltB(S.hB + 100);
    else if (event.key === 'ArrowDown') setAltB(S.hB - 100);
    else if (event.key === 'Home') setAltA(0);
    else if (event.key === 'End') setAltA(9000);
    else if (event.key === ' ' || event.key === 'Spacebar') togglePlay();
    else if (event.key === 'Backspace' || event.key === 'Delete') resetState();
    else used = false;
    if (used) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

/* ---------- E092-10 : feuille de style unique, injectée une seule fois ---------- */

const CSS = `
.geography-v2-e092-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);
  font-size:11px;line-height:1.6;
}
.geography-v2-e092-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700;
}
.geography-v2-e092-panel h3{
  margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700;
}
.geography-v2-e092-panel p{margin:5px 0;max-width:74ch}
.geography-v2-e092-panel .geography-v2-e092-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e092-panel .geography-v2-e092-glossaire{margin:6px 0}
.geography-v2-e092-panel .geography-v2-e092-glossaire dt{
  margin-top:7px;color:var(--gold-bright,#f4d69e);font-weight:600;
}
.geography-v2-e092-panel .geography-v2-e092-glossaire dd{
  margin:1px 0 0 10px;color:var(--ink-soft,#d7d1c6);
}
.geography-v2-e092-panel .geography-v2-e092-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e092-panel .geography-v2-e092-table caption{
  margin-bottom:4px;color:var(--muted,#a8a198);text-align:left;
}
.geography-v2-e092-panel .geography-v2-e092-table th,
.geography-v2-e092-panel .geography-v2-e092-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e092-panel .geography-v2-e092-table thead th{color:var(--gold-bright,#f4d69e)}
.geography-v2-e092-panel .geography-v2-e092-table td{
  color:var(--gold-bright,#f4d69e);font-weight:600;
}
.geography-v2-e092-panel .geography-v2-e092-table td.geography-v2-e092-num{
  text-align:right;font-variant-numeric:tabular-nums;
}
#geography-v2-e092-preset{
  margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px;
}
#geography-v2-e092-preset legend{padding:0 4px;color:var(--gold,#e6b96f)}
.geography-v2-e092-panel .geography-v2-e092-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;
  margin:0 8px 0 0;padding:2px 6px;cursor:pointer;
}
.geography-v2-e092-panel .geography-v2-e092-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e092-slider-row{margin:7px 0}
.geography-v2-e092-slider-row label{display:block;color:var(--ink-soft,#d7d1c6)}
.geography-v2-e092-valeur{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
.geography-v2-e092-panel .geography-v2-e092-curseur{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
#geography-v2-e092-canvas{
  display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.3);touch-action:manipulation;
}
.geography-v2-e092-panel .geography-v2-e092-legend{font-size:10px;color:var(--muted,#a8a198)}
.geography-v2-e092-panel .geography-v2-e092-defi{
  margin:6px 0;padding-left:18px;font-size:10px;
}
.geography-v2-e092-panel .geography-v2-e092-defi li{margin:3px 0}
.geography-v2-e092-panel .geography-v2-e092-defi strong{color:var(--gold,#e6b96f)}
#geography-v2-e092-readout{
  min-height:40px;margin:6px 0;padding:7px 8px;border:1px solid var(--line);
  border-radius:8px;background:rgba(230,185,111,.06);
  color:var(--ink-soft,#d7d1c6);font-size:10px;font-variant-numeric:tabular-nums;
}
#geography-v2-e092-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-v2-e092-progress{min-height:16px;margin:4px 0;color:var(--muted,#a8a198);font-size:10px;font-variant-numeric:tabular-nums}
.geography-v2-e092-panel .geography-v2-e092-badge-text{
  min-height:30px;margin:6px 0;padding:7px 8px;border:1px solid var(--line);
  border-left:4px solid var(--gold,#e6b96f);border-radius:8px;
  background:rgba(230,185,111,.06);font-size:10px;
}
.geography-v2-e092-panel .geography-v2-e092-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;
  padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation;
  transition:border-color .18s,background-color .18s;
}
.geography-v2-e092-panel .geography-v2-e092-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e092-panel .geography-v2-e092-btn[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.14);
}
.geography-v2-e092-panel :focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
#geography-v2-e092-canvas:focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.geography-v2-e092-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.geography-v2-e092-panel[data-geography-v2-e092-reduced="1"] .geography-v2-e092-btn{
  transition:none;
}
@media (prefers-reduced-motion:reduce){
  .geography-v2-e092-panel .geography-v2-e092-btn,
  .geography-v2-e092-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  .geography-v2-e092-panel{font-size:10px;padding:9px}
  #geography-v2-e092-canvas{height:210px}
  .geography-v2-e092-panel .geography-v2-e092-choix{margin-right:4px}
}
@media (forced-colors:active){
  .geography-v2-e092-panel{border:1px solid CanvasText}
}
`;

/* ---------- Point d'entrée unique ---------- */

register('E092', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'geography') return;

  ctx.css(CSS_ID, CSS);
  try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }
  if (S.reduced) { S.playing = false; stopLoop(); }

  S.nodes = buildPanel(ctx);
  addMapBadge(ctx);
  wirePanel();
  applyState();
  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
