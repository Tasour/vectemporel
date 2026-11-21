import { register } from './registry.js';

/* Lentille POINTS E075 — passe 2 (V2) : responsive & mobile — bandeau de
 * diagnostic des points de rupture (domaine H : responsive & mobile).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E075.md — chantiers E075-01 à E075-10.
 * Fichier possédé : src/views/points/v2/E075.js uniquement. Ni la passe 1
 * (src/views/points/E075.js), ni la vue points.js, ni la coque, ni registry.js,
 * ni index.js ne sont modifiés. La V2 enrichit le DOM déjà rendu par points.js
 * d'un bandeau de diagnostic responsive, de signaux d'état distincts et d'un
 * miroir de conformité : elle est additive et non destructive (aucun nœud natif
 * ni aucun signal de la passe 1 n'est retiré, réétiqueté ou écrasé).
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }). La lentille filtre
 * donc sur 'pointsv2'. Tous ses signaux (CSS, ids, classes, data-*) sont
 * préfixés points-v2-e075 pour ne pas écraser ceux de la passe 1
 * (points-e075, points-e075-*, data-points-e075*). Les deux passes coexistent
 * sans conflit sur le même DOM.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucune dépendance vers le store, le routeur ou une autre
 * lentille : aucun filtre, ère, index ni état applicatif n'est modifié.
 *
 * Invariants : une seule feuille (ctx.css), une seule portée, un seul bandeau,
 * un seul signal courant, un seul miroir auditable, un seul register. Aucune
 * mesure écrite, aucun timer, aucune boucle rAF, aucun écouteur global, aucun
  * réseau, aucun aléa, aucune sortie de journal, aucune écriture HTML directe.
 */

const VIEW_ID = 'pointsv2';
const CSS_ID = 'points-v2-e075';
const SCOPE = 'points-v2-e075';

/* Tous les identifiants créés sont préfixés points-v2-e075- et posés sur des
 * descendants, jamais sur .points-matrix / .points-detail (enfants directs de
 * .points-layout, que _diagnostics.js marquerait). Les id déjà portés par un
 * nœud sont réutilisés (ensureId). */
const ID = {
  panel: 'points-v2-e075-panel',
  panelTitle: 'points-v2-e075-panel-title',
  intro: 'points-v2-e075-panel-intro',
  current: 'points-v2-e075-current',
  audit: 'points-v2-e075-audit',
  grid: 'points-v2-e075-grid',
  filters: 'points-v2-e075-filters',
  domain: 'points-v2-e075-domain-select',
  family: 'points-v2-e075-family-select',
  nav: 'points-v2-e075-nav',
  pointTitle: 'points-v2-e075-point-title',
  kicker: 'points-v2-e075-detail-kicker',
};

const DATA_SCOPE = 'data-points-v2-e075-scope';
const DATA_SCALE = 'data-points-v2-e075-scale';
const DATA_SEGMENT = 'data-points-v2-e075-segment';
const DATA_SHORT = 'data-points-v2-e075-short';
const DATA_ORIENTATION = 'data-points-v2-e075-orientation';
const DATA_CHECKS = 'data-points-v2-e075-checks';
const DATA_PANEL = 'data-points-v2-e075-panel';
const DATA_GRID = 'data-points-v2-e075-grid';
const DATA_GRID_ID = 'data-points-v2-e075-grid-id';
const DATA_FLUID = 'data-points-v2-e075-fluid';
const DATA_STACK = 'data-points-v2-e075-stack';
const DATA_FIT = 'data-points-v2-e075-fit';
const DATA_SELECT = 'data-points-v2-e075-select';
const DATA_NAV = 'data-points-v2-e075-nav';
const DATA_REDUCED = 'data-points-v2-e075-reduced';
const DATA_AUDIT = 'data-points-v2-e075-audit';

/* E075-02 — échelle V2, source de vérité unique. Ces quatre nombres alimentent
 * les media queries du CSS, les requêtes matchMedia de détection et le texte du
 * bandeau : aucune valeur de rupture n'est recopiée ailleurs. Les valeurs
 * restent celles de la vague H (1000 / 700 / 620 largeur, 520 hauteur) pour ne
 * pas introduire un millésime concurrent, mais elles sont portées ici par une
 * constante V2 autonome, distincte de celle de la passe 1. */
const BP = Object.freeze({
  wide: 1000,
  narrow: 700,
  mobile: 620,
  short: 520,
});

/* E075-04 / E075-05 — chaque seuil porte son axe, sa règle et son intention.
 * L'axe « largeur » produit un segment prioritaire ; l'axe « hauteur » produit
 * un drapeau indépendant qui se combine au libellé sans le remplacer. */
const SCALE = Object.freeze([
  {
    key: 'wide',
    axis: 'largeur',
    rule: `≤ ${BP.wide} px de large`,
    label: 'Tablette / paysage',
    detail: 'La matrice et le détail passent en colonne unique ; les cellules restent lisibles.',
  },
  {
    key: 'narrow',
    axis: 'largeur',
    rule: `≤ ${BP.narrow} px de large`,
    label: 'Écran étroit',
    detail: 'Aucun panneau ne dépasse la largeur du viewport ; les filtres se répartissent en grille.',
  },
  {
    key: 'mobile',
    axis: 'largeur',
    rule: `≤ ${BP.mobile} px de large`,
    label: 'Téléphone',
    detail: 'Grille fluide en 390×844, cibles tactiles portées à 44 px et lecture en une colonne.',
  },
  {
    key: 'short',
    axis: 'hauteur',
    rule: `≤ ${BP.short} px de haut`,
    label: 'Paysage court',
    detail: 'Critère de hauteur, indépendant de la largeur : le bandeau défile dans son propre cadre.',
  },
]);

const SCALE_TEXT = SCALE.map((item) => `${item.label} ${item.rule}`).join(' · ');
const WIDTH_STEPS = SCALE.filter((item) => item.axis === 'largeur').length;
const HEIGHT_STEPS = SCALE.filter((item) => item.axis === 'hauteur').length;

/* E075-01 / E075-02 / E075-09 — feuille unique, dérivée de BP. Chaque
 * sélecteur commence littéralement par `.points-v2-e075` : aucune règle ne peut
 * fuir hors de la vue Points ni écraser la feuille points-e075 de la passe 1.
 * Aucune transition ni animation positive n'est déclarée : la seule règle de
 * mouvement neutralise, sous préférence réduite, celles des autres lentilles. */
const CSS = `
  /* E075-02 / E075-10 — plancher anti-débordement et notes sr-only. */
  .points-v2-e075 { min-width: 0; max-width: 100%; }
  .points-v2-e075 .points-matrix,
  .points-v2-e075 .points-grid,
  .points-v2-e075 .points-detail,
  .points-v2-e075 .points-filters,
  .points-v2-e075 .points-nav { min-width: 0; max-width: 100%; }
  .points-v2-e075 .points-v2-e075-sr,
  .points-v2-e075-sr {
    position: absolute !important; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0 0 0 0); clip-path: inset(50%);
    white-space: nowrap; border: 0;
  }
  /* E075-03 — bandeau statique, indexable, hors région live et non modal. */
  .points-v2-e075 .points-v2-e075-panel {
    margin: 0 0 14px;
    padding: 10px 12px;
    border: 1px solid var(--line, #5b5b5b);
    border-left: 3px solid var(--gold, #e6b96f);
    border-radius: 8px;
    background: rgba(230, 185, 111, .05);
    color: var(--ink-soft, #c9ced6);
    font-size: 10px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
  .points-v2-e075 .points-v2-e075-panel-title {
    margin: 0 0 6px;
    font-family: var(--serif, Georgia, serif);
    font-size: 13px;
    color: var(--gold-bright, #f0d49a);
  }
  .points-v2-e075 .points-v2-e075-panel-intro,
  .points-v2-e075 .points-v2-e075-current { margin: 0 0 6px; }
  .points-v2-e075 .points-v2-e075-panel-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 4px 12px;
    margin: 0 0 8px;
    padding-left: 18px;
  }
  .points-v2-e075 .points-v2-e075-panel-list li { margin: 0 0 4px; }
  .points-v2-e075 .points-v2-e075-panel-list strong { color: var(--gold, #e6b96f); font-weight: 600; }
  .points-v2-e075 .points-v2-e075-current {
    padding-top: 6px;
    border-top: 1px dashed var(--line, #5b5b5b);
  }
  .points-v2-e075 .points-v2-e075-current strong { color: var(--gold-bright, #f0d49a); }
  /* E075-07 — l'état est dit par le texte ; le liseret ne fait que le redoubler. */
  .points-v2-e075[data-points-v2-e075-short="1"] .points-v2-e075-current {
    border-left: 3px solid var(--gold, #e6b96f);
    padding-left: 8px;
  }
  .points-v2-e075[data-points-v2-e075-orientation="paysage"] .points-v2-e075-panel-title::after {
    content: ' · paysage';
    color: var(--gold, #e6b96f);
  }
  /* E075-03 — tablette : deux colonnes de bandeau. */
  @media (max-width: ${BP.wide}px) {
    .points-v2-e075 .points-v2-e075-panel-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  /* E075-03 — écran étroit : une colonne souple, aucun débordement. */
  @media (max-width: ${BP.narrow}px) {
    .points-v2-e075 .points-v2-e075-panel { padding: 8px 10px; }
    .points-v2-e075 .points-v2-e075-panel-list { grid-template-columns: minmax(0, 1fr); }
  }
  /* E075-09 — téléphone : aucune piste fixe, cibles tactiles ≥ 44 px. */
  @media (max-width: ${BP.mobile}px) {
    .points-v2-e075 .points-v2-e075-panel { max-width: 100%; padding: 8px; }
    .points-v2-e075 .points-v2-e075-panel-list li { overflow-wrap: anywhere; }
    .points-v2-e075 .points-grid-row { min-width: 0; }
    .points-v2-e075 .points-filters select,
    .points-v2-e075 .points-filters button,
    .points-v2-e075 .points-nav button,
    .points-v2-e075 .points-grid-row > button { min-height: 44px; }
  }
  /* E075-04 — rupture de HAUTEUR : le bandeau défile en interne, jamais la page. */
  @media (max-height: ${BP.short}px) {
    .points-v2-e075 .points-v2-e075-panel { max-height: 34vh; overflow-y: auto; }
  }
  /* E075-09 — plancher de cible et focus visible, même hors mobile. */
  .points-v2-e075 .points-filters select,
  .points-v2-e075 .points-filters button,
  .points-v2-e075 .points-nav button,
  .points-v2-e075 .points-grid-row > button { min-height: 36px; }
  .points-v2-e075 .points-filters select:focus-visible,
  .points-v2-e075 .points-filters button:focus-visible,
  .points-v2-e075 .points-nav button:focus-visible,
  .points-v2-e075 .points-grid-row > button:focus-visible {
    outline: 2px solid var(--gold-bright, #f0d49a);
    outline-offset: 2px;
  }
  /* E075-09 — mouvement réduit : couplage JS (attribut) ET media query. */
  .points-v2-e075[data-points-v2-e075-reduced="1"] .points-v2-e075-panel { transition: none !important; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e075 .points-v2-e075-panel { transition: none !important; }
  }
  /* E075-09 — couleurs forcées : bordures et texte explicites, jamais la seule couleur. */
  @media (forced-colors: active) {
    .points-v2-e075 .points-v2-e075-panel { border: 1px solid CanvasText; color: CanvasText; background: Canvas; }
    .points-v2-e075 .points-v2-e075-panel-list strong,
    .points-v2-e075 .points-v2-e075-panel-title,
    .points-v2-e075 .points-v2-e075-current strong { color: CanvasText; }
    .points-v2-e075[data-points-v2-e075-short="1"] .points-v2-e075-current { border-left-color: Highlight; }
  }
  /* E075-10 — le miroir auditable n'a pas sa place sur papier. */
  @media print {
    .points-v2-e075 .points-v2-e075-audit { display: none; }
  }
`;

let currentCtx = null;    // dernier ctx reçu, pour les écouteurs de rupture
let currentNode = null;   // #points-v2-e075-current du rendu courant
let mediaLists = [];      // paires { list, handler } des écouteurs matchMedia
let checkCount = 0;       // compteur auditable de détections réelles
let lastSignature = '';   // signature anti-écriture redondante

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

/* Non destructif : jamais d'écrasement d'un attribut déjà porté (passe 1,
 * E002/E004 ou une autre lentille V2). */
function setIfAbsent(node, attr, value) {
  if (node && !node.hasAttribute(attr)) node.setAttribute(attr, String(value));
}

function setAttr(node, name, value) {
  if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
}

/* On AJOUTE une relation sans écraser celle déjà posée par la passe 1. */
function addTo(node, attr, id) {
  if (!node || !id) return;
  const current = node.getAttribute(attr);
  if (!current) {
    node.setAttribute(attr, id);
    return;
  }
  const ids = current.split(/\s+/).filter(Boolean);
  if (ids.indexOf(id) === -1) node.setAttribute(attr, `${current} ${id}`);
}

/* E075-03/10 : on réutilise un id existant plutôt que de l'écraser. */
function ensureId(node, preferred) {
  if (!node) return '';
  if (node.id) return node.id;
  node.id = preferred;
  return preferred;
}

/* E075-09 — double source de vérité avec repli sûr : le doute tourne toujours
 * en faveur du mouvement réduit. */
function reducedMotion(ctx) {
  let value = false;
  if (ctx && typeof ctx.reducedMotion === 'function') {
    try { value = !!ctx.reducedMotion(); }
    catch { /* repli ci-dessous */ }
  }
  try {
    if (typeof window !== 'undefined' && window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) value = true;
  } catch { /* on garde la valeur déjà obtenue */ }
  return value;
}

/* E075-01 — la racine est le layout, repliée sur stage pour un ctx minimal. */
function rootOf(ctx) {
  const layout = ctx && ctx.layout;
  if (layout && typeof layout.querySelector === 'function') return layout;
  const stage = ctx && ctx.stage;
  if (stage && typeof stage.querySelector === 'function') return stage;
  return null;
}

/* E075-06 — requête sûre : matchMedia peut manquer ou lever en contexte de test. */
function mq(query) {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query) : null;
  } catch {
    return null;
  }
}

function viewportWidth() {
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  return root && typeof root.clientWidth === 'number' ? root.clientWidth : 0;
}

function viewportHeight() {
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  return root && typeof root.clientHeight === 'number' ? root.clientHeight : Number.POSITIVE_INFINITY;
}

/* E075-06 — évaluation par matchMedia avec repli déterministe sur les
 * dimensions du document ; aucun timer, aucun rAF, aucune mesure écrite. */
function matches(query, fallback) {
  const list = mq(query);
  return list ? !!list.matches : !!fallback();
}

/* E075-04 / E075-06 — détection du segment courant. Priorité du plus étroit au
 * plus large pour la largeur ; la hauteur et l'orientation sont des drapeaux
 * indépendants qui se combinent au libellé sans le remplacer. */
function detect() {
  const isMobile = matches(`(max-width: ${BP.mobile}px)`, () => viewportWidth() <= BP.mobile);
  const isNarrow = matches(`(max-width: ${BP.narrow}px)`, () => viewportWidth() <= BP.narrow);
  const isWide = matches(`(max-width: ${BP.wide}px)`, () => viewportWidth() <= BP.wide);
  const isShort = matches(`(max-height: ${BP.short}px)`, () => viewportHeight() <= BP.short);
  const isPortrait = matches('(orientation: portrait)', () => viewportWidth() <= viewportHeight());
  const key = isMobile ? 'mobile' : isNarrow ? 'narrow' : isWide ? 'wide' : 'desktop';
  const item = SCALE.find((entry) => entry.key === key);
  return {
    key,
    label: item ? item.label : 'Grand écran',
    rule: item ? item.rule : '',
    isShort,
    orientation: isPortrait ? 'portrait' : 'paysage',
  };
}

/* E075-07 — compteur auditable et état dit par le texte, hors région live
 * (E041 reste seul maître des annonces). La signature évite de réécrire un
 * texte identique ; le compteur, lui, croît à chaque détection réelle. */
function refresh() {
  const layout = currentCtx && currentCtx.layout;
  if (!layout || !layout.isConnected) return;

  checkCount += 1;
  const state = detect();
  const signature = `${state.key}|${state.isShort ? '1' : '0'}|${state.orientation}`;
  setAttr(layout, DATA_CHECKS, String(checkCount));
  if (signature === lastSignature) return;
  lastSignature = signature;

  setAttr(layout, DATA_SEGMENT, state.key);
  setAttr(layout, DATA_SHORT, state.isShort ? '1' : '0');
  setAttr(layout, DATA_ORIENTATION, state.orientation);
  setAttr(layout, DATA_CHECKS, String(checkCount));

  if (currentNode && currentNode.isConnected) {
    const shownLabel = state.isShort ? `${state.label} · paysage court` : state.label;
    const rule = state.rule ? ` (${state.rule})` : '';
    const orientation = ` · orientation ${state.orientation}`;
    const tail = state.isShort
      ? ` : le bandeau défile dans son cadre (≤ ${BP.short} px de haut).`
      : ' : hauteur normale, aucun repli de paysage court.';
    const text = `Segment courant : ${shownLabel}${rule}${orientation}${tail}`;
    if (currentNode.textContent !== text) {
      const strong = currentCtx.el('strong', '', shownLabel);
      currentNode.replaceChildren(strong, document.createTextNode(`${rule}${orientation}${tail}`));
    }
  }
}

/* E075-06 — écouteurs event-driven, un seul jeu à la fois : on retire les
 * précédents avant d'en installer de nouveaux (aucune fuite entre rendus). */
function detach() {
  mediaLists.forEach(({ list, handler }) => {
    try {
      if (typeof list.removeEventListener === 'function') list.removeEventListener('change', handler);
      else if (typeof list.removeListener === 'function') list.removeListener(handler);
    } catch { /* le prochain attach repart d'une liste vide */ }
  });
  mediaLists = [];
}

function attach() {
  detach();
  const queries = [
    `(max-width: ${BP.wide}px)`,
    `(max-width: ${BP.narrow}px)`,
    `(max-width: ${BP.mobile}px)`,
    `(max-height: ${BP.short}px)`,
    '(orientation: portrait)',
  ];
  queries.forEach((query) => {
    const list = mq(query);
    if (!list) return;
    const handler = () => refresh();
    try {
      if (typeof list.addEventListener === 'function') list.addEventListener('change', handler);
      else if (typeof list.addListener === 'function') list.addListener(handler);
      else return;
      mediaLists.push({ list, handler });
    } catch { /* la détection ponctuelle de apply() reste disponible */ }
  });
}

/* E075-03 / E075-08 — bandeau construit une seule fois par rendu, inséré après
 * le titre dans .points-matrix. Aucun nœud existant n'est retiré ni réécrit. */
function ensurePanel(ctx, layout) {
  const stale = document.getElementById(ID.panel);
  if (stale && !layout.contains(stale)) stale.remove();

  const existing = layout.querySelector('#' + ID.panel);
  if (existing && existing.isConnected) {
    currentNode = existing.querySelector('#' + ID.current);
    return;
  }
  if (existing) existing.remove();

  const panel = ctx.el('section', 'points-v2-e075-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.panelTitle);
  panel.setAttribute(DATA_PANEL, '1');

  const title = ctx.el('h3', 'points-v2-e075-panel-title', 'Diagnostic responsive — points de rupture (V2)');
  title.id = ID.panelTitle;
  panel.appendChild(title);

  const intro = ctx.el('p', 'points-v2-e075-panel-intro',
    'Une seule échelle V2 commande la feuille de style, la détection et ce bandeau : '
    + SCALE_TEXT + '. Les seuils sont exprimés en pixels CSS, indépendants du zoom système.');
  intro.id = ID.intro;
  panel.appendChild(intro);

  const list = ctx.el('ol', 'points-v2-e075-panel-list');
  SCALE.forEach((item) => {
    const li = ctx.el('li', '', '');
    li.appendChild(ctx.el('strong', '', `${item.label} · ${item.rule}`));
    li.appendChild(document.createTextNode(` — ${item.detail}`));
    list.appendChild(li);
  });
  panel.appendChild(list);

  currentNode = ctx.el('p', 'points-v2-e075-current', 'Segment courant : détection en cours.');
  currentNode.id = ID.current;
  panel.appendChild(currentNode);

  const matrix = layout.querySelector('.points-matrix');
  const titleNode = matrix ? matrix.querySelector('.points-title') : null;
  if (titleNode && titleNode.parentElement === matrix) matrix.insertBefore(panel, titleNode.nextSibling);
  else if (matrix) matrix.appendChild(panel);
  else layout.appendChild(panel);
}

/* E075-10 — miroir auditable unique, créé par ctx.el, réutilisé ou relogé sans
 * doublon. Hors région live : la V2 reste silencieuse au montage et au rendu. */
function ensureAudit(ctx, layout) {
  if (typeof document === 'undefined' || !layout) return null;
  let audit = document.getElementById(ID.audit);
  if (audit && audit.parentElement !== layout) audit.remove();
  audit = document.getElementById(ID.audit);
  if (!audit) {
    audit = ctx.el('p', 'points-v2-e075-sr points-v2-e075-audit');
    audit.id = ID.audit;
    layout.appendChild(audit);
  }
  return audit;
}

function apply(ctx) {
  /* E075-01 — filtre strict sur la vue V2 et gardes de type pour un ctx
   * minimal. Un viewId étranger ou absent neutralise la lentille. */
  if (!ctx || ctx.viewId !== VIEW_ID) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const root = rootOf(ctx);
  if (!root) return;

  /* E075-01 — injection unique (cssOnce) et ancrage de portée sur la vue. */
  ctx.css(CSS_ID, CSS);
  const layout = ctx.layout && ctx.layout.classList ? ctx.layout : root;
  layout.classList.add(SCOPE);
  setAttr(layout, DATA_SCOPE, '1');
  setAttr(layout, DATA_SCALE, SCALE_TEXT);

  const matrix = root.querySelector('.points-matrix');
  const detail = root.querySelector('.points-detail');
  const grid = root.querySelector('.points-grid');
  const filters = root.querySelector('.points-filters');

  /* E075-09 — couplage explicite à la préférence de mouvement réduite, en plus
   * de la media query, pour les environnements sans matchMedia fiable. */
  const motion = reducedMotion(ctx);
  setAttr(layout, DATA_REDUCED, motion ? '1' : '0');

  /* E075-03 — bandeau unique ; son introduction est AJOUTÉE à
   * l'aria-describedby de la grille sans écraser la passe 1 ni E002/E004. */
  ensurePanel(ctx, layout);
  if (introPresent(matrix)) addTo(grid, 'aria-describedby', ID.intro);

  /* E075-08 — miroirs d'état sur les nœuds réels, sans les remplacer. */
  if (grid) {
    setAttr(grid, DATA_GRID, '1');
    setAttr(grid, DATA_GRID_ID, ensureId(grid, ID.grid));
  }
  if (filters) setAttr(filters, DATA_FLUID, '1');
  if (detail) setAttr(detail, DATA_STACK, '1');
  const nav = detail ? detail.querySelector('.points-nav') : root.querySelector('.points-nav');
  if (nav) setAttr(nav, DATA_FIT, '1');

  /* E075-08 — filtres : le groupe est nommé et chaque select déclare, par une
   * relation aria-controls additive, ce qu'il pilote. Les aria-label natifs de
   * points.js ne sont jamais réécrits ; aucun écouteur n'est ajouté. */
  let selectsLinked = 0;
  if (filters) {
    setIfAbsent(filters, 'role', 'group');
    setIfAbsent(filters, 'aria-label', 'Filtres du périmètre des points (lecture V2)');
    const selects = filters.querySelectorAll('select');
    [ID.domain, ID.family].forEach((preferred, index) => {
      const select = selects[index];
      if (!select) return;
      const selectId = ensureId(select, preferred);
      const gridId = grid && grid.id;
      if (gridId && selectId) addTo(select, 'aria-controls', gridId);
      setAttr(select, DATA_SELECT, '1');
      selectsLinked += 1;
    });
  }

  /* E075-08 — navigation nommée, reliée au sujet du détail par une relation
   * additive ; le texte visible des boutons n'est pas modifié (Label in Name). */
  let navLinked = 0;
  if (nav) {
    setIfAbsent(nav, 'role', 'navigation');
    setIfAbsent(nav, 'aria-label', 'Navigation entre les points validés (lecture V2)');
    setAttr(nav, DATA_NAV, '1');
    const labelNode = detail && (detail.querySelector('.points-point-title') || detail.querySelector('.view-kicker'));
    const labelId = ensureId(labelNode, detail && detail.querySelector('.points-point-title') ? ID.pointTitle : ID.kicker);
    nav.querySelectorAll('button').forEach((button) => {
      if (labelId) addTo(button, 'aria-controls', labelId);
      navLinked += 1;
    });
  }

  /* E075-07 / E075-10 — première détection puis installation des écouteurs,
   * et rafraîchissement du miroir de conformité dérivé du DOM réel. */
  lastSignature = '';
  refresh();
  attach();

  const audit = ensureAudit(ctx, layout);
  if (audit) {
    const state = detect();
    const summary = `Responsive V2 : ${SCALE.length} seuil(s) documenté(s) (${WIDTH_STEPS} largeur, ${HEIGHT_STEPS} hauteur), `
      + `segment ${state.label}, orientation ${state.orientation}, `
      + `${selectsLinked} filtre(s) relié(s), ${navLinked} bouton(s) de navigation, `
      + `${checkCount} détection(s), mouvement réduit ${motion ? 'activé' : 'désactivé'}.`;
    if (audit.textContent !== summary) audit.textContent = summary;
    setAttr(audit, DATA_AUDIT,
      `${SCALE.length}/${WIDTH_STEPS}/${HEIGHT_STEPS}/${state.key}/${state.orientation}/${motion ? 1 : 0}`);
  }
}

/* Le bandeau n'est relié à la grille que s'il a bien été créé dans .points-matrix. */
function introPresent(matrix) {
  if (!matrix) return false;
  const intro = matrix.querySelector('#' + ID.intro);
  return !!(intro && intro.isConnected);
}

/* E075-10 — enregistrement unique, isolé par un try/catch : une lentille
 * défaillante ne doit jamais interrompre le rendu des autres modules V2. */
register('E075', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
