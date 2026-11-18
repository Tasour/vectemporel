import { register } from './registry.js';

/* Lentille E037 — Cycle jour-nuit et heure solaire (vue GEOGRAPHIE).
 * Dix chantiers, tous implémentés : E037-01 … E037-10.
 *
 * La vue GEOGRAPHIE décrit des lieux et des itinéraires ; cette lentille ajoute
 * un tableau de bord autonome qui explique POURQUOI la durée du jour et l'heure
 * solaire varient : inclinaison de l'axe (déclinaison), équation du temps,
 * longitude. Toutes les grandeurs sont recalculées depuis leur formule, avec
 * des valeurs de référence explicites (23,45°, 4 min/degré, 12 h à l'équateur).
 *
 * Zéro réseau, zéro aléa (Math.random proscrit), zéro console. Une seule boucle
 * rAF, suspendue quand document.hidden est vrai. Tout le texte est du texte DOM
 * lisible et structuré ; le schéma est un SVG muni de <title>/<desc>, jamais un
 * canvas dont l'information serait inaccessible sans script. Français intégral. */

const PREFIX = 'geography-e037';
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const STEP_MS = 900;

/* Lieux de référence : latitude, longitude et fuseau servent aux formules. */
const PLACES = [
  { id: 'equateur', label: 'Équateur — 0°', phi: 0, lon: 0, tz: 0 },
  { id: 'paris', label: 'Paris — 48,9° N', phi: 48.86, lon: 2.35, tz: 1 },
  { id: 'tromso', label: 'Tromsø — 69,6° N', phi: 69.65, lon: 18.96, tz: 1 },
  { id: 'pole', label: 'Pôle Nord — 90° N', phi: 90, lon: 0, tz: 0 },
];

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const CUM_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

/* État unique de la lentille. Une seule instance, réinitialisée sans doublon. */
const S = {
  panel: null,
  nodes: {},
  day: 172,          // 21 juin, solstice d'été (hémisphère nord)
  place: 'paris',
  latitude: 48.86,
  longitude: 2.35,
  tz: 1,
  legalHour: 12,
  motifs: false,
  reduced: false,
  anim: null,        // { rafId, last, elapsed, angle, marker, label }
  visibilityReady: false,
};

/* ------------------------------------------------------------------ */
/* Formules astronomiques (approximations standard, déterministes).     */
/* ------------------------------------------------------------------ */

/* Déclinaison solaire de Cooper (degrés) : N = jour de l'année. */
function declination(N) {
  return -23.45 * Math.cos((360 / 365) * (N + 10) * RAD);
}

/* Équation du temps (minutes) : écart entre temps solaire vrai et moyen.
   Valeur absolue maximale ≈ 16 min : c'est la référence affichée. */
function equationOfTime(N) {
  const B = (360 / 365) * (N - 81) * RAD;
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

/* Durée du jour (heures décimales) depuis φ et δ. Cas polaires explicites. */
function dayLength(phi, delta) {
  const arg = -Math.tan(phi * RAD) * Math.tan(delta * RAD);
  if (arg <= -1) return { hours: 24, polar: 'jour polaire' };
  if (arg >= 1) return { hours: 0, polar: 'nuit polaire' };
  const H0 = Math.acos(arg) * DEG;          // angle horaire au lever (degrés)
  return { hours: (2 * H0) / 15, polar: null };
}

/* Heure solaire vraie (minutes) = heure légale + 4 min/° × écart de longitude
   + équation du temps. Le méridien de référence vaut 15° × fuseau. */
function solarMinutes(legalHour, lon, tz, N) {
  const standardMeridian = 15 * tz;
  return legalHour * 60 + 4 * (lon - standardMeridian) + equationOfTime(N);
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

/* ------------------------------------------------------------------ */
/* E037-06 / E037-07 : animation unique et garde-fou de visibilité.     */
/* ------------------------------------------------------------------ */

function installVisibilityWatch() {
  if (S.visibilityReady || typeof document === 'undefined') return;
  S.visibilityReady = true;
  document.addEventListener('visibilitychange', () => {
    /* Le temps ne progresse pas quand l'onglet est masqué. */
    if (S.anim && !document.hidden) S.anim.last = null;
  });
}

function stopAnimation(announceStop) {
  const anim = S.anim;
  if (!anim) return;
  if (anim.rafId !== null) cancelAnimationFrame(anim.rafId);
  if (anim.marker) anim.marker.setAttribute('r', '5');
  S.anim = null;
  const play = S.nodes.play;
  if (play) play.textContent = '▶ Animer la rotation';
  if (announceStop) {
    announce('Animation arrêtée.');
    if (S.nodes.phase) S.nodes.phase.textContent = 'Rotation en pause.';
  }
}

function placeMarker(angle) {
  const marker = S.nodes.marker;
  if (!marker) return;
  const cx = 180;
  const cy = 130;
  const r = 54;
  const x = cx + r * Math.cos(angle);
  const y = cy + r * Math.sin(angle);
  marker.setAttribute('cx', x.toFixed(2));
  marker.setAttribute('cy', y.toFixed(2));
  /* Information portée par la forme et le trait, pas par la seule couleur. */
  const isDay = Math.cos(angle) <= 0; // côté Soleil (gauche) = jour
  marker.setAttribute('fill', isDay ? 'var(--gold-bright)' : 'var(--ink, #0b1016)');
  marker.setAttribute('stroke', isDay ? 'var(--ink, #0b1016)' : '#ffffff');
  marker.setAttribute('stroke-dasharray', isDay ? '' : '2 2');
  if (S.nodes.phase) {
    S.nodes.phase.textContent = isDay
      ? 'Le lieu se trouve dans la partie éclairée : c’est le jour.'
      : 'Le lieu se trouve dans la partie hachurée : c’est la nuit.';
  }
}

function startAnimation() {
  stopAnimation(false);
  const marker = S.nodes.marker;
  if (!marker) return;
  if (S.reduced) {
    /* Mouvement réduit : quatre positions fixes, équivalent lisible. */
    placeMarker(Math.PI);
    announce('Rotation affichée en quatre positions fixes (mouvement réduit).');
    if (S.nodes.play) S.nodes.play.textContent = '▶ Animer la rotation';
    return;
  }
  S.anim = { rafId: null, last: null, elapsed: 0, angle: Math.PI, marker };
  if (S.nodes.play) S.nodes.play.textContent = '■ Arrêter la rotation';
  const frame = (timestamp) => {
    const anim = S.anim;
    if (!anim) return;
    if (anim.last === null) anim.last = timestamp;
    const delta = timestamp - anim.last;
    anim.last = timestamp;
    /* Une seule boucle rAF ; le temps s'arrête si l'onglet est masqué. */
    if (!document.hidden) {
      anim.elapsed += delta;
      anim.angle = (Math.PI + (anim.elapsed / STEP_MS) * (Math.PI / 6)) % (2 * Math.PI);
      placeMarker(anim.angle);
    }
    anim.rafId = requestAnimationFrame(frame);
  };
  S.anim.rafId = requestAnimationFrame(frame);
  announce('Rotation de la Terre en cours.');
}

/* ------------------------------------------------------------------ */
/* E037-07 : unique région de statut, annoncée poliment.                */
/* ------------------------------------------------------------------ */

function announce(message) {
  const status = S.nodes.status;
  if (status) status.textContent = message;
}

/* ------------------------------------------------------------------ */
/* Recalcul et synchronisation de tous les affichages.                  */
/* ------------------------------------------------------------------ */

function computeAndRender() {
  const N = S.day;
  const delta = declination(N);
  const eot = equationOfTime(N);
  const length = dayLength(S.latitude, delta);
  const solMin = solarMinutes(S.legalHour, S.longitude, S.tz, N);
  const solHours = ((solMin % 1440) + 1440) % 1440 / 60;
  const sunrise = 12 - length.hours / 2;
  const sunset = 12 + length.hours / 2;
  const n = S.nodes;

  if (n.dateOut) n.dateOut.textContent = 'Jour ' + N + ' · ' + dateLabel(N) + ' · ' + season(N) + ' (hémisphère nord)';
  if (n.declOut) n.declOut.textContent = 'Déclinaison solaire δ = ' + fmt(delta, 2) + '° — référence : inclinaison maximale 23,45° aux solstices.';
  if (n.eotOut) n.eotOut.textContent = 'Équation du temps E = ' + fmt(eot, 1) + ' min — référence : |E| ≤ 16 min dans l’année.';
  if (n.solarOut) n.solarOut.textContent = 'Heure solaire vraie ≈ ' + hhmm(solHours) + ' pour ' + hhmm(S.legalHour) + ' à l’heure légale (4 min par degré de longitude).';
  if (n.lengthOut) {
    n.lengthOut.textContent = length.polar
      ? 'Durée du jour : ' + length.polar + ' — ' + fmt(length.hours, 0) + ' h de jour.'
      : 'Durée du jour : ' + fmt(length.hours, 2) + ' h — référence : 12 h à l’équateur toute l’année.';
  }
  if (n.sunOut) n.sunOut.textContent = length.polar
    ? 'Lever / coucher : pas de lever ni de coucher en ' + length.polar + '.'
    : 'Lever ≈ ' + hhmm(sunrise) + ' · coucher ≈ ' + hhmm(sunset) + ' (heure solaire).';

  /* Le schéma penche l'axe selon la saison (δ>0 : pôle nord vers le Soleil). */
  if (n.axis) n.axis.setAttribute('transform', 'rotate(' + (-delta).toFixed(2) + ' 180 130)');
  if (n.marker && !S.anim) placeMarker(Math.PI - (delta * RAD));
  if (n.latOut) {
    const place = PLACES.find((p) => p.id === S.place);
    n.latOut.textContent = 'Latitude sélectionnée : ' + fmt(S.latitude, 2) + '° — ' + (place ? place.label : 'lieu libre') + '.';
  }
}

/* ------------------------------------------------------------------ */
/* SVG du terminateur (E037-02 et E037-08).                             */
/* ------------------------------------------------------------------ */

const SVG = '' +
  '<svg viewBox="0 0 360 260" role="img" aria-labelledby="' + PREFIX + '-svg-title ' + PREFIX + '-svg-desc" class="' + PREFIX + '-svg">' +
  '<title id="' + PREFIX + '-svg-title">Schéma du cycle jour-nuit</title>' +
  '<desc id="' + PREFIX + '-svg-desc">Le Soleil, à gauche, éclaire la Terre. La moitié tournée vers lui est en jour (claire) ; la moitié opposée est en nuit (hachurée). Une ligne de terminateur les sépare. L’axe incliné indique la saison et la pastille suit la rotation.</desc>' +
  '<defs>' +
  '<clipPath id="' + PREFIX + '-clip"><circle cx="180" cy="130" r="78"/></clipPath>' +
  '<pattern id="' + PREFIX + '-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
  '<rect width="8" height="8" fill="#15202b"/><line x1="0" y1="0" x2="0" y2="8" stroke="#9fb3c8" stroke-width="2"/></pattern>' +
  '<pattern id="' + PREFIX + '-hatch2" width="8" height="8" patternUnits="userSpaceOnUse">' +
  '<rect width="8" height="8" fill="#15202b"/><path d="M0 0 L8 8 M8 0 L0 8" stroke="#ffffff" stroke-width="1.2"/></pattern>' +
  '</defs>' +
  '<g aria-hidden="true">' +
  '<circle cx="36" cy="130" r="18" fill="var(--gold-bright)"/>' +
  '<line x1="60" y1="130" x2="118" y2="130" stroke="var(--gold-bright)" stroke-width="2" stroke-dasharray="6 6"/>' +
  '<line x1="58" y1="96" x2="104" y2="74" stroke="var(--gold-bright)" stroke-width="1.4" stroke-dasharray="5 7"/>' +
  '<line x1="58" y1="164" x2="104" y2="186" stroke="var(--gold-bright)" stroke-width="1.4" stroke-dasharray="5 7"/>' +
  '</g>' +
  '<g clip-path="url(#' + PREFIX + '-clip)">' +
  '<rect class="' + PREFIX + '-day-fill" x="100" y="48" width="80" height="164" fill="#e8d9b5"/>' +
  '<rect class="' + PREFIX + '-night-fill" x="180" y="48" width="80" height="164" fill="url(#' + PREFIX + '-hatch)"/>' +
  '</g>' +
  '<circle cx="180" cy="130" r="78" fill="none" stroke="var(--gold)" stroke-width="1.6"/>' +
  '<line class="' + PREFIX + '-terminator" x1="180" y1="50" x2="180" y2="210" stroke="#ffffff" stroke-width="1.6" stroke-dasharray="5 4"/>' +
  '<g id="' + PREFIX + '-axis">' +
  '<line x1="180" y1="32" x2="180" y2="228" stroke="var(--gold-bright)" stroke-width="1.2"/>' +
  '<text x="180" y="28" text-anchor="middle" fill="var(--gold-bright)" font-size="12">N</text>' +
  '<text x="180" y="242" text-anchor="middle" fill="var(--gold-bright)" font-size="12">S</text>' +
  '</g>' +
  '<circle id="' + PREFIX + '-marker" cx="126" cy="130" r="5" fill="var(--gold-bright)" stroke="var(--ink, #0b1016)" stroke-width="1.5"/>' +
  '<text x="110" y="235" text-anchor="middle" fill="#9fb3c8" font-size="10">☀ JOUR</text>' +
  '<text x="248" y="235" text-anchor="middle" fill="#9fb3c8" font-size="10">▨ NUIT</text>' +
  '</svg>';

/* ------------------------------------------------------------------ */
/* Construction du panneau.                                             */
/* ------------------------------------------------------------------ */

function ensurePanel(ctx) {
  const host = ctx.layout || ctx.stage;
  if (!host) return false;
  let panel = document.getElementById(PREFIX + '-panel');
  if (!panel) {
    panel = ctx.el('section', PREFIX + '-panel');
    panel.id = PREFIX + '-panel';
    panel.setAttribute('aria-labelledby', PREFIX + '-title');
    host.appendChild(panel);
  }

  if (panel.dataset.built === '1') {
    S.panel = panel;
    S.nodes = {
      dateOut: document.getElementById(PREFIX + '-date-out'),
      latOut: document.getElementById(PREFIX + '-lat-out'),
      declOut: document.getElementById(PREFIX + '-decl-out'),
      eotOut: document.getElementById(PREFIX + '-eot-out'),
      solarOut: document.getElementById(PREFIX + '-solar-out'),
      lengthOut: document.getElementById(PREFIX + '-length-out'),
      sunOut: document.getElementById(PREFIX + '-sun-out'),
      status: document.getElementById(PREFIX + '-status'),
      phase: document.getElementById(PREFIX + '-phase'),
      axis: document.getElementById(PREFIX + '-axis'),
      marker: document.getElementById(PREFIX + '-marker'),
      play: document.getElementById(PREFIX + '-play'),
    };
    return true;
  }

  panel.dataset.built = '1';
  S.panel = panel;
  const n = S.nodes;

  const title = ctx.el('h2', PREFIX + '-h2', 'Cycle jour-nuit et heure solaire');
  title.id = PREFIX + '-title';

  /* E037-01 : texte sémantique, lisible même si aucune interaction n'a lieu. */
  const lead = ctx.el('p', PREFIX + '-lead',
    'Le jour et la nuit ne résultent pas d’un déplacement du Soleil autour de la Terre, mais de la rotation de la Terre sur elle-même. Un point ne voit le Soleil que pendant la moitié de sa rotation : l’autre moitié est la nuit. Deux corrections rendent l’heure lue sur une montre différente de l’heure solaire : la longitude (4 minutes par degré) et l’équation du temps (jusqu’à 16 minutes).');
  const ref = ctx.el('p', PREFIX + '-ref',
    'Repères chiffrés : inclinaison de l’axe 23,45° · 24 h pour un tour complet · 4 min par degré de longitude · 12 h de jour à l’équateur toute l’année.');

  const grid = ctx.el('div', PREFIX + '-grid');
  const controls = ctx.el('div', PREFIX + '-controls');
  const visual = ctx.el('div', PREFIX + '-visual');

  /* E037-08 : légende sans couleur, glyphes + hachures. */
  const legend = ctx.el('p', PREFIX + '-legend',
    '☀ partie claire = jour · ▨ partie hachurée = nuit · ┄ ligne = terminateur (le passage entre les deux).');

  /* E037-04 : latitude sous forme de radiogroupe (choix unique). */
  const field = ctx.el('fieldset', PREFIX + '-fieldset');
  field.setAttribute('role', 'radiogroup');
  field.setAttribute('aria-label', 'Latitude du lieu observé');
  field.appendChild(ctx.el('legend', '', '1. Choisir la latitude du lieu'));
  PLACES.forEach((place) => {
    const label = ctx.el('label', PREFIX + '-choice');
    const radio = ctx.el('input');
    radio.type = 'radio';
    radio.name = PREFIX + '-latitude';
    radio.value = place.id;
    radio.checked = place.id === S.place;
    radio.id = PREFIX + '-place-' + place.id;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      S.place = place.id;
      S.latitude = place.phi;
      S.longitude = place.lon;
      S.tz = place.tz;
      if (n.lonRange) n.lonRange.value = String(place.lon);
      computeAndRender();
      announce('Lieu sélectionné : ' + place.label + '.');
    });
    label.append(radio, ctx.el('span', '', place.label));
    field.appendChild(label);
  });
  controls.appendChild(field);

  /* E037-09 : curseur de date → jour de l'année. */
  const dateRow = ctx.el('div', PREFIX + '-row');
  const dateLab = ctx.el('label', PREFIX + '-label', '2. Jour de l’année (saison)');
  dateLab.setAttribute('for', PREFIX + '-date');
  const dateRange = ctx.el('input', PREFIX + '-range');
  dateRange.type = 'range';
  dateRange.min = '1'; dateRange.max = '365'; dateRange.step = '1';
  dateRange.id = PREFIX + '-date';
  dateRange.value = String(S.day);
  n.dateRange = dateRange;
  n.dateOut = ctx.el('output', PREFIX + '-out');
  n.dateOut.id = PREFIX + '-date-out';
  n.dateOut.setAttribute('for', dateRange.id);
  dateRange.addEventListener('input', () => {
    S.day = Number(dateRange.value);
    computeAndRender();
    announce('Date changée : jour ' + S.day + ', ' + dateLabel(S.day) + '.');
  });
  dateRow.append(dateLab, dateRange, n.dateOut);
  controls.appendChild(dateRow);

  /* E037-03 : longitude et heure légale → heure solaire vraie. */
  const lonRow = ctx.el('div', PREFIX + '-row');
  const lonLab = ctx.el('label', PREFIX + '-label', '3. Longitude (degrés Est)');
  lonLab.setAttribute('for', PREFIX + '-lon');
  const lonRange = ctx.el('input', PREFIX + '-range');
  lonRange.type = 'range';
  lonRange.min = '-180'; lonRange.max = '180'; lonRange.step = '0.25';
  lonRange.id = PREFIX + '-lon';
  lonRange.value = String(S.longitude);
  n.lonRange = lonRange;
  const lonOut = ctx.el('output', PREFIX + '-out', 'Longitude = ' + fmt(S.longitude, 2) + '°');
  lonOut.id = PREFIX + '-lon-out';
  lonOut.setAttribute('for', lonRange.id);
  lonRange.addEventListener('input', () => {
    S.longitude = Number(lonRange.value);
    S.tz = Math.round(S.longitude / 15);
    lonOut.textContent = 'Longitude = ' + fmt(S.longitude, 2) + '° · fuseau UTC' + (S.tz >= 0 ? '+' : '−') + Math.abs(S.tz);
    computeAndRender();
    announce('Longitude réglée à ' + fmt(S.longitude, 2) + ' degrés.');
  });
  lonRow.append(lonLab, lonRange, lonOut);
  controls.appendChild(lonRow);

  const hourRow = ctx.el('div', PREFIX + '-row');
  const hourLab = ctx.el('label', PREFIX + '-label', '4. Heure légale (heures)');
  hourLab.setAttribute('for', PREFIX + '-hour');
  const hourRange = ctx.el('input', PREFIX + '-range');
  hourRange.type = 'range';
  hourRange.min = '0'; hourRange.max = '23.75'; hourRange.step = '0.25';
  hourRange.id = PREFIX + '-hour';
  hourRange.value = String(S.legalHour);
  const hourOut = ctx.el('output', PREFIX + '-out', 'Heure légale = ' + hhmm(S.legalHour));
  hourOut.id = PREFIX + '-hour-out';
  hourOut.setAttribute('for', hourRange.id);
  hourRange.addEventListener('input', () => {
    S.legalHour = Number(hourRange.value);
    hourOut.textContent = 'Heure légale = ' + hhmm(S.legalHour);
    computeAndRender();
    announce('Heure légale réglée à ' + hhmm(S.legalHour) + '.');
  });
  hourRow.append(hourLab, hourRange, hourOut);
  controls.appendChild(hourRow);

  /* E037-08 : bascule de motifs indépendante (aria-pressed). */
  const motifBtn = ctx.el('button', PREFIX + '-motif', 'Activer les motifs');

  /* E037-06 : commandes de l'animation unique. */
  const play = ctx.el('button', PREFIX + '-play', '▶ Animer la rotation');
  play.type = 'button';
  play.id = PREFIX + '-play';
  n.play = play;
  play.addEventListener('click', () => {
    if (S.anim) stopAnimation(true);
    else startAnimation();
  });
  const reset = ctx.el('button', PREFIX + '-reset', 'Réinitialiser');
  reset.type = 'button';
  reset.id = PREFIX + '-reset';
  reset.addEventListener('click', () => {
    stopAnimation(false);
    S.day = 172; S.place = 'paris'; S.latitude = 48.86; S.longitude = 2.35;
    S.tz = 1; S.legalHour = 12;
    if (n.dateRange) n.dateRange.value = '172';
    if (n.lonRange) n.lonRange.value = '2.35';
    if (n.hourRange) n.hourRange.value = '12';
    if (n.hourOut) n.hourOut.textContent = 'Heure légale = 12:00';
    const parisRadio = document.getElementById(PREFIX + '-place-paris');
    if (parisRadio) parisRadio.checked = true;
    computeAndRender();
    if (n.phase) n.phase.textContent = 'Vue réinitialisée au 21 juin, à Paris.';
    announce('Vue réinitialisée : 21 juin, Paris, midi légal.');
  });
  n.motifBtn = motifBtn;
  n.hourRange = hourRange;
  n.hourOut = hourOut;
  motifBtn.type = 'button';
  motifBtn.id = PREFIX + '-motif';
  motifBtn.setAttribute('aria-pressed', S.motifs ? 'true' : 'false');
  motifBtn.addEventListener('click', () => {
    S.motifs = !S.motifs;
    panel.classList.toggle(PREFIX + '-motifs', S.motifs);
    motifBtn.setAttribute('aria-pressed', S.motifs ? 'true' : 'false');
    motifBtn.textContent = S.motifs ? 'Désactiver les motifs' : 'Activer les motifs';
    announce(S.motifs
      ? 'Motifs activés : la nuit passe en croisillons et le terminateur en tirets longs.'
      : 'Motifs désactivés : retour aux hachures diagonales.');
  });
  const actions = ctx.el('div', PREFIX + '-actions');
  actions.append(motifBtn, play, reset);
  controls.appendChild(actions);

  /* E037-07 : statut + phase, deux textes annoncés ou affichés. */
  const status = ctx.el('p', PREFIX + '-status', 'Tableau de bord prêt.');
  status.id = PREFIX + '-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  n.status = status;
  controls.appendChild(status);

  /* E037-02 : schéma SVG + E037-05 : lecture chiffrée. */
  const svgHost = ctx.el('div', PREFIX + '-svg-host');
  svgHost.innerHTML = SVG;
  visual.appendChild(svgHost);
  const phase = ctx.el('p', PREFIX + '-phase', 'Le lieu se trouve dans la partie éclairée : c’est le jour.');
  phase.id = PREFIX + '-phase';
  n.phase = phase;
  visual.appendChild(phase);
  visual.appendChild(legend);

  n.latOut = ctx.el('p', PREFIX + '-readout'); n.latOut.id = PREFIX + '-lat-out';
  n.declOut = ctx.el('p', PREFIX + '-readout'); n.declOut.id = PREFIX + '-decl-out';
  n.eotOut = ctx.el('p', PREFIX + '-readout'); n.eotOut.id = PREFIX + '-eot-out';
  n.solarOut = ctx.el('p', PREFIX + '-readout'); n.solarOut.id = PREFIX + '-solar-out';
  n.lengthOut = ctx.el('p', PREFIX + '-readout'); n.lengthOut.id = PREFIX + '-length-out';
  n.sunOut = ctx.el('p', PREFIX + '-readout'); n.sunOut.id = PREFIX + '-sun-out';
  visual.append(n.latOut, n.declOut, n.eotOut, n.solarOut, n.lengthOut, n.sunOut);

  n.axis = document.getElementById(PREFIX + '-axis');
  n.marker = document.getElementById(PREFIX + '-marker');

  grid.append(controls, visual);

  /* E037-10 : défi en 5 temps, aligné sur la limite du modèle. */
  const challenge = ctx.el('section', PREFIX + '-challenge');
  challenge.setAttribute('aria-labelledby', PREFIX + '-challenge-title');
  const chTitle = ctx.el('h3', PREFIX + '-h3', 'À vous de jouer — vérifier une affirmation');
  chTitle.id = PREFIX + '-challenge-title';
  challenge.appendChild(chTitle);
  const steps = ctx.el('ol', PREFIX + '-steps');
  [
    'Prédiction : à Tromsø (69,6° N) au solstice d’été, le jour dure-t-il plus de 18 heures ?',
    'Réglage : choisissez « Tromsø » puis amenez le curseur de date au 21 juin (jour 172).',
    'Résultat attendu : le calcul doit donner une durée supérieure à 18 h, proche du jour polaire.',
    'Falsification : si la lecture est inférieure ou égale à 18 h, l’affirmation est réfutée — revérifiez la déclinaison et la formule cos(H₀) = −tan φ · tan δ.',
    'Débrief : révélez la valeur calculée et expliquez l’écart avec la prédiction.',
  ].forEach((text) => steps.appendChild(ctx.el('li', '', text)));
  challenge.appendChild(steps);

  const apply = ctx.el('button', PREFIX + '-apply', 'Appliquer le réglage du défi');
  apply.type = 'button';
  apply.id = PREFIX + '-apply';
  apply.addEventListener('click', () => {
    S.place = 'tromso'; S.latitude = 69.65; S.longitude = 18.96; S.tz = 1; S.day = 172;
    if (n.dateRange) n.dateRange.value = '172';
    const radio = document.getElementById(PREFIX + '-place-tromso');
    if (radio) radio.checked = true;
    computeAndRender();
    announce('Réglage appliqué : Tromsø, jour 172.');
  });
  const reveal = ctx.el('button', PREFIX + '-reveal', 'Voir le débrief');
  reveal.type = 'button';
  reveal.id = PREFIX + '-reveal';
  const debrief = ctx.el('p', PREFIX + '-debrief', '');
  debrief.id = PREFIX + '-debrief';
  debrief.hidden = true;
  reveal.setAttribute('aria-controls', debrief.id);
  reveal.setAttribute('aria-expanded', 'false');
  reveal.addEventListener('click', () => {
    const length = dayLength(69.65, declination(172));
    debrief.textContent = 'Calcul : δ = ' + fmt(declination(172), 2) + '°, cos(H₀) = −tan(69,65°) × tan(' +
      fmt(declination(172), 2) + '°), soit une durée de ' + fmt(length.hours, 2) +
      ' h. L’affirmation « plus de 18 h » est confirmée : au-delà du cercle polaire, le Soleil ne se couche pas au solstice. Le modèle reste approximatif (réfraction, rayon solaire ignorés).';
    debrief.hidden = false;
    reveal.setAttribute('aria-expanded', 'true');
    announce('Débrief révélé : durée calculée ' + fmt(length.hours, 2) + ' heures.');
  });
  const chActions = ctx.el('div', PREFIX + '-actions');
  chActions.append(apply, reveal);
  challenge.append(chActions, debrief);

  const limits = ctx.el('p', PREFIX + '-limits',
    'Limites : formules moyennes (orbite supposée circulaire), sans réfraction atmosphérique ni diamètre apparent du Soleil ; les heures de lever et coucher sont donc indicatives et données en heure solaire, pas en heure légale.');

  panel.append(title, lead, ref, grid, challenge, limits);
  return true;
}

/* ------------------------------------------------------------------ */
/* CSS isolé — E037-01.                                                 */
/* ------------------------------------------------------------------ */

const CSS = '' +
  '#' + PREFIX + '-panel{padding:14px 16px;margin:14px 0;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.02)}' +
  '.' + PREFIX + '-h2{margin:0 0 6px;font-size:16px;color:var(--gold-bright)}' +
  '.' + PREFIX + '-h3{margin:14px 0 6px;font-size:13px;color:var(--gold-bright)}' +
  '.' + PREFIX + '-lead,.' + PREFIX + '-ref,.' + PREFIX + '-legend,.' + PREFIX + '-readout,.' + PREFIX + '-phase,.' + PREFIX + '-status,.' + PREFIX + '-debrief,.' + PREFIX + '-limits{margin:6px 0;font-size:11px;line-height:1.6;color:var(--muted)}' +
  '.' + PREFIX + '-ref{color:var(--gold-bright);font-variant-numeric:tabular-nums}' +
  '.' + PREFIX + '-grid{display:grid;grid-template-columns:minmax(220px,1fr) minmax(280px,1.2fr);gap:14px;margin-top:10px}' +
  '.' + PREFIX + '-fieldset{border:1px solid var(--line);border-radius:8px;margin:0 0 10px;padding:8px 10px}' +
  '.' + PREFIX + '-fieldset legend{font-size:11px;color:var(--gold-bright);padding:0 4px}' +
  '.' + PREFIX + '-choice{display:flex;align-items:center;gap:8px;min-height:30px;font-size:11px;cursor:pointer}' +
  '.' + PREFIX + '-choice input{accent-color:var(--gold)}' +
  '.' + PREFIX + '-row{display:flex;flex-direction:column;gap:3px;margin:8px 0}' +
  '.' + PREFIX + '-label{font-size:11px;color:var(--gold-bright)}' +
  '.' + PREFIX + '-range{width:100%;accent-color:var(--gold);min-height:24px}' +
  '.' + PREFIX + '-out{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums;min-height:15px}' +
  '.' + PREFIX + '-actions{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px}' +
  '.' + PREFIX + '-motif,.' + PREFIX + '-play,.' + PREFIX + '-reset,.' + PREFIX + '-apply,.' + PREFIX + '-reveal{min-height:36px;min-width:36px;padding:6px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--muted);font-size:11px;line-height:1.35;cursor:pointer}' +
  '.' + PREFIX + '-motif:hover,.' + PREFIX + '-play:hover,.' + PREFIX + '-reset:hover,.' + PREFIX + '-apply:hover,.' + PREFIX + '-reveal:hover{border-color:var(--gold);color:var(--gold-bright)}' +
  '.' + PREFIX + '-motif:focus-visible,.' + PREFIX + '-play:focus-visible,.' + PREFIX + '-reset:focus-visible,.' + PREFIX + '-apply:focus-visible,.' + PREFIX + '-reveal:focus-visible,.' + PREFIX + '-range:focus-visible,.' + PREFIX + '-choice input:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}' +
  '.' + PREFIX + '-motif[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.10)}' +
  '.' + PREFIX + '-svg-host{border:1px solid var(--line);border-radius:8px;background:#0b1016;padding:4px}' +
  '.' + PREFIX + '-svg{display:block;width:100%;height:auto}' +
  '.' + PREFIX + '-phase{color:var(--gold-bright);font-style:italic}' +
  '.' + PREFIX + '-readout{border-left:2px solid var(--line);padding-left:8px;font-variant-numeric:tabular-nums}' +
  '.' + PREFIX + '-status{min-height:16px;font-style:italic}' +
  '.' + PREFIX + '-challenge{margin-top:12px;border-top:1px solid var(--line);padding-top:6px}' +
  '.' + PREFIX + '-steps{margin:6px 0;padding-left:20px;font-size:11px;line-height:1.6;color:var(--muted)}' +
  '.' + PREFIX + '-steps li{margin:3px 0}' +
  '.' + PREFIX + '-debrief{border-left:2px solid var(--gold);padding-left:8px;color:var(--gold-bright)}' +
  '.' + PREFIX + '-limits{margin-top:10px;font-style:italic;font-size:10px}' +
  /* E037-08 : motifs sans couleur. */
  '.' + PREFIX + '-motifs .' + PREFIX + '-night-fill{fill:url(#' + PREFIX + '-hatch2)}' +
  '.' + PREFIX + '-motifs .' + PREFIX + '-terminator{stroke-dasharray:12 6}' +
  '.' + PREFIX + '-motifs .' + PREFIX + '-day-fill{fill:#ffffff}' +
  '@media(max-width:760px){.' + PREFIX + '-grid{grid-template-columns:1fr}' +
  '.' + PREFIX + '-motif,.' + PREFIX + '-play,.' + PREFIX + '-reset,.' + PREFIX + '-apply,.' + PREFIX + '-reveal{min-height:40px}}';

/* ------------------------------------------------------------------ */
/* Point d'entrée.                                                     */
/* ------------------------------------------------------------------ */

register('E037', (ctx) => {
  if (!ctx || (!ctx.stage && !ctx.layout) || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E037-01 : bloc CSS unique, préfixé, sans ressource externe. */
  ctx.css(PREFIX, CSS);

  installVisibilityWatch();
  stopAnimation(false);

  if (typeof ctx.reducedMotion === 'function') {
    try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }
  } else {
    S.reduced = false;
  }

  if (!ensurePanel(ctx)) return;

  /* Le panneau peut être reconstruit : revérifier les nœuds après création. */
  if (!S.nodes.status || !S.nodes.marker) {
    S.nodes.status = document.getElementById(PREFIX + '-status');
    S.nodes.marker = document.getElementById(PREFIX + '-marker');
    S.nodes.axis = document.getElementById(PREFIX + '-axis');
    S.nodes.phase = document.getElementById(PREFIX + '-phase');
    S.nodes.play = document.getElementById(PREFIX + '-play');
  }

  computeAndRender();
  if (S.reduced && S.anim) stopAnimation(false);
});
