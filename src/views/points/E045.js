import { register } from './registry.js';

/* Lentille E045 — Accessibilité & ARIA : cellules étiquetées (ère, domaine, compte).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E045.md — chantiers E045-01 à E045-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque,
 * styles.css et les autres lentilles ne sont ni édités ni doublés : E045 enrichit
 * le DOM déjà produit par renderPoints (points.js:29-126), sans le reconstruire.
 *
 * Contrat exploité : viewId, layout, css, el, reducedMotion (registry.js:29-37).
 * Aucune dépendance vers le store, les filtres ou le détail : chaque étiquette
 * est dérivée du DOM réel (textes, title, classes), jamais d'une donnée codée en
 * dur ni d'un import de domaine.
 *
 * Invariants : un seul CSS, une seule légende, un seul aria-label par cellule,
 * aucun title réécrit, aucun rôle préexistant écrasé, aucun écouteur global,
 * zéro timer, zéro rAF, zéro réseau, zéro aléa, zéro console.*, zéro innerHTML.
 * Les rôles de grille (E044) restent de la compétence d'E044 et ne sont pas
 * substitués ici.
 */

const CSS_ID = 'points-e045';
const LEGEND_ID = 'points-e045-legend';
const HEAD_PREFIX = 'points-e045-head-';
const ERA_PREFIX = 'points-e045-era-';

/* Feuille unique, injectée par cssOnce (registry.js:13-19). Aucune transition :
 * la question du mouvement réduit (E049) ne se pose pas pour E045. */
const CSS = `
.points-e045-legend {
  margin: 8px 0 0;
  padding: 6px 9px;
  border-left: 2px solid var(--gold);
  color: var(--muted-2);
  font-size: 10px;
  line-height: 1.45;
}
@media (max-width: 620px) {
  .points-e045-legend { font-size: 11px; }
}
`;

function clean(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

/* Le compte vient du texte visible de la cellule (points.js:46), puis du title
 * (points.js:48). Le signe « · » et un title absent donnent 0, jamais 1. */
function countOf(cell) {
  const text = clean(cell.textContent);
  if (/^\d+$/.test(text)) return Number(text);
  const found = clean(cell.title).match(/(\d+)\s*point/i);
  return found ? Number(found[1]) : 0;
}

/* E045-06 : accord français explicite ; le « point(s) » brut du title de la
 * vue (points.js:48) n'est jamais recopié dans une étiquette accessible. */
function countWord(count) {
  if (!count) return 'aucun point';
  return count === 1 ? '1 point' : `${count} points`;
}

function withDot(text) {
  const value = clean(text);
  return value && !/[.!?]$/.test(value) ? `${value}.` : value;
}

function setAttr(node, name, value) {
  if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
}

/* E045-05 : un rôle est posé seulement s'il n'existe pas déjà : E044 peut
 * poser role=grid/row/gridcell sans être contrarié par E045. */
function ensureRole(node, role) {
  if (node && !node.hasAttribute('role')) node.setAttribute('role', role);
}

/* E045-04 : complète aria-describedby sans écraser les identifiants déjà
 * présents, et sans doublon. */
function describe(node, id) {
  if (!node || !id) return;
  const ids = clean(node.getAttribute('aria-describedby')).split(' ').filter(Boolean);
  if (!ids.includes(id)) {
    ids.push(id);
    node.setAttribute('aria-describedby', ids.join(' '));
  }
}

/* E045-01 : n'écrase une étiquette existante que si elle n'est pas déjà
 * contextuelle (ère et domaine présents), pour rester composable avec E003. */
function contextualLabel(node, era, domain) {
  const current = clean(node.getAttribute('aria-label'));
  return !!current && current.includes(era) && (!domain || current.includes(domain));
}

function legendInto(matrix, el) {
  const legend = el('p', 'points-e045-legend',
    'Lecture des cellules : chaque bouton annonce son ère, son domaine et son compte. « aucun point » nomme une cellule vide : le signe « · » affiché n’est pas une absence de données, mais l’absence de point validé. Le nom de l’ère et le domaine sont aussi rattachés à la cellule comme descriptions.');
  legend.id = LEGEND_ID;
  const filters = matrix.querySelector('.points-filters');
  if (filters && filters.parentNode === matrix) matrix.insertBefore(legend, filters);
  else matrix.appendChild(legend);
  return legend;
}

register('E045', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  /* E045-10 : CSS injecté une fois, ancrage de portée unique et signal de
   * présence ; aucun nœud de la vue n'est retiré ni réécrit. */
  css(CSS_ID, CSS);
  layout.classList.add('points-e045');
  layout.dataset.e045 = '1';

  const grid = layout.querySelector('.points-grid');
  if (!grid) return;
  const rows = Array.from(grid.querySelectorAll('.points-grid-row'));
  if (!rows.length) return;

  const head = rows.find((row) => row.classList.contains('is-head'));
  const eraRows = rows.filter((row) => !row.classList.contains('is-head'));
  const domains = head
    ? Array.from(head.children).slice(1).map((node) => clean(node.textContent))
    : [];

  /* E045-04 et E045-05 : identifiants préfixés et rôles d'en-tête de colonne.
   * Les <span> d'en-tête (points.js:35-36) deviennent adressables sans changer
   * leur texte, leur ordre ni leur classe. */
  if (head) {
    Array.from(head.children).forEach((node, index) => {
      setAttr(node, 'id', `${HEAD_PREFIX}${index}`);
      ensureRole(node, 'columnheader');
    });
  }

  const used = new Set();

  eraRows.forEach((row, rowIndex) => {
    const eraButton = row.querySelector('.points-era');
    const eraName = eraButton ? clean(eraButton.textContent) : `Ère ${rowIndex + 1}`;
    if (eraButton) setAttr(eraButton, 'id', `${ERA_PREFIX}${rowIndex}`);

    const cells = Array.from(row.querySelectorAll('.points-cell'));
    const total = cells.reduce((sum, cell) => sum + countOf(cell), 0);

    /* E045-03 : le bouton d'ère garde son libellé visible (points.js:40) mais
     * expose le total de sa ligne, recalculé depuis ses cellules. */
    if (eraButton && !contextualLabel(eraButton, eraName, '')) {
      setAttr(eraButton, 'aria-label',
        withDot(`Ère ${eraName} : ${countWord(total)} dans cette ligne de la matrice`));
    }

    cells.forEach((cell, colIndex) => {
      const fromTitle = clean(cell.title).split('·')[1] || '';
      const domain = domains[colIndex] || clean(fromTitle) || `domaine ${colIndex + 1}`;
      const count = countOf(cell);

      /* E045-09 : l'état has-points (points.js:46) est dit en toutes lettres :
       * aucune information de présence ne repose sur la seule couleur. */
      const state = count > 0 ? 'cellule renseignée' : 'cellule vide';

      /* E045-01, E045-02 : « ère · domaine · compte + état » en une seule
       * étiquette ; E045-08 désambiguïse seulement en cas de collision réelle. */
      const base = `${eraName} · ${domain} : ${countWord(count)} (${state})`;
      const label = used.has(base) ? `${base} — ligne ${rowIndex + 1}, colonne ${colIndex + 1}` : base;
      used.add(base);
      if (!contextualLabel(cell, eraName, domain)) setAttr(cell, 'aria-label', withDot(label));

      /* E045-04 : l'en-tête de colonne et le bouton d'ère sont joints à la
       * cellule comme descriptions, sans effacer un aria-describedby tiers. */
      const columnHead = head && head.children[colIndex + 1];
      if (columnHead) describe(cell, columnHead.id);
      if (eraButton) describe(cell, eraButton.id);
    });
  });

  /* E045-07 : une seule légende par rendu, placée entre la grille et les
   * filtres. Le garde anti-doublon rend l'installation idempotente, et un
   * exemplaire orphelin d'un rendu précédent est retiré. */
  const matrix = grid.parentElement && grid.parentElement.classList.contains('points-matrix')
    ? grid.parentElement
    : layout.querySelector('.points-matrix');
  if (matrix && !layout.querySelector(`#${LEGEND_ID}`)) {
    const stale = document.getElementById(LEGEND_ID);
    if (stale && !layout.contains(stale)) stale.remove();
    legendInto(matrix, el);
  }
});
