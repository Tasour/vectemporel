import { register } from './registry.js';

/* Lentille E072 — Responsive & mobile : cibles tactiles >= 44 px (domaine H).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E072.md — chantiers E072-01 à E072-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : E072 ajoute UNE portée CSS et
 * UNE note de lecture statique, et s'appuie sur le DOM déjà rendu par la vue.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (fournis par
 * points/registry.js:28-44). Aucune dépendance vers le store, les filtres ou le
 * détail : les cibles restent élargies même avec un ctx minimal.
 *
 * Invariants :
 * - une seule feuille CSS, injectée par ctx.css('points-e072', …) ;
 * - tous les identifiants sont préfixés `points-e072-` ;
 * - non destructif : aucune classe (is-active, has-points), aucun attribut
 *   d'origine, aucun gestionnaire natif n'est retiré ou réécrit ;
 * - idempotent : la note est réutilisée par identifiant, jamais dupliquée ;
 * - zéro écouteur global, zéro timer, zéro rAF, zéro réseau, zéro aléa,
 *   zéro innerHTML, zéro console.*.
 */

const CSS_ID = 'points-e072';
const SCOPE = 'points-e072';
const NOTE_ID = 'points-e072-note';

/* Feuille unique. Les règles sont toutes préfixées par `.points-e072`, classe
 * posée sur le conteneur `.points-layout` : aucune fuite hors de la vue Points.
 * Les sélecteurs ciblent le DOM réel de points.js (.points-grid-row > button /
 * .points-era / .points-cell, .points-filters select/button, .points-nav button).
 * Rien n'est animé : le mouvement réduit n'est qu'un garde-fou (E072-10). */
const CSS = `
  /* E072-01 : portée stricte, le layout ne déborde pas son parent. */
  .points-e072 { min-width: 0; max-width: 100%; }

  /* E072-02 : cibles tactiles >= 44 px sur la matrice : boutons d'ère
   * (.points-era) et cellules (.points-cell), sans toucher aux couleurs ni
   * aux classes is-active / has-points. */
  .points-e072 .points-grid-row > button {
    min-height: 44px;
    min-width: 44px;
    padding: 8px 10px;
  }

  /* E072-03 : les deux selects et le bouton de réinitialisation des filtres. */
  .points-e072 .points-filters select,
  .points-e072 .points-filters button {
    min-height: 44px;
    padding: 8px 12px;
  }

  /* E072-04 : navigation « Point précédent / Point suivant » (>= 44 px). */
  .points-e072 .points-nav button {
    min-height: 44px;
    padding: 8px 10px;
  }

  /* E072-05 : pointeur grossier (tactile) — cibles et espacements élargis.
   * Signal JS (data-points-e072-coarse) ET media query, avec le même résultat. */
  .points-e072[data-points-e072-coarse="1"] .points-filters,
  .points-e072[data-points-e072-coarse="1"] .points-nav { gap: 12px; }
  @media (pointer: coarse) {
    .points-e072 .points-grid-row > button,
    .points-e072 .points-filters select,
    .points-e072 .points-filters button,
    .points-e072 .points-nav button { min-height: 48px; }
    .points-e072 .points-filters,
    .points-e072 .points-nav { gap: 12px; }
  }

  /* E072-06/07 : reflow mobile sans débordement horizontal de la page. Le
   * défilement horizontal reste confiné à la grille (déjà overflow-x:auto dans
   * styles.css) ; momentum et containment évitent le piège de défilement. */
  @media (max-width: 620px) {
    .points-e072 .points-grid {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior-x: contain;
      max-height: 58vh;
    }
    .points-e072 .points-matrix { padding: 14px 12px 20px; }
    .points-e072 .points-detail { padding: 16px 12px; }
  }

  /* E072-08 : focus visible renforcé, lisible au clavier comme au toucher. */
  .points-e072 :is(button, select):focus-visible {
    outline: 3px solid var(--gold-bright, #e9c98f);
    outline-offset: 2px;
  }

  /* E072-09 : note de lecture statique, hors région live. */
  .points-e072-note {
    margin: 0 0 12px;
    color: var(--muted-2, #8a8a8a);
    font-size: 10px;
    line-height: 1.5;
  }

  /* E072-10 : mouvement réduit — aucune transition propre, simple garde-fou. */
  @media (prefers-reduced-motion: reduce) {
    .points-e072 :is(button, select) { transition: none !important; }
  }
`;

function rootOf(ctx) {
  if (ctx && ctx.layout && typeof ctx.layout.querySelector === 'function') return ctx.layout;
  if (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function') return ctx.stage;
  return null;
}

function queryAll(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

/* E072-05 : détection du pointeur grossier avec repli prudent (faux si
 * matchMedia est absent) ; le même signal est couplé au CSS par attribut. */
function coarsePointer() {
  try {
    return Boolean(window.matchMedia('(pointer: coarse)').matches);
  } catch {
    return false;
  }
}

function reduced(ctx) {
  if (ctx && typeof ctx.reducedMotion === 'function') {
    try { return !!ctx.reducedMotion(); }
    catch { /* repli ci-dessous */ }
  }
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

/* E072-09 : une seule note par rendu, réutilisée par identifiant. Un nœud
 * d'un rendu précédent mal parenté est retiré avant réinsertion. */
function placeNote(ctx, matrix) {
  let note = matrix.querySelector('#' + NOTE_ID);
  if (!note) {
    const stale = document.getElementById(NOTE_ID);
    if (stale && !matrix.contains(stale)) stale.remove();
    note = ctx.el('p', 'points-e072-note',
      'Cibles tactiles : tous les boutons et champs de la matrice, des filtres et de la navigation mesurent au moins 44 px. Sur écran tactile, l’espacement est élargi et le défilement horizontal reste dans la grille.');
    note.id = NOTE_ID;
    const title = matrix.querySelector('.points-title');
    if (title && title.nextSibling) matrix.insertBefore(note, title.nextSibling);
    else matrix.appendChild(note);
  }
  return note;
}

/* E072-10 : installation idempotente. Aucun écouteur, aucun timer, aucun
 * compteur incrémenté : seuls des attributs de miroir auditable sont écrits. */
register('E072', (ctx) => {
  const root = rootOf(ctx);
  if (!root || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;

  ctx.css(CSS_ID, CSS);
  root.classList.add(SCOPE);

  const coarse = coarsePointer();
  root.setAttribute('data-points-e072', '1');
  root.setAttribute('data-points-e072-coarse', coarse ? '1' : '0');
  root.setAttribute('data-points-e072-motion', reduced(ctx) ? 'reduce' : 'normal');

  const matrix = root.querySelector('.points-matrix');
  if (matrix && typeof matrix.insertBefore === 'function') placeNote(ctx, matrix);

  /* Miroir du nombre réel de cibles élargies, dérivé du DOM : aucune valeur
   * codée en dur, aucune modification des contrôles existants. */
  const targets = queryAll(root, '.points-grid-row > button, .points-filters select, .points-filters button, .points-nav button');
  root.setAttribute('data-points-e072-targets', String(targets.length));
});
