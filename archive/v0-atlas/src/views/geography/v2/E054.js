import { register } from './registry.js';

/* Lentille E054 (V2) — vue GEOGRAPHIE.
 * Thème : lecture des coordonnées au survol des marqueurs.
 *
 * Les dix chantiers E054-01 … E054-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E054.md. Les dix sont réellement
 * implémentés : aucun stub, aucune fonction vide. Tout est local : aucune
 * requête réseau, aucune graine aléatoire, aucune sortie console, aucun
 * fichier partagé modifié. Le contenu pédagogique est du texte sémantique
 * réel (titres, paragraphes, tableau, radiogroupe, liste, légende) présent
 * dans le DOM même sans animation ; le canvas n'est qu'un laboratoire qui
 * illustre la lecture d'une paire (latitude, longitude) déjà présente dans
 * le référentiel.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e054- (identifiants, classes, attributs,
 * noms de groupes et bloc CSS).
 *
 * Nouveautés V2 par rapport à la passe 1 : rôle `radiogroup` explicite,
 * `aria-valuetext` maintenu à jour sur le curseur de précision,
 * `ctx.reducedMotion()` relu à chaque tick (et pas seulement au montage),
 * IntersectionObserver suspendant le balayage hors écran, garde-fous
 * d'écouteurs entre rendus, cibles ≥ 36 px.
 */

const P = 'geography-v2-e054';

/* Identifiants, tous préfixés geography-v2-e054-. */
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
const BULLE_ID = P + '-bulle';
const LEGENDE_ID = P + '-legende';
const LISTE_ID = P + '-liste';
const STATUT_ID = P + '-statut';
const READOUT_ID = P + '-readout';
const RESET_ID = P + '-reset';
const ANIM_ID = P + '-anim';
const REDUCED_ATTR = 'data-' + P + '-reduced';

const MIN_PRECISION = 0;
const MAX_PRECISION = 4;
const RAYON_HIT = 14;
const SWEEP_RATE = 0.00012;

/* Corpus local, déterministe et sans invention de source : repères mondiaux
   bien connus, coordonnées publiques arrondies au dixième de millième de
   degré. Le signe est conservé dans les données ; l'affichage le remplace
   par un hémisphère (N/S, E/O). */
const REPERES = [
  { id: 'paris', label: 'Paris', pays: 'France', lat: 48.8566, lon: 2.3522 },
  { id: 'marseille', label: 'Marseille', pays: 'France', lat: 43.2965, lon: 5.3698 },
  { id: 'londres', label: 'Londres', pays: 'Royaume-Uni', lat: 51.5074, lon: -0.1278 },
  { id: 'new-york', label: 'New York', pays: 'États-Unis', lat: 40.7128, lon: -74.0060 },
  { id: 'rio', label: 'Rio de Janeiro', pays: 'Brésil', lat: -22.9068, lon: -43.1729 },
  { id: 'caire', label: 'Le Caire', pays: 'Égypte', lat: 30.0444, lon: 31.2357 },
  { id: 'pekin', label: 'Pékin', pays: 'Chine', lat: 39.9042, lon: 116.4074 },
  { id: 'tokyo', label: 'Tokyo', pays: 'Japon', lat: 35.6762, lon: 139.6503 },
  { id: 'sydney', label: 'Sydney', pays: 'Australie', lat: -33.8688, lon: 151.2093 },
  { id: 'cap', label: 'Le Cap', pays: 'Afrique du Sud', lat: -33.9249, lon: 18.4241 },
];

const LATITUDES = REPERES.map((r) => r.lat);
const LONGITUDES = REPERES.map((r) => r.lon);
const AMP_LAT = Math.max(...LATITUDES) - Math.min(...LATITUDES);
const AMP_LON = Math.max(...LONGITUDES) - Math.min(...LONGITUDES);
const N_NORD = REPERES.filter((r) => r.lat >= 0).length;
const N_SUD = REPERES.length - N_NORD;
const N_EST = REPERES.filter((r) => r.lon >= 0).length;
const N_OUEST = REPERES.length - N_EST;
const INDEX_PAR_ID = {};
REPERES.forEach((r, i) => { INDEX_PAR_ID[r.id] = i; });

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  format: 'decimal',
  graticule: true,
  axes: true,
  etiquettes: true,
  precision: 2,
  pointe: REPERES[0].id,
  joue: false,
  sweep: INDEX_PAR_ID[REPERES[0].id] / REPERES.length,
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

const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
const virgule = (n) => String(n).replace('.', ',');
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function hemisphereLat(lat) {
  return lat >= 0 ? 'N' : 'S';
}

function hemisphereLon(lon) {
  return lon >= 0 ? 'E' : 'O';
}

function formatDecimal(valeur, precision, hemisphere) {
  const bornes = clamp(precision, MIN_PRECISION, MAX_PRECISION);
  return `${virgule(Math.abs(valeur).toFixed(bornes))}° ${hemisphere}`;
}

function formatDms(valeur, precision, hemisphere) {
  const bornes = clamp(precision, MIN_PRECISION, MAX_PRECISION);
  const facteur = Math.pow(10, bornes);
  const minutesTotales = Math.round(Math.abs(valeur) * 60 * facteur) / facteur;
  const degres = Math.floor(minutesTotales / 60);
  const minutes = minutesTotales - degres * 60;
  return `${degres}° ${virgule(minutes.toFixed(bornes))}′ ${hemisphere}`;
}

function valeurFormatee(valeur, estLatitude) {
  const hemisphere = estLatitude ? hemisphereLat(valeur) : hemisphereLon(valeur);
  if (S.format === 'dms') return formatDms(valeur, S.precision, hemisphere);
  return formatDecimal(valeur, S.precision, hemisphere);
}

const latitudeFormatee = (repere) => valeurFormatee(repere.lat, true);
const longitudeFormatee = (repere) => valeurFormatee(repere.lon, false);
const reperePointe = () => REPERES[INDEX_PAR_ID[S.pointe]] || null;
const nomFormat = () => (S.format === 'dms' ? 'degrés, minutes' : 'degrés décimaux');
const precisionValuetext = () => `${S.precision} décimale${S.precision > 1 ? 's' : ''}`;

/* ---------- E054-01 : bloc CSS unique, préfixé, sans réseau ---------- */

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
#${CARTE_ID}{position:relative;margin:8px 0}
#${CANVAS_ID}{
  display:block;width:100%;height:240px;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${BULLE_ID}{
  position:absolute;z-index:2;pointer-events:none;display:none;
  max-width:210px;padding:5px 7px;border:1px solid var(--gold,#e6b96f);
  border-radius:7px;background:rgba(8,12,18,.94);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.45;font-variant-numeric:tabular-nums;
  box-shadow:0 3px 12px rgba(0,0,0,.45);
}
#${BULLE_ID} strong{color:#fff}
#${LEGENDE_ID}{font-size:10px;color:var(--muted)}
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
#${PANEL_ID} button.${P}-action{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button.${P}-action:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,
#${TOGGLES_ID} button{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button{transition:none!important;animation:none!important}
}
/* Le panneau s'adapte lui-même à son conteneur. */
@container (max-width: 520px){
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:200px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* ---------- E054-01 : section sémantique, lisible sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une coordonnée géographique est une paire ordonnée (latitude, longitude) : la latitude mesure l’écart angulaire à l’équateur, la longitude l’écart angulaire au méridien de Greenwich.',
    'Une latitude est comprise entre 90° S et 90° N, une longitude entre 180° O et 180° E. Dans un affichage lisible, le signe du nombre est remplacé par un hémisphère : N ou S pour la latitude, E ou O pour la longitude.',
    'Survoler un marqueur ne déplace aucun repère : cela révèle une donnée déjà présente dans le référentiel. Chaque nombre affiché doit pouvoir être retrouvé dans le tableau et vérifié par le calcul.',
    'Limite falsifiable : prédire la latitude et la longitude d’un repère, régler le format et la précision, puis vérifier que le survol ne change jamais la paire ordonnée ; essayer ensuite de faire varier le repère par le seul survol pour contredire l’idée que le pointeur crée une donnée.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E054-02 : tableau de référence recalculé par formule ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Référentiel : dix repères, coordonnées en degrés décimaux à deux décimales. La ligne « Étendue » donne les amplitudes de référence (180° d’un pôle à l’autre, 360° pour un tour complet).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Repère', 'Pays', 'Latitude', 'Longitude'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  REPERES.forEach((r) => {
    const tr = document.createElement('tr');
    const cellules = [
      [r.label, true],
      [r.pays, false],
      [`${virgule(Math.abs(r.lat).toFixed(2))}° ${hemisphereLat(r.lat)}`, false],
      [`${virgule(Math.abs(r.lon).toFixed(2))}° ${hemisphereLon(r.lon)}`, false],
    ];
    cellules.forEach(([texte, estEnTete], i) => {
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
  ['Étendue', '—', `${fmt1(AMP_LAT)}° sur 180°`, `${fmt1(AMP_LON)}° sur 360°`].forEach((texte, i) => {
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
      bulle: document.getElementById(BULLE_ID),
      liste: document.getElementById(LISTE_ID),
      statut: document.getElementById(STATUT_ID),
      readout: document.getElementById(READOUT_ID),
      legend: document.getElementById(LEGENDE_ID),
      reset: document.getElementById(RESET_ID),
      anim: document.getElementById(ANIM_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Lire les coordonnées au survol d’un marqueur (V2)');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Une carte ne donne pas seulement des noms : chaque repère porte une latitude et une longitude. Survolez un marqueur du laboratoire ou utilisez les flèches du clavier pour révéler ses coordonnées, puis changez de format pour voir le même nombre s’écrire autrement.');

  const subRef = ctx.el('h3', '', 'Référentiel des repères');
  const subReglages = ctx.el('h3', '', 'Réglages de l’affichage');
  const subCarte = ctx.el('h3', '', 'Laboratoire : survol des marqueurs');
  const subListe = ctx.el('h3', '', 'Coordonnées en texte');

  /* E054-04 : choix unique -> radiogroupe natif et rôle explicite. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = FORMAT_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Format des coordonnées affichées (choix unique)');
  const legendFmt = document.createElement('legend');
  legendFmt.textContent = 'Format des coordonnées affichées (choix unique)';
  fieldset.appendChild(legendFmt);
  [
    ['decimal', 'Degrés décimaux', FORMAT_DEC_ID],
    ['dms', 'Degrés et minutes', FORMAT_DMS_ID],
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

  /* E054-06 : bascules indépendantes -> aria-pressed autorisé. */
  const group = document.createElement('div');
  group.id = TOGGLES_ID;
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Couches de la carte (bascule indépendante)');
  const intro = ctx.el('p', '', 'Couches visibles sur la carte (plusieurs réponses possibles) :');
  group.appendChild(intro);
  [
    ['graticule', 'Graticule 30°'],
    ['axes', 'Équateur et Greenwich'],
    ['etiquettes', 'Noms des repères'],
  ].forEach(([id, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('data-' + P + '-toggle', id);
    button.setAttribute('aria-pressed', S[id] ? 'true' : 'false');
    button.setAttribute('aria-label', `${label} : afficher ou masquer cette couche`);
    button.textContent = label;
    group.appendChild(button);
  });

  /* E054-05 : curseur de précision, avec aria-valuetext maintenu à jour. */
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
  precision.setAttribute('aria-label', 'Nombre de décimales, de 0 à 4');
  precision.setAttribute('aria-valuetext', precisionValuetext());
  precisionRow.appendChild(precision);

  /* E054-03 / E054-08 : canvas focalisable, étiqueté, équivalent clavier. */
  const carte = document.createElement('div');
  carte.id = CARTE_ID;
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Carte schématique de dix repères (V2). Flèches gauche et droite : parcourir les repères et afficher leurs coordonnées ; flèches haut et bas : changer le nombre de décimales ; Origine : premier repère ; Fin : dernier repère ; Entrée ou Espace : lancer ou arrêter le survol automatique ; Échap : effacer le repère pointé.');
  const bulle = document.createElement('div');
  bulle.id = BULLE_ID;
  bulle.setAttribute('aria-hidden', 'true');
  carte.append(canvas, bulle);

  const legend = ctx.el('p', P + '-legend', 'Trait plein = équateur (latitude 0°) ; trait tireté = méridien de Greenwich (longitude 0°) ; grille fine = parallèles et méridiens tous les 30°. Le repère pointé porte un double cercle et ses deux projections sur les axes. Aucune information n’est portée par la seule couleur.');
  legend.id = LEGENDE_ID;

  const statut = ctx.el('p', P + '-statut');
  statut.id = STATUT_ID;

  const liste = document.createElement('ul');
  liste.id = LISTE_ID;
  liste.setAttribute('aria-label', 'Liste textuelle des repères et de leurs coordonnées');

  /* E054-07 : unique région live, annoncée poliment. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const actions = ctx.el('div', P + '-actions');
  const reset = ctx.el('button', P + '-action', 'Réinitialiser l’affichage');
  reset.type = 'button';
  reset.id = RESET_ID;
  const anim = ctx.el('button', P + '-action', S.joue ? '■ Arrêter le survol automatique' : '▶ Survol automatique');
  anim.type = 'button';
  anim.id = ANIM_ID;
  anim.setAttribute('aria-pressed', S.joue ? 'true' : 'false');
  actions.append(reset, anim);

  panel.append(
    title, lead,
    subRef, staticTable(), staticFacts(),
    subReglages, fieldset, group, precisionRow, precision,
    subCarte, carte, legend,
    subListe, statut, liste, readout, actions,
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
    precision, precisionOut, canvas, bulle, liste, statut, readout, legend, reset, anim,
  };
}

/* ---------- E054-06 : liste textuelle des coordonnées ---------- */

function renderListe() {
  const liste = S.nodes.liste;
  if (!liste) return;
  liste.textContent = '';
  REPERES.forEach((r) => {
    const li = document.createElement('li');
    const actif = r.id === S.pointe;
    if (actif) {
      li.className = P + '-actif';
      li.setAttribute('aria-current', 'true');
    }
    li.textContent = `${r.label} — ${r.pays} · latitude ${latitudeFormatee(r)} · longitude ${longitudeFormatee(r)}`;
    liste.appendChild(li);
  });
}

/* ---------- E054-07 : grandeurs chiffrées comparées à une référence ---------- */

function updateReadout() {
  const n = S.nodes;
  const repere = reperePointe();
  if (n.statut) {
    const couches = [
      S.graticule ? 'graticule' : null,
      S.axes ? 'équateur et méridien' : null,
      S.etiquettes ? 'étiquettes' : null,
    ].filter(Boolean).join(', ') || 'aucune';
    n.statut.textContent = `Affichage : ${nomFormat()}, ${S.precision} décimale${S.precision > 1 ? 's' : ''}. Couches : ${couches}.`;
  }
  if (!n.readout) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.readout.textContent = '';
  if (repere) {
    n.readout.appendChild(document.createTextNode('Repère pointé : '));
    n.readout.appendChild(fort(repere.label));
    n.readout.appendChild(document.createTextNode(' — latitude '));
    n.readout.appendChild(fort(latitudeFormatee(repere)));
    n.readout.appendChild(document.createTextNode(' · longitude '));
    n.readout.appendChild(fort(longitudeFormatee(repere)));
    n.readout.appendChild(document.createTextNode('. '));
  } else {
    n.readout.appendChild(document.createTextNode('Aucun repère pointé : survolez un marqueur ou utilisez les flèches gauche et droite. '));
  }
  n.readout.appendChild(document.createTextNode('Étendue du corpus : '));
  n.readout.appendChild(fort(`${fmt1(AMP_LAT)}°`));
  n.readout.appendChild(document.createTextNode(' du sud au nord (référence 180° d’un pôle à l’autre, soit '));
  n.readout.appendChild(fort(`${fmt1((AMP_LAT / 180) * 100)} %`));
  n.readout.appendChild(document.createTextNode(') ; '));
  n.readout.appendChild(fort(`${fmt1(AMP_LON)}°`));
  n.readout.appendChild(document.createTextNode(' d’ouest en est (référence 360° d’un tour, soit '));
  n.readout.appendChild(fort(`${fmt1((AMP_LON / 360) * 100)} %`));
  n.readout.appendChild(document.createTextNode(`) ; ${N_NORD} repères au nord sur ${REPERES.length}, ${N_SUD} au sud ; ${N_EST} à l’est, ${N_OUEST} à l’ouest. Le survol ne modifie aucune coordonnée.`));
}

/* ---------- E054-03 : laboratoire canvas et géométrie partagée ---------- */

function geometry() {
  const cv = S.nodes.canvas;
  const cssW = (cv && cv.clientWidth) || 320;
  const cssH = (cv && cv.clientHeight) || 240;
  const pad = 16;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  return {
    cssW, cssH, pad, iw, ih,
    xFor: (lon) => pad + ((lon + 180) / 360) * iw,
    yFor: (lat) => pad + ((90 - lat) / 180) * ih,
  };
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const geo = geometry();
  /* E054-10 : DPR plafonné à 2. */
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(geo.cssW * dpr);
  const bh = Math.round(geo.cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, geo.cssW, geo.cssH);

  /* Graticule : méridiens et parallèles tous les 30°. */
  if (S.graticule) {
    g.strokeStyle = 'rgba(255,255,255,.09)';
    g.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = geo.xFor(lon);
      g.beginPath();
      g.moveTo(x, geo.pad);
      g.lineTo(x, geo.pad + geo.ih);
      g.stroke();
    }
    for (let lat = -90; lat <= 90; lat += 30) {
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

  /* Équateur (trait plein) et méridien de Greenwich (tireté). */
  if (S.axes) {
    g.strokeStyle = 'rgba(244,214,158,.85)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(geo.pad, geo.yFor(0));
    g.lineTo(geo.pad + geo.iw, geo.yFor(0));
    g.stroke();
    if (g.setLineDash) g.setLineDash([4, 3]);
    g.strokeStyle = 'rgba(214,207,193,.75)';
    g.beginPath();
    g.moveTo(geo.xFor(0), geo.pad);
    g.lineTo(geo.xFor(0), geo.pad + geo.ih);
    g.stroke();
    if (g.setLineDash) g.setLineDash([]);
    g.fillStyle = 'rgba(244,214,158,.9)';
    g.font = '9px sans-serif';
    g.fillText('équateur 0°', geo.pad + 2, geo.yFor(0) - 3);
    g.fillText('Greenwich 0°', geo.xFor(0) + 3, geo.pad + 10);
  }

  /* Repères : cercle plein ; le repère pointé reçoit un double cercle et ses
     projections sur les deux axes (lecture géométrique des coordonnées). */
  REPERES.forEach((r) => {
    const x = geo.xFor(r.lon);
    const y = geo.yFor(r.lat);
    const actif = r.id === S.pointe;
    if (actif) {
      if (g.setLineDash) g.setLineDash([3, 3]);
      g.strokeStyle = 'rgba(255,255,255,.55)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(geo.pad, y);
      g.lineTo(x, y);
      g.moveTo(x, geo.pad + geo.ih);
      g.lineTo(x, y);
      g.stroke();
      if (g.setLineDash) g.setLineDash([]);
    }
    g.beginPath();
    g.arc(x, y, actif ? 6 : 4, 0, Math.PI * 2);
    g.fillStyle = actif ? 'rgba(244,214,158,.95)' : 'rgba(214,207,193,.8)';
    g.fill();
    g.strokeStyle = actif ? '#ffffff' : 'rgba(8,12,18,.85)';
    g.lineWidth = actif ? 2 : 1;
    g.stroke();
    if (actif) {
      g.beginPath();
      g.arc(x, y, 10, 0, Math.PI * 2);
      g.strokeStyle = 'rgba(255,255,255,.9)';
      g.lineWidth = 1.4;
      g.stroke();
    }
    if (S.etiquettes) {
      g.fillStyle = actif ? '#ffffff' : 'rgba(214,207,193,.72)';
      g.font = '9px sans-serif';
      g.fillText(r.label, x + 8, y + 3);
    }
  });
}

function updateBulle() {
  const bulle = S.nodes.bulle;
  if (!bulle) return;
  const repere = reperePointe();
  if (!repere) {
    bulle.style.display = 'none';
    return;
  }
  const geo = geometry();
  const x = geo.xFor(repere.lon);
  const y = geo.yFor(repere.lat);
  bulle.textContent = '';
  const nom = document.createElement('strong');
  nom.textContent = repere.label;
  bulle.appendChild(nom);
  bulle.appendChild(document.createTextNode(` — ${latitudeFormatee(repere)} · ${longitudeFormatee(repere)}`));
  bulle.style.left = `${Math.max(2, Math.min(geo.cssW - 170, x + 12))}px`;
  bulle.style.top = `${Math.max(2, y - 34)}px`;
  bulle.style.display = 'block';
}

function repereSousPointeur(clientX, clientY) {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getBoundingClientRect !== 'function') return null;
  const rect = cv.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const geo = geometry();
  const x = ((clientX - rect.left) * geo.cssW) / rect.width;
  const y = ((clientY - rect.top) * geo.cssH) / rect.height;
  let meilleur = null;
  let distance = RAYON_HIT * RAYON_HIT;
  REPERES.forEach((r) => {
    const dx = geo.xFor(r.lon) - x;
    const dy = geo.yFor(r.lat) - y;
    const d = dx * dx + dy * dy;
    if (d <= distance) {
      distance = d;
      meilleur = r;
    }
  });
  return meilleur;
}

function pointerSurCanvas(event) {
  const repere = repereSousPointeur(event.clientX, event.clientY);
  if (!repere) return;
  if (repere.id !== S.pointe) {
    S.pointe = repere.id;
    S.sweep = INDEX_PAR_ID[repere.id] / REPERES.length;
    updateReadout();
    renderListe();
    drawLab();
  }
  updateBulle();
}

/* ---------- E054-09 : boucle rAF unique, pause document.hidden / hors écran ---------- */

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
    const idx = Math.floor(S.sweep * REPERES.length) % REPERES.length;
    const cible = REPERES[idx];
    if (S.pointe !== cible.id) {
      S.pointe = cible.id;
      updateReadout();
      renderListe();
    }
    updateBulle();
  }
  drawLab();
  if (S.joue && !reduced) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E054-04/05/06/10 : contrôles, garde-fous, observer ---------- */

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

function setPointe(id) {
  if (!Object.prototype.hasOwnProperty.call(INDEX_PAR_ID, id)) return;
  S.pointe = id;
  S.sweep = INDEX_PAR_ID[id] / REPERES.length;
  syncControls();
}

function toggleCouche(id) {
  if (id !== 'graticule' && id !== 'axes' && id !== 'etiquettes') return;
  S[id] = !S[id];
  syncControls();
}

function toggleAnimation() {
  S.joue = !S.joue;
  if (!S.joue) stopLoop(); else startLoop();
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
    n.anim.textContent = S.joue ? '■ Arrêter le survol automatique' : '▶ Survol automatique';
    n.anim.setAttribute('aria-pressed', S.joue ? 'true' : 'false');
  }
  updateReadout();
  renderListe();
  drawLab();
  updateBulle();
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

/* Nouveauté V2 : suspension du balayage hors écran. */
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

register('E054', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E054-01 : bloc CSS isolé, une seule fois, identifiants préfixés. */
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
    n.reset.addEventListener('click', () => {
      S.format = 'decimal';
      S.graticule = true;
      S.axes = true;
      S.etiquettes = true;
      S.precision = 2;
      S.pointe = REPERES[0].id;
      S.sweep = INDEX_PAR_ID[REPERES[0].id] / REPERES.length;
      S.joue = false;
      stopLoop();
      syncControls();
    });
    n.anim.addEventListener('click', toggleAnimation);
    n.canvas.addEventListener('pointermove', pointerSurCanvas);
    n.canvas.addEventListener('pointerdown', pointerSurCanvas);
    n.canvas.addEventListener('pointerleave', () => { updateBulle(); });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      const ordre = REPERES.map((r) => r.id);
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = ordre.indexOf(S.pointe);
        const base = i < 0 ? 0 : i;
        setPointe(ordre[(base + step + ordre.length) % ordre.length]);
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        setPrecision(S.precision + (event.key === 'ArrowUp' ? 1 : -1));
      } else if (event.key === 'Home') {
        setPointe(ordre[0]);
      } else if (event.key === 'End') {
        setPointe(ordre[ordre.length - 1]);
      } else if (event.key === 'Enter' || event.key === ' ') {
        toggleAnimation();
      } else if (event.key === 'Escape') {
        S.pointe = null;
        syncControls();
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
