import { register } from './registry.js';

/* Lentille E037 (V2) — vue GEOGRAPHIE.
 * Thème : cycle jour-nuit, déclinaison, équation du temps et heure solaire.
 *
 * Les dix chantiers E037-01 … E037-10 sont réellement implémentés ci-dessous :
 *  01 texte sémantique d'introduction   02 tableau de repères par formule
 *  03 lieu en radiogroupe               04 curseur de date → déclinaison/saison
 *  05 schéma canvas déterministe        06 grandeurs chiffrées / référence (readout)
 *  07 boucle rAF unique + pause         08 codes visuels non chromatiques
 *  09 longitude et heure solaire vraie  10 défi falsifiable / accessibilité
 *
 * Tout est local : aucun appel réseau, aucun tirage aléatoire (graine fixe 0xE037
 * et mulberry32), aucune journalisation. Le contenu
 * pédagogique est du texte sémantique inséré dans le DOM : il reste lisible et
 * indexable même sans animation ni interaction. Le canvas n'est qu'un
 * laboratoire dont chaque grandeur est aussi écrite en toutes lettres dans le
 * readout et dans le tableau statique.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e037- (identifiants, classes, attributs et CSS).
 */

const P = 'geography-v2-e037';
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const PLACE_ID = P + '-place';
const DATE_ID = P + '-date';
const DATE_OUT_ID = P + '-date-out';
const LON_ID = P + '-lon';
const LON_OUT_ID = P + '-lon-out';
const HOUR_ID = P + '-hour';
const HOUR_OUT_ID = P + '-hour-out';
const CANVAS_ID = P + '-canvas';
const READOUT_ID = P + '-readout';
const LEGEND_ID = P + '-legend';
const PLAY_ID = P + '-play';
const RESET_ID = P + '-reset';
const TABLE_ID = P + '-table';
const CHALLENGE_ID = P + '-challenge';
const APPLY_ID = P + '-apply';
const REVEAL_ID = P + '-reveal';
const DEBRIEF_ID = P + '-debrief';
const BADGE_ID = P + '-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

/* Constantes canoniques (formules, aucune donnée fabriquée). */
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const SEED = 0xE037;       /* graine fixe et affichée, zéro tirage aléatoire. */
const STEP_MS = 900;       /* pas de la rotation, unique source de temps : rAF. */
const AXIS_TILT = 23.45;   /* inclinaison maximale de l'axe (référence). */
const EOT_MAX = 16;        /* |équation du temps| ≤ 16 min (référence). */
const EQUATOR_HOURS = 12;  /* durée du jour à l'équateur (référence). */
const MIN_PER_DEG = 4;     /* 4 minutes par degré de longitude. */

/* Lieux de référence : latitude, longitude et fuseau servent aux formules. */
const PLACES = {
  equateur: { label: 'Équateur — 0°', phi: 0, lon: 0, tz: 0, aria: 'Équateur : latitude nulle, jour d’environ douze heures toute l’année.' },
  paris: { label: 'Paris — 48,9° N', phi: 48.86, lon: 2.35, tz: 1, aria: 'Paris : latitude 48,9 degrés nord, fuseau UTC+1.' },
  tromso: { label: 'Tromsø — 69,6° N', phi: 69.65, lon: 18.96, tz: 1, aria: 'Tromsø : latitude 69,6 degrés nord, au-delà du cercle polaire.' },
  pole: { label: 'Pôle Nord — 90° N', phi: 90, lon: 0, tz: 0, aria: 'Pôle Nord : latitude 90 degrés, jour ou nuit polaire selon la saison.' },
};
const ORDER = ['equateur', 'paris', 'tromso', 'pole'];

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const CUM_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  place: 'paris',
  latitude: 48.86,
  longitude: 2.35,
  tz: 1,
  day: 172,       /* 21 juin, solstice d'été (hémisphère nord). */
  legalQuarter: 48, /* heure légale en quarts d'heure : 48 → 12:00. */
  playing: false,
  angle: Math.PI, /* position de la pastille sur l'orbite (radian). */
  elapsed: 0,
  reduced: false,
  lastTs: 0,
  rafId: 0,
  visBound: false,
  motionBound: false,
  nodes: {},
};

/* ctx.reducedMotion() conservé hors du point d'entrée pour la boucle rAF. */
let ctxReduced = null;

/* ---------- Générateur déterministe (mulberry32, graine affichée) ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Formules astronomiques et formatage français ---------- */

/* Déclinaison solaire de Cooper (degrés) : N = jour de l'année. */
function declination(N) {
  return -AXIS_TILT * Math.cos((360 / 365) * (N + 10) * RAD);
}

/* Équation du temps (minutes) : écart entre temps solaire vrai et moyen. */
function equationOfTime(N) {
  const B = (360 / 365) * (N - 81) * RAD;
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

/* Durée du jour (heures) depuis φ et δ. Cas polaires explicites. */
function dayLength(phi, delta) {
  const arg = -Math.tan(phi * RAD) * Math.tan(delta * RAD);
  if (arg <= -1) return { hours: 24, polar: 'jour polaire' };
  if (arg >= 1) return { hours: 0, polar: 'nuit polaire' };
  const H0 = Math.acos(arg) * DEG; /* angle horaire au lever (degrés). */
  return { hours: (2 * H0) / 15, polar: null };
}

/* Heure solaire vraie (minutes) = heure légale + 4 min/° × écart de longitude
   + équation du temps. Le méridien de référence vaut 15° × fuseau. */
function solarMinutes() {
  const legal = S.legalQuarter / 4;
  return legal * 60 + MIN_PER_DEG * (S.longitude - 15 * S.tz) + equationOfTime(S.day);
}

function solarHours() {
  const m = ((solarMinutes() % 1440) + 1440) % 1440;
  return m / 60;
}

function dateLabel(N) {
  let m = 0;
  while (m < 12 && N > CUM_DAYS[m + 1]) m += 1;
  return (N - CUM_DAYS[m]) + ' ' + MONTHS[m];
}

function season(N) {
  if (N >= 80 && N < 172) return 'printemps';
  if (N >= 172 && N < 266) return 'été';
  if (N >= 266 && N < 355) return 'automne';
  return 'hiver';
}

function fmt(value, digits) {
  const d = digits === undefined ? 1 : digits;
  const text = Math.abs(value).toFixed(d).replace('.', ',');
  return (value < 0 ? '−' : '') + text;
}

function hhmm(decimalHours) {
  let minutes = Math.round(decimalHours * 60);
  if (minutes < 0) minutes += 1440;
  if (minutes >= 1440) minutes -= 1440;
  const h = Math.floor(minutes / 60);
  const m = minutes - h * 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

/* ---------- E037-01 : feuille de style unique, préfixée, sans réseau ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:72ch}
#${PANEL_ID} .${P}-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${PLACE_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${PLACE_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} input[type=range]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
  -webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;
}
#${PANEL_ID} input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${PANEL_ID} input[type=range]::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;width:24px;height:24px;margin-top:-9px;
  border:1px solid var(--gold-bright,#f4d69e);border-radius:50%;background:var(--gold,#e6b96f);
}
#${PANEL_ID} input[type=range]::-moz-range-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${PANEL_ID} input[type=range]::-moz-range-thumb{
  width:24px;height:24px;border:1px solid var(--gold-bright,#f4d69e);border-radius:50%;
  background:var(--gold,#e6b96f);
}
#${PANEL_ID} .${P}-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;height:260px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.3);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:56px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
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
#${PANEL_ID} button[aria-pressed=true]{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.16)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${CHALLENGE_ID}{margin-top:12px;border-top:1px solid var(--line);padding-top:6px}
#${CHALLENGE_ID} ol{margin:6px 0;padding-left:20px;font-size:10px;line-height:1.6;color:var(--muted)}
#${CHALLENGE_ID} li{margin:3px 0}
#${DEBRIEF_ID}{border-left:2px solid var(--gold,#e6b96f);padding-left:8px;color:var(--gold-bright,#f4d69e)}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,.${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:210px}
}
`;

/* ---------- E037-01 : faits sémantiques, lisibles sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Le jour et la nuit ne résultent pas d’un déplacement du Soleil autour de la Terre, mais de la rotation de la Terre sur elle-même en 24 heures. Un point ne voit l’astre que pendant la moitié de sa rotation : l’autre moitié est la nuit. Le terminateur est la ligne qui sépare les deux parties.',
    'La durée du jour dépend de la latitude φ et de la déclinaison δ : cos(H₀) = −tan φ · tan δ, puis durée = 2 H₀ / 15. La déclinaison suit δ = −23,45° × cos(360/365 × (N + 10)) ; aux solstices elle atteint ±23,45°, ce qui produit les jours les plus longs ou les plus courts.',
    'L’heure lue sur une montre (heure légale) diffère de l’heure solaire vraie pour deux raisons : la longitude (4 minutes par degré d’écart au méridien de référence 15° × fuseau) et l’équation du temps (écart saisonnier, |E| ≤ 16 minutes). À l’équateur, le jour dure 12 heures toute l’année : c’est la référence.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E037-02 : tableau de repères recalculé par formule ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Repères astronomiques recalculés par formule. Références : inclinaison maximale 23,45°, |équation du temps| ≤ 16 min, 12 h de jour à l’équateur. Durée calculée pour Paris (48,9° N).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Date', 'Jour N', 'Déclinaison δ', 'Équation du temps E', 'Durée du jour à Paris'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  [80, 172, 266, 355].forEach((N) => {
    const delta = declination(N);
    const eot = equationOfTime(N);
    const length = dayLength(PLACES.paris.phi, delta);
    const cells = [
      dateLabel(N),
      String(N),
      fmt(delta, 2) + '°',
      fmt(eot, 1) + ' min',
      length.polar ? length.polar : fmt(length.hours, 2) + ' h',
    ];
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

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: {
        equateur: document.getElementById(P + '-place-equateur'),
        paris: document.getElementById(P + '-place-paris'),
        tromso: document.getElementById(P + '-place-tromso'),
        pole: document.getElementById(P + '-place-pole'),
      },
      date: document.getElementById(DATE_ID),
      dateOut: document.getElementById(DATE_OUT_ID),
      lon: document.getElementById(LON_ID),
      lonOut: document.getElementById(LON_OUT_ID),
      hour: document.getElementById(HOUR_ID),
      hourOut: document.getElementById(HOUR_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      legend: document.getElementById(LEGEND_ID),
      play: document.getElementById(PLAY_ID),
      reset: document.getElementById(RESET_ID),
      apply: document.getElementById(APPLY_ID),
      reveal: document.getElementById(REVEAL_ID),
      debrief: document.getElementById(DEBRIEF_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Cycle jour-nuit et heure solaire');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Pourquoi la durée du jour et l’heure solaire varient-elles selon le lieu et la date ? Ce tableau de bord recalcule chaque grandeur depuis sa formule et la confronte à des repères explicites : 23,45° d’inclinaison, 4 minutes par degré de longitude, 12 heures de jour à l’équateur et |équation du temps| ≤ 16 minutes.');

  /* E037-03 : radiogroupe natif complété par un rôle explicite. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = PLACE_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Lieu observé (choix unique)');
  const legendField = document.createElement('legend');
  legendField.textContent = '1. Choisir le lieu observé (choix unique)';
  fieldset.appendChild(legendField);
  const radios = {};
  ORDER.forEach((key) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-place';
    radio.id = P + '-place-' + key;
    radio.value = key;
    radio.checked = S.place === key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(PLACES[key].label));
    fieldset.appendChild(lab);
    radios[key] = radio;
  });

  /* E037-04 : curseur de date → jour de l'année. */
  const dateRow = ctx.el('p', '');
  const dateLabelEl = document.createElement('label');
  dateLabelEl.setAttribute('for', DATE_ID);
  dateLabelEl.appendChild(document.createTextNode('2. Jour de l’année (saison) : '));
  const dateOut = document.createElement('span');
  dateOut.id = DATE_OUT_ID;
  dateOut.className = P + '-valeur';
  dateLabelEl.appendChild(dateOut);
  const date = document.createElement('input');
  date.type = 'range';
  date.id = DATE_ID;
  date.min = '1'; date.max = '365'; date.step = '1';
  date.value = String(S.day);
  date.setAttribute('aria-label', 'Jour de l’année, de 1 à 365');
  dateRow.appendChild(dateLabelEl);

  /* E037-09 : longitude et heure légale → heure solaire vraie. */
  const lonRow = ctx.el('p', '');
  const lonLabelEl = document.createElement('label');
  lonLabelEl.setAttribute('for', LON_ID);
  lonLabelEl.appendChild(document.createTextNode('3. Longitude (degrés Est) : '));
  const lonOut = document.createElement('span');
  lonOut.id = LON_OUT_ID;
  lonOut.className = P + '-valeur';
  lonLabelEl.appendChild(lonOut);
  const lon = document.createElement('input');
  lon.type = 'range';
  lon.id = LON_ID;
  lon.min = '-180'; lon.max = '180'; lon.step = '0.25';
  lon.value = String(S.longitude);
  lon.setAttribute('aria-label', 'Longitude en degrés Est, de −180 à 180');
  lonRow.append(lonLabelEl, lon);

  const hourRow = ctx.el('p', '');
  const hourLabelEl = document.createElement('label');
  hourLabelEl.setAttribute('for', HOUR_ID);
  hourLabelEl.appendChild(document.createTextNode('4. Heure légale : '));
  const hourOut = document.createElement('span');
  hourOut.id = HOUR_OUT_ID;
  hourOut.className = P + '-valeur';
  hourLabelEl.appendChild(hourOut);
  const hour = document.createElement('input');
  hour.type = 'range';
  hour.id = HOUR_ID;
  hour.min = '0'; hour.max = '95'; hour.step = '1';
  hour.value = String(S.legalQuarter);
  hour.setAttribute('aria-label', 'Heure légale en quarts d’heure, de 0 h à 23 h 45');
  hourRow.append(hourLabelEl, hour);

  /* E037-05 : canvas lab, focusable et doublé en texte. */
  const sub = ctx.el('h3', '', 'Observer le terminateur');
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Schéma du cycle jour-nuit : le Soleil à gauche éclaire la Terre ; la partie claire est le jour, la partie hachurée est la nuit ; une ligne de terminateur les sépare. Flèches gauche et droite : changer de lieu ; flèches haut et bas : changer de date.');

  /* E037-08 : légende sans couleur, glyphes + motifs + graine affichée. */
  const legendText = ctx.el('p', P + '-legend');
  legendText.id = LEGEND_ID;

  /* E037-06 : unique région live, annoncée poliment. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* E037-07 : commandes de la rotation (bascule indépendante → aria-pressed). */
  const play = ctx.el('button', '', '▶ Animer la rotation');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', 'false');
  const reset = ctx.el('button', '', 'Réinitialiser');
  reset.type = 'button';
  reset.id = RESET_ID;

  /* E037-10 : défi en 5 temps, aligné sur la limite du modèle. */
  const challenge = ctx.el('section', P + '-challenge');
  challenge.id = CHALLENGE_ID;
  challenge.setAttribute('aria-labelledby', P + '-challenge-title');
  const chTitle = ctx.el('h3', '', 'À vous de jouer — vérifier une affirmation');
  chTitle.id = P + '-challenge-title';
  const steps = document.createElement('ol');
  [
    'Prédiction : à Tromsø (69,6° N) au solstice d’été, le jour dure-t-il plus de 18 heures ?',
    'Réglage : choisissez « Tromsø » puis amenez le curseur de date au 21 juin (jour 172).',
    'Résultat attendu : le calcul doit donner une durée supérieure à 18 h, proche du jour polaire.',
    'Falsification : si la lecture est inférieure ou égale à 18 h, l’affirmation est réfutée — revérifiez cos(H₀) = −tan φ · tan δ et la déclinaison.',
    'Débrief : révélez la valeur calculée et expliquez l’écart avec la prédiction et les limites du modèle.',
  ].forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    steps.appendChild(li);
  });
  challenge.appendChild(chTitle);
  challenge.appendChild(steps);

  const apply = ctx.el('button', '', 'Appliquer le réglage du défi');
  apply.type = 'button';
  apply.id = APPLY_ID;
  const reveal = ctx.el('button', '', 'Voir le débrief');
  reveal.type = 'button';
  reveal.id = REVEAL_ID;
  const debrief = ctx.el('p', '', '');
  debrief.id = DEBRIEF_ID;
  debrief.hidden = true;
  reveal.setAttribute('aria-controls', DEBRIEF_ID);
  reveal.setAttribute('aria-expanded', 'false');
  challenge.append(apply, reveal, debrief);

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, dateRow, date,
    lonRow, hourRow, sub, canvas, legendText, readout, play, reset, challenge);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  if (aside && typeof aside.insertBefore === 'function') aside.insertBefore(panel, aside.firstChild);
  else if (host && typeof host.appendChild === 'function') host.appendChild(panel);

  return {
    panel, fresh: true, radios, date, dateOut, lon, lonOut, hour, hourOut,
    canvas, readout, legend: legendText, play, reset, apply, reveal, debrief,
  };
}

/* ---------- E037-05 / E037-08 : dessin déterministe et codes non chromatiques ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 340;
  const cssH = cv.clientHeight || 260;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const cx = cssW * 0.56;
  const cy = cssH * 0.5;
  const R = Math.max(40, Math.min(cssW * 0.22, cssH * 0.34));
  const delta = declination(S.day);

  /* Soleil à gauche : disque + rayons à angles fixes (aucun aléa). */
  const sx = cx - R - Math.min(64, cssW * 0.16);
  const sy = cy;
  g.save();
  g.strokeStyle = 'rgba(244,214,158,.85)';
  g.lineWidth = 1.4;
  for (let k = 0; k < 12; k += 1) {
    const a = (k * Math.PI) / 6;
    g.beginPath();
    g.moveTo(sx + Math.cos(a) * (R * 0.24 + 6), sy + Math.sin(a) * (R * 0.24 + 6));
    g.lineTo(sx + Math.cos(a) * (R * 0.24 + 13), sy + Math.sin(a) * (R * 0.24 + 13));
    g.stroke();
  }
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.beginPath();
  g.arc(sx, sy, R * 0.24, 0, Math.PI * 2);
  g.fill();
  g.setLineDash([5, 5]);
  g.strokeStyle = 'rgba(244,214,158,.7)';
  g.beginPath();
  g.moveTo(sx + R * 0.24 + 4, sy);
  g.lineTo(cx - R - 3, sy);
  g.stroke();
  g.restore();

  /* Terre : moitié claire (jour) à gauche, moitié hachurée (nuit) à droite. */
  g.save();
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = 'rgba(232,217,181,.92)';
  g.fillRect(cx - R, cy - R, R, 2 * R);
  g.fillStyle = 'rgba(12,18,28,.97)';
  g.fillRect(cx, cy - R, R, 2 * R);
  /* Hachures diagonales : code non chromatique de la nuit. */
  g.strokeStyle = 'rgba(159,179,200,.42)';
  g.lineWidth = 1;
  for (let k = -2 * R; k <= 2 * R; k += 10) {
    g.beginPath();
    g.moveTo(cx + k, cy - R);
    g.lineTo(cx + k + 2 * R, cy + R);
    g.stroke();
  }
  /* Étoiles déterministes (mulberry32, graine affichée) côté nuit. */
  const rng = mulberry32(SEED);
  g.fillStyle = 'rgba(244,214,158,.9)';
  for (let i = 0; i < 20; i += 1) {
    const a = rng() * Math.PI * 2;
    const rr = rng() * R * 0.92;
    const x = cx + rr * Math.cos(a);
    const y = cy + rr * Math.sin(a);
    if (x > cx + 3) {
      g.beginPath();
      g.arc(x, y, rng() * 1.2 + 0.4, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();

  /* Contour + terminateur en tirets. */
  g.save();
  g.strokeStyle = 'rgba(230,185,111,.9)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([5, 4]);
  g.strokeStyle = 'rgba(255,255,255,.9)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(cx, cy - R);
  g.lineTo(cx, cy + R);
  g.stroke();
  g.restore();

  /* Axe incliné selon la saison (δ > 0 : pôle nord vers le Soleil, à gauche). */
  g.save();
  g.translate(cx, cy);
  g.rotate(-delta * RAD);
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(0, -R * 1.3);
  g.lineTo(0, R * 1.3);
  g.stroke();
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText('N', -3, -R * 1.3 - 4);
  g.fillText('S', -3, R * 1.3 + 12);
  g.restore();

  /* Pastille : pleine côté jour, anneau crénelé côté nuit (forme, pas couleur). */
  const rr = R * 0.78;
  const mx = cx + rr * Math.cos(S.angle);
  const my = cy + rr * Math.sin(S.angle);
  const isDay = Math.cos(S.angle) < 0;
  g.save();
  g.lineWidth = 1.5;
  if (isDay) {
    g.fillStyle = 'rgba(244,214,158,.98)';
    g.strokeStyle = 'rgba(12,18,28,.9)';
    g.beginPath();
    g.arc(mx, my, 5, 0, Math.PI * 2);
    g.fill(); g.stroke();
  } else {
    g.strokeStyle = 'rgba(255,255,255,.95)';
    g.setLineDash([2, 2]);
    g.beginPath();
    g.arc(mx, my, 5, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();

  /* Étiquettes redoublées dans la légende DOM (E037-08). */
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.font = '10px sans-serif';
  g.fillText('☀ JOUR', cx - R + 6, cy + R - 6);
  g.fillText('▨ NUIT', cx + 6, cy + R - 6);
}

/* ---------- E037-06 : readout, région live unique ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const N = S.day;
  const delta = declination(N);
  const eot = equationOfTime(N);
  const length = dayLength(S.latitude, delta);
  const isDay = Math.cos(S.angle) < 0;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const parts = [
    `Jour ${N} · ${dateLabel(N)} · ${season(N)} (hémisphère nord). `,
    'Déclinaison δ = ', fort(`${fmt(delta, 2)}°`),
    ' (référence : inclinaison maximale ', fort(`${fmt(AXIS_TILT, 2)}°`), '). ',
    'Équation du temps E = ', fort(`${fmt(eot, 1)} min`),
    ' (référence : |E| ≤ ', fort(`${EOT_MAX} min`), '). ',
  ];
  if (length.polar) {
    parts.push('Durée du jour : ', fort(length.polar), ' — ', fort(fmt(length.hours, 0) + ' h'), ' de jour. ');
    parts.push('Pas de lever ni de coucher en ', fort(length.polar), '. ');
  } else {
    parts.push('Durée du jour : ', fort(fmt(length.hours, 2) + ' h'),
      ' (référence : ', fort(EQUATOR_HOURS + ' h'), ' à l’équateur). ');
    parts.push('Lever ≈ ', fort(hhmm(EQUATOR_HOURS - length.hours / 2)),
      ' · coucher ≈ ', fort(hhmm(EQUATOR_HOURS + length.hours / 2)), ' (heure solaire). ');
  }
  parts.push('Heure solaire vraie ≈ ', fort(hhmm(solarHours())),
    ' pour ', fort(hhmm(S.legalQuarter / 4)), ' légale (', fort(MIN_PER_DEG + ' min'), ' par degré). ');
  parts.push(fort(isDay
    ? 'Le lieu est dans la partie éclairée : c’est le jour.'
    : 'Le lieu est dans la partie hachurée : c’est la nuit.'));

  /* N'écrire que si le texte change : évite les annonces redondantes. */
  const plain = parts.map((p) => (typeof p === 'string' ? p : p.textContent)).join('');
  if (n.textContent === plain) return;
  n.textContent = '';
  parts.forEach((p) => {
    if (typeof p === 'string') n.appendChild(document.createTextNode(p));
    else n.appendChild(p);
  });
}

/* ---------- Synchronisation des contrôles et du laboratoire ---------- */

function syncControls() {
  const n = S.nodes;
  ORDER.forEach((key) => {
    if (n.radios && n.radios[key]) n.radios[key].checked = S.place === key;
  });
  if (n.date) n.date.value = String(S.day);
  if (n.dateOut) n.dateOut.textContent = dateLabel(S.day) + ' · ' + season(S.day);
  if (n.lon) n.lon.value = String(S.longitude);
  if (n.lonOut) n.lonOut.textContent = fmt(S.longitude, 2) + '° · UTC' + (S.tz >= 0 ? '+' : '−') + Math.abs(S.tz);
  if (n.hour) n.hour.value = String(S.legalQuarter);
  if (n.hourOut) n.hourOut.textContent = hhmm(S.legalQuarter / 4);
  if (n.legend) {
    n.legend.textContent = 'Graine de dessin ' + SEED.toString(16).toUpperCase() +
      ' (mulberry32, aucun tirage aléatoire) · ☀ partie claire = jour · ▨ partie hachurée = nuit · ┄ tirets = terminateur · ' +
      'pastille pleine = jour, pastille en pointillés = nuit · à l’équateur : ' + EQUATOR_HOURS + ' h de jour toute l’année.';
  }
  if (n.play) {
    n.play.textContent = S.reduced
      ? 'Position fixe (mouvement réduit)'
      : (S.playing ? '■ Arrêter la rotation' : '▶ Animer la rotation');
    n.play.setAttribute('aria-pressed', S.playing && !S.reduced ? 'true' : 'false');
  }
  if (n.panel) n.panel.setAttribute(REDUCED_ATTR, S.reduced ? '1' : '0');
  if (n.canvas) {
    n.canvas.setAttribute('aria-label', PLACES[S.place].aria +
      ' Jour ' + S.day + ', ' + dateLabel(S.day) + '. Longitude ' + fmt(S.longitude, 2) +
      ' degrés. Flèches gauche et droite : changer de lieu ; flèches haut et bas : changer de date.');
  }
  if (n.debrief && n.reveal && !n.debrief.hidden) {
    const length = dayLength(69.65, declination(172));
    n.debrief.textContent = 'Calcul : δ = ' + fmt(declination(172), 2) + '°, cos(H₀) = −tan(69,65°) × tan(' +
      fmt(declination(172), 2) + '°), soit une durée de ' + fmt(length.hours, 2) +
      ' h. L’affirmation « plus de 18 h » est confirmée : au-delà du cercle polaire, le Soleil ne se couche pas au solstice. Le modèle reste approximatif (réfraction et rayon solaire ignorés).';
  }
  updateReadout();
  drawLab();
}

function setPlace(key) {
  if (!PLACES[key]) return;
  S.place = key;
  S.latitude = PLACES[key].phi;
  S.longitude = PLACES[key].lon;
  S.tz = PLACES[key].tz;
  syncControls();
}

/* ---------- E037-07 : boucle rAF unique, pause sur document.hidden ---------- */

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
    if (!reduced) {
      S.elapsed += dt;
      S.angle = (Math.PI + (S.elapsed / STEP_MS) * (Math.PI / 6)) % (Math.PI * 2);
    }
  }
  S.lastTs = ts;
  updateReadout();
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E037-10 : mouvement réduit, garde-fous d'écouteurs ---------- */

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visBound) {
    S.visBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !S.reduced) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = !!mq.matches;
        if (mq.matches) { S.playing = false; stopLoop(); }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- E037-05 : badge textuel de mise en garde sur la carte ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', P + '-badge',
    'Schéma conceptuel non à l’échelle : hachures = nuit, tirets = terminateur. Les heures de lever et coucher sont indicatives et données en heure solaire, pas en heure légale.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E037', (ctx) => {
  if (!ctx || (!ctx.stage && !ctx.layout) || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E037-01 : bloc CSS isolé, une seule fois, identifiants préfixés. */
  ctx.css(P, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.reduced) { S.playing = false; stopLoop(); }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    ORDER.forEach((key) => {
      const radio = n.radios[key];
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        setPlace(key);
      });
    });
    n.date.addEventListener('input', () => {
      S.day = Math.max(1, Math.min(365, Math.round(Number(n.date.value))));
      syncControls();
    });
    n.lon.addEventListener('input', () => {
      S.longitude = Number(n.lon.value);
      S.tz = Math.round(S.longitude / 15);
      syncControls();
    });
    n.hour.addEventListener('input', () => {
      S.legalQuarter = Math.max(0, Math.min(95, Math.round(Number(n.hour.value))));
      syncControls();
    });
    n.play.addEventListener('click', () => {
      if (S.reduced) {
        /* Mouvement réduit : une seule position fixe, équivalent lisible. */
        S.playing = false;
        S.angle = Math.PI;
        stopLoop();
        syncControls();
        return;
      }
      S.playing = !S.playing;
      if (S.playing) startLoop(); else stopLoop();
      syncControls();
    });
    n.reset.addEventListener('click', () => {
      S.playing = false;
      stopLoop();
      S.day = 172;
      S.angle = Math.PI;
      S.elapsed = 0;
      setPlace('paris');
      S.legalQuarter = 48;
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = ORDER.indexOf(S.place);
        setPlace(ORDER[(i + step + ORDER.length) % ORDER.length]);
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 1 : -1;
        S.day = Math.max(1, Math.min(365, S.day + step));
        syncControls();
      } else {
        used = false;
      }
      if (used) event.preventDefault();
    });
    n.apply.addEventListener('click', () => {
      S.day = 172;
      setPlace('tromso');
    });
    n.reveal.addEventListener('click', () => {
      const length = dayLength(69.65, declination(172));
      n.debrief.textContent = 'Calcul : δ = ' + fmt(declination(172), 2) + '°, cos(H₀) = −tan(69,65°) × tan(' +
        fmt(declination(172), 2) + '°), soit une durée de ' + fmt(length.hours, 2) +
        ' h. L’affirmation « plus de 18 h » est confirmée : au-delà du cercle polaire, le Soleil ne se couche pas au solstice. Le modèle reste approximatif (réfraction et rayon solaire ignorés).';
      n.debrief.hidden = false;
      n.reveal.setAttribute('aria-expanded', 'true');
    });
  }

  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
