import { register } from './registry.js';

/* Lentille POINTS E004 — passe 2 (V2) — Matrice & grille : ligne de l'ère
 * courante repérée, version autonome et préfixée.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E004.md — chantiers E004-01 à E004-10.
 * Fichier possédé : ce module V2 uniquement. Aucun fichier de la passe 1
 * (`src/views/points/E004.js`) ni aucun fichier partagé (`points.js`,
 * `registry.js`, `store.js`, `index.js`) n'est édité.
 *
 * Contrat exploité : ctx.viewId ('pointsv2'), ctx.stage et ctx.layout fournis
 * par runEnhancements({ viewId, stage, layout }) dans src/views/points.js,
 * ainsi que ctx.css, ctx.el et ctx.reducedMotion() fournis par registry.js.
 * Toutes les valeurs affichées sont DÉRIVÉES DU DOM rendu par points.js : ères
 * (`.points-grid-row` dont l'unique `.is-active`), domaines (en-tête de
 * `.points-grid`), cellules (`.points-cell` / `.has-points`), titre
 * (`.points-title`) et détail (`.points-detail`). Aucune donnée n'est
 * inventée, aucune cellule n'est déplacée, aucun écouteur n'est ajouté.
 *
 * Invariants V2 :
 * - une seule feuille CSS, injectée par ctx.css('points-v2-e004', …) ;
 * - TOUTES les règles CSS sont préfixées par `.points-v2-e004` (classe posée
 *   sur `.points-matrix`, ancêtre de toute la sous-arborescence ciblée) ;
 * - tous les identifiants CRÉÉS sont préfixés `points-v2-e004-` ; les id des
 *   nœuds existants (`.points-title`, `.points-detail`) sont réutilisés s'ils
 *   existent déjà (coexistence avec la passe 1) ;
 * - garde anti-doublon : chaque nœud créé est réutilisé par identifiant via
 *   `place` ; la classe racine n'est posée qu'une fois ;
 * - une seule ligne déclarée courante, par aria-current + données +
 *   repère visuel CSS, sans modifier les classes `is-active` / `has-points` ;
 * - aucune écriture de balisage par chaîne, aucun minuteur, aucune boucle
 *   d'animation, aucun réseau, aucun aléa, aucun journal, aucun écouteur global ;
 * - greffon idempotent et tolérant : une structure inattendue neutralise la
 *   lentille sans propager d'exception.
 */

const CSS_ID = 'points-v2-e004';

const ID = {
  name: 'points-v2-e004-name',         // repli sur .points-title si sans id
  desc: 'points-v2-e004-grid-desc',    // description masquée de la matrice
  summary: 'points-v2-e004-summary',   // résumé chiffré visible
  legend: 'points-v2-e004-legend',     // légende des symboles
  status: 'points-v2-e004-status',     // statut narratif (role=status)
  eraList: 'points-v2-e004-era-list',  // lecture linéaire des ères (masquée)
  detail: 'points-v2-e004-detail',     // repli sur .points-detail si sans id
  note: 'points-v2-e004-note',         // note matrice → détail (masquée)
};

/* Feuille unique. Chaque sélecteur est préfixé par `.points-v2-e004`, classe
 * portée par `.points-matrix` : aucune fuite hors de la lentille, aucune
 * ressource externe, cibles tactiles ≥ 36 px, focus visible. Le mouvement est
 * piloté par ctx.reducedMotion() via l'attribut data-v2-e004-motion, avec un
 * repli CSS `@media (prefers-reduced-motion: reduce)`. */
const CSS = `
.points-v2-e004 .points-v2-e004-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.points-v2-e004 .points-grid-row[data-v2-e004-current="true"] .points-era{font-weight:700;text-decoration:underline;text-underline-offset:3px}
.points-v2-e004 .points-grid-row[data-v2-e004-current="true"] .points-era::before{content:"\\25B6 ";color:var(--gold-bright)}
.points-v2-e004 .points-era:focus-visible,
.points-v2-e004 .points-cell:focus-visible,
.points-v2-e004 .points-filters select:focus-visible,
.points-v2-e004 .points-filters button:focus-visible,
.points-v2-e004 .points-nav button:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.points-v2-e004 .points-era,
.points-v2-e004 .points-cell{min-height:36px}
.points-v2-e004 #points-v2-e004-summary{margin:8px 0 0;color:var(--gold);font-size:10px;font-variant-numeric:tabular-nums}
.points-v2-e004 #points-v2-e004-legend{margin:8px 0 0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 8px;font-size:9px;line-height:1.5;color:var(--muted-2)}
.points-v2-e004 #points-v2-e004-legend dt{color:var(--muted);font-weight:600}
.points-v2-e004 #points-v2-e004-legend dd{margin:0}
.points-v2-e004 #points-v2-e004-status{margin:8px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5}
.points-v2-e004[data-v2-e004-motion="full"] .points-era{transition:color .15s ease,text-decoration-color .15s ease}
.points-v2-e004[data-v2-e004-motion="reduced"] .points-era{transition:none}
@media (max-width:620px){
  .points-v2-e004 #points-v2-e004-legend{grid-template-columns:minmax(0,1fr)}
}
@media (prefers-reduced-motion:reduce){
  .points-v2-e004 .points-era,
  .points-v2-e004 .points-cell,
  .points-v2-e004 .points-filters button,
  .points-v2-e004 .points-nav button{transition:none}
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

function eraNameOf(row) {
  const era = row.querySelector('.points-era');
  return txt(era);
}

function apply(ctx) {
  /* ctx.layout est la racine fournie par points.js ; ctx.stage sert de repli
   * si le layout manque (structure inattendue neutralisée plus bas). */
  const scope = ctx.layout || ctx.stage;
  if (!scope || typeof scope.querySelector !== 'function') return;
  const grid = scope.querySelector('.points-grid');
  if (!grid || typeof grid.appendChild !== 'function') return;
  const matrix = scope.querySelector('.points-matrix') || grid.parentNode;
  if (!matrix || typeof matrix.appendChild !== 'function') return;

  ctx.css(CSS_ID, CSS);

  /* Ancre CSS unique : toutes les règles sont préfixées par cette classe. */
  if (!matrix.classList.contains(CSS_ID)) matrix.classList.add(CSS_ID);

  /* Exploitation de ctx.viewId : trace stable sur la grille. */
  put(grid, 'data-v2-e004-view', txt(ctx.viewId) || 'pointsv2');

  /* Exploitation de ctx.reducedMotion() : pilote l'attribut data reflété par
   * la feuille (aucune animation Under reduce). */
  let reduced = false;
  try { reduced = Boolean(ctx.reducedMotion && ctx.reducedMotion()); } catch { reduced = false; }
  put(matrix, 'data-v2-e004-motion', reduced ? 'reduced' : 'full');

  const title = matrix.querySelector('.points-title');
  const headerCells = nodes(grid, '.points-grid-row.is-head > span');
  const domains = headerCells.map(txt).slice(1); // première colonne = « Ère »
  const rows = nodes(grid, '.points-grid-row:not(.is-head)');
  const activeRow = rows.filter((row) => row.classList.contains('is-active'))[0] || null;
  const activeName = activeRow ? eraNameOf(activeRow) : '';
  const cells = nodes(grid, '.points-cell');
  const filled = cells.filter((cell) => cell.classList.contains('has-points')).length;

  /* E004-01 — La matrice devient un groupe nommé par le titre rendu et
   * décrit par un paragraphe masqué ; aucun rôle de grille n'est imposé aux
   * boutons existants. L'id du titre est réutilisé si la passe 1 l'a déjà
   * posé, afin de ne pas casser son aria-labelledby. */
  const titleId = title ? (title.id || ID.name) : ID.name;
  if (title && !title.id) title.id = titleId;
  put(grid, 'role', 'group');
  put(grid, 'aria-labelledby', titleId);
  const desc = place(ctx, ID.desc, 'p', 'points-v2-e004-sr', matrix);
  desc.textContent = 'Chaque ligne est une ère, chaque colonne un domaine. Une cellule donne le nombre de points validés ; la ligne de l’ère courante est signalée par « ère courante » et le repère ▶.';
  put(grid, 'aria-describedby', ID.desc);

  /* E004-02 — Repérage explicite et unique de la ligne de l'ère courante :
   * aria-current, signal de données V2 et style CSS. Les classes d'origine ne
   * sont jamais retirées. */
  rows.forEach((row) => {
    const isCurrent = row === activeRow;
    put(row, 'data-v2-e004-current', isCurrent ? 'true' : 'false');
    const era = row.querySelector('.points-era');
    if (!era) return;
    if (isCurrent) put(era, 'aria-current', 'true');
    else if (era.hasAttribute('aria-current')) era.removeAttribute('aria-current');
  });

  /* E004-03 — Étiquettes contextuelles des cellules, dérivées de l'ère et
   * du domaine réellement rendus ; les cellules vides sont nommées. */
  rows.forEach((row) => {
    const name = eraNameOf(row);
    nodes(row, '.points-cell').forEach((cell, index) => {
      const domain = domains[index] || '';
      const value = txt(cell);
      const empty = !cell.classList.contains('has-points');
      const label = empty
        ? `${name} · ${domain} : aucun point validé`
        : `${name} · ${domain} : ${value} point${value === '1' ? '' : 's'} validé${value === '1' ? '' : 's'}`;
      put(cell, 'aria-label', label);
      put(cell, 'data-v2-e004-era', name);
      put(cell, 'data-v2-e004-domain', domain);
    });
  });

  /* E004-04 — Rangs ARIA et dimensions de la matrice, calculés depuis le
   * nombre réel de lignes et de colonnes. */
  rows.forEach((row, rowIndex) => {
    const era = row.querySelector('.points-era');
    if (era) {
      put(era, 'aria-posinset', String(rowIndex + 1));
      put(era, 'aria-setsize', String(rows.length));
      put(era, 'aria-label', `Ère ${rowIndex + 1} sur ${rows.length} : ${eraNameOf(row) || 'sans nom'}${row === activeRow ? ' (ère courante)' : ''}`);
    }
    nodes(row, '.points-cell').forEach((cell, cellIndex, list) => {
      put(cell, 'aria-posinset', String(cellIndex + 1));
      put(cell, 'aria-setsize', String(list.length));
    });
  });
  put(grid, 'data-v2-e004-rows', String(rows.length));
  put(grid, 'data-v2-e004-cols', String(domains.length));
  put(grid, 'data-v2-e004-cells', String(cells.length));

  /* E004-05 — Résumé chiffré, entièrement recomputé depuis le DOM. */
  const summary = place(ctx, ID.summary, 'p', 'points-v2-e004-summary', matrix);
  summary.textContent = plural(rows.length, 'ère', 'ères')
    + ' × ' + plural(domains.length, 'domaine', 'domaines')
    + ' · ' + filled + '/' + cells.length + ' cellules renseignées.';

  /* E004-06 — Légende des symboles : l'ère courante et un exemple de cellule
   * vide sont lus sur la matrice elle-même. */
  const emptySample = txt(cells.filter((cell) => !cell.classList.contains('has-points'))[0]) || '·';
  const legend = place(ctx, ID.legend, 'dl', 'points-v2-e004-legend', matrix);
  legend.replaceChildren();
  legend.appendChild(ctx.el('dt', '', 'Ligne courante'));
  legend.appendChild(ctx.el('dd', '', activeName || 'aucune ère repérée'));
  legend.appendChild(ctx.el('dt', '', 'Cellule renseignée'));
  legend.appendChild(ctx.el('dd', '', 'chiffre = nombre de points validés'));
  legend.appendChild(ctx.el('dt', '', 'Cellule vide'));
  legend.appendChild(ctx.el('dd', '', `« ${emptySample} » = aucun point pour cette ère et ce domaine`));

  /* E004-07 — Statut narratif de la ligne courante, relu à chaque rendu. */
  const status = place(ctx, ID.status, 'p', 'points-v2-e004-status', matrix);
  put(status, 'role', 'status');
  put(status, 'aria-live', 'polite');
  if (activeRow) {
    const activeCells = nodes(activeRow, '.points-cell');
    const activeFilled = activeCells.filter((cell) => cell.classList.contains('has-points')).length;
    status.textContent = `Ère courante : ${activeName || 'sans nom'} · ${plural(activeFilled, 'domaine renseigné', 'domaines renseignés')} sur ${activeCells.length}.`;
  } else {
    status.textContent = 'Aucune ère courante repérée dans la matrice.';
  }

  /* E004-08 — Lecture linéaire des ères pour les technologies d'assistance,
   * dans l'ordre réel des lignes, avec l'ère courante marquée. */
  const eraList = place(ctx, ID.eraList, 'ol', 'points-v2-e004-era-list points-v2-e004-sr', matrix);
  eraList.replaceChildren();
  put(eraList, 'aria-label', 'Ères de la matrice, dans leur ordre');
  rows.forEach((row, index) => {
    const item = ctx.el('li', '', `Ère ${index + 1} sur ${rows.length} : ${eraNameOf(row) || 'sans nom'}`);
    if (row === activeRow) put(item, 'aria-current', 'true');
    eraList.appendChild(item);
  });

  /* E004-09 — Relation matrice → détail : identifiant stable sur le détail,
   * description complétée et commande de l'ère courante pointant vers lui. */
  const detail = scope.querySelector('.points-detail');
  if (detail) {
    const detailId = detail.id || ID.detail;
    if (!detail.id) detail.id = detailId;
    put(grid, 'aria-details', detailId);
    put(grid, 'aria-describedby', `${ID.desc} ${ID.note}`);
    const note = place(ctx, ID.note, 'p', 'points-v2-e004-note points-v2-e004-sr', matrix);
    note.textContent = 'Un clic sur une cellule filtre le détail par ère et par domaine ; la ligne de l’ère courante est signalée par « ère courante ».';
    if (activeRow) {
      const era = activeRow.querySelector('.points-era');
      if (era) put(era, 'aria-controls', detailId);
    }
  }

  /* E004-10 — Marqueur stable de greffage : aucun compteur incrémenté, aucun
   * écouteur, aucun timer. La feuille (focus visible, 620 px, mouvement
   * réduit), la classe racine et les identifiants rendent l'installation
   * idempotente. */
  put(grid, 'data-v2-e004', '1');
}

register('E004', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
