import { register } from './registry.js';

/* Lentille E046 — Accessibilité & ARIA : selects avec <label> associé.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E046.md — chantiers E046-01 à E046-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le
 * registre, styles.css et les autres lentilles ne sont ni édités ni doublés :
 * E046 enrichit le DOM déjà produit par renderPoints (points.js:60-93), sans
 * reconstruire la grille ni réenregistrer les écouteurs des filtres.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion. Aucune dépendance au store, aux filtres ou au jeu de données :
 * chaque libellé est dérivé de l'aria-label réellement posé par points.js:62,74
 * (avec repli structurel), jamais d'une donnée historique codée en dur.
 *
 * Invariants :
 * - un seul CSS (points-e046), injecté par ctx.css (cssOnce, registry.js:13-19) ;
 * - un seul couple <label for>/<select id> par filtre, tous identifiants préfixés
 *   `points-e046-` et déterministes (aucun tirage aléatoire) ;
 * - non destructif : aria-label, options, valeur sélectionnée, classes, title et
 *   écouteurs des selects préservés ; aucun nœud de la vue n'est retiré ;
 * - idempotent : garde data-e046-labelled, réutilisation par identifiant, retrait
 *   des étiquettes orphelines, références for/id réappliquées à chaque rendu ;
 * - composable : E024/E093/E094/E095 lisent l'aria-label des selects, E083
 *   vérifie l'intégrité des références `for` : rien n'est écrasé ici ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e046';
const LABEL_CLASS = 'points-e046-label';
const LABEL_PREFIX = 'points-e046-label-';
const SELECT_PREFIX = 'points-e046-select-';
const MARKED = 'data-e046-labelled';

/* Feuille unique, cadrée par le signal data-e046="1" posé sur .points-filters.
 * styles.css:361 pose déjà display:flex/flex-wrap/gap: E046 ne le réécrit pas,
 * il ne fait qu'aligner les étiquettes, renforcer le focus et prévoir les
 * préférences système. Aucune transition n'est introduite. */
const CSS = `
  .points-filters[data-e046="1"] { align-items: center; }
  .points-filters[data-e046="1"] .points-e046-label {
    align-self: center;
    min-height: 24px;
    padding: 0 2px;
    color: var(--gold);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .03em;
  }
  .points-filters[data-e046="1"] select { min-height: 38px; }
  .points-filters[data-e046="1"] select:focus-visible {
    outline: 2px solid var(--gold-bright);
    outline-offset: 2px;
  }
  .points-filters[data-e046="1"] .points-e046-label:focus-within {
    outline: 1px dotted var(--gold);
    outline-offset: 2px;
  }
  @media (max-width: 620px) {
    .points-filters[data-e046="1"] .points-e046-label { flex-basis: 100%; font-size: 11px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-filters[data-e046="1"] select,
    .points-filters[data-e046="1"] .points-e046-label { transition: none; }
  }
  @media (forced-colors: active) {
    .points-filters[data-e046="1"] .points-e046-label { color: CanvasText; }
    .points-filters[data-e046="1"] select:focus-visible { outline-color: Highlight; }
  }
`;

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

/* E046-03 : le libellé vient de l'aria-label posé par points.js (`:62`, `:74`).
 * Les deux repli ne sont pas des données historiques : l'un lit un title déjà
 * présent (E095), l'autre numérote structurellement un filtre inattendu. */
function labelFrom(select, index) {
  const named = txt(select.getAttribute('aria-label'));
  if (named) return named;
  const titled = txt(select.getAttribute('title'));
  if (titled) return txt(titled.split(/[:(]/)[0]) || titled;
  return `Filtre ${index + 1}`;
}

/* E046-02 : un identifiant stable est repris s'il existe, sinon un identifiant
 * préfixé est créé. L'index est déterministe : jamais de tirage aléatoire. */
function ensureSelectId(select, index) {
  let id = txt(select.getAttribute('id'));
  if (!id) {
    id = `${SELECT_PREFIX}${index}`;
    select.setAttribute('id', id);
  }
  return id;
}

/* E046-01 / E046-04 / E046-05 : une étiquette native `<label for>` est placée
 * juste avant son select, dans .points-filters, sans déplacer le select ni le
 * bouton de réinitialisation. aria-label, options, valeur et écouteurs restent
 * intacts ; seul l'attribut id peut être ajouté au select. */
function ensureLabel(ctx, filters, select, index) {
  const selectId = ensureSelectId(select, index);
  const labelId = `${LABEL_PREFIX}${index}`;
  let label = document.getElementById(labelId);
  if (label && label.parentNode !== filters) label.remove();
  if (!label || !label.isConnected) {
    label = ctx.el('label', LABEL_CLASS);
    label.id = labelId;
  }
  if (label.nextElementSibling !== select) filters.insertBefore(label, select);
  label.htmlFor = selectId;
  label.textContent = labelFrom(select, index);
  label.setAttribute('data-e046-for', selectId);

  select.setAttribute(MARKED, '1');
  select.setAttribute('data-e046-label-id', labelId);
  return label;
}

/* E046-05 : une étiquette devenue orpheline (filtre supprimé entre deux rendus)
 * est retirée, ce qui complète la réutilisation par identifiant. */
function dropOrphans(filters, keepIds) {
  nodes(filters, `label.${LABEL_CLASS}`).forEach((label) => {
    if (keepIds.indexOf(label.id) === -1) label.remove();
  });
}

function selectedText(select) {
  let option = null;
  if (select.selectedIndex >= 0 && select.options) option = select.options[select.selectedIndex];
  if (!option && select.selectedOptions && select.selectedOptions[0]) {
    option = select.selectedOptions[0];
  }
  return txt(option) || txt(select.value);
}

/* E046-08 : trace auditable, dérivée de l'état réel des deux selects. Aucune
 * information n'est mémorisée entre les rendus ni annoncée dans une région live. */
function refreshState(ctx, filters, selects) {
  filters.setAttribute('data-e046', '1');
  filters.setAttribute('data-e046-selects', String(selects.length));
  selects.forEach((select) => {
    select.setAttribute('data-e046-value', txt(select.value));
    select.setAttribute('data-e046-choice', selectedText(select));
  });
  const layout = ctx.layout || ctx.stage;
  if (layout && typeof layout.setAttribute === 'function') {
    layout.setAttribute('data-e046', '1');
    layout.setAttribute('data-e046-selects', String(selects.length));
  }
}

register('E046', (ctx) => {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;
  const layout = ctx.layout || ctx.stage;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const filters = layout.querySelector('.points-filters');
  if (!filters || typeof filters.insertBefore !== 'function') return;

  const selects = nodes(filters, 'select');
  if (!selects.length) return;

  ctx.css(CSS_ID, CSS);
  const keepIds = selects.map((_, index) => `${LABEL_PREFIX}${index}`);
  dropOrphans(filters, keepIds);
  selects.forEach((select, index) => ensureLabel(ctx, filters, select, index));
  refreshState(ctx, filters, selects);
});
