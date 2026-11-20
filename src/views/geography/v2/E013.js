import { register } from './registry.js';

/*
 * Lentille E013 — SECONDE PASSE (V2) : lacs et plans d'eau continentaux.
 *
 * Les dix chantiers (E013-01 … E013-10) sont réellement implémentés ci-dessous.
 * V2 ajoute à la passe 1 : un badge de statut explicite, un tableau de mesures
 * recalculées à chaque changement, une fiche de vérité à trois faits sourcés,
 * un défi falsifiable en cinq temps aligné sur le modèle courant, une boucle
 * rAF unique suspendue à la fois sur document.hidden, hors champ
 * (IntersectionObserver) et en mouvement réduit, et un bouton de remise à
 * zéro. Tout le contenu pédagogique est du texte sémantique indexable
 * (h2/h3/p/ol/li/table/caption/th/td) présent dans le DOM ; le canvas n'est
 * qu'un laboratoire qui illustre des formules déterministes.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e013-` (aucune collision avec la passe 1 `geography-e013-`).
 * Zéro console.*, zéro réseau, zéro Math.random, une seule boucle rAF.
 * Français intégral. ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e013';

const ID = {
  panel: 'geography-v2-e013-panel',
  title: 'geography-v2-e013-title',
  lead: 'geography-v2-e013-lead',
  facts: 'geography-v2-e013-facts',
  classTable: 'geography-v2-e013-classification',
  mode: 'geography-v2-e013-mode',
  a: 'geography-v2-e013-a',
  b: 'geography-v2-e013-b',
  aValue: 'geography-v2-e013-a-value',
  bValue: 'geography-v2-e013-b-value',
  aLabel: 'geography-v2-e013-a-label',
  bLabel: 'geography-v2-e013-b-label',
  canvas: 'geography-v2-e013-canvas',
  canvasDesc: 'geography-v2-e013-canvas-desc',
  legend: 'geography-v2-e013-legend',
  modelsTitle: 'geography-v2-e013-models-title',
  models: 'geography-v2-e013-models',
  defiTitle: 'geography-v2-e013-defi-title',
  defi: 'geography-v2-e013-defi',
  readout: 'geography-v2-e013-readout',
  play: 'geography-v2-e013-play',
  reset: 'geography-v2-e013-reset',
  note: 'geography-v2-e013-note',
  badge: 'geography-v2-e013-badge',
};

const MODE_ORDER = ['sejour', 'bilan', 'strat', 'trophie', 'niveau'];

/* Configurations déterministes : bornes et valeurs par défaut (choix unique). */
const MODES = {
  sejour: {
    titre: 'Temps de séjour τ = V / Q',
    a: { label: 'Volume du lac V', unit: 'km³', min: 1000, max: 30000, step: 100, value: 12100 },
    b: { label: 'Débit de sortie Q', unit: 'km³/an', min: 1, max: 200, step: 1, value: 64 },
  },
  bilan: {
    titre: 'Bilan hydrologique ΔS = P + R − E − Qs',
    a: { label: 'Précipitations P', unit: 'km³/an', min: 0, max: 200, step: 1, value: 60 },
    b: { label: 'Évaporation E', unit: 'km³/an', min: 0, max: 200, step: 1, value: 50 },
  },
  strat: {
    titre: 'Stratification thermique et densité',
    a: { label: 'Température de surface', unit: '°C', min: 4, max: 30, step: 1, value: 22 },
    b: { label: 'Profondeur maximale', unit: 'm', min: 10, max: 1642, step: 2, value: 1000 },
  },
  trophie: {
    titre: 'Trophie et phosphore total',
    a: { label: 'Phosphore total TP', unit: 'µg/L', min: 2, max: 150, step: 1, value: 12 },
    b: { label: 'Profondeur moyenne', unit: 'm', min: 5, max: 300, step: 1, value: 40 },
  },
  niveau: {
    titre: 'Retrait du niveau et perte de rives',
    a: { label: 'Niveau (en % du repère)', unit: '%', min: 60, max: 100, step: 1, value: 100 },
    b: { label: 'Exposant de forme p', unit: '', min: 1, max: 3, step: 0.1, value: 2 },
  },
};

const LEGENDES = {
  sejour: 'Traits pleins : bassin hachuré et flux. Flèches étiquetées : entrée (V) et sortie (Q). La barre compare le temps de séjour au repère de 190 ans ; la gouttelette suit l’exutoire.',
  bilan: 'Barres vers le haut : entrées P et R ; vers le bas : sorties E et Qs. Le tiret horizontal marque l’équilibre ; le bilan ΔS est écrit en toutes lettres.',
  strat: 'Courbe pleine : profil de température. Tirets : thermocline. Textes : épilimnion, thermocline, hypolimnion à 4 °C.',
  trophie: 'Hachures de plus en plus denses : trophie croissante. Textes et traits : seuils 10 / 35 / 100 µg/L. Le repère vertical marque le phosphore total.',
  niveau: 'Tirets : rives de référence à 100 %. Trait plein et hachures : étendue actuelle. La perte de surface est écrite en pourcentage, jamais par la seule couleur.',
};

/* E013-10 : défi falsifiable en cinq temps, un par modèle (texte réel). */
const DEFI = {
  sejour: {
    prediction: 'Doubler le débit de sortie Q doit diviser le temps de séjour par deux.',
    reglage: 'Réglez la grandeur B (Q) de 64 à 128 km³/an, volume V inchangé.',
    attendu: 'τ passe d’environ 189 ans à environ 95 ans.',
    falsification: 'Si τ ne baisse pas quand Q monte, la relation τ = V / Q est contredite.',
    debrief: 'Le séjour est un stock divisé par un flux : il réagit immédiatement au débit.',
  },
  bilan: {
    prediction: 'Augmenter E de 10 km³/an doit faire baisser ΔS de 10 km³/an.',
    reglage: 'Réglez la grandeur B (E) de 50 à 60 km³/an, précipitations inchangées.',
    attendu: 'ΔS passe de −10 à −20 km³/an : le lac se vide plus vite.',
    falsification: 'Si ΔS reste à −10, la conservation de la masse écrite dans le bilan est fausse.',
    debrief: 'Le niveau résulte d’une somme algébrique de flux, pas d’une mesure directe.',
  },
  strat: {
    prediction: 'La densité calculée à 4 °C doit dépasser celle relevée en surface à 22 °C.',
    reglage: 'Réglez la grandeur A (température de surface) de 22 à 8 °C.',
    attendu: 'L’écart de densité se réduit : l’eau de surface devient presque aussi dense.',
    falsification: 'Si ρ(4 °C) devenait inférieure à ρ(8 °C), le maximum de densité serait déplacé.',
    debrief: 'Le fond reste occupé par l’eau la plus dense, ce qui explifie la stratification.',
  },
  trophie: {
    prediction: 'Faire passer TP de 12 à 40 µg/L doit changer la classe et réduire la transparence.',
    reglage: 'Réglez la grandeur A (TP) de 12 à 40 µg/L.',
    attendu: 'Le lac passe de mésotrophe à eutrophe ; la transparence estimée diminue.',
    falsification: 'Si la classe ne suit pas les seuils 10 / 35 / 100, le classement est contredit.',
    debrief: 'L’eutrophisation est un seuil de nutriments, pas une simple apparence colorée.',
  },
  niveau: {
    prediction: 'À p = 2, perdre 10 % de hauteur doit retirer environ 19 % de surface.',
    reglage: 'Réglez la grandeur A (niveau) de 100 % à 90 %, exposant p = 2.',
    attendu: 'La surface passe d’environ 31 700 à 25 677 km², soit ≈ 19 % de rives perdues.',
    falsification: 'Si la perte valait 10 %, la relation A(h) = A0·(h/100)^p serait fausse.',
    debrief: 'La rive recule de façon non linéaire : la hauteur n’est pas la surface.',
  },
};

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  mode: 'sejour',
  a: MODES.sejour.a.value,
  b: MODES.sejour.b.value,
  playing: false,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  inView: true,
  listenersInstalled: false,
  nodes: null,
  cells: {},
};

const fmt = (n, d = 1) => {
  if (!Number.isFinite(n)) return '—';
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};

/* Densité de l'eau douce (kg/m³), approximation polynomiale standard :
 * le maximum se produit vers 3,98 °C (chantier E013-07). */
function waterDensity(t) {
  return 1000 * (1 - ((t + 288.9414) / (508929.2 * (t + 68.12963))) * Math.pow(t - 3.9863, 2));
}

/* ---------- Modèles déterministes (E013-05 à E013-09) ---------- */

function modelSejour() {
  const V = S.a;
  const Q = Math.max(1, S.b);
  return { V, Q, tau: V / Q, ref: 190 };
}

function modelBilan() {
  const P = S.a;
  const E = S.b;
  const R = 40; /* ruissellement et affluents : repère fixe du modèle */
  const Qs = 60; /* exutoire : repère fixe du modèle */
  return { P, R, E, Qs, dS: P + R - E - Qs };
}

function modelStrat() {
  const Ts = S.a;
  const H = S.b;
  return {
    Ts,
    H,
    rhoS: waterDensity(Ts),
    rho4: waterDensity(4),
    zTherm: Math.max(8, H * 0.15),
  };
}

function modelTrophie() {
  const tp = S.a;
  const Hm = S.b;
  let classe;
  let seuil;
  if (tp < 10) { classe = 'oligotrophe'; seuil = 'moins de 10 µg/L'; }
  else if (tp < 35) { classe = 'mésotrophe'; seuil = '10 à 35 µg/L'; }
  else if (tp < 100) { classe = 'eutrophe'; seuil = '35 à 100 µg/L'; }
  else { classe = 'hypereutrophe'; seuil = 'plus de 100 µg/L'; }
  return { tp, Hm, classe, seuil, transparence: Math.max(0.5, 8 / (1 + tp / 12)) };
}

function modelNiveau() {
  const h = S.a;
  const p = S.b;
  const A0 = 31700; /* km² : ordre de grandeur d'un grand lac */
  const area = A0 * Math.pow(Math.max(0, Math.min(1, h / 100)), p);
  return { h, p, A0, area, perte: 100 * (1 - area / A0) };
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
.geography-v2-e013-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);
  font-size:11px;line-height:1.6;
}
.geography-v2-e013-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700;
}
.geography-v2-e013-panel h3{
  margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700;
}
.geography-v2-e013-panel p{margin:5px 0;max-width:74ch}
.geography-v2-e013-panel .geography-v2-e013-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e013-panel .geography-v2-e013-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e013-panel .geography-v2-e013-table caption{
  margin-bottom:4px;color:var(--muted,#a8a198);text-align:left;
}
.geography-v2-e013-panel .geography-v2-e013-table th,
.geography-v2-e013-panel .geography-v2-e013-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e013-panel .geography-v2-e013-table thead th{color:var(--gold-bright,#f4d69e)}
.geography-v2-e013-panel .geography-v2-e013-table td{
  color:var(--gold-bright,#f4d69e);font-weight:600;
}
#geography-v2-e013-mode{
  margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px;
}
#geography-v2-e013-mode legend{padding:0 4px;color:var(--gold,#e6b96f)}
.geography-v2-e013-panel .geography-v2-e013-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;
  margin:0 8px 0 0;padding:2px 6px;cursor:pointer;
}
.geography-v2-e013-panel .geography-v2-e013-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e013-slider-row{margin:7px 0}
.geography-v2-e013-slider-row label{display:block;color:var(--ink-soft,#d7d1c6)}
.geography-v2-e013-valeur{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
.geography-v2-e013-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
#geography-v2-e013-canvas{
  display:block;width:100%;height:224px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.30);touch-action:manipulation;
}
.geography-v2-e013-panel .geography-v2-e013-legend{font-size:10px;color:var(--muted,#a8a198)}
.geography-v2-e013-panel .geography-v2-e013-defi{
  margin:6px 0;padding-left:18px;font-size:10px;
}
.geography-v2-e013-panel .geography-v2-e013-defi li{margin:3px 0}
.geography-v2-e013-panel .geography-v2-e013-defi strong{color:var(--gold,#e6b96f)}
#geography-v2-e013-readout{
  min-height:36px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e013-readout strong{color:var(--gold-bright,#f4d69e)}
.geography-v2-e013-panel .geography-v2-e013-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;
  padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation;
  transition:border-color .18s,background-color .18s;
}
.geography-v2-e013-panel .geography-v2-e013-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e013-panel :focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.geography-v2-e013-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.geography-v2-e013-panel[data-geography-v2-e013-reduced="1"] .geography-v2-e013-btn{
  transition:none;
}
@media (prefers-reduced-motion:reduce){
  .geography-v2-e013-panel .geography-v2-e013-btn{
    transition:none!important;animation:none!important;
  }
}
@media (max-width:620px){
  .geography-v2-e013-panel{font-size:10px;padding:9px}
  #geography-v2-e013-canvas{height:184px}
  .geography-v2-e013-panel .geography-v2-e013-choix{margin-right:4px}
}
@media (forced-colors:active){
  .geography-v2-e013-panel{border:1px solid CanvasText}
}
`;

/* ---------- E013-02 / E013-03 : contenu sémantique statique ---------- */

function staticFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  const faits = [
    'Un lac est une étendue d’eau continentale, plus vaste et plus profonde qu’un étang ; aucun seuil universel de superficie ne fait consensus, la distinction reste surtout un usage. Un étang est peu profond (souvent moins de cinq mètres) et une mare est plus petite encore, parfois temporaire.',
    'Repères d’encyclopédie : le lac Supérieur couvre environ 82 100 km² et reste le plus grand lac d’eau douce du monde par la superficie ; le lac Baïkal atteint environ 1 642 m de profondeur et renferme près de 20 % de l’eau douce de surface non glaciaire de la planète. Le Supérieur se renouvelle en environ 190 ans.',
    'L’eau douce est la plus dense vers 4 °C : en hiver, cette eau descend au fond tandis que la glace flotte en surface, ce qui permet à la vie aquatique de survivre sous le gel. C’est le moteur de la stratification saisonnière des lacs tempérés.',
  ];
  faits.forEach((texte) => {
    wrap.appendChild(ctx.el('p', 'geography-v2-e013-fait', texte));
  });
  return wrap;
}

function staticClassification(ctx) {
  const table = ctx.el('table', 'geography-v2-e013-table');
  table.id = ID.classTable;
  table.appendChild(ctx.el('caption', '',
    'Classement qualitatif des plans d’eau : les seuils chiffrés varient selon les auteurs, aucun chiffre unique ne sépare un lac d’un étang.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Type', 'Origine', 'Profondeur typique', 'Renouvellement'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Lac naturel', 'Bassin creusé par la nature (tectonique, glaciaire, volcanique)', 'quelques m à plus de 1 000 m', 'lent : années à siècles'],
    ['Lac de barrage', 'Rivière coupée par un ouvrage artificiel', 'quelques m à environ 200 m', 'rapide : mois à années'],
    ['Étang', 'Petit bassin peu profond, souvent artificiel', 'moins de 5 m', 'rapide'],
    ['Mare', 'Très petite dépression, parfois temporaire', 'moins de 2 m', 'très rapide, saisonnier'],
    ['Bassin endoréique', 'Bassin fermé, sans exutoire vers la mer', 'variable', 'évaporation dominante'],
  ];
  lignes.forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((c, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.setAttribute('scope', 'row');
      cell.textContent = c;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* E013-02 / E013-08 : tableau des mesures, valeurs recalculées (texte réel). */
const MODEL_ROWS = [
  ['sejour', 'Temps de séjour', 'τ = V / Q'],
  ['bilan', 'Bilan hydrologique', 'ΔS = P + R − E − Qs'],
  ['strat', 'Densité à 4 °C', 'ρ = 1000·(1 − ((t + 288,9414)/(508929,2·(t + 68,12963)))·(t − 3,9863)²)'],
  ['trophie', 'Classe trophique', 'TP comparé à 10 / 35 / 100 µg/L'],
  ['niveau', 'Perte de rives', 'A(h) = A0·(h/100)^p'],
];

function buildModelsTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e013-table');
  table.id = ID.models;
  table.appendChild(ctx.el('caption', '',
    'Mesures recalculées depuis les formules et les réglages courants ; le repère est annoncé dans le bandeau.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Expérience', 'Formule déterministe', 'Résultat courant'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  MODEL_ROWS.forEach(([key, label, formule]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = label;
    const form = document.createElement('td');
    form.style.fontWeight = '400';
    form.textContent = formule;
    const value = document.createElement('td');
    value.textContent = '—';
    S.cells[key] = value;
    tr.append(th, form, value);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function fillModelsTable() {
  const c = S.cells;
  const m1 = modelSejour();
  const m2 = modelBilan();
  const m3 = modelStrat();
  const m4 = modelTrophie();
  const m5 = modelNiveau();
  if (c.sejour) c.sejour.textContent = `τ ≈ ${fmt(m1.tau, 0)} ans (repère ≈ ${m1.ref} ans)`;
  if (c.bilan) c.bilan.textContent = `ΔS = ${m2.dS >= 0 ? '+' : ''}${fmt(m2.dS, 0)} km³/an`;
  if (c.strat) c.strat.textContent = `ρ(4 °C) ≈ ${fmt(m3.rho4, 3)} kg/m³`;
  if (c.trophie) c.trophie.textContent = `${m4.classe} · transparence ≈ ${fmt(m4.transparence, 1)} m`;
  if (c.niveau) c.niveau.textContent = `surface ≈ ${fmt(m5.area, 0)} km² · perte ≈ ${fmt(m5.perte, 0)} %`;
}

/* ---------- E013-10 : défi falsifiable en cinq temps ---------- */

const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

function buildDefi(ctx) {
  const list = ctx.el('ol', 'geography-v2-e013-defi');
  list.id = ID.defi;
  const spans = {};
  DEFI_ETAPES.forEach(([key, label]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = label + ' : ';
    const span = document.createElement('span');
    span.textContent = DEFI[S.mode][key];
    spans[key] = span;
    li.append(strong, span);
    list.appendChild(li);
  });
  S.defiSpans = spans;
  return list;
}

function fillDefi() {
  if (!S.defiSpans) return;
  const d = DEFI[S.mode];
  DEFI_ETAPES.forEach(([key]) => {
    const span = S.defiSpans[key];
    if (span) span.textContent = d[key];
  });
}

/* ---------- E013-04 : panneau et contrôles accessibles ---------- */

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function buildPanel(ctx) {
  let panel = document.getElementById(ID.panel);
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    return {
      panel,
      radios: MODE_ORDER.map((m) => document.getElementById(ID.mode + '-' + m)),
      a: document.getElementById(ID.a),
      b: document.getElementById(ID.b),
      aOut: document.getElementById(ID.aValue),
      bOut: document.getElementById(ID.bValue),
      aLabel: document.getElementById(ID.aLabel),
      bLabel: document.getElementById(ID.bLabel),
      canvas: document.getElementById(ID.canvas),
      legend: document.getElementById(ID.legend),
      readout: document.getElementById(ID.readout),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
      fresh: false,
    };
  }

  panel = ctx.el('section', 'geography-v2-e013-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const title = ctx.el('h2', '', 'Lacs et plans d’eau — laboratoire V2');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Un plan d’eau se lit comme un bilan : ce qui entre, ce qui sort, et le temps que l’eau y séjourne. '
    + 'Les cinq expériences ci-dessous illustrent des formules déterministes à partir de grandeurs chiffrées '
    + 'et de repères connus (Supérieur, Baïkal). Les résultats sont écrits en toutes lettres dans le bandeau '
    + 'et dans le tableau : le dessin ne fait qu’illustrer le calcul.');
  lead.id = ID.lead;

  /* E013-04 : choix unique → fieldset/radiogroup, jamais aria-pressed. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = ID.mode;
  fieldset.appendChild(ctx.el('legend', '', 'Expérience observée (choix unique)'));
  MODE_ORDER.forEach((value) => {
    const lab = ctx.el('label', 'geography-v2-e013-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e013-mode';
    radio.id = ID.mode + '-' + value;
    radio.value = value;
    radio.checked = S.mode === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(MODES[value].titre));
    fieldset.appendChild(lab);
  });

  const sub = ctx.el('h3', '', 'Régler le modèle');

  const aRow = ctx.el('div', 'geography-v2-e013-slider-row');
  const aLabel = document.createElement('label');
  aLabel.id = ID.aLabel;
  aLabel.setAttribute('for', ID.a);
  const aOut = ctx.el('span', 'geography-v2-e013-valeur', '');
  aOut.id = ID.aValue;
  aLabel.append(document.createTextNode('Grandeur A : '), aOut);
  const a = document.createElement('input');
  a.type = 'range';
  a.id = ID.a;
  a.setAttribute('aria-label', 'Grandeur A du modèle, bornes et unité affichées dans le libellé');
  aRow.append(aLabel, a);

  const bRow = ctx.el('div', 'geography-v2-e013-slider-row');
  const bLabel = document.createElement('label');
  bLabel.id = ID.bLabel;
  bLabel.setAttribute('for', ID.b);
  const bOut = ctx.el('span', 'geography-v2-e013-valeur', '');
  bOut.id = ID.bValue;
  bLabel.append(document.createTextNode('Grandeur B : '), bOut);
  const b = document.createElement('input');
  b.type = 'range';
  b.id = ID.b;
  b.setAttribute('aria-label', 'Grandeur B du modèle, bornes et unité affichées dans le libellé');
  bRow.append(bLabel, b);

  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire sur les lacs : flèches gauche et droite pour changer d’expérience, '
    + 'flèches haut et bas pour régler la grandeur A, Maj+haut et Maj+bas pour régler la grandeur B, '
    + 'Origine pour revenir aux valeurs par défaut, Entrée pour réénoncer le résultat.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : les flèches gauche et droite parcourent les cinq expériences, '
    + 'les flèches haut et bas règlent la grandeur A, Maj+haut et Maj+bas règlent la grandeur B. '
    + 'Chaque valeur est énoncée dans le bandeau de lecture et reprise dans le tableau de mesures.');
  canvasDesc.id = ID.canvasDesc;

  const legend = ctx.el('p', 'geography-v2-e013-legend', LEGENDES[S.mode]);
  legend.id = ID.legend;

  const modelsTitle = ctx.el('h3', '', 'Mesures vérifiables du modèle');
  modelsTitle.id = ID.modelsTitle;

  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');
  defiTitle.id = ID.defiTitle;

  const readout = ctx.el('p', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.textContent = 'Séjour : le temps de séjour se calcule depuis le volume et le débit.';

  /* E013-04 : boutons ≥ 36 px (ici 44 px) ; aria-pressed réservé à la bascule. */
  const play = ctx.el('button', 'geography-v2-e013-btn', '▶ Animer le laboratoire');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  const reset = ctx.el('button', 'geography-v2-e013-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const note = ctx.el('p', '',
    'Ce laboratoire est un schéma déterministe : aucune donnée géographique mesurée n’est chargée '
    + 'et aucun tirage aléatoire n’intervient. Les grandeurs ci-dessus sont des textes réels, '
    + 'lisibles et indexables même sans animation ; la carte d’origine reste utilisable sans ce panneau.');
  note.id = ID.note;

  panel.append(title, lead, staticFacts(ctx), staticClassification(ctx), fieldset, sub,
    aRow, bRow, canvas, canvasDesc, legend, modelsTitle, buildModelsTable(ctx),
    defiTitle, buildDefi(ctx), readout, play, reset, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    radios: MODE_ORDER.map((m) => document.getElementById(ID.mode + '-' + m)),
    a, b, aOut, bOut, aLabel, bLabel, canvas, legend,
    readout, play, reset,
    fresh: true,
  };
}

/* ---------- E013-01 : badge de statut sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e013-badge',
    'Plans d’eau : schémas déterministes (séjour, bilan, stratification), sans fond de carte réel chargé.');
  badge.id = ID.badge;
  map.appendChild(badge);
}

/* ---------- Rendu du laboratoire (un seul canvas) ---------- */

function drawSejour(g, w, h, m) {
  const pad = 16;
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const cx = pad + iw * 0.5;
  const cy = pad + ih * 0.46;
  const rx = iw * 0.20;
  const ry = ih * 0.24;

  g.setLineDash([]);
  g.strokeStyle = 'rgba(214,207,193,.65)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.stroke();
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.clip();
  g.strokeStyle = 'rgba(120,170,200,.35)';
  g.lineWidth = 1;
  for (let x = cx - rx; x <= cx + rx; x += 8) {
    g.beginPath();
    g.moveTo(x, cy - ry);
    g.lineTo(x + ry, cy + ry);
    g.stroke();
  }
  g.restore();

  g.strokeStyle = 'rgba(244,214,158,.9)';
  g.lineWidth = 2;
  const span = iw * 0.18;
  g.beginPath(); g.moveTo(cx + rx, cy); g.lineTo(cx + rx + span, cy); g.stroke();
  g.beginPath();
  g.moveTo(cx + rx + span - 8, cy - 5); g.lineTo(cx + rx + span, cy); g.lineTo(cx + rx + span - 8, cy + 5);
  g.stroke();
  g.beginPath(); g.moveTo(cx - rx, cy); g.lineTo(cx - rx - span, cy); g.stroke();
  g.font = '10px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.fillText('V entrant', cx - rx - span, cy - 8);
  g.fillText('Q sortie', cx + rx + 4, cy - 8);

  const f = (S.phase / (Math.PI * 2)) % 1;
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.beginPath();
  g.arc(cx + rx + span * f, cy, 3, 0, Math.PI * 2);
  g.fill();

  const frac = Math.min(1, m.tau / (m.ref * 2));
  g.strokeStyle = 'rgba(255,255,255,.4)';
  g.lineWidth = 1;
  g.strokeRect(pad, pad + ih - 22, iw, 6);
  g.fillStyle = 'rgba(244,214,158,.85)';
  g.fillRect(pad, pad + ih - 22, iw * frac, 6);
  g.fillText(`τ ≈ ${fmt(m.tau, 0)} ans · repère ≈ ${m.ref} ans`, pad, pad + ih - 28);
}

function drawBilan(g, w, h, m) {
  const pad = 16;
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const mid = pad + ih * 0.48;
  g.setLineDash([4, 4]);
  g.strokeStyle = 'rgba(255,255,255,.4)';
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(pad, mid); g.lineTo(pad + iw, mid); g.stroke();
  g.setLineDash([]);
  const max = Math.max(m.P, m.R, m.E, m.Qs, 1);
  const items = [['P +', m.P, 1], ['R +', m.R, 1], ['E −', m.E, -1], ['Qs −', m.Qs, -1]];
  const bw = iw / 5;
  g.font = '10px sans-serif';
  items.forEach((it, i) => {
    const lab = it[0];
    const val = it[1];
    const sign = it[2];
    const x = pad + i * bw + bw * 0.25;
    const len = (val / max) * (ih * 0.34);
    const y = sign > 0 ? mid - len : mid;
    g.fillStyle = 'rgba(214,207,193,.30)';
    g.fillRect(x, y, bw * 0.5, len);
    g.strokeStyle = 'rgba(214,207,193,.85)';
    g.lineWidth = 1;
    g.strokeRect(x, y, bw * 0.5, len);
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.fillText(`${lab} ${fmt(val, 0)}`, x, sign > 0 ? mid - len - 4 : mid + len + 12);
  });
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`Bilan ΔS = ${m.dS >= 0 ? '+' : ''}${fmt(m.dS, 0)} km³/an`, pad, pad + ih - 6);
}

function drawStrat(g, w, h, m) {
  const pad = 16;
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const left = pad + iw * 0.12;
  const right = pad + iw * 0.88;
  const top = pad + ih * 0.14;
  const bottom = pad + ih * 0.80;
  const zTherm = m.zTherm + 2 * Math.sin(S.phase);

  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.setLineDash([]);
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const f = i / 40;
    const z = f * m.H;
    const T = 4 + (m.Ts - 4) * Math.exp(-z / zTherm);
    const x = left + (T / 30) * (right - left);
    const y = top + f * (bottom - top);
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();

  const yTh = top + (zTherm / m.H) * (bottom - top);
  g.setLineDash([5, 4]);
  g.strokeStyle = 'rgba(255,255,255,.75)';
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(left, yTh); g.lineTo(right, yTh); g.stroke();
  g.setLineDash([]);

  g.font = '10px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.fillText('Épilimnion (eau chaude)', left, top - 5);
  g.fillText('Thermocline', right - 62, yTh - 5);
  g.fillText('Hypolimnion ≈ 4 °C', left, bottom + 13);
  g.fillText(`Surface ${fmt(m.Ts, 0)} °C · profondeur ${fmt(m.H, 0)} m · ρ(4 °C) ≈ ${fmt(m.rho4, 3)} kg/m³`, pad, pad + ih - 4);
}

function drawTrophie(g, w, h, m) {
  const pad = 16;
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const x0 = pad;
  const yTop = pad + ih * 0.30;
  const yH = ih * 0.28;
  const maxTP = 150;
  const classes = [
    ['Oligotrophe', 0, 10, 9],
    ['Mésotrophe', 10, 35, 7],
    ['Eutrophe', 35, 100, 5],
    ['Hypereutrophe', 100, 150, 3],
  ];
  g.font = '9px sans-serif';
  classes.forEach((cl) => {
    const xa = x0 + (cl[1] / maxTP) * iw;
    const xb = x0 + (cl[2] / maxTP) * iw;
    g.fillStyle = 'rgba(214,207,193,.10)';
    g.fillRect(xa, yTop, xb - xa, yH);
    g.strokeStyle = 'rgba(214,207,193,.55)';
    g.lineWidth = 1;
    g.setLineDash([]);
    g.strokeRect(xa, yTop, xb - xa, yH);
    g.strokeStyle = 'rgba(214,207,193,.35)';
    for (let x = xa + 3; x < xb; x += cl[3]) {
      g.beginPath(); g.moveTo(x, yTop + yH); g.lineTo(x + 8, yTop); g.stroke();
    }
    g.fillStyle = 'rgba(244,214,158,.9)';
    g.fillText(cl[0], xa + 2, yTop - 5);
  });
  const mx = x0 + (Math.min(maxTP, m.tp) / maxTP) * iw;
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(mx, yTop - 2); g.lineTo(mx, yTop + yH + 2); g.stroke();
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.fillText(`Repères : 10 / 35 / 100 µg/L · transparence ≈ ${fmt(m.transparence, 1)} m · profondeur ${fmt(m.Hm, 0)} m`, pad, pad + ih - 20);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`TP ${fmt(m.tp, 0)} µg/L → ${m.classe}`, pad, pad + ih - 6);
}

function drawNiveau(g, w, h, m) {
  const pad = 16;
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const cx = pad + iw * 0.5;
  const baseY = pad + ih * 0.80;
  const halfW = iw * 0.34;
  const maxH = ih * 0.60;
  const f = Math.max(0, Math.min(1, m.h / 100));
  const wRef = halfW;
  const yTopRef = baseY - maxH;
  const wCur = halfW * Math.pow(f, m.p / 2);
  const yCur = baseY - maxH * f;

  g.setLineDash([5, 4]);
  g.strokeStyle = 'rgba(255,255,255,.6)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cx - wRef, yTopRef); g.lineTo(cx, baseY); g.lineTo(cx + wRef, yTopRef);
  g.stroke();
  g.setLineDash([]);

  g.beginPath();
  g.moveTo(cx - wCur, yCur); g.lineTo(cx, baseY); g.lineTo(cx + wCur, yCur); g.closePath();
  g.fillStyle = 'rgba(120,170,200,.18)';
  g.fill();
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.stroke();

  g.save();
  g.beginPath();
  g.moveTo(cx - wCur, yCur); g.lineTo(cx, baseY); g.lineTo(cx + wCur, yCur); g.closePath();
  g.clip();
  g.strokeStyle = 'rgba(120,170,200,.35)';
  g.lineWidth = 1;
  for (let x = cx - wCur; x < cx + wCur; x += 8) {
    g.beginPath(); g.moveTo(x, baseY); g.lineTo(x + maxH, yCur); g.stroke();
  }
  g.restore();

  const osc = 1.5 * Math.sin(S.phase);
  g.strokeStyle = 'rgba(214,207,193,.85)';
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(cx - wCur, yCur + osc); g.lineTo(cx + wCur, yCur + osc); g.stroke();

  g.font = '10px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.fillText('Rives de référence = tirets', pad, pad + 10);
  g.fillText(`Niveau ${fmt(m.h, 0)} % · surface ≈ ${fmt(m.area, 0)} km² · perte ≈ ${fmt(m.perte, 0)} %`, pad, pad + ih - 6);
}

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
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 16;
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, Math.max(10, cssW - pad * 2), Math.max(10, cssH - pad * 2));

  if (S.mode === 'sejour') drawSejour(g, cssW, cssH, modelSejour());
  else if (S.mode === 'bilan') drawBilan(g, cssW, cssH, modelBilan());
  else if (S.mode === 'strat') drawStrat(g, cssW, cssH, modelStrat());
  else if (S.mode === 'trophie') drawTrophie(g, cssW, cssH, modelTrophie());
  else if (S.mode === 'niveau') drawNiveau(g, cssW, cssH, modelNiveau());
}

/* ---------- Bandeau de lecture : synthèse textuelle (role=status) ---------- */

function updateReadout() {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const add = (t) => n.appendChild(document.createTextNode(t));
  const put = (t) => {
    const s = document.createElement('strong');
    s.textContent = t;
    n.appendChild(s);
  };
  n.textContent = '';

  if (S.mode === 'sejour') {
    const m = modelSejour();
    add('Temps de séjour τ = V / Q = ');
    put(`${fmt(m.V, 0)} / ${fmt(m.Q, 0)} ≈ ${fmt(m.tau, 0)} ans`);
    add('. Repère : le lac Supérieur se renouvelle en environ 190 ans, soit ');
    put(m.tau > m.ref ? 'un séjour plus long' : 'un séjour plus court');
    add(' que ce repère. Un grand volume et un faible débit allongent le séjour.');
  } else if (S.mode === 'bilan') {
    const m = modelBilan();
    add('Bilan ΔS = P + R − E − Qs = ');
    put(`${fmt(m.P, 0)} + ${fmt(m.R, 0)} − ${fmt(m.E, 0)} − ${fmt(m.Qs, 0)} = ${m.dS >= 0 ? '+' : ''}${fmt(m.dS, 0)} km³/an`);
    add('. ');
    put(m.dS > 0 ? 'Le lac se remplit' : m.dS < 0 ? 'Le lac se vide' : 'Le lac est à l’équilibre');
    add(' ; R = 40 et Qs = 60 km³/an sont des repères fixes du modèle.');
  } else if (S.mode === 'strat') {
    const m = modelStrat();
    add('À ');
    put(`${fmt(m.Ts, 0)} °C`);
    add(' en surface, la densité vaut environ ');
    put(`${fmt(m.rhoS, 3)} kg/m³`);
    add(' ; elle atteint son maximum ');
    put(`${fmt(m.rho4, 3)} kg/m³ vers 4 °C`);
    add('. L’eau froide et dense reste au fond : le lac est stratifié sur ');
    put(`${fmt(m.H, 0)} m`);
    add(' de profondeur.');
  } else if (S.mode === 'trophie') {
    const m = modelTrophie();
    add('Avec ');
    put(`${fmt(m.tp, 0)} µg/L de phosphore total`);
    add(' (repères : ');
    put(m.seuil);
    add('), le lac est ');
    put(m.classe);
    add(' ; la transparence estimée est de ');
    put(`${fmt(m.transparence, 1)} m`);
    add(' pour une profondeur moyenne de ');
    put(`${fmt(m.Hm, 0)} m`);
    add('. Un apport accru de nutriments réduit la transparence.');
  } else if (S.mode === 'niveau') {
    const m = modelNiveau();
    add('À un niveau de ');
    put(`${fmt(m.h, 0)} % du repère`);
    add(' avec un exposant de forme p = ');
    put(fmt(m.p, 1));
    add(', la surface passe d’environ ');
    put(`${fmt(m.A0, 0)} km²`);
    add(' à ');
    put(`${fmt(m.area, 0)} km²`);
    add(', soit une perte de ');
    put(`${fmt(m.perte, 0)} % de rives`);
    add('. La perte est calculée depuis la puissance du niveau, pas lue sur une couleur.');
  }
}

/* ---------- Application de l'état ---------- */

function applyState() {
  const n = S.nodes;
  if (!n || !n.a || !n.b) return;
  const cfg = MODES[S.mode];

  n.radios.forEach((r) => {
    if (r) r.checked = r.value === S.mode;
  });

  [['a', S.a, cfg.a], ['b', S.b, cfg.b]].forEach((pair) => {
    const key = pair[0];
    const value = pair[1];
    const c = pair[2];
    const slider = n[key];
    const out = key === 'a' ? n.aOut : n.bOut;
    const label = key === 'a' ? n.aLabel : n.bLabel;
    slider.min = String(c.min);
    slider.max = String(c.max);
    slider.step = String(c.step);
    slider.value = String(value);
    if (out) out.textContent = `${fmt(value, c.step < 1 ? 1 : 0)} ${c.unit}`.trim();
    if (label) {
      const suffix = c.unit ? ` (${c.unit})` : '';
      label.firstChild.textContent = (key === 'a' ? 'Grandeur A : ' : 'Grandeur B : ')
        + c.label + suffix + ' = ';
    }
  });

  if (n.legend) n.legend.textContent = LEGENDES[S.mode];
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer le laboratoire';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E013Reduced = S.reduced ? '1' : '0';
  if (S.defiSpans) fillDefi();
  fillModelsTable();
  updateReadout();
  drawLab();
}

function resetMode() {
  S.mode = 'sejour';
  S.a = MODES.sejour.a.value;
  S.b = MODES.sejour.b.value;
  S.phase = 0;
  applyState();
}

/* ---------- E013-10 : boucle rAF unique, pauses multiples ---------- */

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
    S.phase = (S.phase + dt * 0.0009) % (Math.PI * 2);
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

/* ---------- E013-04 : câblage des contrôles (une seule fois) ---------- */

function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  n.radios.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      S.mode = radio.value;
      const cfg = MODES[S.mode];
      S.a = cfg.a.value;
      S.b = cfg.b.value;
      applyState();
    });
  });

  n.a.addEventListener('input', () => {
    const c = MODES[S.mode].a;
    const v = Math.max(c.min, Math.min(c.max, Number(n.a.value)));
    S.a = c.step < 1 ? Math.round(v * 10) / 10 : Math.round(v / c.step) * c.step;
    applyState();
  });
  n.b.addEventListener('input', () => {
    const c = MODES[S.mode].b;
    const v = Math.max(c.min, Math.min(c.max, Number(n.b.value)));
    S.b = c.step < 1 ? Math.round(v * 10) / 10 : Math.round(v / c.step) * c.step;
    applyState();
  });

  n.play.addEventListener('click', () => {
    S.playing = !S.playing;
    if (!S.playing || S.reduced) stopLoop(); else startLoop();
    applyState();
  });
  n.reset.addEventListener('click', () => {
    resetMode();
  });

  n.canvas.addEventListener('keydown', (event) => {
    let used = true;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const i = MODE_ORDER.indexOf(S.mode);
      S.mode = MODE_ORDER[(i + step + MODE_ORDER.length) % MODE_ORDER.length];
      S.a = MODES[S.mode].a.value;
      S.b = MODES[S.mode].b.value;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const sign = event.key === 'ArrowUp' ? 1 : -1;
      const c = event.shiftKey ? MODES[S.mode].b : MODES[S.mode].a;
      const v = (event.shiftKey ? S.b : S.a) + sign * c.step;
      const clamped = Math.max(c.min, Math.min(c.max, v));
      const val = c.step < 1 ? Math.round(clamped * 10) / 10 : clamped;
      if (event.shiftKey) S.b = val; else S.a = val;
    } else if (event.key === 'Home') {
      S.a = MODES[S.mode].a.value;
      S.b = MODES[S.mode].b.value;
      S.phase = 0;
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

register('E013', (ctx) => {
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
