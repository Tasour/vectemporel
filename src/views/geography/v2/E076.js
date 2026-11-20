import { register } from './registry.js';

/*
 * Lentille E076 — SECONDE PASSE (V2) : mode plein écran de la carte.
 *
 * Thème : ce qui change réellement quand la carte GEOGRAPHIE passe d'un cadre
 * intégré à un cadre plein écran. La projection (viewBox 900 × 620,
 * preserveAspectRatio « xMidYMid meet ») ne change pas : seul le cadre CSS
 * change, donc l'échelle en pixels, la taille ajustée, les barres mortes et le
 * taux d'occupation sont recalculés depuis le viewBox réel de la vue.
 *
 * Les dix chantiers (E076-01 … E076-10) sont réellement implémentés ci-dessous.
 * La V2 ajoute à la passe 1 : un badge de statut sur la carte, un tableau de
 * mesures recalculées à chaque réglage, une fiche de vérité à trois faits
 * sourcés, un défi falsifiable en cinq temps aligné sur la relation
 * « surface ∝ échelle² », un bouton de remise à zéro et une boucle rAF unique
 * suspendue à la fois sur document.hidden, hors champ (IntersectionObserver)
 * et en mouvement réduit. Tout le contenu pédagogique est du texte sémantique
 * indexable (h2/h3/p/ol/li/table/caption/th/td/fieldset/legend/label) présent
 * dans le DOM : il reste lisible sans animation ni interaction. Le canvas
 * n'est qu'un laboratoire déterministe qui illustre les formules, jamais leur
 * seul support.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e076-` (aucune collision avec la passe 1 `geography-e076-`).
 * Zéro sortie de débogage, zéro appel réseau, zéro tirage aléatoire,
 * une seule boucle rAF.
 * Français intégral. ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e076';

const ID = {
  panel: 'geography-v2-e076-panel',
  title: 'geography-v2-e076-title',
  lead: 'geography-v2-e076-lead',
  facts: 'geography-v2-e076-facts',
  geomTable: 'geography-v2-e076-geometrie',
  mode: 'geography-v2-e076-mode',
  largeur: 'geography-v2-e076-largeur',
  largeurValue: 'geography-v2-e076-largeur-value',
  largeurLabel: 'geography-v2-e076-largeur-label',
  hauteur: 'geography-v2-e076-hauteur',
  hauteurValue: 'geography-v2-e076-hauteur-value',
  hauteurLabel: 'geography-v2-e076-hauteur-label',
  canvas: 'geography-v2-e076-canvas',
  canvasDesc: 'geography-v2-e076-canvas-desc',
  legend: 'geography-v2-e076-legend',
  mesuresTitle: 'geography-v2-e076-mesures-title',
  mesures: 'geography-v2-e076-mesures',
  defiTitle: 'geography-v2-e076-defi-title',
  defi: 'geography-v2-e076-defi',
  readout: 'geography-v2-e076-readout',
  badgeText: 'geography-v2-e076-badge-text',
  play: 'geography-v2-e076-play',
  reset: 'geography-v2-e076-reset',
  note: 'geography-v2-e076-note',
  badge: 'geography-v2-e076-badge',
  exit: 'geography-v2-e076-exit',
};

const MODE_ORDER = ['integre', 'plein', 'outils'];
const MODE_CLASS = 'geography-v2-e076-sim-plein';

/* E076-05 / E076-08 : trois modes, code non chromatique distinct. */
const MODES = {
  integre: {
    label: 'Cadre intégré',
    detail: 'La carte partage la page avec le panneau. Le contour en pointillés du laboratoire montre le cadre de départ (hypothèse 62 % × 58 %, jamais une mesure de la page hôte).',
  },
  plein: {
    label: 'Plein écran',
    detail: 'Le cadre occupe tout le viewport. Les hachures latérales sont les barres mortes imposées par le viewBox 900 × 620 et l’ajustement « meet ».',
  },
  outils: {
    label: 'Plein écran + outils',
    detail: 'Une bande de 44 px est réservée aux commandes ; la surface de dessin perd exactement cette hauteur, soit un pourcentage recalculé à chaque hauteur de cadre.',
  },
};

const LEGENDES = {
  integre: 'Contour en pointillés : cadre intégré de départ (hypothèse 62 % × 58 %). Trait continu : zone de carte utile. Hachures : barres mortes.',
  plein: 'Hachures : barres mortes imposées par le viewBox et « xMidYMid meet ». Trait continu : zone de carte utile. Tirets : contour du cadre intégré conservé comme repère.',
  outils: 'Bandeau supérieur : barre d’outils de 44 px de hauteur de vue, dessinée avec des cases. Tirets : cadre intégré ; hachures : barres mortes ; trait continu : zone utile.',
};

/* E076-10 : défi falsifiable en cinq temps, aligné sur surface ∝ échelle². */
const DEFI = {
  prediction: 'En passant d’un cadre de 1 280 × 720 à 2 560 × 1 440 px (les deux dimensions doublent), la surface utile de la carte est-elle multipliée par 2 ou par 4 ?',
  reglage: 'Placez les deux curseurs sur 1 280 × 720, relevez l’échelle et la surface, puis placez-les sur 2 560 × 1 440.',
  attendu: 'L’échelle double (1,16 → 2,32 px/u) et l’aire est multipliée par 4,00 (752 516 → 3 010 065 px²) : c’est le même côté, la hauteur, qui limite l’ajustement dans les deux cadres.',
  falsification: 'Si vous lisez 2, vous avez multiplié l’échelle au lieu de l’élever au carré. Si vous lisez 4 en passant du cadre intégré hypothétique au plein écran à 1 280 × 720, vous avez oublié que le rapport y vaut 2,97 et non 4.',
  debrief: 'L’échelle vaut min(largeur/900 ; hauteur/620). Doubler les deux dimensions double cette échelle ; la surface étant proportionnelle à l’échelle au carré, elle est multipliée par 2² = 4. Le plein écran change le cadre, pas la projection : il ajoute des barres mortes quand le rapport d’aspect du cadre diffère de 900/620.',
};

/* Constantes miroir, documentées comme telles (risque de dérive) :
 * MAP_W / MAP_H = geography.js:10-11 ; viewBox et preserveAspectRatio =
 * geography.js:200-202 ; commandes de zoom et glisser = geography.js:323-358. */
const MAP_W = 900;
const MAP_H = 620;
const VIEW_AREA = MAP_W * MAP_H;
const OUTILS_H = 44;
const CIBLE_MIN = 24;   // WCAG 2.2 — 2.5.8
const CIBLE_RECO = 44;  // WCAG 2.2 — 2.5.5
const SIM_W = 0.62;
const SIM_H = 0.58;
const LARGEUR_MIN = 320;
const LARGEUR_MAX = 2560;
const HAUTEUR_MIN = 240;
const HAUTEUR_MAX = 1440;
const REF_W = 1280;
const REF_H = 720;
const REF_SCALE = Math.min(REF_W / MAP_W, REF_H / MAP_H);

/* Contour schématique déterministe du laboratoire (non issu du jeu de données). */
const CONTOUR = [
  [0.18, 0.30], [0.34, 0.17], [0.58, 0.14], [0.78, 0.28],
  [0.84, 0.50], [0.70, 0.76], [0.46, 0.86], [0.24, 0.72],
];
const REPERES = [
  { x: 0.34, y: 0.42, nom: 'A' },
  { x: 0.60, y: 0.35, nom: 'B' },
  { x: 0.50, y: 0.68, nom: 'C' },
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  mode: 'integre',
  largeur: REF_W,
  hauteur: REF_H,
  t: 0,
  cible: 0,
  phase: 0,
  playing: false,
  rafId: 0,
  lastTs: 0,
  reduced: false,
  inView: true,
  listenersInstalled: false,
  fsActif: false,
  mapRef: null,
  nodes: null,
  cells: {},
  defiSpans: null,
};

/* ---------- utilitaires déterministes (aucun aléa) ---------- */

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const lerp = (a, b, t) => a + (b - a) * t;
const fmt = (n, d = 0) => {
  if (!Number.isFinite(n)) return '—';
  const p = 10 ** d;
  const v = Math.abs(n) < 0.5 / p ? 0 : n;
  const fixed = (Math.round(v * p) / p).toFixed(d);
  const parts = fixed.split('.');
  const groupe = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  return parts[1] ? `${groupe},${parts[1]}` : groupe;
};
const pct = (n, d = 1) => `${fmt(n * 100, d)} %`;

/* E076-02 / E076-06 : grandeurs dérivées du viewBox et du cadre courant. */
function fitView(vw, vh) {
  const scale = Math.min(vw / MAP_W, vh / MAP_H);
  const w = MAP_W * scale;
  const h = MAP_H * scale;
  return {
    scale, w, h,
    barX: Math.max(0, (vw - w) / 2),
    barY: Math.max(0, (vh - h) / 2),
    utile: w * h,
    occupation: (w * h) / (vw * vh),
  };
}

function cadreIntegre(vw, vh) {
  return { x: vw * (1 - SIM_W) / 2, y: vh * (1 - SIM_H) / 2, w: vw * SIM_W, h: vh * SIM_H };
}

function cadreCourant(vw, vh) {
  const integre = cadreIntegre(vw, vh);
  const t = S.t;
  const cadre = {
    x: lerp(integre.x, 0, t),
    y: lerp(integre.y, 0, t),
    w: lerp(integre.w, vw, t),
    h: lerp(integre.h, vh, t),
  };
  if (S.mode === 'outils' && t > 0) {
    const barre = OUTILS_H * t;
    cadre.y += barre;
    cadre.h = Math.max(1, cadre.h - barre);
  }
  return cadre;
}

function libelleMode(mode) {
  return MODES[mode] ? MODES[mode].label : 'cadre intégré';
}

function badgeText() {
  return 'Aperçu du mode plein écran : ' + libelleMode(S.mode).toLowerCase()
    + ' — cadre ' + fmt(S.largeur) + ' × ' + fmt(S.hauteur)
    + ' px, échelle ' + fmt(fitView(S.largeur, S.hauteur).scale, 2)
    + ' px/u, aucune ressource distante.';
}

/* ---------- E076-01 / E076-02 : contenu sémantique statique ---------- */

function staticFacts(ctx) {
  const wrap = ctx.el('div', '');
  wrap.id = ID.facts;
  const faits = [
    'Le plein écran ne change pas la projection : la vue GEOGRAPHIE dessine toujours dans un viewBox de 900 × 620 unités (geography.js:10-11, posé à geography.js:200) avec preserveAspectRatio « xMidYMid meet » (geography.js:202). Seul le cadre CSS change ; l’échelle en pixels suit donc le minimum des deux rapports largeur/900 et hauteur/620. La surface de la carte est proportionnelle à cette échelle au carré.',
    `Sur un écran de référence ${fmt(REF_W)} × ${fmt(REF_H)} px, l’échelle vaut ${fmt(REF_SCALE, 2)} px par unité : la carte occupe ${fmt(MAP_W * REF_SCALE)} × ${fmt(REF_H)} px et il reste ${fmt((REF_W - MAP_W * REF_SCALE) / 2)} px de barre de chaque côté, soit ${pct((REF_W - MAP_W * REF_SCALE) / REF_W)} de la largeur. La surface utile atteint ${fmt(VIEW_AREA * REF_SCALE * REF_SCALE)} px².`,
    `La vue de base propose déjà des commandes de zoom de ${fmt(CIBLE_RECO)} px et un glisser sur le SVG (geography.js:323-358). Le plein écran doit les conserver : cibles d’au moins ${fmt(CIBLE_MIN)} px (WCAG 2.2 — 2.5.8), idéalement ${fmt(CIBLE_RECO)} px (2.5.5), et sortie au clavier par Échap, sans confier l’information à la seule couleur.`,
  ];
  faits.forEach((texte) => wrap.appendChild(ctx.el('p', 'geography-v2-e076-fait', texte)));
  return wrap;
}

/* Tableau de géométrie : quatre cadres, valeurs calculées depuis le viewBox. */
function staticComparison(ctx) {
  const table = ctx.el('table', 'geography-v2-e076-table');
  table.id = ID.geomTable;
  table.appendChild(ctx.el('caption', '',
    'Géométrie du cadre — valeurs calculées depuis le viewBox 900 × 620 et « xMidYMid meet ». Le cadre intégré est une hypothèse de laboratoire (62 % × 58 %), pas une mesure de la page hôte.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Cadre', 'Dimensions (px)', 'Échelle (px/u)', 'Barres', 'Occupation'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const modes = [
    ['Intégré (hypothèse)', REF_W * SIM_W, REF_H * SIM_H],
    ['Plein écran 16:9', 1280, 720],
    ['Plein écran 16:10', 1280, 800],
    ['Plein écran 1:1', 800, 800],
  ];
  modes.forEach(([nom, vw, vh]) => {
    const f = fitView(vw, vh);
    const barres = f.barX > 0
      ? `${fmt(f.barX)} de chaque côté`
      : (f.barY > 0 ? `${fmt(f.barY)} haut et bas` : 'aucune');
    const cells = [nom, `${fmt(vw)} × ${fmt(vh)}`, fmt(f.scale, 2), barres, pct(f.occupation)];
    const tr = document.createElement('tr');
    cells.forEach((valeur, i) => {
      const cellule = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cellule.setAttribute('scope', 'row');
      cellule.textContent = valeur;
      tr.appendChild(cellule);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* E076-06 : second tableau, recalculé à chaque réglage. */
const MODEL_ROWS = [
  ['echelle', 'Échelle', 'min(largeur/900 ; hauteur/620)'],
  ['carte', 'Carte ajustée', '900·s × 620·s'],
  ['barres', 'Barres mortes', 'max(0 ; (L − 900·s)/2)'],
  ['utile', 'Surface utile', '558 000 · s²'],
  ['occupation', 'Occupation', 'surface / (L·H)'],
  ['rapport', 'Plein / intégré', 'surface plein / surface intégrée'],
  ['ref', 'Référence 1 280 × 720', '1,16 px/u · 752 516 px²'],
];

function buildMesuresTable(ctx) {
  const table = ctx.el('table', 'geography-v2-e076-table');
  table.id = ID.mesures;
  table.appendChild(ctx.el('caption', '',
    'Mesures recalculées depuis les formules et le cadre courant ; les repères sont rappelés dans le tableau de géométrie.'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Formule déterministe', 'Résultat courant'].forEach((h) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  MODEL_ROWS.forEach(([key, label, formule]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = label;
    const form = document.createElement('td');
    form.textContent = formule;
    const value = document.createElement('td');
    value.textContent = '—';
    S.cells[key] = value;
    tr.append(th, form, value);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function fillMesuresTable() {
  const c = S.cells;
  const plein = fitView(S.largeur, S.hauteur);
  const integre = fitView(S.largeur * SIM_W, S.hauteur * SIM_H);
  const rapport = plein.utile / integre.utile;
  if (c.echelle) c.echelle.textContent = `${fmt(plein.scale, 2)} px/u`;
  if (c.carte) c.carte.textContent = `${fmt(plein.w)} × ${fmt(plein.h)} px`;
  if (c.barres) c.barres.textContent = plein.barX > 0
    ? `${fmt(plein.barX)} px de chaque côté`
    : (plein.barY > 0 ? `${fmt(plein.barY)} px haut et bas` : 'nulles');
  if (c.utile) c.utile.textContent = `${fmt(plein.utile)} px²`;
  if (c.occupation) c.occupation.textContent = pct(plein.occupation);
  if (c.rapport) c.rapport.textContent = `${fmt(rapport, 2)} (hypothèse ${pct(SIM_W, 0)} × ${pct(SIM_H, 0)})`;
  if (c.ref) c.ref.textContent = `${fmt(REF_SCALE, 2)} px/u · ${fmt(VIEW_AREA * REF_SCALE * REF_SCALE)} px² · rapport 4,00 à 2 560 × 1 440`;
}

/* E076-10 : défi falsifiable en cinq temps (texte réel). */
const DEFI_ETAPES = [
  ['prediction', 'Prédiction'],
  ['reglage', 'Réglage'],
  ['attendu', 'Résultat attendu'],
  ['falsification', 'Falsification'],
  ['debrief', 'Débrief'],
];

function buildDefi(ctx) {
  const list = ctx.el('ol', 'geography-v2-e076-defi');
  list.id = ID.defi;
  const spans = {};
  DEFI_ETAPES.forEach(([key, label]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = label + ' : ';
    const span = document.createElement('span');
    span.textContent = DEFI[key];
    spans[key] = span;
    li.append(strong, span);
    list.appendChild(li);
  });
  S.defiSpans = spans;
  return list;
}

/* ---------- E076-03 / E076-04 / E076-05 / E076-08 : panneau et contrôles ---------- */

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function sliderRow(ctx, key, titre, min, max, labelId, valueId) {
  const row = ctx.el('div', 'geography-v2-e076-slider-row');
  const label = document.createElement('label');
  label.id = labelId;
  label.setAttribute('for', key);
  label.appendChild(document.createTextNode(titre + ' : '));
  const out = ctx.el('span', 'geography-v2-e076-valeur', '');
  out.id = valueId;
  label.appendChild(out);
  const input = document.createElement('input');
  input.type = 'range';
  input.id = key;
  input.min = String(min);
  input.max = String(max);
  input.step = '8';
  input.value = String(key === ID.largeur ? S.largeur : S.hauteur);
  input.setAttribute('aria-label', `${titre}, de ${fmt(min)} à ${fmt(max)} pixels`);
  row.append(label, input);
  return { row, label, out, input };
}

function buildPanel(ctx) {
  let panel = document.getElementById(ID.panel);
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    return {
      panel,
      radios: MODE_ORDER.map((m) => document.getElementById(ID.mode + '-' + m)),
      largeur: document.getElementById(ID.largeur),
      largeurOut: document.getElementById(ID.largeurValue),
      hauteur: document.getElementById(ID.hauteur),
      hauteurOut: document.getElementById(ID.hauteurValue),
      canvas: document.getElementById(ID.canvas),
      legend: document.getElementById(ID.legend),
      readout: document.getElementById(ID.readout),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
      badgeText: document.getElementById(ID.badgeText),
      fresh: false,
    };
  }

  panel = ctx.el('section', 'geography-v2-e076-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const title = ctx.el('h2', '', 'Plein écran de la carte : ce qui change vraiment — laboratoire V2');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Agrandir la carte ne modifie ni la projection ni les données. Ce laboratoire sépare le cadre intégré du cadre plein écran, recalcule l’échelle et les barres mortes, et montre comment conserver une sortie et des commandes accessibles. '
    + 'Toutes les grandeurs sont écrites en toutes lettres dans le bandeau de lecture et dans les tableaux : le dessin ne fait qu’illustrer le calcul.');
  lead.id = ID.lead;

  /* E076-05 : choix unique → fieldset/radiogroup, jamais aria-pressed. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = ID.mode;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.appendChild(ctx.el('legend', '', 'Mode d’affichage (choix unique)'));
  MODE_ORDER.forEach((value) => {
    const lab = ctx.el('label', 'geography-v2-e076-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e076-mode';
    radio.id = ID.mode + '-' + value;
    radio.value = value;
    radio.checked = S.mode === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(MODES[value].label));
    fieldset.appendChild(lab);
  });

  const sub = ctx.el('h3', '', 'Régler le cadre simulé');

  /* E076-04 : deux curseurs de viewport, avec valeurs annoncées. */
  const largeur = sliderRow(ctx, ID.largeur, 'Largeur du cadre', LARGEUR_MIN, LARGEUR_MAX,
    ID.largeurLabel, ID.largeurValue);
  const hauteur = sliderRow(ctx, ID.hauteur, 'Hauteur du cadre', HAUTEUR_MIN, HAUTEUR_MAX,
    ID.hauteurLabel, ID.hauteurValue);

  /* E076-03 / E076-08 : canvas focalisable, étiqueté, équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire du mode plein écran : un cadre de page contient une carte schématique. '
    + 'Flèche droite ou gauche : largeur du cadre ; flèche haut ou bas : hauteur ; '
    + 'Entrée : faire défiler les trois modes ; Origine : revenir à 1 280 × 720 px et au cadre intégré ; '
    + 'Échap : quitter le plein écran ; Espace : lancer ou arrêter la transition animée. '
    + 'Les hachures et les tirets distinguent les barres mortes et le cadre intégré, indépendamment de la couleur.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : les flèches gauche et droite règlent la largeur par pas de 64 px, '
    + 'les flèches haut et bas la hauteur par pas de 48 px, Entrée fait défiler les modes, Origine restaure '
    + '1 280 × 720 px et le cadre intégré, Échap quitte le plein écran, Espace lance ou arrête l’animation. '
    + 'Chaque valeur est aussi écrite dans le tableau de mesures et dans le bandeau.');
  canvasDesc.id = ID.canvasDesc;

  const legend = ctx.el('p', 'geography-v2-e076-legend', LEGENDES[S.mode]);
  legend.id = ID.legend;

  const mesuresTitle = ctx.el('h3', '', 'Mesures vérifiables du modèle');
  mesuresTitle.id = ID.mesuresTitle;

  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');
  defiTitle.id = ID.defiTitle;

  /* E076-07 : bandeau de lecture, annoncé aux technologies d’assistance. */
  const readout = ctx.el('p', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.textContent = 'Le modèle de cadre est prêt.';

  const badgeText = ctx.el('p', 'geography-v2-e076-badge-text', badgeText());
  badgeText.id = ID.badgeText;

  /* E076-05 / E076-10 : boutons ≥ 36 px (ici 44 px) ; aria-pressed aux bascules. */
  const play = ctx.el('button', 'geography-v2-e076-btn', '▶ Animer la transition');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');
  const reset = ctx.el('button', 'geography-v2-e076-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const note = ctx.el('p', '',
    'Ce laboratoire est un schéma déterministe : le contour dessiné n’est pas une donnée géographique, '
    + 'aucun fond de carte n’est chargé, aucune requête réseau et aucun tirage aléatoire n’interviennent. '
    + 'Les grandeurs ci-dessus sont des textes réels, lisibles et indexables même sans animation ; '
    + 'la carte d’origine reste utilisable sans ce panneau.');
  note.id = ID.note;

  panel.append(title, lead, staticFacts(ctx), staticComparison(ctx), fieldset, sub,
    largeur.row, largeur.input, hauteur.row, hauteur.input, canvas, canvasDesc, legend,
    mesuresTitle, buildMesuresTable(ctx), defiTitle, buildDefi(ctx),
    readout, badgeText, play, reset, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel,
    radios: MODE_ORDER.map((m) => document.getElementById(ID.mode + '-' + m)),
    largeur: largeur.input, largeurOut: largeur.out,
    hauteur: hauteur.input, hauteurOut: hauteur.out,
    canvas, legend, readout, badgeText, play, reset,
    fresh: true,
  };
}

/* ---------- E076-07 : badge de statut sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  S.mapRef = map || null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e076-badge', badgeText());
  badge.id = ID.badge;
  map.appendChild(badge);
}

function updateMapBadge() {
  const badge = document.getElementById(ID.badge);
  if (badge) badge.textContent = badgeText();
}

/* ---------- E076-03 / E076-06 / E076-07 : rendu du laboratoire ---------- */

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 360;
  const cssH = cv.clientHeight || 270;
  /* DPR plafonné à 2, tampon redimensionné seulement quand c'est nécessaire. */
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 10;
  const innerW = Math.max(10, cssW - pad * 2 - 56);
  const innerH = Math.max(10, cssH - pad * 2 - 18);
  const k = Math.min(innerW / S.largeur, innerH / S.hauteur);
  const vw = S.largeur * k;
  const vh = S.hauteur * k;
  const vx = pad + 56 + (innerW - vw) / 2;
  const vy = pad + (innerH - vh) / 2;

  /* Espace hors cadre : hachures, jamais une couleur seule. */
  g.save();
  g.strokeStyle = 'rgba(154,147,134,.22)';
  g.lineWidth = 1;
  for (let x = -cssH; x < cssW; x += 9) {
    g.beginPath(); g.moveTo(x, cssH); g.lineTo(x + cssH, 0); g.stroke();
  }
  g.restore();

  /* Cadre intégré en pointillés : repère de départ, visible même en plein écran. */
  const integre = cadreIntegre(S.largeur, S.hauteur);
  g.save();
  g.strokeStyle = 'rgba(154,147,134,.75)';
  g.lineWidth = 1;
  if (g.setLineDash) g.setLineDash([4, 3]);
  g.strokeRect(vx + integre.x * k, vy + integre.y * k, integre.w * k, integre.h * k);
  g.restore();

  /* Cadre courant (interpolé) : la zone effectivement occupée par la carte. */
  const c = cadreCourant(S.largeur, S.hauteur);
  const cx = vx + c.x * k;
  const cy = vy + c.y * k;
  const cw = Math.max(1, c.w * k);
  const ch = Math.max(1, c.h * k);
  g.fillStyle = 'rgba(8,12,18,.96)';
  g.fillRect(cx, cy, cw, ch);
  g.strokeStyle = 'rgba(244,214,158,.9)';
  g.lineWidth = 1.4;
  g.strokeRect(cx, cy, cw, ch);

  /* Ajuster le viewBox 900 × 620 dans le cadre : barres mortes hachées. */
  const mapScale = Math.min(c.w / MAP_W, c.h / MAP_H);
  const dw = MAP_W * mapScale * k;
  const dh = MAP_H * mapScale * k;
  const dx = cx + (cw - dw) / 2;
  const dy = cy + (ch - dh) / 2;
  const hachure = (x, y, w, h) => {
    if (w < 1 || h < 1) return;
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.strokeStyle = 'rgba(230,185,111,.55)';
    g.lineWidth = 1;
    for (let s = -h; s < w + h; s += 7) {
      g.beginPath(); g.moveTo(x + s, y + h); g.lineTo(x + s + h, y); g.stroke();
    }
    g.restore();
  };
  hachure(cx, cy, cw, Math.max(0, dy - cy));
  hachure(cx, dy + dh, cw, Math.max(0, cy + ch - dy - dh));
  hachure(cx, dy, Math.max(0, dx - cx), dh);
  hachure(dx + dw, dy, Math.max(0, cx + cw - dx - dw), dh);

  /* Carte schématique du laboratoire, explicitement non géographique. */
  g.save();
  g.beginPath(); g.rect(dx, dy, dw, dh); g.clip();
  g.fillStyle = 'rgba(214,207,193,.045)';
  g.fillRect(dx, dy, dw, dh);
  g.beginPath();
  CONTOUR.forEach(([px, py], i) => {
    const X = dx + px * dw;
    const Y = dy + py * dh;
    if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
  });
  g.closePath();
  g.fillStyle = 'rgba(230,185,111,.10)';
  g.fill();
  g.strokeStyle = 'rgba(244,214,158,.85)';
  g.lineWidth = 1.2;
  g.stroke();
  REPERES.forEach((rep) => {
    const X = dx + rep.x * dw;
    const Y = dy + rep.y * dh;
    g.beginPath(); g.arc(X, Y, 4, 0, Math.PI * 2);
    g.fillStyle = '#0b0f15'; g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = '#fff';
    g.font = 'bold 10px sans-serif';
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(rep.nom, X + 7, Y);
  });
  g.restore();

  /* Barre d'outils du mode « outils » : hauteur réelle de 44 px de vue. */
  if (S.mode === 'outils' && S.t > 0.05) {
    const bh2 = OUTILS_H * k * S.t;
    const by = vy + c.y * k;
    g.fillStyle = 'rgba(8,12,18,.98)';
    g.fillRect(cx, by, cw, bh2);
    g.strokeStyle = 'rgba(244,214,158,.9)';
    g.lineWidth = 1;
    g.strokeRect(cx, by, cw, bh2);
    for (let i = 0; i < 3; i += 1) {
      const bx = cx + 8 + i * 16;
      g.strokeStyle = 'rgba(215,209,198,.85)';
      g.strokeRect(bx, by + bh2 / 2 - 4, 9, 8);
    }
    if (cw > 150) {
      g.fillStyle = 'rgba(215,209,198,.9)';
      g.font = '9px sans-serif';
      g.textAlign = 'right'; g.textBaseline = 'middle';
      g.fillText(`Outils ${fmt(OUTILS_H)} px`, cx + cw - 7, by + bh2 / 2);
    }
  }

  /* Étiquettes de mesure : les nombres sont écrits, pas seulement dessinés. */
  g.fillStyle = 'rgba(215,209,198,.92)';
  g.font = '10px sans-serif';
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText(`${fmt(S.largeur)} × ${fmt(S.hauteur)} px`, vx, Math.max(11, vy - 4));
  if (cw > 120 && ch > 28) {
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.fillText(`${libelleMode(S.mode)} — ${fmt(c.w)} × ${fmt(c.h)} px`, cx + 5, cy + ch - 6);
  }
}

/* ---------- E076-06 / E076-07 : lectures et région de statut ---------- */

function mesureReelle() {
  const map = S.mapRef;
  if (!map || typeof map.getBoundingClientRect !== 'function') return '';
  const r = map.getBoundingClientRect();
  if (!(r.width > 0 && r.height > 0)) return '';
  return ` Cadre réel mesuré dans la page : ${fmt(r.width)} × ${fmt(r.height)} px (hypothèse 62 % × 58 % non appliquée au rendu).`;
}

function updateBadgeText() {
  const n = S.nodes && S.nodes.badgeText;
  if (!n) return;
  if (S.mode === 'integre') {
    n.textContent = 'Mode intégré : la carte partage la page avec le panneau ; le contour en pointillés du laboratoire montre le cadre de départ (hypothèse 62 % × 58 % de la largeur et de la hauteur).';
  } else if (S.mode === 'plein') {
    n.textContent = 'Mode plein écran : le cadre occupe tout le viewport ; les hachures latérales sont les barres mortes imposées par le viewBox 900 × 620 et l’ajustement « meet ».';
  } else {
    n.textContent = 'Mode plein écran avec outils : une bande de 44 px est réservée aux commandes ; la surface de dessin perd exactement cette hauteur, soit une réduction de '
      + pct(OUTILS_H / S.hauteur) + ' à la hauteur courante.';
  }
}

function updateReadout() {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const plein = fitView(S.largeur, S.hauteur);
  const integre = fitView(S.largeur * SIM_W, S.hauteur * SIM_H);
  const rapport = plein.utile / integre.utile;
  const add = (t) => n.appendChild(document.createTextNode(t));
  const put = (t) => {
    const s = document.createElement('strong');
    s.textContent = t;
    n.appendChild(s);
  };
  n.textContent = '';
  add('Cadre '); put(`${fmt(S.largeur)} × ${fmt(S.hauteur)} px`);
  add(' · échelle '); put(`${fmt(plein.scale, 2)} px/u`);
  add(' · carte '); put(`${fmt(plein.w)} × ${fmt(plein.h)} px`);
  add(' · barres ');
  put(plein.barX > 0 ? `${fmt(plein.barX)} px de chaque côté`
    : (plein.barY > 0 ? `${fmt(plein.barY)} px haut et bas` : 'nulles'));
  add(' · surface utile '); put(`${fmt(plein.utile)} px²`);
  add(' · occupation '); put(pct(plein.occupation));
  add(' · plein/intégré = '); put(fmt(rapport, 2));
  add(` · référence 1 280 × 720 : ${fmt(REF_SCALE, 2)} px/u et ${fmt(VIEW_AREA * REF_SCALE * REF_SCALE)} px² ; surface multipliée par 4 à 2 560 × 1 440.`);
  add(mesureReelle());
}

/* ---------- Application de l'état ---------- */

function applyState() {
  const n = S.nodes;
  if (!n || !n.largeur || !n.hauteur) return;

  n.radios.forEach((r) => { if (r) r.checked = r.value === S.mode; });

  n.largeur.value = String(Math.round(S.largeur));
  n.hauteur.value = String(Math.round(S.hauteur));
  if (n.largeurOut) n.largeurOut.textContent = `${fmt(S.largeur)} px`;
  if (n.hauteurOut) n.hauteurOut.textContent = `${fmt(S.hauteur)} px`;
  if (n.legend) n.legend.textContent = LEGENDES[S.mode];
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la transition' : '▶ Animer la transition';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E076Reduced = S.reduced ? '1' : '0';
  if (S.defiSpans) {
    DEFI_ETAPES.forEach(([key]) => {
      const span = S.defiSpans[key];
      if (span) span.textContent = DEFI[key];
    });
  }
  updateMapBadge();
  updateBadgeText();
  fillMesuresTable();
  updateReadout();
  drawLab();
}

/* ---------- E076-09 : boucle rAF unique, pauses multiples ---------- */

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
  /* Progression déterministe : aucune valeur aléatoire, horodatage seul. */
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.phase = (S.phase + dt * 0.00024) % 1;
    S.t = 0.5 - 0.5 * Math.cos(2 * Math.PI * S.phase);
  } else {
    S.t += (S.cible - S.t) * (1 - Math.exp(-16 / 160));
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !S.reduced) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E076-05 : plein écran réel, avec repli CSS sans réseau ---------- */

function retirerSortie() {
  const sortie = document.getElementById(ID.exit);
  if (sortie && sortie.parentNode) sortie.parentNode.removeChild(sortie);
}

function nettoyerCarte() {
  const map = S.mapRef;
  if (map) {
    map.classList.remove(MODE_CLASS);
    retirerSortie();
  }
  if (typeof document !== 'undefined' && document.fullscreenElement
      && document.fullscreenElement === map
      && typeof document.exitFullscreen === 'function') {
    try {
      const p = document.exitFullscreen();
      if (p && typeof p.catch === 'function') p.catch(() => { /* repli silence */ });
    } catch { /* sortie indisponible : le simple retrait de classe suffit */ }
  }
  S.fsActif = false;
}

function poserSortie(map) {
  const sortie = document.getElementById(ID.exit);
  if (sortie && sortie.parentNode === map) return;
  retirerSortie();
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.id = ID.exit;
  bouton.className = 'geography-v2-e076-btn';
  bouton.textContent = '↩ Quitter le plein écran (Échap)';
  bouton.addEventListener('click', () => quitterPleinEcran());
  map.appendChild(bouton);
}

function activerPleinEcran(map) {
  setMode('plein');
  if (!map) return;
  if (typeof map.requestFullscreen === 'function') {
    try {
      const p = map.requestFullscreen();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          /* Refus du navigateur : repli CSS local, aucune ressource externe. */
          map.classList.add(MODE_CLASS);
          poserSortie(map);
          S.fsActif = true;
          applyState();
        });
      }
      return;
    } catch { /* repli ci-dessous */ }
  }
  map.classList.add(MODE_CLASS);
  poserSortie(map);
  S.fsActif = true;
  applyState();
}

function quitterPleinEcran() {
  const map = S.mapRef;
  if (map) {
    map.classList.remove(MODE_CLASS);
    retirerSortie();
  }
  if (typeof document !== 'undefined' && document.fullscreenElement
      && typeof document.exitFullscreen === 'function') {
    try {
      const p = document.exitFullscreen();
      if (p && typeof p.catch === 'function') p.catch(() => { /* repli silence */ });
    } catch { /* rien à quitter */ }
  }
  S.fsActif = false;
  setMode('integre');
}

/* ---------- E076-08 / E076-09 / E076-10 : pilotes et robustesse ---------- */

function setMode(value) {
  if (MODE_ORDER.indexOf(value) === -1) return;
  S.mode = value;
  S.cible = value === 'integre' ? 0 : 1;
  if (S.reduced) { S.t = S.cible; stopLoop(); }
  applyState();
  if (!S.reduced) startLoop();
}

function setLargeur(value) {
  S.largeur = clamp(Number(value), LARGEUR_MIN, LARGEUR_MAX);
  applyState();
}

function setHauteur(value) {
  S.hauteur = clamp(Number(value), HAUTEUR_MIN, HAUTEUR_MAX);
  applyState();
}

function togglePlay() {
  S.playing = !S.playing;
  if (!S.playing || S.reduced) stopLoop(); else startLoop();
  applyState();
}

function resetState() {
  S.mode = 'integre';
  S.largeur = REF_W;
  S.hauteur = REF_H;
  S.t = 0;
  S.cible = 0;
  S.phase = 0;
  S.playing = false;
  stopLoop();
  nettoyerCarte();
  applyState();
}

function installGlobalListeners() {
  if (S.listenersInstalled) return;
  S.listenersInstalled = true;

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop(); else startLoop();
    });
    document.addEventListener('fullscreenchange', () => {
      const plein = !!(typeof document.fullscreenElement !== 'undefined'
        && document.fullscreenElement === S.mapRef);
      S.fsActif = plein;
      if (plein) setMode('plein');
      else if (S.mode !== 'integre' && !document.getElementById(ID.exit)) setMode(S.mode);
    });
  }

  /* Pause hors champ : au plus un canvas dessiné, et seulement à l'écran. */
  if (S.nodes && S.nodes.panel && typeof IntersectionObserver === 'function') {
    try {
      const io = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        S.inView = entry ? !!entry.isIntersecting : true;
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
        if (S.reduced) { S.playing = false; S.t = S.cible; stopLoop(); }
        applyState();
        if (!S.reduced) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }
}

function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  n.radios.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      setMode(radio.value);
    });
  });

  n.largeur.addEventListener('input', () => setLargeur(n.largeur.value));
  n.hauteur.addEventListener('input', () => setHauteur(n.hauteur.value));
  n.play.addEventListener('click', togglePlay);
  n.reset.addEventListener('click', resetState);

  /* E076-08 : équivalent clavier complet du laboratoire. */
  n.canvas.addEventListener('keydown', (event) => {
    let used = true;
    if (event.key === 'ArrowRight') setLargeur(S.largeur + 64);
    else if (event.key === 'ArrowLeft') setLargeur(S.largeur - 64);
    else if (event.key === 'ArrowDown') setHauteur(S.hauteur + 48);
    else if (event.key === 'ArrowUp') setHauteur(S.hauteur - 48);
    else if (event.key === 'Home') resetState();
    else if (event.key === 'Enter') {
      const i = MODE_ORDER.indexOf(S.mode);
      setMode(MODE_ORDER[(i + 1) % MODE_ORDER.length]);
    } else if (event.key === 'Escape') {
      if (S.fsActif) quitterPleinEcran(); else setMode('integre');
    } else if (event.key === ' ' || event.key === 'Spacebar') togglePlay();
    else used = false;
    if (used) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

/* ---------- E076-01 : feuille de style unique, injectée une seule fois ---------- */

const CSS = `
.geography-v2-e076-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(8,11,16,.96);color:var(--ink-soft,#d7d1c6);
  font-size:11px;line-height:1.6;
}
.geography-v2-e076-panel h2{
  margin:0 0 6px;color:var(--gold-bright,#f4d69e);font-size:15px;font-weight:700;
}
.geography-v2-e076-panel h3{
  margin:12px 0 4px;color:var(--gold,#e6b96f);font-size:11px;font-weight:700;
}
.geography-v2-e076-panel p{margin:5px 0;max-width:74ch}
.geography-v2-e076-panel .geography-v2-e076-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e076-panel .geography-v2-e076-table{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;
  font-variant-numeric:tabular-nums;
}
.geography-v2-e076-panel .geography-v2-e076-table caption{
  margin-bottom:4px;color:var(--muted,#a8a198);text-align:left;
}
.geography-v2-e076-panel .geography-v2-e076-table th,
.geography-v2-e076-panel .geography-v2-e076-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geography-v2-e076-panel .geography-v2-e076-table thead th{color:var(--gold-bright,#f4d69e)}
.geography-v2-e076-panel .geography-v2-e076-table td{
  color:var(--gold-bright,#f4d69e);font-weight:600;
}
#geography-v2-e076-mode{
  margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px;
}
#geography-v2-e076-mode legend{padding:0 4px;color:var(--gold,#e6b96f)}
.geography-v2-e076-panel .geography-v2-e076-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;
  margin:0 8px 0 0;padding:2px 6px;cursor:pointer;
}
.geography-v2-e076-panel .geography-v2-e076-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
.geography-v2-e076-slider-row{margin:7px 0}
.geography-v2-e076-slider-row label{display:block;color:var(--ink-soft,#d7d1c6)}
.geography-v2-e076-valeur{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
.geography-v2-e076-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
#geography-v2-e076-canvas{
  display:block;width:100%;height:270px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.3);touch-action:manipulation;
}
.geography-v2-e076-panel .geography-v2-e076-legend{font-size:10px;color:var(--muted,#a8a198)}
.geography-v2-e076-panel .geography-v2-e076-defi{
  margin:6px 0;padding-left:18px;font-size:10px;
}
.geography-v2-e076-panel .geography-v2-e076-defi li{margin:3px 0}
.geography-v2-e076-panel .geography-v2-e076-defi strong{color:var(--gold,#e6b96f)}
#geography-v2-e076-readout{
  min-height:36px;margin:6px 0;padding:7px 8px;border:1px solid var(--line);
  border-radius:8px;background:rgba(230,185,111,.06);
  color:var(--ink-soft,#d7d1c6);font-size:10px;font-variant-numeric:tabular-nums;
}
#geography-v2-e076-readout strong{color:var(--gold-bright,#f4d69e)}
.geography-v2-e076-panel .geography-v2-e076-badge-text{
  min-height:30px;margin:6px 0;padding:7px 8px;border:1px solid var(--line);
  border-left:4px solid var(--gold,#e6b96f);border-radius:8px;
  background:rgba(230,185,111,.06);font-size:10px;
}
.geography-v2-e076-panel .geography-v2-e076-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;
  padding:6px 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation;
  transition:border-color .18s,background-color .18s;
}
.geography-v2-e076-panel .geography-v2-e076-btn:hover{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.geography-v2-e076-panel .geography-v2-e076-btn[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.14);
}
.geography-v2-e076-panel :focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
/* E076-05 : sortie de secours quand l'API Fullscreen n'est pas disponible. */
.geo-map.geography-v2-e076-sim-plein{
  position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;
  max-width:none!important;max-height:none!important;z-index:2147483000!important;
  border-radius:0!important;background:#070a0e!important;overflow:hidden!important;
}
.geo-map.geography-v2-e076-sim-plein .geo-svg,
.geo-map:fullscreen .geo-svg{width:100%;height:100%;display:block}
#geography-v2-e076-exit{
  position:absolute;right:12px;top:12px;z-index:6;min-width:44px;min-height:44px;
  padding:6px 12px;border:1px solid var(--gold,#e6b96f);border-radius:8px;
  background:rgba(8,12,18,.92);color:var(--gold-bright,#f4d69e);
  font:inherit;font-size:12px;cursor:pointer;
}
.geography-v2-e076-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
.geography-v2-e076-panel[data-geography-v2-e076-reduced="1"] .geography-v2-e076-btn{
  transition:none;
}
@media (prefers-reduced-motion:reduce){
  .geography-v2-e076-panel .geography-v2-e076-btn{
    transition:none!important;animation:none!important;
  }
}
@media (max-width:620px){
  .geography-v2-e076-panel{font-size:10px;padding:9px}
  #geography-v2-e076-canvas{height:224px}
  .geography-v2-e076-panel .geography-v2-e076-choix{margin-right:4px}
}
@media (forced-colors:active){
  .geography-v2-e076-panel{border:1px solid CanvasText}
}
`;

/* ---------- Point d'entrée unique ---------- */

register('E076', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }
  if (S.reduced) { S.playing = false; stopLoop(); }

  nettoyerCarte();
  S.nodes = buildPanel(ctx);
  addMapBadge(ctx);
  S.cible = S.mode === 'integre' ? 0 : 1;
  if (S.reduced) S.t = S.cible;
  wirePanel();
  applyState();
  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
