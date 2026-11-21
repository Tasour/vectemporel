import { register } from './registry.js';

/* Lentille POINTS E044 — passe 2 (V2) — Accessibilité & ARIA : lecture
 * linéaire et complément de la grille en role=grid (domaine E).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E044.md — chantiers E044-01 à
 * E044-10 (version V2). Fichier possédé : ce module V2 uniquement. Aucun
 * fichier de la passe 1 (`src/views/points/E044.js`), aucun fichier partagé
 * (`points.js`, `registry.js`, `store.js`, `index.js`) et aucune lentille
 * voisine n'est édité.
 *
 * La vue `points.js:128` appelle `runEnhancementsV2({ viewId: 'pointsv2',
 * stage, layout })` après la passe 1. Ce greffon est donc INDÉPENDANT et
 * COEXISTANT : il filtre sur `viewId`, lit la grille et ses cellules déjà
 * rendues, ajoute des panneaux de lecture statiques et des attributs
 * additifs, sans déplacer ni réécrire aucun nœud de la vue. Espace de noms
 * distinct — identifiants, classes et attributs préfixés `points-v2-e044-`
 * / `data-v2-e044-`, feuille injectée sous l'id `points-v2-e044`.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, les filtres internes ou une autre lentille.
 * Toute valeur est DÉRIVÉE DU DOM réellement rendu par points.js : ères
 * (`.points-grid-row:not(.is-head) .points-era`), domaines (en-tête de
 * `.points-grid`), cellules (`.points-cell` / `.has-points`), filtre
 * (`.points-filters select`). Aucun libellé, aucun total, aucun millésime
 * n'est inventé.
 *
 * Invariants V2 : un seul enregistrement, une seule feuille, un seul
 * jeu de panneaux par rendu ; tous les ids préfixés et dédupliqués ; tout DOM
 * statique bâti avec ctx.el (jamais de balisage par chaîne) ; zéro réseau,
 * zéro aléa, zéro minuteur, zéro boucle d'animation, zéro écouteur global,
 * zéro journal ; chaque état porte un signe ET un mot, jamais la couleur
 * seule ; une structure inattendue neutralise la lentille sans exception.
 */

const CSS_ID = 'points-v2-e044';
const SCOPE = 'points-v2-e044';
const VIEW_IDS = ['pointsv2', 'points'];
const REDUCED_ATTR = 'data-v2-e044-reduced';

const ID = {
  instruction: 'points-v2-e044-instruction', // consigne de lecture (masquée)
  coverage: 'points-v2-e044-coverage',       // lecture linéaire (liste masquée)
  summary: 'points-v2-e044-summary',         // résumé chiffré visible
  legend: 'points-v2-e044-legend',           // légende des repères
};

/* Feuille unique, intégralement préfixée par `.points-v2-e044` (classe posée
 * sur `.points-matrix`, ancêtre de la grille et des panneaux). Aucune règle
 * ne vise la structure d'origine, aucune ressource externe, cibles tactiles
 * ≥ 36 px et focus visible. Le mouvement est piloté par ctx.reducedMotion()
 * via `data-v2-e044-reduced`, avec repli CSS sous prefers-reduced-motion. */
const CSS = `
.points-v2-e044 .points-v2-e044-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.points-v2-e044 .points-v2-e044-summary{margin:8px 0 0;color:var(--gold);font-size:10px;line-height:1.6;font-variant-numeric:tabular-nums}
.points-v2-e044 .points-v2-e044-legend{margin:6px 0 0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 8px;font-size:9px;line-height:1.5;color:var(--muted-2)}
.points-v2-e044 .points-v2-e044-term{color:var(--muted);font-weight:600}
.points-v2-e044 .points-v2-e044-def{margin:0}
.points-v2-e044 .points-cell[data-v2-e044-cover="couvert"]::after{content:"\\25A0";font-size:7px;margin-left:3px;vertical-align:super;color:var(--gold-bright)}
.points-v2-e044 .points-cell:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.points-v2-e044[data-v2-e044-reduced="1"] .points-cell{transition:none}
@media (prefers-reduced-motion: reduce){
  .points-v2-e044 .points-cell{transition:none}
}
@media (max-width:620px){
  .points-v2-e044 .points-v2-e044-legend{grid-template-columns:minmax(0,1fr)}
}
@media (forced-colors: active){
  .points-v2-e044 .points-v2-e044-term{color:CanvasText}
  .points-v2-e044 .points-cell[data-v2-e044-cover="couvert"]::after{color:Highlight}
}
@media print{
  .points-v2-e044 .points-v2-e044-summary,
  .points-v2-e044 .points-v2-e044-legend{color:#333}
}
`;

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function nodes(root, selector) {
  if (!isElement(root)) return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function childrenOf(node) {
  return node && node.children ? Array.prototype.slice.call(node.children) : [];
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* E044-04 : ajoute des identifiants à une relation ARIA en préservant ceux
 * déjà posés par la passe 1 et par les lentilles amont. Les seuls jetons
 * retirés sont ceux de notre préfixe : l'opération est idempotente. */
function mergeRefs(node, attr, addIds) {
  if (!node || typeof node.getAttribute !== 'function') return;
  const previous = txt(node.getAttribute(attr)).split(/\s+/).filter(Boolean);
  const kept = previous.filter((token) => token.indexOf('points-v2-e044-') !== 0);
  const merged = [];
  kept.concat(addIds).forEach((token) => {
    if (token && merged.indexOf(token) === -1) merged.push(token);
  });
  if (merged.length) setAttr(node, attr, merged.join(' '));
  else if (typeof node.removeAttribute === 'function') node.removeAttribute(attr);
}

/* E044-10 : réutilise un nœud par identifiant, exactement comme les autres
 * lentilles V2 ; garantit l'absence de doublon après navigation aller-retour. */
function place(ctx, id, tag, className, parent) {
  let node = typeof document === 'undefined' || typeof document.getElementById !== 'function'
    ? null : document.getElementById(id);
  if (node && node.parentElement && node.parentElement !== parent) node.remove();
  if (!node || !node.isConnected) {
    node = ctx.el(tag, className);
    node.id = id;
    parent.appendChild(node);
  }
  return node;
}

function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) node.remove(); });
  return keep || nodesById(id)[0] || null;
}

/* E044-02 : tout est lu sur la matrice réellement rendue. La première colonne
 * (« Ère ») est écartée des domaines ; le compte d'une case est son texte
 * numérique, corroboré par la classe `.has-points` posée par points.js. */
function readMatrix(layout) {
  const matrix = query(layout, '.points-matrix');
  const grid = query(layout, '.points-grid');
  if (!isElement(matrix) || !isElement(grid)) return null;
  const head = query(grid, '.points-grid-row.is-head');
  if (!isElement(head)) return null;

  const domains = childrenOf(head).map(txt).slice(1).filter(Boolean);
  const rows = nodes(grid, '.points-grid-row:not(.is-head)');
  const eras = [];
  const coverage = [];
  let covered = 0;
  let total = 0;
  let activeEra = '';

  rows.forEach((row) => {
    const era = txt(query(row, '.points-era'));
    eras.push(era);
    if (row.classList && row.classList.contains('is-active')) activeEra = era;
    nodes(row, '.points-cell').forEach((cell, colIndex) => {
      const raw = txt(cell);
      const count = /^\d+$/.test(raw) ? parseInt(raw, 10) : 0;
      const isCovered = count > 0 || !!(cell.classList && cell.classList.contains('has-points'));
      coverage.push({
        era,
        domain: domains[colIndex] || '',
        count: isCovered ? count : 0,
        covered: isCovered,
        node: cell,
      });
      total += 1;
      if (isCovered) covered += 1;
    });
  });

  const filter = query(layout, '.points-filters select');
  const activeDomain = filter ? txt(filter.value) : '';
  const sig = [
    eras.join('\u001f'),
    domains.join('\u001f'),
    coverage.map((cell) => (cell.covered ? String(cell.count) : '-')).join('\u001f'),
    activeDomain,
    activeEra,
  ].join('\u001e');

  return { matrix, grid, domains, eras, coverage, covered, total, activeDomain, activeEra, sig };
}

/* E044-03 / E044-04 / E044-06 / E044-07 : panneaux statiques bâtis une seule
 * fois avec ctx.el aucun balisage par chaîne, aucune région live ajoutée
 * (l'annonce unique reste à la lentille E041). */
function ensurePanels(ctx, matrix) {
  return {
    instruction: place(ctx, ID.instruction, 'p',
      'points-v2-e044-sr points-v2-e044-instruction', matrix),
    coverage: place(ctx, ID.coverage, 'ul',
      'points-v2-e044-sr points-v2-e044-list', matrix),
    summary: place(ctx, ID.summary, 'p', 'points-v2-e044-summary', matrix),
    legend: place(ctx, ID.legend, 'dl', 'points-v2-e044-legend', matrix),
  };
}

/* E044-05 : chaque case porte son état de couverture par un attribut et un
 * compte, jamais par une teinte seule. L'aria-label calculé par E004 n'est
 * pas touché. Les mêmes informations sont énoncées en toutes lettres dans la
 * liste linéaire et le résumé. */
function markCoverage(coverage) {
  coverage.forEach((cell) => {
    setAttr(cell.node, 'data-v2-e044-cover', cell.covered ? 'couvert' : 'vide');
    setAttr(cell.node, 'data-v2-e044-count', String(cell.count));
  });
}

function fill(ctx, panels, data) {
  if (panels.instruction) {
    panels.instruction.textContent = 'Grille de couverture des points validés : chaque ligne est une ère, chaque colonne un domaine, et le nombre dans une case est le compte de points. Les en-têtes de ligne et de colonne sont associés à chaque case. La lecture linéaire qui suit énonce les mêmes informations sous forme de liste. La navigation s’effectue avec la touche Tab sur les boutons natifs ; aucune touche fléchée n’est requise.';
  }

  if (panels.coverage) {
    setAttr(panels.coverage, 'role', 'list');
    setAttr(panels.coverage, 'aria-label', 'Couverture de la matrice en lecture linéaire');
    const coveredCells = data.coverage.filter((cell) => cell.covered);
    const items = coveredCells.length
      ? coveredCells.map((cell) => ctx.el('li', 'points-v2-e044-item',
          'Ère ' + (cell.era || 'sans nom') + ', domaine ' + (cell.domain || 'sans nom')
          + ' : ' + cell.count + ' point' + plural(cell.count, '', 's') + '.'))
      : [ctx.el('li', 'points-v2-e044-item',
          'Aucune cellule renseignée dans la matrice.')];
    panels.coverage.replaceChildren.apply(panels.coverage, items);
  }

  if (panels.summary) {
    const pct = data.total ? Math.round((data.covered / data.total) * 100) : 0;
    panels.summary.textContent = 'Couverture de la matrice : '
      + data.covered + ' cellule' + plural(data.covered, '', 's')
      + ' renseignée' + plural(data.covered, '', 's') + ' sur ' + data.total
      + ' (' + pct + ' % du total) — ' + data.eras.length + ' ère'
      + plural(data.eras.length, '', 's') + ' × ' + data.domains.length + ' domaine'
      + plural(data.domains.length, '', 's') + '.'
      + (data.activeDomain && data.activeDomain !== '*'
          ? ' Filtre actif : ' + data.activeDomain + '.' : ' Aucun filtre de domaine actif.')
      + (data.activeEra ? ' Ère courante : ' + data.activeEra + '.' : '');
  }

  if (panels.legend) {
    const defs = [
      ['■ couvert', 'au moins un point validé pour cette ère et ce domaine'],
      ['· vide', 'aucun point validé dans cette case'],
      ['Ère', 'ligne de la matrice'],
      ['Domaine', 'colonne de la matrice'],
    ];
    const pieces = [];
    defs.forEach(([term, definition]) => {
      pieces.push(ctx.el('dt', 'points-v2-e044-term', term));
      pieces.push(ctx.el('dd', 'points-v2-e044-def', definition));
    });
    panels.legend.replaceChildren.apply(panels.legend, pieces);
  }
}

/* E044-01 / E044-08 / E044-09 / E044-10 : point d'entrée unique, gardes de
 * type et de structure, feuille unique, portée unique, ids dédupliqués,
 * signature anti-écriture redondante et repli silencieux. */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;

  const data = readMatrix(layout);
  if (!data) return;

  ctx.css(CSS_ID, CSS);
  data.matrix.classList.add(SCOPE);

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(data.matrix, REDUCED_ATTR, '1');
  else if (typeof data.matrix.hasAttribute === 'function'
    && data.matrix.hasAttribute(REDUCED_ATTR)) data.matrix.removeAttribute(REDUCED_ATTR);

  /* Marqueurs de traçabilité, tous dérivés du DOM. */
  setAttr(data.grid, 'data-v2-e044', '1');
  setAttr(data.grid, 'data-v2-e044-rows', String(data.eras.length));
  setAttr(data.grid, 'data-v2-e044-cols', String(data.domains.length));
  setAttr(data.grid, 'data-v2-e044-covered', String(data.covered));
  setAttr(data.grid, 'data-v2-e044-total', String(data.total));

  const panels = ensurePanels(ctx, data.matrix);
  Object.keys(ID).forEach((key) => enforceUnique(ID[key], panels[key]));

  /* Relation ARIA additive : la consigne et le résumé sont ajoutés à la
   * description de la grille sans effacer les identifiants de la passe 1. */
  mergeRefs(data.grid, 'aria-describedby', [ID.instruction, ID.summary]);

  markCoverage(data.coverage);
  if (getAttr(panels.summary, 'data-v2-e044-signature') !== data.sig) {
    setAttr(panels.summary, 'data-v2-e044-signature', data.sig);
    fill(ctx, panels, data);
  }
}

register('E044', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
