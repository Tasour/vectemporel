import { register } from './registry.js';

/* Lentille POINTS E009 — passe 2 (V2) : survol de cellule en infobulle non
 * modale accessible (domaine A : matrice & grille).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E009.md — chantiers E009-01 à E009-10.
 * Fichier possédé : ce module uniquement. Aucun fichier de la passe 1 ni aucun
 * fichier partagé (vue points.js, coque, styles.css, registry.js, index.js)
 * n'est modifié : la lentille ajoute sa propre portée CSS et ses propres nœuds,
 * et s'appuie sur le DOM déjà produit par la vue.
 *
 * Contrat exploité intégralement :
 * - ctx.viewId  → filtre strict sur 'pointsv2', reporté sur les ancres ;
 * - ctx.stage   → racine de repli et marqueur non destructif ;
 * - ctx.layout  → racine de requête et classe de portée .points-v2-e009 ;
 * - ctx.css('points-v2-e009', CSS) → UNE seule feuille, toute préfixée ;
 * - ctx.el(...) → tout le DOM statique, jamais innerHTML ;
 * - ctx.reducedMotion() → couplage JS défensif (attribut + media query).
 *
 * Invariants V2 :
 * - un seul register('E009', …), une seule feuille, une seule infobulle, une
 *   seule ligne de métriques, un seul jeu d'écouteurs par grille ;
 * - préfixe .points-v2-e009 sur TOUTES les règles, y compris dans les @media ;
 * - ids uniques points-v2-e009-* avec garde anti-doublon (getElementById) ;
 * - attributs/classes V2 distincts de la passe 1 (data-e009-v2-*) : les deux
 *   passes peuvent coexister sans écraser leurs signaux ni leurs IDREF ;
 * - non modale : pas de role=dialog, pas d'aria-modal, pas d'inert, pas de
 *   backdrop, pas de piège de focus, pointer-events:none, aucune touche globale ;
 * - tout le contenu est dérivé du DOM existant (libellé d'ère, en-tête de
 *   domaine, chiffre de la cellule, attribut title) : aucune date, aucun total,
 *   aucun import de dataset ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro écouteur global,
 *   zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-v2-e009';
const SCOPE = 'points-v2-e009';
const TIP_ID = 'points-v2-e009-tooltip';
const METRICS_ID = 'points-v2-e009-metrics';
const TIP_CLASS = 'points-v2-e009-tooltip';
const METRICS_CLASS = 'points-v2-e009-metrics';
const REDUCED_ATTR = 'data-points-v2-e009-reduced';
const OPEN_ATTR = 'data-e009-v2-open';
const BOUND_ATTR = 'data-e009-v2-bound';
const CELL_ATTR = 'data-e009-v2-cell';
const DATA_SCOPE = 'pointsV2E009';

/* Chaque sélecteur commence littéralement par `.points-v2-e009`, y compris à
 * l'intérieur des @media : aucune règle ne peut fuir hors de la vue Points V2.
 * Les attributs de donnée sont distincts de la passe 1 (data-e009-open,
 * data-e009-cell, data-e009) pour ne pas écraser ses signaux. */
const CSS = `
  /* E009-01 : la coque devient le repère de positionnement de l'infobulle. */
  .points-v2-e009 { position: relative; }
  /* E009-01 : infobulle absolue, au-dessus du contenu, non obstructive. */
  .points-v2-e009 .points-v2-e009-tooltip {
    position: absolute; z-index: 40;
    width: max-content; max-width: min(320px, 80vw);
    margin: 0; padding: 8px 10px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: #080b10; color: var(--ink-soft);
    box-shadow: 0 6px 20px rgba(0, 0, 0, .45);
    font-size: 11px; line-height: 1.45; font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  /* E009-01 : l'affichage repose sur le seul attribut hidden. */
  .points-v2-e009 .points-v2-e009-tooltip[hidden] { display: none; }
  .points-v2-e009 .points-v2-e009-label {
    display: block; color: var(--gold-bright);
    font-weight: 600; letter-spacing: .02em;
  }
  .points-v2-e009 .points-v2-e009-body { display: block; margin-top: 3px; }
  /* E009-06 : la teinte d'absence est redondante, le texte porte l'info. */
  .points-v2-e009 .points-v2-e009-empty { color: var(--gold); }
  .points-v2-e009 .points-v2-e009-hint {
    display: block; margin-top: 6px;
    color: var(--muted-2); font-size: 9px;
  }
  /* E009-04 : repère visuel de la cellule décrite, jamais la seule couleur. */
  .points-v2-e009 .points-cell[${OPEN_ATTR}] {
    outline: 2px solid var(--gold-bright);
    outline-offset: 1px;
  }
  /* E009-08 : ligne de métriques auditable, hors région live. */
  .points-v2-e009 .points-v2-e009-metrics {
    margin: 10px 0 0; color: var(--muted-2); font-size: 9px;
  }
  /* E009-09 : transition courte sur l'outline, neutralisée plus bas. */
  .points-v2-e009 .points-cell[${OPEN_ATTR}] {
    transition: outline-color .15s linear;
  }
  /* E009-05 : repli mobile, largeur bornée à la fenêtre. */
  @media (max-width: 900px) {
    .points-v2-e009 .points-v2-e009-tooltip {
      max-width: min(300px, calc(100vw - 24px));
    }
  }
  /* E009-09 : couplage JS, pour les environnements sans matchMedia fiable. */
  .points-v2-e009[${REDUCED_ATTR}="1"] .points-cell[${OPEN_ATTR}] { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e009 .points-cell[${OPEN_ATTR}] { transition: none; }
  }
  /* E009-06 : couleurs forcées — l'outline reste visible, le texte explicite. */
  @media (forced-colors: active) {
    .points-v2-e009 .points-cell[${OPEN_ATTR}] { outline-color: Highlight; }
    .points-v2-e009 .points-v2-e009-tooltip {
      border-color: CanvasText; background: Canvas; color: CanvasText;
    }
  }
`;

let layoutRef = null;       // dernier .points-layout installé
let gridRef = null;         // dernière .points-grid installée
let tip = null;             // infobulle V2 unique
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
  const index = Array.prototype.indexOf.call(cells, cell);
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
  const hasPoints = !!(cell.classList && cell.classList.contains('has-points')) || count > 0;
  return { era, domain, count, hasPoints, title, index };
}

function labelFor(info) {
  return `${info.era || 'Ère non identifiée'} · ${info.domain || 'Domaine non identifié'}`;
}

/* E009-06 : un compte à zéro est nommé, jamais suggéré par une couleur ou
 * par le seul point médian « · ». Le pluriel est calculé, jamais codé en dur. */
function messageFor(info) {
  if (info.hasPoints && info.count > 0) {
    const noun = info.count > 1 ? 'points' : 'point';
    const verb = info.count > 1 ? 'validés' : 'validé';
    return `${info.count} ${noun} ${verb} à cette intersection.`;
  }
  return 'Aucun point validé à cette intersection : un silence de couverture, pas une absence de donnée.';
}

function writeMetrics(ctx) {
  if (!metrics || typeof ctx.el !== 'function') return;
  metrics.textContent = `Infobulle V2 : ouvertures ${openCount} · écritures de contenu ${writeCount} · cellules visitées ${cellCount}.`;
}

/* E009-08 : le contenu n'est réécrit que si la cellule ou son libellé change. */
function writeContent(ctx, cell) {
  if (!tip || typeof ctx.el !== 'function') return;
  const info = cellInfo(cell, gridRef);
  const signature = [info.era, info.domain, info.count, info.hasPoints].join('|');
  if (signature === lastSignature) return;
  lastSignature = signature;
  writeCount += 1;
  const label = ctx.el('span', 'points-v2-e009-label', labelFor(info));
  const body = ctx.el('span', info.hasPoints ? 'points-v2-e009-body' : 'points-v2-e009-body points-v2-e009-empty', messageFor(info));
  const hint = ctx.el('span', 'points-v2-e009-hint', 'Infobulle non modale : la grille reste active. Tab parcourt les cellules, un clic applique le filtre.');
  /* replaceChildren : aucun innerHTML, aucune réinterprétation du balisage. */
  tip.replaceChildren(label, body, hint);
}

/* E009-05 : position bornée dans la coque, jamais au-dessus de la cellule
 * sources et jamais coupée par les bords. Une seule mesure à l'ouverture. */
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

/* E009-04 : union préservée des IDREF — la passe 1 ou une autre lentille peut
 * déjà avoir écrit aria-describedby sur la cellule, on ne retire que le nôtre. */
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
  if (!cell || !tip || !gridRef || typeof gridRef.contains !== 'function' || !gridRef.contains(cell)) return;
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
  if (!cell.getAttribute(CELL_ATTR) || cell.getAttribute(CELL_ATTR) !== signature) {
    cell.setAttribute(CELL_ATTR, signature);
    cellCount += 1;
  }
  writeContent(ctx, cell);
  placeTip(cell);
  /* L'IDREF n'est posé qu'une fois le nœud visible : le focus lecteur d'écran
   * lit alors une description déjà présente et non un élément masqué. */
  describe(cell, true);
  openCount += 1;
  writeMetrics(ctx);
}

/* E009-07 : un seul jeu d'écouteurs délégués sur la grille, aucun écouteur
 * documentaire, aucune touche interceptée (Échap et flèches restent au
 * routeur src/platform/keyboard.js). */
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

function apply(ctx) {
  /* E009-10 : filtre sur la vue V2 et gardes de type pour un ctx minimal. */
  if (!ctx || ctx.viewId !== 'pointsv2') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const stage = ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null;
  const viewId = ctx.viewId;

  const grid = layout.querySelector('.points-grid');
  if (!grid) return;
  const matrix = layout.querySelector('.points-matrix') || layout;
  const doc = layout.ownerDocument
    || (stage && stage.ownerDocument)
    || (typeof document !== 'undefined' ? document : null);
  if (!doc || typeof doc.getElementById !== 'function') return;

  /* E009-10 : injection unique et ancrage de portée sur la vue. */
  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  if (layout.dataset) layout.dataset[DATA_SCOPE] = viewId;
  if (stage && stage.dataset) stage.dataset[DATA_SCOPE] = viewId;
  if (grid.dataset) grid.dataset[DATA_SCOPE] = viewId;

  /* E009-09 : couplage explicite à la préférence de mouvement réduit. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

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

  /* E009-01 : une seule infobulle, créée par ctx.el, réutilisée d'un rendu à
   * l'autre. Garde anti-doublon via getElementById et contrôle du parent. */
  const staleTip = doc.getElementById(TIP_ID);
  if (staleTip && staleTip.parentElement !== layout) staleTip.remove();
  tip = doc.getElementById(TIP_ID);
  if (!tip) {
    tip = ctx.el('div', TIP_CLASS);
    tip.id = TIP_ID;
    tip.setAttribute('role', 'tooltip');
  }
  tip.hidden = true;
  if (tip.parentElement !== layout) layout.appendChild(tip);

  /* E009-08 : une seule ligne de métriques, hors région live. */
  const staleMetrics = doc.getElementById(METRICS_ID);
  if (staleMetrics && staleMetrics.parentElement !== matrix) staleMetrics.remove();
  metrics = doc.getElementById(METRICS_ID);
  if (!metrics) {
    metrics = ctx.el('p', METRICS_CLASS);
    metrics.id = METRICS_ID;
  }
  if (metrics.parentElement !== matrix) matrix.appendChild(metrics);
  writeMetrics(ctx);

  /* E009-04 / E009-10 : nettoyage sélectif — on ne retire que notre IDREF et
   * nos marqueurs, jamais ceux de la passe 1 ni ceux d'autrui. */
  const cells = grid.querySelectorAll('.points-cell[aria-describedby]');
  Array.prototype.forEach.call(cells, (cell) => {
    if ((cell.getAttribute('aria-describedby') || '').split(/\s+/).includes(TIP_ID)) describe(cell, false);
  });
  Array.prototype.forEach.call(grid.querySelectorAll(`.points-cell[${OPEN_ATTR}]`), (cell) => cell.removeAttribute(OPEN_ATTR));
  Array.prototype.forEach.call(grid.querySelectorAll(`.points-cell[${CELL_ATTR}]`), (cell) => cell.removeAttribute(CELL_ATTR));

  bind(ctx, grid, matrix);
}

register('E009', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
