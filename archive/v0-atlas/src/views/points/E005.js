import { register } from './registry.js';

/* Lentille E005 — Matrice & grille : résumé de couverture dérivé du DOM (domaine A).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E005.md — chantiers E005-01 à E005-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : la lentille lit la grille déjà
 * produite par la vue et ajoute un seul panneau de synthèse dans .points-matrix.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres ou le détail : le résumé reste vrai
 * avec un ctx minimal pourvu qu'il porte le layout de la vue points.
 *
 * Aucun chiffre de couverture n'est recopié : ni le « 784 cellules » du
 * sous-titre du globe (globe.js:382), ni les totaux de dataset.js, ni un
 * nombre de domaines codé en dur. Tout est recomputé depuis le DOM observé.
 *
 * Invariants : un seul CSS, un seul panneau, un seul observateur ciblé sur la
 * grille, signature anti-écriture, zéro écouteur global, zéro timer, zéro rAF,
 * zéro réseau, zéro aléa, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e005';
const SCOPE = 'points-e005';
const SUMMARY_ID = 'points-e005-summary';
const TITLE_ID = 'points-e005-title';
const LINES_ID = 'points-e005-lines';
const MAX_EMPTY = 3;
const REDUCED_ATTR = 'data-e005-reduced';

/* Toutes les règles sont préfixées par `.points-e005`, classe posée sur
 * .points-layout : aucune fuite hors de cette vue. Le panneau est un enfant de
 * .points-matrix (jamais de la grille), donc l'observateur ne le voit pas. */
const CSS = `
/* E005-01 : panneau local, non modal, étroitement cadré dans la matrice. */
.points-e005 #${SUMMARY_ID} {
  margin: 0 0 12px; padding: 9px 11px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(8, 11, 16, .72); color: var(--muted);
  font-size: 11px; line-height: 1.45; font-variant-numeric: tabular-nums;
}
.points-e005 #${SUMMARY_ID}[hidden] { display: none; }
.points-e005 #${SUMMARY_ID}:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 3px; }
/* E005-01 : titre et lignes sémantiques, sans région live. */
.points-e005 #${SUMMARY_ID} h3 {
  margin: 0 0 5px; color: var(--gold-bright);
  font-family: var(--serif); font-size: 13px;
}
.points-e005 #${SUMMARY_ID} p { margin: 2px 0 0; overflow-wrap: anywhere; }
.points-e005 #${SUMMARY_ID} .e005-head {
  color: var(--gold); font-weight: 600; letter-spacing: .02em;
}
/* E005-08 : mouvement réduit, couplage JS (attribut) ET media query. */
.points-e005[` + REDUCED_ATTR + `="1"] #${SUMMARY_ID} { transition: none; animation: none; }
@media (prefers-reduced-motion: reduce) {
  .points-e005 #${SUMMARY_ID} { transition: none; animation: none; }
}
/* E005-10 : cible tactile et repli mobile, sans débordement à 390 px. */
@media (max-width: 620px) {
  .points-e005 #${SUMMARY_ID} { padding: 7px 8px; font-size: 10px; }
}
/* E005-08 : couleurs forcées — bordures explicites, aucune couleur seule. */
@media (forced-colors: active) {
  .points-e005 #${SUMMARY_ID} {
    background: Canvas; color: CanvasText; border-color: CanvasText;
  }
  .points-e005 #${SUMMARY_ID} h3,
  .points-e005 #${SUMMARY_ID} .e005-head { color: CanvasText; }
}
`;

let latestCtx = null;           // dernier ctx reçu, relu par l'observateur
let observer = null;            // unique MutationObserver, ciblé sur .points-grid
let panel = null;               // panneau unique, recréé à chaque rendu de la coque
let linesNode = null;           // bloc de lignes, remplacé sans innerHTML
let titleNode = null;           // titre du panneau
let signature = '';             // signature des lignes, évite les écritures redondantes
let refreshCount = 0;           // compteur auditable, hors texte visible

function byId(id) {
  return document.getElementById(id);
}

function textOf(node) {
  return node ? String(node.textContent || '').trim() : '';
}

/* E005-03 : une cellule renseignée porte un compteur numérique entier ; le
 * symbole « · » et toute autre valeur sont traités comme « sans point ». */
function countOf(cell) {
  const raw = textOf(cell);
  return /^\d+$/.test(raw) ? Number(raw) : 0;
}

function pct(part, whole) {
  return whole > 0 ? Math.round((100 * part) / whole) : 0;
}

function brief(values, limit) {
  if (!values.length) return '';
  const phrase = values.slice(0, limit).join(', ');
  const rest = values.length - limit;
  return rest > 0 ? `${phrase} · + ${rest} autre(s)` : phrase;
}

/* E005-02/03/04/05/06 : une seule passe de lecture sur la grille réelle.
 * Aucun nombre, aucun nom d'ère ou de domaine n'est saisi à la main. */
function readCoverage(layout) {
  const grid = layout.querySelector('.points-grid');
  if (!grid) return null;

  const rows = Array.from(grid.querySelectorAll('.points-grid-row'));
  const head = rows.find((row) => row.classList.contains('is-head')) || null;
  const bodyRows = rows.filter((row) => !row.classList.contains('is-head'));
  const headers = head ? Array.from(head.querySelectorAll('span')).map(textOf) : [];
  // La première colonne est l'ère. On garde les libellés vides pour préserver
  // l'alignement avec les cellules de chaque ligne.
  const domains = headers.slice(1).map((name) => name || '(domaine sans nom)');

  const cells = Array.from(grid.querySelectorAll('.points-cell'));
  let filled = 0;
  let points = 0;
  let mismatch = 0;
  for (const cell of cells) {
    const n = countOf(cell);
    const flagged = cell.classList.contains('has-points');
    if (flagged !== (n > 0)) mismatch += 1;
    if (n > 0) { filled += 1; points += n; }
  }

  const perDomain = domains.map((_, index) => bodyRows.reduce((sum, row) => {
    const rowCells = Array.from(row.querySelectorAll('.points-cell'));
    return sum + countOf(rowCells[index]);
  }, 0));
  const emptyDomains = domains.filter((_, index) => perDomain[index] === 0);

  const activeRow = bodyRows.find((row) => row.classList.contains('is-active')) || null;
  const activeName = activeRow ? textOf(activeRow.querySelector('.points-era')) : '';
  const isolatedText = textOf(layout.querySelector('.points-title'));
  const match = /(\d+)\s+points?\s+isolés?/i.exec(isolatedText);
  const isolated = match ? Number(match[1]) : null;

  return {
    grid,
    rows: bodyRows.length,
    domains,
    cells: cells.length,
    expected: bodyRows.length * domains.length,
    filled,
    points,
    mismatch,
    emptyDomains,
    activeName,
    isolated,
    isolatedText,
  };
}

/* E005-02/04/05/06/07 : toutes les phrases sont dérivées du relevé ci-dessus. */
function coverageLines(stats) {
  if (!stats) {
    return [
      'Grille de couverture indisponible dans cette vue.',
      'Aucun chiffre de couverture n’est supposé en l’absence de DOM observable.',
    ];
  }
  if (!stats.rows || !stats.domains.length || !stats.cells) {
    return [
      'Grille vide : aucune cellule à comptabiliser.',
      `Ères relevées : ${stats.rows} · domaines relevés : ${stats.domains.length}.`,
    ];
  }

  const lines = [];
  lines.push(`Couverture : ${stats.filled}/${stats.cells} cellules renseignées (${pct(stats.filled, stats.cells)} %).`);
  let counted = `Points comptés dans la grille : ${stats.points}.`;
  if (stats.isolated !== null) {
    counted += ` Titre de la vue : ${stats.isolated} point(s).`;
    counted += stats.isolated === stats.points
      ? ' Les deux comptages concordent.'
      : ` Écart à expliquer : ${stats.points - stats.isolated}.`;
  }
  lines.push(counted);
  lines.push(`Structure : ${stats.rows} ères × ${stats.domains.length} domaines = ${stats.expected} cellules attendues.`);
  const delta = stats.cells - stats.expected;
  lines.push(delta === 0
    ? 'Cellules présentes et attendues : concordance.'
    : `Cellules présentes : ${stats.cells} (écart structurel : ${delta}).`);
  lines.push(`Ère active : ${stats.activeName || 'non déterminée'}.`);
  lines.push(stats.emptyDomains.length
    ? `Domaines sans point : ${brief(stats.emptyDomains, MAX_EMPTY)}.`
    : 'Aucun domaine sans point dans la grille relevée.');
  if (stats.mismatch) {
    lines.push(`Cohérence classe/compteur : ${stats.mismatch} cellule(s) à revoir.`);
  }
  return lines;
}

/* E005-09 : réécriture seulement si le relevé change ; le compteur est écrit
 * dans un attribut (non observé), jamais dans le texte de la grille. */
function render(ctx) {
  const layout = ctx && ctx.layout;
  if (!layout || !layout.isConnected || !linesNode) return;

  const stats = readCoverage(layout);
  const lines = coverageLines(stats);
  const next = lines.join(' | ');
  if (next === signature) return;
  signature = next;
  refreshCount += 1;

  linesNode.replaceChildren(...lines.map((line, index) =>
    ctx.el('p', index === 0 ? 'e005-head' : '', line)));
  if (titleNode) titleNode.textContent = 'Résumé de couverture (DOM)';

  if (stats) {
    layout.dataset.e005Filled = String(stats.filled);
    layout.dataset.e005Cells = String(stats.cells);
    layout.dataset.e005Points = String(stats.points);
    layout.dataset.e005Rate = `${pct(stats.filled, stats.cells)}%`;
  } else {
    delete layout.dataset.e005Filled;
    delete layout.dataset.e005Cells;
    delete layout.dataset.e005Points;
    delete layout.dataset.e005Rate;
  }
  if (panel) panel.dataset.e005Refreshes = String(refreshCount);
}

/* E005-09 : un seul observateur, déconnecté puis reconnecté, et jamais posé
 * sur le panneau (sinon boucle d'écriture). Justifié : la grille peut être
 * mutée sur place par un filtre sans recréation complète de la vue. */
function observeGrid(layout) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  observer = null;
  if (typeof MutationObserver === 'undefined') return;
  const grid = layout.querySelector('.points-grid');
  if (!grid) return;
  observer = new MutationObserver(() => {
    if (latestCtx) render(latestCtx);
  });
  observer.observe(grid, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'title'],
  });
}

/* E005-01 : structure statique construite une seule fois, sans innerHTML. */
function buildPanel(el) {
  const node = el('section', 'points-e005-panel');
  node.id = SUMMARY_ID;
  node.setAttribute('role', 'group');
  node.setAttribute('aria-labelledby', TITLE_ID);
  const title = el('h3', '', 'Résumé de couverture (DOM)');
  title.id = TITLE_ID;
  const lines = el('div', 'e005-lines');
  lines.id = LINES_ID;
  node.append(title, lines);
  return { node, title, lines };
}

register('E005', (ctx) => {
  if (!ctx || ctx.viewId !== 'points' || !ctx.layout || !ctx.layout.isConnected) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  latestCtx = ctx;
  const { layout, css, el } = ctx;

  /* E005-01/08 : injection unique (cssOnce) et ancrage de portée sur la vue. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e005 = ctx.viewId;
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  /* shell.js:533 recrée le stage à chaque rendu : un nœud déconnecté marque
   * un rendu neuf, la signature est alors remise à zéro. */
  const found = byId(SUMMARY_ID);
  const freshRender = !(found && found.isConnected && layout.contains(found));
  if (found && !layout.contains(found)) found.remove();

  panel = byId(SUMMARY_ID);
  if (panel && (!panel.querySelector('#' + TITLE_ID) || !panel.querySelector('#' + LINES_ID))) {
    panel.remove();
    panel = null;
  }
  if (panel) {
    titleNode = panel.querySelector('#' + TITLE_ID);
    linesNode = panel.querySelector('#' + LINES_ID);
  } else {
    const built = buildPanel(el);
    panel = built.node;
    titleNode = built.title;
    linesNode = built.lines;
  }

  const matrix = layout.querySelector('.points-matrix');
  if (matrix && panel.parentElement !== matrix) {
    const title = matrix.querySelector('.points-title');
    if (title && title.nextSibling) matrix.insertBefore(panel, title.nextSibling);
    else matrix.appendChild(panel);
  }

  if (freshRender) signature = '';
  observeGrid(layout);
  render(ctx);
});
