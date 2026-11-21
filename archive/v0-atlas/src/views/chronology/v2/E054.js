import { register } from './registry.js';

/* Lentille V2 E054 — F. Sémantique & données : familles de points en légende.
 *
 * Thème lu dans UNIFIED_AUDIT/CHRONOLOGIE/V2/themes.json (clé E054). Cette
 * lentille fournit la LÉGENDE QUI DONNE LEUR SENS aux familles de points :
 * elle traduit le marqueur technique data-kind en vocabulaire normatif lisible
 * et en expose l'origine. Périmètre strictement disjoint de E051 (qui ne fait
 * que dériver des effectifs et des couvertures) et de E024 (qui annotent les
 * puces sémantiques de la fiche) : E054 ne compte aucun point, ne filtre rien,
 * ne modifie aucun badge existant et n'écrit dans aucune région live.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E054.md — chantiers
 * E054-01 à E054-10. Fichier possédé : src/views/chronology/v2/E054.js
 * uniquement. Aucun fichier partagé n'est modifié : ni la passe 1, ni
 * registry.js, index.js, styles.css, src/views/chronology.js, ni une autre
 * lentille.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } enrichi
 * par le registre V2 de css, el et reducedMotion (registry.js:28-37).
 * Invariants : exactement un register('E054', ctx => { … }), exactement un
 * ctx.css('chronology-v2-e054', …), tous les IDs préfixés
 * chronology-v2-e054- et gardés par une garde d'existence (idempotence),
 * zéro console.*, zéro fetch/XHR/import distant, zéro Math.random,
 * zéro innerHTML, zéro timer, zéro animation, zéro réseau.
 */

const CSS_ID = 'chronology-v2-e054';
const PANEL_ID = 'chronology-v2-e054-legend';
const TITLE_ID = 'chronology-v2-e054-title';
const LIST_ID = 'chronology-v2-e054-definitions';
const HORS_ID = 'chronology-v2-e054-hors';
const METRIC_ID = 'chronology-v2-e054-metric';
const MAIN_ID = 'atlas-chrono-main';
const EVENTS_ID = 'atlas-chrono-events';
const POINT_SELECTOR = '#atlas-chrono-aside li[data-point-id]';

/* E054-02 et E054-05 : vocabulaire normatif des quatre familles présentes
   dans src/data/dataset.js, dans l'ordre canonique récit → figure → lieu →
   audit (jamais trié par fréquence, jamais aléatoire). L'origine de chaque
   famille est la définition publiée en README.md:67 ; aucune histoire ni
   valeur n'est inventée. Un kind inattendu n'est pas ajouté à ce vocabulaire. */
const SOURCE_REF = 'README.md:67';
const ORDER_LABEL = 'récit → figure → lieu → audit';
const FAMILIES = [
  { kind: 'récit', label: 'Récit', glyph: '—', origin: 'phrases des résumés vérifiés' },
  { kind: 'figure', label: 'Figure', glyph: '◆', origin: 'figures' },
  { kind: 'lieu', label: 'Lieu', glyph: '▣', origin: 'lieux documentés' },
  { kind: 'audit', label: 'Audit', glyph: '◈', origin: 'affirmations des audits' },
];
const KNOWN = FAMILIES.map((family) => family.kind);

/* E054-01, E054-04, E054-08, E054-09 : une seule feuille, injectée une fois
   par ctx.css. La légende est un bloc en flux normal de la colonne principale,
   jamais une modale, jamais superposée, sans tabindex ni focus volé. Chaque
   famille porte un glyphe ET un mot ET un token : la couleur n'est jamais le
   seul canal. Aucune règle ne surcharge le outline :focus-visible global. */
const CSS = `
  #${PANEL_ID} {
    box-sizing: border-box;
    margin: 14px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e054-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 13px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e054-lede { margin: 0 0 9px; color: var(--muted); }
  #${PANEL_ID} .e054-defs {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 6px 12px; margin: 0 0 8px;
  }
  #${PANEL_ID} .e054-pair {
    margin: 0; padding: 6px 8px;
    border: 1px solid var(--line); border-left-width: 3px; border-radius: 6px;
  }
  #${PANEL_ID} .e054-pair[data-e054-kind="récit"] { border-left-color: var(--ink-soft); }
  #${PANEL_ID} .e054-pair[data-e054-kind="figure"] { border-left-color: var(--gold-bright); }
  #${PANEL_ID} .e054-pair[data-e054-kind="lieu"] { border-left-color: var(--blue); }
  #${PANEL_ID} .e054-pair[data-e054-kind="audit"] {
    border-left-color: var(--gold); border-left-style: dashed;
  }
  #${PANEL_ID} .e054-dt {
    display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 7px;
    margin: 0 0 3px; color: var(--ink); font-weight: 600;
  }
  #${PANEL_ID} .e054-mark { flex: 0 0 auto; color: var(--gold-bright); }
  #${PANEL_ID} .e054-token {
    padding: 0 4px; border: 1px solid var(--line-strong); border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 9px;
  }
  #${PANEL_ID} .e054-dd { margin: 0; color: var(--muted); font-size: 9px; }
  #${PANEL_ID} .e054-hors {
    margin: 0 0 8px; padding-left: 8px;
    border-left: 2px dashed var(--line-strong); color: var(--muted);
  }
  #${PANEL_ID} .e054-metric { margin: 0; color: var(--muted-2); font-size: 9px; }
  @media (max-width: 620px) {
    #${PANEL_ID} .e054-defs { grid-template-columns: 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${PANEL_ID} .e054-pair {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e054-title,
    #${PANEL_ID} .e054-dt,
    #${PANEL_ID} .e054-mark,
    #${PANEL_ID} .e054-token { color: CanvasText; }
  }
`;

let installCount = 0;

/* E054-10 : garde d'existence pour toute ID préfixée. Un nœud déjà présent
   est réutilisé et déplacé dans le parent courant ; la coque reconstruisant
   la scène, un nœud de la rendu précédente est détaché et n'est pas retrouvé
   par getElementById. Le paramètre beforeId place la légende avant la liste
   des repères, dans la colonne principale, avant toute sélection. */
function ensureNode(make, id, tagName, className, parent, beforeId) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) {
    const before = beforeId ? document.getElementById(beforeId) : null;
    if (before && before.parentElement === parent) parent.insertBefore(node, before);
    else parent.appendChild(node);
  }
  return node;
}

/* Écriture dédupliquée : deux rendus sans changement ne touchent aucun texte. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E054-06 : familles réellement présentes dans le DOM mais absentes du
   vocabulaire normatif. Lecture seule de data-kind (chronology.js:478), tri
   déterministe par localeCompare('fr'), aucun aléa, aucune invention. */
function unknownKinds() {
  const found = new Set();
  document.querySelectorAll(POINT_SELECTOR).forEach((point) => {
    const kind = (point.getAttribute('data-kind') || '').trim();
    if (kind && KNOWN.indexOf(kind) === -1) found.add(kind);
  });
  return Array.from(found).sort((a, b) => a.localeCompare(b, 'fr'));
}

/* E054-03, E054-04, E054-08 : une liste de définitions <dl>/<dt>/<dd>. Chaque
   paire porte le token machine (<code>), le libellé humain, un glyphe décoratif
   masqué aux technologies d'assistance et l'origine sourcée en texte réel.
   Aucune info n'est portée par le seul glyphe ou la seule couleur. */
function buildDefinitions(make, list) {
  list.replaceChildren(...FAMILIES.map((family) => {
    const pair = make('div', 'e054-pair');
    pair.dataset.e054Kind = family.kind;
    const dt = make('dt', 'e054-dt');
    const mark = make('span', 'e054-mark', family.glyph);
    mark.setAttribute('aria-hidden', 'true');
    dt.append(
      mark,
      make('span', 'e054-label', family.label),
      make('code', 'e054-token', family.kind)
    );
    const dd = make('dd', 'e054-dd',
      `Origine : ${family.origin}. Vocabulaire normatif selon ${SOURCE_REF}.`);
    pair.append(dt, dd);
    return pair;
  }));
}

/* E054-06 : le sort des familles hors vocabulaire est TOUJOURS écrit, y compris
   quand il n'y en a pas : un silence n'est jamais laissé sans mot. */
function buildHors(make, node, unknown) {
  node.dataset.e054HorsCount = String(unknown.length);
  node.dataset.e054HorsKinds = unknown.join('|');
  write(node, unknown.length
    ? `Hors vocabulaire : ${unknown.join(' · ')} — signalés tels quels, sans libellé inventé ni ajout à la légende.`
    : 'Hors vocabulaire : aucun. Toute famille observée appartient au vocabulaire normatif.');
}

/* E054-01 à E054-10 : montage complet du laboratoire dans la colonne
   principale, avant la liste des repères (#atlas-chrono-events). Le panneau
   est une région nommée, non live, non tabulable. */
function install(ctx, make) {
  const parent = document.getElementById(MAIN_ID) || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e054-panel', parent, EVENTS_ID);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e054-title', 'Légende des familles de points');
  title.id = TITLE_ID;
  const lede = make('p', 'e054-lede',
    'Une famille dit ce qu’est le point : récit, figure, lieu ou audit. La légende traduit le marqueur technique en vocabulaire lisible et en donne l’origine ; elle ne compte aucun point et ne filtre rien.');
  const list = make('dl', 'e054-defs');
  list.id = LIST_ID;
  const hors = make('p', 'e054-hors');
  hors.id = HORS_ID;
  const metric = make('p', 'e054-metric');
  metric.id = METRIC_ID;
  panel.replaceChildren(title, lede, list, hors, metric);

  const unknown = unknownKinds();
  buildDefinitions(make, list);
  buildHors(make, hors, unknown);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;

  /* E054-05 et E054-07 : le vocabulaire et son ordre sont exposés comme
     données auditable. Aucun effectif de point n'est publié ici : il relève
     de E051, conformément au partage de périmètre documenté dans son rapport. */
  panel.dataset.e054Vocab = FAMILIES.map((family) => family.kind).join('|');
  panel.dataset.e054Order = ORDER_LABEL;
  panel.dataset.e054Families = String(FAMILIES.length);
  panel.dataset.e054Source = SOURCE_REF;
  panel.dataset.e054Hors = String(unknown.length);
  panel.dataset.e054HorsKinds = unknown.join('|');
  panel.dataset.e054View = ctx.viewId || 'chronologyv2';
  panel.dataset.e054Installs = String(installCount);
  panel.dataset.e054Reduced = reduced ? '1' : '0';

  write(metric,
    `Vocabulaire : ${FAMILIES.length} familles (${ORDER_LABEL}) · origine : ${SOURCE_REF} · hors vocabulaire : ${unknown.length} · installations : ${installCount} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);
}

register('E054', ctx => {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;
  installCount += 1;
  ctx.css(CSS_ID, CSS);
  install(ctx, make);
});
