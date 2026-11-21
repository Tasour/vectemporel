import { register } from './registry.js';

/* Lentille M07 — Boucle rAF et pause sur `document.hidden` (domaine A, rendu WebGL).
 *
 * Invariants vérifiés par le rapport UNIFIED_AUDIT/MONDE/views/M07-raf-pause.md :
 * - une seule boucle de rendu, détenue par le moteur (renderer.setAnimationLoop) ;
 *   ce module ne contient aucun requestAnimationFrame, setInterval ni setTimeout ;
 * - un seul écouteur `visibilitychange`, enregistré sous garde module ;
 * - un seul callback `onReady`, sous garde module, pour capturer le moteur ;
 * - aucun open()/close() ici : la propriété du cycle reste à syncEngine() (globe.js) ;
 * - pas de second IntersectionObserver (M08 possède celui de la vue) ;
 * - aucun réseau, aucun aléa, aucun console.*, aucun fichier partagé modifié.
 */

const CSS_ID = 'monde-m07';
const PANEL_ID = 'monde-m07-raf';

const CSS = `
  #${PANEL_ID} {
    position: absolute; right: 16px; bottom: 16px; z-index: 4;
    max-width: min(300px, 40vw); margin: 0; padding: 6px 9px;
    border: 1px solid var(--line); border-radius: 8px;
    background: rgba(8, 11, 16, .86); color: var(--muted);
    font-size: 11px; line-height: 1.4; font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
`;

let engine = null;          // capturé une seule fois via onReady
let host = null;            // #globe-canvas, stable d'un rendu à l'autre
let panel = null;           // readout réutilisé / recréé selon les rendus
let readyHooked = false;
let visibilityHooked = false;
let hiddenPhase = false;    // état au dernier évènement visibilitychange
let hiddenCalls = null;     // getInfo().calls au moment du masquage
let resumeCount = 0;        // transitions hidden -> visible
let invalidateCount = 0;    // relances moteur, une par reprise active

function readCalls() {
  if (!engine || typeof engine.getInfo !== 'function') return null;
  try {
    const info = engine.getInfo();
    if (!info || typeof info.calls !== 'number') return null;
    return info.calls;
  } catch {
    return null;
  }
}

function writePanel(text) {
  if (!panel || !panel.isConnected) return;
  panel.textContent = text;
}

function applyPhase() {
  if (!host || !host.isConnected) return;
  const phase = document.hidden ? 'hidden' : (host.dataset.globeActive === '1' ? 'active' : 'idle');
  host.dataset.m07RafPhase = phase;
}

function isActive() {
  return !!host && !document.hidden && host.dataset.globeActive === '1';
}

/* Rotation : activation exclusivement explicite, publiée par globe.js sur
   #globe-canvas (data-globe-rotation). M07 ne relance jamais la rotation :
   invalidate() au retour d'onglet exige cet état actif. */
function rotationOn() {
  return !!host && host.dataset.globeRotation === '1';
}

function ensurePanel(ctx) {
  if (panel && panel.isConnected) return panel;
  const existing = document.getElementById(PANEL_ID);
  if (existing) {
    panel = existing;
    return panel;
  }
  panel = ctx.el('p', 'monde-m07-raf');
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'status');
  panel.setAttribute('aria-live', 'polite');
  panel.setAttribute('aria-atomic', 'true');
  const parent = ctx.scene && ctx.scene.isConnected
    ? ctx.scene
    : (ctx.host && ctx.host.isConnected ? ctx.host : null);
  if (parent) parent.appendChild(panel);
  return panel;
}

/* Unique point d'observation de la visibilité du document. Ne pilote jamais
 * open()/close() : seul invalidate() est appelé, et seulement si la vue est
 * réellement active (M07-08) et une fois par reprise (M07-09). */
function handleVisibility() {
  if (document.hidden) {
    hiddenPhase = true;
    hiddenCalls = readCalls();
    applyPhase();
    writePanel(`Onglet masqué : boucle rAF suspendue. Rotation en pause. Reprises : ${resumeCount}.`);
    return;
  }

  if (hiddenPhase) {
    resumeCount += 1;
    hiddenPhase = false;
  }
  const calls = readCalls();
  const delta = hiddenCalls !== null && calls !== null && calls >= hiddenCalls
    ? calls - hiddenCalls
    : null;
  hiddenCalls = null;

  if (isActive() && rotationOn() && engine && typeof engine.invalidate === 'function') {
    invalidateCount += 1;
    engine.invalidate();
  }
  applyPhase();
  writePanel(delta === null
    ? `Onglet visible : métriques indisponibles. Reprises : ${resumeCount}. Invalidations : ${invalidateCount}.`
    : `Onglet visible : +${delta} frame(s) en arrière-plan. Reprises : ${resumeCount}. Invalidations : ${invalidateCount}.`);
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function' ||
      typeof ctx.onReady !== 'function') return;

  ctx.css(CSS_ID, CSS);
  if (ctx.host && ctx.host.isConnected) host = ctx.host;
  ensurePanel(ctx);

  if (!readyHooked) {
    readyHooked = true;
    ctx.onReady((payload) => {
      if (!payload || typeof payload !== 'object') return;
      if (payload.engine && typeof payload.engine === 'object') engine = payload.engine;
      if (payload.host && payload.host.isConnected) host = payload.host;
      hiddenCalls = readCalls();
      applyPhase();
      writePanel(`Moteur prêt · boucle unique détenue par le moteur. Reprises : ${resumeCount}. Invalidations : ${invalidateCount}.`);
    });
  }

  if (!visibilityHooked) {
    visibilityHooked = true;
    hiddenPhase = document.hidden;
    if (hiddenPhase) hiddenCalls = readCalls();
    document.addEventListener('visibilitychange', handleVisibility);
  }

  applyPhase();
}

register('M07', install);
