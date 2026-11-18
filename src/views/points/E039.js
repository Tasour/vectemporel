import { register } from './registry.js';

/* Lentille E039 — D. Navigation & clavier — restauration du focus après filtrage.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E039.md — chantiers E039-01 à E039-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le
 * registre, la coque et les lentilles voisines ne sont ni édités ni doublés.
 *
 * Problème : les contrôles de .points-filters (2 <select> + bouton reset) et
 * les cellules .points-cell déclenchent `set(..., 'filter')`, ce qui recrée tout
 * le DOM (shell.js:533 `root.innerHTML = ''`). Le nœud focalisé est détruit ;
 * sans mesure, le focus tombe sur #atlas-stage ou sur un équivalent approximatif
 * retrouvé par signature (shell.js:205-221, :286-289 : les <select> ne font pas
 * partie de focusCandidates()). E039 mémorise l'intention AVANT le re-render et
 * la rejoue sur le contrôle équivalent du DOM neuf.
 *
 * Contrat exploité : viewId, stage, layout, css, el (points/registry.js:28-44).
 * Aucune dépendance vers le store, le routeur, ctx.say() ou une autre lentille.
 *
 * Invariants :
 * - un seul greffon, une seule feuille CSS, deux écouteurs délégués au plus
 *   (un sur .points-filters, un sur .points-grid), jamais un par cellule ;
 * - une seule micro-tâche par filtre, différée APRÈS manageFocus (shell.js:562) ;
 * - restauration ciblée par attributs propres, jamais par selecteur construit
 *   depuis une donnée externe ; aucun vol de focus hors de la vue ;
 * - non destructif : les gestionnaires natifs de points.js et les marquages
 *   E013/E035 restent intacts ; aucune région live ajoutée (pas de bavardage) ;
 * - zéro réseau, zéro aléa, zéro timer/rAF, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e039';
const METRICS_ID = 'points-e039-metrics';
const HINT_ID = 'points-e039-hint';
const ROLE_ATTR = 'data-points-e039-role';
const INDEX_ATTR = 'data-points-e039-index';
const FOCUS_KEY = 'data-fk'; /* clé durable lue par shell.js:190 / :240-244 */

/* E039-01 : feuille unique, injectée par cssOnce (registry.js:13-19). Tout est
 * sous .points-filters ou préfixé points-e039- : aucun effet hors de la vue. */
const CSS = `
  .points-filters [${ROLE_ATTR}] { scroll-margin-block: 60px; }
  #${METRICS_ID} {
    margin: 6px 0 0; color: var(--muted-2, #8b8b8b);
    font-size: 11px; font-variant-numeric: tabular-nums;
  }
  #${HINT_ID} {
    margin: 4px 0 0; color: var(--muted-2, #8b8b8b);
    font-size: 11px; font-style: italic;
  }
  @media (prefers-reduced-motion: reduce) {
    .points-filters [${ROLE_ATTR}] { transition: none; }
  }
`;

let currentLayout = null;  // dernier .points-layout vu par install()
let pending = null;        // { role, index } mémorisé au moment du filtre
let generation = 0;        // incrémenté à chaque rendu : garde anti-course
let restores = 0;          // compteur audible dans le DOM, hors région live
let lastStatus = '';
const counts = { domain: 0, family: 0, reset: 0, cell: 0 };
let metricsNode = null;

function filtersOf(layout) {
  return layout && typeof layout.querySelector === 'function'
    ? layout.querySelector('.points-filters') : null;
}

/* E039-05 : le bouton natif est retrouvé par son libellé, jamais remplacé.
 * Repli sur le dernier bouton, comme E013.js:61-70. */
function findReset(filters) {
  if (!filters || typeof filters.querySelectorAll !== 'function') return null;
  const tagged = filters.querySelector(`[${ROLE_ATTR}="reset"]`);
  if (tagged) return tagged;
  const buttons = filters.querySelectorAll('button');
  for (const button of buttons) {
    if (/r[eé]initialiser/i.test(button.textContent || '')) return button;
  }
  return buttons.length ? buttons[buttons.length - 1] : null;
}

/* E039-02 : marquage NON destructif des contrôles. Les attributs propres
 * survivent au re-render parce qu'ils sont réécrits à chaque install(). */
function mark(node, role, index, focusKey) {
  if (!node) return;
  node.setAttribute(ROLE_ATTR, role);
  node.setAttribute(INDEX_ATTR, String(index));
  if (focusKey && !node.hasAttribute(FOCUS_KEY)) node.setAttribute(FOCUS_KEY, focusKey);
}

function intentOf(node) {
  if (!(node instanceof Element)) return null;
  const role = node.getAttribute(ROLE_ATTR);
  if (!role) return null;
  return { role, index: node.getAttribute(INDEX_ATTR) || '0' };
}

function nearestIntent(target) {
  const node = target instanceof Element
    ? target.closest(`[${ROLE_ATTR}]`) : null;
  return intentOf(node);
}

/* E039-03/04/06 : capture SYNCHRONE, avant le `import().then(set())` de
 * points.js:52/71/83/90. Le gestionnaire natif reste seul maître de l'état. */
function onFilterChange(event) {
  const intent = intentOf(event.target);
  if (intent && (intent.role === 'domain' || intent.role === 'family')) {
    pending = intent;
  }
}

function onFilterClick(event) {
  const intent = nearestIntent(event.target);
  if (intent && intent.role === 'reset') pending = intent;
}

/* E039-07 : le clic sur une cellule filtre AUSSI par domaine (points.js:49-53).
 * L'intention est déléguée sur la grille : un seul écouteur, pas 784. */
function onGridClick(event) {
  const cell = event.target instanceof Element
    ? event.target.closest('.points-cell') : null;
  const intent = intentOf(cell);
  if (intent && intent.role === 'cell') pending = intent;
}

function bindOnce(container, flag, listeners) {
  if (!container || container.dataset[flag] === '1') return;
  container.dataset[flag] = '1';
  listeners.forEach(([type, handler]) => container.addEventListener(type, handler));
}

/* E039-08 : recherche par comparaison d'attributs, jamais par sélecteur
 * interpolé (aucune donnée externe ne peut devenir un sélecteur CSS). */
function findTarget(layout, intent) {
  if (!layout || !intent || typeof layout.querySelectorAll !== 'function') return null;
  const nodes = layout.querySelectorAll(`[${ROLE_ATTR}]`);
  for (const node of nodes) {
    if (node.getAttribute(ROLE_ATTR) === intent.role
      && (node.getAttribute(INDEX_ATTR) || '0') === String(intent.index)) return node;
  }
  return null;
}

function writeMetrics() {
  if (!metricsNode || !metricsNode.isConnected) return;
  metricsNode.textContent = `Focus restauré : ${restores} · domaine ${counts.domain} · famille ${counts.family} · réinitialisation ${counts.reset} · cellule ${counts.cell}.`;
}

function record(intent, moved) {
  restores += 1;
  if (Object.prototype.hasOwnProperty.call(counts, intent.role)) counts[intent.role] += 1;
  lastStatus = `${moved ? 'restauré' : 'déjà actif'}:${intent.role}`;
  if (currentLayout) currentLayout.dataset.pointsE039Last = lastStatus;
  const filters = currentLayout ? filtersOf(currentLayout) : null;
  if (filters) filters.dataset.pointsE039Restores = String(restores);
  writeMetrics();
}

/* E039-09 : rejeu après innerHTML. La micro-tâche s'exécute après manageFocus
 * (shell.js:562), donc elle ne se fait pas écraser par la coque. */
function restoreFocus(intent, gen) {
  if (gen !== generation) return;              // un rendu plus récent a pris le relais
  const layout = currentLayout;
  if (!layout || !layout.isConnected) return;  // l'utilisateur a quitté la vue
  const target = findTarget(layout, intent);
  if (!target || target.disabled || typeof target.focus !== 'function') return;

  const active = document.activeElement;
  if (active === target) { record(intent, false); return; }
  const inView = active && active !== document.body && active.id !== 'atlas-stage'
    && layout.contains(active);
  if (inView) {
    /* La coque a parfois posé le focus sur un équivalent approximatif (une
     * autre cellule). On ne reprend la main que si ce nœud est l'un des nôtres. */
    if (!intentOf(active)) return;
  }
  target.focus({ preventScroll: true });
  record(intent, true);
}

function ensureNodes(ctx, filters) {
  metricsNode = document.getElementById(METRICS_ID);
  if (metricsNode && metricsNode.parentElement !== filters) metricsNode.remove();
  metricsNode = document.getElementById(METRICS_ID);
  if (!metricsNode) {
    metricsNode = ctx.el('p', 'points-e039-metrics');
    metricsNode.id = METRICS_ID;
    filters.appendChild(metricsNode);
  } else if (!metricsNode.classList.contains('points-e039-metrics')) {
    metricsNode.className = 'points-e039-metrics';
  }

  let hint = document.getElementById(HINT_ID);
  if (hint && hint.parentElement !== filters) hint.remove();
  hint = document.getElementById(HINT_ID);
  if (!hint) {
    hint = ctx.el('p', 'points-e039-hint',
      'Après un filtrage, le focus revient au contrôle utilisé.');
    hint.id = HINT_ID;
    filters.insertBefore(hint, metricsNode);
  }
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;
  ctx.css(CSS_ID, CSS);
  generation += 1;

  const layout = ctx.layout && ctx.layout.isConnected
    ? ctx.layout
    : (ctx.stage && ctx.stage.isConnected ? ctx.stage.querySelector('.points-layout') : null);
  if (!layout) return;
  currentLayout = layout;

  const filters = filtersOf(layout);
  const grid = layout.querySelector('.points-grid');
  if (!filters || !grid) return;

  /* E039-01/04/05/06/07 : marquage des contrôles réels du DOM. */
  const selects = filters.querySelectorAll('select');
  mark(selects[0], 'domain', '0', 'points-e039-domain');
  mark(selects[1], 'family', '1', 'points-e039-family');
  mark(findReset(filters), 'reset', '0', 'points-e039-reset');
  grid.querySelectorAll('.points-cell').forEach((cell, index) => {
    mark(cell, 'cell', String(index), '');
  });

  /* Les deux nœuds sont ENFANTS de .points-filters, jamais enfants directs de
   * layout : _diagnostics.js:69-79 ne les marque donc pas et ne les déplace pas. */
  ensureNodes(ctx, filters);
  writeMetrics();

  bindOnce(filters, 'pointsE039FiltersBound', [
    ['change', onFilterChange],
    ['click', onFilterClick],
  ]);
  bindOnce(grid, 'pointsE039GridBound', [['click', onGridClick]]);

  filters.dataset.pointsE039 = 'ready';
  filters.dataset.pointsE039Css = CSS_ID;
  filters.dataset.pointsE039Restores = String(restores);
  layout.dataset.pointsE039 = 'ready';

  /* E039-10 : une micro-tâche par activation réelle, puis intention effacée. */
  if (pending) {
    const intent = pending;
    const gen = generation;
    pending = null;
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => restoreFocus(intent, gen));
    } else {
      Promise.resolve().then(() => restoreFocus(intent, gen));
    }
  }
}

register('E039', install);
