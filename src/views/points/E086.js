import { register } from './registry.js';

/* Lentille E086 — I. Qualité & validation : table de bord locale des dix
 * chantiers E086-01 à E086-10, déclarés visiblement dans la vue Points.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E086.md — chantiers E086-01 à E086-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (tels que
 * fournis par points/registry.js:28-44). Toutes les mesures affichées sont
 * DÉRIVÉES DU DOM rendu par points.js : aucun chiffre historique, aucune
 * donnée inventée, aucun appel réseau, aucune dépendance vers le store.
 *
 * Invariants :
 * - une seule feuille CSS (cssOnce) et une seule table de bord par rendu ;
 * - tous les identifiants sont préfixés `points-e086-` ; la table est ancrée
 *   dans `.points-matrix` pour rester visible hors mode diagnostic ;
 * - aucun écouteur, aucun timer, aucune boucle d'animation, aucun observateur ;
 * - non destructif : aucun nœud existant n'est retiré ni réécrit, seuls des
 *   attributs de données préfixés sont ajoutés ;
 * - zéro journalisation, zéro réinterprétation de balisage, zéro aléa.
 */

const CSS_ID = 'points-e086';
const BOARD_ID = 'points-e086-board';
const TITLE_ID = 'points-e086-title';
const TABLE_ID = 'points-e086-table';
const SUMMARY_ID = 'points-e086-summary';

/* E086-02 : manifeste figé, source unique de la table visible. Chaque entrée
 * porte un code, un objet et un critère vérifiable par relecture du DOM. */
const CHANTIERS = Object.freeze([
  Object.freeze({
    code: 'E086-01',
    objet: 'Ancrage unique du tableau de bord',
    critere: 'Une seule region nommée, ancrée dans .points-matrix.',
  }),
  Object.freeze({
    code: 'E086-02',
    objet: 'Manifeste figé des dix chantiers',
    critere: 'Dix entrées figées, source unique des lignes de la table.',
  }),
  Object.freeze({
    code: 'E086-03',
    objet: 'Table sémantique à quatre colonnes',
    critere: 'Caption masquée, th scope=col et th scope=row présents.',
  }),
  Object.freeze({
    code: 'E086-04',
    objet: 'État textuel par chantier',
    critere: '« déclaré » lisible sans couleur, aria-label sur chaque état.',
  }),
  Object.freeze({
    code: 'E086-05',
    objet: "Contrôle d'intégrité des ancres",
    critere: 'Ancre absente : lentille neutralisée sans aucune écriture.',
  }),
  Object.freeze({
    code: 'E086-06',
    objet: 'Mesures recomputées depuis la matrice',
    critere: 'Ères, domaines et cellules relus sur le DOM rendu.',
  }),
  Object.freeze({
    code: 'E086-07',
    objet: 'Résumé annoncé une seule fois',
    critere: 'role=status, aria-live=polite, garde anti-écriture redondante.',
  }),
  Object.freeze({
    code: 'E086-08',
    objet: 'Traçabilité préfixée, non destructif',
    critere: 'Attributs data-points-e086-*, aucun nœud existant retiré.',
  }),
  Object.freeze({
    code: 'E086-09',
    objet: 'Accessibilité et mouvement réduit',
    critere: 'Focus visible, repli 620 px, miroir d’état de mouvement.',
  }),
  Object.freeze({
    code: 'E086-10',
    objet: 'Greffage idempotent et silencieux',
    critere: 'Un seul CSS, aucun écouteur, timer, rAF ni observateur.',
  }),
]);

/* Feuille unique, injectée par cssOnce (registry.js:13-19). Toutes les règles
 * sont portées par la classe de la table ou par ses identifiants préfixés :
 * aucune fuite hors de la vue Points, aucune ressource externe, aucune
 * animation. Les colonnes se replient en défilement horizontal sous 620 px. */
const CSS = `
  .${BOARD_ID} {
    margin: 12px 0 0; padding: 12px 14px;
    border: 1px solid var(--line-strong, #5b5b5b);
    border-left: 3px solid var(--gold, #e6b96f);
    border-radius: 10px; background: rgba(8, 11, 16, .94);
    color: var(--ink-soft, #d8d8d8); font-size: 12px; line-height: 1.45;
  }
  #${TITLE_ID} {
    margin: 0 0 8px; font-family: var(--serif, serif);
    font-size: 15px; color: var(--gold-bright, #e9c98f);
  }
  .points-e086-line { margin: 0 0 6px; }
  #${SUMMARY_ID} {
    color: var(--gold, #e6b96f); font-variant-numeric: tabular-nums;
  }
  .points-e086-integrity,
  .points-e086-access,
  .points-e086-unique { color: var(--muted-2, #9a9a9a); font-size: 11px; }
  .points-e086-sr {
    position: absolute !important; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
  #${TABLE_ID} {
    width: 100%; margin: 8px 0; border-collapse: collapse; font-size: 11px;
  }
  #${TABLE_ID} th, #${TABLE_ID} td {
    padding: 6px 8px; border-bottom: 1px solid var(--line-strong, #5b5b5b);
    text-align: left; vertical-align: top;
  }
  #${TABLE_ID} thead th {
    color: var(--gold-bright, #e9c98f); font-size: 10px; letter-spacing: .02em;
  }
  #${TABLE_ID} tbody th {
    color: var(--muted-2, #9a9a9a); font-weight: 600; white-space: nowrap;
  }
  .points-e086-ok { color: var(--gold-bright, #e9c98f); font-weight: 600; }
  .points-e086-note {
    margin: 8px 0 0; color: var(--muted-2, #9a9a9a);
    font-size: 10px; font-style: italic;
  }
  .${BOARD_ID} :focus-visible {
    outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 2px;
  }
  @media (max-width: 620px) {
    .${BOARD_ID} { padding: 10px; }
    #${TABLE_ID} { display: block; overflow-x: auto; white-space: nowrap; }
  }
  @media (prefers-reduced-motion: reduce) {
    .${BOARD_ID}, #${TABLE_ID} th, #${TABLE_ID} td { transition: none; }
  }
`;

function textOf(node) {
  return node && typeof node.textContent === 'string' ? node.textContent.trim() : '';
}

/* E086-07 : garde anti-écriture redondante sur le résumé live. */
function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function count(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? root.querySelectorAll(selector).length : 0;
}

function sumCells(root, selector) {
  let total = 0;
  if (!root || typeof root.querySelectorAll !== 'function') return total;
  root.querySelectorAll(selector).forEach((cell) => {
    const value = parseInt(textOf(cell), 10);
    if (Number.isFinite(value) && value > 0) total += value;
  });
  return total;
}

function motionOf(ctx) {
  if (ctx && typeof ctx.reducedMotion === 'function') {
    try { return !!ctx.reducedMotion(); }
    catch { /* repli ci-dessous */ }
  }
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

/* E086-06 : chaque nombre est recalculé depuis la matrice et le détail rendus.
 * Aucun millésime ni total n'est écrit en dur dans le module. */
function measures(matrix, detail) {
  const headCells = count(matrix, '.points-grid-row.is-head > span');
  const kicker = detail ? detail.querySelector('.view-kicker') : null;
  let visible = parseInt(textOf(kicker), 10);
  if (!Number.isFinite(visible) || visible < 0) visible = -1;
  if (visible < 0) visible = sumCells(matrix, '.points-grid-row.is-active .points-cell.has-points');
  return {
    eras: count(matrix, '.points-grid-row:not(.is-head)'),
    domains: Math.max(0, headCells - 1),
    cells: count(matrix, '.points-cell'),
    filled: count(matrix, '.points-cell.has-points'),
    visible,
  };
}

/* E086-05 : la ligne d'intégrité est dérivée de la présence réelle des ancres.
 * Le minimum requis (layout, matrix, title, grid) est vérifié AVANT écriture. */
function integrityLine(anchors) {
  const names = [
    ['layout', 'disposition'], ['matrix', 'matrice'],
    ['title', 'titre'], ['grid', 'grille'], ['detail', 'détail'],
  ];
  return `Ancres requises : ${names.map(([key, label]) => `${label} ${anchors[key] ? '✓' : 'absent'}`).join(' · ')}.`;
}

/* E086-03 : la table est construite par nœuds créés via ctx.el, jamais par
 * réinterprétation de balisage. Le manifeste figé en est l'unique source. */
function buildTable(ctx, table) {
  table.replaceChildren();
  const caption = ctx.el('caption', 'points-e086-sr',
    'Déclaration des dix chantiers E086-01 à E086-10 et de leur critère vérifiable.');
  table.appendChild(caption);

  const thead = ctx.el('thead');
  const headRow = ctx.el('tr');
  ['Chantier', 'Objet', 'Critère vérifiable', 'État'].forEach((label) => {
    const th = ctx.el('th', '', label);
    th.setAttribute('scope', 'col');
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = ctx.el('tbody');
  CHANTIERS.forEach((item, index) => {
    const row = ctx.el('tr');
    /* E086-08 : trace préfixée et lisible par les autres lentilles. */
    row.setAttribute('data-points-e086-step', String(index + 1).padStart(2, '0'));
    const th = ctx.el('th', '', item.code);
    th.setAttribute('scope', 'row');
    row.appendChild(th);
    row.appendChild(ctx.el('td', '', item.objet));
    row.appendChild(ctx.el('td', '', item.critere));
    /* E086-04 : état textuel, doublé d'un libellé accessible ; aucune
     * information n'est portée par la seule couleur. */
    const state = ctx.el('td');
    const flag = ctx.el('span', 'points-e086-ok', '✓ déclaré');
    flag.setAttribute('aria-label', `${item.code} : déclaré dans cette table de bord locale`);
    state.appendChild(flag);
    row.appendChild(state);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  return tbody.children.length;
}

/* E086-01/07/09 : structure statique reconstruite une seule fois par rendu.
 * Le résumé est le seul nœud live ; il n'est pas masqué par un hidden. */
function buildBoard(ctx, board, model) {
  board.replaceChildren();
  board.setAttribute('role', 'region');
  board.setAttribute('aria-labelledby', TITLE_ID);
  board.dataset.pointsE086 = '1';
  board.dataset.pointsE086Motion = model.motion ? 'reduce' : 'normal';

  const title = ctx.el('h2', '', 'Table de bord — qualité & validation (E086)');
  title.id = TITLE_ID;
  board.appendChild(title);

  const summary = ctx.el('p', 'points-e086-line');
  summary.id = SUMMARY_ID;
  summary.setAttribute('role', 'status');
  summary.setAttribute('aria-live', 'polite');
  summary.setAttribute('aria-atomic', 'true');
  board.appendChild(summary);

  board.appendChild(ctx.el('p', 'points-e086-line points-e086-integrity', model.integrity));
  board.appendChild(ctx.el('p', 'points-e086-line points-e086-access',
    `Accessibilité : focus visible · repli à 620 px · mouvement ${model.motion ? 'réduit, transition neutralisée' : 'normal'}.`));

  const table = ctx.el('table', 'points-e086-board-table');
  table.id = TABLE_ID;
  board.appendChild(table);
  const declared = buildTable(ctx, table);
  /* Le résumé est écrit APRÈS la table : son compteur vient des lignes
   * réellement créées, jamais d'une valeur supposée. */
  setText(summary,
    `Bord local E086 · ${declared}/${CHANTIERS.length} chantiers déclarés · `
    + `${model.m.eras} ères × ${model.m.domains} domaines · `
    + `${model.m.filled}/${model.m.cells} cellules renseignées · `
    + `${model.m.visible} point(s) dans le périmètre.`);

  board.appendChild(ctx.el('p', 'points-e086-line points-e086-unique',
    `Greffage : ${count(document, `[id="${BOARD_ID}"]`)} table de bord E086 · feuille CSS unique · zéro écouteur et zéro timer.`));
  board.appendChild(ctx.el('p', 'points-e086-note',
    'Table de bord locale et déclarative : elle ne remplace ni la validation du projet ni les diagnostics de la vue. Les dix chantiers sont énoncés ici pour être vérifiés ligne à ligne.'));
  return declared;
}

/* E086-10 : installation idempotente. Le nœud est réutilisé par identifiant,
 * retiré seulement s'il est mal parenté ; aucun état n'est stocké hors du DOM,
 * aucun écouteur n'est attaché, aucun signal n'est écrit sur une ressource
 * partagée. Une structure inattendue neutralise la lentille sans laisser de
 * trace partielle. */
function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;
  const layout = ctx.layout && typeof ctx.layout.querySelector === 'function'
    ? ctx.layout
    : (ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null);
  if (!layout) return;

  const matrix = layout.querySelector('.points-matrix');
  const grid = layout.querySelector('.points-grid');
  const title = layout.querySelector('.points-title');
  const detail = layout.querySelector('.points-detail');
  const anchors = {
    layout: true,
    matrix: Boolean(matrix && typeof matrix.appendChild === 'function'),
    title: Boolean(title),
    grid: Boolean(grid),
    detail: Boolean(detail),
  };
  if (!anchors.matrix || !anchors.title || !anchors.grid) return;

  ctx.css(CSS_ID, CSS);

  const stale = document.getElementById(BOARD_ID);
  if (stale && stale.parentElement !== matrix) stale.remove();
  let board = document.getElementById(BOARD_ID);
  if (!board) {
    board = ctx.el('section', BOARD_ID);
    board.id = BOARD_ID;
  }

  /* Le nœud est branché AVANT la construction : le compteur d'unicité lit le
   * document réel, pas une approximation. */
  if (board.parentElement !== matrix) matrix.appendChild(board);

  const model = {
    m: measures(matrix, detail),
    motion: motionOf(ctx),
    integrity: integrityLine(anchors),
  };
  buildBoard(ctx, board, model);

  if (detail && detail.dataset) detail.dataset.pointsE086Declared = '1';
  matrix.dataset.pointsE086Board = 'declared';
}

register('E086', install);
