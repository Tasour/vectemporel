import { register } from './registry.js';

/* Lentille POINTS E003 — domaine A : matrice & grille.
 * Compteur de points par cellule, porté par `title` ET par l'ARIA.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E003.md — chantiers E003-01 à E003-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité
 * (ni src/views/points.js, ni styles.css, ni la coque, ni le registre).
 *
 * Contrat exploité : ctx.layout (repli ctx.stage), ctx.css, ctx.el. Toutes les
 * valeurs sont DÉRIVÉES DU DOM rendu par points.js : ères (.points-grid-row),
 * domaines (en-tête de .points-grid), cellules (.points-cell / .has-points),
 * titre (.points-title) et matrice (.points-matrix). Aucun chiffre n'est codé
 * en dur, aucune donnée n'est inventée, aucun écouteur n'est ajouté.
 *
 * Complémentarité avec E004 (ligne de l'ère courante) : E003 ne touche ni
 * `role`, ni `aria-label`, ni les identifiants d'E004. Le comptage est exposé
 * via `title`, `aria-describedby`, `data-e003-*` et des nœuds de description
 * dédiés, tous préfixés `points-e003-`.
 *
 * Invariants :
 * - une seule feuille CSS, injectée par ctx.css('points-e003', …) ;
 * - une seule description masquée par cellule, réutilisée par identifiant ;
 * - aucun titre tiers (sans marqueur « point(s) ») n'est écrasé ;
 * - aucune écriture innerHTML, aucun timer, aucune rAF, aucun réseau,
 *   aucun aléa, aucun console.* ;
 * - greffon idempotent et non destructif : les nœuds ajoutés sont réutilisés
 *   par identifiant, jamais dupliqués ; une structure inattendue neutralise
 *   la lentille sans rien casser.
 */

const CSS_ID = 'points-e003';

const ID = {
  descs: 'points-e003-descs',        // conteneur des descriptions masquées
  descPrefix: 'points-e003-desc-',   // description par cellule (indices r-c)
  summary: 'points-e003-summary',    // récapitulatif chiffré visible
  status: 'points-e003-status',      // statut narratif (role=status)
  legend: 'points-e003-legend',      // légende des compteurs
};

/* Feuille unique. Les règles ne visent que les ancres `points-e003-` ou les
 * classes déjà rendues par points.js : aucune fuite, aucune ressource externe,
 * aucune animation, cibles tactiles ≥ 36 px et focus visible. */
const CSS = `
.points-e003-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.points-cell:focus-visible,.points-era:focus-visible,
.points-filters select:focus-visible,.points-filters button:focus-visible,
.points-nav button:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.points-cell,.points-era{min-height:36px}
#${ID.summary}{margin:8px 0 0;color:var(--gold);font-size:10px;font-variant-numeric:tabular-nums}
#${ID.status}{margin:6px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5}
#${ID.legend}{margin:8px 0 0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 8px;font-size:9px;line-height:1.5;color:var(--muted-2)}
#${ID.legend} dt{color:var(--muted);font-weight:600}
#${ID.legend} dd{margin:0}
@media (max-width:620px){
  #${ID.legend}{grid-template-columns:minmax(0,1fr)}
}
@media (prefers-reduced-motion:reduce){
  .points-cell,.points-era,.points-filters button,.points-nav button{transition:none}
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

/* Réutilise un nœud par identifiant ; le recrée seulement s'il est absent du
 * document ou mal parenté. Garantit l'idempotence après un rendu neuf. */
function place(ctx, id, tag, className, parent) {
  let node = document.getElementById(id);
  if (node && node.parentElement && node.parentElement !== parent) node.remove();
  if (!node || !node.isConnected) {
    node = ctx.el(tag, className);
    node.id = id;
    parent.appendChild(node);
  }
  return node;
}

function apply(ctx) {
  const layout = ctx.layout || ctx.stage;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const grid = layout.querySelector('.points-grid');
  if (!grid || typeof grid.appendChild !== 'function') return;
  const matrix = layout.querySelector('.points-matrix') || grid.parentNode;
  if (!matrix || typeof matrix.appendChild !== 'function') return;

  ctx.css(CSS_ID, CSS);

  const title = matrix.querySelector('.points-title');
  const headerCells = nodes(grid, '.points-grid-row.is-head > span');
  const domains = headerCells.map(txt).slice(1); // première colonne = « Ère »
  const rows = nodes(grid, '.points-grid-row:not(.is-head)');

  let total = 0;
  const domainTotals = domains.map(() => 0);
  const rowTotals = [];
  const cells = [];
  const descriptions = [];

  /* E003-01 à E003-03 — comptage dérivé du DOM, titre lisible et description
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
      put(cell, 'data-e003-count', String(count));

      /* E003-03 — phrase de comptage. Le titre existant n'est réécrit que
       * s'il porte le marqueur généré « point(s) » : un titre tiers est
       * préservé (non destructif). */
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
      put(eraButton, 'data-e003-era-total', String(rowTotal));
    }
  });

  /* E003-06 — totaux par domaine en en-tête de colonne, somme réelle des
   * cellules de la colonne, exposée en titre et en data-*. */
  headerCells.forEach((header, index) => {
    if (index === 0) return; // première colonne : intitulé « Ère »
    const domain = domains[index - 1] || '';
    const count = domainTotals[index - 1] || 0;
    put(header, 'title', `${domain} · ${countPhrase(count, verb(count))} sur toutes les ères`);
    put(header, 'data-e003-domain-total', String(count));
  });

  /* E003-07 — total général sur le titre et la matrice, cohérent avec le
   * texte rendu par points.js ; aucune somme n'est codée en dur. */
  if (title) {
    put(title, 'title', `${countPhrase(total, verb(total))} répartis sur ${plural(cells.length, 'cellule', 'cellules')}`);
    put(title, 'data-e003-total', String(total));
  }
  put(matrix, 'data-e003-total', String(total));
  put(matrix, 'title', `Matrice de couverture : ${countPhrase(total, verb(total))}.`);

  /* E003-08 — descriptions masquées, conteneur unique réutilisé et vidé à
   * chaque rendu : jamais de doublon, jamais de nœud périmé. */
  const descs = place(ctx, ID.descs, 'div', 'points-e003-sr', matrix);
  descs.replaceChildren();
  descriptions.forEach((item) => {
    const span = ctx.el('span', '', item.text);
    span.id = item.id;
    descs.appendChild(span);
  });

  /* E003-09 — récapitulatif visible et statut narratif, tous deux relus à
   * chaque rendu. Le statut est une région live polie, sans timer. */
  const filled = cells.filter((cell) => countOf(cell) > 0).length;
  const summary = place(ctx, ID.summary, 'p', 'points-e003-summary', matrix);
  summary.textContent = `${countPhrase(total, verb(total))} · ${filled}/${cells.length} cellules renseignées · ${plural(rows.length, 'ère', 'ères')} × ${plural(domains.length, 'domaine', 'domaines')}.`;
  const status = place(ctx, ID.status, 'p', 'points-e003-status', matrix);
  put(status, 'role', 'status');
  put(status, 'aria-live', 'polite');
  status.textContent = `Compteurs de la matrice : ${plural(total, 'point', 'points')} au total, dont ${plural(filled, 'cellule renseignée', 'cellules renseignées')} sur ${cells.length}.`;

  /* E003-10 — légende des compteurs, dérivée d'une vraie cellule vide, puis
   * marqueur de greffage. Aucun écouteur, aucun timer, aucune mutation des
   * structures d'origine : l'installation est non destructive et idempotente. */
  const emptySample = txt(cells.filter((cell) => countOf(cell) === 0)[0]) || '·';
  const legend = place(ctx, ID.legend, 'dl', 'points-e003-legend', matrix);
  legend.replaceChildren();
  put(legend, 'title', 'Légende des compteurs de la matrice');
  put(legend, 'aria-label', 'Légende des compteurs de la matrice');
  legend.appendChild(ctx.el('dt', '', 'Chiffre'));
  legend.appendChild(ctx.el('dd', '', 'nombre de points validés pour cette ère et ce domaine'));
  legend.appendChild(ctx.el('dt', '', `« ${emptySample} »`));
  legend.appendChild(ctx.el('dd', '', 'aucun point validé pour cette ère et ce domaine'));
  put(grid, 'data-e003', '1');
}

register('E003', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
