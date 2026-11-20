import { register } from './registry.js';
import { currentCountry } from '../../../domain/store.js';

/*
 * Lentille E002 — SECONDE PASSE (V2) : graticule et laboratoire canvas.
 *
 * Les dix chantiers (E002-01 … E002-10) sont réellement implémentés ci-dessous.
 * Le dessin est un laboratoire CANVAS qui illustre des formules déterministes
 * (projection directe, projection inverse, choix du pas, degrés multiples du
 * pas). Aucune coordonnée n'est inventée : les bornes et le contour viennent de
 * `currentCountry()` lu en lecture seule. Tout le contenu pédagogique est un
 * texte sémantique réel (h2/h3/p/table/fieldset/label) indexable sans animation.
 *
 * Un seul register, une seule feuille CSS, tous les ids préfixés
 * `geography-v2-e002-` (aucune collision avec la passe 1 `geography-e002-`).
 * Aucun journal de débogage, aucun appel réseau, aucune valeur aléatoire, une
 * seule boucle rAF (pause sur document.hidden et sur ctx.reducedMotion()).
 * Français intégral.
 */

const CSS_ID = 'geography-v2-e002';

const ID = {
  panel: 'geography-v2-e002-panel',
  title: 'geography-v2-e002-title',
  intro: 'geography-v2-e002-intro',
  canvas: 'geography-v2-e002-canvas',
  canvasDesc: 'geography-v2-e002-canvas-desc',
  formulaTitle: 'geography-v2-e002-formula-title',
  formula: 'geography-v2-e002-formula',
  tableTitle: 'geography-v2-e002-table-title',
  table: 'geography-v2-e002-table',
  density: 'geography-v2-e002-density',
  normal: 'geography-v2-e002-density-normal',
  dense: 'geography-v2-e002-density-dense',
  toggle: 'geography-v2-e002-toggle',
  lonPrev: 'geography-v2-e002-lon-prev',
  lonNext: 'geography-v2-e002-lon-next',
  latPrev: 'geography-v2-e002-lat-prev',
  latNext: 'geography-v2-e002-lat-next',
  cursor: 'geography-v2-e002-cursor',
  readout: 'geography-v2-e002-readout',
  status: 'geography-v2-e002-status',
  note: 'geography-v2-e002-note',
};

/* Constantes de projection, identiques à celles de la vue d'origine. */
const W = 900;
const H = 620;
const REF_STEP = 15; /* pas de référence, candidat à la comparaison chiffrée */
const MAX_DPR = 2;   /* densité de pixels plafonnée (performance) */
const STEPS = [1, 2, 5, 10, 20, 30]; /* pas candidats, choisis sans aléa */

/* État module : survit au remplacement du DOM par la coque (E002-10). */
const S = {
  visible: true,
  density: 'normal',       /* 'normal' | 'dense' : choix unique (radiogroup) */
  lonIndex: -1,
  latIndex: -1,
  bounds: null,
  outline: [],
  boundsKey: '',
  lons: [],
  lats: [],
  stepLon: 1,
  stepLat: 1,
  nodes: null,
  cells: {},
  raf: 0,
  reduced: false,
  listenersInstalled: false,
};

/* Une seule feuille, injectée via ctx.css (garde d'id dans registry.js).
   Méridiens et parallèles se distinguent par le tracé et le texte, jamais par
   la seule couleur ; cibles tactiles ≥ 36 px ; focus visible. */
const CSS = `
.geography-v2-e002-panel{
  position:sticky; bottom:0; z-index:4;
  margin:16px 0 0; padding:12px;
  border:1px solid var(--line); border-radius:9px;
  background:rgba(8,11,16,.96); color:var(--ink-soft,#d7d1c6);
  font-size:12px; line-height:1.55;
}
.geography-v2-e002-panel .geography-v2-e002-title{
  margin:0 0 8px; color:var(--gold-bright,#f4d69e);
  font-size:14px; font-weight:700; letter-spacing:.02em;
}
.geography-v2-e002-panel h3{
  margin:12px 0 4px; color:var(--gold,#e6b96f);
  font-size:12px; font-weight:700;
}
.geography-v2-e002-panel p{ margin:0 0 8px; }
.geography-v2-e002-panel .geography-v2-e002-intro,
.geography-v2-e002-panel .geography-v2-e002-formula,
.geography-v2-e002-panel .geography-v2-e002-note{ font-size:11px; line-height:1.6; }
.geography-v2-e002-panel .geography-v2-e002-canvas{
  display:block; width:100%; height:auto; margin:4px 0 6px;
  border:1px solid var(--line); border-radius:7px; background:#0b1017;
  touch-action:manipulation;
}
.geography-v2-e002-panel .geography-v2-e002-canvas:focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e); outline-offset:2px;
}
.geography-v2-e002-panel .geography-v2-e002-table{
  width:100%; margin:4px 0 8px; border-collapse:collapse;
  font-size:11px; font-variant-numeric:tabular-nums;
}
.geography-v2-e002-panel .geography-v2-e002-table caption{
  margin-bottom:4px; color:var(--muted,#a8a198); font-size:10px; text-align:left;
}
.geography-v2-e002-panel .geography-v2-e002-table th,
.geography-v2-e002-panel .geography-v2-e002-table td{
  padding:3px 6px; border:1px solid var(--line); text-align:left;
}
.geography-v2-e002-panel .geography-v2-e002-table thead th{ color:var(--gold-bright,#f4d69e); }
.geography-v2-e002-panel .geography-v2-e002-table td{ color:var(--gold-bright,#f4d69e); }
.geography-v2-e002-panel .geography-v2-e002-row{ display:flex; flex-wrap:wrap; gap:6px; margin:0 0 8px; }
.geography-v2-e002-panel .geography-v2-e002-btn{
  flex:1 1 auto; min-width:0; width:auto; min-height:36px; margin:0;
  padding:6px 8px; border:1px solid var(--line); border-radius:7px;
  background:var(--surface-2,#10151d); color:inherit; font:inherit;
  font-size:11px; cursor:pointer; touch-action:manipulation;
}
.geography-v2-e002-panel .geography-v2-e002-btn:hover{
  border-color:var(--gold); color:var(--gold-bright);
}
.geography-v2-e002-panel .geography-v2-e002-btn[aria-pressed="true"]{
  border-color:var(--gold); background:rgba(230,185,111,.16); color:var(--gold-bright);
}
.geography-v2-e002-panel .geography-v2-e002-btn:focus-visible,
.geography-v2-e002-panel input:focus-visible{
  outline:3px solid var(--gold-bright,#f4d69e); outline-offset:2px;
}
.geography-v2-e002-panel fieldset{
  margin:0 0 8px; padding:4px 8px 6px; border:1px solid var(--line); border-radius:7px;
}
.geography-v2-e002-panel legend{ padding:0 4px; color:var(--gold,#e6b96f); font-size:11px; }
.geography-v2-e002-panel .geography-v2-e002-choice{
  display:inline-flex; align-items:center; gap:5px; min-height:26px;
  margin-right:12px; font-size:11px;
}
.geography-v2-e002-panel .geography-v2-e002-choice input{
  width:18px; height:18px; accent-color:var(--gold,#e6b96f);
}
.geography-v2-e002-panel .geography-v2-e002-readout strong{ color:var(--gold-bright,#f4d69e); }
.geography-v2-e002-panel .geography-v2-e002-cursor{
  color:var(--muted,#a8a198); font-size:11px; font-variant-numeric:tabular-nums;
}
@media (max-width:620px){
  .geography-v2-e002-panel{ position:static; }
  .geography-v2-e002-panel .geography-v2-e002-btn{ flex:1 1 44%; }
}
@media (forced-colors:active){
  .geography-v2-e002-panel{ border:1px solid CanvasText; }
  .geography-v2-e002-panel .geography-v2-e002-btn[aria-pressed="true"]{
    outline:2px solid Highlight;
  }
}
`;

/* --- utilitaires déterministes (aucun aléa, aucune donnée fabriquée) ------ */

function fr(value, digits) {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(digits).replace('.', ',');
}

function formatDegree(value, isLon) {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.abs(value);
  if (rounded === 0) return '0°';
  const hemisphere = isLon ? (value < 0 ? 'O' : 'E') : (value < 0 ? 'S' : 'N');
  return `${fr(rounded, rounded % 1 === 0 ? 0 : 1)}° ${hemisphere}`;
}

function validBounds(bounds) {
  if (!bounds) return false;
  return [bounds.minLon, bounds.maxLon, bounds.minLat, bounds.maxLat]
    .every((n) => Number.isFinite(n))
    && bounds.maxLon > bounds.minLon && bounds.maxLat > bounds.minLat;
}

/* E002-03 : le pas est choisi depuis l'étendue réelle, jamais au hasard. */
function chooseStep(span, dense) {
  const target = dense ? 10 : 5;
  let index = STEPS.length - 1;
  for (let i = 0; i < STEPS.length; i += 1) {
    if (span / STEPS[i] <= target) { index = i; break; }
  }
  while (index > 0 && span / STEPS[index] < 2) index -= 1; /* au moins deux traits */
  return STEPS[index];
}

/* Degrés multiples du pas tombant strictement dans l'emprise ; plafond borné. */
function degreesBetween(min, max, step) {
  const out = [];
  const first = Math.ceil((min + 1e-9) / step) * step;
  for (let value = first; value <= max - 1e-9 && out.length < 16; value += step) {
    out.push(Math.round(value * 1e6) / 1e6);
  }
  return out;
}

/* E002-01 : projection directe et inverse, formules déterministes. */
function project(lon, lat, bounds) {
  return {
    x: ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * W,
    y: ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * H,
  };
}

function unproject(x, y, bounds) {
  return {
    lon: bounds.minLon + (x / W) * (bounds.maxLon - bounds.minLon),
    lat: bounds.maxLat - (y / H) * (bounds.maxLat - bounds.minLat),
  };
}

function clampIndex(index, length) {
  if (length <= 0) return -1;
  return ((index % length) + length) % length;
}

/* E002-01 / E002-02 / E002-05 : dessin du laboratoire canvas. */
function draw(opacity) {
  const canvas = document.getElementById(ID.canvas);
  if (!canvas || !canvas.getContext) return;
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) return;

  const dpr = Math.min(MAX_DPR, Math.max(1, window.devicePixelRatio || 1));
  const pw = Math.round(W * dpr);
  const ph = Math.round(H * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx2d.clearRect(0, 0, W, H);
  ctx2d.fillStyle = '#0b1017';
  ctx2d.fillRect(0, 0, W, H);

  if (!validBounds(S.bounds)) {
    ctx2d.fillStyle = '#d7d1c6';
    ctx2d.font = '16px sans-serif';
    ctx2d.fillText('Emprise géographique indisponible : le laboratoire reste vide.', 24, 40);
    return;
  }

  const bounds = S.bounds;

  /* Graticule : méridiens pointillés (2-6), parallèles tiretés (8-5). */
  if (S.visible) {
    ctx2d.lineWidth = 0.8;
    ctx2d.font = '12px ui-monospace, monospace';
    S.lons.forEach((lon) => {
      const x = project(lon, 0, bounds).x;
      ctx2d.strokeStyle = 'rgba(230,185,111,.38)';
      ctx2d.setLineDash([2, 6]);
      ctx2d.beginPath(); ctx2d.moveTo(x, 0); ctx2d.lineTo(x, H); ctx2d.stroke();
      ctx2d.fillStyle = '#f4d69e';
      ctx2d.fillText(formatDegree(lon, true), x + 3, 16);
    });
    S.lats.forEach((lat) => {
      const y = project(0, lat, bounds).y;
      ctx2d.strokeStyle = 'rgba(159,199,255,.42)';
      ctx2d.setLineDash([8, 5]);
      ctx2d.beginPath(); ctx2d.moveTo(0, y); ctx2d.lineTo(W, y); ctx2d.stroke();
      ctx2d.fillStyle = '#d7d1c6';
      ctx2d.fillText(formatDegree(lat, false), 6, y - 5);
    });
    ctx2d.setLineDash([]);
  }

  /* Contour réel du pays (données du dataset), par-dessus le graticule. */
  if (S.outline.length > 2) {
    ctx2d.strokeStyle = 'rgba(215,209,198,.75)';
    ctx2d.lineWidth = 1.2;
    ctx2d.beginPath();
    S.outline.forEach((point, index) => {
      const p = project(point[0], point[1], bounds);
      if (index === 0) ctx2d.moveTo(p.x, p.y);
      else ctx2d.lineTo(p.x, p.y);
    });
    ctx2d.stroke();
  }

  /* E002-05 : les deux traits sélectionnés, mis en évidence. */
  const iLon = clampIndex(S.lonIndex, S.lons.length);
  const iLat = clampIndex(S.latIndex, S.lats.length);
  if (S.visible && iLon >= 0) {
    const x = project(S.lons[iLon], 0, bounds).x;
    ctx2d.strokeStyle = '#f4d69e';
    ctx2d.globalAlpha = opacity;
    ctx2d.lineWidth = 2.4;
    ctx2d.setLineDash([]);
    ctx2d.beginPath(); ctx2d.moveTo(x, 0); ctx2d.lineTo(x, H); ctx2d.stroke();
    ctx2d.globalAlpha = 1;
  }
  if (S.visible && iLat >= 0) {
    const y = project(0, S.lats[iLat], bounds).y;
    ctx2d.strokeStyle = '#9fc7ff';
    ctx2d.globalAlpha = opacity;
    ctx2d.lineWidth = 2.4;
    ctx2d.setLineDash([]);
    ctx2d.beginPath(); ctx2d.moveTo(0, y); ctx2d.lineTo(W, y); ctx2d.stroke();
    ctx2d.globalAlpha = 1;
  }
  if (S.visible && iLon >= 0 && iLat >= 0) {
    const p = project(S.lons[iLon], S.lats[iLat], bounds);
    ctx2d.fillStyle = '#f4d69e';
    ctx2d.beginPath(); ctx2d.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx2d.fill();
  }
}

/* --- E002-07 : une seule boucle rAF, pulsation du trait sélectionné ------- */

function stopPulse() {
  if (S.raf) {
    try { cancelAnimationFrame(S.raf); } catch { /* environnement sans rAF */ }
    S.raf = 0;
  }
  draw(1);
}

function frame(time) {
  S.raf = 0;
  if (document.hidden || S.reduced || !S.visible) { stopPulse(); return; }
  /* Sinus déterministe du temps : aucune graine, aucune valeur aléatoire. */
  const opacity = 0.62 + 0.3 * Math.sin(time / 460);
  draw(opacity);
  S.raf = requestAnimationFrame(frame);
}

function syncPulse() {
  if (S.reduced || !S.visible || document.hidden || typeof requestAnimationFrame !== 'function') {
    stopPulse();
    return;
  }
  if (!S.raf) S.raf = requestAnimationFrame(frame);
}

/* --- E002-08 : tableau de mesures, valeurs recalculées depuis les bornes --- */

const ROWS = [
  ['spanLon', 'Étendue en longitude'],
  ['spanLat', 'Étendue en latitude'],
  ['stepLon', 'Pas entre méridiens'],
  ['stepLat', 'Pas entre parallèles'],
  ['countLon', 'Nombre de méridiens'],
  ['countLat', 'Nombre de parallèles'],
  ['ref', 'Pas de référence'],
  ['ratio', 'Maille resserrée (ratio)'],
];

function buildTable(ctx, host) {
  const table = ctx.el('table', 'geography-v2-e002-table');
  table.id = ID.table;
  const caption = ctx.el('caption', '', 'Grandeurs calculées depuis l’emprise réelle du pays');
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Grandeur', 'Valeur'].forEach((label) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const cells = {};
  ROWS.forEach(([key, label]) => {
    const row = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = label;
    const td = document.createElement('td');
    td.textContent = '—';
    cells[key] = td;
    row.append(th, td);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  host.appendChild(table);
  return cells;
}

function fillTable() {
  const c = S.cells;
  const set = (key, value) => { if (c[key]) c[key].textContent = value; };
  if (!validBounds(S.bounds)) {
    ROWS.forEach(([key]) => set(key, '—'));
    return;
  }
  const spanLon = S.bounds.maxLon - S.bounds.minLon;
  const spanLat = S.bounds.maxLat - S.bounds.minLat;
  const ratio = REF_STEP / Math.min(S.stepLon, S.stepLat);
  set('spanLon', `${fr(spanLon, 1)}°`);
  set('spanLat', `${fr(spanLat, 1)}°`);
  set('stepLon', `${S.stepLon}°`);
  set('stepLat', `${S.stepLat}°`);
  set('countLon', String(S.lons.length));
  set('countLat', String(S.lats.length));
  set('ref', `${REF_STEP}°`);
  set('ratio', `${fr(ratio, 1)}×`);
}

/* --- E002-09 : contenu sémantique réel, indexable sans JS ni animation ---- */

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function buildPanel(ctx) {
  let panel = document.getElementById(ID.panel);
  if (panel && panel.isConnected && withinContext(panel, ctx)) {
    return {
      panel,
      canvas: document.getElementById(ID.canvas),
      cursor: document.getElementById(ID.cursor),
      readout: document.getElementById(ID.readout),
      status: document.getElementById(ID.status),
      toggle: document.getElementById(ID.toggle),
      normal: document.getElementById(ID.normal),
      dense: document.getElementById(ID.dense),
      lonPrev: document.getElementById(ID.lonPrev),
      lonNext: document.getElementById(ID.lonNext),
      latPrev: document.getElementById(ID.latPrev),
      latNext: document.getElementById(ID.latNext),
      fresh: false,
    };
  }

  panel = ctx.el('section', 'geography-v2-e002-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const title = ctx.el('h2', 'geography-v2-e002-title', 'Graticule V2 · méridiens et parallèles');
  title.id = ID.title;

  const intro = ctx.el('p', 'geography-v2-e002-intro',
    'Un méridien relie les pôles et porte une longitude (Est/Ouest) ; un '
    + 'parallèle suit une latitude (Nord/Sud). Le laboratoire ci-dessous trace '
    + 'une grille de référence au-dessus du contour réel du pays : chaque trait '
    + 'et chaque étiquette est calculé depuis l’emprise du jeu de données, '
    + 'aucune coordonnée n’est inventée.');
  intro.id = ID.intro;

  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.className = 'geography-v2-e002-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire de graticule : méridiens et parallèles du pays. '
    + 'Équivalent clavier : flèche gauche/droite pour changer de méridien, '
    + 'flèche haut/bas pour changer de parallèle, Origine pour recentrer, '
    + 'Entrée pour annuler la valeur sélectionnée.');
  canvas.setAttribute('aria-describedby', ID.canvasDesc);

  const canvasDesc = ctx.el('p', '',
    'Lecture clavier du laboratoire : flèches gauche et droite pour parcourir '
    + 'les méridiens, flèches haut et bas pour les parallèles, Entrée pour '
    + 'entendre l’intersection choisie. Le tableau suivant donne les mêmes '
    + 'valeurs sous forme de texte.');
  canvasDesc.id = ID.canvasDesc;

  /* E002-03 : choix unique → radiogroup, jamais aria-pressed. */
  const density = ctx.el('fieldset', '');
  density.id = ID.density;
  density.appendChild(ctx.el('legend', '', 'Densité du graticule'));
  const normalLabel = ctx.el('label', 'geography-v2-e002-choice');
  const normal = document.createElement('input');
  normal.type = 'radio'; normal.name = 'geography-v2-e002-density';
  normal.id = ID.normal; normal.value = 'normal';
  normalLabel.append(normal, document.createTextNode(' Clair'));
  const denseLabel = ctx.el('label', 'geography-v2-e002-choice');
  const dense = document.createElement('input');
  dense.type = 'radio'; dense.name = 'geography-v2-e002-density';
  dense.id = ID.dense; dense.value = 'dense';
  denseLabel.append(dense, document.createTextNode(' Dense'));
  density.append(normalLabel, denseLabel);

  /* E002-05 : quatre pas nommés, cibles ≥ 36 px. */
  const row = ctx.el('div', 'geography-v2-e002-row');
  const stepper = (id, text, aria) => {
    const button = ctx.el('button', 'geography-v2-e002-btn', text);
    button.type = 'button';
    button.id = id;
    button.setAttribute('aria-label', aria);
    return button;
  };
  const lonPrev = stepper(ID.lonPrev, '◀ Méridien', 'Méridien précédent');
  const lonNext = stepper(ID.lonNext, 'Méridien ▶', 'Méridien suivant');
  const latPrev = stepper(ID.latPrev, '◀ Parallèle', 'Parallèle précédent');
  const latNext = stepper(ID.latNext, 'Parallèle ▶', 'Parallèle suivant');
  row.append(lonPrev, lonNext, latPrev, latNext);

  /* E002-04 : bascule indépendante → aria-pressed licite. */
  const toggle = ctx.el('button', 'geography-v2-e002-btn', 'Masquer le graticule');
  toggle.type = 'button';
  toggle.id = ID.toggle;
  toggle.setAttribute('aria-label',
    'Masquer le graticule. Bascule indépendante du laboratoire de la vue Géographie.');

  const formulaTitle = ctx.el('h3', '', 'Formules déterministes du laboratoire');
  formulaTitle.id = ID.formulaTitle;
  const formula = ctx.el('p', 'geography-v2-e002-formula',
    'Projection directe : x = (longitude − min) ÷ (max − min) × 900 et '
    + 'y = (maxLat − latitude) ÷ (maxLat − minLat) × 620. Projection inverse : '
    + 'longitude = min + x ÷ 900 × (max − min) et latitude = maxLat − y ÷ 620 × '
    + '(maxLat − minLat). Le pas est choisi dans 1, 2, 5, 10, 20 ou 30° pour '
    + 'viser environ cinq traits par axe (dix en mode dense) ; seuls les '
    + 'multiples du pas contenus dans l’emprise sont tracés.');
  formula.id = ID.formula;

  const tableTitle = ctx.el('h3', '', 'Mesures vérifiables');
  tableTitle.id = ID.tableTitle;

  const cursor = ctx.el('p', 'geography-v2-e002-cursor',
    'Survolez le laboratoire pour lire ses coordonnées (texte non vocal).');
  cursor.id = ID.cursor;

  /* Une seule région live du module (E002-05 / E002-06 / E002-10). */
  const readout = ctx.el('p', 'geography-v2-e002-readout');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.textContent = 'Aucune intersection sélectionnée.';

  const status = ctx.el('p', '');
  status.id = ID.status;

  const note = ctx.el('p', 'geography-v2-e002-note',
    'Le dessin est un simple laboratoire : il illustre les formules, mais '
    + 'n’est jamais la source de l’information. Les grandeurs ci-dessus sont '
    + 'des textes réels, lisibles et indexables même sans animation. Le '
    + 'graticule reste une surcouche : la carte d’origine demeure utilisable '
    + 'sans lui.');
  note.id = ID.note;

  panel.append(title, intro, canvas, canvasDesc, toggle, density, row,
    formulaTitle, formula, tableTitle);
  S.cells = buildTable(ctx, panel);
  panel.append(cursor, readout, status, note);

  const host = ctx.layout || ctx.stage;
  host.appendChild(panel);

  return {
    panel, canvas, cursor, readout, status, toggle, normal, dense,
    lonPrev, lonNext, latPrev, latNext, fresh: true,
  };
}

/* --- application de l'état et mise à jour textuelle ---------------------- */

function applyState(ctx) {
  const n = S.nodes;
  if (!n) return;
  const iLon = clampIndex(S.lonIndex, S.lons.length);
  const iLat = clampIndex(S.latIndex, S.lats.length);

  if (n.toggle) {
    const label = S.visible ? 'Masquer le graticule' : 'Afficher le graticule';
    n.toggle.textContent = label;
    n.toggle.setAttribute('aria-pressed', String(S.visible));
    n.toggle.setAttribute('aria-label',
      `${label}. Bascule indépendante du laboratoire de la vue Géographie.`);
  }
  if (n.normal) n.normal.checked = S.density === 'normal';
  if (n.dense) n.dense.checked = S.density === 'dense';

  if (n.status) {
    n.status.textContent = `Affichage : ${S.visible ? 'activé' : 'masqué'} · densité : `
      + `${S.density === 'dense' ? 'dense' : 'clair'} · méridien : `
      + `${iLon >= 0 ? formatDegree(S.lons[iLon], true) : '—'} · parallèle : `
      + `${iLat >= 0 ? formatDegree(S.lats[iLat], false) : '—'} · origine des degrés : emprise du pays.`;
  }
  fillTable();
  void ctx; /* signature conservée pour ajustements locaux */
}

function announceSelection() {
  const n = S.nodes;
  if (!n || !n.readout) return;
  const iLon = clampIndex(S.lonIndex, S.lons.length);
  const iLat = clampIndex(S.latIndex, S.lats.length);
  if (iLon < 0 || iLat < 0 || !validBounds(S.bounds)) {
    n.readout.textContent = 'Aucune intersection sélectionnée.';
    return;
  }
  n.readout.textContent = '';
  n.readout.appendChild(document.createTextNode('Intersection sélectionnée : '));
  const strong = document.createElement('strong');
  strong.textContent = `${formatDegree(S.lats[iLat], false)}, ${formatDegree(S.lons[iLon], true)}`;
  n.readout.appendChild(strong);
  n.readout.appendChild(document.createTextNode('.'));
}

/* --- E002-06 : coordonnées du pointeur (projection inverse, sans réseau) -- */

function pointFromEvent(canvas, event) {
  if (!canvas || !canvas.getBoundingClientRect) return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = ((event.clientX - rect.left) / rect.width) * W;
  const y = ((event.clientY - rect.top) / rect.height) * H;
  return unproject(x, y, S.bounds);
}

function describe(point) {
  return `${formatDegree(point.lat, false)} · ${formatDegree(point.lon, true)}`;
}

/* --- E002-07 / E002-10 : écouteurs uniques et cycle de vie --------------- */

function wirePanel(ctx) {
  const n = S.nodes;
  if (!n || !n.fresh) return;

  if (n.toggle) n.toggle.addEventListener('click', () => {
    S.visible = !S.visible;
    applyState(ctx);
    syncPulse();
  });
  if (n.normal) n.normal.addEventListener('change', () => {
    if (!n.normal.checked) return;
    S.density = 'normal';
    rebuild(ctx);
  });
  if (n.dense) n.dense.addEventListener('change', () => {
    if (!n.dense.checked) return;
    S.density = 'dense';
    rebuild(ctx);
  });
  const stepLon = (delta) => {
    if (!S.lons.length) return;
    S.lonIndex = clampIndex(S.lonIndex + delta, S.lons.length);
    applyState(ctx); announceSelection(); draw(S.reduced ? 1 : 0.92);
  };
  const stepLat = (delta) => {
    if (!S.lats.length) return;
    S.latIndex = clampIndex(S.latIndex + delta, S.lats.length);
    applyState(ctx); announceSelection(); draw(S.reduced ? 1 : 0.92);
  };
  if (n.lonPrev) n.lonPrev.addEventListener('click', () => stepLon(-1));
  if (n.lonNext) n.lonNext.addEventListener('click', () => stepLon(1));
  if (n.latPrev) n.latPrev.addEventListener('click', () => stepLat(-1));
  if (n.latNext) n.latNext.addEventListener('click', () => stepLat(1));

  /* Équivalent clavier du canvas (E002-05 / E002-06). */
  if (n.canvas) {
    n.canvas.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { stepLon(-1); event.preventDefault(); }
      else if (event.key === 'ArrowRight') { stepLon(1); event.preventDefault(); }
      else if (event.key === 'ArrowUp') { stepLat(1); event.preventDefault(); }
      else if (event.key === 'ArrowDown') { stepLat(-1); event.preventDefault(); }
      else if (event.key === 'Home') {
        S.lonIndex = S.lons.length ? Math.floor(S.lons.length / 2) : -1;
        S.latIndex = S.lats.length ? Math.floor(S.lats.length / 2) : -1;
        applyState(ctx); announceSelection(); draw(1); event.preventDefault();
      } else if (event.key === 'Enter') { announceSelection(); event.preventDefault(); }
    });

    /* Survol non vocal (pas de spam lecteur d'écran) ; clic = annonce. */
    n.canvas.addEventListener('pointermove', (event) => {
      if (!validBounds(S.bounds) || !S.nodes || !S.nodes.cursor) return;
      const point = pointFromEvent(n.canvas, event);
      if (!point) return;
      S.nodes.cursor.textContent = `Sous le pointeur : ${describe(point)}.`;
    });
    n.canvas.addEventListener('click', (event) => {
      if (!validBounds(S.bounds) || !S.nodes || !S.nodes.readout) return;
      const point = pointFromEvent(n.canvas, event);
      if (!point) return;
      S.nodes.readout.textContent = `Point du laboratoire : ${describe(point)}.`;
    });
  }
}

/* Une seule fois par session : visibilité et préférence de mouvement. */
function installGlobalListeners() {
  if (S.listenersInstalled) return;
  S.listenersInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPulse(); else syncPulse();
  });
  try {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event) => {
      S.reduced = !!(event && event.matches);
      syncPulse();
    };
    if (query.addEventListener) query.addEventListener('change', onChange);
    else if (query.addListener) query.addListener(onChange);
  } catch { /* préférence indisponible : la pulsation reste réversible */ }
}

/* --- E002-10 : reconstruction sans doublons, indices toujours bornés ------ */

function rebuild(ctx) {
  const country = currentCountry(); /* lecture seule, aucune écriture */
  const bounds = country && validBounds(country.bounds) ? country.bounds : null;
  S.bounds = bounds;
  S.outline = country && Array.isArray(country.outline) ? country.outline : [];
  const key = bounds ? JSON.stringify(bounds) : '';
  const countryChanged = key !== S.boundsKey;
  S.boundsKey = key;

  S.stepLon = bounds ? chooseStep(bounds.maxLon - bounds.minLon, S.density === 'dense') : 1;
  S.stepLat = bounds ? chooseStep(bounds.maxLat - bounds.minLat, S.density === 'dense') : 1;
  S.lons = bounds ? degreesBetween(bounds.minLon, bounds.maxLon, S.stepLon) : [];
  S.lats = bounds ? degreesBetween(bounds.minLat, bounds.maxLat, S.stepLat) : [];

  if (countryChanged) {
    S.lonIndex = S.lons.length ? Math.floor(S.lons.length / 2) : -1;
    S.latIndex = S.lats.length ? Math.floor(S.lats.length / 2) : -1;
  } else {
    S.lonIndex = clampIndex(S.lonIndex, S.lons.length);
    S.latIndex = clampIndex(S.latIndex, S.lats.length);
  }

  applyState(ctx);
  announceSelection();
  draw(S.reduced ? 1 : 0.92);
  syncPulse();
}

/* --- point d'entrée unique ------------------------------------------------ */

register('E002', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  try { S.reduced = !!ctx.reducedMotion(); } catch { S.reduced = false; }

  S.nodes = buildPanel(ctx);
  rebuild(ctx);
  wirePanel(ctx);
  installGlobalListeners();
});
