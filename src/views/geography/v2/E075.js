import { register } from './registry.js';

/*
 * Lentille E075 — SECONDE PASSE (V2) : rotation de la carte et orientation cardinale.
 *
 * Les dix chantiers (E075-01 … E075-10) sont réellement implémentés ci-dessous,
 * sans stub. La V2 renforce la passe 1 par une fiche de vérité à trois faits
 * sourcés, un tableau de mesures recalculées depuis les formules, un défi
 * falsifiable en cinq temps, un badge textuel sur la carte, un bouton de
 * remise à zéro et une boucle rAF suspendue sur trois garde-fous (onglet
 * masqué, hors champ, mouvement réduit).
 *
 * Thème : une carte est par convention « nord en haut ». La faire tourner d'un
 * angle θ (positif = sens horaire) ne change aucun cap géographique β, mais
 * change l'angle apparent α à l'écran : α = β + θ (mod 360), et le cap
 * géographique en haut de l'écran vaut −θ (mod 360). La rosace tourne avec la
 * carte : N pointe à θ, E à θ + 90°, S à θ + 180°, O à θ + 270°. Un repère R
 * de cap géographique fixe β = 125° montre que son cap ne bouge jamais alors
 * que son angle écran suit β + θ. Aucune grandeur n'est inventée : tout est
 * recalculé depuis ces trois formules.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e075-` (aucune collision avec la passe 1 `geography-e075-`).
 * Zéro console.*, zéro réseau, zéro Math.random, une seule boucle rAF.
 * Le contenu pédagogique est du texte sémantique indexable (h2/h3/p/ol/li/
 * table/caption/th/td/fieldset/legend/label) présent dans le DOM : le panneau
 * reste lisible et le phénomène compréhensible sans aucune animation.
 *
 * Contrat : register('E075', (ctx) => { … }) avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e075';

const ID = {
  panel: 'geography-v2-e075-panel',
  title: 'geography-v2-e075-title',
  facts: 'geography-v2-e075-facts',
  staticTable: 'geography-v2-e075-static-table',
  measuresTable: 'geography-v2-e075-measures-table',
  mode: 'geography-v2-e075-mode',
  angle: 'geography-v2-e075-angle',
  angleValue: 'geography-v2-e075-angle-value',
  angleLabel: 'geography-v2-e075-angle-label',
  canvas: 'geography-v2-e075-canvas',
  canvasDesc: 'geography-v2-e075-canvas-desc',
  legend: 'geography-v2-e075-legend',
  defi: 'geography-v2-e075-defi',
  readout: 'geography-v2-e075-readout',
  play: 'geography-v2-e075-play',
  reset: 'geography-v2-e075-reset',
  note: 'geography-v2-e075-note',
  badge: 'geography-v2-e075-badge',
};

const RAD = Math.PI / 180;
const LANDMARK_BEARING = 125; // cap géographique fixe du repère R

/* Quatre orientations de référence (choix unique). */
const PRESETS = [
  { key: 'nord', label: 'Nord en haut (0°)', angle: 0 },
  { key: 'ne', label: 'Nord-Est en haut (45°)', angle: 45 },
  { key: 'est', label: 'Est en haut (90°)', angle: 90 },
  { key: 'sud', label: 'Sud en haut (180°)', angle: 180 },
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  angle: 0,
  preset: 'nord',
  playing: false,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  inView: true,
  listenersInstalled: false,
  nodes: null,
  cells: {},
  defiSpans: null,
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const fmt = (n, d = 2) => {
  if (!Number.isFinite(n)) return '—';
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};
const mod360 = (d) => ((d % 360) + 360) % 360;

/* Cap géographique β → angle écran α (rotation horaire θ). */
function screenAngle(bearing, rotation) {
  return mod360(bearing + rotation);
}

/* Angle écran α → cap géographique β. */
function geographicBearing(screen, rotation) {
  return mod360(screen - rotation);
}

/* Cap β et distance r → décalage écran (x à droite, y vers le bas). */
function vector(bearing, rotation, radius, cx, cy) {
  const a = (bearing + rotation) * RAD;
  return { x: cx + radius * Math.sin(a), y: cy - radius * Math.cos(a) };
}

/* Toutes les grandeurs affichées sont dérivées de ces trois formules. */
function measures(rotation) {
  const beta = LANDMARK_BEARING;
  return {
    rotation: mod360(rotation),
    landmarkBearing: beta,
    landmarkScreen: screenAngle(beta, rotation),
    topBearing: geographicBearing(0, rotation),
    delta: mod360(screenAngle(beta, rotation) - beta),
    northScreen: screenAngle(0, rotation),
  };
}

function orientationLabel(angle) {
  const a = mod360(angle);
  if (a === 0) return 'Nord en haut';
  if (a === 45) return 'Nord-Est en haut';
  if (a === 90) return 'Est en haut';
  if (a === 180) return 'Sud en haut';
  if (a === 270) return 'Ouest en haut';
  return `Rotation de ${fmt(a, 0)}°`;
}

/* ---------- E075-01 : feuille de style isolée, une seule injection ---------- */

const CSS = `
.geography-v2-e075-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);font-size:11px;line-height:1.6;
}
.geography-v2-e075-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700;
}
.geography-v2-e075-panel h3{
  margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700;
}
.geography-v2-e075-panel p{margin:5px 0;max-width:74ch}
.geography-v2-e075-panel .geography-v2-e075-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e075-panel .geography-v2-e075-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e075-panel .geography-v2-e075-table caption{
  margin-bottom:4px;color:var(--muted,#a8a198);text-align:left;
}
.geography-v2-e075-panel .geography-v2-e075-table th,
.geography-v2-e075-panel .geography-v2-e075-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e075-panel .geography-v2-e075-table thead th{color:var(--gold-bright,#f4d69e)}
.geography-v2-e075-panel .geography-v2-e075-table tbody th{color:var(--ink-soft,#d7d1c6)}
.geography-v2-e075-panel .geography-v2-e075-table td.geography-v2-e075-num{
  color:var(--gold-bright,#f4d69e);font-weight:600;
}
#geography-v2-e075-mode{
  margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px;
}
#geography-v2-e075-mode legend{padding:0 4px;color:var(--gold,#e6b96f)}
.geography-v2-e075-panel .geography-v2-e075-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;
  margin:0 8px 0 0;padding:2px 6px;cursor:pointer;
}
.geography-v2-e075-panel .geography-v2-e075-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e075-slider-row{margin:7px 0}
.geography-v2-e075-slider-row label{display:block;color:var(--ink-soft,#d7d1c6)}
.geography-v2-e075-valeur{
  color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums;
}
.geography-v2-e075-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
#geography-v2-e075-canvas{
  display:block;width:100%;height:232px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.30);touch-action:manipulation;
}
.geography-v2-e075-panel .geography-v2-e075-legend{font-size:10px;color:var(--muted,#a8a198)}
.geography-v2-e075-panel .geography-v2-e075-defi{margin:6px 0;padding-left:18px;font-size:10px}
.geography-v2-e075-panel .geography-v2-e075-defi li{margin:3px 0}
.geography-v2-e075-panel .geography-v2-e075-defi strong{color:var(--gold,#e6b96f)}
#geography-v2-e075-readout{
  min-height:36px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e075-readout strong{color:var(--gold-bright,#f4d69e)}
.geography-v2-e075-panel .geography-v2-e075-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;
  padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation;
  transition:border-color .18s,background-color .18s;
}
.geography-v2-e075-panel .geography-v2-e075-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e075-panel :focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.geography-v2-e075-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.geography-v2-e075-panel[data-geography-v2-e075-reduced="1"] .geography-v2-e075-btn{
  transition:none;
}
@media (prefers-reduced-motion:reduce){
  .geography-v2-e075-panel .geography-v2-e075-btn{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  .geography-v2-e075-panel{font-size:10px;padding:9px}
  #geography-v2-e075-canvas{height:190px}
  .geography-v2-e075-panel .geography-v2-e075-choix{margin-right:4px}
}
@media (forced-colors:active){
  .geography-v2-e075-panel{border:1px solid CanvasText}
}
`;

/* ---------- E075-02 : fiche de vérité à trois faits sourcés (texte réel) ---------- */

function buildFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  const faits = [
    '« Nord en haut » est une convention de représentation : le haut de la feuille correspond au '
      + 'nord géographique. Ce n’est pas une propriété du territoire — une carte peut être orientée '
      + 'autrement sans qu’aucun lieu ne change de place sur le sol.',
    'Faire tourner la carte d’un angle θ (positif dans le sens des aiguilles d’une montre) ne change '
      + 'aucun cap géographique β : les lieux gardent leur direction réelle. Seul leur angle apparent '
      + 'à l’écran change, selon α = β + θ (mod 360). La réciproque donne le cap en haut de l’écran : '
      + 'β = −θ (mod 360).',
    'La rosace tourne avec la carte : la flèche du nord pointe à θ, l’est à θ + 90°, le sud à '
      + 'θ + 180° et l’ouest à θ + 270°. Un repère de cap géographique fixe β = 125° conserve ce cap '
      + 'quand on tourne la carte, mais apparaît à α = 125° + θ : c’est l’écart α − β = θ, nul seulement '
      + 'quand la carte est orientée nord en haut.',
  ];
  faits.forEach((texte) => wrap.appendChild(ctx.el('p', 'geography-v2-e075-fait', texte)));
  return wrap;
}

/* ---------- E075-03 : tableau statique des points cardinaux ---------- */

function buildStaticTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e075-table');
  table.id = ID.staticTable;
  table.appendChild(ctx.el('caption', '',
    'Points cardinaux : cap géographique et angle à l’écran. Référence : nord en haut (rotation 0°).'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Point cardinal', 'Cap géographique β', 'Angle écran α (θ = 0°)', 'Angle écran α (θ = 90°)'].forEach((label) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = label;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Nord', '0°', '0°', '90°'],
    ['Est', '90°', '90°', '180°'],
    ['Sud', '180°', '180°', '270°'],
    ['Ouest', '270°', '270°', '0°'],
  ];
  lignes.forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((value, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.setAttribute('scope', 'row');
      cell.textContent = value;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E075-04 : tableau de mesures recalculées ---------- */

const MEASURE_ROWS = [
  ['rotation', 'Rotation θ de la carte'],
  ['bearing', 'Cap géographique β du repère R'],
  ['screen', 'Angle écran α = β + θ'],
  ['top', 'Cap géographique en haut de l’écran = −θ'],
  ['delta', 'Écart α − β'],
];

function buildMeasuresTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e075-table');
  table.id = ID.measuresTable;
  table.appendChild(ctx.el('caption', '',
    'Mesures du laboratoire : chaque valeur est recalculée depuis sa formule, jamais saisie à la main.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Valeur courante', 'Référence'].forEach((label) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = label;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  S.cells = {};
  MEASURE_ROWS.forEach(([key, label]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = label;
    const value = document.createElement('td');
    value.className = 'geography-v2-e075-num';
    const ref = document.createElement('td');
    tr.append(th, value, ref);
    tbody.appendChild(tr);
    S.cells[key] = { value, ref };
  });
  table.appendChild(tbody);
  return table;
}

function fillMeasuresTable() {
  const m = measures(S.angle);
  const refs = {
    rotation: '0° = nord en haut',
    bearing: 'invariant par rotation',
    screen: 'α − β = θ',
    top: 'nord géographique quand θ = 0°',
    delta: 'nul en orientation nord en haut',
  };
  const values = {
    rotation: `${fmt(m.rotation, 0)}°`,
    bearing: `${fmt(m.landmarkBearing, 0)}°`,
    screen: `${fmt(m.landmarkScreen, 0)}°`,
    top: `${fmt(m.topBearing, 0)}°`,
    delta: `${fmt(m.delta, 0)}°`,
  };
  MEASURE_ROWS.forEach(([key]) => {
    const c = S.cells[key];
    if (!c) return;
    c.value.textContent = values[key];
    c.ref.textContent = refs[key];
  });
}

/* ---------- E075-09 : défi falsifiable en cinq temps (texte réel) ---------- */

const DEFI = {
  prediction: 'En orientant la carte « Est en haut » (θ = 90°), la flèche du nord doit pointer vers la droite de l’écran et le cap géographique en haut de l’écran doit devenir 270° (l’ouest géographique).',
  reglage: 'Sélectionnez « Est en haut (90°) » dans le radiogroupe, ou placez le curseur θ sur 90°.',
  attendu: 'Le repère R de cap 125° apparaît à α = 215° (125 + 90) et le cap en haut de l’écran vaut 270° (−90 mod 360) : la flèche N pointe à droite.',
  falsification: 'Si l’angle écran de R restait à 125° alors que θ vaut 90°, ou si la flèche N pointait encore vers le haut, la relation α = β + θ serait fausse.',
  debrief: 'Tourner la carte change l’angle apparent des lieux, jamais leur cap réel. La rosace tourne avec la carte : confondre cap géographique et angle écran est l’erreur que ce laboratoire rend visible.',
};

const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

function buildDefi(ctx) {
  const list = ctx.el('ol', 'geography-v2-e075-defi');
  list.id = ID.defi;
  S.defiSpans = {};
  DEFI_ETAPES.forEach(([key, label]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = label + ' : ';
    const span = document.createElement('span');
    span.textContent = DEFI[key];
    S.defiSpans[key] = span;
    li.append(strong, span);
    list.appendChild(li);
  });
  return list;
}

/* ---------- E075-05 / E075-06 : panneau sémantique et contrôles ---------- */

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function buildPanel(ctx) {
  let panel = document.getElementById(ID.panel);
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    return {
      panel,
      radios: PRESETS.map((p) => document.getElementById(ID.mode + '-' + p.key)),
      angle: document.getElementById(ID.angle),
      angleOut: document.getElementById(ID.angleValue),
      angleLabel: document.getElementById(ID.angleLabel),
      canvas: document.getElementById(ID.canvas),
      legend: document.getElementById(ID.legend),
      readout: document.getElementById(ID.readout),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
      fresh: false,
    };
  }

  panel = ctx.el('section', 'geography-v2-e075-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const title = ctx.el('h2', '', 'Rotation de la carte et orientation cardinale — laboratoire V2');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Tourner une carte change l’angle des lieux à l’écran, jamais leur cap géographique. Ce '
    + 'laboratoire sépare les deux repères : le cap β reste attaché au territoire, l’angle α suit la '
    + 'rotation θ de la carte. Les grandeurs sont recalculées par les formules et écrites en toutes '
    + 'lettres dans les tableaux et le bandeau : le dessin ne fait qu’illustrer le calcul.');

  /* E075-06 : choix exclusif → fieldset/radiogroup, jamais aria-pressed. */
  const modeLegend = ctx.el('legend', '', 'Orientation de la carte (choix unique)');
  modeLegend.id = ID.mode + '-legend';
  const fieldset = document.createElement('fieldset');
  fieldset.id = ID.mode;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-labelledby', ID.mode + '-legend');
  fieldset.appendChild(modeLegend);
  PRESETS.forEach((p) => {
    const lab = ctx.el('label', 'geography-v2-e075-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e075-mode';
    radio.id = ID.mode + '-' + p.key;
    radio.value = p.key;
    radio.checked = S.preset === p.key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(p.label));
    fieldset.appendChild(lab);
  });

  /* Curseur d'angle : grandeur chiffrée déterministe, bornée et resynchronisée. */
  const angleRow = ctx.el('div', 'geography-v2-e075-slider-row');
  const angleLabel = document.createElement('label');
  angleLabel.id = ID.angleLabel;
  angleLabel.setAttribute('for', ID.angle);
  const angleOut = ctx.el('span', 'geography-v2-e075-valeur', `${fmt(S.angle, 0)}°`);
  angleOut.id = ID.angleValue;
  angleLabel.append(document.createTextNode('Rotation θ (sens horaire) : '), angleOut);
  const angle = document.createElement('input');
  angle.type = 'range';
  angle.id = ID.angle;
  angle.min = '0';
  angle.max = '360';
  angle.step = '5';
  angle.value = String(S.angle);
  angle.setAttribute('aria-label',
    'Angle de rotation de la carte, de 0 à 360 degrés par pas de 5, valeur affichée dans le libellé');
  angleRow.append(angleLabel, angle);

  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Rosace des points cardinaux tournée de l’angle choisi. Flèches gauche et droite : changer la '
    + 'rotation de cinq degrés ; Début : revenir au nord en haut. La flèche marquée N indique le nord '
    + 'géographique, les traits E S O les autres cardinaux, le carré marqué R un repère de cap 125 '
    + 'degrés et le triangle creux le haut de l’écran.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : les flèches gauche et droite font varier la rotation de cinq '
    + 'degrés, Début restaure le nord en haut, Entrée réénonce le résultat. Chaque grandeur est aussi '
    + 'écrite dans le tableau des mesures et dans le bandeau : aucune information n’est portée par la '
    + 'seule couleur.');
  canvasDesc.id = ID.canvasDesc;

  const legend = ctx.el('p', 'geography-v2-e075-legend',
    'Flèche pleine N : nord géographique. Traits E, S, O : autres cardinaux. Carré R : repère de cap '
    + '125°. Triangle creux : haut de l’écran, immobile. Tirets : ligne du centre vers R. Formes et '
    + 'lettres distinguent chaque repère indépendamment de la couleur.');
  legend.id = ID.legend;

  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');

  const readout = ctx.el('p', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.textContent = 'Orientation prête : le détail des grandeurs est énoncé ci-dessous.';

  const play = ctx.el('button', 'geography-v2-e075-btn', '▶ Animer la rotation');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  const reset = ctx.el('button', 'geography-v2-e075-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const note = ctx.el('p', '',
    'Ce laboratoire est un schéma déterministe : les angles proviennent des formules de passage, '
    + 'aucun tirage aléatoire ni ressource externe n’intervient. Les textes ci-dessus sont réels, '
    + 'lisibles et indexables même sans animation ; la carte d’origine reste utilisable sans ce '
    + 'panneau.');
  note.id = ID.note;

  panel.append(title, lead, buildFacts(ctx), buildStaticTable(ctx), buildMeasuresTable(ctx), fieldset,
    angleRow, canvas, canvasDesc, legend, defiTitle, buildDefi(ctx), readout, play, reset, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    radios: PRESETS.map((p) => document.getElementById(ID.mode + '-' + p.key)),
    angle, angleOut, angleLabel, canvas, legend,
    readout, play, reset,
    fresh: true,
  };
}

/* ---------- E075-07 : badge sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e075-badge',
    'Orientation : ' + orientationLabel(S.angle) + ' · θ = ' + fmt(S.angle, 2) + '°');
  badge.id = ID.badge;
  map.appendChild(badge);
}

function updateBadge() {
  const badge = document.getElementById(ID.badge);
  if (badge) {
    badge.textContent = 'Orientation : ' + orientationLabel(S.angle)
      + ' · θ = ' + fmt(S.angle, 2) + '°';
  }
}

/* ---------- E075-08 : rosace canvas déterministe (un seul canvas) ---------- */

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 232;
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const cx = cssW / 2;
  const cy = cssH / 2 + 8;
  const R = Math.max(24, Math.min(cssW, cssH) / 2 - 36);
  const theta = S.angle;

  /* Cercle de la rosace et graduations tous les 30°, plus longues aux cardinaux. */
  g.strokeStyle = 'rgba(255,255,255,.20)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
  for (let d = 0; d < 360; d += 30) {
    const long = d % 90 === 0;
    const a = (d + theta) * RAD;
    const r1 = long ? R - 8 : R - 4;
    g.beginPath();
    g.moveTo(cx + r1 * Math.sin(a), cy - r1 * Math.cos(a));
    g.lineTo(cx + (R + 1) * Math.sin(a), cy - (R + 1) * Math.cos(a));
    g.stroke();
  }

  /* Repère fixe du haut de l'écran (triangle creux) : référence visuelle. */
  g.strokeStyle = 'rgba(255,255,255,.75)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(cx, 8);
  g.lineTo(cx - 6, 19);
  g.lineTo(cx + 6, 19);
  g.closePath();
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.85)';
  g.font = '10px sans-serif';
  g.textAlign = 'center';
  g.fillText('Haut écran', cx, 31);

  /* Points cardinaux : le nord est une flèche pleine, les autres des traits. */
  const cardinaux = [
    { b: 0, lettre: 'N' },
    { b: 90, lettre: 'E' },
    { b: 180, lettre: 'S' },
    { b: 270, lettre: 'O' },
  ];
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  cardinaux.forEach((c) => {
    const p = vector(c.b, theta, R, cx, cy);
    const pBase = vector(c.b, theta, R - 16, cx, cy);
    if (c.b === 0) {
      const a = (c.b + theta) * RAD;
      const side = 5;
      const px = Math.cos(a);
      const py = Math.sin(a);
      g.fillStyle = 'rgba(244,214,158,.98)';
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(pBase.x + px * side, pBase.y + py * side);
      g.lineTo(pBase.x - px * side, pBase.y - py * side);
      g.closePath();
      g.fill();
    } else {
      g.strokeStyle = 'rgba(214,207,193,.92)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(pBase.x, pBase.y);
      g.lineTo(p.x, p.y);
      g.stroke();
    }
    const lp = vector(c.b, theta, R + 13, cx, cy);
    g.fillStyle = c.b === 0 ? 'rgba(244,214,158,.98)' : 'rgba(214,207,193,.92)';
    g.font = 'bold 12px sans-serif';
    g.fillText(c.lettre, lp.x, lp.y);
  });

  /* Repère géographique fixe R (cap 125°) : carré + ligne pointillée. */
  const rep = vector(LANDMARK_BEARING, theta, R * 0.72, cx, cy);
  g.setLineDash([4, 4]);
  g.strokeStyle = 'rgba(255,255,255,.55)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(rep.x, rep.y);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillRect(rep.x - 5, rep.y - 5, 10, 10);
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.font = 'bold 11px sans-serif';
  g.fillText('R', rep.x, rep.y - 13);

  /* Centre et libellés textuels : jamais la seule couleur. */
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.beginPath();
  g.arc(cx, cy, 3, 0, Math.PI * 2);
  g.fill();
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(orientationLabel(theta), 8, cssH - 8);
  g.fillStyle = 'rgba(214,207,193,.75)';
  g.fillText('θ = ' + fmt(theta, 0) + '°  ·  α(R) = ' + fmt(measures(theta).landmarkScreen, 0) + '°', 8, 16);
}

/* ---------- E075-04 : bandeau de lecture (role=status, aria-live=polite) ---------- */

function updateReadout(forced) {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const m = measures(S.angle);
  const put = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    n.appendChild(s);
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Rotation '));
  put(fmt(m.rotation, 0) + '°');
  n.appendChild(document.createTextNode(' (référence : 0° = nord en haut). Repère R : cap géographique '));
  put(fmt(m.landmarkBearing, 0) + '°');
  n.appendChild(document.createTextNode(' ; angle à l’écran α = β + θ = '));
  put(fmt(m.landmarkScreen, 0) + '°');
  n.appendChild(document.createTextNode('. Cap géographique en haut de l’écran = −θ = '));
  put(fmt(m.topBearing, 0) + '°');
  n.appendChild(document.createTextNode('. Écart α − β = '));
  put(fmt(m.delta, 0) + '°');
  n.appendChild(document.createTextNode(' : il est nul quand la carte est orientée nord en haut. '));
  if (forced) n.appendChild(document.createTextNode(forced));
}

/* ---------- Application de l'état ---------- */

function applyState(message) {
  const n = S.nodes;
  if (!n) return;
  n.radios.forEach((r) => { if (r) r.checked = r.value === S.preset; });
  if (n.angle) {
    n.angle.min = '0';
    n.angle.max = '360';
    n.angle.step = '5';
    n.angle.value = String(S.angle);
  }
  if (n.angleOut) n.angleOut.textContent = fmt(S.angle, 0) + '°';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la rotation' : '▶ Animer la rotation';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E075Reduced = S.reduced ? '1' : '0';
  fillMeasuresTable();
  updateReadout(message);
  drawLab();
  updateBadge();
}

function selectPreset(key, message) {
  const found = PRESETS.find((p) => p.key === key);
  if (!found) return;
  stopLoop();
  S.playing = false;
  S.preset = found.key;
  S.angle = found.angle;
  applyState(message || `Orientation « ${found.label} » appliquée.`);
}

function setAngle(value, message) {
  stopLoop();
  S.playing = false;
  S.angle = mod360(Math.round(Number(value) / 5) * 5);
  S.preset = (PRESETS.find((p) => p.angle === S.angle) || {}).key || '';
  applyState(message);
}

function resetState() {
  stopLoop();
  S.playing = false;
  S.angle = 0;
  S.preset = 'nord';
  applyState('Valeurs par défaut restaurées : nord en haut, rotation 0°.');
}

/* ---------- E075-10 : boucle rAF unique, pauses multiples ---------- */

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
    S.angle = mod360(S.angle + dt * 0.012);
    S.preset = '';
  }
  S.lastTs = ts;
  applyState();
  S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners(ctx) {
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
    } catch { /* observation indisponible : la visibilité de l'onglet reste le garde-fou */ }
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = (event) => {
        S.reduced = !!(event && event.matches);
        if (S.reduced) stopLoop(); else startLoop();
        if (S.nodes) applyState();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }

  void ctx;
}

/* ---------- Câblage des contrôles (une seule fois) ---------- */

function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  n.radios.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      selectPreset(radio.value);
    });
  });

  n.angle.addEventListener('input', () => {
    setAngle(n.angle.value);
  });

  n.play.addEventListener('click', () => {
    S.playing = !S.playing;
    if (!S.playing || S.reduced) stopLoop(); else startLoop();
    applyState();
  });
  n.reset.addEventListener('click', () => {
    resetState();
  });

  n.canvas.addEventListener('keydown', (event) => {
    let used = true;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const step = event.key === 'ArrowRight' ? 5 : -5;
      setAngle(S.angle + step);
    } else if (event.key === 'Home') {
      resetState();
    } else if (event.key === 'Enter') {
      updateReadout();
    } else {
      used = false;
    }
    if (used) event.preventDefault();
  });
}

/* ---------- Point d'entrée unique ---------- */

register('E075', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (!ctx.layout || typeof ctx.layout.appendChild !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'geography') return;

  /* E075-01 : une seule feuille de style, injectée une seule fois. */
  ctx.css(CSS_ID, CSS);

  try { S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false; }
  catch { S.reduced = false; }
  if (S.reduced) S.playing = false;

  S.nodes = buildPanel(ctx);
  addMapBadge(ctx);
  wirePanel();
  applyState();
  installGlobalListeners(ctx);
  if (S.playing && !S.reduced) startLoop();
});
