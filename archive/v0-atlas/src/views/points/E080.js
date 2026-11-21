import { register } from './registry.js';

/* Lentille E080 — Responsive & mobile : polices système et mesure 60–75
 * caractères par ligne (domaine H).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E080.md — chantiers E080-01 à E080-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : E080 ajoute une portée CSS et une
 * seule note de lecture au DOM déjà produit par la vue.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres, la sélection ou le détail : la mesure
 * reste lisible même avec un ctx minimal.
 *
 * Invariants : un seul CSS (cssOnce), une seule portée, une seule note,
 * zéro écouteur global, zéro timer, zéro rAF, zéro réseau, zéro aléa, aucun
 * appel à la console. Aucune police distante : ni @font-face, ni @import, ni url().
 */

const CSS_ID = 'points-e080';
const SCOPE = 'points-e080';
const NOTE_ID = 'points-e080-note';
const MEASURE_CH = 68;              // dans la plage normative 60–75 caractères/ligne
const MEASURE = `${MEASURE_CH}ch`;  // unité ch : la mesure suit la police, même au zoom

/* Pile système : aucune requête réseau, aucune police embarquée. La variable
 * laisse une feuille amont fournir une pile équivalente sans écraser E080. */
const SYSTEM = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif';

const CSS = `
/* E080-01 / E080-02 : pile système héritée par la vue, sans @font-face. */
.points-layout.${SCOPE} {
  font-family: var(--points-e080-font, ${SYSTEM});
}
/* E080-03 / E080-04 / E080-05 : mesure bornée en ch, unité qui suit la police. */
.points-e080 .points-point-text,
.points-e080 .points-justification,
.points-e080 .points-sources,
.points-e080 .points-e080-note {
  max-width: ${MEASURE};
}
/* E080-06 : titres équilibrés, paragraphes à coupe douce (repli silencieux). */
.points-e080 .points-title,
.points-e080 .points-point-title { text-wrap: balance; }
.points-e080 .points-point-text,
.points-e080 .points-justification { text-wrap: pretty; }
/* E080-07 : typographie fluide, lisible à 200 % de zoom sans débordement. */
.points-e080 .points-title { font-size: clamp(1.25rem, 1rem + 1.2vw, 1.9rem); }
.points-e080 .points-point-title { font-size: clamp(1.05rem, .95rem + .6vw, 1.4rem); }
.points-e080 .points-point-text { font-size: clamp(.95rem, .9rem + .25vw, 1.05rem); }
/* E080-08 : contrôles en police système ≥ 16 px sur mobile (anti-zoom iOS). */
@media (max-width: 700px) {
  .points-e080 .points-filters select,
  .points-e080 .points-filters button,
  .points-e080 .points-nav button {
    font-family: var(--points-e080-font, ${SYSTEM});
    font-size: 16px;
  }
}
/* E080-09 : mots longs sans débordement horizontal ni troncature. */
.points-e080 .points-meta,
.points-e080 .points-point-meta,
.points-e080 .points-families,
.points-e080 .points-sources,
.points-e080 .points-point-text,
.points-e080 .points-justification {
  overflow-wrap: anywhere;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}
.points-e080 .points-detail > * { min-width: 0; }
/* E080-10 : mesure conservée en empilement, paysage court, contraintes fortes
 * et papier ; la fondation responsive relève des lentilles E071–E079. */
@media (max-width: 700px) {
  .points-layout.${SCOPE} { display: block; }
  .points-e080 .points-matrix,
  .points-e080 .points-detail { width: 100%; max-width: 100%; box-sizing: border-box; }
}
@media (orientation: landscape) and (max-height: 520px) {
  .points-e080 .points-point-text,
  .points-e080 .points-justification { max-width: ${MEASURE}; }
}
@media (forced-colors: active) {
  .points-e080 .points-point-text,
  .points-e080 .points-justification { color: CanvasText; }
}
@media print {
  .points-e080 .points-point-text,
  .points-e080 .points-justification { max-width: ${MEASURE}; }
}
.points-e080-note {
  margin: 0 0 10px;
  color: var(--muted-2);
  font-size: 12px;
  line-height: 1.5;
}
`;

register('E080', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  /* E080-01 : une seule feuille injectée par cssOnce, ancrage de portée. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e080 = '1';

  /* E080-03 : signaux auditables, sans écrire dans le DOM des autres lentilles. */
  layout.dataset.e080Measure = MEASURE;
  layout.dataset.e080Font = 'system';

  /* E080-10 : une seule note par rendu, retrait d'un nœud mal parenté. */
  if (!layout.querySelector('#' + NOTE_ID)) {
    const stale = document.getElementById(NOTE_ID);
    if (stale && !layout.contains(stale)) stale.remove();

    const matrix = layout.querySelector('.points-matrix');
    if (matrix) {
      const note = el('p', 'points-e080-note',
        `Texte composé en police système sur au plus ${MEASURE_CH} caractères par ligne : aucune police n’est téléchargée.`);
      note.id = NOTE_ID;
      const title = matrix.querySelector('.points-title');
      if (title && title.nextSibling) matrix.insertBefore(note, title.nextSibling);
      else matrix.appendChild(note);
    }
  }
});
