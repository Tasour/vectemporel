import { register } from './registry.js';

/* Lentille E001 — Matrice & grille : en-têtes épinglés et lisibilité (domaine A).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E001.md — chantiers E001-01 à E001-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : la lentille ajoute une portée CSS
 * et une seule note de lecture, et s'appuie sur le DOM déjà produit par la vue.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres ou le détail : l'en-tête reste lisible
 * même avec un ctx minimal.
 *
 * Invariants : un seul CSS, une seule portée, une seule note, zéro écouteur
 * global, zéro timer, zéro rAF, zéro réseau, zéro aléa, aucun usage de l'objet global de journalisation.
 */

const CSS_ID = 'points-e001';
const SCOPE = 'points-e001';
const HINT_ID = 'points-e001-hint';
const REDUCED_ATTR = 'data-e001-reduced';

/* Toutes les règles sont préfixées par `.points-e001`, classe posée sur le
 * conteneur `.points-layout` : aucune fuite hors de cette vue. Les sélecteurs
 * ciblent le DOM réel de points.js (`.points-grid`, `.points-grid-row.is-head`,
 * `.points-grid-row.is-active`, `.points-era`, `.points-cell`). */
const CSS = `
/* E001-02 : la grille devient l'unique fenêtre de défilement (axes X et Y). */
.points-e001 .points-grid {
  max-height: min(62vh, 680px);
  overflow: auto;
  overscroll-behavior: contain;
}
/* E001-03 : l'en-tête de colonne reste épinglé au haut de la grille. */
.points-e001 .points-grid-row.is-head {
  position: sticky;
  top: 0;
  z-index: 4;
  background: #141922;
  box-shadow: 0 3px 6px rgba(0, 0, 0, .45);
}
/* E001-04 : la première colonne « Ère » reste épinglée à gauche. */
.points-e001 .points-grid-row > :first-child {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #0b0f15;
}
/* E001-04 (coin) : l'intersection des deux axes reste au-dessus du reste. */
.points-e001 .points-grid-row.is-head > :first-child {
  z-index: 5;
  background: #171d27;
  border-bottom-color: var(--gold);
}
/* E001-05 : fond opaque et bordure franche pour tout ce qui est épinglé. */
.points-e001 .points-grid-row.is-head span,
.points-e001 .points-grid-row > :first-child {
  border-color: var(--line-strong);
}
/* E001-06 : mesure, alignement et chiffres tabulaires des cellules. */
.points-e001 .points-grid-row > span,
.points-e001 .points-grid-row > button {
  min-height: 38px;
  line-height: 1.25;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-wrap: anywhere;
}
.points-e001 .points-grid-row > :first-child { justify-content: flex-start; }
.points-e001 .points-grid-row.is-head span { font-size: 10px; letter-spacing: .04em; }
.points-e001 .points-cell { font-size: 11px; font-variant-numeric: tabular-nums; }
/* E001-07 : la ligne active est repérée par un rail latéral et le gras,
 * jamais par la seule couleur de fond. */
.points-e001 .points-grid-row.is-active > :first-child {
  border-left: 3px solid var(--gold-bright);
  font-weight: 600;
}
/* E001-08 : transition courte sur l'état épinglé/actif, neutralisée plus bas. */
.points-e001 .points-grid-row > :first-child {
  transition: background-color .18s linear, border-color .18s linear;
}
/* E001-09 : points de rupture documentés ; la colonne épinglée se resserre. */
@media (max-width: 1000px) {
  .points-e001 .points-grid-row { grid-template-columns: 150px repeat(auto-fit, minmax(58px, 1fr)); }
}
@media (max-width: 620px) {
  .points-e001 .points-grid { max-height: 58vh; }
  .points-e001 .points-grid-row { grid-template-columns: 132px repeat(auto-fit, minmax(54px, 1fr)); }
  .points-e001 .points-grid-row > span,
  .points-e001 .points-grid-row > button { min-height: 44px; padding: 6px; }
}
/* E001-08 : mouvement réduit, couplage JS (attribut) ET media query. */
.points-e001[` + REDUCED_ATTR + `="1"] .points-grid-row > :first-child { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-e001 .points-grid-row > :first-child,
  .points-e001 .points-grid-row.is-head { transition: none; }
}
/* E001-10 : couleurs forcées — fonds et bordures explicites, rien que par couleur. */
@media (forced-colors: active) {
  .points-e001 .points-grid-row.is-head,
  .points-e001 .points-grid-row.is-head > :first-child,
  .points-e001 .points-grid-row > :first-child {
    background: Canvas;
    color: CanvasText;
    border-color: CanvasText;
  }
  .points-e001 .points-grid-row.is-active > :first-child { border-left-color: Highlight; }
}
/* E001-09 : garde d'impression — l'épinglage est une affordance d'écran, jamais
 * un masquage sur papier (les styles d'impression complets relèvent de E010). */
@media print {
  .points-e001 .points-grid { max-height: none; overflow: visible; }
  .points-e001 .points-grid-row.is-head,
  .points-e001 .points-grid-row > :first-child { position: static; box-shadow: none; }
}
/* E001-10 : note de lecture, statique et hors région live. */
.points-e001-hint {
  margin: 0 0 10px;
  color: var(--muted-2);
  font-size: 10px;
  line-height: 1.4;
}
`;

register('E001', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  /* E001-01 : injection unique (cssOnce) et ancrage de portée sur la vue. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e001 = '1';

  const grid = layout.querySelector('.points-grid');
  if (grid) grid.dataset.e001Pinned = '1';

  /* E001-08 : couplage explicite à la préférence de mouvement réduit, en plus
   * de la media query, pour les environnements sans matchMedia fiable. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  /* E001-10 : une seule note de lecture par rendu, placée sous le titre.
   * Le garde anti-doublon supporte un second passage sur le même DOM. */
  if (!layout.querySelector('#' + HINT_ID)) {
    const stale = document.getElementById(HINT_ID);
    if (stale && !layout.contains(stale)) stale.remove();

    const matrix = grid && grid.parentElement && grid.parentElement.classList.contains('points-matrix')
      ? grid.parentElement
      : layout.querySelector('.points-matrix');
    if (matrix) {
      const hint = el('p', 'points-e001-hint',
        'En-têtes épinglés : le nom de l’ère et les domaines restent visibles pendant le défilement de la grille.');
      hint.id = HINT_ID;
      const title = matrix.querySelector('.points-title');
      if (title && title.nextSibling) matrix.insertBefore(hint, title.nextSibling);
      else matrix.appendChild(hint);
    }
  }
});
