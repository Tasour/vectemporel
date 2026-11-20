import { register } from './registry.js';

/* Lentille E092 — passe V2, domaine J (Pédagogie & narration).
 * Thème : expliquer « repère / point » dans la vue Chronologie.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E092.md — chantiers E092-01 à E092-10.
 * Fichier possédé : src/views/chronology/v2/E092.js uniquement. Aucun fichier
 * partagé (registry.js, index.js, styles.css, chronology.js) n'est modifié.
 *
 * Contrat exploité : ctx.viewId === 'chronologyv2', ctx.stage, ctx.layout,
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Une seule feuille CSS ('chronology-v2-e092'), un seul register, des IDs
 * préfixés 'chronology-v2-e092-' et gardés contre les rendus multiples.
 *
 * Invariants : zéro réseau, zéro Math.random, zéro timer, zéro console.*,
 * zéro innerHTML (replaceChildren / textContent), zéro animation propre,
 * zéro vol de focus, zéro annonce live. Tout le savoir est du texte visible.
 */

const CSS_ID = 'chronology-v2-e092';
const PANEL_ID = 'chronology-v2-e092-panel';
const TITLE_ID = 'chronology-v2-e092-title';
const DEFS_ID = 'chronology-v2-e092-defs';
const HIERARCHY_ID = 'chronology-v2-e092-hierarchy';
const ANALOGY_ID = 'chronology-v2-e092-analogy';
const HOWTO_ID = 'chronology-v2-e092-howto';
const EXAMPLE_ID = 'chronology-v2-e092-example';
const METRIC_ID = 'chronology-v2-e092-metric';
const PITFALL_ID = 'chronology-v2-e092-pitfall';
const LINK_ID = 'chronology-v2-e092-detail-link';
const ACCESS_ID = 'chronology-v2-e092-access';

/* E092-01 à E092-10 : une unique feuille, injectée une fois par ctx.css.
   Le panneau est un bloc en flux normal ajouté à ctx.layout : il n'est ni une
   modale, ni une superposition, ni un piège de focus. Les formes (clou,
   pastille, bande) doublent toujours le texte : jamais la couleur seule. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 12px 14px 14px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e092-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 15px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e092-lede { margin: 0 0 10px; color: var(--muted); }
  #${PANEL_ID} .e092-sub {
    margin: 10px 0 4px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 12px; font-weight: 600;
  }
  #${PANEL_ID} .e092-note { margin: 4px 0 0; color: var(--muted); }

  /* E092-01 — définitions : liste de définitions sémantique <dl>. */
  #${DEFS_ID} { margin: 6px 0 0; }
  #${DEFS_ID} div { margin: 0 0 6px; }
  #${DEFS_ID} dt { color: var(--gold-bright); font-weight: 600; }
  #${DEFS_ID} dd { margin: 1px 0 0; color: var(--ink-soft); }

  /* E092-02 — hiérarchie Ère → Repère → Point avec puces numérotées. */
  #${HIERARCHY_ID} {
    display: flex; flex-wrap: wrap; gap: 6px;
    margin: 6px 0 0; padding: 0; list-style: none;
  }
  #${HIERARCHY_ID} li {
    display: flex; align-items: center; gap: 5px;
    padding: 3px 7px; border: 1px solid var(--line-strong); border-radius: 6px;
    color: var(--ink-soft);
  }
  #${HIERARCHY_ID} li + li::before {
    content: '→'; margin-right: 4px; color: var(--gold-bright);
  }
  #${HIERARCHY_ID} .e092-step {
    display: inline-block; min-width: 14px; padding: 0 3px;
    border-radius: 3px; background: rgba(255,255,255,.06);
    color: var(--gold-bright); text-align: center;
  }

  /* E092-03 — analogie : formes distinctes, jamais la couleur seule. */
  #${ANALOGY_ID} { margin: 6px 0 0; }
  #${ANALOGY_ID} .e092-shape {
    display: inline-block; vertical-align: -2px;
    width: 11px; height: 11px; margin-right: 3px;
    border: 1px solid var(--gold-bright);
  }
  #${ANALOGY_ID} .e092-repere-shape { border-radius: 50% 50% 0 0; height: 14px; }
  #${ANALOGY_ID} .e092-point-shape { border-radius: 999px; }

  /* E092-04 — mode d'emploi de lecture, liste ordonnée. */
  #${HOWTO_ID} { margin: 6px 0 0; padding-left: 20px; }
  #${HOWTO_ID} li { margin: 0 0 3px; }

  /* E092-05 — micro-exemple : un repère, plusieurs points (un-à-plusieurs). */
  #${EXAMPLE_ID} {
    margin: 6px 0 0; padding: 8px 10px;
    border: 1px dashed var(--line-strong); border-radius: 8px;
  }
  #${EXAMPLE_ID} .e092-example-repere { color: var(--gold-bright); font-weight: 600; }
  #${EXAMPLE_ID} ul {
    margin: 5px 0 0; padding-left: 18px;
    border-left: 2px solid var(--line-strong); list-style: circle;
  }
  #${EXAMPLE_ID} li { margin: 0 0 2px; }

  /* E092-06 — mesure dérivée du DOM, chiffres non codés en dur. */
  #${METRIC_ID} {
    margin: 8px 0 0; padding: 5px 8px;
    border-left: 2px solid var(--gold-bright); background: rgba(255,255,255,.03);
    color: var(--muted);
  }

  /* E092-07 — piège repère/point : encadré à forme distincte. */
  #${PITFALL_ID} {
    margin: 8px 0 0; padding: 6px 9px;
    border: 1px solid var(--line-strong); border-left: 4px double var(--gold-bright);
    border-radius: 6px; color: var(--ink-soft);
  }
  #${PITFALL_ID}::before { content: 'Attention — '; color: var(--gold-bright); }

  /* E092-08 — renvoi vers la fiche : connecteur fléché CSS. */
  #${LINK_ID} { margin: 8px 0 0; color: var(--muted); }
  #${LINK_ID}::before { content: '↳ '; color: var(--gold-bright); }

  /* E092-09 — accessibilité : le texte porte le sens, l'état est affiché. */
  #${ACCESS_ID} { margin: 8px 0 0; color: var(--muted-2); font-size: 10px; }

  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 10px 11px 12px; }
    #${HIERARCHY_ID} li { flex: 1 1 100%; }
    #${HIERARCHY_ID} li + li::before { content: '↓'; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e092-title, #${DEFS_ID} dt,
    #${HIERARCHY_ID} .e092-step,
    #${EXAMPLE_ID} .e092-example-repere { color: CanvasText; }
  }
`;

let mountCount = 0;

/* E092-10 : garde d'existence pour toute ID préfixée. Un nœud déjà présent
   est réutilisé et déplacé dans le parent courant : la coque reconstruisant
   le layout, un nœud de la rendu précédente est détaché et n'est donc pas
   retrouvé par getElementById. Aucun clonage, aucun doublon. */
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

/* E092-06 : collecte d'ensemble pour éviter les doubles comptages lorsqu'un
   nœud correspond à plusieurs sélecteurs. Lecture seule du DOM rendu. */
function collect(selectors) {
  const found = new Set();
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => found.add(node));
  });
  return found;
}

/* E092-02 et E092-04 : la hiérarchie et le mode d'emploi sont des données
   pédagogiques stables, exprimées en français, jamais devinées à l'exécution. */
const HIERARCHY = [
  ['Ère', 'la bande qui porte l’amplitude et les bornes'],
  ['Repère', 'le jalon daté accroché à la bande'],
  ['Point', 'l’information précise rattachée au repère'],
];

const HOWTO = [
  'Repérer d’abord la bande d’ère et ses bornes.',
  'Lire le titre du repère et son ancre temporelle.',
  'Ouvrir la fiche pour consulter les points.',
  'Vérifier la confiance et la source de chaque point.',
];

register('E092', (ctx) => {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  mountCount += 1;
  ctx.css(CSS_ID, CSS);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e092-panel', ctx.layout);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.dataset.e092Mounts = String(mountCount);
  panel.dataset.e092Reduced = reduced ? '1' : '0';

  /* E092-01 — deux définitions côte à côte dans une <dl> sémantique. */
  let defs = document.getElementById(DEFS_ID);
  if (!defs) {
    defs = make('dl', 'e092-defs');
    defs.id = DEFS_ID;
    [
      ['Repère', 'un jalon daté sur la frise : il répond à « quand ? » et porte un titre.'],
      ['Point', 'une information rattachée à ce jalon : elle répond à « quoi, d’où, avec quelle confiance ? ».'],
    ].forEach(([term, definition]) => {
      const row = make('div', 'e092-def-row');
      row.append(make('dt', 'e092-term', term), make('dd', 'e092-def', definition));
      defs.appendChild(row);
    });
  }

  /* E092-02 — fil Ère → Repère → Point, avec numéros et formes. */
  let hierarchy = document.getElementById(HIERARCHY_ID);
  if (!hierarchy) {
    hierarchy = make('ol', 'e092-hierarchy');
    hierarchy.id = HIERARCHY_ID;
    HIERARCHY.forEach(([name, detail], index) => {
      const item = make('li', 'e092-level');
      item.append(
        make('span', 'e092-step', String(index + 1)),
        make('span', 'e092-level-name', name),
        make('span', 'e092-level-detail', `— ${detail}`)
      );
      hierarchy.appendChild(item);
    });
  }

  /* E092-03 — analogie visuelle : clou (repère) et pastille (point). */
  let analogy = document.getElementById(ANALOGY_ID);
  if (!analogy) {
    analogy = make('p', 'e092-analogy');
    analogy.id = ANALOGY_ID;
    const clou = make('span', 'e092-shape e092-repere-shape');
    const pastille = make('span', 'e092-shape e092-point-shape');
    analogy.append(
      clou,
      make('span', '', ' Le repère est le clou planté dans la frise ; '),
      pastille,
      make('span', '', ' le point est la pastille d’information accrochée à ce clou. Un clou peut porter plusieurs pastilles.')
    );
  }

  /* E092-04 — mode d'emploi de lecture en quatre temps. */
  let howto = document.getElementById(HOWTO_ID);
  if (!howto) {
    howto = make('ol', 'e092-howto');
    howto.id = HOWTO_ID;
    HOWTO.forEach((step) => howto.appendChild(make('li', 'e092-howto-step', step)));
  }

  /* E092-05 — micro-exemple : un repère et deux points, relation un-à-plusieurs. */
  let example = document.getElementById(EXAMPLE_ID);
  if (!example) {
    example = make('div', 'e092-example');
    example.id = EXAMPLE_ID;
    const repere = make('p', 'e092-example-repere', 'Repère fictif : « Fondation de l’atlas » — ancre 2020.');
    const points = make('ul', 'e092-example-points');
    points.append(
      make('li', '', 'Point 1 — la date de fondation, avec sa source.'),
      make('li', '', 'Point 2 — le domaine concerné, avec son niveau de confiance.')
    );
    example.append(repere, points);
  }

  /* E092-06 — chiffres lus dans le DOM, jamais codés en dur. */
  const reperes = collect(['.event-card', '[data-event]', '[data-repere]', '[data-marker]']).size;
  const points = collect(['[data-point]', '[data-confidence]', '.point-item', '.e092-example-points li']).size;
  const eres = collect(['.era-band', '[data-era]']).size;
  let metric = document.getElementById(METRIC_ID);
  if (!metric) {
    metric = make('p', 'e092-metric');
    metric.id = METRIC_ID;
  }
  write(
    metric,
    `Lecture du DOM : ${eres} ère(s), ${reperes} repère(s), ${points} point(s) recensés. Ces nombres sont mesurés dans la vue, pas écrits à l’avance.`
  );
  panel.dataset.e092Eres = String(eres);
  panel.dataset.e092RepereCount = String(reperes);
  panel.dataset.e092PointCount = String(points);

  /* E092-07 — piège conceptuel, encadré à bordure double. */
  let pitfall = document.getElementById(PITFALL_ID);
  if (!pitfall) {
    pitfall = make('p', 'e092-pitfall');
    pitfall.id = PITFALL_ID;
  }
  write(
    pitfall,
    'ne confondez pas le repère et le point : le repère est le jalon daté, le point est une affirmation qui s’y rattache. Un repère sans point reste une date ; un point sans repère perd son ancre.'
  );

  /* E092-08 — renvoi textuel vers la fiche, sans ancre fragile ni vol de focus. */
  let link = document.getElementById(LINK_ID);
  if (!link) {
    link = make('p', 'e092-detail-link');
    link.id = LINK_ID;
  }
  write(
    link,
    'Le point se consulte dans la fiche du repère : c’est là que la confiance, la source et le texte du point sont donnés. Revenez à la frise pour changer de repère.'
  );

  /* E092-09 — accessibilité : le sens est dans le texte, l’état est affiché. */
  let access = document.getElementById(ACCESS_ID);
  if (!access) {
    access = make('p', 'e092-access');
    access.id = ACCESS_ID;
  }
  write(
    access,
    `Définitions et formes sont redondées en texte : aucune information ne repose sur la couleur seule. Mouvement réduit : ${reduced ? 'oui' : 'non'} · installations : ${mountCount}.`
  );

  const title = make('h2', 'e092-title', 'Comprendre la frise : repère et point');
  title.id = TITLE_ID;
  const lede = make(
    'p',
    'e092-lede',
    'La Chronologie se lit en trois niveaux : l’ère pose le cadre, le repère pose la date, le point apporte l’information. Ce panneau explique le vocabulaire sans modifier la vue.'
  );
  const subDefs = make('p', 'e092-sub', '1. Le vocabulaire');
  const subHierarchy = make('p', 'e092-sub', '2. De l’ère au point');
  const subHowto = make('p', 'e092-sub', '3. Comment lire un repère');
  const subExample = make('p', 'e092-sub', '4. Un exemple commenté');

  panel.replaceChildren(
    title,
    lede,
    subDefs, defs,
    subHierarchy, hierarchy, analogy,
    subHowto, howto,
    subExample, example,
    metric,
    pitfall,
    link,
    access
  );
});
