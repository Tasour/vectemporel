import { register } from './registry.js';

/* Lentille POINTS E044 — Accessibilité & ARIA : grille en role=grid avec
 * en-têtes associés (domaine E).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E044.md — chantiers E044-01 à E044-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé (points.js,
 * registry.js, store.js, index.js) n'est édité.
 *
 * Contrat exploité : ctx.layout (repli ctx.stage), ctx.css, ctx.el tels que
 * fournis par runEnhancements (points.js:126). Toutes les valeurs sont
 * DÉRIVÉES DU DOM réellement rendu par points.js : `.points-grid`,
 * `.points-grid-row.is-head > span`, `.points-grid-row:not(.is-head)`,
 * `.points-era`, `.points-cell`, `.points-filters select`, `.points-title`,
 * `.points-detail`. Aucune donnée n'est inventée, aucun nœud déplacé, aucun
 * écouteur ajouté.
 *
 * Coexistence : E002 et E004 écrivent déjà sur `.points-grid` (aria-label /
 * aria-describedby / aria-details / aria-posinset / aria-setsize / data-e004-*).
 * E044 NE DÉTRUIT aucun de ces attributs : il promeut `role=group` en
 * `role=grid` (E044-01), complète `aria-describedby` par concatenation
 * (E044-07) et laisse intacts noms, rangs et marqueurs existants.
 *
 * Invariants :
 * - une seule feuille CSS, injectée par ctx.css('points-e044', …) ;
 * - tous les identifiants sont préfixés `points-e044-` et dérivés d'un index
 *   déterministe (jamais de tirage aléatoire) ;
 * - les références `aria-*` ajoutées sont dédupliquées puis réappliquées,
 *   ce qui rend le greffon idempotent après un rendu neuf ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*, zéro innerHTML ;
 * - une structure inattendue neutralise la lentille sans propager d'erreur.
 */

const CSS_ID = 'points-e044';

const ID = {
  desc: 'points-e044-grid-desc',      // instruction masquée de navigation
};

/* Feuille unique : aucun changement de mise en page (non destructif), seulement
 * des repères de focus, des cibles tactiles et le repli mouvement réduit. */
const CSS = `
.points-e044-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.points-grid[role="grid"] [role="columnheader"]{font-weight:600}
.points-grid[role="grid"] [role="rowheader"]:focus-visible,
.points-grid[role="grid"] [role="gridcell"]:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.points-grid[role="grid"] [role="gridcell"]{min-height:36px}
@media (prefers-reduced-motion:reduce){
  .points-grid[role="grid"] [role="rowheader"],
  .points-grid[role="grid"] [role="gridcell"]{transition:none}
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

function remove(node, name) {
  if (node && typeof node.removeAttribute === 'function') node.removeAttribute(name);
}

/* Concatène des références d'identifiants sans écraser les références déjà
 * posées par E002/E004. Les jetons `points-e044-` sont retirés puis réécrits :
 * c'est ce qui rend l'opération idempotente. */
function mergeRefs(node, attr, addIds) {
  if (!node || typeof node.getAttribute !== 'function') return;
  const previous = txt(node.getAttribute(attr)).split(/\s+/).filter(Boolean);
  const kept = previous.filter((token) => token.indexOf('points-e044-') !== 0);
  const merged = [];
  kept.concat(addIds).forEach((token) => {
    if (token && merged.indexOf(token) === -1) merged.push(token);
  });
  if (merged.length) put(node, attr, merged.join(' '));
  else remove(node, attr);
}

/* Réutilise un nœud par identifiant, exactement comme E004.place. */
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
  const head = grid.querySelector('.points-grid-row.is-head');
  if (!head) return;
  const headerCells = nodes(grid, '.points-grid-row.is-head > span');
  const rows = nodes(grid, '.points-grid-row:not(.is-head)');
  if (!headerCells.length || !rows.length) return;

  ctx.css(CSS_ID, CSS);

  /* Domaines et libellés d'ère : uniquement le texte rendu. La première
   * colonne (« Ère ») est la colonne des en-têtes de ligne. */
  const domains = headerCells.map(txt).slice(1);
  const colCount = headerCells.length;
  const rowCount = rows.length;

  /* E044-01 — Promotion de la matrice en grille ARIA. Le nom posé par E004
   * (aria-labelledby vers .points-title) est conservé ; un repli aria-label
   * n'est écrit que si aucun nom n'existe. aria-details et data-e004-* ne
   * sont pas touchés. */
  put(grid, 'role', 'grid');
  if (!txt(grid.getAttribute('aria-labelledby')) && !txt(grid.getAttribute('aria-label'))) {
    put(grid, 'aria-label', 'Matrice de couverture des points validés');
  }
  put(grid, 'data-e044', '1');

  /* E044-02 — La ligne d'en-tête devient une ligne ARIA ; chaque cellule
   * devient un columnheader muni d'un identifiant stable. Le libellé de
   * domaine est lu sur le texte réel de l'en-tête, jamais codé en dur. */
  put(head, 'role', 'row');
  headerCells.forEach((span, index) => {
    put(span, 'role', 'columnheader');
    put(span, 'id', `points-e044-col-${index}`);
    put(span, 'aria-colindex', String(index + 1));
  });

  /* E044-03 — Lignes, en-têtes de ligne et cellules. Les boutons natifs
   * conservent leurs écouteurs : le rôle n'affecte que l'arbre
   * d'accessibilité, pas le comportement d'activation. */
  rows.forEach((row, rowIndex) => {
    put(row, 'role', 'row');
    put(row, 'aria-rowindex', String(rowIndex + 2)); // +1 pour la ligne d'en-tête
    const era = row.querySelector('.points-era');
    if (era) put(era, 'role', 'rowheader');
    nodes(row, '.points-cell').forEach((cell) => put(cell, 'role', 'gridcell'));
  });

  /* E044-04 — Association des en-têtes. Chaque en-tête de ligne reçoit un
   * identifiant stable ; chaque cellule est décrite par son en-tête de ligne
   * et son en-tête de colonne, sans écraser l'aria-label calculé par E004. */
  rows.forEach((row, rowIndex) => {
    const era = row.querySelector('.points-era');
    if (era) put(era, 'id', `points-e044-row-${rowIndex}`);
    nodes(row, '.points-cell').forEach((cell, colIndex) => {
      put(cell, 'id', `points-e044-cell-${rowIndex}-${colIndex}`);
      mergeRefs(cell, 'aria-describedby', [
        `points-e044-row-${rowIndex}`,
        `points-e044-col-${colIndex + 1}`,
      ]);
      put(cell, 'aria-colindex', String(colIndex + 1));
      put(cell, 'data-e044-era', txt(era) || '');
      put(cell, 'data-e044-domain', domains[colIndex] || '');
    });
  });

  /* E044-05 — Dimensions de la grille, recomputées depuis le DOM rendu :
   * lignes = ères, colonnes = domaines + la colonne « Ère ». */
  put(grid, 'aria-rowcount', String(rowCount + 1));
  put(grid, 'aria-colcount', String(colCount));
  put(grid, 'data-e044-rows', String(rowCount));
  put(grid, 'data-e044-cols', String(domains.length));

  /* E044-06 — État de sélection dérivé de signaux déjà présents : l'ère
   * courante (`.is-active`) et le domaine filtré (1er select des filtres).
   * Aucun état n'est inventé ni mémorisé entre les rendus. */
  const filter = layout.querySelector('.points-filters select');
  const activeDomain = filter ? txt(filter.value) : '';
  const activeRow = rows.filter((row) => row.classList.contains('is-active'))[0] || null;
  rows.forEach((row) => {
    const era = row.querySelector('.points-era');
    const selected = row === activeRow;
    put(row, 'aria-selected', String(selected));
    if (era) put(era, 'aria-selected', String(selected));
    put(row, 'data-e044-selected', selected ? 'true' : 'false');
  });
  headerCells.forEach((span, index) => {
    put(span, 'aria-selected', String(index > 0 && domains[index - 1] === activeDomain));
  });

  /* E044-07 — Instruction de navigation ajoutée à la description existante.
   * mergeRefs préserve aria-describedby de E002/E004 et ne duplique pas
   * l'identifiant E044 au fil des rendus. */
  const desc = place(ctx, ID.desc, 'p', 'points-e044-sr', grid.parentNode || layout);
  desc.textContent = 'Grille de couverture : chaque ligne est une ère, chaque colonne un domaine. La première colonne porte les noms d’ères, la ligne d’en-tête les noms de domaines ; chaque cellule est associée à son ère et à son domaine.';
  mergeRefs(grid, 'aria-describedby', [ID.desc]);

  /* E044-08 — Relation grille → détail conservée. E004 pose déjà
   * aria-details ; E044 ne le réécrit que s'il manque, afin de garder la
   * fiche de point associée à la grille même si E004 n'a pas pu s'exécuter. */
  const detail = layout.querySelector('.points-detail');
  if (detail) {
    if (!detail.id) detail.id = 'points-e044-detail';
    if (!txt(grid.getAttribute('aria-details'))) put(grid, 'aria-details', detail.id);
    nodes(grid, '.points-cell').forEach((cell) => {
      if (!txt(cell.getAttribute('aria-controls'))) put(cell, 'aria-controls', detail.id);
    });
  }

  /* E044-09 — Feuille CSS dédiée : focus visible sur rowheader/gridcell,
   * cibles tactiles ≥ 36 px, mouvement réduit neutralisé. Aucune règle ne
   * modifie la grille CSS existante de points.js/E001. */
  /* Voir CSS en tête de module (ctx.css appelé une seule fois, ci-dessus). */

  /* E044-10 — Traçabilité du greffage : compteurs dérivés du DOM, aucun
   * écouteur, aucun timer, aucune rAF. Les identifiants stables et mergeRefs
   * garantissent l'idempotence après navigation aller-retour. */
  put(grid, 'data-e044-cells', String(nodes(grid, '.points-cell').length));
  put(grid, 'data-e044-ready', '1');
}

register('E044', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
