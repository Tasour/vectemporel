import { register } from './registry.js';

/* Lentille E063 — Performance & rendu : MutationObserver ciblé, jamais sur la
 * zone écrite (domaine G).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E063.md — chantiers E063-01 à E063-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : la lentille ajoute un relevé LOCAL
 * et non modal, dérivé du DOM déjà produit par la vue.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (tel que
 * fourni par points/registry.js). Aucune dépendance vers le store, le routeur,
 * les filtres ou une autre lentille : le relevé reste lisible avec le ctx minimal.
 *
 * Invariants :
 * - un seul CSS, une seule portée, un seul relevé par rendu ;
 * - un seul MutationObserver, déconnecté puis reconnecté à chaque rendu ;
 * - trois cibles en lecture seule, jamais le relevé que la lentille écrit
 *   (sinon boucle d'écriture) ;
 * - attributeFilter borné : aucune observation d'attribut large ;
 * - zéro écouteur global, zéro timer, zéro rAF, zéro réseau, zéro aléa,
 *   zéro innerHTML, zéro console.*.
 */

const CSS_ID = 'points-e063';
const SCOPE = 'points-e063';
const PANEL_ID = 'points-e063-panel';
const TITLE_ID = 'points-e063-title';
const METRICS_ID = 'points-e063-metrics';
const LAST_ID = 'points-e063-last';
const REDUCED_ATTR = 'data-e063-reduced';

/* Toutes les règles sont préfixées par `.points-e063`, classe posée sur le
 * conteneur `.points-layout` : aucune fuite hors de cette vue. Le relevé est
 * un frère de `.points-grid` / `.points-filters` dans `.points-matrix`, hors
 * de toute zone observée. */
const CSS = `
.points-e063 .points-e063-panel {
  margin: 8px 0 10px; padding: 10px 12px;
  border: 1px solid var(--line-strong); border-radius: 8px;
  background: rgba(120, 170, 200, .06); color: var(--ink-soft);
  font-size: 11px; line-height: 1.45;
}
.points-e063 .points-e063-panel:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 3px;
}
.points-e063 .points-e063-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 14px; color: var(--gold-bright);
}
.points-e063 .points-e063-note,
.points-e063 .points-e063-metrics,
.points-e063 .points-e063-last { margin: 0 0 6px; }
.points-e063 .points-e063-note { color: var(--muted-2); }
.points-e063 .points-e063-metrics,
.points-e063 .points-e063-last {
  color: var(--gold); font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.points-e063 .points-e063-last { color: var(--muted-2); }
@media (max-width: 620px) {
  .points-e063 .points-e063-panel { font-size: 10px; padding: 8px 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .points-e063 .points-e063-panel { transition: none; }
}
@media (forced-colors: active) {
  .points-e063 .points-e063-panel {
    background: Canvas; color: CanvasText; border-color: CanvasText;
  }
  .points-e063 .points-e063-metrics { color: Highlight; }
}
`;

let layout = null;          // .points-layout courant, réutilisé d'un rendu à l'autre
let panel = null;           // relevé recréé à chaque rendu de la vue
let metricsNode = null;     // compteurs, hors toute région live
let lastNode = null;        // dernier signal et périmètre observé
let observer = null;        // unique MutationObserver, jamais sur le relevé
let currentCtx = null;      // dernier ctx reçu, pour l'observateur
let observed = [];          // les trois cibles en lecture seule (références + libellés)
let signals = 0;            // mutations reçues de l'observateur
let writes = 0;             // écritures de relevé réellement effectuées
let avoided = 0;            // rafraîchissements sans écriture (signature inchangée)
let lastSource = '';        // dernière zone ayant émis une mutation
let lastSignature = '';     // dernière signature réellement écrite

/* E063-01 : lecture défensive — un sélecteur manquant ne doit jamais faire
 * échouer la lentille, même avec un ctx minimal. */
function root(ctx) {
  return ctx && ctx.layout && ctx.layout.isConnected ? ctx.layout : null;
}

function q(ctx, selector) {
  const node = root(ctx);
  return node && typeof node.querySelector === 'function' ? node.querySelector(selector) : null;
}

function text(node) {
  return node ? String(node.textContent || '').trim() : '';
}

/* E063-02 : catégorie du signal, déduite de la cible réellement observée.
 * Aucune zone non observée (notamment le relevé) ne peut être nommée ici. */
function classify(target) {
  for (let i = 0; i < observed.length; i += 1) {
    const entry = observed[i];
    if (entry.node === target || (typeof entry.node.contains === 'function' && entry.node.contains(target))) {
      return entry.label;
    }
  }
  return '';
}

/* E063-04 : signature dérivée du seul DOM déjà rendu par points.js. Aucun
 * millésime, aucun total et aucun libellé codé en dur : tout vient de la grille,
 * des filtres et de la fiche. */
function computeSignature(ctx) {
  const active = q(ctx, '.points-grid-row.is-active .points-era');
  const title = q(ctx, '.points-point-title');
  const kicker = q(ctx, '.points-detail .view-kicker');
  const selects = root(ctx) ? root(ctx).querySelectorAll('.points-filters select') : [];
  const filters = Array.prototype.map.call(selects, (select) => select.value).join(',');
  return [
    'ere:' + text(active),
    'point:' + text(title),
    'perimetre:' + text(kicker),
    'filtres:' + filters,
  ].join(' | ');
}

/* E063-05 : toute écriture textuelle passe par ce gardien : si le texte visé
 * est déjà le bon, le DOM n'est pas touché. */
function setText(node, value) {
  if (!node || node.textContent === value) return false;
  node.textContent = value;
  return true;
}

function writeMetrics() {
  setText(metricsNode, `Signaux reçus : ${signals} · relevés écrits : ${writes} · évités : ${avoided}.`);
  setText(lastNode, `Dernier signal : ${lastSource || 'aucun'} · observé : grille, filtres, titre du point — jamais ce relevé.`);
}

/* E063-05 : le relevé n'est réécrit que si sa signature diffère de la dernière
 * écrite. Un signal reçu sans changement incrémente seulement « évités ». */
function refresh(ctx, source) {
  if (!ctx) return;
  currentCtx = ctx;
  if (source) {
    signals += 1;
    lastSource = source;
  }
  const signature = computeSignature(ctx);
  if (signature === lastSignature) {
    avoided += 1;
    writeMetrics();
    return false;
  }
  lastSignature = signature;
  writes += 1;
  writeMetrics();
  return true;
}

/* E063-08 : le relevé est bâti une seule fois par rendu, par ctx.el et
 * textContent — jamais par innerHTML ni réinterprétation de balisage. */
function buildPanel(ctx) {
  const p = ctx.el('section', 'points-e063-panel');
  p.id = PANEL_ID;
  p.setAttribute('role', 'region');            /* E063-09 */
  p.setAttribute('aria-labelledby', TITLE_ID);
  p.tabIndex = -1;

  const title = ctx.el('h3', 'points-e063-title', 'Rendu · observateur ciblé');
  title.id = TITLE_ID;
  p.appendChild(title);
  p.appendChild(ctx.el('p', 'points-e063-note',
    'Relevé local : un seul observateur suit la grille, les filtres et le titre du point. Ce relevé n’est jamais observé : ses écritures ne peuvent donc pas déclencher de boucle.'));
  metricsNode = ctx.el('p', 'points-e063-metrics', '');
  lastNode = ctx.el('p', 'points-e063-last', '');
  p.append(metricsNode, lastNode);
  return p;
}

/* E063-01 / E063-02 / E063-03 / E063-04 : un seul observateur, déconnecté puis
 * reconnecté ; trois cibles en lecture seule et un attributeFilter borné. Le
 * relevé (PANEL_ID, dans .points-matrix) n'est VOLONTAIREMENT pas observé :
 * écrire dedans ne peut donc pas relancer le callback. */
function observe(ctx) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  observer = null;
  observed = [];

  if (typeof MutationObserver === 'undefined') return;
  const grid = q(ctx, '.points-grid');
  const filters = q(ctx, '.points-filters');
  const pointTitle = q(ctx, '.points-detail .points-point-title');
  observed = [
    { node: grid, label: 'grille' },
    { node: filters, label: 'filtres' },
    { node: pointTitle, label: 'titre du point' },
  ].filter((entry) => entry.node);
  if (!observed.length) return;

  observer = new MutationObserver((records) => {
    let source = '';
    for (let i = 0; i < records.length; i += 1) {
      source = classify(records[i].target);
      if (source) break;
    }
    if (currentCtx) refresh(currentCtx, source || 'autre');
  });

  if (grid) {
    observer.observe(grid, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['class'],
    });
  }
  if (filters) observer.observe(filters, { childList: true, subtree: true });
  if (pointTitle) observer.observe(pointTitle, { childList: true, characterData: true, subtree: true });
}

/* E063-06 / E063-07 : installation idempotente. Une vue reconstruite se repère
 * à son nœud déconnecté : on retire un relevé orphelin, on remet les compteurs
 * à zéro et on réinstalle un seul panneau dans la nouvelle matrice. */
function install(ctx) {
  if (!ctx || ctx.viewId !== 'points') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const current = root(ctx);
  if (!current) return;

  currentCtx = ctx;
  ctx.css(CSS_ID, CSS);
  current.classList.add(SCOPE);
  current.setAttribute('data-e063', '1');
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    current.setAttribute(REDUCED_ATTR, '1');
  } else {
    current.removeAttribute(REDUCED_ATTR);
  }

  const fresh = !layout || !layout.isConnected || layout !== current;
  layout = current;

  const stale = document.getElementById(PANEL_ID);
  if (stale && !current.contains(stale)) stale.remove();

  panel = current.querySelector('#' + PANEL_ID);
  if (panel && (!panel.querySelector('.' + METRICS_ID) || !panel.querySelector('.' + LAST_ID))) {
    panel.remove();
    panel = null;
  }
  if (!panel) {
    panel = buildPanel(ctx);
    const matrix = current.querySelector('.points-matrix') || current;
    const title = current.querySelector('.points-title');
    if (title && title.parentNode === matrix && title.nextSibling) {
      matrix.insertBefore(panel, title.nextSibling);
    } else {
      matrix.appendChild(panel);
    }
  }
  metricsNode = panel.querySelector('.' + METRICS_ID);
  lastNode = panel.querySelector('.' + LAST_ID);

  observe(ctx);

  if (fresh) {
    signals = 0;
    writes = 0;
    avoided = 0;
    lastSource = '';
    lastSignature = '';
  }
  refresh(ctx);
}

register('E063', install);
