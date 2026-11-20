import { register } from './registry.js';

/* Lentille E063 (V2) — vue GEOGRAPHIE.
 * Thème : repères visuels et grille de lecture — comment lit-on une carte ?
 *
 * Dix chantiers, tous réellement implémentés dans CE seul module :
 * E063-01 … E063-10. Aucun stub, aucune fonction vide, aucun fichier partagé
 * modifié (passe 1, registry.js et index.js intacts).
 *
 * Contrat : register('E063', (ctx) => { … }) avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Feuille de styles unique, injectée sous l'identifiant `geography-v2-e063`.
 * Tous les identifiants, classes et attributs sont préfixés
 * `geography-v2-e063-`. Zéro console, zéro réseau, zéro aléa, au plus une
 * requête d'animation en vol (suspendue quand le document est masqué et hors
 * écran). Tout le savoir est du texte DOM sémantique lisible sans script ;
 * le canvas n'est qu'un laboratoire qui illustre des grandeurs déjà écrites
 * en toutes lettres.
 *
 * Nouveautés V2 par rapport à la passe 1 : état mémorisé dans `S` et gardes
 * d'écouteurs entre rendus, `role="radiogroup"` explicite, `aria-valuetext`
 * maintenu sur le curseur d'azimut, `ctx.reducedMotion()` relu à chaque tick,
 * IntersectionObserver suspendant le balayage hors écran, cibles ≥ 36 px
 * (boutons 44 px, pouces 24 px), badge de schématisme dans .geo-map et défi
 * falsifiable en cinq temps avec débrief révélé par aria-expanded.
 */

const P = 'geography-v2-e063';

/* Identifiants, tous préfixés geography-v2-e063-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const LEAD_ID = P + '-lead';
const INTRO_ID = P + '-intro';
const COORD_ID = P + '-coord';
const PAS_ID = P + '-pas-text';
const MESURES_ID = P + '-mesures';
const TABLE_ID = P + '-table';
const GROUP_ID = P + '-group';
const AZIMUT_LABEL_ID = P + '-azimut-label';
const AZIMUT_ID = P + '-azimut';
const AZIMUT_OUT_ID = P + '-azimut-value';
const READOUT_ID = P + '-readout';
const FIGURE_ID = P + '-figure';
const CANVAS_ID = P + '-canvas';
const CAPTION_ID = P + '-caption';
const LEGEND_ID = P + '-legend';
const ACTIONS_ID = P + '-actions';
const GRID_ID = P + '-grille';
const NORTH_ID = P + '-nord';
const PLAY_ID = P + '-play';
const RESET_ID = P + '-reset';
const CLAVIER_ID = P + '-clavier';
const LIMITE_ID = P + '-limite';
const DEFI_ID = P + '-defi';
const DEBRIEF_ID = P + '-debrief';
const DEBRIEF_BTN_ID = P + '-debrief-btn';
const MAP_BADGE_ID = P + '-map-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

/* Grandeurs de référence, toutes traçables et recalculées par formule. */
const MAP_W = 900;                 // largeur du cadre schématique, unités
const MAP_H = 620;                 // hauteur du cadre schématique, unités
const WORLD_KM = 40000;            // largeur du monde représentée (~ tour de la Terre)
const HALF_WORLD_KM = 20000;       // distance pôle à pôle représentée
const EARTH_EQUATOR_KM = 40075;    // référence réelle : circonférence équatoriale
const BAR_KM = 2000;               // distance de la barre d'échelle de référence
const SWEEP_MS = 9000;             // période du balayage continu
const KM_PAR_UNITE_LON = WORLD_KM / MAP_W;
const KM_PAR_UNITE_LAT = HALF_WORLD_KM / MAP_H;
const DISTORSION = KM_PAR_UNITE_LON / KM_PAR_UNITE_LAT;
const NARROW = '\u202f';           // espace insécable fine
const MINUS = '\u2212';            // signe moins typographique
const RAD = Math.PI / 180;

/* Pas de grille disponibles (degrés) : 30 / 10 = 3, facteur de précision. */
const PASSES = [
  { key: 'grossier', nom: 'Grossier', pas: 30 },
  { key: 'moyen', nom: 'Moyen', pas: 20 },
  { key: 'fin', nom: 'Fin', pas: 10 },
];

/* Azimut du « haut de la carte » : direction cardinale qui pointe vers le
   haut. La flèche du nord indique la direction opposée sur l'écran. */
const AZIMUTS = [
  { cap: 0, nom: 'Nord' },
  { cap: 45, nom: 'Nord-est' },
  { cap: 90, nom: 'Est' },
  { cap: 135, nom: 'Sud-est' },
  { cap: 180, nom: 'Sud' },
];

/* Repères schématiques : coordonnées choisies, jamais tirées au hasard.
   La forme du glyphe distingue le repère, jamais la seule couleur. */
const LANDMARKS = [
  { id: 'cap-nord', nom: 'Cap Nord', genre: 'Phare', forme: 'etoile', lon: 25, lat: 71 },
  { id: 'pic-central', nom: 'Pic Central', genre: 'Montagne', forme: 'triangle', lon: -10, lat: 35 },
  { id: 'ville-aurore', nom: 'Ville Aurore', genre: 'Ville', forme: 'carre', lon: 15, lat: 48 },
  { id: 'base-boreale', nom: 'Base Boréale', genre: 'Station', forme: 'croix', lon: -45, lat: 65 },
  { id: 'sommet-est', nom: 'Sommet Est', genre: 'Sommet', forme: 'losange', lon: 100, lat: 30 },
  { id: 'port-sud', nom: 'Port Sud', genre: 'Capitale', forme: 'cercle', lon: -60, lat: -35 },
];

const GLYPHES = { cercle: '●', carre: '■', triangle: '▲', losange: '◆', croix: '✛', etoile: '✦' };

/* État de module : la coque reconstruit son DOM à chaque rendu, donc l'état
   survit dans S et les écouteurs globaux sont posés une seule fois. */
const S = {
  selected: 1,        // PASSES[1] : pas moyen 20°, par défaut
  azimut: 0,          // degrés, azimut du haut de la carte
  showGrid: true,     // bascule indépendante (aria-pressed)
  showNorth: true,    // bascule indépendante (aria-pressed)
  playing: false,
  cursor: { x: MAP_W / 2, y: MAP_H / 2 },
  renders: 0,
  rafId: 0,
  lastTs: 0,
  elapsed: 0,
  onScreen: true,
  io: null,
  ioCanvas: null,
  visibilityBound: false,
  motionBound: false,
  debriefOpen: false,
  readoutText: '',
  nodes: {},
};

/* ctx.reducedMotion() conservé hors du point d'entrée pour la boucle rAF. */
let ctxReduced = null;

/* ---------- Formules déterministes et formatage français ---------- */

const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* Formatage décimal déterministe, sans Intl ni aléa. */
function num(value, digits) {
  if (!finite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? MINUS : ''}${grouped}${parts[1] ? `,${parts[1]}` : ''}`;
}

/* E063-03 — transformation équirectangulaire schématique (plate carrée). */
function lonAt(x) { return -180 + (x / MAP_W) * 360; }
function latAt(y) { return 90 - (y / MAP_H) * 180; }
function xFromLon(lon) { return ((lon + 180) / 360) * MAP_W; }
function yFromLat(lat) { return ((90 - lat) / 180) * MAP_H; }
function clampCoord(x, y) {
  return {
    x: clamp(finite(x) ? x : MAP_W / 2, 0, MAP_W),
    y: clamp(finite(y) ? y : MAP_H / 2, 0, MAP_H),
  };
}

/* E063-04 — incertitude = moitié du pas ; E063-06 — barre d'échelle. */
const precisionOf = (pas) => pas / 2;
const cellsOf = (pas) => ({ lon: Math.round(360 / pas), lat: Math.round(180 / pas) });
const barUnits = (km) => km / KM_PAR_UNITE_LON;

/* E063-05 — nom cardinal de l'azimut du haut. */
function compassOf(cap) {
  let best = AZIMUTS[0];
  let dist = Infinity;
  AZIMUTS.forEach((a) => {
    const d = Math.abs(a.cap - cap);
    if (d < dist) { dist = d; best = a; }
  });
  return best.nom;
}

/* E063-07 — repère le plus proche, en distance euclidienne dans le cadre.
   Déterministe : même curseur → même repère, sans graine aléatoire. */
function nearestLandmark(x, y) {
  let best = LANDMARKS[0];
  let bestD = Infinity;
  LANDMARKS.forEach((landmark) => {
    const lx = xFromLon(landmark.lon);
    const ly = yFromLat(landmark.lat);
    const d = Math.sqrt((lx - x) ** 2 + (ly - y) ** 2);
    if (d < bestD) { bestD = d; best = landmark; }
  });
  return { landmark: best, distanceUnites: bestD };
}

const reduced = () => (typeof ctxReduced === 'function' && !!ctxReduced());

/* ---------- E063-01 / E063-02 : bloc CSS unique, préfixé, sans réseau ----------
 * E063-02 — feuille de style unique (ctx.css) et identifiants tous préfixés
 * geography-v2-e063- : aucun sélecteur ni attribut ne déborde de la lentille.
 */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-left:3px solid var(--gold,#e6b96f);
  border-radius:10px;background:rgba(255,255,255,.02);color:var(--muted,#9aa0a8);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;font-weight:600;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${P}-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
#${PANEL_ID} .${P}-ligne{margin:0 0 7px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
#${PANEL_ID} .${P}-ligne strong,#${PANEL_ID} .${P}-value{color:var(--gold-bright,#f4d69e);font-weight:600}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted,#9aa0a8)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${PANEL_ID} .${P}-liste{margin:4px 0 8px;padding-left:18px}
#${PANEL_ID} .${P}-liste li{margin:0 0 4px}
#${GROUP_ID}{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:8px 0}
#${PANEL_ID} .${P}-pas{
  min-height:44px;min-width:44px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;
  background:transparent;color:var(--muted,#9aa0a8);font:inherit;font-size:10px;line-height:1.35;
  text-align:left;cursor:pointer;transition:border-color .18s,background-color .18s,color .18s;
}
#${PANEL_ID} .${P}-pas:hover{border-color:var(--gold,#e6b96f);color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} .${P}-pas[aria-checked="true"]{
  border-color:var(--gold-bright,#f4d69e);color:var(--gold-bright,#f4d69e);
  background:rgba(230,185,111,.10);box-shadow:0 0 0 1px var(--gold-bright,#f4d69e) inset;
}
#${PANEL_ID} label[for="${AZIMUT_ID}"]{display:block;margin-top:6px;color:var(--ink,#e8e6e0)}
#${AZIMUT_ID}{
  width:100%;min-height:36px;accent-color:var(--gold-bright,#f4d69e);
  -webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;
}
#${AZIMUT_ID}::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${AZIMUT_ID}::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;width:24px;height:24px;margin-top:-9px;
  border:1px solid var(--gold-bright,#f4d69e);border-radius:50%;background:var(--gold,#e6b96f);
}
#${AZIMUT_ID}::-moz-range-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${AZIMUT_ID}::-moz-range-thumb{
  width:24px;height:24px;border:1px solid var(--gold-bright,#f4d69e);
  border-radius:50%;background:var(--gold,#e6b96f);
}
#${AZIMUT_OUT_ID}{color:var(--gold-bright,#f4d69e);font-variant-numeric:tabular-nums}
#${READOUT_ID}{
  min-height:46px;padding:7px 9px;margin:8px 0;border:1px dashed var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--gold-bright,#f4d69e);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${FIGURE_ID}{margin:8px 0;text-align:center}
#${CANVAS_ID}{
  display:block;width:100%;max-width:300px;height:auto;aspect-ratio:900/620;margin:0 auto;
  border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.28);
  touch-action:manipulation;cursor:crosshair;
}
#${CAPTION_ID}{margin-top:5px;font-size:10px;color:var(--muted,#9aa0a8)}
#${ACTIONS_ID}{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
#${PANEL_ID} button.${P}-bascule,#${PANEL_ID} button.${P}-play,#${PANEL_ID} button.${P}-reset,#${DEBRIEF_BTN_ID}{
  min-height:44px;min-width:44px;padding:6px 10px;border:1px solid var(--line);border-radius:8px;
  background:transparent;color:var(--gold-bright,#f4d69e);font:inherit;font-size:10px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f)}
#${PANEL_ID} button[aria-pressed="true"]{border-color:var(--gold-bright,#f4d69e);background:rgba(230,185,111,.10)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${DEBRIEF_ID}[hidden]{display:none}
.${P}-map-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;transition:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] *{transition:none!important;animation:none!important}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} *{transition:none!important;animation:none!important;scroll-behavior:auto!important}
}
@media (max-width:620px){
  #${PANEL_ID}{padding:9px;font-size:10px}
  #${GROUP_ID}{grid-template-columns:repeat(2,minmax(0,1fr))}
  #${CANVAS_ID}{max-width:240px}
}
`;

/* ---------- E063-01 : faits sémantiques, lisibles sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une carte se lit grâce à deux couches invisibles mais essentielles : une grille de lecture (méridiens et parallèles, qui portent les coordonnées) et des repères visuels (symboles de lieu qui arriment le regard). Le canevas ci-dessous est une plate carrée schématique.',
    'La lecture d’une coordonnée est une formule, pas une estimation : lon(x) = −180 + x × 360 / 900 et lat(y) = 90 − y × 180 / 620. Le centre du cadre vaut longitude 0°, latitude 0° : c’est la croisée du méridien de Greenwich et de l’équateur.',
    'Le pas de la grille fixe la précision : l’incertitude vaut la moitié du pas. Un pas fin de 10° donne ±5°, soit une précision trois fois meilleure que le pas grossier de 30° (±15°), car 30 / 10 = 3.',
    'Limite falsifiable : une seule barre d’échelle ne peut pas être juste partout sur une plate carrée. L’échelle vaut 44,44 km/unité en longitude mais 32,26 km/unité en latitude (rapport 1,378) : les distances près des pôles sont déformées.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function line(ctx, parent, index, label, text, id) {
  const p = ctx.el('p', P + '-ligne');
  p.append(
    ctx.el('strong', '', `E063-${String(index).padStart(2, '0')} · ${label}. `),
    ctx.el('span', P + '-value', text),
  );
  if (id) p.lastChild.id = id;
  parent.appendChild(p);
  return p.lastChild;
}

/* ---------- E063-08 : tableau captioné des repères (texte sémantique) ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Symboles de repères visuels et coordonnée lue — la forme distingue le genre, jamais la seule couleur.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Symbole', 'Genre', 'Nom du repère', 'Longitude ; latitude'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  LANDMARKS.forEach((landmark) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = GLYPHES[landmark.forme] || '◆';
    tr.appendChild(th);
    [landmark.genre, landmark.nom, `${num(landmark.lon, 0)}° ; ${num(landmark.lat, 0)}°`].forEach((value) => {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- Construction du panneau (texte lisible sans JS) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: Array.from(existant.querySelectorAll('.' + P + '-pas')),
      azimut: document.getElementById(AZIMUT_ID),
      azimutOut: document.getElementById(AZIMUT_OUT_ID),
      readout: document.getElementById(READOUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      grille: document.getElementById(GRID_ID),
      nord: document.getElementById(NORTH_ID),
      play: document.getElementById(PLAY_ID),
      reset: document.getElementById(RESET_ID),
      pasText: document.getElementById(PAS_ID),
      debrief: document.getElementById(DEBRIEF_ID),
      debriefBtn: document.getElementById(DEBRIEF_BTN_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.setAttribute('data-sim', 'grille-lecture-reperes-visuels');

  const title = ctx.el('h2', '', 'Repères visuels et grille de lecture — comment lire une carte (V2)');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Un laboratoire autonome sur la lecture d’une carte : grille de méridiens et de parallèles, précision du pas, orientation par flèche du nord, barre d’échelle et symboles de lieu. Toutes les grandeurs sont recalculées par formule et écrites en texte.');
  lead.id = LEAD_ID;
  panel.append(title, lead, staticFacts());

  /* E063-01 — amorce textuelle, lisible sans aucune interaction. */
  const intro = ctx.el('p', P + '-ligne', '');
  intro.id = INTRO_ID;
  intro.append(
    ctx.el('strong', '', 'E063-01 · Principe. '),
    document.createTextNode('La grille porte les coordonnées, les repères arriment le regard ; le canevas schématique ne détient aucune information exclusive et la couleur n’est jamais le seul support d’information.'),
  );
  panel.appendChild(intro);

  /* E063-03 — lecture des coordonnées, formules explicites. */
  line(ctx, panel, 3, 'Lire une coordonnée',
    `lon(x) = −180 + x × 360 / ${MAP_W} ; lat(y) = 90 − y × 180 / ${MAP_H}. ` +
    `Le centre du cadre vaut longitude 0°, latitude 0° (croisée du méridien de Greenwich et de l’équateur).`,
    COORD_ID);
  line(ctx, panel, 3, 'Curseur de lecture',
    `Position initiale : centre du cadre, longitude 0,0°, latitude 0,0°.`,
    P + '-cursor-text');

  /* E063-04 — pas de grille et précision de lecture. */
  const pasText = line(ctx, panel, 4, 'Pas et précision',
    `Pas moyen 20° : ${cellsOf(20).lon} méridiens × ${cellsOf(20).lat} parallèles, ` +
    `soit ${cellsOf(20).lon * cellsOf(20).lat} cases ; incertitude de lecture ±${num(precisionOf(20), 0)}°.`,
    PAS_ID);

  /* E063-05 — orientation par flèche du nord. */
  line(ctx, panel, 5, 'Orientation',
    'L’azimut du haut indique quelle direction cardinale pointe vers le haut de la carte ; la flèche du nord montre l’opposé. Réglage initial : 0°, haut = Nord, flèche vers le haut.');

  /* E063-06 — échelle et barre, grandeurs référencées. */
  line(ctx, panel, 6, 'Échelle et barre',
    `1 unité = ${num(KM_PAR_UNITE_LON, 2)} km en longitude. Une barre de ${BAR_KM} km mesure ` +
    `${num(barUnits(BAR_KM), 1)} unités, soit ${num((barUnits(BAR_KM) / MAP_W) * 100, 1)} % de la largeur du cadre.`);

  /* E063-06 — mesures chiffrées, dont une comparée à une référence réelle. */
  const mesures = ctx.el('ul', P + '-liste');
  mesures.id = MESURES_ID;
  const items = [
    `Référence : la largeur du cadre vaut ${num(WORLD_KM, 0)} km, soit presque le tour de la Terre à l’équateur (${num(EARTH_EQUATOR_KM, 0)} km) — rapport ${num(WORLD_KM / EARTH_EQUATOR_KM, 3)}.`,
    `Échelle en longitude : ${num(WORLD_KM, 0)} km / ${MAP_W} unités = ${num(KM_PAR_UNITE_LON, 2)} km par unité.`,
    `Échelle en latitude : ${num(HALF_WORLD_KM, 0)} km / ${MAP_H} unités = ${num(KM_PAR_UNITE_LAT, 2)} km par unité.`,
    `Distorsion : rapport de ${num(DISTORSION, 3)} entre les deux échelles ; le pas fin (10°) réduit l’incertitude d’un facteur ${num(PASSES[0].pas / PASSES[2].pas, 0)} par rapport au pas grossier (30°).`,
    `Barre de ${BAR_KM} km : ${num(barUnits(BAR_KM), 1)} unités en longitude.`,
  ];
  items.forEach((text, i) => {
    const item = ctx.el('li', '', text);
    item.id = P + '-mesure-' + i;
    mesures.appendChild(item);
  });
  panel.appendChild(mesures);

  /* E063-04 — radiogroupe de trois pas (choix unique : pas d'aria-pressed). */
  const group = ctx.el('div', P + '-group');
  group.id = GROUP_ID;
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', 'Choisir le pas de la grille de lecture (choix unique)');
  const radios = [];
  PASSES.forEach((preset, i) => {
    const radio = ctx.el('button', P + '-pas',
      `${preset.nom} — ${num(preset.pas, 0)}° (±${num(precisionOf(preset.pas), 0)}°)`);
    radio.type = 'button';
    radio.id = P + '-radio-' + i;
    radio.setAttribute('role', 'radio');
    radio.setAttribute('aria-checked', i === S.selected ? 'true' : 'false');
    radio.tabIndex = i === S.selected ? 0 : -1;
    radios.push(radio);
    group.appendChild(radio);
  });
  panel.appendChild(group);

  /* E063-05 — curseur d'azimut, avec libellé et valeur vocalisée. */
  const azimutLabel = ctx.el('label', '', 'Azimut du haut de la carte : ');
  azimutLabel.id = AZIMUT_LABEL_ID;
  azimutLabel.htmlFor = AZIMUT_ID;
  const azimutOut = ctx.el('span', P + '-value', '');
  azimutOut.id = AZIMUT_OUT_ID;
  azimutLabel.appendChild(azimutOut);
  panel.appendChild(azimutLabel);
  const azimut = document.createElement('input');
  azimut.type = 'range';
  azimut.id = AZIMUT_ID;
  azimut.min = '0';
  azimut.max = '180';
  azimut.step = '15';
  azimut.value = String(S.azimut);
  azimut.setAttribute('aria-labelledby', AZIMUT_LABEL_ID);
  azimut.setAttribute('aria-valuetext', `${num(S.azimut, 0)} degrés — haut ${compassOf(S.azimut)}`);
  panel.appendChild(azimut);

  /* E063-09 — unique région live. */
  const readout = ctx.el('p', P + '-readout', '');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  panel.appendChild(readout);

  /* E063-03 / E063-07 — laboratoire canvas, redondant avec le texte. */
  const figure = ctx.el('figure', P + '-figure');
  figure.id = FIGURE_ID;
  const canvas = ctx.el('canvas', P + '-canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Canevas schématique de lecture : une grille de méridiens et de parallèles, des symboles de repères par forme, ' +
    'une flèche du nord et une barre d’échelle, avec un curseur de lecture. ' +
    'Flèches pour déplacer le curseur, Plus et Moins pour changer le pas, G pour la grille, N pour le nord, zéro pour le centre.');
  canvas.setAttribute('aria-describedby', CAPTION_ID + ' ' + CLAVIER_ID);
  const caption = ctx.el('figcaption', P + '-caption',
    'Canevas schématique en plate carrée, non à l’échelle du terrain : le trait long est le méridien 0° et l’équateur, la croix est le curseur, la barre porte sa valeur en kilomètres. Coordonnées, échelle et repères sont écrits en texte.');
  caption.id = CAPTION_ID;
  figure.append(canvas, caption);
  panel.appendChild(figure);

  /* E063-07 — légende en glyphes, jamais la seule couleur. */
  const legend = ctx.el('p', P + '-ligne',
    'E063-07 · Repères : ● capitale · ■ ville · ▲ montagne · ◆ sommet · ✛ station · ✦ phare. ' +
    'Chaque genre a une silhouette distincte, reconnaissable même en niveaux de gris : la couleur n’est jamais le seul indice.');
  legend.id = LEGEND_ID;
  panel.appendChild(legend);

  panel.appendChild(staticTable());

  /* E063-09 — bascules indépendantes (aria-pressed légitime) et commandes. */
  const actions = ctx.el('div', P + '-actions');
  actions.id = ACTIONS_ID;
  const grille = ctx.el('button', P + '-bascule', 'Grille : affichée');
  grille.type = 'button';
  grille.id = GRID_ID;
  grille.setAttribute('aria-pressed', 'true');
  grille.setAttribute('aria-controls', CANVAS_ID);
  const nord = ctx.el('button', P + '-bascule', 'Nord : affiché');
  nord.type = 'button';
  nord.id = NORTH_ID;
  nord.setAttribute('aria-pressed', 'true');
  nord.setAttribute('aria-controls', CANVAS_ID);
  const play = ctx.el('button', P + '-play', 'Lancer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', 'false');
  play.setAttribute('aria-controls', READOUT_ID);
  const reset = ctx.el('button', P + '-reset', 'Revenir au centre');
  reset.type = 'button';
  reset.id = RESET_ID;
  actions.append(grille, nord, play, reset);
  panel.appendChild(actions);

  const clavier = ctx.el('p', P + '-ligne',
    'E063-09 · Clavier : Tab atteint les trois pas, le curseur d’azimut, les bascules, le balayage, la réinitialisation puis le canevas. ' +
    'Sur le canevas, ← → déplacent le curseur d’une case en longitude, ↑ ↓ d’une case en latitude, + et − changent le pas, ' +
    '0 revient au centre, G bascule la grille, N bascule la flèche du nord, Espace lance ou arrête le balayage. ' +
    'Sur un pas, ← → parcourent les trois valeurs du groupe. Le pointeur fait le même travail que les flèches.');
  clavier.id = CLAVIER_ID;
  panel.appendChild(clavier);

  /* E063-10 — limite falsifiable en cinq temps, alignée sur l'angle mort. */
  const limite = ctx.el('p', P + '-ligne',
    'E063-10 · Limite et vérification : 1) prédire qu’au centre la lecture donne longitude 0°, latitude 0° ; ' +
    `2) régler le pas fin (10°) ; 3) attendre l’incertitude annoncée, ±${num(precisionOf(10), 0)}°, ` +
    `contre ±${num(precisionOf(30), 0)}° au pas grossier ; ` +
    '4) falsifier si l’écart entre deux lectures voisines dépasse la moitié du pas annoncé ; ' +
    '5) débrief : ouvrir le paragraphe ci-dessous pour lire l’angle mort de la plate carrée.');
  limite.id = LIMITE_ID;
  panel.appendChild(limite);

  const debriefBtn = ctx.el('button', P + '-debrief-btn', 'Révéler le débrief (angle mort)');
  debriefBtn.type = 'button';
  debriefBtn.id = DEBRIEF_BTN_ID;
  debriefBtn.setAttribute('aria-expanded', 'false');
  debriefBtn.setAttribute('aria-controls', DEBRIEF_ID);
  panel.appendChild(debriefBtn);

  const debrief = ctx.el('p', P + '-ligne',
    `Débrief : la grille est une plate carrée schématique — l’échelle vaut ${num(KM_PAR_UNITE_LON, 2)} km/unité ` +
    `en longitude mais ${num(KM_PAR_UNITE_LAT, 2)} km/unité en latitude (rapport ${num(DISTORSION, 3)}). ` +
    'Aucune barre unique n’est donc juste partout et les distances près des pôles sont déformées : c’est la limite falsifiable du modèle.');
  debrief.id = DEBRIEF_ID;
  debrief.hidden = true;
  panel.appendChild(debrief);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true, radios, azimut, azimutOut, readout, canvas,
    grille, nord, play, reset, pasText, debrief, debriefBtn,
  };
}

/* ---------- E063-07 : tracé d'un symbole par sa FORME ---------- */

function drawSymbol(painter, forme, x, y, size) {
  painter.beginPath();
  if (forme === 'cercle') {
    painter.arc(x, y, size, 0, Math.PI * 2);
  } else if (forme === 'carre') {
    painter.rect(x - size, y - size, size * 2, size * 2);
  } else if (forme === 'triangle') {
    painter.moveTo(x, y - size * 1.2);
    painter.lineTo(x + size, y + size);
    painter.lineTo(x - size, y + size);
    painter.closePath();
  } else if (forme === 'losange') {
    painter.moveTo(x, y - size * 1.2);
    painter.lineTo(x + size, y);
    painter.lineTo(x, y + size * 1.2);
    painter.lineTo(x - size, y);
    painter.closePath();
  } else if (forme === 'croix') {
    painter.moveTo(x - size, y); painter.lineTo(x + size, y);
    painter.moveTo(x, y - size); painter.lineTo(x, y + size);
  } else { /* etoile : huit rayons */
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? size * 1.2 : size * 0.5;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) painter.moveTo(px, py); else painter.lineTo(px, py);
    }
    painter.closePath();
  }
  painter.stroke();
}

/* ---------- E063-03 / 04 / 05 / 06 / 07 : dessin déterministe ---------- */

function drawScene() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const painter = cv.getContext('2d');
  if (!painter) return;
  const cssW = Math.max(160, Math.min(300, cv.clientWidth || 300));
  const cssH = cssW * (MAP_H / MAP_W);
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pxW = Math.round(cssW * dpr);
  const pxH = Math.round(cssH * dpr);
  if (cv.width !== pxW || cv.height !== pxH) {
    cv.width = pxW;
    cv.height = pxH;
  }
  painter.setTransform(dpr, 0, 0, dpr, 0, 0);
  painter.clearRect(0, 0, cssW, cssH);

  let theme = null;
  try { theme = typeof getComputedStyle === 'function' ? getComputedStyle(cv) : null; } catch { /* repli */ }
  const color = (name, fallback) => {
    const value = theme ? theme.getPropertyValue(name).trim() : '';
    return value || fallback;
  };
  const ink = color('--ink', '#e8e6e0');
  const gold = color('--gold', '#d9b166');
  const bright = color('--gold-bright', '#f4d69e');
  const muted = color('--muted', '#9aa0a8');
  const sx = cssW / MAP_W;
  const sy = cssH / MAP_H;

  painter.lineWidth = 1;
  painter.strokeStyle = muted;
  painter.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);

  /* E063-04 — grille de lecture au pas choisi. */
  const pas = PASSES[S.selected].pas;
  if (S.showGrid) {
    painter.strokeStyle = muted;
    painter.globalAlpha = 0.35;
    painter.lineWidth = 1;
    painter.setLineDash([2, 4]);
    for (let lon = -180; lon <= 180; lon += pas) {
      const gx = xFromLon(lon) * sx;
      painter.beginPath(); painter.moveTo(gx, 0); painter.lineTo(gx, cssH); painter.stroke();
    }
    for (let lat = -90; lat <= 90; lat += pas) {
      const gy = yFromLat(lat) * sy;
      painter.beginPath(); painter.moveTo(0, gy); painter.lineTo(cssW, gy); painter.stroke();
    }
    painter.setLineDash([]);
    painter.globalAlpha = 1;
  }

  /* Méridien de Greenwich (0°) et équateur (0°) : tiret long, distinct par
     la forme du trait et non par la couleur. */
  painter.strokeStyle = gold;
  painter.globalAlpha = 0.7;
  painter.setLineDash([6, 3]);
  painter.beginPath();
  const gx0 = xFromLon(0) * sx;
  painter.moveTo(gx0, 0); painter.lineTo(gx0, cssH);
  const gy0 = yFromLat(0) * sy;
  painter.moveTo(0, gy0); painter.lineTo(cssW, gy0);
  painter.stroke();
  painter.setLineDash([]);
  painter.globalAlpha = 1;

  /* E063-07 — repères visuels schématiques, dispersés sur le canevas. */
  painter.strokeStyle = ink;
  painter.lineWidth = 1.6;
  const markSize = Math.max(3, Math.round(cssW * 0.014));
  LANDMARKS.forEach((landmark) => {
    drawSymbol(painter, landmark.forme, xFromLon(landmark.lon) * sx, yFromLat(landmark.lat) * sy, markSize);
  });

  /* E063-06 — barre d'échelle de BAR_KM, longueur recalculée, bornes en T. */
  const barPx = barUnits(BAR_KM) * sx;
  const barX = cssW - barPx - 8;
  const barY = cssH - 10;
  painter.strokeStyle = bright;
  painter.lineWidth = 2;
  painter.beginPath();
  painter.moveTo(barX, barY); painter.lineTo(barX + barPx, barY);
  painter.moveTo(barX, barY - 3); painter.lineTo(barX, barY + 3);
  painter.moveTo(barX + barPx, barY - 3); painter.lineTo(barX + barPx, barY + 3);
  painter.stroke();
  painter.fillStyle = bright;
  painter.font = `${Math.max(8, Math.round(cssW * 0.032))}px sans-serif`;
  painter.fillText(`${BAR_KM} km`, barX, barY - 5);

  /* E063-05 — flèche du nord : elle pointe à l'opposé de l'azimut du haut. */
  if (S.showNorth) {
    const nx = 16;
    const ny = 18;
    const angle = -S.azimut * RAD;
    const dx = Math.sin(angle);
    const dy = -Math.cos(angle);
    const len = Math.max(12, cssW * 0.06);
    painter.strokeStyle = bright;
    painter.fillStyle = bright;
    painter.lineWidth = 1.6;
    painter.beginPath();
    painter.moveTo(nx, ny);
    painter.lineTo(nx + dx * len, ny + dy * len);
    painter.stroke();
    const tipX = nx + dx * len;
    const tipY = ny + dy * len;
    const perpX = -dy;
    const perpY = dx;
    painter.beginPath();
    painter.moveTo(tipX, tipY);
    painter.lineTo(tipX - dx * 5 + perpX * 3, tipY - dy * 5 + perpY * 3);
    painter.lineTo(tipX - dx * 5 - perpX * 3, tipY - dy * 5 - perpY * 3);
    painter.closePath();
    painter.fill();
    painter.font = `bold ${Math.max(8, Math.round(cssW * 0.036))}px sans-serif`;
    painter.fillText('N', tipX + dx * 8 - 3, tipY + dy * 8 + 3);
  }

  /* Curseur de lecture : une croix, dont la position est redondée en texte. */
  const cx = S.cursor.x * sx;
  const cy = S.cursor.y * sy;
  painter.strokeStyle = gold;
  painter.lineWidth = 1.4;
  painter.beginPath();
  painter.moveTo(cx - 7, cy); painter.lineTo(cx + 7, cy);
  painter.moveTo(cx, cy - 7); painter.lineTo(cx, cy + 7);
  painter.stroke();
  painter.beginPath();
  painter.arc(cx, cy, 3, 0, Math.PI * 2);
  painter.stroke();
}

/* ---------- E063-09 : unique région live ---------- */

function writeReadout(cause) {
  const n = S.nodes.readout;
  if (!n) return;
  const lon = lonAt(S.cursor.x);
  const lat = latAt(S.cursor.y);
  const pas = PASSES[S.selected].pas;
  const precision = precisionOf(pas);
  const near = nearestLandmark(S.cursor.x, S.cursor.y);
  const verbs = {
    balayage: 'Balayage en cours',
    clavier: 'Lecture au clavier',
    pointeur: 'Lecture au pointeur',
    pas: 'Pas de grille modifié',
    azimut: 'Orientation modifiée',
    grille: 'Grille de lecture',
    nord: 'Flèche du nord',
    demarrage: 'Balayage lancé',
    arret: 'Balayage arrêté',
    reset: 'Retour au centre',
  };
  const text =
    `${verbs[cause] || 'Lecture'} · curseur à longitude ${num(lon, 1)}°, latitude ${num(lat, 1)}° · ` +
    `grille pas ${num(pas, 0)}°, incertitude de lecture ±${num(precision, 0)}° · ` +
    `haut de carte : ${compassOf(S.azimut)} (azimut ${num(S.azimut, 0)}°) · ` +
    `échelle ${num(KM_PAR_UNITE_LON, 2)} km/unité en longitude · ` +
    `repère le plus proche : ${near.landmark.nom} (${num(near.distanceUnites, 0)} unités).`;
  if (S.readoutText !== text) {
    n.textContent = text;
    S.readoutText = text;
  }
}

/* Met à jour le texte du curseur (redondance du canvas). */
function refreshCursorText() {
  const n = document.getElementById(P + '-cursor-text');
  if (!n) return;
  const lon = lonAt(S.cursor.x);
  const lat = latAt(S.cursor.y);
  n.textContent =
    `Curseur : longitude ${num(lon, 1)}°, latitude ${num(lat, 1)}° ` +
    `(recalculé depuis la position dans le cadre ${MAP_W} × ${MAP_H}).`;
}

/* E063-04 — sélection du pas : textes, aria-checked, roving tabindex. */
function applyPas(index, cause) {
  S.selected = clamp(index, 0, PASSES.length - 1);
  const pas = PASSES[S.selected].pas;
  const cells = cellsOf(pas);
  S.nodes.radios.forEach((radio, i) => {
    const on = i === S.selected;
    radio.setAttribute('aria-checked', on ? 'true' : 'false');
    radio.tabIndex = on ? 0 : -1;
  });
  if (S.nodes.pasText) {
    S.nodes.pasText.textContent =
      `Pas ${num(pas, 0)}° : ${cells.lon} méridiens × ${cells.lat} parallèles, ` +
      `soit ${cells.lon * cells.lat} cases ; incertitude de lecture ±${num(precisionOf(pas), 0)}°.`;
  }
  drawScene();
  writeReadout(cause || 'pas');
}

/* ---------- E063-09 : synchronisation et garde-fous d'écouteurs ---------- */

function syncControls() {
  const n = S.nodes;
  if (n.radios) {
    n.radios.forEach((radio, i) => {
      radio.setAttribute('aria-checked', i === S.selected ? 'true' : 'false');
      radio.tabIndex = i === S.selected ? 0 : -1;
    });
  }
  if (n.azimut) {
    n.azimut.value = String(S.azimut);
    n.azimut.setAttribute('aria-valuetext', `${num(S.azimut, 0)} degrés — haut ${compassOf(S.azimut)}`);
  }
  if (n.azimutOut) n.azimutOut.textContent = `${num(S.azimut, 0)}° — haut ${compassOf(S.azimut)}`;
  if (n.grille) {
    n.grille.setAttribute('aria-pressed', S.showGrid ? 'true' : 'false');
    n.grille.textContent = S.showGrid ? 'Grille : affichée' : 'Grille : masquée';
  }
  if (n.nord) {
    n.nord.setAttribute('aria-pressed', S.showNorth ? 'true' : 'false');
    n.nord.textContent = S.showNorth ? 'Nord : affiché' : 'Nord : masqué';
  }
  if (n.play) {
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
    n.play.textContent = S.playing ? 'Arrêter le balayage' : 'Lancer le balayage';
  }
  if (n.debriefBtn) n.debriefBtn.setAttribute('aria-expanded', S.debriefOpen ? 'true' : 'false');
  if (n.debrief) n.debrief.hidden = !S.debriefOpen;
  const panel = document.getElementById(PANEL_ID);
  if (panel) panel.setAttribute(REDUCED_ATTR, reduced() ? '1' : '0');
  drawScene();
  refreshCursorText();
  writeReadout('clavier');
}

function addMapBadge(ctx) {
  const host = ctx.layout || ctx.stage;
  const map = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(MAP_BADGE_ID)) return;
  const badge = ctx.el('div', P + '-map-badge', '');
  badge.id = MAP_BADGE_ID;
  badge.textContent = 'Schéma pédagogique en plate carrée — échelle, pas et repères donnés en texte, non à l’échelle du terrain.';
  map.appendChild(badge);
}

/* ---------- E063-10 : boucle rAF unique, pause et mouvement réduit ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen) return;
  if (reduced()) return;
  S.lastTs = 0;
  if (typeof requestAnimationFrame !== 'function') { tick(0); return; }
  S.rafId = requestAnimationFrame(tick);
}

/* Balayage déterministe : sin/cos du temps écoulé, sans tirage aléatoire.
   Le curseur reste toujours dans le cadre par clampCoord(). */
function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen) return;
  if (reduced()) { S.playing = false; syncControls(); return; }
  if (S.lastTs && S.playing) {
    S.elapsed += Math.min(80, ts - S.lastTs);
    const phase = (S.elapsed / SWEEP_MS) * Math.PI * 2;
    const spanX = MAP_W / 2 - 20;
    const spanY = MAP_H / 2 - 20;
    const cx = MAP_W / 2 + spanX * Math.sin(phase);
    const cy = MAP_H / 2 + spanY * Math.sin(phase * 0.8 + 0.6);
    S.cursor = clampCoord(cx, cy);
    drawScene();
    refreshCursorText();
    writeReadout('balayage');
  }
  S.lastTs = ts;
  if (S.playing && !reduced()) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !reduced()) startLoop();
      else drawScene();
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
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source vivante. */ }
  }
}

/* E063-10 — IntersectionObserver : suspend le balayage hors écran. */
function ensureObserver(canvas) {
  if (typeof IntersectionObserver !== 'function') { S.onScreen = true; return; }
  if (S.io && S.ioCanvas === canvas) return;
  if (S.io) S.io.disconnect();
  S.io = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    S.onScreen = entry ? entry.isIntersecting : true;
    if (!S.onScreen) stopLoop();
    else if (S.playing && !reduced()) startLoop();
  }, { threshold: 0.01 });
  S.io.observe(canvas);
  S.ioCanvas = canvas;
}

/* ---------- E063-09 : clavier ---------- */

function onKey(event) {
  const target = event.target;
  const isRadio = target && target.classList && target.classList.contains(P + '-pas');
  const isCanvas = target === S.nodes.canvas;
  if (!isRadio && !isCanvas) return;

  /* Sur un radio, ← → parcourent les trois pas (convention radiogroupe). */
  if (isRadio && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
    const dir = (event.key === 'ArrowRight' || event.key === 'ArrowDown') ? 1 : -1;
    applyPas((S.selected + dir + PASSES.length) % PASSES.length, 'pas');
    const radio = S.nodes.radios[S.selected];
    if (radio) radio.focus();
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  const stepLon = (PASSES[S.selected].pas / 360) * MAP_W;
  const stepLat = (PASSES[S.selected].pas / 180) * MAP_H;
  const c = S.cursor;
  if (event.key === 'ArrowRight') S.cursor = clampCoord(c.x + stepLon, c.y);
  else if (event.key === 'ArrowLeft') S.cursor = clampCoord(c.x - stepLon, c.y);
  else if (event.key === 'ArrowDown') S.cursor = clampCoord(c.x, c.y + stepLat);
  else if (event.key === 'ArrowUp') S.cursor = clampCoord(c.x, c.y - stepLat);
  else if (event.key === '+' || event.key === '=') { applyPas(S.selected + 1, 'pas'); return; }
  else if (event.key === '-' || event.key === '_') { applyPas(S.selected - 1, 'pas'); return; }
  else if (event.key === '0') S.cursor = clampCoord(MAP_W / 2, MAP_H / 2);
  else if (event.key === 'g' || event.key === 'G') {
    S.showGrid = !S.showGrid;
    syncControls();
    writeReadout('grille');
    return;
  } else if (event.key === 'n' || event.key === 'N') {
    S.showNorth = !S.showNorth;
    syncControls();
    writeReadout('nord');
    return;
  } else if (event.key === ' ' || event.key === 'Spacebar') {
    togglePlay();
    return;
  } else return;
  event.preventDefault();
  event.stopPropagation();
  drawScene();
  refreshCursorText();
  writeReadout('clavier');
}

/* Balayage : en mouvement réduit, on décale le curseur d'un demi-cadre de
   façon déterministe au lieu d'animer. */
function togglePlay() {
  if (reduced()) {
    S.cursor = clampCoord(
      S.cursor.x < MAP_W / 2 ? MAP_W * 0.75 : MAP_W * 0.25,
      S.cursor.y,
    );
    S.playing = false;
    stopLoop();
    syncControls();
    writeReadout('clavier');
    return;
  }
  S.playing = !S.playing;
  if (!S.playing) {
    stopLoop();
    writeReadout('arret');
  } else {
    S.elapsed = 0;
    startLoop();
    writeReadout('demarrage');
  }
  syncControls();
}

/* ---------- Point d'entrée ---------- */

register('E063', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E063-01 — bloc CSS isolé, une seule fois, identifiants préfixés. */
  ctx.css('geography-v2-e063', CSS);

  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;

  const layout = ctx.layout || ctx.stage;
  S.renders += 1;
  layout.setAttribute('data-' + P + '-render', String(S.renders));
  layout.setAttribute('data-' + P + '-pas', String(PASSES[S.selected].pas));
  layout.setAttribute('data-' + P + '-azimut', String(S.azimut));

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);
  if (reduced()) { S.playing = false; stopLoop(); }

  syncControls();
  applyPas(S.selected, 'balayage');

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.panel.addEventListener('keydown', onKey);
    n.radios.forEach((radio, i) => {
      radio.addEventListener('click', () => applyPas(i, 'pas'));
    });
    n.azimut.addEventListener('input', () => {
      const value = Number(n.azimut.value);
      S.azimut = finite(value) ? clamp(value, 0, 180) : 0;
      layout.setAttribute('data-' + P + '-azimut', String(S.azimut));
      n.azimut.setAttribute('aria-valuetext', `${num(S.azimut, 0)} degrés — haut ${compassOf(S.azimut)}`);
      n.azimutOut.textContent = `${num(S.azimut, 0)}° — haut ${compassOf(S.azimut)}`;
      drawScene();
      writeReadout('azimut');
    });
    n.grille.addEventListener('click', () => {
      S.showGrid = !S.showGrid;
      syncControls();
      writeReadout('grille');
    });
    n.nord.addEventListener('click', () => {
      S.showNorth = !S.showNorth;
      syncControls();
      writeReadout('nord');
    });
    n.play.addEventListener('click', togglePlay);
    n.reset.addEventListener('click', () => {
      S.cursor = clampCoord(MAP_W / 2, MAP_H / 2);
      S.playing = false;
      stopLoop();
      syncControls();
      writeReadout('reset');
    });
    n.debriefBtn.addEventListener('click', () => {
      S.debriefOpen = !S.debriefOpen;
      syncControls();
    });

    /* Glisser sur le canevas : même relation que les flèches. */
    let drag = false;
    const movePointer = (event) => {
      if (!drag) return;
      const rect = n.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((event.clientX - rect.left) / rect.width) * MAP_W;
      const y = ((event.clientY - rect.top) / rect.height) * MAP_H;
      S.cursor = clampCoord(x, y);
      drawScene();
      refreshCursorText();
      writeReadout('pointeur');
    };
    n.canvas.addEventListener('pointerdown', (event) => {
      drag = true;
      try { n.canvas.setPointerCapture(event.pointerId); } catch { /* capture indisponible */ }
      movePointer(event);
    });
    n.canvas.addEventListener('pointermove', movePointer);
    const endDrag = () => { drag = false; };
    n.canvas.addEventListener('pointerup', endDrag);
    n.canvas.addEventListener('pointercancel', endDrag);

    ensureObserver(n.canvas);
  }

  installGlobalListeners();
  if (S.playing && !reduced()) startLoop();
});
