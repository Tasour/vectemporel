import { register } from './registry.js';

/*
 * Lentille E088 — SECONDE PASSE (V2) : arrondi et formatage des valeurs numériques.
 *
 * Les dix chantiers E088-01 … E088-10 sont réellement implémentés ci-dessous.
 * La V2 conserve le cœur déterministe de la passe 1 (une seule formule
 * q = arrondi(x·10^d)/10^d, cinq règles distinctes, tolérance relative aux
 * demi-exacts, chiffres significatifs, notation française, conversion
 * décimale ↔ DMS, piège de la virgule flottante) et ajoute : une fiche de
 * vérité à trois faits sourcés, un tableau de mesures recalculées, un défi
 * falsifiable en cinq temps, un bouton de remise à zéro et une boucle rAF
 * unique suspendue sur document.hidden, hors champ (IntersectionObserver) et
 * en mouvement réduit.
 *
 * Tout le contenu pédagogique est du texte sémantique indexable
 * (h2/h3/p/ol/li/table/caption/th/td/fieldset/legend/label) présent dans le
 * DOM : il reste lisible sans animation ni interaction. Le canvas n'est qu'un
 * laboratoire qui illustre des règles arithmétiques déterministes. Aucune
 * coordonnée réelle n'est inventée : la latitude de Paris (48,8566°) sert de
 * référence explicite et les cinq règles sont comparées sur les mêmes nombres.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e088-` (aucune collision avec la passe 1 `geography-e088-`).
 * Zéro console.*, zéro réseau, zéro Math.random, une seule boucle rAF.
 * Français intégral. ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e088';

const ID = {
  panel: 'geography-v2-e088-panel',
  title: 'geography-v2-e088-title',
  facts: 'geography-v2-e088-facts',
  rulesTitle: 'geography-v2-e088-rules-title',
  rules: 'geography-v2-e088-rules',
  mode: 'geography-v2-e088-mode',
  vue: 'geography-v2-e088-vue',
  valeur: 'geography-v2-e088-valeur',
  valeurValue: 'geography-v2-e088-valeur-value',
  dec: 'geography-v2-e088-decimales',
  decValue: 'geography-v2-e088-decimales-value',
  table: 'geography-v2-e088-table',
  measuresTitle: 'geography-v2-e088-measures-title',
  measures: 'geography-v2-e088-measures',
  canvas: 'geography-v2-e088-canvas',
  canvasDesc: 'geography-v2-e088-canvas-desc',
  legend: 'geography-v2-e088-legend',
  defiTitle: 'geography-v2-e088-defi-title',
  defi: 'geography-v2-e088-defi',
  readout: 'geography-v2-e088-readout',
  play: 'geography-v2-e088-play',
  reset: 'geography-v2-e088-reset',
  note: 'geography-v2-e088-note',
  badge: 'geography-v2-e088-badge',
};

const MODES = {
  plancher: 'Plancher (vers −∞)',
  plafond: 'Plafond (vers +∞)',
  troncature: 'Troncature (vers zéro)',
  'demi-haut': 'Demi vers le haut (+∞, comme Math.round)',
  'demi-pair': 'Demi au pair (banquier, IEEE 754)',
};
const MODE_ORDER = ['plancher', 'plafond', 'troncature', 'demi-haut', 'demi-pair'];

const VUES = {
  axe: 'Axe des valeurs et case d’arrondi',
  dms: 'Degrés décimaux ↔ degrés-minutes-secondes',
  flottant: 'Piège de la virgule flottante',
};
const VUE_ORDER = ['axe', 'dms', 'flottant'];

const TABLE_VALEURS = [2.5, 3.5, -2.5, -3.5, 4.5];
const VALEUR_MIN = -90;
const VALEUR_MAX = 90;
const DEC_MIN = 0;
const DEC_MAX = 6;
const VALEUR_DEF = 48.8566;
const LATITUDE_REF = 48.8566;
const LONGITUDE_REF = 2.3522;
const EPS = 1e-9;

/* État de module : survit au remplacement du DOM par la coque V2. */
const S = {
  valeur: VALEUR_DEF,
  dec: 2,
  mode: 'demi-pair',
  vue: 'axe',
  playing: false,
  reveal: 0,
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

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function nearly(a, b) {
  return Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b));
}

function fmtInt(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

/* E088-03 : une seule règle, une seule formule q = arrondi(x·10^d)/10^d.
 * La tolérance relative neutralise les erreurs de représentation binaire sur
 * les cas limites (demi exact), sans jamais introduire d'aléa. */
function arrondi(x, decimals, mode) {
  if (!isFinite(x)) return x;
  const f = Math.pow(10, decimals);
  const y = x * f;
  const fl = Math.floor(y);
  const frac = y - fl;
  let q;
  switch (mode) {
    case 'plancher':
      q = nearly(frac, 1) ? fl + 1 : fl;
      break;
    case 'plafond':
      q = nearly(frac, 0) ? fl : fl + 1;
      break;
    case 'troncature': {
      const signe = x < 0 ? -1 : 1;
      const ay = Math.abs(y);
      const afl = Math.floor(ay);
      const afr = ay - afl;
      const aq = nearly(afr, 1) ? afl + 1 : afl;
      q = signe * aq;
      break;
    }
    case 'demi-haut':
      q = (frac > 0.5 || nearly(frac, 0.5)) ? fl + 1 : fl;
      break;
    case 'demi-pair':
      if (nearly(frac, 0.5)) q = (Math.abs(fl % 2) === 0) ? fl : fl + 1;
      else if (nearly(frac, 0)) q = fl;
      else if (nearly(frac, 1)) q = fl + 1;
      else q = frac > 0.5 ? fl + 1 : fl;
      break;
    default:
      q = fl;
  }
  return q / f;
}

/* E088-04 : arrondi à un nombre de chiffres significatifs, pas à un nombre
 * de décimales fixes. L'exposant décimal décale la virgule avant l'arrondi. */
function chiffresSignificatifs(x, n) {
  if (x === 0 || !isFinite(x)) return x;
  const e = Math.floor(Math.log10(Math.abs(x)));
  return arrondi(x, n - 1 - e, 'demi-pair');
}

/* E088-04 : notation française — virgule décimale, espace fine insécable
 * (U+202F) comme séparateur de milliers, signe moins typographique (U+2212). */
function fmtFixe(x, decimals) {
  if (!isFinite(x)) return String(x);
  const neg = x < 0;
  const f = Math.pow(10, decimals);
  const q = arrondi(Math.abs(x), decimals, 'demi-pair');
  const scaled = Math.round(q * f);
  let s = String(scaled);
  if (decimals > 0) {
    if (s.length <= decimals) s = '0'.repeat(decimals - s.length + 1) + s;
    s = s.slice(0, -decimals).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')
      + ',' + s.slice(-decimals);
  } else {
    s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  }
  return (neg ? '\u2212' : '') + s;
}

/* E088-05 : conversion décimal ↔ degrés/minutes/secondes, avec report des
 * retenues quand les secondes ou les minutes dépassent 60. */
function versDMS(degres) {
  const abs = Math.abs(degres);
  let d = Math.floor(abs);
  const minutesFloat = (abs - d) * 60;
  let m = Math.floor(minutesFloat);
  const secondesFloat = (minutesFloat - m) * 60;
  let s = arrondi(secondesFloat, 1, 'demi-pair');
  if (s >= 60 - 1e-9) { s -= 60; m += 1; }
  if (m >= 60) { m -= 60; d += 1; }
  return { hemi: degres < 0 ? 'S' : 'N', d, m, s };
}

function formatDMS(degres) {
  const x = versDMS(degres);
  return fmtInt(x.d) + '° ' + String(x.m).padStart(2, '0') + '′ '
    + fmtFixe(x.s, 1) + '″ ' + x.hemi;
}

function valeurArrondie() {
  return arrondi(S.valeur, S.dec, S.mode);
}

function ecartArrondi() {
  return Math.abs(S.valeur - valeurArrondie());
}

function referenceMathRound() {
  const f = Math.pow(10, S.dec);
  return Math.round(S.valeur * f) / f;
}

/* Valeurs du défi calculées une fois depuis la même formule. */
function ecartPour(dec) {
  return Math.abs(VALEUR_DEF - arrondi(VALEUR_DEF, dec, 'demi-pair'));
}
const DEFI_E0 = ecartPour(0);
const DEFI_E1 = ecartPour(1);
const DEFI_E2 = ecartPour(2);
const DEFI_E3 = ecartPour(3);
const DEFI_E4 = ecartPour(4);

const DEFI = {
  prediction: 'Pour une valeur fixe, ajouter une décimale ne peut jamais augmenter l’écart |x − q| : la maille d’arrondi 10⁻ᵈ se resserre autour de x.',
  reglage: 'Laissez la valeur à 48,8566 (latitude de Paris) et déplacez le curseur « Décimales conservées » de 0 à 4, en observant l’écart annoncé dans le bandeau et le tableau de mesures.',
  attendu: `L’écart décroît : ${fmtFixe(DEFI_E0, 4)} → ${fmtFixe(DEFI_E1, 4)} → ${fmtFixe(DEFI_E2, 4)} → ${fmtFixe(DEFI_E3, 4)} → ${fmtFixe(DEFI_E4, 4)}.`,
  falsification: `Si, en passant de d à d+1, l’écart augmente (par exemple après ${fmtFixe(DEFI_E2, 4)} vous lisez plus de ${fmtFixe(DEFI_E2, 4)}), l’affirmation est contredite : les arrondis ne sont pas emboîtés.`,
  debrief: 'À chaque décimale supplémentaire, l’intervalle d’arrondi est divisé par dix : la valeur arrondie ne peut que se rapprocher de x ou rester identique. Ajouter des décimales n’invente pas de précision, cela réduit seulement l’écart d’écriture.',
};
const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

/* ---------- Feuille de style unique, injectée une seule fois (E088-02) ---------- */

const CSS = `
.${CSS_ID}-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);
  font-size:11px;line-height:1.6;
}
.${CSS_ID}-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700;
}
.${CSS_ID}-panel h3{
  margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700;
}
.${CSS_ID}-panel p{margin:5px 0;max-width:74ch}
.${CSS_ID}-panel .${CSS_ID}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.${CSS_ID}-panel .${CSS_ID}-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
  font-variant-numeric:tabular-nums;
}
.${CSS_ID}-panel .${CSS_ID}-table caption{
  margin-bottom:4px;color:var(--muted,#a8a198);text-align:left;
}
.${CSS_ID}-panel .${CSS_ID}-table th,
.${CSS_ID}-panel .${CSS_ID}-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.${CSS_ID}-panel .${CSS_ID}-table thead th{color:var(--gold-bright,#f4d69e);font-weight:600}
.${CSS_ID}-panel .${CSS_ID}-table tbody th{color:var(--ink-soft,#d7d1c6);font-weight:600}
#${ID.mode},#${ID.vue}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${ID.mode} legend,#${ID.vue} legend{padding:0 4px;color:var(--gold,#e6b96f)}
.${CSS_ID}-panel .${CSS_ID}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;
  margin:0 8px 0 0;padding:2px 6px;cursor:pointer;
}
.${CSS_ID}-panel .${CSS_ID}-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
.${CSS_ID}-slider-row{margin:7px 0}
.${CSS_ID}-slider-row label{display:block;color:var(--ink-soft,#d7d1c6)}
.${CSS_ID}-valeur{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
.${CSS_ID}-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
#${ID.canvas}{
  display:block;width:100%;height:236px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.30);touch-action:manipulation;
}
.${CSS_ID}-panel .${CSS_ID}-legend{font-size:10px;color:var(--muted,#a8a198)}
.${CSS_ID}-panel .${CSS_ID}-defi{margin:6px 0;padding-left:18px;font-size:10px}
.${CSS_ID}-panel .${CSS_ID}-defi li{margin:3px 0}
.${CSS_ID}-panel .${CSS_ID}-defi strong{color:var(--gold,#e6b96f)}
#${ID.readout}{
  min-height:36px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${ID.readout} strong{color:var(--gold-bright,#f4d69e)}
.${CSS_ID}-panel .${CSS_ID}-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;
  padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation;
  transition:border-color .18s,background-color .18s,color .18s;
}
.${CSS_ID}-panel .${CSS_ID}-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.${CSS_ID}-panel :focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.${CSS_ID}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.${CSS_ID}-panel[data-geography-v2-e088-reduced="1"] .${CSS_ID}-btn{
  transition:none;
}
@media (prefers-reduced-motion:reduce){
  .${CSS_ID}-panel .${CSS_ID}-btn,
  .${CSS_ID}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  .${CSS_ID}-panel{font-size:10px;padding:9px}
  #${ID.canvas}{height:196px}
  .${CSS_ID}-panel .${CSS_ID}-choix{margin-right:4px}
}
@media (forced-colors:active){
  .${CSS_ID}-panel{border:1px solid CanvasText}
}
`;

/* ---------- E088-01 : contenu sémantique statique, lisible sans JS ---------- */

function staticFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  const faits = [
    'Arrondir une valeur, c’est la remplacer par une valeur voisine plus simple, choisie selon une règle explicite. La règle dite « au plus proche » retient le multiple de 10^d le plus proche, où d est le nombre de décimales conservées ; le résultat vaut q = arrondi(x · 10^d) ÷ 10^d.',
    'Un chiffre significatif compte à partir du premier chiffre non nul. Arrondir 48,8566 à quatre chiffres significatifs donne 48,86 ; arrondir à deux décimales donne le même résultat ici, mais les deux règles diffèrent dès que l’ordre de grandeur change.',
    'En français, la virgule sépare la partie entière de la partie décimale et une espace fine insécable sépare les groupes de trois chiffres : 1 234 567,89. Le signe moins typographique (−) et la virgule décimale ne sont pas des détails décoratifs : ils évitent les confusions de lecture.',
  ];
  faits.forEach((texte) => {
    wrap.appendChild(ctx.el('p', CSS_ID + '-fait', texte));
  });
  return wrap;
}

function staticRules(ctx) {
  const list = ctx.el('ol', '');
  list.id = ID.rules;
  [
    'On décale la virgule de x de d rangs en calculant x · 10^d, puis on arrondit à un entier selon la règle choisie avant de replacer la virgule.',
    'Une tolérance relative de 10⁻⁹ reconnaît les fractions presque nulles, presque égales à un ou presque égales à une demi-valeur : les erreurs binaires ne faussent pas un demi exact.',
    'Les cinq règles sont évaluées sur les mêmes valeurs demi-exactes ; le résultat de Math.round sert de repère explicite, jamais de vérité unique.',
    'La conversion en degrés-minutes-secondes reporte les retenues : 1° = 60′, 1′ = 60″, et les secondes sont arrondies à 0,1″ avant report.',
  ].forEach((texte) => {
    list.appendChild(ctx.el('li', '', texte));
  });
  return list;
}

/* E088-07 : tableau comparatif captioné des cinq règles. */
function staticTable(ctx) {
  const table = ctx.el('table', CSS_ID + '-table');
  table.id = ID.table;
  table.appendChild(ctx.el('caption', '',
    'Comparaison des cinq règles d’arrondi sur les mêmes valeurs (zéro décimale) ; la dernière colonne donne la référence Math.round.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Valeur', 'Plancher', 'Troncature', 'Demi-haut', 'Demi-pair', 'Math.round (réf.)'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  TABLE_VALEURS.forEach((v) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = fmtFixe(v, 1);
    tr.appendChild(th);
    const colonnes = [
      arrondi(v, 0, 'plancher'),
      arrondi(v, 0, 'troncature'),
      arrondi(v, 0, 'demi-haut'),
      arrondi(v, 0, 'demi-pair'),
      Math.round(v),
    ];
    colonnes.forEach((c) => {
      const td = document.createElement('td');
      td.textContent = fmtInt(c);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* E088-08 : tableau de mesures, valeurs recalculées à chaque réglage. */
const MEASURE_ROWS = [
  ['q', 'Valeur arrondie q (règle active)', 'arrondi(x·10^d)/10^d'],
  ['ecart', 'Écart |x − q|', '|valeur − arrondi|'],
  ['maille', 'Maille d’arrondi 10⁻ᵈ', '1 ÷ 10^d'],
  ['sig', 'Chiffres significatifs (4)', 'n − 1 − floor(log10|x|)'],
  ['dms', 'Coordonnée en DMS', '1° = 60′, 1′ = 60″'],
  ['ref', 'Référence Math.round', 'identique ou différent'],
];

function buildMeasuresTable(ctx) {
  const table = ctx.el('table', CSS_ID + '-table');
  table.id = ID.measures;
  table.appendChild(ctx.el('caption', '',
    'Mesures recalculées depuis la valeur, la précision et la règle courantes. Référence explicite : Math.round à la même précision.'));

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
  const c = S.cells;
  const q = valeurArrondie();
  const ref = referenceMathRound();
  if (c.q) c.q.textContent = fmtFixe(q, S.dec);
  if (c.ecart) c.ecart.textContent = fmtFixe(ecartArrondi(), Math.min(8, S.dec + 3));
  if (c.maille) c.maille.textContent = fmtFixe(Math.pow(10, -S.dec), Math.min(8, S.dec + 1));
  if (c.sig) c.sig.textContent = fmtFixe(chiffresSignificatifs(S.valeur, 4), 4);
  if (c.dms) c.dms.textContent = formatDMS(S.valeur);
  if (c.ref) c.ref.textContent = nearly(q, ref) ? 'identique' : 'différent (' + fmtFixe(ref, S.dec) + ')';
}

/* E088-10 : défi falsifiable en cinq temps. */
function buildDefi(ctx) {
  const list = ctx.el('ol', CSS_ID + '-defi');
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

/* ---------- E088-08 : panneau et contrôles accessibles ---------- */

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function rangeRow(labelText, id, outId, min, max, step, value, aria) {
  const row = ctxElDiv();
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.appendChild(document.createTextNode(labelText + ' : '));
  const out = document.createElement('span');
  out.className = CSS_ID + '-valeur';
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

function ctxElDiv() {
  return document.createElement('div');
}

function buildPanel(ctx) {
  let panel = document.getElementById(ID.panel);
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    return {
      panel,
      fresh: false,
      modes: MODE_ORDER.map((m) => document.getElementById(ID.mode + '-' + m)),
      vues: VUE_ORDER.map((v) => document.getElementById(ID.vue + '-' + v)),
      valeur: document.getElementById(ID.valeur),
      valeurOut: document.getElementById(ID.valeurValue),
      dec: document.getElementById(ID.dec),
      decOut: document.getElementById(ID.decValue),
      canvas: document.getElementById(ID.canvas),
      legend: document.getElementById(ID.legend),
      readout: document.getElementById(ID.readout),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
    };
  }

  panel = ctx.el('section', CSS_ID + '-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);
  panel.setAttribute('data-geography-v2-e088-view', String(ctx.viewId || 'geographie'));

  const title = ctx.el('h2', '', 'Arrondi et formatage des valeurs numériques — laboratoire V2');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Ce laboratoire montre comment une valeur décimale se transforme en une écriture lisible : '
    + 'choisir une règle d’arrondi, fixer une précision, compter les chiffres significatifs, '
    + 'appliquer la notation française et convertir un angle décimal en degrés, minutes et secondes. '
    + 'Les grandeurs sont écrites en toutes lettres dans le bandeau et le tableau : le dessin ne fait qu’illustrer le calcul.');

  const formule = ctx.el('p', CSS_ID + '-fait',
    'Règle fondamentale : q = arrondi(x × 10^d) ÷ 10^d, avec d le nombre de décimales demandé. La valeur x est multipliée par 10^d pour décaler la virgule, arrondie à un entier selon la règle choisie, puis divisée par 10^d pour replacer la virgule.');

  const dmsRef = ctx.el('p', CSS_ID + '-fait',
    'Référence géographique : Paris est à ' + fmtFixe(LATITUDE_REF, 4) + '° de latitude et '
    + fmtFixe(LONGITUDE_REF, 4) + '° de longitude, soit ' + formatDMS(LATITUDE_REF)
    + ' en latitude et 2° 21′ 7,9″ E en longitude. La conversion est purement arithmétique.');

  /* E088-04 : deux choix exclusifs → fieldset/radiogroup, jamais aria-pressed. */
  const modeSet = document.createElement('fieldset');
  modeSet.id = ID.mode;
  modeSet.appendChild(ctx.el('legend', '', 'Règle d’arrondi (choix unique)'));
  MODE_ORDER.forEach((value) => {
    const lab = ctx.el('label', CSS_ID + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e088-mode';
    radio.id = ID.mode + '-' + value;
    radio.value = value;
    radio.checked = S.mode === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(MODES[value]));
    modeSet.appendChild(lab);
  });

  const vueSet = document.createElement('fieldset');
  vueSet.id = ID.vue;
  vueSet.appendChild(ctx.el('legend', '', 'Vue du laboratoire (choix unique)'));
  VUE_ORDER.forEach((value) => {
    const lab = ctx.el('label', CSS_ID + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e088-vue';
    radio.id = ID.vue + '-' + value;
    radio.value = value;
    radio.checked = S.vue === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(VUES[value]));
    vueSet.appendChild(lab);
  });

  const valeur = rangeRow('Valeur (latitude décimale)', ID.valeur, ID.valeurValue,
    VALEUR_MIN, VALEUR_MAX, 0.0001, S.valeur,
    'Valeur numérique entre −90 et 90 degrés, par pas de 0,0001');
  valeur.row.className = CSS_ID + '-slider-row';
  const dec = rangeRow('Décimales conservées (d)', ID.dec, ID.decValue,
    DEC_MIN, DEC_MAX, 1, S.dec,
    'Nombre de décimales conservées, de 0 à 6');
  dec.row.className = CSS_ID + '-slider-row';

  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire d’arrondi. Flèches gauche et droite : changer de vue ; flèches haut et bas : changer le nombre de décimales ; Page précédente et Page suivante : faire varier la valeur d’un degré ; M : changer de règle ; Entrée : réénoncer le bandeau ; Origine : revenir aux réglages par défaut ; Espace : animer la précision.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : les flèches gauche et droite parcourent les trois vues, '
    + 'les flèches haut et bas règlent la précision, Page précédente et Page suivante ajustent la '
    + 'valeur, la touche M parcourt les cinq règles, Origine restaure les réglages par défaut, '
    + 'Entrée réénonce le bandeau et Espace lance ou arrête l’animation.');
  canvasDesc.id = ID.canvasDesc;

  const legend = ctx.el('p', CSS_ID + '-legend', '');
  legend.id = ID.legend;

  const measuresTitle = ctx.el('h3', '', 'Mesures vérifiables de l’arrondi');
  measuresTitle.id = ID.measuresTitle;
  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');
  defiTitle.id = ID.defiTitle;

  const readout = ctx.el('p', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.textContent = 'Les grandeurs sont calculées par des formules déterministes, jamais par la couleur du dessin.';

  /* Boutons ≥ 36 px (ici 44 px) ; aria-pressed réservé à la bascule d'animation. */
  const play = ctx.el('button', CSS_ID + '-btn', '▶ Animer la précision');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  const reset = ctx.el('button', CSS_ID + '-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const note = ctx.el('p', '',
    'Ce laboratoire est un schéma arithmétique déterministe : aucune donnée géographique mesurée '
    + 'n’est chargée, aucun tirage aléatoire n’intervient et la latitude de Paris sert uniquement '
    + 'de référence explicite. La carte d’origine reste utilisable sans ce panneau.');
  note.id = ID.note;

  const rulesTitle = ctx.el('h3', '', 'Règles de calcul du laboratoire');
  rulesTitle.id = ID.rulesTitle;

  panel.append(title, lead, staticFacts(ctx), formule, dmsRef, rulesTitle, staticRules(ctx),
    modeSet, vueSet, valeur.row, dec.row, canvas, canvasDesc, legend,
    measuresTitle, buildMeasuresTable(ctx), staticTable(ctx), defiTitle, buildDefi(ctx),
    readout, play, reset, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    fresh: true,
    modes: MODE_ORDER.map((m) => document.getElementById(ID.mode + '-' + m)),
    vues: VUE_ORDER.map((v) => document.getElementById(ID.vue + '-' + v)),
    valeur: valeur.input, valeurOut: valeur.out,
    dec: dec.input, decOut: dec.out,
    canvas, legend, readout, play, reset,
  };
}

/* ---------- E088-09 : badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', CSS_ID + '-badge',
    'Valeurs numériques : q = arrondi(x·10^d)/10^d, cinq règles comparées à Math.round, chiffres significatifs, notation française (virgule et espace fine) et conversion décimal ↔ DMS.');
  badge.id = ID.badge;
  map.appendChild(badge);
}

/* ---------- E088-07 : rendu du laboratoire (un seul canvas) ---------- */

function drawAxe(g, pad, iw, ih, cssH) {
  const pas = Math.pow(10, -S.dec);
  const milieu = pad + iw / 2;
  const echelle = iw / (8 * pas);
  const X = (v) => milieu + (v - S.valeur) * echelle;
  const yAxe = pad + ih * 0.52;

  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(pad, yAxe); g.lineTo(pad + iw, yAxe);
  g.stroke();

  /* Les repères sont gradués par des traits : la forme suffit, sans couleur. */
  for (let k = -4; k <= 4; k += 1) {
    const xv = X(S.valeur + k * pas);
    g.strokeStyle = 'rgba(255,255,255,.25)';
    g.beginPath();
    g.moveTo(xv, yAxe - 5); g.lineTo(xv, yAxe + 5);
    g.stroke();
    g.fillStyle = 'rgba(214,207,193,.75)';
    g.font = '9px sans-serif';
    g.fillText(fmtFixe(S.valeur + k * pas, Math.min(6, S.dec + 1)), xv - 14, yAxe + 18);
  }

  const q = valeurArrondie();
  const largeurCase = Math.max(10, pas * echelle);
  g.fillStyle = 'rgba(230,185,111,.16)';
  g.fillRect(X(q) - largeurCase / 2, yAxe - 30, largeurCase, 60);
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 1.6;
  g.setLineDash([]);
  g.strokeRect(X(q) - largeurCase / 2, yAxe - 30, largeurCase, 60);

  /* Croix = valeur exacte ; triangle plein = valeur arrondie. */
  g.strokeStyle = 'rgba(255,255,255,.95)';
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(X(S.valeur) - 6, yAxe); g.lineTo(X(S.valeur) + 6, yAxe);
  g.moveTo(X(S.valeur), yAxe - 6); g.lineTo(X(S.valeur), yAxe + 6);
  g.stroke();

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.beginPath();
  g.moveTo(X(q), yAxe - 8); g.lineTo(X(q) - 6, yAxe - 18); g.lineTo(X(q) + 6, yAxe - 18);
  g.closePath(); g.fill();

  /* Trait balayeur purement visuel : phase issue du temps rAF, jamais aléatoire. */
  if (S.playing && !S.reduced) {
    const sx = pad + clamp(S.reveal, 0, 1) * iw;
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.lineWidth = 1;
    g.setLineDash([3, 4]);
    g.beginPath();
    g.moveTo(sx, yAxe - 34); g.lineTo(sx, yAxe + 34);
    g.stroke();
    g.setLineDash([]);
  }

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText('x = ' + fmtFixe(S.valeur, 6) + '   →   q = ' + fmtFixe(q, S.dec)
    + '   (' + MODES[S.mode] + ')', pad + 2, pad + 13);
  g.font = '10px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.fillText('Croix : valeur exacte. Triangle : valeur arrondie. Cadre : case de largeur 10^−' + S.dec + '.',
    pad + 2, cssH - pad - 4);
  g.fillText('Écart |x − q| = ' + fmtFixe(ecartArrondi(), Math.min(8, S.dec + 3)), pad + 2, cssH - pad - 18);
}

function drawDMS(g, pad, iw, ih, cssH) {
  const x = versDMS(S.valeur);
  const y = pad + ih * 0.30;
  const barH = 26;
  const tiers = iw / 3;
  const parts = [
    { label: 'Degrés', val: x.d, filled: 0.82, dash: [] },
    { label: 'Minutes', val: x.m, filled: 0.55, dash: [4, 3] },
    { label: 'Secondes', val: x.s, filled: 0.30, dash: [2, 3] },
  ];
  parts.forEach((p, i) => {
    const bx = pad + i * tiers + 4;
    const bw = tiers - 8;
    g.strokeStyle = 'rgba(244,214,158,.85)';
    g.lineWidth = 1.5;
    g.setLineDash(p.dash);
    g.strokeRect(bx, y, bw, barH);
    g.setLineDash([]);
    g.fillStyle = 'rgba(244,214,158,.30)';
    g.fillRect(bx + 2, y + barH - 7, (bw - 4) * p.filled, 5);
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '10px sans-serif';
    g.fillText(p.label + ' ' + fmtFixe(p.val, p.label === 'Secondes' ? 1 : 0),
      bx + 2, y + barH + 14);
  });

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText('Décimal : ' + fmtFixe(S.valeur, 6) + '°', pad + 2, pad + 13);
  g.fillText('Sexagésimal : ' + formatDMS(S.valeur), pad + 2, pad + 30);
  g.font = '10px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.fillText('Règle : 1° = 60′, 1′ = 60″. Les secondes sont arrondies à 0,1″ puis les retenues sont reportées.',
    pad + 2, cssH - pad - 4);
  g.fillText('Référence : ' + formatDMS(LATITUDE_REF) + ' pour Paris.', pad + 2, cssH - pad - 18);
}

function drawFlottant(g, pad, iw, ih, cssH) {
  const brut = String(0.1 + 0.2);
  const y1 = pad + ih * 0.28;
  const y2 = pad + ih * 0.52;

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '12px sans-serif';
  g.fillText('0,1 + 0,2 (brut) = ' + brut, pad + 2, y1);
  g.fillText('arrondi à 1 décimale = ' + fmtFixe(0.1 + 0.2, 1), pad + 2, y2);

  const X = (v) => pad + (v - 0.29) / 0.02 * iw;
  const yAxe = pad + ih * 0.78;
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(pad, yAxe); g.lineTo(pad + iw, yAxe);
  g.stroke();

  g.strokeStyle = 'rgba(255,255,255,.95)';
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(X(0.1 + 0.2), yAxe - 12); g.lineTo(X(0.1 + 0.2), yAxe + 12);
  g.stroke();
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.beginPath();
  g.moveTo(X(0.3), yAxe - 8); g.lineTo(X(0.3) - 6, yAxe + 8); g.lineTo(X(0.3) + 6, yAxe + 8);
  g.closePath(); g.fill();

  g.font = '10px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.fillText('Trait vertical : résultat binaire exact. Triangle : cible décimale 0,3.', pad + 2, cssH - pad - 4);
  g.fillText('Une tolérance relative (EPS = 1e−9) reconnaît les demi-exacts sans inventer de chiffre.', pad + 2, cssH - pad - 18);
}

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 236;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 24;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);

  if (S.vue === 'dms') drawDMS(g, pad, iw, ih, cssH);
  else if (S.vue === 'flottant') drawFlottant(g, pad, iw, ih, cssH);
  else drawAxe(g, pad, iw, ih, cssH);
}

/* ---------- E088-08 : grandeurs chiffrées et statut textuel ---------- */

function updateReadout() {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const q = valeurArrondie();
  const ecart = ecartArrondi();
  const ref = referenceMathRound();
  const sig = chiffresSignificatifs(S.valeur, 4);
  const identique = nearly(q, ref);

  const strong = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  const add = (texte) => n.appendChild(document.createTextNode(texte));

  add('Valeur ');
  n.appendChild(strong(fmtFixe(S.valeur, 6)));
  add(' · règle ' + MODES[S.mode] + ' · ');
  n.appendChild(strong(String(S.dec) + ' décimale(s)'));
  add(' → arrondi ');
  n.appendChild(strong(fmtFixe(q, S.dec)));
  add('. Écart |x − q| = ');
  n.appendChild(strong(fmtFixe(ecart, Math.min(8, S.dec + 3))));
  add('. Chiffres significatifs (4) : ');
  n.appendChild(strong(fmtFixe(sig, 4)));
  add('. Coordonnée : ');
  n.appendChild(strong(formatDMS(S.valeur)));
  add('. Référence Math.round à ' + String(S.dec) + ' décimale(s) : ');
  n.appendChild(strong(identique ? 'identique' : 'différent'));
  add(' (' + fmtFixe(ref, S.dec) + ').');
}

function updateLegend() {
  const n = S.nodes && S.nodes.legend;
  if (!n) return;
  if (S.vue === 'axe') {
    n.textContent = 'Croix blanche : valeur exacte. Triangle doré : valeur arrondie. Cadre plein : case de largeur 10^−d. Les traits gradués matérialisent les multiples consécutifs : la forme suffit, sans couleur.';
  } else if (S.vue === 'dms') {
    n.textContent = 'Trois segments : degrés (trait plein), minutes (tirets longs), secondes (tirets courts). La décomposition est affichée en texte à côté du schéma.';
  } else {
    n.textContent = 'Trait vertical : résultat binaire de 0,1 + 0,2. Triangle : cible décimale 0,3. L’arrondi à une décimale ramène 0,30000000000000004 à 0,3.';
  }
}

/* ---------- Application de l'état ---------- */

function applyState() {
  const n = S.nodes;
  if (!n || !n.valeur) return;
  n.modes.forEach((radio, i) => { if (radio) radio.checked = MODE_ORDER[i] === S.mode; });
  n.vues.forEach((radio, i) => { if (radio) radio.checked = VUE_ORDER[i] === S.vue; });
  if (n.valeur) n.valeur.value = String(S.valeur);
  if (n.dec) n.dec.value = String(S.dec);
  if (n.valeurOut) n.valeurOut.textContent = fmtFixe(S.valeur, 6) + '°';
  if (n.decOut) n.decOut.textContent = String(S.dec);
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer la précision';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E088Reduced = S.reduced ? '1' : '0';
  updateLegend();
  fillMeasuresTable();
  updateReadout();
  drawLab();
}

function resetState() {
  S.valeur = VALEUR_DEF;
  S.dec = 2;
  S.mode = 'demi-pair';
  S.vue = 'axe';
  S.playing = false;
  S.reveal = 0;
  stopLoop();
  applyState();
}

/* ---------- E088-10 : boucle rAF unique, pauses multiples ---------- */

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
    /* Phase purement temporelle, plafonnée, jamais tirée au hasard. */
    S.reveal = (S.reveal + dt * 0.00045) % 1;
  }
  S.lastTs = ts;
  /* Un seul canvas dessiné par frame ; le bandeau aria-live reste stable. */
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
        if (S.reduced) { S.playing = false; stopLoop(); }
        applyState();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }
}

/* ---------- E088-08 : câblage des contrôles (une seule fois) ---------- */

function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  n.modes.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      S.mode = radio.value;
      applyState();
    });
  });
  n.vues.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      S.vue = radio.value;
      applyState();
    });
  });
  n.valeur.addEventListener('input', () => {
    S.valeur = clamp(Number(n.valeur.value), VALEUR_MIN, VALEUR_MAX);
    applyState();
  });
  n.dec.addEventListener('input', () => {
    S.dec = clamp(Math.round(Number(n.dec.value)), DEC_MIN, DEC_MAX);
    applyState();
  });
  n.play.addEventListener('click', () => {
    if (S.reduced) {
      S.playing = false;
      stopLoop();
      applyState();
      return;
    }
    S.playing = !S.playing;
    if (!S.playing) stopLoop(); else startLoop();
    applyState();
  });
  n.reset.addEventListener('click', () => {
    resetState();
  });

  n.canvas.addEventListener('keydown', (event) => {
    let used = true;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const i = VUE_ORDER.indexOf(S.vue);
      S.vue = VUE_ORDER[(i + step + VUE_ORDER.length) % VUE_ORDER.length];
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      S.dec = clamp(S.dec + (event.key === 'ArrowUp' ? 1 : -1), DEC_MIN, DEC_MAX);
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const step = event.key === 'PageUp' ? 1 : -1;
      S.valeur = clamp(S.valeur + step, VALEUR_MIN, VALEUR_MAX);
    } else if (event.key === '+' || event.key === '=') {
      S.dec = clamp(S.dec + 1, DEC_MIN, DEC_MAX);
    } else if (event.key === '-' || event.key === '−') {
      S.dec = clamp(S.dec - 1, DEC_MIN, DEC_MAX);
    } else if (event.key === 'm' || event.key === 'M') {
      const i = MODE_ORDER.indexOf(S.mode);
      S.mode = MODE_ORDER[(i + 1 + MODE_ORDER.length) % MODE_ORDER.length];
    } else if (event.key === 'Home') {
      resetState();
      return;
    } else if (event.key === 'End') {
      S.valeur = VALEUR_MAX;
    } else if (event.key === 'Enter') {
      updateReadout();
    } else if (event.key === ' ' || event.key === 'Spacebar') {
      if (S.reduced) {
        S.playing = false;
        stopLoop();
      } else {
        S.playing = !S.playing;
        if (!S.playing) stopLoop(); else startLoop();
      }
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

register('E088', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E088-02 : une seule feuille de style, injectée une seule fois. */
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
