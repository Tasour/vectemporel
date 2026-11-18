import { register } from './registry.js';

/* Lentille POINTS E073 — Responsive & mobile : défilement latéral de la matrice.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E073.md — chantiers E073-01 à E073-10.
 * Fichier possédé : ce module uniquement. La vue `src/views/points.js`, la feuille
 * `styles.css` et le registre sont lus mais JAMAIS modifiés : E073 ajoute une
 * couche locale de défilement latéral par-dessus le DOM déjà produit, sans
 * toucher aux contrôles existants ni au store.
 *
 * Le défilement horizontal existe déjà dans `styles.css` (`.points-grid` en
 * `overflow-x:auto`, lignes en `min-width:900px`). E073 ne le remplace pas : il
 * le rend DÉCOUVRABLE et UTILISABLE sur mobile — indice de position, commandes
 * gauche/droite ≥ 44 px, première colonne « Ère » épinglée, équivalent clavier,
 * annonce mesurée — le tout dérivé de `scrollWidth`/`clientWidth`/`scrollLeft`.
 *
 * Invariants :
 * - un seul greffon, une seule feuille CSS (ctx.css('points-e073', …)) ;
 * - tous les identifiants préfixés `points-e073-` ;
 * - un seul écouteur `scroll` (passif) par grille, posé sous marqueur de données ;
 * - aucune écriture `innerHTML`, aucun timer, aucune rAF, aucun réseau, aucun
 *   aléa, aucun `console.*`; le mouvement doux est native (`scrollBy`), jamais
 *   une animation propre ;
 * - non destructif : aucun nœud existant n'est retiré ni réécrit (seuls des
 *   ajouts et des attributs posés sous garde d'absence) ;
 * - idempotent : les nœuds locaux sont purgés par préfixe puis recréés, et la
 *   structure inattendue neutralise la lentille sans lever d'exception.
 */

const CSS_ID = 'points-e073';
const ID = {
  bar: 'points-e073-bar',
  hint: 'points-e073-hint',
  controls: 'points-e073-controls',
  prev: 'points-e073-prev',
  next: 'points-e073-next',
  progress: 'points-e073-progress',
  fill: 'points-e073-progress-fill',
  readout: 'points-e073-readout',
};

const HINT_TEXT = 'La matrice est plus large que l’écran : faites-la glisser vers la gauche pour voir les autres domaines, ou utilisez les flèches ci-dessous.';

/* Feuille unique. Les règles ne visent que les ancres `points-e073-`, la classe
 * déjà rendue `.points-grid` et le signal `data-points-e073-scrollable` : aucune
 * fuite, aucune ressource externe, cibles tactiles ≥ 44 px, focus visible,
 * mouvement réduit respecté, colonne « Ère » épinglée sous 600 px seulement. */
const CSS = `
  #${ID.bar} { margin: 10px 0 2px; }
  #${ID.hint} { margin: 0 0 6px; font-size: 11px; line-height: 1.45; color: var(--ink-soft); }
  #${ID.hint}[hidden] { display: none; }
  #${ID.controls} { display: flex; gap: 8px; }
  #${ID.controls} .points-e073-nav {
    flex: 1; min-height: 44px; min-width: 44px; padding: 0 10px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: rgba(230, 185, 111, .08); color: var(--gold-bright);
    font: inherit; font-size: 11px; cursor: pointer;
  }
  #${ID.controls} .points-e073-nav:hover:not(:disabled) { border-color: var(--gold-bright); }
  #${ID.controls} .points-e073-nav:disabled { opacity: .45; cursor: default; }
  #${ID.progress} {
    height: 6px; margin: 8px 0 4px; border-radius: 3px;
    background: rgba(255, 255, 255, .07); overflow: hidden;
  }
  .points-e073-progress-fill {
    height: 100%; width: 0; background: var(--gold);
    transition: width .15s ease;
  }
  #${ID.readout} {
    margin: 0; font-size: 10px; line-height: 1.45; color: var(--muted-2);
    font-variant-numeric: tabular-nums;
  }
  .points-grid:focus-visible, .points-e073-nav:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  @media (max-width: 600px) {
    .points-grid[data-points-e073-scrollable="1"] .points-grid-row > :first-child {
      position: sticky; left: 0; z-index: 2;
      background: #0b0f15; box-shadow: 1px 0 0 var(--line-strong);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-e073-progress-fill { transition: none; }
  }
`;

let currentMatrix = null;   // .points-matrix du rendu courant
let currentGrid = null;     // .points-grid du rendu courant
let hintNode = null;
let prevButton = null;
let nextButton = null;
let fillNode = null;
let readoutNode = null;
let reduced = false;        // mouvement réduit, lu une fois par rendu
let lastBand = -1;         // dernière bande de progression annoncée
let hintDismissed = false; // le conseil s'efface après le premier défilement

/* Sélecteurs défensifs : un ctx minimal ou un DOM partiel ne doit jamais
 * faire lever une exception dans la lentille. */
function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

/* Largeur d'une colonne de domaine, déduite de l'en-tête réellement rendu
 * (aucune valeur en dur). Repli sur la première cellule de données. */
function columnWidth(grid) {
  const head = q(grid, '.points-grid-row.is-head > span:nth-child(2)');
  if (head && head.offsetWidth > 0) return head.offsetWidth;
  const cell = q(grid, '.points-grid-row:not(.is-head) .points-cell');
  return cell && cell.offsetWidth > 0 ? cell.offsetWidth : 0;
}

/* Toutes les grandeurs sont recomputées depuis la géométrie du grille. */
function metrics(grid) {
  const max = Math.max(0, grid.scrollWidth - grid.clientWidth);
  const pos = Math.min(max, Math.max(0, grid.scrollLeft));
  const pct = max > 0 ? Math.round((pos / max) * 100) : 100;
  return {
    max,
    pos,
    pct,
    atStart: pos <= 2,
    atEnd: pos >= max - 2,
  };
}

function readoutText(grid, band) {
  const heads = qa(grid, '.points-grid-row.is-head > span');
  const cols = Math.max(0, heads.length - 1); // première colonne = « Ère »
  const width = columnWidth(grid);
  const m = metrics(grid);
  const hidden = m.max > 0 && width > 0 ? Math.ceil(m.max / width) : 0;
  return `Matrice : ${cols} domaine${cols > 1 ? 's' : ''} · ${hidden} hors écran · défilement ${band} %.`;
}

/* Une seule écriture par changement réel : la barre suit le scroll à chaque
 * événement (visuel, non live), le compteur n'avance que par bandes de 10 %
 * pour ne pas bavarder dans la région live. */
function update(force) {
  if (!currentGrid || !currentGrid.isConnected) return;
  const m = metrics(currentGrid);
  if (fillNode) fillNode.style.width = `${m.pct}%`;
  if (prevButton) prevButton.disabled = m.atStart;
  if (nextButton) nextButton.disabled = m.atEnd;
  if (!hintDismissed && m.pos > 8 && hintNode) {
    hintDismissed = true;
    hintNode.hidden = true;
    if (currentGrid.dataset) currentGrid.dataset.pointsE073Hint = 'dismissed';
  }
  const band = m.max > 0 ? Math.round(m.pct / 10) * 10 : 100;
  if (force || band !== lastBand) {
    lastBand = band;
    if (readoutNode) readoutNode.textContent = readoutText(currentGrid, band);
  }
  if (currentGrid.dataset) {
    currentGrid.dataset.pointsE073Pct = String(m.pct);
    currentGrid.dataset.pointsE073At = m.atEnd ? 'end' : (m.atStart ? 'start' : 'middle');
  }
}

/* Défilement d'un pas de colonne. `scrollBy` est natif (aucun timer, aucune
 * rAF) ; le repli `scrollLeft` couvre les moteurs anciens. Le mouvement doux
 * est désactivé sous préférence de mouvement réduit. */
function step(direction) {
  if (!currentGrid) return;
  const width = columnWidth(currentGrid) || currentGrid.clientWidth || 1;
  const delta = direction * width;
  try {
    currentGrid.scrollBy({ left: delta, behavior: reduced ? 'auto' : 'smooth' });
  } catch {
    currentGrid.scrollLeft += delta;
  }
}

function bindScroll(grid) {
  if (!grid || grid.dataset.pointsE073Bound === '1') return;
  grid.dataset.pointsE073Bound = '1';
  grid.addEventListener('scroll', () => update(false), { passive: true });
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  ctx.css(CSS_ID, CSS);

  const stage = ctx.stage;
  if (!stage || typeof stage.querySelector !== 'function') return;
  const layout = ctx.layout && ctx.layout.isConnected ? ctx.layout : q(stage, '.points-layout');
  if (!layout) return;
  const matrix = q(layout, '.points-matrix');
  const grid = matrix && q(matrix, '.points-grid');
  if (!matrix || !grid || typeof grid.scrollBy !== 'function') return;

  try { reduced = !!(ctx.reducedMotion && ctx.reducedMotion()); }
  catch { reduced = false; }

  /* Idempotence : purge de nos seuls nœuds (préfixe réservé) avant recréation.
   * Aucun nœud d'une autre lentille n'est touché. */
  qa(matrix, '[id^="points-e073-"]').forEach((node) => node.remove());

  currentMatrix = matrix;
  currentGrid = grid;
  hintNode = prevButton = nextButton = fillNode = readoutNode = null;

  /* Repli propre si la matrice tient sur l'écran : aucun bar, aucun écouteur,
   * aucun signal « scrollable ». Le défilement reste natif au besoin. */
  const scrollable = grid.scrollWidth - grid.clientWidth > 2;
  if (!scrollable) {
    if (grid.dataset) grid.dataset.pointsE073Scrollable = '0';
    return;
  }
  if (grid.dataset) grid.dataset.pointsE073Scrollable = '1';

  /* Barre locale insérée juste après la grille, dans la matrice existante. */
  const bar = ctx.el('div', 'points-e073-bar');
  bar.id = ID.bar;

  const hint = ctx.el('p', 'points-e073-hint', HINT_TEXT);
  hint.id = ID.hint;
  bar.appendChild(hint);
  hintNode = hint;

  const controls = ctx.el('div', 'points-e073-controls');
  controls.id = ID.controls;
  const prev = ctx.el('button', 'points-e073-nav', '← Domaines précédents');
  prev.id = ID.prev;
  prev.type = 'button';
  prev.setAttribute('aria-label', 'Faire défiler la matrice vers la gauche');
  prev.addEventListener('click', () => step(-1));
  const next = ctx.el('button', 'points-e073-nav', 'Domaines suivants →');
  next.id = ID.next;
  next.type = 'button';
  next.setAttribute('aria-label', 'Faire défiler la matrice vers la droite');
  next.addEventListener('click', () => step(1));
  controls.append(prev, next);
  bar.appendChild(controls);
  prevButton = prev;
  nextButton = next;

  const progress = ctx.el('div', 'points-e073-progress');
  progress.id = ID.progress;
  progress.setAttribute('aria-hidden', 'true'); // visuel seulement, non live
  const fill = ctx.el('div', 'points-e073-progress-fill');
  fill.id = ID.fill;
  progress.appendChild(fill);
  bar.appendChild(progress);
  fillNode = fill;

  const readout = ctx.el('p', 'points-e073-readout', '');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  bar.appendChild(readout);
  readoutNode = readout;

  if (grid.nextSibling) grid.parentNode.insertBefore(bar, grid.nextSibling);
  else grid.parentNode.appendChild(bar);

  /* Équivalent clavier : la grille devient un groupe focalisable dont les
   * flèches natives font défiler le conteneur. Attributs posés sous garde
   * d'absence pour ne pas écraser une autre lentille (ex. E004). */
  if (!grid.hasAttribute('role')) grid.setAttribute('role', 'region');
  if (!grid.getAttribute('aria-label')) {
    grid.setAttribute('aria-label', 'Matrice de couverture défilable horizontalement');
  }
  grid.tabIndex = 0;
  const desc = (grid.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (!desc.includes(ID.hint)) desc.push(ID.hint);
  grid.setAttribute('aria-describedby', desc.join(' '));

  hintDismissed = grid.dataset.pointsE073Hint === 'dismissed';
  if (hintDismissed) hintNode.hidden = true;

  lastBand = -1;
  bindScroll(grid);
  update(true);
  if (layout.dataset) layout.dataset.pointsE073 = 'ready';
}

register('E073', install);
