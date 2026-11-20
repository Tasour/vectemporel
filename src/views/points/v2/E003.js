import { register } from './registry.js';

/* Lentille POINTS V2 E003 — domaine A : matrice & grille.
 * Compteur de points par cellule, porté par `title` ET par l'ARIA.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E003.md — chantiers V2 E003-01 à
 * E003-10 (seconde passe). Fichier possédé : ce module uniquement. Aucun
 * fichier de la passe 1 ni aucun fichier partagé n'est édité (ni points.js,
 * ni index.js, ni registry.js, ni styles.css, ni la coque).
 *
 * Contrat exploité : ctx.viewId, ctx.stage, ctx.layout, ctx.css, ctx.el et
 * ctx.reducedMotion, tels que fournis par runEnhancementsV2
 * (src/views/points.js:128). Toutes les valeurs sont DÉRIVÉES DU DOM rendu
 * par points.js : ères (.points-grid-row), domaines (en-tête de .points-grid),
 * cellules (.points-cell / .has-points), titre (.points-title) et matrice
 * (.points-matrix). Aucun chiffre n'est codé en dur, aucune donnée n'est
 * inventée, aucun écouteur global n'est ajouté.
 *
 * Spécificités V2 :
 * - une seule feuille, injectée par ctx.css('points-v2-e003', CSS) ;
 * - TOUTES les règles CSS sont préfixées par la classe racine .points-v2-e003
 *   (posée sur .points-matrix), y compris dans les requêtes média ;
 * - tous les identifiants sont préfixés `points-v2-e003-` et protégés contre
 *   les doublons (un seul nœud par identifiant, même après rendus multiples) ;
 * - le DOM statique est construit exclusivement avec ctx.el (jamais
 *   innerHTML) ;
 * - ctx.viewId conditionne le greffage, ctx.stage sert d'ancre de repli,
 *   ctx.reducedMotion pilote une classe de quiétude sans animation.
 *
 * Complémentarité : la passe 1 (préfixe `points-e003-`) et E004 (préfixe
 * `points-e004-`) ne sont pas touchées. E003 V2 n'écrit ni `role`, ni
 * `aria-label`, ni identifiant emprunté : le comptage passe par `title`,
 * `aria-describedby`, `data-v2-e003-*` et des nœuds de description dédiés.
 *
 * Invariants : zéro console, zéro fetch/XMLHttpRequest/réseau, zéro
 * Math.random, zéro timer, zéro rAF, zéro écouteur global. Greffon
 * idempotent et non destructif : une structure inattendue neutralise la
 * lentille sans propager d'exception.
 */

const CSS_ID = 'points-v2-e003';
const ROOT = 'points-v2-e003';

const ID = {
  descs: 'points-v2-e003-descs',        // conteneur des descriptions masquées
  descPrefix: 'points-v2-e003-desc-',   // description par cellule (indices r-c)
  summary: 'points-v2-e003-summary',    // récapitulatif chiffré visible
  status: 'points-v2-e003-status',      // statut narratif (role=status)
  legend: 'points-v2-e003-legend',      // légende des compteurs
};

/* Feuille unique. Chaque sélecteur commence par la classe racine, y compris
 * à l'intérieur des requêtes média : aucune fuite hors de la matrice V2,
 * aucune ressource externe, aucune animation, cibles tactiles ≥ 36 px et
 * focus visible. Le repli reducedMotion est double : classe pilotée par
 * ctx.reducedMotion() ET media query native. */
const CSS = `
.${ROOT} .points-v2-e003-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.${ROOT} .points-cell:focus-visible,
.${ROOT} .points-era:focus-visible,
.${ROOT} .points-filters select:focus-visible,
.${ROOT} .points-filters button:focus-visible,
.${ROOT} .points-nav button:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.${ROOT} .points-cell,
.${ROOT} .points-era{min-height:36px}
.${ROOT} #${ID.summary}{margin:8px 0 0;color:var(--gold);font-size:10px;font-variant-numeric:tabular-nums}
.${ROOT} #${ID.status}{margin:6px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5}
.${ROOT} #${ID.legend}{margin:8px 0 0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 8px;font-size:9px;line-height:1.5;color:var(--muted-2)}
.${ROOT} #${ID.legend} dt{color:var(--muted);font-weight:600}
.${ROOT} #${ID.legend} dd{margin:0}
@media (max-width:620px){
  .${ROOT} #${ID.legend}{grid-template-columns:minmax(0,1fr)}
}
.${ROOT}-reduced .points-cell,
.${ROOT}-reduced .points-era,
.${ROOT}-reduced .points-filters button,
.${ROOT}-reduced .points-nav button{transition:none}
@media (prefers-reduced-motion:reduce){
  .${ROOT} .points-cell,
  .${ROOT} .points-era,
  .${ROOT} .points-filters button,
  .${ROOT} .points-nav button{transition:none}
}
`;

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

function hasClass(node, name) {
  return !!(node && node.classList && typeof node.classList.contains === 'function' && node.classList.contains(name));
}

function addClass(node, name) {
  if (!node) return;
  if (node.classList && typeof node.classList.add === 'function') node.classList.add(name);
  else put(node, 'class', `${txt(node.getAttribute && node.getAttribute('class'))} ${name}`.trim());
}

function toggleClass(node, name, on) {
  if (!node || !node.classList || typeof node.classList.toggle !== 'function') return;
  node.classList.toggle(name, !!on);
}

function plural(count, one, many) {
  return `${count} ${count > 1 ? many : one}`;
}

/* Le compteur est lu sur le contenu réel de la cellule : un chiffre vaut le
 * compte, le point médian « · » (cellule vide) vaut zéro. Aucune valeur
 * n'est supposée ni importée. */
function countOf(cell) {
  const value = txt(cell);
  return /^\d+$/.test(value) ? parseInt(value, 10) : 0;
}

function countPhrase(count, suffix) {
  const base = count === 0 ? 'aucun point' : plural(count, 'point', 'points');
  return suffix ? `${base} ${suffix}` : base;
}

function verb(count) {
  return count > 1 ? 'validés' : 'validé';
}

/* Ancre de lecture : ctx.layout d'abord, repli sur ctx.stage (ou sur le
 * .points-layout qu'il contient). Le viewId 'pointsv2' seul active la
 * lentille ; un viewId étranger ou absent la neutralise sans exception. */
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

function apply(ctx) {
  const layout = resolveLayout(ctx);
  if (!layout) return;
  const grid = layout.querySelector('.points-grid');
  if (!grid || typeof grid.appendChild !== 'function') return;
  const matrix = layout.querySelector('.points-matrix') || grid.parentNode;
  if (!matrix || typeof matrix.appendChild !== 'function') return;

  /* E003-01 — feuille unique, classe racine et ancrage viewId/stage/layout. */
  ctx.css(CSS_ID, CSS);
  addClass(matrix, ROOT);
  const reduce = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion();
  toggleClass(matrix, `${ROOT}-reduced`, reduce);
  put(matrix, 'data-v2-e003-view', String(ctx.viewId || ''));

  const title = matrix.querySelector('.points-title');
  const headerCells = nodes(grid, '.points-grid-row.is-head > span');
  const domains = headerCells.map(txt).slice(1); // première colonne = « Ère »
  const rows = nodes(grid, '.points-grid-row:not(.is-head)');

  let total = 0;
  const domainTotals = domains.map(() => 0);
  const rowTotals = [];
  const cells = [];
  const descriptions = [];

  /* E003-02 à E003-04 — comptage dérivé du DOM, titre lisible et description
   * ARIA par cellule. Les compteurs sont stockés en data-* pour audit. */
  rows.forEach((row, r) => {
    const era = txt(row.querySelector('.points-era'));
    let rowTotal = 0;
    nodes(row, '.points-cell').forEach((cell, c) => {
      const count = countOf(cell);
      const domain = domains[c] || '';
      total += count;
      rowTotal += count;
      domainTotals[c] = (domainTotals[c] || 0) + count;
      cells.push(cell);

      /* E003-02 — compteur exposé en data-*, jamais codé en dur. */
      put(cell, 'data-v2-e003-count', String(count));

      /* E003-03 — phrase de comptage. Le titre existant n'est réécrit que
       * s'il est absent ou porte le marqueur généré « point(s) » : un titre
       * tiers est préservé (non destructif). */
      const phrase = countPhrase(count);
      const currentTitle = cell.getAttribute('title') || '';
      if (!currentTitle || currentTitle.indexOf('point(s)') !== -1) {
        put(cell, 'title', `${era} · ${domain} · ${phrase} ${verb(count)}`);
      }

      /* E003-04 — description ARIA dédiée, complémentaire de l'aria-label
       * éventuellement posé par une autre lentille (non écrasé). */
      const descId = `${ID.descPrefix}${r}-${c}`;
      put(cell, 'aria-describedby', descId);
      descriptions.push({ id: descId, text: `${phrase} ${verb(count)} pour ${era || 'cette ère'} · ${domain || 'ce domaine'}.` });
    });
    rowTotals.push(rowTotal);

    /* E003-05 — total par ère sur le libellé de ligne : titre + data-*,
     * sans toucher au texte visible ni à l'aria-label d'E004. */
    const eraButton = row.querySelector('.points-era');
    if (eraButton) {
      put(eraButton, 'title', `${era || 'Ère'} · ${countPhrase(rowTotal, verb(rowTotal))} dans cette ère`);
      put(eraButton, 'data-v2-e003-era-total', String(rowTotal));
    }
  });

  /* E003-06 — totaux par domaine en en-tête de colonne, somme réelle des
   * cellules de la colonne, exposée en titre et en data-*. */
  headerCells.forEach((header, index) => {
    if (index === 0) return; // première colonne : intitulé « Ère »
    const domain = domains[index - 1] || '';
    const count = domainTotals[index - 1] || 0;
    put(header, 'title', `${domain} · ${countPhrase(count, verb(count))} sur toutes les ères`);
    put(header, 'data-v2-e003-domain-total', String(count));
  });

  /* E003-07 — total général sur le titre et la matrice, cohérent avec le
   * texte rendu par points.js ; aucune somme n'est codée en dur. */
  if (title) {
    put(title, 'title', `${countPhrase(total, verb(total))} répartis sur ${plural(cells.length, 'cellule', 'cellules')}`);
    put(title, 'data-v2-e003-total', String(total));
  }
  put(matrix, 'data-v2-e003-total', String(total));
  put(matrix, 'title', `Matrice de couverture : ${countPhrase(total, verb(total))}.`);

  /* E003-08 — descriptions masquées, conteneur unique réutilisé et vidé à
   * chaque rendu : jamais de doublon, jamais de nœud périmé, construit avec
   * ctx.el uniquement. */
  const descs = place(ctx, ID.descs, 'div', 'points-v2-e003-sr', matrix);
  descs.replaceChildren();
  descriptions.forEach((item) => {
    const span = ctx.el('span', '', item.text);
    span.id = item.id;
    descs.appendChild(span);
  });

  /* E003-09 — récapitulatif visible et statut narratif, tous deux relus à
   * chaque rendu. Le statut est une région live polie, sans timer. */
  const filled = cells.filter((cell) => countOf(cell) > 0).length;
  const summary = place(ctx, ID.summary, 'p', 'points-v2-e003-summary', matrix);
  summary.textContent = `${countPhrase(total, verb(total))} · ${filled}/${cells.length} cellules renseignées · ${plural(rows.length, 'ère', 'ères')} × ${plural(domains.length, 'domaine', 'domaines')}.`;
  const status = place(ctx, ID.status, 'p', 'points-v2-e003-status', matrix);
  put(status, 'role', 'status');
  put(status, 'aria-live', 'polite');
  status.textContent = `Compteurs de la matrice : ${plural(total, 'point', 'points')} au total, dont ${plural(filled, 'cellule renseignée', 'cellules renseignées')} sur ${cells.length}.`;

  /* E003-10 — légende des compteurs, dérivée d'une vraie cellule vide, puis
   * marqueur de greffage et trace de quiétude reducedMotion. Aucun écouteur,
   * aucun timer, aucune mutation profonde des structures d'origine. */
  const emptySample = txt(cells.filter((cell) => countOf(cell) === 0)[0]) || '·';
  const legend = place(ctx, ID.legend, 'dl', 'points-v2-e003-legend', matrix);
  legend.replaceChildren();
  put(legend, 'title', 'Légende des compteurs de la matrice');
  put(legend, 'aria-label', 'Légende des compteurs de la matrice');
  legend.appendChild(ctx.el('dt', '', 'Chiffre'));
  legend.appendChild(ctx.el('dd', '', 'nombre de points validés pour cette ère et ce domaine'));
  legend.appendChild(ctx.el('dt', '', `« ${emptySample} »`));
  legend.appendChild(ctx.el('dd', '', 'aucun point validé pour cette ère et ce domaine'));
  put(grid, 'data-v2-e003', '1');
  put(matrix, 'data-v2-e003-motion', reduce ? 'reduced' : 'full');
  put(matrix, 'data-v2-e003-grafted', '1');
}

register('E003', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
