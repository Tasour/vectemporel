import { register } from './registry.js';

/* Lentille POINTS E092 — passe V2, domaine J (Pédagogie & narration).
 * Thème canonique : « expliquer « qu'est-ce qu'un point » dans la vue ».
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E092.md — chantiers E092-01 à E092-10.
 * Fichier possédé : ce module uniquement. Aucun fichier de la passe 1 ni aucun
 * fichier partagé (vue points.js, coque, styles.css, registry.js, index.js)
 * n'est modifié. Le panneau est un bloc en flux normal : ni modale, ni
 * superposition, ni piège de focus. Tout le savoir est du texte visible.
 *
 * Contrat exploité : ctx.viewId === 'pointsv2', ctx.stage, ctx.layout,
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Une seule feuille ('points-v2-e092'), un seul greffon, des identifiants
 * préfixés 'points-v2-e092-' et gardés contre les rendus multiples.
 *
 * Invariants : aucune requête, aucun aléa, aucun minuteur, aucune boucle
 * d'animation, aucune écriture HTML brute, aucune annonce live, aucun vol de
 * focus. Aucun chiffre historique n'est inventé : les compteurs sont lus dans
 * le DOM rendu et le seul exemple est explicitement dit fictif.
 */

const CSS_ID = 'points-v2-e092';
const PANEL_ID = 'points-v2-e092-panel';
const TITLE_ID = 'points-v2-e092-title';
const DEFS_ID = 'points-v2-e092-defs';
const HIERARCHY_ID = 'points-v2-e092-hierarchy';
const ANALOGY_ID = 'points-v2-e092-analogy';
const HOWTO_ID = 'points-v2-e092-howto';
const EXAMPLE_ID = 'points-v2-e092-example';
const METRIC_ID = 'points-v2-e092-metric';
const PITFALL_ID = 'points-v2-e092-pitfall';
const LINK_ID = 'points-v2-e092-detail-link';
const ACCESS_ID = 'points-v2-e092-access';

/* Chantiers E092-01 à E092-10. Chaque règle commence littéralement par
 * `.points-v2-e092` : aucune déclaration ne peut fuir hors de cette lentille,
 * y compris à l'intérieur des blocs @media. Les formes dessinées doublent
 * toujours le texte : jamais la couleur seule. */
const CSS = `
  .points-v2-e092-panel {
    margin: 18px 0 0; padding: 12px 14px 14px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  .points-v2-e092-panel .points-v2-e092-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 15px; font-weight: 600;
  }
  .points-v2-e092-panel .points-v2-e092-lede { margin: 0 0 10px; color: var(--muted); }
  .points-v2-e092-panel .points-v2-e092-sub {
    margin: 10px 0 4px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 12px; font-weight: 600;
  }
  .points-v2-e092-panel .points-v2-e092-note { margin: 4px 0 0; color: var(--muted); }

  /* E092-01 — deux définitions dans une liste de définitions sémantique. */
  .points-v2-e092-panel .points-v2-e092-defs { margin: 6px 0 0; }
  .points-v2-e092-panel .points-v2-e092-def-row { margin: 0 0 6px; }
  .points-v2-e092-panel .points-v2-e092-term { color: var(--gold-bright); font-weight: 600; }
  .points-v2-e092-panel .points-v2-e092-def { margin: 1px 0 0; color: var(--ink-soft); }

  /* E092-02 — hiérarchie Monde → Pays → Ère → Point → Sous-point. */
  .points-v2-e092-panel .points-v2-e092-hierarchy {
    display: flex; flex-wrap: wrap; gap: 6px;
    margin: 6px 0 0; padding: 0; list-style: none;
  }
  .points-v2-e092-panel .points-v2-e092-level {
    display: flex; align-items: center; gap: 5px;
    padding: 3px 7px; border: 1px solid var(--line-strong); border-radius: 6px;
    color: var(--ink-soft);
  }
  .points-v2-e092-panel .points-v2-e092-level + .points-v2-e092-level::before {
    content: '→'; margin-right: 4px; color: var(--gold-bright);
  }
  .points-v2-e092-panel .points-v2-e092-step {
    display: inline-block; min-width: 14px; padding: 0 3px;
    border-radius: 3px; background: rgba(255,255,255,.06);
    color: var(--gold-bright); text-align: center;
  }

  /* E092-03 — analogie case / compteur, formes distinctes et texte. */
  .points-v2-e092-panel .points-v2-e092-analogy { margin: 6px 0 0; }
  .points-v2-e092-panel .points-v2-e092-shape {
    display: inline-block; vertical-align: -2px;
    width: 11px; height: 11px; margin-right: 3px;
    border: 1px solid var(--gold-bright);
  }
  .points-v2-e092-panel .points-v2-e092-case-shape { border-radius: 2px; }
  .points-v2-e092-panel .points-v2-e092-count-shape { border-radius: 999px; }

  /* E092-04 — mode d'emploi de lecture, liste ordonnée native. */
  .points-v2-e092-panel .points-v2-e092-howto { margin: 6px 0 0; padding-left: 20px; }
  .points-v2-e092-panel .points-v2-e092-howto li { margin: 0 0 3px; }

  /* E092-05 — micro-exemple : une ère porte plusieurs points. */
  .points-v2-e092-panel .points-v2-e092-example {
    margin: 6px 0 0; padding: 8px 10px;
    border: 1px dashed var(--line-strong); border-radius: 8px;
  }
  .points-v2-e092-panel .points-v2-e092-example-case {
    color: var(--gold-bright); font-weight: 600;
  }
  .points-v2-e092-panel .points-v2-e092-example ul {
    margin: 5px 0 0; padding-left: 18px;
    border-left: 2px solid var(--line-strong); list-style: circle;
  }
  .points-v2-e092-panel .points-v2-e092-example li { margin: 0 0 2px; }

  /* E092-06 — mesure dérivée du DOM, aucun chiffre codé en dur. */
  .points-v2-e092-panel .points-v2-e092-metric {
    margin: 8px 0 0; padding: 5px 8px;
    border-left: 2px solid var(--gold-bright); background: rgba(255,255,255,.03);
    color: var(--muted);
  }

  /* E092-07 — piège « une date n'est pas un point », forme distincte. */
  .points-v2-e092-panel .points-v2-e092-pitfall {
    margin: 8px 0 0; padding: 6px 9px;
    border: 1px solid var(--line-strong); border-left: 4px double var(--gold-bright);
    border-radius: 6px; color: var(--ink-soft);
  }
  .points-v2-e092-panel .points-v2-e092-pitfall::before {
    content: 'Attention — '; color: var(--gold-bright);
  }

  /* E092-08 — renvoi textuel vers la fiche, connecteur fléché décoratif. */
  .points-v2-e092-panel .points-v2-e092-detail-link { margin: 8px 0 0; color: var(--muted); }
  .points-v2-e092-panel .points-v2-e092-detail-link::before {
    content: '↳ '; color: var(--gold-bright);
  }

  /* E092-09 — le texte porte le sens, l'état de mouvement est affiché. */
  .points-v2-e092-panel .points-v2-e092-access { margin: 8px 0 0; color: var(--muted-2); font-size: 10px; }

  @media (max-width: 620px) {
    .points-v2-e092-panel { padding: 10px 11px 12px; }
    .points-v2-e092-panel .points-v2-e092-level { flex: 1 1 100%; }
    .points-v2-e092-panel .points-v2-e092-level + .points-v2-e092-level::before { content: '↓'; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e092-panel, .points-v2-e092-panel * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    .points-v2-e092-panel { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    .points-v2-e092-panel .points-v2-e092-title,
    .points-v2-e092-panel .points-v2-e092-term,
    .points-v2-e092-panel .points-v2-e092-step,
    .points-v2-e092-panel .points-v2-e092-example-case { color: CanvasText; }
  }
`;

let mountCount = 0;

/* E092-10 : un nœud déjà présent est réutilisé et déplacé dans le parent
 * courant, jamais cloné. La coque reconstruisant le layout, un nœud du rendu
 * précédent est détaché et n'est donc pas retrouvé : il est recréé une seule
 * fois, sans doublon d'identifiant. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node || node.tagName !== tagName.toUpperCase()) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* N'écrit que si le texte diffère : évite les écritures redondantes et garde
 * les valeurs d'observation à jour après un nouveau rendu. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E092-06 : lecture unique de la matrice rendue par points.js. Aucun accès au
 * store, aucun total codé en dur ; les cinq grandeurs sont recomptées. */
function readMatrix(layout) {
  const grid = layout.querySelector('.points-grid');
  const header = grid ? grid.querySelector('.points-grid-row.is-head') : null;
  const domains = header ? header.querySelectorAll('span').length - 1 : 0;
  const rows = grid ? grid.querySelectorAll('.points-grid-row:not(.is-head)').length : 0;
  const cells = grid ? grid.querySelectorAll('.points-cell') : [];
  const filled = grid ? grid.querySelectorAll('.points-cell.has-points').length : 0;
  return {
    eras: rows,
    domains: Math.max(0, domains),
    cells: cells.length,
    filled,
    empty: cells.length - filled,
  };
}

/* E092-02 et E092-04 : vocabulaire pédagogique stable, en français, jamais
 * deviné à l'exécution. */
const HIERARCHY = [
  ['Monde', 'le cadre global'],
  ['Pays', 'le périmètre étudié'],
  ['Ère', 'la tranche de temps'],
  ['Point', 'l’unité de connaissance datée'],
  ['Sous-point', 'le détail rattaché au point'],
];

const HOWTO = [
  'Repérer l’ère courante dans la première colonne de la matrice.',
  'Lire le domaine en tête de colonne et le compteur de la case.',
  'Ouvrir la fiche pour lire le point, sa confiance et sa source.',
  'Vérifier que chaque vide est déclaré, pas seulement ignoré.',
];

function apply(ctx) {
  if (!ctx || ctx.viewId !== 'pointsv2') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  if (typeof layout.appendChild !== 'function') return;

  const make = ctx.el;
  mountCount += 1;
  ctx.css(CSS_ID, CSS);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  const panel = ensureNode(make, PANEL_ID, 'section', 'points-v2-e092 points-v2-e092-panel', layout);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.dataset.pointsV2E092Mounts = String(mountCount);
  panel.dataset.pointsV2E092Reduced = reduced ? '1' : '0';

  /* E092-01 — le point et la matrice définis au premier contact. */
  let defs = document.getElementById(DEFS_ID);
  if (!defs) {
    defs = make('dl', 'points-v2-e092-defs');
    defs.id = DEFS_ID;
    [
      ['Point', 'la plus petite unité de connaissance démontrable, datable, localisable et transmissible. Il dit qui, quoi, quand, où, d’après qui et avec quelle confiance. (POINT_METHODOLOGY.md §1)'],
      ['Matrice', 'la grille ère × domaine qui rend la couverture visible : une case porte un compteur de points ou une absence documentée. (POINT_METHODOLOGY.md §4)'],
    ].forEach(([term, definition]) => {
      const row = make('div', 'points-v2-e092-def-row');
      row.append(make('dt', 'points-v2-e092-term', term), make('dd', 'points-v2-e092-def', definition));
      defs.appendChild(row);
    });
  }

  /* E092-02 — fil Monde → Pays → Ère → Point → Sous-point. */
  let hierarchy = document.getElementById(HIERARCHY_ID);
  if (!hierarchy) {
    hierarchy = make('ol', 'points-v2-e092-hierarchy');
    hierarchy.id = HIERARCHY_ID;
    HIERARCHY.forEach(([name, detail], index) => {
      const item = make('li', 'points-v2-e092-level');
      item.append(
        make('span', 'points-v2-e092-step', String(index + 1)),
        make('span', 'points-v2-e092-level-name', name),
        make('span', 'points-v2-e092-level-detail', `— ${detail}`)
      );
      hierarchy.appendChild(item);
    });
  }

  /* E092-03 — analogie : la case (contenant) et le compteur (contenu). */
  let analogy = document.getElementById(ANALOGY_ID);
  if (!analogy) {
    analogy = make('p', 'points-v2-e092-analogy');
    analogy.id = ANALOGY_ID;
    const caseShape = make('span', 'points-v2-e092-shape points-v2-e092-case-shape');
    const countShape = make('span', 'points-v2-e092-shape points-v2-e092-count-shape');
    analogy.append(
      caseShape,
      make('span', '', ' La case est le contenant : elle porte l’adresse ère × domaine. '),
      countShape,
      make('span', '', ' Le compteur est le contenu : il dit combien de points s’y trouvent. Une case peut porter plusieurs points.')
    );
  }

  /* E092-04 — mode d'emploi de lecture en quatre temps. */
  let howto = document.getElementById(HOWTO_ID);
  if (!howto) {
    howto = make('ol', 'points-v2-e092-howto');
    howto.id = HOWTO_ID;
    HOWTO.forEach((step) => howto.appendChild(make('li', 'points-v2-e092-howto-step', step)));
  }

  /* E092-05 — micro-exemple : une ère, deux points, relation un-à-plusieurs. */
  let example = document.getElementById(EXAMPLE_ID);
  if (!example) {
    example = make('div', 'points-v2-e092-example');
    example.id = EXAMPLE_ID;
    const caseLabel = make('p', 'points-v2-e092-example-case',
      'Exemple fictif : ère « Fondation » · domaine « Méthode » — 2 points.');
    const points = make('ul', 'points-v2-e092-example-points');
    points.append(
      make('li', '', 'Point 1 — l’année de fondation, avec sa source.'),
      make('li', '', 'Point 2 — le domaine concerné, avec son niveau de confiance.')
    );
    example.append(caseLabel, points);
  }

  /* E092-06 — cinq grandeurs mesurées dans la matrice rendue. */
  const matrixState = readMatrix(layout);
  let metric = document.getElementById(METRIC_ID);
  if (!metric) {
    metric = make('p', 'points-v2-e092-metric');
    metric.id = METRIC_ID;
  }
  write(
    metric,
    `Lecture de la matrice : ${matrixState.eras} ère(s) × ${matrixState.domains} domaine(s), `
    + `${matrixState.filled}/${matrixState.cells} case(s) renseignée(s), ${matrixState.empty} vide(s). `
    + 'Ces nombres sont mesurés dans la vue, pas écrits à l’avance.'
  );
  panel.dataset.pointsV2E092Eras = String(matrixState.eras);
  panel.dataset.pointsV2E092Domains = String(matrixState.domains);
  panel.dataset.pointsV2E092Cells = String(matrixState.cells);
  panel.dataset.pointsV2E092Filled = String(matrixState.filled);
  panel.dataset.pointsV2E092Empty = String(matrixState.empty);

  /* E092-07 — piège conceptuel : l'ancre temporelle n'est pas le point. */
  let pitfall = document.getElementById(PITFALL_ID);
  if (!pitfall) {
    pitfall = make('p', 'points-v2-e092-pitfall');
    pitfall.id = PITFALL_ID;
  }
  write(
    pitfall,
    'ne confondez pas une date et un point : l’année est un champ qui dit ce qu’elle mesure, le point dit qui a agi, quoi, où, d’après qui et avec quelle confiance. Une date sans point reste une case ; un point sans ancre perd son repère.'
  );

  /* E092-08 — renvoi textuel vers la fiche, sans ancre fragile ni vol de focus. */
  let link = document.getElementById(LINK_ID);
  if (!link) {
    link = make('p', 'points-v2-e092-detail-link');
    link.id = LINK_ID;
  }
  write(
    link,
    'Le point se consulte dans la fiche : c’est là que le texte, le domaine, l’échelle, la confiance et les sources sont donnés. Revenez à la matrice pour changer d’ère ou de filtre.'
  );

  /* E092-09 — le sens est dans le texte, l'état de mouvement est affiché. */
  let access = document.getElementById(ACCESS_ID);
  if (!access) {
    access = make('p', 'points-v2-e092-access');
    access.id = ACCESS_ID;
  }
  write(
    access,
    'Définitions et formes sont redondées en texte : aucune information ne repose sur la couleur seule. '
    + `Mouvement réduit : ${reduced ? 'oui' : 'non'} · installations : ${mountCount}.`
  );

  const title = make('h2', 'points-v2-e092-title', 'Comprendre la matrice : qu’est-ce qu’un point ?');
  title.id = TITLE_ID;
  const lede = make(
    'p',
    'points-v2-e092-lede',
    'La vue Points se lit en deux objets : la matrice qui montre où les points se trouvent, et le point qui porte l’information. Ce panneau explique le vocabulaire sans modifier la vue.'
  );
  const subDefs = make('p', 'points-v2-e092-sub', '1. Le vocabulaire');
  const subHierarchy = make('p', 'points-v2-e092-sub', '2. Du monde au point');
  const subHowto = make('p', 'points-v2-e092-sub', '3. Comment lire une case');
  const subExample = make('p', 'points-v2-e092-sub', '4. Un exemple commenté');

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
}

register('E092', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
