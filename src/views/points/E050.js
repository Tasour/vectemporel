import { register } from './registry.js';

/* Lentille E050 — Accessibilité & ARIA : zoom texte 200 % sans débordement (domaine E).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E050.md — chantiers E050-01 à E050-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : la lentille injecte une seule
 * feuille portée par .points-e050 et ajoute une seule note statique.
 *
 * Contrat exploité : viewId, stage, layout, css, el. Aucune dépendance vers le
 * store, les filtres ou le détail : la lentille n'invente aucun chiffre et ne
 * modifie aucun aria-* existant (E041 à E049 restent seuls maîtres de leurs
 * régions live, libellés et annonces).
 *
 * Invariants : un seul CSS, une seule portée, une seule note, zéro live region,
 * zéro écouteur global, zéro timer, zéro rAF, zéro réseau, zéro aléa, zéro console.*.
 */

const CSS_ID = 'points-e050';
const SCOPE = 'points-e050';
const NOTE_ID = 'points-e050-zoom-note';

/* Toutes les règles sont préfixées par `.points-e050`, classe posée sur
 * `.points-layout` (points.js:29). Les sélecteurs ciblent le DOM réel de la vue :
 * .points-grid/.points-grid-row/.points-era/.points-cell (points.js:33-57),
 * .points-filters (points.js:60-93) et .points-detail (points.js:95-122). */
const CSS = `
/* E050-02 : l'ajustement automatique iOS est neutralisé dans la portée de la
 * vue ; la propriété est héritée, aucun réglage global n'est modifié. */
.points-e050 {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
/* E050-05 : le conteneur et ses deux panneaux ne peuvent pas imposer de
 * largeur minimale supérieure au viewport, même à zoom 200 %. */
.points-e050.points-layout { min-width: 0; }
.points-e050.points-layout > * { min-width: 0; }
.points-e050 .points-matrix,
.points-e050 .points-detail { min-width: 0; }
/* E050-03 : planchers lisibles ; le rem suit la préférence de police de
 * l'utilisateur, le px plancher évite les glyphes illisibles. */
.points-e050 .points-grid-row.is-head { font-size: max(10px, .72rem); }
.points-e050 .points-grid-row > span,
.points-e050 .points-grid-row > button {
  font-size: max(11px, .78rem);
  min-height: max(34px, 2.4rem);
  line-height: 1.3;
  white-space: normal;
  overflow-wrap: anywhere;
}
.points-e050 .points-meta span,
.points-e050 .points-families span,
.points-e050 .points-sources,
.points-e050 .points-justification { font-size: max(10px, .72rem); }
.points-e050 .points-point-text { font-size: max(12px, .86rem); line-height: 1.5; }
/* E050-04 : titres fluides et mots longs rentrés dans leur colonne. */
.points-e050 .points-title { font-size: max(24px, 1.75rem); overflow-wrap: anywhere; }
.points-e050 .points-point-title { font-size: max(26px, 1.9rem); overflow-wrap: anywhere; }
/* E050-06 : la grille garde son défilement horizontal interne (styles.css:350)
 * mais ne rogne plus le texte des cellules ni des en-têtes. */
.points-e050 .points-grid { max-width: 100%; }
.points-e050 .points-grid-row {
  grid-template-columns: minmax(140px, 190px) repeat(auto-fit, minmax(64px, 1fr));
}
/* E050-07 : les deux selects et la remise à zéro restent dans le périmètre,
 * sans débordement horizontal à 200 %. Les aria-label de points.js:62,74 sont
 * conservés : aucun attribut n'est réécrit. */
.points-e050 .points-filters { max-width: 100%; }
.points-e050 .points-filters select {
  flex: 1 1 min(100%, 220px);
  min-width: 0;
  max-width: 100%;
  min-height: max(38px, 2.6rem);
  font-size: max(11px, .78rem);
}
.points-e050 .points-filters button {
  min-height: max(38px, 2.6rem);
  font-size: max(11px, .78rem);
  white-space: normal;
}
/* E050-08 : la fiche absorbe le texte agrandi au lieu de le faire déborder. */
.points-e050 .points-detail { overflow-wrap: anywhere; }
.points-e050 .points-point-text,
.points-e050 .points-justification,
.points-e050 .points-sources { max-width: 68ch; overflow-wrap: anywhere; }
.points-e050 .points-meta span,
.points-e050 .points-families span {
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
}
/* E050-09 : cibles et anneau de focus, y compris en contraste forcé. Aucun
 * aria-pressed, aucun role=dialog, aucune région live ajoutée. */
.points-e050 .points-nav button {
  min-height: max(38px, 2.6rem);
  font-size: max(11px, .78rem);
  white-space: normal;
}
.points-e050 :is(button, select):focus-visible {
  outline: 3px solid var(--gold-bright);
  outline-offset: 1px;
}
/* E050-10 : note statique, hors région live, jamais portée par la couleur seule. */
.points-e050-note {
  margin: 0 0 12px;
  color: var(--muted-2);
  font-size: max(10px, .72rem);
  line-height: 1.45;
  overflow-wrap: anywhere;
}
/* E050-05 : reflow anticipé. À 200 % de zoom, la largeur CSS utile est divisée
 * par deux : dès 1200 px CSS, la fiche repasse sous la matrice avant que la
 * colonne fixe de 380 px (styles.css:347) ne contraigne le texte. Spécificité
 * 0,2,0 pour prévaloir sur le @media 1000 px de styles.css:377-380. */
@media (max-width: 1200px) {
  .points-e050.points-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 46%);
  }
  .points-e050 .points-detail { border-left: 0; border-top: 1px solid var(--line); }
}
@media (forced-colors: active) {
  .points-e050 :is(button, select):focus-visible { outline-color: Highlight; }
  .points-e050 .points-grid,
  .points-e050 .points-detail { border-color: CanvasText; }
}
/* E050-02 : aucune animation propre à la lentille ; garde-fou si une feuille
 * voisine introduisait une transition dans la même portée. */
@media (prefers-reduced-motion: reduce) {
  .points-e050 :is(button, select, .points-grid) { transition: none; }
}
`;

register('E050', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  /* E050-01 : injection unique (cssOnce par l'ID) et ancrage de portée. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e050 = '1';

  const matrix = layout.querySelector('.points-matrix');
  if (!matrix) return;

  /* E050-10 : une seule note par rendu. Un nœud déconnecté ou mal parenté est
   * retiré, puis la note est réinsérée avant les filtres : le titre, les
   * en-têtes de grille et la note d'E001 (insérée après le titre) restent
   * exactement où ils sont. */
  let note = document.getElementById(NOTE_ID);
  if (note && !layout.contains(note)) note.remove();
  note = document.getElementById(NOTE_ID);
  if (!note) {
    note = el('p', 'points-e050-note',
      'Zoom texte à 200 % : la grille garde son défilement horizontal et la fiche se replace sous la matrice ; aucun contenu n’est tronqué.');
    note.id = NOTE_ID;
    note.setAttribute('role', 'note');
    const filters = matrix.querySelector('.points-filters');
    const grid = matrix.querySelector('.points-grid');
    if (filters) matrix.insertBefore(note, filters);
    else if (grid && grid.nextSibling) matrix.insertBefore(note, grid.nextSibling);
    else matrix.appendChild(note);
  }
  layout.dataset.e050ZoomNote = 'ready';
});
