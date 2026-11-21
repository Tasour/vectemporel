import { register } from './registry.js';

/* Lentille E043 — vue GEOGRAPHIE.
 * Thème : contraste et lisibilité des couleurs.
 *
 * Les dix chantiers E043-01 … E043-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E043.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le savoir est du texte sémantique réel (titres, paragraphes,
 * tableau captioné, légendes) présent dans le DOM ; le canvas n'est qu'un
 * laboratoire qui illustre des formules déterministes de colorimétrie.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e043';
const PANEL_ID = 'geography-e043-panel';
const TITLE_ID = 'geography-e043-title';
const SIZE_ID = 'geography-e043-taille';
const SIM_ID = 'geography-e043-simulation';
const FG_ID = 'geography-e043-texte';
const BG_ID = 'geography-e043-fond';
const CANVAS_ID = 'geography-e043-canvas';
const READOUT_ID = 'geography-e043-readout';
const LEGEND_ID = 'geography-e043-legend';
const BADGE_ID = 'geography-e043-badge';
const HELP_ID = 'geography-e043-help';
const PLAY_ID = 'geography-e043-play';
const TABLE_ID = 'geography-e043-table';

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
  sweep: 0,
  inView: true,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  observer: null,
  nodes: {},
};

/* ---------- Colorimétrie déterministe (E043-03, E043-04, E043-06, E043-07) ---------- */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function fmt2(n) {
  return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
}
function fmt1(n) {
  return (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
}

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
 * L = 0,2126 R + 0,7152 G + 0,0722 B. */
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
  const Y = (0.2126729 * R + 0.7151522 * G + 0.0721750 * B) / 1.0;
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
  if (ratio >= seuil) return 'conforme';
  return 'insuffisant';
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

/* ---------- Feuille de style unique (E043-02) ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
#${PANEL_ID} .geography-e043-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PANEL_ID} code{font-size:10px;color:var(--gold-bright,#f4d69e)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${TABLE_ID} td.geography-e043-ok{color:#bfe3b0}
#${TABLE_ID} td.geography-e043-ko{color:#f0b4a8}
#${SIZE_ID},#${SIM_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${SIZE_ID} legend,#${SIM_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .geography-e043-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .geography-e043-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} .geography-e043-couleur{
  display:inline-flex;align-items:center;gap:7px;min-height:36px;margin:4px 12px 4px 0;
}
#${PANEL_ID} input[type="color"]{
  width:44px;height:36px;padding:2px;border:1px solid var(--line);border-radius:6px;
  background:transparent;cursor:pointer;
}
#${PANEL_ID} .geography-e043-hex{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e)}
#${CANVAS_ID}{
  display:block;width:100%;height:260px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
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
#${PANEL_ID} .geography-e043-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
}
.geography-e043-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[data-geography-e043-reduced="1"] button,
#${PANEL_ID}[data-geography-e043-reduced="1"] .geography-e043-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.geography-e043-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:220px}
  #${PANEL_ID} .geography-e043-choix{margin-right:4px}
}
`;

/* ---------- Contenu sémantique lisible sans laboratoire (E043-01, E043-09) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'La luminance relative mesure la clarté perçue d’une couleur, de 0 (noir) à 1 (blanc). Elle pondère le rouge, le vert et le bleu par 0,2126, 0,7152 et 0,0722, car l’œil est beaucoup plus sensible au vert.',
    'Le rapport de contraste WCAG se calcule en divisant la luminance de la couleur la plus claire augmentée de 0,05 par celle de la couleur la plus sombre augmentée de 0,05. Il vaut 1:1 pour deux couleurs identiques et 21:1 pour du noir sur du blanc.',
    'Le minimum recommandé est 4,5:1 pour un texte normal et 3:1 pour un grand texte (AA) ; le niveau renforcé AAA demande respectivement 7:1 et 4,5:1. Un rapport insuffisant rend le texte illisible pour les personnes malvoyantes, sans que la couleur seule puisse le signaler.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e043-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticFormules() {
  const wrap = document.createElement('div');
  const items = [
    ['Luminance (E043-03)', 'cₗᵢₙ = c/12,92 si c ≤ 0,04045, sinon ((c+0,055)/1,055)^2,4 ; L = 0,2126·R + 0,7152·V + 0,0722·B.'],
    ['Contraste (E043-04)', 'C = (Lclair + 0,05) / (Lsombre + 0,05), borné entre 1 et 21.'],
    ['Écart perceptif (E043-07)', 'ΔE₇₆ = racine((ΔL)² + (Δa)² + (Δb)²) dans l’espace Lab (illuminant D65) ; un ΔE d’environ 2 est à peine perceptible, au-delà de 10 les couleurs sont très distinctes.'],
    ['Daltonisme (E043-06)', 'Chaque déficit est modélisé par une matrice 3×3 déterministe appliquée au rouge, vert et bleu linéaires : une teinte peut rester lisible par sa luminance même quand sa nuance disparaît.'],
  ];
  items.forEach(([titre, texte]) => {
    const p = document.createElement('p');
    p.className = 'geography-e043-fait';
    const t = document.createElement('strong');
    t.textContent = titre + ' — ';
    p.appendChild(t);
    p.appendChild(document.createTextNode(texte));
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Couples de couleurs de référence : luminances et rapports recalculés par les formules, comparés au seuil AA de 4,5:1 pour un texte normal.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Couple (texte / fond)', 'Lm. texte', 'Lm. fond', 'Ratio', 'Verdict AA'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  ROWS.forEach((cells) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = cells[0] + ' · ' + cells[1] + ' / ' + cells[2];
    tr.appendChild(th);
    [fmt2(luminance(cells[1])), fmt2(luminance(cells[2])), fmt2(contraste(cells[1], cells[2])) + ':1'].forEach((v) => {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    });
    const ok = contraste(cells[1], cells[2]) >= AA_NORMAL;
    const td = document.createElement('td');
    td.className = ok ? 'geography-e043-ok' : 'geography-e043-ko';
    td.textContent = (ok ? '✓ ' : '✗ ') + verdict(contraste(cells[1], cells[2]), AA_NORMAL);
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function radioSet(id, name, legendTexte, order, dict, current) {
  const fieldset = document.createElement('fieldset');
  fieldset.id = id;
  const legend = document.createElement('legend');
  legend.textContent = legendTexte;
  fieldset.appendChild(legend);
  order.forEach((value) => {
    const lab = document.createElement('label');
    lab.className = 'geography-e043-choix';
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
  const row = document.createElement('div');
  row.className = 'geography-e043-couleur';
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
  const code = document.createElement('span');
  code.className = 'geography-e043-hex';
  code.id = id + '-hex';
  code.textContent = hex;
  row.appendChild(code);
  return { row, input, code };
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      tailles: TAILLE_ORDER.map((t) => document.getElementById(SIZE_ID + '-' + t)),
      sims: SIM_ORDER.map((s) => document.getElementById(SIM_ID + '-' + s)),
      fg: document.getElementById(FG_ID),
      fgHex: document.getElementById(FG_ID + '-hex'),
      bg: document.getElementById(BG_ID),
      bgHex: document.getElementById(BG_ID + '-hex'),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      legend: document.getElementById(LEGEND_ID),
      play: document.getElementById(PLAY_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e043-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Contraste et lisibilité des couleurs');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '',
    'Ce laboratoire explique pourquoi une couleur peut être belle et pourtant illisible : la luminance, le rapport de contraste, les seuils d’accessibilité, la simulation des daltonismes et l’écart perceptif entre deux teintes.');

  const sizeSet = radioSet(SIZE_ID, 'geography-e043-taille',
    'Taille du texte (choix unique — fixe le seuil AA)', TAILLE_ORDER, TAILLES, S.taille);
  const simSet = radioSet(SIM_ID, 'geography-e043-simulation',
    'Simulation de vision (choix unique)', SIM_ORDER, SIMS, S.sim);
  const fgRow = colorRow('Couleur du texte', FG_ID, S.fg);
  const bgRow = colorRow('Couleur du fond', BG_ID, S.bg);

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire de contraste. Flèches gauche et droite : changer de simulation visuelle ; flèches haut et bas : éclaircir ou assombrir le texte ; plus et moins : éclaircir ou assombrir le fond ; Espace : lancer ou arrêter le balayage du fond.');

  const legendText = ctx.el('p', 'geography-e043-legend', '');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e043-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const help = ctx.el('p', 'geography-e043-sr',
    'Commandes du laboratoire : boutons radio pour la taille du texte et la simulation visuelle ; sélecteurs de couleur pour le texte et le fond ; flèches gauche et droite sur le graphique pour changer de simulation, flèches haut et bas pour éclaircir ou assombrir le texte, plus et moins pour le fond, Espace pour lancer ou arrêter le balayage.');
  help.id = HELP_ID;
  panel.setAttribute('aria-describedby', help.id);

  const play = ctx.el('button', '', '▶ Balayer la luminosité du fond');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', 'false');
  play.setAttribute('aria-controls', CANVAS_ID);

  panel.append(title, lead, staticFacts(), staticFormules(), sizeSet, simSet,
    fgRow.row, bgRow.row, canvas, legendText, readout, staticTable(), help, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    tailles: TAILLE_ORDER.map((t) => document.getElementById(SIZE_ID + '-' + t)),
    sims: SIM_ORDER.map((s) => document.getElementById(SIM_ID + '-' + s)),
    fg: fgRow.input, fgHex: fgRow.code,
    bg: bgRow.input, bgHex: bgRow.code,
    canvas, readout, legend: legendText, play,
  };
}

/* ---------- Rendu du laboratoire (E043-05, E043-06, E043-08) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

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
  const gros = fmt2(ratio) + ':1 — ' + (ok ? 'lisible' : 'illisible');
  g.fillText(gros, pad + 12, pad + (S.taille === 'large' ? 34 : 30));
  g.font = '12px sans-serif';
  g.fillText('Aa Bb Ç é ù — 0123456789', pad + 12, pad + (S.taille === 'large' ? 60 : 52));

  /* E043-05 : jauge de contraste de 1 à 21, repères 3 / 4,5 / 7 en tirets. */
  const gaugeY = pad + sampleH + 34;
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
    g.moveTo(x, gaugeY - 8);
    g.lineTo(x, gaugeY + gaugeH + 8);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '9px sans-serif';
    g.fillText(r.t, x - 8, gaugeY + gaugeH + 20);
  });

  const fillW = clamp((ratio / RATIO_MAX) * iw, 0, iw);
  g.fillStyle = ok ? 'rgba(150,214,130,.85)' : 'rgba(226,140,120,.85)';
  g.fillRect(pad, gaugeY, fillW, gaugeH);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(pad + fillW, gaugeY - 5);
  g.lineTo(pad + fillW, gaugeY + gaugeH + 5);
  g.stroke();

  g.fillStyle = 'rgba(214,207,193,.9)';
  g.font = '10px sans-serif';
  g.fillText('Contraste ' + fmt2(ratio) + ':1 · seuil ' + fmt2(seuil) + ':1 · '
    + (ok ? 'conforme ' : 'insuffisant ') + SIMS[S.sim].label, pad, cssH - pad - 6);
}

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

  n.textContent = '';
  const strong = (t) => { const s = document.createElement('strong'); s.textContent = t; return s; };
  const add = (t) => n.appendChild(document.createTextNode(t));

  add('Luminance texte ');
  n.appendChild(strong(fmt2(Lt)));
  add(' · fond ' + fmt2(Lf) + (S.playing ? ' (balayage)' : '') + '. Ratio ');
  n.appendChild(strong(fmt2(ratio) + ':1'));
  add('. Seuil AA ' + TAILLES[S.taille].label.toLowerCase() + ' ');
  n.appendChild(strong(fmt2(seuil) + ':1'));
  add(' : ');
  n.appendChild(strong(ok ? 'conforme' : 'insuffisant'));
  add('. Écart perceptif ΔE₇₆ ');
  n.appendChild(strong(fmt1(dE)));
  add(' (' + (dE < 10 ? 'teintes proches' : 'teintes très distinctes') + '). Vision simulée : ' + SIMS[S.sim].label + '.');
}

function updateLegend() {
  const n = S.nodes.legend;
  if (!n) return;
  n.textContent = 'Zone haute : échantillon de texte dans la couleur choisie. Jauge : contraste de 1 à 21, repères tiretés à 3:1 (grand texte AA), 4,5:1 (texte normal AA) et 7:1 (AAA). Curseur blanc : contraste obtenu. Aucune information ne repose sur la couleur seule : le verdict est écrit.';
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

/* ---------- E043-10 : boucle rAF unique, pause et accessibilité ---------- */

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
  const reduced = typeof ctxReducedMotion === 'function' ? ctxReducedMotion() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (!reduced) S.sweep = (S.sweep + dt * 0.00022) % 1;
  }
  S.lastTs = ts;
  syncControls();
  if (!reduced) S.rafId = requestAnimationFrame(tick);
}

let ctxReducedMotion = null;
let ctxLayout = null;
let ctxStage = null;

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
        if (panel) panel.dataset.geographyE043Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
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
}

function addMapBadge() {
  const scope = ctxLayout || ctxStage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = document.createElement('div');
  badge.className = 'geography-e043-badge';
  badge.id = BADGE_ID;
  badge.textContent = 'Colorimétrie locale : luminance WCAG, rapport de contraste comparé à 4,5:1, simulation des daltonismes et écart ΔE76 — aucune couleur transmise ni calculée sur le réseau.';
  map.appendChild(badge);
}

function adjust(hex, delta) {
  const c = hexToRgb(hex);
  return rgbToHex({ r: c.r + delta, g: c.g + delta, b: c.b + delta });
}

/* ---------- Point d'entrée ---------- */

register('E043', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctxStage = ctx.stage;
  ctxLayout = ctx.layout || ctx.stage;
  ctxReducedMotion = typeof ctx.reducedMotion === 'function' ? () => !!ctx.reducedMotion() : () => false;

  /* E043-02 : une seule feuille de style, injectée une seule fois. */
  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge();

  const reduced = ctxReducedMotion();
  S.nodes.panel.dataset.geographyE043Reduced = reduced ? '1' : '0';
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
      if (ctxReducedMotion()) {
        S.playing = false;
        stopLoop();
        syncControls();
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
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
        if (ctxReducedMotion()) {
          S.playing = false;
          stopLoop();
        } else {
          S.playing = !S.playing;
          if (!S.playing) stopLoop(); else startLoop();
        }
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
