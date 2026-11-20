import { register } from './registry.js';

/* Lentille POINTS E001 — passe 2 (V2) : Matrice & grille, en-têtes épinglés et
 * lisibilité (domaine A).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E001.md — chantiers E001-01 à E001-10.
 * Fichier possédé : ce module uniquement. Aucun fichier de la passe 1 ni aucun
 * fichier partagé (vue points.js, coque, styles.css, registry.js, index.js)
 * n'est modifié : la lentille ajoute sa propre portée CSS et sa propre note de
 * lecture, et s'appuie sur le DOM déjà produit par la vue.
 *
 * Contrat exploité : viewId ('pointsv2'), stage, layout, css(id, rules),
 * el(tag, cls, text), reducedMotion(). Tout est dérivé du DOM rendu : aucune
 * valeur numérique n'est inventée, aucun compteur n'est réécrit.
 *
 * Invariants : une seule feuille (ctx.css), une seule portée (.points-v2-e001),
 * une seule note (id points-v2-e001-hint), identifiants préfixés, gardes
 * anti-doublon, zéro innerHTML, zéro réseau, zéro aléa, zéro timer, zéro rAF,
 * zéro écouteur global, aucun appel à la console.
 */

const CSS_ID = 'points-v2-e001';
const SCOPE = 'points-v2-e001';
const HINT_ID = 'points-v2-e001-hint';
const HINT_CLASS = 'points-v2-e001-hint';
const REDUCED_ATTR = 'data-points-v2-e001-reduced';
const DATA_SCOPE = 'pointsV2E001';
const DATA_PINNED = 'pointsV2E001Pinned';

/* Chaque sélecteur commence littéralement par `.points-v2-e001`, y compris à
 * l'intérieur des @media : aucune règle ne peut fuir hors de la vue Points.
 * Les attributs de donnée sont distincts de ceux de la passe 1 (data-e001,
 * data-e001-pinned, data-e001-reduced) pour ne pas écraser ses signaux. */
const CSS = `
  /* E001-02 : la grille devient l'unique fenêtre de défilement (axes X et Y). */
  .points-v2-e001 .points-grid {
    max-height: min(62vh, 680px);
    overflow: auto;
    overscroll-behavior: contain;
  }
  /* E001-03 : l'en-tête de colonne reste épinglé au haut de la grille. */
  .points-v2-e001 .points-grid-row.is-head {
    position: sticky;
    top: 0;
    z-index: 4;
    background: #141922;
    box-shadow: 0 3px 6px rgba(0, 0, 0, .45);
  }
  /* E001-04 : la première colonne « Ère » reste épinglée à gauche. */
  .points-v2-e001 .points-grid-row > :first-child {
    position: sticky;
    left: 0;
    z-index: 2;
    background: #0b0f15;
  }
  /* E001-04 (coin) : l'intersection des deux axes reste au-dessus du reste. */
  .points-v2-e001 .points-grid-row.is-head > :first-child {
    z-index: 5;
    background: #171d27;
    border-bottom-color: var(--gold);
  }
  /* E001-05 : fond opaque et bordure franche pour tout ce qui est épinglé. */
  .points-v2-e001 .points-grid-row.is-head span,
  .points-v2-e001 .points-grid-row > :first-child {
    border-color: var(--line-strong);
  }
  /* E001-06 : mesure, alignement et chiffres tabulaires des cellules. */
  .points-v2-e001 .points-grid-row > span,
  .points-v2-e001 .points-grid-row > button {
    min-height: 38px;
    line-height: 1.25;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow-wrap: anywhere;
  }
  .points-v2-e001 .points-grid-row > :first-child { justify-content: flex-start; }
  .points-v2-e001 .points-grid-row.is-head span { font-size: 10px; letter-spacing: .04em; }
  .points-v2-e001 .points-cell { font-size: 11px; font-variant-numeric: tabular-nums; }
  /* E001-07 : la ligne active est repérée par un rail latéral et le gras,
   * jamais par la seule couleur de fond. */
  .points-v2-e001 .points-grid-row.is-active > :first-child {
    border-left: 3px solid var(--gold-bright);
    font-weight: 600;
  }
  /* E001-08 : transition courte sur l'état épinglé/actif, neutralisée plus bas. */
  .points-v2-e001 .points-grid-row > :first-child {
    transition: background-color .18s linear, border-color .18s linear;
  }
  /* E001-09 : points de rupture documentés ; la colonne épinglée se resserre. */
  @media (max-width: 1000px) {
    .points-v2-e001 .points-grid-row { grid-template-columns: 150px repeat(auto-fit, minmax(58px, 1fr)); }
  }
  @media (max-width: 620px) {
    .points-v2-e001 .points-grid { max-height: 58vh; }
    .points-v2-e001 .points-grid-row { grid-template-columns: 132px repeat(auto-fit, minmax(54px, 1fr)); }
    .points-v2-e001 .points-grid-row > span,
    .points-v2-e001 .points-grid-row > button { min-height: 44px; padding: 6px; }
  }
  /* E001-08 : mouvement réduit, couplage JS (attribut) ET media query. */
  .points-v2-e001[data-points-v2-e001-reduced="1"] .points-grid-row > :first-child { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e001 .points-grid-row > :first-child,
    .points-v2-e001 .points-grid-row.is-head { transition: none; }
  }
  /* E001-10 : couleurs forcées — fonds et bordures explicites, rien que par couleur. */
  @media (forced-colors: active) {
    .points-v2-e001 .points-grid-row.is-head,
    .points-v2-e001 .points-grid-row.is-head > :first-child,
    .points-v2-e001 .points-grid-row > :first-child {
      background: Canvas;
      color: CanvasText;
      border-color: CanvasText;
    }
    .points-v2-e001 .points-grid-row.is-active > :first-child { border-left-color: Highlight; }
  }
  /* E001-09 : garde d'impression — l'épinglage est une affordance d'écran,
   * jamais un masquage sur papier (les styles d'impression complets relèvent
   * de E010). */
  @media print {
    .points-v2-e001 .points-grid { max-height: none; overflow: visible; }
    .points-v2-e001 .points-grid-row.is-head,
    .points-v2-e001 .points-grid-row > :first-child { position: static; box-shadow: none; }
  }
  /* E001-10 : note de lecture, statique et hors région live. */
  .points-v2-e001 .points-v2-e001-hint {
    margin: 0 0 10px;
    color: var(--muted-2);
    font-size: 10px;
    line-height: 1.4;
  }
`;

function apply(ctx) {
  /* E001-01 : filtre sur la vue V2 et gardes de type pour un ctx minimal. */
  if (!ctx || ctx.viewId !== 'pointsv2') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const stage = ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null;

  /* E001-01 : injection unique (cssOnce) et ancrage de portée sur la vue. */
  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  if (layout.dataset) layout.dataset[DATA_SCOPE] = '1';

  const grid = layout.querySelector('.points-grid');
  if (grid && grid.dataset) grid.dataset[DATA_PINNED] = '1';

  /* E001-08 : couplage explicite à la préférence de mouvement réduit, en plus
   * de la media query, pour les environnements sans matchMedia fiable. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  /* E001-10 : au plus une note de lecture par rendu, créée par ctx.el (jamais
   * innerHTML), hors région live. Le garde anti-doublon couvre le rendu courant
   * et le nettoyage d'un nœud périmé, y compris via stage. */
  if (!layout.querySelector('#' + HINT_ID)) {
    const root = stage || (typeof document !== 'undefined' ? document : null);
    const stale = root && root.querySelector ? root.querySelector('#' + HINT_ID) : null;
    if (stale && !layout.contains(stale)) stale.remove();

    const matrix = grid && grid.parentElement && grid.parentElement.classList.contains('points-matrix')
      ? grid.parentElement
      : layout.querySelector('.points-matrix');
    if (matrix) {
      const hint = ctx.el('p', HINT_CLASS,
        'En-têtes épinglés : le nom de l’ère et les domaines restent visibles pendant le défilement de la grille.');
      hint.id = HINT_ID;
      const title = matrix.querySelector('.points-title');
      if (title && title.nextSibling) matrix.insertBefore(hint, title.nextSibling);
      else matrix.appendChild(hint);
    }
  }
}

register('E001', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
