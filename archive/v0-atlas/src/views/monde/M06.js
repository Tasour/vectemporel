import { register } from './registry.js';

/* Lentille M06 — DPR et budget de pixels (domaine A : rendu WebGL).
 *
 * Le moteur est un singleton (public/globe-engine.js) exposé par
 * window.VECTEMPOREL_GLOBE ; ctx.onReady fournit { engine, host, selected }.
 * Cette lentille n'écrit dans aucun fichier partagé : elle se contente
 * d'observer le budget réel (tampon, DPR, appels, mémoire) et de coordonner
 * les recalculs de densité de pixels via l'API publique du moteur
 * (resize / invalidate / getInfo). Dix chantiers, tous implémentés ici.
 */

const STYLE_ID = 'monde-m06';
const PANEL_ID = 'monde-m06-budget';
const LINE_ID = 'monde-m06-budget-line';
const BADGE_ID = 'monde-m06-budget-badge';
const DETAIL_ID = 'monde-m06-budget-detail';

/* Constantes miroirs de globe-engine.js:202-204 (source unique documentée). */
const PIXEL_BUDGET = 2200000;
const DPR_MAX = 1.5;
const DPR_MIN = 0.7;
const DPR_EPS = 0.001;

/* État module : un seul moteur, un seul jeu d'écouteurs, un seul scheduler. */
let engineRef = null;
let hostRef = null;
let nodes = null;
let listenersInstalled = false;
let dprQuery = null;
let refreshFrame = 0;
let resizeCount = 0;

const CSS = `
  #${PANEL_ID} {
    position: absolute; right: 16px; bottom: 16px; z-index: 5;
    max-width: 290px; padding: 7px 10px;
    border: 1px solid var(--line); border-radius: 8px;
    background: rgba(8,11,16,.9); color: var(--muted);
    font-size: 11px; line-height: 1.45; font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  #${PANEL_ID} .monde-m06-kicker {
    display: block; margin-bottom: 3px;
    font-size: 9px; letter-spacing: .14em; text-transform: uppercase;
    color: var(--ink-soft);
  }
  #${LINE_ID} { margin: 0; color: var(--ink-soft); }
  #${BADGE_ID} { display: block; margin-top: 3px; font-weight: 600; color: var(--gold-bright); }
  #${BADGE_ID}[data-state="warn"] { color: var(--red); }
  #${DETAIL_ID} { display: block; margin-top: 3px; color: var(--muted); }
  @media (max-width: 700px) {
    #${PANEL_ID} { right: 10px; bottom: 10px; max-width: 210px; font-size: 10px; }
  }
`;

function fmt(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

function readInfo() {
  const engine = engineRef || window.VECTEMPOREL_GLOBE;
  if (!engine || typeof engine.getInfo !== 'function') return null;
  try { return engine.getInfo(); } catch { return null; }
}

/* M06-01/02/05/06/07/08 : une seule mesure dérivée, sans allocation en boucle. */
function measure() {
  const info = readInfo();
  if (!info || !info.width || !info.height) return null;
  const host = hostRef;
  const rect = host && typeof host.getBoundingClientRect === 'function'
    ? host.getBoundingClientRect() : null;
  const cssW = rect && rect.width > 0 ? rect.width : 0;
  const cssH = rect && rect.height > 0 ? rect.height : 0;
  const pixels = info.width * info.height;
  const usage = pixels / PIXEL_BUDGET;
  const dpr = Number(info.pixelRatio) || 0;
  const ratio = cssW > 0 ? info.width / cssW : dpr;
  return {
    info, cssW, cssH, pixels, usage, dpr,
    coherent: cssW > 0 ? Math.abs(ratio - dpr) <= 0.05 : true,
    floorHit: dpr <= DPR_MIN + DPR_EPS && cssW * cssH * DPR_MIN * DPR_MIN > PIXEL_BUDGET,
    calls: info.calls, triangles: info.triangles,
    geometries: info.geometries, textures: info.textures,
  };
}

function paint(m) {
  if (!nodes) return;
  if (!m) {
    const pending = !!(window.VECTEMPOREL_GLOBE && !window.VECTEMPOREL_GLOBE.ready);
    const over = pending
      ? 'Initialisation du moteur…'
      : 'Moteur 3D indisponible · budget non mesurable';
    nodes.line.textContent = over;
    nodes.badge.textContent = 'Budget : non mesuré';
    nodes.badge.dataset.state = 'idle';
    nodes.detail.textContent = `Plafond de référence : ${fmt(PIXEL_BUDGET)} pixels · DPR ${DPR_MIN}–${DPR_MAX}.`;
    return;
  }
  const inBudget = m.usage <= 1;
  nodes.line.textContent =
    `DPR ${m.dpr.toFixed(2)} · tampon ${fmt(m.info.width)}×${fmt(m.info.height)} · ${fmt(m.pixels)} px`;
  nodes.badge.textContent = inBudget
    ? `Budget ${Math.round(m.usage * 100)} % · ${fmt(PIXEL_BUDGET - m.pixels)} px libres`
    : `Budget dépassé de ${Math.round((m.usage - 1) * 100)} %`;
  nodes.badge.dataset.state = inBudget ? 'ok' : 'warn';
  const coherence = m.coherent
    ? 'picking DPR-indépendant : cohérent'
    : 'incohérence tampon/écran : à vérifier';
  const floor = m.floorHit
    ? ' · qualité réduite (plancher DPR 0,7)'
    : '';
  nodes.detail.textContent =
    `${m.calls} appel(s) · ${fmt(m.triangles)} triangles · ${m.geometries} géométrie(s) · ${m.textures} texture(s) · ${coherence}${floor} · ${resizeCount} redim.`;
}

/* M06-04/10 : un seul rafraîchissement par frame, jamais de boucle continue. */
function refresh() {
  refreshFrame = 0;
  if (document.hidden) return;
  paint(measure());
}

function scheduleRefresh() {
  if (refreshFrame || document.hidden) return;
  refreshFrame = requestAnimationFrame(refresh);
}

/* M06-03 : réarmer la sonde à chaque changement de densité d'écran. */
function onDprChange() {
  const engine = engineRef || window.VECTEMPOREL_GLOBE;
  if (engine && typeof engine.resize === 'function') engine.resize();
  if (engine && typeof engine.invalidate === 'function') engine.invalidate();
  armDprWatch();
  scheduleRefresh();
}

function armDprWatch() {
  if (dprQuery) {
    try {
      if (dprQuery.removeEventListener) dprQuery.removeEventListener('change', onDprChange);
      else if (dprQuery.removeListener) dprQuery.removeListener('change', onDprChange);
    } catch { /* sonde déjà libérée */ }
    dprQuery = null;
  }
  try {
    const dpr = window.devicePixelRatio || 1;
    dprQuery = window.matchMedia(`(resolution: ${dpr}dppx)`);
    if (dprQuery.addEventListener) dprQuery.addEventListener('change', onDprChange);
    else if (dprQuery.addListener) dprQuery.addListener(onDprChange);
  } catch { /* resolution non supportée : le resize classique reste actif */ }
}

function installListeners() {
  if (listenersInstalled) return;
  listenersInstalled = true;
  window.addEventListener('resize', scheduleRefresh, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleRefresh();
  });
  const host = hostRef;
  if (host && 'ResizeObserver' in window) {
    const ro = new ResizeObserver(scheduleRefresh);
    ro.observe(host);
  }
  armDprWatch();
}

function buildPanel(scene) {
  if (!scene || typeof scene.querySelector !== 'function') return;
  if (scene.querySelector(`#${PANEL_ID}`)) return;
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  const kicker = document.createElement('span');
  kicker.className = 'monde-m06-kicker';
  kicker.textContent = 'Budget de pixels';
  const line = document.createElement('p');
  line.id = LINE_ID;
  line.textContent = 'Mesure en attente du moteur…';
  const badge = document.createElement('span');
  badge.id = BADGE_ID;
  badge.dataset.state = 'idle';
  badge.setAttribute('role', 'status');
  badge.setAttribute('aria-live', 'polite');
  badge.textContent = 'Budget : non mesuré';
  const detail = document.createElement('span');
  detail.id = DETAIL_ID;
  detail.textContent = '';
  panel.append(kicker, line, badge, detail);
  scene.appendChild(panel);
  nodes = { panel, line, badge, detail };
}

register('M06', (ctx) => {
  const { css, scene, host } = ctx;
  css(STYLE_ID, CSS);
  hostRef = host || hostRef;
  buildPanel(scene);
  paint(measure()); // M06-09 : état lisible même sans moteur / sans WebGL.
  installListeners();

  ctx.onReady((payload) => {
    if (payload && payload.engine) engineRef = payload.engine;
    else engineRef = window.VECTEMPOREL_GLOBE || engineRef;
    if (payload && payload.host) hostRef = payload.host;
    resizeCount = 0;
    paint(measure());
    installListeners();
  });
});
