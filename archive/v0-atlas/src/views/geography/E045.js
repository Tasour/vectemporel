import { register } from './registry.js';

/* Lentille E045 — vue GEOGRAPHIE.
 * Thème : adaptation responsive / mobile.
 *
 * Les dix chantiers E045-01 … E045-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E045.md. Tout est local : aucune requête
 * réseau, aucune valeur aléatoire, aucune sortie console, aucun fichier
 * partagé modifié. Le contenu pédagogique est du texte sémantique réel
 * (titres, paragraphes, tableau) présent dans le DOM même sans animation ;
 * le canvas n'est qu'un laboratoire qui illustre des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e045';
const PANEL_ID = 'geography-e045-panel';
const TITLE_ID = 'geography-e045-title';
const VW_ID = 'geography-e045-vw';
const VW_OUT_ID = 'geography-e045-vw-value';
const TARGET_ID = 'geography-e045-target';
const TARGET_OUT_ID = 'geography-e045-target-value';
const STRAT_MOBILE_ID = 'geography-e045-strat-mobile';
const STRAT_DESKTOP_ID = 'geography-e045-strat-desktop';
const CANVAS_ID = 'geography-e045-canvas';
const READOUT_ID = 'geography-e045-readout';
const BADGE_ID = 'geography-e045-badge';
const PLAY_ID = 'geography-e045-play';

/* Grandeurs de référence, toutes traçables et recalculées par formule. */
const BP = 1000;          /* rupture réelle de .geo-layout (styles.css:316). */
const VW_MIN = 320;       /* plus petit mobile usuel. */
const VW_MAX = 1600;      /* largeur de bureau de démonstration. */
const VW_MOBILE = 390;    /* mobile de référence (cf. README / audits). */
const VW_DESKTOP = 1280;  /* bureau de référence pour les unités. */
const PAD = 16;           /* gouttière extérieure de .geo-map. */
const PANEL_W = 340;      /* largeur de .geo-panel (styles.css:256). */
const GAP = 16;
const TARGET_REF = 44;    /* cible tactile recommandée (WCAG 2.5.5 / HIG). */
const TARGET_MIN = 24;    /* minimum WCAG 2.2 (2.5.8). */
const ROOT_PX = 16;       /* taille de police racine de référence. */

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  vw: VW_MOBILE,
  target: TARGET_REF,
  strategy: 'mobile-first',
  playing: false,
  sweep: (VW_MOBILE - VW_MIN) / (VW_MAX - VW_MIN),
  lastTs: 0,
  rafId: 0,
  reduced: false,
  onScreen: true,
  io: null,
  ioCanvas: null,
  visibilityBound: false,
  resizeBound: false,
  motionBound: false,
  scope: null,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const fmt = (n, d = 0) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* E045-03 — disposition et largeursMin : tout dérive de la largeur simulée. */
function columns(vw) { return vw < BP ? 1 : 2; }

function mapWidth(vw) {
  return vw < BP
    ? Math.max(0, vw - 2 * PAD)
    : Math.max(0, vw - 2 * PAD - PANEL_W - GAP);
}

function panelWidth(vw) {
  return vw < BP ? Math.max(0, vw - 2 * PAD) : PANEL_W;
}

/* E045-06 — la cible tactile comparée à la référence de 44 px. */
function targetRatio(target) { return (target / TARGET_REF) * 100; }

/* E045-02 — conversion d'unités : 1 rem = 16 px, 1 vw = largeur/100. */
function unitTable(vw) {
  return [
    ['px', 'unité absolue', `${fmt(1)} px`, 'référence fixe'],
    ['rem', 'multiple de la racine', `${fmt(ROOT_PX)} px`, `1 rem = ${fmt(ROOT_PX)} px`],
    ['em', 'multiple du parent', `${fmt(ROOT_PX)} px`, 'égal à 1 rem à la racine'],
    ['vw', '1 % de la largeur', `${fmt(vw / 100, 2)} px`, `${fmt(vw)} px / 100`],
    ['%', '1 % du conteneur', `${fmt(mapWidth(vw) / 100, 2)} px`, `colonne de ${fmt(mapWidth(vw))} px`],
  ];
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e045-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e045-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e045-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e045-panel p{margin:5px 0;max-width:68ch}
#geography-e045-panel .geography-e045-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e045-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e045-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e045-table th,#geography-e045-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e045-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e045-strat{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e045-strat legend{padding:0 4px;color:var(--muted)}
#geography-e045-panel .geography-e045-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:44px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e045-panel .geography-e045-choix input{min-width:20px;min-height:20px;accent-color:var(--gold,#e6b96f)}
#geography-e045-panel input[type="range"]{width:100%;min-height:44px;accent-color:var(--gold,#e6b96f)}
.geography-e045-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e045-canvas{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e045-legend{font-size:10px;color:var(--muted)}
#geography-e045-readout,#geography-e045-badge{
  min-height:30px;padding:7px 8px;margin:6px 0;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e045-badge[data-mode="mobile"]{border-left:4px solid var(--gold,#e6b96f)}
#geography-e045-badge[data-mode="desktop"]{border-left:4px solid var(--muted,#9a9386)}
#geography-e045-readout strong,.geography-e045-value strong{color:var(--gold-bright,#f4d69e)}
#geography-e045-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e045-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e045-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-e045-panel[data-geography-e045-reduced="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e045-panel button{transition:none!important;animation:none!important}
}
/* Le panneau s'adapte lui-même à son conteneur : démonstration de la règle. */
@container (max-width: 520px){
  #geography-e045-panel .geography-e045-choix{margin-right:4px}
}
@media (max-width:620px){
  #geography-e045-panel{font-size:10px;padding:9px}
  #geography-e045-canvas{height:200px}
  #geography-e045-panel .geography-e045-choix{margin-right:4px}
}
`;

/* ---------- Contenu sémantique, lisible sans animation ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une mise en page responsive réorganise le même contenu selon la largeur disponible : une grille fluide remplace les largeurs fixes et une rupture (breakpoint) commute le nombre de colonnes.',
    'La vue GEOGRAPHIE applique une rupture réelle à 1000 px : au-dessus, la carte et le panneau sont côte à côte ; en dessous, ils s’empilent. Le laboratoire ci-dessous reproduit cette règle sur une largeur simulée.',
    'Une cible tactile doit mesurer au moins 24 px et, idéalement, 44 px : les dimensions sont exprimées en unités relatives et vérifiées au doigt, pas seulement à l’œil.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e045-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = 'geography-e045-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Unités et largeurs — référence : 1 rem = 16 px, largeur de bureau 1280 px.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Unité', 'Nature', 'Valeur', 'Référence'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  unitTable(VW_DESKTOP).forEach((cells) => {
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

/* ---------- E045-01 / E045-05 / E045-08 : panneau et contrôles accessibles ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      vw: document.getElementById(VW_ID),
      target: document.getElementById(TARGET_ID),
      vwOut: document.getElementById(VW_OUT_ID),
      targetOut: document.getElementById(TARGET_OUT_ID),
      mobile: document.getElementById(STRAT_MOBILE_ID),
      desktop: document.getElementById(STRAT_DESKTOP_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      badge: document.getElementById(BADGE_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById('geography-e045-legend'),
    };
  }

  const panel = ctx.el('section', 'geography-e045-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Concevoir pour toutes les largeurs');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Le responsive design réorganise une même page selon l’espace disponible. Ce laboratoire simule la largeur d’écran, montre la rupture de disposition et mesure la lisibilité des cibles tactiles.');

  /* E045-05 : choix unique -> fieldset/legend + radios de même nom. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = 'geography-e045-strat';
  const legend = document.createElement('legend');
  legend.textContent = 'Stratégie de rupture (choix unique)';
  fieldset.appendChild(legend);
  [
    ['mobile-first', 'Mobile d’abord', STRAT_MOBILE_ID],
    ['desktop-first', 'Bureau d’abord', STRAT_DESKTOP_ID],
  ].forEach(([value, label, id]) => {
    const lab = ctx.el('label', 'geography-e045-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e045-strat';
    radio.id = id;
    radio.value = value;
    radio.checked = S.strategy === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });

  /* E045-04 : curseurs de largeur simulée et de cible tactile. */
  const vwRow = ctx.el('p', '');
  const vwLabel = document.createElement('label');
  vwLabel.setAttribute('for', VW_ID);
  vwLabel.appendChild(document.createTextNode('Largeur simulée : '));
  const vwOut = ctx.el('span', 'geography-e045-value');
  vwOut.id = VW_OUT_ID;
  vwLabel.appendChild(vwOut);
  vwRow.appendChild(vwLabel);
  const vw = document.createElement('input');
  vw.type = 'range';
  vw.id = VW_ID;
  vw.min = String(VW_MIN);
  vw.max = String(VW_MAX);
  vw.step = '1';
  vw.value = String(S.vw);
  vw.setAttribute('aria-label', `Largeur d’écran simulée, de ${VW_MIN} à ${VW_MAX} pixels`);

  const targetRow = ctx.el('p', '');
  const targetLabel = document.createElement('label');
  targetLabel.setAttribute('for', TARGET_ID);
  targetLabel.appendChild(document.createTextNode('Cible tactile : '));
  const targetOut = ctx.el('span', 'geography-e045-value');
  targetOut.id = TARGET_OUT_ID;
  targetLabel.appendChild(targetOut);
  targetRow.appendChild(targetLabel);
  const target = document.createElement('input');
  target.type = 'range';
  target.id = TARGET_ID;
  target.min = String(TARGET_MIN);
  target.max = '56';
  target.step = '1';
  target.value = String(S.target);
  target.setAttribute('aria-label', `Dimension d’une cible tactile, de ${TARGET_MIN} à 56 pixels`);

  /* E045-03 : canvas focalisable, étiqueté, avec équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `Fil de la disposition responsive. Flèches gauche et droite : réduire ou élargir la largeur simulée de 40 pixels ; Entrée : franchir la rupture de ${BP} pixels ; Origine : revenir à ${VW_MOBILE} pixels ; Fin : ${VW_MAX} pixels.`);

  const legendText = ctx.el('p', 'geography-e045-legend', 'Repères : cadre plein = largeur simulée ; ligne tiretée = rupture à 1000 px ; hachures = carte ; diagonales = panneau. Le style de trait et les étiquettes distinguent les blocs, indépendamment de la couleur.');
  legendText.id = 'geography-e045-legend';

  const badge = ctx.el('p', '', '');
  badge.id = BADGE_ID;
  const readout = ctx.el('p', 'geography-e045-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* E045-07 : bascule indépendante -> aria-pressed autorisé. */
  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, vwRow, vw, targetRow, target, canvas, legendText, badge, readout, play);

  const host = ctx.layout || ctx.stage;
  S.scope = host;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    vw, target, vwOut, targetOut,
    mobile: document.getElementById(STRAT_MOBILE_ID),
    desktop: document.getElementById(STRAT_DESKTOP_ID),
    canvas, readout, badge, play, legend: legendText,
  };
}

/* ---------- E045-03 : fil de disposition déterministe (un seul canvas) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 240;
  /* E045-10 : DPR plafonné à 2. */
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 14;
  const avail = Math.max(10, cssW - pad * 2);
  const frameH = Math.max(10, cssH - pad * 2);
  const centerX = pad + avail / 2;
  const frameW = (clamp(S.vw, VW_MIN, VW_MAX) / VW_MAX) * avail;
  const fx = centerX - frameW / 2;
  const fy = pad;
  const inner = Math.min(10, frameW * 0.06);

  /* Règle de rupture à BP : repère tireté fixe sur l'axe des largeurs. */
  const bpX = centerX + ((BP / VW_MAX) * avail) / 2;
  g.strokeStyle = 'rgba(244,214,158,.6)';
  g.lineWidth = 1;
  if (g.setLineDash) g.setLineDash([4, 4]);
  g.beginPath(); g.moveTo(bpX, fy - 6); g.lineTo(bpX, fy + frameH + 6); g.stroke();
  if (g.setLineDash) g.setLineDash([]);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(`${BP} px`, Math.min(bpX + 3, cssW - 34), fy + 9);

  /* Cadre de l'appareil. */
  g.strokeStyle = 'rgba(255,255,255,.45)';
  g.lineWidth = 1.2;
  g.strokeRect(fx, fy, frameW, frameH);

  const gap = 6;
  const bx = fx + inner;
  const by = fy + inner;
  const bInnerW = Math.max(2, frameW - inner * 2);
  const bInnerH = Math.max(2, frameH - inner * 2);

  const drawBlock = (x, y, w, h, hatch, label) => {
    if (w <= 1 || h <= 1) return;
    g.fillStyle = 'rgba(214,207,193,.07)';
    g.fillRect(x, y, w, h);
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.strokeStyle = hatch ? 'rgba(214,207,193,.30)' : 'rgba(244,214,158,.34)';
    g.lineWidth = 1;
    const step = hatch ? 8 : 11;
    for (let k = -h; k < w; k += step) {
      g.beginPath();
      if (hatch) { g.moveTo(x + k, y); g.lineTo(x + k + h, y + h); }
      else { g.moveTo(x + k, y); g.lineTo(x + k + h * 0.35, y + h * 0.35); }
      g.stroke();
    }
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.lineWidth = 1;
    g.strokeRect(x, y, w, h);
    if (w > 34) {
      g.fillStyle = 'rgba(244,214,158,.95)';
      g.font = '10px sans-serif';
      g.fillText(label, x + 4, y + 12);
    }
  };

  if (columns(S.vw) === 1) {
    /* Empilement : deux blocs pleine largeur, carte au-dessus du panneau. */
    const mapH = bInnerH * 0.58;
    const panH = bInnerH - mapH - gap;
    drawBlock(bx, by, bInnerW, mapH, false, 'carte');
    drawBlock(bx, by + mapH + gap, bInnerW, panH, true, 'panneau');
  } else {
    /* Deux colonnes : panneau de largeur fixe PANEL_W, carte en 1fr. */
    const panW = Math.max(2, (PANEL_W / VW_MAX) * avail * 2);
    const mapW = Math.max(2, bInnerW - panW - gap);
    drawBlock(bx, by, mapW, bInnerH, false, 'carte');
    drawBlock(bx + mapW + gap, by, panW, bInnerH, true, 'panneau');
  }

  /* Cible tactile : carré dont le côté est proportionnel à S.target. */
  const ts = clamp((S.target / TARGET_REF) * 14, 6, 24);
  g.fillStyle = 'rgba(244,214,158,.9)';
  g.fillRect(fx + 3, fy + frameH - ts - 3, ts, ts);
  g.strokeStyle = 'rgba(7,10,14,.9)';
  g.lineWidth = 1;
  g.strokeRect(fx + 3, fy + frameH - ts - 3, ts, ts);
}

/* ---------- E045-06 / E045-09 : lectures et readout ---------- */

function updateBadge() {
  const n = S.nodes.badge;
  if (!n) return;
  const real = (typeof window !== 'undefined' && Number.isFinite(window.innerWidth))
    ? window.innerWidth : VW_DESKTOP;
  const mobile = real <= BP;
  n.dataset.mode = mobile ? 'mobile' : 'desktop';
  n.textContent = mobile
    ? `Vue réelle : disposition mobile (largeur ${fmt(real)} px ≤ ${BP} px) — carte et panneau empilés, cibles tactiles privilégiées.`
    : `Vue réelle : disposition bureau (largeur ${fmt(real)} px > ${BP} px) — carte et panneau côte à côte.`;
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const cols = columns(S.vw);
  const mw = mapWidth(S.vw);
  const pw = panelWidth(S.vw);
  const ratio = targetRatio(S.target);
  const ok = S.target >= TARGET_REF;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Largeur simulée '));
  n.appendChild(fort(`${fmt(S.vw)} px`));
  n.appendChild(document.createTextNode(' → '));
  n.appendChild(fort(`${cols} colonne${cols > 1 ? 's' : ''}`));
  n.appendChild(document.createTextNode(` (carte ${fmt(mw)} px, panneau ${fmt(pw)} px). Cible tactile ${fmt(S.target)} px, soit `));
  n.appendChild(fort(`${fmt(ratio)} %`));
  n.appendChild(document.createTextNode(` des ${TARGET_REF} px recommandés : `));
  n.appendChild(fort(ok ? 'conforme' : 'sous la recommandation'));
  n.appendChild(document.createTextNode(`. À ${fmt(S.vw)} px, 1 vw = ${fmt(S.vw / 100, 2)} px ; 1 rem = ${ROOT_PX} px. Stratégie ${S.strategy === 'mobile-first' ? 'mobile d’abord' : 'bureau d’abord'} : la règle de base est ${S.strategy === 'mobile-first' ? 'empilée, puis surchargée au-dessus de 1000 px' : 'en colonnes, puis simplifiée en dessous de 1000 px'}.`));
}

function syncControls() {
  const n = S.nodes;
  if (n.vw) n.vw.value = String(Math.round(S.vw));
  if (n.target) n.target.value = String(Math.round(S.target));
  if (n.vwOut) n.vwOut.textContent = `${fmt(S.vw)} px`;
  if (n.targetOut) n.targetOut.textContent = `${fmt(S.target)} px`;
  if (n.mobile) n.mobile.checked = S.strategy === 'mobile-first';
  if (n.desktop) n.desktop.checked = S.strategy === 'desktop-first';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateBadge();
  updateReadout();
  drawLab();
}

/* ---------- E045-07 : boucle rAF unique, pause sur document.hidden ---------- */

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
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing) {
      S.sweep = (S.sweep + dt * 0.00012) % 1;
      S.vw = VW_MIN + S.sweep * (VW_MAX - VW_MIN);
    }
  }
  S.lastTs = ts;
  syncControls();
  if (S.playing) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing) startLoop();
    });
  }
  if (typeof window !== 'undefined' && !S.resizeBound) {
    S.resizeBound = true;
    window.addEventListener('resize', updateBadge);
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE045Reduced = mq.matches ? '1' : '0';
        if (mq.matches) { S.playing = false; stopLoop(); syncControls(); }
        else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- E045-10 : IntersectionObserver, sobriété, reproductibilité ---------- */

function ensureObserver(canvas) {
  if (typeof IntersectionObserver !== 'function') { S.onScreen = true; return; }
  if (S.io && S.ioCanvas === canvas) return;
  if (S.io) S.io.disconnect();
  S.io = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    S.onScreen = entry ? entry.isIntersecting : true;
    if (!S.onScreen) stopLoop();
    else if (S.playing) startLoop();
  }, { threshold: 0.01 });
  S.io.observe(canvas);
  S.ioCanvas = canvas;
}

/* ---------- Point d'entrée ---------- */

register('E045', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.reduced = typeof ctx.reducedMotion === 'function'
    ? !!ctx.reducedMotion()
    : (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false);

  S.nodes = ensurePanel(ctx);
  S.nodes.panel.dataset.geographyE045Reduced = S.reduced ? '1' : '0';
  if (S.reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.mobile, n.desktop].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.strategy = radio.value;
        syncControls();
      });
    });
    n.vw.addEventListener('input', () => {
      S.vw = clamp(Number(n.vw.value), VW_MIN, VW_MAX);
      S.sweep = (S.vw - VW_MIN) / (VW_MAX - VW_MIN);
      syncControls();
    });
    n.target.addEventListener('input', () => {
      S.target = clamp(Number(n.target.value), TARGET_MIN, 56);
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft') S.vw = clamp(S.vw - 40, VW_MIN, VW_MAX);
      else if (event.key === 'ArrowRight') S.vw = clamp(S.vw + 40, VW_MIN, VW_MAX);
      else if (event.key === 'Enter' || event.key === ' ') S.vw = S.vw < BP ? BP : BP - 1;
      else if (event.key === 'Home') S.vw = VW_MOBILE;
      else if (event.key === 'End') S.vw = VW_MAX;
      else used = false;
      if (used) {
        S.sweep = (S.vw - VW_MIN) / (VW_MAX - VW_MIN);
        event.preventDefault();
        syncControls();
      }
    });
    ensureObserver(n.canvas);
  }

  installGlobalListeners();
  if (S.playing) startLoop();
});
