import { register } from './registry.js';

/* Lentille E048 (V2) — vue GEOGRAPHIE.
 * Thème : la sélection active d’un lieu comme source unique de vérité.
 *
 * Les dix chantiers E048-01 … E048-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E048.md. Les dix sont réellement
 * implémentés : aucun stub, aucune fonction vide. Tout est local : aucune
 * requête réseau, aucune graine aléatoire, aucune journalisation, aucun
 * fichier partagé modifié. Le contenu pédagogique est du texte sémantique réel
 * (titres, paragraphes, tableau, listes, radiogroupes) présent dans le DOM
 * même sans animation ; le canvas n’est qu’un laboratoire qui illustre des
 * formules déterministes et deux critères de visibilité indépendants.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e048- (identifiants, classes, attributs et bloc CSS).
 */

const P = 'geography-v2-e048';

/* ---------- Identifiants, tous préfixés geography-v2-e048- ---------- */

const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const PLACESET_ID = P + '-placeset';
const PLACE_NAME = P + '-place';
const TABLE_ID = P + '-table';
const CHAIN_ID = P + '-chain';
const MODESET_ID = P + '-modeset';
const MODE_NAME = P + '-mode';
const RANK_ID = P + '-rank';
const RANK_OUT_ID = P + '-rank-value';
const RADIUS_ID = P + '-radius';
const RADIUS_OUT_ID = P + '-radius-value';
const CANVAS_ID = P + '-canvas';
const LEGEND_ID = P + '-legend';
const READOUT_ID = P + '-readout';
const PLAY_ID = P + '-play';
const RESET_ID = P + '-reset';
const BADGE_ID = P + '-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

/* Lieux réels, relevés dans src/data/dataset.js (lecture seule, aucune
 * coordonnée fabriquée). Ce laboratoire est un miroir pédagogique : il n’écrit
 * pas state.placeIndex dans le store de la vue. */
const PLACES = [
  { key: 'marseille', label: 'Marseille', court: 'Ma', lat: 43.296346, lon: 5.369889 },
  { key: 'alise', label: 'Alise-Sainte-Reine', court: 'Al', lat: 47.5375, lon: 4.49083333 },
  { key: 'lyon', label: 'Lyon', court: 'Ly', lat: 45.7578, lon: 4.8322 },
  { key: 'versailles', label: 'Versailles', court: 'Ve', lat: 48.8053, lon: 2.135 },
  { key: 'paris', label: 'Paris', court: 'Pa', lat: 48.856578, lon: 2.351828 },
];

/* Constantes canoniques et référence. */
const REF = 4;                 /* Paris sert d’origine aux distances et azimuts. */
const R_TERRE = 6371;          /* rayon moyen de la Terre, km */
const RAD = Math.PI / 180;
const RAYON_ACTIF = 7;         /* geography.js : rayon du marqueur actif */
const RAYON_INACTIF = 4;       /* geography.js : rayon des autres marqueurs */
const RAYON_MAX = 700;         /* borne haute du curseur de périmètre, km */
const RAYON_DEFAUT = 450;      /* périmètre initial, km */

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  index: 0,
  rank: PLACES.length,   /* critère « rang » : combien de lieux sont affichés */
  rayon: RAYON_DEFAUT,   /* critère « périmètre » : distance maximale à Paris */
  mode: 'rang',          /* 'rang' ou 'rayon' — choix unique */
  playing: false,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  readoutText: '',
  nodes: {},
};

/* ---------- Formules déterministes et formatage français ---------- */

const fmt = (n, d) => {
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};

/* Distance du grand cercle (haversine) entre deux lieux, en km. */
function haversine(a, b) {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * R_TERRE * Math.asin(Math.min(1, Math.sqrt(s)));
}

/* Distance au lieu de référence (Paris), en km. */
function distanceRef(i) {
  return haversine(PLACES[i], PLACES[REF]);
}

/* Azimut depuis Paris vers un lieu, en degrés depuis le nord (0° = référence). */
function azimutRef(i) {
  if (i === REF) return 0;
  const p1 = PLACES[REF].lat * RAD;
  const p2 = PLACES[i].lat * RAD;
  const dl = (PLACES[i].lon - PLACES[REF].lon) * RAD;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  const deg = Math.atan2(y, x) / RAD;
  return (deg + 360) % 360;
}

/* E048-04 : deux critères de visibilité indépendants de la sélection. */
function visibleParRang(i) {
  return i >= 0 && i < S.rank;
}
function visibleParRayon(i) {
  return distanceRef(i) <= S.rayon;
}
function estVisible(i) {
  return S.mode === 'rang' ? visibleParRang(i) : visibleParRayon(i);
}
function nombreVisible() {
  let n = 0;
  for (let i = 0; i < PLACES.length; i += 1) if (estVisible(i)) n += 1;
  return n;
}

/* Voisin visible le plus proche du lieu actif, en km (null si aucun). */
function voisinVisible(index) {
  let best = Infinity;
  for (let j = 0; j < PLACES.length; j += 1) {
    if (j === index || !estVisible(j)) continue;
    const d = haversine(PLACES[index], PLACES[j]);
    if (d < best) best = d;
  }
  return best === Infinity ? null : best;
}

/* Part d’un seul lieu actif parmi les lieux affichés. */
function partSelection() {
  return 1 / Math.max(1, nombreVisible());
}

/* Préférence de mouvement : source unique, ctx.reducedMotion() d’abord. */
let reducedProvider = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
};
function reducedNow() { return !!reducedProvider(); }

/* ---------- E048-01 : faits sourcés, texte sémantique lisible sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const h = document.createElement('h3');
  h.textContent = 'Un indice, plusieurs signes';
  wrap.appendChild(h);
  const faits = [
    'Une vue géographique ne retient qu’un seul lieu actif à la fois. Dans la coque, state.placeIndex est la source unique de vérité : le store le borne entre 0 et le nombre de lieux, et stepPlace(delta) le décale d’un pas (store.js). Changer de sélection ne déplace aucun lieu sur la carte.',
    'Trois représentations restent synchronisées par ce seul indice : le marqueur SVG porteur de la classe is-active — rayon 7 contre 4, aria-pressed à « true » —, l’élément de liste marqué aria-current à « true », et le panneau de détail qui affiche nom, coordonnées et source, précédés du compteur « Lieu N / M » (geography.js).',
    'Sélection et visibilité sont deux états distincts. Le rang affiché et le périmètre autour d’un lieu de référence décident combien de lieux sont visibles ; parmi eux, un seul est actif. Si le lieu actif sort du cadre, le focus clavier du marqueur revient au premier lieu encore visible, mais le détail continue de décrire la sélection.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E048-02 : tableau et chaîne de synchronisation sémantiques ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Les représentations de l’état actif, telles que les produit la vue GEOGRAPHIE. La visibilité est un état distinct, commandé par le rang ou le périmètre.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Représentation', 'Signal technique', 'Valeur quand le lieu est actif'].forEach((t) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = t;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Marqueur SVG', '.geo-marker.is-active · aria-pressed="true"', 'Un seul marqueur agrandi : rayon 7, contre 4 pour les marqueurs inactifs.'],
    ['Liste filtrée', '.c3b-place-item[aria-current="true"]', 'Un seul élément courant, quel que soit le nombre de lieux affichés.'],
    ['Panneau de détail', '.geo-title · .geo-coords · .geo-source', 'Nom, coordonnées et source du lieu sélectionné, et lui seul.'],
    ['Compteur', '.view-kicker « Lieu N / M »', 'Rang 1 à M du lieu actif sur l’effectif total.'],
    ['Visibilité', 'recherche et périmètre', 'Plusieurs lieux peuvent être cadrés, mais un seul reste actif.'],
  ];
  lignes.forEach((cells) => {
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

function staticChain() {
  const wrap = document.createElement('div');
  const h = document.createElement('h3');
  h.textContent = 'Chaîne de synchronisation de la sélection';
  wrap.appendChild(h);
  const ol = document.createElement('ol');
  ol.id = CHAIN_ID;
  const etapes = [
    'Le store détient un seul indice : state.placeIndex, borné entre 0 et le nombre de lieux.',
    'stepPlace(delta) décale cet indice d’un pas ; aucun lieu n’est déplacé sur la carte.',
    'Le marqueur agrandi, l’élément de liste courant et le panneau de détail découlent du même indice.',
    'Le filtre décide séparément quels lieux sont affichés ; hors cadre, le focus revient au premier visible.',
  ];
  etapes.forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    ol.appendChild(li);
  });
  wrap.appendChild(ol);
  return wrap;
}

/* ---------- Feuille de style unique, injectée une seule fois via ctx.css ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PLACESET_ID},#${MODESET_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${PLACESET_ID} legend,#${MODESET_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:6px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${RANK_ID},#${RADIUS_ID}{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#${RANK_ID}::-webkit-slider-thumb,#${RADIUS_ID}::-webkit-slider-thumb{min-width:24px;min-height:24px}
#${RANK_ID}::-moz-range-thumb,#${RADIUS_ID}::-moz-range-thumb{min-width:24px;min-height:24px}
#${RANK_OUT_ID},#${RADIUS_OUT_ID}{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${CHAIN_ID}{margin:6px 0 6px 0;padding-left:18px}
#${CHAIN_ID} li{margin:2px 0}
#${READOUT_ID}{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
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
  #${CANVAS_ID}{height:210px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    const nodes = { panel: existant, fresh: false };
    PLACES.forEach((p) => { nodes[p.key] = document.getElementById(`${PLACE_NAME}-${p.key}`); });
    nodes.modeRang = document.getElementById(`${MODE_NAME}-rang`);
    nodes.modeRayon = document.getElementById(`${MODE_NAME}-rayon`);
    nodes.rank = document.getElementById(RANK_ID);
    nodes.rankOut = document.getElementById(RANK_OUT_ID);
    nodes.radius = document.getElementById(RADIUS_ID);
    nodes.radiusOut = document.getElementById(RADIUS_OUT_ID);
    nodes.canvas = document.getElementById(CANVAS_ID);
    nodes.readout = document.getElementById(READOUT_ID);
    nodes.play = document.getElementById(PLAY_ID);
    nodes.reset = document.getElementById(RESET_ID);
    nodes.legend = document.getElementById(LEGEND_ID);
    return nodes;
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'La sélection active d’un lieu : une source, plusieurs signes');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Un seul lieu est actif à la fois. Choisissez un lieu, puis changez le critère de visibilité : le rang affiché ou un périmètre autour de Paris. Le marqueur, la liste et le panneau de détail découlent toujours du même indice, alors que la visibilité varie.');

  /* E048-03 : sélecteur du lieu actif — choix unique → radiogroupe. */
  const placeset = document.createElement('fieldset');
  placeset.id = PLACESET_ID;
  placeset.setAttribute('role', 'radiogroup');
  placeset.setAttribute('aria-label', 'Lieu actif, choix unique');
  const placeLegend = document.createElement('legend');
  placeLegend.textContent = 'Lieu actif (choix unique)';
  placeset.appendChild(placeLegend);
  PLACES.forEach((place) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = PLACE_NAME;
    radio.id = `${PLACE_NAME}-${place.key}`;
    radio.value = place.key;
    radio.checked = PLACES.indexOf(place) === S.index;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(place.label));
    placeset.appendChild(lab);
  });

  /* E048-04 : critère de visibilité — second radiogroupe, indépendant du lieu. */
  const modeset = document.createElement('fieldset');
  modeset.id = MODESET_ID;
  modeset.setAttribute('role', 'radiogroup');
  modeset.setAttribute('aria-label', 'Critère de visibilité des lieux, choix unique');
  const modeLegend = document.createElement('legend');
  modeLegend.textContent = 'Critère de visibilité (choix unique)';
  modeset.appendChild(modeLegend);
  const modes = [
    ['rang', 'Rang : nombre de lieux affichés'],
    ['rayon', 'Périmètre : distance à Paris'],
  ];
  const modeRadios = {};
  modes.forEach(([valeur, libelle]) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = MODE_NAME;
    radio.id = `${MODE_NAME}-${valeur}`;
    radio.value = valeur;
    radio.checked = S.mode === valeur;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(libelle));
    modeset.appendChild(lab);
    modeRadios[valeur] = radio;
  });

  /* E048-04 : deux curseurs distincts, l’un pour le rang, l’autre pour le périmètre. */
  const rankRow = ctx.el('p', '');
  const rankLabel = document.createElement('label');
  rankLabel.setAttribute('for', RANK_ID);
  rankLabel.appendChild(document.createTextNode('Lieux affichés par rang : '));
  const rankOut = document.createElement('span');
  rankOut.id = RANK_OUT_ID;
  rankLabel.appendChild(rankOut);
  rankRow.appendChild(rankLabel);
  const rank = document.createElement('input');
  rank.type = 'range';
  rank.id = RANK_ID;
  rank.min = '1';
  rank.max = String(PLACES.length);
  rank.step = '1';
  rank.value = String(S.rank);
  rank.setAttribute('aria-label', 'Nombre de lieux affichés par rang, de 1 à 5');

  const radiusRow = ctx.el('p', '');
  const radiusLabel = document.createElement('label');
  radiusLabel.setAttribute('for', RADIUS_ID);
  radiusLabel.appendChild(document.createTextNode('Rayon autour de Paris : '));
  const radiusOut = document.createElement('span');
  radiusOut.id = RADIUS_OUT_ID;
  radiusLabel.appendChild(radiusOut);
  radiusRow.appendChild(radiusLabel);
  const radius = document.createElement('input');
  radius.type = 'range';
  radius.id = RADIUS_ID;
  radius.min = '0';
  radius.max = String(RAYON_MAX);
  radius.step = '10';
  radius.value = String(S.rayon);
  radius.setAttribute('aria-label', 'Rayon de recherche autour de Paris, de 0 à 700 kilomètres');

  /* E048-05 : laboratoire canvas unique. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Bande des lieux et règle des distances à Paris. Le lieu actif porte un anneau, une croix et le mot ACTIF ; les inactifs sont des points pleins, les lieux filtrés des cercles creux en tirets. Flèches gauche et droite : changer de lieu actif ; flèches haut et bas : régler le critère de visibilité ; touche M : changer de critère ; touche R : réinitialiser.');

  const legendText = ctx.el('p', P + '-legend', '');
  legendText.id = LEGEND_ID;

  /* E048-06 : une seule région live, textuelle et indexable. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* E048-07 : bascule indépendante d’animation — aria-pressed légitime. */
  const play = ctx.el('button', '', S.playing ? '■ Arrêter la pulsation' : '▶ Animer la pulsation');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  /* E048-10 : retour à un état connu, sans aria-pressed (action ponctuelle). */
  const reset = ctx.el('button', '', '↺ Réinitialiser');
  reset.type = 'button';
  reset.id = RESET_ID;

  const note = ctx.el('p', '', 'Lieux relevés dans le jeu de données local (dataset.js). Ce laboratoire est un miroir schématique : il illustre le mécanisme sans modifier la sélection de la vue.');

  panel.append(title, lead, staticFacts(), placeset, modeset, rankRow, rank,
    radiusRow, radius, staticTable(), staticChain(), canvas, legendText,
    readout, play, reset, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  const nodes = { panel, fresh: true };
  PLACES.forEach((p) => { nodes[p.key] = document.getElementById(`${PLACE_NAME}-${p.key}`); });
  nodes.modeRang = modeRadios.rang;
  nodes.modeRayon = modeRadios.rayon;
  nodes.rank = rank;
  nodes.rankOut = rankOut;
  nodes.radius = radius;
  nodes.radiusOut = radiusOut;
  nodes.canvas = canvas;
  nodes.readout = readout;
  nodes.play = play;
  nodes.reset = reset;
  nodes.legend = legendText;
  return nodes;
}

/* ---------- E048-05 : rendu du laboratoire (un seul canvas) ---------- */

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

  const padX = 32;
  const iw = Math.max(10, cssW - padX * 2);
  const bandeY = cssH * 0.34;   /* bande schématique des rangs */
  const regleY = cssH * 0.76;   /* règle géographique des distances à Paris */
  const pas = iw / Math.max(1, PLACES.length - 1);
  const xBande = (i) => padX + i * pas;
  const xRegle = (km) => padX + (Math.max(0, Math.min(RAYON_MAX, km)) / RAYON_MAX) * iw;

  /* Bande schématique : les lieux sont régulièrement espacés, position
     illustrative et non projection (les distances réelles sont sur la règle
     et dans le readout). */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(padX, bandeY);
  g.lineTo(padX + iw, bandeY);
  g.stroke();

  PLACES.forEach((place, i) => {
    const x = xBande(i);
    const actif = i === S.index;
    const cadre = estVisible(i);
    const reference = i === REF;

    /* Halo pulsé : seul élément animé, phase purement déterministe. */
    if (actif && cadre) {
      const rayon = 12 + S.phase * 12;
      g.strokeStyle = 'rgba(244,214,158,' + fmt(0.55 * (1 - S.phase), 2) + ')';
      g.lineWidth = 1.5;
      g.setLineDash([]);
      g.beginPath();
      g.arc(x, bandeY, rayon, 0, Math.PI * 2);
      g.stroke();
    }

    if (!cadre) {
      /* Lieu filtré : cercle creux en tirets, jamais une couleur seule. */
      g.strokeStyle = 'rgba(214,207,193,.5)';
      g.lineWidth = 1;
      g.setLineDash([3, 4]);
      g.beginPath();
      g.arc(x, bandeY, RAYON_INACTIF, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    } else if (actif) {
      /* Marqueur actif : anneau plein + croix + rayon agrandi. */
      g.fillStyle = 'rgba(244,214,158,.18)';
      g.strokeStyle = 'rgba(244,214,158,1)';
      g.lineWidth = 2.5;
      g.setLineDash([]);
      g.beginPath();
      g.arc(x, bandeY, RAYON_ACTIF, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x - 5, bandeY); g.lineTo(x + 5, bandeY);
      g.moveTo(x, bandeY - 5); g.lineTo(x, bandeY + 5);
      g.stroke();
    } else {
      /* Marqueur inactif : point plein de rayon 4. */
      g.fillStyle = 'rgba(214,207,193,.85)';
      g.beginPath();
      g.arc(x, bandeY, RAYON_INACTIF, 0, Math.PI * 2);
      g.fill();
    }

    /* Repère de référence : trait vertical + mot « RÉF. », pas la couleur seule. */
    if (reference) {
      g.strokeStyle = 'rgba(214,207,193,.7)';
      g.lineWidth = 1;
      g.setLineDash([2, 2]);
      g.beginPath();
      g.moveTo(x, bandeY - 22);
      g.lineTo(x, bandeY + 18);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = 'rgba(214,207,193,.9)';
      g.font = '9px sans-serif';
      g.fillText('RÉF.', x - 10, bandeY - 26);
    }

    /* Libellé : le mot « ACTIF » accompagne l’anneau, indépendamment de la
       couleur et de la taille ; « HORS CADRE » précise le cas filtré. */
    g.fillStyle = actif && cadre ? 'rgba(244,214,158,.98)' : 'rgba(214,207,193,.8)';
    g.font = '10px sans-serif';
    const court = place.label.length > 13 ? place.label.slice(0, 12) + '…' : place.label;
    g.fillText(court, x - 22, bandeY + 32);
    if (actif) g.fillText(cadre ? 'ACTIF' : 'ACTIF · HORS CADRE', x - 26, bandeY - 20);
  });

  /* Règle géographique : distance réelle à Paris, échelle 0–700 km. */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(padX, regleY);
  g.lineTo(padX + iw, regleY);
  g.stroke();

  /* Zone de périmètre : hachures + bordure en tirets, aucune couleur seule. */
  const xr = xRegle(S.rayon);
  g.fillStyle = 'rgba(230,185,111,.10)';
  g.fillRect(padX, regleY - 16, Math.max(0, xr - padX), 32);
  g.strokeStyle = 'rgba(244,214,158,.75)';
  g.setLineDash([4, 3]);
  g.beginPath();
  g.moveTo(xr, regleY - 18);
  g.lineTo(xr, regleY + 18);
  g.stroke();
  g.setLineDash([]);

  PLACES.forEach((place, i) => {
    const x = xRegle(distanceRef(i));
    const dedans = distanceRef(i) <= S.rayon;
    g.strokeStyle = 'rgba(214,207,193,.7)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, regleY - 5);
    g.lineTo(x, regleY + 5);
    g.stroke();
    /* Losange plein dans le périmètre, creux dehors : forme, pas couleur. */
    const d = 5;
    g.beginPath();
    g.moveTo(x, regleY - d);
    g.lineTo(x + d, regleY);
    g.lineTo(x, regleY + d);
    g.lineTo(x - d, regleY);
    g.closePath();
    if (dedans) { g.fillStyle = 'rgba(244,214,158,.9)'; g.fill(); }
    else { g.strokeStyle = 'rgba(214,207,193,.8)'; g.stroke(); }
    g.fillStyle = 'rgba(214,207,193,.85)';
    g.font = '9px sans-serif';
    const dy = i % 2 === 0 ? regleY - 10 : regleY + 17;
    g.fillText(place.court + ' ' + fmt(distanceRef(i), 0), Math.min(cssW - 42, x - 12), dy);
  });

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText('Distance à Paris (référence) — rayon ' + fmt(S.rayon, 0) + ' km', padX, regleY - 24);
  g.fillText('Bande des rangs : position illustrative', padX, bandeY - 36);
}

/* ---------- E048-04 / E048-06 : affichages et région live ---------- */

function updateFilterDisplay() {
  const n = S.nodes;
  if (n.rank) {
    n.rank.value = String(S.rank);
    n.rank.setAttribute('aria-valuetext', S.rank + ' lieux affichés sur ' + PLACES.length);
  }
  if (n.rankOut) n.rankOut.textContent = S.rank + ' / ' + PLACES.length;
  if (n.radius) {
    n.radius.value = String(S.rayon);
    n.radius.setAttribute('aria-valuetext', fmt(S.rayon, 0) + ' kilomètres autour de Paris');
  }
  if (n.radiusOut) n.radiusOut.textContent = fmt(S.rayon, 0) + ' km';
  if (n.modeRang) n.modeRang.checked = S.mode === 'rang';
  if (n.modeRayon) n.modeRayon.checked = S.mode === 'rayon';
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const actif = PLACES[S.index];
  const nb = nombreVisible();
  const part = partSelection();
  const voisin = voisinVisible(S.index);
  const dRef = distanceRef(S.index);
  const az = azimutRef(S.index);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode('Lieu actif : '));
  frag.appendChild(fort(actif.label + ' (' + (S.index + 1) + '/' + PLACES.length + ')'));
  frag.appendChild(document.createTextNode('. Un seul actif sur ' + nb + ' affiché(s), soit '));
  frag.appendChild(fort(fmt(part * 100, 1) + ' %'));
  frag.appendChild(document.createTextNode(' de sélection (référence sans filtre : ' + fmt(100 / PLACES.length, 1) + ' %). Voisin visible le plus proche : '));
  frag.appendChild(fort(voisin === null ? 'aucun' : fmt(voisin, 1) + ' km'));
  frag.appendChild(document.createTextNode(' · distance à Paris : '));
  frag.appendChild(fort(fmt(dRef, 1) + ' km'));
  frag.appendChild(document.createTextNode(' (rayon courant ' + fmt(S.rayon, 0) + ' km) · azimut depuis Paris : '));
  frag.appendChild(fort(fmt(az, 1) + '°'));
  frag.appendChild(document.createTextNode(' (référence 0° = nord, formules haversine et atan2, R = 6371 km). '));
  frag.appendChild(document.createTextNode(estVisible(S.index)
    ? 'Le lieu actif est dans le cadre : son marqueur porte le rayon 7 et aria-pressed à « true ».'
    : 'Le lieu actif est hors du cadre : le détail le décrit encore, mais le focus clavier revient au premier marqueur visible.'));
  const texte = frag.textContent;
  if (texte === S.readoutText) return; /* évite de saturer la région live. */
  S.readoutText = texte;
  n.textContent = '';
  n.appendChild(frag);
}

function updateLegend() {
  const n = S.nodes.legend;
  if (!n) return;
  n.textContent = S.mode === 'rang'
    ? 'Bande haute : anneau plein, croix et mot ACTIF = lieu sélectionné ; point plein = lieu inactif cadré ; cercle en tirets = lieu hors du rang. Bande basse : losange plein dans le rayon, losange creux dehors. Le mot RÉF. repère Paris : la forme et le libellé distinguent les états, jamais la couleur seule.'
    : 'Bande haute : anneau plein, croix et mot ACTIF = lieu sélectionné ; cercle en tirets = lieu hors du périmètre. Bande basse : zone hachurée de 0 au rayon, limite en tirets, losange plein dedans, losange creux dehors. La visibilité découle ici de la distance à Paris, pas du rang.';
}

function syncControls() {
  const n = S.nodes;
  PLACES.forEach((p) => {
    const radio = n[p.key];
    if (radio) radio.checked = PLACES.indexOf(p) === S.index;
  });
  updateFilterDisplay();
  updateReadout();
  updateLegend();
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la pulsation' : '▶ Animer la pulsation';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  drawLab();
}

/* ---------- E048-07 : boucle rAF unique, pause sur document.hidden ---------- */

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
  if (S.lastTs && S.playing && !reducedNow()) {
    const dt = Math.min(80, ts - S.lastTs);
    S.phase = (S.phase + dt * 0.0009) % 1; /* phase déterministe, sans aléa */
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reducedNow()) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !reducedNow()) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.setAttribute(REDUCED_ATTR, mq.matches ? '1' : '0');
        if (mq.matches) { S.playing = false; stopLoop(); }
        const bouton = document.getElementById(PLAY_ID);
        if (bouton) {
          bouton.textContent = S.playing ? '■ Arrêter la pulsation' : '▶ Animer la pulsation';
          bouton.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
        }
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : reducedNow() reste la source. */ }
  }
}

/* ---------- E048-09 : badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', P + '-badge', 'Un seul lieu est actif à la fois : state.placeIndex. Le marqueur agrandi (rayon 7, aria-pressed), l’élément courant (aria-current) et le panneau de détail découlent du même indice. Le rang et le périmètre commandent séparément la visibilité.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- E048-10 : point d’entrée unique, idempotent ---------- */

register('E048', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(P, CSS);

  if (typeof ctx.reducedMotion === 'function') reducedProvider = () => !!ctx.reducedMotion();

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = reducedNow();
  S.nodes.panel.setAttribute(REDUCED_ATTR, reduced ? '1' : '0');
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    PLACES.forEach((place) => {
      const radio = n[place.key];
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.index = PLACES.indexOf(place);
        syncControls();
      });
    });
    n.modeRang.addEventListener('change', () => {
      if (!n.modeRang.checked) return;
      S.mode = 'rang';
      syncControls();
    });
    n.modeRayon.addEventListener('change', () => {
      if (!n.modeRayon.checked) return;
      S.mode = 'rayon';
      syncControls();
    });
    n.rank.addEventListener('input', () => {
      S.rank = Math.max(1, Math.min(PLACES.length, Math.round(Number(n.rank.value))));
      syncControls();
    });
    n.radius.addEventListener('input', () => {
      S.rayon = Math.max(0, Math.min(RAYON_MAX, Math.round(Number(n.radius.value))));
      syncControls();
    });
    n.play.addEventListener('click', () => {
      if (reducedNow()) {
        S.playing = false;
        S.phase = 0;
        stopLoop();
        syncControls();
        if (n.readout) {
          n.readout.textContent = 'Mouvement réduit : la pulsation est désactivée ; la sélection et les mesures restent affichées.';
          S.readoutText = n.readout.textContent;
        }
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.reset.addEventListener('click', () => {
      S.index = 0;
      S.rank = PLACES.length;
      S.rayon = RAYON_DEFAUT;
      S.mode = 'rang';
      S.playing = false;
      S.phase = 0;
      stopLoop();
      syncControls();
      if (n.readout) {
        n.readout.textContent = 'Réinitialisation : premier lieu actif, tous les lieux cadrés par rang, référence à ' + fmt(100 / PLACES.length, 1) + ' %, sans pulsation.';
        S.readoutText = n.readout.textContent;
      }
    });
    /* Équivalents clavier des contrôles, directement sur le canvas. */
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const pas = event.key === 'ArrowRight' ? 1 : -1;
        S.index = (S.index + pas + PLACES.length) % PLACES.length;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const pas = event.key === 'ArrowUp' ? 1 : -1;
        if (S.mode === 'rang') S.rank = Math.max(1, Math.min(PLACES.length, S.rank + pas));
        else S.rayon = Math.max(0, Math.min(RAYON_MAX, S.rayon + pas * 10));
      } else if (event.key === 'm' || event.key === 'M') {
        S.mode = S.mode === 'rang' ? 'rayon' : 'rang';
      } else if (event.key === 'r' || event.key === 'R') {
        S.index = 0;
        S.rank = PLACES.length;
        S.rayon = RAYON_DEFAUT;
        S.mode = 'rang';
        S.playing = false;
        S.phase = 0;
        stopLoop();
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
  if (S.playing && !reduced) startLoop();
});
