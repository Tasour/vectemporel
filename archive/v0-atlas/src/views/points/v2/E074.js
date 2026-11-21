import { register } from './registry.js';

/* Lentille E074 — passe V2 du domaine H (responsive & mobile).
 * Thème : « détail empilé sous la matrice » (UNIFIED_AUDIT/POINTS/themes.json,
 * clé E074). Dix chantiers NEUFS, distincts de la passe 1
 * (src/views/points/E074.js) : ordre de lecture explicite, seuil documenté,
 * repère « ci-dessous », ancre de retour, mesure de lecture, séparateur,
 * en-tête de fiche, garde anti-débordement, état de pile textuel et
 * idempotence multi-rendus.
 *
 * Périmètre possédé : src/views/points/v2/E074.js uniquement, avec son rapport
 * UNIFIED_AUDIT/POINTS/V2/views/E074.md. Lectures seules : points.js, la passe
 * 1, les registres V1/V2, index.js et styles.css. Aucun fichier partagé n'est
 * modifié : ni la passe 1, ni points.js, ni registry.js, ni index.js, ni
 * styles.css, ni une autre lentille.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }). La lentille filtre
 * strictement sur 'pointsv2'. Tous ses signaux (CSS, ids, classes, data-*) sont
 * préfixés points-v2-e074 / data-v2-e074 : aucune collision avec la passe 1
 * (points-e074, data-e074), qui tourne sur le MÊME DOM.
 *
 * Contrat exploité : viewId, layout, css(id, règles), el(balise, cls, texte),
 * reducedMotion(). Le registre V2 ne fournit pas say() : aucun rôle live ni
 * aria-live n'est ajouté, aucune région existante n'est écrite ; l'état est
 * exposé en texte visible ordinaire, dédupliqué.
 *
 * Invariants : un seul register('E074', ctx => …), un seul
 * ctx.css('points-v2-e074', …), une seule classe de portée, un seul écouteur
 * matchMedia sous garde, un seul lien de clic par bouton. Zéro timer, zéro
 * boucle rAF, zéro aléa, zéro réseau, zéro journalisation, zéro innerHTML.
 * Tous les nœuds sont fabriqués par ctx.el. Chaque chantier a un effet DOM/CSS
 * observable et vérifiable.
 */

const VIEW_ID = 'pointsv2';
const CSS_ID = 'points-v2-e074';
const SCOPE = 'points-v2-e074';
const STACK_QUERY = '(max-width: 1000px)';
const ORDER_VALUE = 'matrix-puis-detail';
const MATRIX_ID = 'points-v2-e074-matrix';

const BREAKPOINT_ID = 'points-v2-e074-breakpoint';
const BELOW_ID = 'points-v2-e074-below-hint';
const SEPARATOR_ID = 'points-v2-e074-separator';
const RETURN_ID = 'points-v2-e074-return';
const MEASURE_ID = 'points-v2-e074-measure-note';
const HEAD_ID = 'points-v2-e074-aside-head';
const KICKER_ID = 'points-v2-e074-aside-kicker';
const STATE_ID = 'points-v2-e074-state';

/* Une seule feuille. Chaque règle commence littéralement par
   `.points-v2-e074`, y compris dans les @media : aucune fuite hors de la vue
   Points et aucun écrasement non maîtrisé de la feuille points-e074. Les
   repères ne sont affichés qu'en pile ; le seuil et l'état restent lisibles. */
const CSS = `
  /* E074-02 — seuil de rupture toujours lisible. */
  .points-v2-e074 #points-v2-e074-breakpoint {
    margin: 6px 0 0; color: var(--muted-2, #9aa4b2);
    font-size: 9px; line-height: 1.4; font-variant-numeric: tabular-nums;
  }
  /* E074-09 — état de pile en texte ordinaire, non annoncé. */
  .points-v2-e074 #points-v2-e074-state {
    margin: 8px 0 0; color: var(--muted-2, #9aa4b2);
    font-size: 9px; line-height: 1.4; font-variant-numeric: tabular-nums;
  }
  /* E074-03, E074-04, E074-05, E074-06, E074-07 : masqués hors pile. */
  .points-v2-e074 #points-v2-e074-below-hint,
  .points-v2-e074 #points-v2-e074-separator,
  .points-v2-e074 #points-v2-e074-return,
  .points-v2-e074 #points-v2-e074-measure-note,
  .points-v2-e074 #points-v2-e074-aside-kicker { display: none; }

  /* E074-01 — ordre visuel verrouillé sur l'ordre DOM (points.js:125),
     sans order inversé ni déplacement de nœud. */
  .points-v2-e074[data-v2-e074-order="matrix-puis-detail"] > .points-matrix { order: 0; }
  .points-v2-e074[data-v2-e074-order="matrix-puis-detail"] > .points-detail { order: 1; }

  @media (max-width: 1000px) {
    /* E074-01, E074-08 — pile en flux, sans plafond de hauteur tronquant. */
    .points-v2-e074[data-v2-e074-order="matrix-puis-detail"] {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto;
      height: auto; min-height: 0;
    }
    .points-v2-e074 .points-matrix,
    .points-v2-e074 .points-detail {
      min-width: 0; box-sizing: border-box;
      overflow: visible; overflow-wrap: anywhere;
    }
    /* E074-05 — mesure de lecture confortable de la fiche empilée. */
    .points-v2-e074 .points-detail {
      max-width: 72ch; border-left: 0;
      border-top: 1px solid var(--line, #3a4252);
      padding-top: 12px; margin-top: 4px;
    }
    /* E074-06 — filet pointillé dans la matrice, distinct de la bordure. */
    .points-v2-e074 #points-v2-e074-separator {
      display: block; width: 100%; height: 1px; margin: 12px 0 0;
      border: 0; border-top: 1px dashed var(--line-strong, #5c6470);
    }
    /* E074-03 — repère de continuité matrice → fiche. */
    .points-v2-e074 #points-v2-e074-below-hint {
      display: block; margin: 10px 0 0; padding: 7px 9px;
      border-left: 3px solid var(--gold, #e6b96f);
      background: rgba(255, 255, 255, .02);
      color: var(--ink-soft, #d5dae2); font-size: 10px; line-height: 1.5;
    }
    /* E074-07 — en-tête de la fiche empilée. */
    .points-v2-e074 #points-v2-e074-aside-kicker {
      display: block; margin: 0 0 6px; color: var(--gold, #e6b96f);
      font-size: 9px; font-weight: 600;
      letter-spacing: .12em; text-transform: uppercase;
    }
    .points-v2-e074 #points-v2-e074-measure-note {
      display: block; margin: 6px 0 0;
      color: var(--muted-2, #9aa4b2); font-size: 9px;
    }
    /* E074-04 — cible tactile conforme (>= 44 px) et focus visible. */
    .points-v2-e074 #points-v2-e074-return {
      display: inline-block; min-height: 44px;
      margin: 8px 0 4px; padding: 6px 12px;
      border: 1px solid var(--line-strong, #5c6470); border-radius: 8px;
      background: transparent; color: var(--gold-bright, #e9c98f);
      font: inherit; font-size: 11px; cursor: pointer;
    }
    .points-v2-e074 #points-v2-e074-return:focus-visible {
      outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 2px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e074 #points-v2-e074-return,
    .points-v2-e074 #points-v2-e074-separator,
    .points-v2-e074 #points-v2-e074-below-hint { transition: none !important; }
  }
  @media (forced-colors: active) {
    .points-v2-e074 #points-v2-e074-separator { border-top-color: CanvasText; }
    .points-v2-e074 #points-v2-e074-return {
      border-color: CanvasText; color: CanvasText;
    }
  }
`;

let installCount = 0;
let stackQuery = null;
let stackBound = false;
let refs = {
  layout: null, matrix: null, detail: null,
  state: null, reduced: false, stacked: false,
};

function present(node) {
  return !!(node && node.nodeType === 1);
}

/* E074-10 — garde d'existence pour toute ID préfixée. La coque reconstruisant
   le stage, un nœud du rendu précédent est détaché et n'est pas retrouvé par
   getElementById : il est recréé dans le parent courant, jamais cloné. */
function ensureNode(make, id, tagName, className, text, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className, text);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E074-09 — l'état de pile est déduit de matchMedia, non du CSS, afin que le
   texte visible reste exact. Aucune région live : c'est un <p> ordinaire. */
function applyState() {
  const { layout, detail, state, reduced } = refs;
  if (!layout || !layout.isConnected) return;
  const stacked = Boolean(stackQuery && stackQuery.matches);
  refs.stacked = stacked;
  layout.dataset.v2E074Stacked = stacked ? '1' : '0';
  if (detail) detail.dataset.v2E074Measure = stacked ? '72ch' : 'libre';
  write(
    state,
    `Mode empilé : ${stacked ? 'oui' : 'non'} · largeur de lecture : `
      + `${stacked ? '72 caractères' : 'libre'} · mouvement réduit : `
      + `${reduced ? 'oui' : 'non'} · installations : ${installCount}.`
  );
}

function onStackChange() {
  applyState();
}

function installer(ctx) {
  if (!ctx || ctx.viewId !== VIEW_ID) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const make = ctx.el;
  const layout = ctx.layout;
  if (!present(layout) || typeof layout.querySelector !== 'function') return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  const matrix = layout.querySelector('.points-matrix');
  const detail = layout.querySelector('.points-detail');
  if (!matrix) return;

  /* E074-01 / E074-08 — ordre explicite et gardes mesurables, sans toucher
     aux signaux data-e074 de la passe 1. */
  layout.dataset.v2E074Order = ORDER_VALUE;
  layout.dataset.v2E074Installs = String(installCount);
  if (!matrix.id) matrix.id = MATRIX_ID;
  matrix.dataset.v2E074NoOverflow = '1';
  if (detail) detail.dataset.v2E074NoOverflow = '1';

  /* E074-02, E074-03, E074-06 — repères de continuité dans la matrice. */
  ensureNode(
    make, BREAKPOINT_ID, 'p', 'points-v2-e074-breakpoint',
    'Mise en page empilée sous 1000 px de largeur (point de rupture mobile).',
    matrix
  );
  ensureNode(
    make, BELOW_ID, 'p', 'points-v2-e074-below-hint',
    'La fiche du point est affichée juste sous la matrice : faites défiler vers le bas pour la lire.',
    matrix
  );
  const separator = ensureNode(
    make, SEPARATOR_ID, 'hr', 'points-v2-e074-separator', undefined, matrix
  );
  separator.setAttribute('aria-hidden', 'true');

  let state = null;
  if (detail) {
    /* E074-04, E074-05, E074-07, E074-09 — un en-tête unique en tête de la
       fiche regroupe les repères propres au détail empilé. */
    const head = ensureNode(
      make, HEAD_ID, 'div', 'points-v2-e074-aside-head', undefined, detail
    );
    if (detail.firstElementChild !== head) detail.insertBefore(head, detail.firstChild);

    ensureNode(
      make, KICKER_ID, 'p', 'points-v2-e074-aside-kicker',
      'Détail du point', head
    );
    ensureNode(
      make, MEASURE_ID, 'p', 'points-v2-e074-measure-note',
      'Largeur de lecture limitée à 72 caractères.', head
    );

    const button = ensureNode(
      make, RETURN_ID, 'button', 'points-v2-e074-return',
      '↑ Retour à la matrice', head
    );
    if (button.type !== 'button') button.type = 'button';
    button.setAttribute('aria-controls', matrix.id || MATRIX_ID);
    if (!button.dataset.v2E074Bound) {
      button.dataset.v2E074Bound = '1';
      button.addEventListener('click', () => {
        const reduced = typeof ctx.reducedMotion === 'function'
          ? Boolean(ctx.reducedMotion()) : false;
        const courant = refs.matrix;
        if (courant && typeof courant.scrollIntoView === 'function') {
          courant.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        }
      });
    }
    state = ensureNode(make, STATE_ID, 'p', 'points-v2-e074-state', '', head);
  }

  /* E074-09 — une seule requête et un seul écouteur pour toute la session. */
  if (typeof window !== 'undefined' && window.matchMedia) {
    stackQuery = window.matchMedia(STACK_QUERY);
  }
  const reduced = typeof ctx.reducedMotion === 'function'
    ? Boolean(ctx.reducedMotion()) : false;
  refs = { layout, matrix, detail, state, reduced, stacked: false };
  applyState();

  if (!stackBound && stackQuery && typeof stackQuery.addEventListener === 'function') {
    stackQuery.addEventListener('change', onStackChange);
    stackBound = true;
  }
}

/* E074-10 — enregistrement unique, isolé par try/catch : une lentille
   défaillante ne doit jamais interrompre le rendu des autres modules V2. */
register('E074', (ctx) => {
  try { installer(ctx); } catch { return; }
});
