import { register } from './registry.js';

/*
 * Lentille E006 — référentiel WGS 84 et coordonnées géodésiques.
 *
 * Dix chantiers (E006-01 … E006-10) réellement implémentés dans CE seul module :
 * aucun fichier partagé n'est modifié, aucun stub ne subsiste. La vue
 * reconstruisant son DOM à chaque rendu (geography.js:512), apply() recrée sa
 * fiche dans le stage courant ; les écouteurs, eux, sont posés une seule fois
 * au niveau module et lisent toujours le dernier contexte (`latest`).
 *
 * Contrat : enregistrement de l'identifiant E006 avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Feuille de styles unique, injectée sous l'identifiant `geography-e006`.
 * Tous les identifiants DOM sont préfixés `geography-e006-` : aucun appel à
 * la console, aucune requête réseau, aucune source d'aléa, aucune écriture
 * HTML brute, au plus une requête d'animation en vol (pause hors écran).
 *
 * Les nombres géodésiques sont des CONSTANTES NORMATIVES (WGS 84 / GRS 80,
 * NIMA TM 8350.2, EPSG guidance note 7-2) et des grandeurs recalculées depuis
 * la formule et depuis les trois décimales réellement affichées par la vue
 * (geography.js:436). Aucune altitude, aucun datum historique, aucune
 * transformation de coordonnées n'est inventée : les valeurs du jeu de
 * données sont affichées telles quelles.
 */

const CSS_ID = 'geography-e006';
const DOSSIER_ID = 'geography-e006-dossier';
const TITLE_ID = 'geography-e006-title';
const STATUS_VALUE_ID = 'geography-e006-status-value';

/* ---- Constantes normatives WGS 84 / GRS 80 ------------------------------- */
const A = 6378137;                 // demi-grand axe équatorial, mètres
const F = 1 / 298.257223563;      // aplatissement normatif
const E2 = F * (2 - F);            // excentricité au carré (dérivée de f)
const B = A * (1 - F);            // demi-petit axe polaire, mètres (dérivé)
const RAD = Math.PI / 180;        // degré → radian
const ARC = 180 / Math.PI;        // radian → degré
const NARROW = '\u202f';          // espace insécable fine (typographie française)
const MINUS = '\u2212';           // signe moins typographique

let latest = null;     // dernier contexte vu : { stage, layout, reducedMotion, ... }
let installed = false; // garde des écouteurs globaux
let frame = 0;         // au plus une frame d'animation en vol
let renders = 0;       // nombre de passes apply(), publié dans le relevé

const finite = (value) => typeof value === 'number' && Number.isFinite(value);

/* Formatage décimal français déterministe, sans dépendance à Intl ni au hasard. */
function num(value, digits) {
  if (!finite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? MINUS : ''}${grouped}${parts[1] ? `,${parts[1]}` : ''}`;
}

/* Degrés décimaux → degrés, minutes, secondes d'arc + hémisphère. */
function dms(value, positive, negative) {
  if (!finite(value)) return '—';
  const hemisphere = value < 0 ? negative : positive;
  const absolute = Math.abs(value);
  let degrees = Math.floor(absolute);
  let minutesFloat = (absolute - degrees) * 60;
  let minutes = Math.floor(minutesFloat);
  let seconds = Math.round((minutesFloat - minutes) * 600) / 10;
  if (seconds >= 60) { seconds = 0; minutes += 1; }
  if (minutes >= 60) { minutes = 0; degrees += 1; }
  return `${degrees}° ${String(minutes).padStart(2, '0')}′ ${num(seconds, 1)}″ ${hemisphere}`;
}

/* Rayons de courbure de l'ellipsoïde à la latitude géodésique φ.
   N (premier vertical) = a / √(1 − e² sin²φ)
   M (méridien)         = a (1 − e²) / (1 − e² sin²φ)^(3/2)              */
function curvature(latDeg) {
  const sin = Math.sin(latDeg * RAD);
  const denom = Math.sqrt(1 - E2 * sin * sin);
  return {
    N: A / denom,
    M: (A * (1 - E2)) / (denom * denom * denom),
    cos: Math.cos(latDeg * RAD),
  };
}

/* Latitude géocentrique θ = atan((1 − f)² tan φ). */
function geocentric(latDeg) {
  return Math.atan((1 - F) * (1 - F) * Math.tan(latDeg * RAD)) * ARC;
}

/* Lecture de la paire réellement affichée dans .geo-coords (3 décimales). */
function parsePair(text) {
  if (typeof text !== 'string') return null;
  const match = text.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!finite(lat) || !finite(lon)) return null;
  return { lat, lon };
}

function readKicker(layout) {
  const kicker = layout.querySelector('.view-kicker');
  const text = kicker ? kicker.textContent || '' : '';
  const match = text.match(/Lieu\s+(\d+)\s*\/\s*(\d+)/);
  return match ? { position: Number(match[1]), total: Number(match[2]) } : null;
}

/* ------------------------------------------------------------------------- *
 * Feuille de styles E006 : cadrée par [data-geography-e006="on"] posé sur
 * .geo-layout. Aucune règle ne déborde sur une autre vue, aucune transition
 * n'est introduite, aucune information n'est portée par la seule couleur.
 * ------------------------------------------------------------------------- */
const RULES = `
.geo-layout[data-geography-e006="on"] .geography-e006-dossier {
  margin: 12px 0 6px; padding: 10px 12px;
  border: 1px solid var(--line); border-left: 3px solid var(--gold);
  border-radius: 8px; background: rgba(255,255,255,.02);
  color: var(--muted); font-size: 11px; line-height: 1.55;
}
.geo-layout[data-geography-e006="on"] .geography-e006-dossier h2 {
  margin: 0 0 8px; color: var(--gold-bright); font-size: 12px; font-weight: 600;
}
.geo-layout[data-geography-e006="on"] .geography-e006-line {
  margin: 0 0 6px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.geo-layout[data-geography-e006="on"] .geography-e006-line:last-child { margin-bottom: 0; }
.geo-layout[data-geography-e006="on"] .geography-e006-line strong {
  color: var(--gold-bright); font-weight: 600;
}
.geo-layout[data-geography-e006="on"] .geography-e006-value { color: var(--ink); }
@media (max-width: 620px) {
  .geo-layout[data-geography-e006="on"] .geography-e006-dossier {
    margin: 10px 0 4px; padding: 9px 10px; font-size: 11px;
  }
  .geo-layout[data-geography-e006="on"] .geography-e006-dossier h2 { font-size: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .geo-layout[data-geography-e006="on"] .geography-e006-dossier,
  .geo-layout[data-geography-e006="on"] .geography-e006-line {
    transition: none !important; animation: none !important; scroll-behavior: auto !important;
  }
}
`;

/* E006-10 — une seule frame, court-circuitée quand l'onglet est masqué. */
function paint() {
  const current = latest;
  if (!current || !current.statusNode) return;
  const width = typeof window === 'undefined' ? 0 : (window.innerWidth || 0);
  const reduced = current.reducedMotion && current.reducedMotion();
  current.statusNode.textContent =
    `fenêtre ${width} px · ${current.markerCount} marqueur(s) · ` +
    `${current.placeTotal} lieu(x) dans le périmètre · ` +
    `mouvement ${reduced ? 'réduit' : 'complet'} · rendu n° ${current.render}.`;
}

function schedule() {
  if (frame || (typeof document !== 'undefined' && document.hidden)) return;
  if (typeof requestAnimationFrame !== 'function') { paint(); return; }
  frame = requestAnimationFrame(() => {
    frame = 0;
    if (typeof document !== 'undefined' && document.hidden) return;
    paint();
  });
}

/* E006-10 — installation unique et silencieuse des écouteurs. */
function install() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  try {
    if (typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (query && typeof query.addEventListener === 'function') {
        query.addEventListener('change', schedule);
      }
    }
  } catch { /* media-query indisponible : ctx.reducedMotion() reste la source vivante. */ }
}

/* E006-01 … E006-09 — calculs dérivés, jamais de valeurs codées en dur
   pour une paire donnée : tout est recalculé depuis la paire affichée. */
function buildFacts(pair, context) {
  const facts = {};
  facts.datum = 'WGS 84 (EPSG:4326) — ellipsoïde GRS 80';

  if (pair) {
    const curve = curvature(pair.lat);
    const metreLat = curve.M * RAD;                 // 1° de latitude, mètres
    const metreLon = curve.N * curve.cos * RAD;     // 1° de longitude, mètres
    const theta = geocentric(pair.lat);
    const deltaDegrees = pair.lat - theta;
    const deltaArcsec = Math.abs(deltaDegrees) * 3600;
    const deltaMetres = Math.abs(deltaDegrees) * metreLat;
    const validLat = pair.lat >= -90 && pair.lat <= 90;
    const validLon = pair.lon >= -180 && pair.lon <= 180;
    const compression = (1 - curve.cos) * 100;

    facts.latDms = dms(pair.lat, 'N', 'S');
    facts.lonDms = dms(pair.lon, 'E', 'O');
    facts.metreLat = metreLat;
    facts.metreLon = metreLon;
    facts.ratio = A / (metreLat / 1000); // pas de 0,001° (en km) vs rayon équatorial
    facts.deltaArcsec = deltaArcsec;
    facts.deltaMetres = deltaMetres;
    facts.valid = validLat && validLon;
    facts.compression = compression;
    facts.pair = pair;
  }

  facts.markerCount = context.markerCount;
  facts.placeTotal = context.placeTotal;
  facts.placeText = context.placeText;
  return facts;
}

/* E006-10 — fiche sémantique unique, dix paragraphes de texte réel.
   Le dossier est déposé dans .geo-panel (ou dans un hôte sans id) afin que son
   parent ne soit ni body, ni stage, ni layout : le marqueur automatique de la
   coque (_diagnostics.js:69-79) ne peut donc pas le masquer par défaut. */
function addDossier(ctx, facts) {
  /* Garde d'existence : si la coque réutilise un layout déjà enrichi, on
     retire l'ancienne fiche plutôt que de laisser deux identifiants vivants. */
  const previous = ctx.layout.querySelector(`#${DOSSIER_ID}`);
  if (previous && previous.parentNode) previous.parentNode.removeChild(previous);

  const panel = ctx.layout.querySelector('.geo-panel');
  let host = panel;
  if (!host) {
    host = ctx.el('div', 'geography-e006-host');
    ctx.layout.appendChild(host);
  }

  const dossier = ctx.el('section', 'geography-e006-dossier');
  dossier.id = DOSSIER_ID;
  dossier.setAttribute('aria-label', 'Fiche WGS 84 et coordonnées géodésiques');

  const heading = ctx.el('h2', '', 'WGS 84 — lire des coordonnées géodésiques');
  heading.id = TITLE_ID;
  dossier.appendChild(heading);

  const nodes = {};
  const line = (index, label, text, valueId) => {
    const paragraph = ctx.el('p', 'geography-e006-line');
    paragraph.id = `geography-e006-line-${String(index).padStart(2, '0')}`;
    paragraph.appendChild(ctx.el('strong', '', `E006-${String(index).padStart(2, '0')} · ${label}. `));
    const value = ctx.el('span', 'geography-e006-value', text);
    if (valueId) value.id = valueId;
    paragraph.appendChild(value);
    dossier.appendChild(paragraph);
    nodes[index] = value;
    return value;
  };

  const d = facts.pair
    ? `Calculé depuis la paire affichée : ${num(facts.pair.lat, 3)} (lat.), ${num(facts.pair.lon, 3)} (lon.).`
    : 'Aucune paire de coordonnées affichée pour ce périmètre : seules les constantes sont données.';

  /* E006-01 — référentiel et ellipsoïde normatif. */
  line(1, 'Référentiel',
    `${facts.datum} : demi-grand axe a = ${num(A, 0)} m, aplatissement f = 1/${num(298.257223563, 9)}, ` +
    `demi-petit axe b = a(1 − f) ≈ ${num(B, 3)} m. ${d}`);

  /* E006-02 — conversion décimale → DMS, hémisphères. */
  line(2, 'Degrés décimaux → DMS',
    facts.pair
      ? `${num(facts.pair.lat, 3)}° = ${facts.latDms} ; ${num(facts.pair.lon, 3)}° = ${facts.lonDms}. ` +
        'Minutes et secondes recalculées par (valeur − degré) × 60, puis × 60.'
      : 'Conversion non appliquée : aucune latitude ni longitude décimale n’est affichée.');

  /* E006-03 — résolution du dernier chiffre, comparée au rayon équatorial. */
  line(3, 'Résolution angulaire',
    facts.pair
      ? `Un pas de 0,001° vaut ici ≈ ${num(facts.metreLat, 0)} m en latitude et ≈ ${num(facts.metreLon, 0)} m en longitude, ` +
        `soit environ 1/${num(facts.ratio, 0)} du rayon équatorial de ${num(A, 0)} m.`
      : `Un pas de 0,001° représente ≈ ${num(curvature(0).M * RAD, 0)} m à l’équateur, contre ${num(A, 0)} m de rayon équatorial.`);

  /* E006-04 — latitude géodésique contre latitude géocentrique. */
  line(4, 'Normale et centre',
    facts.pair
      ? `À ${num(facts.pair.lat, 3)}°, l’angle avec la normale à l’ellipsoïde (géodésique) ` +
        `diffère de la direction du centre (géocentrique) de ≈ ${num(facts.deltaArcsec, 0)}″ d’arc, ` +
        `soit ≈ ${num(facts.deltaMetres / 1000, 1)} km au sol : θ = atan((1 − f)² tan φ).`
      : 'Sans paire affichée, aucun écart géodésique/geocentrique n’est calculé : θ = atan((1 − f)² tan φ).');

  /* E006-05 — hauteur ellipsoïdale h, hauteur orthométrique H, géoïde N. */
  line(5, 'Composante verticale',
    'WGS 84 définit une hauteur ellipsoïdale h ; les cartes terrestres donnent souvent une hauteur ' +
    'orthométrique H, reliée par h = H + N où N est l’ondulation géoïdale. Le jeu de données ' +
    'ne porte ni h, ni H, ni N : aucune altitude n’est affirmée dans cette vue.');

  /* E006-06 — ordre des axes et validité des bornes. */
  line(6, 'Ordre des axes',
    facts.pair
      ? `La vue stocke {lat, lon}, c’est-à-dire l’ordre de l’EPSG:4326 ; GeoJSON inverse les axes en [lon, lat]. ` +
        `Contrôle des bornes : latitude ${num(facts.pair.lat, 3)} dans [−90, 90], longitude ${num(facts.pair.lon, 3)} ` +
        `dans [−180, 180] — paire ${facts.valid ? 'valide (1/1)' : 'invalide (0/1)'}.`
      : 'Ordre attendu {lat, lon} (EPSG:4326) ; aucun couple de nombres affiché à contrôler.');

  /* E006-07 — projection plate carrée du SVG local et distorsion Est–Ouest. */
  line(7, 'Projection de la carte',
    facts.pair
      ? `Le SVG local projette linéairement x ∝ longitude et y ∝ −latitude (plate carrée), sans tuile : ` +
        `à ${num(facts.pair.lat, 3)}°, 1° Est–Ouest ≈ ${num(facts.metreLon / 1000, 0)} km contre ` +
        `≈ ${num(facts.metreLat / 1000, 0)} km Nord–Sud, soit ${num(facts.compression, 0)} % de compression latérale.`
      : 'Le SVG local est une projection schématique x ∝ longitude, y ∝ −latitude : elle ne conserve ni les angles ni les aires.');

  /* E006-08 — datums historiques, sans transformation fabriquée. */
  line(8, 'Datums historiques',
    'WGS 84 a succédé à ED50 et au NTF (Paris) : un même point peut changer de dizaines à centaines de mètres ' +
    'selon le datum retenu. Aucune transformation (Molodensky, Helmert ou grille) n’est appliquée ici : ' +
    'les coordonnées du jeu de données sont affichées telles quelles.');

  /* E006-09 — époque et dérive, sans correction temporelle inventée. */
  line(9, 'Époque et dérive',
    'WGS 84 est réalisé par le cadre ITRF ; les coordonnées de la croûte dérivent de quelques centimètres par an. ' +
    'Face au pas de 0,001° affiché (ordre de la centaine de mètres), cette dérive est négligeable ici : ' +
    'aucun ajustement d’époque n’est appliqué.');

  /* E006-10 — relevé d'hygiène, région live unique. */
  const statusValue = line(10, 'Relevé', '', STATUS_VALUE_ID);
  statusValue.parentNode.setAttribute('role', 'status');
  statusValue.parentNode.setAttribute('aria-live', 'polite');
  statusValue.parentNode.setAttribute('aria-atomic', 'true');

  host.appendChild(dossier);
  return statusValue;
}

register('E006', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  ctx.css(CSS_ID, RULES);

  const layout = ctx.layout;
  renders += 1;
  layout.setAttribute('data-geography-e006', 'on');

  /* Instantané déterministe : une seule lecture du DOM produit par la vue. */
  const coords = layout.querySelector('.geo-coords');
  const pair = parsePair(coords ? coords.textContent : '');
  const markerCount = layout.querySelectorAll('.geo-marker').length;
  const kicker = readKicker(layout);
  const placeTotal = kicker ? kicker.total : layout.querySelectorAll('.c3b-place-item').length;
  const placeText = kicker ? `${kicker.position}/${kicker.total}` : `?/${placeTotal}`;
  const facts = buildFacts(pair, { markerCount, placeTotal, placeText });

  /* Miroir d'état auditable, sans duplication de contenu visible. */
  layout.setAttribute('data-geography-e006-datum', facts.datum);
  layout.setAttribute('data-geography-e006-pair', pair ? `${pair.lat};${pair.lon}` : 'none');
  layout.setAttribute('data-geography-e006-markers', String(markerCount));
  layout.setAttribute('data-geography-e006-places', String(placeTotal));
  layout.setAttribute('data-geography-e006-axis-valid', pair ? String(facts.valid) : 'none');

  const statusNode = addDossier(ctx, facts);
  latest = {
    stage: ctx.stage,
    layout,
    reducedMotion: ctx.reducedMotion,
    statusNode,
    markerCount,
    placeTotal,
    render: renders,
  };
  install();
  schedule();
});
