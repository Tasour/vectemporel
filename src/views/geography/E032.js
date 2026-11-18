import { register } from './registry.js';

/* Lentille E032 — vue GEOGRAPHIE.
 * Thème : précipitations et isohyètes.
 *
 * Les dix chantiers E032-01 … E032-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E032.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, fieldset) présent dans le DOM même sans animation ;
 * le canvas n'est qu'un laboratoire qui trace des isohyètes calculées par
 * marching squares sur un champ analytique déterministe et explicité.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e032';
const PANEL_ID = 'geography-e032-panel';
const TITLE_ID = 'geography-e032-title';
const MODE_ID = 'geography-e032-mode';
const SEUIL_ID = 'geography-e032-seuil';
const SEUIL_OUT_ID = 'geography-e032-seuil-value';
const CANVAS_ID = 'geography-e032-canvas';
const READOUT_ID = 'geography-e032-readout';
const PLAY_ID = 'geography-e032-play';
const LEGEND_ID = 'geography-e032-legend';
const BADGE_ID = 'geography-e032-badge';
const TABLE_ID = 'geography-e032-table';
const MODEL_ID = 'geography-e032-modele';

const RAD = Math.PI / 180;

/* Domaine schématique : longitude −180°…180°, latitude −60°…75°. */
const LON_MIN = -180;
const LON_MAX = 180;
const LAT_MIN = -60;
const LAT_MAX = 75;
const NX = 61; /* pas de 6° en longitude */
const NY = 28; /* pas de 5° en latitude */
const NCELLS = NX * NY;

const MODES = {
  rep: {
    label: 'repères (250 · 500 · 1 000 · 1 500 · 2 000 mm)',
    levels: [250, 500, 1000, 1500, 2000],
  },
  dense: {
    label: 'dense (pas de 250 mm)',
    levels: [250, 500, 750, 1000, 1250, 1500, 1750, 2000],
  },
};

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  seuil: 1000,
  mode: 'rep',
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
  grid: null,
  stats: null,
};

/* ---------- Champ de précipitations déterministe (E032-03) ----------
 * Modèle schématique affiché tel quel dans le panneau. Aucune donnée
 * observée n'est chargée : chaque nombre affiché est recalculé ici.
 * P(lat, lon) en mm/an, lat et lon en degrés.
 */
function precipitation(lat, lon) {
  const itcz = 2600 * Math.exp(-Math.pow((lat - 5) / 13, 2));
  const midN = 800 * Math.exp(-Math.pow((lat - 50) / 14, 2));
  const midS = 700 * Math.exp(-Math.pow((lat + 48) / 14, 2));
  const continentalite = 0.6 + 0.4 * Math.cos((lon + 20) * RAD);
  const orographie = 550 * Math.exp(-Math.pow((lon + 70) / 18, 2))
    * Math.exp(-Math.pow((lat - 22) / 22, 2));
  return 150 + (itcz + midN + midS) * continentalite + orographie;
}

const lonOf = (i) => LON_MIN + (LON_MAX - LON_MIN) * i / (NX - 1);
const latOf = (j) => LAT_MIN + (LAT_MAX - LAT_MIN) * j / (NY - 1);
const valueAt = (i, j) => S.grid[j * NX + i];

function ensureGrid() {
  if (S.grid) return;
  const g = new Float64Array(NCELLS);
  for (let j = 0; j < NY; j += 1) {
    for (let i = 0; i < NX; i += 1) {
      g[j * NX + i] = precipitation(latOf(j), lonOf(i));
    }
  }
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (let k = 0; k < g.length; k += 1) {
    const v = g[k];
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  S.grid = g;
  S.stats = { min, max, mean: sum / g.length };
}

function statsFor(seuil) {
  ensureGrid();
  let above = 0;
  for (let k = 0; k < S.grid.length; k += 1) {
    if (S.grid[k] >= seuil) above += 1;
  }
  return {
    ...S.stats,
    aboveCount: above,
    aboveFrac: above / S.grid.length,
    cellCount: S.grid.length,
    sample: precipitation(5, 0),
  };
}

/* ---------- Formatage français ---------- */
const fmt0 = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e032-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e032-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e032-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e032-panel p{margin:5px 0;max-width:70ch}
#geography-e032-panel .geography-e032-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e032-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e032-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e032-table th,#geography-e032-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e032-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e032-formule{
  display:block;margin:6px 0;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(0,0,0,.22);color:var(--ink-soft,#d7d1c6);font-size:10px;
  line-height:1.7;overflow-wrap:anywhere;font-variant-numeric:tabular-nums;
}
#geography-e032-mode{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e032-mode legend{padding:0 4px;color:var(--muted)}
#geography-e032-panel .geography-e032-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e032-panel .geography-e032-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e032-seuil{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e032-seuil-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e032-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e032-legend{font-size:10px;color:var(--muted)}
#geography-e032-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e032-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e032-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e032-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e032-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e032-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e032-panel[data-geography-e032-reduced="1"] button,
#geography-e032-panel[data-geography-e032-reduced="1"] .geography-e032-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e032-panel button,.geography-e032-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e032-panel{font-size:10px;padding:9px}
  #geography-e032-canvas{height:190px}
  #geography-e032-panel .geography-e032-choix{margin-right:4px}
}
`;

/* ---------- Texte sémantique, lisible sans animation ni interaction ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une précipitation est l’eau, liquide ou solide (pluie, neige, grêle), qui tombe du ciel et atteint le sol. Le cumul annuel s’exprime en millimètres de hauteur d’eau : 1 000 mm/an représentent une colonne d’eau d’un mètre étalée sur l’année.',
    'Une isohyète est une courbe qui relie, sur une carte, tous les points recevant la même quantité de précipitations pendant une période donnée. Ici la période est l’année entière : l’isohyète 1 000 joint les lieux dont le cumul annuel vaut 1 000 mm.',
    'Deux isohyètes de niveaux différents ne se croisent jamais : un même point ne peut pas avoir deux cumuls annuels distincts. Elles se referment en boucles autour des zones humides ou sortent par le bord de la carte ; leur espacement indique le gradient de pluviométrie.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e032-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Repères conventionnels indicatifs de cumul annuel — seuils généraux, pas des mesures locales.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Isohyète (mm/an)', 'Repère indicatif', 'Lecture'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['250', 'Aride', 'Déficit d’eau presque permanent'],
    ['500', 'Semi-aride', 'Pluies rares et irrégulières'],
    ['1 000', 'Tempéré humide', 'Réserve annuelle confortable'],
    ['1 500', 'Humide', 'Pluies abondantes et réparties'],
    ['2 000', 'Très humide', 'Cumuls annuels exceptionnels'],
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

function staticModel() {
  const wrap = document.createElement('div');
  const h3 = document.createElement('h3');
  h3.textContent = 'Le modèle schématique, à visage découvert';
  const intro = document.createElement('p');
  intro.textContent = 'Aucune donnée mesurée n’est chargée. Le labyrinthe de courbes ci-dessous vient d’une formule unique, affichée ici pour que chacun puisse la discuter et la recomputer.';
  const formule = document.createElement('p');
  formule.id = MODEL_ID;
  formule.className = 'geography-e032-formule';
  formule.textContent = 'P(lat, lon) = 150 + (2 600·e^−((lat−5)/13)² + 800·e^−((lat−50)/14)² + 700·e^−((lat+48)/14)²) · (0,60 + 0,40·cos(lon+20°)) + 550·e^−((lon+70)/18)² · e^−((lat−22)/22)²  — P en mm/an, lat et lon en degrés.';
  const suite = document.createElement('p');
  suite.textContent = 'Cette écriture place une zone de convergence intertropicale humide vers 5° de latitude, un facteur de continentalité qui assèche les environs de 30°, un retour des pluies vers 50° (vents d’ouest) et un relief synthétique à 70° de longitude ouest. Les isohyètes sont obtenues par interpolation linéaire sur une grille régulière, puis tracées par la méthode des carrés marchants. Chaque chiffre du lectureur est recalculé depuis cette formule.';
  wrap.append(h3, intro, formule, suite);
  return wrap;
}

/* ---------- Construction du panneau ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      rep: document.getElementById('geography-e032-mode-rep'),
      dense: document.getElementById('geography-e032-mode-dense'),
      seuil: document.getElementById(SEUIL_ID),
      seuilOut: document.getElementById(SEUIL_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e032-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Précipitations et isohyètes');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Lire une carte de pluviométrie, c’est lire des courbes d’égale précipitation : leur niveau, leur forme et leur espacement racontent où l’eau tombe, où elle manque, et à quelle vitesse le climat change d’un lieu à l’autre.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = MODE_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Jeu d’isohyètes tracées (choix unique)';
  fieldset.appendChild(legend);
  [['rep', MODES.rep.label], ['dense', MODES.dense.label]].forEach(([value, label]) => {
    const lab = ctx.el('label', 'geography-e032-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e032-mode';
    radio.id = `geography-e032-mode-${value}`;
    radio.value = value;
    radio.checked = S.mode === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });

  const sub = ctx.el('h3', '', 'Mettre une isohyète en évidence');
  const seuilRow = ctx.el('p', '');
  const seuilLabel = document.createElement('label');
  seuilLabel.setAttribute('for', SEUIL_ID);
  seuilLabel.appendChild(document.createTextNode('Niveau mis en évidence : '));
  const seuilOut = document.createElement('span');
  seuilOut.id = SEUIL_OUT_ID;
  seuilLabel.appendChild(seuilOut);
  seuilRow.appendChild(seuilLabel);

  const seuil = document.createElement('input');
  seuil.type = 'range';
  seuil.id = SEUIL_ID;
  seuil.min = '250';
  seuil.max = '2000';
  seuil.step = '250';
  seuil.value = String(S.seuil);
  seuil.setAttribute('aria-label', 'Niveau d’isohyète mis en évidence, de 250 à 2 000 millimètres par an, par pas de 250');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Carte schématique des isohyètes annuelles. Le trait plein et les tirets alternent selon le niveau ; l’isohyète mise en évidence est plus épaisse et étiquetée. Flèches gauche et droite : changer le niveau ; flèches haut et bas : changer le jeu de courbes.');

  const legendText = ctx.el('p', 'geography-e032-legend');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e032-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le curseur de lecture');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), staticModel(), fieldset,
    sub, seuilRow, seuil, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    rep: document.getElementById('geography-e032-mode-rep'),
    dense: document.getElementById('geography-e032-mode-dense'),
    seuil, seuilOut, canvas, readout, play, legend: legendText,
  };
}

/* ---------- Marching squares : segmentation d'une cellule (E032-06) ---------- */

function fraction(v1, v2, level) {
  const den = v2 - v1;
  return Math.abs(den) < 1e-9 ? 0.5 : (level - v1) / den;
}

function cellSegments(i, j, level) {
  const a = valueAt(i, j);       // bas-gauche
  const b = valueAt(i + 1, j);   // bas-droite
  const c = valueAt(i + 1, j + 1); // haut-droite
  const d = valueAt(i, j + 1);   // haut-gauche
  const code = (a >= level ? 1 : 0) | (b >= level ? 2 : 0)
    | (c >= level ? 4 : 0) | (d >= level ? 8 : 0);
  if (code === 0 || code === 15) return [];

  const x0 = lonOf(i);
  const x1 = lonOf(i + 1);
  const y0 = latOf(j);
  const y1 = latOf(j + 1);
  const bottom = () => ({ lon: x0 + (x1 - x0) * fraction(a, b, level), lat: y0 });
  const right = () => ({ lon: x1, lat: y0 + (y1 - y0) * fraction(b, c, level) });
  const top = () => ({ lon: x0 + (x1 - x0) * fraction(d, c, level), lat: y1 });
  const left = () => ({ lon: x0, lat: y0 + (y1 - y0) * fraction(a, d, level) });
  const seg = (p, q) => [p, q];
  const centre = (a + b + c + d) / 4; // désambiguïsation des selles

  switch (code) {
    case 1: return [seg(left(), bottom())];
    case 2: return [seg(bottom(), right())];
    case 3: return [seg(left(), right())];
    case 4: return [seg(right(), top())];
    case 5: return centre >= level
      ? [seg(left(), top()), seg(bottom(), right())]
      : [seg(left(), bottom()), seg(right(), top())];
    case 6: return [seg(bottom(), top())];
    case 7: return [seg(left(), top())];
    case 8: return [seg(left(), top())];
    case 9: return [seg(bottom(), top())];
    case 10: return centre >= level
      ? [seg(left(), bottom()), seg(right(), top())]
      : [seg(bottom(), right()), seg(left(), top())];
    case 11: return [seg(right(), top())];
    case 12: return [seg(left(), right())];
    case 13: return [seg(bottom(), right())];
    case 14: return [seg(left(), bottom())];
    default: return [];
  }
}

/* ---------- Rendu du laboratoire (un seul canvas, une seule frame) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;
  ensureGrid();

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 230;
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
  const ih = Math.max(10, cssH - pad * 2 - 12);
  const toPx = (p) => [
    pad + ((p.lon - LON_MIN) / (LON_MAX - LON_MIN)) * iw,
    pad + ((LAT_MAX - p.lat) / (LAT_MAX - LAT_MIN)) * ih,
  ];

  /* cadre et graticule de repère */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);
  g.strokeStyle = 'rgba(214,207,193,.14)';
  g.beginPath();
  for (let lon = -180; lon <= 180; lon += 30) {
    const [x] = toPx({ lon, lat: 0 });
    g.moveTo(x, pad); g.lineTo(x, pad + ih);
  }
  for (let lat = -60; lat <= 75; lat += 15) {
    const [, y] = toPx({ lon: 0, lat });
    g.moveTo(pad, y); g.lineTo(pad + iw, y);
  }
  g.stroke();

  /* isohyètes : niveau pair en trait plein, niveau impair en tirets */
  const levels = MODES[S.mode].levels;
  levels.forEach((level, idx) => {
    const high = level === S.seuil;
    g.strokeStyle = high ? 'rgba(244,214,158,.98)' : 'rgba(214,207,193,.62)';
    g.lineWidth = high ? 2.4 : 1.2;
    g.setLineDash(high ? [] : (idx % 2 ? [5, 4] : []));
    g.beginPath();
    let labelPt = null;
    for (let j = 0; j < NY - 1; j += 1) {
      for (let i = 0; i < NX - 1; i += 1) {
        const segs = cellSegments(i, j, level);
        for (let s = 0; s < segs.length; s += 1) {
          const [p, q] = segs[s];
          const [x1, y1] = toPx(p);
          const [x2, y2] = toPx(q);
          g.moveTo(x1, y1); g.lineTo(x2, y2);
          if (!labelPt && i % 7 === 3 && j % 5 === 2) {
            labelPt = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
          }
        }
      }
    }
    g.stroke();

    /* étiquette numérique portée par la courbe (jamais la couleur seule) */
    if (labelPt) {
      const txt = fmt0(level);
      g.setLineDash([]);
      g.font = '10px sans-serif';
      const w = g.measureText(txt).width;
      const bx = Math.min(cssW - w - 8, Math.max(3, labelPt.x - 3));
      const by = Math.min(cssH - 16, Math.max(3, labelPt.y - 12));
      g.fillStyle = 'rgba(8,12,18,.86)';
      g.fillRect(bx, by, w + 6, 13);
      g.fillStyle = high ? 'rgba(244,214,158,1)' : 'rgba(230,224,210,.95)';
      g.fillText(txt, bx + 3, by + 10);
    }
  });
  g.setLineDash([]);

  /* curseur de lecture mobile : position déterministe = f(S.sweep) */
  const sweepLon = LON_MIN + S.sweep * (LON_MAX - LON_MIN);
  const [sx] = toPx({ lon: sweepLon, lat: 0 });
  g.strokeStyle = 'rgba(255,255,255,.85)';
  g.lineWidth = 1.4;
  g.setLineDash([4, 4]);
  g.beginPath();
  g.moveTo(sx, pad); g.lineTo(sx, pad + ih);
  g.stroke();
  g.setLineDash([]);
  const lu = precipitation(5, sweepLon);
  const curseurTexte = `Lecture 5°N · ${Math.round(sweepLon)}° : ${fmt0(lu)} mm/an`;
  g.font = '10px sans-serif';
  const cw = g.measureText(curseurTexte).width;
  const cx = Math.min(cssW - cw - 6, Math.max(4, sx + 4));
  g.fillStyle = 'rgba(8,12,18,.86)';
  g.fillRect(cx - 2, pad + 3, cw + 5, 13);
  g.fillStyle = 'rgba(255,255,255,.92)';
  g.fillText(curseurTexte, cx, pad + 13);

  /* graduations des axes */
  g.fillStyle = 'rgba(214,207,193,.72)';
  g.font = '10px sans-serif';
  [-180, -90, 0, 90, 180].forEach((lon) => {
    const [x] = toPx({ lon, lat: 0 });
    g.fillText(`${lon}°`, Math.min(cssW - 28, Math.max(2, x - 9)), cssH - 4);
  });
  [-60, 0, 75].forEach((lat) => {
    const [, y] = toPx({ lon: 0, lat });
    g.fillText(`${lat}°`, 2, Math.min(cssH - 2, Math.max(11, y + 3)));
  });
}

/* ---------- Grandeurs chiffrées et statut (E032-07) ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const st = statsFor(S.seuil);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Sur le modèle schématique : cumuls de '));
  n.appendChild(fort(`${fmt0(st.min)} à ${fmt0(st.max)} mm/an`));
  n.appendChild(document.createTextNode(', moyenne '));
  n.appendChild(fort(`${fmt0(st.mean)} mm/an`));
  n.appendChild(document.createTextNode(`. Au seuil de référence de `));
  n.appendChild(fort(`${fmt0(S.seuil)} mm/an`));
  n.appendChild(document.createTextNode(`, ${st.aboveCount} points de grille sur ${st.cellCount}, soit `));
  n.appendChild(fort(`${fmt1(st.aboveFrac * 100)} %`));
  n.appendChild(document.createTextNode(' de la surface, dépassent ce niveau. À titre de point fixe vérifiable : P(5°N, 0°) = '));
  n.appendChild(fort(`${fmt0(st.sample)} mm/an`));
  n.appendChild(document.createTextNode('.'));
}

function syncControls() {
  const n = S.nodes;
  if (n.rep) n.rep.checked = S.mode === 'rep';
  if (n.dense) n.dense.checked = S.mode === 'dense';
  if (n.seuil) n.seuil.value = String(S.seuil);
  if (n.seuilOut) n.seuilOut.textContent = `${fmt0(S.seuil)} mm/an`;
  if (n.legend) {
    n.legend.textContent = `Jeu ${MODES[S.mode].label}. Trait plein et tirets alternent indépendamment de la couleur ; l’isohyète ${fmt0(S.seuil)} mm/an est épaissie et étiquetée. Deux isohyètes de niveaux différents ne se croisent jamais.`;
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le curseur de lecture';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
}

/* ---------- Boucle rAF unique, pause sur document.hidden (E032-08) ---------- */

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
  const reduced = ctxReduced();
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00006) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

/* Mémoïsé au point d'entrée : évite de recalculer matchMedia à chaque frame. */
let reducedGetter = () => false;
function ctxReduced() { return reducedGetter(); }

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
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE032Reduced = mq.matches ? '1' : '0';
        if (mq.matches) { S.playing = false; stopLoop(); }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- Badge de mise en garde sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e032-badge', 'Cumuls annuels schématiques calculés par un modèle analytique — aucune donnée mesurée chargée.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E032', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  reducedGetter = typeof ctx.reducedMotion === 'function'
    ? () => !!ctx.reducedMotion()
    : () => false;

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = reducedGetter();
  S.nodes.panel.dataset.geographyE032Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.rep, n.dense].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.mode = radio.value;
        syncControls();
      });
    });
    n.seuil.addEventListener('input', () => {
      S.seuil = Math.max(250, Math.min(2000, Math.round(Number(n.seuil.value) / 250) * 250));
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
        const step = event.key === 'ArrowRight' ? 250 : -250;
        S.seuil = Math.max(250, Math.min(2000, S.seuil + step));
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        S.mode = event.key === 'ArrowUp' ? 'dense' : 'rep';
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
  if (S.playing) startLoop();
});
