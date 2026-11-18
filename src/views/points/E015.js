import { register } from './registry.js';

/* Lentille E015 — B. Filtres & périmètre — nombre de résultats filtrés en
 * role=status. Rapport : UNIFIED_AUDIT/POINTS/views/E015.md.
 *
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la
 * coque et les autres lentilles ne sont ni éditées ni doublées. E015 n'ajoute
 * aucune commande et ne modifie aucun contrôle natif : il expose le NOMBRE DE
 * RÉSULTATS FILTRÉS dans une région live `role=status` et dans un repère visuel
 * compact accolé aux filtres.
 *
 * Le ctx de cette vue n'expose pas say() (voir points.js:126 et
 * points/registry.js:28-43) : l'annonce passe donc par un <p role=status> PERSISTANT
 * accroché à document.body, exactement comme E013, pour survivre au re-render
 * déclenché par set('filter'). Le compte est dérivé du DOM (kicker du détail),
 * jamais codé en dur.
 *
 * Invariants :
 * - une seule région live role=status, un seul repère visuel, un seul CSS ;
 * - garde anti-bavardage : une écriture seulement si le message change ;
 * - non destructif : selects, bouton de reset, cellules et fiche intacts ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e015';
const STATUS_ID = 'points-e015-status';
const BADGE_ID = 'points-e015-badge';

/* Le repère visuel est purement décoratif pour l'AT (aria-hidden) : la seule
 * région live est le STATUS_ID persistant, ce qui évite deux annonces. */
const CSS = `
  #${STATUS_ID} {
    position: absolute !important; width: 1px; height: 1px;
    margin: -1px; padding: 0; overflow: hidden;
    clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
  }
  .points-layout .points-e015-badge {
    display: inline-flex; align-items: center; min-height: 36px;
    margin: 0; padding: 6px 10px;
    border: 1px solid var(--line-strong, #6b6b6b); border-radius: 8px;
    background: rgba(230, 185, 111, .08); color: var(--gold-bright, #f0d49a);
    font: inherit; font-size: 12px; font-variant-numeric: tabular-nums;
    letter-spacing: .02em;
  }
  .points-layout .points-e015-badge:focus-visible {
    outline: 2px solid var(--gold-bright, #f0d49a); outline-offset: 2px;
  }
  @media (max-width: 700px) {
    .points-layout .points-e015-badge { min-height: 44px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-layout .points-e015-badge { transition: none; }
  }
`;

/* Dernier message écrit dans la live : garde anti-bavardage, conservé entre
 * rendus car le nœud live est persistant (contrairement au layout recréé). */
let lastMessage = '';

function rootOf(ctx) {
  return ctx && ctx.layout && typeof ctx.layout.querySelector === 'function'
    ? ctx.layout
    : (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null);
}

function findFilters(ctx) {
  const root = rootOf(ctx);
  return root ? root.querySelector('.points-filters') : null;
}

/* E015-02 : le décompte des résultats filtrés est la seule information
 * autorisée à venir d'un chiffre, et il est LU dans le DOM. points.js:96 écrit
 * `${visible.length} point(s) dans ce périmètre` dans le kicker du détail : c'est
 * la source de vérité, car la grille affiche les counts BRUTS par ère/domaine et
 * ne reflète ni le filtre de famille ni celui de domaine. */
function filteredCount(root) {
  const kicker = root ? root.querySelector('.points-detail .view-kicker') : null;
  const text = kicker ? String(kicker.textContent || '') : '';
  const match = text.match(/(\d+)\s*point/i);
  if (match) {
    const value = parseInt(match[1], 10);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

/* E015-04 : le total de référence vient du titre natif (points.js:32),
 * `${points.length} points isolés`. Aucun total littéral dans le module. */
function totalCount(root) {
  const title = root ? root.querySelector('.points-title') : null;
  const text = title ? String(title.textContent || '') : '';
  const match = text.match(/(\d+)/);
  if (match) {
    const value = parseInt(match[1], 10);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

/* E015-03 : le périmètre est décrit depuis les deux <select> et la ligne d'ère
 * active. Le libellé de l'option sélectionnée est préféré à sa valeur brute. */
function selectedLabel(select) {
  if (!select) return '';
  const list = select.selectedOptions && select.selectedOptions.length
    ? select.selectedOptions
    : (select.options ? [select.options[select.selectedIndex]] : []);
  const option = list[0];
  const label = option ? String(option.textContent || '').trim() : '';
  return label || String(select.value || '').trim();
}

function filterState(filters) {
  const selects = filters && typeof filters.querySelectorAll === 'function'
    ? filters.querySelectorAll('select') : [];
  const domainSelect = selects[0];
  const familySelect = selects[1];
  const domainValue = domainSelect ? domainSelect.value : '*';
  const familyValue = familySelect ? familySelect.value : '*';
  return {
    domainValue,
    familyValue,
    domainLabel: selectedLabel(domainSelect) || 'Tous les domaines',
    familyLabel: selectedLabel(familySelect) || 'Toutes les familles',
    filtered: (domainValue && domainValue !== '*') || (familyValue && familyValue !== '*'),
  };
}

function activeEraLabel(root) {
  const row = root ? root.querySelector('.points-grid-row.is-active') : null;
  const era = row ? row.querySelector('.points-era') : null;
  const label = era ? String(era.textContent || '').trim() : '';
  return label || 'ère non précisée';
}

/* E015-02/03/04 : une seule phrase, intégralement dérivée du DOM, réconciliant
 * le décompte filtré, le total de référence et le périmètre. */
function buildMessage(ctx, filters) {
  const root = rootOf(ctx);
  const count = filteredCount(root);
  const total = totalCount(root);
  const perimeter = filterState(filters);
  const subject = count === 1 ? 'résultat' : 'résultats';
  const reference = total > 0 ? ` sur ${total} points isolés` : '';
  const state = perimeter.filtered ? '' : ' (aucun filtre actif)';
  return `${count} ${subject} dans le périmètre${reference} · Domaine : ${perimeter.domainLabel} · Famille : ${perimeter.familyLabel} · Ère : ${activeEraLabel(root)}${state}.`;
}

function shortMessage(ctx) {
  const root = rootOf(ctx);
  const count = filteredCount(root);
  const subject = count === 1 ? 'résultat' : 'résultats';
  return `${count} ${subject} affiché${count === 1 ? '' : 's'}`;
}

/* E015-01 : région live UNIQUE et PERSISTANTE. Créée avant la première écriture
 * pour être connue de l'AT au moment de l'annonce ; accrochée à body pour ne
 * jamais être détachée par le re-render de points.js. */
function ensureLive() {
  let live = document.getElementById(STATUS_ID);
  if (live) return live;
  live = document.createElement('p');
  live.id = STATUS_ID;
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  document.body.appendChild(live);
  return live;
}

/* E015-06 : n'écrire que si le message diffère. Sur une navigation de point
 * (pointIndex), le DOM est reconstruit mais le décompte est inchangé : aucune
 * écriture, donc aucune annonce redondante. */
function announce(message) {
  if (!message || message === lastMessage) return;
  const live = ensureLive();
  if (live.textContent !== message) live.textContent = message;
  lastMessage = message;
}

/* E015-05 : repère visuel compact, recréé à chaque rendu dans .points-filters.
 * Il est aria-hidden : la couleur et le chiffre ne portent aucune information
 * exclusive (le texte est lisible), et l'AT n'entend que la live region. */
function paintBadge(ctx, filters, message) {
  if (!filters) return;
  let badge = filters.querySelector(`#${BADGE_ID}`);
  if (!badge) {
    badge = ctx.el('span', 'points-e015-badge');
    badge.id = BADGE_ID;
    badge.setAttribute('aria-hidden', 'true');
    filters.appendChild(badge);
  }
  const text = shortMessage(ctx);
  if (badge.textContent !== text) badge.textContent = text;
  badge.title = message;
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  ctx.css(CSS_ID, CSS);

  const filters = findFilters(ctx);
  if (!filters) return;

  const message = buildMessage(ctx, filters);
  paintBadge(ctx, filters, message);
  announce(message);
}

register('E015', install);
