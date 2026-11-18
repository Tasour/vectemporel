import { register } from './registry.js';

/* Lentille E077 — Responsive & mobile : contraste renforcé et couleurs forcées
 * (domaine H : responsive & mobile). Chantiers E077-01 à E077-10.
 * Rapport : UNIFIED_AUDIT/POINTS/views/E077.md.
 *
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : E077 ajoute une portée CSS et une
 * légende statique, et s'appuie sur le DOM réel déjà produit par renderPoints().
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres, le détail ni ctx.say : la lisibilité
 * reste assurée avec le ctx minimal.
 *
 * Techniques alignées sur M42 (monde) : couleurs système Canvas / CanvasText /
 * Highlight, @media (prefers-contrast: more) et (forced-colors: active),
 * reflow sans troncature, anneau de focus visible.
 *
 * Invariants : un seul CSS, une seule portée, une seule légende, un seul couple
 * d'écouteurs matchMedia, zéro timer, zéro rAF, zéro réseau, zéro aléa, aucun
 * appel à la console, aucune écriture innerHTML.
 */

const CSS_ID = 'points-e077';
const SCOPE = 'points-e077';
const LEGEND_ID = 'points-e077-legend';
const NOTE_ID = 'points-e077-note';
const MODE_ID = 'points-e077-mode';

const CONTRAST_QUERY = '(prefers-contrast: more)';
const FORCED_QUERY = '(forced-colors: active)';

const NOTE_TEXT = 'Contraste et couleurs : les libellés restent lisibles même si le thème est forcé par le système ; les états actifs sont doublés par un liseré et par un texte, jamais portés par la seule couleur.';

const CSS = `
  /* E077-01 : tout est préfixé par .points-e077, classe posée sur .points-layout. */
  .points-e077 { min-width: 0; }

  /* E077-02 : miroir JS des media queries, exposé par data-e077-* et relu par
   * des sélecteurs de renforcement à l'intérieur des blocs système ci-dessous. */
  @media (prefers-contrast: more) {
    .points-e077[data-e077-contrast="more"] .points-grid { border-color: var(--gold-bright); }
  }
  @media (forced-colors: active) {
    .points-e077[data-e077-forced="active"] .points-detail { border-color: CanvasText; }
  }

  /* E077-03 : reflow / zoom 200 % — plus de min-width rigide sous 700 px. */
  @media (max-width: 700px) {
    .points-e077.points-layout {
      display: block;
      height: auto;
      min-height: 0;
      overflow: visible;
    }
    .points-e077 .points-matrix { overflow: visible; padding: 16px 12px 24px; }
    .points-e077 .points-detail {
      overflow: visible;
      border-left: 0;
      border-top: 1px solid var(--line-strong);
      padding: 16px 12px 24px;
    }
    .points-e077 .points-grid-row {
      grid-template-columns: 120px repeat(auto-fit, minmax(48px, 1fr));
      min-width: 0;
    }
  }
  /* E077-03 (suite) : textes non tronqués et retour à la ligne partout. */
  .points-e077 .points-point-title,
  .points-e077 .points-point-text,
  .points-e077 .points-sources,
  .points-e077 .points-justification,
  .points-e077 .points-meta span,
  .points-e077 .points-families span { overflow-wrap: anywhere; word-break: normal; }

  /* E077-04 : cibles tactiles >= 44 px sur mobile. */
  @media (max-width: 700px) {
    .points-e077 .points-grid-row > span,
    .points-e077 .points-grid-row > button,
    .points-e077 .points-filters select,
    .points-e077 .points-filters button,
    .points-e077 .points-nav button { min-height: 44px; }
  }

  /* E077-05 : prefers-contrast: more — surfaces et bordures renforcées. */
  @media (prefers-contrast: more) {
    .points-e077 .points-grid,
    .points-e077 .points-grid-row.is-head,
    .points-e077 .points-grid-row.is-active,
    .points-e077 .points-detail,
    .points-e077 .points-filters select,
    .points-e077 .points-filters button,
    .points-e077 .points-nav button,
    .points-e077 .points-e077-legend {
      background: #05070a;
      border-color: var(--gold-bright);
      color: var(--ink);
    }
    .points-e077 .points-point-text,
    .points-e077 .points-justification,
    .points-e077 .points-sources,
    .points-e077 .points-meta span,
    .points-e077 .points-families span { color: var(--ink-soft); }
  }

  /* E077-06 : couleurs forcées — chaque surface porte une frontière système. */
  @media (forced-colors: active) {
    .points-e077 .points-grid,
    .points-e077 .points-grid-row,
    .points-e077 .points-grid-row > span,
    .points-e077 .points-grid-row > button,
    .points-e077 .points-detail,
    .points-e077 .points-filters select,
    .points-e077 .points-filters button,
    .points-e077 .points-nav button,
    .points-e077 .points-meta span,
    .points-e077 .points-families span,
    .points-e077 .points-e077-legend {
      border: 1px solid CanvasText;
      background: Canvas;
      color: CanvasText;
      forced-color-adjust: auto;
    }
  }

  /* E077-07 : état actif / cellule peuplée non porté par la couleur. */
  @media (forced-colors: active) {
    .points-e077 .points-grid-row.is-active > :first-child,
    .points-e077 .points-cell.has-points {
      outline: 2px solid Highlight;
      outline-offset: -2px;
    }
    .points-e077 .points-grid-row.is-active > :first-child { font-weight: 700; }
  }

  /* E077-08 : focus visible renforcé, variante Highlight en couleurs forcées. */
  .points-e077 button:focus-visible,
  .points-e077 select:focus-visible { outline: 3px solid var(--gold-bright); outline-offset: 2px; }
  @media (forced-colors: active) {
    .points-e077 button:focus-visible,
    .points-e077 select:focus-visible { outline: 3px solid Highlight; outline-offset: 2px; }
  }

  /* E077-09 : légende statique, lisible sans JS et hors région live. */
  .points-e077 .points-e077-legend {
    margin: 0 0 14px;
    padding: 8px 10px;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    background: rgba(230, 185, 111, .06);
    font-size: 11px;
    line-height: 1.45;
  }
  .points-e077 .points-e077-note { margin: 0 0 4px; color: var(--muted-2); }
  .points-e077 .points-e077-mode { margin: 0; color: var(--ink-soft); font-variant-numeric: tabular-nums; }

  /* E077-10 : mouvement réduit — aucune transition propre à E077. */
  @media (prefers-reduced-motion: reduce) {
    .points-e077 .points-grid-row > button,
    .points-e077 .points-filters button,
    .points-e077 .points-nav button { transition: none; }
  }
`;

let currentLayout = null;   // dernier .points-layout vu, pour les écouteurs
let listenersBound = false; // un seul couple d'écouteurs pour toute la session

/* Détection tolérante : un environnement sans matchMedia ou une implémentation
 * qui lance une exception ne doit jamais faire échouer le rendu de la vue. */
function matches(query) {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia(query).matches;
  } catch { return false; }
}

function modeLabel(forced, contrast) {
  if (forced) return 'Mode détecté : couleurs forcées actives — frontières système et liserés visibles.';
  if (contrast) return 'Mode détecté : contraste renforcé — fonds et bordures accentués.';
  return 'Mode détecté : thème standard — la légende s’adapte automatiquement aux préférences du système.';
}

/* Un seul écrivain pour les signaux : attributs observables + ligne de texte. */
function writePreferenceState() {
  if (!currentLayout) return;
  const forced = matches(FORCED_QUERY);
  const contrast = matches(CONTRAST_QUERY);
  const forcedValue = forced ? 'active' : 'none';
  const contrastValue = contrast ? 'more' : 'normal';
  if (currentLayout.dataset.e077Forced !== forcedValue) currentLayout.dataset.e077Forced = forcedValue;
  if (currentLayout.dataset.e077Contrast !== contrastValue) currentLayout.dataset.e077Contrast = contrastValue;
  const status = document.getElementById(MODE_ID);
  const label = modeLabel(forced, contrast);
  if (status && status.textContent !== label) status.textContent = label;
}

/* Écouteurs attachés une seule fois, jamais retirés : ils ne retiennent aucun
 * nœud périmé, seulement currentLayout, remplacé à chaque rendu. */
function bindPreferenceListeners() {
  if (listenersBound) return;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  listenersBound = true;
  [CONTRAST_QUERY, FORCED_QUERY].forEach((query) => {
    let media;
    try { media = window.matchMedia(query); } catch { return; }
    try {
      if (typeof media.addEventListener === 'function') media.addEventListener('change', writePreferenceState);
      else if (typeof media.addListener === 'function') media.addListener(writePreferenceState);
    } catch { /* repli : préférences relues à chaque rendu */ }
  });
}

/* Légende unique : construite par ctx.el, jamais réinterprétée comme du HTML. */
function ensureLegend(ctx, layout) {
  const matrix = layout.querySelector('.points-matrix');
  if (!matrix) return;
  let legend = document.getElementById(LEGEND_ID);
  if (legend && !layout.contains(legend)) legend.remove();
  if (!legend) {
    legend = ctx.el('div', 'points-e077-legend');
    legend.id = LEGEND_ID;
    const note = ctx.el('p', 'points-e077-note', NOTE_TEXT);
    note.id = NOTE_ID;
    const status = ctx.el('p', 'points-e077-mode', '');
    status.id = MODE_ID;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    legend.append(note, status);
    const title = matrix.querySelector('.points-title');
    if (title && title.nextSibling) matrix.insertBefore(legend, title.nextSibling);
    else matrix.appendChild(legend);
  }
}

register('E077', (ctx) => {
  const viewId = ctx && ctx.viewId;
  const layout = ctx && ctx.layout;
  if (viewId !== 'points' || !layout || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  currentLayout = layout;
  layout.classList.add(SCOPE);          // idempotent : classList.add est sans effet si déjà posée
  if (layout.dataset.e077 !== '1') layout.dataset.e077 = '1';

  const grid = layout.querySelector('.points-grid');
  if (grid && grid.dataset.e077Ready !== '1') grid.dataset.e077Ready = '1';

  ensureLegend(ctx, layout);
  writePreferenceState();
  bindPreferenceListeners();
});
