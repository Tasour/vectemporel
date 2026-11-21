import { register } from './registry.js';

/* Lentille POINTS V2 E011 — Filtres & périmètre : lecture seconde du filtrage.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E011.md — chantiers V2 E011-01 à
 * E011-10 (seconde passe). Fichier possédé : ce module uniquement. Aucun
 * fichier de la passe 1 ni aucun fichier partagé n'est édité (ni points.js,
 * ni store.js, ni index.js, ni registry.js, ni styles.css, ni la coque).
 *
 * La passe 1 (préfixe `points-e011-`) annonce déjà le domaine actif dans une
 * région live et marque la colonne. La V2 explore DIX angles inédits sur le
 * même domaine : puces de critères, part du périmètre affiché, fil hiérarchique,
 * cohérence du point détaillé, aide au bouton de réinitialisation, signaux
 * d'état V2, relations ARIA de contrôle, détection de périmètre vide et
 * glossaire des termes. Aucune de ces structures ne recouvre la passe 1.
 *
 * Contrat exploité : ctx.viewId ('pointsv2'), ctx.stage, ctx.layout,
 * ctx.css, ctx.el et ctx.reducedMotion, fournis par runEnhancementsV2
 * (src/views/points.js:128). Toutes les valeurs sont DÉRIVÉES DU DOM rendu :
 * libellés des options, compteurs du kicker et du titre, libellé du point
 * détaillé. Aucun chiffre historique n'est codé en dur, aucune donnée n'est
 * inventée, aucun écouteur n'est ajouté, aucune écriture dans le store.
 *
 * Spécificités V2 :
 * - une seule feuille, injectée par ctx.css('points-v2-e011', CSS) ;
 * - TOUTES les règles CSS commencent par la classe racine .points-v2-e011,
 *   y compris à l'intérieur des requêtes média ;
 * - tous les identifiants sont préfixés `points-v2-e011-` et protégés contre
 *   les doublons (un seul nœud par identifiant, même après rendus multiples) ;
 * - le DOM statique est construit exclusivement avec ctx.el (jamais
 *   d'affectation de balisage) et vidé avec replaceChildren ;
 * - les attributs et données V2 utilisent `data-v2-e011-*` / `data-points-v2-e011`,
 *   distincts des `data-points-e011-*` de la passe 1 ;
 * - ctx.viewId conditionne le greffage, ctx.stage sert d'ancre de repli,
 *   ctx.reducedMotion pilote une classe de quiétude sans animation.
 *
 * Invariants : zéro journal, zéro réseau, zéro aléa, zéro minuteur, zéro
 * boucle d'animation, zéro écouteur global. Greffon passif, idempotent et non
 * destructif : une structure inattendue neutralise la lentille sans propager
 * d'exception ; aucun contrôle natif n'est retiré ni réécrit.
 */

const ROOT = 'points-v2-e011';

const ID = {
  trail: 'points-v2-e011-trail',          // fil hiérarchique du périmètre
  criteria: 'points-v2-e011-criteria',    // puces des critères actifs
  ratio: 'points-v2-e011-ratio',          // part affichée / total (role=meter)
  coherence: 'points-v2-e011-coherence',  // cohérence du point détaillé
  resetHelp: 'points-v2-e011-reset-help', // aide du bouton de réinitialisation
  empty: 'points-v2-e011-empty',          // message de périmètre vide
  glossary: 'points-v2-e011-glossary',    // glossaire des termes du filtre
  grid: 'points-v2-e011-grid',            // id posé sur la grille existante
  detail: 'points-v2-e011-detail',        // id posé sur le détail existant
};

/* Feuille unique. Chaque sélecteur COMMENCE par .points-v2-e011, y compris
 * dans les blocs @media : aucune fuite hors de la lentille, aucune ressource
 * externe, aucune animation. Les cibles restent ≥ 36 px, le focus est visible,
 * et l'information n'est jamais portée par la seule couleur (texte, puces,
 * bordures et valeurs ARIA). Le repli quiétude est double : classe pilotée par
 * ctx.reducedMotion() ET media query native. */
const CSS = `
.points-v2-e011 #${ID.trail}{margin:6px 0 2px;font-size:10px;line-height:1.5;color:var(--muted-2);font-variant-numeric:tabular-nums}
.points-v2-e011 #${ID.criteria}{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0 6px;padding:0;list-style:none}
.points-v2-e011 #${ID.criteria} li{min-height:24px;padding:2px 7px;border:1px solid var(--line-strong);border-radius:999px;font-size:10px;line-height:1.5;color:var(--ink-soft)}
.points-v2-e011 #${ID.ratio}{margin:6px 0;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}
.points-v2-e011 #${ID.coherence}{margin:6px 0;padding-left:8px;border-left:2px solid var(--gold);color:var(--muted);font-size:10px;line-height:1.5}
.points-v2-e011 #${ID.empty}{margin:6px 0;color:var(--gold-bright);font-size:11px;line-height:1.5}
.points-v2-e011 #${ID.glossary}{margin:8px 0 0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 8px;font-size:10px;line-height:1.5;color:var(--muted-2)}
.points-v2-e011 #${ID.glossary} dt{color:var(--muted);font-weight:600}
.points-v2-e011 #${ID.glossary} dd{margin:0}
.points-v2-e011 .points-v2-e011-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.points-v2-e011 .points-filters select,
.points-v2-e011 .points-filters button{min-height:36px}
.points-v2-e011 .points-filters select:focus-visible,
.points-v2-e011 .points-filters button:focus-visible,
.points-v2-e011 .points-cell:focus-visible,
.points-v2-e011 .points-era:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.points-v2-e011-still #${ID.criteria} li{transition:none}
@media (max-width:620px){
  .points-v2-e011 #${ID.glossary}{grid-template-columns:minmax(0,1fr)}
}
@media (prefers-reduced-motion:reduce){
  .points-v2-e011 #${ID.criteria} li{transition:none}
}
@media (forced-colors:active){
  .points-v2-e011 #${ID.criteria} li{border:1px solid CanvasText}
}
`;

/* --- Utilitaires défensifs : un contexte minimal ou un DOM partiel ne doit
 * jamais faire lever d'exception dans la lentille. ------------------------ */

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function addClass(node, name) {
  if (node && node.classList && typeof node.classList.add === 'function') node.classList.add(name);
}

function toggleClass(node, name, on) {
  if (node && node.classList && typeof node.classList.toggle === 'function') node.classList.toggle(name, !!on);
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* Lecture d'un compteur réellement rendu. Aucune valeur de repli chiffrée :
 * un kicker ou un titre absent donne `null`, jamais un total supposé. */
function countFrom(node) {
  const match = /(\d+)\s+point/i.exec(txt(node));
  return match ? Number(match[1]) : null;
}

/* Option sélectionnée d'un <select> : libellé lu dans le DOM, valeur '*'
 * signifiant « tous ». Aucun libellé n'est codé en dur. */
function selectedOf(select) {
  if (!select || typeof select.value !== 'string') return { value: '*', label: '' };
  const value = select.value;
  if (value === '*') return { value, label: '' };
  const found = nodes(select, 'option').filter((option) => option.value === value)[0];
  return { value, label: txt(found) || value };
}

/* ctx.layout d'abord, repli sur ctx.stage (ou sur le .points-layout qu'il
 * contient). Le viewId 'pointsv2' seul active la lentille. */
function resolveLayout(ctx) {
  if (!ctx || (ctx.viewId && ctx.viewId !== 'pointsv2')) return null;
  let layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function' || layout.isConnected === false) {
    const stage = ctx.stage;
    const inside = stage && typeof stage.querySelector === 'function'
      ? stage.querySelector('.points-layout') : null;
    layout = inside || (stage && typeof stage.querySelector === 'function' ? stage : null);
  }
  if (!layout || typeof layout.querySelector !== 'function') return null;
  return layout;
}

/* Réutilise un nœud par identifiant et déduplique au passage : s'il existe
 * plusieurs éléments portant le même id (rendus successifs), tous les
 * surnuméraires sont retirés. Garantit l'idempotence V2 après un rendu neuf. */
function place(ctx, doc, id, tag, className, parent, before) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  const all = nodes(doc, `[id="${id}"]`);
  let node = all.length ? all[0] : null;
  for (let index = 1; index < all.length; index += 1) {
    if (all[index] && all[index].remove) all[index].remove();
  }
  if (node && node.tagName && node.tagName.toLowerCase() !== tag.toLowerCase()) {
    if (node.remove) node.remove();
    node = null;
  }
  if (node && node.parentNode !== parent) {
    if (node.remove) node.remove();
    node = null;
  }
  if (!node) {
    node = ctx.el(tag, className);
    node.id = id;
  }
  let anchor = before;
  if (anchor && (anchor.parentNode !== parent || anchor === node)) anchor = null;
  if (node.parentNode !== parent || (anchor && node.nextSibling !== anchor)) {
    parent.insertBefore(node, anchor || null);
  }
  return node;
}

/* Id unique sur un nœud existant : on ne vole jamais un identifiant déjà
 * porté par un autre élément du document. */
function ensureId(node, preferred, doc) {
  if (!node || typeof node.setAttribute !== 'function') return '';
  const current = typeof node.getAttribute === 'function' ? node.getAttribute('id') : '';
  if (current) return current;
  let id = preferred;
  let suffix = 2;
  while (doc.getElementById(id) && doc.getElementById(id) !== node) {
    id = `${preferred}-${suffix}`;
    suffix += 1;
  }
  put(node, 'id', id);
  return id;
}

/* Fusion additive d'un attribut de relations : les identifiants posés par la
 * passe 1 ou une autre lentille sont conservés, puis dédupliqués. */
function mergeAttr(node, name, ids) {
  if (!node || typeof node.getAttribute !== 'function') return;
  const existing = (node.getAttribute(name) || '').split(/\s+/).filter(Boolean);
  const merged = Array.from(new Set(existing.concat(ids.filter(Boolean)))).join(' ');
  if (merged) put(node, name, merged);
}

function apply(ctx) {
  const layout = resolveLayout(ctx);
  if (!layout) return;
  const filters = layout.querySelector('.points-filters');
  const matrix = layout.querySelector('.points-matrix');
  const detail = layout.querySelector('.points-detail');
  if (!filters || !matrix || !detail) return;
  if (typeof filters.insertBefore !== 'function' || typeof detail.insertBefore !== 'function') return;

  const doc = layout.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (!doc || typeof doc.getElementById !== 'function') return;

  /* Lecture unique de l'état courant, uniquement depuis le DOM rendu. */
  const selects = nodes(filters, 'select');
  const domainSelect = selects[0] || null;
  const familySelect = selects[1] || null;
  const resetButton = filters.querySelector('button') || null;
  const grid = matrix.querySelector('.points-grid') || null;
  const detailKicker = detail.querySelector('.view-kicker');
  const titleNode = matrix.querySelector('.points-title');
  const domain = selectedOf(domainSelect);
  const family = selectedOf(familySelect);
  const isFull = domain.value === '*' && family.value === '*';
  const shown = countFrom(detailKicker);
  const total = countFrom(titleNode);

  /* E011-01 — Feuille unique, portée V2, ancrage viewId/stage/layout et quiétude. */
  ctx.css('points-v2-e011', CSS);
  addClass(layout, ROOT);
  const reduce = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion();
  toggleClass(layout, `${ROOT}-still`, reduce);
  put(layout, 'data-v2-e011-view', String(ctx.viewId || ''));
  put(layout, 'data-v2-e011-motion', reduce ? 'reduced' : 'full');
  put(layout, 'data-v2-e011-grafted', '1');
  if (ctx.stage && typeof ctx.stage.setAttribute === 'function') {
    put(ctx.stage, 'data-points-v2-e011', String(ctx.viewId || ''));
  }

  /* E011-02 — Puces des critères actifs, dérivées des options sélectionnées. */
  const criteria = place(ctx, doc, ID.criteria, 'ul', 'points-v2-e011-criteria', filters, resetButton);
  if (criteria) {
    criteria.replaceChildren();
    put(criteria, 'aria-label', 'Critères de filtrage actifs');
    const chips = [];
    if (domain.value !== '*') chips.push(`Domaine : ${domain.label}`);
    if (family.value !== '*') chips.push(`Famille : ${family.label}`);
    if (!chips.length) chips.push('Périmètre complet : aucun critère');
    chips.forEach((label) => criteria.appendChild(ctx.el('li', '', label)));
  }

  /* E011-03 — Part du périmètre affiché : compteurs relus, jamais codés en dur. */
  const percent = (shown !== null && total) ? Math.round((shown / total) * 100) : 0;
  const ratioText = (shown === null || total === null)
    ? 'Périmètre non mesurable : compteurs absents du rendu.'
    : `${shown} point${plural(shown, '', 's')} affiché${plural(shown, '', 's')} sur ${total} au total · ${percent} % du périmètre.`;
  const ratio = place(ctx, doc, ID.ratio, 'div', 'points-v2-e011-ratio', filters, resetButton);
  if (ratio) {
    put(ratio, 'role', 'meter');
    put(ratio, 'aria-label', 'Part du périmètre affiché');
    put(ratio, 'aria-valuemin', '0');
    put(ratio, 'aria-valuemax', '100');
    put(ratio, 'aria-valuenow', String(percent));
    put(ratio, 'aria-valuetext', ratioText);
    put(ratio, 'data-v2-e011-shown', shown === null ? '' : String(shown));
    put(ratio, 'data-v2-e011-total', total === null ? '' : String(total));
    put(ratio, 'data-v2-e011-percent', String(percent));
    ratio.replaceChildren();
    ratio.appendChild(ctx.el('span', '', ratioText));
  }

  /* E011-04 — Fil hiérarchique du périmètre : domaine puis famille. */
  const trail = place(ctx, doc, ID.trail, 'p', 'points-v2-e011-trail', filters, criteria || resetButton);
  if (trail) {
    put(trail, 'aria-label', 'Fil du périmètre');
    const steps = [
      domain.value === '*' ? 'Tous les domaines' : domain.label,
      family.value === '*' ? 'Toutes les familles' : family.label,
    ];
    trail.replaceChildren();
    steps.forEach((step, index) => {
      if (index) trail.appendChild(ctx.el('span', '', ' › '));
      trail.appendChild(ctx.el('span', '', step));
    });
  }

  /* E011-05 — Cohérence du point détaillé avec le domaine filtré. */
  const meta = detail.querySelector('.points-meta');
  const pointDomain = meta && meta.firstElementChild ? txt(meta.firstElementChild) : '';
  const match = domain.value === '*' ? 'all' : (pointDomain && pointDomain === domain.label ? 'yes' : 'no');
  const coherenceText = match === 'all'
    ? 'Aucun filtre de domaine : le détail peut afficher un point de n’importe quel domaine.'
    : match === 'yes'
      ? `Le point détaillé appartient au domaine filtré « ${domain.label} ».`
      : `Le point détaillé appartient au domaine « ${pointDomain || 'inconnu'} », autre que le filtre « ${domain.label} » : vérifiez le périmètre.`;
  const coherence = place(ctx, doc, ID.coherence, 'p', 'points-v2-e011-coherence', detail,
    detail.querySelector('.points-point-title') || (detailKicker ? detailKicker.nextSibling : null));
  if (coherence) {
    coherence.textContent = coherenceText;
    put(coherence, 'data-v2-e011-match', match);
  }

  /* E011-06 — Aide du bouton de réinitialisation, sans écraser une relation. */
  const resetHelp = place(ctx, doc, ID.resetHelp, 'p', 'points-v2-e011-sr', filters, resetButton);
  if (resetHelp) {
    resetHelp.textContent = 'Réinitialiser les filtres restaure le périmètre complet : tous les domaines et toutes les familles redeviennent visibles.';
  }
  if (resetButton) {
    mergeAttr(resetButton, 'aria-describedby', [ID.resetHelp]);
    put(resetButton, 'data-v2-e011-reset-described', '1');
  }

  /* E011-07 — Signaux d'état V2 observables sans lire le texte du bandeau. */
  put(layout, 'data-v2-e011-domain', domain.value);
  put(layout, 'data-v2-e011-family', family.value);
  put(layout, 'data-v2-e011-scope', isFull ? 'full' : 'filtered');
  put(layout, 'data-v2-e011-shown', shown === null ? '' : String(shown));
  put(layout, 'data-v2-e011-total', total === null ? '' : String(total));

  /* E011-08 — Relations ARIA des selects vers la matrice et le détail. */
  const gridId = ensureId(grid, ID.grid, doc);
  const detailId = ensureId(detail, ID.detail, doc);
  if (gridId && detailId) {
    [domainSelect, familySelect].forEach((select) => {
      if (!select) return;
      mergeAttr(select, 'aria-controls', [gridId, detailId]);
      mergeAttr(select, 'aria-describedby', [ID.criteria, ID.trail]);
      put(select, 'data-v2-e011-linked', '1');
    });
  }

  /* E011-09 — Détection d'un périmètre vide et consigne pour l'élargir. */
  const isEmpty = shown === 0 || txt(detail).indexOf('Aucun point validé dans ce périmètre') !== -1;
  const emptyNode = place(ctx, doc, ID.empty, 'p', 'points-v2-e011-empty', detail,
    detail.querySelector('.points-nav'));
  if (emptyNode) {
    emptyNode.textContent = isEmpty
      ? 'Périmètre vide : aucun point ne correspond aux critères. Élargissez le domaine ou la famille, ou réinitialisez les filtres.'
      : '';
    if (isEmpty) emptyNode.removeAttribute('hidden');
    else put(emptyNode, 'hidden', '');
  }
  put(layout, 'data-v2-e011-empty', isEmpty ? '1' : '0');

  /* E011-10 — Glossaire des termes du filtrage, dérivé des options réelles,
   * puis marqueur de greffage final. Aucun timer, aucune animation propre. */
  const glossary = place(ctx, doc, ID.glossary, 'dl', 'points-v2-e011-glossary', matrix, null);
  if (glossary) {
    glossary.replaceChildren();
    const domainValues = nodes(domainSelect, 'option').filter((option) => option.value !== '*').map(txt);
    const familyValues = nodes(familySelect, 'option').filter((option) => option.value !== '*').map(txt);
    const definitions = [
      ['Domaine', domainValues.length
        ? `regroupement thématique des points (${domainValues.join(', ')}).`
        : 'regroupement thématique des points ; aucune valeur observée.'],
      ['Famille', familyValues.length
        ? `appartenance secondaire des points (${familyValues.join(', ')}).`
        : 'appartenance secondaire des points ; aucune valeur observée.'],
      ['Périmètre', 'ensemble des points affichés après application du domaine, de la famille et de l’ère.'],
      ['Ère', 'tranche temporelle sélectionnée, commune à la matrice et au détail.'],
    ];
    definitions.forEach((pair) => {
      glossary.appendChild(ctx.el('dt', '', pair[0]));
      glossary.appendChild(ctx.el('dd', '', pair[1]));
    });
    put(glossary, 'aria-label', 'Glossaire des filtres et du périmètre');
  }
  put(layout, 'data-v2-e011-ready', '1');
}

register('E011', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
