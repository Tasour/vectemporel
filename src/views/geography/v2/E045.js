import { register } from './registry.js';

/* Lentille E045 (V2) — vue GEOGRAPHIE.
 * Thème : adaptation responsive / mobile — rupture de disposition, unités
 * relatives, cibles tactiles et sobriété.
 *
 * Les dix chantiers E045-01 … E045-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E045.md. Les dix sont réellement
 * implémentés : aucun stub, aucune fonction vide. Tout est local : aucune
 * requête réseau, aucune graine aléatoire, aucune sortie console, aucun
 * fichier partagé modifié. Le contenu pédagogique est du texte sémantique
 * réel (titres, paragraphes, tableau, radiogroupe, légende) présent dans le
 * DOM même sans animation ; le canvas n'est qu'un laboratoire qui illustre
 * des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e045- (identifiants, classes, attributs,
 * noms de groupes et bloc CSS).
 *
 * Nouveautés V2 par rapport à la passe 1 : rôle `radiogroup` explicite,
 * `aria-valuetext` maintenu à jour, `ctx.reducedMotion()` relu à chaque tick
 * (et pas seulement au montage), garde-fous d'écouteurs entre rendus,
 * IntersectionObserver suspendant le balayage hors écran, cibles ≥ 36 px.
 */

const P = 'geography-v2-e045';

/* Identifiants, tous préfixés geography-v2-e045-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const TABLE_ID = P + '-table';
const STRAT_ID = P + '-strat';
const MOBILE_ID = P + '-strat-mobile-first';
const DESKTOP_ID = P + '-strat-desktop-first';
const VW_ID = P + '-vw';
const VW_OUT_ID = P + '-vw-value';
const TARGET_ID = P + '-target';
const TARGET_OUT_ID = P + '-target-value';
const CANVAS_ID = P + '-canvas';
const LEGEND_ID = P + '-legend';
const READOUT_ID = P + '-readout';
const BADGE_ID = P + '-badge';
const PLAY_ID = P + '-play';
const REDUCED_ATTR = 'data-' + P + '-reduced';

/* Grandeurs de référence, toutes traçables et recalculées par formule. */
const BP = 1000;         /* rupture réelle de .geo-layout (styles.css:316). */
const VW_MIN = 320;      /* plus petit mobile usuel. */
const VW_MAX = 1600;     /* largeur de bureau de démonstration. */
const VW_MOBILE = 390;   /* mobile de référence (README / audits). */
const VW_DESKTOP = 1280; /* bureau de référence pour les unités. */
const PAD = 16;          /* gouttière extérieure de .geo-map. */
const PANEL_W = 340;     /* largeur de .geo-panel (styles.css:256). */
const GAP = 16;
const TARGET_REF = 44;   /* cible tactile recommandée (WCAG 2.5.5 / HIG). */
const TARGET_MIN = 24;   /* minimum WCAG 2.2 (2.5.8). */
const TARGET_MAX = 56;
const ROOT_PX = 16;      /* taille de police racine de référence. */
const SWEEP_RATE = 0.00012; /* fraction de la plage par milliseconde. */

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  vw: VW_MOBILE,
  target: TARGET_REF,
  strategy: 'mobile-first',
  playing: false,
  sweep: (VW_MOBILE - VW_MIN) / (VW_MAX - VW_MIN),
  lastTs: 0,
  rafId: 0,
  onScreen: true,
  io: null,
  ioCanvas: null,
  visibilityBound: false,
  resizeBound: false,
  motionBound: false,
  nodes: {},
};

/* ctx.reducedMotion() conservé hors du point d'entrée pour la boucle rAF. */
let ctxReduced = null;

/* ---------- Formules déterministes et formatage français ---------- */

const fmt = (n, d = 0) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* E045-03 — disposition et largeurs : tout dérive de la largeur simulée. */
const columns = (vw) => (vw < BP ? 1 : 2);

function mapWidth(vw) {
  return vw < BP
    ? Math.max(0, vw - 2 * PAD)
    : Math.max(0, vw - 2 * PAD - PANEL_W - GAP);
}

function panelWidth(vw) {
  return vw < BP ? Math.max(0, vw - 2 * PAD) : PANEL_W;
}

/* E045-06 — la cible tactile comparée à la référence de 44 px. */
const targetRatio = (target) => (target / TARGET_REF) * 100;

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

/* ---------- E045-01 : bloc CSS unique, préfixé, sans réseau ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${STRAT_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${STRAT_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
  -webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;
}
#${PANEL_ID} input[type="range"]::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${PANEL_ID} input[type="range"]::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;width:24px;height:24px;margin-top:-9px;
  border:1px solid var(--gold-bright,#f4d69e);border-radius:50%;background:var(--gold,#e6b96f);
}
#${PANEL_ID} input[type="range"]::-moz-range-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${PANEL_ID} input[type="range"]::-moz-range-thumb{
  width:24px;height:24px;border:1px solid var(--gold-bright,#f4d69e);
  border-radius:50%;background:var(--gold,#e6b96f);
}
.${P}-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:46px;padding:7px 8px;margin:6px 0;border:1px solid var(--line);border-radius:8px;
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
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,
.${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-badge{transition:none!important;animation:none!important}
}
/* Le panneau s'adapte lui-même à son conteneur : démonstration de la règle. */
@container (max-width: 520px){
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:200px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* ---------- E045-01 : section sémantique, lisible sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une mise en page responsive réorganise le même contenu selon la largeur disponible : une grille fluide remplace les largeurs fixes et une rupture (breakpoint) commute le nombre de colonnes.',
    'La vue GEOGRAPHIE applique une rupture réelle à 1000 px : au-dessus, la carte et le panneau sont côte à côte ; en dessous, ils s’empilent. Le laboratoire ci-dessous reproduit cette règle sur une largeur simulée.',
    'Une cible tactile doit mesurer au moins 24 px et, idéalement, 44 px : les dimensions sont exprimées en unités relatives et vérifiées au doigt, pas seulement à l’œil.',
    'Limite falsifiable : prédire le nombre de colonnes à 999 px puis à 1000 px, régler la largeur pour vérifier la prédiction, puis réduire la cible à 24 px pour contredire l’idée qu’une petite cible reste conforme. Le readout sert de débrief : la règle est donc testable, pas seulement décrite.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E045-02 : tableau comparatif recalculé par formule ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
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

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

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
      mobile: document.getElementById(MOBILE_ID),
      desktop: document.getElementById(DESKTOP_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      legend: document.getElementById(LEGEND_ID),
      play: document.getElementById(PLAY_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Concevoir pour toutes les largeurs (V2)');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Le responsive design réorganise une même page selon l’espace disponible. Ce laboratoire simule la largeur d’écran, montre la rupture de disposition et mesure la lisibilité des cibles tactiles.');

  /* E045-05 : choix unique -> radiogroupe natif et rôle explicite. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = STRAT_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Stratégie de rupture (choix unique)');
  const legend = document.createElement('legend');
  legend.textContent = 'Stratégie de rupture (choix unique)';
  fieldset.appendChild(legend);
  [
    ['mobile-first', 'Mobile d’abord', MOBILE_ID],
    ['desktop-first', 'Bureau d’abord', DESKTOP_ID],
  ].forEach(([value, label, id]) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-strat';
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
  const vwOut = ctx.el('span', P + '-value');
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
  vw.setAttribute('aria-valuetext', `${fmt(S.vw)} pixels`);
  vwRow.appendChild(vw);

  const targetRow = ctx.el('p', '');
  const targetLabel = document.createElement('label');
  targetLabel.setAttribute('for', TARGET_ID);
  targetLabel.appendChild(document.createTextNode('Cible tactile : '));
  const targetOut = ctx.el('span', P + '-value');
  targetOut.id = TARGET_OUT_ID;
  targetLabel.appendChild(targetOut);
  targetRow.appendChild(targetLabel);
  const target = document.createElement('input');
  target.type = 'range';
  target.id = TARGET_ID;
  target.min = String(TARGET_MIN);
  target.max = String(TARGET_MAX);
  target.step = '1';
  target.value = String(S.target);
  target.setAttribute('aria-label', `Dimension d’une cible tactile, de ${TARGET_MIN} à ${TARGET_MAX} pixels`);
  target.setAttribute('aria-valuetext', `${fmt(S.target)} pixels`);
  targetRow.appendChild(target);

  /* E045-03 / E045-08 : canvas focalisable, étiqueté, avec équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `Fil de la disposition responsive (V2). Flèches gauche et droite : réduire ou élargir la largeur simulée de 40 pixels ; Entrée : franchir la rupture de ${BP} pixels ; Origine : revenir à ${VW_MOBILE} pixels ; Fin : ${VW_MAX} pixels.`);

  const legendText = ctx.el('p', P + '-legend', 'Repères : cadre plein = largeur simulée ; ligne tiretée = rupture à 1000 px ; hachures = carte ; diagonales = panneau. Le style de trait et les étiquettes distinguent les blocs, indépendamment de la couleur.');
  legendText.id = LEGEND_ID;

  /* E045-06 : unique région live, annoncée poliment. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* E045-07 : bascule indépendante -> aria-pressed autorisé. */
  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, vwRow, targetRow, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return { panel, fresh: true, vw, target, vwOut, targetOut, mobile: document.getElementById(MOBILE_ID), desktop: document.getElementById(DESKTOP_ID), canvas, readout, legend: legendText, play };
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

/* ---------- E045-06 / E045-09 : lectures et badge ---------- */

function updateBadge() {
  const n = document.getElementById(BADGE_ID);
  if (!n) return;
  const real = (typeof window !== 'undefined' && Number.isFinite(window.innerWidth))
    ? window.innerWidth : VW_DESKTOP;
  const mobile = real <= BP;
  n.textContent = mobile
    ? `Disposition réelle (V2) : mobile (largeur ${fmt(real)} px ≤ ${BP} px) — carte et panneau empilés, cibles tactiles privilégiées.`
    : `Disposition réelle (V2) : bureau (largeur ${fmt(real)} px > ${BP} px) — carte et panneau côte à côte.`;
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
  if (n.vw) {
    n.vw.value = String(Math.round(S.vw));
    n.vw.setAttribute('aria-valuetext', `${fmt(S.vw)} pixels`);
  }
  if (n.target) {
    n.target.value = String(Math.round(S.target));
    n.target.setAttribute('aria-valuetext', `${fmt(S.target)} pixels`);
  }
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
  if (!S.onScreen) return;
  const reduced = typeof ctxReduced === 'function' && !!ctxReduced();
  if (reduced) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen) return;
  const reduced = typeof ctxReduced === 'function' && !!ctxReduced();
  if (reduced) { S.playing = false; syncControls(); return; }
  if (S.lastTs && S.playing) {
    const dt = Math.min(80, ts - S.lastTs);
    S.sweep = (S.sweep + dt * SWEEP_RATE) % 1;
    S.vw = VW_MIN + S.sweep * (VW_MAX - VW_MIN);
  }
  S.lastTs = ts;
  syncControls();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E045-09 / E045-10 : badge sur la carte et garde-fous d'écouteurs ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', P + '-badge', '');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      const reduced = typeof ctxReduced === 'function' && !!ctxReduced();
      if (document.hidden) stopLoop();
      else if (S.playing && !reduced) startLoop();
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
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.setAttribute(REDUCED_ATTR, mq.matches ? '1' : '0');
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

  /* E045-01 : bloc CSS isolé, une seule fois, identifiants préfixés. */
  ctx.css(P, CSS);

  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;

  S.nodes = ensurePanel(ctx);
  S.nodes.panel.setAttribute(REDUCED_ATTR, reduced ? '1' : '0');
  addMapBadge(ctx);
  if (reduced) { S.playing = false; stopLoop(); }

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
      S.target = clamp(Number(n.target.value), TARGET_MIN, TARGET_MAX);
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
  if (S.playing && !reduced) startLoop();
});
