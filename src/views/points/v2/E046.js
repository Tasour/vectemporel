import { register } from './registry.js';

/* Lentille POINTS V2 E046 — domaine E : accessibilité & ARIA.
 * Seconde passe : les deux <select> de filtre deviennent un GROUPE NOMMÉ,
 * chacun avec son étiquette native, son identifiant déterministe et un texte
 * d'aide associé par aria-describedby. Toutes les valeurs sont dérivées du DOM
 * rendu (aria-label, options, valeur sélectionnée) : aucun millésime, aucun
 * total, aucune donnée historique n'est inventée.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E046.md — chantiers V2 E046-01 à
 * E046-10. Fichier possédé : ce module uniquement. Aucun fichier de la passe 1
 * (src/views/points/E046.js) ni aucun fichier partagé (points.js, index.js,
 * registry.js, styles.css, coque) n'est édité. La passe 2 cible viewId
 * 'pointsv2' (points.js:128) et s'applique au même DOM que la passe 1.
 *
 * Spécificités V2 (distinctes de la passe 1 au préfixe `points-e046-`) :
 * - une seule feuille, injectée par ctx.css('points-v2-e046', CSS) ;
 * - TOUTES les règles sont préfixées par la racine .points-v2-e046, y compris
 *   à l'intérieur des requêtes média : aucune fuite hors de la vue Points ;
 * - tous les identifiants CRÉÉS sont préfixés `points-v2-e046-` ; un identifiant
 *   déjà posé par la passe 1 est réutilisé, jamais réécrit ;
 * - le DOM statique est construit exclusivement avec ctx.el (jamais innerHTML) ;
 * - les marqueurs de donnée (data-points-v2-e046*, dataset.pointsV2E046*) sont
 *   distincts de ceux de la passe 1 (data-e046*) pour ne pas écraser ses signaux ;
 * - une étiquette déjà associée par la passe 1 est ADOPTÉE (classe et marqueur
 *   ajoutés) plutôt que dupliquée : aucun texte visible en double.
 *
 * Invariants : zéro console, zéro fetch/XMLHttpRequest/réseau, zéro
 * Math.random, zéro timer, zéro rAF, zéro écouteur global, zéro MutationObserver.
 * Non destructif : aria-label, options, valeur, écouteurs et bouton de
 * réinitialisation restent attachés aux mêmes nœuds ; aucun nœud de la vue
 * n'est réparenté ni retiré. Greffon neutralisé proprement en cas de structure
 * inattendue (try/catch), sans propager d'exception.
 */

const CSS_ID = 'points-v2-e046';
const SCOPE = 'points-v2-e046';
const TITLE_ID = 'points-v2-e046-title';
const TITLE_CLASS = 'points-v2-e046-title';
const LABEL_CLASS = 'points-v2-e046-label';
const HELP_CLASS = 'points-v2-e046-help';
const LABEL_PREFIX = 'points-v2-e046-label-';
const SELECT_PREFIX = 'points-v2-e046-select-';
const HELP_PREFIX = 'points-v2-e046-help-';
const OWN_MARK = 'data-points-v2-e046-own';
const REDUCED_ATTR = 'data-points-v2-e046-reduced';
const DATA_SCOPE = 'pointsV2E046';
const DATA_READY = 'pointsV2E046Ready';

/* Feuille unique. Chaque sélecteur commence par la classe racine, y compris
 * dans les @media : aucune règle ne peut fuir hors de la vue Points. Aucune
 * ressource externe, aucune animation de position, aucun piège de focus (les
 * nœuds ajoutés ne sont pas interactifs). Le repli mouvement réduit est double :
 * attribut piloté par ctx.reducedMotion() ET media query native. */
const CSS = `
  /* V2-01 : la barre de filtres devient une zone de portée autonome. */
  .points-v2-e046 { align-items: center; flex-wrap: wrap; gap: 8px 12px; }
  /* V2-04 : titre du groupe, texte réel lisible sans CSS. */
  .points-v2-e046 .points-v2-e046-title {
    flex-basis: 100%; margin: 0; color: var(--gold, #c8a96a);
    font-size: 11px; font-weight: 600; letter-spacing: .03em;
  }
  /* V2-03 : étiquette native alignée sur son contrôle. */
  .points-v2-e046 .points-v2-e046-label {
    align-self: center; min-height: 24px; padding: 0 2px;
    color: var(--muted-2, #8c8d91); font-size: 10px; font-weight: 600;
    letter-spacing: .02em;
  }
  .points-v2-e046 select { min-height: 38px; }
  /* V2-05 : aide associée, hors région live, texte plein. */
  .points-v2-e046 .points-v2-e046-help {
    margin: 0; color: var(--muted-2, #8c8d91);
    font-size: 10px; line-height: 1.3;
  }
  /* V2-10 : repères de focus visibles, sans déplacement. */
  .points-v2-e046 select:focus-visible,
  .points-v2-e046 .points-v2-e046-label:focus-within {
    outline: 2px solid var(--gold-bright, #e0c98a); outline-offset: 2px;
  }
  /* V2-10 : écran étroit — chaque texte occupe sa propre ligne. */
  @media (max-width: 620px) {
    .points-v2-e046 .points-v2-e046-label,
    .points-v2-e046 .points-v2-e046-help { flex-basis: 100%; }
  }
  /* V2-10 : mouvement réduit, couplage JS (attribut) ET media query native. */
  .points-v2-e046[${REDUCED_ATTR}="1"] select,
  .points-v2-e046[${REDUCED_ATTR}="1"] .points-v2-e046-title,
  .points-v2-e046[${REDUCED_ATTR}="1"] .points-v2-e046-label,
  .points-v2-e046[${REDUCED_ATTR}="1"] .points-v2-e046-help { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e046 select,
    .points-v2-e046 .points-v2-e046-title,
    .points-v2-e046 .points-v2-e046-label,
    .points-v2-e046 .points-v2-e046-help { transition: none; }
  }
  /* V2-10 : couleurs forcées — texte et contour explicites. */
  @media (forced-colors: active) {
    .points-v2-e046 .points-v2-e046-title,
    .points-v2-e046 .points-v2-e046-label,
    .points-v2-e046 .points-v2-e046-help { color: CanvasText; }
    .points-v2-e046 select:focus-visible { outline-color: Highlight; }
  }
  /* V2-10 : impression — on garde libellés et contrôles, on retire l'aide. */
  @media print {
    .points-v2-e046 .points-v2-e046-help { display: none; }
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

/* V2-05 : ajoute un jeton à un attribut de liste (ex. aria-describedby) sans
 * écraser une valeur déjà posée par une autre lentille. */
function appendToken(node, attr, token) {
  const current = txt(node.getAttribute(attr));
  if (!current) {
    node.setAttribute(attr, token);
    return;
  }
  if (current.split(/\s+/).indexOf(token) === -1) {
    node.setAttribute(attr, current + ' ' + token);
  }
}

/* V2-03 : le libellé vient de l'aria-label posé par points.js:63,75. Les deux
 * repli ne sont pas des données historiques : l'un lit un title déjà présent,
 * l'autre numérote structurellement un filtre inattendu. */
function labelFrom(select, index) {
  const named = txt(select.getAttribute('aria-label'));
  if (named) return named;
  const titled = txt(select.getAttribute('title'));
  if (titled) return txt(titled.split(/[:(]/)[0]) || titled;
  return `Filtre ${index + 1}`;
}

function helpFrom(select, index) {
  return labelFrom(select, index) + ' — le choix sélectionné limite les points affichés.';
}

/* V2-02 : identifiant stable repris s'il existe, sinon créé avec le préfixe V2.
 * L'index est déterministe : jamais de tirage aléatoire. Un id posé par la
 * passe 1 est réutilisé tel quel, ce qui préserve son association label/for. */
function ensureSelectId(select, index) {
  const existing = txt(select.getAttribute('id'));
  if (existing) return existing;
  const created = `${SELECT_PREFIX}${index}`;
  select.setAttribute('id', created);
  return created;
}

/* V2-09 : au plus un nœud par identifiant, créé par ctx.el, marqué comme
 * appartenant à la lentille pour permettre le nettoyage des orphelins. */
function ensureNode(ctx, parent, id, tag, cls, text, before) {
  let node = parent.querySelector('#' + id);
  if (!node) {
    node = ctx.el(tag, cls, text);
    node.id = id;
    if (before && before.parentNode === parent) parent.insertBefore(node, before);
    else parent.appendChild(node);
  } else {
    node.classList.add(cls);
    if (text !== undefined && !txt(node.textContent)) node.textContent = text;
  }
  node.setAttribute(OWN_MARK, '1');
  return node;
}

/* V2-03 : retrouve une étiquette déjà associée au select (cas normal : celle
 * de la passe 1). Recherche par attribut `for`, sans selector interpolé. */
function associatedLabel(select) {
  const id = txt(select.getAttribute('id'));
  if (!id || typeof document === 'undefined' || !document.querySelectorAll) return null;
  const labels = document.querySelectorAll('label');
  for (let i = 0; i < labels.length; i += 1) {
    if (txt(labels[i].getAttribute('for')) === id) return labels[i];
  }
  return null;
}

/* V2-03 : une étiquette native par filtre, juste avant son contrôle. Une
 * étiquette existante est adoptée (aucun texte visible dupliqué, aucun id
 * réécrit) ; sinon une étiquette V2 est créée avec un id préfixé. */
function ensureLabel(ctx, filters, select, index) {
  const selectId = ensureSelectId(select, index);
  let label = associatedLabel(select);
  if (label && label.parentNode !== filters) label = null;
  if (!label) {
    label = ctx.el('label', LABEL_CLASS);
    label.id = `${LABEL_PREFIX}${index}`;
    filters.insertBefore(label, select);
    label.setAttribute(OWN_MARK, '1');
  }
  label.classList.add(LABEL_CLASS);
  const text = labelFrom(select, index);
  if (!txt(label.textContent)) label.textContent = text;
  if (txt(label.getAttribute('for')) !== selectId) label.htmlFor = selectId;
  label.setAttribute('data-points-v2-e046-label', selectId);
  select.setAttribute('data-points-v2-e046-labelled', '1');
  return label;
}

/* V2-04 : le conteneur existant devient un groupe nommé SANS réparent les
 * selects (aucun wrapper), pour ne pas casser les sélecteurs descendants des
 * autres lentilles. role/aria-labelledby ne sont ajoutés que si absents. */
function ensureGroup(ctx, filters) {
  const title = ensureNode(ctx, filters, TITLE_ID, 'p', TITLE_CLASS,
    'Filtres de l’atlas des points.', filters.firstElementChild);
  if (!txt(filters.getAttribute('role'))) filters.setAttribute('role', 'group');
  if (txt(filters.getAttribute('role')) === 'group') {
    appendToken(filters, 'aria-labelledby', title.id);
  }
  return title;
}

/* V2-05 : texte d'aide associé par aria-describedby, inséré juste après son
 * select et dérivé de son aria-label. Aucune région live n'est introduite. */
function ensureHelp(ctx, filters, select, index) {
  const help = ensureNode(ctx, filters, HELP_PREFIX + index, 'p', HELP_CLASS,
    helpFrom(select, index), select.nextElementSibling || null);
  appendToken(select, 'aria-describedby', help.id);
  return help;
}

/* V2-09 : retrait des seuls nœuds possédés par la lentille dont l'identifiant
 * n'est plus dans l'ensemble de référence (filtre supprimé entre deux rendus). */
function removeStale(filters, selects) {
  const keep = [TITLE_ID];
  selects.forEach((_, index) => {
    keep.push(LABEL_PREFIX + index);
    keep.push(HELP_PREFIX + index);
  });
  nodes(filters, `[${OWN_MARK}]`).forEach((node) => {
    if (keep.indexOf(node.id) === -1) node.remove();
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

/* V2-08 : trace auditable, dérivée de l'état réel des selects. Aucune
 * information n'est mémorisée entre les rendus ni annoncée dans une région
 * live. Les marqueurs sont distincts de ceux de la passe 1. */
function refreshState(ctx, filters, selects) {
  filters.setAttribute('data-points-v2-e046', '1');
  filters.setAttribute('data-points-v2-e046-selects', String(selects.length));
  selects.forEach((select) => {
    select.setAttribute('data-points-v2-e046-value', txt(select.value));
    select.setAttribute('data-points-v2-e046-choice', selectedText(select));
  });
  const layout = ctx.layout || ctx.stage;
  if (layout && typeof layout.setAttribute === 'function') {
    layout.setAttribute('data-points-v2-e046', '1');
    layout.setAttribute('data-points-v2-e046-selects', String(selects.length));
  }
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    filters.setAttribute(REDUCED_ATTR, '1');
  } else {
    filters.removeAttribute(REDUCED_ATTR);
  }
  if (filters.dataset) filters.dataset[DATA_SCOPE] = '1';
  if (filters.dataset) filters.dataset[DATA_READY] = '1';
}

function apply(ctx) {
  /* V2-01 : filtre sur la vue V2 et gardes de type pour un ctx minimal. */
  if (!ctx || ctx.viewId !== 'pointsv2') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout || ctx.stage;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const filters = layout.querySelector('.points-filters');
  if (!filters || typeof filters.insertBefore !== 'function') return;

  const selects = nodes(filters, 'select');
  if (!selects.length) return;

  ctx.css(CSS_ID, CSS);
  filters.classList.add(SCOPE);
  filters.setAttribute('data-points-v2-e046', '1');

  /* V2-09 : nettoyage avant toute création (aucun doublon après re-rendu). */
  removeStale(filters, selects);

  /* V2-04 puis V2-03/V2-05 : groupe nommé, étiquettes et aides. */
  ensureGroup(ctx, filters);
  selects.forEach((select, index) => {
    ensureLabel(ctx, filters, select, index);
    ensureHelp(ctx, filters, select, index);
  });

  refreshState(ctx, filters, selects);
}

/* V2-09 : une lentille défaillante est neutralisée sans interrompre le rendu. */
register('E046', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
