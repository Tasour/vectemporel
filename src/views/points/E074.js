import { register } from './registry.js';

/* Lentille E074 — Responsive & mobile : détail empilé sous la matrice (domaine H).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E074.md — chantiers E074-01 à E074-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * (src/ui/shell.js) et styles.css ne sont ni édités ni doublés : E074 ajoute une
 * portée CSS et une seule étiquette de lecture dans le détail existant.
 *
 * Contrat disponible : viewId, stage, layout, css, el, reducedMotion. E074
 * n'exploite que viewId, layout, css et el : aucune animation propre (E074-08)
 * ne justifie d'appeler reducedMotion, ni la scène d'écouter stage. Aucune
 * dépendance vers le store, les filtres, la sélection ou les autres lentilles.
 *
 * Invariants : un seul CSS, une seule portée, une seule étiquette par rendu ;
 * aucun ordre visuel inversé (le détail reste APRÈS la matrice dans le DOM,
 * points.js:124) ; zéro écouteur global, zéro timer, zéro rAF, zéro réseau,
 * zéro aléa, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e074';
const SCOPE = 'points-e074';
const LABEL_ID = 'points-e074-detail-label';

/* Toutes les règles sont préfixées par `.points-e074`, classe posée sur le
 * conteneur `.points-layout` (points.js:29). Le DOM ciblé est celui produit par
 * la vue : `.points-matrix` (:30), `.points-detail` (:95) et l'ordre
 * `layout.append(matrix, detail)` (:124), jamais reconstruit ici. */
const CSS = `
/* E074-01 — portée : une seule feuille, ancrée sur la vue, aucune fuite. */
.points-e074.points-layout { min-width: 0; }

/* E074-02 — empilement à une colonne : la matrice d'abord, le détail dessous.
 * Aucun 'order' n'est utilisé : l'ordre visuel suit l'ordre DOM. */
@media (max-width: 1000px) {
  .points-e074.points-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(220px, 42%);
  }
}

/* E074-03 — chaque panneau reste son propre conteneur de défilement ; le
 * plancher 'min-height:0' est indispensable à 'overflow-y:auto' en grille. */
.points-e074 .points-matrix,
.points-e074 .points-detail {
  min-width: 0;
  min-height: 0;
  overscroll-behavior: contain;
}

/* E074-04 — sur téléphone, le détail garde une part lisible et un plancher. */
@media (max-width: 620px) {
  .points-e074.points-layout {
    grid-template-rows: minmax(0, 1fr) minmax(200px, 48%);
  }
}

/* E074-05 — séparation visible et étiquette statique, uniquement quand le
 * détail est empilé (masquée en disposition à deux colonnes). */
.points-e074-detail-label { display: none; }
@media (max-width: 1000px) {
  .points-e074 .points-detail {
    border-left: 0;
    border-top: 2px solid var(--line-strong);
  }
  .points-e074 .points-e074-detail-label {
    display: block;
    margin: 0 0 8px;
    color: var(--muted-2);
    font-size: 10px;
    line-height: 1.4;
  }
}

/* E074-06 — aucun débordement horizontal du contenu du détail : textes longs
 * coupés proprement, puces en flux, navigation empilée en pleine largeur. */
.points-e074 .points-point-text,
.points-e074 .points-sources,
.points-e074 .points-justification { overflow-wrap: anywhere; }
.points-e074 .points-meta,
.points-e074 .points-families,
.points-e074 .points-nav { flex-wrap: wrap; }
@media (max-width: 620px) {
  .points-e074 .points-nav { flex-direction: column; }
  .points-e074 .points-nav button { width: 100%; }
}

/* E074-07 — paysage court : un seul axe de défilement, détail toujours sous
 * la matrice dans le flux, sans deux panneaux écrasés. */
@media (max-width: 1000px) and (max-height: 520px) {
  .points-e074.points-layout {
    display: block;
    height: auto;
    min-height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .points-e074 .points-matrix,
  .points-e074 .points-detail { overflow: visible; max-height: none; }
}

/* E074-08 — mouvement réduit : E074 n'ajoute aucune transition ; la règle ci-
 * dessous neutralise explicitement toute transition héritée éventuelle. */
@media (prefers-reduced-motion: reduce) {
  .points-e074 .points-matrix,
  .points-e074 .points-detail,
  .points-e074 .points-e074-detail-label { transition: none; }
}

/* E074-09 — couleurs forcées : le séparateur reste porté par une bordure. */
@media (forced-colors: active) {
  .points-e074 .points-detail { border-top-color: CanvasText; }
}

/* E074-10 — garde d'impression : l'empilement est une affordance d'écran,
 * jamais un masquage sur papier (les styles d'impression relèvent de E010). */
@media print {
  .points-e074.points-layout { display: block; height: auto; overflow: visible; }
  .points-e074 .points-matrix,
  .points-e074 .points-detail { overflow: visible; max-height: none; }
}
`;

register('E074', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  /* E074-01 : cssOnce injecte la feuille une seule fois ; la classe et le
   * signal sont idempotents sur un même DOM comme sur un rendu neuf. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e074 = '1';

  const matrix = layout.querySelector('.points-matrix');
  const detail = layout.querySelector('.points-detail');
  if (matrix) matrix.dataset.e074 = 'stacked';
  if (!detail) return;

  /* E074-02 / E074-05 : on n'échange aucun nœud, on n'inverse aucun ordre.
   * Une seule étiquette par rendu, créée par ctx.el (jamais innerHTML). */
  detail.dataset.e074 = 'stacked';
  if (!detail.querySelector('#' + LABEL_ID)) {
    const stale = document.getElementById(LABEL_ID);
    if (stale && !layout.contains(stale)) stale.remove();
    const label = el('p', 'points-e074-detail-label',
      'Fiche du point — affichée sous la matrice sur écran étroit.');
    label.id = LABEL_ID;
    detail.insertBefore(label, detail.firstChild);
  }
});
