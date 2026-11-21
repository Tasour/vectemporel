import { register } from './registry.js';

/*
 * Lentille E098 — SECONDE PASSE (V2) — vue GEOGRAPHIE.
 *
 * Thème : lire la géométrie d’un drapeau. La passe 1 (src/views/geography/E098.js)
 * décomposait un drapeau en proportions, partition et palette dans un SVG local.
 * La V2 reprend le même thème mais déplace le laboratoire vers un **canvas
 * déterministe unique**, ajoute un **contrôle d’aire vérifiable** (la somme des
 * parties doit retomber sur l’aire totale), un **repère de lecture animé** dont
 * la position découle uniquement de l’horodatage rAF, et une **limite falsifiable
 * en cinq temps** alignée sur les angles morts de la lentille.
 *
 * Les dix chantiers E098-01 … E098-10 sont réellement implémentés ci-dessous.
 * Tout le contenu pédagogique est du **texte sémantique indexable** (h2, h3, p,
 * table, caption, th, td, fieldset, legend, ol, li) présent dans le DOM : il
 * reste lisible sans animation, sans interaction et sans canvas. Le canvas n’est
 * qu’un laboratoire qui illustre des formules, jamais leur seul support.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e098-` (aucune collision avec la passe 1 `geography-e098-`).
 * Zéro appel à la console, zéro accès réseau, zéro valeur aléatoire, une seule
 * boucle rAF suspendue sur document.hidden, hors champ et en mouvement réduit.
 * Français intégral.
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e098';

const ID = {
  panel: 'geography-v2-e098-panel',
  title: 'geography-v2-e098-title',
  lead: 'geography-v2-e098-lead',
  facts: 'geography-v2-e098-facts',
  note: 'geography-v2-e098-note',
  ratios: 'geography-v2-e098-ratios',
  ratiosTitle: 'geography-v2-e098-ratios-title',
  ratioGroup: 'geography-v2-e098-ratio-group',
  partGroup: 'geography-v2-e098-partition-group',
  canvas: 'geography-v2-e098-canvas',
  canvasDesc: 'geography-v2-e098-canvas-desc',
  legend: 'geography-v2-e098-legend',
  mesuresTitle: 'geography-v2-e098-mesures-title',
  mesures: 'geography-v2-e098-mesures',
  colorsTitle: 'geography-v2-e098-colors-title',
  colors: 'geography-v2-e098-colors',
  readout: 'geography-v2-e098-readout',
  canton: 'geography-v2-e098-canton',
  play: 'geography-v2-e098-play',
  reset: 'geography-v2-e098-reset',
  defiTitle: 'geography-v2-e098-defi-title',
  defi: 'geography-v2-e098-defi',
  badge: 'geography-v2-e098-map-badge',
};

/* Cadre de dessin virtuel, identique pour toutes les proportions. */
const VIRTUAL_W = 600;
const VIRTUAL_H = 400;
const FLAG_H = 280;                 // hauteur fixe du drapeau, unités de vue
const REF_RATIO = 1.5;              // proportion de référence : 3:2
const REF_INDEX = 1;
const CANTON_W_FRAC = 0.4;          // le canton couvre 40 % de la largeur
const CANTON_H_FRAC = 0.5;          // et 50 % de la hauteur, soit 20 % de l’aire
const SWEEP_SPEED = 0.00016;        // unités de phase par milliseconde

const NARROW = '\u202f';            // espace insécable fine (typographie française)
const MINUS = '\u2212';

/* Proportions disponibles. L’aire à hauteur égale se calcule comme le rapport
   entre le ratio choisi et le ratio de référence 3:2. */
const RATIOS = [
  { key: 'carre', nom: '1:1', value: 1 },
  { key: 'trois-deux', nom: '3:2', value: 1.5 },
  { key: 'cinq-trois', nom: '5:3', value: 5 / 3 },
  { key: 'deux-un', nom: '2:1', value: 2 },
];

/* Types de partition. Le nom et la forme identifient le motif, jamais la teinte. */
const PARTITIONS = [
  { key: 'vertical', nom: 'Bandes verticales' },
  { key: 'horizontal', nom: 'Bandes horizontales' },
  { key: 'croix', nom: 'Croix' },
  { key: 'diagonale', nom: 'Diagonale' },
];
const ROMAN = ['I', 'II', 'III'];

/* Palette locale : nom, hexadécimal et couleur d’encre pour les étiquettes. */
const COLORS = {
  bleu: { hex: '#2f5fa8', ink: '#f7f4ec' },
  blanc: { hex: '#f2efe6', ink: '#1a1a1a' },
  rouge: { hex: '#c8443b', ink: '#fff4ef' },
  or: { hex: '#d6ae5f', ink: '#1a1a1a' },
  vert: { hex: '#2f7a4f', ink: '#f2f7f2' },
};

const COLOR_FACTS = [
  { nom: 'Bleu', hex: COLORS.bleu.hex, sens: 'ciel, mer ou liberté', repere: 'bande de gauche ou champ' },
  { nom: 'Blanc', hex: COLORS.blanc.hex, sens: 'paix ou pureté', repere: 'bande centrale ou croix' },
  { nom: 'Rouge', hex: COLORS.rouge.hex, sens: 'courage ou sang versé', repere: 'bande de droite' },
  { nom: 'Or', hex: COLORS.or.hex, sens: 'soleil ou richesse', repere: 'canton ou symbole' },
  { nom: 'Vert', hex: COLORS.vert.hex, sens: 'nature ou espérance', repere: 'champ alternatif' },
];

const LEGENDE = 'Repère de lecture : trait fin en tirets étiqueté RÉF = cadre de référence autour du drapeau. '
  + 'Séparateurs pleins et chiffres romains I, II, III = bandes. Cadre du canton en pointillés étiqueté CANTON. '
  + 'Ligne en tirets et triangle = position du repère de lecture. Le nom du motif et sa forme distinguent tout, '
  + 'indépendamment de la couleur.';

const DEFI = {
  prediction: 'Au 3:2 en bandes verticales, chaque bande mesure 140 unités de large et 39 200 unités² ; les trois bandes totalisent 117 600 unités². Si l’on passe au 2:1 à hauteur égale, que deviennent la largeur d’une bande, son aire et l’aire totale ?',
  reglage: 'Choisissez la proportion 3:2 puis le motif « Bandes verticales », relevez le tableau de contrôle d’aire, puis portez la proportion à 2:1. Activez ensuite le canton et comparez la somme des parties avant et après.',
  attendu: 'Au 3:2 : bande 140 × 280 = 39 200 unités², somme 117 600 unités², aire relative 1,00×. Au 2:1 : bande 560 / 3 ≈ 187 unités, aire 156 800 / 3 ≈ 52 267 unités², somme 156 800 unités², aire relative 1,33×. Le canton ajoute 23 520 unités² (20 % de l’aire) mais ne change pas la somme des bandes, puisqu’il est superposé.',
  falsification: 'Si la somme des parties ne retombe pas sur l’aire totale annoncée, le modèle est contredit. Si activer le canton augmente cette somme, la règle de superposition n’a pas été respectée. Si le 2:1 n’affiche pas 1,33× la référence, le calcul d’aire relative est faux.',
  debrief: 'Le drapeau est une construction géométrique : hauteur fixe, proportion variable, partition dont les aires s’additionnent exactement. Angle mort : les drapeaux réels vont de 1:1 à 2:1 et au-delà ; le symbolisme des couleurs est une convention, pas une loi ; un seul canevas schématique ne représente pas toutes les traditions, et la couleur n’est jamais le seul indice.',
};

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  ratioIndex: REF_INDEX,
  partitionIndex: 0,
  cantonOn: false,
  playing: false,
  phase: 0,
  rafId: 0,
  lastTs: 0,
  inView: true,
  reduced: false,
  listenersInstalled: false,
  nodes: null,
  readoutText: '',
};

/* ---------- Formules déterministes ---------- */

function clamp(v, a, b) {
  const n = Number(v);
  if (!Number.isFinite(n)) return a;
  return Math.max(a, Math.min(b, n));
}

function num(v, digits) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  const d = Number.isFinite(digits) ? digits : 2;
  const fixed = Math.abs(v).toFixed(d);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  const dec = parts[1] ? `,${parts[1]}` : '';
  return `${v < 0 ? MINUS : ''}${grouped}${dec}`;
}

function pct(v) {
  return `${num(v * 100, 2)} %`;
}

function flagWidth(index) { return FLAG_H * RATIOS[index].value; }
function flagArea(index) { return flagWidth(index) * FLAG_H; }
function bandeArea(index) { return flagArea(index) / 3; }
function croixArea(index) { return flagArea(index) * (9 / 25); }
function diagonaleArea(index) { return flagArea(index) / 2; }
function cantonArea(index) { return flagArea(index) * CANTON_W_FRAC * CANTON_H_FRAC; }
function areaRelative(index) { return RATIOS[index].value / REF_RATIO; }

const REF_AREA = flagArea(REF_INDEX);

/* E098-03 / E098-08 — les parties s’additionnent exactement à l’aire totale. */
function partitionParts(index) {
  const total = flagArea(index);
  const key = PARTITIONS[S.partitionIndex].key;
  if (key === 'vertical' || key === 'horizontal') {
    return [
      { nom: 'Bande I', formule: 'aire / 3', aire: total / 3 },
      { nom: 'Bande II', formule: 'aire / 3', aire: total / 3 },
      { nom: 'Bande III', formule: 'aire / 3', aire: total / 3 },
    ];
  }
  if (key === 'croix') {
    return [
      { nom: 'Croix', formule: 'aire × 9/25', aire: croixArea(index) },
      { nom: 'Champ', formule: 'aire × 16/25', aire: total - croixArea(index) },
    ];
  }
  return [
    { nom: 'Triangle haut', formule: 'aire / 2', aire: diagonaleArea(index) },
    { nom: 'Triangle bas', formule: 'aire / 2', aire: diagonaleArea(index) },
  ];
}

/* ---------- E098-01 / E098-02 : texte sémantique et tableaux statiques ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  wrap.id = ID.facts;
  const faits = [
    'Fait 1 — Un drapeau est une construction géométrique : une proportion (rapport largeur/hauteur), une partition (bandes, croix, diagonale, canton) et une palette. La proportion de référence 3:2 donne une largeur de 420 unités pour une hauteur de 280, soit une aire de 117 600 unités² (définition géométrique du rectangle).',
    'Fait 2 — Dans un drapeau à trois bandes verticales, chaque bande vaut un tiers de la largeur : 420 / 3 = 140 unités. Son aire est 140 × 280 = 39 200 unités², exactement un tiers de 117 600 ; les trois bandes totalisent l’aire entière (algèbre élémentaire, recalculée dans le laboratoire).',
    'Fait 3 — Le canton est un rectangle de 40 % de la largeur sur 50 % de la hauteur, soit 20 % de l’aire : 23 520 unités² au 3:2. Il se superpose à la partition et ne s’ajoute pas à la somme de ses parties. Les sens attribués aux couleurs sont des conventions fréquentes, pas des lois.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-v2-e098-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = ID.ratios;
  const caption = document.createElement('caption');
  caption.textContent = 'Proportions courantes à hauteur égale (280 unités). La proportion 3:2 sert de référence : aire 117 600 unités², aire relative 1,00×.';
  table.appendChild(caption);
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Proportion', 'Ratio largeur/hauteur', 'Aire (unités²)', 'Aire / référence', 'Remarque'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  RATIOS.forEach((ratio, i) => {
    const tr = document.createElement('tr');
    tr.id = `${ID.ratios}-row-${i}`;
    const cells = [
      ratio.nom,
      num(ratio.value, 2),
      num(flagArea(i), 0),
      `${num(areaRelative(i), 2)}×`,
      i === REF_INDEX ? 'référence du panneau' : 'proportion alternative',
    ];
    cells.forEach((c, j) => {
      const cell = document.createElement(j === 0 ? 'th' : 'td');
      if (j === 0) cell.scope = 'row';
      cell.textContent = c;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* E098-07 — symbolisme des couleurs : conventions et repère textuel. */
function colorTable() {
  const table = document.createElement('table');
  table.id = ID.colors;
  const caption = document.createElement('caption');
  caption.textContent = 'Conventions fréquentes et repère textuel. Une même teinte peut signifier des choses différentes selon le pays et l’époque : c’est le nom et la position de la bande qui l’identifient, jamais la couleur seule.';
  table.appendChild(caption);
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Couleur', 'Convention fréquente', 'Repère textuel'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  COLOR_FACTS.forEach((fact, i) => {
    const tr = document.createElement('tr');
    tr.id = `${ID.colors}-row-${i}`;
    const th = document.createElement('th');
    th.scope = 'row';
    const swatch = document.createElement('span');
    swatch.className = 'geography-v2-e098-swatch';
    swatch.style.background = fact.hex;
    swatch.setAttribute('aria-hidden', 'true');
    th.appendChild(swatch);
    th.appendChild(document.createTextNode(fact.nom));
    tr.appendChild(th);
    [fact.sens, fact.repere].forEach((v) => {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function buildDefi() {
  const list = document.createElement('ol');
  list.id = ID.defi;
  [
    ['Prédiction', DEFI.prediction],
    ['Réglage', DEFI.reglage],
    ['Résultat attendu', DEFI.attendu],
    ['Falsification', DEFI.falsification],
    ['Débrief', DEFI.debrief],
  ].forEach(([titre, texte]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = `${titre} : `;
    li.appendChild(strong);
    li.appendChild(document.createTextNode(texte));
    list.appendChild(li);
  });
  return list;
}

/* ---------- Construction du panneau ---------- */

function buildPanel(ctx) {
  const existant = document.getElementById(ID.panel);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      ratios: Array.from(existant.querySelectorAll('input[type="radio"]')),
      mesures: document.getElementById(ID.mesures),
      canvas: document.getElementById(ID.canvas),
      legend: document.getElementById(ID.legend),
      readout: document.getElementById(ID.readout),
      canton: document.getElementById(ID.canton),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
    };
  }

  const panel = ctx.el('section', 'geography-v2-e098-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);
  panel.setAttribute('data-sim', 'drapeaux-symboles-nationaux-v2');

  const title = ctx.el('h2', '', 'Drapeaux et symboles nationaux — lire la géométrie d’un drapeau (V2)');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Un drapeau n’est pas une image : c’est une proportion, une partition et une palette. Cette seconde passe '
    + 'reconstruit un drapeau schématique dans un canvas déterministe, vérifie que les aires des parties '
    + 's’additionnent exactement et mesure l’effet d’un changement de proportion par rapport au 3:2 de référence. '
    + 'Toutes les grandeurs sont aussi écrites en texte : le dessin n’est qu’une surcouche.');
  lead.id = ID.lead;

  const ratiosTitle = ctx.el('h3', '', 'Proportions courantes et référence 3:2');
  ratiosTitle.id = ID.ratiosTitle;

  /* E098-04 — choix unique de proportion : fieldset/radiogroup, pas aria-pressed. */
  const ratioGroup = document.createElement('fieldset');
  ratioGroup.id = ID.ratioGroup;
  ratioGroup.className = 'geography-v2-e098-fieldset';
  ratioGroup.setAttribute('role', 'radiogroup');
  ratioGroup.setAttribute('aria-label', 'Proportion du drapeau : choix unique');
  ratioGroup.appendChild(ctx.el('legend', '', 'Proportion du drapeau (choix unique)'));
  const ratioRadios = [];
  RATIOS.forEach((ratio, i) => {
    const lab = ctx.el('label', 'geography-v2-e098-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e098-ratio';
    radio.id = `${ID.ratioGroup}-${ratio.key}`;
    radio.value = String(i);
    radio.checked = i === S.ratioIndex;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(`${ratio.nom} — ratio ${num(ratio.value, 2)}`));
    ratioGroup.appendChild(lab);
    ratioRadios.push(radio);
  });

  /* E098-05 — choix unique de partition : second radiogroupe indépendant. */
  const partGroup = document.createElement('fieldset');
  partGroup.id = ID.partGroup;
  partGroup.className = 'geography-v2-e098-fieldset';
  partGroup.setAttribute('role', 'radiogroup');
  partGroup.setAttribute('aria-label', 'Partition du drapeau : choix unique');
  partGroup.appendChild(ctx.el('legend', '', 'Partition du drapeau (choix unique)'));
  const partRadios = [];
  PARTITIONS.forEach((partition, i) => {
    const lab = ctx.el('label', 'geography-v2-e098-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e098-partition';
    radio.id = `${ID.partGroup}-${partition.key}`;
    radio.value = String(i);
    radio.checked = i === S.partitionIndex;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(partition.nom));
    partGroup.appendChild(lab);
    partRadios.push(radio);
  });

  /* E098-05 — laboratoire canvas unique et déterministe. */
  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire du drapeau : un cadre en tirets étiqueté RÉF entoure le drapeau, des bandes numérotées I, II, III '
    + 'ou une croix ou une diagonale montrent la partition, un cadre pointillé étiqueté CANTON montre le canton '
    + 'optionnel et une ligne en tirets avec triangle montre le repère de lecture. '
    + 'Flèche gauche ou droite : proportion ; flèche haut ou bas : partition ; touche C : canton ; '
    + 'Espace : lancer ou arrêter le balayage ; Origine : réinitialiser. '
    + 'Les formes, les étiquettes et les chiffres romains distinguent tout, indépendamment de la couleur.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);
  const canvasDesc = ctx.el('p', 'geography-v2-e098-desc',
    'Lecture clavier : les flèches gauche et droite changent de proportion, les flèches haut et bas de partition, '
    + 'la touche C bascule le canton, Espace lance ou arrête le balayage et Origine restaure les valeurs initiales. '
    + 'Chaque grandeur est aussi écrite dans les tableaux, la légende et le bandeau de lecture.');
  canvasDesc.id = ID.canvasDesc;
  const legend = ctx.el('p', 'geography-v2-e098-legend', LEGENDE);
  legend.id = ID.legend;

  /* E098-03 / E098-08 — contrôle d’aire recalculé à chaque réglage. */
  const mesuresTitle = ctx.el('h3', '', 'Contrôle d’aire — les parties doivent totaliser l’aire du drapeau');
  mesuresTitle.id = ID.mesuresTitle;
  const mesures = document.createElement('table');
  mesures.id = ID.mesures;
  const mCaption = document.createElement('caption');
  mCaption.textContent = 'Aires recalculées depuis la proportion et la partition courantes. La ligne « Total » doit égaler l’aire du drapeau.';
  mesures.appendChild(mCaption);
  const mThead = document.createElement('thead');
  const mHr = document.createElement('tr');
  ['Partie', 'Formule', 'Aire (unités²)', 'Part de l’aire'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    mHr.appendChild(th);
  });
  mThead.appendChild(mHr);
  mesures.appendChild(mThead);
  mesures.appendChild(document.createElement('tbody'));

  /* E098-07 — bandeau de lecture annoncé aux technologies d’assistance. */
  const readout = ctx.el('p', 'geography-v2-e098-readout');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');

  /* E098-06 — bascule indépendante du canton : aria-pressed légitime. */
  const canton = ctx.el('button', 'geography-v2-e098-btn',
    S.cantonOn ? 'Canton : présent' : 'Canton : absent');
  canton.type = 'button';
  canton.id = ID.canton;
  canton.setAttribute('aria-pressed', S.cantonOn ? 'true' : 'false');
  canton.setAttribute('aria-controls', ID.canvas);

  const play = ctx.el('button', 'geography-v2-e098-btn', '▶ Lancer le balayage');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  play.setAttribute('aria-controls', ID.canvas);

  const reset = ctx.el('button', 'geography-v2-e098-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const colorsTitle = ctx.el('h3', '', 'Symbolisme des couleurs — des conventions, pas des lois');
  colorsTitle.id = ID.colorsTitle;

  const defiTitle = ctx.el('h3', '', 'À vous de jouer — limite falsifiable en cinq temps');
  defiTitle.id = ID.defiTitle;

  const note = ctx.el('p', 'geography-v2-e098-note',
    'Le drapeau dessiné est un exemple schématique à but pédagogique, non une reproduction officielle. '
    + 'Aucune grandeur n’est mémorisée dans l’affichage : tout est recalculé depuis la hauteur fixe et les proportions. '
    + 'Le balayage est déterministe et reproductible.');
  note.id = ID.note;

  panel.append(title, lead, staticFacts(), ratiosTitle, staticTable(), ratioGroup, partGroup,
    canvas, canvasDesc, legend, mesuresTitle, mesures, colorsTitle, colorTable(), readout,
    canton, play, reset, defiTitle, buildDefi(), note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    ratioRadios, partRadios,
    mesures, canvas, legend, readout, canton, play, reset,
  };
}

/* ---------- E098-05 : canvas déterministe, un seul dessin par image ---------- */

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 340;
  const cssH = cv.clientHeight || 250;
  const rawDpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const dpr = Math.min(2, Math.max(1, rawDpr));
  const bw = Math.max(1, Math.round(cssW * dpr));
  const bh = Math.max(1, Math.round(cssH * dpr));
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const w = flagWidth(S.ratioIndex);
  const x0 = (VIRTUAL_W - w) / 2;
  const y0 = (VIRTUAL_H - FLAG_H) / 2;
  const marginX = 12;
  const availW = Math.max(10, cssW - marginX * 2);
  const availH = Math.max(10, cssH - 32);
  const scale = Math.min(availW / VIRTUAL_W, availH / VIRTUAL_H);
  const ox = (cssW - VIRTUAL_W * scale) / 2;
  const oy = (cssH - VIRTUAL_H * scale) / 2 - 4;
  const px = (vx) => ox + vx * scale;
  const py = (vy) => oy + vy * scale;
  const R = (x, y, rw, rh) => ({ x: px(x), y: py(y), w: rw * scale, h: rh * scale });
  const fillRect = (r, color) => {
    g.fillStyle = color;
    g.fillRect(r.x, r.y, r.w, r.h);
  };
  const label = (text, rx, ry, ink, align) => {
    g.fillStyle = ink;
    g.font = 'bold 11px sans-serif';
    g.textAlign = align || 'center';
    g.fillText(text, rx, ry);
    g.textAlign = 'left';
  };

  /* Cadre de référence : trait fin en tirets, distinct par la forme. */
  g.setLineDash([4, 3]);
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(214,207,193,.80)';
  const ref = R(x0 - 4, y0 - 4, w + 8, FLAG_H + 8);
  g.strokeRect(ref.x, ref.y, ref.w, ref.h);
  g.setLineDash([]);
  label('RÉF', ref.x + 2, Math.max(11, ref.y - 4), 'rgba(214,207,193,.95)', 'left');

  /* Partition : couleurs doublées par des séparateurs, des formats et des noms. */
  const key = PARTITIONS[S.partitionIndex].key;
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(8,12,18,.55)';
  if (key === 'vertical') {
    const t = w / 3;
    const specs = [
      { c: COLORS.bleu, y: y0 + FLAG_H / 2 },
      { c: COLORS.blanc, y: y0 + FLAG_H / 2 },
      { c: COLORS.rouge, y: y0 + FLAG_H / 2 },
    ];
    specs.forEach((sp, i) => {
      const r = R(x0 + i * t, y0, t, FLAG_H);
      fillRect(r, sp.c.hex);
      g.strokeRect(r.x, r.y, r.w, r.h);
      label(ROMAN[i], r.x + r.w / 2, py(sp.y) + 4, sp.c.ink);
    });
  } else if (key === 'horizontal') {
    const t = FLAG_H / 3;
    const specs = [COLORS.rouge, COLORS.blanc, COLORS.bleu];
    specs.forEach((c, i) => {
      const r = R(x0, y0 + i * t, w, t);
      fillRect(r, c.hex);
      g.strokeRect(r.x, r.y, r.w, r.h);
      label(ROMAN[i], px(x0 + w / 2), r.y + r.h / 2 + 4, c.ink);
    });
  } else if (key === 'croix') {
    fillRect(R(x0, y0, w, FLAG_H), COLORS.bleu.hex);
    const vb = R(x0 + w * 0.4, y0, w * 0.2, FLAG_H);
    const hb = R(x0, y0 + FLAG_H * 0.4, w, FLAG_H * 0.2);
    fillRect(vb, COLORS.blanc.hex);
    fillRect(hb, COLORS.blanc.hex);
    g.setLineDash([3, 2]);
    g.strokeStyle = 'rgba(20,20,20,.85)';
    g.strokeRect(vb.x, vb.y, vb.w, vb.h);
    g.strokeRect(hb.x, hb.y, hb.w, hb.h);
    g.setLineDash([]);
    label('CROIX', px(x0 + w / 2), py(y0 + FLAG_H / 2) + 4, COLORS.blanc.ink);
    label('CHAMP', px(x0 + w * 0.14), py(y0 + FLAG_H * 0.14), COLORS.bleu.ink);
  } else {
    const up = R(x0, y0, w, FLAG_H);
    g.beginPath();
    g.moveTo(up.x, up.y);
    g.lineTo(up.x + up.w, up.y);
    g.lineTo(up.x, up.y + up.h);
    g.closePath();
    g.fillStyle = COLORS.or.hex;
    g.fill();
    g.beginPath();
    g.moveTo(up.x + up.w, up.y);
    g.lineTo(up.x + up.w, up.y + up.h);
    g.lineTo(up.x, up.y + up.h);
    g.closePath();
    g.fillStyle = COLORS.vert.hex;
    g.fill();
    g.setLineDash([4, 3]);
    g.strokeStyle = 'rgba(20,20,20,.85)';
    g.beginPath();
    g.moveTo(up.x, up.y);
    g.lineTo(up.x + up.w, up.y + up.h);
    g.stroke();
    g.setLineDash([]);
    label('HAUT', px(x0 + w * 0.28), py(y0 + FLAG_H * 0.28), COLORS.or.ink);
    label('BAS', px(x0 + w * 0.72), py(y0 + FLAG_H * 0.72), COLORS.vert.ink);
  }

  /* E098-05 — canton superposé, cadre en pointillés et symbole en croix. */
  if (S.cantonOn) {
    const cw = w * CANTON_W_FRAC;
    const ch = FLAG_H * CANTON_H_FRAC;
    const cr = R(x0, y0, cw, ch);
    fillRect(cr, COLORS.or.hex);
    g.setLineDash([3, 2]);
    g.lineWidth = 1.5;
    g.strokeStyle = 'rgba(20,20,20,.9)';
    g.strokeRect(cr.x, cr.y, cr.w, cr.h);
    g.setLineDash([]);
    const tv = Math.max(2, cw * 0.04);
    fillRect(R(x0 + cw / 2 - tv / 2, y0 + ch * 0.2, tv, ch * 0.6), COLORS.rouge.hex);
    fillRect(R(x0 + cw * 0.2, y0 + ch / 2 - tv / 2, cw * 0.6, tv), COLORS.rouge.hex);
    label('CANTON', cr.x + 3, cr.y + cr.h - 4, COLORS.or.ink, 'left');
  }

  /* E098-09 — repère de lecture : position déterministe, jamais aléatoire. */
  const sx = x0 + S.phase * w;
  g.setLineDash([5, 3]);
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(255,255,255,.92)';
  g.beginPath();
  g.moveTo(px(sx), py(y0));
  g.lineTo(px(sx), py(y0 + FLAG_H));
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = '#f4d69e';
  g.beginPath();
  g.moveTo(px(sx) - 5, py(y0) - 7);
  g.lineTo(px(sx) + 5, py(y0) - 7);
  g.lineTo(px(sx), py(y0) + 1);
  g.closePath();
  g.fill();

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(`${RATIOS[S.ratioIndex].nom} — ${PARTITIONS[S.partitionIndex].nom} — canton ${S.cantonOn ? 'présent' : 'absent'} — lecture ${num(S.phase * 100, 0)} %`,
    marginX, cssH - 4);
}

/* ---------- E098-08 : bandeau de lecture référencé ---------- */

function updateReadout() {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const ratio = RATIOS[S.ratioIndex];
  const partition = PARTITIONS[S.partitionIndex];
  const w = flagWidth(S.ratioIndex);
  const area = flagArea(S.ratioIndex);
  const parts = partitionParts(S.ratioIndex);
  const somme = parts.reduce((acc, p) => acc + p.aire, 0);
  const text =
    `Proportion ${ratio.nom} : largeur ${num(w, 0)} unités, hauteur ${num(FLAG_H, 0)} unités, ratio ${num(ratio.value, 2)}. `
    + `Aire ${num(area, 0)} unités², contre ${num(REF_AREA, 0)} unités² pour le 3:2 de référence, soit ${num(areaRelative(S.ratioIndex), 2)}×. `
    + `Partition ${partition.nom} en ${parts.length} parties : ${parts.map((p) => `${p.nom} ${num(p.aire, 0)}`).join(' + ')} = ${num(somme, 0)} unités² (aire totale). `
    + `Canton ${S.cantonOn ? `présent : ${num(cantonArea(S.ratioIndex), 0)} unités², soit 20 % de l’aire, superposé et non additionné` : 'absent'}. `
    + `Repère de lecture à ${num(S.phase * 100, 0)} % de la largeur.`;
  if (text !== S.readoutText) {
    n.textContent = text;
    S.readoutText = text;
  }
}

/* ---------- E098-03 / E098-08 : tableau de contrôle d’aire ---------- */

function fillMesuresTable() {
  const table = S.nodes && S.nodes.mesures;
  if (!table || !table.tBodies || !table.tBodies[0]) return;
  const tbody = table.tBodies[0];
  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
  const total = flagArea(S.ratioIndex);
  const parts = partitionParts(S.ratioIndex);
  parts.forEach((p) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = p.nom;
    tr.appendChild(th);
    [p.formule, num(p.aire, 0), pct(p.aire / total)].forEach((v) => {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  if (S.cantonOn) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = 'Canton (superposé)';
    tr.appendChild(th);
    [num(CANTON_W_FRAC * 100, 0) + ' % × ' + num(CANTON_H_FRAC * 100, 0) + ' %',
      num(cantonArea(S.ratioIndex), 0), 'non additionné'].forEach((v) => {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
  const tr = document.createElement('tr');
  const th = document.createElement('th');
  th.scope = 'row';
  th.textContent = 'Total — aire du drapeau';
  tr.appendChild(th);
  [num(flagWidth(S.ratioIndex), 0) + ' × ' + num(FLAG_H, 0),
    num(total, 0), pct(1)].forEach((v) => {
    const td = document.createElement('td');
    td.textContent = v;
    tr.appendChild(td);
  });
  tbody.appendChild(tr);
}

/* ---------- Synchronisation d’état ---------- */

function applyState() {
  const n = S.nodes;
  if (!n) return;
  if (n.ratioRadios) {
    n.ratioRadios.forEach((radio, i) => {
      if (radio) radio.checked = i === S.ratioIndex;
    });
  }
  if (n.partRadios) {
    n.partRadios.forEach((radio, i) => {
      if (radio) radio.checked = i === S.partitionIndex;
    });
  }
  if (n.canton) {
    n.canton.textContent = S.cantonOn ? 'Canton : présent' : 'Canton : absent';
    n.canton.setAttribute('aria-pressed', S.cantonOn ? 'true' : 'false');
  }
  if (n.play) {
    n.play.textContent = S.reduced
      ? 'Balayage indisponible (mouvement réduit)'
      : (S.playing ? '■ Arrêter le balayage' : '▶ Lancer le balayage');
    n.play.setAttribute('aria-pressed', S.playing && !S.reduced ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E098Reduced = S.reduced ? '1' : '0';
  if (n.legend) {
    n.legend.textContent = `${LEGENDE} Motif actif : ${PARTITIONS[S.partitionIndex].nom}.`;
  }
  fillMesuresTable();
  updateReadout();
  drawLab();
  updateBadge();
}

function updateBadge() {
  const badge = document.getElementById(ID.badge);
  if (!badge) return;
  badge.textContent = `Drapeaux V2 — ${RATIOS[S.ratioIndex].nom} : ${num(flagArea(S.ratioIndex), 0)} unités², `
    + `${num(areaRelative(S.ratioIndex), 2)}× le 3:2 de référence.`;
}

/* ---------- E098-09 : boucle rAF unique, pauses multiples ---------- */

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
    /* Progression déterministe : horodatage seul, aucune graine aléatoire. */
    S.phase = (S.phase + dt * SWEEP_SPEED) % 1;
  }
  S.lastTs = ts;
  drawLab();
  updateReadout();
  if (S.playing && !S.reduced) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  if (S.listenersInstalled) return;
  S.listenersInstalled = true;
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop(); else startLoop();
    });
  }
  if (S.nodes && S.nodes.panel && typeof IntersectionObserver === 'function') {
    try {
      const io = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        S.inView = entry ? !!entry.isIntersecting : true;
        if (S.inView) startLoop(); else stopLoop();
      }, { threshold: 0.05 });
      io.observe(S.nodes.panel);
    } catch { /* observation indisponible : document.hidden reste le garde-fou */ }
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = (event) => {
        S.reduced = !!(event && event.matches);
        if (S.reduced) { S.playing = false; stopLoop(); }
        applyState();
        if (!S.reduced) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source vivante */ }
  }
}

/* ---------- E098-04 / E098-05 / E098-06 / E098-10 : pilotes et clavier ---------- */

function setRatio(index) {
  const next = clamp(index, 0, RATIOS.length - 1);
  if (next === S.ratioIndex) return;
  S.ratioIndex = next;
  applyState();
}

function setPartition(index) {
  const next = clamp(index, 0, PARTITIONS.length - 1);
  if (next === S.partitionIndex) return;
  S.partitionIndex = next;
  applyState();
}

function toggleCanton() {
  S.cantonOn = !S.cantonOn;
  applyState();
}

function togglePlay() {
  if (S.reduced) { stopLoop(); applyState(); return; }
  S.playing = !S.playing;
  if (!S.playing) stopLoop(); else startLoop();
  applyState();
}

function resetState() {
  S.ratioIndex = REF_INDEX;
  S.partitionIndex = 0;
  S.cantonOn = false;
  S.playing = false;
  S.phase = 0;
  stopLoop();
  applyState();
}

function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;
  if (n.ratioRadios) {
    n.ratioRadios.forEach((radio, i) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (radio.checked) setRatio(i);
      });
    });
  }
  if (n.partRadios) {
    n.partRadios.forEach((radio, i) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (radio.checked) setPartition(i);
      });
    });
  }
  if (n.canton) n.canton.addEventListener('click', () => toggleCanton());
  if (n.play) n.play.addEventListener('click', () => togglePlay());
  if (n.reset) n.reset.addEventListener('click', () => resetState());
  if (n.canvas) {
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft') setRatio(S.ratioIndex - 1);
      else if (event.key === 'ArrowRight') setRatio(S.ratioIndex + 1);
      else if (event.key === 'ArrowUp') setPartition(S.partitionIndex - 1);
      else if (event.key === 'ArrowDown') setPartition(S.partitionIndex + 1);
      else if (event.key === 'c' || event.key === 'C') toggleCanton();
      else if (event.key === ' ' || event.key === 'Spacebar') togglePlay();
      else if (event.key === 'Home') resetState();
      else used = false;
      if (used) event.preventDefault();
    });
  }
}

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e098-badge', '');
  badge.id = ID.badge;
  map.appendChild(badge);
}

/* ---------- Feuille de style unique, isolée et préfixée ---------- */

const CSS = `
#${ID.panel}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${ID.panel} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${ID.panel} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${ID.panel} p{margin:5px 0;max-width:68ch}
#${ID.panel} .geography-v2-e098-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${ID.panel} table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${ID.panel} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${ID.panel} th,#${ID.panel} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${ID.panel} th{color:var(--gold-bright,#f4d69e);font-weight:600}
.geography-v2-e098-swatch{
  display:inline-block;width:9px;height:9px;margin-right:5px;
  border:1px solid var(--line);vertical-align:-1px;
}
.geography-v2-e098-fieldset{margin:8px 0;padding:8px;border:1px solid var(--line);border-radius:8px}
.geography-v2-e098-fieldset legend{padding:0 4px;color:var(--muted)}
.geography-v2-e098-choix{display:inline-flex;align-items:center;min-height:36px;margin:3px 6px 3px 0;padding:5px 8px;cursor:pointer}
.geography-v2-e098-choix input[type="radio"]{min-width:24px;min-height:24px;margin:0 8px 0 0;accent-color:var(--gold,#e6b96f);vertical-align:middle}
#${ID.canvas}{
  display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
.geography-v2-e098-legend,.geography-v2-e098-desc{font-size:10px;color:var(--muted)}
.geography-v2-e098-note{font-size:10px;color:var(--muted);font-style:italic}
#${ID.readout}{
  min-height:38px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${ID.panel} .geography-v2-e098-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:8px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${ID.panel} .geography-v2-e098-btn:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${ID.panel} :focus-visible{outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-v2-e098-badge{
  position:absolute;right:16px;bottom:14px;z-index:3;max-width:58%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${ID.panel}[data-geography-v2-e098-reduced="1"] .geography-v2-e098-btn,
#${ID.panel}[data-geography-v2-e098-reduced="1"] .geography-v2-e098-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${ID.panel} .geography-v2-e098-btn,.geography-v2-e098-badge{transition:none!important;animation:none!important}
}
@media (forced-colors:active){
  #${ID.panel}{border:1px solid CanvasText}
  #${ID.canvas}{border:1px solid CanvasText}
}
@media (max-width:620px){
  #${ID.panel}{font-size:10px;padding:9px}
  #${ID.canvas}{height:208px}
  .geography-v2-e098-choix{display:flex;width:100%;min-height:36px}
}
`;

/* ---------- Point d’entrée unique ---------- */

register('E098', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }
  if (S.reduced) { S.playing = false; stopLoop(); }

  S.nodes = buildPanel(ctx);
  addMapBadge(ctx);
  wirePanel();
  applyState();
  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
