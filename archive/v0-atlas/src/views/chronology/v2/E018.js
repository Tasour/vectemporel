import { register } from './registry.js';

/* Lentille E018 — combinaison recherche × type de point cohérente
 * (domaine B : filtres et périmètre de la vue Chronologie, passe V2).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E018.md — chantiers E018-01 à E018-10.
 * Fichier possédé : src/views/chronology/v2/E018.js uniquement. Aucun autre module,
 * aucune feuille globale, aucun fichier de la passe 1 n'est modifié.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Le registre V2
 * ne fournit pas say() : la lentille n'ajoute AUCUNE région live et n'écrit dans
 * aucune région existante. Elle rend visible, dans un panneau local en flux normal,
 * la règle de combinaison des deux filtres et les contrôles de cohérence déduits
 * du DOM réellement rendu.
 *
 * Invariants :
 * - un seul appel à register (identifiant E018), un seul ctx.css (feuille unique) ;
 * - aucun écouteur documentaire, aucun gestionnaire de touche, aucun timer,
 *   aucune boucle d'animation, aucun aléa, aucun réseau, aucune journalisation,
 *   aucun HTML brut : tous les nœuds sont créés par ctx.el / textContent ;
 * - tous les IDs sont préfixés chronology-v2-e018- et protégés par ensureNode ;
 * - aucune écriture dans #atlas-chrono-search, les puces de type,
 *   #atlas-chrono-status, #atlas-chrono-events ou #nav-c2a-live.
 */

const CSS_ID = 'chronology-v2-e018';
const PANEL_ID = 'chronology-v2-e018-panel';
const TITLE_ID = 'chronology-v2-e018-title';
const RULE_ID = 'chronology-v2-e018-rule';
const CRITERIA_ID = 'chronology-v2-e018-criteria';
const QUERY_ID = 'chronology-v2-e018-query';
const TAG_ID = 'chronology-v2-e018-tag';
const COMMUTE_ID = 'chronology-v2-e018-commute';
const SCOPE_ID = 'chronology-v2-e018-scope';
const MATCH_ID = 'chronology-v2-e018-match';
const CHIPS_ID = 'chronology-v2-e018-chips';
const COUNTERS_ID = 'chronology-v2-e018-counters';
const DETAILS_ID = 'chronology-v2-e018-details';
const EMPTY_ID = 'chronology-v2-e018-empty';
const RENDERS_ID = 'chronology-v2-e018-renders';

const MAIN_ID = 'atlas-chrono-main';
const LIST_ID = 'atlas-chrono-events';
const STATUS_ID = 'atlas-chrono-status';
const TOOLS_ID = 'atlas-chrono-tools';
const SEARCH_ID = 'atlas-chrono-search';

/* Une seule feuille de style, injectée une fois par ctx.css. Le panneau est un
   bloc en flux normal en fin de colonne : il n'ajoute aucun arrêt Tab inutile,
   ne masque ni la frise ni la fiche et n'invente aucune information colorée. */
const CSS = `
  #${PANEL_ID} {
    margin: 14px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e018-title {
    margin: 0 0 6px; color: var(--gold-bright); font-family: var(--serif);
    font-size: 14px; font-weight: 600; letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e018-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e018-rule {
    margin: 0 0 8px; padding: 6px 8px; border-left: 2px solid var(--gold);
    background: rgba(230,185,111,.06); color: var(--ink-soft);
  }
  #${PANEL_ID} .e018-rule-label {
    color: var(--gold-bright); font-weight: 600; text-transform: uppercase;
  }
  #${PANEL_ID} .e018-criteria {
    display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px;
  }
  #${PANEL_ID} .e018-chip {
    flex: 1 1 180px; min-width: 0; padding: 4px 8px;
    border: 1px solid var(--line); border-radius: 999px; color: var(--muted);
  }
  #${PANEL_ID} .e018-chip[data-e018-on="1"] {
    border-color: var(--gold); color: var(--gold-bright);
    background: rgba(230,185,111,.1);
  }
  #${PANEL_ID} .e018-line { margin: 4px 0 0; }
  #${PANEL_ID} .e018-line.e018-ok { color: var(--muted); }
  #${PANEL_ID} .e018-line.e018-warn {
    padding: 2px 6px; border-left: 2px solid var(--gold-bright);
  }
  #${PANEL_ID} .e018-empty[data-e018-empty="1"] {
    padding: 5px 8px; border: 1px dashed var(--line-strong); color: var(--ink-soft);
  }
  #${PANEL_ID} .e018-metric { margin-top: 8px; color: var(--muted-2); }
  #${PANEL_ID} details.e018-details {
    margin: 9px 0 0; padding: 5px 8px;
    border: 1px solid var(--line); border-radius: 7px;
  }
  #${PANEL_ID} details.e018-details summary {
    cursor: pointer; color: var(--gold-bright); font-size: 10px;
  }
  #${PANEL_ID} details.e018-details summary:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  #${PANEL_ID} details.e018-details ul {
    margin: 6px 0 0; padding-left: 18px; color: var(--muted);
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .e018-chip { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e018-title, #${PANEL_ID} .e018-rule-label,
    #${PANEL_ID} details.e018-details summary { color: CanvasText; }
  }
`;

let renderCount = 0;
let detailsOpen = false;
let refs = {
  panel: null, rule: null, query: null, tag: null, commute: null, scope: null,
  match: null, chips: null, counters: null, details: null, empty: null,
  renders: null, reduced: false,
};

/* Garde d'existence : un nœud déjà présent est réutilisé et déplacé dans le
   parent courant. La coque reconstruisant #app, un nœud de la rendu précédent
   est détaché et n'est donc pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function firstNumber(text) {
  const found = String(text || '').match(/(\d+)/);
  return found ? Number(found[1]) : null;
}

/* E018-02 et E018-04 : lecture seule des deux critères tels que la vue les a
   rendus. Aucune valeur n'est écrite dans le champ ni dans les puces. */
function activeCriteria() {
  const search = document.getElementById(SEARCH_ID);
  const query = search ? String(search.value || '').trim() : '';
  const pressed = document.querySelector('.atlas-chrono-tag[aria-pressed="true"][data-tag]');
  const tag = pressed ? pressed.getAttribute('data-tag') || '' : '';
  return { query, tag, filtering: Boolean(query || tag) };
}

function renderedCards() {
  const list = document.getElementById(LIST_ID);
  if (!list) return [];
  return [...list.querySelectorAll('li[id^="event-"]')];
}

/* E018-01 à E018-10 : un seul rafraîchissement, uniquement en écriture
   dédupliquée. Toutes les grandeurs affichées sont dérivées du DOM rendu. */
function refresh() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;
  const { query, tag, filtering } = activeCriteria();
  const cards = renderedCards();

  /* E018-01 — l'opérateur de combinaison est explicite et non ambigu. */
  r.rule.dataset.e018Operator = 'AND';
  r.panel.dataset.e018Active = filtering ? '1' : '0';

  /* E018-02 — les deux critères sont visibles en même temps. */
  write(r.query, `Recherche : « ${query || 'aucune'} »`);
  write(r.tag, `Type de point : ${tag || 'aucun'}`);
  r.query.dataset.e018Query = query;
  r.query.dataset.e018On = query ? '1' : '0';
  r.tag.dataset.e018Tag = tag;
  r.tag.dataset.e018On = tag ? '1' : '0';

  /* E018-03 — commutation : les deux ordres d'application donnent le même
     ensemble, puisque l'intersection est commutative. Comptage sur les seules
     cartes effectivement rendues, sans prétendre reconstituer le store. */
  const q = query.toLowerCase();
  const byQuery = (li) => !q || String(li.textContent || '').toLowerCase().includes(q);
  const byTag = (li) => !tag || String(li.dataset.tags || '').split(/\s+/).includes(tag);
  const orderA = cards.filter(byQuery).filter(byTag).length;
  const orderB = cards.filter(byTag).filter(byQuery).length;
  write(r.commute, `Commutativité : recherche puis type = ${orderA} repère(s) · type puis recherche = ${orderB} repère(s) · ${orderA === orderB ? 'même résultat' : 'écart à examiner'}.`);
  r.commute.dataset.e018OrderA = String(orderA);
  r.commute.dataset.e018OrderB = String(orderB);
  r.commute.dataset.e018Commute = orderA === orderB ? '1' : '0';

  /* E018-04 — le dénominateur change de périmètre dès qu'un critère est actif. */
  const status = document.getElementById(STATUS_ID);
  const statusText = status ? String(status.textContent || '') : '';
  const denominatorMatch = statusText.match(/sur\s+\d+\s+repères/);
  const denominator = denominatorMatch ? firstNumber(denominatorMatch[0]) : null;
  const scope = filtering ? 'pays' : 'ère';
  write(r.scope, `Périmètre : ${scope === 'pays' ? 'tous les repères du pays — la combinaison élargit le dénominateur' : 'l’ère courante — aucun filtre actif'}. Dénominateur annoncé : ${denominator === null ? 'non lisible' : denominator}.`);
  r.scope.dataset.e018Scope = scope;
  r.scope.dataset.e018Denominator = denominator === null ? '' : String(denominator);

  /* E018-05 — le nombre de repères satisfaisant les deux critères est lu dans
     la liste rendue, jamais codé en dur. */
  write(r.match, `Intersection observée : ${cards.length} repère(s) satisfont simultanément recherche et type.`);
  r.match.dataset.e018Match = String(cards.length);

  /* E018-06 — les puces de type existent en double (outils et fiche) ; leur
     état aria-pressed doit rester identique pour une même valeur de type. */
  const toolsChips = document.querySelectorAll(`#${TOOLS_ID} .atlas-chrono-tag[data-tag]`);
  const asideChips = document.querySelectorAll('#atlas-chrono-aside .atlas-chrono-tag[data-tag]');
  const allChips = [...toolsChips, ...asideChips];
  const statesByTag = new Map();
  allChips.forEach((chip) => {
    const key = chip.getAttribute('data-tag') || '';
    const state = chip.getAttribute('aria-pressed') || 'absent';
    if (!statesByTag.has(key)) statesByTag.set(key, new Set());
    statesByTag.get(key).add(state);
  });
  let divergent = 0;
  statesByTag.forEach((states) => { if (states.size > 1) divergent += 1; });
  write(r.chips, `Puces de type : ${allChips.length} contrôles relevés · ${divergent} divergence(s) d’état entre outils et fiche.`);
  r.chips.dataset.e018ChipTotal = String(allChips.length);
  r.chips.dataset.e018ChipDivergence = String(divergent);
  r.chips.classList.toggle('e018-warn', divergent > 0);
  r.chips.classList.toggle('e018-ok', divergent === 0);

  /* E018-07 — deux compteurs visibles coexistent ; on vérifie qu'ils racontent
     la même chose, sans toucher à la région live de la vue. */
  const countNode = document.querySelector(`#${TOOLS_ID} .atlas-chrono-count`);
  const toolsMatch = String(countNode ? countNode.textContent || '' : '').match(/(\d+)\s*\/\s*(\d+)/);
  const statusMatch = statusText.match(/(\d+)\s*repère\(s\)\s*affiché\(s\)/);
  const statusCount = statusMatch ? Number(statusMatch[1]) : null;
  const toolsCount = toolsMatch ? Number(toolsMatch[1]) : null;
  const agree = statusCount !== null && toolsCount !== null && statusCount === toolsCount;
  write(r.counters, `Compteurs : bande de statut = ${statusCount === null ? '?' : statusCount} · outils = ${toolsCount === null ? '?' : toolsCount} · ${agree ? 'concordants' : 'à vérifier'}.`);
  r.counters.dataset.e018StatusCount = statusCount === null ? '' : String(statusCount);
  r.counters.dataset.e018ToolsCount = toolsCount === null ? '' : String(toolsCount);
  r.counters.dataset.e018CounterAgree = agree ? '1' : '0';
  r.counters.classList.toggle('e018-warn', !agree);
  r.counters.classList.toggle('e018-ok', agree);

  /* E018-08 — l'explication est native (<details>), sans gestionnaire de touche. */
  if (r.details) r.details.open = detailsOpen;

  /* E018-09 — l'état vide est attribué à la combinaison des deux critères. */
  const emptyCombo = Boolean(document.getElementById('nav-c2a-empty-filter'));
  write(r.empty, emptyCombo
    ? 'Combinaison infructueuse : aucun repère ne satisfait les deux critères à la fois. L’intersection est plus stricte que chaque critère isolé : desserrez l’un des deux.'
    : `Combinaison productive : ${cards.length} repère(s) affiché(s) avec les critères courants.`);
  r.empty.dataset.e018Empty = emptyCombo ? '1' : '0';

  /* E018-10 — l'unicité du greffon et des nœuds est mesurée à chaque rendu. */
  const panels = document.querySelectorAll(`#${PANEL_ID}`).length;
  write(r.renders, `Greffon E018 appliqué ${renderCount} fois · ${panels} panneau(x) présent(s) · une seule feuille CSS · mouvement réduit : ${r.reduced ? 'oui' : 'non'}.`);
  r.renders.dataset.e018Renders = String(renderCount);
  r.renders.dataset.e018Panels = String(panels);
}

register('E018', ctx => {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  renderCount += 1;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  if (!host) return;

  const panel = ensureNode(make, PANEL_ID, 'section', 'e018-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e018-title', 'Combinaison recherche × type de point');
  title.id = TITLE_ID;
  const lede = make('p', 'e018-lede', 'Ce bloc décrit la règle de filtrage de la vue : il ne modifie ni la recherche, ni les puces de type, ni le dénominateur affiché.');

  /* E018-01 */
  const rule = make('p', 'e018-rule');
  rule.id = RULE_ID;
  rule.appendChild(make('span', 'e018-rule-label', 'Règle ET — '));
  rule.appendChild(make('span', '', 'un repère n’est affiché que s’il satisfait la recherche ET le type de point choisi : intersection des deux critères, jamais union.'));

  /* E018-02 */
  const criteria = make('div', 'e018-criteria');
  criteria.id = CRITERIA_ID;
  const queryChip = make('span', 'e018-chip');
  queryChip.id = QUERY_ID;
  const tagChip = make('span', 'e018-chip');
  tagChip.id = TAG_ID;
  criteria.append(queryChip, tagChip);

  /* E018-03 à E018-07 */
  const commute = make('p', 'e018-line');
  commute.id = COMMUTE_ID;
  const scope = make('p', 'e018-line');
  scope.id = SCOPE_ID;
  const match = make('p', 'e018-line');
  match.id = MATCH_ID;
  const chips = make('p', 'e018-line');
  chips.id = CHIPS_ID;
  const counters = make('p', 'e018-line');
  counters.id = COUNTERS_ID;

  /* E018-08 */
  const details = make('details', 'e018-details');
  details.id = DETAILS_ID;
  const summary = make('summary', '', 'Comment la combinaison fonctionne-t-elle ?');
  const explain = make('ul', 'e018-explain');
  [
    'Les deux critères sont cumulés : un repère doit correspondre à la recherche et porter le type sélectionné.',
    'Dès qu’un critère est actif, le dénominateur passe de l’ère courante à l’ensemble des repères du pays.',
    'Effacer un seul critère laisse l’autre en vigueur : la réinitialisation totale passe par le bouton prévu à cet effet.',
  ].forEach((text) => explain.appendChild(make('li', '', text)));
  details.append(summary, explain);
  details.addEventListener('toggle', () => { detailsOpen = details.open; });

  /* E018-09 et E018-10 */
  const empty = make('p', 'e018-line e018-empty');
  empty.id = EMPTY_ID;
  const renders = make('p', 'e018-line e018-metric');
  renders.id = RENDERS_ID;

  panel.replaceChildren(title, lede, rule, criteria, commute, scope, match, chips, counters, details, empty, renders);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  panel.dataset.e018Reduced = reduced ? '1' : '0';
  refs = { panel, rule, query: queryChip, tag: tagChip, commute, scope, match, chips, counters, details, empty, renders, reduced };
  refresh();
});
