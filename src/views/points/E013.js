import { register } from './registry.js';

/* Lentille E013 — B. Filtres & périmètre — réinitialisation des filtres
 * (bouton + annonce). Rapport : UNIFIED_AUDIT/POINTS/views/E013.md.
 *
 * Fichier possédé : ce module uniquement. Le bouton natif de points.js
 * (clear, « Réinitialiser les filtres ») n'est ni remplacé ni modifié dans son
 * comportement : E013 ajoute des attributs d'accessibilité, UN écouteur
 * d'annonce et une région live LOCALE. Le ctx de cette vue n'expose pas say(),
 * donc l'annonce passe par un <p role=status aria-live=polite> persistant,
 * accroché à document.body pour survivre au re-render déclenché par set().
 *
 * Invariants :
 * - un seul bouton marqué, un seul écouteur d'annonce, une seule région live ;
 * - non destructif : le gestionnaire natif de points.js reste actif et intact ;
 * - toute annonce est dérivée du DOM (selects + matrice) : aucun chiffre ni
 *   millésime codé en dur, aucune donnée inventée ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e013';
const RESET_ID = 'points-e013-reset';
const LIVE_ID = 'points-e013-live';

/* Le contexte n'a pas de say() : on pose un .sr-only persistant, créé avant
 * la première annonce pour être vu des lecteurs d'écran au moment de l'écriture. */
const CSS = `
  #${RESET_ID} {
    min-height: 44px; padding: 8px 12px;
    border: 1px solid var(--line-strong, #6b6b6b); border-radius: 8px;
    background: rgba(230, 185, 111, .08); color: var(--gold-bright, #f0d49a);
    font: inherit; cursor: pointer;
  }
  #${RESET_ID}:focus-visible { outline: 2px solid var(--gold-bright, #f0d49a); outline-offset: 3px; }
  #${LIVE_ID} {
    position: absolute !important; width: 1px; height: 1px;
    margin: -1px; padding: 0; overflow: hidden;
    clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    #${RESET_ID} { transition: none; }
  }
`;

/* Dernière phrase émise : garde anti-bavardage, réinitialisée à chaque rendu. */
let lastAnnouncement = '';

function rootOf(ctx) {
  return ctx && ctx.layout && typeof ctx.layout.querySelector === 'function'
    ? ctx.layout
    : (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null);
}

function findFilters(ctx) {
  const root = rootOf(ctx);
  return root ? root.querySelector('.points-filters') : null;
}

/* E013-01 : repérage NON destructif du bouton natif. On ne crée jamais de
 * second bouton : on réutilise celui de points.js, reconnu à son libellé. */
function findReset(filters) {
  if (!filters || typeof filters.querySelectorAll !== 'function') return null;
  const tagged = filters.querySelector(`#${RESET_ID}`);
  if (tagged) return tagged;
  const buttons = filters.querySelectorAll('button');
  for (const button of buttons) {
    if (/r[eé]initialiser/i.test(button.textContent || '')) return button;
  }
  return buttons.length ? buttons[buttons.length - 1] : null;
}

/* E013-04 : les deux <select> sont lus tels qu'ils sont dans le DOM. Le
 * gestionnaire natif a déjà mis state à '*' mais n'a pas encore re-rendu le
 * DOM au moment où notre écouteur s'exécute : les valeurs restent celles
 * d'avant la réinitialisation, seules sources de vérité pour l'annonce. */
function selectValues(filters) {
  const list = filters && typeof filters.querySelectorAll === 'function'
    ? filters.querySelectorAll('select') : [];
  return { domain: list[0] ? list[0].value : '', family: list[1] ? list[1].value : '' };
}

function activeFilterCount(filters) {
  const { domain, family } = selectValues(filters);
  let count = 0;
  if (domain && domain !== '*') count += 1;
  if (family && family !== '*') count += 1;
  return count;
}

/* E013-05 : le nombre de points qui redeviennent visibles est sommé depuis
 * les cellules has-points de la ligne d'ère active (la réinitialisation ne
 * touche pas l'ère). Repli sur toute la matrice si aucune ligne n'est active. */
function visibleAfterReset(ctx) {
  const root = rootOf(ctx);
  if (!root || typeof root.querySelectorAll !== 'function') return 0;
  const activeCells = root.querySelectorAll('.points-grid-row.is-active .points-cell.has-points');
  const cells = activeCells.length
    ? activeCells
    : root.querySelectorAll('.points-cell.has-points');
  let total = 0;
  cells.forEach((cell) => {
    const value = parseInt(String(cell.textContent || '').trim(), 10);
    if (Number.isFinite(value) && value > 0) total += value;
  });
  return total;
}

/* E013-06 : deux messages distincts et véridifiables ; aucun chiffre littéral,
 * aucune date : le seul nombre vient de visibleAfterReset(). */
function buildMessage(ctx, filters) {
  if (activeFilterCount(filters) === 0) {
    return 'Aucun filtre actif : la réinitialisation ne change rien au périmètre.';
  }
  const count = visibleAfterReset(ctx);
  const suffix = count > 0
    ? ` ${count} point(s) redeviennent visibles.`
    : ' Le périmètre est à nouveau complet.';
  return `Filtres réinitialisés : domaine et famille tous affichés.${suffix}`;
}

/* E013-03 : région live unique et persistante, créée avant toute écriture. */
function ensureLive() {
  let live = document.getElementById(LIVE_ID);
  if (live) return live;
  live = document.createElement('p');
  live.id = LIVE_ID;
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  document.body.appendChild(live);
  return live;
}

/* E013-07 : dédup — une phrase identique n'est jamais réécrite dans la live. */
function announce(message) {
  if (!message || message === lastAnnouncement) return;
  ensureLive().textContent = message;
  lastAnnouncement = message;
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  ctx.css(CSS_ID, CSS);

  const filters = findFilters(ctx);
  if (!filters) return;
  const reset = findReset(filters);
  if (!reset) return;

  /* E013-02 : marquage accessible, sans écraser un attribut déjà présent. */
  if (!reset.id) reset.id = RESET_ID;
  if (!reset.getAttribute('aria-label')) {
    reset.setAttribute('aria-label', 'Réinitialiser les filtres de domaine et de famille');
  }
  if (!reset.getAttribute('type')) reset.type = 'button';
  if (!reset.getAttribute('title')) {
    reset.title = 'Réinitialise le domaine et la famille ; l’ère courante est conservée.';
  }
  reset.classList.add('points-e013-reset');

  /* E013-08 : signaux DOM préfixés, lisibles par les autres lentilles sans
   * occuper de nom générique (data-points-e013*). */
  filters.dataset.pointsE013 = 'ready';

  /* E013-03 : la région existe avant le premier clic, sinon l'AT peut manquer
   * la première annonce. On la vide aussi à chaque rendu neuf. */
  const live = ensureLive();
  live.textContent = '';
  lastAnnouncement = '';

  /* E013-09 : idempotence — un seul écouteur par bouton, même si install()
   * est appelé deux fois sur le même DOM. Le gestionnaire natif qui remet
   * state à '*' et déclenche set() n'est ni retiré ni remplacé. */
  if (reset.dataset.pointsE013Bound !== '1') {
    reset.dataset.pointsE013Bound = '1';
    reset.addEventListener('click', () => {
      const message = buildMessage(ctx, filters);
      filters.dataset.pointsE013Last = 'reset';
      announce(message);
    });
  }
}

register('E013', install);
