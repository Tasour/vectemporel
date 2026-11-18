import { register } from './registry.js';

/* Lentille POINTS E004 — Matrice & grille : ligne de l'ère courante repérée.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E004.md — chantiers E004-01 à E004-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité.
 *
 * Contrat exploité : ctx.layout (et, en repli, ctx.stage) fourni par
 * runEnhancements({ viewId, stage, layout }) dans src/views/points.js. Toutes
 * les valeurs affichées sont DÉRIVÉES DU DOM rendu par points.js : ères
 * (`.points-grid-row` actives), domaines (en-tête de `.points-grid`), cellules
 * (`.points-cell` / `.has-points`), titre (`.points-title`) et détail
 * (`.points-detail`). Aucune donnée n'est inventée, aucune cellule n'est
 * déplacée, aucun écouteur n'est ajouté.
 *
 * Invariants :
 * - une seule feuille CSS, injectée par ctx.css('points-e004', …) ;
 * - tous les identifiants sont préfixés `points-e004-` ;
 * - une seule ligne déclarée courante, par aria-current + données + repère
 *   visuel CSS, sans modifier les classes `is-active` / `has-points` ;
 * - aucune écriture `innerHTML`, aucun timer, aucune rAF, aucun réseau,
 *   aucun aléa, aucun `console.*` ;
 * - greffon idempotent : les nœuds ajoutés sont réutilisés par identifiant,
 *   jamais dupliqués ; une structure inattendue neutralise la lentille.
 */

const CSS_ID = 'points-e004';

const ID = {
  title: 'points-e004-title',       // posé sur .points-title existant
  desc: 'points-e004-grid-desc',     // description masquée de la matrice
  summary: 'points-e004-summary',    // résumé chiffré visible
  legend: 'points-e004-legend',      // légende des symboles
  status: 'points-e004-status',      // statut narratif (role=status)
  eraList: 'points-e004-era-list',   // lecture linéaire des ères (masquée)
  detail: 'points-e004-detail',      // posé sur .points-detail existant
  note: 'points-e004-note',          // note matrice → détail (masquée)
};

/* Feuille unique. Les règles ne visent que les ancres `points-e004-` ou les
 * classes déjà rendues par points.js : aucune fuite, aucune ressource
 * externe, aucune animation, cibles tactiles ≥ 36 px et focus visible. */
const CSS = `
.points-e004-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.points-grid-row[data-e004-current="true"] .points-era{font-weight:700;text-decoration:underline;text-underline-offset:3px}
.points-grid-row[data-e004-current="true"] .points-era::before{content:"\\25B6 ";color:var(--gold-bright)}
.points-era:focus-visible,.points-cell:focus-visible,
.points-filters select:focus-visible,.points-filters button:focus-visible,
.points-nav button:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.points-era,.points-cell{min-height:36px}
#${ID.summary}{margin:8px 0 0;color:var(--gold);font-size:10px;font-variant-numeric:tabular-nums}
#${ID.legend}{margin:8px 0 0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 8px;font-size:9px;line-height:1.5;color:var(--muted-2)}
#${ID.legend} dt{color:var(--muted);font-weight:600}
#${ID.legend} dd{margin:0}
#${ID.status}{margin:8px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5}
@media (max-width:620px){
  #${ID.legend}{grid-template-columns:minmax(0,1fr)}
}
@media (prefers-reduced-motion:reduce){
  .points-era,.points-cell,.points-filters button,.points-nav button{transition:none}
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
  const raw = txt(era);
  return raw;
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
  const activeRow = rows.filter((row) => row.classList.contains('is-active'))[0] || null;
  const activeName = activeRow ? eraNameOf(activeRow) : '';
  const cells = nodes(grid, '.points-cell');
  const filled = cells.filter((cell) => cell.classList.contains('has-points')).length;

  /* E004-01 — La matrice devient un groupe nommé par le titre rendu et
   * décrit par un paragraphe masqué ; aucun rôle de grille n'est imposé aux
   * boutons existants. */
  if (title && !title.id) title.id = ID.title;
  put(grid, 'role', 'group');
  if (title) put(grid, 'aria-labelledby', ID.title);
  else put(grid, 'aria-label', 'Matrice de couverture des points validés');
  const desc = place(ctx, ID.desc, 'p', 'points-e004-sr', matrix);
  desc.textContent = 'Chaque ligne est une ère, chaque colonne un domaine. Une cellule donne le nombre de points validés ; la ligne de l’ère courante est signalée par « ère courante » et le repère ▶.';
  put(grid, 'aria-describedby', ID.desc);

  /* E004-02 — Repérage explicite et unique de la ligne de l'ère courante :
   * aria-current, signal de données et style CSS. Les classes d'origine ne
   * sont jamais retirées. */
  rows.forEach((row) => {
    const isCurrent = row === activeRow;
    put(row, 'data-e004-current', isCurrent ? 'true' : 'false');
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
      put(cell, 'data-e004-era', name);
      put(cell, 'data-e004-domain', domain);
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
  put(grid, 'data-e004-rows', String(rows.length));
  put(grid, 'data-e004-cols', String(domains.length));
  put(grid, 'data-e004-cells', String(cells.length));

  /* E004-05 — Résumé chiffré, entièrement recomputé depuis le DOM. */
  const summary = place(ctx, ID.summary, 'p', 'points-e004-summary', matrix);
  summary.textContent = plural(rows.length, 'ère', 'ères')
    + ' × ' + plural(domains.length, 'domaine', 'domaines')
    + ' · ' + filled + '/' + cells.length + ' cellules renseignées.';

  /* E004-06 — Légende des symboles : l'ère courante et un exemple de
   * cellule vide sont lus sur la matrice elle-même. */
  const emptySample = txt(cells.filter((cell) => !cell.classList.contains('has-points'))[0]) || '·';
  const legend = place(ctx, ID.legend, 'dl', 'points-e004-legend', matrix);
  legend.replaceChildren();
  legend.appendChild(ctx.el('dt', '', 'Ligne courante'));
  legend.appendChild(ctx.el('dd', '', activeName || 'aucune ère repérée'));
  legend.appendChild(ctx.el('dt', '', 'Cellule renseignée'));
  legend.appendChild(ctx.el('dd', '', 'chiffre = nombre de points validés'));
  legend.appendChild(ctx.el('dt', '', 'Cellule vide'));
  legend.appendChild(ctx.el('dd', '', `« ${emptySample} » = aucun point pour cette ère et ce domaine`));

  /* E004-07 — Statut narratif de la ligne courante, relu à chaque rendu. */
  const status = place(ctx, ID.status, 'p', 'points-e004-status', matrix);
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
  const eraList = place(ctx, ID.eraList, 'ol', 'points-e004-era-list points-e004-sr', matrix);
  eraList.replaceChildren();
  put(eraList, 'aria-label', 'Ères de la matrice, dans leur ordre');
  rows.forEach((row, index) => {
    const item = ctx.el('li', '', `Ère ${index + 1} sur ${rows.length} : ${eraNameOf(row) || 'sans nom'}`);
    if (row === activeRow) put(item, 'aria-current', 'true');
    eraList.appendChild(item);
  });

  /* E004-09 — Relation matrice → détail : identifiant stable sur le détail,
   * description complétée et commande de l'ère courante pointant vers lui. */
  const detail = layout.querySelector('.points-detail');
  if (detail) {
    if (!detail.id) detail.id = ID.detail;
    put(grid, 'aria-details', ID.detail);
    put(grid, 'aria-describedby', `${ID.desc} ${ID.note}`);
    const note = place(ctx, ID.note, 'p', 'points-e004-note points-e004-sr', matrix);
    note.textContent = 'Un clic sur une cellule filtre le détail par ère et par domaine ; la ligne de l’ère courante est signalée par « ère courante ».';
    if (activeRow) {
      const era = activeRow.querySelector('.points-era');
      if (era) put(era, 'aria-controls', ID.detail);
    }
  }

  /* E004-10 — Marqueur stable de greffage : aucun compteur incrémenté, aucun
   * écouteur, aucun timer. La feuille (focus visible, 620 px, mouvement
   * réduit) et les identifiants rendent l'installation idempotente. */
  put(grid, 'data-e004', '1');
}

register('E004', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
