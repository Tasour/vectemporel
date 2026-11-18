import { register } from './registry.js';

/* Lentille POINTS E033 — Navigation & clavier : Entrée / Espace activent une
 * cellule (domaine D : navigation & clavier).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E033.md — chantiers E033-01 à E033-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité :
 * ni src/views/points.js (qui crée les cellules), ni src/platform/keyboard.js
 * (routeur clavier unique), ni le store, ni la coque.
 *
 * Contrat exploité : viewId, stage, layout, css(id,rules), el(tag,cls,text),
 * reducedMotion (fournis par points/registry.js:28-44). Aucune dépendance vers
 * le store, un autre fichier ou une autre lentille.
 *
 * Invariants :
 * - un seul écouteur keydown DÉLÉGUÉ, attaché à .points-grid (jamais un par
 *   cellule), détaché du rendu précédent avant réattache ;
 * - Entrée / Espace (avec repli 'Spacebar') ciblent .points-cell / .points-era
 *   via closest(), sans toucher aux selects, au reset ni à .points-nav ;
 * - aucun double déclenchement : sur un bouton natif, le navigateur émet déjà
 *   le click (Entrée en keydown, Espace en keyup) et le routeur le laisse passer
 *   (keyboard.js:131-132, isControl inclut BUTTON) — E033 ne synthétise rien ;
 *   sur une cellule NON native (ex. div role=gridcell après E044), E033 appelle
 *   cell.click() et neutralise le défilement d'Espace ;
 * - préservation intégrale des gestionnaires click existants de points.js :
 *   E033 ne remplace aucune logique, il garantit la voie clavier qui y mène ;
 * - un seul CSS (cssOnce), un seul indice, un seul bloc de métriques, des
 *   compteurs auditables dans le DOM (jeu de données toujours dérivé du rendu) ;
 * - zéro réseau, zéro aléa, zéro journalisation, zéro timer, zéro rAF,
 *   zéro innerHTML, aucune donnée historique inventée ;
 * - greffon non destructif et idempotent : les nœuds de points.js ne sont jamais
 *   retirés ni réécrits, seuls des attributs d'activation et des nœuds préfixés
 *   points-e033- sont ajoutés.
 */

const CSS_ID = 'points-e033';
const SCOPE = 'points-e033';
const HINT_ID = 'points-e033-hint';
const METRICS_ID = 'points-e033-metrics';
const CELL_SELECTOR = '.points-cell, .points-era';

const ENTER = 'Enter';
const SPACE = ' ';
const SPACE_LEGACY = 'Spacebar';

/* E033-08/09 : feuille unique, injectée par ctx.css (cssOnce, registry.js:13-19).
 * Tout est sous .points-layout.points-e033 ou préfixé points-e033- : aucune fuite
 * hors de la vue. Cibles lisibles, focus visible, mouvement réduit, couleurs
 * forcées et repli 620 px (390×844), sans aucune animation propre. */
const CSS = `
.points-layout.points-e033 .points-e033-hint {
  margin: 6px 2px 0; padding: 5px 8px;
  border-left: 2px solid var(--gold, #e6b96f);
  color: var(--muted, #9a9a9a); font-size: 11px; line-height: 1.4;
}
.points-layout.points-e033 .points-e033-metrics {
  margin: 4px 2px 0; color: var(--muted-2, #8a8a8a);
  font-size: 10px; font-variant-numeric: tabular-nums;
}
.points-layout.points-e033 .points-grid :is(.points-cell, .points-era):focus-visible {
  outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 2px;
}
@media (max-width: 620px) {
  .points-layout.points-e033 .points-e033-hint,
  .points-layout.points-e033 .points-e033-metrics { font-size: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .points-layout.points-e033 .points-grid :is(.points-cell, .points-era) { transition: none !important; }
}
@media (forced-colors: active) {
  .points-layout.points-e033 .points-e033-hint { border-left-color: CanvasText; color: CanvasText; }
}
`;

/* Le registre réapplique les greffons à chaque rendu (registry.js:39-43) :
 * la closure module survit, le ctx courant est relu à chaque passage. */
let latest = null;
let currentGrid = null;      // .points-grid du rendu courant, seul écouté
let renderCount = 0;
let keyboardActivationCount = 0;  // intentions Entrée/Espace sur une cellule
let syntheticCount = 0;           // clics synthétisés (cellules non natives)

function q(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function isActivationKey(key) {
  return key === ENTER || key === SPACE || key === SPACE_LEGACY;
}

/* E033-02 : ciblage par nearest, jamais l'élément brut : un clic/keydown sur un
 * enfant éventuel remonte toujours à la cellule ou au bouton d'ère. */
function targetCell(node) {
  return node && typeof node.closest === 'function' ? node.closest(CELL_SELECTOR) : null;
}

function tagOf(node) {
  return node && node.tagName ? String(node.tagName).toLowerCase() : '';
}

/* E033-04/05 : un bouton natif synthétise déjà son click sous Entrée ET Espace ;
 * un lien avec href le synthétise sous Entrée seulement. Un <div role=button>
 * n'a AUCUNE activation native : les rôles ARIA ne produisent pas de click. */
function nativeModes(cell) {
  const tag = tagOf(cell);
  if (tag === 'button' || tag === 'summary') return { enter: true, space: true };
  if (tag === 'a' && typeof cell.hasAttribute === 'function' && cell.hasAttribute('href')) {
    return { enter: true, space: false };
  }
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return { enter: true, space: true };
  return { enter: false, space: false };
}

function writeMetrics(ctx) {
  const node = document.getElementById(METRICS_ID);
  if (node && node.isConnected) {
    node.textContent = `Activations clavier : ${keyboardActivationCount} · Clics synthétisés : ${syntheticCount}.`;
  }
  if (ctx && ctx.layout && ctx.layout.dataset) {
    ctx.layout.dataset.pointsE033Activations = String(keyboardActivationCount);
    ctx.layout.dataset.pointsE033Synthetic = String(syntheticCount);
  }
}

/* E033-01/03/04/05/06 : unique point de passage clavier. Phase bouillonnement
 * sur .points-grid : le routeur (document, capture, keyboard.js:199) est passé
 * avant nous et a laissé l'événement pour les contrôles (keyboard.js:132).
 * On ne touche qu'aux cellules de CE grid, jamais aux selects/filtres/nav. */
function onGridKeyDown(event) {
  const ctx = latest;
  if (!ctx || !currentGrid || !currentGrid.isConnected) return;
  if (event.defaultPrevented) return;  // T2-10 : respect d'un handler local
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (!isActivationKey(event.key)) return;

  const cell = targetCell(event.target);
  if (!cell || !currentGrid.contains(cell)) return;

  const isEnter = event.key === ENTER;
  const modes = nativeModes(cell);
  keyboardActivationCount += 1;

  /* Bouton natif : le navigateur émet le click (Entrée en keydown, Espace en
   * keyup). Ne RIEN faire ici évite la double activation et préserve le
   * gestionnaire click d'origine (selectEra + filtre de domaine). */
  if (isEnter ? modes.enter : modes.space) {
    writeMetrics(ctx);
    return;
  }

  /* Cellule non native : converger vers le MÊME click que la souris. Espace
   * ferait défiler la page sur un div : on neutralise ce seul défaut. */
  if (!isEnter) event.preventDefault();
  if (typeof cell.click === 'function') {
    cell.click();
    syntheticCount += 1;
  }
  writeMetrics(ctx);
}

/* E033-09 : l'indice textuel rend l'activation découvrable sans écouteur
 * supplémentaire. Recréé une seule fois par rendu, jamais dupliqué. */
function ensureHint(ctx, matrix) {
  let hint = document.getElementById(HINT_ID);
  if (hint && hint.parentElement && hint.parentElement !== matrix) hint.remove();
  hint = document.getElementById(HINT_ID);
  if (!hint) {
    hint = ctx.el('p', 'points-e033-hint',
      'Clavier : tabulez jusqu’à une cellule, puis Entrée ou Espace pour l’activer.');
    hint.id = HINT_ID;
  }
  if (hint.parentElement !== matrix) matrix.appendChild(hint);
  return hint;
}

/* E033-07/09 : aria-keyshortcuts documente l'activation auprès des lecteurs
 * d'écran ; aria-describedby relie la grille à l'indice. Ajouts conditionnels :
 * aucun attribut existant n'est écrasé, aucun nœud de points.js n'est retiré. */
function markCells(ctx, layout, hint) {
  const cells = layout.querySelectorAll(CELL_SELECTOR);
  cells.forEach((cell) => {
    if (!cell.hasAttribute('aria-keyshortcuts')) cell.setAttribute('aria-keyshortcuts', 'Enter Space');
  });
  const grid = q(layout, '.points-grid');
  if (grid && hint && !grid.hasAttribute('aria-describedby')) {
    grid.setAttribute('aria-describedby', HINT_ID);
  }
  return cells.length;
}

function apply(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;
  const layout = ctx.layout && ctx.layout.isConnected
    ? ctx.layout
    : (ctx.stage && ctx.stage.isConnected ? q(ctx.stage, '.points-layout') : null);
  if (!layout || typeof layout.querySelector !== 'function') return;

  latest = ctx;
  renderCount += 1;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.pointsE033 = '1';
  layout.dataset.pointsE033Render = String(renderCount);
  layout.dataset.pointsE033Motion = (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion())
    ? 'reduce' : 'normal';

  const matrix = q(layout, '.points-matrix') || layout;
  const grid = q(layout, '.points-grid');
  ensureHint(ctx, matrix);
  const cellCount = markCells(ctx, layout, q(matrix, `#${HINT_ID}`));
  layout.dataset.pointsE033Cells = String(cellCount);

  /* Bloc de métriques unique, hors région live (aucune annonce parasite). */
  let metrics = document.getElementById(METRICS_ID);
  if (metrics && metrics.parentElement !== matrix) metrics.remove();
  metrics = document.getElementById(METRICS_ID);
  if (!metrics) {
    metrics = ctx.el('p', 'points-e033-metrics', '');
    metrics.id = METRICS_ID;
  }
  if (metrics.parentElement !== matrix) matrix.appendChild(metrics);

  /* E033-10 : un seul écouteur délégué par rendu. L'ancien grid (déconnecté
   * lors d'un rendu neuf) est nettoyé ; la référence de handler est stable. */
  if (currentGrid && currentGrid !== grid) currentGrid.removeEventListener('keydown', onGridKeyDown);
  if (grid && grid !== currentGrid) {
    grid.addEventListener('keydown', onGridKeyDown);
    currentGrid = grid;
  }

  writeMetrics(ctx);
}

register('E033', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
