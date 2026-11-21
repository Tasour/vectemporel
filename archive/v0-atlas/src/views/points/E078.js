import { register } from './registry.js';

/* Lentille POINTS E078 — Paysage sans troncature (domaine H : responsive & mobile).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E078.md — chantiers E078-01 à E078-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : la lentille ajoute une portée CSS
 * et une seule note de lecture, et s'appuie sur le DOM déjà produit par la vue.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucune dépendance vers le store, les filtres ou le détail.
 *
 * Problème ciblé : en paysage de téléphone (par ex. 844×390), la règle mobile
 * de styles.css (@media max-width:1000px) empile la matrice et le détail en
 * `minmax(0,1fr)` / `minmax(0,42%)` : chaque panneau n'a plus qu'une fraction
 * d'une hauteur déjà courte, et le plafond `max-height:min(62vh,680px)` de la
 * grille (E001) ne laisse qu'environ 240 px. La lentille rétablit deux colonnes
 * côte à côte, rend la hauteur utile à la grille et garantit que tout le contenu
 * reste atteignable par défilement — jamais coupé par une hauteur fixe.
 *
 * Invariants : un seul greffon, une seule feuille CSS (cssOnce), tous les ids
 * préfixés `points-e078-`, aucun innerHTML, aucun timer, aucune rAF, aucun
 * réseau, aucun aléa, aucun console.*. Le comportement réel est porté par les
 * media queries (rotation instantanée, sans re-render) ; le JS ne fait qu'ancrer
 * la portée, poser des signaux auditables et déposer la note de lecture.
 */

const CSS_ID = 'points-e078';
const SCOPE = 'points-e078';
const HINT_ID = 'points-e078-hint';
const LANDSCAPE = '(orientation: landscape) and (max-height: 600px)';

/* Sélecteur à trois classes/attribut : bat la règle mobile empilée de
 * styles.css et toute règle à deux classes d'une autre lentille, sans !important. */
const LAYOUT = '.points-e078.points-layout[data-e078="1"]';

const CSS = `
/* E078-01 — portée unique, ancrée sur .points-layout (aucune fuite hors vue). */
${LAYOUT} { min-height: 0; }

/* E078-02 — en paysage court, matrice et fiche redeviennent deux colonnes :
 * l'empilement mobile écraserait sinon chaque panneau sous une hauteur réduite. */
@media ${LANDSCAPE} {
  ${LAYOUT} {
    grid-template-columns: minmax(0, 1fr) minmax(260px, 38%);
    grid-template-rows: minmax(0, 1fr);
  }
  ${LAYOUT} .points-detail { border-left: 1px solid var(--line); border-top: 0; }
}

/* E078-03 — la grille récupère toute la hauteur utile au lieu du plafond
 * min(62vh,680px) qui n'offrirait qu'environ 240 px en paysage de téléphone.
 * La matrice devient une colonne flex : le chrome garde sa taille, la grille
 * prend le reste et reste le seul conteneur de défilement vertical. */
@media ${LANDSCAPE} {
  ${LAYOUT} .points-matrix {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  ${LAYOUT} .points-matrix > :not(.points-grid) { flex: 0 0 auto; }
  ${LAYOUT} .points-grid {
    flex: 1 1 auto;
    min-height: 0;
    max-height: none;
    overflow: auto;
    overscroll-behavior: contain;
  }
}

/* E078-04 — chrome compact : paddings, titre et marges réduits quand la
 * hauteur est courte, sans jamais descendre sous une taille lisible. */
@media ${LANDSCAPE} {
  ${LAYOUT} .points-matrix { padding: 10px 12px 14px; }
  ${LAYOUT} .points-detail { padding: 12px 14px 16px; }
  ${LAYOUT} .points-title,
  ${LAYOUT} .points-point-title {
    font-size: clamp(16px, 2.4vh, 22px);
    line-height: 1.15;
    margin: 0 0 8px;
  }
  ${LAYOUT} .points-matrix > .view-kicker { font-size: 9px; }
}

/* E078-05 — aucun contenu clipé : défilement intérieur préservé sur les trois
 * zones, jamais overflow:hidden. La ligne de grille garde une première colonne
 * dimensionnée mais tous ses textes peuvent se répartir sur plusieurs lignes. */
@media ${LANDSCAPE} {
  ${LAYOUT} .points-matrix,
  ${LAYOUT} .points-detail,
  ${LAYOUT} .points-grid {
    overflow: auto;
    min-width: 0;
    overscroll-behavior: contain;
  }
  ${LAYOUT} .points-grid-row {
    grid-template-columns: minmax(120px, 150px) repeat(auto-fit, minmax(52px, 1fr));
  }
}

/* E078-06 — cellules et en-têtes lisibles : hauteur tactile conservée,
 * retour à la ligne autorisé, aucune ellipse ni coupe de libellé. */
@media ${LANDSCAPE} {
  ${LAYOUT} .points-grid-row > span,
  ${LAYOUT} .points-grid-row > button {
    min-height: 36px;
    line-height: 1.2;
    white-space: normal;
    overflow-wrap: anywhere;
    text-overflow: clip;
  }
  ${LAYOUT} .points-grid-row.is-head span { font-size: 9px; }
}

/* E078-07 — filtres et navigation restent souples et entiers : deux selects,
 * réinitialisation et boutons de point ne sont jamais tronqués ni empilés à
 * l'excès dans une hauteur courte. */
@media ${LANDSCAPE} {
  ${LAYOUT} .points-filters { flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  ${LAYOUT} .points-filters select,
  ${LAYOUT} .points-filters button { min-height: 36px; max-width: 100%; }
  ${LAYOUT} .points-nav { flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  ${LAYOUT} .points-nav button { min-height: 36px; }
}

/* E078-08 — texte long du détail : pas de hauteur fixe, césure et retour à la
 * ligne permis, badges capables de se répartir sur plusieurs rangées. */
@media ${LANDSCAPE} {
  ${LAYOUT} .points-point-text,
  ${LAYOUT} .points-justification {
    line-height: 1.45;
    overflow-wrap: anywhere;
    hyphens: auto;
  }
  ${LAYOUT} .points-meta,
  ${LAYOUT} .points-families { flex-wrap: wrap; }
}

/* E078-09 — mouvement réduit, couleurs forcées et contraste renforcé : la
 * lentille n'ajoute aucune animation et reste lisible dans ces trois modes. */
@media ${LANDSCAPE} and (prefers-reduced-motion: reduce) {
  ${LAYOUT} .points-matrix,
  ${LAYOUT} .points-detail,
  ${LAYOUT} .points-grid { scroll-behavior: auto; }
}
@media ${LANDSCAPE} and (forced-colors: active) {
  ${LAYOUT} .points-grid { border-color: CanvasText; }
  ${LAYOUT} .points-detail { border-left-color: CanvasText; }
}
@media ${LANDSCAPE} and (prefers-contrast: more) {
  ${LAYOUT} .points-detail { border-left-width: 2px; }
}

/* E078-10 — note de lecture statique, hors région live, compacte en paysage. */
.points-e078-hint {
  margin: 0 0 8px;
  color: var(--muted-2);
  font-size: 10px;
  line-height: 1.4;
}
@media ${LANDSCAPE} {
  .points-e078-hint { margin-bottom: 6px; font-size: 9px; }
}
`;

/* Un seul écouteur de media query pour TOUS les rendus : il ne pilote pas le
 * comportement (les media queries ci-dessus le font) mais garde le signal
 * `data-e078-orientation` exact quand l'utilisateur tourne l'écran. */
let orientationQuery = null;

function orientationFlag() {
  if (orientationQuery && typeof orientationQuery.matches === 'boolean') {
    return orientationQuery.matches ? 'landscape' : 'portrait';
  }
  return 'auto';
}

function ensureOrientationWatcher() {
  if (orientationQuery || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  try {
    const query = window.matchMedia(LANDSCAPE);
    const listener = () => {
      const flag = query.matches ? 'landscape' : 'portrait';
      const nodes = document.querySelectorAll('.' + SCOPE);
      for (let i = 0; i < nodes.length; i += 1) nodes[i].dataset.e078Orientation = flag;
    };
    if (typeof query.addEventListener === 'function') query.addEventListener('change', listener);
    else if (typeof query.addListener === 'function') query.addListener(listener);
    else return;
    orientationQuery = query;
  } catch {
    orientationQuery = null;
  }
}

function placeAfterTitle(matrix, hint, title) {
  if (title && title.parentNode === matrix && title.nextSibling) {
    if (hint.nextSibling !== title.nextSibling || hint.previousSibling !== title) {
      matrix.insertBefore(hint, title.nextSibling);
    }
  } else if (hint.parentNode !== matrix || hint.nextSibling) {
    matrix.appendChild(hint);
  }
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const { viewId, layout } = ctx;
  if (viewId !== 'points' || !layout || typeof layout.querySelector !== 'function') return;

  /* E078-01 — feuille injectée une fois (cssOnce), portée ancrée sur la vue. */
  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e078 = '1';

  /* E078-02 — signal d'orientation auditable, synchronisé sans timer ni rAF. */
  ensureOrientationWatcher();
  layout.dataset.e078Orientation = orientationFlag();

  /* E078-10 — une seule note, déplacée (jamais dupliquée) à chaque rendu. */
  const matrix = layout.querySelector('.points-matrix');
  if (!matrix || typeof matrix.insertBefore !== 'function') return;
  let hint = document.getElementById(HINT_ID);
  if (hint && hint.parentNode !== matrix) hint.remove();
  if (!hint) {
    hint = ctx.el('p', 'points-e078-hint',
      'En paysage, la matrice et la fiche se placent côte à côte : chacune garde son défilement, aucune information n’est coupée.');
    hint.id = HINT_ID;
  }
  placeAfterTitle(matrix, hint, matrix.querySelector('.points-title'));

  /* E078-08 — signal de présence du détail, sans modifier son contenu. */
  const detail = layout.querySelector('.points-detail');
  if (detail && detail.dataset) detail.dataset.e078Landscape = 'ready';

  void ctx.stage;
  void ctx.reducedMotion;
}

register('E078', (ctx) => { install(ctx); });
