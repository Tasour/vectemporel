import { register } from './registry.js';

/* Lentille E019 — B. Filtres & périmètre — annonce de changement de filtre
 * sans bavardage. Rapport : UNIFIED_AUDIT/POINTS/views/E019.md (E019-01..10).
 *
 * Fichier possédé : ce module uniquement. Les deux <select> et le bouton de
 * réinitialisation de points.js ne sont ni remplacés ni modifiés dans leur
 * comportement : E019 ajoute des attributs d'accessibilité, UN écouteur par
 * select et UNE région live LOCALE. Le bouton de réinitialisation appartient à
 * E013 : E019 reste volontairement muet sur ce geste pour ne pas doubler
 * l'annonce. Le ctx de cette vue n'expose pas say(), donc l'annonce passe par
 * un <p role=status aria-live=polite> persistant, accroché à document.body pour
 * survivre au re-render déclenché par set().
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (fournis par
 * points/registry.js:28-44). Les selectifs sont repérés dans .points-filters et
 * le compteur du périmètre est lu dans .points-detail : aucune donnée inventée,
 * aucun chiffre ni millésime codé en dur.
 *
 * Invariants :
 * - un seul greffon, un seul CSS, une seule région live, un écouteur par select ;
 * - aucune annonce au rendu, aucune annonce sur le bouton « Réinitialiser »,
 *   déduplication des phrases identiques : une seule annonce par changement ;
 * - non destructif : les gestionnaires natifs de points.js restent actifs ;
 * - zéro réseau, zéro aléa, zéro journalisation, zéro timer, zéro rAF,
 *   zéro innerHTML, zéro MutationObserver.
 */

const CSS_ID = 'points-e019';
const LIVE_ID = 'points-e019-live';

/* E019-01 / E019-08 : feuille unique (cssOnce via ctx.css), ciblée sur la vue
 * Points. Live region sr-only, selectifs à cible tactile et focus visible,
 * repli mouvement réduit : aucun effet hors de .points-layout. */
const CSS = `
  .points-layout .points-filters select { min-height: 36px; padding: 4px 8px; }
  .points-layout .points-filters select:focus-visible {
    outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 3px;
  }
  #${LIVE_ID} {
    position: absolute !important; width: 1px; height: 1px;
    margin: -1px; padding: 0; overflow: hidden;
    clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
  }
  @media (max-width: 620px) {
    .points-layout .points-filters select { min-height: 44px; width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-layout .points-filters select { transition: none !important; animation: none !important; }
  }
`;

let currentCtx = null;     // dernier ctx reçu, relu à chaque passage
let liveNode = null;       // région live unique, persistante sur document.body
let pending = null;        // changement de filtre en attente du re-render
let lastAnnouncement = ''; // garde anti-bavardage, stable entre les rendus
let announceCount = 0;     // compteur auditable (hors région live)

/* E019-03 : région live unique et CRÉÉE AVANT la première écriture, sinon les
 * lecteurs d'écran peuvent manquer l'annonce. Persistante sur body : le
 * re-render de points.js remplace le layout, pas cette région. */
function ensureLive() {
  let live = document.getElementById(LIVE_ID);
  if (live && live.isConnected) {
    liveNode = live;
    return live;
  }
  if (live) live.remove();
  live = document.createElement('p');
  live.id = LIVE_ID;
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  document.body.appendChild(live);
  liveNode = live;
  return live;
}

/* E019-05 : dédup stricte — une phrase identique n'est jamais réécrite, et
 * une région absente/déconnectée interdit toute annonce orpheline. */
function announce(message) {
  if (!message || message === lastAnnouncement) return;
  const live = ensureLive();
  if (!live || !live.isConnected) return;
  live.textContent = message;
  lastAnnouncement = message;
  announceCount += 1;
}

function rootOf(ctx) {
  if (ctx && ctx.layout && typeof ctx.layout.querySelector === 'function') return ctx.layout;
  if (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function') return ctx.stage;
  return null;
}

/* E019-02 / E019-04 : les deux selectifs sont lus tels qu'ils sont dans le DOM,
 * dans l'ordre où points.js les a appendés (0 = domaine, 1 = famille). */
function selectsOf(ctx) {
  const root = rootOf(ctx);
  const filters = root ? root.querySelector('.points-filters') : null;
  if (!filters || typeof filters.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(filters.querySelectorAll('select'));
}

/* E019-06 : le libellé annoncé vient de l'<option> réellement sélectionnée,
 * jamais d'une table codée en dur. */
function optionLabel(select) {
  if (!select || !select.options) return '';
  const option = select.options[select.selectedIndex];
  return option ? String(option.textContent || option.label || '').trim() : '';
}

/* E019-07 : le nombre de points est lu dans le compteur réel du détail, après
 * re-render. Aucun chiffre n'est calculé ni inventé par la lentille. */
function scopeCount(ctx) {
  const root = rootOf(ctx);
  const detail = root ? root.querySelector('.points-detail') : null;
  const text = detail ? String(detail.textContent || '') : '';
  const match = text.match(/(\d+)\s*point\(s\)\s*dans ce périmètre/i);
  return match ? match[1] : '';
}

/* E019-09 : un seul message court par changement, composé depuis le libellé de
 * l'option et le compteur du DOM. Le repli sans nombre reste véridifiable. */
function buildMessage(kind, label, count) {
  const head = `Filtre ${kind} : ${label || 'sélection modifiée'}.`;
  return count ? `${head} ${count} point(s) dans ce périmètre.`
               : `${head} Périmètre actualisé.`;
}

/* E019-02 / E019-04 : l'écouteur ne fait que mémoriser le changement. L'annonce
 * est différée à install(), c.-à-d. au rendu qui suit set(), pour lire le
 * compteur à jour. Le gestionnaire natif de points.js n'est ni retiré ni
 * remplacé : la sélection et le re-render se font exactement comme avant. */
function onFilterChange(kind, ctx, event) {
  const select = event && event.currentTarget;
  if (!select) return;
  currentCtx = ctx;
  pending = { kind, label: optionLabel(select), value: String(select.value || '') };
  const filters = rootOf(ctx);
  const host = filters ? filters.querySelector('.points-filters') : null;
  if (host) host.dataset.pointsE019Pending = kind;
}

function markFilters(ctx) {
  const root = rootOf(ctx);
  const filters = root ? root.querySelector('.points-filters') : null;
  if (!filters || !filters.querySelectorAll) return null;
  filters.dataset.pointsE019 = 'ready';
  return filters;
}

/* E019-10 : installation idempotente. CSS unique (ctx.css), région live unique,
 * écouteur unique par nœud (marqueur data-points-e019-bound), pending vidé après
 * usage. Aucun nœud natif n'est supprimé : greffon non destructif et rejouable. */
function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  currentCtx = ctx;
  ctx.css(CSS_ID, CSS);

  const selects = selectsOf(ctx);
  if (!selects.length) return;
  ensureLive();

  const kinds = ['domaine', 'famille'];
  selects.forEach((select, index) => {
    const kind = kinds[index] || `filtre-${index + 1}`;
    if (!select.id) select.id = `points-e019-filter-${kind}`;
    if (!select.getAttribute('title')) {
      select.title = 'Tout changement de ce filtre est annoncé aux lecteurs d’écran.';
    }
    if (select.dataset.pointsE019Bound !== '1') {
      select.dataset.pointsE019Bound = '1';
      select.addEventListener('change', (event) => onFilterChange(kind, ctx, event));
    }
  });

  const filters = markFilters(ctx) || selects[0].closest('.points-filters');
  if (!filters) return;

  /* E019-05 : vidage du pending après re-render : une seule annonce par
   * changement, même si install() repasse deux fois sur le même DOM. */
  if (pending) {
    const count = scopeCount(ctx);
    announce(buildMessage(pending.kind, pending.label, count));
    filters.dataset.pointsE019Last = pending.kind;
    filters.dataset.pointsE019Count = count || '0';
    filters.dataset.pointsE019Announced = String(announceCount);
    pending = null;
    delete filters.dataset.pointsE019Pending;
  }
}

register('E019', install);
