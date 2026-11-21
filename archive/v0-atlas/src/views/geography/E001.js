import { register } from './registry.js';

/* Lentille E001 — vue GEOGRAPHIE.
 * Thème : projections cartographiques (Mercator, équirectangulaire, Robinson).
 *
 * Les dix chantiers E001-01 … E001-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E001.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau) présent dans le DOM même sans animation ; le canvas
 * n'est qu'un laboratoire qui illustre des formules deterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e001';
const PANEL_ID = 'geography-e001-panel';
const TITLE_ID = 'geography-e001-title';
const PROJ_ID = 'geography-e001-projection';
const LAT_ID = 'geography-e001-lat';
const LAT_OUT_ID = 'geography-e001-lat-value';
const CANVAS_ID = 'geography-e001-canvas';
const READOUT_ID = 'geography-e001-readout';
const PLAY_ID = 'geography-e001-play';
const LEGEND_ID = 'geography-e001-legend';
const BADGE_ID = 'geography-e001-badge';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const EARTH_X = 0.8487;
const EARTH_Y = 1.3523;

/* Tables canoniques de Robinson (pas à 5° de 0° à 90°). */
const ROB_X = [1.0000, 0.9986, 0.9954, 0.9900, 0.9822, 0.9730, 0.9600, 0.9427, 0.9216, 0.8962, 0.8679, 0.8350, 0.7986, 0.7597, 0.7186, 0.6732, 0.6213, 0.5722, 0.5322];
const ROB_Y = [0.0000, 0.0620, 0.1240, 0.1860, 0.2480, 0.3100, 0.3720, 0.4340, 0.4958, 0.5571, 0.6176, 0.6769, 0.7346, 0.7903, 0.8435, 0.8936, 0.9394, 0.9761, 1.0000];

const LABELS = {
  mercator: 'Mercator — trait plein',
  equirect: 'Équirectangulaire — tirets',
  robinson: 'Robinson — pointillés',
};
const DASHES = { mercator: [], equirect: [7, 5], robinson: [2, 4] };

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  projection: 'mercator',
  lat: 60,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules deterministes (aucune donnée fabriquée) ---------- */

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

function robIndex(lat) {
  return Math.max(0, Math.min(18, Math.abs(lat) / 5));
}

function robInterp(table, lat) {
  const i = robIndex(lat);
  const lo = Math.floor(i);
  const hi = Math.min(18, lo + 1);
  const f = i - lo;
  return table[lo] + (table[hi] - table[lo]) * f;
}

/* Dérivée méridienne de Y (par radian), par différence centrale sur la table. */
function robYPrime(lat) {
  const c = Math.round(Math.min(90, Math.abs(lat)) / 5);
  const a = Math.max(0, c - 1);
  const b = Math.min(18, c + 1);
  const perDeg = (ROB_Y[b] - ROB_Y[a]) / ((b - a) * 5);
  return perDeg * DEG;
}

function measures(latDeg) {
  const phi = Math.max(-80, Math.min(80, latDeg)) * RAD;
  const cos = Math.cos(phi);
  const sec = 1 / cos;
  const y0 = robYPrime(0);
  const yp = robYPrime(latDeg);
  const xr = robInterp(ROB_X, latDeg);
  return {
    lat: Math.round(latDeg),
    mercK: sec,
    mercArea: sec * sec,
    equiMerid: 1,
    equiArea: sec,
    robMerid: y0 > 0 ? yp / y0 : 1,
    robArea: cos > 0 ? (EARTH_X * xr * EARTH_Y * yp) / cos : 1,
  };
}

function projectFor(kind, lonDeg, latDeg) {
  if (kind === 'equirect') {
    return { u: lonDeg / 180, v: latDeg / 85 };
  }
  if (kind === 'mercator') {
    const p = Math.max(-85, Math.min(85, latDeg));
    const y = Math.log(Math.tan(Math.PI / 4 + (p * RAD) / 2));
    const yMax = Math.log(Math.tan(Math.PI / 4 + (85 * RAD) / 2));
    return { u: lonDeg / 180, v: y / yMax };
  }
  const a = Math.min(90, Math.abs(latDeg));
  const x = robInterp(ROB_X, a);
  const y = robInterp(ROB_Y, a) * (latDeg < 0 ? -1 : 1);
  return { u: (lonDeg / 180) * x, v: y / ROB_Y[18] };
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e001-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e001-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e001-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e001-panel p{margin:5px 0;max-width:68ch}
#geography-e001-panel .geography-e001-fait{
  margin:5px 0 5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e001-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e001-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e001-table th,#geography-e001-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e001-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e001-projection{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e001-projection legend{padding:0 4px;color:var(--muted)}
#geography-e001-panel .geography-e001-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e001-panel .geography-e001-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e001-lat{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e001-lat-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e001-canvas{
  display:block;width:100%;height:220px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e001-legend{font-size:10px;color:var(--muted)}
#geography-e001-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e001-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e001-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e001-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e001-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e001-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e001-panel[data-geography-e001-reduced="1"] button,
#geography-e001-panel[data-geography-e001-reduced="1"] .geography-e001-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e001-panel button,.geography-e001-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e001-panel{font-size:10px;padding:9px}
  #geography-e001-canvas{height:180px}
  #geography-e001-panel .geography-e001-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte semantic, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une projection est une transformation du globe (surface courbe) vers un plan : elle conserve certaines propriétés et en sacrifie d’autres.',
    'Mercator est conforme : les angles et les petites formes sont conservés, mais les aires sont fortement agrandies vers les pôles.',
    'L’équirectangulaire (plate carrée) garde un espacement régulier des parallèles ; Robinson est un compromis qui réduit l’étirement polaire.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e001-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = 'geography-e001-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Comparaison à 60° de latitude (référence : valeur 1,00 à l’équateur).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Projection', 'Propriété', 'Échelle locale', 'Aires'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Mercator', 'Conforme (angles conservés)', '2,00×', '4,00×'],
    ['Équirectangulaire', 'Ni conforme ni équivalente', '1,00× (méridien)', '2,00×'],
    ['Robinson', 'Compromis visuel', '0,91×', '1,19×'],
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
      mercator: document.getElementById('geography-e001-proj-mercator'),
      equirect: document.getElementById('geography-e001-proj-equirect'),
      robinson: document.getElementById('geography-e001-proj-robinson'),
      lat: document.getElementById(LAT_ID),
      latOut: document.getElementById(LAT_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e001-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Projections cartographiques');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Comparer Mercator, équirectangulaire et Robinson permet de voir que toute carte est un choix : aucune projection ne conserve à la fois les angles, les aires et les distances.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = PROJ_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Projection affichée (choix unique)';
  fieldset.appendChild(legend);
  [['mercator', 'Mercator'], ['equirect', 'Équirectangulaire'], ['robinson', 'Robinson']].forEach(([value, label]) => {
    const lab = ctx.el('label', 'geography-e001-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e001-proj';
    radio.id = `geography-e001-proj-${value}`;
    radio.value = value;
    radio.checked = S.projection === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });

  const sub = ctx.el('h3', '', 'Observer la déformation');
  const latRow = ctx.el('p', '');
  const latLabel = document.createElement('label');
  latLabel.setAttribute('for', LAT_ID);
  latLabel.appendChild(document.createTextNode('Latitude observée : '));
  const latOut = document.createElement('span');
  latOut.id = LAT_OUT_ID;
  latLabel.appendChild(latOut);
  latRow.appendChild(latLabel);

  const lat = document.createElement('input');
  lat.type = 'range';
  lat.id = LAT_ID;
  lat.min = '0';
  lat.max = '80';
  lat.step = '5';
  lat.value = String(S.lat);
  lat.setAttribute('aria-label', 'Latitude observée, de 0 à 80 degrés');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Graticule de la projection choisie. Flèches gauche et droite : changer de projection ; flèches haut et bas : changer la latitude.');

  const legendText = ctx.el('p', 'geography-e001-legend', LABELS[S.projection] + ' · le style de trait (plein, tirets, pointillés) distingue la projection, independamment de la couleur.');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e001-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sub, latRow, lat, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    mercator: document.getElementById('geography-e001-proj-mercator'),
    equirect: document.getElementById('geography-e001-proj-equirect'),
    robinson: document.getElementById('geography-e001-proj-robinson'),
    lat, latOut, canvas, readout, play, legend: legendText,
  };
}

/* ---------- Rendu du laboratoire (une seule grille, un seul canvas) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 220;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 16;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const toPx = (p) => [pad + ((p.u + 1) / 2) * iw, pad + ((1 - (p.v + 1) / 2) * ih)];

  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);

  g.strokeStyle = 'rgba(214,207,193,.55)';
  const dash = DASHES[S.projection] || [];
  if (g.setLineDash) g.setLineDash(dash);
  g.lineWidth = 1;

  for (let lon = -180; lon <= 180; lon += 30) {
    g.beginPath();
    for (let lat = -85; lat <= 85; lat += 5) {
      const [x, y] = toPx(projectFor(S.projection, lon, lat));
      if (lat === -85) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    g.beginPath();
    for (let lon = -180; lon <= 180; lon += 5) {
      const [x, y] = toPx(projectFor(S.projection, lon, lat));
      if (lon === -180) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }

  /* Parallèle observé : repère en forme de croix, jamais la couleur seule. */
  if (g.setLineDash) g.setLineDash([]);
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.beginPath();
  for (let lon = -180; lon <= 180; lon += 4) {
    const [x, y] = toPx(projectFor(S.projection, lon, S.lat));
    if (lon === -180) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
  const [mx, my] = toPx(projectFor(S.projection, 0, S.lat));
  g.beginPath();
  g.moveTo(mx - 6, my); g.lineTo(mx + 6, my);
  g.moveTo(mx, my - 6); g.lineTo(mx, my + 6);
  g.stroke();

  /* Méridien balayé : seul élément anime, position deterministe = f(S.sweep). */
  const sweepLon = -180 + S.sweep * 360;
  if (g.setLineDash) g.setLineDash([3, 3]);
  g.strokeStyle = 'rgba(255,255,255,.85)';
  g.lineWidth = 1.5;
  g.beginPath();
  for (let lat = -85; lat <= 85; lat += 5) {
    const [x, y] = toPx(projectFor(S.projection, sweepLon, lat));
    if (lat === -85) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(LABELS[S.projection], pad + 2, pad + 13);
  g.fillText(`${S.lat}° de latitude`, pad + 2, cssH - pad - 4);
}

function updateReadout() {
  const m = measures(S.lat);
  const n = S.nodes.readout;
  if (!n) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`À ${m.lat}° (référence : 1,00 à l’équateur) — Mercator : échelle `));
  n.appendChild(fort(`${fmt(m.mercK)}×`));
  n.appendChild(document.createTextNode(', aires '));
  n.appendChild(fort(`${fmt(m.mercArea)}×`));
  n.appendChild(document.createTextNode(' ; équirectangulaire : échelle méridienne 1,00×, aires '));
  n.appendChild(fort(`${fmt(m.equiArea)}×`));
  n.appendChild(document.createTextNode(' ; Robinson : échelle méridienne '));
  n.appendChild(fort(`${fmt(m.robMerid)}×`));
  n.appendChild(document.createTextNode(', aires '));
  n.appendChild(fort(`${fmt(m.robArea)}×`));
  n.appendChild(document.createTextNode('. Mercator conserve les angles mais gonfle les aires ; Robinson reste le plus proche de 1,00.'));
}

function syncControls() {
  const n = S.nodes;
  if (n.mercator) n.mercator.checked = S.projection === 'mercator';
  if (n.equirect) n.equirect.checked = S.projection === 'equirect';
  if (n.robinson) n.robinson.checked = S.projection === 'robinson';
  if (n.lat) n.lat.value = String(S.lat);
  if (n.latOut) n.latOut.textContent = `${S.lat}°`;
  if (n.legend) n.legend.textContent = LABELS[S.projection] + ' · le style de trait (plein, tirets, pointillés) distingue la projection, independamment de la couleur.';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
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
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  const reduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00007) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
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
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE001Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- Badge de la projection schématique de la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e001-badge', 'Projection schématique équirectangulaire du cadre local (formules linéaires sur lat/lon).');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E001', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE001Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.mercator, n.equirect, n.robinson].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.projection = radio.value;
        syncControls();
      });
    });
    n.lat.addEventListener('input', () => {
      S.lat = Math.max(0, Math.min(80, Math.round(Number(n.lat.value) / 5) * 5));
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
        const order = ['mercator', 'equirect', 'robinson'];
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = order.indexOf(S.projection);
        S.projection = order[(i + step + order.length) % order.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 5 : -5;
        S.lat = Math.max(0, Math.min(80, S.lat + step));
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
