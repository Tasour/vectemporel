import { register } from './registry.js';

/* Lentille E068 — vue GEOGRAPHIE.
 * Thème : icônes et pictogrammes de lieux (sémiologie des symboles de lieu).
 *
 * Les dix chantiers E068-01 … E068-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E068.md. Les dix sont réellement implémentés
 * ici : aucun stub. Tout est local — zéro requête réseau, zéro graine aléatoire,
 * zéro console, aucun fichier partagé modifié. Le contenu pédagogique est du
 * texte sémantique réel (h2, p, table, ul, svg légendé) présent dans le DOM
 * même sans animation ni interaction ; le canvas n'est qu'un laboratoire qui
 * illustre une mesure déterministe (px par trait, seuil de lisibilité).
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e068';
const PANEL_ID = 'geography-e068-panel';
const TITLE_ID = 'geography-e068-title';
const STYLE_FS_ID = 'geography-e068-style';
const SIZE_ID = 'geography-e068-size';
const SIZE_OUT_ID = 'geography-e068-size-value';
const GALLERY_ID = 'geography-e068-gallery';
const CANVAS_ID = 'geography-e068-canvas';
const READOUT_ID = 'geography-e068-readout';
const PLAY_ID = 'geography-e068-play';
const LEGEND_ID = 'geography-e068-legend';
const BADGE_ID = 'geography-e068-badge';

const SVG_NS = 'http://www.w3.org/2000/svg';

/* Vocabulaire normatif des trois jeux de pictogrammes. Le nombre de traits
 * distinctifs est une convention pédagogique explicite, pas une donnée inventée
 * sur le terrain : il sert de dénominateur à la mesure « px par trait ». */
const STYLES = {
  figuratif: { nom: 'Figuratif', traits: 8 },
  geometrique: { nom: 'Géométrique', traits: 4 },
  minimaliste: { nom: 'Minimaliste', traits: 2 },
};
const SEUIL = 3;            // px par trait nécessaires (référence affichée)
const TAILLE_MIN = 8;
const TAILLE_MAX = 48;

const CATS = [
  { key: 'ville', nom: 'Ville', geom: 'carre' },
  { key: 'port', nom: 'Port', geom: 'triangleBas' },
  { key: 'aeroport', nom: 'Aéroport', geom: 'losange' },
  { key: 'montagne', nom: 'Montagne', geom: 'triangleHaut' },
  { key: 'temple', nom: 'Lieu de culte', geom: 'croix' },
];

/* Silhouettes figurative dans une boîte 32×32 : traits visibles qui se
 * confondent quand le symbole devient petit. */
const FIG = {
  ville: ['M5 27 V16 L10 11 L15 16 V27 Z', 'M17 27 V12 L23 8 L29 12 V27 Z', 'M8 19 h2 v3 h-2 Z', 'M20 15 h2 v3 h-2 Z'],
  port: ['M16 5 v17', 'M13 5 h6', 'M9 17 q7 11 14 0', 'M11 15 h10', 'M14 22 l-3 -3', 'M18 22 l3 -3'],
  aeroport: ['M4 18 L28 14 L31 17 L18 21 L15 29 L12 29 L13 20 L6 22 Z'],
  montagne: ['M3 27 L11 12 L16 20 L21 9 L29 27 Z'],
  temple: ['M4 13 L16 6 L28 13 Z', 'M7 13 v13 h18 V13', 'M14 26 v-7 h4 v7'],
};

/* État de module : survit au vidage du conteneur lors d'un nouveau rendu. */
const S = {
  style: 'geometrique',
  size: 28,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------- Mesure déterministe (aucune donnée fabriquée) ---------- */

function mesures(taille, style) {
  const traits = STYLES[style].traits;
  const pxParTrait = taille / traits;
  return {
    taille: Math.round(taille),
    traits,
    pxParTrait,
    lisible: pxParTrait >= SEUIL,
    tailleMin: traits * SEUIL,
    indice: Math.min(1, pxParTrait / SEUIL),
  };
}

/* Taille affichée : le balayage animé remplace provisoirement le curseur. */
function effSize() {
  return S.playing ? TAILLE_MIN + S.sweep * (TAILLE_MAX - TAILLE_MIN) : S.size;
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e068-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e068-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e068-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e068-panel p{margin:5px 0;max-width:68ch}
#geography-e068-panel .geography-e068-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e068-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}
#geography-e068-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e068-table th,#geography-e068-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
#geography-e068-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e068-style{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e068-style legend{padding:0 4px;color:var(--muted)}
#geography-e068-panel .geography-e068-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;padding:2px 6px;cursor:pointer;
}
#geography-e068-panel .geography-e068-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e068-size{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e068-size-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e068-gallery{
  list-style:none;display:flex;flex-wrap:wrap;gap:10px;margin:8px 0;padding:0;
}
#geography-e068-gallery li{
  display:flex;flex-direction:column;align-items:center;gap:2px;min-width:52px;
  padding:5px;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.2);
}
#geography-e068-gallery svg{display:block}
#geography-e068-gallery .geography-e068-mark{
  fill:none;stroke:var(--gold-bright,#f4d69e);stroke-width:2;
}
#geography-e068-gallery svg path{
  fill:var(--gold,#e6b96f);stroke:var(--gold-bright,#f4d69e);stroke-width:.8;
}
#geography-e068-gallery span{font-size:9px;color:var(--ink-soft,#d7d1c6);text-align:center}
#geography-e068-canvas{
  display:block;width:100%;height:210px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e068-legend{font-size:10px;color:var(--muted)}
#geography-e068-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e068-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e068-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e068-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e068-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e068-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e068-panel[data-geography-e068-reduced="1"] button,
#geography-e068-panel[data-geography-e068-reduced="1"] .geography-e068-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e068-panel button,.geography-e068-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e068-panel{font-size:10px;padding:9px}
  #geography-e068-canvas{height:180px}
  #geography-e068-panel .geography-e068-choix{margin-right:4px}
  #geography-e068-gallery{gap:6px}
}
@media (forced-colors:active){
  #geography-e068-gallery .geography-e068-mark,
  #geography-e068-gallery svg path{stroke:CanvasText;fill:none}
  #geography-e068-readout strong{color:Highlight}
}
`;

/* ---------- Contenu sémantique statique (lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un pictogramme de lieu est un signe visuel qui remplace le nom d’un lieu sur une carte : il doit être reconnaissable, distinct et compréhensible sans légende longue.',
    'La forme porte la catégorie avant la couleur : carré, triangle, losange ou croix restent distinguables en niveaux de gris, alors qu’un code uniquement chromatique s’effondre pour les lecteurs daltoniens.',
    'Un symbole trop petit perd ses détails : en dessous d’environ trois pixels par trait distinctif, les traits se confondent et le pictogramme devient une tache. Un style riche est expressif mais fragile en petit.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e068-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = 'geography-e068-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Vocabulaire des formes : à chaque catégorie de lieu correspond une marque géométrique distincte (référence : formes ≠ couleurs).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Catégorie de lieu', 'Marque géométrique', 'Trait figuratif'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Ville', 'Carré plein', 'Bâtiments groupés'],
    ['Port', 'Triangle pointant bas', 'Ancre et amarre'],
    ['Aéroport', 'Losange', 'Silhouette d’avion'],
    ['Montagne', 'Triangle pointant haut', 'Sommet et crêtes'],
    ['Lieu de culte', 'Croix', 'Fronton et entrée'],
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

/* ---------- Galerie SVG (DOM sémantique, légendé, sans canvas) ---------- */

function svgEl(tag) {
  return document.createElementNS(SVG_NS, tag);
}

function setAttrs(node, attrs) {
  Object.keys(attrs).forEach((k) => node.setAttribute(k, String(attrs[k])));
  return node;
}

function addGeomSvg(svg, geom, r) {
  const cx = 16;
  const cy = 16;
  const cls = 'geography-e068-mark';
  if (geom === 'carre') {
    svg.appendChild(setAttrs(svgEl('rect'), { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r, class: cls }));
  } else if (geom === 'triangleBas') {
    svg.appendChild(setAttrs(svgEl('polygon'), { points: `${cx - r},${cy - r} ${cx + r},${cy - r} ${cx},${cy + r}`, class: cls }));
  } else if (geom === 'triangleHaut') {
    svg.appendChild(setAttrs(svgEl('polygon'), { points: `${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}`, class: cls }));
  } else if (geom === 'losange') {
    svg.appendChild(setAttrs(svgEl('polygon'), { points: `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`, class: cls }));
  } else if (geom === 'croix') {
    const t = Math.max(1, r / 3);
    svg.appendChild(setAttrs(svgEl('rect'), { x: cx - t / 2, y: cy - r, width: t, height: 2 * r, class: cls }));
    svg.appendChild(setAttrs(svgEl('rect'), { x: cx - r, y: cy - t / 2, width: 2 * r, height: t, class: cls }));
  }
}

function paintSvg(svg, cat, style) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  setAttrs(svg, {
    viewBox: '0 0 32 32', width: '30', height: '30', role: 'img',
    'aria-label': `Pictogramme ${cat.nom}, style ${STYLES[style].nom}`,
  });
  if (style === 'figuratif') {
    FIG[cat.key].forEach((d) => svg.appendChild(setAttrs(svgEl('path'), { d })));
  } else {
    addGeomSvg(svg, cat.geom, style === 'minimaliste' ? 3 : 9);
  }
}

function buildGallery(el) {
  const list = el('ul', 'geography-e068-gallery-list');
  list.id = GALLERY_ID;
  const map = {};
  CATS.forEach((cat) => {
    const li = el('li', '');
    const svg = svgEl('svg');
    svg.setAttribute('data-cat', cat.key);
    paintSvg(svg, cat, S.style);
    const label = el('span', '', cat.nom);
    li.appendChild(svg);
    li.appendChild(label);
    list.appendChild(li);
    map[cat.key] = svg;
  });
  return { list, map };
}

/* ---------- Laboratoire canvas (une seule boucle, un seul canvas) ---------- */

function drawMark(g, geom, cx, cy, r, filled) {
  const t = Math.max(1, r / 3);
  g.beginPath();
  if (geom === 'carre') {
    g.rect(cx - r, cy - r, 2 * r, 2 * r);
  } else if (geom === 'triangleBas') {
    g.moveTo(cx - r, cy - r); g.lineTo(cx + r, cy - r); g.lineTo(cx, cy + r); g.closePath();
  } else if (geom === 'triangleHaut') {
    g.moveTo(cx, cy - r); g.lineTo(cx + r, cy + r); g.lineTo(cx - r, cy + r); g.closePath();
  } else if (geom === 'losange') {
    g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath();
  } else if (geom === 'croix') {
    g.rect(cx - t / 2, cy - r, t, 2 * r);
    g.rect(cx - r, cy - t / 2, 2 * r, t);
  }
  if (filled) g.fill(); else g.stroke();
}

function drawPictogram(g, cat, style, cx, cy, size) {
  const r = Math.max(1, size / 2 - 2);
  if (style === 'figuratif') {
    drawMark(g, cat.geom, cx, cy, r, false);
    /* Détails supplémentaires : traits qui se confondent en petit. */
    g.beginPath();
    g.moveTo(cx - r, cy + r * 0.4); g.lineTo(cx + r, cy + r * 0.4);
    g.moveTo(cx, cy - r * 0.4); g.lineTo(cx, cy + r);
    g.stroke();
  } else {
    drawMark(g, cat.geom, cx, cy, style === 'minimaliste' ? Math.min(r, 3) : r, style === 'minimaliste');
  }
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 210;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const size = effSize();
  const m = mesures(size, S.style);
  const pad = 12;
  const iw = Math.max(10, cssW - pad * 2);

  /* Ligne de référence : repère non chromatique. */
  g.strokeStyle = 'rgba(255,255,255,.14)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(pad, cssH - 30); g.lineTo(cssW - pad, cssH - 30);
  g.stroke();

  g.strokeStyle = 'rgba(244,214,158,.92)';
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.lineWidth = 1.4;
  CATS.forEach((cat, i) => {
    const cx = pad + (i + 0.5) * (iw / CATS.length);
    const cy = cssH * 0.44;
    drawPictogram(g, cat, S.style, cx, cy, size);
    g.font = '10px sans-serif';
    g.textAlign = 'center';
    g.fillText(cat.nom, cx, cssH - 12);
  });

  g.textAlign = 'left';
  g.font = '11px sans-serif';
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`Taille ${Math.round(size)} px · ${STYLES[S.style].nom} · ${m.traits} traits · ${fmt(m.pxParTrait)} px/trait`, pad + 2, pad + 10);
  if (!m.lisible) {
    /* L'alerte est textuelle : jamais portée par la couleur seule. */
    g.fillStyle = 'rgba(255,150,130,.95)';
    g.fillText(`Sous le seuil de ${SEUIL} px par trait`, pad + 2, pad + 26);
  }
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const size = effSize();
  const m = mesures(size, S.style);
  const mini = mesures(size, 'minimaliste');
  while (n.firstChild) n.removeChild(n.firstChild);
  const strong = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.appendChild(document.createTextNode(`À ${m.taille} px, le style ${STYLES[S.style].nom} compte `));
  n.appendChild(strong(`${m.traits} traits`));
  n.appendChild(document.createTextNode(`, soit ${fmt(m.pxParTrait)} px par trait (référence : ${SEUIL} px par trait nécessaires, taille minimale ${m.tailleMin} px). `));
  n.appendChild(strong(m.lisible ? 'Lisible' : 'Sous le seuil'));
  n.appendChild(document.createTextNode(`. Le figuratif est riche mais fragile en petit ; le minimaliste reste lisible dès ${mini.tailleMin} px mais porte moins d’information.`));
}

function syncControls() {
  const n = S.nodes;
  if (n.fig) n.fig.checked = S.style === 'figuratif';
  if (n.geo) n.geo.checked = S.style === 'geometrique';
  if (n.min) n.min.checked = S.style === 'minimaliste';
  if (n.size) n.size.value = String(S.size);
  if (n.sizeOut) n.sizeOut.textContent = `${S.size} px`;
  if (n.legend) {
    n.legend.textContent = `${STYLES[S.style].nom} — la forme (carré, triangle, losange, croix) distingue le lieu, indépendamment de la couleur ; chaque pictogramme porte aussi un libellé.`;
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.gallerySvgs) {
    CATS.forEach((cat) => {
      if (n.gallerySvgs[cat.key]) paintSvg(n.gallerySvgs[cat.key], cat, S.style);
    });
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
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00025) % 1;
  }
  S.lastTs = ts;
  updateReadout();
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
        if (panel) panel.dataset.geographyE068Reduced = mq.matches ? '1' : '0';
        if (mq.matches) { S.playing = false; stopLoop(); }
        else if (S.playing) startLoop();
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- Construction du panneau ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    const gallery = document.getElementById(GALLERY_ID);
    const map = {};
    if (gallery && typeof gallery.querySelectorAll === 'function') {
      gallery.querySelectorAll('svg[data-cat]').forEach((svg) => { map[svg.getAttribute('data-cat')] = svg; });
    }
    return {
      panel: existant, fresh: false,
      fig: document.getElementById('geography-e068-style-figuratif'),
      geo: document.getElementById('geography-e068-style-geometrique'),
      min: document.getElementById('geography-e068-style-minimaliste'),
      size: document.getElementById(SIZE_ID),
      sizeOut: document.getElementById(SIZE_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
      gallerySvgs: map,
    };
  }

  const panel = ctx.el('section', 'geography-e068-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Icônes et pictogrammes de lieux');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Sur une carte, un lieu est souvent désigné par un symbole plutôt que par un nom. Ce panneau explique comment ces pictogrammes construisent une catégorie visuelle et pourquoi la forme, plus que la couleur, en assure la lisibilité.');

  const galleryTitle = ctx.el('h3', '', 'Galerie des pictogrammes');
  const made = buildGallery(ctx.el);

  const styleFs = document.createElement('fieldset');
  styleFs.id = STYLE_FS_ID;
  const styleLegend = document.createElement('legend');
  styleLegend.textContent = 'Jeu de pictogrammes (choix unique)';
  styleFs.appendChild(styleLegend);
  [['figuratif', 'Figuratif'], ['geometrique', 'Géométrique'], ['minimaliste', 'Minimaliste']].forEach(([value, label]) => {
    const lab = ctx.el('label', 'geography-e068-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e068-style';
    radio.id = `geography-e068-style-${value}`;
    radio.value = value;
    radio.checked = S.style === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    styleFs.appendChild(lab);
  });

  const sub = ctx.el('h3', '', 'Observer la lisibilité');
  const sizeRow = ctx.el('p', '');
  const sizeLabel = document.createElement('label');
  sizeLabel.setAttribute('for', SIZE_ID);
  sizeLabel.appendChild(document.createTextNode('Taille du symbole : '));
  const sizeOut = document.createElement('span');
  sizeOut.id = SIZE_OUT_ID;
  sizeLabel.appendChild(sizeOut);
  sizeRow.appendChild(sizeLabel);

  const size = document.createElement('input');
  size.type = 'range';
  size.id = SIZE_ID;
  size.min = String(TAILLE_MIN);
  size.max = String(TAILLE_MAX);
  size.step = '2';
  size.value = String(S.size);
  size.setAttribute('aria-label', `Taille du symbole en pixels, de ${TAILLE_MIN} à ${TAILLE_MAX}`);

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Galerie animée des pictogrammes de lieux. Flèches gauche et droite : changer de jeu ; flèches haut et bas : changer la taille.');

  const legendText = ctx.el('p', 'geography-e068-legend', '');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e068-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), galleryTitle, made.list,
    styleFs, sub, sizeRow, size, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    fig: document.getElementById('geography-e068-style-figuratif'),
    geo: document.getElementById('geography-e068-style-geometrique'),
    min: document.getElementById('geography-e068-style-minimaliste'),
    size, sizeOut, canvas, readout, play, legend: legendText,
    gallerySvgs: made.map,
  };
}

/* Badge textuel posé sur la carte existante : la forme porte la catégorie. */
function addBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e068-badge',
    'Symboles de lieux : la forme distingue la catégorie (carré, triangle, losange, croix), jamais la couleur seule.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E068', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE068Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.fig, n.geo, n.min].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.style = radio.value;
        syncControls();
      });
    });
    n.size.addEventListener('input', () => {
      S.size = clamp(Math.round(Number(n.size.value) / 2) * 2, TAILLE_MIN, TAILLE_MAX);
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
        const order = ['figuratif', 'geometrique', 'minimaliste'];
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = order.indexOf(S.style);
        S.style = order[(i + step + order.length) % order.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 2 : -2;
        S.size = clamp(S.size + step, TAILLE_MIN, TAILLE_MAX);
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
