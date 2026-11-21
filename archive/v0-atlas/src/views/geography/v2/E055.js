import { register } from './registry.js';

/* Lentille E055 (V2) — vue GEOGRAPHIE.
 * Thème : tableau accessible des lieux et navigation séquentielle — en-têtes
 * explicites (caption, th scope), tabindex mobile (roving tabindex),
 * aria-current, garde-clavier d'un rang, critère de tri en radiogroupe,
 * grandeurs haversine comparées à un repère et laboratoire canvas
 * déterministe.
 *
 * Les dix chantiers E055-01 … E055-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E055.md. Les dix sont réellement
 * implémentés : aucun stub, aucune fonction vide. Tout est local : aucune
 * requête réseau, aucune graine aléatoire (mulberry32 + graine fixe affichée),
 * aucune journalisation, aucun fichier partagé ni module de la passe 1
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, définitions, tableau captioné, radiogroupe, défi) présent dans
 * le DOM même sans animation ; le canvas n'est qu'un laboratoire qui illustre
 * des règles déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e055- (identifiants, classes, attributs, bloc
 * CSS) : aucune collision avec la passe 1, qui utilise geography-e055-.
 */

const P = 'geography-v2-e055';

/* Identifiants, tous préfixés geography-v2-e055-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const GLOSSARY_ID = P + '-glossary';
const TABLE_ID = P + '-table';
const TRI_ID = P + '-tri';
const CRITERION_OUT_ID = P + '-criterion-value';
const NAV_ID = P + '-nav';
const KEYS_ID = P + '-keys';
const CANVAS_ID = P + '-canvas';
const LEGEND_ID = P + '-legend';
const READOUT_ID = P + '-readout';
const DEFI_ID = P + '-defi';
const LIMITE_ID = P + '-limite';
const PLAY_ID = P + '-play';
const BADGE_ID = P + '-badge';
const HELP_ID = P + '-help';
const REDUCED_ATTR = 'data-' + P + '-reduced';

/* Lieux réels, relevés dans src/data/dataset.js (aucune coordonnée fabriquée). */
const PLACES = [
  { key: 'marseille', label: 'Marseille', lat: 43.296346, lon: 5.369889, role: 'Port, cité marchande' },
  { key: 'lyon', label: 'Lyon', lat: 45.7578, lon: 4.8322, role: 'Capitale provinciale' },
  { key: 'alise', label: 'Alise-Sainte-Reine', lat: 47.5375, lon: 4.49083333, role: 'Oppidum, site de bataille' },
  { key: 'versailles', label: 'Versailles', lat: 48.8053, lon: 2.135, role: 'Résidence royale' },
  { key: 'paris', label: 'Paris', lat: 48.856578, lon: 2.351828, role: 'Chef-lieu, centre politique' },
];

/* Constantes canoniques et critères de tri. */
const R_TERRE = 6371;                 /* rayon moyen de la Terre, km */
const RAD = Math.PI / 180;
const REF_VOISIN_KM = 100;            /* repère : un voisin « proche » ≈ 100 km */
const PAS_UNIQUE = 1;                 /* une touche = un rang franchi */
const SEED = 0x45e055;                /* graine fixe, affichée sur le canvas */
const VITESSE = 0.0011;               /* progression du curseur animé, par ms */

const CRITERES = {
  rang: 'Rang du jeu de données',
  nord: 'Latitude (nord → sud)',
  voisin: 'Voisin le plus proche (croissant)',
};
const CRITERE_ORDER = ['rang', 'nord', 'voisin'];

/* État de module : survit au stage.replaceChildren() de la coque. */
const S = {
  index: 0,              /* identité du lieu courant (indice dans PLACES) */
  sort: 'rang',          /* critère de tri du radiogroupe */
  order: [],             /* rangs affichés : indices de PLACES dans l'ordre */
  playing: false,
  phase: 0,              /* position du curseur animé, entre 0 et 1 */
  inView: true,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  observer: null,
  resizeObserver: null,
  nodes: {},
};

/* ctx.reducedMotion() conservé hors du point d'entrée pour la boucle rAF. */
let ctxReduced = null;

/* ---------- Formules déterministes et formatage français ---------- */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

const fmt = (n, d) => {
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};

/* mulberry32 : générateur à graine fixe, aucun Math.random. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const RNG = mulberry32(SEED);
const TICKS = PLACES.map(() => RNG()); /* décorations fixes, reproductibles */

/* E055-02 : distance du grand cercle (haversine) entre deux lieux, en km. */
function haversine(a, b) {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * R_TERRE * Math.asin(Math.min(1, Math.sqrt(s)));
}

/* Distance au premier lieu du jeu (Marseille), repère de la colonne tableau. */
function distanceOrigin(index) {
  return haversine(PLACES[0], PLACES[index]);
}

/* Voisin le plus proche d'un lieu, en km, sur l'effectif complet. */
function nearestDistance(index) {
  let best = Infinity;
  for (let j = 0; j < PLACES.length; j += 1) {
    if (j === index) continue;
    const d = haversine(PLACES[index], PLACES[j]);
    if (d < best) best = d;
  }
  return best === Infinity ? null : best;
}

/* E055-04 : l'ordre affiché découle du critère, avec départage déterministe. */
function computeOrder(criterion) {
  const idx = PLACES.map((_, i) => i);
  if (criterion === 'nord') {
    return idx.slice().sort((a, b) => (PLACES[b].lat - PLACES[a].lat) || (a - b));
  }
  if (criterion === 'voisin') {
    return idx.slice().sort((a, b) => (nearestDistance(a) - nearestDistance(b)) || (a - b));
  }
  return idx;
}
function recomputeOrder() {
  S.order = computeOrder(S.sort);
}

/* Nombre de pas séquentiels entre deux rangs affichés (une touche = un pas). */
function pasSequentiels(depart, arrivee) {
  return Math.abs(arrivee - depart);
}

/* ---------- E055-01 : bloc CSS unique, préfixé, sans réseau ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PANEL_ID} .${P}-limite{
  margin:7px 0;padding:7px 9px;border:1px dashed var(--gold,#e6b96f);border-radius:7px;
  color:var(--ink-soft,#d7d1c6);
}
#${PANEL_ID} dl{margin:6px 0}
#${PANEL_ID} dt{color:var(--gold-bright,#f4d69e);font-weight:600;margin-top:6px}
#${PANEL_ID} dd{margin:2px 0 4px 12px;color:var(--ink-soft,#d7d1c6)}
#${PANEL_ID} ol.${P}-defi{margin:6px 0 6px 18px;padding:0}
#${PANEL_ID} ol.${P}-defi li{margin:3px 0;color:var(--ink-soft,#d7d1c6)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} thead th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${TABLE_ID} tbody th{color:var(--ink);font-weight:600;width:3em}
#${TABLE_ID} tr[data-${P}-courant="1"]{background:rgba(230,185,111,.1)}
#${TRI_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${TRI_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} .${P}-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${NAV_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${NAV_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-row-btn{
  display:block;width:100%;min-height:44px;margin:3px 0;padding:7px 9px;
  border:1px solid var(--line);border-radius:7px;background:transparent;
  color:var(--muted);font:inherit;font-size:10px;text-align:left;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} .${P}-row-btn[aria-current="true"]{
  border-color:var(--gold,#e6b96f);color:var(--gold-bright,#f4d69e);
  background:rgba(230,185,111,.1);
}
#${PANEL_ID} .${P}-courant{margin-left:6px;color:var(--gold-bright,#f4d69e);font-weight:700}
#${KEYS_ID},#${LEGEND_ID}{margin:5px 0;font-size:10px;color:var(--muted)}
#${CANVAS_ID}{
  display:block;width:100%;height:260px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${READOUT_ID}{
  min-height:46px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} button.${P}-ctrl{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button.${P}-ctrl:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} button.${P}-ctrl[aria-pressed="true"]{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.16)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${PANEL_ID} .${P}-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,
#${PANEL_ID}[${REDUCED_ATTR}="1"] .${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:220px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* ---------- E055-01 : contenu sémantique, lisible sans le laboratoire ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un tableau accessible ne se résume pas à une suite de noms : il porte une légende (caption), un en-tête par colonne (th scope="col") et un en-tête par ligne (th scope="row"). Une technologie d’association peut alors annoncer « Latitude, 43,3 » en liant la valeur à sa colonne, et « rang 3 » en liant la ligne à son en-tête.',
    'La navigation séquentielle déplace le focus d’un rang à la fois. Le motif du « focus mobile » (roving tabindex) veut qu’un seul bouton ait tabindex 0 et tous les autres tabindex − 1 : la tabulation entre dans la liste en un point, puis les flèches déplacent ce point d’une ligne, au lieu d’enchaîner cinq arrêts inutiles.',
    'Le rang courant est désigné par aria-current="true" et par un suffixe textuel « ◀ COURANT » dans le bouton, par « — actif » dans le tableau et par un triangle avec le mot « COURANT » sur le canvas. Aucune information n’est confiée à la seule couleur. Le garde-clavier intercepte Flèche bas, Flèche haut, Début et Fin avant le routeur global.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* E055-01 : lexique défini à la première occurrence. */
function staticGlossary() {
  const wrap = document.createElement('div');
  const h = document.createElement('h3');
  h.textContent = 'Lexique';
  wrap.appendChild(h);
  const dl = document.createElement('dl');
  dl.id = GLOSSARY_ID;
  const entrees = [
    ['Tableau accessible', 'Tableau doté d’une légende, d’en-têtes de colonnes et d’en-têtes de ligne, afin que chaque cellule puisse être reliée à son contexte par un lecteur d’écran.'],
    ['Tabindex mobile (roving tabindex)', 'Motif où un seul élément d’un groupe est tabulable (tabindex 0) ; les flèches déplacent ce point d’un rang, les autres éléments restant à tabindex − 1.'],
    ['aria-current', 'Attribut ARIA qui signale l’élément courant d’un ensemble ; ici « true » sur l’unique bouton du rang actif, en complément d’un marqueur textuel.'],
  ];
  entrees.forEach(([terme, def]) => {
    const dt = document.createElement('dt');
    dt.textContent = terme;
    const dd = document.createElement('dd');
    dd.textContent = def;
    dl.append(dt, dd);
  });
  wrap.appendChild(dl);
  return wrap;
}

/* Limite falsifiable : elle peut être infirmée par une mesure, et elle est
 * alignée avec la rubrique « Limites et angles morts » du rapport d'audit. */
function staticLimit() {
  const p = document.createElement('p');
  p.id = LIMITE_ID;
  p.className = P + '-limite';
  p.textContent = 'Limite falsifiable : le modèle prédit qu’une touche franchit exactement un rang dans l’ordre affiché, quel que soit le critère de tri choisi, et qu’aucun déplacement ne sort de la plage 1…5. Si, àordre identique, une flèche sautait deux rangs ou si le dernier rang débordait, c’est la règle du garde-clavier qui serait invalide, non la mesure. Le canvas est schématique : les lignes sont régulièrement espacées et ne sont pas une projection géographique.';
  return p;
}

/* E055-07 : défi en cinq temps, texte réel indexable. */
function staticDefi() {
  const wrap = document.createElement('div');
  const h = document.createElement('h3');
  h.textContent = 'Défi falsifiable en cinq temps';
  wrap.appendChild(h);
  const ol = document.createElement('ol');
  ol.className = P + '-defi';
  ol.id = DEFI_ID;
  const etapes = [
    'Prédiction : dans l’ordre « Latitude (nord → sud) », prédisez quel lieu occupe le premier rang et combien de pas séparent Paris de ce rang.',
    'Réglage : cochez ce critère dans le radiogroupe, puis placez le curseur sur Paris avec les flèches ou le canvas.',
    'Résultat attendu : le premier rang est le lieu le plus au nord, et le readout annonce le nombre de pas depuis la première ligne.',
    'Falsification : si le nombre affiché diffère de l’écart réel entre les deux rangs dans l’ordre courant, la règle « une touche = un rang » est réfutée.',
    'Débrief : le comptage est une propriété de l’ordre affiché, pas de la géographie ; changer de critère change le chemin séquentiel sans changer les lieux.',
  ];
  etapes.forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    ol.appendChild(li);
  });
  wrap.appendChild(ol);
  return wrap;
}

/* ---------- E055-02 : tableau captioné, distances recalculées ---------- */

function staticTableShell() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = '';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Rang', 'Lieu', 'Latitude (°)', 'Longitude (°)', 'Depuis Marseille (km)', 'Voisin (km)', 'Rôle'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  return { table, caption, tbody };
}

/* ---------- Construction du panneau ---------- */

function toggleButton(label, id, pressed) {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = id;
  button.className = P + '-ctrl';
  button.textContent = label;
  button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  return button;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    const buttons = {};
    PLACES.forEach((pl) => { buttons[pl.key] = document.getElementById(P + '-row-' + pl.key); });
    return {
      panel: existant,
      fresh: false,
      radios: CRITERE_ORDER.map((m) => document.getElementById(P + '-tri-' + m)),
      criterionOut: document.getElementById(CRITERION_OUT_ID),
      buttons,
      nav: document.getElementById(NAV_ID),
      caption: document.getElementById(TABLE_ID).querySelector('caption'),
      tbody: document.getElementById(TABLE_ID).querySelector('tbody'),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      legend: document.getElementById(LEGEND_ID),
      play: document.getElementById(PLAY_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Tableau accessible des lieux et navigation séquentielle');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '',
    'Ce laboratoire montre qu’un tableau sémantique annonce ses en-têtes et sa ligne courante, et que la navigation séquentielle déplace le focus d’un rang par touche. Le savoir est dans le texte ; le graphique ne fait qu’illustrer des règles déterministes.');

  const formule = ctx.el('p', P + '-fait',
    'Distances recalculées par la formule haversine : d = 2·6371·asin(√a) km, avec a = sin²((φ₂−φ₁)/2) + cos φ₁·cos φ₂·sin²((λ₂−λ₁)/2). Aucun nombre n’est tiré au hasard : la décoration du canvas vient de la graine fixe ' + SEED.toString(16) + ' via mulberry32.');

  /* E055-04 : radiogroupe natif complété par un rôle explicite. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = TRI_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Critère de tri du tableau (choix unique)');
  const legend = document.createElement('legend');
  legend.textContent = 'Critère de tri du tableau (choix unique)';
  fieldset.appendChild(legend);
  const out = document.createElement('span');
  out.className = P + '-valeur';
  out.id = CRITERION_OUT_ID;
  out.textContent = CRITERES[S.sort];
  legend.appendChild(document.createTextNode(' — '));
  legend.appendChild(out);
  CRITERE_ORDER.forEach((value) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-tri';
    radio.id = P + '-tri-' + value;
    radio.value = value;
    radio.checked = S.sort === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(CRITERES[value]));
    fieldset.appendChild(lab);
  });

  /* E055-03 : un bouton par ligne, tabindex mobile, aria-current. */
  const nav = document.createElement('fieldset');
  nav.id = NAV_ID;
  const navLegend = document.createElement('legend');
  navLegend.textContent = 'Navigation séquentielle (choix d’une ligne)';
  nav.appendChild(navLegend);
  const buttons = {};
  PLACES.forEach((place) => {
    const btn = ctx.el('button', P + '-row-btn');
    btn.type = 'button';
    btn.id = P + '-row-' + place.key;
    const lbl = ctx.el('span', P + '-row-label', '');
    const marker = ctx.el('span', P + '-courant', '');
    btn.append(lbl, marker);
    buttons[place.key] = btn;
    nav.appendChild(btn);
  });

  const keys = ctx.el('p', P + '-keys',
    'Clavier : Flèche bas et Flèche haut avancent ou reculent d’un rang ; Début va au premier rang, Fin au dernier. Une touche = un rang. Sur le canvas : mêmes flèches ; T change de critère de tri ; Espace lance ou arrête l’animation.');
  keys.id = KEYS_ID;

  const tableShell = staticTableShell();

  /* E055-05 : canvas lab, focalisable et doublé en texte. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Tableau schématique de cinq lignes dans l’ordre courant : un triangle et le mot COURANT marquent le rang actif, une ligne en pointillés montre le chemin séquentiel. Flèche bas et flèche haut : changer de rang ; Début et Fin : premier et dernier rang ; T : changer de critère de tri ; Espace : lancer ou arrêter l’animation.');

  const legendText = ctx.el('p', P + '-legend', '');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const help = ctx.el('p', P + '-sr',
    'Commandes du laboratoire : boutons radio pour choisir le critère de tri ; un bouton par ligne avec tabindex mobile, Flèche bas et Flèche haut pour changer de rang, Début et Fin pour les bornes ; T sur le canvas change de tri, Espace lance ou arrête l’animation.');
  help.id = HELP_ID;
  panel.setAttribute('aria-describedby', help.id);

  const play = toggleButton('▶ Animer le parcours', PLAY_ID, S.playing);
  play.setAttribute('aria-controls', CANVAS_ID);

  panel.append(title, lead, staticFacts(), staticGlossary(), formule,
    tableShell.table, fieldset, nav, keys, canvas, legendText, readout,
    staticDefi(), staticLimit(), help, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: CRITERE_ORDER.map((m) => document.getElementById(P + '-tri-' + m)),
    criterionOut: out,
    buttons,
    nav,
    caption: tableShell.caption,
    tbody: tableShell.tbody,
    canvas,
    readout,
    legend: legendText,
    play,
  };
}

/* ---------- E055-02 / E055-03 : resynchronisation du tableau et des boutons ---------- */

function rebuildTable() {
  const tbody = S.nodes.tbody;
  if (!tbody) return;
  tbody.textContent = '';
  S.order.forEach((pi, pos) => {
    const place = PLACES[pi];
    const tr = document.createElement('tr');
    tr.id = P + '-ligne-' + place.key;
    if (pi === S.index) tr.setAttribute('data-' + P + '-courant', '1');

    const rang = document.createElement('th');
    rang.scope = 'row';
    rang.textContent = String(pos + 1);
    tr.appendChild(rang);

    const nom = document.createElement('td');
    nom.textContent = place.label + (pi === S.index ? ' — actif' : '');
    tr.appendChild(nom);

    const lat = document.createElement('td');
    lat.textContent = fmt(place.lat, 4);
    tr.appendChild(lat);

    const lon = document.createElement('td');
    lon.textContent = fmt(place.lon, 4);
    tr.appendChild(lon);

    const dep = document.createElement('td');
    dep.textContent = fmt(distanceOrigin(pi), 1);
    tr.appendChild(dep);

    const voisin = document.createElement('td');
    const nv = nearestDistance(pi);
    voisin.textContent = nv === null ? '—' : fmt(nv, 1);
    tr.appendChild(voisin);

    const role = document.createElement('td');
    role.textContent = place.role;
    tr.appendChild(role);

    tbody.appendChild(tr);
  });
  if (S.nodes.caption) {
    S.nodes.caption.textContent = 'Les cinq lieux du jeu de données local dans l’ordre « ' +
      CRITERES[S.sort] + ' ». Distances recalculées par haversine (R = 6371 km) depuis Marseille, premier lieu ; voisin le plus proche comparé au repère de ' +
      fmt(REF_VOISIN_KM, 0) + ' km. Le rang courant porte « — actif ».';
  }
}

function rebuildNav() {
  const nav = S.nodes.nav;
  if (!nav) return;
  S.order.forEach((pi, pos) => {
    const btn = S.nodes.buttons[PLACES[pi].key];
    if (!btn) return;
    const courant = pi === S.index;
    const lbl = btn.querySelector('.' + P + '-row-label');
    const marker = btn.querySelector('.' + P + '-courant');
    if (lbl) lbl.textContent = 'Rang ' + (pos + 1) + ' — ' + PLACES[pi].label;
    if (marker) marker.textContent = courant ? '◀ COURANT' : '';
    btn.tabIndex = courant ? 0 : -1;
    if (courant) btn.setAttribute('aria-current', 'true');
    else btn.removeAttribute('aria-current');
    nav.appendChild(btn); /* réordonne selon le critère, sans réattacher d'écouteur */
  });
}

/* ---------- E055-06 : rendu du laboratoire (un seul canvas) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  /* DPR plafonné à 2 (aucun dépassement de budget de pixels). */
  const cssW = cv.clientWidth || 320;
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

  const padX = 20;
  const haut = 26;
  const bas = cssH - 30;
  const pas = (bas - haut) / Math.max(1, S.order.length - 1);
  const yOf = (pos) => haut + pos * pas;

  /* Chemin séquentiel : trait en pointillés reliant les rangs dans l'ordre. */
  g.strokeStyle = 'rgba(244,214,158,.35)';
  g.lineWidth = 1.5;
  g.setLineDash([4, 4]);
  g.beginPath();
  g.moveTo(padX + 8, yOf(0));
  g.lineTo(padX + 8, yOf(S.order.length - 1));
  g.stroke();
  g.setLineDash([]);

  S.order.forEach((pi, pos) => {
    const place = PLACES[pi];
    const y = yOf(pos);
    const courant = pi === S.index;
    const tick = TICKS[pos]; /* décoration déterministe issue de la graine */

    /* Ligne du tableau : rectangle plein pour la ligne courante, vide sinon. */
    g.strokeStyle = courant ? 'rgba(244,214,158,1)' : 'rgba(214,207,193,.45)';
    g.lineWidth = courant ? 2 : 1;
    g.strokeRect(padX, y - 11, cssW - padX * 2, 22);

    /* Case du rang : la forme distingue la ligne courante. */
    g.strokeStyle = courant ? 'rgba(244,214,158,1)' : 'rgba(214,207,193,.5)';
    if (courant) {
      g.fillStyle = 'rgba(244,214,158,.2)';
      g.fillRect(padX + 3, y - 8, 16, 16);
    }
    g.strokeRect(padX + 3, y - 8, 16, 16);

    /* Petite coche reproductible, à droite de la case (jamais seule porteuse d'info). */
    g.fillStyle = 'rgba(214,207,193,.35)';
    g.fillRect(padX + 24, y - 1, 4 + tick * 10, 2);

    /* Libellé : le mot COURANT accompagne toujours le triangle. */
    g.fillStyle = courant ? 'rgba(244,214,158,.98)' : 'rgba(214,207,193,.82)';
    g.font = '11px sans-serif';
    const court = place.label.length > 18 ? place.label.slice(0, 17) + '…' : place.label;
    g.fillText(court, padX + 42, y + 4);
    if (courant) g.fillText('◀ COURANT', cssW - padX - 78, y + 4);

    /* Numéro de rang. */
    g.fillStyle = 'rgba(214,207,193,.6)';
    g.font = '10px sans-serif';
    g.fillText(String(pos + 1), padX - 10, y + 4);
  });

  /* Curseur animé : position déterministe, entre le rang courant et le suivant. */
  const posCourant = S.order.indexOf(S.index);
  if (S.playing && S.phase > 0 && posCourant < S.order.length - 1) {
    const y = yOf(posCourant) + (yOf(posCourant + 1) - yOf(posCourant)) * S.phase;
    g.fillStyle = 'rgba(244,214,158,.9)';
    g.beginPath();
    g.moveTo(padX + 8, y - 5);
    g.lineTo(padX + 16, y);
    g.lineTo(padX + 8, y + 5);
    g.closePath();
    g.fill();
  }

  /* En-têtes textuels : critère, repère et graine — jamais la seule couleur. */
  g.fillStyle = 'rgba(244,214,158,.98)';
  g.font = 'bold 11px sans-serif';
  g.fillText('Tri : ' + CRITERES[S.sort], padX, 16);
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '10px sans-serif';
  g.fillText('Graine ' + SEED.toString(16) + ' · repère voisin ' + fmt(REF_VOISIN_KM, 0) + ' km', padX, cssH - 9);
  g.fillText('Une touche = un rang · schéma non géographique', padX, cssH - 21);
}

/* ---------- E055-07 : lecture chiffrée (région live unique) ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const place = PLACES[S.index];
  const pos = S.order.indexOf(S.index);
  const nb = PLACES.length;
  const pasDepuis = pasSequentiels(0, pos);
  const pasJusquFin = pasSequentiels(pos, nb - 1);
  const voisin = nearestDistance(S.index);
  const comp = voisin === null ? 'aucun voisin'
    : (voisin > REF_VOISIN_KM ? 'au-dessus'
      : (voisin < REF_VOISIN_KM ? 'en dessous' : 'égal au'));

  const plain = 'Rang ' + (pos + 1) + ' / ' + nb + ' — ' + place.label +
    '. Dans l’ordre « ' + CRITERES[S.sort] + ' » : ' + pasDepuis + ' pas depuis la première ligne ; ' +
    pasJusquFin + ' pas jusqu’à la dernière (référence : une touche = ' + PAS_UNIQUE +
    ' rang, un saut direct = ' + pasSequentiels(0, nb - 1) + ' rangs). Voisin le plus proche : ' +
    (voisin === null ? 'aucun' : fmt(voisin, 1) + ' km') + ' — repère ' + fmt(REF_VOISIN_KM, 0) +
    ' km : ' + comp + ' (formule haversine, R = 6371 km). Le rang courant est écrit « — actif » dans le tableau et marqué ◀ COURANT / triangle sur le canvas : jamais une couleur seule.';
  if (n.textContent === plain) return; /* évite de réannoncer une valeur stable */

  n.textContent = '';
  const strong = (t) => { const s = document.createElement('strong'); s.textContent = t; return s; };
  const add = (t) => n.appendChild(document.createTextNode(t));

  add('Rang ');
  n.appendChild(strong((pos + 1) + ' / ' + nb + ' — ' + place.label));
  add('. Dans l’ordre « ' + CRITERES[S.sort] + ' » : ');
  n.appendChild(strong(pasDepuis + ' pas'));
  add(' depuis la première ligne ; ');
  n.appendChild(strong(pasJusquFin + ' pas'));
  add(' jusqu’à la dernière (référence : une touche = ' + PAS_UNIQUE +
    ' rang, un saut direct = ' + pasSequentiels(0, nb - 1) + ' rangs). Voisin le plus proche : ');
  n.appendChild(strong(voisin === null ? 'aucun' : fmt(voisin, 1) + ' km'));
  add(' — repère ' + fmt(REF_VOISIN_KM, 0) + ' km : ' + comp +
    ' (formule haversine, R = 6371 km). Le rang courant est écrit « — actif » dans le tableau et marqué ◀ COURANT / triangle sur le canvas : jamais une couleur seule.');
}

function updateLegend() {
  const n = S.nodes.legend;
  if (!n) return;
  n.textContent = 'Triangle + « ◀ COURANT » + rectangle plein : ligne courante · carré vide : ligne ordinaire · trait en pointillés : chemin séquentiel (un rang par touche) · coche courte : décoration issue de la graine ' +
    SEED.toString(16) + '. La forme et le texte portent l’information, pas la couleur.';
}

/* ---------- Synchronisation et navigation ---------- */

function syncControls() {
  recomputeOrder();
  const n = S.nodes;
  n.radios.forEach((radio) => { if (radio) radio.checked = radio.value === S.sort; });
  if (n.criterionOut) n.criterionOut.textContent = CRITERES[S.sort];
  rebuildTable();
  rebuildNav();
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le parcours' : '▶ Animer le parcours';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateLegend();
  updateReadout();
  drawLab();
}

/* Déplace le rang courant à une position de l'ordre affiché, bornée. */
function setActiveByPos(pos, focusButton) {
  const p = clamp(pos, 0, S.order.length - 1);
  S.index = S.order[p];
  S.phase = 0;
  syncControls();
  if (focusButton) {
    const btn = S.nodes.buttons[PLACES[S.index].key];
    if (btn && typeof btn.focus === 'function') btn.focus();
  }
}

/* Garde-clavier partagé entre les boutons et le canvas (un rang par touche). */
function handleNavKey(event, focusButton) {
  const pos = S.order.indexOf(S.index);
  let cible = pos;
  if (event.key === 'ArrowDown') cible = pos + PAS_UNIQUE;
  else if (event.key === 'ArrowUp') cible = pos - PAS_UNIQUE;
  else if (event.key === 'Home') cible = 0;
  else if (event.key === 'End') cible = S.order.length - 1;
  else return false;
  event.preventDefault();
  event.stopPropagation(); /* miroir du garde en capture : avant le routeur global */
  setActiveByPos(cible, focusButton);
  return true;
}

/* ---------- E055-09 / E055-10 : boucle rAF unique, pause et robustesse ---------- */

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
  const reduced = typeof ctxReduced === 'function' ? !!ctxReduced() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (!reduced) S.phase = (S.phase + dt * VITESSE) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (!reduced) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      const reduced = typeof ctxReduced === 'function' ? !!ctxReduced() : false;
      if (document.hidden) stopLoop();
      else if (S.playing && !reduced) startLoop();
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
  if (!S.resizeObserver && S.nodes.canvas && typeof ResizeObserver === 'function') {
    try {
      S.resizeObserver = new ResizeObserver(() => { drawLab(); });
      S.resizeObserver.observe(S.nodes.canvas);
    } catch { /* redimensionnement sans observateur : drawLab reste appelé ailleurs. */ }
  }
}

/* E055-08 : badge textuel posé sur la carte sans toucher à la donnée. */
function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', P + '-badge',
    'Tableau accessible : légende, en-têtes de colonnes et de lignes, rang « actif » en texte. Navigation séquentielle : une touche avance d’un rang (Flèches, Début, Fin), tabindex mobile et aria-current sur le seul bouton courant.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E055', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E055-01 : bloc CSS isolé, une seule fois, identifiants préfixés. */
  ctx.css(P, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.setAttribute(REDUCED_ATTR, reduced ? '1' : '0');
  if (reduced) { S.playing = false; stopLoop(); }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.sort = radio.value;
        syncControls(); /* l'identité du lieu courant est conservée, seul l'ordre change */
      });
    });
    PLACES.forEach((place) => {
      const btn = n.buttons[place.key];
      if (!btn) return;
      btn.addEventListener('click', () => {
        S.index = PLACES.indexOf(place); /* identité stable, indépendante du tri */
        S.phase = 0;
        syncControls();
      });
      btn.addEventListener('keydown', (event) => {
        if (handleNavKey(event, true)) return;
      });
    });
    n.canvas.addEventListener('keydown', (event) => {
      if (handleNavKey(event, false)) return;
      if (event.key === 't' || event.key === 'T') {
        event.preventDefault();
        const i = CRITERE_ORDER.indexOf(S.sort);
        S.sort = CRITERE_ORDER[(i + 1) % CRITERE_ORDER.length];
        syncControls();
      } else if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        if (typeof ctxReduced === 'function' && ctxReduced()) {
          S.playing = false;
          stopLoop();
        } else {
          S.playing = !S.playing;
          if (!S.playing) stopLoop(); else startLoop();
        }
        syncControls();
      }
    });
    n.play.addEventListener('click', () => {
      if (typeof ctxReduced === 'function' && ctxReduced()) {
        S.playing = false;
        stopLoop();
        syncControls();
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
  }

  installGlobalListeners();
  if (S.playing && !reduced) startLoop();
});
