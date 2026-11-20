import { register } from './registry.js';

/* V2 — lentille E009 (vague GEOGRAPHIE).
 * Thème : continents et découpes continentales.
 *
 * Les dix chantiers E009-01 … E009-10 sont réellement implémentés ici :
 *   01 quatre modèles de continents et liste sémantique (radiogroupe) ;
 *   02 frontières conventionnelles = coutures dérivées des groupes ;
 *   03 curseur de temps, reconstruction schématique de la Pangée ;
 *   04 superficies chiffrées et référencées (510 M km²) ;
 *   05 laboratoire canvas unique, déterministe, DPR ≤ 2 ;
 *   06 mesure annoncée dans un readout role=status aria-live=polite ;
 *   07 contrôles accessibles et équivalents clavier ;
 *   08 une seule boucle rAF, pause sur document.hidden, mouvement réduit ;
 *   09 ligne de Wallace : découpe biogéographique indépendante ;
 *   10 idempotence, isolation, zéro effet de bord.
 *
 * Tout est local : aucune requête réseau, aucune graine aléatoire, aucune
 * console, aucun fichier partagé modifié. Le contenu pédagogique est du texte
 * sémantique réel (titres, paragraphes, liste, tableau, défi) présent dans le
 * DOM ; le canvas n'est qu'un laboratoire qui illustre des découpes et une
 * reconstruction déterministes.
 *
 * ctx = { viewId, stage, layout, css(id, rules), el(tag, cls, text),
 *         reducedMotion() }.
 */

/* ---------- Identifiants (tous préfixés geography-v2-e009-) ---------- */

const CSS_ID = 'geography-v2-e009';
const PANEL_ID = 'geography-v2-e009-panel';
const TITLE_ID = 'geography-v2-e009-title';
const MODEL_ID = 'geography-v2-e009-model';
const RADIO_NAME = 'geography-v2-e009-modele';
const TIME_ID = 'geography-v2-e009-time';
const TIME_OUT_ID = 'geography-v2-e009-time-value';
const WALLACE_ID = 'geography-v2-e009-wallace';
const CANVAS_ID = 'geography-v2-e009-canvas';
const READOUT_ID = 'geography-v2-e009-readout';
const PLAY_ID = 'geography-v2-e009-play';
const LIST_ID = 'geography-v2-e009-list';
const TABLE_ID = 'geography-v2-e009-table';
const LEGEND_ID = 'geography-v2-e009-legend';
const BADGE_ID = 'geography-v2-e009-badge';
const CHALLENGE_ID = 'geography-v2-e009-defi';

/* ---------- Données canoniques (chiffres de référence arrondis) ---------- */

/* E009-04 : superficies des sept blocs continentaux, en millions de km². */
const SUPERFICIE = {
  AN: 24.71, // Amérique du Nord
  AS: 17.84, // Amérique du Sud
  AF: 30.37, // Afrique
  EU: 10.18, // Europe
  ASI: 44.58, // Asie
  OC: 8.56, // Océanie
  ANT: 14.20, // Antarctique
};
const SURFACE_TERRE = 510; // M km², référence : surface totale du globe.
const TOTAL_TABLE = Object.keys(SUPERFICIE).reduce((s, k) => s + SUPERFICIE[k], 0);

/* E009-01 : sept blocs de base, polygones schématiques en degrés (lon, lat).
 * `cible` est le centroïde visé dans la reconstruction de la Pangée. */
const BLOCS = [
  {
    key: 'AN', nom: 'Amérique du Nord', couleur: 'rgba(120,170,210,.42)', cible: [-30, 28],
    poly: [[-168, 66], [-140, 70], [-95, 72], [-60, 60], [-52, 47], [-65, 45],
      [-75, 35], [-81, 25], [-97, 26], [-115, 32], [-125, 49], [-140, 60]],
  },
  {
    key: 'AS', nom: 'Amérique du Sud', couleur: 'rgba(150,200,140,.42)', cible: [-18, -12],
    poly: [[-81, 8], [-60, 10], [-35, -5], [-38, -22], [-48, -25], [-58, -38],
      [-68, -55], [-75, -45], [-72, -18], [-81, -5]],
  },
  {
    key: 'AF', nom: 'Afrique', couleur: 'rgba(220,170,100,.44)', cible: [0, 0],
    poly: [[-17, 37], [10, 37], [33, 31], [43, 12], [51, 11], [42, -2],
      [40, -16], [32, -28], [18, -35], [12, -17], [9, 4], [-8, 5], [-17, 15]],
  },
  {
    key: 'EU', nom: 'Europe', couleur: 'rgba(200,150,210,.42)', cible: [6, 32],
    poly: [[-10, 36], [3, 42], [18, 40], [30, 45], [40, 48], [30, 60],
      [28, 70], [10, 71], [-5, 58], [-10, 44]],
  },
  {
    key: 'ASI', nom: 'Asie', couleur: 'rgba(210,140,140,.42)', cible: [42, 36],
    poly: [[30, 45], [45, 40], [60, 25], [72, 8], [80, 8], [92, 22],
      [105, 10], [122, 30], [130, 42], [145, 48], [160, 60], [170, 66],
      [140, 72], [100, 77], [60, 75], [40, 68], [30, 60], [40, 48]],
  },
  {
    key: 'OC', nom: 'Océanie', couleur: 'rgba(130,210,200,.42)', cible: [58, -14],
    poly: [[113, -22], [130, -12], [142, -11], [153, -27], [147, -38],
      [130, -35], [115, -34]],
  },
  {
    key: 'ANT', nom: 'Antarctique', couleur: 'rgba(225,225,230,.40)', cible: [8, -62],
    poly: [[-180, -70], [-120, -73], [-60, -70], [0, -70], [60, -68],
      [120, -70], [180, -72], [180, -90], [-180, -90]],
  },
];

/* E009-02 : frontières conventionnelles entre blocs (coutures). Une couture
 * n'est dessinée que si ses deux blocs appartiennent à deux continents
 * DISTINCTS du modèle courant : c'est exactement la « découpe continentale ». */
const COUTURES = [
  { id: 'oural', nom: 'Oural', a: 'EU', b: 'ASI', pts: [[60, 68], [58, 61], [55, 52], [48, 45]] },
  { id: 'suez', nom: 'Suez', a: 'AF', b: 'ASI', pts: [[32, 31], [33, 29], [34, 28]] },
  { id: 'panama', nom: 'Panama', a: 'AN', b: 'AS', pts: [[-79, 9.5], [-78, 8.5], [-77.5, 8]] },
  { id: 'bering', nom: 'Béring', a: 'ASI', b: 'AN', pts: [[-170, 66.5], [-167, 65]] },
  { id: 'gibraltar', nom: 'Gibraltar', a: 'EU', b: 'AF', pts: [[-6, 36.5], [-4.5, 35.7]] },
];

/* E009-09 : ligne biogéographique de Wallace (sépare faune asiatique et
 * australienne), tracée schématiquement entre Bali/Lombok et Sulawesi. */
const WALLACE = [[114, -8], [117, -3], [119, 1], [122, 3], [125, 4]];

/* E009-01 : quatre modèles de découpe. Les groupes réunissent des blocs ;
 * un bloc absent (ex. Antarctique dans les modèles à 4 et 5) n'est pas compté. */
const MODELES = {
  7: {
    nom: '7 continents',
    note: 'Chaque bloc est un continent : l’Amérique du Nord et l’Amérique du Sud sont distinctes, l’Europe et l’Asie aussi.',
    groupes: [
      { nom: 'Afrique', blocs: ['AF'] },
      { nom: 'Amérique du Nord', blocs: ['AN'] },
      { nom: 'Amérique du Sud', blocs: ['AS'] },
      { nom: 'Antarctique', blocs: ['ANT'] },
      { nom: 'Asie', blocs: ['ASI'] },
      { nom: 'Europe', blocs: ['EU'] },
      { nom: 'Océanie', blocs: ['OC'] },
    ],
  },
  6: {
    nom: '6 continents',
    note: 'L’Amérique du Nord et l’Amérique du Sud sont réunies en une seule Amérique ; la couture de Panama disparaît.',
    groupes: [
      { nom: 'Afrique', blocs: ['AF'] },
      { nom: 'Amérique', blocs: ['AN', 'AS'] },
      { nom: 'Antarctique', blocs: ['ANT'] },
      { nom: 'Asie', blocs: ['ASI'] },
      { nom: 'Europe', blocs: ['EU'] },
      { nom: 'Océanie', blocs: ['OC'] },
    ],
  },
  5: {
    nom: '5 continents (modèle français courant)',
    note: 'L’Amérique est réunie et l’Antarctique, inhabité, n’est pas compté ; Europe et Asie restent distinctes.',
    groupes: [
      { nom: 'Afrique', blocs: ['AF'] },
      { nom: 'Amérique', blocs: ['AN', 'AS'] },
      { nom: 'Asie', blocs: ['ASI'] },
      { nom: 'Europe', blocs: ['EU'] },
      { nom: 'Océanie', blocs: ['OC'] },
    ],
  },
  4: {
    nom: '4 continents (modèle eurasien)',
    note: 'Amérique réunie, Europe et Asie fondues en Eurasie, Antarctique omis : seules subsistent quatre grandes masses.',
    groupes: [
      { nom: 'Afrique', blocs: ['AF'] },
      { nom: 'Amérique', blocs: ['AN', 'AS'] },
      { nom: 'Eurasie', blocs: ['EU', 'ASI'] },
      { nom: 'Océanie', blocs: ['OC'] },
    ],
  },
};
const ORDRE_MODELLES = [4, 5, 6, 7];

/* ---------- État de module (survit à la reconstruction du `stage` par la coque) ---------- */

const S = {
  modele: 7,
  t: 0, // millions d'années avant notre ère (0 = aujourd'hui)
  wallace: false,
  playing: false,
  lastTs: 0,
  rafId: 0,
  lastShownT: -1,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Utilitaires déterministes ---------- */

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

function centroid(poly) {
  let x = 0;
  let y = 0;
  for (let i = 0; i < poly.length; i += 1) {
    x += poly[i][0];
    y += poly[i][1];
  }
  return [x / poly.length, y / poly.length];
}

function groupeDe(modele, bloc) {
  const groupes = MODELES[modele].groupes;
  for (let i = 0; i < groupes.length; i += 1) {
    if (groupes[i].blocs.indexOf(bloc) !== -1) return i;
  }
  return -1;
}

function coutureActive(couture) {
  const a = groupeDe(S.modele, couture.a);
  const b = groupeDe(S.modele, couture.b);
  return a !== -1 && b !== -1 && a !== b;
}

function blocsDuModele() {
  const presents = [];
  MODELES[S.modele].groupes.forEach((g) => g.blocs.forEach((b) => presents.push(b)));
  return presents;
}

/* E009-03 : translation schématique d'un bloc vers sa position Pangée. */
function decalage(bloc, t) {
  const c0 = centroid(bloc.poly);
  const f = Math.max(0, Math.min(1, t / 250));
  return [
    (bloc.cible[0] - c0[0]) * f,
    (bloc.cible[1] - c0[1]) * f,
  ];
}

/* E009-04 : total, part et rapport calculés depuis le tableau, jamais écrits en dur. */
function chiffres() {
  const asie = SUPERFICIE.ASI;
  const oceanie = SUPERFICIE.OC;
  return {
    total: TOTAL_TABLE,
    partTerre: (TOTAL_TABLE / SURFACE_TERRE) * 100,
    rapport: asie / oceanie,
    partAfrique: (SUPERFICIE.AF / TOTAL_TABLE) * 100,
  };
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-v2-e009-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-v2-e009-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-v2-e009-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-v2-e009-panel p{margin:5px 0;max-width:68ch}
#geography-v2-e009-panel .geography-v2-e009-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-v2-e009-model{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-v2-e009-model legend{padding:0 4px;color:var(--muted)}
#geography-v2-e009-panel .geography-v2-e009-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:6px;
  padding:2px 6px;cursor:pointer;
}
#geography-v2-e009-panel .geography-v2-e009-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-v2-e009-time{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-v2-e009-time-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e009-panel .geography-v2-e009-wallace{
  display:inline-flex;align-items:center;gap:6px;min-height:36px;margin:6px 6px 0 0;cursor:pointer;
}
#geography-v2-e009-wallace input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-v2-e009-canvas{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-v2-e009-legend{font-size:10px;color:var(--muted)}
#geography-v2-e009-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-v2-e009-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-v2-e009-table th,#geography-v2-e009-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-v2-e009-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e009-list{margin:6px 0;padding-left:18px}
#geography-v2-e009-list li{margin:2px 0}
#geography-v2-e009-defi{margin:6px 0;padding-left:18px;font-size:10px;color:var(--ink-soft,#d7d1c6)}
#geography-v2-e009-defi li{margin:2px 0}
#geography-v2-e009-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e009-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-v2-e009-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-v2-e009-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-v2-e009-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-v2-e009-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-v2-e009-panel[data-geography-v2-e009-reduced="1"] button,
#geography-v2-e009-panel[data-geography-v2-e009-reduced="1"] .geography-v2-e009-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-v2-e009-panel button,.geography-v2-e009-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-v2-e009-panel{font-size:10px;padding:9px}
  #geography-v2-e009-canvas{height:200px}
  #geography-v2-e009-panel .geography-v2-e009-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un continent est une vaste masse de terre émergée. La frontière entre deux continents est souvent conventionnelle — un détroit, une chaîne de montagnes, un canal — plutôt qu’une coupure physique évidente.',
    'La dérive des continents : il y a environ 250 millions d’années, les terres étaient réunies dans la Pangée ; la tectonique des plaques les a progressivement séparées.',
    'Le nombre de continents dépend du modèle retenu : de quatre à sept. L’Antarctique, inhabité, est parfois exclu du décompte, ce qui change le résultat sans changer la géographie.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-v2-e009-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* Défi falsifiable en cinq temps : le texte est dans le DOM, pas dans le canvas. */
function staticDefi() {
  const wrap = document.createElement('div');
  const titre = document.createElement('h3');
  titre.textContent = 'À vous de jouer : une couture peut-elle disparaître ?';
  const ol = document.createElement('ol');
  ol.id = CHALLENGE_ID;
  const etapes = [
    'Prédiction : en passant du modèle à 7 continents au modèle à 4, la couture de l’Oural doit disparaître.',
    'Réglage : cochez « 4 » dans le radiogroupe, puis regardez la liste et la carte.',
    'Résultat attendu : quatre continents seulement, l’Europe et l’Asie fondues en Eurasie, et plus aucun trait « Oural ».',
    'Falsification : si le trait de l’Oural reste affiché à 4 continents, le mécanisme décrit ici est faux.',
    'Débrief : la frontière est une convention entre blocs, pas une coupure physique ; changer de modèle ne change pas la géographie.',
  ];
  etapes.forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    ol.appendChild(li);
  });
  wrap.append(titre, ol);
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Superficies approximatives des sept blocs, en millions de km² (valeurs de référence arrondies) ; part calculée sur le total du tableau.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Continent', 'Superficie', 'Part du total'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  BLOCS.forEach((bloc) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = bloc.nom;
    const tdAire = document.createElement('td');
    tdAire.textContent = `${fmt(SUPERFICIE[bloc.key])} M km²`;
    const tdPart = document.createElement('td');
    tdPart.textContent = `${fmt((SUPERFICIE[bloc.key] / TOTAL_TABLE) * 100)} %`;
    tr.append(th, tdAire, tdPart);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: ORDRE_MODELLES.map((n) => document.getElementById(`${MODEL_ID}-${n}`)),
      time: document.getElementById(TIME_ID),
      timeOut: document.getElementById(TIME_OUT_ID),
      wallace: document.getElementById(WALLACE_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      list: document.getElementById(LIST_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-v2-e009-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Continents et découpes continentales');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Choisir un modèle de continents, c’est décider où passent les coutures. Comparez quatre découpes conventionnelles et observez une reconstruction schématique de la Pangée : la carte change, la géographie, elle, reste la même.');

  /* E009-01 / E009-07 : choix unique → radiogroupe (pas d'aria-pressed). */
  const fieldset = document.createElement('fieldset');
  fieldset.id = MODEL_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Modèle continental (choix unique)';
  fieldset.appendChild(legend);
  ORDRE_MODELLES.forEach((n) => {
    const lab = ctx.el('label', 'geography-v2-e009-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = RADIO_NAME;
    radio.id = `${MODEL_ID}-${n}`;
    radio.value = String(n);
    radio.checked = S.modele === n;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(String(n)));
    fieldset.appendChild(lab);
  });

  const listTitle = ctx.el('h3', '', 'Les continents du modèle choisi');
  const list = document.createElement('ul');
  list.id = LIST_ID;

  /* E009-03 : curseur de temps. */
  const sub = ctx.el('h3', '', 'Remonter le temps : la Pangée');
  const timeRow = ctx.el('p', '');
  const timeLabel = document.createElement('label');
  timeLabel.setAttribute('for', TIME_ID);
  timeLabel.appendChild(document.createTextNode('Temps : il y a '));
  const timeOut = document.createElement('span');
  timeOut.id = TIME_OUT_ID;
  timeLabel.appendChild(timeOut);
  timeRow.appendChild(timeLabel);

  const time = document.createElement('input');
  time.type = 'range';
  time.id = TIME_ID;
  time.min = '0';
  time.max = '250';
  time.step = '10';
  time.value = String(S.t);
  time.setAttribute('aria-label', 'Temps de reconstruction, de 0 à 250 millions d’années avant notre ère');

  /* E009-09 : bascule indépendante de la ligne de Wallace. */
  const wallaceLabel = ctx.el('label', 'geography-v2-e009-wallace');
  const wallace = document.createElement('input');
  wallace.type = 'checkbox';
  wallace.id = WALLACE_ID;
  wallace.checked = S.wallace;
  wallaceLabel.appendChild(wallace);
  wallaceLabel.appendChild(document.createTextNode(' Afficher la ligne de Wallace (biogéographie)'));

  /* E009-05 : laboratoire canvas. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Carte schématique des continents. Flèches gauche et droite : changer de modèle ; flèches haut et bas : changer le temps ; touche W : afficher ou masquer la ligne de Wallace.');

  const legendText = ctx.el('p', 'geography-v2-e009-legend', '');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-v2-e009-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter la dérive' : '▶ Animer la dérive');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), fieldset, listTitle, list, sub, timeRow,
    time, wallaceLabel, canvas, legendText, staticTable(), staticDefi(), readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: ORDRE_MODELLES.map((n) => document.getElementById(`${MODEL_ID}-${n}`)),
    time, timeOut, wallace, canvas, readout, play, list, legend: legendText,
  };
}

/* ---------- E009-05 : rendu du laboratoire (un seul canvas) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 240;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 14;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const px = (lon, lat) => [pad + ((lon + 180) / 360) * iw, pad + ((90 - lat) / 180) * ih];

  /* Canevas et graticule. */
  g.strokeStyle = 'rgba(255,255,255,.14)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);
  g.strokeStyle = 'rgba(214,207,193,.16)';
  [0, 30, 60, 90, 120, 150].forEach((lon) => {
    const a = px(lon - 180, 85);
    const b = px(lon - 180, -85);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  });
  [-60, -30, 0, 30, 60].forEach((lat) => {
    const a = px(-180, lat);
    const b = px(180, lat);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  });

  const presents = blocsDuModele();

  /* Blocs continentaux (formes schématiques, translation déterministe). */
  BLOCS.forEach((bloc) => {
    const [dx, dy] = decalage(bloc, S.t);
    g.beginPath();
    bloc.poly.forEach((p, i) => {
      const xy = px(p[0] + dx, p[1] + dy);
      if (i === 0) g.moveTo(xy[0], xy[1]); else g.lineTo(xy[0], xy[1]);
    });
    g.closePath();
    g.fillStyle = presents.indexOf(bloc.key) !== -1 ? bloc.couleur : 'rgba(120,120,130,.10)';
    g.fill();
    g.strokeStyle = 'rgba(244,214,158,.55)';
    g.lineWidth = 1;
    g.stroke();

    if (presents.indexOf(bloc.key) !== -1) {
      const c = centroid(bloc.poly);
      const lab = px(c[0] + dx, c[1] + dy);
      g.fillStyle = 'rgba(255,255,255,.92)';
      g.font = '10px sans-serif';
      g.textAlign = 'center';
      g.fillText(bloc.nom, lab[0], lab[1]);
      g.textAlign = 'left';
    }
  });

  /* E009-02 : coutures actives, dessinées en tirets + étiquette (pas la couleur seule). */
  if (S.t < 20) {
    g.setLineDash([5, 3]);
    g.lineWidth = 1.6;
    COUTURES.forEach((c) => {
      if (!coutureActive(c)) return;
      g.strokeStyle = 'rgba(255,150,120,.95)';
      g.beginPath();
      c.pts.forEach((p, i) => {
        const xy = px(p[0], p[1]);
        if (i === 0) g.moveTo(xy[0], xy[1]); else g.lineTo(xy[0], xy[1]);
      });
      g.stroke();
      const mid = px(c.pts[0][0], c.pts[0][1]);
      g.fillStyle = 'rgba(255,180,150,.95)';
      g.font = '9px sans-serif';
      g.fillText(c.nom, mid[0] + 4, mid[1] - 3);
    });
    g.setLineDash([]);

    /* E009-09 : ligne de Wallace, pointillés + étiquette distincte. */
    if (S.wallace) {
      g.setLineDash([2, 4]);
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(120,230,210,.95)';
      g.beginPath();
      WALLACE.forEach((p, i) => {
        const xy = px(p[0], p[1]);
        if (i === 0) g.moveTo(xy[0], xy[1]); else g.lineTo(xy[0], xy[1]);
      });
      g.stroke();
      g.setLineDash([]);
      const lab = px(WALLACE[2][0], WALLACE[2][1]);
      g.fillStyle = 'rgba(140,240,220,.95)';
      g.font = '9px sans-serif';
      g.fillText('Wallace', lab[0] + 4, lab[1] - 4);
    }
  }

  /* Légende graphique : le style de trait distingue couture et ligne biologique. */
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(`${MODELES[S.modele].nom} · il y a ${Math.round(S.t / 10) * 10} Ma`, pad + 2, pad + 12);
  if (S.t >= 20) {
    g.fillStyle = 'rgba(255,255,255,.7)';
    g.fillText('Frontières conventionnelles non représentées dans la reconstruction.', pad + 2, cssH - pad - 4);
  }
}

/* ---------- E009-01 / E009-02 : liste sémantique du modèle courant ---------- */

function updateModelList() {
  const n = S.nodes.list;
  if (!n) return;
  n.textContent = '';
  MODELES[S.modele].groupes.forEach((g) => {
    const aire = g.blocs.reduce((s, b) => s + SUPERFICIE[b], 0);
    const li = document.createElement('li');
    li.textContent = `${g.nom} — ${fmt(aire)} M km²`;
    n.appendChild(li);
  });
}

/* ---------- E009-06 : mesures chiffrées référencées (role=status) ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const c = chiffres();
  const active = COUTURES.filter(coutureActive).map((x) => x.nom);
  const couturesTexte = active.length ? active.join(', ') : 'aucune';
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Terres du tableau : '));
  n.appendChild(fort(`${fmt(c.total)} M km²`));
  n.appendChild(document.createTextNode(` (${fmt(c.partTerre)} % des ${SURFACE_TERRE} M km² de la surface du globe). L’Asie est `));
  n.appendChild(fort(`${fmt(c.rapport)}×`));
  n.appendChild(document.createTextNode(' l’Océanie ; l’Afrique représente '));
  n.appendChild(fort(`${fmt(c.partAfrique)} %`));
  n.appendChild(document.createTextNode(` du total. Modèle à ${S.modele} continents : coutures actives — `));
  n.appendChild(fort(couturesTexte));
  n.appendChild(document.createTextNode(`. Reconstruction : il y a ${Math.round(S.t / 10) * 10} Ma.`));
}

function updateLegend() {
  const n = S.nodes.legend;
  if (!n) return;
  const coutures = COUTURES.filter(coutureActive).map((x) => x.nom).join(', ') || 'aucune';
  n.textContent = `Tirets rouges : frontières conventionnelles actives (${coutures}). `
    + 'Pointillés turquoise : ligne de Wallace. Le style de trait et les étiquettes distinguent les tracés, indépendamment de la couleur.';
}

function updateTimeDisplay() {
  if (S.nodes.timeOut) S.nodes.timeOut.textContent = `${Math.round(S.t / 10) * 10} Ma`;
  if (S.nodes.time) S.nodes.time.value = String(S.t);
}

function syncControls() {
  const n = S.nodes;
  n.radios.forEach((r) => { if (r) r.checked = Number(r.value) === S.modele; });
  if (n.wallace) n.wallace.checked = S.wallace;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la dérive' : '▶ Animer la dérive';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateTimeDisplay();
  updateModelList();
  updateLegend();
  updateReadout();
  drawLab();
}

/* ---------- E009-08 : boucle rAF unique, pause sur document.hidden ---------- */

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
  const reduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  if (S.lastTs && S.playing && !reduced) {
    const dt = Math.min(80, ts - S.lastTs);
    S.t = (S.t + dt * 0.02) % 250;
    updateTimeDisplay();
    const shown = Math.round(S.t / 10) * 10;
    if (shown !== S.lastShownT) {
      S.lastShownT = shown;
      updateReadout();
    }
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyV2E009Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- Badge de nature schématique posé sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-v2-e009-badge', 'Découpes contourées et reconstruction schématiques : les traits figurent des conventions pédagogiques, pas des relevés.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- E009-10 : point d'entrée unique, idempotent ---------- */

register('E009', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyV2E009Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.modele = Number(radio.value);
        syncControls();
      });
    });
    n.time.addEventListener('input', () => {
      S.t = Math.max(0, Math.min(250, Math.round(Number(n.time.value) / 10) * 10));
      updateTimeDisplay();
      updateReadout();
      drawLab();
    });
    n.wallace.addEventListener('change', () => {
      S.wallace = !!n.wallace.checked;
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const pas = event.key === 'ArrowRight' ? 1 : -1;
        const i = ORDRE_MODELLES.indexOf(S.modele);
        S.modele = ORDRE_MODELLES[(i + pas + ORDRE_MODELLES.length) % ORDRE_MODELLES.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const pas = event.key === 'ArrowUp' ? 10 : -10;
        S.t = Math.max(0, Math.min(250, S.t + pas));
      } else if (event.key === 'w' || event.key === 'W') {
        S.wallace = !S.wallace;
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
  if (S.playing) startLoop();
});
