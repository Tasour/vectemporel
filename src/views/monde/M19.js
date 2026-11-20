import { register } from './registry.js';

/* Lentille M19 — Repli sans WebGL (domaine B : drapeau & révélation).
 *
 * Domaine possédé : l'absence permanente de WebGL ou l'échec d'initialisation
 * du moteur. M09 garde la perte/restauration temporaire de contexte ; M07 et
 * M08 gardent la boucle rAF et la présence dans le viewport. Ce module ne
 * pilote donc ni open()/close(), ni invalidate(), ni aucun événement
 * webglcontext*. Il n'écoute que son host, son statut et ses propres nœuds.
 *
 * Zéro réseau, zéro image, zéro aléa, zéro journalisation console, aucun timer,
 * aucune boucle d'animation, aucun fichier partagé modifié.
 * Chantiers M19-01 à M19-10 : UNIFIED_AUDIT/MONDE/views/M19.md.
 */

const CSS_ID = 'monde-m19';
const FIGURE_ID = 'm19-figure';
const CANVAS_ID = 'm19-fallback';
const CAPTION_ID = 'm19-caption';
const STATUS_ID = 'm19-status';

const DEG = Math.PI / 180;
const LON0 = 10 * DEG;   // centre de la projection orthographique
const LAT0 = 45 * DEG;   // les 10 pays du jeu ont un contour visible
const SIN_LAT0 = Math.sin(LAT0);
const COS_LAT0 = Math.cos(LAT0);

const local = {
  ctx: null,
  host: null,
  scene: null,
  figure: null,
  canvas: null,
  caption: null,
  banner: null,
  engine: null,
  mode: 'idle',          // 'idle' | 'fallback' | 'webgl'
  active: false,
  webgl: null,           // tri-état : null = non sondé
  drawn: 0,
  draws: 0,
  width: 0,
  height: 0,
  highlight: null,       // code ISO survolé
  selected: null,        // code ISO sélectionné
  selectedCountry: null, // pays sélectionné (pour la légende textuelle)
  readyHooked: false,
  hoverHooked: false,
  leaveHooked: false,
  resizeObserver: null,
  resizeHost: null,
  statusObserver: null,
  observedStatus: null,
  say: () => {},
  reducedMotion: () => false,
};

/* M19-01 : une seule sonde WebGL par session de page. Le contexte de test est
 * libéré immédiatement pour ne pas consommer un slot GPU. */
function probeWebGL() {
  if (local.webgl !== null) return local.webgl;
  let ok = false;
  try {
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const probe = document.createElement('canvas');
      if (typeof probe.getContext === 'function') {
        const gl = probe.getContext('webgl2')
          || probe.getContext('webgl')
          || probe.getContext('experimental-webgl');
        if (gl) {
          ok = true;
          if (typeof gl.getExtension === 'function') {
            const lose = gl.getExtension('WEBGL_lose_context');
            if (lose && typeof lose.loseContext === 'function') lose.loseContext();
          }
        }
      }
    }
  } catch {
    ok = false;
  }
  local.webgl = ok;
  return ok;
}

/* M19-01 : mêmes deux globals que globe.js:444 — la capacité seule ne suffit
 * pas si le moteur n'a pas été chargé. */
function engineScripts() {
  if (typeof window === 'undefined') return false;
  return !!(window.THREE && window.VECTEMPOREL_GLOBE);
}

function codeOf(country) {
  return country && typeof country.code === 'string' && country.code ? country.code : null;
}

function nameOf(country) {
  return country && typeof country.name === 'string' && country.name ? country.name : null;
}

function cssRules() {
  return `
  .monde-m19-figure{
    position:absolute;inset:0;margin:0;display:grid;place-items:center;
    pointer-events:none;z-index:2;
  }
  .monde-m19-figure[hidden],.monde-m19-status[hidden]{display:none}
  .monde-m19-status{
    position:absolute;left:16px;top:62px;z-index:6;
    max-width:min(420px,72%);margin:0;padding:6px 10px;
    border:1px solid var(--line-strong);border-radius:8px;
    background:rgba(8,11,16,.88);color:var(--gold-bright,#f4d69e);
    font-size:11px;line-height:1.4;font-variant-numeric:tabular-nums;
    pointer-events:none;
  }
  .monde-m19-sr{
    position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
    overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
  }
  @media (max-width:700px){
    .monde-m19-status{left:10px;top:58px;max-width:calc(100% - 20px);font-size:10px}
  }
  @media (prefers-reduced-motion:reduce){
    .monde-m19-figure,.monde-m19-status{transition:none!important;animation:none!important}
  }
  `;
}

/* M19-06 : la figure et sa légende textuelle vivent dans le host persistant,
 * pas dans le HUD recréé à chaque rendu. Le canvas reste muet et non focusable. */
function ensureNodes(ctx) {
  const host = ctx.host && ctx.host.isConnected ? ctx.host : local.host;
  const scene = ctx.scene && ctx.scene.isConnected ? ctx.scene : local.scene;
  const parent = host || scene;
  if (!parent || typeof document === 'undefined') return;
  local.host = host && host.isConnected ? host : local.host;
  local.scene = scene && scene.isConnected ? scene : local.scene;

  let figure = document.getElementById(FIGURE_ID);
  if (!figure) figure = ctx.el('figure', 'monde-m19-figure');
  figure.id = FIGURE_ID;
  if (figure.parentNode !== parent) parent.appendChild(figure);

  let canvas = figure.querySelector('canvas');
  if (!canvas) canvas = ctx.el('canvas', 'monde-m19-canvas');
  canvas.id = CANVAS_ID;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.removeAttribute('tabindex');
  if (canvas.parentNode !== figure) figure.appendChild(canvas);

  let caption = figure.querySelector('figcaption');
  if (!caption) caption = ctx.el('figcaption', 'monde-m19-sr');
  caption.id = CAPTION_ID;
  if (caption.parentNode !== figure) figure.appendChild(caption);

  let banner = document.getElementById(STATUS_ID);
  if (!banner) banner = ctx.el('p', 'monde-m19-status');
  banner.id = STATUS_ID;
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('aria-atomic', 'true');
  if (banner.parentNode !== parent) parent.appendChild(banner);

  local.figure = figure;
  local.canvas = canvas;
  local.caption = caption;
  local.banner = banner;
}

/* M19-02 : le statut de globe.js est le seul signal d'échec d'initialisation.
 * Un seul observateur, déplacé sur le nœud courant à chaque rendu. */
function bindStatus() {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  const node = document.getElementById('globe-status');
  if (!node || node === local.observedStatus) return;
  if (local.statusObserver) local.statusObserver.disconnect();
  local.observedStatus = node;
  local.statusObserver = new MutationObserver(() => {
    if (!node.isConnected) return;
    const kind = node.dataset.kind;
    if (kind === 'error') activate();
    else if (kind === 'ready') deactivate();
  });
  local.statusObserver.observe(node, { attributes: true, attributeFilter: ['data-kind'] });
}

/* M19-04 : un seul ResizeObserver, sur le host persistant. */
function bindResize() {
  if (typeof ResizeObserver === 'undefined') return;
  const host = local.host;
  if (!host || !host.isConnected) return;
  if (local.resizeHost === host && local.resizeObserver) return;
  if (local.resizeObserver) local.resizeObserver.disconnect();
  local.resizeHost = host;
  local.resizeObserver = new ResizeObserver(() => {
    if (local.active) draw(false);
  });
  local.resizeObserver.observe(host);
}

/* M19-07 : un seul jeu de callbacks, enregistré une fois dans le registre. */
function bindCallbacks(ctx) {
  if (!local.readyHooked && typeof ctx.onReady === 'function') {
    local.readyHooked = true;
    ctx.onReady((payload) => {
      if (payload && payload.engine) local.engine = payload.engine;
      const host = payload && payload.host && payload.host.isConnected ? payload.host : local.host;
      if (host) local.host = host;
      /* Le moteur a réussi : le WebGL reprend la main, même si la sonde a
         produit un faux négatif. */
      deactivate();
    });
  }
  if (!local.hoverHooked && typeof ctx.onHover === 'function') {
    local.hoverHooked = true;
    ctx.onHover((payload) => {
      const code = payload && payload.code ? payload.code : null;
      if (code === local.highlight) return;
      local.highlight = code;
      if (local.host) local.host.dataset.m19Highlight = code || '';
      if (local.active) draw(true);
    });
  }
  if (!local.leaveHooked && typeof ctx.onLeave === 'function') {
    local.leaveHooked = true;
    ctx.onLeave(() => {
      if (!local.highlight) return;
      local.highlight = null;
      if (local.host) local.host.dataset.m19Highlight = '';
      if (local.active) draw(true);
    });
  }
}

function updateWitness() {
  const host = local.host;
  if (!host) return;
  host.dataset.m19Mode = local.mode;
  host.dataset.m19Webgl = probeWebGL() ? '1' : '0';
  host.dataset.m19Engine = engineScripts() ? '1' : '0';
  host.dataset.m19Drawn = String(local.drawn);
  host.dataset.m19Draws = String(local.draws);
  host.dataset.m19Highlight = local.highlight || '';
  host.dataset.m19Selected = local.selected || '';
  host.dataset.m19Reduced = local.reducedMotion() ? '1' : '0';
}

function writeBanner() {
  const banner = local.banner;
  if (!banner) return;
  const text = local.active
    ? `Vue plane locale active : ${local.drawn} pays projetés sur une sphère. Le rendu 3D n'est pas disponible ; la liste des pays et les flèches du clavier restent utilisables.`
    : '';
  if (banner.textContent !== text) banner.textContent = text;
  banner.hidden = !local.active;
}

function writeCaption() {
  const caption = local.caption;
  if (!caption) return;
  const selected = nameOf(local.selectedCountry);
  const text = local.active
    ? `Vue plane du monde : ${local.drawn} pays documentés projetés sur une sphère. `
      + (selected ? `Sélection courante : ${selected}. ` : 'Aucun pays sélectionné. ')
      + 'Le même choix est offert par la liste des pays.'
    : '';
  if (caption.textContent !== text) caption.textContent = text;
}

function activate() {
  if (local.mode === 'fallback' && local.active) {
    updateWitness();
    return;
  }
  local.mode = 'fallback';
  local.active = true;
  if (local.figure) local.figure.hidden = false;
  updateWitness();
  draw(false);
  writeBanner();
  writeCaption();
}

function deactivate() {
  if (local.mode === 'webgl' && !local.active) return;
  local.mode = 'webgl';
  local.active = false;
  if (local.figure) local.figure.hidden = true;
  updateWitness();
  writeBanner();
  writeCaption();
}

function decide() {
  const host = local.host;
  const engineCanvas = host && typeof host.querySelector === 'function'
    ? (host.querySelector('canvas.globe-webgl') || null)
    : null;
  /* Un canvas WebGL présent prouve que le moteur a réussi son init. */
  if (engineCanvas) {
    deactivate();
    return;
  }
  if (!probeWebGL() || !engineScripts()) activate();
  else deactivate();
}

/* M19-03 : projection orthographique. z > 0 = hémisphère visible. */
function project(lon, lat) {
  const lambda = lon * DEG;
  const phi = lat * DEG;
  const dLambda = lambda - LON0;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const cosD = Math.cos(dLambda);
  return {
    x: cosPhi * Math.sin(dLambda),
    y: COS_LAT0 * sinPhi - SIN_LAT0 * cosPhi * cosD,
    z: SIN_LAT0 * sinPhi + COS_LAT0 * cosPhi * cosD,
  };
}

function tint(hex, alpha) {
  if (typeof hex !== 'string') return `rgba(230,185,111,${alpha})`;
  let value = hex.trim().replace('#', '');
  if (value.length === 3) value = value.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(230,185,111,${alpha})`;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawGraticule(g, cx, cy, radius, dpr) {
  g.strokeStyle = 'rgba(168,161,152,.18)';
  g.lineWidth = Math.max(0.5, dpr * 0.6);
  for (let lon = -180; lon <= 150; lon += 30) {
    let previous = null;
    for (let lat = -80; lat <= 80; lat += 5) {
      const point = project(lon, lat);
      if (previous && previous.z > 0 && point.z > 0) {
        g.beginPath();
        g.moveTo(cx + radius * previous.x, cy - radius * previous.y);
        g.lineTo(cx + radius * point.x, cy - radius * point.y);
        g.stroke();
      }
      previous = point;
    }
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    let previous = null;
    for (let lon = -180; lon <= 180; lon += 5) {
      const point = project(lon, lat);
      if (previous && previous.z > 0 && point.z > 0) {
        g.beginPath();
        g.moveTo(cx + radius * previous.x, cy - radius * previous.y);
        g.lineTo(cx + radius * point.x, cy - radius * point.y);
        g.stroke();
      }
      previous = point;
    }
  }
}

/* M19-03 / M19-07 : un seul tracé, déterministe, sans animation. */
function draw(force) {
  if (!local.active) return;
  const host = local.host;
  const canvas = local.canvas;
  if (!host || !canvas || typeof document === 'undefined') return;

  let rect = null;
  try { rect = host.getBoundingClientRect(); } catch { rect = null; }
  const cssWidth = rect && rect.width > 0 ? rect.width : (host.clientWidth || 320);
  const cssHeight = rect && rect.height > 0 ? rect.height : (host.clientHeight || 320);
  const dprRaw = typeof window !== 'undefined' && window.devicePixelRatio > 0
    ? window.devicePixelRatio : 1;
  const dpr = Math.min(2, dprRaw);
  const width = Math.max(1, Math.round(cssWidth * dpr));
  const height = Math.max(1, Math.round(cssHeight * dpr));

  if (!force && width === local.width && height === local.height) return;
  local.width = width;
  local.height = height;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  let g = null;
  try { g = canvas.getContext('2d'); } catch { g = null; }
  if (!g) {
    if (host) host.dataset.m19Canvas = 'absent';
    writeBanner();
    return;
  }
  if (host) host.dataset.m19Canvas = '2d';

  try {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.max(8, Math.min(width, height) * 0.42);
    g.clearRect(0, 0, width, height);

    g.beginPath();
    g.arc(cx, cy, radius, 0, Math.PI * 2);
    g.fillStyle = 'rgba(18,28,42,.86)';
    g.fill();
    g.strokeStyle = 'rgba(230,185,111,.42)';
    g.lineWidth = Math.max(1, dpr);
    g.stroke();

    drawGraticule(g, cx, cy, radius, dpr);

    const countries = Array.isArray(local.ctx && local.ctx.countries)
      ? local.ctx.countries : [];
    let drawn = 0;
    for (const country of countries) {
      if (!country || !Array.isArray(country.outline)) continue;
      const visible = [];
      for (const pair of country.outline) {
        if (!Array.isArray(pair) || pair.length < 2) continue;
        const lon = Number(pair[0]);
        const lat = Number(pair[1]);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        const point = project(lon, lat);
        if (point.z > 0) visible.push(point);
      }
      if (visible.length < 3) continue;

      const code = codeOf(country);
      const highlighted = !!code && code === local.highlight;
      const selected = !!code && code === local.selected;
      g.beginPath();
      visible.forEach((point, index) => {
        const sx = cx + radius * point.x;
        const sy = cy - radius * point.y;
        if (index === 0) g.moveTo(sx, sy);
        else g.lineTo(sx, sy);
      });
      g.closePath();
      g.fillStyle = highlighted
        ? 'rgba(244,214,158,.35)'
        : tint(country.color, selected ? 0.3 : 0.16);
      g.fill();
      g.lineWidth = highlighted ? 2.6 * dpr : (selected ? 1.9 : 1.2) * dpr;
      g.strokeStyle = highlighted ? '#f4d69e' : tint(country.color, 0.92);
      g.stroke();

      if (selected) {
        let sx = 0;
        let sy = 0;
        for (const point of visible) {
          sx += cx + radius * point.x;
          sy += cy - radius * point.y;
        }
        sx /= visible.length;
        sy /= visible.length;
        g.beginPath();
        g.arc(sx, sy, Math.max(2.5, 3.4 * dpr), 0, Math.PI * 2);
        g.fillStyle = '#f4d69e';
        g.fill();
      }
      drawn += 1;
    }
    local.drawn = drawn;
    local.draws += 1;
  } catch {
    /* Un contour mal formé ne doit jamais interrompre le rendu de la vue. */
  }

  updateWitness();
  writeBanner();
  writeCaption();
}

/* M19-08 : un seul point d'entrée, idempotent sur les rendus répétés. */
function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  local.ctx = ctx;
  local.say = typeof ctx.say === 'function' ? ctx.say : () => {};
  local.reducedMotion = typeof ctx.reducedMotion === 'function'
    ? ctx.reducedMotion : () => false;

  ctx.css(CSS_ID, cssRules());
  ensureNodes(ctx);
  bindStatus();
  bindResize();
  bindCallbacks(ctx);

  const code = codeOf(ctx.selected);
  const changed = code !== local.selected;
  local.selected = code;
  local.selectedCountry = ctx.selected || null;
  if (changed && local.active) draw(true);

  decide();
  updateWitness();
}

register('M19', (ctx) => { install(ctx); });
