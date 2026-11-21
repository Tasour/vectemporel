import { register } from './registry.js';

/* Lentille V2 E043 — vue GEOGRAPHIE.
 * Thème : contraste et lisibilité des couleurs — luminance relative WCAG,
 * rapport de contraste et seuils AA/AAA, simulation des daltonismes,
 * écart perceptif ΔE76 dans l'espace Lab, jauge de contraste commentée.
 *
 * Les dix chantiers E043-01 … E043-10 sont réellement implémentés ci-dessous :
 *  01 section sémantique autonome, limite falsifiable, défi et glossaire (sans JS) ;
 *  02 feuille de style unique et identifiants préfixés geography-v2-e043- ;
 *  03 luminance relative WCAG linéarisée (référence noir 0 / blanc 1) ;
 *  04 rapport de contraste (Lclair+0,05)/(Lsombre+0,05), borné 1–21 ;
 *  05 seuils AA/AAA comparés à la référence 4,5:1 (gris 118 passe, 119 échoue) ;
 *  06 simulation des daltonismes par matrices 3×3 (graine déterministe affichée) ;
 *  07 écart perceptif ΔE76 dans l'espace Lab (illuminant D65) ;
 *  08 couleurs réglables et balayage déterministe du fond (canvas) ;
 *  09 couples de référence en tableau captioné, ratios recalculés ;
 *  10 laboratoire accessible : rAF unique, pauses, mouvement réduit, live.
 *
 * Tout est local : aucun appel réseau, aucun tirage aléatoire (mulberry32,
 * graine fixe SEED = 0xE043 affichée), aucune sortie console, aucun fichier
 * partagé modifié. Le contenu pédagogique est du texte sémantique inséré dans
 * le DOM : il reste lisible et indexable même sans animation ni interaction.
 * Le canvas n'est qu'un laboratoire dont chaque grandeur est aussi écrite en
 * toutes lettres dans le readout et le tableau.
 *
 * Nouveautés V2 : role="radiogroup" explicite, aria-keyshortcuts et
 * aria-describedby sur le canvas, IntersectionObserver (pause hors écran),
 * limite falsifiable et défi en 5 temps énoncés dans le panneau, graine
 * déterministe affichée, garde ferme du mouvement réduit sur la boucle rAF.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e043';
const P = 'geography-v2-e043';
const SEED = 0xE043; /* graine fixe et affichée, zéro tirage aléatoire. */

/* Couleurs de départ : le gris 118 sur blanc est un cas limite connu (≈ 4,54:1). */
const FG_DEF = '#767676';
const BG_DEF = '#ffffff';

/* Seuils WCAG 2.1 (rapport de contraste minimal, sans unité). */
const AA_NORMAL = 4.5;
const AA_LARGE = 3;
const AAA_NORMAL = 7;
const AAA_LARGE = 4.5;
const RATIO_MAX = 21; /* noir sur blanc */

const TAILLES = {
  normal: { label: 'Texte normal', seuil: AA_NORMAL },
  large: { label: 'Grand texte (≥ 18 pt ou 14 pt gras)', seuil: AA_LARGE },
};
const TAILLE_ORDER = ['normal', 'large'];

const SIMS = {
  normal: { label: 'Vision normale', matrice: null },
  protanopie: {
    label: 'Protanopie (cônes L)',
    matrice: [
      [0.152286, 1.052583, -0.204868],
      [0.114503, 0.786281, 0.099216],
      [-0.003882, -0.048116, 1.051998],
    ],
  },
  deuteranopie: {
    label: 'Deutéranopie (cônes M)',
    matrice: [
      [0.367322, 0.860646, -0.227968],
      [0.280085, 0.672501, 0.047413],
      [-0.011820, 0.042940, 0.968881],
    ],
  },
  tritanopie: {
    label: 'Tritanopie (cônes S)',
    matrice: [
      [1.255528, -0.076749, -0.178779],
      [-0.078411, 0.930809, 0.147602],
      [0.004733, 0.691367, 0.303900],
    ],
  },
};
const SIM_ORDER = ['normal', 'protanopie', 'deuteranopie', 'tritanopie'];

/* Couples de référence : chaque ratio du tableau est recalculé, jamais saisi. */
const ROWS = [
  ['Noir sur blanc', '#000000', '#ffffff'],
  ['Gris 118 sur blanc (cas limite AA)', '#767676', '#ffffff'],
  ['Gris 119 sur blanc (échec AA)', '#777777', '#ffffff'],
  ['Blanc sur rouge pur', '#ffffff', '#ff0000'],
  ['Bleu roi sur blanc', '#0000ff', '#ffffff'],
  ['Jaune sur blanc', '#ffff00', '#ffffff'],
];

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  fg: FG_DEF,
  bg: BG_DEF,
  taille: 'normal',
  sim: 'normal',
  playing: false,
  reduced: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  onScreen: true,
  visBound: false,
  motionBound: false,
  io: null,
  ioCanvas: null,
  nodes: {},
};

/* ---------- Graine : générateur déterministe (mulberry32, zéro tirage aléatoire) ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Pastilles d'échantillon reproductibles, jamais tirées au hasard. */
const GRAINS = (() => {
  const r = mulberry32(SEED);
  return Array.from({ length: 20 }, () => ({ x: r(), h: 4 + r() * 10 }));
})();

function seedText() {
  return `graine ${SEED} (0x${SEED.toString(16)}, ${SEED.toString(10)})`;
}

/* ---------- Colorimétrie déterministe (E043-03, E043-04, E043-06, E043-07) ---------- */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const nf = (n, d = 2) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');

function hexToRgb(hex) {
  const h = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!h) return { r: 0, g: 0, b: 0 };
  const n = parseInt(h[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(rgb) {
  const h = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return '#' + h(rgb.r) + h(rgb.g) + h(rgb.b);
}

/* E043-03 : linéarisation sRGB puis luminance relative WCAG.
 * c_lin = c/12,92 si c ≤ 0,04045, sinon ((c+0,055)/1,055)^2,4.
 * L = 0,2126 R + 0,7152 V + 0,0722 B. */
function linearise(c) {
  const v = clamp(c / 255, 0, 1);
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/* E043-04 : rapport = (L_clair + 0,05) / (L_sombre + 0,05), entre 1 et 21. */
function contraste(hexA, hexB) {
  const a = luminance(hexA);
  const b = luminance(hexB);
  const clair = Math.max(a, b);
  const sombre = Math.min(a, b);
  return (clair + 0.05) / (sombre + 0.05);
}

/* E043-06 : matrices de simulation appliquées en RVB linéaire (modèle de Machado). */
function simuler(hex, simKey) {
  const m = SIMS[simKey] ? SIMS[simKey].matrice : null;
  const { r, g, b } = hexToRgb(hex);
  if (!m) return { r, g, b };
  const v = [linearise(r), linearise(g), linearise(b)];
  const out = m.map((row) => clamp(row[0] * v[0] + row[1] * v[1] + row[2] * v[2], 0, 1));
  const encode = (x) => 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  return { r: encode(out[0]), g: encode(out[1]), b: encode(out[2]) };
}

function cssRgb(rgb) {
  return 'rgb(' + Math.round(clamp(rgb.r, 0, 255)) + ','
    + Math.round(clamp(rgb.g, 0, 255)) + ','
    + Math.round(clamp(rgb.b, 0, 255)) + ')';
}

/* E043-07 : écart CIE76 dans l'espace Lab (D65) — grandeur perceptive, en ΔE. */
function rgbToLab(hex) {
  const { r, g, b } = hexToRgb(hex);
  const R = linearise(r);
  const G = linearise(g);
  const B = linearise(b);
  const X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
  const Y = 0.2126729 * R + 0.7151522 * G + 0.0721750 * B;
  const Z = (0.0193339 * R + 0.1191920 * G + 0.9503041 * B) / 1.08883;
  const d = 6 / 29;
  const f = (t) => (t > d * d * d ? Math.cbrt(t) : t / (3 * d * d) + 4 / 29);
  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

function deltaE(hexA, hexB) {
  const A = rgbToLab(hexA);
  const B = rgbToLab(hexB);
  return Math.sqrt((A.L - B.L) ** 2 + (A.a - B.a) ** 2 + (A.b - B.b) ** 2);
}

function verdict(ratio, seuil) {
  return ratio >= seuil ? 'conforme' : 'insuffisant';
}

function animBg() {
  /* Balayage déterministe du gris : de 0 (noir) à 255 (blanc). */
  const v = Math.round(clamp(S.sweep, 0, 1) * 255);
  const h = v.toString(16).padStart(2, '0');
  return '#' + h + h + h;
}

function bgActif() {
  return S.playing ? animBg() : S.bg;
}

function adjust(hex, delta) {
  const c = hexToRgb(hex);
  return rgbToHex({ r: c.r + delta, g: c.g + delta, b: c.b + delta });
}

/* ---------- E043-02 : feuille de style unique, injectée une seule fois ---------- */

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
}
#${P}-panel .${P}-defi{margin:6px 0 2px;padding-left:9px;border-left:2px solid var(--muted,#9a938a)}
#${P}-panel ol.${P}-etapes{margin:4px 0 6px;padding-left:22px}
#${P}-panel ol.${P}-etapes li{margin:2px 0}
#${P}-glossaire{margin:7px 0;padding:6px 8px;border:1px solid var(--line);border-radius:8px}
#${P}-glossaire dt{color:var(--gold-bright,#f4d69e);font-weight:600;margin-top:4px}
#${P}-glossaire dd{margin:0 0 2px 12px;color:var(--ink-soft,#d7d1c6)}
#${P}-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${P}-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${P}-table th,#${P}-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${P}-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${P}-table td.${P}-ok{color:#bfe3b0}
#${P}-table td.${P}-ko{color:#f0b4a8}
#${P}-set{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${P}-set legend{padding:0 4px;color:var(--muted)}
#${P}-panel .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${P}-panel .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${P}-panel .${P}-couleur{
  display:inline-flex;align-items:center;gap:7px;min-height:36px;margin:4px 12px 4px 0;
}
#${P}-panel input[type="color"]{
  width:44px;height:36px;padding:2px;border:1px solid var(--line);border-radius:6px;
  background:transparent;cursor:pointer;
}
#${P}-panel .${P}-hex{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e)}
#${P}-canvas{
  display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${P}-legend{font-size:10px;color:var(--muted)}
#${P}-readout{
  min-height:44px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
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
#${P}-panel .${P}-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
}
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
  #${P}-canvas{height:210px}
  #${P}-panel .${P}-choix{margin-right:4px}
}
`;

/* ---------- E043-01 / 02 : construction du panneau (texte sémantique) ---------- */

function mk(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/* E043-01 : trois faits sourcés, une limite falsifiable, un défi en 5 temps
 * et un glossaire — tout en texte réel au DOM, lisible sans JS. Les termes
 * (luminance, contraste, delta, daltonisme, AA/AAA) sont définis à leur
 * première occurrence dans les paragraphes ci-dessous. */
function staticFacts() {
  const wrap = mk('div');
  const faits = [
    'La luminance relative (clarté perçue d’une couleur, de 0 pour le noir à 1 pour le blanc) linéarise chaque composante sRGB puis pondère le rouge, le vert et le bleu par 0,2126, 0,7152 et 0,0722 : l’œil est bien plus sensible au vert qu’au bleu.',
    'Le rapport de contraste WCAG divise la luminance de la couleur la plus claire augmentée de 0,05 par celle de la couleur la plus sombre augmentée de 0,05. Il vaut 1:1 pour deux couleurs identiques et 21:1 pour du noir sur du blanc.',
    'Le niveau AA demande au moins 4,5:1 pour un texte normal et 3:1 pour un grand texte (≥ 18 pt ou 14 pt gras) ; le niveau renforcé AAA demande 7:1 et 4,5:1. Un rapport insuffisant rend le texte illisible pour les personnes malvoyantes, sans que la couleur seule puisse le signaler.',
  ];
  faits.forEach((texte) => wrap.appendChild(mk('p', P + '-fait', texte)));
  wrap.appendChild(mk('p', P + '-limite',
    'Limite falsifiable : ces formules décrivent une perception standard (observateur de référence, illuminant D65) et ne mesurent ni un écran réel ni une déficiences visuelle individuelle. Les matrices de daltonisme sont des approximations 3×3 : elles simulent une famille de troubles, pas le ressenti d’une personne donnée. Le verdict porte sur la couleur seule, pas sur la taille, la graisse ou le voisinage du texte.'));
  wrap.appendChild(mk('p', P + '-defi',
    'Défi — un seul cran de gris peut-il changer le verdict ? (1) Prédiction : le gris 118 passe AA de justesse, le gris 119 doit échouer. (2) Réglage : saisir #767676 puis #777777 comme couleur de texte sur fond blanc. (3) Résultat attendu : le ratio passe de 4,54:1 à 4,48:1, sous le seuil 4,5:1. (4) Falsification : si les deux verdicts restaient identiques, le calcul de luminance ou le seuil serait faux. (5) Débrief : le modèle tient — la proximité du seuil rend la lisibilité très sensible à une variation minime.'));
  return wrap;
}

/* Glossaire : définitions courtes, doublant la première occurrence du texte. */
function staticGlossary() {
  const dl = mk('dl');
  dl.id = P + '-glossaire';
  const entrees = [
    ['Luminance relative', 'Clarté perçue d’une couleur après linéarisation sRGB, de 0 (noir) à 1 (blanc) : L = 0,2126·R + 0,7152·V + 0,0722·B.'],
    ['Rapport de contraste', 'C = (Lclair + 0,05)/(Lsombre + 0,05), de 1:1 (couleurs identiques) à 21:1 (noir sur blanc).'],
    ['AA / AAA', 'Niveaux WCAG 2.1 : AA = 4,5:1 (normal) et 3:1 (grand) ; AAA = 7:1 et 4,5:1.'],
    ['ΔE76', 'Écart perceptif euclidien dans l’espace Lab (illuminant D65) : ≈ 2 à peine perceptible, > 10 très distinct.'],
    ['Daltonisme', 'Déficit de perception des couleurs modélisé ici par une matrice 3×3 appliquée au rouge, vert et bleu linéaires.'],
  ];
  entrees.forEach(([terme, def]) => {
    dl.appendChild(mk('dt', '', terme));
    dl.appendChild(mk('dd', '', def));
  });
  return dl;
}

/* E043-09 : tableau captioné, six couples canoniques, valeurs recalculées. */
function staticTable() {
  const table = mk('table');
  table.id = P + '-table';
  table.appendChild(mk('caption', '',
    'Couples de couleurs de référence : luminances et rapports recalculés par les formules, comparés au seuil AA de 4,5:1 pour un texte normal.'));

  const thead = mk('thead');
  const hr = mk('tr');
  ['Couple (texte / fond)', 'Lm. texte', 'Lm. fond', 'Ratio', 'Verdict AA'].forEach((h) => {
    const th = mk('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = mk('tbody');
  ROWS.forEach((cells) => {
    const tr = mk('tr');
    const th = mk('th', '', cells[0] + ' · ' + cells[1] + ' / ' + cells[2]);
    th.scope = 'row';
    tr.appendChild(th);
    [nf(luminance(cells[1])), nf(luminance(cells[2])), nf(contraste(cells[1], cells[2])) + ':1'].forEach((v) => {
      tr.appendChild(mk('td', '', v));
    });
    const ratio = contraste(cells[1], cells[2]);
    const ok = ratio >= AA_NORMAL;
    tr.appendChild(mk('td', ok ? P + '-ok' : P + '-ko',
      (ok ? '✓ ' : '✗ ') + verdict(ratio, AA_NORMAL)));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function radioSet(id, name, legendTexte, order, dict, current) {
  const fieldset = mk('fieldset');
  fieldset.id = id;
  fieldset.setAttribute('role', 'radiogroup'); /* choix unique, pas d'aria-pressed. */
  const legend = mk('legend', '', legendTexte);
  fieldset.appendChild(legend);
  order.forEach((value) => {
    const lab = mk('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = name;
    radio.id = id + '-' + value;
    radio.value = value;
    radio.checked = current === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(dict[value].label));
    fieldset.appendChild(lab);
  });
  return fieldset;
}

function colorRow(labelText, id, hex) {
  const row = mk('div', P + '-couleur');
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.appendChild(document.createTextNode(labelText + ' : '));
  row.appendChild(label);
  const input = document.createElement('input');
  input.type = 'color';
  input.id = id;
  input.value = hex;
  input.setAttribute('aria-label', labelText + ' (au format hexadécimal)');
  row.appendChild(input);
  const code = mk('span', P + '-hex', hex);
  code.id = id + '-hex';
  row.appendChild(code);
  return { row, input, code };
}

function ensurePanel(ctx) {
  const idPanel = P + '-panel';
  const existant = document.getElementById(idPanel);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      tailles: TAILLE_ORDER.map((t) => document.getElementById(P + '-taille-' + t)),
      sims: SIM_ORDER.map((s) => document.getElementById(P + '-sim-' + s)),
      fg: document.getElementById(P + '-texte'),
      fgHex: document.getElementById(P + '-texte-hex'),
      bg: document.getElementById(P + '-fond'),
      bgHex: document.getElementById(P + '-fond-hex'),
      canvas: document.getElementById(P + '-canvas'),
      readout: document.getElementById(P + '-readout'),
      legend: document.getElementById(P + '-legend'),
      play: document.getElementById(P + '-play'),
    };
  }

  const panel = mk('section', P + '-panel');
  panel.id = idPanel;
  panel.setAttribute('aria-labelledby', P + '-title');

  const title = mk('h2', '', 'Contraste et lisibilité des couleurs');
  title.id = P + '-title';
  const lead = ctx.el('p', '',
    'Ce laboratoire explique pourquoi une couleur peut être belle et pourtant illisible : la luminance, le rapport de contraste, les seuils d’accessibilité, la simulation des daltonismes et l’écart perceptif entre deux teintes.');

  const sizeSet = radioSet(P + '-taille', P + '-taille',
    'Taille du texte (choix unique — fixe le seuil AA)', TAILLE_ORDER, TAILLES, S.taille);
  const simSet = radioSet(P + '-sim', P + '-simulation',
    'Simulation de vision (choix unique)', SIM_ORDER, SIMS, S.sim);
  const fgRow = colorRow('Couleur du texte', P + '-texte', S.fg);
  const bgRow = colorRow('Couleur du fond', P + '-fond', S.bg);

  const canvas = document.createElement('canvas');
  canvas.id = P + '-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire de contraste. Flèches gauche et droite : changer de simulation visuelle ; flèches haut et bas : éclaircir ou assombrir le texte ; plus et moins : éclaircir ou assombrir le fond ; Début et Fin : balayage minimal ou maximal ; Espace : lancer ou arrêter le balayage du fond.');
  canvas.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Home End Space');
  canvas.setAttribute('aria-describedby', P + '-legend');

  const legendTextNode = mk('p', P + '-legend', '');
  legendTextNode.id = P + '-legend';

  /* E043-10 : grandeur textuelle annoncée, avec texte de repli au DOM. */
  const readout = mk('p', P + '-readout',
    'Références : noir L = 0, blanc L = 1, rapport maximum 21:1 ; seuil AA texte normal 4,5:1 (gris 118 = 4,54:1, gris 119 = 4,48:1).');
  readout.id = P + '-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const help = mk('p', P + '-sr',
    'Commandes du laboratoire : boutons radio pour la taille du texte et la simulation visuelle ; sélecteurs de couleur pour le texte et le fond ; flèches gauche et droite sur le graphique pour changer de simulation, flèches haut et bas pour éclaircir ou assombrir le texte, plus et moins pour le fond, Début et Fin pour le balayage, Espace pour lancer ou arrêter l’animation.');
  help.id = P + '-help';
  panel.setAttribute('aria-describedby', help.id);

  const play = mk('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Balayer la luminosité du fond');
  play.type = 'button';
  play.id = P + '-play';
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false'); /* bascule indépendante. */
  play.setAttribute('aria-controls', P + '-canvas');

  panel.append(title, lead, staticFacts(), staticTable(), staticGlossary(), sizeSet, simSet,
    fgRow.row, bgRow.row, canvas, legendTextNode, readout, help, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    tailles: TAILLE_ORDER.map((t) => document.getElementById(P + '-taille-' + t)),
    sims: SIM_ORDER.map((s) => document.getElementById(P + '-sim-' + s)),
    fg: fgRow.input, fgHex: fgRow.code,
    bg: bgRow.input, bgHex: bgRow.code,
    canvas, readout, legend: legendTextNode, play,
  };
}

/* ---------- E043-05 / 06 / 08 : rendu du laboratoire (un seul canvas / frame) ---------- */

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

  const pad = 18;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const bg = bgActif();
  const fgSim = cssRgb(simuler(S.fg, S.sim));
  const bgSim = cssRgb(simuler(bg, S.sim));
  const ratio = contraste(S.fg, bg);
  const seuil = TAILLES[S.taille].seuil;
  const ok = ratio >= seuil;

  /* Zone d'échantillon : texte réel dans sa couleur, sur le fond choisi. */
  const sampleH = Math.round(ih * 0.42);
  g.fillStyle = bgSim;
  g.fillRect(pad, pad, iw, sampleH);
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 1;
  g.strokeRect(pad, pad, iw, sampleH);

  g.fillStyle = fgSim;
  g.font = (S.taille === 'large' ? 'bold 20px' : '15px') + ' sans-serif';
  const gros = nf(ratio) + ':1 — ' + (ok ? 'lisible' : 'illisible');
  g.fillText(gros, pad + 12, pad + (S.taille === 'large' ? 34 : 30));
  g.font = '12px sans-serif';
  g.fillText('Aa Bb Ç é ù — 0123456789', pad + 12, pad + (S.taille === 'large' ? 60 : 52));

  /* E043-05 : jauge de contraste de 1 à 21, repères 3 / 4,5 / 7 en tirets. */
  const gaugeY = pad + sampleH + 30;
  const gaugeH = 14;
  g.fillStyle = 'rgba(255,255,255,.10)';
  g.fillRect(pad, gaugeY, iw, gaugeH);
  g.strokeStyle = 'rgba(255,255,255,.28)';
  g.lineWidth = 1;
  g.strokeRect(pad, gaugeY, iw, gaugeH);

  const repères = [
    { v: AA_LARGE, t: '3:1' },
    { v: AA_NORMAL, t: '4,5:1' },
    { v: AAA_NORMAL, t: '7:1' },
  ];
  repères.forEach((r) => {
    const x = pad + (r.v / RATIO_MAX) * iw;
    g.strokeStyle = 'rgba(244,214,158,.85)';
    g.setLineDash([3, 3]);
    g.beginPath();
    g.moveTo(x, gaugeY - 6);
    g.lineTo(x, gaugeY + gaugeH + 6);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '9px sans-serif';
    g.fillText(r.t, x - 8, gaugeY + gaugeH + 16);
  });

  const fillW = clamp((ratio / RATIO_MAX) * iw, 0, iw);
  g.fillStyle = ok ? 'rgba(150,214,130,.85)' : 'rgba(226,140,120,.85)';
  g.fillRect(pad, gaugeY, fillW, gaugeH);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(pad + fillW, gaugeY - 4);
  g.lineTo(pad + fillW, gaugeY + gaugeH + 4);
  g.stroke();

  /* E043-06 : pastilles d'échantillon reproductibles (graine affichée). */
  const stripY = gaugeY + gaugeH + 24;
  GRAINS.forEach((p) => {
    const x = pad + p.x * iw;
    g.fillStyle = fgSim;
    g.fillRect(x, stripY - p.h / 2, 2, p.h);
  });
  g.fillStyle = 'rgba(244,214,158,.9)';
  g.font = '9px sans-serif';
  g.fillText(seedText(), pad, stripY + 16);

  g.fillStyle = 'rgba(214,207,193,.9)';
  g.font = '10px sans-serif';
  g.fillText('Contraste ' + nf(ratio) + ':1 · seuil ' + nf(seuil) + ':1 · '
    + (ok ? 'conforme' : 'insuffisant') + ' · ' + SIMS[S.sim].label, pad, cssH - pad + 2);
}

/* ---------- E043-03 / 04 / 07 / 10 : grandeurs chiffrées comparées ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const bg = bgActif();
  const Lt = luminance(S.fg);
  const Lf = luminance(bg);
  const ratio = contraste(S.fg, bg);
  const seuil = TAILLES[S.taille].seuil;
  const dE = deltaE(S.fg, bg);
  const ok = ratio >= seuil;

  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const ligne = (texte) => {
    const p = document.createElement('span');
    p.style.display = 'block';
    p.textContent = texte;
    return p;
  };

  n.textContent = '';
  const l1 = document.createElement('span');
  l1.style.display = 'block';
  l1.appendChild(document.createTextNode('Luminance texte '));
  l1.appendChild(fort(nf(Lt)));
  l1.appendChild(document.createTextNode(' · fond ' + nf(Lf) + (S.playing ? ' (balayage)' : '') + ' (réf. noir 0 / blanc 1).'));
  n.appendChild(l1);

  const l2 = document.createElement('span');
  l2.style.display = 'block';
  l2.appendChild(document.createTextNode('Ratio '));
  l2.appendChild(fort(nf(ratio) + ':1'));
  l2.appendChild(document.createTextNode(' comparé au seuil AA ' + TAILLES[S.taille].label.toLowerCase() + ' '));
  l2.appendChild(fort(nf(seuil) + ':1'));
  l2.appendChild(document.createTextNode(' → '));
  l2.appendChild(fort(ok ? 'conforme' : 'insuffisant'));
  n.appendChild(l2);

  n.appendChild(ligne('Écart perceptif ΔE₇₆ ' + nf(dE, 1) + ' ('
    + (dE < 10 ? 'teintes proches' : 'teintes très distinctes') + ') ; vision simulée : '
    + SIMS[S.sim].label + '. ' + seedText() + '.'));
}

function updateLegend() {
  const n = S.nodes.legend;
  if (!n) return;
  n.textContent = 'Zone haute : échantillon de texte dans la couleur choisie. Jauge : contraste de 1 à 21, repères tiretés à 3:1 (grand texte AA), 4,5:1 (texte normal AA) et 7:1 (AAA). Curseur blanc : contraste obtenu. Pastilles reproductibles, ' + seedText() + '. Aucune information ne repose sur la couleur seule : le verdict est écrit.';
}

function syncControls() {
  const n = S.nodes;
  n.tailles.forEach((radio, i) => { if (radio) radio.checked = TAILLE_ORDER[i] === S.taille; });
  n.sims.forEach((radio, i) => { if (radio) radio.checked = SIM_ORDER[i] === S.sim; });
  if (n.fg) n.fg.value = S.fg;
  if (n.bg && !S.playing) n.bg.value = S.bg;
  if (n.fgHex) n.fgHex.textContent = S.fg;
  if (n.bgHex) n.bgHex.textContent = S.playing ? animBg() : S.bg;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Balayer la luminosité du fond';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateLegend();
  updateReadout();
  drawLab();
}

/* ---------- E043-10 : boucle rAF unique, pause document.hidden + hors écran ---------- */

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
  if (!S.onScreen || S.reduced) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen || S.reduced) return;
  if (S.lastTs && S.playing) {
    const dt = Math.min(80, ts - S.lastTs);
    S.sweep = (S.sweep + dt * 0.00022) % 1;
  }
  S.lastTs = ts;
  syncControls();
  if (S.playing && !S.reduced) S.rafId = requestAnimationFrame(tick);
}

/* Écouteurs globaux installés une seule fois. */
function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visBound) {
    S.visBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !S.reduced) startLoop();
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
        if (S.reduced) {
          S.playing = false;
          stopLoop();
        } else if (S.playing) startLoop();
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }

  const cv = S.nodes.canvas;
  if (cv && typeof IntersectionObserver === 'function') {
    if (!S.io) {
      S.io = new IntersectionObserver((entries) => {
        const entry = entries[0];
        S.onScreen = !entry || entry.isIntersecting;
        if (!S.onScreen) stopLoop();
        else if (S.playing && !S.reduced) startLoop();
      }, { threshold: 0.01 });
    }
    if (S.ioCanvas !== cv) {
      if (S.ioCanvas && typeof S.io.unobserve === 'function') S.io.unobserve(S.ioCanvas);
      S.io.observe(cv);
      S.ioCanvas = cv;
      S.onScreen = true;
    }
  }
}

/* Badge textuel idempotent sur la carte existante. */
function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  const idBadge = P + '-badge';
  if (!map || document.getElementById(idBadge)) return;
  const badge = mk('div', P + '-badge',
    'Colorimétrie locale : luminance WCAG, rapport comparé à 4,5:1, daltonismes et écart ΔE76 — ' + seedText() + ', aucune couleur transmise ni calculée sur le réseau.');
  badge.id = idBadge;
  map.appendChild(badge);
}

/* ---------- Point d'entrée unique ---------- */

register('E043', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E043-02 : une seule feuille de style, injectée une seule fois. */
  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.reduced = reduced;
  S.nodes.panel.setAttribute('data-' + P + '-reduced', reduced ? '1' : '0');
  if (reduced) {
    S.playing = false;
    S.sweep = 1;
  }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.tailles.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.taille = radio.value;
        syncControls();
      });
    });
    n.sims.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.sim = radio.value;
        syncControls();
      });
    });
    n.fg.addEventListener('input', () => {
      S.fg = n.fg.value.toLowerCase();
      syncControls();
    });
    n.bg.addEventListener('input', () => {
      if (S.playing) {
        S.playing = false;
        stopLoop();
      }
      S.bg = n.bg.value.toLowerCase();
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing || S.reduced) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = SIM_ORDER.indexOf(S.sim);
        S.sim = SIM_ORDER[(i + step + SIM_ORDER.length) % SIM_ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        S.fg = adjust(S.fg, event.key === 'ArrowUp' ? 12 : -12);
      } else if (event.key === '+' || event.key === '=') {
        S.bg = adjust(S.bg, 12);
        if (S.playing) { S.playing = false; stopLoop(); }
      } else if (event.key === '-' || event.key === '−') {
        S.bg = adjust(S.bg, -12);
        if (S.playing) { S.playing = false; stopLoop(); }
      } else if (event.key === 'Home' || event.key === 'End') {
        S.sweep = event.key === 'Home' ? 0 : 1;
      } else if (event.key === ' ' || event.key === 'Spacebar') {
        S.playing = !S.playing;
        if (!S.playing || S.reduced) stopLoop(); else startLoop();
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
  if (S.playing && !S.reduced) startLoop();
});
