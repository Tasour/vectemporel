import { register } from './registry.js';

/* Lentille E054 — vue GEOGRAPHIE.
 * Thème : affichage des coordonnées au survol des marqueurs.
 *
 * Les dix chantiers E054-01 … E054-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E054.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, liste, fieldset) présent dans le DOM même sans
 * animation ni interaction ; le canvas n'est qu'un laboratoire qui illustre
 * la lecture des coordonnées (latitude, longitude) d'un repère pointé.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e054';
const PANEL_ID = 'geography-e054-panel';
const TITLE_ID = 'geography-e054-title';
const TABLE_ID = 'geography-e054-table';
const FORMAT_ID = 'geography-e054-format';
const TOGGLES_ID = 'geography-e054-toggles';
const PRECISION_ID = 'geography-e054-precision';
const PRECISION_OUT_ID = 'geography-e054-precision-value';
const CARTE_ID = 'geography-e054-carte';
const CANVAS_ID = 'geography-e054-canvas';
const BULLE_ID = 'geography-e054-bulle';
const LEGENDE_ID = 'geography-e054-legende';
const LISTE_ID = 'geography-e054-liste';
const STATUT_ID = 'geography-e054-statut';
const READOUT_ID = 'geography-e054-readout';
const RESET_ID = 'geography-e054-reset';
const ANIM_ID = 'geography-e054-anim';

const MIN_PRECISION = 0;
const MAX_PRECISION = 4;
const RAYON_HIT = 14;

/* Corpus local, déterministe et sans invention de source : ce sont des repères
   mondiaux bien connus, associés à des coordonnées publiques arrondies au
   dixième de millième de degré. Le signe est conservé dans les données ;
   l'affichage le remplace par un hémisphère (N/S, E/O). */
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

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
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
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée à la volée) ---------- */

const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
const virgule = (n) => String(n).replace('.', ',');

function hemisphereLat(lat) {
  return lat >= 0 ? 'N' : 'S';
}

function hemisphereLon(lon) {
  return lon >= 0 ? 'E' : 'O';
}

function formatDecimal(valeur, precision, hemisphere) {
  const bornes = Math.max(MIN_PRECISION, Math.min(MAX_PRECISION, precision));
  return `${virgule(Math.abs(valeur).toFixed(bornes))}° ${hemisphere}`;
}

function formatDms(valeur, precision, hemisphere) {
  const bornes = Math.max(MIN_PRECISION, Math.min(MAX_PRECISION, precision));
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

function latitudeFormatee(repere) {
  return valeurFormatee(repere.lat, true);
}

function longitudeFormatee(repere) {
  return valeurFormatee(repere.lon, false);
}

function reperePointe() {
  return REPERES[INDEX_PAR_ID[S.pointe]] || null;
}

function nomFormat() {
  return S.format === 'dms'
    ? 'degrés, minutes'
    : 'degrés décimaux';
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e054-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e054-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e054-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e054-panel p{margin:5px 0;max-width:68ch}
#geography-e054-panel .geography-e054-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e054-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e054-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e054-table th,#geography-e054-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e054-table thead th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e054-table tfoot th,#geography-e054-table tfoot td{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e054-format{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e054-format legend{padding:0 4px;color:var(--muted)}
#geography-e054-panel .geography-e054-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e054-panel .geography-e054-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e054-toggles{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
#geography-e054-toggles button{
  min-height:44px;padding:6px 10px;border:1px solid var(--line);border-radius:999px;
  background:transparent;color:var(--muted);font:inherit;font-size:10px;cursor:pointer;
}
#geography-e054-toggles button[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);color:var(--gold-bright,#f4d69e);background:rgba(230,185,111,.1);
}
#geography-e054-precision{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e054-precision-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e054-carte{position:relative;margin:8px 0}
#geography-e054-canvas{
  display:block;width:100%;height:230px;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e054-bulle{
  position:absolute;z-index:2;pointer-events:none;display:none;
  max-width:210px;padding:5px 7px;border:1px solid var(--gold,#e6b96f);
  border-radius:7px;background:rgba(8,12,18,.94);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.45;font-variant-numeric:tabular-nums;
  box-shadow:0 3px 12px rgba(0,0,0,.45);
}
#geography-e054-bulle strong{color:#fff}
#geography-e054-legende{font-size:10px;color:var(--muted)}
#geography-e054-statut{font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}
#geography-e054-liste{list-style:none;margin:6px 0;padding:0}
#geography-e054-liste li+li{margin-top:3px}
#geography-e054-liste li{
  padding:5px 8px;border:1px solid var(--line);border-radius:7px;
  background:rgba(255,255,255,.02);font-size:10px;font-variant-numeric:tabular-nums;
}
#geography-e054-liste li.geography-e054-actif{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.1);color:var(--gold-bright,#f4d69e);
}
#geography-e054-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e054-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e054-panel .geography-e054-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
#geography-e054-panel button.geography-e054-action{
  display:inline-block;width:auto;min-height:44px;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#geography-e054-panel button.geography-e054-action:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e054-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-e054-panel[data-geography-e054-reduced="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e054-panel button{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e054-panel{font-size:10px;padding:9px}
  #geography-e054-canvas{height:190px}
  #geography-e054-panel .geography-e054-choix{margin-right:4px}
}
`;

/* ---------- E054-01 : section sémantique d'introduction (lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une coordonnée géographique est une paire ordonnée (latitude, longitude) : la latitude mesure l’écart angulaire à l’équateur, la longitude l’écart angulaire au méridien de Greenwich.',
    'Une latitude est comprise entre 90° S et 90° N, une longitude entre 180° O et 180° E. Dans un affichage lisible, le signe du nombre est remplacé par un hémisphère : N ou S pour la latitude, E ou O pour la longitude.',
    'Survoler un marqueur ne déplace aucun repère : cela révèle une donnée déjà présente dans le référentiel. Chaque nombre affiché doit pouvoir être retrouvé dans le tableau et vérifié par le calcul.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e054-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E054-02 : tableau de référence des coordonnées ---------- */

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

/* ---------- E054-03 : format d'affichage en choix unique (radios) ---------- */

function buildFormatField() {
  const fieldset = document.createElement('fieldset');
  fieldset.id = FORMAT_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Format des coordonnées affichées (choix unique)';
  fieldset.appendChild(legend);
  const options = [
    { id: 'decimal', label: 'Degrés décimaux' },
    { id: 'dms', label: 'Degrés et minutes' },
  ];
  options.forEach((o) => {
    const lab = document.createElement('label');
    lab.className = 'geography-e054-choix';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e054-format';
    radio.id = `geography-e054-format-${o.id}`;
    radio.value = o.id;
    radio.checked = S.format === o.id;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(o.label));
    fieldset.appendChild(lab);
  });
  return fieldset;
}

/* ---------- E054-04 : bascules de couches (aria-pressed indépendant) ---------- */

function buildToggles() {
  const group = document.createElement('div');
  group.id = TOGGLES_ID;
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Couches de la carte (bascule indépendante)');
  const intro = document.createElement('p');
  intro.textContent = 'Couches visibles sur la carte (plusieurs réponses possibles) :';
  group.appendChild(intro);
  const couches = [
    { id: 'graticule', label: 'Graticule 30°' },
    { id: 'axes', label: 'Équateur et Greenwich' },
    { id: 'etiquettes', label: 'Noms des repères' },
  ];
  couches.forEach((c) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.geographyE054Toggle = c.id;
    button.setAttribute('aria-pressed', S[c.id] ? 'true' : 'false');
    button.setAttribute('aria-label', `${c.label} : afficher ou masquer cette couche`);
    button.textContent = c.label;
    group.appendChild(button);
  });
  return group;
}

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: Array.from(existant.querySelectorAll('input[name="geography-e054-format"]')),
      toggles: Array.from(existant.querySelectorAll('[data-geography-e054-toggle]')),
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

  const panel = ctx.el('section', 'geography-e054-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Lire les coordonnées au survol d’un marqueur');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Une carte ne donne pas seulement des noms : chaque repère porte une latitude et une longitude. Survolez un marqueur du laboratoire ou utilisez les flèches du clavier pour révéler ses coordonnées, puis changez de format pour voir le même nombre s’écrire autrement.');

  const subRef = ctx.el('h3', '', 'Référentiel des repères');
  const subReglages = ctx.el('h3', '', 'Réglages de l’affichage');
  const subCarte = ctx.el('h3', '', 'Laboratoire : survol des marqueurs');
  const subListe = ctx.el('h3', '', 'Coordonnées en texte');

  /* E054-05 : curseur de précision. */
  const precisionRow = ctx.el('p', '');
  const precisionLabel = document.createElement('label');
  precisionLabel.setAttribute('for', PRECISION_ID);
  precisionLabel.appendChild(document.createTextNode('Décimales affichées : '));
  const precisionOut = document.createElement('span');
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

  /* E054-07 : laboratoire canvas et bulle de coordonnées. */
  const carte = document.createElement('div');
  carte.id = CARTE_ID;
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Carte schématique de dix repères. Flèches gauche et droite : parcourir les repères et afficher leurs coordonnées ; flèches haut et bas : changer le nombre de décimales ; Entrée ou Espace : lancer ou arrêter le survol automatique ; Échap : effacer le repère pointé.');
  const bulle = document.createElement('div');
  bulle.id = BULLE_ID;
  bulle.setAttribute('aria-hidden', 'true');
  carte.append(canvas, bulle);

  const legend = ctx.el('p', 'geography-e054-legende');
  legend.id = LEGENDE_ID;
  legend.textContent = 'Trait plein = équateur (latitude 0°) ; trait tireté = méridien de Greenwich (longitude 0°) ; grille fine = parallèles et méridiens tous les 30°. Le repère pointé porte un double cercle et ses deux projections sur les axes. Aucune information n’est portée par la seule couleur.';

  const statut = ctx.el('p', 'geography-e054-statut');
  statut.id = STATUT_ID;

  const liste = document.createElement('ul');
  liste.id = LISTE_ID;
  liste.setAttribute('aria-label', 'Liste textuelle des repères et de leurs coordonnées');

  /* E054-08 : lecture chiffrée et annoncée (région live unique). */
  const readout = ctx.el('p', 'geography-e054-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const actions = ctx.el('div', 'geography-e054-actions');
  const reset = ctx.el('button', 'geography-e054-action', 'Réinitialiser l’affichage');
  reset.type = 'button';
  reset.id = RESET_ID;
  const anim = ctx.el('button', 'geography-e054-action', '▶ Survol automatique');
  anim.type = 'button';
  anim.id = ANIM_ID;
  anim.setAttribute('aria-pressed', 'false');
  actions.append(reset, anim);

  panel.append(
    title, lead,
    subRef, staticTable(), staticFacts(),
    subReglages, buildFormatField(), buildToggles(), precisionRow, precision,
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
    radios: Array.from(panel.querySelectorAll('input[name="geography-e054-format"]')),
    toggles: Array.from(panel.querySelectorAll('[data-geography-e054-toggle]')),
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
      li.className = 'geography-e054-actif';
      li.setAttribute('aria-current', 'true');
    }
    li.textContent = `${r.label} — ${r.pays} · latitude ${latitudeFormatee(r)} · longitude ${longitudeFormatee(r)}`;
    liste.appendChild(li);
  });
}

/* ---------- E054-08 : grandeurs chiffrées comparées à une référence ---------- */

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

/* ---------- E054-07 : laboratoire canvas et géométrie partagée ---------- */

function geometry() {
  const cv = S.nodes.canvas;
  const cssW = (cv && cv.clientWidth) || 320;
  const cssH = (cv && cv.clientHeight) || 230;
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
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(geo.cssW * dpr);
  const bh = Math.round(geo.cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, geo.cssW, geo.cssH);

  /* Graticule : méridiens tous les 30° et parallèles tous les 30°. */
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

  /* Équateur (trait plein) et méridien de Greenwich (tireté) : repères fixes. */
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
  const x = ((clientX - rect.left) * (geometry().cssW)) / rect.width;
  const y = ((clientY - rect.top) * (geometry().cssH)) / rect.height;
  const geo = geometry();
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

/* ---------- E054-09 : boucle rAF unique, pause sur document.hidden ---------- */

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
  const reduced = typeof ctxReducedMotion === 'function' ? !!ctxReducedMotion() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.joue && !reduced) S.sweep = (S.sweep + dt * 0.00012) % 1;
  }
  S.lastTs = ts;
  if (S.joue && !reduced) {
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

/* Référence à la préférence de mouvement, fournie par ctx à l'entrée. */
let ctxReducedMotion = null;

/* ---------- E054-10 : accessibilité, mouvement réduit, robustesse d'état ---------- */

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.joue) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE054Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.joue) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

function setFormat(id) {
  if (id !== 'decimal' && id !== 'dms') return;
  S.format = id;
  updateReadout();
  renderListe();
  updateBulle();
  drawLab();
}

function setPrecision(value) {
  const n = Math.round(Number(value));
  S.precision = Math.max(MIN_PRECISION, Math.min(MAX_PRECISION, Number.isFinite(n) ? n : 2));
  syncControls();
}

function setPointe(id) {
  if (!Object.prototype.hasOwnProperty.call(INDEX_PAR_ID, id)) return;
  S.pointe = id;
  S.sweep = INDEX_PAR_ID[id] / REPERES.length;
  updateReadout();
  renderListe();
  updateBulle();
  drawLab();
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
  n.radios.forEach((radio) => { radio.checked = radio.value === S.format; });
  n.toggles.forEach((b) => {
    b.setAttribute('aria-pressed', S[b.dataset.geographyE054Toggle] ? 'true' : 'false');
  });
  if (n.precision) n.precision.value = String(S.precision);
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

/* ---------- Point d'entrée ---------- */

register('E054', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctxReducedMotion = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);

  const reduced = ctxReducedMotion ? !!ctxReducedMotion() : false;
  S.nodes.panel.dataset.geographyE054Reduced = reduced ? '1' : '0';
  if (reduced) S.joue = false;

  syncControls();

  if (S.nodes.fresh) {
    S.nodes.radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) setFormat(radio.value);
      });
    });
    S.nodes.toggles.forEach((button) => {
      button.addEventListener('click', () => toggleCouche(button.dataset.geographyE054Toggle));
    });
    S.nodes.precision.addEventListener('input', () => setPrecision(S.nodes.precision.value));
    S.nodes.reset.addEventListener('click', () => {
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
    S.nodes.anim.addEventListener('click', toggleAnimation);
    S.nodes.canvas.addEventListener('pointermove', pointerSurCanvas);
    S.nodes.canvas.addEventListener('pointerdown', pointerSurCanvas);
    S.nodes.canvas.addEventListener('pointerleave', () => { updateBulle(); });
    S.nodes.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const ordre = REPERES.map((r) => r.id);
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = ordre.indexOf(S.pointe);
        const base = i < 0 ? 0 : i;
        setPointe(ordre[(base + step + ordre.length) % ordre.length]);
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 1 : -1;
        setPrecision(S.precision + step);
      } else if (event.key === 'Enter' || event.key === ' ') {
        toggleAnimation();
      } else if (event.key === 'Escape') {
        S.pointe = null;
        updateReadout();
        renderListe();
        updateBulle();
        drawLab();
      } else {
        used = false;
      }
      if (used) event.preventDefault();
    });
  }

  installGlobalListeners();
  if (S.joue) startLoop();
});
