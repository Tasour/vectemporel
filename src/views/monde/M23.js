import { register } from './registry.js';

/* Lentille M23 — Cibles tactiles et plancher 44 px (domaine C : ergonomie & interaction).
 *
 * Rapport : UNIFIED_AUDIT/MONDE/views/M23.md (chantiers M23-01 à M23-10).
 * Un seul fichier possédé. CSS injecté une fois via ctx.css('monde-m23', …).
 * Aucun styles.css, aucun sélecteur de test modifié, aucun réseau, aucun aléa,
 * aucun appel à la console, aucune boucle rAF, aucun timer, aucun IntersectionObserver.
 * Ergonomie tactile : libellés de commandes sans débordement, focus des 3 commandes,
 * panneau diagnostic déplacé au-dessus des commandes sur mobile (zéro chevauchement HUD/zoom).
 *
 * Les 13 cibles auditées : 3 boutons .globe-controls button + 10 cartes
 * .globe-country. Les sélecteurs de tests (.globe-list button, .event-card, …)
 * ne sont ni renommés, ni masqués, ni déplacés : seule leur surface change.
 */

const STYLE_ID = 'monde-m23';
const PANEL_ID = 'monde-m23-audit';
const MARK = 'mondeM23';          // attribut data-monde-m23
const MIN = 44;                   // px — WCAG 2.5.5 (AAA), plancher visé
const TOL = 0.5;                  // tolérance sous-pixel pour getBoundingClientRect

const CSS = `
  /* M23-01/04/07 : plancher 44 px, geste tactile sans délai 300 ms. */
  .globe-view[data-monde-m23="1"] { --m23-country-h: 86px; }
  .globe-view[data-monde-m23="1"] .globe-controls button,
  .globe-view[data-monde-m23="1"] .globe-country {
    box-sizing: border-box;
    min-width: ${MIN}px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  /* M23-04 : on ne réduit jamais les hauteurs existantes (86 / 66 px) ;
     max() garantit le plancher 44 px même si une autre règle les abaisse. */
  .globe-view[data-monde-m23="1"] .globe-country {
    min-height: max(${MIN}px, var(--m23-country-h, 86px));
  }
  /* M23-01 : plancher 46 px, largeur adaptative — le libellé « Rotation active »
     tient dans la boîte au lieu de déborder sur la commande voisine (mobile). */
  .globe-view[data-monde-m23="1"] .globe-controls button {
    flex: 0 0 auto;
    width: auto;
    min-width: 46px;
    height: 46px;
    min-height: ${MIN}px;
    padding: 0 10px;
    line-height: 1.2;
    white-space: nowrap;
    text-align: center;
  }
  /* M23-02/05 : écarts verrouillés à 8 px, marges nulles sur les items. */
  .globe-view[data-monde-m23="1"] .globe-controls,
  .globe-view[data-monde-m23="1"] .globe-choices { gap: 8px; }
  .globe-view[data-monde-m23="1"] .globe-choices li { margin: 0; }
  .globe-view[data-monde-m23="1"] .globe-controls { align-items: flex-start; }
  /* M23-03 : le HUD informatif ne vole pas les taps destinés au canvas. */
  .globe-view[data-monde-m23="1"] .globe-hud > .globe-status,
  .globe-view[data-monde-m23="1"] .globe-hud > .globe-hover-readout {
    pointer-events: none;
  }
  /* M23-08 : anneau de focus non recadré autour de la cible 44 px,
     appliqué aux 10 cartes ET aux 3 commandes du globe. */
  .globe-view[data-monde-m23="1"] .globe-country:focus-visible,
  .globe-view[data-monde-m23="1"] .globe-controls button:focus-visible {
    outline: 3px solid var(--gold-bright);
    outline-offset: 3px;
    scroll-margin: 6px;
  }
  /* M23-06 : zoom 200 % / reflow — planchers réaffirmés, jamais réduits. */
  @media (max-width: 1000px) {
    .globe-view[data-monde-m23="1"] { --m23-country-h: 66px; }
    .globe-view[data-monde-m23="1"] .globe-controls {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
  /* M23-09/10 : diagnostic non obstructif, sous le HUD, loin des commandes. */
  #${PANEL_ID} {
    position: absolute; right: 16px; top: 96px; z-index: 6;
    max-width: min(300px, 40vw); margin: 0; padding: 6px 9px;
    border: 1px solid var(--line); border-radius: 8px;
    background: rgba(8, 11, 16, .88); color: var(--muted);
    font-size: 11px; line-height: 1.4; font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  #${PANEL_ID}[data-state="ok"] { border-color: var(--line-strong); }
  #${PANEL_ID}[data-state="warn"] { border-color: var(--red); color: var(--ink); }
  @media (max-width: 1000px) {
    /* bottom:8 + hauteur 46 + marge 8 = 62 px : au-dessus des commandes,
       et sous le HUD empilé (dont la hauteur varie avec le retour à la ligne). */
    #${PANEL_ID} {
      left: 8px; right: auto; top: auto; bottom: 62px;
      max-width: min(260px, 70vw);
    }
  }
`;

/* Un seul jeu d'écouteurs et un seul panneau pour toute la session. */
let resizeHooked = false;
let panel = null;

/* M23-10 : marqueur idempotent posé à chaque rendu (la vue est reconstruite).
   Le CSS est conditionné à data-monde-m23 : sans la lentille, aucun effet. */
function mark(ctx) {
  const scene = ctx && ctx.scene;
  const view = scene && typeof scene.closest === 'function'
    ? scene.closest('.globe-view') : null;
  if (view && view.dataset) view.dataset[MARK] = '1';
  if (scene && scene.dataset) scene.dataset[MARK] = '1';
  if (ctx && ctx.host && ctx.host.dataset) ctx.host.dataset[MARK] = '1';
  return view;
}

function ensurePanel(ctx) {
  if (panel && panel.isConnected) return panel;
  const existing = document.getElementById(PANEL_ID);
  if (existing) { panel = existing; return panel; }
  if (!ctx || typeof ctx.el !== 'function') return null;
  const node = ctx.el('p', 'monde-m23-audit');
  node.id = PANEL_ID;
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('aria-atomic', 'true');
  node.textContent = 'Cibles tactiles : mesure en attente.';
  const parent = ctx.scene && ctx.scene.isConnected
    ? ctx.scene
    : (ctx.host && ctx.host.isConnected ? ctx.host : null);
  if (parent) parent.appendChild(node);
  panel = node;
  return node;
}

function targets(view) {
  if (!view || typeof view.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(
    view.querySelectorAll('.globe-controls button, .globe-country')
  );
}

function gapOf(view, selector) {
  if (!view || !view.querySelector) return null;
  const node = view.querySelector(selector);
  if (!node || !window.getComputedStyle) return null;
  const style = window.getComputedStyle(node);
  return style.columnGap || style.gap || style.rowGap || null;
}

function overlayBusy() {
  const overlay = document.getElementById('globe-reveal');
  return !!(overlay && overlay.classList && overlay.classList.contains('is-revealing'));
}

/* M23-09 : sonde d'obstruction — au centre de chaque cible, l'élément au-dessus
   doit être la cible elle-même ou l'un de ses descendants. On ignore les cibles
   partiellement hors écran et la phase de révélation (overlay plein écran). */
function insideScrollParents(node, x, y) {
  let parent = node.parentElement;
  while (parent && parent !== document.body) {
    let clipped = false;
    try {
      const style = window.getComputedStyle(parent);
      clipped = /auto|scroll|hidden/.test(
        `${style.overflow} ${style.overflowX} ${style.overflowY}`
      );
    } catch { /* style indisponible : on ne conclut pas à une obstruction */ }
    if (clipped) {
      const box = parent.getBoundingClientRect();
      if (x < box.left || x > box.right || y < box.top || y > box.bottom) return false;
    }
    parent = parent.parentElement;
  }
  return true;
}

function obstructed(node, rect) {
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const fullyVisible = rect.width > 0 && rect.height > 0 &&
    rect.left >= 0 && rect.top >= 0 &&
    rect.right <= window.innerWidth && rect.bottom <= window.innerHeight;
  if (!fullyVisible || overlayBusy() || !insideScrollParents(node, x, y)) return false;
  try {
    const top = document.elementFromPoint(x, y);
    return !!top && top !== node && !node.contains(top);
  } catch {
    return false;
  }
}

function measure(view) {
  const list = targets(view);
  let under = 0;
  let blocked = 0;
  list.forEach((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.width + TOL < MIN || rect.height + TOL < MIN) under += 1;
    const isBlocked = obstructed(node, rect);
    if (isBlocked) {
      blocked += 1;
      node.dataset.m23Obstructed = '1';
    } else {
      delete node.dataset.m23Obstructed;
    }
  });
  return {
    total: list.length,
    under,
    blocked,
    gapControls: gapOf(view, '.globe-controls'),
    gapChoices: gapOf(view, '.globe-choices'),
  };
}

function paint(view, m) {
  if (view && view.dataset) {
    view.dataset.m23Targets = String(m.total);
    view.dataset.m23Under = String(m.under);
    view.dataset.m23Blocked = String(m.blocked);
  }
  if (!panel || !panel.isConnected) return;
  if (!view || m.total === 0) {
    panel.dataset.state = 'idle';
    panel.textContent = 'Cibles tactiles : vue globe non mesurée.';
    return;
  }
  const ok = m.total - m.under;
  panel.dataset.state = (m.under === 0 && m.blocked === 0) ? 'ok' : 'warn';
  panel.textContent =
    `Cibles tactiles : ${ok}/${m.total} ≥ ${MIN} px · ` +
    `écarts ${m.gapControls || '?'} / ${m.gapChoices || '?'} · ` +
    `obstruction ${m.blocked}.`;
}

function refresh(ctx) {
  const view = mark(ctx);           // M23-06/10 : marqueur à chaque rendu
  ensurePanel(ctx);
  paint(view, measure(view));
}

/* M23-10 : un seul écouteur resize, passif ; aucun rAF, aucun timer. */
function installResize() {
  if (resizeHooked) return;
  resizeHooked = true;
  window.addEventListener('resize', () => {
    const view = document.querySelector('.globe-view[data-monde-m23="1"]');
    if (!view) return;
    const live = document.getElementById(PANEL_ID);
    if (live) { panel = live; paint(view, measure(view)); }
  }, { passive: true });
}

register('M23', (ctx) => {
  if (!ctx || typeof ctx.css !== 'function') return;
  ctx.css(STYLE_ID, CSS);
  refresh(ctx);
  installResize();
});
