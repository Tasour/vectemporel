import { register } from './registry.js';

/*
 * Lentille E087 — SECONDE PASSE (V2) : chiffres significatifs et précision
 * des mesures géographiques.
 *
 * Les dix chantiers E087-01 … E087-10 sont réellement implémentés ci-dessous.
 * La V2 conserve le thème de la passe 1 mais ajoute : un badge de statut sur la
 * carte, un tableau de mesures recalculées à chaque réglage, une fiche de
 * vérité à trois faits sourcés, un défi falsifiable en cinq temps, une région
 * live qui propage l'erreur en kilomètres, et une boucle rAF unique suspendue
 * sur document.hidden, hors champ (IntersectionObserver réabonné) et en
 * mouvement réduit (ctx.reducedMotion() prioritaire).
 *
 * Tout le savoir est du texte sémantique indexable (h2/h3/p/ol/li/table/
 * caption/th/td) présent dans le DOM ; le canvas n'est qu'un laboratoire qui
 * illustre des formules déterministes. Aucune grandeur réelle n'est inventée :
 * les valeurs sont des grandeurs de démonstration explicitement présentées
 * comme telles.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e087-` (aucune collision avec la passe 1 `geography-e087-`).
 * Zéro console.*, zéro réseau, zéro Math.random, une seule boucle rAF.
 * Français intégral. ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e087';

/* E087-02 : tous les identifiants sont préfixés. */
const ID = {
  panel: 'geography-v2-e087-panel',
  title: 'geography-v2-e087-title',
  lead: 'geography-v2-e087-lead',
  facts: 'geography-v2-e087-facts',
  table: 'geography-v2-e087-table',
  mesures: 'geography-v2-e087-mesures',
  mesuresTitle: 'geography-v2-e087-mesures-title',
  sig: 'geography-v2-e087-sig',
  sigOut: 'geography-v2-e087-sig-value',
  mesureGroup: 'geography-v2-e087-mesure-groupe',
  canvas: 'geography-v2-e087-canvas',
  canvasDesc: 'geography-v2-e087-canvas-desc',
  legend: 'geography-v2-e087-legend',
  readout: 'geography-v2-e087-readout',
  play: 'geography-v2-e087-play',
  reset: 'geography-v2-e087-reset',
  defi: 'geography-v2-e087-defi',
  defiBtn: 'geography-v2-e087-defi-btn',
  defiRep: 'geography-v2-e087-defi-rep',
  note: 'geography-v2-e087-note',
  badge: 'geography-v2-e087-badge',
};

/* Valeurs de démonstration : supports d'arrondi, jamais des relevés de terrain.
   `complet` conserve l'écriture littérale pour ne jamais tronquer la colonne
   « Valeur complète » en la formatant à sept chiffres. */
const LAT_REF = 48.856371;
const KM_PAR_DEGRE = 111.32; /* 1° de latitude ≈ 111,32 km (référence). */
const MESURES = [
  { id: 'lat', nom: 'Latitude', valeur: LAT_REF, unite: '°', complet: '48,856371',
    detail: 'La latitude de référence vaut 48,856371 degrés.' },
  { id: 'lon', nom: 'Longitude', valeur: 2.352228, unite: '°', complet: '2,352228',
    detail: 'La longitude de référence vaut 2,352228 degrés.' },
  { id: 'alt', nom: 'Altitude', valeur: 35.72, unite: 'm', complet: '35,72',
    detail: 'L’altitude de référence vaut 35,72 mètres.' },
];
const MESURE_IDS = MESURES.map((m) => m.id);

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  sig: 4,
  mesureId: 'lat',
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  inView: true,
  listenersInstalled: false,
  observedCanvas: null,
  observer: null,
  nodes: null,
  cells: {},
  defiSpans: null,
};

/* ---------- E087-03 : formules déterministes (fonctions pures) ---------- */

/* Signe moins typographique et virgule décimale à la française (global). */
const fr = (s) => String(s).replace(/-/g, '\u2212');

/* Valeur arrondie à n chiffres significatifs. */
function arrondir(v, n) {
  if (!v || !isFinite(v)) return v;
  const exp = Math.floor(Math.log10(Math.abs(v)));
  const facteur = Math.pow(10, exp - n + 1);
  return Math.round(v / facteur) * facteur;
}

/* Écriture d'une valeur avec exactement n chiffres significatifs. */
function formatSig(v, n) {
  if (!isFinite(v)) return '—';
  if (v === 0) return fr((0).toFixed(Math.max(0, n - 1)));
  const exp = Math.floor(Math.log10(Math.abs(v)));
  const decimals = Math.max(0, n - 1 - exp);
  return fr(v.toFixed(decimals));
}

/* Demi-unité du dernier chiffre retenu : incertitude d'arrondi. */
function incertitude(v, n) {
  if (!v || !isFinite(v)) return 0;
  const exp = Math.floor(Math.log10(Math.abs(v)));
  return 0.5 * Math.pow(10, exp - n + 1);
}

/* Longueur d'un degré de longitude à une latitude donnée. */
function kmParDegreLongitude(lat) {
  return KM_PAR_DEGRE * Math.cos(lat * Math.PI / 180);
}

function mesureCourante() {
  return MESURES.find((m) => m.id === S.mesureId) || MESURES[0];
}

/* Calcul complet, sans effet de bord ni donnée mise en cache. */
function calculer() {
  const m = mesureCourante();
  const v = m.valeur;
  const arr = arrondir(v, S.sig);
  const inc = incertitude(v, S.sig);
  const errAbs = Math.abs(arr - v);
  const errRel = (errAbs / Math.abs(v)) * 100;
  const incRel = (inc / Math.abs(v)) * 100;
  /* La conversion en kilomètres ne s'applique qu'aux grandeurs angulaires.
     Pour la longitude, le facteur dépend de la latitude de référence ; pour
     l'altitude, l'erreur reste en mètres : v × 111,32 serait la distance à
     l'équateur, pas une longueur de degré. */
  const angulaire = m.id !== 'alt';
  const kmParDegre = m.id === 'lon' ? kmParDegreLongitude(LAT_REF) : KM_PAR_DEGRE;
  return {
    m, v, arr, inc, errAbs, errRel, incRel, angulaire, kmParDegre,
    errKm: angulaire ? errAbs * kmParDegre : null,
    incKm: angulaire ? inc * kmParDegre : null,
    kmLongitude: kmParDegreLongitude(LAT_REF),
    texte: `${formatSig(arr, S.sig)} ${m.unite}`,
    incTexte: `± ${fr(formatSig(inc, 1))} ${m.unite}`,
  };
}

const pct = (v, d = 2) => fr(v.toFixed(d).replace('.', ','));
const fixe = (v, d = 2) => fr(v.toFixed(d).replace('.', ','));

/* ---------- E087-02 : feuille de style unique injectée une seule fois ---------- */

const CSS = `
.geography-v2-e087-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);
  font-size:11px;line-height:1.6;
}
.geography-v2-e087-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700;
}
.geography-v2-e087-panel h3{
  margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700;
}
.geography-v2-e087-panel p{margin:5px 0;max-width:74ch}
.geography-v2-e087-panel .geography-v2-e087-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e087-panel .geography-v2-e087-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e087-panel .geography-v2-e087-table caption{
  margin-bottom:4px;color:var(--muted,#a8a198);text-align:left;
}
.geography-v2-e087-panel .geography-v2-e087-table th,
.geography-v2-e087-panel .geography-v2-e087-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e087-panel .geography-v2-e087-table thead th{color:var(--gold-bright,#f4d69e)}
.geography-v2-e087-panel .geography-v2-e087-table tbody th{color:var(--ink,#e9e3d5)}
.geography-v2-e087-panel .geography-v2-e087-table td{font-weight:600}
.geography-v2-e087-panel .geography-v2-e087-ctrl,
#geography-v2-e087-mesure-groupe{
  margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px;
}
.geography-v2-e087-panel .geography-v2-e087-ctrl legend,
#geography-v2-e087-mesure-groupe legend{padding:0 4px;color:var(--gold,#e6b96f)}
.geography-v2-e087-panel .geography-v2-e087-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;
  margin:0 8px 0 0;padding:2px 6px;cursor:pointer;
}
.geography-v2-e087-panel .geography-v2-e087-choix input{
  min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e087-slider-row{margin:7px 0}
.geography-v2-e087-slider-row label{display:block;color:var(--ink-soft,#d7d1c6)}
.geography-v2-e087-valeur{
  color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums;
}
.geography-v2-e087-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
#geography-v2-e087-canvas{
  display:block;width:100%;height:224px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.30);touch-action:manipulation;
}
.geography-v2-e087-panel .geography-v2-e087-legend{font-size:10px;color:var(--muted,#a8a198)}
.geography-v2-e087-panel .geography-v2-e087-defi{margin:6px 0;padding-left:18px;font-size:10px}
.geography-v2-e087-panel .geography-v2-e087-defi li{margin:3px 0}
.geography-v2-e087-panel .geography-v2-e087-defi strong{color:var(--gold,#e6b96f)}
#geography-v2-e087-defi-rep{
  color:var(--gold-bright,#f4d69e);font-size:10px;
}
#geography-v2-e087-readout{
  min-height:36px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e087-readout strong{color:var(--gold-bright,#f4d69e)}
.geography-v2-e087-panel .geography-v2-e087-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;
  padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation;
  transition:border-color .18s,background-color .18s;
}
.geography-v2-e087-panel .geography-v2-e087-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e087-panel :focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.geography-v2-e087-badge{
  position:absolute;right:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.geography-v2-e087-panel[data-geography-v2-e087-reduced="1"] .geography-v2-e087-btn{
  transition:none;
}
@media (prefers-reduced-motion:reduce){
  .geography-v2-e087-panel .geography-v2-e087-btn{
    transition:none!important;animation:none!important;
  }
}
@media (max-width:620px){
  .geography-v2-e087-panel{font-size:10px;padding:9px}
  #geography-v2-e087-canvas{height:184px}
  .geography-v2-e087-panel .geography-v2-e087-choix{margin-right:4px}
}
@media (forced-colors:active){
  .geography-v2-e087-panel{border:1px solid CanvasText}
}
`;

/* ---------- E087-01 / E087-05 : contenu sémantique, lisible sans animation ---------- */

/* E087-05 : fiche de vérité à trois faits sourcés. */
function staticFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  const faits = [
    'Un chiffre significatif porte une information sur la mesure : tous les chiffres non nuls le sont, les zéros encadrés par des chiffres non nuls le sont, les zéros placés avant le premier chiffre non nul ne le sont pas, et les zéros finaux après la virgule le sont car ils indiquent la précision.',
    'La précision désigne la finesse de la mesure — la plus petite variation que l’instrument peut distinguer — tandis que l’exactitude désigne la proximité avec la valeur vraie. Une mesure peut être très précise sans être exacte : des chiffres nombreux ne garantissent pas la justesse.',
    'L’incertitude d’arrondi vaut la moitié de l’unité du dernier chiffre conservé : pour 48,86° (deux décimales), elle est de ± 0,005°. L’erreur d’arrondi ne dépasse jamais cette demi-unité. La conversion en distance dépend de la grandeur : 1° de latitude ≈ 111,32 km, mais 1° de longitude ≈ 111,32 × cos(lat) km, soit 73,24 km à 48,86° de latitude.',
  ];
  faits.forEach((texte) => {
    wrap.appendChild(ctx.el('p', 'geography-v2-e087-fait', texte));
  });
  return wrap;
}

/* E087-04 : tableau comparatif captioné, écriture littérale non tronquée. */
function buildComparatif(ctx) {
  const table = ctx.el('table', 'geography-v2-e087-table');
  table.id = ID.table;
  table.appendChild(ctx.el('caption', '',
    'Trois grandeurs de démonstration arrondies à 7 puis à 2 chiffres significatifs. '
    + 'Références : 1° de latitude ≈ 111,32 km ; 1° de longitude ≈ 111,32 × cos(lat) km. '
    + 'La colonne « Valeur complète » conserve l’écriture littérale de la mesure.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Valeur complète', '7 chiffres', '2 chiffres', 'Incertitude à 2 chiffres'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  MESURES.forEach((m) => {
    const cells = [
      m.nom,
      `${m.complet} ${m.unite}`,
      `${formatSig(arrondir(m.valeur, 7), 7)} ${m.unite}`,
      `${formatSig(arrondir(m.valeur, 2), 2)} ${m.unite}`,
      `± ${fr(formatSig(incertitude(m.valeur, 2), 1))} ${m.unite}`,
    ];
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

/* E087-04 : second tableau recalculé à chaque réglage. */
function buildMesures(ctx) {
  const table = ctx.el('table', 'geography-v2-e087-table');
  table.id = ID.mesures;
  table.appendChild(ctx.el('caption', '',
    'Valeurs recalculées depuis les formules et le nombre de chiffres significatifs courant ; '
    + 'la propagation en kilomètres est énoncée dans le bandeau de lecture.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Valeur complète', 'Arrondi courant', 'Incertitude', 'Erreur d’arrondi'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  MESURES.forEach((m) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = m.nom;
    const cells = [
      document.createElement('td'), document.createElement('td'),
      document.createElement('td'), document.createElement('td'),
    ];
    cells[0].textContent = `${m.complet} ${m.unite}`;
    S.cells[m.id] = cells.slice(1);
    tr.append(th, ...cells);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function fillMesures() {
  MESURES.forEach((m) => {
    const c = S.cells[m.id];
    if (!c) return;
    const arr = arrondir(m.valeur, S.sig);
    const inc = incertitude(m.valeur, S.sig);
    const err = Math.abs(arr - m.valeur);
    c[0].textContent = `${formatSig(arr, S.sig)} ${m.unite}`;
    c[1].textContent = `± ${fr(formatSig(inc, 1))} ${m.unite}`;
    c[2].textContent = `${fr(formatSig(err, 2))} ${m.unite}`;
  });
}

/* ---------- E087-09 : limite falsifiable, défi en cinq temps ---------- */

const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

const DEFI = {
  prediction: 'En passant de 7 à 2 chiffres significatifs sur la latitude, par combien l’incertitude est-elle multipliée ?',
  reglage: 'Choisissez la latitude et placez le curseur à 2 chiffres significatifs.',
  attendu: 'L’incertitude annoncée doit être de ± 0,5° (unité du dernier chiffre = 1°).',
  falsification: 'Si la lecture affiche ± 0,05°, vous avez arrondi à une décimale (48,9°) ; si elle affiche ± 0,005°, vous avez compté deux décimales (48,86°) au lieu de deux chiffres significatifs (49°).',
  debrief: 'Retrancher cinq chiffres (de 7 à 2) fait gagner cinq puissances de dix à l’unité du dernier chiffre, qui passe de 10⁻⁵° à 10⁰° : l’incertitude va de ± 0,000005° à ± 0,5°, soit un facteur 100 000. L’erreur angulaire effective passe de 0,000001° à 0,14°, soit environ 15,99 km au facteur 111,32 km/°. Arrondir ne rend pas la mesure plus précise : cela masque des chiffres.',
};

function buildDefi(ctx) {
  const list = ctx.el('ol', 'geography-v2-e087-defi');
  list.id = ID.defi;
  const spans = {};
  DEFI_ETAPES.forEach(([key, label]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = label + ' : ';
    const span = document.createElement('span');
    span.textContent = DEFI[key];
    spans[key] = span;
    li.append(strong, span);
    list.appendChild(li);
  });
  S.defiSpans = spans;
  return list;
}

/* ---------- E087-01 / E087-06 : panneau et contrôles accessibles ---------- */

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
      sig: document.getElementById(ID.sig),
      sigOut: document.getElementById(ID.sigOut),
      radios: MESURE_IDS.map((id) => document.getElementById(`${ID.mesureGroup}-${id}`)),
      canvas: document.getElementById(ID.canvas),
      legend: document.getElementById(ID.legend),
      readout: document.getElementById(ID.readout),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
      defiBtn: document.getElementById(ID.defiBtn),
      defiRep: document.getElementById(ID.defiRep),
    };
  }

  panel = ctx.el('section', 'geography-v2-e087-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const title = ctx.el('h2', '', 'Chiffres significatifs et précision — laboratoire V2');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Une coordonnée géographique est une mesure, pas un nombre pur : le nombre de chiffres que l’on '
    + 'écrit annonce la précision du capteur. Ce laboratoire montre comment un arrondi à n chiffres '
    + 'significatifs change l’incertitude et l’erreur, puis propage cette erreur lors de la conversion '
    + 'en kilomètres. Les valeurs employées sont des grandeurs de démonstration, jamais des relevés de '
    + 'terrain : elles servent uniquement à rendre les calculs vérifiables.');
  lead.id = ID.lead;

  const defsTitle = ctx.el('h3', '', 'Repères de vocabulaire et de conversion');

  /* E087-06 : curseur de 1 à 7 chiffres significatifs. */
  const sigField = document.createElement('fieldset');
  sigField.className = 'geography-v2-e087-ctrl';
  const sigLegend = document.createElement('legend');
  sigLegend.textContent = 'Nombre de chiffres significatifs';
  sigField.appendChild(sigLegend);
  const sigRow = ctx.el('div', 'geography-v2-e087-slider-row');
  const sigLabel = document.createElement('label');
  sigLabel.setAttribute('for', ID.sig);
  sigLabel.appendChild(document.createTextNode('Chiffres conservés : '));
  const sigOut = ctx.el('span', 'geography-v2-e087-valeur', String(S.sig));
  sigOut.id = ID.sigOut;
  sigLabel.appendChild(sigOut);
  const sig = document.createElement('input');
  sig.type = 'range';
  sig.id = ID.sig;
  sig.min = '1';
  sig.max = '7';
  sig.step = '1';
  sig.value = String(S.sig);
  sig.setAttribute('aria-label', 'Nombre de chiffres significatifs conservés, de 1 à 7');
  sigRow.append(sigLabel, sig);
  sigField.appendChild(sigRow);

  /* E087-06 : choix unique → radiogroup, jamais aria-pressed. */
  const mesureField = document.createElement('fieldset');
  mesureField.id = ID.mesureGroup;
  mesureField.setAttribute('role', 'radiogroup');
  const mesureLegend = document.createElement('legend');
  mesureLegend.textContent = 'Grandeur mesurée (choix unique)';
  mesureField.appendChild(mesureLegend);
  MESURES.forEach((m) => {
    const lab = ctx.el('label', 'geography-v2-e087-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e087-mesure';
    radio.id = `${ID.mesureGroup}-${m.id}`;
    radio.value = m.id;
    radio.checked = m.id === S.mesureId;
    radio.setAttribute('aria-label', `${m.nom} : ${m.detail}`);
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(` ${m.nom} (${m.complet} ${m.unite})`));
    mesureField.appendChild(lab);
  });

  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Droite numérique zoomée : le trait en tirets marque la valeur de référence, '
    + 'le disque la valeur arrondie et la bande l’intervalle d’incertitude. '
    + 'Flèches gauche et droite : nombre de chiffres significatifs ; '
    + 'flèches haut et bas : grandeur mesurée ; Origine : sept chiffres sur la latitude.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : les flèches gauche et droite règlent le nombre de chiffres '
    + 'significatifs de 1 à 7, les flèches haut et bas parcourent les trois grandeurs, et la touche '
    + 'Origine restaure sept chiffres sur la latitude. Chaque valeur est énoncée dans le bandeau et '
    + 'reprise dans le tableau des mesures.');
  canvasDesc.id = ID.canvasDesc;

  const legend = ctx.el('p', 'geography-v2-e087-legend',
    'Trait en tirets = valeur de référence ; disque = valeur arrondie ; bande = intervalle '
    + 'd’incertitude ; losange = balayage déterministe. Les formes distinguent les éléments, '
    + 'indépendamment de la couleur.');
  legend.id = ID.legend;

  const mesuresTitle = ctx.el('h3', '', 'Mesures vérifiables du modèle');

  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');

  const readout = ctx.el('p', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.textContent = 'Sélectionnez une grandeur et un nombre de chiffres significatifs.';

  /* E087-06 : boutons ≥ 44 px ; aria-pressed réservé à la bascule d'animation. */
  const play = ctx.el('button', 'geography-v2-e087-btn', '▶ Animer le balayage');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  const reset = ctx.el('button', 'geography-v2-e087-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const defiBtn = ctx.el('button', 'geography-v2-e087-btn', 'Révéler le débrief');
  defiBtn.type = 'button';
  defiBtn.id = ID.defiBtn;
  defiBtn.setAttribute('aria-expanded', 'false');
  defiBtn.setAttribute('aria-controls', ID.defiRep);
  const defiRep = ctx.el('p', '', DEFI.debrief);
  defiRep.id = ID.defiRep;
  defiRep.hidden = true;

  const note = ctx.el('p', '',
    'Ce laboratoire est un schéma déterministe : aucune donnée géographique mesurée n’est chargée '
    + 'et aucun tirage aléatoire n’intervient. Les grandeurs ci-dessus sont des textes réels, '
    + 'lisibles et indexables même sans animation ; la carte d’origine reste utilisable sans ce panneau.');
  note.id = ID.note;

  panel.append(title, lead, defsTitle, staticFacts(ctx), buildComparatif(ctx), sigField,
    mesureField, canvas, canvasDesc, legend, mesuresTitle, buildMesures(ctx),
    defiTitle, buildDefi(ctx), defiBtn, defiRep, readout, play, reset, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    fresh: true,
    sig, sigOut,
    radios: MESURE_IDS.map((id) => document.getElementById(`${ID.mesureGroup}-${id}`)),
    canvas, legend, readout, play, reset, defiBtn, defiRep,
  };
}

/* ---------- E087-01 : badge de statut sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e087-badge',
    'Chiffres significatifs : grandeurs de démonstration, pas des relevés de terrain. '
    + 'Écrire trop de décimales suggère une précision que le capteur n’a pas ; '
    + 'l’incertitude vaut la demi-unité du dernier chiffre.');
  badge.id = ID.badge;
  map.appendChild(badge);
}

/* ---------- E087-07 : laboratoire canvas (un seul canvas par frame) ---------- */

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

  const c = calculer();
  const v = c.v;
  const span = Math.max(c.inc * 8, Math.abs(v) * 0.02, 0.0005);
  const min = v - span;
  const max = v + span;
  const pad = 22;
  const iw = Math.max(10, cssW - pad * 2);
  const y = Math.round(cssH * 0.55);
  const toPx = (val) => pad + ((val - min) / (max - min)) * iw;

  /* Axe et graduations : repère non chromatique. */
  g.strokeStyle = 'rgba(255,255,255,.30)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.beginPath(); g.moveTo(pad, y); g.lineTo(pad + iw, y); g.stroke();
  for (let i = 0; i <= 8; i += 1) {
    const xx = pad + (i / 8) * iw;
    g.beginPath(); g.moveTo(xx, y - 5); g.lineTo(xx, y + 5); g.stroke();
  }

  /* Bande d'incertitude autour de la valeur arrondie. */
  const x0 = toPx(c.arr - c.inc);
  const x1 = toPx(c.arr + c.inc);
  g.fillStyle = 'rgba(230,185,111,.18)';
  g.fillRect(x0, y - 20, Math.max(2, x1 - x0), 40);
  g.strokeStyle = 'rgba(230,185,111,.70)';
  g.setLineDash([3, 3]);
  g.strokeRect(x0, y - 20, Math.max(2, x1 - x0), 40);
  g.setLineDash([]);

  /* Valeur de référence : trait tirets et triangle. */
  const xv = toPx(v);
  g.strokeStyle = 'rgba(255,255,255,.85)';
  g.setLineDash([4, 3]);
  g.beginPath(); g.moveTo(xv, 14); g.lineTo(xv, cssH - 14); g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.beginPath(); g.moveTo(xv, 12); g.lineTo(xv - 5, 4); g.lineTo(xv + 5, 4); g.closePath(); g.fill();

  /* Valeur arrondie : disque plein. */
  const xa = toPx(c.arr);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.beginPath(); g.arc(xa, y, 6, 0, Math.PI * 2); g.fill();

  /* Balayage déterministe : un losange court sur l'axe. */
  const sx = pad + S.sweep * iw;
  const sy = y - 30;
  g.beginPath();
  g.moveTo(sx, sy - 5); g.lineTo(sx + 5, sy); g.lineTo(sx, sy + 5); g.lineTo(sx - 5, sy);
  g.closePath(); g.fill();

  /* Étiquettes textuelles : l'information ne dépend pas de la couleur. */
  g.font = '11px sans-serif';
  g.fillStyle = 'rgba(244,214,158,.98)';
  g.fillText(`${c.m.nom} arrondie : ${c.texte}   ${c.incTexte}`, pad, 24);
  g.fillStyle = 'rgba(214,207,193,.95)';
  g.fillText(`référence ${c.m.complet} ${c.m.unite} — erreur ${fr(formatSig(c.errAbs, 2))} ${c.m.unite}`, pad, cssH - 10);
}

/* ---------- E087-08 : bandeau live, grandeurs référencées, propagation ---------- */

function updateReadout() {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const c = calculer();
  const add = (t) => n.appendChild(document.createTextNode(t));
  const put = (t) => {
    const s = document.createElement('strong');
    s.textContent = t;
    n.appendChild(s);
  };
  n.textContent = '';
  add('Grandeur : ');
  put(c.m.nom);
  add(`. Référence ${c.m.complet} ${c.m.unite} ; arrondi à ${S.sig} chiffres : `);
  put(c.texte);
  add(`. Incertitude ${c.incTexte} (${pct(c.incRel)} % de la valeur) ; erreur d’arrondi `);
  put(`${fr(formatSig(c.errAbs, 2))} ${c.m.unite}`);
  add(` (${pct(c.errRel, 3)} %). À titre de comparaison : 1° de latitude ≈ ${fixe(KM_PAR_DEGRE)} km, `);
  add(`mais 1° de longitude à 48,86° ≈ ${fixe(c.kmLongitude)} km, soit un facteur ${fixe(KM_PAR_DEGRE / c.kmLongitude)}. `);
  if (c.angulaire) {
    add('Conversion de l’erreur angulaire en distance : ');
    put(`± ${fixe(c.errKm)} km`);
    add(` d’erreur effective (${fixe(c.incKm)} km au maximum), au facteur ${fixe(c.kmParDegre)} km par degré.`);
  } else {
    add('L’altitude est une longueur : son erreur reste exprimée en mètres, sans conversion angulaire.');
  }
}

/* ---------- Application de l'état ---------- */

function applyState() {
  const n = S.nodes;
  if (!n || !n.sig) return;

  n.radios.forEach((r) => { if (r) r.checked = r.value === S.mesureId; });
  n.sig.value = String(S.sig);
  if (n.sigOut) n.sigOut.textContent = String(S.sig);
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E087Reduced = S.reduced ? '1' : '0';
  fillMesures();
  updateReadout();
  drawLab();
}

function resetState() {
  S.sig = 7;
  S.mesureId = 'lat';
  S.sweep = 0;
  applyState();
}

/* ---------- E087-10 : boucle rAF unique, pauses multiples ---------- */

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
    S.sweep = (S.sweep + dt * 0.00012) % 1;
  }
  S.lastTs = ts;
  drawLab();
  S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  /* Écouteurs globaux : une seule installation, même si la coque reconstruit
     le DOM et rappelle l'entrée de la lentille. */
  if (!S.listenersInstalled) {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopLoop(); else startLoop();
      });
    }

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = (event) => {
          S.reduced = !!(event && event.matches);
          if (S.nodes && S.nodes.panel) {
            S.nodes.panel.dataset.geographyV2E087Reduced = S.reduced ? '1' : '0';
          }
          if (S.reduced) stopLoop(); else startLoop();
          applyState();
        };
        if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
        else if (typeof mq.addListener === 'function') mq.addListener(onChange);
      } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
    }
    S.listenersInstalled = true;
  }

  /* Le panneau peut être reconstruit : le canvas observé change d'identité.
     On se réabonne sur le nouveau nœud, sinon la boucle resterait figée sur
     une référence détachée du document. */
  const cv = S.nodes && S.nodes.canvas;
  if (cv && typeof IntersectionObserver === 'function' && S.observedCanvas !== cv) {
    try {
      if (S.observer) S.observer.disconnect();
      S.observedCanvas = cv;
      S.inView = true;
      S.observer = new IntersectionObserver((entries) => {
        S.inView = entries.length ? !!entries[0].isIntersecting : true;
        if (S.inView) startLoop(); else stopLoop();
      }, { threshold: 0.05 });
      S.observer.observe(cv);
    } catch { /* observateur indisponible : la visibilité de l'onglet reste le garde-fou */ }
  }
}

/* ---------- E087-06 : câblage des contrôles (une seule fois) ---------- */

function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  n.sig.addEventListener('input', () => {
    S.sig = Math.max(1, Math.min(7, Math.round(Number(n.sig.value))));
    applyState();
  });

  n.radios.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (radio.checked) { S.mesureId = radio.value; applyState(); }
    });
  });

  n.play.addEventListener('click', () => {
    S.playing = !S.playing;
    if (!S.playing || S.reduced) stopLoop(); else startLoop();
    applyState();
  });

  n.reset.addEventListener('click', resetState);

  n.defiBtn.addEventListener('click', () => {
    const ouvert = n.defiBtn.getAttribute('aria-expanded') === 'true';
    n.defiBtn.setAttribute('aria-expanded', ouvert ? 'false' : 'true');
    n.defiBtn.textContent = ouvert ? 'Révéler le débrief' : 'Masquer le débrief';
    n.defiRep.hidden = ouvert;
  });

  n.canvas.addEventListener('keydown', (event) => {
    let used = true;
    if (event.key === 'ArrowLeft') S.sig = Math.max(1, S.sig - 1);
    else if (event.key === 'ArrowRight') S.sig = Math.min(7, S.sig + 1);
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const i = MESURE_IDS.indexOf(S.mesureId);
      const dir = event.key === 'ArrowDown' ? 1 : -1;
      S.mesureId = MESURE_IDS[(i + dir + MESURE_IDS.length) % MESURE_IDS.length];
    } else if (event.key === 'Home') {
      resetState();
    } else used = false;
    if (used) {
      event.preventDefault();
      applyState();
    }
  });
}

/* ---------- Point d'entrée unique ---------- */

register('E087', (ctx) => {
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
