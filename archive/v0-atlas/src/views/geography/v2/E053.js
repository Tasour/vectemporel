import { register } from './registry.js';

/* Lentille E053 (V2) — vue GEOGRAPHIE.
 * Thème : filtre des lieux par pays.
 *
 * Les dix chantiers E053-01 … E053-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E053.md. Les dix sont réellement
 * implémentés : aucun stub, aucune fonction vide. Tout est local : aucune
 * requête réseau, aucune graine aléatoire, aucune journalisation, aucun
 * fichier partagé modifié. Le contenu pédagogique est du texte sémantique
 * réel (titres, paragraphes, tableau, radiogroupe, liste, légende) présent
 * dans le DOM ; le canvas n'est qu'un laboratoire qui illustre le filtrage
 * déterministe d'un corpus de 26 lieux répartis sur 10 pays.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e053- (identifiants, classes, attributs,
 * noms de groupes et bloc CSS).
 *
 * Nouveautés V2 par rapport à la passe 1 : rôle `radiogroup` explicite,
 * `aria-valuetext` maintenu à jour sur le curseur d'année,
 * `ctx.reducedMotion()` relu à chaque tick (et pas seulement au montage),
 * IntersectionObserver suspendant le balayage hors écran, badge relatif à
 * l'état réel de la carte, cibles ≥ 36 px et limite falsifiable en cinq temps.
 */

const P = 'geography-v2-e053';

/* Identifiants, tous préfixés geography-v2-e053-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const TABLE_ID = P + '-table';
const COUNTRY_ID = P + '-country';
const COUNTRY_NAME_ATTR = P + '-pays';
const TYPE_GROUP_ID = P + '-types';
const TYPE_ATTR = 'data-' + P + '-type';
const YEAR_ID = P + '-year';
const YEAR_OUT_ID = P + '-year-value';
const CANVAS_ID = P + '-canvas';
const LIST_ID = P + '-list';
const STATUS_ID = P + '-status';
const READOUT_ID = P + '-readout';
const LEGEND_ID = P + '-legend';
const RESET_ID = P + '-reset';
const ANIM_ID = P + '-anim';
const BADGE_ID = P + '-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

/* Bornes et constantes de temps : aucune valeur n'est fabriquée à la volée. */
const MIN_YEAR = -2600;
const MAX_YEAR = 2020;
const YEAR_STEP = 20;
const SWEEP_RATE = 0.00012;

/* Corpus local déterministe : noms de pays de l'atlas, exemples pédagogiques
 * associés à un type et à une année (aucune source inventée). */
const COUNTRIES = [
  { id: 'france', name: 'France', code: 'FR' },
  { id: 'royaume-uni', name: 'Royaume-Uni', code: 'GB' },
  { id: 'etats-unis', name: 'États-Unis', code: 'US' },
  { id: 'allemagne', name: 'Allemagne', code: 'DE' },
  { id: 'italie', name: 'Italie', code: 'IT' },
  { id: 'espagne', name: 'Espagne', code: 'ES' },
  { id: 'chine', name: 'Chine', code: 'CN' },
  { id: 'inde', name: 'Inde', code: 'IN' },
  { id: 'japon', name: 'Japon', code: 'JP' },
  { id: 'egypte', name: 'Égypte', code: 'EG' },
];

const TYPES = [
  { id: 'patrimoine', label: 'Patrimoine' },
  { id: 'naturel', label: 'Naturel' },
  { id: 'urbain', label: 'Urbain' },
];

const PLACES = [
  { id: 'fr-massalia', label: 'Marseille', country: 'france', type: 'urbain', year: -600 },
  { id: 'fr-alesia', label: 'Alésia', country: 'france', type: 'patrimoine', year: -52 },
  { id: 'fr-paris', label: 'Paris', country: 'france', type: 'urbain', year: 508 },
  { id: 'fr-montblanc', label: 'Mont Blanc', country: 'france', type: 'naturel', year: 1786 },
  { id: 'uk-londres', label: 'Londres', country: 'royaume-uni', type: 'urbain', year: 43 },
  { id: 'uk-stonehenge', label: 'Stonehenge', country: 'royaume-uni', type: 'patrimoine', year: -2500 },
  { id: 'uk-edimbourg', label: 'Édimbourg', country: 'royaume-uni', type: 'urbain', year: 1128 },
  { id: 'us-newyork', label: 'New York', country: 'etats-unis', type: 'urbain', year: 1624 },
  { id: 'us-philadelphie', label: 'Philadelphie', country: 'etats-unis', type: 'patrimoine', year: 1682 },
  { id: 'us-grandcanyon', label: 'Grand Canyon', country: 'etats-unis', type: 'naturel', year: 1869 },
  { id: 'de-berlin', label: 'Berlin', country: 'allemagne', type: 'urbain', year: 1237 },
  { id: 'de-cologne', label: 'Cologne', country: 'allemagne', type: 'patrimoine', year: 795 },
  { id: 'it-rome', label: 'Rome', country: 'italie', type: 'patrimoine', year: -753 },
  { id: 'it-florence', label: 'Florence', country: 'italie', type: 'urbain', year: 1115 },
  { id: 'it-vesuve', label: 'Vésuve', country: 'italie', type: 'naturel', year: 79 },
  { id: 'es-madrid', label: 'Madrid', country: 'espagne', type: 'urbain', year: 1085 },
  { id: 'es-grenade', label: 'Grenade', country: 'espagne', type: 'patrimoine', year: 711 },
  { id: 'cn-pekin', label: 'Pékin', country: 'chine', type: 'urbain', year: -1045 },
  { id: 'cn-xian', label: 'Xi’an', country: 'chine', type: 'patrimoine', year: -202 },
  { id: 'cn-himalaya', label: 'Himalaya', country: 'chine', type: 'naturel', year: 1953 },
  { id: 'in-delhi', label: 'Delhi', country: 'inde', type: 'urbain', year: -1200 },
  { id: 'in-ajanta', label: 'Ajanta', country: 'inde', type: 'patrimoine', year: -200 },
  { id: 'jp-kyoto', label: 'Kyoto', country: 'japon', type: 'patrimoine', year: 794 },
  { id: 'jp-tokyo', label: 'Tokyo', country: 'japon', type: 'urbain', year: 1457 },
  { id: 'eg-gizeh', label: 'Gizeh', country: 'egypte', type: 'patrimoine', year: -2560 },
  { id: 'eg-caire', label: 'Le Caire', country: 'egypte', type: 'urbain', year: 969 },
];

const COUNTRY_NAME = {};
COUNTRIES.forEach((c) => { COUNTRY_NAME[c.id] = c.name; });
const TYPE_LABEL = {};
TYPES.forEach((t) => { TYPE_LABEL[t.id] = t.label; });
const COMPTES = COUNTRIES.map((c) => ({
  ...c,
  count: PLACES.filter((p) => p.country === c.id).length,
}));

/* État de module : survit au vidage du `stage` par la coque. */
const S = {
  viewId: 'E053',
  country: 'all',
  types: new Set(TYPES.map((t) => t.id)),
  maxYear: MAX_YEAR,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  onScreen: true,
  map: null,
  io: null,
  ioCanvas: null,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* Préférence de mouvement conservée hors du point d'entrée pour la boucle. */
let ctxReduced = null;

/* ---------- Formules déterministes et formatage français ---------- */

const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
const formatYear = (year) => (year < 0 ? `${Math.abs(year)} av. J.-C.` : `${year}`);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* E053-03/04/05 : le prédicat de filtrage est une conjonction de trois
 * critères indépendants ; il ne modifie jamais le corpus source. */
function filteredPlaces() {
  return PLACES.filter((p) =>
    (S.country === 'all' || p.country === S.country)
    && S.types.has(p.type)
    && p.year <= S.maxYear);
}

/* E053-02/08 : toutes les grandeurs sont recalculées depuis PLACES. */
function measures() {
  const all = PLACES.length;
  const shown = filteredPlaces();
  return {
    all,
    shown: shown.length,
    part: all ? Math.round((shown.length / all) * 1000) / 10 : 0,
    pays: new Set(shown.map((p) => p.country)).size,
    totalPays: COUNTRIES.length,
  };
}

/* ---------- E053-02 : bloc CSS unique, préfixé, sans réseau ---------- */

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
#${TABLE_ID} thead th,#${TABLE_ID} tfoot th,#${TABLE_ID} tfoot td{color:var(--gold-bright,#f4d69e);font-weight:600}
#${COUNTRY_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${COUNTRY_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${TYPE_GROUP_ID}{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
#${TYPE_GROUP_ID} button{
  min-height:44px;padding:6px 10px;border:1px solid var(--line);border-radius:999px;
  background:transparent;color:var(--muted);font:inherit;font-size:10px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${TYPE_GROUP_ID} button[aria-pressed="true"]{
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
#${CANVAS_ID}{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${STATUS_ID}{font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}
#${LIST_ID}{list-style:none;margin:6px 0;padding:0}
#${LIST_ID} li+li{margin-top:3px}
#${LIST_ID} li{
  padding:5px 8px;border:1px solid var(--line);border-radius:7px;
  background:rgba(255,255,255,.02);font-size:10px;
}
#${LIST_ID} li.${P}-vide{border-style:dashed;color:var(--muted)}
#${READOUT_ID}{
  min-height:46px;padding:7px 8px;margin:6px 0;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-badge{
  position:absolute;left:12px;bottom:12px;z-index:3;max-width:72%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,
.${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:190px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* ---------- E053-01 : section sémantique, lisible sans animation ---------- */

function staticFacts() {
  return [
    'Filtrer des lieux par pays revient à appliquer un prédicat à chaque enregistrement : on garde les lieux dont le pays appartient à la sélection, on écarte les autres. Le corpus de départ, ici 26 lieux sur 10 pays, ne change jamais.',
    'Le filtre pays est un choix unique : un lieu n’appartient qu’à un pays dans ce corpus. Les types de lieux, eux, se cumulent librement car un même lieu peut être compté dans plusieurs catégories.',
    'La période est une borne supérieure : seuls les lieux dont l’année est antérieure ou égale à l’année limite sont retenus. Chaque critère réduit le résultat, jamais la source.',
    'Limite falsifiable, en cinq temps : (1) prédisez le décompte pour la France, le type « naturel » et une année limite de 1000 ; (2) réglez ces trois critères ; (3) attendez le résultat annoncé ; (4) essayez de le contredire en passant à l’Italie : le décompte doit changer ; (5) débriefez avec la liste textuelle et le tableau de référence. Si le décompte ne réagit pas, le filtre est en défaut.',
  ].map((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    return p;
  });
}

/* ---------- E053-02 : tableau de référence recalculé par formule ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Corpus de référence : répartition des 26 lieux par pays, filtre « Tous les pays » et toutes les périodes. La ligne Total sert de référence (100 %).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Pays', 'Code', 'Lieux', 'Part du corpus'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  COMPTES.forEach((c) => {
    const tr = document.createElement('tr');
    const cells = [
      [c.name, true],
      [c.code, false],
      [String(c.count), false],
      [`${fmt1((c.count / PLACES.length) * 100)} %`, false],
    ];
    cells.forEach(([texte, estEnTete], i) => {
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
  ['Total', '—', String(PLACES.length), '100,0 %'].forEach((texte, i) => {
    const cell = document.createElement(i === 0 ? 'th' : 'td');
    if (i === 0) cell.scope = 'row';
    cell.textContent = texte;
    fr.appendChild(cell);
  });
  tfoot.appendChild(fr);
  table.appendChild(tfoot);
  return table;
}

/* ---------- E053-03 : choix unique explicite (radiogroup) ---------- */

function buildCountryField() {
  const fieldset = document.createElement('fieldset');
  fieldset.id = COUNTRY_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Pays à afficher, choix unique');
  const legend = document.createElement('legend');
  legend.textContent = 'Pays à afficher (choix unique)';
  fieldset.appendChild(legend);
  [{ id: 'all', name: 'Tous les pays' }].concat(COUNTRIES).forEach((c) => {
    const lab = document.createElement('label');
    lab.className = P + '-choix';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = COUNTRY_NAME_ATTR;
    radio.id = `${P}-pays-${c.id}`;
    radio.value = c.id;
    radio.checked = S.country === c.id;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(c.name));
    fieldset.appendChild(lab);
  });
  return fieldset;
}

/* ---------- E053-04 : bascules indépendantes (aria-pressed) ---------- */

function buildTypeGroup() {
  const group = document.createElement('div');
  group.id = TYPE_GROUP_ID;
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Types de lieux, bascule indépendante');
  const intro = document.createElement('p');
  intro.textContent = 'Types de lieux retenus (plusieurs réponses possibles) :';
  group.appendChild(intro);
  TYPES.forEach((t) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute(TYPE_ATTR, t.id);
    button.setAttribute('aria-pressed', S.types.has(t.id) ? 'true' : 'false');
    button.setAttribute('aria-label', `Type ${t.label} : inclure ou exclure ce type`);
    button.textContent = t.label;
    group.appendChild(button);
  });
  return group;
}

/* ---------- Construction du panneau (texte sémantique réel) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: Array.from(existant.querySelectorAll('input[name="' + COUNTRY_NAME_ATTR + '"]')),
      typeButtons: Array.from(existant.querySelectorAll('[' + TYPE_ATTR + ']')),
      year: document.getElementById(YEAR_ID),
      yearOut: document.getElementById(YEAR_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      list: document.getElementById(LIST_ID),
      status: document.getElementById(STATUS_ID),
      readout: document.getElementById(READOUT_ID),
      legend: document.getElementById(LEGEND_ID),
      reset: document.getElementById(RESET_ID),
      anim: document.getElementById(ANIM_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Filtrer les lieux par pays (V2)');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Un filtre ne déplace aucun lieu : il choisit lesquels afficher. Combinez un pays, un type et une année limite pour voir le corpus se réduire, puis comparez le résultat au référentiel complet et à l’état réel de la carte.');

  const subRef = ctx.el('h3', '', 'Référentiel du corpus');
  const subFiltre = ctx.el('h3', '', 'Réglages du filtre');
  const subListe = ctx.el('h3', '', 'Lieux retenus');

  /* E053-05 : curseur d'année limite et valeur vocalisée. */
  const yearRow = ctx.el('p', '');
  const yearLabel = document.createElement('label');
  yearLabel.setAttribute('for', YEAR_ID);
  yearLabel.appendChild(document.createTextNode('Année limite : '));
  const yearOut = ctx.el('span', P + '-value');
  yearOut.id = YEAR_OUT_ID;
  yearLabel.appendChild(yearOut);
  yearRow.appendChild(yearLabel);
  const year = document.createElement('input');
  year.type = 'range';
  year.id = YEAR_ID;
  year.min = String(MIN_YEAR);
  year.max = String(MAX_YEAR);
  year.step = String(YEAR_STEP);
  year.value = String(S.maxYear);
  year.setAttribute('aria-label', `Année limite, de ${Math.abs(MIN_YEAR)} av. J.-C. à ${MAX_YEAR}`);
  year.setAttribute('aria-valuetext', `Année limite : ${formatYear(S.maxYear)}`);
  yearRow.appendChild(year);

  /* E053-07 : laboratoire canvas focalisable et décrivant ses équivalents clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Répartition des lieux par pays et par année (V2). Flèches gauche et droite : changer de pays ; flèches haut et bas : modifier l’année limite de 100 ans ; Entrée : lancer ou arrêter l’animation ; Origine : réinitialiser les filtres.');

  const legend = ctx.el('p', P + '-legend', 'Formes : disque = patrimoine, triangle = naturel, carré = urbain. Plein et cerclé = retenu, vide et pointillé = exclu ; la ligne tiretée marque l’année limite. La forme et le remplissage distinguent les états, pas la couleur seule.');
  legend.id = LEGEND_ID;

  const status = ctx.el('p', P + '-status', '');
  status.id = STATUS_ID;

  const list = document.createElement('ul');
  list.id = LIST_ID;
  list.setAttribute('aria-label', 'Liste des lieux retenus par le filtre');

  /* E053-08 : unique région live, annoncée poliment. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const reset = ctx.el('button', '', 'Réinitialiser les filtres');
  reset.type = 'button';
  reset.id = RESET_ID;
  const anim = ctx.el('button', '', S.playing ? '■ Arrêter l’animation' : '▶ Animer la sélection');
  anim.type = 'button';
  anim.id = ANIM_ID;
  anim.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(
    title, lead,
    subRef, staticTable(), ...staticFacts(),
    subFiltre, buildCountryField(), buildTypeGroup(), yearRow, year,
    canvas, legend,
    subListe, status, list, readout, reset, anim,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: Array.from(panel.querySelectorAll('input[name="' + COUNTRY_NAME_ATTR + '"]')),
    typeButtons: Array.from(panel.querySelectorAll('[' + TYPE_ATTR + ']')),
    year, yearOut, canvas, list, status, readout, legend, reset, anim,
  };
}

/* ---------- E053-06 : liste textuelle des lieux retenus ---------- */

function renderList() {
  const list = S.nodes.list;
  if (!list) return;
  const retenus = filteredPlaces();
  list.textContent = '';
  if (!retenus.length) {
    const li = document.createElement('li');
    li.className = P + '-vide';
    li.textContent = 'Aucun lieu ne satisfait cette combinaison de filtres. Réinitialisez ou élargissez un critère.';
    list.appendChild(li);
    return;
  }
  retenus.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = `${p.label} — ${TYPE_LABEL[p.type]} · ${COUNTRY_NAME[p.country]} · ${formatYear(p.year)}`;
    list.appendChild(li);
  });
}

/* ---------- E053-08 : grandeurs chiffrées et annonce polie ---------- */

function updateReadout() {
  const m = measures();
  const n = S.nodes;
  if (n.status) {
    n.status.textContent = `Filtre actif : pays = ${S.country === 'all' ? 'tous' : COUNTRY_NAME[S.country]} ; types = ${TYPES.filter((t) => S.types.has(t.id)).map((t) => t.label).join(', ') || 'aucun'} ; année ≤ ${formatYear(S.maxYear)}.`;
  }
  if (!n.readout) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.readout.textContent = '';
  n.readout.appendChild(document.createTextNode('Résultat : '));
  n.readout.appendChild(fort(`${m.shown} lieux retenus`));
  n.readout.appendChild(document.createTextNode(' sur '));
  n.readout.appendChild(fort(`${m.all} au total`));
  n.readout.appendChild(document.createTextNode(' (référence : 100 %, '));
  n.readout.appendChild(fort(`${fmt1(m.part)} %`));
  n.readout.appendChild(document.createTextNode(' du corpus), répartis sur '));
  n.readout.appendChild(fort(`${m.pays} pays sur ${m.totalPays}`));
  n.readout.appendChild(document.createTextNode('. Le filtre ne modifie jamais le corpus de départ.'));
}

/* ---------- E053-08 : badge relatif à l'état réel de la carte ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  S.map = map;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', P + '-badge', '');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

function updateBadge() {
  const badge = document.getElementById(BADGE_ID);
  if (!badge) return;
  const reels = S.map && typeof S.map.querySelectorAll === 'function'
    ? S.map.querySelectorAll('.geo-marker').length : 0;
  const m = measures();
  badge.textContent = `Lentille ${S.viewId} (V2) · filtre simulé : ${m.shown}/${m.all} lieux · vue réelle : ${reels} marqueur${reels > 1 ? 's' : ''} sur la carte.`;
}

/* ---------- E053-07 : laboratoire canvas déterministe (un seul canvas) ---------- */

function drawMarker(g, x, y, type, retenu) {
  const r = 4;
  if (g.setLineDash) g.setLineDash(retenu ? [] : [2, 2]);
  g.lineWidth = retenu ? 1.6 : 1;
  g.strokeStyle = retenu ? 'rgba(244,214,158,.95)' : 'rgba(214,207,193,.35)';
  g.fillStyle = 'rgba(244,214,158,.9)';
  g.beginPath();
  if (type === 'naturel') {
    g.moveTo(x, y - r);
    g.lineTo(x + r, y + r);
    g.lineTo(x - r, y + r);
    g.closePath();
  } else if (type === 'urbain') {
    g.rect(x - r, y - r, r * 2, r * 2);
  } else {
    g.arc(x, y, r, 0, Math.PI * 2);
  }
  if (retenu) g.fill();
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 230;
  /* E053-10 : DPR plafonné à 2, un seul dessin par frame. */
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 18;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2 - 14);
  const xFor = (countryId) => {
    const i = COUNTRIES.findIndex((c) => c.id === countryId);
    return pad + ((i + 0.5) / COUNTRIES.length) * iw;
  };
  const yFor = (year) => pad + ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * ih;

  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.strokeRect(pad, pad, iw, ih);

  /* Codes des pays en bas : information redondante avec la légende textuelle. */
  g.fillStyle = 'rgba(214,207,193,.7)';
  g.font = '9px sans-serif';
  COUNTRIES.forEach((c) => {
    g.fillText(c.code, xFor(c.id) - 7, cssH - 4);
  });

  /* E053-05 : ligne de coupure de l'année limite et zone exclue. */
  const cutoffY = yFor(S.maxYear);
  g.fillStyle = 'rgba(0,0,0,.22)';
  g.fillRect(pad, cutoffY, iw, Math.max(0, pad + ih - cutoffY));
  if (g.setLineDash) g.setLineDash([4, 3]);
  g.strokeStyle = 'rgba(244,214,158,.8)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(pad, cutoffY);
  g.lineTo(pad + iw, cutoffY);
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);
  g.fillStyle = 'rgba(244,214,158,.9)';
  g.fillText(`année ≤ ${formatYear(S.maxYear)}`, pad + 2, Math.max(pad + 9, cutoffY - 4));

  const retenus = new Set(filteredPlaces().map((p) => p.id));
  PLACES.forEach((p) => {
    drawMarker(g, xFor(p.country), yFor(p.year), p.type, retenus.has(p.id));
  });

  /* E053-09 : anneau animé, position déterministe = f(S.sweep). */
  if (S.playing && retenus.size) {
    const liste = filteredPlaces();
    const idx = Math.floor(S.sweep * liste.length) % liste.length;
    const cible = liste[idx];
    g.strokeStyle = 'rgba(255,255,255,.95)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(xFor(cible.country), yFor(cible.year), 9, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.fillText(`${idx + 1}/${liste.length}`, pad + 2, pad + 11);
  }
}

function syncControls() {
  const n = S.nodes;
  n.radios.forEach((radio) => { radio.checked = radio.value === S.country; });
  n.typeButtons.forEach((b) => {
    b.setAttribute('aria-pressed', S.types.has(b.getAttribute(TYPE_ATTR)) ? 'true' : 'false');
  });
  if (n.year) {
    n.year.value = String(S.maxYear);
    /* Nouveauté V2 : la valeur vocalisée suit la valeur numérique. */
    n.year.setAttribute('aria-valuetext', `Année limite : ${formatYear(S.maxYear)}`);
  }
  if (n.yearOut) n.yearOut.textContent = formatYear(S.maxYear);
  if (n.anim) {
    n.anim.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer la sélection';
    n.anim.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  renderList();
  updateBadge();
  drawLab();
}

/* ---------- E053-09 : boucle rAF unique, pause et sobriété ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function reducedNow() {
  return typeof ctxReduced === 'function' && !!ctxReduced();
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen) return;
  if (reducedNow()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen) return;
  /* Nouveauté V2 : la préférence est relue à chaque tick. */
  if (reducedNow()) { S.playing = false; syncControls(); return; }
  if (S.lastTs && S.playing) {
    const dt = Math.min(80, ts - S.lastTs);
    S.sweep = (S.sweep + dt * SWEEP_RATE) % 1;
  }
  S.lastTs = ts;
  syncControls();
  if (S.playing) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E053-10 : accessibilité, mouvement réduit, robustesse ---------- */

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !reducedNow()) startLoop();
      updateBadge();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.setAttribute(REDUCED_ATTR, mq.matches ? '1' : '0');
        if (mq.matches) { S.playing = false; stopLoop(); syncControls(); }
        else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* IntersectionObserver : suspension du balayage hors écran, sans rAF supplémentaire. */
function ensureObserver(canvas) {
  if (typeof IntersectionObserver !== 'function') { S.onScreen = true; return; }
  if (S.io && S.ioCanvas === canvas) return;
  if (S.io) S.io.disconnect();
  S.io = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    S.onScreen = entry ? entry.isIntersecting : true;
    if (!S.onScreen) stopLoop();
    else if (S.playing && !reducedNow()) startLoop();
  }, { threshold: 0.01 });
  S.io.observe(canvas);
  S.ioCanvas = canvas;
}

/* ---------- Pilotage des contrôles ---------- */

function changeCountry(id) {
  if (id !== 'all' && !COUNTRY_NAME[id]) return;
  S.country = id;
  S.sweep = 0;
  syncControls();
}

function toggleType(id) {
  if (!TYPE_LABEL[id]) return;
  if (S.types.has(id)) S.types.delete(id);
  else S.types.add(id);
  S.sweep = 0;
  syncControls();
}

function setMaxYear(value) {
  const n = Math.round(Number(value) / YEAR_STEP) * YEAR_STEP;
  S.maxYear = clamp(Number.isFinite(n) ? n : MAX_YEAR, MIN_YEAR, MAX_YEAR);
  S.sweep = 0;
  syncControls();
}

function toggleAnimation() {
  S.playing = !S.playing;
  if (!S.playing) stopLoop(); else startLoop();
  syncControls();
}

function resetAll() {
  S.country = 'all';
  S.types = new Set(TYPES.map((t) => t.id));
  S.maxYear = MAX_YEAR;
  S.sweep = 0;
  S.playing = false;
  stopLoop();
  syncControls();
}

/* ---------- Point d'entrée ---------- */

register('E053', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E053-02 : bloc CSS isolé, une seule fois, identifiants préfixés. */
  ctx.css('geography-v2-e053', CSS);

  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  if (ctx.viewId) S.viewId = String(ctx.viewId);
  const reduced = reducedNow();

  S.nodes = ensurePanel(ctx);
  S.nodes.panel.setAttribute(REDUCED_ATTR, reduced ? '1' : '0');
  addMapBadge(ctx);
  if (reduced) { S.playing = false; stopLoop(); }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) changeCountry(radio.value);
      });
    });
    n.typeButtons.forEach((button) => {
      button.addEventListener('click', () => toggleType(button.getAttribute(TYPE_ATTR)));
    });
    n.year.addEventListener('input', () => setMaxYear(n.year.value));
    n.reset.addEventListener('click', resetAll);
    n.anim.addEventListener('click', toggleAnimation);
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const ordre = ['all'].concat(COUNTRIES.map((c) => c.id));
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = ordre.indexOf(S.country);
        changeCountry(ordre[(i + step + ordre.length) % ordre.length]);
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        setMaxYear(S.maxYear + (event.key === 'ArrowUp' ? 100 : -100));
      } else if (event.key === 'Enter' || event.key === ' ') {
        toggleAnimation();
      } else if (event.key === 'Home') {
        resetAll();
      } else {
        used = false;
      }
      if (used) event.preventDefault();
    });
    ensureObserver(n.canvas);
  }

  installGlobalListeners();
  if (S.playing && !reduced) startLoop();
});
