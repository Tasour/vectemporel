import { register } from './registry.js';

/* Lentille E010 — vue GEOGRAPHIE.
 * Thème : océans et mers.
 *
 * Les dix chantiers E010-01 … E010-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E010.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, fieldset) présent dans le DOM même sans animation ;
 * le canvas n'est qu'un laboratoire qui illustre des formules deterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e010';
const PANEL_ID = 'geography-e010-panel';
const TITLE_ID = 'geography-e010-title';
const GRANDEUR_ID = 'geography-e010-grandeur';
const DEPTH_ID = 'geography-e010-depth';
const DEPTH_VALUE_ID = 'geography-e010-depth-value';
const CANVAS_ID = 'geography-e010-canvas';
const READOUT_ID = 'geography-e010-readout';
const PLAY_ID = 'geography-e010-play';
const LEGEND_ID = 'geography-e010-legend';
const TABLE_ID = 'geography-e010-table';
const BADGE_ID = 'geography-e010-badge';

/* Constantes physiques explicites : le modèle est calé sur des valeurs
 * publiques, aucune grandeur n'est fabriquée ni tirée au hasard. */
const H_MAX = 11000;        // m, ordre de grandeur de la fosse la plus profonde
const RHO = 1025;           // kg/m³, masse volumique moyenne de l'eau de mer
const G = 9.81;             // m/s², accélération de la pesanteur
const P0 = 101325;          // Pa, pression atmosphérique de référence
const T_MER = 10;           // °C, température fixée du modèle de célérité
const S_MER = 35;           // psu, salinité fixée du modèle de célérité
const C_AIR = 343;          // m/s, célérité du son dans l'air à 20 °C
const LIGHT_K = 200 / Math.log(100); // m : 1 % de lumière restante vers 200 m

const ZONES = [
  { nom: 'Épipélagique', de: 0, a: 200 },
  { nom: 'Mésopélagique', de: 200, a: 1000 },
  { nom: 'Bathypélagique', de: 1000, a: 4000 },
  { nom: 'Abyssopélagique', de: 4000, a: 6000 },
  { nom: 'Hadal', de: 6000, a: 11000 },
];

const MODES = {
  pression: { label: 'Pression — trait plein', dash: [], axis: 'Pression absolue (atm, échelle logarithmique)' },
  lumiere: { label: 'Lumière — tirets', dash: [7, 5], axis: 'Lumière résiduelle (% de la surface, échelle logarithmique)' },
  son: { label: 'Son — pointillés', dash: [2, 4], axis: 'Célérité du son (m/s, échelle linéaire)' },
};
const ORDER = ['pression', 'lumiere', 'son'];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  grandeur: 'pression',
  depth: 1000,
  playing: false,
  sweep: 1000 / H_MAX,
  lastTs: 0,
  rafId: 0,
  reduced: false,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules deterministes (aucune donnée fabriquée) ---------- */

const fmt = (n, d = 2) => {
  const v = Math.round(n * 10 ** d) / 10 ** d;
  const parts = v.toFixed(d).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  return parts.join(',');
};

const fmtEntier = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');

/* Pression absolue : p(h) = p0 + rho · g · h, exprimée en atmosphères. */
function pression(h) {
  return 1 + (RHO * G * h) / P0;
}

/* Modèle d'atténuation exponentielle calé pour atteindre 1 % vers 200 m. */
function lumiere(h) {
  return 100 * Math.exp(-h / LIGHT_K);
}

/* Relation empirique de Mackenzie (1981) simplifiée : T et S fixés. */
function celerite(h) {
  const T = T_MER;
  const sal = S_MER;
  const D = h;
  return 1448.96 + 4.591 * T - 5.304e-2 * T * T + 2.374e-4 * T * T * T
    + 1.340 * (sal - 35) + 1.630e-2 * D + 1.675e-7 * D * D
    - 1.025e-2 * T * (sal - 35) - 7.139e-13 * T * D * D * D;
}

function measures(h) {
  const p = pression(h);
  const l = lumiere(h);
  const c = celerite(h);
  return { h, p, l, c, ratio: c / C_AIR };
}

function valueFor(mode, h) {
  if (mode === 'pression') return pression(h);
  if (mode === 'lumiere') return lumiere(h);
  return celerite(h);
}

function norm(mode, v) {
  let x;
  if (mode === 'pression') x = Math.log10(v) / Math.log10(1100);
  else if (mode === 'lumiere') x = (Math.log10(Math.max(v, 1e-6)) + 6) / 8;
  else x = (v - 1450) / 250;
  return Math.max(0, Math.min(1, x));
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e010-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e010-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e010-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e010-panel p{margin:5px 0;max-width:68ch}
#geography-e010-panel .geography-e010-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e010-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e010-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e010-table th,#geography-e010-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e010-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e010-grandeur{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e010-grandeur legend{padding:0 4px;color:var(--muted)}
#geography-e010-panel .geography-e010-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e010-panel .geography-e010-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e010-depth{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e010-depth-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e010-canvas{
  display:block;width:100%;height:260px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e010-legend{font-size:10px;color:var(--muted)}
#geography-e010-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e010-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e010-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e010-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e010-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e010-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e010-panel[data-geography-e010-reduced="1"] button,
#geography-e010-panel[data-geography-e010-reduced="1"] .geography-e010-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e010-panel button,.geography-e010-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e010-panel{font-size:10px;padding:9px}
  #geography-e010-canvas{height:220px}
  #geography-e010-panel .geography-e010-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un océan est un vaste bassin profond et relativement ouvert ; une mer est une étendue plus petite, souvent bordée par des continents ou séparée par un seuil. La frontière entre les deux est conventionnelle et graduelle.',
    'Les océans et les mers couvrent environ 71 % de la surface terrestre et contiennent environ 96,5 % de l’eau du globe : ils dominent le bilan hydrique planétaire.',
    'À 10 mètres de profondeur, la pression absolue a déjà doublé (1 atm en surface, environ 2 atm) ; la lumière tombe à 1 % vers 200 m en eau claire, et le son voyage plus de quatre fois plus vite dans l’eau que dans l’air.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e010-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Zones de profondeur : pressions absolues arrondies, calculées depuis 1 atm en surface avec une masse volumique de 1 025 kg/m³ et une pesanteur de 9,81 m/s².';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Zone', 'Profondeur', 'Pression (de → à)'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Épipélagique', '0 – 200 m', '1 → 21 atm'],
    ['Mésopélagique', '200 – 1 000 m', '21 → 100 atm'],
    ['Bathypélagique', '1 000 – 4 000 m', '100 → 398 atm'],
    ['Abyssopélagique', '4 000 – 6 000 m', '398 → 596 atm'],
    ['Hadal', '6 000 – 11 000 m', '596 → 1 093 atm'],
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

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      pressure: document.getElementById('geography-e010-g-pression'),
      light: document.getElementById('geography-e010-g-lumiere'),
      sound: document.getElementById('geography-e010-g-son'),
      depth: document.getElementById(DEPTH_ID),
      depthValue: document.getElementById(DEPTH_VALUE_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e010-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Océans et mers : explorer la colonne d’eau');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Descendre dans l’océan, c’est quitter la lumière en quelques centaines de mètres tandis que la pression croît sans relâche : trois grandeurs suffisent à décrire ce milieu.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = GRANDEUR_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Grandeur mise en avant (choix unique)';
  fieldset.appendChild(legend);
  [['pression', 'Pression'], ['lumiere', 'Lumière'], ['son', 'Son']].forEach(([value, label]) => {
    const lab = ctx.el('label', 'geography-e010-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e010-grandeur';
    radio.id = `geography-e010-g-${value}`;
    radio.value = value;
    radio.checked = S.grandeur === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });

  const sub = ctx.el('h3', '', 'Observer une grandeur selon la profondeur');
  const depthRow = ctx.el('p', '');
  const depthLabel = document.createElement('label');
  depthLabel.setAttribute('for', DEPTH_ID);
  depthLabel.appendChild(document.createTextNode('Profondeur observée : '));
  const depthValue = document.createElement('span');
  depthValue.id = DEPTH_VALUE_ID;
  depthLabel.appendChild(depthValue);
  depthRow.appendChild(depthLabel);

  const depth = document.createElement('input');
  depth.type = 'range';
  depth.id = DEPTH_ID;
  depth.min = '0';
  depth.max = String(H_MAX);
  depth.step = '100';
  depth.value = String(S.depth);
  depth.setAttribute('aria-label', 'Profondeur observée, de 0 à 11 000 mètres, par pas de 100 mètres');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Profil vertical de la colonne d’eau jusqu’à 11 000 mètres. Flèches gauche et droite : changer de grandeur ; flèches haut et bas : modifier la profondeur par pas de 500 mètres ; Début et Fin : surface et fond.');

  const legendText = ctx.el('p', 'geography-e010-legend', MODES[S.grandeur].label + ' · le style de trait distingue la grandeur, indépendamment de la couleur ; les hachures, de plus en plus serrées, distinguent les cinq zones de la surface au fond.');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e010-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter la descente' : '▶ Animer la descente');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sub, depthRow, depth, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  if (aside && typeof aside.insertBefore === 'function') aside.insertBefore(panel, aside.firstChild);
  else if (host && typeof host.appendChild === 'function') host.appendChild(panel);

  return {
    panel, fresh: true,
    pressure: document.getElementById('geography-e010-g-pression'),
    light: document.getElementById('geography-e010-g-lumiere'),
    sound: document.getElementById('geography-e010-g-son'),
    depth, depthValue, canvas, readout, play, legend: legendText,
  };
}

/* ---------- Rendu du laboratoire (une seule grille, un seul canvas) ---------- */

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

  const pad = { l: 64, r: 14, t: 26, b: 20 };
  const iw = Math.max(10, cssW - pad.l - pad.r);
  const ih = Math.max(10, cssH - pad.t - pad.b);
  const yOf = (h) => pad.t + (h / H_MAX) * ih;
  const xOf = (v) => pad.l + norm(S.grandeur, v) * iw;

  /* Bandes de zones : hachures de plus en plus serrées, jamais la couleur seule. */
  ZONES.forEach((zone, i) => {
    const y0 = yOf(zone.de);
    const y1 = yOf(zone.a);
    g.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.10)';
    g.fillRect(pad.l, y0, iw, y1 - y0);
    g.save();
    g.beginPath();
    g.rect(pad.l, y0, iw, y1 - y0);
    g.clip();
    g.strokeStyle = 'rgba(255,255,255,.12)';
    g.lineWidth = 1;
    const step = 16 - i * 2;
    for (let x = pad.l - ih; x < pad.l + iw + ih; x += step) {
      g.beginPath();
      g.moveTo(x, y1);
      g.lineTo(x + (y1 - y0), y0);
      g.stroke();
    }
    g.restore();
    g.strokeStyle = 'rgba(214,207,193,.35)';
    g.setLineDash([3, 4]);
    g.beginPath();
    g.moveTo(pad.l, y1);
    g.lineTo(pad.l + iw, y1);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(214,207,193,.85)';
    g.font = '9px sans-serif';
    g.fillText(zone.nom, pad.l + 5, y0 + 12);
  });

  /* Graduations de profondeur. */
  g.fillStyle = 'rgba(214,207,193,.75)';
  g.font = '9px sans-serif';
  [0, 2000, 4000, 6000, 8000, 10000].forEach((h) => {
    const y = yOf(h);
    g.fillText(fmtEntier(h), 6, y + 3);
    g.strokeStyle = 'rgba(214,207,193,.35)';
    g.beginPath();
    g.moveTo(pad.l - 3, y);
    g.lineTo(pad.l, y);
    g.stroke();
  });
  g.fillText('m', 6, pad.t - 8);

  /* Titre de l'axe horizontal : l'unité et l'échelle sont explicites. */
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(MODES[S.grandeur].axis, pad.l, 12);

  /* Courbe : échantillonnage deterministe de la formule choisie. */
  g.strokeStyle = 'rgba(230,185,111,.95)';
  g.lineWidth = 1.8;
  if (typeof g.setLineDash === 'function') g.setLineDash(MODES[S.grandeur].dash);
  g.beginPath();
  for (let h = 0; h <= H_MAX; h += 100) {
    const x = xOf(valueFor(S.grandeur, h));
    const y = yOf(h);
    if (h === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
  if (typeof g.setLineDash === 'function') g.setLineDash([]);

  /* Repère de profondeur : ligne en tirets + croix, jamais la couleur seule. */
  const my = yOf(S.depth);
  const mx = xOf(valueFor(S.grandeur, S.depth));
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 1.5;
  g.setLineDash([4, 3]);
  g.beginPath();
  g.moveTo(pad.l, my);
  g.lineTo(pad.l + iw, my);
  g.stroke();
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(mx - 6, my); g.lineTo(mx + 6, my);
  g.moveTo(mx, my - 6); g.lineTo(mx, my + 6);
  g.stroke();
  g.font = '10px sans-serif';
  g.textAlign = 'right';
  g.fillText(`${fmtEntier(S.depth)} m`, pad.l + iw - 4, my - 4);
  g.textAlign = 'left';
}

/* ---------- Readout : grandeurs textuelles et comparées à une référence ---------- */

function updateReadout() {
  const m = measures(S.depth);
  const n = S.nodes.readout;
  if (!n) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`À ${fmtEntier(m.h)} m (référence : surface 0 m) — pression absolue : `));
  n.appendChild(fort(`${fmt(m.p)} atm`));
  n.appendChild(document.createTextNode(`, soit ${fmt(m.p, 0)}× la pression de surface ; lumière résiduelle : `));
  n.appendChild(fort(m.l >= 0.01 ? `${fmt(m.l)} %` : '< 0,01 %'));
  n.appendChild(document.createTextNode(` de celle de la surface (1 % vers 200 m) ; célérité du son : `));
  n.appendChild(fort(`${fmtEntier(m.c)} m/s`));
  n.appendChild(document.createTextNode(`, soit ${fmt(m.ratio)}× celle de l’air (343 m/s). `));
  n.appendChild(document.createTextNode('La pression et la lumière varient de plusieurs ordres de grandeur ; la célérité du son, beaucoup moins.'));
}

function updateText() {
  const n = S.nodes;
  if (n.pressure) n.pressure.checked = S.grandeur === 'pression';
  if (n.light) n.light.checked = S.grandeur === 'lumiere';
  if (n.sound) n.sound.checked = S.grandeur === 'son';
  if (n.depth) n.depth.value = String(S.depth);
  if (n.depthValue) n.depthValue.textContent = `${fmtEntier(S.depth)} m`;
  if (n.legend) n.legend.textContent = MODES[S.grandeur].label + ' · le style de trait distingue la grandeur, indépendamment de la couleur ; les hachures, de plus en plus serrées, distinguent les cinq zones de la surface au fond.';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la descente' : '▶ Animer la descente';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
}

function syncControls() {
  updateText();
  drawLab();
}

function setDepth(h) {
  S.depth = Math.max(0, Math.min(H_MAX, Math.round(Number(h) / 100) * 100));
  S.sweep = S.depth / H_MAX;
  syncControls();
}

/* ---------- Boucle rAF unique, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || S.reduced || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced) { stopLoop(); return; }
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing) {
      S.sweep = (S.sweep + dt * 0.00004) % 1;
      const next = Math.min(H_MAX, Math.round((S.sweep * H_MAX) / 100) * 100);
      if (next !== S.depth) {
        S.depth = next;
        updateText();
      }
    }
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners(ctx) {
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
        S.reduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE010Reduced = S.reduced ? '1' : '0';
        if (S.reduced) {
          S.playing = false;
          stopLoop();
          updateText();
        }
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- Badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e010-badge', 'Ce cadre local ne trace que des lieux terrestres : les océans et les mers ne figurent pas dans la projection affichée.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E010', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE010Reduced = S.reduced ? '1' : '0';
  if (S.reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.pressure, n.light, n.sound].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.grandeur = radio.value;
        syncControls();
      });
    });
    n.depth.addEventListener('input', () => setDepth(n.depth.value));
    n.play.addEventListener('click', () => {
      if (S.reduced) S.playing = false;
      else S.playing = !S.playing;
      if (S.playing) {
        S.sweep = S.depth / H_MAX;
        startLoop();
      } else {
        stopLoop();
      }
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = ORDER.indexOf(S.grandeur);
        S.grandeur = ORDER[(i + step + ORDER.length) % ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 500 : -500;
        setDepth(S.depth + step);
      } else if (event.key === 'Home') {
        setDepth(0);
      } else if (event.key === 'End') {
        setDepth(H_MAX);
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') syncControls();
      }
    });
  }

  installGlobalListeners(ctx);
  if (S.playing) startLoop();
});
