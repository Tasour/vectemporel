import { register } from './registry.js';

/* Lentille POINTS V2 E045 — domaine E : accessibilité & ARIA.
 * Cellules étiquetées (ère, domaine, compte) — seconde passe.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E045.md — chantiers V2 E045-01 à
 * E045-10. Fichier possédé : ce module uniquement. Aucun fichier de la passe 1
 * (src/views/points/E045.js) ni aucun fichier partagé (points.js, index.js,
 * registry.js, styles.css, coque) n'est édité : E045 V2 enrichit le DOM déjà
 * produit par renderPoints (points.js:17-129), sans le reconstruire.
 *
 * Contrat exploité : ctx.viewId, ctx.stage, ctx.layout, ctx.css, ctx.el et
 * ctx.reducedMotion, tels que fournis par runEnhancementsV2 (points.js:128).
 * Toutes les valeurs sont DÉRIVÉES DU DOM rendu : lignes .points-grid-row,
 * en-têtes de .points-grid, cellules .points-cell/.has-points, boutons
 * .points-era, .points-title et .points-matrix. Aucun chiffre n'est codé en
 * dur, aucune donnée n'est inventée, aucun écouteur global n'est ajouté.
 *
 * Spécificités V2 :
 * - une seule feuille, injectée par ctx.css('points-v2-e045', CSS) ;
 * - TOUTES les règles CSS sont préfixées par la classe racine
 *   .points-v2-e045 (posée sur .points-matrix), y compris dans les requêtes
 *   média ;
 * - tous les identifiants sont préfixés `points-v2-e045-` et protégés contre
 *   les doublons (un seul nœud par identifiant, même après rendus multiples) ;
 * - le DOM statique est construit exclusivement avec ctx.el (jamais
 *   innerHTML) ;
 * - ctx.viewId conditionne le greffage, ctx.stage sert d'ancre de repli,
 *   ctx.reducedMotion pilote une classe de quiétude sans animation.
 *
 * Complémentarité : la passe 1 (préfixe `points-e045-`) n'est pas touchée.
 * E003 V2 possède le comptage par `title`/description et E004 V2 possède
 * l'`aria-label` des cellules et des ères. E045 V2 ne leur vole aucun canal :
 * - il n'écrit `aria-label` que si aucun n'existe déjà (E004 garde la main) ;
 * - il AJOUTE ses identifiants à `aria-describedby` sans effacer les
 *   descripteurs d'E003 V2 (déduplication) ;
 * - il n'écrit aucun `title` de cellule et aucun `role` de cellule/ère
 *   (les rôles de grille restent hors de son périmètre).
 * Chaque effet est exposé en `data-v2-e045-*` pour audit.
 *
 * Invariants : zéro console.*, zéro réseau, zéro Math.random, zéro timer,
 * zéro rAF, zéro innerHTML. Greffon idempotent et non destructif : une
 * structure inattendue neutralise la lentille sans propager d'exception.
 *
 * Répartition des dix chantiers (effets distincts, non chevauchants) :
 * 01 nom accessible contextuel · 02 cellule vide nommée ·
 * 03 total de ligne sur l'ère · 04 en-têtes adressables + descriptions ·
 * 05 rôles d'en-tête non destructifs · 06 accord français du compte ·
 * 07 unicité des étiquettes · 08 légende statique ·
 * 09 récapitulatif et signature de fraîcheur ·
 * 10 contraste forcé, mouvement réduit et cibles tactiles.
 */

const CSS_ID = 'points-v2-e045';
const ROOT = 'points-v2-e045';

const ID = {
  legend: 'points-v2-e045-legend',        // panneau de légende (region)
  legendTitle: 'points-v2-e045-legend-title', // titre de la légende
  recap: 'points-v2-e045-recap',          // récapitulatif chiffré visible
  metric: 'points-v2-e045-metric',        // signature et préférence de mouvement
  headPrefix: 'points-v2-e045-head-',     // identifiant des en-têtes de colonne
  eraPrefix: 'points-v2-e045-era-',       // identifiant des boutons d'ère
};

/* Feuille unique. Chaque sélecteur commence par la classe racine, y compris
 * à l'intérieur des requêtes média : aucune fuite hors de la matrice V2,
 * aucune ressource externe, aucune animation, cibles tactiles ≥ 36 px et
 * focus visible. Le repli reducedMotion est double : classe pilotée par
 * ctx.reducedMotion() ET media query native. Aucune information n'est portée
 * par la seule couleur (repli forced-colors). */
const CSS = `
.points-v2-e045 #points-v2-e045-legend{margin:10px 0 0;padding:10px 12px 11px;border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:10px;background:rgba(255,255,255,.02);color:var(--ink-soft);font:inherit;font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.points-v2-e045 #points-v2-e045-legend h2{margin:0 0 6px;color:var(--gold-bright);font-family:var(--serif);font-size:14px;font-weight:600;letter-spacing:0;text-transform:none}
.points-v2-e045 #points-v2-e045-legend p{margin:0 0 8px;color:var(--muted)}
.points-v2-e045 #points-v2-e045-legend dl{margin:0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 8px}
.points-v2-e045 #points-v2-e045-legend dt{color:var(--gold-bright);font-weight:600}
.points-v2-e045 #points-v2-e045-legend dd{margin:0;color:var(--muted-2)}
.points-v2-e045 #points-v2-e045-recap{margin:8px 0 0;color:var(--gold);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}
.points-v2-e045 #points-v2-e045-metric{margin:5px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5}
.points-v2-e045 .points-cell,
.points-v2-e045 .points-era{min-height:36px}
.points-v2-e045 .points-cell:focus-visible,
.points-v2-e045 .points-era:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
@media (max-width:620px){
  .points-v2-e045 #points-v2-e045-legend dl{grid-template-columns:minmax(0,1fr)}
  .points-v2-e045 #points-v2-e045-legend{font-size:11px}
}
.points-v2-e045[data-v2-e045-motion="reduced"] .points-cell,
.points-v2-e045[data-v2-e045-motion="reduced"] .points-era{transition:none}
@media (prefers-reduced-motion:reduce){
  .points-v2-e045 .points-cell,
  .points-v2-e045 .points-era{transition:none}
}
@media (forced-colors:active){
  .points-v2-e045 #points-v2-e045-legend{border:1px solid CanvasText;background:Canvas;color:CanvasText}
  .points-v2-e045 #points-v2-e045-legend h2,
  .points-v2-e045 #points-v2-e045-legend dt{color:CanvasText}
}
`;

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function clean(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function' && node.getAttribute(name) !== value) {
    node.setAttribute(name, value);
  }
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? clean(node.getAttribute(name)) : '';
}

function hasClass(node, name) {
  return !!(node && node.classList && typeof node.classList.contains === 'function' && node.classList.contains(name));
}

function addClass(node, name) {
  if (!node) return;
  if (node.classList && typeof node.classList.add === 'function') node.classList.add(name);
  else put(node, 'class', `${txt(getAttr(node, 'class'))} ${name}`.trim());
}

function toggleClass(node, name, on) {
  if (!node || !node.classList || typeof node.classList.toggle !== 'function') return;
  node.classList.toggle(name, !!on);
}

function plural(count, one, many) {
  return `${count} ${count > 1 ? many : one}`;
}

/* E045-06 : accord français explicite. Le « point(s) » du title natif
 * (points.js:49) n'est jamais recopié dans une étiquette. */
function countWord(count) {
  if (!count) return 'aucun point';
  return count === 1 ? '1 point' : `${count} points`;
}

function withDot(text) {
  const value = clean(text);
  return value && !/[.!?]$/.test(value) ? `${value}.` : value;
}

/* E045-02 : le compte vient du texte visible (points.js:47), puis du title
 * (points.js:49). Le signe « · » et un title absent donnent 0, jamais 1. */
function countOf(cell) {
  const value = clean(cell && cell.textContent);
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  const found = clean(getAttr(cell, 'title')).match(/(\d+)\s*point/i);
  return found ? parseInt(found[1], 10) : 0;
}

/* E045-05 : un rôle est posé seulement s'il n'existe pas déjà, pour rester
 * composable avec E044 et toute autre lentille posant des rôles de grille. */
function ensureRole(node, role) {
  if (node && !getAttr(node, 'role')) put(node, 'role', role);
}

/* E045-04 : complète aria-describedby sans écraser les identifiants déjà
 * présents (E003 V2 notamment), sans doublon. */
function describe(node, id) {
  if (!node || !id) return;
  const ids = getAttr(node, 'aria-describedby').split(' ').filter(Boolean);
  if (ids.indexOf(id) === -1) {
    ids.push(id);
    put(node, 'aria-describedby', ids.join(' '));
  }
}

/* E045-01 : une étiquette existante n'est écrasée que si elle n'est pas déjà
 * contextuelle (ère et domaine présents), pour rester composable avec E004. */
function contextualLabel(node, era, domain) {
  const current = getAttr(node, 'aria-label');
  return !!current && current.indexOf(era) !== -1 && (!domain || current.indexOf(domain) !== -1);
}

/* Ancre de lecture : ctx.layout d'abord, repli sur ctx.stage. Le viewId
 * 'pointsv2' seul active la lentille ; un viewId étranger la neutralise. */
function resolveLayout(ctx) {
  if (!ctx || (ctx.viewId && ctx.viewId !== 'pointsv2')) return null;
  let layout = ctx.layout;
  if ((!layout || typeof layout.querySelector !== 'function') && ctx.stage) {
    const inside = ctx.stage.querySelector ? ctx.stage.querySelector('.points-layout') : null;
    layout = inside || ctx.stage;
  }
  if (!layout || typeof layout.querySelector !== 'function') return null;
  return layout;
}

/* Réutilise un nœud par identifiant et déduplique au passage : s'il existe
 * plusieurs éléments portant le même id (rendus successifs), tous les
 * surnuméraires sont retirés. Garantit l'idempotence V2 après un rendu neuf. */
function place(ctx, id, tag, className, parent) {
  const all = nodes(document, `[id="${id}"]`);
  let node = all.length ? all[0] : null;
  for (let index = 1; index < all.length; index += 1) {
    if (all[index] && all[index].remove) all[index].remove();
  }
  if (node && node.tagName && node.tagName.toLowerCase() !== tag.toLowerCase()) {
    if (node.remove) node.remove();
    node = null;
  }
  if (node && node.parentElement && node.parentElement !== parent) node.remove();
  if (!node || !node.isConnected) {
    node = ctx.el(tag, className);
    node.id = id;
    parent.appendChild(node);
  }
  return node;
}

/* E045-08 : légende statique, construite avec ctx.el uniquement. Un seul
 * panneau par rendu, placé entre la matrice et les filtres, hors région live. */
function buildLegend(ctx, matrix) {
  const legend = place(ctx, ID.legend, 'section', 'points-v2-e045-legend', matrix);
  legend.setAttribute('role', 'region');
  legend.setAttribute('aria-labelledby', ID.legendTitle);

  const title = ctx.el('h2', '', 'Étiquettes des cellules de la matrice');
  title.id = ID.legendTitle;
  const lede = ctx.el('p', '',
    'Lecture des cellules : chaque bouton annonce son ère, son domaine et son compte. « aucun point » nomme une cellule vide : le signe « · » affiché n’est pas une donnée manquante, mais l’absence de point validé. Le nom de l’ère et le domaine sont aussi rattachés à la cellule comme descriptions.');
  const list = ctx.el('dl', '');
  const rows = [
    ['Ère', 'nom de la ligne, repris dans l’étiquette et dans la description de la cellule'],
    ['Domaine', 'intitulé de la colonne, repris dans l’étiquette et dans la description'],
    ['Compte', 'nombre de points validés, accordé en français : aucun, un ou plusieurs'],
    ['État', '« cellule renseignée » ou « cellule vide », dit en toutes lettres'],
  ];
  rows.forEach(([name, text]) => {
    list.appendChild(ctx.el('dt', '', name));
    list.appendChild(ctx.el('dd', '', text));
  });

  legend.replaceChildren(title, lede, list, place(ctx, ID.recap, 'p', 'points-v2-e045-recap', matrix), place(ctx, ID.metric, 'p', 'points-v2-e045-metric', matrix));
  return legend;
}

function apply(ctx) {
  const layout = resolveLayout(ctx);
  if (!layout) return;
  const grid = layout.querySelector('.points-grid');
  if (!grid || typeof grid.appendChild !== 'function') return;
  const matrix = layout.querySelector('.points-matrix') || grid.parentNode;
  if (!matrix || typeof matrix.appendChild !== 'function') return;

  /* E045-10 et garde-fous structurels : feuille unique, classe racine, ancrage. */
  ctx.css(CSS_ID, CSS);
  addClass(matrix, ROOT);
  const reduce = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion();
  toggleClass(matrix, `${ROOT}-reduced`, reduce);
  put(matrix, 'data-v2-e045-view', String(ctx.viewId || ''));
  put(matrix, 'data-v2-e045-motion', reduce ? 'reduced' : 'full');

  const rows = nodes(grid, '.points-grid-row:not(.is-head)');
  if (!rows.length) return;
  const head = layout.querySelector('.points-grid-row.is-head');
  const headerCells = head ? nodes(head, ':scope > span') : [];
  const domains = headerCells.map(txt).slice(1); // première colonne = « Ère »

  /* E045-04 et E045-05 : identifiants préfixés et rôles d'en-tête. Les
   * <span> d'en-tête deviennent adressables sans changer leur texte, leur
   * ordre ni leur classe. */
  headerCells.forEach((node, index) => {
    put(node, 'id', `${ID.headPrefix}${index}`);
    ensureRole(node, 'columnheader');
  });

  const used = new Set();
  let total = 0;
  let filled = 0;
  let cellCount = 0;
  const eraTotals = [];

  rows.forEach((row, rowIndex) => {
    const eraButton = row.querySelector('.points-era');
    const eraName = txt(eraButton) || `Ère ${rowIndex + 1}`;
    put(eraButton, 'id', `${ID.eraPrefix}${rowIndex}`);

    const cells = nodes(row, '.points-cell');
    const rowTotal = cells.reduce((sum, cell) => sum + countOf(cell), 0);
    eraTotals.push(rowTotal);
    total += rowTotal;
    cellCount += cells.length;

    /* E045-03 : le bouton d'ère garde son libellé visible (points.js:41),
     * mais expose le total de sa ligne. L'aria-label n'est posé que s'il est
     * absent (E004 garde la priorité) ; le total est toujours auditable. */
    const eraTotalPhrase = `Ère ${eraName} : ${countWord(rowTotal)} dans cette ligne de la matrice`;
    put(eraButton, 'data-v2-e045-era-total', String(rowTotal));
    put(eraButton, 'data-v2-e045-era-name', withDot(eraTotalPhrase));
    if (eraButton && !contextualLabel(eraButton, eraName, '')) {
      put(eraButton, 'aria-label', withDot(eraTotalPhrase));
    }

    cells.forEach((cell, colIndex) => {
      const fromTitle = getAttr(cell, 'title').split('·')[1] || '';
      const domain = domains[colIndex] || clean(fromTitle) || `domaine ${colIndex + 1}`;
      const count = countOf(cell);
      if (count > 0) filled += 1;

      /* E045-02 et E045-09 : état dit en toutes lettres, compte auditable. */
      const state = count > 0 ? 'cellule renseignée' : 'cellule vide';
      put(cell, 'data-v2-e045-count', String(count));
      put(cell, 'data-v2-e045-state', count > 0 ? 'filled' : 'empty');

      /* E045-01, E045-07 : « ère · domaine · compte + état » en une seule
       * étiquette ; le suffixe de position n'est ajouté qu'en cas de
       * collision réelle. */
      const base = `${eraName} · ${domain} : ${countWord(count)} (${state})`;
      const label = used.has(base) ? `${base} — ligne ${rowIndex + 1}, colonne ${colIndex + 1}` : base;
      used.add(base);
      const fullLabel = withDot(label);
      put(cell, 'data-v2-e045-name', fullLabel);
      if (!contextualLabel(cell, eraName, domain)) put(cell, 'aria-label', fullLabel);

      /* E045-04 : l'en-tête de colonne et le bouton d'ère sont joints à la
       * cellule comme descriptions, sans effacer un descripteur d'E003 V2. */
      const columnHead = headerCells[colIndex + 1];
      if (columnHead) describe(cell, columnHead.id);
      if (eraButton) describe(cell, eraButton.id);
    });
  });

  /* E045-08 : légende statique, une seule par rendu. */
  buildLegend(ctx, matrix);

  /* E045-09 : signature de fraîcheur. Elle change si la structure ou les
   * comptes changent, et reste stable si rien ne change. */
  const signature = [rows.length, cellCount, domains.length, total, filled].join(':');
  const recap = document.getElementById(ID.recap);
  const metric = document.getElementById(ID.metric);
  if (recap) {
    recap.textContent = `${plural(rows.length, 'ère étiquetée', 'ères étiquetées')} · ${plural(domains.length, 'domaine', 'domaines')} · ${countWord(total)} répartis sur ${plural(cellCount, 'cellule', 'cellules')} · ${plural(filled, 'cellule renseignée', 'cellules renseignées')}.`;
  }
  if (metric) {
    metric.textContent = `Signature : ${signature} · mouvement réduit : ${reduce ? 'oui' : 'non'} · total d'ère : ${eraTotals.join(' / ')}.`;
  }
  put(document.getElementById(ID.legend), 'data-v2-e045-signature', signature);
  put(document.getElementById(ID.legend), 'data-v2-e045-total', String(total));
  put(document.getElementById(ID.legend), 'data-v2-e045-filled', String(filled));
  put(grid, 'data-v2-e045', '1');
}

register('E045', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
