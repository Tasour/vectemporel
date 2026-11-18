import { register } from './registry.js';

/* Lentille E054 — Légende sémantique des huit familles de points (domaine F :
 * sémantique & données).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E054.md — chantiers E054-01 à E054-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le
 * registre des lentilles et styles.css ne sont ni édités ni doublés : E054
 * ajoute une légende LOCALE, en lecture seule, dérivée du DOM réel produit par
 * la vue. Aucune donnée historique n'est inventée : la taxonomie des huit
 * familles et leurs questions viennent de POINT_METHODOLOGY.md §2, et la
 * présence d'une famille est lue dans le <select> des familles déjà construit
 * par points.js.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres internes ni le détail : la légende
 * reste lisible avec un ctx minimal.
 *
 * Invariants : un seul CSS, une seule portée, une seule légende par rendu ;
 * zéro écriture dans les nœuds observés, zéro écouteur global, zéro timer,
 * zéro rAF, zéro réseau, zéro aléa, zéro innerHTML, zéro console.*.
 */

const CSS_ID = 'points-e054';
const SCOPE = 'points-e054';
const LEGEND_ID = 'points-e054-legend';
const TITLE_ID = 'points-e054-title';
const LIST_ID = 'points-e054-list';
const METRICS_ID = 'points-e054-metrics';
const REDUCED_ATTR = 'data-e054-reduced';

/* E054-02 : taxonomie canonique (POINT_METHODOLOGY.md §2). Les identifiants
 * sont les slugs réellement présents dans dataset.js (groupe_social et
 * repere_normatif utilisent un tiret bas). Ce n'est pas une donnée historique :
 * c'est le vocabulaire normatif de la méthode, affiché en texte visible. */
const FAMILIES = [
  { id: 'evenement', label: 'Événement', question: 'Quand l’événement a-t-il eu lieu ?' },
  { id: 'processus', label: 'Processus', question: 'Quel changement lent ?' },
  { id: 'acteur', label: 'Acteur', question: 'Qui a agi ?' },
  { id: 'groupe_social', label: 'Groupe social', question: 'Quel collectif ?' },
  { id: 'lieu', label: 'Lieu', question: 'Où ?' },
  { id: 'institution', label: 'Institution', question: 'Quelle structure ?' },
  { id: 'repere_normatif', label: 'Repère normatif', question: 'Quelle règle ?' },
  { id: 'memoire', label: 'Mémoire', question: 'Comment le passé est-il raconté ?' },
];

/* Toutes les règles sont préfixées par `.points-e054`, classe posée sur
 * `.points-layout` : aucune fuite hors de cette vue. Aucune information n'est
 * portée par la seule couleur : chaque état a un glyphe ET un mot. */
const CSS = `
.points-e054 .points-e054-legend {
  margin-top: 14px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(8, 11, 16, .6);
}
.points-e054 .points-e054-legend h2 {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-e054 .points-e054-intro,
.points-e054 .points-e054-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
}
.points-e054 .points-e054-list {
  list-style: none; margin: 0 0 8px; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 6px;
}
.points-e054 .points-e054-item {
  display: flex; flex-direction: column; gap: 2px; min-height: 36px;
  padding: 6px 8px; border: 1px solid var(--line); border-left-width: 3px;
  border-radius: 6px; background: rgba(255, 255, 255, .02);
}
.points-e054 .points-e054-item.is-point { border-left-color: var(--gold-bright); }
.points-e054 .points-e054-item.is-present { border-left-color: var(--gold); }
.points-e054 .points-e054-item.is-absent { border-left-color: var(--line-strong); opacity: .8; }
.points-e054 .points-e054-label { font-size: 12px; color: var(--ink); }
.points-e054 .points-e054-question { font-size: 10px; color: var(--muted-2); }
.points-e054 .points-e054-state {
  font-size: 10px; font-variant-numeric: tabular-nums;
  transition: color .18s linear;
}
.points-e054 .points-e054-item.is-point .points-e054-state { color: var(--gold-bright); }
.points-e054 .points-e054-item.is-present .points-e054-state { color: var(--gold); }
.points-e054 .points-e054-item.is-absent .points-e054-state { color: var(--muted-2); }
.points-e054 .points-e054-metrics {
  margin: 0; padding-top: 6px; border-top: 1px solid var(--line);
  font-size: 10px; color: var(--muted-2); font-variant-numeric: tabular-nums;
}
.points-e054[` + REDUCED_ATTR + `="1"] .points-e054-state { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-e054 .points-e054-state { transition: none; }
}
@media (max-width: 900px) {
  .points-e054 .points-e054-list { grid-template-columns: 1fr; }
}
@media (forced-colors: active) {
  .points-e054 .points-e054-item { border-color: CanvasText; }
  .points-e054 .points-e054-item.is-point { border-left-color: Highlight; }
}
`;

let observer = null;        // un seul observateur, reconnecté à chaque rendu
let currentCtx = null;      // dernier ctx, pour le callback de l'observateur
let layoutRef = null;       // dernier layout, pour le callback de l'observateur
let listRef = null;         // <ul> de la légende, seul bloc remplacé
let metricsRef = null;      // compteurs auditables, hors région live
let renderedSignature = ''; // évite les écritures redondantes
let refreshCount = 0;       // nombre réel d'actualisations du bloc d'états

function byId(root, id) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector('#' + id) : null;
}

/* E054-03 : la vue construit deux <select> dans .points-filters ; le second
 * porte les familles présentes dans le corpus du pays (points.js:73-84). */
function familySelect(layout) {
  const filters = layout.querySelector('.points-filters');
  if (!filters) return null;
  const selects = filters.querySelectorAll('select');
  return selects.length >= 2 ? selects[1] : (selects[0] || null);
}

function presentFamilies(select) {
  const set = new Set();
  if (!select || !select.options) return set;
  for (const option of select.options) {
    const value = String(option.value || '');
    if (value && value !== '*') set.add(value);
  }
  return set;
}

/* E054-05 : les familles du point sélectionné sont écrites par points.js:109
 * comme des <span> de texte dans .points-families ; aucun attribut à inventer. */
function inPointFamilies(layout) {
  const set = new Set();
  const box = layout.querySelector('.points-detail .points-families');
  if (!box) return set;
  for (const node of box.children) {
    const value = String(node.textContent || '').trim();
    if (value) set.add(value);
  }
  return set;
}

/* E054-04 : trois états nommés, chacun avec un glyphe ET un mot — jamais la
 * seule couleur. L'absence est un état explicite (§3.7 : les silences sont
 * des données), pas un vide masqué. */
function stateFor(family, present, inPoint) {
  if (inPoint.has(family.id)) return { key: 'point', glyph: '◆', word: 'dans ce point' };
  if (present.has(family.id)) return { key: 'present', glyph: '●', word: 'présente dans le corpus' };
  return { key: 'absent', glyph: '○', word: 'absente du corpus' };
}

function signature(present, inPoint) {
  return [...present].sort().join(',') + '|' + [...inPoint].sort().join(',');
}

/* E054-09 : le bloc d'états est remplacé par des nœuds créés via ctx.el ;
 * aucune réinterprétation de balisage, aucun innerHTML. */
function renderList(ctx, present, inPoint) {
  if (!listRef) return;
  const nodes = FAMILIES.map((family) => {
    const state = stateFor(family, present, inPoint);
    const li = ctx.el('li', 'points-e054-item is-' + state.key);
    li.dataset.family = family.id;
    li.append(
      ctx.el('strong', 'points-e054-label', family.label),
      ctx.el('span', 'points-e054-question', family.question),
      ctx.el('span', 'points-e054-state', state.glyph + ' ' + state.word)
    );
    return li;
  });
  listRef.replaceChildren(...nodes);
}

function refresh(ctx, layout) {
  const present = presentFamilies(familySelect(layout));
  const inPoint = inPointFamilies(layout);
  const sig = signature(present, inPoint);
  if (sig === renderedSignature) return;
  renderedSignature = sig;
  refreshCount += 1;
  renderList(ctx, present, inPoint);
  if (!metricsRef) return;
  const known = FAMILIES.filter((family) => present.has(family.id)).length;
  const used = FAMILIES.filter((family) => inPoint.has(family.id)).length;
  metricsRef.textContent =
    `Légende : ${FAMILIES.length} familles canoniques · ${known} présentes · ` +
    `${FAMILIES.length - known} absentes · ${used} dans ce point · ` +
    `${refreshCount} actualisation(s).`;
}

/* E054-01 / E054-02 / E054-06 / E054-07 / E054-08 : structure statique
 * construite une seule fois. Seuls .points-e054-list et .points-e054-metrics
 * sont remplacés par refresh(). */
function buildLegend(ctx, legend) {
  legend.replaceChildren();
  legend.id = LEGEND_ID;
  legend.setAttribute('role', 'region');
  legend.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Légende des huit familles de points');
  title.id = TITLE_ID;
  legend.appendChild(title);

  legend.appendChild(ctx.el('p', 'points-e054-intro',
    'Une famille dit quelle question sémantique un point éclaire ; un point peut appartenir à plusieurs familles. Un point ne se réduit pas à une date.'));

  listRef = ctx.el('ul', 'points-e054-list');
  listRef.id = LIST_ID;
  legend.appendChild(listRef);

  metricsRef = ctx.el('p', 'points-e054-metrics', '');
  metricsRef.id = METRICS_ID;
  legend.appendChild(metricsRef);

  legend.appendChild(ctx.el('p', 'points-e054-note',
    'Lecture : l’ère et le champ temporel du détail mesurent QUAND ; la famille dit QUOI et COMMENT. La date est un champ, pas le contenu (§2).'));

  legend.appendChild(ctx.el('p', 'points-e054-note',
    'Critères d’un point valide (§1) : sujet, prédicat, complément, ancre temporelle, échelle, domaine, source vérifiable ou omission justifiée, degré de certitude.'));
}

/* E054-10 : un seul observateur, jamais sur la légende ni sur ses descendants
 * (sinon boucle d'écriture). Il ne lit que les deux signaux déjà produits par
 * la vue : le <select> des familles et la liste des familles du détail. */
function observe(ctx, layout) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => {
    if (currentCtx && layoutRef && layoutRef.isConnected) refresh(currentCtx, layoutRef);
  });
  const select = familySelect(layout);
  const detailFamilies = layout.querySelector('.points-detail .points-families');
  if (select) observer.observe(select, { childList: true, subtree: true, characterData: true });
  if (detailFamilies) observer.observe(detailFamilies, { childList: true, subtree: true, characterData: true });
}

register('E054', (ctx) => {
  const { viewId, layout, css, el, reducedMotion } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  currentCtx = ctx;
  layoutRef = layout;

  /* E054-01 : injection unique (cssOnce) et ancrage de la portée. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  /* E054-10 : couplement explicite à la préférence de mouvement réduit. */
  let reduced = false;
  if (typeof reducedMotion === 'function') {
    try { reduced = !!reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) layout.setAttribute(REDUCED_ATTR, '1');
  else layout.removeAttribute(REDUCED_ATTR);

  /* E054-01 : cible d'insertion = la matrice, juste après les filtres. */
  const matrix = layout.querySelector('.points-matrix');
  const parent = matrix || layout;

  let legend = byId(layout, LEGEND_ID);
  if (legend && legend.parentElement && legend.parentElement !== parent) {
    legend.remove();
    legend = null;
  }
  if (!legend) {
    const stale = document.getElementById(LEGEND_ID);
    if (stale && !layout.contains(stale)) stale.remove();
    legend = el('section', 'points-e054-legend');
    buildLegend(ctx, legend);
    renderedSignature = '';
    const filters = parent.querySelector('.points-filters');
    if (filters && filters.nextSibling) parent.insertBefore(legend, filters.nextSibling);
    else parent.appendChild(legend);
  } else {
    listRef = byId(legend, LIST_ID);
    metricsRef = byId(legend, METRICS_ID);
    if (!listRef || !metricsRef) {
      buildLegend(ctx, legend);
      renderedSignature = '';
    }
  }

  observe(ctx, layout);

  /* Le bloc d'états venant d'être reconstruit, sa signature est remise à zéro :
   * refresh() doit le peupler même si la donnée n'a pas changé entre rendus. */
  refresh(ctx, layout);
});
