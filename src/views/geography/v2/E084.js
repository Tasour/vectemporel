import { register } from './registry.js';

/*
 * Lentille E084 — SECONDE PASSE (V2) — vue GEOGRAPHIE.
 *
 * Thème : le cadre englobant (bounding box) des lieux, étudié cette fois comme
 * un choix de cadrage parmi trois stratégies et non comme une simple paire de
 * bornes. La passe 1 (src/views/geography/E084.js) montrait le cadre minimal
 * et le cadre à marge ; la V2 ajoute une troisième stratégie — le cadre carré
 * —, un taux de remplissage comparé à une référence explicite, un tableau de
 * mesures recalculé à chaque réglage, un défi falsifiable en cinq temps et une
 * boucle d'animation unique suspendue à la fois sur document.hidden, hors champ
 * et en mouvement réduit.
 *
 * Les dix chantiers E084-01 … E084-10 sont réellement implémentés ci-dessous.
 * Tout le contenu pédagogique est du texte sémantique indexable (h2, h3, p,
 * ol, li, table, caption, th, td, fieldset, legend, label) présent dans le DOM :
 * il reste lisible sans animation, sans interaction et sans canvas. Le canvas
 * n'est qu'un laboratoire déterministe qui illustre des formules, jamais leur
 * seul support.
 *
 * Un seul register, une seule feuille CSS, tous les identifiants préfixés
 * `geography-v2-e084-` (aucune collision avec la passe 1 `geography-e084-`).
 * Zéro appel à la console, zéro accès réseau, zéro valeur aléatoire, une seule
 * boucle rAF. Français intégral.
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e084';

const ID = {
  panel: 'geography-v2-e084-panel',
  title: 'geography-v2-e084-title',
  lead: 'geography-v2-e084-lead',
  facts: 'geography-v2-e084-facts',
  table: 'geography-v2-e084-table',
  mesuresTitle: 'geography-v2-e084-mesures-title',
  mesures: 'geography-v2-e084-mesures',
  bornesTitle: 'geography-v2-e084-bornes-title',
  bornes: 'geography-v2-e084-bornes',
  strategie: 'geography-v2-e084-strategie',
  pad: 'geography-v2-e084-pad',
  padValue: 'geography-v2-e084-pad-value',
  testLat: 'geography-v2-e084-testlat',
  testLatValue: 'geography-v2-e084-testlat-value',
  testLon: 'geography-v2-e084-testlon',
  testLonValue: 'geography-v2-e084-testlon-value',
  canvas: 'geography-v2-e084-canvas',
  canvasDesc: 'geography-v2-e084-canvas-desc',
  legend: 'geography-v2-e084-legend',
  defiTitle: 'geography-v2-e084-defi-title',
  defi: 'geography-v2-e084-defi',
  readout: 'geography-v2-e084-readout',
  play: 'geography-v2-e084-play',
  reset: 'geography-v2-e084-reset',
  note: 'geography-v2-e084-note',
  badge: 'geography-v2-e084-badge',
};

/* Jeu de démonstration : six lieux fictifs à but pédagogique, explicitement
   présentés comme tels. Aucune coordonnée n'est attribuée à un lieu réel.
   Valeurs choisies pour des calculs exacts : bornes 46°–51° et 0°–6°. */
const LIEUX = [
  { id: 'A', lat: 46, lon: 0 },
  { id: 'B', lat: 46, lon: 6 },
  { id: 'C', lat: 51, lon: 6 },
  { id: 'D', lat: 51, lon: 0 },
  { id: 'E', lat: 48.5, lon: 3 },
  { id: 'F', lat: 49.2, lon: 1.5 },
];

/* Carré témoin de 1° × 1° centré sur chaque lieu : convention de mesure, pas
   une donnée géographique. Six carrés donnent 6,00 degrés² de surface témoin. */
const DEMI_COTE = 0.5;
const COTE_TEMOIN = DEMI_COTE * 2;
const SURFACE_TEMOIN = LIEUX.length * COTE_TEMOIN * COTE_TEMOIN;

const STRATEGIES = ['minimal', 'marge', 'carre'];
const STRAT_LABEL = {
  minimal: 'Cadre minimal',
  marge: 'Cadre à marge',
  carre: 'Cadre carré',
};
const STRAT_DETAIL = {
  minimal: 'Référence : le plus petit rectangle qui contient les six lieux ; ses quatre bornes sont les min et max des coordonnées.',
  marge: 'Chaque borne est élargie de p degrés : largeur 6 + 2p, hauteur 5 + 2p, surface (6 + 2p)(5 + 2p).',
  carre: 'Le côté le plus court est porté au plus long : côté 6 + 2p sur les deux axes, surface (6 + 2p)².',
};
const LEGENDE = 'Trait plein fin étiqueté RÉF = cadre minimal de référence. Tirets ou pointillés étiquetés ACTIF = cadre choisi (tirets pour la marge, pointillés pour le carré). Cercles lettres = lieux. Croix T = point testé, en trait plein dedans et en pointillés dehors. La forme distingue tout, indépendamment de la couleur.';

const PAD_MIN = 0;
const PAD_MAX = 6;
const PAD_DEF = 2;
const LAT_MIN = 40;
const LAT_MAX = 58;
const LON_MIN = -2;
const LON_MAX = 8;

const DEFI = {
  prediction: 'À marge 2°, la surface du cadre à marge vaut 90,00 degrés² et celle du cadre carré 100,00 degrés². Lequel a le taux de remplissage le plus élevé ? À partir de quelle marge le remplissage du cadre à marge passe-t-il sous 5 % ?',
  reglage: 'Choisissez « Cadre à marge » dans le groupe de choix, réglez la marge sur 2°, relevez le remplissage, puis portez-la successivement à 3° et 4° ; comparez avec « Cadre carré » à la même marge.',
  attendu: 'À 2°, remplissage marge = 6 / 90 = 6,67 % et carré = 6 / 100 = 6,00 % : le cadre à marge est le plus dense. À 3°, marge = 6 / 132 = 4,55 % ; le seuil de 5 % est donc franchi entre 2° et 3°. À 4°, marge = 6 / 182 = 3,30 %.',
  falsification: 'Si le remplissage augmente quand on élargit la marge, le modèle est contredit : la surface des carrés témoins reste 6,00 degrés², donc le quotient ne peut que diminuer. Si le cadre carré affiche 90,00 degrés² à 2°, la contrainte de carré n’a pas été appliquée.',
  debrief: 'Le cadre ne crée aucune information : il résume les lieux. L’élargir ou le forcer au carré ne fait que diluer leur densité. Le remplissage, comparé à la référence de 20,00 % du cadre minimal, rend cette dilution mesurable et réfutable sans recourir à la couleur.',
};

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  strategie: 'marge',
  padding: PAD_DEF,
  testLat: 48.5,
  testLon: 3,
  playing: false,
  phase: 0,
  rafId: 0,
  lastTs: 0,
  inView: true,
  reduced: false,
  listenersInstalled: false,
  nodes: null,
};

/* ---------- Formules déterministes ---------- */

function clamp(v, a, b) {
  const n = Number(v);
  if (!Number.isFinite(n)) return a;
  return Math.max(a, Math.min(b, n));
}

function fmt(n) {
  const r = Math.round(n * 100) / 100;
  return (Object.is(r, -0) ? 0 : r).toFixed(2).replace('.', ',');
}

function pct(n) {
  return `${fmt(n * 100)} %`;
}

function bboxMinimal(lieux) {
  let minLat = Infinity; let maxLat = -Infinity;
  let minLon = Infinity; let maxLon = -Infinity;
  lieux.forEach((p) => {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  });
  return { minLat, maxLat, minLon, maxLon };
}

function bboxPadded(base, marge) {
  return {
    minLat: base.minLat - marge,
    maxLat: base.maxLat + marge,
    minLon: base.minLon - marge,
    maxLon: base.maxLon + marge,
  };
}

/* E084-04 : le carré porte le côté court au côté long, sans autre invention. */
function bboxCarre(base, marge) {
  const largeur = (base.maxLon - base.minLon) + 2 * marge;
  const hauteur = (base.maxLat - base.minLat) + 2 * marge;
  const cote = Math.max(largeur, hauteur);
  const latCentre = (base.minLat + base.maxLat) / 2;
  const lonCentre = (base.minLon + base.maxLon) / 2;
  return {
    minLat: latCentre - cote / 2,
    maxLat: latCentre + cote / 2,
    minLon: lonCentre - cote / 2,
    maxLon: lonCentre + cote / 2,
  };
}

function bboxPour(strategie, marge) {
  const base = bboxMinimal(LIEUX);
  if (strategie === 'carre') return bboxCarre(base, marge);
  if (strategie === 'marge') return bboxPadded(base, marge);
  return base;
}

function mesures(b) {
  const largeur = b.maxLon - b.minLon;
  const hauteur = b.maxLat - b.minLat;
  return {
    largeur,
    hauteur,
    surface: largeur * hauteur,
    diagonale: Math.sqrt(largeur * largeur + hauteur * hauteur),
    centre: {
      lat: (b.minLat + b.maxLat) / 2,
      lon: (b.minLon + b.maxLon) / 2,
    },
  };
}

function estDedans(point, b) {
  return point.lat >= b.minLat && point.lat <= b.maxLat
    && point.lon >= b.minLon && point.lon <= b.maxLon;
}

const REF = mesures(bboxMinimal(LIEUX));

function surfacePour(strategie, marge) {
  return mesures(bboxPour(strategie, marge)).surface;
}

function remplissagePour(strategie, marge) {
  return SURFACE_TEMOIN / surfacePour(strategie, marge);
}

function ratioPour(strategie, marge) {
  return surfacePour(strategie, marge) / REF.surface;
}

/* ---------- E084-01 / E084-02 : texte sémantique et tableaux statiques ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  wrap.id = ID.facts;
  const faits = [
    'Fait 1 — Le cadre englobant minimal, ou boîte englobante alignée sur les axes, est le plus petit rectangle qui contient tous les points : ses quatre bornes sont le minimum et le maximum des latitudes et des longitudes. C’est une mesure dérivée des lieux, pas une donnée supplémentaire (définition géométrique de la boîte englobante).',
    'Fait 2 — Élargir chaque borne de p degrés donne une largeur 6 + 2p et une hauteur 5 + 2p : la surface (6 + 2p)(5 + 2p) croît avec p alors qu’aucun lieu nouveau n’est ajouté. À p = 2°, elle passe de 30,00 à 90,00 degrés², soit exactement 3,00× la référence (algèbre élémentaire, recalculée dans le laboratoire).',
    'Fait 3 — Le cadre carré impose le même côté aux deux axes : il porte la hauteur 5 + 2p au côté 6 + 2p et ajoute 1° de hauteur purement formelle. Son rapport au cadre à marge vaut (6 + 2p) / (5 + 2p), soit 1,11× à p = 2° (contrainte géométrique du carré, vérifiable au tableau).',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-v2-e084-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = ID.table;
  const caption = document.createElement('caption');
  caption.textContent = 'Référence : stratégies de cadrage sur six lieux fictifs. Le cadre minimal à marge 0° sert de référence (surface 30,00 degrés², remplissage 20,00 %).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Stratégie', 'Marge', 'Largeur', 'Hauteur', 'Surface (degrés²)', 'Surface / réf.', 'Remplissage'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['minimal', 0], ['marge', 0], ['marge', 2], ['carre', 0], ['carre', 2],
  ];
  lignes.forEach(([strategie, marge]) => {
    const m = mesures(bboxPour(strategie, marge));
    const cells = [
      STRAT_LABEL[strategie],
      `${marge}°`,
      `${fmt(m.largeur)}°`,
      `${fmt(m.hauteur)}°`,
      fmt(m.surface),
      `${fmt(m.surface / REF.surface)}×`,
      pct(SURFACE_TEMOIN / m.surface),
    ];
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

function mesuresTable() {
  const table = document.createElement('table');
  table.id = ID.mesures;
  const caption = document.createElement('caption');
  caption.textContent = 'Mesures recalculées à chaque réglage pour les trois stratégies à la marge courante.';
  table.appendChild(caption);
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Cadre', 'Largeur', 'Hauteur', 'Surface', 'Surface / réf.', 'Remplissage', 'Diagonale'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  STRATEGIES.forEach((strategie) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = STRAT_LABEL[strategie];
    tr.appendChild(th);
    for (let i = 0; i < 6; i += 1) {
      const td = document.createElement('td');
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function fillMesuresTable() {
  const table = document.getElementById(ID.mesures);
  if (!table) return;
  const rows = table.tBodies[0] ? table.tBodies[0].rows : [];
  STRATEGIES.forEach((strategie, i) => {
    const row = rows[i];
    if (!row) return;
    const m = mesures(bboxPour(strategie, S.padding));
    const values = [
      `${fmt(m.largeur)}°`,
      `${fmt(m.hauteur)}°`,
      `${fmt(m.surface)}`,
      `${fmt(m.surface / REF.surface)}×`,
      pct(SURFACE_TEMOIN / m.surface),
      `${fmt(m.diagonale)}°`,
    ];
    values.forEach((v, j) => {
      if (row.cells[j + 1]) row.cells[j + 1].textContent = v;
    });
  });
}

/* ---------- E084-10 : défi falsifiable en cinq temps, texte visible ---------- */

function buildDefi() {
  const list = document.createElement('ol');
  list.id = ID.defi;
  const temps = [
    ['Prédiction', DEFI.prediction],
    ['Réglage', DEFI.reglage],
    ['Résultat attendu', DEFI.attendu],
    ['Falsification', DEFI.falsification],
    ['Débrief', DEFI.debrief],
  ];
  temps.forEach(([titre, texte]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = `${titre} : `;
    li.appendChild(strong);
    li.appendChild(document.createTextNode(texte));
    list.appendChild(li);
  });
  return list;
}

/* ---------- Contrôles ---------- */

function sliderRow(ctx, id, labelText, min, max, step, valueId, value, display) {
  const wrap = document.createElement('div');
  wrap.className = 'geography-v2-e084-row';
  const lab = document.createElement('label');
  lab.setAttribute('for', id);
  lab.appendChild(document.createTextNode(`${labelText} : `));
  const out = ctx.el('span', 'geography-v2-e084-val', display);
  out.id = valueId;
  lab.appendChild(out);
  wrap.appendChild(lab);
  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.className = 'geography-v2-e084-range';
  wrap.appendChild(input);
  return { wrap, lab, out, input };
}

function bornesBlock(ctx) {
  const wrap = document.createElement('div');
  wrap.id = ID.bornes;
  wrap.className = 'geography-v2-e084-bornes';
  const base = bboxMinimal(LIEUX);
  [
    ['Latitude minimale', `${fmt(base.minLat)}°`],
    ['Latitude maximale', `${fmt(base.maxLat)}°`],
    ['Longitude minimale', `${fmt(base.minLon)}°`],
    ['Longitude maximale', `${fmt(base.maxLon)}°`],
  ].forEach(([label, valeur]) => {
    const span = document.createElement('span');
    span.appendChild(document.createTextNode(`${label} : `));
    span.appendChild(ctx.el('strong', '', valeur));
    wrap.appendChild(span);
  });
  return wrap;
}

/* ---------- Construction du panneau ---------- */

function buildPanel(ctx) {
  const existant = document.getElementById(ID.panel);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      bornes: document.getElementById(ID.bornes),
      radios: Array.from(existant.querySelectorAll('input[type="radio"]')),
      pad: document.getElementById(ID.pad),
      padValue: document.getElementById(ID.padValue),
      testLat: document.getElementById(ID.testLat),
      testLatValue: document.getElementById(ID.testLatValue),
      testLon: document.getElementById(ID.testLon),
      testLonValue: document.getElementById(ID.testLonValue),
      canvas: document.getElementById(ID.canvas),
      legend: document.getElementById(ID.legend),
      readout: document.getElementById(ID.readout),
      play: document.getElementById(ID.play),
      reset: document.getElementById(ID.reset),
    };
  }

  const panel = ctx.el('section', 'geography-v2-e084-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const title = ctx.el('h2', '', 'Le cadre englobant des lieux — trois stratégies de cadrage (V2)');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Un cadre englobant résume six lieux par quatre nombres. Cette seconde passe compare trois façons de le tracer — minimal, à marge et carré — et mesure la densité des lieux avec un taux de remplissage référencé. Agrandir le cadre n’ajoute jamais d’information : le laboratoire le rend visible, chiffré et réfutable.');
  lead.id = ID.lead;

  const bornesTitle = ctx.el('h3', '', 'Les quatre bornes du cadre minimal (référence)');
  bornesTitle.id = ID.bornesTitle;

  const mesuresTitle = ctx.el('h3', '', 'Mesures vérifiables des trois stratégies');
  mesuresTitle.id = ID.mesuresTitle;

  /* E084-03 : choix unique → fieldset/radiogroup, jamais aria-pressed. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = ID.strategie;
  fieldset.className = 'geography-v2-e084-fieldset';
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Stratégie de cadrage : choix unique');
  fieldset.appendChild(ctx.el('legend', '', 'Stratégie de cadrage (choix unique)'));
  const radios = [];
  STRATEGIES.forEach((value) => {
    const lab = ctx.el('label', 'geography-v2-e084-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-v2-e084-strategie';
    radio.id = `${ID.strategie}-${value}`;
    radio.value = value;
    radio.checked = S.strategie === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(STRAT_LABEL[value]));
    const detail = ctx.el('span', 'geography-v2-e084-detail', STRAT_DETAIL[value]);
    lab.appendChild(detail);
    fieldset.appendChild(lab);
    radios.push(radio);
  });

  const padRow = sliderRow(ctx, ID.pad, 'Marge ajoutée à chaque borne (p)', PAD_MIN, PAD_MAX,
    1, ID.padValue, S.padding, `${S.padding}°`);
  padRow.input.setAttribute('aria-label', 'Marge ajoutée à chaque borne, de 0 à 6 degrés');
  const latRow = sliderRow(ctx, ID.testLat, 'Latitude du point testé', LAT_MIN, LAT_MAX,
    0.5, ID.testLatValue, S.testLat, `${fmt(S.testLat)}°`);
  latRow.input.setAttribute('aria-label', 'Latitude du point à tester, de 40 à 58 degrés par pas de 0,5');
  const lonRow = sliderRow(ctx, ID.testLon, 'Longitude du point testé', LON_MIN, LON_MAX,
    0.5, ID.testLonValue, S.testLon, `${fmt(S.testLon)}°`);
  lonRow.input.setAttribute('aria-label', 'Longitude du point à tester, de moins 2 à 8 degrés par pas de 0,5');

  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire du cadre englobant : un rectangle fin étiqueté RÉF montre le cadre minimal, un rectangle à tirets ou pointillés étiqueté ACTIF montre la stratégie choisie, six cercles lettres montrent les lieux et une croix T le point testé. '
    + 'Flèche gauche ou droite : longitude du point ; flèche haut ou bas : latitude ; touches 1, 2, 3 : choisir la stratégie ; touches plus et moins : marge ; Espace : lancer ou arrêter le balayage ; Origine : réinitialiser. '
    + 'Les formes et les étiquettes distinguent tout, indépendamment de la couleur.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);
  const canvasDesc = ctx.el('p', 'geography-v2-e084-desc',
    'Lecture clavier : les flèches déplacent le point testé par pas de 0,5° (2° avec Maj), les touches 1, 2 et 3 sélectionnent respectivement le cadre minimal, à marge et carré, les touches + et − règlent la marge, Espace lance ou arrête le balayage et Origine restaure les valeurs initiales. Chaque grandeur est aussi écrite dans les tableaux et dans le bandeau de lecture.');
  canvasDesc.id = ID.canvasDesc;

  const legend = ctx.el('p', 'geography-v2-e084-legend', LEGENDE);
  legend.id = ID.legend;

  const defiTitle = ctx.el('h3', '', 'Limite falsifiable : vérifier soi-même');
  defiTitle.id = ID.defiTitle;

  /* E084-07 : bandeau de lecture, annoncé aux technologies d'assistance. */
  const readout = ctx.el('p', 'geography-v2-e084-readout');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* E084-06 : bascule indépendante → aria-pressed légitime. */
  const play = ctx.el('button', 'geography-v2-e084-btn',
    S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  const reset = ctx.el('button', 'geography-v2-e084-btn', '↺ Valeurs par défaut');
  reset.type = 'button';
  reset.id = ID.reset;

  const note = ctx.el('p', 'geography-v2-e084-note',
    'Les six lieux et les carrés témoins sont fictifs et choisis pour des calculs exacts. Aucune grandeur n’est mémorisée : tout est recalculé depuis les bornes. Le balayage est déterministe et reproductible.');
  note.id = ID.note;

  panel.append(title, lead, staticFacts(), staticTable(), bornesTitle, bornesBlock(ctx),
    fieldset, padRow.wrap, latRow.wrap, lonRow.wrap, canvas, canvasDesc, legend,
    mesuresTitle, mesuresTable(), defiTitle, buildDefi(), readout, play, reset, note);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true, radios,
    bornes: document.getElementById(ID.bornes),
    pad: padRow.input, padValue: padRow.out,
    testLat: latRow.input, testLatValue: latRow.out,
    testLon: lonRow.input, testLonValue: lonRow.out,
    canvas, legend, readout, play, reset,
  };
}

/* ---------- E084-05 / E084-06 : canvas déterministe, un seul dessin par image ---------- */

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
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

  const base = bboxMinimal(LIEUX);
  const active = bboxPour(S.strategie, S.padding);
  const dispMinLon = active.minLon - 1;
  const dispMaxLon = active.maxLon + 1;
  const dispMinLat = active.minLat - 1;
  const dispMaxLat = active.maxLat + 1;
  const margeEcran = 16;
  const iw = Math.max(10, cssW - margeEcran * 2);
  const ih = Math.max(10, cssH - margeEcran * 2 - 8);
  const toPx = (lon, lat) => [
    margeEcran + ((lon - dispMinLon) / (dispMaxLon - dispMinLon)) * iw,
    margeEcran + ((dispMaxLat - lat) / (dispMaxLat - dispMinLat)) * ih,
  ];
  const rect = (b) => {
    const [x0, y1] = toPx(b.minLon, b.minLat);
    const [x1, y0] = toPx(b.maxLon, b.maxLat);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };

  /* Graticule de fond : repère non chromatique. */
  g.strokeStyle = 'rgba(255,255,255,.10)';
  g.lineWidth = 1;
  g.setLineDash([]);
  const lonStep = (dispMaxLon - dispMinLon) > 14 ? 2 : 1;
  for (let lon = Math.ceil(dispMinLon); lon <= dispMaxLon; lon += lonStep) {
    const [x] = toPx(lon, 0);
    g.beginPath(); g.moveTo(x, margeEcran); g.lineTo(x, margeEcran + ih); g.stroke();
  }
  for (let lat = Math.ceil(dispMinLat); lat <= dispMaxLat; lat += 1) {
    const [, y] = toPx(0, lat);
    g.beginPath(); g.moveTo(margeEcran, y); g.lineTo(margeEcran + iw, y); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.strokeRect(margeEcran, margeEcran, iw, ih);

  /* Cadre de référence : trait plein fin. */
  const rRef = rect(base);
  g.setLineDash([]);
  g.strokeStyle = 'rgba(244,214,158,.98)';
  g.lineWidth = 1.4;
  g.strokeRect(rRef.x, rRef.y, rRef.w, rRef.h);
  g.font = '10px sans-serif';
  g.fillStyle = 'rgba(244,214,158,.98)';
  g.fillText('RÉF', rRef.x + 3, rRef.y + 11);

  /* Cadre actif : motif déterminé par la stratégie, jamais par la couleur. */
  const rAct = rect(active);
  g.strokeStyle = 'rgba(230,185,111,.92)';
  g.lineWidth = 2.2;
  if (S.strategie === 'marge') g.setLineDash([6, 4]);
  else if (S.strategie === 'carre') g.setLineDash([2, 3]);
  else g.setLineDash([8, 3, 2, 3]);
  g.strokeRect(rAct.x, rAct.y, rAct.w, rAct.h);
  g.setLineDash([]);
  g.fillStyle = 'rgba(230,185,111,.98)';
  g.fillText('ACTIF', rAct.x + Math.max(3, rAct.w - 30), rAct.y + rAct.h - 5);

  /* Lieux : cercles + étiquette. */
  g.fillStyle = 'rgba(214,207,193,.95)';
  g.font = '11px sans-serif';
  LIEUX.forEach((p) => {
    const [x, y] = toPx(p.lon, p.lat);
    g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fill();
    g.fillText(p.id, x + 5, y - 5);
  });

  /* Point testé : croix, pointillés hors du cadre actif. */
  const [tx, ty] = toPx(S.testLon, S.testLat);
  const dedansActif = estDedans({ lat: S.testLat, lon: S.testLon }, active);
  g.strokeStyle = 'rgba(255,255,255,.95)';
  g.lineWidth = dedansActif ? 2.6 : 1.3;
  if (!dedansActif) g.setLineDash([2, 2]);
  g.beginPath();
  g.moveTo(tx - 7, ty); g.lineTo(tx + 7, ty);
  g.moveTo(tx, ty - 7); g.lineTo(tx, ty + 7);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.fillText('T', tx + 9, ty + 4);

  /* Balayage : point déterministe sur le pourtour du cadre actif. */
  const perim = 2 * (rAct.w + rAct.h);
  const d = (S.phase * perim) % perim;
  let sx; let sy;
  if (d < rAct.w) { sx = rAct.x + d; sy = rAct.y; }
  else if (d < rAct.w + rAct.h) { sx = rAct.x + rAct.w; sy = rAct.y + (d - rAct.w); }
  else if (d < 2 * rAct.w + rAct.h) { sx = rAct.x + rAct.w - (d - rAct.w - rAct.h); sy = rAct.y + rAct.h; }
  else { sx = rAct.x; sy = rAct.y + rAct.h - (d - 2 * rAct.w - rAct.h); }
  g.fillStyle = 'rgba(255,255,255,.9)';
  g.beginPath(); g.arc(sx, sy, 3, 0, Math.PI * 2); g.fill();

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`${STRAT_LABEL[S.strategie]} — marge ${S.padding}° — remplissage ${pct(remplissagePour(S.strategie, S.padding))}`,
    margeEcran + 2, cssH - 4);
}

/* ---------- E084-07 : bandeau de lecture référencé ---------- */

function updateReadout() {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const actif = mesures(bboxPour(S.strategie, S.padding));
  const point = { lat: S.testLat, lon: S.testLon };
  const base = bboxMinimal(LIEUX);
  const position = estDedans(point, actif)
    ? (estDedans(point, base)
      ? 'dans le cadre affiché et dans le référentiel minimal'
      : 'dans le cadre affiché mais hors du référentiel minimal')
    : 'hors du cadre affiché';

  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Référence — cadre minimal (marge 0°) : largeur '));
  n.appendChild(fort(`${fmt(REF.largeur)}°`));
  n.appendChild(document.createTextNode(', hauteur '));
  n.appendChild(fort(`${fmt(REF.hauteur)}°`));
  n.appendChild(document.createTextNode(', surface '));
  n.appendChild(fort(`${fmt(REF.surface)} degrés²`));
  n.appendChild(document.createTextNode(`, remplissage ${pct(SURFACE_TEMOIN / REF.surface)}. `));
  n.appendChild(document.createTextNode(`${STRAT_LABEL[S.strategie]} à marge ${S.padding}° : largeur `));
  n.appendChild(fort(`${fmt(actif.largeur)}°`));
  n.appendChild(document.createTextNode(', hauteur '));
  n.appendChild(fort(`${fmt(actif.hauteur)}°`));
  n.appendChild(document.createTextNode(', surface '));
  n.appendChild(fort(`${fmt(actif.surface)} degrés²`));
  n.appendChild(document.createTextNode(`, soit ${fmt(actif.surface / REF.surface)}× la référence ; diagonale `));
  n.appendChild(fort(`${fmt(actif.diagonale)}°`));
  n.appendChild(document.createTextNode(`. Carrés témoins : ${fmt(SURFACE_TEMOIN)} degrés², remplissage `));
  n.appendChild(fort(pct(SURFACE_TEMOIN / actif.surface)));
  n.appendChild(document.createTextNode(`. Centre : ${fmt(actif.centre.lat)}° de latitude, ${fmt(actif.centre.lon)}° de longitude. Point testé (${fmt(S.testLat)}° / ${fmt(S.testLon)}°) : `));
  n.appendChild(fort(position));
  n.appendChild(document.createTextNode('. Une marge ou une contrainte de carré élargit la surface sans rien apprendre de nouveau sur les lieux.'));
}

/* ---------- Synchronisation d'état ---------- */

function applyState() {
  const n = S.nodes;
  if (!n) return;
  n.radios.forEach((radio) => {
    if (radio) radio.checked = radio.value === S.strategie;
  });
  if (n.pad) {
    n.pad.value = String(S.padding);
    n.pad.setAttribute('aria-valuetext', `${S.padding} degrés (référence : marge nulle)`);
  }
  if (n.padValue) n.padValue.textContent = `${S.padding}°`;
  if (n.testLat) {
    n.testLat.value = String(S.testLat);
    n.testLat.setAttribute('aria-valuetext', `${fmt(S.testLat)} degrés de latitude`);
  }
  if (n.testLatValue) n.testLatValue.textContent = `${fmt(S.testLat)}°`;
  if (n.testLon) {
    n.testLon.value = String(S.testLon);
    n.testLon.setAttribute('aria-valuetext', `${fmt(S.testLon)} degrés de longitude`);
  }
  if (n.testLonValue) n.testLonValue.textContent = `${fmt(S.testLon)}°`;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyV2E084Reduced = S.reduced ? '1' : '0';
  if (n.legend) {
    n.legend.textContent = `${LEGENDE} Stratégie active : ${STRAT_LABEL[S.strategie]} (${STRAT_DETAIL[S.strategie]})`;
  }
  fillMesuresTable();
  updateReadout();
  drawLab();
  updateBadge();
}

function updateBadge() {
  const badge = document.getElementById(ID.badge);
  if (badge) {
    badge.textContent = `Cadre englobant V2 — ${STRAT_LABEL[S.strategie]} : ${fmt(surfacePour(S.strategie, S.padding))} degrés², remplissage ${pct(remplissagePour(S.strategie, S.padding))} (réf. ${pct(SURFACE_TEMOIN / REF.surface)}).`;
  }
}

/* ---------- E084-08 : boucle rAF unique, pauses multiples ---------- */

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
    S.phase = (S.phase + dt * 0.00012) % 1;
  }
  S.lastTs = ts;
  drawLab();
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
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source */ }
  }
}

/* ---------- E084-09 / E084-10 : pilotes, clavier, badge, robustesse ---------- */

function setStrategie(value) {
  if (STRATEGIES.indexOf(value) === -1) return;
  S.strategie = value;
  applyState();
}

function setPadding(value) {
  S.padding = clamp(Math.round(Number(value)), PAD_MIN, PAD_MAX);
  applyState();
}

function setTestLat(value) {
  S.testLat = clamp(Math.round(Number(value) * 2) / 2, LAT_MIN, LAT_MAX);
  applyState();
}

function setTestLon(value) {
  S.testLon = clamp(Math.round(Number(value) * 2) / 2, LON_MIN, LON_MAX);
  applyState();
}

function togglePlay() {
  S.playing = !S.playing;
  if (!S.playing || S.reduced) stopLoop(); else startLoop();
  applyState();
}

function resetState() {
  S.strategie = 'marge';
  S.padding = PAD_DEF;
  S.testLat = 48.5;
  S.testLon = 3;
  S.playing = false;
  S.phase = 0;
  stopLoop();
  applyState();
}

function wirePanel() {
  const n = S.nodes;
  if (!n || !n.fresh) return;
  n.radios.forEach((radio) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (radio.checked) setStrategie(radio.value);
    });
  });
  if (n.pad) n.pad.addEventListener('input', () => setPadding(n.pad.value));
  if (n.testLat) n.testLat.addEventListener('input', () => setTestLat(n.testLat.value));
  if (n.testLon) n.testLon.addEventListener('input', () => setTestLon(n.testLon.value));
  if (n.play) n.play.addEventListener('click', () => togglePlay());
  if (n.reset) n.reset.addEventListener('click', () => resetState());
  if (n.canvas) {
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      const pas = event.shiftKey ? 2 : 0.5;
      if (event.key === 'ArrowLeft') setTestLon(S.testLon - pas);
      else if (event.key === 'ArrowRight') setTestLon(S.testLon + pas);
      else if (event.key === 'ArrowUp') setTestLat(S.testLat + pas);
      else if (event.key === 'ArrowDown') setTestLat(S.testLat - pas);
      else if (event.key === '+' || event.key === '=') setPadding(S.padding + 1);
      else if (event.key === '-' || event.key === '_') setPadding(S.padding - 1);
      else if (event.key === '1') setStrategie('minimal');
      else if (event.key === '2') setStrategie('marge');
      else if (event.key === '3') setStrategie('carre');
      else if (event.key === ' ' || event.key === 'Spacebar') togglePlay();
      else if (event.key === 'Home') resetState();
      else used = false;
      if (used) {
        event.preventDefault();
      }
    });
  }
}

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(ID.badge)) return;
  const badge = ctx.el('div', 'geography-v2-e084-badge', '');
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
#${ID.panel} .geography-v2-e084-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${ID.panel} table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${ID.panel} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${ID.panel} th,#${ID.panel} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${ID.panel} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${ID.bornes}{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 12px;margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${ID.bornes} strong{color:var(--gold-bright,#f4d69e);font-variant-numeric:tabular-nums}
.geography-v2-e084-fieldset{margin:8px 0;padding:8px;border:1px solid var(--line);border-radius:8px}
.geography-v2-e084-fieldset legend{padding:0 4px;color:var(--muted)}
.geography-v2-e084-choix{display:block;min-height:36px;margin:3px 0;padding:5px 6px;cursor:pointer}
.geography-v2-e084-choix input[type="radio"]{min-width:20px;min-height:20px;margin:0 8px 0 0;accent-color:var(--gold,#e6b96f);vertical-align:middle}
.geography-v2-e084-detail{display:block;margin:2px 0 2px 28px;color:var(--muted);font-size:10px}
.geography-v2-e084-row{margin:8px 0;padding:6px 7px;border:1px solid var(--line);border-radius:8px}
.geography-v2-e084-row label{display:block;min-height:24px}
.geography-v2-e084-range{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.geography-v2-e084-val{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#${ID.canvas}{
  display:block;width:100%;height:248px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
.geography-v2-e084-legend,.geography-v2-e084-desc{font-size:10px;color:var(--muted)}
.geography-v2-e084-note{font-size:10px;color:var(--muted);font-style:italic}
#${ID.readout}{
  min-height:38px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${ID.readout} strong{color:var(--gold-bright,#f4d69e)}
#${ID.panel} .geography-v2-e084-btn{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:8px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${ID.panel} .geography-v2-e084-btn:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${ID.panel} :focus-visible{outline:3px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-v2-e084-badge{
  position:absolute;right:16px;bottom:14px;z-index:3;max-width:58%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${ID.panel}[data-geography-v2-e084-reduced="1"] .geography-v2-e084-btn,
#${ID.panel}[data-geography-v2-e084-reduced="1"] .geography-v2-e084-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${ID.panel} .geography-v2-e084-btn,.geography-v2-e084-badge{transition:none!important;animation:none!important}
}
@media (forced-colors:active){
  #${ID.panel}{border:1px solid CanvasText}
  #${ID.canvas}{border:1px solid CanvasText}
}
@media (max-width:620px){
  #${ID.panel}{font-size:10px;padding:9px}
  #${ID.canvas}{height:208px}
  #${ID.bornes}{grid-template-columns:1fr}
}
`;

/* ---------- Point d'entrée unique ---------- */

register('E084', (ctx) => {
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
