import { register } from './registry.js';

/* Lentille E011 — performance de la vue Chronologie.
 *
 * La coque reconstruit tout le DOM à chaque rendu (shell.js:533) et la vue
 * re-bâtit cartes, points, sources et images (chronology.js:207-541). Cette
 * lentille rend le coût de ce rendu mesurable et coordonne son PROPRE travail :
 * aucun fichier partagé n'est modifié, zéro console, zéro réseau, zéro aléa.
 * Dix chantiers (E11-01 à E11-10), tous implémentés ici.
 *
 * Le panneau est un <section> indexable, ajouté à #atlas-stage après la vue.
 * Son style est injecté une seule fois via ctx.css('chronology-e11', …) ;
 * tous ses identifiants sont préfixés `chronology-e11-`.
 */

const STYLE_ID = 'chronology-e11';
const PANEL_ID = 'chronology-e11-perf';
const LINE_NODES = 'chronology-e11-nodes';
const LINE_FRAME = 'chronology-e11-frame';
const LINE_STORM = 'chronology-e11-storm';
const LINE_TASKS = 'chronology-e11-tasks';
const LINE_IMAGES = 'chronology-e11-images';
const LINE_STABLE = 'chronology-e11-stable';
const LINE_MODE = 'chronology-e11-mode';
const SEARCH_ID = 'atlas-chrono-search'; /* cible observée, pas possédée */

/* État module — un seul jeu de compteurs, un seul jeu d'écouteurs,
   un seul observateur, une seule frame coalescée, quel que soit le nombre
   de rendus successifs (100 lentilles × N frappes). */
let renderCount = 0;
let keystrokeCount = 0;
let lastRenderAt = 0;
let lastFrameMs = 0;
let prevNodes = 0;
let maxNodes = 0;
let deferredImages = 0;
let longTasks = 0;
let longTaskMs = 0;
let nodes = null;
let apiRef = null;
let inputInstalled = false;
let visibilityInstalled = false;
let taskObserver = null;
let taskObserveTried = false;
let rafId = 0;

const CSS = `
  #${PANEL_ID} {
    position: absolute; left: 14px; bottom: 12px; z-index: 6;
    max-width: min(430px, calc(100% - 28px));
    padding: 6px 9px; border: 1px solid var(--line); border-radius: 8px;
    background: rgba(8,11,16,.9); color: var(--muted-2);
    font-size: 9px; line-height: 1.5; font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  #${PANEL_ID} .chronology-e11-kicker {
    display: block; margin-bottom: 2px; color: var(--ink-soft);
    font-size: 8px; letter-spacing: .14em; text-transform: uppercase;
  }
  #${PANEL_ID} p { margin: 0; }
  @media (max-width: 700px) {
    #${PANEL_ID} { left: 8px; bottom: 8px; max-width: calc(100% - 16px); font-size: 8px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; }
  }
`;

/* E11-10 : sonde d'API — toutes les mesures ont un repli lisible. */
function hasApi() {
  const perf = typeof performance !== 'undefined' && typeof performance.now === 'function';
  const raf = typeof requestAnimationFrame === 'function';
  const po = typeof PerformanceObserver === 'function';
  return { perf, raf, po, complete: perf && raf && po, reduced: !!(apiRef && apiRef.reducedMotion && apiRef.reducedMotion()) };
}

/* E11-01 / E11-08 : recensement déterministe du DOM rendu (hors panneau). */
function census(layout) {
  if (!layout || typeof layout.querySelectorAll !== 'function') {
    return { cards: 0, points: 0, sources: 0, tags: 0, images: 0, all: 0 };
  }
  const count = (selector) => layout.querySelectorAll(selector).length;
  return {
    cards: count('.event-card'),
    points: count('.point'),
    sources: count('.point-sources > li'),
    tags: count('.atlas-chrono-tag'),
    images: count('img'),
    all: layout.querySelectorAll('*').length + 1,
  };
}

/* E11-05 : optimisation réelle, sans modifier chronology.js — les images
   déjà présentes passent en chargement différé, une seule fois chacune. */
function deferImages(layout) {
  if (!layout || typeof layout.querySelectorAll !== 'function') return;
  layout.querySelectorAll('img').forEach((img) => {
    if (!img.getAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
      deferredImages += 1;
    }
    if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');
  });
}

/* Écriture unique de toutes les lignes : aucun écouteur n'écrit ailleurs. */
function paint(api) {
  if (!nodes || !api) return;
  const c = nodes.census;
  const variance = nodes.variance === null ? '—'
    : `${nodes.variance >= 0 ? '+' : ''}${nodes.variance}`;

  nodes.lineNodes.textContent =
    `Nœuds : ${c.all} · cartes ${c.cards} · points ${c.points} · sources ${c.sources} · thèmes ${c.tags}`;
  nodes.lineFrame.textContent = !api.perf || !api.raf || api.reduced
    ? 'Frame : suspendue (mouvement réduit ou API absente)'
    : `Frame rendu→peinture : ${lastFrameMs > 0 ? lastFrameMs.toFixed(1) + ' ms' : 'en attente'}`;
  nodes.lineStorm.textContent = `Rendus : ${renderCount} · frappes : ${keystrokeCount}`
    + ` · rendus/frappe : ${keystrokeCount ? (renderCount / keystrokeCount).toFixed(1) : '—'}`;
  nodes.lineTasks.textContent = !api.po
    ? 'Tâches longues : API indisponible'
    : `Tâches longues : ${longTasks} · ${Math.round(longTaskMs)} ms cumulées`;
  nodes.lineImages.textContent = `Images : ${c.images} · différées : ${deferredImages}`;
  nodes.lineStable.textContent =
    `Nœuds max : ${maxNodes} · ${nodes.growth ? 'croissance' : 'stable'} · variation ${variance}`;
  nodes.lineMode.textContent =
    `API perf : ${api.complete ? 'complète' : 'partielle'} · mouvement réduit : ${api.reduced ? 'oui' : 'non'}`;
}

/* E11-02 / E11-06 : une seule frame par salve de rendus, jamais de boucle.
   Le retour d'onglet ne planifie aucun rendu : seulement une réécriture
   de texte si le panneau est toujours présent. */
function scheduleFrame(api) {
  if (rafId || !api.perf || !api.raf || api.reduced || document.hidden) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    if (lastRenderAt > 0) {
      const now = typeof performance !== 'undefined' && performance.now ? performance.now() : 0;
      lastFrameMs = now ? Math.max(0, now - lastRenderAt) : 0;
    }
    paint(api);
  });
}

/* E11-03 : un seul écouteur délégué sur document — il survit au innerHTML
   de la coque. Il compte les frappes sans modifier le comportement de la vue
   (aucun preventDefault, aucune annonce live). */
function onSearchInput(event) {
  const target = event && event.target;
  if (!target || target.id !== SEARCH_ID) return;
  keystrokeCount += 1;
}

/* E11-04 : tâches longues, observées une seule fois, avec repli silencieux. */
function installTaskObserver() {
  if (taskObserveTried) return;
  taskObserveTried = true;
  if (typeof PerformanceObserver !== 'function') return;
  try {
    taskObserver = new PerformanceObserver((list) => {
      const entries = typeof list.getEntries === 'function' ? list.getEntries() : [];
      entries.forEach((entry) => {
        longTasks += 1;
        longTaskMs += Number(entry.duration) || 0;
      });
      paint(apiRef && hasApi());
    });
    try { taskObserver.observe({ type: 'longtask', buffered: false }); }
    catch { taskObserver.observe({ entryTypes: ['longtask'] }); }
  } catch { /* API absente ou refusée : le panneau affiche « indisponible » */ }
}

/* E11-07 : tolérance aux 100 rendus — un seul jeu d'écouteurs installé. */
function installListeners() {
  if (!inputInstalled) {
    inputInstalled = true;
    document.addEventListener('input', onSearchInput, true);
  }
  if (!visibilityInstalled) {
    visibilityInstalled = true;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && apiRef) paint(hasApi());
    });
  }
  installTaskObserver();
}

function buildPanel(stage) {
  if (!stage || typeof stage.querySelector !== 'function') return false;
  if (stage.querySelector(`#${PANEL_ID}`)) return true;

  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-label', 'Performance de la chronologie');
  const kicker = document.createElement('span');
  kicker.className = 'chronology-e11-kicker';
  kicker.textContent = 'Performance · chronologie';
  panel.appendChild(kicker);

  const lines = [
    [LINE_NODES, 'Nœuds : en attente'],
    [LINE_FRAME, 'Frame : en attente'],
    [LINE_STORM, 'Rendus : 0'],
    [LINE_TASKS, 'Tâches longues : en attente'],
    [LINE_IMAGES, 'Images : 0'],
    [LINE_STABLE, 'Nœuds max : 0'],
    [LINE_MODE, 'API perf : détection en cours'],
  ];
  const refs = { panel, census: null, growth: false, variance: null };
  lines.forEach(([id, text]) => {
    const line = document.createElement('p');
    line.id = id;
    line.textContent = text;
    panel.appendChild(line);
    if (id === LINE_NODES) refs.lineNodes = line;
    else if (id === LINE_FRAME) refs.lineFrame = line;
    else if (id === LINE_STORM) refs.lineStorm = line;
    else if (id === LINE_TASKS) refs.lineTasks = line;
    else if (id === LINE_IMAGES) refs.lineImages = line;
    else if (id === LINE_STABLE) refs.lineStable = line;
    else if (id === LINE_MODE) refs.lineMode = line;
  });
  stage.appendChild(panel);
  nodes = refs;
  return true;
}

register('E011', (ctx) => {
  const { css, stage, layout } = ctx;
  css(STYLE_ID, CSS);
  apiRef = ctx;

  renderCount += 1;
  deferredImages = 0;
  const c = census(layout);
  deferImages(layout);

  if (nodes) {
    nodes.census = c;
    nodes.growth = c.all > maxNodes;
    nodes.variance = prevNodes === 0 ? null : c.all - prevNodes;
  }
  maxNodes = Math.max(maxNodes, c.all);
  prevNodes = c.all;

  const built = buildPanel(stage);
  const api = hasApi();
  if (built && nodes) paint(api);

  /* E11-02 : une frame au plus après la fin du rendu, jamais hors écran. */
  lastRenderAt = api.perf && !api.reduced ? performance.now() : 0;
  scheduleFrame(api);

  /* E11-07 / E11-04 / E11-03 : installation idempotente. */
  installListeners();
});
