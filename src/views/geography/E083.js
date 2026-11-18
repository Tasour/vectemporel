import { register } from './registry.js';

/* Lentille E083 — vue GEOGRAPHIE.
 * Thème : projection de points lat/lon vers l'écran.
 *
 * Les dix chantiers E083-01 … E083-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E083.md et implémentés ici, aucun stub.
 * Tout est local : aucune requête réseau, aucune graine aléatoire, aucune
 * console, aucun fichier partagé modifié. Le contenu pédagogique est du texte
 * sémantique réel (titres, paragraphes, tableau) présent dans le DOM même sans
 * animation ; le canvas n'est qu'un laboratoire qui illustre la formule affine.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 *
 * E083-01 panneau sémantique autonome ; E083-02 tableau de travail chiffré ;
 * E083-03 cadres de démonstration en choix unique ; E083-04 curseurs λ/φ bornés ;
 * E083-05 formule affine (x, y) avec inversion de l'axe vertical ;
 * E083-06 laboratoire canvas (cadre, graticule, point, guides) ;
 * E083-07 readout chiffré comparé au centre ; E083-08 boucle rAF unique ;
 * E083-09 codes non chromatiques et étiquettes ; E083-10 clavier, focus,
 * mouvement réduit, robustesse d'état et responsive.
 */

const CSS_ID = 'geography-e083';
const PANEL_ID = 'geography-e083-panel';
const TITLE_ID = 'geography-e083-title';
const FRAMESET_ID = 'geography-e083-frames';
const LON_ID = 'geography-e083-lon';
const LAT_ID = 'geography-e083-lat';
const LON_OUT_ID = 'geography-e083-lon-value';
const LAT_OUT_ID = 'geography-e083-lat-value';
const CANVAS_ID = 'geography-e083-canvas';
const READOUT_ID = 'geography-e083-readout';
const PLAY_ID = 'geography-e083-play';
const CENTER_ID = 'geography-e083-center';
const TABLE_ID = 'geography-e083-table';
const LEGEND_ID = 'geography-e083-legend';

/* Écran virtuel : mêmes dimensions que la carte de la vue (geography.js). */
const VIRTUAL_W = 900;
const VIRTUAL_H = 620;

/* Cadres de démonstration explicites : valeurs arbitraires, pas des lieux réels. */
const FRAMES = {
  monde: { label: 'Monde entier', minLon: -180, maxLon: 180, minLat: -90, maxLat: 90 },
  europe: { label: 'Europe (démonstration)', minLon: -12, maxLon: 32, minLat: 34, maxLat: 72 },
  hexagone: { label: 'Hexagone (démonstration)', minLon: -5, maxLon: 10, minLat: 41, maxLat: 52 },
};
const FRAME_ORDER = ['monde', 'europe', 'hexagone'];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  frame: 'hexagone',
  lon: 2,
  lat: 47,
  sweeping: false,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes (E083-05) ---------- */

const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function frame() {
  return FRAMES[S.frame] || FRAMES.hexagone;
}

function spanLon(f) {
  return f.maxLon - f.minLon;
}

function spanLat(f) {
  return f.maxLat - f.minLat;
}

/* x = ((λ − λmin) / (λmax − λmin)) × largeur ; y = ((φmax − φ) / hauteur) × hauteur. */
function projectToScreen(lon, lat, f) {
  const sl = spanLon(f);
  const sa = spanLat(f);
  if (!(sl > 0) || !(sa > 0)) return null;
  return {
    x: ((lon - f.minLon) / sl) * VIRTUAL_W,
    y: ((f.maxLat - lat) / sa) * VIRTUAL_H,
    inside: lon >= f.minLon && lon <= f.maxLon && lat >= f.minLat && lat <= f.maxLat,
  };
}

function stepFor(span) {
  return span >= 100 ? 5 : 1;
}

/* ---------- CSS unique, préfixé, plages tactiles et focus (E083-09/E083-10) ---------- */

const CSS = `
#geography-e083-panel{
  margin:14px 0 6px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e083-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e083-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e083-panel p{margin:5px 0;max-width:68ch}
.geography-e083-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
#geography-e083-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e083-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e083-table th,#geography-e083-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e083-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e083-frames{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e083-frames legend{padding:0 4px;color:var(--muted)}
.geography-e083-choix{display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;padding:2px 6px;cursor:pointer}
.geography-e083-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
.geography-e083-range{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.geography-e083-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e083-canvas{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
.geography-e083-legend{font-size:10px;color:var(--muted)}
#geography-e083-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e083-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e083-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#geography-e083-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e083-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-e083-panel[data-geography-e083-reduced="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e083-panel button{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e083-panel{font-size:10px;padding:9px}
  #geography-e083-canvas{height:190px}
  .geography-e083-choix{margin-right:4px}
  #geography-e083-table{font-size:9px}
}
`;

/* ---------- Texte sémantique, lisible sans JS (E083-01/E083-02) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Projeter un point, c’est convertir une paire de coordonnées (latitude φ, longitude λ) en une paire de pixels (x, y) : on mesure la fraction parcourue dans le cadre, puis on la multiplie par la largeur ou la hauteur de l’écran.',
    'L’axe vertical est inversé : sur l’écran, y = 0 est en haut alors que la latitude augmente vers le nord. La formule utilise donc (φmax − φ) et non (φ − φmin).',
    'Cette projection affine est une équirectangulaire locale : elle garde les proportions en degrés à l’intérieur du cadre, mais pas les distances réelles du globe. Un degré de longitude n’égale un degré de latitude qu’à l’équateur.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e083-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  const note = document.createElement('p');
  note.textContent = 'Les nombres ci-dessous sont un exemple numérique de démonstration, pas la coordonnée d’un lieu réel.';
  wrap.appendChild(note);
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Exemple de travail — cadre « Hexagone » : λ ∈ [−5°, 10°], φ ∈ [41°, 52°], écran virtuel 900 × 620 px.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Formule', 'Valeur'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Largeur en degrés', 'λmax − λmin = 10 − (−5)', '15°'],
    ['Hauteur en degrés', 'φmax − φmin = 52 − 41', '11°'],
    ['Abscisse du point (2°, 47°)', '((2 + 5) / 15) × 900', '420 px'],
    ['Ordonnée du point (2°, 47°)', '((52 − 47) / 11) × 620', '281,8 px'],
    ['Centre du cadre (référence)', '900 / 2 ; 620 / 2', '450 px ; 310 px'],
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

/* ---------- Panneau idempotent (E083-03/E083-04/E083-10) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: FRAME_ORDER.map((k) => document.getElementById(`geography-e083-frame-${k}`)),
      lon: document.getElementById(LON_ID),
      lat: document.getElementById(LAT_ID),
      lonOut: document.getElementById(LON_OUT_ID),
      latOut: document.getElementById(LAT_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      center: document.getElementById(CENTER_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e083-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Du lat/lon à l’écran : la projection affine');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'La vue place chaque lieu avec une transformation simple de (λ, φ) vers (x, y). Ce laboratoire rend explicite chaque étape du calcul et montre ce qui se passe quand le point sort du cadre.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = FRAMESET_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Cadre de démonstration (choix unique)';
  fieldset.appendChild(legend);
  FRAME_ORDER.forEach((key) => {
    const lab = ctx.el('label', 'geography-e083-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e083-frame';
    radio.id = `geography-e083-frame-${key}`;
    radio.value = key;
    radio.checked = S.frame === key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(FRAMES[key].label));
    fieldset.appendChild(lab);
  });

  const sub = ctx.el('h3', '', 'Déplacer le point à projeter');

  const lonRow = ctx.el('p', '');
  const lonLabel = document.createElement('label');
  lonLabel.setAttribute('for', LON_ID);
  lonLabel.appendChild(document.createTextNode('Longitude λ : '));
  const lonOut = document.createElement('span');
  lonOut.id = LON_OUT_ID;
  lonLabel.appendChild(lonOut);
  lonRow.appendChild(lonLabel);
  const lon = document.createElement('input');
  lon.type = 'range';
  lon.id = LON_ID;
  lon.min = '-180';
  lon.max = '180';
  lon.step = '1';
  lon.value = String(S.lon);
  lon.className = 'geography-e083-range';
  lon.setAttribute('aria-label', 'Longitude du point, de moins 180 à 180 degrés');

  const latRow = ctx.el('p', '');
  const latLabel = document.createElement('label');
  latLabel.setAttribute('for', LAT_ID);
  latLabel.appendChild(document.createTextNode('Latitude φ : '));
  const latOut = document.createElement('span');
  latOut.id = LAT_OUT_ID;
  latLabel.appendChild(latOut);
  latRow.appendChild(latLabel);
  const lat = document.createElement('input');
  lat.type = 'range';
  lat.id = LAT_ID;
  lat.min = '-90';
  lat.max = '90';
  lat.step = '1';
  lat.value = String(S.lat);
  lat.className = 'geography-e083-range';
  lat.setAttribute('aria-label', 'Latitude du point, de moins 90 à 90 degrés');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Cadre de projection et point projeté. Flèches gauche et droite : longitude ; flèches haut et bas : latitude ; Début : recentrer ; Page précédente et Page suivante : changer de cadre.');

  const legendText = ctx.el('p', 'geography-e083-legend', 'Trait plein et croix : point projeté. Tirets verticaux : méridiens. Pointillés horizontaux : parallèles. Losange creux : point hors cadre. Les formes distinguent tout, même sans couleur.');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e083-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.sweeping ? '■ Arrêter le balayage' : '▶ Balayer la longitude');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.sweeping ? 'true' : 'false');

  const center = ctx.el('button', '', 'Recentrer le point');
  center.type = 'button';
  center.id = CENTER_ID;

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sub,
    lonRow, lon, latRow, lat, canvas, legendText, readout, play, center);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: FRAME_ORDER.map((k) => document.getElementById(`geography-e083-frame-${k}`)),
    lon, lat, lonOut, latOut, canvas, readout, play, center, legend: legendText,
  };
}

/* ---------- Laboratoire canvas (E083-06/E083-09) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
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

  const pad = 30;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const toPx = (p) => [pad + (p.x / VIRTUAL_W) * iw, pad + (p.y / VIRTUAL_H) * ih];
  const f = frame();

  /* Cadre :rectangle de l'écran virtuel. */
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 1;
  if (g.setLineDash) g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);

  /* Graticule : les traits (pas la couleur) distinguent méridiens/parallèles. */
  if (g.setLineDash) g.setLineDash([5, 4]);
  g.strokeStyle = 'rgba(214,207,193,.45)';
  for (let i = 1; i < 4; i += 1) {
    const lon = f.minLon + (spanLon(f) * i) / 4;
    const x = pad + (i / 4) * iw;
    g.beginPath(); g.moveTo(x, pad); g.lineTo(x, pad + ih); g.stroke();
  }
  if (g.setLineDash) g.setLineDash([2, 3]);
  for (let i = 1; i < 4; i += 1) {
    const lat = f.minLat + (spanLat(f) * i) / 4;
    const y = pad + (i / 4) * ih;
    g.beginPath(); g.moveTo(pad, y); g.lineTo(pad + iw, y); g.stroke();
  }
  if (g.setLineDash) g.setLineDash([]);

  /* Centre du cadre : référence 450 px / 310 px, repère en croix. */
  const [cx, cy] = toPx({ x: VIRTUAL_W / 2, y: VIRTUAL_H / 2 });
  g.strokeStyle = 'rgba(214,207,193,.7)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cx - 5, cy); g.lineTo(cx + 5, cy);
  g.moveTo(cx, cy - 5); g.lineTo(cx, cy + 5);
  g.stroke();

  const p = projectToScreen(S.lon, S.lat, f);
  if (!p) return;
  const [px, py] = toPx(p);

  if (p.inside) {
    /* Guides jusqu'aux bords, puis croix pleine : lecture sans couleur. */
    if (g.setLineDash) g.setLineDash([4, 4]);
    g.strokeStyle = 'rgba(244,214,158,.7)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(pad, py); g.lineTo(px, py);
    g.moveTo(px, py); g.lineTo(px, pad + ih);
    g.stroke();
    if (g.setLineDash) g.setLineDash([]);
    g.strokeStyle = 'rgba(244,214,158,.98)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(px - 7, py); g.lineTo(px + 7, py);
    g.moveTo(px, py - 7); g.lineTo(px, py + 7);
    g.stroke();
    g.beginPath(); g.arc(px, py, 4, 0, Math.PI * 2); g.stroke();
  } else {
    /* Hors cadre : losange creux sur le bord, jamais un faux point à l'intérieur. */
    const bx = clamp(px, pad, pad + iw);
    const by = clamp(py, pad, pad + ih);
    g.strokeStyle = 'rgba(244,214,158,.98)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(bx, by - 6); g.lineTo(bx + 6, by);
    g.lineTo(bx, by + 6); g.lineTo(bx - 6, by); g.closePath(); g.stroke();
  }

  g.fillStyle = 'rgba(244,214,158,.98)';
  g.font = '11px sans-serif';
  g.fillText(`λ ${fmt(S.lon)}° · φ ${fmt(S.lat)}° → x ${fmt(p.x)} px, y ${fmt(p.y)} px`, pad + 2, cssH - 8);
  g.fillStyle = 'rgba(214,207,193,.8)';
  g.font = '10px sans-serif';
  g.fillText('λ → x ( longitude )', pad + 2, pad - 10);
  g.fillText('φ → y inversé', 2, pad + 11);
  g.fillText(p.inside ? 'POINT DANS LE CADRE' : 'HORS CADRE', pad + iw - 92, pad - 10);
}

/* ---------- Readout chiffré (E083-07) ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const f = frame();
  const p = projectToScreen(S.lon, S.lat, f);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`Cadre : λ ∈ [${fmt(f.minLon)}° ; ${fmt(f.maxLon)}°] (largeur ${fmt(spanLon(f))}°), φ ∈ [${fmt(f.minLat)}° ; ${fmt(f.maxLat)}°] (hauteur ${fmt(spanLat(f))}°). Point (λ ${fmt(S.lon)}°, φ ${fmt(S.lat)}°) : x = ((λ − λmin) / ${fmt(spanLon(f))}) × 900 = `));
  n.appendChild(fort(p ? `${fmt(p.x)} px` : 'indéfini'));
  n.appendChild(document.createTextNode(' ; y = ((φmax − φ) / ' + fmt(spanLat(f)) + ') × 620 = '));
  n.appendChild(fort(p ? `${fmt(p.y)} px` : 'indéfini'));
  n.appendChild(document.createTextNode('. Référence : au centre du cadre, x = 900 / 2 = 450 px et y = 620 / 2 = 310 px ; écarts '));
  n.appendChild(fort(p ? `Δx ${fmt(p.x - VIRTUAL_W / 2)} px, Δy ${fmt(p.y - VIRTUAL_H / 2)} px` : 'non définis'));
  n.appendChild(document.createTextNode('. '));
  n.appendChild(fort(p && p.inside ? 'Point dans le cadre.' : 'Point hors du cadre : sa position est signalée sur le bord.'));
}

function syncControls() {
  const n = S.nodes;
  const f = frame();
  n.radios.forEach((radio, i) => {
    if (radio) radio.checked = FRAME_ORDER[i] === S.frame;
  });
  if (n.lon) n.lon.value = String(clamp(S.lon, -180, 180));
  if (n.lat) n.lat.value = String(clamp(S.lat, -90, 90));
  if (n.lonOut) n.lonOut.textContent = `${fmt(S.lon)}°`;
  if (n.latOut) n.latOut.textContent = `${fmt(S.lat)}°`;
  if (n.play) {
    n.play.textContent = S.sweeping ? '■ Arrêter le balayage' : '▶ Balayer la longitude';
    n.play.setAttribute('aria-pressed', S.sweeping ? 'true' : 'false');
  }
  if (n.legend) {
    n.legend.textContent = `Cadre ${f.label} · trait plein et croix : point projeté ; tirets : méridiens ; pointillés : parallèles ; losange creux : hors cadre. Aucune information n’est portée par la seule couleur.`;
  }
  updateReadout();
  drawLab();
}

/* ---------- Boucle rAF unique, pause sur document.hidden (E083-08) ---------- */

function reducedNow() {
  return typeof ctxReduced === 'function' ? !!ctxReduced() : false;
}
let ctxReduced = null;

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
  if (reducedNow()) {
    stopLoop();
    return;
  }
  const f = frame();
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.lon += dt * 0.012;
    if (S.lon > f.maxLon || S.lon > 180) S.lon = f.minLon;
  }
  S.lastTs = ts;
  syncControls();
  if (S.sweeping) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners(ctx) {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.sweeping) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE083Reduced = mq.matches ? '1' : '0';
        if (mq.matches) { S.sweeping = false; stopLoop(); syncControls(); }
        else if (S.sweeping) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- Événements locaux (E083-10) ---------- */

function setFrame(key) {
  if (!FRAMES[key]) return;
  S.frame = key;
  syncControls();
}

function installLocalListeners() {
  const n = S.nodes;
  if (!n.fresh) return;
  n.radios.forEach((radio, i) => {
    if (!radio) return;
    radio.addEventListener('change', () => {
      if (radio.checked) setFrame(FRAME_ORDER[i]);
    });
  });
  n.lon.addEventListener('input', () => {
    S.lon = clamp(Math.round(Number(n.lon.value)), -180, 180);
    syncControls();
  });
  n.lat.addEventListener('input', () => {
    S.lat = clamp(Math.round(Number(n.lat.value)), -90, 90);
    syncControls();
  });
  n.play.addEventListener('click', () => {
    if (!S.sweeping && reducedNow()) {
      S.sweeping = false;
      syncControls();
      return;
    }
    S.sweeping = !S.sweeping;
    if (!S.sweeping) stopLoop(); else startLoop();
    syncControls();
  });
  n.center.addEventListener('click', () => {
    const f = frame();
    S.lon = Math.round((f.minLon + f.maxLon) / 2);
    S.lat = Math.round((f.minLat + f.maxLat) / 2);
    syncControls();
  });
  n.canvas.addEventListener('keydown', (event) => {
    const f = frame();
    const dLon = stepFor(spanLon(f));
    const dLat = stepFor(spanLat(f));
    let used = true;
    if (event.key === 'ArrowLeft') S.lon = clamp(S.lon - dLon, -180, 180);
    else if (event.key === 'ArrowRight') S.lon = clamp(S.lon + dLon, -180, 180);
    else if (event.key === 'ArrowUp') S.lat = clamp(S.lat + dLat, -90, 90);
    else if (event.key === 'ArrowDown') S.lat = clamp(S.lat - dLat, -90, 90);
    else if (event.key === 'Home') {
      S.lon = Math.round((f.minLon + f.maxLon) / 2);
      S.lat = Math.round((f.minLat + f.maxLat) / 2);
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const step = event.key === 'PageDown' ? 1 : -1;
      const i = FRAME_ORDER.indexOf(S.frame);
      S.frame = FRAME_ORDER[(i + step + FRAME_ORDER.length) % FRAME_ORDER.length];
    } else {
      used = false;
    }
    if (used) {
      event.preventDefault();
      syncControls();
    }
  });
}

/* ---------- Point d'entrée ---------- */

register('E083', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;

  S.nodes = ensurePanel(ctx);
  const reduced = ctxReduced ? !!ctxReduced() : false;
  S.nodes.panel.dataset.geographyE083Reduced = reduced ? '1' : '0';
  if (reduced) S.sweeping = false;

  syncControls();
  installLocalListeners();
  installGlobalListeners(ctx);
  if (S.sweeping) startLoop();
});
