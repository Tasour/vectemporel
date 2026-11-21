import { register } from './registry.js';

/* Lentille POINTS E078 — passe 2 (V2) : paysage sans troncature (domaine H :
 * responsive & mobile).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E078.md — chantiers E078-01 à E078-10.
 * Fichier possédé : ce module uniquement. Aucun fichier de la passe 1
 * (src/views/points/E078.js) ni aucun fichier partagé (vue points.js, coque,
 * styles.css, registry.js, index.js) n'est modifié : la lentille ajoute sa propre
 * portée CSS et sa propre note de lecture, et s'appuie sur le DOM déjà produit
 * par la vue.
 *
 * Contrat exploité : viewId ('pointsv2'), stage, layout, css(id, rules),
 * el(tag, cls, text), reducedMotion(). Aucune dépendance vers le store, les
 * filtres ou le détail. Aucune valeur numérique n'est inventée : les seuils
 * ci-dessous sont des choix de mise en page documentés, pas des faits de domaine.
 *
 * Différence V2 : la passe 1 entretenait un signal d'orientation par écouteur
 * global. Ici, la rotation est entièrement portée par les requêtes média : aucun
 * écouteur n'est créé, aucun nœud n'est retenu, aucun rendu n'est déclenché. Le
 * JS ne fait qu'ancrer la portée, poser des signaux statiques auditables et
 * déposer une seule note de lecture.
 *
 * Invariants : une seule feuille (ctx.css), une seule portée (.points-v2-e078),
 * une seule note (id points-v2-e078-hint), identifiants préfixés, gardes
 * anti-doublon, aucune écriture HTML directe, aucun réseau, aucun aléa, aucun
 * minutage, aucune animation image par image, aucun écouteur global, aucun
 * appel de journalisation.
 */

const CSS_ID = 'points-v2-e078';
const SCOPE = 'points-v2-e078';
const HINT_ID = 'points-v2-e078-hint';
const HINT_CLASS = 'points-v2-e078-hint';

/* Signaux de donnée volontairement distincts de ceux de la passe 1
 * (data-e078, data-e078-orientation, data-e078-landscape) : les deux lentilles
 * peuvent cohabiter sur le même DOM sans s'écraser. */
const DATA_SCOPE = 'pointsV2E078';
const DATA_MODE = 'pointsV2E078Mode';
const DATA_GRID = 'pointsV2E078Grid';
const DATA_DETAIL = 'pointsV2E078Detail';

/* Prédicateur de paysage court, répété littéralement dans chaque @media pour
 * que chaque règle soit autonome et lisible. Le garde max-width exclut les
 * tablettes et les fenêtres de bureau : seuls les téléphones en paysage
 * (par ex. 844×390 ou 667×375) sont concernés. */
const CSS = `
  /* E078-01 — portée unique, ancrée sur .points-layout : aucun sélecteur nu,
   * aucune fuite hors de la vue. La règle bat la grille d'origine sans !important. */
  .points-v2-e078.points-layout { min-height: 0; }

  /* E078-02 — en paysage court, matrice et fiche redeviennent deux colonnes :
   * l'empilement mobile écraserait sinon chaque panneau sous une hauteur réduite.
   * Le séparateur passe du bord haut au bord gauche. */
  @media (orientation: landscape) and (max-height: 600px) and (max-width: 1000px) {
    .points-v2-e078.points-layout {
      grid-template-columns: minmax(0, 1fr) minmax(260px, 38%);
      grid-template-rows: minmax(0, 1fr);
    }
    .points-v2-e078 .points-detail {
      border-left: 1px solid var(--line);
      border-top: 0;
    }
  }

  /* E078-03 — la grille récupère toute la hauteur utile au lieu du plafond
   * min(62vh,680px) qui n'offrirait qu'environ 240 px en paysage de téléphone.
   * La matrice devient une colonne flex : le chrome garde sa taille, la grille
   * prend le reste et reste le conteneur de défilement vertical principal. */
  @media (orientation: landscape) and (max-height: 600px) and (max-width: 1000px) {
    .points-v2-e078 .points-matrix {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .points-v2-e078 .points-matrix > :not(.points-grid) { flex: 0 0 auto; }
    .points-v2-e078 .points-grid {
      flex: 1 1 auto;
      min-height: 0;
      max-height: none;
      overflow: auto;
      overscroll-behavior: contain;
    }
  }

  /* E078-04 — chrome compact et fluide : paddings et titres bornés par clamp,
   * jamais de hauteur fixe ni de suppression de contenu. Le titre reste lisible
   * au-dessus de 16 px même à 320 px de haut. */
  @media (orientation: landscape) and (max-height: 600px) and (max-width: 1000px) {
    .points-v2-e078 .points-matrix {
      padding: clamp(8px, 1.6vh, 12px) clamp(10px, 1.8vw, 14px) clamp(10px, 2vh, 16px);
    }
    .points-v2-e078 .points-detail { padding: 12px 14px 16px; }
    .points-v2-e078 .points-title,
    .points-v2-e078 .points-point-title {
      font-size: clamp(16px, 2.4vh, 22px);
      line-height: 1.15;
      margin: 0 0 8px;
      text-wrap: pretty;
    }
    .points-v2-e078 .points-matrix > .view-kicker { font-size: 9px; }
  }

  /* E078-05 — défilement intérieur préservé sur les trois zones, jamais
   * overflow:hidden. Le min-width:0 empêche une cellule large de forcer un
   * débordement global ; la piste d'ère reste dimensionnée mais les colonnes
   * de domaine se répartissent souplement. */
  @media (orientation: landscape) and (max-height: 600px) and (max-width: 1000px) {
    .points-v2-e078 .points-matrix,
    .points-v2-e078 .points-detail,
    .points-v2-e078 .points-grid {
      min-width: 0;
      min-height: 0;
      overflow: auto;
      overscroll-behavior: contain;
    }
    .points-v2-e078 .points-grid-row {
      grid-template-columns: minmax(120px, 150px) repeat(auto-fit, minmax(52px, 1fr));
    }
  }

  /* E078-06 — cellules et en-têtes lisibles : hauteur tactile conservée,
   * retour à la ligne autorisé, aucune ellipse ni coupe de libellé, chiffres
   * à largeur fixe pour que les comptes restent comparables d'une ère à l'autre. */
  @media (orientation: landscape) and (max-height: 600px) and (max-width: 1000px) {
    .points-v2-e078 .points-grid-row > span,
    .points-v2-e078 .points-grid-row > button {
      min-height: 36px;
      line-height: 1.2;
      white-space: normal;
      overflow-wrap: anywhere;
      text-overflow: clip;
    }
    .points-v2-e078 .points-grid-row.is-head span {
      font-size: 9px;
      letter-spacing: .02em;
    }
    .points-v2-e078 .points-cell { font-variant-numeric: tabular-nums; }
  }

  /* E078-07 — filtres et navigation entiers : deux selects, réinitialisation
   * et boutons de point se répartissent sur plusieurs rangées si la largeur
   * manque, sans jamais être coupés sur le bord droit. */
  @media (orientation: landscape) and (max-height: 600px) and (max-width: 1000px) {
    .points-v2-e078 .points-filters,
    .points-v2-e078 .points-nav {
      flex-wrap: wrap;
      gap: 6px;
    }
    .points-v2-e078 .points-filters { margin-top: 8px; }
    .points-v2-e078 .points-nav { margin-top: 10px; }
    .points-v2-e078 .points-filters select,
    .points-v2-e078 .points-filters button,
    .points-v2-e078 .points-nav button {
      flex: 0 1 auto;
      min-width: 0;
      min-height: 36px;
      max-width: 100%;
    }
  }

  /* E078-08 — texte long du détail : pas de hauteur fixe, césure et retour à
   * la ligne permis, badges et sources capables de se répartir sur plusieurs
   * rangées en colonne étroite. */
  @media (orientation: landscape) and (max-height: 600px) and (max-width: 1000px) {
    .points-v2-e078 .points-point-text,
    .points-v2-e078 .points-justification {
      line-height: 1.45;
      overflow-wrap: anywhere;
      hyphens: auto;
    }
    .points-v2-e078 .points-meta,
    .points-v2-e078 .points-families,
    .points-v2-e078 .points-sources { flex-wrap: wrap; }
  }

  /* E078-09 — modes utilisateur : focus visible, mouvement réduit, couleurs
   * forcées, contraste renforcé et garde d'impression. La lentille n'ajoute
   * aucune transition ni animation : il n'y a rien à neutraliser côté JS. */
  .points-v2-e078 :focus-visible {
    outline: 2px solid var(--gold-bright);
    outline-offset: 2px;
  }
  @media (orientation: landscape) and (max-height: 600px) and (max-width: 1000px) and (prefers-reduced-motion: reduce) {
    .points-v2-e078 .points-matrix,
    .points-v2-e078 .points-detail,
    .points-v2-e078 .points-grid { scroll-behavior: auto; }
  }
  @media (orientation: landscape) and (max-height: 600px) and (max-width: 1000px) and (forced-colors: active) {
    .points-v2-e078 .points-grid { border-color: CanvasText; }
    .points-v2-e078 .points-detail { border-left-color: CanvasText; }
  }
  @media (orientation: landscape) and (max-height: 600px) and (max-width: 1000px) and (prefers-contrast: more) {
    .points-v2-e078 .points-detail { border-left-width: 2px; }
  }
  @media print {
    .points-v2-e078.points-layout { display: block; }
    .points-v2-e078 .points-detail { border-left: 0; border-top: 1px solid var(--line); }
    .points-v2-e078 .points-matrix,
    .points-v2-e078 .points-grid { max-height: none; overflow: visible; }
  }

  /* E078-10 — note de lecture statique, hors région live, compacte en paysage. */
  .points-v2-e078 .points-v2-e078-hint {
    margin: 0 0 8px;
    color: var(--muted-2);
    font-size: 10px;
    line-height: 1.4;
  }
  @media (orientation: landscape) and (max-height: 600px) and (max-width: 1000px) {
    .points-v2-e078 .points-v2-e078-hint { margin-bottom: 6px; font-size: 9px; }
  }
`;

function placeHint(matrix, hint) {
  const title = matrix.querySelector('.points-title');
  if (title && title.parentNode === matrix && title.nextSibling) {
    if (hint.nextSibling !== title.nextSibling || hint.previousSibling !== title) {
      matrix.insertBefore(hint, title.nextSibling);
    }
  } else if (hint.parentNode !== matrix || hint.nextSibling) {
    matrix.appendChild(hint);
  }
}

function apply(ctx) {
  /* E078-01 — filtre sur la vue V2 et gardes de type pour un ctx minimal. */
  if (!ctx || ctx.viewId !== 'pointsv2') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const stage = ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null;

  /* E078-01 — injection unique (cssOnce) et ancrage de portée sur la vue. */
  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  if (layout.dataset) {
    layout.dataset[DATA_SCOPE] = '1';
    /* E078-02 — signal statique de disposition : la rotation est gérée par les
     * requêtes média, aucun écouteur ni mise à jour JS n'est nécessaire. */
    layout.dataset[DATA_MODE] = 'landscape-ready';
  }

  /* E078-03 et E078-08 — signaux de présence, sans modifier le contenu. */
  const grid = layout.querySelector('.points-grid');
  const detail = layout.querySelector('.points-detail');
  if (grid && grid.dataset) grid.dataset[DATA_GRID] = '1';
  if (detail && detail.dataset) detail.dataset[DATA_DETAIL] = '1';

  /* E078-10 — au plus une note de lecture par rendu, créée par ctx.el (jamais
   * d'écriture HTML directe), hors région live. Le garde anti-doublon couvre le rendu courant
   * et le nettoyage d'un nœud périmé, y compris via stage. */
  const root = stage || (typeof document !== 'undefined' ? document : null);
  const stale = root && root.querySelector ? root.querySelector('#' + HINT_ID) : null;
  if (stale && !layout.contains(stale)) stale.remove();
  if (!layout.querySelector('#' + HINT_ID)) {
    const matrix = layout.querySelector('.points-matrix');
    if (matrix) {
      const hint = ctx.el('p', HINT_CLASS,
        'En paysage court, la matrice et la fiche se placent côte à côte : chacune garde son défilement, aucune information n’est coupée.');
      hint.id = HINT_ID;
      placeHint(matrix, hint);
    }
  }

  /* Le mouvement réduit est couvert en CSS (E078-09) : aucune lecture JS. */
  void ctx.reducedMotion;
}

register('E078', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
