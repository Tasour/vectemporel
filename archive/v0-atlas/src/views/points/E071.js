import { register } from './registry.js';

/* Lentille E071 — Grille fluide en 390×844 (domaine H : responsive & mobile).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E071.md — chantiers E071-01 à E071-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque,
 * styles.css et les lentilles voisines (E001, E003, E072…E080) ne sont ni
 * édités ni doublés : E071 ajoute UNE feuille de style préfixée et un signal
 * DOM descriptif, et s'appuie sur le DOM déjà produit par points.js.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (tels que
 * fournis par points/registry.js). Aucune dépendance vers le store, le routeur,
 * les filtres ou une autre lentille. Le greffon reste actif avec un ctx minimal.
 *
 * Invariants : un seul CSS (cssOnce par ID), une seule portée, un seul signal,
 * zéro nœud supprimé ou réécrit, zéro écouteur global, zéro timer, zéro rAF,
 * zéro réseau, zéro aléa, aucune réinterprétation de balisage, aucun appel à la console.
 */

const CSS_ID = 'points-e071';
const SCOPE = 'points-e071';
const REDUCED_ATTR = 'data-e071-reduced';
const SIGNAL = 'pointsE071';

/* Toutes les règles sont préfixées par `.points-e071`, classe posée sur le
 * conteneur `.points-layout` par le JS ci-dessous : aucune fuite hors de la vue.
 * Les sélecteurs ciblent le DOM réel de points.js (.points-layout, .points-matrix,
 * .points-grid, .points-grid-row.is-head, .points-era, .points-cell,
 * .points-filters, .points-detail). Les media queries font le reflow : le JS ne
 * touche ni au nombre de cellules ni à l'ordre des colonnes. */
const CSS = `
/* E071-02 — plancher anti « grid blowout » : aucune piste ne peut pousser la
   page au-delà de la largeur du viewport. */
.points-e071,
.points-e071 .points-matrix,
.points-e071 .points-grid,
.points-e071 .points-detail { min-width: 0; }

/* E071-01 — rupture mobile dédiée (390×844) : colonne unique et fluide.
   On remplace le 380px fixe de la colonne détail par une piste minmax(0,1fr),
   plus souple que le simple 1fr hérité de styles.css:378. */
@media (max-width: 620px) {
  .points-e071 {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 42%);
  }

  /* E071-03 — grille fluide : on abandonne le 190px fixe et le min-width:900px
     de styles.css:351 au profit de pistes minmax/fr. L'en-tête et le corps
     partagent exactement le même gabarit (déclaré sur .points-grid-row), donc
     les colonnes restent alignées. */
  .points-e071 .points-grid-row {
    grid-template-columns: minmax(96px, 1.8fr) repeat(auto-fit, minmax(46px, 1fr));
    min-width: 0;
  }

  /* E071-04 — alignement préservé : les libellés d'ère et les en-têtes de
     domaine restent gauche et autorisent la coupure de mot, sans changer le
     nombre ni l'ordre des cellules produites par points.js. */
  .points-e071 .points-grid-row > :first-child {
    justify-content: flex-start;
    text-align: left;
  }
  .points-e071 .points-grid-row.is-head span { white-space: normal; overflow-wrap: anywhere; }

  /* E071-05 — défilement horizontal confiné à la grille : la matrice peut
     défiler latéralement quand les domaines sont nombreux, mais la page, elle,
     ne déborde jamais. */
  .points-e071 .points-grid {
    max-width: 100%;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    -webkit-overflow-scrolling: touch;
  }

  /* E071-07 — typographie et espacements fluides : clamp suit la largeur
     réelle tout en gardant un plancher lisible. */
  .points-e071 .points-matrix {
    padding: clamp(12px, 4vw, 22px) clamp(10px, 3vw, 24px);
  }
  .points-e071 .points-title {
    font-size: clamp(20px, 6vw, 28px);
    margin-bottom: clamp(10px, 3vw, 16px);
  }
  .points-e071 .points-detail {
    padding: clamp(12px, 4vw, 24px) clamp(12px, 4vw, 20px);
  }

  /* E071-08 — cellules adaptatives : cible ≥ 44 px, texte qui ne déborde pas,
     plancher de police indépendant d'un zoom système excessif. */
  .points-e071 .points-grid-row > span,
  .points-e071 .points-grid-row > button {
    min-height: 44px;
    padding: clamp(4px, 1.4vw, 8px);
    font-size: max(10px, 0.72rem);
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  /* E071-09 — filtres fluides sur deux colonnes (les deux selects) avec le
     bouton de réinitialisation en pleine largeur. */
  .points-e071 .points-filters {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }
  .points-e071 .points-filters > :last-child { grid-column: 1 / -1; }
  .points-e071 .points-filters select,
  .points-e071 .points-filters button { min-width: 0; width: 100%; }
}

/* E071-06 — hauteur fluide sous le chrome mobile : on ne réserve les deux
   pistes que lorsque la hauteur le permet ; les panneaux défilent en interne et ne
   poussent jamais le pied de page hors de l'écran. */
@media (max-width: 620px) and (min-height: 521px) {
  .points-e071 .points-matrix,
  .points-e071 .points-detail { max-height: 100%; }
}

/* E071-10 — transition unique, neutralisée par le couplage JS ET la media
   query : aucun mouvement superflu n'est introduit par la lentille. */
.points-e071 .points-grid-row > :first-child {
  transition: background-color .18s linear, border-color .18s linear;
}
.points-e071[data-e071-reduced="1"] .points-grid-row > :first-child { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-e071 .points-grid-row > :first-child { transition: none; }
}
@media (forced-colors: active) {
  .points-e071 .points-grid,
  .points-e071 .points-grid-row > button {
    border-color: CanvasText;
    color: CanvasText;
  }
}
`;

register('E071', (ctx) => {
  const { viewId, layout, css } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function') return;

  /* E071-01 / E071-10 — une seule feuille (cssOnce) et une seule portée, posée
     de façon idempotente sur le conteneur de la vue. */
  css(CSS_ID, CSS);
  if (!layout.classList.contains(SCOPE)) layout.classList.add(SCOPE);

  /* Signal DOM descriptif, unique et préfixé : il expose la présence de la
     lentille au CSS et à l'audit sans créer de nœud ni d'état applicatif. */
  layout.dataset[SIGNAL] = '1';

  /* E071-10 — couplage explicite à la préférence de mouvement réduit, en plus
     de la media query, pour les environnements sans matchMedia fiable. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }
});
