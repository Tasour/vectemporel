import { register } from './registry.js';

/* Lentille E088 — vue GEOGRAPHIE.
 * Thème : arrondi et formatage des valeurs numériques.
 *
 * Les dix chantiers E088-01 … E088-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E088.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le savoir est du texte sémantique réel (titres, paragraphes,
 * tableau captioné, légendes) présent dans le DOM ; le canvas n'est qu'un
 * laboratoire qui illustre des règles d'arrondi déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e088';
const PANEL_ID = 'geography-e088-panel';
const TITLE_ID = 'geography-e088-title';
const MODE_ID = 'geography-e088-mode';
const VUE_ID = 'geography-e088-vue';
const VALEUR_ID = 'geography-e088-valeur';
const VALEUR_OUT_ID = 'geography-e088-valeur-value';
const DEC_ID = 'geography-e088-decimales';
const DEC_OUT_ID = 'geography-e088-decimales-value';
const CANVAS_ID = 'geography-e088-canvas';
const READOUT_ID = 'geography-e088-readout';
const LEGEND_ID = 'geography-e088-legend';
const TABLE_ID = 'geography-e088-table';
const HELP_ID = 'geography-e088-help';
const PLAY_ID = 'geography-e088-play';
const BADGE_ID = 'geography-e088-badge';

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

/* Valeurs du tableau comparatif : toutes choisies, aucune tirée au hasard. */
const TABLE_VALEURS = [2.5, 3.5, -2.5, -3.5, 4.5];
const VALEUR_MIN = -90;
const VALEUR_MAX = 90;
const DEC_MIN = 0;
const DEC_MAX = 6;
const VALEUR_DEF = 48.8566;
const LATITUDE_REF = 48.8566; // latitude décimale de Paris, donnée de référence
const LONGITUDE_REF = 2.3522; // longitude décimale de Paris, donnée de référence

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  valeur: VALEUR_DEF,
  dec: 2,
  mode: 'demi-pair',
  vue: 'axe',
  playing: false,
  sweep: 2,
  inView: true,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  observer: null,
  nodes: {},
};

/* ---------- Règles d'arrondi déterministes (E088-03 … E088-06) ---------- */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

const EPS = 1e-9;
function nearly(a, b) {
  return Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b));
}
function fmtInt(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

/* E088-03, E088-04 : une règle, une seule formule q = arrondi(x·10^d)/10^d.
 * La tolérance relative `nearly` neutralise les erreurs de représentation
 * binaire sur les cas limites (demi exact), sans jamais introduire d'aléa. */
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

/* E088-05 : arrondi à un nombre de chiffres significatifs (pas à un nombre
 * de décimales fixes). L'exposant décimal décale la virgule avant l'arrondi. */
function chiffresSignificatifs(x, n) {
  if (x === 0 || !isFinite(x)) return x;
  const e = Math.floor(Math.log10(Math.abs(x)));
  return arrondi(x, n - 1 - e, 'demi-pair');
}

/* E088-06 : notation française — virgule décimale, espace fine insécable
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

/* E088-07 : conversion décimal ↔ degrés/minutes/secondes, avec report des
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

/* Valeur arrondie active et écart à la valeur exacte (grandures chiffrées). */
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

/* ---------- Feuille de style unique (E088-02) ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .geography-e088-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PANEL_ID} code{font-size:10px;color:var(--gold-bright,#f4d69e)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:right;vertical-align:top}
#${TABLE_ID} th:first-child,#${TABLE_ID} td:first-child{text-align:left}
#${TABLE_ID} thead th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${TABLE_ID} tbody th{color:var(--ink);font-weight:600}
#${MODE_ID},#${VUE_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${MODE_ID} legend,#${VUE_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .geography-e088-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .geography-e088-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} .geography-e088-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${VALEUR_ID},#${DEC_ID}{display:block}
#${CANVAS_ID}{
  display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:38px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
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
#${PANEL_ID} .geography-e088-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
}
.geography-e088-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[data-geography-e088-reduced="1"] button,
#${PANEL_ID}[data-geography-e088-reduced="1"] .geography-e088-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.geography-e088-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:210px}
  #${PANEL_ID} .geography-e088-choix{margin-right:4px}
}
`;

/* ---------- Contenu sémantique, lisible sans le laboratoire (E088-01, E088-09) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Arrondir une valeur, c’est la remplacer par une valeur voisine plus simple, choisie selon une règle explicite. La règle dite « au plus proche » retient le multiple de 10^d le plus proche, où d est le nombre de décimales conservées ; le résultat vaut q = arrondi(x · 10^d) ÷ 10^d.',
    'Un chiffre significatif compte à partir du premier chiffre non nul. Arrondir 48,8566 à quatre chiffres significatifs donne 48,86 ; arrondir à deux décimales donne le même résultat ici, mais les deux règles diffèrent dès que l’ordre de grandeur change.',
    'En français, la virgule sépare la partie entière de la partie décimale et une espace fine insécable sépare les groupes de trois chiffres : 1 234 567,89. Le signe moins typographique (−) et la virgule décimale ne sont pas des détails décoratifs : ils évitent les confusions de lecture.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e088-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Comparaison des cinq règles d’arrondi sur les mêmes valeurs (zéro décimale) ; la dernière colonne donne la référence Math.round.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Valeur', 'Plancher', 'Troncature', 'Demi-haut', 'Demi-pair', 'Math.round (réf.)'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  TABLE_VALEURS.forEach((v) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
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

function rangeRow(labelText, id, outId, min, max, step, value, aria) {
  const row = document.createElement('div');
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.appendChild(document.createTextNode(labelText + ' : '));
  const out = document.createElement('span');
  out.className = 'geography-e088-valeur';
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
      radios: MODE_ORDER.map((m) => document.getElementById('geography-e088-mode-' + m)),
      vues: VUE_ORDER.map((v) => document.getElementById('geography-e088-vue-' + v)),
      valeur: document.getElementById(VALEUR_ID),
      valeurOut: document.getElementById(VALEUR_OUT_ID),
      dec: document.getElementById(DEC_ID),
      decOut: document.getElementById(DEC_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      legend: document.getElementById(LEGEND_ID),
      play: document.getElementById(PLAY_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e088-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Arrondi et formatage des valeurs numériques');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '',
    'Ce laboratoire montre comment une valeur décimale se transforme en une écriture lisible : choisir une règle d’arrondi, fixer une précision, compter les chiffres significatifs, appliquer la notation française et convertir un angle décimal en degrés, minutes et secondes.');

  const formule = ctx.el('p', 'geography-e088-fait',
    'Règle fondamentale (E088-03) : q = arrondi(x × 10^d) ÷ 10^d, avec d le nombre de décimales demandé. La valeur x est multipliée par 10^d pour décaler la virgule, arrondie à un entier selon la règle choisie, puis divisée par 10^d pour replacer la virgule.');

  const modeSet = document.createElement('fieldset');
  modeSet.id = MODE_ID;
  const modeLegend = document.createElement('legend');
  modeLegend.textContent = 'Règle d’arrondi (choix unique)';
  modeSet.appendChild(modeLegend);
  MODE_ORDER.forEach((value) => {
    const lab = ctx.el('label', 'geography-e088-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e088-mode';
    radio.id = 'geography-e088-mode-' + value;
    radio.value = value;
    radio.checked = S.mode === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(MODES[value]));
    modeSet.appendChild(lab);
  });

  const vueSet = document.createElement('fieldset');
  vueSet.id = VUE_ID;
  const vueLegend = document.createElement('legend');
  vueLegend.textContent = 'Vue du laboratoire (choix unique)';
  vueSet.appendChild(vueLegend);
  VUE_ORDER.forEach((value) => {
    const lab = ctx.el('label', 'geography-e088-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e088-vue';
    radio.id = 'geography-e088-vue-' + value;
    radio.value = value;
    radio.checked = S.vue === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(VUES[value]));
    vueSet.appendChild(lab);
  });

  const valeur = rangeRow('Valeur (latitude décimale)', VALEUR_ID, VALEUR_OUT_ID,
    VALEUR_MIN, VALEUR_MAX, 0.0001, S.valeur,
    'Valeur numérique entre −90 et 90 degrés, par pas de 0,0001');
  const dec = rangeRow('Décimales conservées (d)', DEC_ID, DEC_OUT_ID,
    DEC_MIN, DEC_MAX, 1, S.dec,
    'Nombre de décimales conservées, de 0 à 6');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire d’arrondi. Flèches gauche et droite : changer de vue ; flèches haut et bas : changer le nombre de décimales ; Page précédente et Page suivante : faire varier la valeur de un degré ; M : changer de règle d’arrondi ; Espace : lancer ou arrêter l’animation de la précision.');

  const legendText = ctx.el('p', 'geography-e088-legend', '');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e088-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const help = ctx.el('p', 'geography-e088-sr',
    'Commandes du laboratoire : boutons radio pour choisir la règle d’arrondi et la vue ; curseurs pour la valeur et le nombre de décimales ; flèches gauche et droite sur le graphique pour changer de vue, flèches haut et bas pour la précision, Page précédente et Page suivante pour la valeur, touche M pour la règle, Espace pour l’animation.');
  help.id = HELP_ID;
  panel.setAttribute('aria-describedby', help.id);

  const play = ctx.el('button', '', '▶ Animer la précision');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', 'false');
  play.setAttribute('aria-controls', CANVAS_ID);

  const dmsRef = ctx.el('p', 'geography-e088-fait',
    'Référence géographique : Paris est à ' + fmtFixe(LATITUDE_REF, 4) + '° de latitude et '
    + fmtFixe(LONGITUDE_REF, 4) + '° de longitude, soit ' + formatDMS(LATITUDE_REF)
    + ' en latitude et 2° 21′ 7,9″ E en longitude. La conversion est purement arithmétique : 1° = 60′, 1′ = 60″.');

  panel.append(title, lead, staticFacts(), formule, dmsRef, modeSet, vueSet,
    valeur.row, dec.row, canvas, legendText, readout, staticTable(), help, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: MODE_ORDER.map((m) => document.getElementById('geography-e088-mode-' + m)),
    vues: VUE_ORDER.map((v) => document.getElementById('geography-e088-vue-' + v)),
    valeur: valeur.input, valeurOut: valeur.out,
    dec: dec.input, decOut: dec.out,
    canvas, readout, legend: legendText, play,
  };
}

/* ---------- Rendu du laboratoire (E088-05, E088-07, E088-08) ---------- */

function drawAxe(g, pad, iw, ih, cssH) {
  /* E088-03/04 : axe centré sur la valeur ; la case_clair montre l'intervalle
   * d'arrondi de largeur 10^-d. Forme et tirets distinguent les repères. */
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
  /* E088-07 : décomposition d'un angle décimal en trois segments égaux. */
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
  /* E088-08 : la somme 0,1 + 0,2 n'est pas exactement 0,3 en binaire. */
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
  g.fillText('Une tolérance relative (EPS = 1e−9) permet de reconnaître les demi-exacts sans inventer de chiffre.', pad + 2, cssH - pad - 18);
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 250;
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

/* ---------- Lecture chiffrée (E088-04, E088-05, E088-06, E088-07) ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const q = valeurArrondie();
  const ecart = ecartArrondi();
  const ref = referenceMathRound();
  const sig = chiffresSignificatifs(S.valeur, 4);
  const identique = nearly(q, ref);

  n.textContent = '';
  const strong = (t) => { const s = document.createElement('strong'); s.textContent = t; return s; };
  const add = (t) => n.appendChild(document.createTextNode(t));

  add('Valeur ');
  n.appendChild(strong(fmtFixe(S.valeur, 6)));
  add(' · règle ' + MODES[S.mode] + ' · ');
  n.appendChild(strong(String(S.dec) + ' décimale(s)'));
  add(' → arrondi ');
  n.appendChild(strong(fmtFixe(q, S.dec)));
  add('. Écart |x − q| = ');
  n.appendChild(strong(fmtFixe(ecart, Math.min(8, S.dec + 3))));
  add('. Chiffres significatifs (4) : ');
  n.appendChild(strong(fmtFixe(sig, S.dec)));
  add('. Coordonnée : ');
  n.appendChild(strong(formatDMS(S.valeur)));
  add('. Référence Math.round à ' + String(S.dec) + ' décimale(s) : ');
  n.appendChild(strong(identique ? 'identique' : 'différent'));
  add(' (' + fmtFixe(ref, S.dec) + ').');
}

function updateLegend() {
  const n = S.nodes.legend;
  if (!n) return;
  if (S.vue === 'axe') {
    n.textContent = 'Croix blanche : valeur exacte. Triangle doré : valeur arrondie. Cadre plein : case de largeur 10^−d. Les traits verticals gradués matérialisent les multiples consécutifs : la forme suffit, sans couleur.';
  } else if (S.vue === 'dms') {
    n.textContent = 'Trois segments : degrés (trait plein), minutes (tirets longs), secondes (tirets courts). La décomposition est affichée en texte à côté du schéma.';
  } else {
    n.textContent = 'Trait vertical : résultat binaire de 0,1 + 0,2. Triangle : cible décimale 0,3. L’arrondi à une décimale ramène 0,30000000000000004 à 0,3.';
  }
}

function syncControls() {
  const n = S.nodes;
  n.radios.forEach((radio, i) => { if (radio) radio.checked = MODE_ORDER[i] === S.mode; });
  n.vues.forEach((radio, i) => { if (radio) radio.checked = VUE_ORDER[i] === S.vue; });
  if (n.valeur) n.valeur.value = String(S.valeur);
  if (n.valeurOut) n.valeurOut.textContent = fmtFixe(S.valeur, 6) + '°';
  if (n.dec) n.dec.value = String(S.dec);
  if (n.decOut) n.decOut.textContent = String(S.dec);
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer la précision';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateLegend();
  updateReadout();
  drawLab();
}

/* ---------- E088-10 : boucle rAF unique, pause sur document.hidden ---------- */

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
    if (!reduced) {
      S.sweep = (S.sweep + dt * 0.00045) % (DEC_MAX + 1);
      S.dec = Math.floor(S.sweep);
    }
  }
  S.lastTs = ts;
  syncControls();
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
        if (panel) panel.dataset.geographyE088Reduced = mq.matches ? '1' : '0';
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

/* Rappel du cadre numérique, posé sur la carte sans toucher à la donnée. */
function addMapBadge() {
  const scope = ctxLayout || ctxStage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = document.createElement('div');
  badge.className = 'geography-e088-badge';
  badge.id = BADGE_ID;
  badge.textContent = 'Valeurs numériques : arrondi q = arrondi(x·10^d)/10^d, cinq règles comparées, chiffres significatifs, notation française (virgule et espace fine) et conversion décimal ↔ DMS.';
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E088', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctxStage = ctx.stage;
  ctxLayout = ctx.layout || ctx.stage;
  ctxReducedMotion = typeof ctx.reducedMotion === 'function' ? () => !!ctx.reducedMotion() : () => false;

  /* E088-02 : une seule feuille de style, injectée une seule fois. */
  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge();

  const reduced = ctxReducedMotion();
  S.nodes.panel.dataset.geographyE088Reduced = reduced ? '1' : '0';
  if (reduced) {
    S.playing = false;
    S.dec = Math.floor(S.sweep);
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
    n.vues.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.vue = radio.value;
        syncControls();
      });
    });
    n.valeur.addEventListener('input', () => {
      S.valeur = clamp(Number(n.valeur.value), VALEUR_MIN, VALEUR_MAX);
      syncControls();
    });
    n.dec.addEventListener('input', () => {
      S.dec = clamp(Math.round(Number(n.dec.value)), DEC_MIN, DEC_MAX);
      S.sweep = S.dec;
      syncControls();
    });
    n.play.addEventListener('click', () => {
      if (ctxReducedMotion()) {
        S.playing = false;
        stopLoop();
        S.dec = Math.floor(S.sweep);
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
        const i = VUE_ORDER.indexOf(S.vue);
        S.vue = VUE_ORDER[(i + step + VUE_ORDER.length) % VUE_ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 1 : -1;
        S.dec = clamp(S.dec + step, DEC_MIN, DEC_MAX);
        S.sweep = S.dec;
      } else if (event.key === 'PageUp' || event.key === 'PageDown') {
        const step = event.key === 'PageUp' ? 1 : -1;
        S.valeur = clamp(S.valeur + step, VALEUR_MIN, VALEUR_MAX);
      } else if (event.key === '+' || event.key === '=') {
        S.dec = clamp(S.dec + 1, DEC_MIN, DEC_MAX);
        S.sweep = S.dec;
      } else if (event.key === '-' || event.key === '−') {
        S.dec = clamp(S.dec - 1, DEC_MIN, DEC_MAX);
        S.sweep = S.dec;
      } else if (event.key === 'm' || event.key === 'M') {
        const i = MODE_ORDER.indexOf(S.mode);
        S.mode = MODE_ORDER[(i + 1 + MODE_ORDER.length) % MODE_ORDER.length];
      } else if (event.key === 'Home' || event.key === 'End') {
        S.valeur = event.key === 'Home' ? VALEUR_MIN : VALEUR_MAX;
      } else if (event.key === ' ' || event.key === 'Spacebar') {
        if (ctxReducedMotion()) {
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
        syncControls();
      }
    });
  }

  installGlobalListeners();
  if (S.playing) startLoop();
});
