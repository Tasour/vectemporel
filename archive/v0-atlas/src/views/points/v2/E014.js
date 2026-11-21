import { register } from './registry.js';

/* Lentille POINTS E014 — passe 2 (V2) : domaine B, filtres & périmètre.
 * Diagnostic de la barre de filtres, état des contrôles et périmètre quantifié.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E014.md — chantiers E014-V2-01 à
 * E014-V2-10 (seconde passe, dix chantiers inédits, tous implémentés).
 *
 * Fichier possédé : ce module uniquement. Aucun fichier de la passe 1 ni aucun
 * fichier partagé (points.js, index.js, registry.js, styles.css, coque) n'est
 * modifié. La lentille ne duplique pas le badge de la passe 1 : elle enrichit
 * les contrôles existants et dépose ses propres notes de lecture préfixées.
 *
 * Contrat exploité : viewId ('pointsv2'), stage, layout, css(id, rules),
 * el(tag, cls, text), reducedMotion(). Toute valeur est dérivée du DOM rendu
 * par points.js : selects, option sélectionnée, bouton de réinitialisation,
 * titre de la matrice, compteur du détail. Aucun chiffre n'est codé en dur.
 *
 * Invariants V2 : une seule feuille (cssOnce), une seule portée
 * (.points-v2-e014), des identifiants préfixés points-v2-e014-*, tout le DOM
 * statique créé par ctx.el, aucune injection de balisage brut, aucun appel
 * réseau, aucune source aléatoire, aucun minuteur, aucune boucle d'animation,
 * aucun écouteur global, aucune journalisation, aucun observateur (contrairement
 * à la passe 1). L'état est recalculé à chaque rendu, de façon synchrone.
 */

const CSS_ID = 'points-v2-e014';
const ROOT = 'points-v2-e014';
const MOTION = 'data-points-v2-e014-motion';

const ID = {
  descs: 'points-v2-e014-descs',
  descDomain: 'points-v2-e014-desc-domain',
  descFamily: 'points-v2-e014-desc-family',
  help: 'points-v2-e014-help',
  audit: 'points-v2-e014-audit',
  scope: 'points-v2-e014-scope',
};

/* Feuille unique. Chaque sélecteur COMMENCE par .points-v2-e014, y compris à
 * l'intérieur des requêtes média : aucune règle ne peut fuir hors de la vue.
 * L'état « actif » est porté par un attribut de donnée et par un texte ; la
 * couleur n'est jamais le seul vecteur d'information. Aucune animation propre,
 * aucune ressource externe, cibles tactiles ≥ 36 px et focus visible. */
const CSS = `
  .points-v2-e014 .points-filters { flex-wrap: wrap; align-items: center; gap: 8px 10px; }
  .points-v2-e014 .points-filters select { min-height: 38px; min-width: 0; max-width: 100%; }
  .points-v2-e014 .points-filters button { min-height: 38px; min-width: 44px; }
  .points-v2-e014 .points-filters select[data-points-v2-e014-state="actif"] { border-left: 3px solid var(--gold); }
  .points-v2-e014 .points-filters button:disabled { opacity: .6; cursor: not-allowed; }
  .points-v2-e014 .points-filters select:focus-visible,
  .points-v2-e014 .points-filters button:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  .points-v2-e014 #${ID.help} { margin: 4px 0; color: var(--muted); font-size: 10px; line-height: 1.5; }
  .points-v2-e014 #${ID.audit} { margin: 2px 0; color: var(--ink-soft); font-size: 10px; font-variant-numeric: tabular-nums; }
  .points-v2-e014 #${ID.scope} { margin: 2px 0 8px; color: var(--gold); font-size: 10px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
  .points-v2-e014 .points-v2-e014-desc { margin: 0; font-size: 10px; }
  .points-v2-e014 .points-v2-e014-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  .points-v2-e014[${MOTION}="reduced"] .points-filters select,
  .points-v2-e014[${MOTION}="reduced"] .points-filters button { transition: none; }
  @media (max-width: 620px) {
    .points-v2-e014 .points-filters { gap: 6px; }
    .points-v2-e014 .points-filters select { width: 100%; }
    .points-v2-e014 .points-filters button { min-height: 44px; width: 100%; }
    .points-v2-e014 #${ID.scope} { font-size: 9px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e014 .points-filters select,
    .points-v2-e014 .points-filters button { transition: none; }
  }
  @media (forced-colors: active) {
    .points-v2-e014 .points-filters select[data-points-v2-e014-state="actif"] { border-left-color: Highlight; }
    .points-v2-e014 .points-filters button:disabled { border-color: GrayText; color: GrayText; }
    .points-v2-e014 #${ID.scope} { color: CanvasText; }
  }
  @media print {
    .points-v2-e014 .points-v2-e014-sr { position: static; width: auto; height: auto; clip: auto; white-space: normal; }
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

function attr(node, name) {
  return node && typeof node.getAttribute === 'function' ? txt(node.getAttribute(name)) : '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, String(value));
}

function numberIn(text, pattern) {
  const match = String(text || '').match(pattern);
  return match ? Number(match[1]) : null;
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

function isActive(select) {
  const value = select && typeof select.value === 'string' ? select.value : '';
  return value !== '' && value !== '*';
}

function selectedText(select) {
  if (!select || !select.options || !select.options.length) return '';
  const index = typeof select.selectedIndex === 'number' ? select.selectedIndex : -1;
  if (index < 0 || index >= select.options.length) return '';
  return txt(select.options[index].textContent);
}

/* Fusion additive : toute relation posée par la passe 1 ou une autre lentille
 * est conservée, puis dédupliquée. Jamais d'écrasement d'un aria existant. */
function addDescribedBy(node, ids) {
  if (!node || typeof node.setAttribute !== 'function') return;
  const existing = attr(node, 'aria-describedby').split(/\s+/).filter(Boolean);
  const merged = [];
  ids.filter(Boolean).forEach((id) => { if (merged.indexOf(id) === -1) merged.push(id); });
  existing.forEach((id) => { if (merged.indexOf(id) === -1) merged.push(id); });
  if (merged.length) put(node, 'aria-describedby', merged.join(' '));
}

/* Un seul nœud par identifiant, même après rendus successifs : les doublons
 * sont retirés, un nœud périmé est déplacé ou remplacé. Tout est créé par
 * ctx.el : aucune injection de balisage brut n'est utilisée dans ce module. */
function place(doc, ctx, id, tag, className, parent, before) {
  const found = nodes(doc, `[id="${id}"]`);
  let node = found.length ? found[0] : null;
  for (let index = 1; index < found.length; index += 1) {
    if (found[index] && typeof found[index].remove === 'function') found[index].remove();
  }
  if (node && node.tagName && node.tagName.toLowerCase() !== tag.toLowerCase()) {
    if (typeof node.remove === 'function') node.remove();
    node = null;
  }
  if (node && node.parentElement && node.parentElement !== parent && typeof node.remove === 'function') {
    node.remove();
  }
  if (!node || node.isConnected === false) {
    node = ctx.el(tag, className);
    node.id = id;
    parent.insertBefore(node, before || null);
  } else if (before && node.nextSibling !== before) {
    parent.insertBefore(node, before);
  }
  return node;
}

function apply(ctx) {
  /* E014-V2-01 — Fondations V2 : garde de vue, feuille unique et portée. */
  if (!ctx || ctx.viewId !== 'pointsv2') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  const stage = ctx.stage;
  const root = (layout && typeof layout.querySelector === 'function' && layout.isConnected !== false)
    ? layout
    : (stage && typeof stage.querySelector === 'function' ? stage : null);
  if (!root) return;
  const matrix = root.querySelector('.points-matrix');
  const filters = matrix && typeof matrix.querySelector === 'function'
    ? matrix.querySelector('.points-filters') : null;
  if (!matrix || !filters || typeof matrix.insertBefore !== 'function') return;
  const doc = (layout && layout.ownerDocument) || (stage && stage.ownerDocument)
    || (typeof document !== 'undefined' ? document : null);
  if (!doc || typeof doc.querySelectorAll !== 'function') return;

  ctx.css(CSS_ID, CSS);
  if (layout && layout.classList && typeof layout.classList.add === 'function') layout.classList.add(ROOT);
  put(layout, 'data-points-v2-e014', ctx.viewId);

  /* E014-V2-09 — Quiétude : couplage JS à reducedMotion, en plus de la media
   * query native. Aucune animation, aucun minuteur, aucune boucle d'animation. */
  const reduce = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion();
  put(layout, MOTION, reduce ? 'reduced' : 'full');
  put(stage, 'data-points-v2-e014-stage', ctx.viewId);

  const selects = nodes(filters, 'select');
  const domainSelect = selects[0] || null;
  const familySelect = selects[1] || null;
  const reset = nodes(filters, 'button')
    .filter((button) => /réinitialiser/i.test(txt(button.textContent)))[0] || null;

  /* E014-V2-02 — État binaire des contrôles : 'actif' si la valeur n'est pas
   * le joker '*', 'tous' sinon. Porté par les contrôles eux-mêmes, sans region
   * live et sans doubler le badge de la passe 1. */
  [['domaine', domainSelect], ['famille', familySelect]].forEach((pair) => {
    if (!pair[1]) return;
    put(pair[1], 'data-points-v2-e014-axis', pair[0]);
    put(pair[1], 'data-points-v2-e014-state', isActive(pair[1]) ? 'actif' : 'tous');
  });

  /* E014-V2-07 — Titres enrichis de façon non destructive : ajoutés seulement
   * s'il n'en existe pas déjà un, pour préserver tout titre tiers. */
  if (domainSelect && !attr(domainSelect, 'title')) {
    put(domainSelect, 'title', 'Filtrer la matrice par domaine ; « Tous les domaines » affiche tous les points.');
  }
  if (familySelect && !attr(familySelect, 'title')) {
    put(familySelect, 'title', 'Filtrer la matrice par famille ; « Toutes les familles » affiche tous les points.');
  }

  /* E014-V2-03 — Description accessible par contrôle : un nœud de texte par
   * select, créé par ctx.el, référencé en fusion additive via aria-describedby. */
  const descs = place(doc, ctx, ID.descs, 'div', 'points-v2-e014-sr', matrix, filters);
  descs.textContent = '';
  [
    ['domaine', domainSelect, ID.descDomain],
    ['famille', familySelect, ID.descFamily],
  ].forEach((entry) => {
    if (!entry[1]) return;
    const active = isActive(entry[1]);
    const chosen = selectedText(entry[1]) || 'valeur inconnue';
    const text = active
      ? `Filtre ${entry[0]} actif : ${chosen}. Seuls les points de ce ${entry[0]} sont affichés.`
      : `Filtre ${entry[0]} inactif : toutes les valeurs sont affichées.`;
    const node = ctx.el('p', 'points-v2-e014-desc', text);
    node.id = entry[2];
    descs.appendChild(node);
    addDescribedBy(entry[1], [entry[2]]);
  });

  /* E014-V2-06 — Aide au filtrage, placée avant la barre dans la matrice et
   * reliée au conteneur par aria-describedby. Texte statique, jamais live. */
  const help = place(doc, ctx, ID.help, 'p', 'points-v2-e014-help', matrix, filters);
  help.textContent = 'Filtrez par domaine et par famille ; le bouton « Réinitialiser les filtres » rétablit l’affichage de tous les points.';
  addDescribedBy(filters, [ID.help]);

  /* E014-V2-05 — Diagnostic de la barre : nombre de contrôles, d'options et
   * d'axes actifs, tous dérivés du DOM rendu (aucun littéral numérique). */
  const optionsOf = (select) => (select && select.options ? select.options.length : 0);
  const activeAxes = selects.filter(isActive).length;
  const audit = place(doc, ctx, ID.audit, 'p', 'points-v2-e014-audit', matrix, help);
  audit.textContent = selects.length
    ? `Barre de filtres : ${selects.length} ${plural(selects.length, 'contrôle', 'contrôles')} · `
      + `${optionsOf(domainSelect)} options de domaine · ${optionsOf(familySelect)} options de famille · `
      + `${activeAxes} axe${plural(activeAxes, '', 's')} actif${plural(activeAxes, '', 's')} sur ${selects.length}.`
    : 'Barre de filtres : aucun contrôle disponible.';

  /* E014-V2-08 — Périmètre quantifié : le compte visible (kicker du détail) est
   * comparé au total (titre de la matrice) ; le nombre exclu est calculé, jamais
   * codé en dur. Une source manquante donne un repli explicite. */
  const titleNode = matrix.querySelector('.points-title');
  const total = numberIn(txt(titleNode && titleNode.textContent), /(\d+)\s*points?\s*isolés?/i);
  const detailKicker = root.querySelector('.points-detail .view-kicker');
  const visible = numberIn(txt(detailKicker && detailKicker.textContent), /(\d+)\s*point/i);
  const scope = place(doc, ctx, ID.scope, 'p', 'points-v2-e014-scope', matrix, filters);
  if (total !== null && visible !== null) {
    const excluded = Math.max(0, total - visible);
    scope.textContent = `Périmètre : ${visible} ${plural(visible, 'point', 'points')} affiché${plural(visible, '', 's')} `
      + `sur ${total} · ${excluded} ${plural(excluded, 'exclu', 'exclus')} par les filtres et l’ère courante.`;
    put(scope, 'data-points-v2-e014-total', String(total));
    put(scope, 'data-points-v2-e014-visible', String(visible));
    put(scope, 'data-points-v2-e014-excluded', String(excluded));
  } else {
    scope.textContent = 'Périmètre : décompte indisponible (titre de la matrice ou compteur du détail absent).';
    put(scope, 'data-points-v2-e014-total', '');
    put(scope, 'data-points-v2-e014-visible', '');
    put(scope, 'data-points-v2-e014-excluded', '');
  }

  /* E014-V2-04 — Bouton de réinitialisation désactivé quand aucun filtre n'est
   * actif, réactivé dès qu'un axe est actif. Le nœud d'origine est conservé. */
  if (reset) {
    const anyActive = selects.some(isActive);
    reset.disabled = !anyActive;
    put(reset, 'data-points-v2-e014-state', anyActive ? 'actif' : 'inactif');
    put(reset, 'title', anyActive
      ? 'Rétablir tous les domaines et toutes les familles.'
      : 'Aucun filtre actif : la réinitialisation est inutile.');
  }

  /* E014-V2-10 — Idempotence et traçabilité : un seul greffon, une seule
   * feuille, un nœud par identifiant (place()), marqueurs de greffage en data-*.
   * Aucun écouteur, aucun observateur, aucun minuteur, aucune rAF, aucune
   * journalisation : l'état est relu à chaque rendu, sans effet différé. */
  put(filters, 'data-points-v2-e014-controls', String(selects.length));
  put(filters, 'data-points-v2-e014-motion', reduce ? 'reduced' : 'full');
  put(matrix, 'data-points-v2-e014-grafted', '1');
}

register('E014', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
