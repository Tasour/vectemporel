import { register } from './registry.js';

/* Lentille E066 — Performance & rendu : signature anti-écriture redondante
 * (domaine G).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E066.md — chantiers E066-01 à E066-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : la lentille ajoute un relevé LOCAL
 * et non modal, dérivé du DOM déjà produit par la vue, et ne réécrit ce relevé
 * que lorsque sa signature change.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres ou le détail : le relevé reste lisible
 * même avec un ctx minimal.
 *
 * Invariants :
 * - un seul CSS, une seule portée, un seul relevé par rendu ;
 * - un seul MutationObserver, déconnecté puis reconnecté à chaque rendu,
 *   jamais braqué sur le relevé lui-même (sinon boucle d'écriture) ;
 * - aucune écriture si la signature est inchangée (anti-redondance) ;
 * - zéro innerHTML, zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*.
 */

const CSS_ID = 'points-e066';
const SCOPE = 'points-e066';
const PANEL_ID = 'points-e066-panel';
const TITLE_ID = 'points-e066-title';
const REDUCED_ATTR = 'data-e066-reduced';

/* Toutes les règles sont préfixées par `.points-e066`, classe posée sur le
 * conteneur `.points-layout` : aucune fuite hors de cette vue. Le relevé est
 * un frère de `.points-grid` / `.points-filters` dans `.points-matrix`. */
const CSS = `
.points-e066 .points-e066-panel {
  margin: 8px 0 10px; padding: 10px 12px;
  border: 1px solid var(--line-strong); border-radius: 8px;
  background: rgba(230, 185, 111, .05); color: var(--ink-soft);
  font-size: 11px; line-height: 1.45;
}
.points-e066 .points-e066-panel:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 3px;
}
.points-e066 .points-e066-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 14px; color: var(--gold-bright);
}
.points-e066 .points-e066-note,
.points-e066 .points-e066-signature,
.points-e066 .points-e066-metrics { margin: 0 0 6px; }
.points-e066 .points-e066-note { color: var(--muted-2); }
.points-e066 .points-e066-signature {
  color: var(--gold); font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.points-e066 .points-e066-metrics { color: var(--muted-2); }
@media (max-width: 620px) {
  .points-e066 .points-e066-panel { font-size: 10px; padding: 8px 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .points-e066 .points-e066-panel { transition: none; }
}
@media (forced-colors: active) {
  .points-e066 .points-e066-panel {
    background: Canvas; color: CanvasText; border-color: CanvasText;
  }
  .points-e066 .points-e066-signature { color: Highlight; }
}
`;

let layout = null;          // .points-layout courant, réutilisé d'un rendu à l'autre
let panel = null;           // relevé recréé à chaque rendu de la vue
let signatureNode = null;   // signature compacte affichée
let metricsNode = null;     // compteurs, hors région live
let observer = null;        // unique MutationObserver, jamais sur le relevé
let currentCtx = null;      // dernier ctx reçu, pour l'observateur
let lastSignature = '';     // dernière signature réellement écrite
let writes = 0;             // écritures de relevé réalisées
let avoided = 0;            // écritures évitées (signature inchangée)

/* E066-08 : lecture défensive — un sélecteur manquant ne doit jamais faire
 * échouer la lentille. */
function root(ctx) {
  return ctx && ctx.layout && ctx.layout.isConnected ? ctx.layout : null;
}

function q(ctx, selector) {
  const node = root(ctx);
  return node && typeof node.querySelector === 'function' ? node.querySelector(selector) : null;
}

function qa(ctx, selector) {
  const node = root(ctx);
  return node && typeof node.querySelectorAll === 'function'
    ? node.querySelectorAll(selector) : [];
}

function text(node) {
  return node ? String(node.textContent || '').trim() : '';
}

/* E066-02 : la signature est dérivée du DOM réel uniquement. Aucun millésime,
 * aucun total et aucun nom de domaine n'est codé en dur : tout vient de la
 * grille, des filtres et du détail déjà rendus par points.js. */
function computeSignature(ctx) {
  const active = q(ctx, '.points-grid-row.is-active .points-era');
  const cells = qa(ctx, '.points-grid-row:not(.is-head) .points-cell');
  const selects = qa(ctx, '.points-filters select');
  const families = qa(ctx, '.points-detail .points-families > span');
  const point = q(ctx, '.points-point-title');
  const parts = [
    'ere:' + text(active),
    'cells:' + Array.prototype.map.call(cells, text).join(','),
    'filters:' + Array.prototype.map.call(selects, (s) => s.value).join(','),
    'point:' + text(point),
    'fam:' + families.length,
  ];
  return parts.join(' | ');
}

/* E066-03 / E066-04 : toute écriture textuelle passe par ce gardien. Si le
 * texte visé est déjà le bon, on ne touche pas au DOM : c'est la signature
 * anti-écriture redondante, appliquée aussi aux compteurs. */
function setTextIfChanged(node, value) {
  if (!node) return false;
  if (node.textContent === value) return false;
  node.textContent = value;
  return true;
}

function shortSignature(signature) {
  const value = String(signature || '');
  return value.length > 96 ? `${value.slice(0, 93)}…` : value;
}

function writeMetrics() {
  setTextIfChanged(metricsNode, `Écritures réalisées : ${writes} · évitées : ${avoided}.`);
}

/* E066-03 : le relevé n'est réécrit que si la signature diffère de la dernière
 * écrite. Sinon on incrémente seulement le compteur d'écritures évitées. */
function writeState(ctx, signature) {
  if (signature === lastSignature) {
    avoided += 1;
    writeMetrics();
    return false;
  }
  lastSignature = signature;
  writes += 1;
  setTextIfChanged(signatureNode, `Signature : ${shortSignature(signature)}`);
  writeMetrics();
  return true;
}

function refresh(ctx) {
  if (!ctx) return;
  currentCtx = ctx;
  writeState(ctx, computeSignature(ctx));
}

/* E066-07 : le relevé est bâti une seule fois par rendu, par ctx.el et
 * textContent — jamais par innerHTML. */
function buildPanel(ctx) {
  const p = ctx.el('section', 'points-e066-panel');
  p.id = PANEL_ID;
  p.setAttribute('role', 'region');        /* E066-09 */
  p.setAttribute('aria-labelledby', TITLE_ID);
  p.tabIndex = -1;

  const title = ctx.el('h3', 'points-e066-title', 'Rendu · signature d’écriture');
  title.id = TITLE_ID;
  p.appendChild(title);
  p.appendChild(ctx.el('p', 'points-e066-note',
    'Relevé local : la vue Points est reconstruite à chaque changement d’état. Ce module ne réécrit son relevé que lorsque la signature du DOM change.'));
  signatureNode = ctx.el('p', 'points-e066-signature', '');
  metricsNode = ctx.el('p', 'points-e066-metrics', '');
  p.append(signatureNode, metricsNode);
  return p;
}

/* E066-05 : un seul observateur, déconnecté puis reconnecté ; il braque sur
 * trois cibles en lecture seule et JAMAIS sur le relevé (sinon boucle). */
function observe(ctx) {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => refresh(currentCtx));
  const targets = [
    q(ctx, '.points-grid'),
    q(ctx, '.points-filters'),
    q(ctx, '.points-detail'),
  ];
  const options = {
    childList: true, characterData: true, subtree: true,
    attributes: true, attributeFilter: ['class', 'value', 'aria-current'],
  };
  targets.forEach((target) => {
    if (target) observer.observe(target, options);
  });
}

/* E066-06 : installation idempotente. Une vue reconstruite se repère à son
 * nœud déconnecté ; on retire alors un relevé orphelin, on remet la signature
 * à zéro et on réinstalle un seul panneau dans la nouvelle matrice. */
function install(ctx) {
  if (!ctx || ctx.viewId !== 'points') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const current = root(ctx);
  if (!current) return;

  currentCtx = ctx;
  ctx.css(CSS_ID, CSS);                    /* E066-01 : cssOnce */
  current.classList.add(SCOPE);
  current.setAttribute('data-e066', '1');
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    current.setAttribute(REDUCED_ATTR, '1');  /* E066-09 */
  } else {
    current.removeAttribute(REDUCED_ATTR);
  }

  const fresh = !layout || !layout.isConnected || layout !== current;
  layout = current;

  const stale = document.getElementById(PANEL_ID);
  if (stale && !current.contains(stale)) stale.remove();

  panel = current.querySelector('#' + PANEL_ID);
  if (!panel) {
    panel = buildPanel(ctx);
    const matrix = current.querySelector('.points-matrix');
    const title = current.querySelector('.points-title');
    const anchor = matrix || current;
    if (title && title.parentNode === anchor && title.nextSibling) {
      anchor.insertBefore(panel, title.nextSibling);
    } else {
      anchor.appendChild(panel);
    }
  }
  signatureNode = panel.querySelector('.points-e066-signature');
  metricsNode = panel.querySelector('.points-e066-metrics');

  observe(ctx);                            /* E066-05 */

  if (fresh) lastSignature = '';           /* E066-06 */
  refresh(ctx);                            /* E066-03 */
}

register('E066', (ctx) => { install(ctx); });
