import { register } from './registry.js';

/* Lentille V2 E014 — badge de récapitulatif du périmètre actif
 * (domaine B : filtres & périmètre de la vue Chronologie).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E014.md — chantiers E014-01 à E014-10.
 * Fichier possédé : src/views/chronology/v2/E014.js uniquement. Lectures seules :
 * src/views/chronology/E049.js et UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md (modèles
 * de qualité de la passe 1), UNIFIED_AUDIT/CHRONOLOGIE/V2/themes.json (clé E014,
 * ligne 16), src/views/chronology/v2/registry.js (contrat ctx). Aucun fichier
 * partagé n'est modifié.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Le registre
 * V2 ne fournit pas say() : la lentille n'ajoute AUCUNE région live et n'écrit
 * dans aucune région existante — elle se contente d'un état visible, dédupliqué.
 *
 * Invariants :
 * - un seul register('E014', …), un seul ctx.css('chronology-v2-e014', …) ;
 * - tous les IDs DOM sont préfixés chronology-v2-e014- et passent par ensureNode ;
 * - zéro timer, zéro rAF, zéro aléa, zéro réseau, zéro journalisation, zéro HTML brut ;
 * - aucun écouteur : le périmètre est relu à chaque rendu, car chaque changement
 *   de filtre reconstruit le DOM et rejoue les greffons (E049.md:31-33).
 */

const CSS_ID = 'chronology-v2-e014';
const BADGE_ID = 'chronology-v2-e014-badge';
const TITLE_ID = 'chronology-v2-e014-title';
const SUMMARY_ID = 'chronology-v2-e014-summary';
const CHIPS_ID = 'chronology-v2-e014-chips';
const COUNT_ID = 'chronology-v2-e014-count';
const META_ID = 'chronology-v2-e014-meta';
const METRIC_ID = 'chronology-v2-e014-metric';
const TOOLS_ID = 'atlas-chrono-tools';
const SEARCH_ID = 'atlas-chrono-search';
const MAIN_ID = 'atlas-chrono-main';

/* E014-02, E014-07, E014-08, E014-09 : une seule feuille, injectée une fois.
   Le badge est un bloc en flux normal dans la barre d'outils (jamais une modale,
   jamais superposé, jamais tabulable) : il n'ajoute aucun arrêt Tab et ne masque
   ni la frise ni la fiche. L'ellipse est purement visuelle ; le texte intégral
   reste dans title, donc lisible sans CSS. */
const CSS = `
  #${BADGE_ID} {
    flex: 1 1 100%; margin: 4px 0 0; padding: 8px 10px 9px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 8px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.45;
    overflow-wrap: anywhere;
  }
  #${BADGE_ID} .e014-title {
    margin: 0 0 4px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 12px; font-weight: 600;
  }
  #${BADGE_ID} .e014-summary {
    margin: 0 0 5px; max-width: 100%; overflow: hidden;
    white-space: nowrap; text-overflow: ellipsis;
  }
  #${BADGE_ID} .e014-chips { margin: 0 0 5px; padding: 0; list-style: none; }
  #${BADGE_ID} .e014-chip {
    display: inline-block; margin: 0 4px 3px 0; padding: 1px 6px;
    border: 1px solid var(--line-strong); border-radius: 10px;
    color: var(--ink-soft); font-size: 9px;
  }
  #${BADGE_ID} .e014-chip-kind { color: var(--muted); }
  #${BADGE_ID} .e014-count { margin: 0 0 3px; color: var(--muted); }
  #${BADGE_ID} .e014-meta,
  #${BADGE_ID} .e014-metric { margin: 2px 0 0; color: var(--muted-2); font-size: 9px; }
  #${BADGE_ID}[data-e014-state="neutre"] { border-left-style: dashed; }
  #${BADGE_ID}[data-e014-state="actif"] { border-left-style: solid; }
  @media (max-width: 620px) {
    #${BADGE_ID} { padding: 7px 9px 8px; }
    #${BADGE_ID} .e014-summary { white-space: normal; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${BADGE_ID}, #${BADGE_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${BADGE_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${BADGE_ID} .e014-title,
    #${BADGE_ID} .e014-chip,
    #${BADGE_ID} .e014-count { color: CanvasText; }
    #${BADGE_ID}[data-e014-state="neutre"] { border-left-style: dashed; }
  }
`;

let installCount = 0;
let refs = { make: null, badge: null, summary: null, chips: null, count: null, meta: null, metric: null, reduced: false };

/* E014-10 : garde d'existence pour toute ID préfixée chronology-v2-e014-. Un
   nœud déjà présent est réutilisé et déplacé dans le parent courant : la coque
   reconstruisant #app, un nœud du rendu précédent est détaché et n'est donc
   pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écriture dédupliquée : deux rafraîchissements sans changement ne modifient
   aucun textContent (E049.js:125-127). */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E014-01, E014-03, E014-04, E014-05, E014-06 : lecture du périmètre courant
   directement dans le DOM, sans donnée codée en dur. La recherche est lue dans
   #atlas-chrono-search ; les types actifs sont les puces à état explicite
   button[aria-pressed="true"] de #atlas-chrono-tools. */
function readPerimeter() {
  const search = document.getElementById(SEARCH_ID);
  const tools = document.getElementById(TOOLS_ID);
  const queryNode = search || (tools ? tools.querySelector('input[type="search"]') : null);
  const query = queryNode && typeof queryNode.value === 'string' ? queryNode.value.trim() : '';
  const types = [];
  const seen = new Set();
  if (tools) {
    const chips = tools.querySelectorAll('button[aria-pressed="true"]');
    chips.forEach((chip) => {
      const label = (chip.getAttribute('aria-label') || chip.textContent || '').trim();
      if (label && !seen.has(label)) {
        seen.add(label);
        types.push(label);
      }
    });
  }
  return { query, types, criteria: (query ? 1 : 0) + types.length };
}

/* E014-02 : phrase de synthèse, toujours en texte visible. */
function summarize(perimeter) {
  const { query, types, criteria } = perimeter;
  if (criteria === 0) return 'Périmètre complet : aucun filtre actif, tous les repères sont affichés.';
  const parts = [];
  if (query) parts.push(`recherche « ${query} »`);
  if (types.length) parts.push(`types de points : ${types.join(', ')}`);
  return `Périmètre filtré — ${parts.join(' · ')}.`;
}

/* E014-04 : une puce sémantique <li> par critère, jamais une information portée
   par la seule couleur. Le libellé du genre précède toujours la valeur. */
function makeChip(make, kind, value) {
  const row = make('li', 'e014-chip');
  row.append(make('span', 'e014-chip-kind', `${kind} : `), make('span', 'e014-chip-value', value));
  return row;
}

/* E014-02 à E014-09 : un seul rafraîchissement, relu à chaque rendu. Aucune
   écriture dans une région live, aucun écouteur, aucun timer. */
function refresh() {
  const { make, badge, summary, chips, count, meta, metric, reduced } = refs;
  if (!badge || !badge.isConnected) return;

  const perimeter = readPerimeter();
  const text = summarize(perimeter);
  const state = perimeter.criteria === 0 ? 'neutre' : 'actif';
  const typeKey = perimeter.types.join('|');

  if (badge.dataset.e014State !== state) badge.dataset.e014State = state;
  if (badge.dataset.e014Query !== perimeter.query) badge.dataset.e014Query = perimeter.query;
  if (badge.dataset.e014Types !== typeKey) badge.dataset.e014Types = typeKey;
  if (badge.dataset.e014Criteria !== String(perimeter.criteria)) {
    badge.dataset.e014Criteria = String(perimeter.criteria);
  }

  write(summary, text);
  if (summary && summary.title !== text) summary.title = text;

  const signature = `${state}::${perimeter.query}::${typeKey}`;
  if (chips && chips.dataset.e014Signature !== signature) {
    const rows = [];
    if (perimeter.query) rows.push(makeChip(make, 'Recherche', perimeter.query));
    perimeter.types.forEach((type) => rows.push(makeChip(make, 'Type', type)));
    if (rows.length === 0) rows.push(makeChip(make, 'Périmètre', 'aucun filtre'));
    chips.replaceChildren(...rows);
    chips.dataset.e014Signature = signature;
  }

  write(count, `Critères actifs : ${perimeter.criteria} (recherche : ${perimeter.query ? 1 : 0} · types : ${perimeter.types.length}).`);
  write(meta, `État : ${state} · requête : ${perimeter.query || '∅'} · types : ${typeKey || '∅'}.`);
  write(metric, `Installations : ${installCount} · mouvement réduit : ${reduced ? 'oui' : 'non'} · critères : ${perimeter.criteria}.`);
}

function install(ctx) {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(TOOLS_ID) || document.getElementById(MAIN_ID) || ctx.layout;
  const badge = ensureNode(make, BADGE_ID, 'section', 'e014-badge', host);
  badge.setAttribute('role', 'region');
  badge.setAttribute('aria-labelledby', TITLE_ID);

  const title = ensureNode(make, TITLE_ID, 'h2', 'e014-title', badge);
  title.textContent = 'Récapitulatif du périmètre';
  const summary = ensureNode(make, SUMMARY_ID, 'p', 'e014-summary', badge);
  const chips = ensureNode(make, CHIPS_ID, 'ul', 'e014-chips', badge);
  const count = ensureNode(make, COUNT_ID, 'p', 'e014-count', badge);
  const meta = ensureNode(make, META_ID, 'p', 'e014-meta', badge);
  const metric = ensureNode(make, METRIC_ID, 'p', 'e014-metric', badge);

  badge.replaceChildren(title, summary, chips, count, meta, metric);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { make, badge, summary, chips, count, meta, metric, reduced };
  refresh();
}

register('E014', (ctx) => {
  install(ctx);
});
