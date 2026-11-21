import { register } from './registry.js';

/* Lentille POINTS E062 — Performance & rendu : observation de présence unique
 * (domaine G : performance & rendu ; cf. M08, UNIFIED_AUDIT/MONDE/views/M08-intersectionobserver.md).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E062.md — chantiers E062-01 à E062-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }
 * fourni par points/registry.js:28-44. Toutes les valeurs affichées sont
 * DÉRIVÉES DU DOM rendu par points.js (matrice, ères, cellules, filtres,
 * détail) ou d'états de cycle de vie (viewport, onglet). Aucune donnée
 * historique n'est inventée, aucune cellule n'est déplacée, aucun contrôle
 * existant n'est modifié.
 *
 * Invariants :
 * - UN seul IntersectionObserver actif : déconnecté avant toute récréation,
 *   ciblé sur la matrice, en mesure seule (il ne pilote aucun rendu) ;
 * - un seul écouteur visibilitychange, enregistré sous garde module ;
 * - hystérésis binaire avec zone morte, ratio maximal du lot d'entrées ;
 * - antirebond sans rAF : un callback d'une cible périmée est ignoré ;
 * - une seule feuille CSS via ctx.css('points-e062', …), tous IDs préfixés
 *   `points-e062-` ; une seule écriture groupée du témoin par changement ;
 * - zéro timer, zéro rAF, zéro réseau, zéro aléa, zéro console.*, zéro
 *   innerHTML ; greffon idempotent réutilisant son panneau par identifiant.
 */

const CSS_ID = 'points-e062';
const PANEL_ID = 'points-e062-status';
const TITLE_ID = 'points-e062-title';
const LINE_ID = 'points-e062-line';
const FIGURES_ID = 'points-e062-figures';

/* Feuille unique. Aucune ressource externe, aucune animation propre. Les
 * compteurs passent en chiffres tabulaires et largeur réservée pour réduire
 * le reflow ; le panneau et sa bande de figures sont isolés du layout. */
const CSS = `
  #${PANEL_ID} {
    margin: 12px 0 0; padding: 8px 10px;
    border: 1px solid var(--line, #5b5b5b); border-left: 3px solid var(--gold, #e6b96f);
    border-radius: 8px; background: rgba(8,11,16,.94);
    color: var(--ink-soft, #d8d8d8); font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; contain: layout style paint;
  }
  #${PANEL_ID} h3 {
    margin: 0 0 4px; font-family: var(--serif, serif);
    font-size: 12px; color: var(--gold-bright, #e9c98f);
  }
  #${LINE_ID} { margin: 0; }
  #${FIGURES_ID} {
    display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 6px;
    content-visibility: auto; contain-intrinsic-size: auto 36px;
  }
  #${FIGURES_ID} .points-e062-fig { color: var(--muted, #9a9a9a); }
  #${FIGURES_ID} .points-e062-figure {
    display: inline-block; min-width: 5ch; text-align: right;
    color: var(--gold, #e6b96f); font-weight: 600;
  }
  .points-matrix .points-cell, #${PANEL_ID} { font-variant-numeric: tabular-nums; }
  .points-grid .points-cell { min-width: 3ch; text-align: center; }
  .points-era:focus-visible, .points-cell:focus-visible,
  .points-filters select:focus-visible, .points-filters button:focus-visible,
  .points-nav button:focus-visible { outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 2px; }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 6px 8px; font-size: 9px; }
    #${FIGURES_ID} { gap: 3px 8px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${FIGURES_ID}, .points-cell { transition: none; animation: none; }
  }
`;

let currentTarget = null;        // cible observée du rendu courant (antirebond sans rAF)
let observer = null;             // unique IntersectionObserver, déconnecté avant récréation
let visibilityInstalled = false; // garde module : un seul visibilitychange
let reduced = false;             // préférence lue une seule fois par rendu
let visibility = 'visible';      // visible | hidden | unsupported
let documentState = 'visible';   // visible | hidden
let lastSignature = '';          // déduplication de l'écriture du témoin

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function reducedMotion(ctx) {
  if (typeof ctx.reducedMotion === 'function') {
    try { return !!ctx.reducedMotion(); }
    catch { /* repli ci-dessous */ }
  }
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

/* E062-02 — Hystérésis : visible dès 5 %, hidden à 1 % ou moins, zone morte
 * [1 % ; 5 %[ conservant l'état précédent. Le ratio retenu est le MAXIMUM du
 * lot d'entrées, jamais la dernière entrée (M08-02). */
function applyHysteresis(entries, target) {
  let effective = 0;
  for (const entry of entries) {
    if (entry.target !== target) continue;
    const ratio = entry.isIntersecting ? (entry.intersectionRatio || 0) : 0;
    if (ratio > effective) effective = ratio;
  }
  if (effective >= 0.05) return 'visible';
  if (effective <= 0.01) return 'hidden';
  return visibility; // zone morte : aucun changement
}

/* E062-01/03/04 — Un seul observateur de mesure. Il est déconnecté avant
 * toute récréation ; les callbacks d'une cible périmée (rendu précédent) sont
 * ignorés, ce qui joue le rôle d'antirebond sans timer ni rAF (M08-04). */
function observePresence(target) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  observer = null;
  if (typeof IntersectionObserver === 'undefined') {
    visibility = 'unsupported';
    return;
  }
  observer = new IntersectionObserver((entries) => {
    if (target !== currentTarget || !target.isConnected) return;
    const next = applyHysteresis(entries, target);
    if (next === visibility) return;
    visibility = next;
    if (currentTarget && currentTarget.isConnected) {
      put(currentTarget, 'data-e062-visibility', visibility);
    }
    refreshLine();
  }, { threshold: [0, 0.01, 0.05, 0.25, 0.5] });
  observer.observe(target);
}

/* E062-03 — document.hidden complète la présence viewport sans la confondre :
 * un seul écouteur module, rôles disjoints de l'observateur (M08-03). */
function installDocumentListener() {
  if (visibilityInstalled) return;
  visibilityInstalled = true;
  document.addEventListener('visibilitychange', () => {
    documentState = document.hidden ? 'hidden' : 'visible';
    if (currentTarget && currentTarget.isConnected) {
      put(currentTarget, 'data-e062-document', documentState);
    }
    refreshLine();
  });
}

/* E062-05 — Comptage en une passe : trois sélections seulement, réutilisées
 * pour les attributs de diagnostic et la bande de figures (pas de rechargement
 * diffus du DOM). */
function readCounts(layout) {
  const grid = layout && layout.querySelector('.points-grid');
  if (!grid) return { rows: 0, cells: 0, filled: 0, domains: 0 };
  const rows = grid.querySelectorAll('.points-grid-row:not(.is-head)').length;
  const cellNodes = grid.querySelectorAll('.points-cell');
  let filled = 0;
  for (const cell of cellNodes) {
    if (cell.classList.contains('has-points')) filled += 1;
  }
  const head = grid.querySelector('.points-grid-row.is-head');
  const domains = head ? Math.max(0, head.children.length - 1) : 0;
  return { rows, cells: cellNodes.length, filled, domains };
}

/* E062-08 — Témoin lisible : une seule composition, une seule écriture de
 * textContent, seulement quand la signature change (M08-09, sans bavardage). */
function statusText() {
  const where = visibility === 'visible' ? 'Matrice à l’écran'
    : visibility === 'hidden' ? 'Matrice hors écran'
      : 'Observation de présence indisponible';
  const tab = documentState === 'hidden' ? 'onglet masqué' : 'onglet actif';
  const motion = reduced ? ' · mouvement réduit' : '';
  return `${where} · ${tab}${motion}.`;
}

function refreshLine() {
  const line = document.getElementById(LINE_ID);
  if (!line || !line.isConnected) return;
  const signature = `${visibility}|${documentState}|${reduced}`;
  if (signature === lastSignature) return;
  lastSignature = signature;
  line.textContent = statusText();
}

/* E062-10 — Panneau réutilisé par identifiant : un seul témoin, même après
 * plusieurs rendus. Il est placé dans .points-matrix (conteneur en flux),
 * jamais dans la grille .points-layout à deux colonnes, qu'il ne perturbe pas. */
function ensurePanel(ctx, matrix) {
  let panel = document.getElementById(PANEL_ID);
  if (panel && panel.parentElement !== matrix) panel.remove();
  if (!panel || !panel.isConnected) {
    panel = ctx.el('section', 'points-e062-panel');
    panel.id = PANEL_ID;
    panel.setAttribute('aria-labelledby', TITLE_ID);

    const title = ctx.el('h3', '', 'Rendu & présence de la matrice');
    title.id = TITLE_ID;
    panel.appendChild(title);

    const line = ctx.el('p', 'points-e062-line', '');
    line.id = LINE_ID;
    line.setAttribute('role', 'status');
    line.setAttribute('aria-live', 'polite');
    line.setAttribute('aria-atomic', 'true');
    panel.appendChild(line);

    const figures = ctx.el('div', 'points-e062-figures');
    figures.id = FIGURES_ID;
    panel.appendChild(figures);
    matrix.appendChild(panel);
  }
  return panel;
}

/* E062-06/07 — Bande de figures isolée : mise à jour groupée par
 * replaceChildren, largeurs réservées en ch et content-visibility (aucune
 * race avec la région live, qui reste hors de la bande). */
function buildFigures(ctx, counts) {
  const figures = document.getElementById(FIGURES_ID);
  if (!figures || !figures.isConnected) return;
  const defs = [
    ['ères', counts.rows],
    ['domaines', counts.domains],
    ['cellules', counts.cells],
    ['renseignées', counts.filled],
  ];
  const parts = [];
  defs.forEach(([label, value], index) => {
    if (index) parts.push(document.createTextNode(' '));
    const wrap = ctx.el('span', 'points-e062-fig');
    wrap.appendChild(ctx.el('b', 'points-e062-figure', String(value)));
    wrap.appendChild(document.createTextNode(` ${label}`));
    parts.push(wrap);
  });
  figures.replaceChildren(...parts);
}

function writeDerived(layout, counts) {
  put(layout, 'data-e062', '1');
  put(layout, 'data-e062-css', CSS_ID);
  put(layout, 'data-e062-visibility', visibility);
  put(layout, 'data-e062-document', documentState);
  put(layout, 'data-e062-observer', observer ? '1' : '0');
  put(layout, 'data-e062-motion', reduced ? 'reduce' : 'full');
  put(layout, 'data-e062-rows', String(counts.rows));
  put(layout, 'data-e062-cells', String(counts.cells));
  put(layout, 'data-e062-filled', String(counts.filled));
  put(layout, 'data-e062-domains', String(counts.domains));
}

function apply(ctx) {
  const layout = ctx.layout || ctx.stage;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const matrix = layout.querySelector('.points-matrix');
  if (!matrix || typeof matrix.appendChild !== 'function') return;

  ctx.css(CSS_ID, CSS);
  reduced = reducedMotion(ctx);
  documentState = document.hidden ? 'hidden' : 'visible';

  const counts = readCounts(layout);
  ensurePanel(ctx, matrix);
  buildFigures(ctx, counts);

  currentTarget = matrix;
  lastSignature = '';
  refreshLine();
  observePresence(matrix);
  installDocumentListener();
  put(matrix, 'data-e062-visibility', visibility);
  put(matrix, 'data-e062-document', documentState);
  writeDerived(layout, counts);
}

register('E062', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
