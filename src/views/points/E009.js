import { register } from './registry.js';

/* Lentille E009 — Survol de cellule en infobulle non modale accessible
 * (domaine A : matrice & grille).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E009.md — chantiers E009-01 à E009-10.
 * Fichier possédé : ce module uniquement. La vue `src/views/points.js`, la feuille
 * `styles.css` et les autres lentilles ne sont ni éditées ni doublées.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Le ctx des
 * points n'expose pas `say` : E009 reste silencieuse (aucune région live ajoutée),
 * le texte de l'infobulle étant déjà dans l'arbre d'accessibilité via
 * `role="tooltip"` et `aria-describedby`.
 *
 * Invariants :
 * - un seul CSS, une seule infobulle, une seule ligne de métriques, un seul
 *   jeu d'écouteurs par grille ;
 * - non modale : pas de `role=dialog`, pas d'`aria-modal`, pas de backdrop,
 *   pas de piège de focus, `pointer-events: none`, aucune touche globale ;
 * - tout le contenu est dérivé du DOM existant (libellé d'ère, en-tête de
 *   domaine, chiffre de la cellule, attribut `title`) : aucune date, aucun
 *   total, aucun import de dataset ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro `console.*`,
 *   zéro `innerHTML`.
 */

const CSS_ID = 'points-e009';
const TIP_ID = 'points-e009-tooltip';
const METRICS_ID = 'points-e009-metrics';
const OPEN_ATTR = 'data-e009-open';
const BOUND_ATTR = 'data-e009-bound';

const CSS = `
  .points-layout[data-e009] { position: relative; }
  #${TIP_ID} {
    position: absolute; z-index: 40;
    width: max-content; max-width: min(320px, 80vw);
    margin: 0; padding: 8px 10px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: rgba(8, 11, 16, .97); color: var(--ink-soft);
    box-shadow: 0 6px 20px rgba(0, 0, 0, .45);
    font-size: 11px; line-height: 1.45; font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  #${TIP_ID}[hidden] { display: none; }
  #${TIP_ID} .points-e009-label {
    display: block; color: var(--gold-bright);
    font-weight: 600; letter-spacing: .02em;
  }
  #${TIP_ID} .points-e009-body { display: block; margin-top: 3px; }
  #${TIP_ID} .points-e009-empty { color: var(--gold); }
  #${TIP_ID} .points-e009-hint {
    display: block; margin-top: 6px;
    color: var(--muted-2); font-size: 9px;
  }
  .points-cell[${OPEN_ATTR}] { outline: 2px solid var(--gold-bright); outline-offset: 1px; }
  #${METRICS_ID} { margin: 10px 0 0; color: var(--muted-2); font-size: 9px; }
  @media (max-width: 900px) {
    #${TIP_ID} { max-width: min(300px, calc(100vw - 24px)); }
  }
  @media (prefers-reduced-motion: reduce) {
    #${TIP_ID}, .points-cell[${OPEN_ATTR}] { transition: none; }
  }
`;

let layoutRef = null;       // dernier .points-layout installé
let gridRef = null;         // dernière .points-grid installée
let tip = null;             // infobulle unique
let metrics = null;         // ligne de métriques, hors région live
let activeCell = null;      // cellule courante (souris ou focus)
let lastSignature = '';     // signature anti-écriture redondante
let openCount = 0;          // ouvertures réelles, réinitialisées par rendu
let writeCount = 0;         // écritures de contenu effectuées
let cellCount = 0;          // cellules distinctes visitées

function asCell(target) {
  return target && typeof target.closest === 'function'
    ? target.closest('.points-cell')
    : null;
}

function trimmed(node) {
  return node ? String(node.textContent || '').trim() : '';
}

/* E009-03 : aucune donnée n'est importée ; ère, domaine et compte sont lus
 * dans la ligne, l'en-tête et le libellé de la cellule déjà rendus. */
function cellInfo(cell, grid) {
  const row = typeof cell.closest === 'function' ? cell.closest('.points-grid-row') : null;
  let era = trimmed(row ? row.querySelector('.points-era') : null);
  const cells = row ? row.querySelectorAll('.points-cell') : [];
  const index = Array.from(cells).indexOf(cell);
  const head = grid ? grid.querySelector('.points-grid-row.is-head') : null;
  const headers = head ? head.querySelectorAll('span') : [];
  let domain = index >= 0 && headers[index + 1] ? trimmed(headers[index + 1]) : '';
  const raw = trimmed(cell);
  const count = /^\d+$/.test(raw) ? Number(raw) : 0;
  const title = String(cell.getAttribute('title') || '').trim();
  if (!era || !domain) {
    const parts = title.split('·').map((part) => part.trim()).filter(Boolean);
    if (!era && parts[0]) era = parts[0];
    if (!domain && parts[1]) domain = parts[1];
  }
  const hasPoints = cell.classList.contains('has-points') || count > 0;
  return { era, domain, count, hasPoints, title, index };
}

function labelFor(info) {
  return `${info.era || 'Ère non identifiée'} · ${info.domain || 'Domaine non identifié'}`;
}

/* E009-06 : un compte à zéro est nommé, jamais suggéré par une couleur ou
 * par le seul point médian « · ». */
function messageFor(info) {
  if (info.hasPoints && info.count > 0) {
    const noun = info.count > 1 ? 'points' : 'point';
    const verb = info.count > 1 ? 'validés' : 'validé';
    return `${info.count} ${noun} ${verb} à cette intersection.`;
  }
  return 'Aucun point validé à cette intersection : un silence de couverture, pas une absence de donnée.';
}

function writeMetrics() {
  if (!metrics) return;
  metrics.textContent = `Infobulle : ouvertures ${openCount} · écritures de contenu ${writeCount} · cellules visitées ${cellCount}.`;
}

/* E009-02 : le contenu n'est réécrit que si la cellule ou son libellé change. */
function writeContent(ctx, cell) {
  const info = cellInfo(cell, gridRef);
  const signature = [info.era, info.domain, info.count, info.hasPoints].join('|');
  if (signature === lastSignature) return;
  lastSignature = signature;
  writeCount += 1;
  const label = ctx.el('span', 'points-e009-label', labelFor(info));
  const body = ctx.el('span', info.hasPoints ? 'points-e009-body' : 'points-e009-body points-e009-empty', messageFor(info));
  const hint = ctx.el('span', 'points-e009-hint', 'Infobulle non modale : la grille reste active. Tab parcourt les cellules, un clic applique le filtre.');
  tip.replaceChildren(label, body, hint);
}

/* E009-05 : position bornée dans la coque, jamais au-dessus de la cellule
 * sources et jamais coupée par les bords. */
function placeTip(cell) {
  if (!tip || !layoutRef) return;
  const cellRect = cell.getBoundingClientRect();
  const hostRect = layoutRef.getBoundingClientRect();
  tip.hidden = false;
  const tipWidth = tip.offsetWidth || 240;
  const tipHeight = tip.offsetHeight || 80;
  let left = cellRect.left - hostRect.left + cellRect.width / 2 - tipWidth / 2;
  let top = cellRect.bottom - hostRect.top + 8;
  left = Math.max(8, Math.min(left, Math.max(8, hostRect.width - tipWidth - 8)));
  if (top + tipHeight > hostRect.height - 8) {
    const above = cellRect.top - hostRect.top - tipHeight - 8;
    top = above >= 8 ? above : Math.max(8, hostRect.height - tipHeight - 8);
  }
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
}

/* E009-04 : union préservée des IDREF — une autre lentille peut déjà avoir
 * écrit aria-describedby sur la cellule, on ne retire que le nôtre. */
function describe(cell, add) {
  if (!cell || typeof cell.getAttribute !== 'function') return;
  const ids = (cell.getAttribute('aria-describedby') || '')
    .split(/\s+/).filter(Boolean).filter((id) => id !== TIP_ID);
  if (add) ids.push(TIP_ID);
  if (ids.length) cell.setAttribute('aria-describedby', ids.join(' '));
  else cell.removeAttribute('aria-describedby');
}

function hide() {
  if (!tip) return;
  tip.hidden = true;
  if (activeCell) {
    activeCell.removeAttribute(OPEN_ATTR);
    describe(activeCell, false);
  }
  activeCell = null;
}

function show(ctx, cell) {
  if (!cell || !tip || !gridRef || !gridRef.contains(cell)) return;
  if (activeCell === cell && !tip.hidden) {
    placeTip(cell);
    return;
  }
  if (activeCell && activeCell !== cell) {
    activeCell.removeAttribute(OPEN_ATTR);
    describe(activeCell, false);
  }
  activeCell = cell;
  cell.setAttribute(OPEN_ATTR, '');
  const info = cellInfo(cell, gridRef);
  const signature = [info.era, info.domain].join('|');
  if (!activeCell.dataset.e009Cell || activeCell.dataset.e009Cell !== signature) {
    activeCell.dataset.e009Cell = signature;
    cellCount += 1;
  }
  writeContent(ctx, cell);
  placeTip(cell);
  /* L'IDREF n'est posé qu'une fois le nœud visible : le focus lecteur d'écran
   * lit alors une description déjà présente et non un élément masqué. */
  describe(cell, true);
  openCount += 1;
  writeMetrics();
}

/* E009-07 : un seul jeu d'écouteurs délégués sur la grille, aucun écouteur
 * documentaire, aucune touche interceptée (Échap et flèches restent au
 * routeur src/platform/keyboard.js:143, :171). */
function bind(ctx, grid, matrix) {
  if (!grid || grid.getAttribute(BOUND_ATTR) === '1') return;
  grid.setAttribute(BOUND_ATTR, '1');
  grid.addEventListener('mouseover', (event) => {
    const cell = asCell(event.target);
    if (cell && grid.contains(cell)) show(ctx, cell);
  });
  grid.addEventListener('mouseout', (event) => {
    const cell = asCell(event.target);
    if (!cell || activeCell !== cell) return;
    const next = asCell(event.relatedTarget);
    if (next && cell.contains(next)) return;
    if (next && next !== cell) return; // le mouseover suivant bascule la cible
    hide();
  });
  grid.addEventListener('focusin', (event) => {
    const cell = asCell(event.target);
    if (cell && grid.contains(cell)) show(ctx, cell);
  });
  grid.addEventListener('focusout', (event) => {
    const cell = asCell(event.target);
    if (cell && activeCell === cell) hide();
  });
  /* E009-05 : le défilement rend la position caduque ; on masque sans timer. */
  matrix.addEventListener('scroll', hide, { passive: true });
  grid.addEventListener('scroll', hide, { passive: true });
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function' || !ctx.layout) return;
  ctx.css(CSS_ID, CSS);
  const layout = ctx.layout;
  const grid = layout.querySelector('.points-grid');
  if (!grid) return;
  const matrix = layout.querySelector('.points-matrix') || layout;

  /* E009-10 : un layout déconnecté marque un rendu neuf ; compteurs remis à
   * zéro, nœuds mal parentés retirés, state périmé abandonné. */
  if (!layoutRef || layoutRef !== layout) {
    layoutRef = layout;
    gridRef = grid;
    activeCell = null;
    lastSignature = '';
    openCount = 0;
    writeCount = 0;
    cellCount = 0;
  } else {
    gridRef = grid;
  }
  layout.dataset.e009 = '';

  const staleTip = document.getElementById(TIP_ID);
  if (staleTip && staleTip.parentElement !== layout) staleTip.remove();
  tip = document.getElementById(TIP_ID);
  if (!tip) {
    tip = ctx.el('div', 'points-e009-tooltip');
    tip.id = TIP_ID;
    tip.setAttribute('role', 'tooltip');
  }
  tip.hidden = true;
  if (tip.parentElement !== layout) layout.appendChild(tip);

  const staleMetrics = document.getElementById(METRICS_ID);
  if (staleMetrics && staleMetrics.parentElement !== matrix) staleMetrics.remove();
  metrics = document.getElementById(METRICS_ID);
  if (!metrics) {
    metrics = ctx.el('p', 'points-e009-metrics');
    metrics.id = METRICS_ID;
  }
  if (metrics.parentElement !== matrix) matrix.appendChild(metrics);
  writeMetrics();

  /* Nettoyage sélectif : on ne retire que notre IDREF, jamais ceux d'autrui. */
  grid.querySelectorAll('.points-cell[aria-describedby]').forEach((cell) => {
    if ((cell.getAttribute('aria-describedby') || '').split(/\s+/).includes(TIP_ID)) describe(cell, false);
  });
  grid.querySelectorAll(`.points-cell[${OPEN_ATTR}]`).forEach((cell) => cell.removeAttribute(OPEN_ATTR));
  grid.querySelectorAll('.points-cell[data-e009-cell]').forEach((cell) => cell.removeAttribute('data-e009-cell'));

  bind(ctx, grid, matrix);
}

register('E009', install);
