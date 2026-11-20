import { register } from './registry.js';

/* Lentille E069 (V2) — vue GEOGRAPHIE.
 * Thème : information détaillée au clic sur un lieu.
 *
 * Les dix chantiers E069-01 … E069-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E069.md. Les dix sont réellement
 * implémentés : aucun stub, aucune fonction vide. Tout est local : aucune
 * requête réseau, aucune graine aléatoire, aucune sortie console, aucun
 * fichier partagé modifié. Le contenu pédagogique est du texte sémantique
 * réel (titres, paragraphes, tableau, définition, liste, radiogroupe,
 * légende, défi) présent dans le DOM même sans animation ; le canvas n'est
 * qu'un laboratoire déterministe qui illustre une donnée déjà inscrite dans
 * le référentiel : cliquer un marqueur révèle une fiche, il ne crée rien.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e069- (identifiants, classes, attributs,
 * noms de groupes et bloc CSS).
 *
 * Nouveautés V2 par rapport à la passe 1 : rôle `radiogroup` explicite pour
 * le format, `aria-valuetext` maintenu à jour sur le curseur de précision,
 * `ctx.reducedMotion()` relu à chaque tick, IntersectionObserver suspendant
 * le défilement hors écran, garde-fous d'écouteurs entre rendus, cibles ≥ 36 px,
 * conversion sexagésimales (degrés/minutes/secondes) avec report de retenue et
 * mesures chiffrées comparées à la diagonale du cadre.
 */

const P = 'geography-v2-e069';

/* Identifiants, tous préfixés geography-v2-e069-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const TABLE_ID = P + '-table';
const FORMAT_ID = P + '-format';
const FORMAT_DEC_ID = P + '-format-decimal';
const FORMAT_DMS_ID = P + '-format-dms';
const TOGGLES_ID = P + '-toggles';
const PRECISION_ID = P + '-precision';
const PRECISION_OUT_ID = P + '-precision-value';
const CARTE_ID = P + '-carte';
const CANVAS_ID = P + '-canvas';
const IDENTITE_ID = P + '-identite';
const COORDS_ID = P + '-coords';
const LISTE_ID = P + '-liste';
const STATUT_ID = P + '-statut';
const READOUT_ID = P + '-readout';
const PREV_ID = P + '-prev';
const NEXT_ID = P + '-next';
const RESET_ID = P + '-reset';
const ANIM_ID = P + '-anim';
const REDUCED_ATTR = 'data-' + P + '-reduced';

const MIN_PRECISION = 0;
const MAX_PRECISION = 3;
const RAYON_HIT = 14;
const SWEEP_RATE = 0.00011;

/* Cadre de projection : emprise hexagonale simplifiée, bornes publiques. */
const CADRE = {
  nom: 'France hexagonale',
  minLon: -5.15,
  maxLon: 9.56,
  minLat: 41.33,
  maxLat: 51.09,
};

/* Corpus local, déterministe et sans invention de source : dix chefs-lieux
   français, coordonnées publiques arrondies au dixième de millième de degré.
   Le signe est conservé dans les données ; l'affichage le remplace par un
   hémisphère (N/S, E/O). Aucune valeur n'est fabriquée à l'exécution. */
const LIEUX = [
  {
    id: 'paris', label: 'Paris', rang: 'national',
    historique: ['Lutetia (IIe s. av. J.-C.)', 'Paris (Ve s.)'],
    fonctions: ['Capitale', 'Siège du gouvernement', 'Nœud ferroviaire'],
    memoires: ['Révolution française de 1789', 'Commune de Paris (1871)'],
    lat: 48.8566, lon: 2.3522,
  },
  {
    id: 'marseille', label: 'Marseille', rang: 'régional',
    historique: ['Massalia (v. 600 av. J.-C.)'],
    fonctions: ['Port de commerce', 'Métropole régionale'],
    memoires: ['Fondation grecque antique'],
    lat: 43.2965, lon: 5.3698,
  },
  {
    id: 'lyon', label: 'Lyon', rang: 'régional',
    historique: ['Lugdunum (43 av. J.-C.)'],
    fonctions: ['Nœud ferroviaire', 'Métropole régionale'],
    memoires: ['Révolte des canuts (1831)'],
    lat: 45.764, lon: 4.8357,
  },
  {
    id: 'bordeaux', label: 'Bordeaux', rang: 'régional',
    historique: ['Burdigala'],
    fonctions: ['Port atlantique', 'Métropole régionale'],
    memoires: [],
    lat: 44.8378, lon: -0.5792,
  },
  {
    id: 'lille', label: 'Lille', rang: 'régional',
    historique: ['Lille (XIe s.)'],
    fonctions: ['Métropole frontalière', 'Nœud ferroviaire'],
    memoires: [],
    lat: 50.6292, lon: 3.0573,
  },
  {
    id: 'nantes', label: 'Nantes', rang: 'local',
    historique: ['Namnetes'],
    fonctions: ['Port d’estuaire', 'Métropole régionale'],
    memoires: ['Édit de Nantes (1598)'],
    lat: 47.2184, lon: -1.5536,
  },
  {
    id: 'toulouse', label: 'Toulouse', rang: 'régional',
    historique: ['Tolosa'],
    fonctions: ['Aéronautique', 'Métropole régionale'],
    memoires: [],
    lat: 43.6047, lon: 1.4442,
  },
  {
    id: 'strasbourg', label: 'Strasbourg', rang: 'régional',
    historique: ['Argentoratum'],
    fonctions: ['Siège du Parlement européen', 'Métropole frontalière'],
    memoires: [],
    lat: 48.5734, lon: 7.7521,
  },
  {
    id: 'nice', label: 'Nice', rang: 'local',
    historique: ['Nikaïa'],
    fonctions: ['Port méditerranéen', 'Station balnéaire'],
    memoires: [],
    lat: 43.7102, lon: 7.262,
  },
  {
    id: 'rennes', label: 'Rennes', rang: 'local',
    historique: ['Condate Riedonum'],
    fonctions: ['Métropole régionale', 'Siège universitaire'],
    memoires: [],
    lat: 48.1173, lon: -1.6778,
  },
];

const HIERARCHIE = {
  local: 'Portée locale',
  regional: 'Portée régionale',
  national: 'Portée nationale',
};

const LATITUDES = LIEUX.map((lieu) => lieu.lat);
const LONGITUDES = LIEUX.map((lieu) => lieu.lon);
const AMP_LAT = Math.max(...LATITUDES) - Math.min(...LATITUDES);
const AMP_LON = Math.max(...LONGITUDES) - Math.min(...LONGITUDES);
const N_NORD = LIEUX.filter((lieu) => lieu.lat >= 0).length;
const N_SUD = LIEUX.length - N_NORD;
const N_EST = LIEUX.filter((lieu) => lieu.lon >= 0).length;
const N_OUEST = LIEUX.length - N_EST;

/* Grandeurs de référence du cadre, recalculées une fois par formule. */
const MID_LON = (CADRE.minLon + CADRE.maxLon) / 2;
const MID_LAT = (CADRE.minLat + CADRE.maxLat) / 2;
const COS_MID = Math.cos((MID_LAT * Math.PI) / 180);
const KM_PAR_LON = COS_MID * 111.32;
const KM_PAR_LAT = 110.57;
const DIAG_CADRE = Math.hypot(
  (CADRE.maxLon - CADRE.minLon) * KM_PAR_LON,
  (CADRE.maxLat - CADRE.minLat) * KM_PAR_LAT,
);

const INDEX_PAR_ID = {};
LIEUX.forEach((lieu, i) => { INDEX_PAR_ID[lieu.id] = i; });

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  format: 'decimal',
  graticule: true,
  etiquettes: true,
  nord: true,
  precision: 2,
  selection: LIEUX[0].id,
  joue: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  onScreen: true,
  io: null,
  ioCanvas: null,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ctx.reducedMotion() conservé hors du point d'entrée pour la boucle rAF. */
let ctxReduced = null;

/* ---------- Formules déterministes et formatage français ---------- */

const virgule = (n) => String(n).replace('.', ',');
const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
const fmt2 = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const fmt3 = (n) => (Math.round(n * 1000) / 1000).toFixed(3).replace('.', ',');
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function hemisphereLat(lat) {
  return lat >= 0 ? 'N' : 'S';
}

function hemisphereLon(lon) {
  return lon >= 0 ? 'E' : 'O';
}

function hierarchyLabel(rang) {
  if (!rang) return 'Rang non renseigné';
  return HIERARCHIE[rang] || `Rang : ${rang}`;
}

/* E069-05 — décomposition sexagésimale avec report de retenue intégré :
   on arrondit d'abord le total des secondes, puis on décompose, ce qui
   garantit minutes < 60 et secondes < 60 sans retenue manuelle fragile. */
function dmsParts(value, precision) {
  const bornes = clamp(precision, MIN_PRECISION, MAX_PRECISION);
  const facteur = Math.pow(10, bornes);
  const totalSec = Math.round(Math.abs(value) * 3600 * facteur);
  const deg = Math.floor(totalSec / (3600 * facteur));
  let reste = totalSec - deg * 3600 * facteur;
  const min = Math.floor(reste / (60 * facteur));
  reste -= min * 60 * facteur;
  return { deg, min, sec: reste / facteur, bornes };
}

function formatDecimal(value, precision, hemisphere) {
  const bornes = clamp(precision, MIN_PRECISION, MAX_PRECISION);
  return `${virgule(Math.abs(value).toFixed(bornes))}° ${hemisphere}`;
}

function formatDms(value, precision, hemisphere) {
  const p = dmsParts(value, precision);
  return `${p.deg}° ${String(p.min).padStart(2, '0')}′ ${virgule(p.sec.toFixed(p.bornes))}″ ${hemisphere}`;
}

function valeurFormatee(valeur, estLatitude) {
  const hemisphere = estLatitude ? hemisphereLat(valeur) : hemisphereLon(valeur);
  if (S.format === 'dms') return formatDms(valeur, S.precision, hemisphere);
  return formatDecimal(valeur, S.precision, hemisphere);
}

const latitudeFormatee = (lieu) => valeurFormatee(lieu.lat, true);
const longitudeFormatee = (lieu) => valeurFormatee(lieu.lon, false);
const lieuSelectionne = () => (S.selection ? LIEUX[INDEX_PAR_ID[S.selection]] || null : null);
const nomFormat = () => (S.format === 'dms' ? 'degrés, minutes, secondes' : 'degrés décimaux');
const precisionValuetext = () => `${S.precision} décimale${S.precision > 1 ? 's' : ''}`;

/* E069-09 — mesures vérifiables : écart au centre du cadre en kilomètres,
   comparé à la diagonale du cadre prise comme référence explicite. */
function mesuresDuLieu(lieu) {
  const dx = (lieu.lon - MID_LON) * KM_PAR_LON;
  const dy = (lieu.lat - MID_LAT) * KM_PAR_LAT;
  const dist = Math.hypot(dx, dy);
  const ratio = DIAG_CADRE > 0 ? dist / DIAG_CADRE : 0;
  return { dist, diag: DIAG_CADRE, ratio };
}

/* ---------- E069-01 : bloc CSS unique, préfixé, sans réseau ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${FORMAT_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${FORMAT_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${TOGGLES_ID}{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
#${TOGGLES_ID} button{
  min-height:44px;padding:6px 10px;border:1px solid var(--line);border-radius:999px;
  background:transparent;color:var(--muted);font:inherit;font-size:10px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${TOGGLES_ID} button[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);color:var(--gold-bright,#f4d69e);background:rgba(230,185,111,.1);
}
#${PANEL_ID} input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
  -webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;
}
#${PANEL_ID} input[type="range"]::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${PANEL_ID} input[type="range"]::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;width:24px;height:24px;margin-top:-9px;
  border:1px solid var(--gold-bright,#f4d69e);border-radius:50%;background:var(--gold,#e6b96f);
}
#${PANEL_ID} input[type="range"]::-moz-range-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${PANEL_ID} input[type="range"]::-moz-range-thumb{
  width:24px;height:24px;border:1px solid var(--gold-bright,#f4d69e);
  border-radius:50%;background:var(--gold,#e6b96f);
}
.${P}-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${PANEL_ID} dl{margin:6px 0}
#${PANEL_ID} dt{font-weight:600;color:var(--ink-soft,#d7d1c6)}
#${PANEL_ID} dd{margin:0 0 4px 12px}
#${PANEL_ID} ul.${P}-liste{margin:4px 0;padding-left:18px}
#${PANEL_ID} ul.${P}-liste li{margin:2px 0}
#${CARTE_ID}{position:relative;margin:8px 0}
#${CANVAS_ID}{
  display:block;width:100%;height:240px;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${COORDS_ID}{font-variant-numeric:tabular-nums}
#${STATUT_ID}{font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}
#${LISTE_ID}{list-style:none;margin:6px 0;padding:0}
#${LISTE_ID} li+li{margin-top:3px}
#${LISTE_ID} li{
  padding:5px 8px;border:1px solid var(--line);border-radius:7px;
  background:rgba(255,255,255,.02);font-size:10px;font-variant-numeric:tabular-nums;
}
#${LISTE_ID} li.${P}-actif{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.1);color:var(--gold-bright,#f4d69e);
}
#${READOUT_ID}{
  min-height:46px;padding:7px 8px;margin:6px 0;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} .${P}-nav{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0}
#${PANEL_ID} button.${P}-action{
  display:inline-block;width:auto;min-height:44px;margin:0 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button.${P}-action:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} button.${P}-action:disabled{opacity:.45;cursor:not-allowed}
#${PANEL_ID} .${P}-compte{font-variant-numeric:tabular-nums;color:var(--muted)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,
#${TOGGLES_ID} button{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button{transition:none!important;animation:none!important}
}
@container (max-width: 520px){
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:200px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* ---------- E069-01 : section sémantique, lisible sans animation ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Cliquer sur un lieu d’une carte ne crée aucune donnée : cela révèle une fiche déjà inscrite dans le référentiel. Identité, coordonnées, fonctions et mémoires existent avant le clic et doivent pouvoir être retrouvées dans le tableau et vérifiées par le calcul.',
    'Une fiche détaillée croise plusieurs champs du même lieu : son nom, son rang hiérarchique, ses noms historiques, sa paire de coordonnées (latitude, longitude), ses fonctions attestées et ses mémoires. Aucun champ n’est déduit d’un autre : ils sont lus dans la source.',
    'La même grandeur peut s’écrire de deux façons : en degrés décimaux (48,8566° N) ou en degrés, minutes et secondes (48° 51′ 24″ N). Les deux notations décrivent exactement le même point ; changer le format n’altère jamais la position.',
    'Limite falsifiable, en cinq temps : (1) prédire la latitude et la longitude d’un lieu avant de le sélectionner ; (2) régler le format et la précision ; (3) observer la fiche affichée ; (4) essayer de faire varier la position par le seul clic pour contredire l’idée que le pointeur crée une donnée ; (5) débrief : la paire retrouvée dans le tableau et le calcul confirme l’invariance, sinon l’hypothèse est réfutée.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E069-02 : tableau de référence recalculé par formule ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Référentiel : dix lieux, coordonnées en degrés décimaux à deux décimales. La ligne « Étendue » donne les amplitudes de référence (180° d’un pôle à l’autre, 360° pour un tour complet).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Lieu', 'Rang', 'Latitude', 'Longitude'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  LIEUX.forEach((lieu) => {
    const tr = document.createElement('tr');
    const cellules = [
      [lieu.label, true],
      [hierarchyLabel(lieu.rang), false],
      [`${virgule(Math.abs(lieu.lat).toFixed(2))}° ${hemisphereLat(lieu.lat)}`, false],
      [`${virgule(Math.abs(lieu.lon).toFixed(2))}° ${hemisphereLon(lieu.lon)}`, false],
    ];
    cellules.forEach(([texte, estEnTete]) => {
      const cell = document.createElement(estEnTete ? 'th' : 'td');
      if (estEnTete) cell.scope = 'row';
      cell.textContent = texte;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  const tfoot = document.createElement('tfoot');
  const fr = document.createElement('tr');
  [
    'Étendue',
    `${LIEUX.length} lieux`,
    `${fmt1(AMP_LAT)}° sur 180°`,
    `${fmt1(AMP_LON)}° sur 360°`,
  ].forEach((texte, i) => {
    const cell = document.createElement(i === 0 ? 'th' : 'td');
    if (i === 0) cell.scope = 'row';
    cell.textContent = texte;
    fr.appendChild(cell);
  });
  tfoot.appendChild(fr);
  table.appendChild(tfoot);
  return table;
}

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: Array.from(existant.querySelectorAll('input[name="' + P + '-format"]')),
      toggles: Array.from(existant.querySelectorAll('[data-' + P + '-toggle]')),
      precision: document.getElementById(PRECISION_ID),
      precisionOut: document.getElementById(PRECISION_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      identite: document.getElementById(IDENTITE_ID),
      coords: document.getElementById(COORDS_ID),
      liste: document.getElementById(LISTE_ID),
      statut: document.getElementById(STATUT_ID),
      readout: document.getElementById(READOUT_ID),
      compte: document.getElementById(P + '-compte'),
      prev: document.getElementById(PREV_ID),
      next: document.getElementById(NEXT_ID),
      reset: document.getElementById(RESET_ID),
      anim: document.getElementById(ANIM_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Fiche détaillée d’un lieu au clic (V2)');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Une carte ne donne pas seulement des noms : chaque marqueur porte une fiche complète. Cliquez un lieu du laboratoire ou utilisez les flèches du clavier pour révéler son identité, ses coordonnées, ses fonctions et ses mémoires, puis changez le format pour voir le même point s’écrire autrement.');

  const subRef = ctx.el('h3', '', 'Référentiel des lieux');
  const subReglages = ctx.el('h3', '', 'Réglages de l’affichage');
  const subCarte = ctx.el('h3', '', 'Laboratoire : cliquer un marqueur');
  const subFiche = ctx.el('h3', '', 'Fiche détaillée du lieu sélectionné');
  const subListe = ctx.el('h3', '', 'Lieux en texte');

  /* E069-06 : choix unique -> radiogroupe natif et rôle explicite. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = FORMAT_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Format des coordonnées affichées (choix unique)');
  const legendFmt = document.createElement('legend');
  legendFmt.textContent = 'Format des coordonnées affichées (choix unique)';
  fieldset.appendChild(legendFmt);
  [
    ['decimal', 'Degrés décimaux', FORMAT_DEC_ID],
    ['dms', 'Degrés, minutes, secondes', FORMAT_DMS_ID],
  ].forEach(([value, label, id]) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-format';
    radio.id = id;
    radio.value = value;
    radio.checked = S.format === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });

  /* E069-03 : bascules indépendantes -> aria-pressed autorisé. */
  const group = document.createElement('div');
  group.id = TOGGLES_ID;
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Couches de la carte (bascule indépendante)');
  group.appendChild(ctx.el('p', '', 'Couches visibles sur la carte (plusieurs réponses possibles) :'));
  [
    ['graticule', 'Graticule 2°'],
    ['etiquettes', 'Noms des lieux'],
    ['nord', 'Repère nord'],
  ].forEach(([id, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('data-' + P + '-toggle', id);
    button.setAttribute('aria-pressed', S[id] ? 'true' : 'false');
    button.setAttribute('aria-label', `${label} : afficher ou masquer cette couche`);
    button.textContent = label;
    group.appendChild(button);
  });

  /* E069-07 : curseur de précision, avec aria-valuetext maintenu à jour. */
  const precisionRow = ctx.el('p', '');
  const precisionLabel = document.createElement('label');
  precisionLabel.setAttribute('for', PRECISION_ID);
  precisionLabel.appendChild(document.createTextNode('Décimales affichées : '));
  const precisionOut = ctx.el('span', P + '-value');
  precisionOut.id = PRECISION_OUT_ID;
  precisionLabel.appendChild(precisionOut);
  precisionRow.appendChild(precisionLabel);
  const precision = document.createElement('input');
  precision.type = 'range';
  precision.id = PRECISION_ID;
  precision.min = String(MIN_PRECISION);
  precision.max = String(MAX_PRECISION);
  precision.step = '1';
  precision.value = String(S.precision);
  precision.setAttribute('aria-label', 'Nombre de décimales, de 0 à 3');
  precision.setAttribute('aria-valuetext', precisionValuetext());
  precisionRow.appendChild(precision);

  /* E069-03 / E069-08 : canvas focalisable, étiqueté, équivalent clavier. */
  const carte = document.createElement('div');
  carte.id = CARTE_ID;
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Carte schématique de dix lieux (V2). Flèches gauche et droite : parcourir les lieux et afficher leur fiche ; flèches haut et bas : changer le nombre de décimales ; Origine : premier lieu ; Fin : dernier lieu ; Entrée ou Espace : lancer ou arrêter le défilement automatique ; Échap : effacer la sélection.');
  carte.appendChild(canvas);

  const identite = document.createElement('dl');
  identite.id = IDENTITE_ID;
  const coords = ctx.el('p', '');
  coords.id = COORDS_ID;
  const statut = ctx.el('p', P + '-statut');
  statut.id = STATUT_ID;

  const liste = document.createElement('ul');
  liste.id = LISTE_ID;
  liste.setAttribute('aria-label', 'Liste textuelle des lieux et de leurs coordonnées');

  /* E069-09 : unique région live, annoncée poliment. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* E069-08 : navigation dédiée, boutons larges, compteur borné. */
  const nav = ctx.el('div', P + '-nav');
  const prev = ctx.el('button', P + '-action', '← Lieu précédent');
  prev.type = 'button';
  prev.id = PREV_ID;
  const compte = ctx.el('span', P + '-compte');
  compte.id = P + '-compte';
  const next = ctx.el('button', P + '-action', 'Lieu suivant →');
  next.type = 'button';
  next.id = NEXT_ID;
  nav.append(prev, compte, next);

  const actions = ctx.el('div', P + '-nav');
  const reset = ctx.el('button', P + '-action', 'Réinitialiser l’affichage');
  reset.type = 'button';
  reset.id = RESET_ID;
  const anim = ctx.el('button', P + '-action', S.joue ? '■ Arrêter le défilement' : '▶ Défilement automatique');
  anim.type = 'button';
  anim.id = ANIM_ID;
  anim.setAttribute('aria-pressed', S.joue ? 'true' : 'false');
  actions.append(reset, anim);

  panel.append(
    title, lead,
    subRef, staticTable(), staticFacts(),
    subReglages, fieldset, group, precisionRow, precision,
    subCarte, carte,
    subFiche, identite, coords, statut, liste, readout,
    nav, actions,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: Array.from(panel.querySelectorAll('input[name="' + P + '-format"]')),
    toggles: Array.from(panel.querySelectorAll('[data-' + P + '-toggle]')),
    precision, precisionOut, canvas, identite, coords, liste, statut, readout,
    compte, prev, next, reset, anim,
  };
}

/* ---------- E069-04 : fiche d'identité remplie au clic ---------- */

function renderIdentite() {
  const n = S.nodes.identite;
  if (!n) return;
  n.textContent = '';
  const lieu = lieuSelectionne();
  const lignes = lieu ? [
    ['Nom', lieu.label],
    ['Rang', hierarchyLabel(lieu.rang)],
    ['Noms historiques', lieu.historique.length ? lieu.historique.join(' · ') : 'Aucun nom historique renseigné'],
    ['Fonctions attestées', lieu.fonctions.length ? lieu.fonctions.join(' · ') : 'Aucune fonction renseignée'],
    ['Mémoires et débats', lieu.memoires.length ? lieu.memoires.join(' · ') : 'Aucune mémoire renseignée'],
  ] : [
    ['Nom', 'Aucun lieu sélectionné'],
    ['Rang', '—'],
    ['Noms historiques', '—'],
    ['Fonctions attestées', '—'],
    ['Mémoires et débats', '—'],
  ];
  lignes.forEach(([terme, valeur]) => {
    const dt = document.createElement('dt');
    dt.textContent = terme;
    const dd = document.createElement('dd');
    dd.textContent = valeur;
    n.append(dt, dd);
  });
}

/* ---------- E069-05 : coordonnées duales, décimales et sexagésimales ---------- */

function renderCoords() {
  const n = S.nodes.coords;
  if (!n) return;
  n.textContent = '';
  const lieu = lieuSelectionne();
  if (!lieu) {
    n.textContent = 'Aucune coordonnée à afficher : sélectionnez un lieu sur la carte ou dans la liste.';
    return;
  }
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.appendChild(document.createTextNode('Décimales : latitude '));
  n.appendChild(fort(`${fmt3(lieu.lat)}° ${hemisphereLat(lieu.lat)}`));
  n.appendChild(document.createTextNode(' · longitude '));
  n.appendChild(fort(`${fmt3(lieu.lon)}° ${hemisphereLon(lieu.lon)}`));
  n.appendChild(document.createTextNode('. Sexagésimales : '));
  n.appendChild(fort(`${formatDms(lieu.lat, 0, hemisphereLat(lieu.lat))} · ${formatDms(lieu.lon, 0, hemisphereLon(lieu.lon))}.`));
  n.appendChild(document.createTextNode(' Le réglage de précision s’applique au bandeau de mesures et à la liste ; les secondes entières ci-dessus donnent la lecture de référence.'));
}

/* ---------- E069-08 : liste textuelle des lieux, aria-current ---------- */

function renderListe() {
  const liste = S.nodes.liste;
  if (!liste) return;
  liste.textContent = '';
  LIEUX.forEach((lieu) => {
    const li = document.createElement('li');
    const actif = lieu.id === S.selection;
    if (actif) {
      li.className = P + '-actif';
      li.setAttribute('aria-current', 'true');
    }
    li.textContent = `${lieu.label} — ${hierarchyLabel(lieu.rang)} · latitude ${latitudeFormatee(lieu)} · longitude ${longitudeFormatee(lieu)}`;
    liste.appendChild(li);
  });
}

/* ---------- E069-09 : bandeau de mesures comparées à une référence ---------- */

function updateReadout() {
  const n = S.nodes;
  const lieu = lieuSelectionne();
  if (n.statut) {
    const couches = [
      S.graticule ? 'graticule' : null,
      S.etiquettes ? 'étiquettes' : null,
      S.nord ? 'repère nord' : null,
    ].filter(Boolean).join(', ') || 'aucune';
    n.statut.textContent = `Affichage : ${nomFormat()}, ${S.precision} décimale${S.precision > 1 ? 's' : ''}. Couches : ${couches}.`;
  }
  if (n.compte) {
    const i = S.selection ? INDEX_PAR_ID[S.selection] : -1;
    n.compte.textContent = i >= 0 ? `Lieu ${i + 1} / ${LIEUX.length}` : 'Aucun lieu sélectionné';
  }
  if (n.prev) n.prev.disabled = !S.selection || INDEX_PAR_ID[S.selection] <= 0;
  if (n.next) n.next.disabled = !S.selection || INDEX_PAR_ID[S.selection] >= LIEUX.length - 1;

  if (!n.readout) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.readout.textContent = '';
  if (lieu) {
    n.readout.appendChild(document.createTextNode('Lieu sélectionné : '));
    n.readout.appendChild(fort(lieu.label));
    n.readout.appendChild(document.createTextNode(' — latitude '));
    n.readout.appendChild(fort(latitudeFormatee(lieu)));
    n.readout.appendChild(document.createTextNode(' · longitude '));
    n.readout.appendChild(fort(longitudeFormatee(lieu)));
    const m = mesuresDuLieu(lieu);
    n.readout.appendChild(document.createTextNode('. Écart au centre du cadre ≈ '));
    n.readout.appendChild(fort(`${fmt2(m.dist)} km`));
    n.readout.appendChild(document.createTextNode(' (référence : diagonale du cadre ≈ '));
    n.readout.appendChild(fort(`${fmt2(m.diag)} km`));
    n.readout.appendChild(document.createTextNode('), soit '));
    n.readout.appendChild(fort(`${fmt2(m.ratio)}×`));
    n.readout.appendChild(document.createTextNode(' la diagonale. '));
  } else {
    n.readout.appendChild(document.createTextNode('Aucun lieu sélectionné : cliquez un marqueur ou utilisez les flèches gauche et droite. '));
  }
  n.readout.appendChild(document.createTextNode('Étendue du corpus : '));
  n.readout.appendChild(fort(`${fmt1(AMP_LAT)}°`));
  n.readout.appendChild(document.createTextNode(' du sud au nord (référence 180° d’un pôle à l’autre, soit '));
  n.readout.appendChild(fort(`${fmt1((AMP_LAT / 180) * 100)} %`));
  n.readout.appendChild(document.createTextNode(') ; '));
  n.readout.appendChild(fort(`${fmt1(AMP_LON)}°`));
  n.readout.appendChild(document.createTextNode(' d’ouest en est (référence 360° d’un tour, soit '));
  n.readout.appendChild(fort(`${fmt1((AMP_LON / 360) * 100)} %`));
  n.readout.appendChild(document.createTextNode(`) ; ${N_NORD} lieux au nord sur ${LIEUX.length}, ${N_SUD} au sud ; ${N_EST} à l’est, ${N_OUEST} à l’ouest. Le clic ne modifie aucune coordonnée.`));
}

/* ---------- E069-03 : laboratoire canvas et géométrie partagée ---------- */

function geometry() {
  const cv = S.nodes.canvas;
  const cssW = (cv && cv.clientWidth) || 320;
  const cssH = (cv && cv.clientHeight) || 240;
  const pad = 16;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  return {
    cssW, cssH, pad, iw, ih,
    xFor: (lon) => pad + ((lon - CADRE.minLon) / (CADRE.maxLon - CADRE.minLon)) * iw,
    yFor: (lat) => pad + ((CADRE.maxLat - lat) / (CADRE.maxLat - CADRE.minLat)) * ih,
  };
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const geo = geometry();
  /* E069-10 : DPR plafonné à 2, un seul canvas dessiné par frame. */
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(geo.cssW * dpr);
  const bh = Math.round(geo.cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, geo.cssW, geo.cssH);

  /* Graticule : méridiens et parallèles tous les 2°. */
  if (S.graticule) {
    g.strokeStyle = 'rgba(255,255,255,.09)';
    g.lineWidth = 1;
    for (let lon = Math.ceil(CADRE.minLon / 2) * 2; lon <= CADRE.maxLon; lon += 2) {
      const x = geo.xFor(lon);
      g.beginPath();
      g.moveTo(x, geo.pad);
      g.lineTo(x, geo.pad + geo.ih);
      g.stroke();
    }
    for (let lat = Math.ceil(CADRE.minLat / 2) * 2; lat <= CADRE.maxLat; lat += 2) {
      const y = geo.yFor(lat);
      g.beginPath();
      g.moveTo(geo.pad, y);
      g.lineTo(geo.pad + geo.iw, y);
      g.stroke();
    }
  }

  g.strokeStyle = 'rgba(255,255,255,.2)';
  g.lineWidth = 1;
  g.strokeRect(geo.pad, geo.pad, geo.iw, geo.ih);

  /* Repères : cercle plein ; le lieu sélectionné reçoit une croix et un
     double cercle, jamais une couleur seule. */
  LIEUX.forEach((lieu) => {
    const x = geo.xFor(lieu.lon);
    const y = geo.yFor(lieu.lat);
    const actif = lieu.id === S.selection;
    g.beginPath();
    g.arc(x, y, actif ? 6 : 4, 0, Math.PI * 2);
    g.fillStyle = actif ? 'rgba(244,214,158,.95)' : 'rgba(214,207,193,.8)';
    g.fill();
    g.strokeStyle = actif ? '#ffffff' : 'rgba(8,12,18,.85)';
    g.lineWidth = actif ? 2 : 1;
    g.stroke();
    if (actif) {
      g.beginPath();
      g.moveTo(x - 11, y); g.lineTo(x + 11, y);
      g.moveTo(x, y - 11); g.lineTo(x, y + 11);
      g.strokeStyle = 'rgba(255,255,255,.9)';
      g.lineWidth = 1.2;
      g.stroke();
      g.beginPath();
      g.arc(x, y, 10, 0, Math.PI * 2);
      g.stroke();
    }
    if (S.etiquettes) {
      g.fillStyle = actif ? '#ffffff' : 'rgba(214,207,193,.72)';
      g.font = '9px sans-serif';
      g.fillText(lieu.label, x + 8, y + 3);
    }
  });

  /* Nord : repère textuel, jamais la couleur seule. */
  if (S.nord) {
    const nx = geo.cssW - geo.pad - 6;
    const ny = geo.pad + 6;
    g.strokeStyle = 'rgba(255,255,255,.75)';
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(nx, ny); g.lineTo(nx, ny + 16);
    g.moveTo(nx - 4, ny + 5); g.lineTo(nx, ny); g.lineTo(nx + 4, ny + 5);
    g.stroke();
    g.font = '10px sans-serif';
    g.fillText('N', nx - 4, ny + 28);
  }

  g.fillStyle = 'rgba(214,207,193,.75)';
  g.font = '10px sans-serif';
  g.fillText(CADRE.nom, geo.pad + 2, geo.cssH - 4);
}

function lieuSousPointeur(clientX, clientY) {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getBoundingClientRect !== 'function') return null;
  const rect = cv.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const geo = geometry();
  const x = ((clientX - rect.left) * geo.cssW) / rect.width;
  const y = ((clientY - rect.top) * geo.cssH) / rect.height;
  let meilleur = null;
  let distance = RAYON_HIT * RAYON_HIT;
  LIEUX.forEach((lieu) => {
    const dx = geo.xFor(lieu.lon) - x;
    const dy = geo.yFor(lieu.lat) - y;
    const d = dx * dx + dy * dy;
    if (d <= distance) {
      distance = d;
      meilleur = lieu;
    }
  });
  return meilleur;
}

function pointerSurCanvas(event) {
  const lieu = lieuSousPointeur(event.clientX, event.clientY);
  if (!lieu || lieu.id === S.selection) return;
  S.selection = lieu.id;
  S.sweep = INDEX_PAR_ID[lieu.id] / LIEUX.length;
  syncControls();
}

/* ---------- E069-09 : boucle rAF unique, pause document.hidden / hors écran ---------- */

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
  if (!S.onScreen) return;
  if (typeof ctxReduced === 'function' && !!ctxReduced()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen) return;
  /* Nouveauté V2 : la préférence est relue à chaque tick. */
  const reduced = typeof ctxReduced === 'function' && !!ctxReduced();
  if (reduced) { S.joue = false; syncControls(); return; }
  if (S.lastTs && S.joue) {
    const dt = Math.min(80, ts - S.lastTs);
    S.sweep = (S.sweep + dt * SWEEP_RATE) % 1;
  }
  S.lastTs = ts;
  if (S.joue) {
    const idx = Math.floor(S.sweep * LIEUX.length) % LIEUX.length;
    const cible = LIEUX[idx];
    if (S.selection !== cible.id) {
      S.selection = cible.id;
      renderIdentite();
      renderCoords();
      updateReadout();
      renderListe();
    }
  }
  drawLab();
  if (S.joue && !reduced) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E069-06/07/08/10 : contrôles, garde-fous, observer ---------- */

function setFormat(id) {
  if (id !== 'decimal' && id !== 'dms') return;
  S.format = id;
  syncControls();
}

function setPrecision(value) {
  const n = Math.round(Number(value));
  S.precision = clamp(Number.isFinite(n) ? n : 2, MIN_PRECISION, MAX_PRECISION);
  syncControls();
}

function setSelection(id) {
  if (id !== null && !Object.prototype.hasOwnProperty.call(INDEX_PAR_ID, id)) return;
  S.selection = id;
  if (id !== null) S.sweep = INDEX_PAR_ID[id] / LIEUX.length;
  syncControls();
}

function stepSelection(step) {
  const i = S.selection ? INDEX_PAR_ID[S.selection] : -1;
  const base = i < 0 ? 0 : i;
  setSelection(LIEUX[(base + step + LIEUX.length) % LIEUX.length].id);
}

function toggleCouche(id) {
  if (id !== 'graticule' && id !== 'etiquettes' && id !== 'nord') return;
  S[id] = !S[id];
  syncControls();
}

function toggleAnimation() {
  S.joue = !S.joue;
  if (!S.joue) stopLoop(); else startLoop();
  syncControls();
}

function resetAll() {
  S.format = 'decimal';
  S.graticule = true;
  S.etiquettes = true;
  S.nord = true;
  S.precision = 2;
  S.selection = LIEUX[0].id;
  S.sweep = 0;
  S.joue = false;
  stopLoop();
  syncControls();
}

function syncControls() {
  const n = S.nodes;
  if (n.radios) n.radios.forEach((radio) => { radio.checked = radio.value === S.format; });
  if (n.toggles) {
    n.toggles.forEach((b) => {
      b.setAttribute('aria-pressed', S[b.getAttribute('data-' + P + '-toggle')] ? 'true' : 'false');
    });
  }
  if (n.precision) {
    n.precision.value = String(S.precision);
    n.precision.setAttribute('aria-valuetext', precisionValuetext());
  }
  if (n.precisionOut) n.precisionOut.textContent = `${S.precision}`;
  if (n.anim) {
    n.anim.textContent = S.joue ? '■ Arrêter le défilement' : '▶ Défilement automatique';
    n.anim.setAttribute('aria-pressed', S.joue ? 'true' : 'false');
  }
  renderIdentite();
  renderCoords();
  updateReadout();
  renderListe();
  drawLab();
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      const reduced = typeof ctxReduced === 'function' && !!ctxReduced();
      if (document.hidden) stopLoop();
      else if (S.joue && !reduced) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.setAttribute(REDUCED_ATTR, mq.matches ? '1' : '0');
        if (mq.matches) { S.joue = false; stopLoop(); syncControls(); }
        else if (S.joue) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* Nouveauté V2 : suspension du défilement hors écran. */
function ensureObserver(canvas) {
  if (typeof IntersectionObserver !== 'function') { S.onScreen = true; return; }
  if (S.io && S.ioCanvas === canvas) return;
  if (S.io) S.io.disconnect();
  S.io = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    S.onScreen = entry ? entry.isIntersecting : true;
    if (!S.onScreen) stopLoop();
    else if (S.joue) startLoop();
  }, { threshold: 0.01 });
  S.io.observe(canvas);
  S.ioCanvas = canvas;
}

/* ---------- Point d'entrée ---------- */

register('E069', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E069-01 : bloc CSS isolé, une seule fois, identifiants préfixés. */
  ctx.css(P, CSS);

  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;

  S.nodes = ensurePanel(ctx);
  S.nodes.panel.setAttribute(REDUCED_ATTR, reduced ? '1' : '0');
  if (reduced) { S.joue = false; stopLoop(); }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) setFormat(radio.value);
      });
    });
    n.toggles.forEach((button) => {
      button.addEventListener('click', () => toggleCouche(button.getAttribute('data-' + P + '-toggle')));
    });
    n.precision.addEventListener('input', () => setPrecision(n.precision.value));
    n.prev.addEventListener('click', () => stepSelection(-1));
    n.next.addEventListener('click', () => stepSelection(1));
    n.reset.addEventListener('click', resetAll);
    n.anim.addEventListener('click', toggleAnimation);
    n.canvas.addEventListener('pointerdown', pointerSurCanvas);
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      const ordre = LIEUX.map((lieu) => lieu.id);
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        stepSelection(event.key === 'ArrowRight' ? 1 : -1);
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        setPrecision(S.precision + (event.key === 'ArrowUp' ? 1 : -1));
      } else if (event.key === 'Home') {
        setSelection(ordre[0]);
      } else if (event.key === 'End') {
        setSelection(ordre[ordre.length - 1]);
      } else if (event.key === 'Enter' || event.key === ' ') {
        toggleAnimation();
      } else if (event.key === 'Escape') {
        setSelection(null);
      } else {
        used = false;
      }
      if (used) event.preventDefault();
    });
    ensureObserver(n.canvas);
  }

  installGlobalListeners();
  if (S.joue && !reduced) startLoop();
});
