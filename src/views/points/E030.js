import { register } from './registry.js';

/* Lentille E030 — Ancre locale de retour à la matrice (domaine C : détail & fiche).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E030.md — chantiers E030-01 à E030-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité.
 *
 * E030 ajoute, dans le panneau `.points-detail`, une ancre LOCALE qui ramène
 * à la matrice `.points-matrix` sans changer de route, de filtre ni d'état.
 * Elle complète le fil d'Ariane (E028) et la nav point précédent/suivant (E029) :
 * elle ne les remplace pas et ne touche ni `.points-nav` ni le store.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (tel que
 * fourni par points/registry.js). Aucune dépendance vers le store, le routeur
 * ou une autre lentille : le greffon reste actif avec le ctx minimal.
 *
 * Invariants :
 * - une seule ancre, un seul marqueur cible, un seul compteur par rendu ;
 * - la cible est un marqueur ENFANT de la matrice (jamais un id sur la matrice
 *   elle-même : les enfants directs de layout sont marqués par _diagnostics.js) ;
 * - un seul MutationObserver, ciblé sur le titre du point, jamais sur la zone
 *   que E030 écrit (ancre / compteur) ;
 * - aucune sortie console, aucun appel réseau, aucun aléa, aucun timer ni
 *   boucle d'animation, aucune réinterprétation de balisage.
 */

const CSS_ID = 'points-e030';
const ANCHOR_ID = 'points-e030-back';
const METRICS_ID = 'points-e030-metrics';
const MARKER_ID = 'points-e030-matrix-anchor';

const CSS = `
  #${ANCHOR_ID} {
    display: inline-flex; align-items: center; gap: 7px;
    min-height: 44px; margin: 0 0 10px; padding: 8px 12px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: rgba(230, 185, 111, .08); color: var(--gold-bright);
    font: inherit; font-size: 13px; line-height: 1.3; text-decoration: none;
    cursor: pointer;
  }
  #${ANCHOR_ID}:hover { border-color: var(--gold-bright); }
  #${ANCHOR_ID}:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 3px; }
  #${ANCHOR_ID} .points-e030-arrow { font-size: 15px; line-height: 1; }
  #${METRICS_ID} {
    margin: 0 0 12px; color: var(--muted-2);
    font-size: 11px; font-variant-numeric: tabular-nums;
  }
  #${MARKER_ID} { display: block; position: relative; top: -8px; width: 0; height: 0; overflow: hidden; }
  @media (max-width: 700px) {
    #${ANCHOR_ID} { display: flex; justify-content: center; width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${ANCHOR_ID} { transition: none; }
  }
`;

let detail = null;          // .points-detail courant (panneau de fiche)
let matrix = null;          // .points-matrix courant (cible du retour)
let anchor = null;          // ancre locale, réutilisée d'un rendu à l'autre
let metricsNode = null;     // compteur auditable, hors toute région live
let observer = null;        // unique observateur, ciblé sur le titre du point
let currentCtx = null;      // dernier ctx reçu, pour l'observateur
let backCount = 0;          // nombre d'activations de l'ancre
let renderedLabel = '';     // signature anti-écriture du libellé accessible

function reducedMotion(ctx) {
  if (ctx && typeof ctx.reducedMotion === 'function') {
    try { return !!ctx.reducedMotion(); }
    catch { /* repli ci-dessous */ }
  }
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

function currentTitle(ctx) {
  const node = ctx && ctx.layout
    ? ctx.layout.querySelector('.points-detail .points-point-title') : null;
  return node ? String(node.textContent || '').trim() : '';
}

/* Libellé contextuel dérivé du seul DOM : aucun millésime ni total codé en dur. */
function desiredLabel(ctx) {
  const title = currentTitle(ctx);
  return title ? `Retour à la matrice — ${title}` : 'Retour à la matrice';
}

function renderLabel(ctx) {
  const label = desiredLabel(ctx);
  if (label === renderedLabel) return;
  renderedLabel = label;
  if (!anchor) return;
  anchor.setAttribute('aria-label', label);
  anchor.title = label;
}

function writeMetrics() {
  if (metricsNode) metricsNode.textContent = `Retours vers la matrice : ${backCount}.`;
}

/* Retour programmatique : l'ancre native (href="#…") assure le repli sans JS. */
function onBack(event) {
  if (!matrix || !matrix.isConnected) return;
  event.preventDefault();
  backCount += 1;
  writeMetrics();
  const behavior = reducedMotion(currentCtx) ? 'auto' : 'smooth';
  if (typeof matrix.scrollIntoView === 'function') {
    matrix.scrollIntoView({ behavior, block: 'start' });
  }
  const activeRow = matrix.querySelector('.points-grid-row.is-active');
  const eraButton = activeRow ? activeRow.querySelector('.points-era') : null;
  const target = eraButton || matrix;
  if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
  if (detail && detail.dataset) detail.dataset.pointsE030Back = 'used';
}

/* Observateur unique, jamais sur l'ancre ni le compteur que E030 réécrit. */
function observeTitle(ctx) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (typeof MutationObserver === 'undefined') return;
  const title = ctx && ctx.layout
    ? ctx.layout.querySelector('.points-detail .points-point-title') : null;
  if (!title) return;
  observer = new MutationObserver(() => {
    if (currentCtx) renderLabel(currentCtx);
  });
  observer.observe(title, { childList: true, characterData: true, subtree: true });
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  currentCtx = ctx;
  ctx.css(CSS_ID, CSS);

  const layout = ctx.layout && ctx.layout.isConnected ? ctx.layout : null;
  if (!layout) return;
  const currentDetail = layout.querySelector('.points-detail');
  const currentMatrix = layout.querySelector('.points-matrix');
  if (!currentDetail || !currentMatrix) return;
  detail = currentDetail;
  matrix = currentMatrix;

  /* Un rendu neuf recrée le panneau : l'ancre déconnectée le signale. */
  const freshRender = !anchor || !anchor.isConnected;
  if (freshRender) renderedLabel = '';

  /* Cible : marqueur enfant de la matrice, réutilisé ou relogé sans doublon.
   * Aucun id n'est posé sur la matrice (sinon _diagnostics.js la marquerait). */
  let marker = document.getElementById(MARKER_ID);
  if (marker && marker.parentElement !== matrix) marker.remove();
  marker = document.getElementById(MARKER_ID);
  if (!marker) {
    marker = ctx.el('span', 'points-e030-marker');
    marker.id = MARKER_ID;
    marker.setAttribute('aria-hidden', 'true');
  }
  if (marker.parentElement !== matrix) matrix.prepend(marker);
  if (matrix.tabIndex < 0) matrix.tabIndex = -1;
  if (!matrix.hasAttribute('aria-label')) {
    matrix.setAttribute('aria-label', 'Matrice de couverture — cible du retour local');
  }

  /* Ancre : un seul nœud, réutilisé ; jamais de suppression de contenu existant. */
  let found = document.getElementById(ANCHOR_ID);
  if (found && found.parentElement !== detail) found.remove();
  anchor = document.getElementById(ANCHOR_ID);
  if (!anchor) {
    anchor = ctx.el('a', 'points-e030-back');
    anchor.id = ANCHOR_ID;
    anchor.href = `#${MARKER_ID}`;
    const arrow = ctx.el('span', 'points-e030-arrow', '↑');
    arrow.setAttribute('aria-hidden', 'true');
    const text = ctx.el('span', 'points-e030-text', 'Retour à la matrice');
    anchor.append(arrow, text);
    anchor.addEventListener('click', onBack);
    detail.insertBefore(anchor, detail.firstChild);
  }

  let foundMetrics = document.getElementById(METRICS_ID);
  if (foundMetrics && foundMetrics.parentElement !== detail) foundMetrics.remove();
  metricsNode = document.getElementById(METRICS_ID);
  if (!metricsNode) {
    metricsNode = ctx.el('p', 'points-e030-metrics');
    metricsNode.id = METRICS_ID;
    anchor.after(metricsNode);
  }

  if (detail.dataset) detail.dataset.pointsE030Back = 'ready';
  writeMetrics();
  renderLabel(ctx);
  observeTitle(ctx);
}

register('E030', install);
