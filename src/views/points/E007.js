import { register } from './registry.js';

/* Lentille POINTS E007 — Matrice & grille : défilement horizontal borné avec
 * indice de position (domaine A).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E007.md — chantiers E007-01 à E007-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), ses
 * styles (styles.css), la coque et les autres lentilles ne sont ni édités ni
 * doublés : E007 ajoute une portée CSS, une barre de commandes, un indice de
 * position et un seul écouteur local, tous dérivés du DOM réellement rendu.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres, le détail ni aucune autre lentille.
 * Toute valeur affichée (nombre de domaines, colonnes visibles, pourcentage,
 * bornes) est recalculée depuis .points-grid / .points-grid-row.is-head.
 *
 * Invariants :
 * - une seule feuille CSS, injectée par ctx.css('points-e007', …) ;
 * - tous les identifiants sont préfixés `points-e007-` ;
 * - un seul écouteur `scroll` passif par grille, aucun timer, aucune rAF ;
 * - zéro réseau, zéro aléa, zéro innerHTML, zéro console.* ;
 * - greffon non destructif et idempotent : nœuds réutilisés par identifiant,
 *   attributs existants complétés (jamais écrasés), garde anti-doublon.
 */

const CSS_ID = 'points-e007';
const SCOPE = 'points-e007';

const ID = {
  controls: 'points-e007-controls',
  buttons: 'points-e007-buttons',
  prev: 'points-e007-prev',
  next: 'points-e007-next',
  start: 'points-e007-start',
  end: 'points-e007-end',
  readout: 'points-e007-readout',
  progress: 'points-e007-progress',
  thumb: 'points-e007-thumb',
  hint: 'points-e007-hint',
  columns: 'points-e007-columns',
};

/* Écouteurs et références indexés par nœud de grille : un rendu neuf produit
 * une grille neuve, donc un écouteur neuf, sans fuite ni doublon. */
const listened = new WeakSet();
const refsByGrid = new WeakMap();

/* Feuille unique, entièrement préfixée par `.points-e007` (classe posée sur
 * .points-layout) : aucun style ne fuit hors de la vue Points. Le défilement
 * reste natif et borné (overflow + overscroll-behavior), aucune animation. */
const CSS = `
.points-e007 .points-grid {
  position: relative;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: auto;
  overflow-y: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
}
.points-e007 .points-grid-row > :not(:first-child) { scroll-snap-align: start; }
/* E007-03 : la colonne « Ère » reste lisible pendant le défilement X. */
.points-e007 .points-grid-row > :first-child {
  position: sticky; left: 0; z-index: 3;
  background: #0b0f15;
}
.points-e007 .points-grid-row.is-head > :first-child { z-index: 6; background: #171d27; }
/* E007-05 / E007-06 : barre de commandes, cibles ≥ 36 px, focus visible. */
.points-e007-controls {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  margin: 10px 0 2px; font-size: 10px; line-height: 1.5; color: var(--muted-2);
}
.points-e007-buttons { display: flex; flex-wrap: wrap; gap: 6px; }
.points-e007-controls button {
  min-height: 36px; min-width: 36px; padding: 0 10px;
  border: 1px solid var(--line-strong); border-radius: 8px;
  background: rgba(230, 185, 111, .07); color: var(--ink-soft);
  font: inherit; font-size: 10px; cursor: pointer;
}
.points-e007-controls button:hover:not(:disabled) { border-color: var(--gold); color: var(--gold-bright); }
.points-e007-controls button:disabled { opacity: .5; cursor: not-allowed; }
#${ID.readout} { flex: 1 1 240px; margin: 0; font-variant-numeric: tabular-nums; }
#${ID.progress} {
  position: relative; flex: 0 0 min(180px, 38vw); height: 8px;
  border: 1px solid var(--line-strong); border-radius: 6px;
  background: rgba(255,255,255,.03); overflow: hidden;
}
#${ID.thumb} { display: block; height: 100%; width: 0; background: var(--gold); }
.points-e007 .points-grid:focus-visible,
.points-e007-controls button:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px;
}
.points-e007-sr {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
@media (max-width: 620px) {
  .points-e007-controls button { min-height: 44px; }
  #${ID.progress} { flex-basis: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .points-e007 .points-grid { scroll-snap-type: none; }
  .points-e007-controls button { transition: none; }
}
@media (forced-colors: active) {
  .points-e007 .points-grid-row > :first-child,
  .points-e007 .points-grid-row.is-head > :first-child {
    background: Canvas; color: CanvasText; border-color: CanvasText;
  }
  #${ID.thumb} { background: Highlight; }
}
`;

function set(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
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

function bindOnce(node, flag, event, handler) {
  if (!node || node.dataset[flag] === '1') return;
  node.addEventListener(event, handler);
  node.dataset[flag] = '1';
}

/* Complète aria-describedby sans écraser les identifiants posés par la vue ou
 * par une autre lentille (E004 notamment). */
function appendDescribedBy(grid, ids) {
  const current = (grid.getAttribute('aria-describedby') || '').trim();
  const list = current ? current.split(/\s+/).filter(Boolean) : [];
  ids.forEach((id) => { if (list.indexOf(id) < 0) list.push(id); });
  set(grid, 'aria-describedby', list.join(' '));
}

/* Toutes les grandeurs sont lues sur la matrice rendue : largeur de la
 * fenêtre, largeur totale, colonnes réellement visibles, pas d'une colonne. */
function readMetrics(grid) {
  const head = grid.querySelector('.points-grid-row.is-head');
  const all = head ? Array.prototype.slice.call(head.children) : [];
  const domains = all.slice(1);
  const scrollMax = Math.max(0, grid.scrollWidth - grid.clientWidth);
  const left = clamp(grid.scrollLeft, 0, scrollMax);
  const right = left + grid.clientWidth;
  let first = -1;
  let last = -1;
  domains.forEach((col, index) => {
    const cLeft = col.offsetLeft;
    const cRight = cLeft + col.offsetWidth;
    if (cRight > left && cLeft < right) {
      if (first < 0) first = index;
      last = index;
    }
  });
  const step = domains.length ? domains[0].offsetWidth : grid.clientWidth;
  const percent = scrollMax > 0 ? Math.round((left / scrollMax) * 100) : 100;
  return {
    domainCount: domains.length, scrollMax, left, first, last,
    step: Math.max(1, step || grid.clientWidth), percent,
  };
}

/* Écritures bornées par signature : le statut ne parle que quand la plage de
 * colonnes visibles change, la barre de progression ne bouge qu'au pourcentage
 * près, les boutons ne changent qu'aux limites. */
function update(grid, refs) {
  const m = readMetrics(grid);
  const overflow = m.scrollMax > 0;

  const readoutSig = overflow ? `${m.first}:${m.last}` : 'all';
  if (readoutSig !== refs.readoutSig) {
    refs.readoutSig = readoutSig;
    if (overflow) {
      const first = m.first >= 0 ? m.first + 1 : 1;
      const last = m.last >= 0 ? m.last + 1 : Math.max(first, m.domainCount);
      refs.readout.textContent = `Position horizontale : domaines ${first}–${last} sur ${m.domainCount} · ${m.percent} % du parcours.`;
    } else {
      refs.readout.textContent = `Position horizontale : ${m.domainCount} domaine${m.domainCount > 1 ? 's' : ''} visible${m.domainCount > 1 ? 's' : ''}, aucun défilement requis.`;
    }
    set(refs.progress, 'aria-valuetext', refs.readout.textContent);
  }

  if (m.percent !== refs.percent) {
    refs.percent = m.percent;
    refs.thumb.style.width = `${m.percent}%`;
    set(refs.progress, 'aria-valuenow', String(m.percent));
  }

  const atStart = m.left <= 0;
  const atEnd = m.left >= m.scrollMax - 1;
  refs.prev.disabled = atStart;
  refs.start.disabled = atStart;
  refs.next.disabled = atEnd;
  refs.end.disabled = atEnd;

  set(grid, 'data-e007-position', String(m.percent));
}

function moveBy(grid, delta) {
  const refs = refsByGrid.get(grid);
  if (!refs) return;
  const m = readMetrics(grid);
  grid.scrollLeft = clamp(m.left + delta, 0, m.scrollMax);
  update(grid, refs);
}

function makeButton(ctx, refs, id, label, ariaLabel, delta) {
  const button = place(ctx, id, 'button', '', refs.buttons);
  button.textContent = label;
  button.type = 'button';
  set(button, 'aria-label', ariaLabel);
  const node = button;
  bindOnce(node, 'e007Bound', 'click', () => moveBy(refs.grid, delta));
  return button;
}

function install(ctx) {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof layout.querySelector !== 'function') return;
  if (typeof css !== 'function' || typeof el !== 'function') return;

  const grid = layout.querySelector('.points-grid');
  if (!grid || typeof grid.scrollWidth !== 'number') return;
  const matrix = layout.querySelector('.points-matrix') || grid.parentElement;
  if (!matrix || typeof matrix.appendChild !== 'function') return;

  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  set(grid, 'data-e007', '1');
  if (!grid.hasAttribute('tabindex')) set(grid, 'tabindex', '0');

  const controls = place(ctx, ID.controls, 'div', 'points-e007-controls', matrix);
  /* Commandes placées juste après la grille, avant les filtres : lecture
   * matrice → défilement → filtres → détail. Insertion additive uniquement. */
  const filters = matrix.querySelector('.points-filters');
  if (filters && controls.nextElementSibling !== filters) matrix.insertBefore(controls, filters);
  const buttons = place(ctx, ID.buttons, 'div', 'points-e007-buttons', controls);
  const readout = place(ctx, ID.readout, 'p', '', controls);
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  const progress = place(ctx, ID.progress, 'div', '', controls);
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-valuemin', '0');
  progress.setAttribute('aria-valuemax', '100');
  progress.setAttribute('aria-label', 'Progression du défilement horizontal de la matrice');
  let thumb = document.getElementById(ID.thumb);
  if (thumb && thumb.parentElement !== progress) thumb.remove();
  if (!thumb || !thumb.isConnected) {
    thumb = el('div', '');
    thumb.id = ID.thumb;
    progress.appendChild(thumb);
  }

  const refs = {
    ctx, grid, controls, buttons, readout, progress, thumb,
    readoutSig: '', percent: -1, prev: null, next: null, start: null, end: null,
  };
  refs.prev = makeButton(ctx, refs, ID.prev, '← Colonne précédente',
    'Faire défiler la matrice d’une colonne vers la gauche', -1);
  refs.next = makeButton(ctx, refs, ID.next, 'Colonne suivante →',
    'Faire défiler la matrice d’une colonne vers la droite', 1);
  refs.start = makeButton(ctx, refs, ID.start, 'Début',
    'Aller à la première colonne de la matrice', -Infinity);
  refs.end = makeButton(ctx, refs, ID.end, 'Fin',
    'Aller à la dernière colonne de la matrice', Infinity);

  /* Lecture linéaire des colonnes, dans l'ordre réel de l'en-tête. */
  const head = grid.querySelector('.points-grid-row.is-head');
  const domains = head ? Array.prototype.slice.call(head.children).slice(1) : [];
  const hint = place(ctx, ID.hint, 'p', 'points-e007-sr', matrix);
  hint.textContent = 'Défilement horizontal borné de la matrice : utilisez les boutons « Colonne précédente » et « Colonne suivante », ou, quand la grille a le focus, les flèches gauche et droite, Début et Fin. La grille ne défile que jusqu’aux colonnes réellement présentes.';
  const columns = place(ctx, ID.columns, 'ol', 'points-e007-sr', matrix);
  columns.replaceChildren();
  domains.forEach((col, index) => {
    const name = (col.textContent || '').trim() || 'sans nom';
    columns.appendChild(el('li', '', `Colonne ${index + 1} sur ${domains.length} : ${name}`));
  });
  appendDescribedBy(grid, [ID.hint, ID.columns]);

  refsByGrid.set(grid, refs);
  if (!listened.has(grid)) {
    listened.add(grid);
    grid.addEventListener('scroll', () => update(refs.grid, refs), { passive: true });
  }
  /* Flèches et extrémités : handler LOCAL sur la grille seule. Le garde
   * `event.target === grid` laisse les flèches aux cellules et aux boutons. */
  bindOnce(grid, 'e007Keys', 'keydown', (event) => {
    if (event.target !== grid) return;
    if (event.key === 'ArrowRight') { moveBy(grid, refs.step); event.preventDefault(); }
    else if (event.key === 'ArrowLeft') { moveBy(grid, -refs.step); event.preventDefault(); }
    else if (event.key === 'Home') { moveBy(grid, -Infinity); event.preventDefault(); }
    else if (event.key === 'End') { moveBy(grid, Infinity); event.preventDefault(); }
  });

  update(grid, refs);
}

register('E007', (ctx) => {
  try {
    install(ctx);
  } catch {
    return;
  }
});
