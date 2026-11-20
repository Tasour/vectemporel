import { register } from './registry.js';

/*
 * Lentille E023 — SECONDE PASSE (V2) : détroits et canaux, gabarit des passages.
 *
 * Les dix chantiers (E023-01 … E023-10) sont réellement implémentés ci-dessous.
 * V2 ajoute à la passe 1 : une fiche de vérité à trois faits sourcés, un second
 * tableau recalculé à chaque changement de bau, un défi falsifiable en cinq
 * temps aligné sur le modèle courant, un radiogroupe explicite, un bouton de
 * remise à zéro, et une boucle rAF unique suspendue à la fois sur
 * document.hidden, hors champ (IntersectionObserver) et en mouvement réduit.
 * Tout le contenu pédagogique est du texte sémantique indexable (h2/h3/p/ol/li/
 * table/caption/th/td) présent dans le DOM ; le canvas n'est qu'un laboratoire
 * qui illustre des grandeurs calculées par formules déterministes.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e023-` (aucune collision avec la passe 1 `geography-e023-`).
 * Zéro console.*, zéro réseau, zéro Math.random, une seule boucle rAF.
 * Français intégral. ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e023';

const ID = {
  panel: 'geography-v2-e023-panel',
  title: 'geography-v2-e023-title',
  lead: 'geography-v2-e023-lead',
  facts: 'geography-v2-e023-facts',
  refTable: 'geography-v2-e023-reference',
  type: 'geography-v2-e023-type',
  passage: 'geography-v2-e023-passage',
  beam: 'geography-v2-e023-beam',
  beamValue: 'geography-v2-e023-beam-value',
  canvas: 'geography-v2-e023-canvas',
  canvasDesc: 'geography-v2-e023-canvas-desc',
  legend: 'geography-v2-e023-legend',
  mesuresTitle: 'geography-v2-e023-mesures-title',
  mesures: 'geography-v2-e023-mesures',
  defiTitle: 'geography-v2-e023-defi-title',
  defi: 'geography-v2-e023-defi',
  readout: 'geography-v2-e023-readout',
  play: 'geography-v2-e023-play',
  reset: 'geography-v2-e023-reset',
  note: 'geography-v2-e023-note',
  badge: 'geography-v2-e023-badge',
};

const TYPE_ORDER = ['tous', 'detroit', 'canal'];

/* Ordres de grandeur publics, explicitement présentés comme tels dans le
 * tableau de référence ; aucune valeur n'est inventée pour l'animation. */
const PASSAGES = [
  { id: 'gibraltar', nom: 'Détroit de Gibraltar', type: 'detroit', largeur: 14000, gabarit: 14000, profondeur: 300, repere: 'seuil de Camarinal' },
  { id: 'bosphore', nom: 'Détroit du Bosphore', type: 'detroit', largeur: 700, gabarit: 700, profondeur: 60, repere: 'chenal le plus étroit' },
  { id: 'suez', nom: 'Canal de Suez', type: 'canal', largeur: 205, gabarit: 205, profondeur: 24, repere: 'après approfondissement (2010)' },
  /* À Panama, le chenal mesure ~150 m mais la chambre d'écluse (33,5 m)
     est le vrai gabarit limitant : c'est elle qui commande le passage. */
  { id: 'panama', nom: 'Canal de Panama (écluses)', type: 'canal', largeur: 150, gabarit: 33.5, profondeur: 12, repere: 'chambre d’écluses : 33,5 m' },
];

const MARGE = 5;          /* mètres de sécurité de chaque bord. */
const TIRANT_REF = 12;    /* tirant d'eau de référence (Panamax), en mètres. */
const BAU_REF = 32.2;     /* bau de référence (Panamax), en mètres. */
const SEED = 0xE023;      /* graine affichée : zéro tirage aléatoire. */

const TYPE_LABELS = {
  tous: 'Tous les passages',
  detroit: 'Détroits naturels',
  canal: 'Canaux artificiels',
};

const TYPE_TRAITS = {
  detroit: 'trait plein',
  canal: 'tirets longs',
};

/* E023-08 : défi falsifiable en cinq temps, un par passage (texte réel). */
const DEFI = {
  gibraltar: {
    prediction: 'Même avec un bau maximal de 60 m, un détroit de 14 km reste franchissable.',
    reglage: 'Sélectionner le détroit de Gibraltar et régler le bau à 60 m (marge de 5 m par bord).',
    attendu: 'La largeur nécessaire vaut 70 m, très loin des 14 000 m du détroit : verdict « passage possible », plusieurs dizaines de navires de front.',
    falsification: 'Si le verdict devenait « gabarit insuffisant » à 60 m, la comparaison entre largeur nécessaire et gabarit serait fausse.',
    debrief: 'À l’inverse de Panama, la largeur naturelle est si grande qu’aucun navire de cette taille ne la sature.',
  },
  bosphore: {
    prediction: 'Le Bosphore, large d’environ 700 m, laisse passer plusieurs navires de front avec un bau de 32 m.',
    reglage: 'Sélectionner le détroit du Bosphore et régler le bau à 32 m.',
    attendu: 'La largeur nécessaire vaut 42 m ; 700 / 42 donne une quinzaine de navires de front et la profondeur de 60 m laisse 48 m de marge d’eau.',
    falsification: 'Si le compte de navires de front tombait à zéro, la formule ⌊gabarit / nécessaire⌋ serait erronée.',
    debrief: 'Le nombre de navires de front mesure une capacité, distincte du simple verdict oui ou non.',
  },
  suez: {
    prediction: 'Le tirant de référence de 12 m doit laisser 12 m de marge d’eau dans le chenal de 24 m de Suez.',
    reglage: 'Sélectionner le canal de Suez et régler le bau à 32 m.',
    attendu: 'La marge d’eau vaut 24 − 12 = 12 m ; la largeur nécessaire de 42 m reste inférieure aux 205 m du chenal : passage possible.',
    falsification: 'Si la marge d’eau devenait négative à Suez, la profondeur de référence aurait été mal reportée.',
    debrief: 'Une marge d’eau positive est aussi nécessaire que la largeur : le tirant compte autant que le bau.',
  },
  panama: {
    prediction: 'Faire passer le bau de 20 à 32 m doit basculer le verdict de « passage possible » à « gabarit insuffisant ».',
    reglage: 'Sélectionner le canal de Panama (écluses) et régler le bau à 32 m.',
    attendu: 'La largeur nécessaire passe de 30 m à 42 m, au-delà des 33,5 m de la chambre : verdict « gabarit insuffisant ».',
    falsification: 'Si le verdict restait « passage possible » à 32 m, la règle gabarit ≥ bau + 2 × 5 m serait contredite.',
    debrief: 'La chambre d’écluse, non le chenal de 150 m, fixe la limite : le gabarit utile est la contrainte réelle.',
  },
};

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  type: 'tous',
  passageId: 'suez',
  beam: 32,
  playing: false,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  inView: true,
  listenersInstalled: false,
  nodes: null,
  cells: {},
  defiSpans: null,
};

/* ---------- Formules déterministes ---------- */

const fmt = (n, d = 1) => {
  if (!Number.isFinite(n)) return '—';
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};

function fmtLargeur(m) {
  return m >= 1000 ? `${fmt(m / 1000, 1)} km` : `${fmt(m, 0)} m`;
}

function passesDisponibles() {
  return PASSAGES.filter((p) => S.type === 'tous' || p.type === S.type);
}

function passageCourant() {
  return PASSAGES.find((p) => p.id === S.passageId) || PASSAGES[0];
}

/* Toutes les grandeurs sont recalculées depuis les formules, ici pour un
 * passage et un bau donnés afin d'alimenter aussi le tableau dynamique. */
function mesuresPour(p, bau) {
  const necessaire = bau + 2 * MARGE;
  return {
    p,
    bau,
    necessaire,
    ratio: p.gabarit / bau,
    deFront: Math.floor(p.gabarit / necessaire),
    margeEau: p.profondeur - TIRANT_REF,
    passe: p.gabarit >= necessaire && p.profondeur >= TIRANT_REF,
  };
}

function mesures() {
  return mesuresPour(passageCourant(), S.beam);
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
.geography-v2-e023-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);
  font-size:11px;line-height:1.6;
}
.geography-v2-e023-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700;
}
.geography-v2-e023-panel h3{
  margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700;
}
.geography-v2-e023-panel p{margin:5px 0;max-width:74ch}
.geography-v2-e023-panel .geography-v2-e023-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e023-panel .geography-v2-e023-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e023-panel .geography-v2-e023-table caption{
  margin-bottom:4px;color:var(--muted,#a8a198);text-align:left;
}
.geography-v2-e023-panel .geography-v2-e023-table th,
.geography-v2-e023-panel .geography-v2-e023-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e023-panel .geography-v2-e023-table thead th{color:var(--gold-bright,#f4d69e)}
.geography-v2-e023-panel .geography-v2-e023-table td{
  color:var(--gold-bright,#f4d69e);font-weight:600;
}
#geography-v2-e023-type{
  margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px;
}
#geography-v2-e023-type legend{padding:0 4px;color:var(--gold,#e6b96f)}
.geography-v2-e023-panel .geography-v2-e023-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;
  margin:0 8px 0 0;padding:2px 6px;cursor:pointer;
}
.geography-v2-e023-panel .geography-v2-e023-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e023-ligne{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.geography-v2-e023-ligne label{min-height:36px;display:inline-flex;align-items:center;gap:6px}
.geography-v2-e023-panel select{
  min-height:36px;padding:5px 7px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--ink-soft,#d7d1c6);font:inherit;font-size:10px;
}
.geography-v2-e023-valeur{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
.geography-v2-e023-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
#geography-v2-e023-canvas{
  display:block;width:100%;height:236px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.30);touch-action:manipulation;
}
.geography-v2-e023-panel .geography-v2-e023-legend{font-size:10px;color:var(--muted,#a8a198)}
.geography-v2-e023-panel .geography-v2-e023-defi{margin:6px 0;padding-left:18px;font-size:10px}
.geography-v2-e023-panel .geography-v2-e023-defi li{margin:3px 0}
.geography-v2-e023-panel .geography-v2-e023-defi strong{color:var(--gold,#e6b96f)}
#geography-v2-e023-readout{
  min-height:36px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e023-readout strong{color:var(--gold-bright,#f4d69e)}
.geography-v2-e023-panel .geography-v2-e023-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;
  padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation;
  transition:border-color .18s,background-color .18s;
}
.geography-v2-e023-panel .geography-v2-e023-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e023-panel :focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.geography-v2-e023-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.geography-v2-e023-panel[data-geography-v2-e023-reduced="1"] .geography-v2-e023-btn{
  transition:none;
}
@media (prefers-reduced-motion:reduce){
  .geography-v2-e023-panel .geography-v2-e023-btn{
    transition:none!important;animation:none!important;
  }
}
@media (max-width:620px){
  .geography-v2-e023-panel{font-size:10px;padding:9px}
  #geography-v2-e023-canvas{height:196px}
  .geography-v2-e023-panel .geography-v2-e023-choix{margin-right:4px}
  .geography-v2-e023-ligne{flex-direction:column;align-items:stretch}
}
@media (forced-colors:active){
  .geography-v2-e023-panel{border:1px solid CanvasText}
}
`;

/* ---------- E023-01 : fiche de vérité, texte sémantique lisible sans JS ---------- */

function staticFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  const faits = [
    'Un détroit est un passage d’eau naturel entre deux terres ; un canal est un passage artificiel creusé pour joindre deux bassins. Les deux concentrent le trafic en un point étroit : ce sont des points de passage stratégiques.',
    'Le gabarit d’un passage est fixé par sa largeur utile et sa profondeur disponible : dans un canal à écluses, c’est la chambre d’écluse et non le chenal qui limite. Un navire ne passe que si son bau et son tirant d’eau laissent une marge de sécurité.',
    'Les valeurs citées sont des ordres de grandeur : la largeur d’un détroit varie selon l’endroit et la profondeur d’un canal évolue avec les travaux de dragage. Aucune de ces valeurs n’est une mesure relevée pour ce laboratoire.',
  ];
  faits.forEach((texte) => {
    wrap.appendChild(ctx.el('p', 'geography-v2-e023-fait', texte));
  });
  return wrap;
}

/* ---------- E023-02 : tableau de référence (valeurs de référence) ---------- */

function buildReferenceTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e023-table');
  table.id = ID.refTable;
  table.appendChild(ctx.el('caption', '',
    'Ordres de grandeur. Référence : navire Panamax — bau 32,2 m, tirant d’eau 12 m. Le gabarit utile d’un canal à écluses est la largeur de la chambre.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Passage', 'Nature', 'Largeur du chenal', 'Gabarit utile', 'Profondeur', 'Repère'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  PASSAGES.forEach((p) => {
    const tr = document.createElement('tr');
    const cells = [
      p.nom,
      p.type === 'detroit' ? 'Détroit naturel' : 'Canal artificiel',
      `≈ ${fmtLargeur(p.largeur)}`,
      `${fmtLargeur(p.gabarit)}`,
      `≈ ${fmt(p.profondeur, 0)} m`,
      p.repere,
    ];
    cells.forEach((c, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.setAttribute('scope', 'row');
      cell.textContent = c;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E023-03 : tableau des mesures recalculées ---------- */

const MESURE_COLS = ['Passage', 'Largeur nécessaire', 'Navires de front', 'Marge d’eau', 'Verdict'];

function buildMesuresTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e023-table');
  table.id = ID.mesures;
  table.appendChild(ctx.el('caption', '',
    'Valeurs recalculées depuis les formules et le bau courant. Nécessaire = bau + 2 × 5 m ; navires de front = ⌊gabarit / nécessaire⌋ ; marge d’eau = profondeur − 12 m.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  MESURE_COLS.forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  PASSAGES.forEach((p) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = p.nom;
    tr.appendChild(th);
    const needed = document.createElement('td');
    const front = document.createElement('td');
    const eau = document.createElement('td');
    const verdict = document.createElement('td');
    needed.textContent = '—';
    front.textContent = '—';
    eau.textContent = '—';
    verdict.textContent = '—';
    S.cells[p.id] = { needed, front, eau, verdict };
    tr.append(needed, front, eau, verdict);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function fillMesuresTable() {
  PASSAGES.forEach((p) => {
    const c = S.cells[p.id];
    if (!c) return;
    const m = mesuresPour(p, S.beam);
    c.needed.textContent = `${fmt(m.necessaire, 0)} m`;
    c.front.textContent = `${fmt(m.deFront, 0)}`;
    c.eau.textContent = `${fmt(m.margeEau, 0)} m`;
    c.verdict.textContent = m.passe ? 'Possible' : 'Insuffisant';
  });
}

/* ---------- E023-08 : défi falsifiable en cinq temps ---------- */

const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

function buildDefi(ctx) {
  const list = ctx.el('ol', 'geography-v2-e023-defi');
  list.id = ID.defi;
  const spans = {};
  DEFI_ETAPES.forEach(([key, label]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = label + ' : ';
    const span = document.createElement('span');
    span.textContent = DEFI[S.passageId][key];
    spans[key] = span;
    li.append(strong, span);
    list.appendChild(li);
  });
  S.defiSpans = spans;
  return list;
}

function fillDefi() {
  if (!S.defiSpans) return;
  const d = DEFI[S.passageId];
  DEFI_ETAPES.forEach(([key]) => {
    const span = S.defiSpans[key];
    if (span) span.textContent = d[key];
  });
}

/* ---------- E023-04 / E023-05 : panneau et contrôles accessibles ---------- */

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function fillSelect(select) {
  if (!select) return;
  select.textContent = '';
  passesDisponibles().forEach((p) => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.nom;
    select.appendChild(option);
  });
}

function buildPanel(ctx) {
  let panel = document.getElementById(ID.panel);
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    return {
      panel,
      radios: TYPE_ORDER.map((v) => document.getElementById(ID.type + '-' + v)),
      select: document.getElementById(ID.passage),
      beam: document.getElementById(ID.beam),
      beamValue: document.getElementById(ID.beamValue),
      canvas: document.getElementById(ID.canvas),
      legend: document.getElementById(ID.legend),
      readout: document.getElementById(ID.readout),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
      fresh: false,
    };
  }

  panel = ctx.el('section', 'geography-v2-e023-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const title = ctx.el('h2', '', 'Détroits et canaux — le gabarit des passages (V2)');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Un détroit ou un canal est un goulot : la largeur et la profondeur disponibles y imposent un gabarit. '
    + 'Comparer Gibraltar, le Bosphore, Suez et Panama montre qu’un même navire n’y passe pas partout. '
    + 'À Panama, le chenal mesure environ 150 m mais la chambre d’écluse (33,5 m) fixe la vraie limite : '
    + 'le laboratoire rend ce point mesurable et falsifiable.');
  lead.id = ID.lead;

  /* E023-04 : choix unique → fieldset + role="radiogroup" explicite, jamais aria-pressed. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = ID.type;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.appendChild(ctx.el('legend', '', 'Nature du passage (choix unique)'));
  TYPE_ORDER.forEach((value) => {
    const lab = ctx.el('label', 'geography-v2-e023-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e023-type';
    radio.id = ID.type + '-' + value;
    radio.value = value;
    radio.checked = S.type === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(TYPE_LABELS[value]));
    fieldset.appendChild(lab);
  });

  const ligne = ctx.el('div', 'geography-v2-e023-ligne');
  const passageLabel = document.createElement('label');
  passageLabel.setAttribute('for', ID.passage);
  passageLabel.appendChild(document.createTextNode('Passage observé : '));
  const select = document.createElement('select');
  select.id = ID.passage;
  passageLabel.appendChild(select);
  ligne.appendChild(passageLabel);

  const sub = ctx.el('h3', '', 'Observer la marge de sécurité');
  const beamLabel = document.createElement('label');
  beamLabel.setAttribute('for', ID.beam);
  beamLabel.appendChild(document.createTextNode('Bau du navire : '));
  const beamValue = ctx.el('span', 'geography-v2-e023-valeur', '');
  beamValue.id = ID.beamValue;
  beamLabel.appendChild(beamValue);
  const beam = document.createElement('input');
  beam.type = 'range';
  beam.id = ID.beam;
  beam.min = '10';
  beam.max = '60';
  beam.step = '1';
  beam.value = String(S.beam);
  beam.setAttribute('aria-label', 'Bau du navire, de 10 à 60 mètres, pas de 1 mètre');

  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Coupe transversale schématique du passage : flèches gauche et droite pour changer de passage, '
    + 'flèches haut et bas pour régler le bau, Origine pour revenir aux valeurs par défaut, '
    + 'Entrée pour réénoncer le résultat.');
  canvas.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Home Enter');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : les flèches gauche et droite parcourent les passages disponibles, '
    + 'les flèches haut et bas règlent le bau de deux mètres, Origine rétablit Suez et un bau de 32 m, '
    + 'Entrée réénonce le résultat. Chaque valeur est aussi écrite dans le bandeau et le tableau.');
  canvasDesc.id = ID.canvasDesc;

  const legend = ctx.el('p', 'geography-v2-e023-legend', '');
  legend.id = ID.legend;

  const mesuresTitle = ctx.el('h3', '', 'Mesures recalculées du modèle');
  mesuresTitle.id = ID.mesuresTitle;

  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');
  defiTitle.id = ID.defiTitle;

  const readout = ctx.el('p', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.textContent = 'Le gabarit utile et la profondeur commandent le passage.';

  /* E023-10 : boutons ≥ 36 px (ici 44 px) ; aria-pressed réservé à la bascule. */
  const play = ctx.el('button', 'geography-v2-e023-btn', '▶ Animer le balayage');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  const reset = ctx.el('button', 'geography-v2-e023-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const note = ctx.el('p', '',
    'Ce laboratoire est un schéma déterministe : aucune donnée géographique mesurée n’est chargée '
    + 'et aucun tirage aléatoire n’intervient. Les grandeurs ci-dessus sont des textes réels, '
    + 'lisibles et indexables même sans animation ; la carte d’origine reste utilisable sans ce panneau.');
  note.id = ID.note;

  panel.append(title, lead, staticFacts(ctx), buildReferenceTable(ctx), fieldset, ligne,
    sub, beamLabel, beam, canvas, canvasDesc, legend, mesuresTitle, buildMesuresTable(ctx),
    defiTitle, buildDefi(ctx), readout, play, reset, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    radios: TYPE_ORDER.map((v) => document.getElementById(ID.type + '-' + v)),
    select, beam, beamValue, canvas, legend, readout, play, reset,
    fresh: true,
  };
}

/* ---------- E023-10 : badge d'honnêteté sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e023-badge',
    `Détroits et canaux (graine ${SEED.toString(16)}) : schéma déterministe, largeur utile et profondeur imposent un gabarit. Aucune donnée réelle chargée.`);
  badge.id = ID.badge;
  map.appendChild(badge);
}

/* ---------- E023-06 : coupe transversale (un seul canvas) ---------- */

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 236;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const m = mesures();
  const pad = 18;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const surface = pad + ih * 0.30;
  const fond = pad + ih * 0.86;

  /* Eau : surface pleine et fond du chenal. */
  g.fillStyle = 'rgba(86,150,178,.16)';
  g.fillRect(pad, surface, iw, fond - surface);

  /* Rives : traits pleins, jamais la couleur seule. */
  g.strokeStyle = 'rgba(214,207,193,.75)';
  g.lineWidth = 8;
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(pad, surface - 8); g.lineTo(pad, fond + 8);
  g.moveTo(pad + iw, surface - 8); g.lineTo(pad + iw, fond + 8);
  g.stroke();
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(pad, surface); g.lineTo(pad + iw, surface);
  g.stroke();

  /* Gabarit utile : tirets longs. À Panama il est plus étroit que le chenal
     pour montrer que la chambre d'écluse, non le chenal, fixe la limite. */
  const utilePx = Math.min(iw, Math.max(8, (m.p.gabarit / m.p.largeur) * iw));
  const gauche = pad + (iw - utilePx) / 2;
  const droite = gauche + utilePx;
  g.strokeStyle = 'rgba(214,207,193,.9)';
  g.lineWidth = 1.5;
  g.setLineDash([9, 5]);
  g.beginPath();
  g.moveTo(gauche, surface); g.lineTo(gauche, fond);
  g.moveTo(droite, surface); g.lineTo(droite, fond);
  g.stroke();

  /* Marge de sécurité de 5 m de chaque bord du gabarit : tirets courts. */
  const margePx = Math.max(1, (MARGE / m.p.gabarit) * utilePx);
  g.strokeStyle = 'rgba(230,185,111,.85)';
  g.lineWidth = 1.5;
  g.setLineDash([4, 3]);
  g.beginPath();
  g.moveTo(gauche + margePx, surface); g.lineTo(gauche + margePx, fond);
  g.moveTo(droite - margePx, surface); g.lineTo(droite - margePx, fond);
  g.stroke();

  /* Axe médian : pointillés. */
  g.strokeStyle = 'rgba(255,255,255,.45)';
  g.setLineDash([2, 4]);
  g.beginPath();
  g.moveTo(gauche, (surface + fond) / 2); g.lineTo(droite, (surface + fond) / 2);
  g.stroke();
  g.setLineDash([]);

  /* Navire : bau et tirant d'eau d'après les réglages ; épaisseur plancher
     pour rester visible dans les très larges détroits (schéma non à l'échelle). */
  const largeurNavire = Math.max(4, (m.bau / m.p.gabarit) * utilePx);
  const tirantPx = (TIRANT_REF / m.p.profondeur) * (fond - surface);
  const course = Math.max(0, (utilePx - largeurNavire) / 2 - margePx);
  const x = (gauche + droite) / 2 + (S.phase * 2 - 1) * course;
  const yHaut = Math.max(surface + 2, (surface + fond) / 2 - tirantPx / 2);
  g.fillStyle = m.passe ? 'rgba(244,214,158,.92)' : 'rgba(206,120,110,.85)';
  g.fillRect(x - largeurNavire / 2, yHaut, largeurNavire, Math.max(3, tirantPx));
  g.strokeStyle = 'rgba(8,12,18,.85)';
  g.lineWidth = 1;
  g.strokeRect(x - largeurNavire / 2, yHaut, largeurNavire, Math.max(3, tirantPx));

  /* Libellés : le type est écrit, il ne dépend pas de la couleur. */
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(`${m.p.nom} — ${TYPE_TRAITS[m.p.type]}`, pad + 2, pad - 4);
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.fillText(`chenal ${fmtLargeur(m.p.largeur)} · gabarit utile ${fmtLargeur(m.p.gabarit)}`, pad + 2, fond + 13);
  g.fillText(`bau ${fmt(m.bau, 0)} m · tirant ${fmt(TIRANT_REF, 0)} m`, pad + 2, fond + 25);
  g.fillText(m.passe ? 'Passage possible' : 'Gabarit insuffisant', pad + 2, surface - 6);
}

/* ---------- E023-07 : bandeau de lecture (role=status) ---------- */

function updateReadout() {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const m = mesures();
  const add = (t) => n.appendChild(document.createTextNode(t));
  const put = (t) => {
    const s = document.createElement('strong');
    s.textContent = t;
    n.appendChild(s);
  };
  n.textContent = '';

  add(`${m.p.nom} (${m.p.type === 'detroit' ? 'détroit naturel' : 'canal artificiel'}) : chenal de `);
  put(fmtLargeur(m.p.largeur));
  add(', gabarit utile de ');
  put(fmtLargeur(m.p.gabarit));
  add(', soit ');
  put(`${fmt(m.ratio, 1)}×`);
  add(' le bau du navire ; profondeur ');
  put(`${fmt(m.p.profondeur, 0)} m`);
  add(', marge d’eau ');
  put(`${fmt(m.margeEau, 0)} m`);
  add(` sous le tirant de référence de ${fmt(TIRANT_REF, 0)} m. Bau réglé : `);
  put(`${fmt(m.bau, 0)} m`);
  add(` (référence Panamax ${fmt(BAU_REF, 1)} m). Avec ${fmt(MARGE, 0)} m de marge de chaque bord, la largeur nécessaire est de `);
  put(`${fmt(m.necessaire, 0)} m`);
  add(', soit au plus ');
  put(`${fmt(m.deFront, 0)} navire(s) de front`);
  add('. Verdict : ');
  put(m.passe ? 'passage possible' : 'gabarit insuffisant');
  add('.');
}

/* ---------- Application de l'état ---------- */

function applyState() {
  const n = S.nodes;
  if (!n || !n.select || !n.beam) return;
  const dispo = passesDisponibles();
  if (!dispo.some((p) => p.id === S.passageId)) S.passageId = dispo[0].id;

  n.radios.forEach((r) => {
    if (r) r.checked = r.value === S.type;
  });
  fillSelect(n.select);
  n.select.value = S.passageId;
  n.beam.value = String(S.beam);
  if (n.beamValue) n.beamValue.textContent = `${fmt(S.beam, 0)} m`;

  if (n.legend) {
    const p = passageCourant();
    n.legend.textContent = `Filtre : ${TYPE_LABELS[S.type]}. Rives en trait plein, gabarit utile en tirets longs, marge de ${fmt(MARGE, 0)} m en tirets courts, axe médian en pointillés ; type : ${TYPE_TRAITS[p.type]}. Le navire est schématisé (épaisseur plancher pour la lisibilité), les chiffres exacts sont dans le texte.`;
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E023Reduced = S.reduced ? '1' : '0';
  if (S.defiSpans) fillDefi();
  fillMesuresTable();
  updateReadout();
  drawLab();
}

function resetValues() {
  S.type = 'tous';
  S.passageId = 'suez';
  S.beam = 32;
  S.phase = 0;
  applyState();
}

/* ---------- E023-09 : boucle rAF unique, pauses multiples ---------- */

function stopLoop() {
  if (S.rafId) {
    try { cancelAnimationFrame(S.rafId); } catch { /* environnement sans rAF */ }
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.inView || S.reduced || !S.playing) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) { stopLoop(); return; }
  if (!S.inView || S.reduced || !S.playing) { stopLoop(); return; }
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.phase = (S.phase + dt * 0.00016) % 1;
  }
  S.lastTs = ts;
  drawLab();
  S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  if (S.listenersInstalled) return;
  S.listenersInstalled = true;

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop(); else startLoop();
    });
  }

  /* Pause hors champ : au plus un canvas dessiné, et seulement à l'écran. */
  if (S.nodes && S.nodes.panel && typeof IntersectionObserver === 'function') {
    try {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { S.inView = !!entry.isIntersecting; });
        if (S.inView) startLoop(); else stopLoop();
      }, { threshold: 0.05 });
      io.observe(S.nodes.panel);
    } catch { /* observation indisponible : la visibilité reste le garde-fou */ }
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = (event) => {
        S.reduced = !!(event && event.matches);
        if (S.reduced) { S.playing = false; stopLoop(); }
        applyState();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }
}

/* ---------- E023-04 / E023-05 / E023-10 : câblage des contrôles ---------- */

function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  n.radios.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      S.type = radio.value;
      applyState();
    });
  });

  n.select.addEventListener('change', () => {
    S.passageId = n.select.value;
    applyState();
  });

  n.beam.addEventListener('input', () => {
    S.beam = Math.max(10, Math.min(60, Math.round(Number(n.beam.value))));
    applyState();
  });

  n.play.addEventListener('click', () => {
    S.playing = !S.playing;
    if (!S.playing || S.reduced) stopLoop(); else startLoop();
    applyState();
  });

  n.reset.addEventListener('click', () => {
    stopLoop();
    resetValues();
  });

  n.canvas.addEventListener('keydown', (event) => {
    const dispo = passesDisponibles();
    let used = true;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const i = dispo.findIndex((p) => p.id === S.passageId);
      S.passageId = dispo[(i + step + dispo.length) % dispo.length].id;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const step = event.key === 'ArrowUp' ? 2 : -2;
      S.beam = Math.max(10, Math.min(60, S.beam + step));
    } else if (event.key === 'Home') {
      resetValues();
    } else if (event.key === 'Enter') {
      updateReadout();
    } else {
      used = false;
    }
    if (used) {
      event.preventDefault();
      applyState();
    }
  });
}

/* ---------- Point d'entrée unique ---------- */

register('E023', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }
  if (S.reduced) S.playing = false;

  S.nodes = buildPanel(ctx);
  addMapBadge(ctx);
  wirePanel();
  applyState();
  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
