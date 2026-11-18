import { register } from './registry.js';

/* Lentille E014 — B. Filtres & périmètre : badge de récapitulatif du périmètre actif.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E014.md — chantiers E014-01 à E014-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le
 * registre, la coque et styles.css ne sont ni édités ni doublés : la lentille
 * ajoute un seul badge de lecture dans la barre de filtres existante.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, le dataset ou le détail : chaque valeur affichée
 * est dérivée du DOM réellement rendu par points.js.
 *
 * Invariants : un seul CSS (ctx.css), un seul badge, un seul observateur
 * ciblé, aucun live region ajouté (E015/E019 gardent la charge des annonces),
 * zéro écouteur global, zéro timer, zéro rAF, zéro réseau, zéro aléa, aucun
 * appel à la console, aucun fichier partagé modifié.
 */

const CSS_ID = 'points-e014';
const SCOPE = 'points-e014';
const BADGE_ID = 'points-e014-badge';
const MOTION_ATTR = 'data-e014-motion';

/* Toutes les règles sont soit sous la portée `.points-e014` posée sur
 * `.points-layout`, soit sous l'identifiant unique du badge : aucune fuite
 * hors de la vue Points. Les sélecteurs ciblent le DOM réel de points.js
 * (`.points-filters`, `.points-grid-row.is-active .points-era`,
 * `.points-detail .view-kicker`). */
const CSS = `
  .points-e014 .points-filters { align-items: center; }
  #${BADGE_ID} {
    display: inline-flex; flex-wrap: wrap; align-items: center;
    gap: 4px 10px; margin-left: auto; padding: 6px 10px; min-height: 38px;
    border: 1px solid var(--line-strong); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(230, 185, 111, .06);
    color: var(--ink-soft); font-size: 10px; line-height: 1.35;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
    transition: border-color .18s linear, background-color .18s linear;
  }
  #${BADGE_ID} .points-e014-heading {
    color: var(--gold-bright); font-size: 9px; font-weight: 600;
    letter-spacing: .06em; text-transform: uppercase;
  }
  #${BADGE_ID} .points-e014-axis { display: inline-flex; align-items: baseline; gap: 2px; }
  #${BADGE_ID} .points-e014-key { color: var(--muted); }
  #${BADGE_ID} .points-e014-value { color: var(--ink); font-weight: 600; }
  #${BADGE_ID} [data-e014-value="count"] { color: var(--gold-bright); }
  .points-e014[${MOTION_ATTR}="reduce"] #${BADGE_ID} { transition: none; }
  @media (max-width: 620px) {
    .points-e014 .points-filters { gap: 6px; }
    #${BADGE_ID} { margin-left: 0; width: 100%; font-size: 9px; gap: 3px 8px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${BADGE_ID} { transition: none; }
  }
  @media (forced-colors: active) {
    #${BADGE_ID} { border-color: CanvasText; background: Canvas; color: CanvasText; }
    #${BADGE_ID} .points-e014-heading,
    #${BADGE_ID} .points-e014-value,
    #${BADGE_ID} [data-e014-value="count"] { color: CanvasText; }
  }
`;

/* Le registre réapplique les greffons à chaque rendu : la closure module
 * survit, le ctx courant est relu à chaque passage (jamais une copie). */
let latestCtx = null;
let observer = null;
let lastSignature = '';
let refreshCount = 0;

function collapse(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/\s+/g, ' ').trim();
}

function selectsOf(layout) {
  const filters = layout.querySelector('.points-filters');
  const selects = filters ? filters.querySelectorAll('select') : null;
  return {
    filters,
    domain: selects && selects[0] ? selects[0] : null,
    family: selects && selects[1] ? selects[1] : null,
    kicker: layout.querySelector('.points-detail .view-kicker'),
  };
}

/* E014-02 / E014-03 : le libellé vient de l'option réellement sélectionnée,
 * jamais d'un littéral ni du store. Un sélecteur absent est signalé, pas deviné. */
function selectedLabel(select) {
  if (!select || !select.options || !select.options.length) return '';
  const index = typeof select.selectedIndex === 'number' ? select.selectedIndex : -1;
  if (index < 0 || index >= select.options.length) return '';
  return collapse(select.options[index].textContent) || '';
}

/* E014-04 : aucune date codée en dur ; l'ère est lue sur la ligne active de
 * la matrice, avec repli honnête sur la première ère du DOM. */
function eraLabel(layout) {
  const active = layout.querySelector('.points-grid-row.is-active .points-era');
  const direct = collapse(active ? active.textContent : '');
  if (direct) return direct;
  const first = layout.querySelector('.points-era');
  const fallback = collapse(first ? first.textContent : '');
  return fallback ? `${fallback} (première ère)` : 'ère non renseignée';
}

/* E014-05 : le compte est dérivé du `.view-kicker` du détail produit par
 * points.js:96 (`${visible.length} point(s) dans ce périmètre`). */
function countInfo(layout) {
  const kicker = layout.querySelector('.points-detail .view-kicker');
  const raw = collapse(kicker ? kicker.textContent : '');
  const match = raw.match(/(\d+)\s*point/i);
  if (!match) return { text: 'compte indisponible', raw };
  const n = Number(match[1]);
  return { text: `${n} ${n <= 1 ? 'point' : 'points'}`, raw };
}

function readPerimeter(layout, sources) {
  const counted = countInfo(layout);
  return {
    domain: selectedLabel(sources.domain) || 'domaine non renseigné',
    family: selectedLabel(sources.family) || 'famille non renseignée',
    era: eraLabel(layout),
    count: counted.text,
    raw: counted.raw,
  };
}

function signatureOf(perimeter) {
  return [perimeter.domain, perimeter.family, perimeter.era, perimeter.count].join(' | ');
}

/* E014-06 : chaque axe porte son libellé visible en texte ; aucune information
 * n'est confiée à la seule couleur (les accents CSS sont redondants). */
function buildBadge(ctx, filters) {
  const badge = ctx.el('div', 'points-e014-badge');
  badge.id = BADGE_ID;
  badge.setAttribute('role', 'group');
  badge.setAttribute('aria-label', 'Récapitulatif du périmètre actif');
  badge.appendChild(ctx.el('span', 'points-e014-heading', 'Périmètre actif'));
  [['domain', 'Domaine'], ['family', 'Famille'], ['era', 'Ère'], ['count', 'Points']]
    .forEach(([key, label]) => {
      const axis = ctx.el('span', 'points-e014-axis');
      axis.setAttribute('data-e014-axis', key);
      axis.appendChild(ctx.el('span', 'points-e014-key', `${label} :`));
      const value = ctx.el('span', 'points-e014-value');
      value.setAttribute('data-e014-value', key);
      value.textContent = '—';
      axis.appendChild(value);
      badge.appendChild(axis);
    });
  filters.appendChild(badge);
  return badge;
}

function paintBadge(badge, perimeter) {
  const values = badge.querySelectorAll('[data-e014-value]');
  values.forEach((value) => {
    const key = value.getAttribute('data-e014-value');
    if (Object.prototype.hasOwnProperty.call(perimeter, key)) {
      value.textContent = perimeter[key];
    }
  });
}

/* E014-07 : le compteur et la trace sont auditables par simple lecture du DOM,
 * sans journal ni région live supplémentaire. */
function writeTrace(badge, perimeter) {
  badge.dataset.e014Refreshes = String(refreshCount);
  badge.dataset.e014Signature = signatureOf(perimeter);
  badge.title = `Récapitulatif calculé depuis les deux sélecteurs, la ligne active de la matrice et le compteur du détail. Compte source : ${perimeter.raw || 'indisponible'} · Rafraîchissements locaux : ${refreshCount}.`;
}

function refresh() {
  const ctx = latestCtx;
  if (!ctx || !ctx.layout || !ctx.layout.isConnected) return;
  const badge = ctx.layout.querySelector(`#${BADGE_ID}`);
  if (!badge || !badge.isConnected) return;
  const perimeter = readPerimeter(ctx.layout, selectsOf(ctx.layout));
  const signature = signatureOf(perimeter);
  if (signature === lastSignature) return;
  lastSignature = signature;
  refreshCount += 1;
  paintBadge(badge, perimeter);
  writeTrace(badge, perimeter);
}

/* E014-08 : écoute locale et non destructive. Aucun preventDefault, aucun
 * stopPropagation : la vue reste maîtresse du re-rendu sur 'change'. Le marqueur
 * dataset évite un second écouteur si runEnhancements repasse sur le même DOM. */
function bindSelects(sources) {
  [sources.domain, sources.family].forEach((select) => {
    if (!select || !select.dataset || select.dataset.e014Bound === '1') return;
    select.dataset.e014Bound = '1';
    select.addEventListener('change', () => refresh());
  });
}

/* E014-10 : un seul observateur, déconnecté puis reconnecté, ciblé sur les
 * sources en lecture seule (sélecteurs et kicker) — jamais sur le badge écrit. */
function observeSources(sources) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  observer = null;
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => refresh());
  if (sources.domain) {
    observer.observe(sources.domain, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['selected'],
    });
  }
  if (sources.family) {
    observer.observe(sources.family, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['selected'],
    });
  }
  if (sources.kicker) {
    observer.observe(sources.kicker, { childList: true, characterData: true, subtree: true });
  }
}

register('E014', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  latestCtx = ctx;
  lastSignature = '';

  /* E014-01 / E014-10 : CSS unique (cssOnce), portée unique, signal unique. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e014 = '1';

  /* E014-09 : couplage JS explicite à la préférence de mouvement réduite, en
   * plus de la media query, pour les environnements sans matchMedia fiable. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(MOTION_ATTR, 'reduce');
  } else {
    layout.removeAttribute(MOTION_ATTR);
  }

  const sources = selectsOf(layout);
  if (!sources.filters) return;

  /* E014-01 : un seul badge, ancré dans la barre existante, non destructif.
   * Un nœud mal parenté issu d'un rendu précédent est retiré, jamais réécrit. */
  const stale = document.getElementById(BADGE_ID);
  if (stale && !layout.contains(stale)) stale.remove();
  let badge = layout.querySelector(`#${BADGE_ID}`);
  if (!badge) badge = buildBadge(ctx, sources.filters);

  const perimeter = readPerimeter(layout, sources);
  paintBadge(badge, perimeter);
  lastSignature = signatureOf(perimeter);
  writeTrace(badge, perimeter);

  bindSelects(sources);
  observeSources(sources);
});
