import { register } from './registry.js';

/* Lentille M05 — Zoom et bornes (domaine A : rendu WebGL).
 *
 * Le moteur (public/globe-engine.js) borne la distance caméra z dans [1.8, 4.8]
 * et l'interpole désormais en douceur (frame() :723-733). Cette lentille maintient
 * un MODELE D'OMBRE du zoom visé (zoomTarget), calqué sur la formule du moteur,
 * pour rendre les bornes visibles, annonçables et actionnables sans modifier le
 * moteur ni ajouter de boucle rAF : le badge affiche la valeur visée, le moteur
 * rattrape la caméra de son côté. Aucun réseau, aucun aléa, aucun appel à la
 * console : toutes les interactions passent par des WheelEvent synthétiques,
 * exactement comme globe.js:248-261.
 */

/* Constantes miroir du moteur — documentées comme telles (risque de dérive). */
const Z_MIN = 1.8;
const Z_MAX = 4.8;
const Z_DEFAULT = 4.05;
const WHEEL_SCALE = 0.0014;
const WHEEL_STEP = 360;        // pas clavier : 0,504 en z (~ un cran franc)
const LINE_TO_PX = 16;         // deltaMode=1 (lignes) -> pixels
const BOUND_MS = 1500;         // une seule annonce de borne par 1,5 s
const M17_LEGEND_ID = 'm17-legend';
const CLEAR_GAP = 8;           // espace réservé sous la légende M17
const MIN_BOTTOM = 6;          // plancher de positionnement depuis le bas

/* Bornes en pourcentage, recalculées depuis les constantes (84 % / 225 %). */
const PCT_MIN = Math.round(100 * Z_DEFAULT / Z_MAX);
const PCT_MAX = Math.round(100 * Z_DEFAULT / Z_MIN);

const IN_LABELS = ['Zoomer sur le globe', 'Zoom +'];
const OUT_LABELS = ['Dézoomer sur le globe', 'Zoom −', 'Zoom -'];

/* Une seule carte, en bas à droite : le badge contient sa consigne en pied,
 * ce qui garantit qu'ils ne peuvent pas se chevaucher (flux CSS, plus de
 * décalages fixes 16/64 px). La position de la carte est calculée une fois par
 * rendu, au `resize` et au `onReady`, pour passer sous la légende M17 (dont le
 * bord bas est ancré en CSS : 125 px desktop, 78 px mobile — donc stable).
 * Pas de rAF : le moteur interpole déjà la caméra de son côté. */
const CSS = `
  #globe-m05-zoom{
    position:absolute;right:16px;bottom:16px;z-index:5;
    box-sizing:border-box;width:min(252px,42%);padding:8px 11px 7px;
    border:1px solid var(--line-strong);border-radius:9px;
    background:rgba(8,11,16,.9);color:var(--ink);
    box-shadow:0 8px 24px rgba(0,0,0,.34);
    font:12px/1.45 inherit;font-variant-numeric:tabular-nums;text-align:left;
    pointer-events:none;
  }
  #globe-m05-zoom[data-bound]{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold),0 8px 24px rgba(0,0,0,.34)}
  .m05-head{display:flex;align-items:baseline;gap:7px}
  .m05-kicker{color:var(--muted);font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
  .m05-value{display:inline-flex;align-items:baseline;gap:2px;color:var(--gold-bright)}
  .m05-pct{font-size:25px;font-weight:700;line-height:1;letter-spacing:-.02em}
  .m05-unit{font-size:13px;font-weight:600}
  .m05-meta{margin-left:auto;color:var(--muted);font-size:11px}
  .m05-bound{display:block;margin-top:4px;color:var(--gold-bright);font-size:10px;font-weight:600;letter-spacing:.03em}
  .m05-bound[hidden]{display:none}
  .m05-scale{position:relative;height:5px;margin-top:8px;border-radius:999px;background:rgba(255,255,255,.12)}
  .m05-fill{position:absolute;inset:0 auto 0 0;width:calc(var(--m05-t,0) * 100%);border-radius:999px;background:var(--gold)}
  .m05-dot{position:absolute;top:50%;left:calc(var(--m05-t,0) * 100%);width:10px;height:10px;border-radius:50%;
    background:var(--gold-bright);transform:translate(-50%,-50%);box-shadow:0 0 0 2px rgba(8,11,16,.92)}
  .globe-m05-hint{margin:7px 0 0;padding-top:6px;border-top:1px solid var(--line);
    color:var(--muted);font-size:10px;line-height:1.4;text-align:left}
  .globe-m05-hint kbd{display:inline-block;padding:0 4px;border:1px solid var(--line);border-radius:4px;
    background:rgba(255,255,255,.04);color:var(--ink-soft);font:10px/1.55 inherit}
  .m05-readout{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
    clip:rect(0 0 0 0);white-space:nowrap;border:0}
  .globe-controls button:disabled{opacity:.4;cursor:not-allowed}
  .globe-m05-reset{font-size:18px!important;line-height:1}
  .globe-m05-reset:focus-visible,.globe-controls button:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  /* Repli de placeBadge() : écran trop court, on masque la consigne (elle reste
     dans aria-describedby) pour que la carte tienne sous la légende M17. */
  #globe-m05-zoom[data-compact] .globe-m05-hint{
    position:absolute;width:1px;height:1px;padding:0;margin:-1px;
    overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  @media (max-width:700px){
    #globe-m05-zoom{right:8px;width:min(196px,52%);padding:7px 9px}
    .m05-pct{font-size:21px}
    .globe-m05-hint{position:absolute;width:1px;height:1px;padding:0;margin:-1px;
      overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  }
  @media (prefers-reduced-motion:reduce){.m05-dot{box-shadow:none}}
`;

/* État module : survit aux re-renders de la coque (host et canvas persistés). */
let ctxRef = null;
let attached = false;
let ready = false;
let z = Z_DEFAULT;
let pinch = null;
const pointers = new Map();
const syntheticWheels = new WeakSet();
let lastBoundAt = 0;
let lastBadgeText = '';
let percentShown = -1;
let zoomInButton = null;
let zoomOutButton = null;
let resetButton = null;
let badgeNode = null;
let pctNode = null;
let metaNode = null;
let boundNode = null;
let readoutNode = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function percent() {
  return Math.round(100 * Z_DEFAULT / z);
}

function fmt(value) {
  return value.toFixed(2).replace('.', ',');
}

function inHost(node) {
  return Boolean(ctxRef && ctxRef.host && node instanceof Node && ctxRef.host.contains(node));
}

function globeView() {
  return Boolean(ctxRef && ctxRef.state && ctxRef.state.view === 'globe');
}

function canvas() {
  if (!ctxRef || !ctxRef.host) return null;
  return ctxRef.host.querySelector('canvas.globe-webgl') || ctxRef.host.querySelector('canvas');
}

/* M05-01 / M05-05 / M05-08 : unique point de commande, un WheelEvent synthétique
 * (deltaMode 0, donc non réécrit par la normalisation M05-06). */
function dispatchWheel(deltaY) {
  const target = canvas();
  if (!target || !deltaY) return;
  const rect = target.getBoundingClientRect();
  const event = new WheelEvent('wheel', {
    deltaY,
    deltaMode: 0,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    bubbles: true,
    cancelable: true,
  });
  syntheticWheels.add(event);
  target.dispatchEvent(event);
}

/* M05-02 : annonce de saturation, throttlée pour éviter le spam molette. */
function announceBound(zoomingIn) {
  const now = performance.now();
  if (now - lastBoundAt < BOUND_MS) return;
  lastBoundAt = now;
  if (ctxRef && typeof ctxRef.say === 'function') {
    ctxRef.say(zoomingIn
      ? `Zoom maximal atteint : distance ${fmt(Z_MIN)}, borne rapprochée du globe.`
      : `Zoom minimal atteint : distance ${fmt(Z_MAX)}, borne éloignée du globe.`);
  }
}

/* M05-01 / M05-03 / M05-04 : le modèle d'ombre pilote badge, bornes et boutons. */
function setZoom(next, zoomingIn) {
  const previous = z;
  z = clamp(next, Z_MIN, Z_MAX);
  if (z === previous && (z === Z_MIN || z === Z_MAX)) announceBound(zoomingIn);
  refreshUI();
}

/* Positionne la carte sous la légende M17. Le bord bas de M17 est ancré en CSS
 * (stable), sa hauteur peut varier : on ne mesure donc que son bord bas. Aucune
 * boucle : la mesure a lieu au rendu, au `onReady` et au `resize`. */
function placeBadge() {
  if (!badgeNode || !ctxRef || !ctxRef.scene) return;
  const legend = document.getElementById(M17_LEGEND_ID);
  if (!legend || !legend.isConnected) {
    badgeNode.style.bottom = `${MIN_BOTTOM}px`;
    return;
  }
  badgeNode.removeAttribute('data-compact');
  const sceneRect = ctxRef.scene.getBoundingClientRect();
  const legendOffset = sceneRect.bottom - legend.getBoundingClientRect().bottom;
  let bottom = legendOffset - CLEAR_GAP - badgeNode.offsetHeight;
  if (bottom < MIN_BOTTOM) {
    badgeNode.setAttribute('data-compact', '');
    bottom = legendOffset - CLEAR_GAP - badgeNode.offsetHeight;
  }
  badgeNode.style.bottom = `${Math.max(MIN_BOTTOM, Math.round(bottom))}px`;
}

function refreshUI() {
  const p = percent();
  /* Curseur continu : dérivé de z (pas du pourcentage arrondi), donc fluide à
     chaque cran de molette, sans rAF. L'interpolation visuelle reste au moteur. */
  const raw = 100 * Z_DEFAULT / z;
  if (badgeNode) badgeNode.style.setProperty('--m05-t', clamp((raw - PCT_MIN) / (PCT_MAX - PCT_MIN), 0, 1).toFixed(4));
  if (p !== percentShown) {
    percentShown = p;
    let text = `Zoom ${p} % · distance ${fmt(z)}`;
    if (z <= Z_MIN + 1e-6) text += ' · borne rapprochée';
    else if (z >= Z_MAX - 1e-6) text += ' · borne éloignée';
    lastBadgeText = text;
    if (pctNode) pctNode.textContent = String(p);
    if (metaNode) metaNode.textContent = `distance ${fmt(z)}`;
    if (readoutNode) readoutNode.textContent = text;
  }
  const near = z <= Z_MIN + 1e-6;
  const far = z >= Z_MAX - 1e-6;
  if (badgeNode) {
    if (near) badgeNode.dataset.bound = 'near';
    else if (far) badgeNode.dataset.bound = 'far';
    else delete badgeNode.dataset.bound;
  }
  if (boundNode) {
    if (near) { boundNode.textContent = 'Borne rapprochée · distance minimale'; boundNode.hidden = false; }
    else if (far) { boundNode.textContent = 'Borne éloignée · distance maximale'; boundNode.hidden = false; }
    else boundNode.hidden = true;
  }
  if (zoomInButton) zoomInButton.disabled = near;
  if (zoomOutButton) zoomOutButton.disabled = far;
  if (resetButton) resetButton.disabled = Math.abs(z - Z_DEFAULT) < 0.01;
  if (ctxRef && ctxRef.host) {
    if (near) ctxRef.host.dataset.m05Bound = 'near';
    else if (far) ctxRef.host.dataset.m05Bound = 'far';
    else delete ctxRef.host.dataset.m05Bound;
  }
}

/* M05-01 : mirroir de onWheel (globe-engine.js:694-697). */
function observeWheel(event) {
  if (event.deltaMode !== 0) return; // M05-06 réécrit les autres modes
  if (!globeView() || !inHost(event.target)) return;
  setZoom(z + event.deltaY * WHEEL_SCALE, event.deltaY < 0);
}

/* M05-06 : le moteur applique deltaY brut ; Firefox peut fournir des lignes
 * (deltaMode=1). On réécrit en pixels avant qu'il ne voie l'événement. */
function normalizeWheel(event) {
  if (syntheticWheels.has(event) || event.deltaMode === 0) return;
  if (!globeView() || !inHost(event.target)) return;
  const factor = event.deltaMode === 1
    ? LINE_TO_PX
    : (ctxRef.host.clientHeight || window.innerHeight || 600);
  const deltaY = event.deltaY * factor;
  if (!deltaY) return;
  event.preventDefault();
  event.stopPropagation();
  dispatchWheel(deltaY);
}

/* M05-07 : mirroir du pincement (globe-engine.js:590-613). */
function onPointerDown(event) {
  if (!globeView() || !inHost(event.target)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2) {
    const points = [...pointers.values()];
    pinch = {
      distance: Math.max(20, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)),
      z0: z,
    };
  }
}

function onPointerMove(event) {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (!pinch || pointers.size < 2) return;
  const points = [...pointers.values()].slice(0, 2);
  const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  if (Math.abs(distance - pinch.distance) < 1) return;
  setZoom(pinch.z0 * (pinch.distance / Math.max(20, distance)), distance < pinch.distance);
}

function onPointerEnd(event) {
  pointers.delete(event.pointerId);
  if (pointers.size < 2) pinch = null;
}

/* M05-05 : raccourcis dédiés, sans toucher aux touches réservées du routeur. */
function onKeyDown(event) {
  if (!globeView()) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  let delta = 0;
  if (event.key === '+' || event.key === '=' || event.key === 'PageUp') delta = -WHEEL_STEP;
  else if (event.key === '-' || event.key === '_' || event.key === 'PageDown') delta = WHEEL_STEP;
  else return;
  event.preventDefault();
  dispatchWheel(delta);
}

/* M05-08 : retour exact à z=4.05 en un seul événement (formule linéaire). */
function resetZoom() {
  if (Math.abs(z - Z_DEFAULT) < 0.01) return;
  dispatchWheel((Z_DEFAULT - z) / WHEEL_SCALE);
  if (ctxRef && typeof ctxRef.say === 'function') ctxRef.say('Zoom réinitialisé à 100 %.');
}

function findZoomButtons() {
  const scope = ctxRef && ctxRef.scene ? ctxRef.scene : document;
  const buttons = [...scope.querySelectorAll('.globe-controls button')];
  const find = (labels) => buttons.find((button) => {
    const label = button.getAttribute('aria-label') || '';
    const text = button.textContent || '';
    return labels.some((needle) => label.includes(needle) || text.includes(needle));
  });
  return { inBtn: find(IN_LABELS), outBtn: find(OUT_LABELS) };
}

/* Construit la carte : toutes les parties décoratives sont aria-hidden, seule
 * `.m05-readout` est annoncée par la région live — consigne incluse dans
 * `aria-describedby` du host, sans bavardage ARIA à chaque cran. */
function buildBadge(ctx) {
  const badge = ctx.el('div', 'globe-m05-zoom');
  badge.id = 'globe-m05-zoom';
  badge.setAttribute('role', 'status');
  badge.setAttribute('aria-live', 'polite');
  badge.setAttribute('aria-atomic', 'true');

  const head = ctx.el('div', 'm05-head');
  head.setAttribute('aria-hidden', 'true');
  const kicker = ctx.el('span', 'm05-kicker', 'Zoom');
  const value = ctx.el('span', 'm05-value');
  pctNode = ctx.el('span', 'm05-pct', '100');
  const unit = ctx.el('span', 'm05-unit', '%');
  value.append(pctNode, unit);
  metaNode = ctx.el('span', 'm05-meta', `distance ${fmt(Z_DEFAULT)}`);
  head.append(kicker, value, metaNode);

  boundNode = ctx.el('span', 'm05-bound', '');
  boundNode.hidden = true;
  boundNode.setAttribute('aria-hidden', 'true');

  const scale = ctx.el('span', 'm05-scale');
  scale.setAttribute('aria-hidden', 'true');
  scale.append(ctx.el('span', 'm05-fill'), ctx.el('span', 'm05-dot'));

  const hint = ctx.el('p', 'globe-m05-hint');
  hint.id = 'globe-m05-hint';
  hint.setAttribute('aria-hidden', 'true');
  const key = (text) => ctx.el('kbd', '', text);
  hint.append(
    ctx.el('span', '', 'Molette, pincement, '), key('+'), ctx.el('span', '', ' / '), key('−'),
    ctx.el('span', '', ' ou '), key('PageUp'), ctx.el('span', '', ' / '), key('PageDown'),
    ctx.el('span', '', `. Bornes ${fmt(Z_MIN)} à ${fmt(Z_MAX)} (${PCT_MIN} %–${PCT_MAX} %).`),
  );

  readoutNode = ctx.el('span', 'm05-readout', `Zoom 100 % · distance ${fmt(Z_DEFAULT)}`);
  badge.append(head, boundNode, scale, hint, readoutNode);
  return badge;
}

/* M05-03 / M05-04 / M05-09 : un seul nœud par id, garde d'existence. */
function ensureNodes(ctx) {
  ctx.css('monde-m05', CSS);
  const scene = ctx.scene;
  if (!scene) return;

  if (!document.getElementById('globe-m05-zoom')) {
    badgeNode = buildBadge(ctx);
    scene.appendChild(badgeNode);
  } else {
    badgeNode = document.getElementById('globe-m05-zoom');
    pctNode = badgeNode.querySelector('.m05-pct');
    metaNode = badgeNode.querySelector('.m05-meta');
    boundNode = badgeNode.querySelector('.m05-bound');
    readoutNode = badgeNode.querySelector('.m05-readout');
  }

  /* La consigne vit dans le badge : elle est donc retrouvée via lui, tout en
     gardant son id unique pour `aria-describedby`. */
  const hint = document.getElementById('globe-m05-hint');
  if (ctx.host && hint) {
    const ids = (ctx.host.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (!ids.includes('globe-m05-hint')) {
      ids.push('globe-m05-hint');
      ctx.host.setAttribute('aria-describedby', ids.join(' '));
    }
  }

  resetButton = document.getElementById('globe-m05-reset');
  if (!resetButton) {
    resetButton = ctx.el('button', 'globe-m05-reset', '↺');
    resetButton.id = 'globe-m05-reset';
    resetButton.type = 'button';
    resetButton.title = 'Réinitialiser le zoom à 100 %';
    resetButton.setAttribute('aria-label', 'Réinitialiser le zoom à 100 %');
    resetButton.addEventListener('click', resetZoom);
    const controls = scene.querySelector('.globe-controls');
    if (controls) controls.appendChild(resetButton); else scene.appendChild(resetButton);
  }

  const found = findZoomButtons();
  zoomInButton = found.inBtn;
  zoomOutButton = found.outBtn;
  placeBadge();
}

/* M05-01 : écouteurs posés une seule fois, en capture document pour précéder
 * le moteur (ses écouteurs sont sur le canvas en phase cible). */
function attachOnce(ctx) {
  if (attached) return;
  attached = true;
  document.addEventListener('wheel', observeWheel, { capture: true, passive: true });
  document.addEventListener('wheel', normalizeWheel, { capture: true, passive: false });
  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
  document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
  document.addEventListener('pointerup', onPointerEnd, { capture: true, passive: true });
  document.addEventListener('pointercancel', onPointerEnd, { capture: true, passive: true });
  if (ctx.host) ctx.host.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', placeBadge);
}

/* M05-10 : surface de diagnostic auditable pour l'agent maître. */
function exposeDiagnostic() {
  const api = {
    bounds: () => ({ min: Z_MIN, max: Z_MAX, default: Z_DEFAULT, wheelScale: WHEEL_SCALE, keyboardStep: WHEEL_STEP, percentMin: PCT_MIN, percentMax: PCT_MAX }),
    level: () => ({ z, percent: percent(), label: lastBadgeText }),
    shadow: () => ({ z, pinch: pinch ? { ...pinch } : null, pointers: pointers.size }),
    chantiers: () => ['M05-01', 'M05-02', 'M05-03', 'M05-04', 'M05-05', 'M05-06', 'M05-07', 'M05-08', 'M05-09', 'M05-10'],
    ready: () => ready,
  };
  window.VECTEMPOREL_M05 = api;
}

register('M05', (ctx) => {
  ctxRef = ctx;
  ensureNodes(ctx);
  attachOnce(ctx);
  ctx.onReady(() => {
    ready = true;
    refreshUI();
    placeBadge(); // la légende M17 n'existe qu'après tous les greffons
  });
  exposeDiagnostic();
  refreshUI();
  /* M05 est enregistré avant M17 : la légende n'existe pas encore ici. Le
     microtask s'exécute après tous les greffons, y compris sans moteur WebGL
     (onReady ne serait alors jamais appelé). Aucune boucle, une seule passe. */
  queueMicrotask(placeBadge);
});
