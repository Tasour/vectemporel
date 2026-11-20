import { register } from './registry.js';

/* Lentille V2 E028 — vue GEOGRAPHIE.
 * Thème : bathymétrie et profondeurs océaniques, échosondage, hypsographie.
 *
 * Les dix chantiers E028-01 … E028-10 sont réellement implémentés ci-dessous :
 *  01 texte sémantique d'introduction      02 tableau des cinq provinces
 *  03 radiogroup de province               04 curseurs temps / célérité
 *  05 coupe canvas par interpolations      06 grandeurs chiffrées / référence
 *  07 navire animé : rAF unique + pause    08 codes non chromatiques
 *  09 badge textuel sur la carte           10 accessibilité / mouvement réduit
 *
 * Modèle central (échosondage) : h = c · t / 2, avec c ≈ 1 500 m/s dans
 * l'eau de mer. À 1,00 s d'aller-retour correspond 750 m de profondeur.
 *
 * Tout est local : aucun appel réseau, aucun tirage aléatoire (graine fixe
 * 0xE028 via mulberry32), aucun journal, aucun fichier partagé modifié. Le
 * contenu pédagogique est du texte sémantique inséré dans le DOM : il reste
 * lisible et indexable même sans animation ni interaction. Le canvas n'est
 * qu'un laboratoire dont chaque grandeur est aussi écrite en toutes lettres.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const P = 'geography-v2-e028';
const CSS_ID = P;

/* Constantes physiques et références explicites (aucune donnée fabriquée). */
const C_REF = 1500;       // m/s, célérité de référence dans l'eau de mer
const C_MIN = 1450;
const C_MAX = 1550;
const T_MIN = 0.2;        // s, temps aller-retour minimal
const T_MAX = 14.6;       // s, donne h = 1 500 × 14,6 / 2 = 10 950 m
const H_MAX = 11000;      // m, ordre de grandeur de la fosse la plus profonde
const H_MOYEN = 3700;     // m, profondeur moyenne des océans (référence)
const PART_OCEAN = 71;    // %, part de la surface terrestre sous l'océan
const HALLISH = 10900;    // m, Challenger Deep (ordre de grandeur publié)
const SEED = 0xE028;      // graine fixe et affichée, zéro tirage aléatoire

const ORDER = ['plateau', 'talus', 'plaine', 'dorsale', 'fosse'];
const PROVINCES = {
  plateau: {
    label: 'Plateau continental', x0: 0.00, x1: 0.18, centre: 0.10,
    zMin: 0, zMax: 200, pente: '≈ 0,1°', hatch: 8,
    materiau: 'sédiments continentaux, pente très faible',
  },
  talus: {
    label: 'Talus continental', x0: 0.18, x1: 0.32, centre: 0.25,
    zMin: 200, zMax: 3000, pente: '≈ 4°', hatch: 5,
    materiau: 'pente forte, 40× plus raide que le plateau',
  },
  plaine: {
    label: 'Plaine abyssale', x0: 0.32, x1: 0.55, centre: 0.44,
    zMin: 4000, zMax: 6000, pente: '< 0,1°', hatch: 12,
    materiau: 'vase abyssale, ≈ 50 % de la surface du globe',
  },
  dorsale: {
    label: 'Dorsale océanique', x0: 0.55, x1: 0.72, centre: 0.635,
    zMin: 2400, zMax: 5000, pente: 'rift central', hatch: 4,
    materiau: 'basalte jeune, ≈ 65 000 km de dorsales',
  },
  fosse: {
    label: 'Fosse océanique', x0: 0.82, x1: 1.00, centre: 0.92,
    zMin: 6000, zMax: HALLISH, pente: 'très raide', hatch: 6,
    materiau: 'subduction, Challenger Deep ≈ 10 900 m',
  },
};

/* Points d'ancrage du profil schématique : [position normalisée, profondeur m].
   La profondeur est interpolée linéairement entre deux ancres : zéro aléa. */
const ANCHRES = [
  [0.00, 0], [0.15, 0], [0.18, 130], [0.32, 3000], [0.40, 4200],
  [0.52, 5000], [0.60, 2500], [0.64, 2400], [0.70, 4800],
  [0.80, 5100], [0.90, 10200], [0.94, HALLISH], [0.98, 6500], [1.00, 5000],
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  province: 'fosse',
  time: 1.0,
  sound: C_REF,
  playing: false,
  reduced: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visible: true,
  visBound: false,
  motionBound: false,
  observerBound: false,
  nodes: {},
};

/* ---------- E028-05 : générateur déterministe (mulberry32, graine affichée) ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Dépôts de vase : positions fixes, dérivées de la graine, jamais d'un tirage. */
const SEDIMENTS = (() => {
  const r = mulberry32(SEED);
  return Array.from({ length: 26 }, () => ({ x: r(), y: r(), s: 0.5 + r() * 1.2 }));
})();

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const fmtEntier = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');

const fmt = (n, d = 2) => {
  const v = Math.round(n * 10 ** d) / 10 ** d;
  const parts = v.toFixed(d).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  return parts.join(',');
};

/* Profondeur dérivée du temps aller-retour d'un écho acoustique. */
function depth(time, sound) {
  return (sound * time) / 2;
}

/* Profondeur de référence : on suppose c = 1 500 m/s. */
function depthRef(time) {
  return depth(time, C_REF);
}

function measures() {
  const h = depth(S.time, S.sound);
  const href = depthRef(S.time);
  const ecart = h - href;
  const pcentC = ((S.sound - C_REF) / C_REF) * 100;
  const pcentH = href > 0 ? (ecart / href) * 100 : 0;
  const p = PROVINCES[S.province];
  return {
    h, href, ecart, pcentC, pcentH,
    sousNavire: profileDepth(S.sweep),
    province: p,
    partTerre: 100 - PART_OCEAN,
    rapportOceanTerre: PART_OCEAN / (100 - PART_OCEAN),
  };
}

/* Profondeur du fond le long de la coupe, par interpolation linéaire. */
function profileDepth(x) {
  const xn = Math.max(0, Math.min(1, x));
  for (let i = 1; i < ANCHRES.length; i += 1) {
    const [x1, z1] = ANCHRES[i];
    if (xn <= x1) {
      const [x0, z0] = ANCHRES[i - 1];
      const f = x1 === x0 ? 0 : (xn - x0) / (x1 - x0);
      return z0 + (z1 - z0) * f;
    }
  }
  return ANCHRES[ANCHRES.length - 1][1];
}

function legendText() {
  const p = PROVINCES[S.province];
  return `Province : ${p.label} — ${p.materiau}, pente ${p.pente}. `
    + 'Trait tireté = niveau de la mer ; hachures = fond marin (espacement propre à chaque province) ; '
    + 'trait plein doré + croix = profondeur mesurée ; pointillé = rayon du navire échosondeur. '
    + `Dépôts de vase positionnés par la graine fixe ${SEED} (${SEED.toString(10)}). `
    + 'Aucun repère ne repose sur la couleur seule.';
}

/* ---------- E028-03 / 04 / 08 / 10 : feuille de style unique ---------- */

const CSS = `
#${P}-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${P}-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${P}-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${P}-panel p{margin:5px 0;max-width:68ch}
#${P}-panel .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${P}-panel .${P}-limite{
  margin:6px 0;padding-left:9px;border-left:2px dashed var(--muted,#9a938a);
  color:var(--ink-soft,#d7d1c6);
}
#${P}-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${P}-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${P}-table th,#${P}-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${P}-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${P}-province{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${P}-province legend{padding:0 4px;color:var(--muted)}
#${P}-panel .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${P}-panel .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${P}-time,#${P}-sound{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.${P}-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${P}-canvas{
  display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${P}-legend,#${P}-keys{font-size:10px;color:var(--muted)}
#${P}-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${P}-readout strong{color:var(--gold-bright,#f4d69e)}
#${P}-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${P}-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${P}-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${P}-panel[data-${P}-reduced="1"] button,
#${P}-panel[data-${P}-reduced="1"] .${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${P}-panel button,.${P}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${P}-panel{font-size:10px;padding:9px}
  #${P}-canvas{height:190px}
  #${P}-panel .${P}-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function mk(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/* E028-01 : trois faits + une limite falsifiable, textes réels dans le DOM. */
function staticFacts() {
  const wrap = mk('div');
  const faits = [
    'La bathymétrie est la mesure des profondeurs et la description des reliefs du fond des océans. Environ 71 % de la surface terrestre est recouverte par les mers : la profondeur moyenne des océans atteint environ 3 700 m, contre à peine 840 m d’altitude moyenne pour les continents émergés.',
    'L’essentiel des profondeurs a été relevé par échosondage : un navire émet une impulsion acoustique et chronomètre son retour après réflexion sur le fond. La profondeur se calcule par h = c · t / 2, où c est la célérité du son dans l’eau de mer (environ 1 500 m/s) et t le temps aller-retour. À 1,00 s correspond donc 750 m de profondeur.',
    'Le fond océanique n’est pas une plaine uniforme : le plateau continental (jusqu’à 200 m, pente d’environ 0,1°) prolonge les côtes ; le talus continental descend vers 3 000 m avec une pente d’environ 4° ; les plaines abyssales (4 000–6 000 m) couvrent près de la moitié de la surface du globe ; les dorsales forment ≈ 65 000 km de reliefs dont le sommet est vers 2 500 m ; les fosses dépassent 6 000 m (Challenger Deep ≈ 10 900 m).',
  ];
  faits.forEach((texte) => wrap.appendChild(mk('p', P + '-fait', texte)));
  const limite = mk('p', P + '-limite',
    'Limite falsifiable — le modèle suppose une célérité constante et un fond horizontal sous le navire. '
    + 'Une erreur sur c se propage directement dans h : employer 1 500 m/s là où l’eau est à 1 480 m/s '
    + 'surestime la profondeur d’environ 1,3 %. Le modèle serait falsifié si doubler le temps ne doublait '
    + 'pas la profondeur (h = c · t / 2), si un changement de célérité ne modifiait pas l’écart, ou si la '
    + 'croissance des profondeurs s’arrêtait aux abords de 10 900 m.');
  limite.setAttribute('role', 'note');
  wrap.appendChild(limite);
  return wrap;
}

/* E028-02 : cinq provinces, référence h = c · t / 2 (750 m pour 1,00 s). */
function staticTable() {
  const table = mk('table');
  table.id = P + '-table';
  table.appendChild(mk('caption', '',
    'Repères morphologiques (ordres de grandeur des courbes hypsographiques). Référence : '
    + 'h = c · t / 2 avec c = 1 500 m/s, soit 750 m pour 1,00 s d’aller-retour.'));

  const thead = mk('thead');
  const hr = mk('tr');
  ['Province', 'Profondeur', 'Pente', 'Repère chiffré'].forEach((h) => {
    const th = mk('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = mk('tbody');
  const lignes = [
    ['Plateau continental', '0 – 200 m', '≈ 0,1°', 'bordure des continents'],
    ['Talus continental', '200 – 3 000 m', '≈ 4°', '40× plus raide que le plateau'],
    ['Plaine abyssale', '4 000 – 6 000 m', '< 0,1°', '≈ 50 % de la surface du globe'],
    ['Dorsale océanique', 'sommet ≈ 2 500 m', 'rift central', '≈ 65 000 km de long'],
    ['Fosse océanique', '> 6 000 m', 'très raide', 'Challenger Deep ≈ 10 900 m'],
  ];
  lignes.forEach((cells) => {
    const tr = mk('tr');
    cells.forEach((c, i) => {
      const cell = mk(i === 0 ? 'th' : 'td', '', c);
      if (i === 0) cell.scope = 'row';
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function ensurePanel(ctx) {
  const idPanel = P + '-panel';
  const existant = document.getElementById(idPanel);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: ORDER.map((k) => document.getElementById(P + '-province-' + k)),
      time: document.getElementById(P + '-time'),
      timeOut: document.getElementById(P + '-time-value'),
      sound: document.getElementById(P + '-sound'),
      soundOut: document.getElementById(P + '-sound-value'),
      canvas: document.getElementById(P + '-canvas'),
      readout: document.getElementById(P + '-readout'),
      play: document.getElementById(P + '-play'),
      legend: document.getElementById(P + '-legend'),
    };
  }

  const panel = mk('section', P + '-panel');
  panel.id = idPanel;
  panel.setAttribute('aria-labelledby', P + '-title');

  const title = mk('h2', '', 'Bathymétrie et profondeurs océaniques');
  title.id = P + '-title';
  const lead = mk('p', '', 'Comment connaître la forme d’un fond que l’on ne voit pas ? '
    + 'Mesurer l’aller-retour d’un son et le convertir en profondeur révèle un relief de plateaux, '
    + 'de plaines, de dorsales et de fosses.');

  /* E028-03 : radiogroup natif, jamais d'aria-pressed sur un choix unique. */
  const fieldset = mk('fieldset');
  fieldset.id = P + '-province';
  fieldset.setAttribute('role', 'radiogroup');
  const leg = mk('legend', '', 'Province morphologique observée (choix unique)');
  fieldset.appendChild(leg);
  const radios = ORDER.map((key) => {
    const lab = mk('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-province';
    radio.id = P + '-province-' + key;
    radio.value = key;
    radio.checked = S.province === key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(PROVINCES[key].label));
    fieldset.appendChild(lab);
    return radio;
  });

  const sub = mk('h3', '', 'Mesurer la profondeur par échosondage');

  const timeRow = mk('p');
  const timeLabel = document.createElement('label');
  timeLabel.setAttribute('for', P + '-time');
  timeLabel.appendChild(document.createTextNode('Temps aller-retour de l’écho : '));
  const timeOut = mk('span', P + '-valeur');
  timeOut.id = P + '-time-value';
  timeLabel.appendChild(timeOut);
  timeRow.appendChild(timeLabel);

  const time = document.createElement('input');
  time.type = 'range';
  time.id = P + '-time';
  time.min = String(T_MIN);
  time.max = String(T_MAX);
  time.step = '0.2';
  time.value = String(S.time);
  time.setAttribute('aria-label', 'Temps aller-retour de l’écho acoustique, de 0,2 à 14,6 secondes');

  const soundRow = mk('p');
  const soundLabel = document.createElement('label');
  soundLabel.setAttribute('for', P + '-sound');
  soundLabel.appendChild(document.createTextNode('Célérité du son supposée : '));
  const soundOut = mk('span', P + '-valeur');
  soundOut.id = P + '-sound-value';
  soundLabel.appendChild(soundOut);
  soundRow.appendChild(soundLabel);

  const sound = document.createElement('input');
  sound.type = 'range';
  sound.id = P + '-sound';
  sound.min = String(C_MIN);
  sound.max = String(C_MAX);
  sound.step = '10';
  sound.value = String(S.sound);
  sound.setAttribute('aria-label', 'Célérité du son dans l’eau de mer, de 1 450 à 1 550 mètres par seconde');

  /* E028-05 / 08 : canvas accessible au clavier et étiqueté. */
  const canvas = document.createElement('canvas');
  canvas.id = P + '-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Coupe bathymétrique schématique du plateau continental jusqu’à la fosse, '
    + 'avec repères de profondeur. Flèches gauche et droite : changer de province ; haut et bas : modifier '
    + 'le temps de l’écho ; Page précédente et Page suivante : modifier la célérité du son ; Début et Fin : '
    + 'première et dernière province.');

  const legendNode = mk('p', P + '-legend', legendText());
  legendNode.id = P + '-legend';

  /* E028-06 : texte annoncé aux technologies d'assistance, avec repli statique. */
  const readout = mk('p', P + '-readout');
  readout.id = P + '-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.appendChild(document.createTextNode(
    'À 1,00 s et 1 500 m/s : profondeur h = c · t / 2 = 750 m (référence).'));

  const play = mk('button', '', S.playing ? '■ Arrêter le navire' : '▶ Animer le navire');
  play.type = 'button';
  play.id = P + '-play';
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false'); /* bascule indépendante. */

  const keys = mk('p', P + '-keys', 'Clavier (canvas focalisé) : ← / → changent de province, ↑ / ↓ '
    + 'modifient le temps par pas de 0,2 s, Page précédente / suivante la célérité par pas de 10 m/s, '
    + 'Début / Fin la première ou la dernière province.');
  keys.id = P + '-keys';

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sub,
    timeRow, time, soundRow, sound, canvas, legendNode, readout, play, keys);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return { panel, fresh: true, radios, time, timeOut, sound, soundOut, canvas, readout, play, legend: legendNode };
}

/* ---------- E028-05 / 08 : un seul canvas, un seul dessin par frame ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function' || !S.visible) return;
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

  const pad = 18;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const px = (xn) => pad + xn * iw;
  const py = (z) => pad + (Math.max(0, Math.min(H_MAX, z)) / H_MAX) * ih;

  /* Grille de profondeur : repères chiffrés indépendants de la couleur. */
  g.strokeStyle = 'rgba(255,255,255,.10)';
  g.lineWidth = 1;
  g.font = '9px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.55)';
  g.textAlign = 'right';
  for (let z = 0; z <= 10000; z += 2000) {
    const y = py(z);
    g.beginPath();
    g.moveTo(pad, y);
    g.lineTo(pad + iw, y);
    g.stroke();
    g.fillText(z === 0 ? '0 m' : (z / 1000) + ' km', pad - 2, y + 3);
  }

  /* Province sélectionnée : bande claire + étiquette (repère non chromatique). */
  const p = PROVINCES[S.province];
  g.fillStyle = 'rgba(230,185,111,.07)';
  g.fillRect(px(p.x0), pad, px(p.x1) - px(p.x0), ih);
  g.strokeStyle = 'rgba(244,214,158,.55)';
  g.lineWidth = 1;
  g.strokeRect(px(p.x0) + 0.5, pad + 0.5, px(p.x1) - px(p.x0) - 1, ih - 1);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.textAlign = 'center';
  g.fillText(p.label, (px(p.x0) + px(p.x1)) / 2, pad + 11);

  /* E028-08 : hachures du fond, espacement propre à chaque province. */
  ORDER.forEach((key) => {
    const prov = PROVINCES[key];
    g.strokeStyle = key === S.province ? 'rgba(244,214,158,.55)' : 'rgba(214,207,193,.28)';
    g.lineWidth = 1;
    const pas = prov.hatch;
    for (let x = prov.x0; x <= prov.x1; x += pas / iw) {
      const X = px(x);
      const y = py(profileDepth(x));
      g.beginPath();
      g.moveTo(X - 3, y + 7);
      g.lineTo(X + 3, y + 1);
      g.stroke();
    }
  });

  /* Niveau de la mer : trait tireté. */
  g.setLineDash([6, 5]);
  g.strokeStyle = 'rgba(214,207,193,.75)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(pad, py(0));
  g.lineTo(pad + iw, py(0));
  g.stroke();
  g.setLineDash([]);

  /* Profil du fond construit depuis ANCHRES (formule déterministe). */
  g.beginPath();
  ANCHRES.forEach(([x, z], i) => {
    const X = px(x);
    const Y = py(z);
    if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
  });
  g.strokeStyle = 'rgba(255,255,255,.9)';
  g.lineWidth = 2;
  g.stroke();
  g.lineTo(px(1), pad + ih);
  g.lineTo(px(0), pad + ih);
  g.closePath();
  g.fillStyle = 'rgba(120,150,175,.18)';
  g.fill();

  /* Dépôts de vase : positions déterministes (graine 0xE028) + dérive S.sweep. */
  g.fillStyle = 'rgba(214,207,193,.55)';
  SEDIMENTS.forEach((d) => {
    const xn = (d.x + S.sweep * d.s * 0.05) % 1;
    const yn = 0.34 + 0.62 * d.y;
    if (yn > profileDepth(xn) / H_MAX) return; /* reste sous le trait du fond. */
    g.fillRect(px(xn), py(yn * H_MAX), 1.4, 1.4);
  });

  /* Profondeur mesurée : trait plein doré + croix, jamais la couleur seule. */
  const h = depth(S.time, S.sound);
  const yh = py(h);
  g.setLineDash([]);
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(pad, yh);
  g.lineTo(pad + iw, yh);
  g.stroke();
  const cx = px(p.centre);
  g.beginPath();
  g.moveTo(cx - 7, yh);
  g.lineTo(cx + 7, yh);
  g.moveTo(cx, yh - 7);
  g.lineTo(cx, yh + 7);
  g.stroke();
  g.textAlign = 'center';
  g.fillText('h = ' + fmtEntier(h) + ' m', Math.min(Math.max(cx, pad + 40), pad + iw - 40), yh - 10);

  /* Navire échosondeur : rayon pointillé descendant jusqu'au fond. */
  const sx = px(S.sweep);
  const sy = py(0);
  g.setLineDash([2, 4]);
  g.strokeStyle = 'rgba(255,255,255,.85)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(sx, py(profileDepth(S.sweep)));
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.beginPath();
  g.moveTo(sx - 6, sy - 5);
  g.lineTo(sx + 6, sy - 5);
  g.lineTo(sx + 3, sy);
  g.lineTo(sx - 3, sy);
  g.closePath();
  g.fill();
  g.textAlign = 'left';
  g.fillStyle = 'rgba(255,255,255,.75)';
  g.fillText('navire · ' + fmtEntier(profileDepth(S.sweep)) + ' m sous lui',
    Math.min(sx + 8, pad + iw - 130), sy + 22);

  /* Légende d'échelle, référence et graine affichée. */
  g.textAlign = 'left';
  g.fillStyle = 'rgba(244,214,158,.9)';
  g.fillText('Coupe schématique · échelle 0 – 11 000 m · graine ' + SEED, pad + 2, pad + ih - 4);
}

/* ---------- E028-06 : grandeurs chiffrées comparées à une référence ---------- */

function updateReadout() {
  const m = measures();
  const n = S.nodes.readout;
  if (!n) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('À t = '));
  n.appendChild(fort(fmt(S.time, 1) + ' s'));
  n.appendChild(document.createTextNode(' et c = '));
  n.appendChild(fort(fmtEntier(S.sound) + ' m/s'));
  n.appendChild(document.createTextNode(' : profondeur h = c · t / 2 = '));
  n.appendChild(fort(fmtEntier(m.h) + ' m'));
  n.appendChild(document.createTextNode('. Référence à c = 1 500 m/s : '));
  n.appendChild(fort(fmtEntier(m.href) + ' m'));
  n.appendChild(document.createTextNode(' (1,00 s → 750 m). Écart '));
  n.appendChild(fort((m.ecart >= 0 ? '+' : '−') + fmtEntier(Math.abs(m.ecart)) + ' m'));
  n.appendChild(document.createTextNode(' ('));
  n.appendChild(fort(fmt(m.pcentH, 1) + ' %'));
  n.appendChild(document.createTextNode('), soit '));
  n.appendChild(fort(fmt(m.pcentC, 1) + ' %'));
  n.appendChild(document.createTextNode(' sur la célérité. Les océans couvrent '));
  n.appendChild(fort(String(PART_OCEAN) + ' %'));
  n.appendChild(document.createTextNode(' de la surface terrestre, soit '));
  n.appendChild(fort(fmt(m.rapportOceanTerre, 2) + '×'));
  n.appendChild(document.createTextNode(' la surface émergée ; profondeur moyenne ≈ '));
  n.appendChild(fort(fmtEntier(H_MOYEN) + ' m'));
  n.appendChild(document.createTextNode('. Province : '));
  n.appendChild(fort(m.province.label));
  n.appendChild(document.createTextNode(' ; pente ' + m.province.pente + '.'));
}

function syncControls() {
  const n = S.nodes;
  ORDER.forEach((key, i) => {
    if (n.radios[i]) n.radios[i].checked = key === S.province;
  });
  if (n.time) n.time.value = String(S.time);
  if (n.timeOut) n.timeOut.textContent = fmt(S.time, 1) + ' s → ' + fmtEntier(depthRef(S.time)) + ' m (à 1 500 m/s)';
  if (n.sound) n.sound.value = String(S.sound);
  if (n.soundOut) n.soundOut.textContent = fmtEntier(S.sound) + ' m/s';
  if (n.legend) n.legend.textContent = legendText();
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le navire' : '▶ Animer le navire';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
}

/* ---------- E028-07 : boucle rAF unique, pause sur document.hidden ---------- */

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
  if (!S.visible || S.reduced || !S.playing) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.lastTs && S.playing && !S.reduced && S.visible) {
    const dt = Math.min(80, ts - S.lastTs);
    /* Traversée complète de la coupe en 24 s : vitesse déterministe. */
    S.sweep = (S.sweep + dt / 24000) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !S.reduced && S.visible) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E028-10 : écouteurs globaux, mouvement réduit et visibilité ---------- */

function installGlobalListeners(ctx) {
  if (typeof document !== 'undefined' && !S.visBound) {
    S.visBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !S.reduced && S.visible) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        const panel = document.getElementById(P + '-panel');
        if (panel) panel.setAttribute('data-' + P + '-reduced', S.reduced ? '1' : '0');
        if (S.reduced) { stopLoop(); drawLab(); } else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- Suspension du dessin hors écran (IntersectionObserver) ---------- */

function installObserver() {
  const cv = S.nodes.canvas;
  if (S.observerBound || !cv || typeof IntersectionObserver !== 'function') return;
  S.observerBound = true;
  try {
    const obs = new IntersectionObserver((entrees) => {
      const entree = entrees[0];
      S.visible = !entree || entree.isIntersecting;
      if (!S.visible) stopLoop();
      else {
        drawLab();
        if (S.playing && !S.reduced) startLoop();
      }
    }, { threshold: 0.01 });
    obs.observe(cv);
  } catch { /* observateur indisponible : le dessin reste actif, sans aléa. */ }
}

/* ---------- E028-09 : badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  const idBadge = P + '-badge';
  if (!map || document.getElementById(idBadge)) return;
  const badge = mk('div', P + '-badge',
    'Profil bathymétrique schématique : profondeur = c · t / 2 avec c ≈ 1 500 m/s ; '
    + '1 s d’aller-retour → 750 m.');
  badge.id = idBadge;
  map.appendChild(badge);
}

/* ---------- Point d'entrée unique ---------- */

register('E028', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.reduced = reduced;
  S.nodes.panel.setAttribute('data-' + P + '-reduced', reduced ? '1' : '0');
  if (reduced) S.playing = false;

  syncControls();
  installObserver();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio, i) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.province = ORDER[i];
        syncControls();
      });
    });
    n.time.addEventListener('input', () => {
      S.time = Math.max(T_MIN, Math.min(T_MAX, Math.round(Number(n.time.value) / 0.2) * 0.2));
      syncControls();
    });
    n.sound.addEventListener('input', () => {
      S.sound = Math.max(C_MIN, Math.min(C_MAX, Math.round(Number(n.sound.value) / 10) * 10));
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
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = ORDER.indexOf(S.province);
        S.province = ORDER[(i + step + ORDER.length) % ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 0.2 : -0.2;
        S.time = Math.max(T_MIN, Math.min(T_MAX, Math.round((S.time + step) / 0.2) * 0.2));
      } else if (event.key === 'PageUp' || event.key === 'PageDown') {
        const step = event.key === 'PageUp' ? 10 : -10;
        S.sound = Math.max(C_MIN, Math.min(C_MAX, Math.round((S.sound + step) / 10) * 10));
      } else if (event.key === 'Home') {
        S.province = ORDER[0];
      } else if (event.key === 'End') {
        S.province = ORDER[ORDER.length - 1];
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners(ctx);
  if (S.playing && !S.reduced && S.visible) startLoop();
});
