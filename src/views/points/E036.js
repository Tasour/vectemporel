import { register } from './registry.js';

/* Lentille E036 — Navigation & clavier : navigation entre points par j / k
 * (domaine D : navigation & clavier).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E036.md — chantiers E036-01 à E036-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (fournis par
 * points/registry.js:28-44). Le routeur clavier unique (src/platform/keyboard.js)
 * reste seul maître des touches réservées : 1–6 / m c r g s p, ? , Échap,
 * Entrée, Espace et flèches. j et k n'appartiennent à aucune de ces familles.
 *
 * Invariants :
 * - un seul greffon, un seul CSS, un seul indice, un seul écouteur clavier
 *   (capture sur window, installé une fois) ;
 * - j avance au point suivant, k recule au point précédent, en activant les
 *   boutons natifs de .points-nav (aucune écriture directe de pointIndex) ;
 * - garde stricte : vue Points effective, aucune modale, aucun champ
 *   éditable, aucune combinaison Ctrl/Meta/Alt ; la position du focus importe
 *   peu (onglet de barre, scène ou bouton) dès lors que la vue est active ;
 * - preventDefault() suffit : le routeur l'honore (keyboard.js:125) — aucun
 *   stopPropagation, aucune capture volée, aucune région live ajoutée ;
 * - zéro réseau, zéro aléa, zéro journalisation, zéro timer, zéro rAF,
 *   zéro innerHTML, aucune donnée historique inventée.
 */

const CSS_ID = 'points-e036';
const HINT_ID = 'points-e036-hint';
const TITLE_ID = 'points-e036-title';
const READOUT_ID = 'points-e036-readout';
const METRICS_ID = 'points-e036-metrics';
const DATA_KEY = 'data-points-e036-key';

const RESERVED = new Set(['?', 'Escape', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
const VIEW_LETTERS_FALLBACK = ['m', 'c', 'r', 'g', 's', 'p'];

/* E36-02 : j = suivant, k = précédent. L'index est celui des boutons natifs
 * .points-nav (points.js:115-121) : 0 = précédent, 1 = suivant. */
const KEYS = Object.freeze([
  Object.freeze({ key: 'j', index: 1, label: 'Point suivant' }),
  Object.freeze({ key: 'k', index: 0, label: 'Point précédent' }),
]);

/* E36-01/10 : feuille unique, injectée par cssOnce (registry.js:13-19), stable
 * quand la coque recrée #atlas-stage. Tout est préfixé points-e036- : aucun
 * effet hors de la vue Points, aucune animation propre. */
const CSS = `
  #${HINT_ID} {
    margin: 10px 0 0; padding: 8px 10px;
    border: 1px solid var(--line-strong, #5b5b5b);
    border-left: 3px solid var(--gold, #e6b96f); border-radius: 8px;
    background: rgba(8, 11, 16, .6); color: var(--ink-soft, #d8d8d8);
    font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums;
  }
  #${HINT_ID}[hidden] { display: none; }
  #${HINT_ID} h4 {
    margin: 0 0 4px; font-family: var(--serif, serif);
    font-size: 12px; color: var(--gold-bright, #e9c98f);
  }
  #${HINT_ID} p { margin: 0 0 4px; }
  #${HINT_ID} kbd {
    display: inline-block; min-width: 22px; padding: 0 4px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 4px;
    color: var(--gold-bright, #e9c98f); font: inherit; text-align: center;
  }
  #${HINT_ID} .points-e036-label { color: var(--gold, #e6b96f); font-weight: 600; }
  #${READOUT_ID} { display: block; color: var(--ink-soft, #d8d8d8); }
  #${METRICS_ID} { margin: 0; color: var(--muted, #9a9a9a); font-size: 10px; }
  @media (max-width: 620px) {
    #${HINT_ID} { padding: 6px 8px; font-size: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${HINT_ID}, #${HINT_ID} * { transition: none !important; animation: none !important; }
  }
`;

/* Le registre réapplique les greffons à chaque rendu : la closure module
 * survit, le ctx courant est relu à chaque passage (jamais une copie figée). */
let latest = null;
let listenerInstalled = false;
let jCount = 0;
let kCount = 0;
let pendingNav = null;
let readout = null;
let metrics = null;

/* E36-03 : ne jamais réclamer une touche que le routeur possède. La carte
 * publique VECTEMPOREL_KEYS.map (keyboard.js:202-203) est la source unique ;
 * un repli strictement identique couvre l'absence du routeur. */
function isFreeKey(key) {
  if (RESERVED.has(key)) return false;
  let published = null;
  try {
    const api = window.VECTEMPOREL_KEYS;
    if (api && api.map) published = api.map;
  } catch { /* repli ci-dessous */ }
  if (published) return !Object.prototype.hasOwnProperty.call(published, key);
  return !/^[1-6]$/.test(key) && !VIEW_LETTERS_FALLBACK.includes(key.toLowerCase());
}

/* E36-04 : modale ouverte (aide ou détail), exactement comme le routeur
 * (keyboard.js:156-157). Repli DOM si le contrat public est absent. */
function modalOpen() {
  try {
    const api = window.VECTEMPOREL_KEYS;
    if (api && typeof api.modalState === 'function') {
      const state = api.modalState();
      if (state && (state.help || state.detail)) return true;
    }
  } catch { /* repli DOM ci-dessous */ }
  return Boolean(document.querySelector('[aria-modal="true"]:not([hidden])'));
}

function isEditable(node) {
  return node instanceof HTMLElement && (
    node.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)
  );
}

/* E36-04 : la vue effective est vérifiée dans l'état public, pas dans la
 * position du focus : après 'p', le focus peut rester sur l'onglet de barre.
 * Le contrôle DOM (.points-layout vivant) évite d'agir sur un rendu périmé. */
function inPointsView(ctx) {
  if (!ctx || ctx.viewId !== 'points') return false;
  const stage = document.getElementById('atlas-stage');
  if (!(stage && stage.querySelector('.points-layout'))) return false;
  try {
    const api = window.VATLAS;
    if (api && typeof api.getState === 'function' && api.getState().view !== 'points') return false;
  } catch { /* le contrôle DOM reste suffisant */ }
  return true;
}

/* E36-08 : tout le readout est dérivé du DOM réel déjà produit par
 * renderPoints (points.js:95-122) : titre du point et nombre du périmètre.
 * Aucun millésime, aucun total codé en dur, aucune donnée inventée. */
function perimeterTotal(layout) {
  const kicker = layout.querySelector('.points-detail .view-kicker');
  const match = kicker && String(kicker.textContent || '').match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

function currentTitle(layout) {
  const title = layout.querySelector('.points-point-title');
  return title ? String(title.textContent || '').trim() : '';
}

function writeReadout(ctx) {
  if (!readout || !readout.isConnected || !ctx || !ctx.layout) return;
  const title = currentTitle(ctx.layout);
  const total = perimeterTotal(ctx.layout);
  readout.textContent = title
    ? `Point courant : ${title}${total !== null ? ` · ${total} point(s) dans ce périmètre` : ''}.`
    : 'Aucun point validé dans ce périmètre.';
}

function writeMetrics() {
  if (!metrics || !metrics.isConnected) return;
  const total = jCount + kCount;
  metrics.textContent = `j : ${jCount} · k : ${kCount} · déplacements : ${total}.`;
}

/* E36-01 : indice non modal, sans role=dialog ni aria-modal ni piège. Les
 * <kbd> sont décoratifs et ne créent aucun nouvel arrêt de tabulation. */
function buildHint(ctx, target) {
  target.replaceChildren();
  target.setAttribute('role', 'region');
  target.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h4', '', 'Naviguer entre les points');
  title.id = TITLE_ID;
  target.appendChild(title);

  const help = ctx.el('p', '');
  help.appendChild(ctx.el('kbd', '', 'j'));
  help.appendChild(document.createTextNode(' point suivant · '));
  help.appendChild(ctx.el('kbd', '', 'k'));
  help.appendChild(document.createTextNode(' point précédent'));
  target.appendChild(help);

  target.appendChild(ctx.el('p', 'points-e036-label',
    'Ces touches parcourent le périmètre affiché, comme les boutons « Point suivant » et « Point précédent ».'));

  readout = ctx.el('span', '', '');
  readout.id = READOUT_ID;
  target.appendChild(readout);

  metrics = ctx.el('p', '', '');
  metrics.id = METRICS_ID;
  target.appendChild(metrics);
}

/* E36-02/05/06 : une seule action — activer le bouton natif existant. Le
 * bornage et le filtrage restent la responsabilité de points.js:117-120 ; E036
 * n'écrit jamais pointIndex et ne réimplémente aucun calcul de périmètre. */
function onKeyDown(event) {
  if (!inPointsView(latest) || modalOpen()) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if (!target || isEditable(target)) return;

  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const spec = KEYS.find((candidate) => candidate.key === key);
  if (!spec || !isFreeKey(key)) return;

  const button = latest.layout.querySelectorAll('.points-nav button')[spec.index];
  if (!button || !button.isConnected) return;

  /* Un seul preventDefault suffit : keyboard.js:125 l'honore (T2-10). Aucun
   * stopPropagation : le routeur et les autres greffons voient l'événement. */
  event.preventDefault();
  pendingNav = { key, label: spec.label };
  button.click();
  if (key === 'j') jCount += 1;
  else kCount += 1;
  writeMetrics();
}

/* E36-07/09 : installation idempotente. Un seul écouteur capture, un seul CSS,
 * un seul indice ; les nœuds mal parentés d'un rendu précédent sont retirés
 * avant réinsertion. Le miroir data-points-e036-* est auditable sans journal. */
register('E036', (ctx) => {
  if (!ctx || ctx.viewId !== 'points' || !ctx.layout
      || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  latest = ctx;
  ctx.css(CSS_ID, CSS);

  const layout = ctx.layout;
  const bound = KEYS.filter((spec) => isFreeKey(spec.key)).map((spec) => spec.key);
  layout.dataset.pointsE036Css = CSS_ID;
  layout.dataset.pointsE036Keys = bound.join(',');
  layout.dataset.pointsE036Motion = (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion())
    ? 'reduce' : 'normal';

  const oldHint = document.getElementById(HINT_ID);
  if (oldHint && oldHint.parentElement !== layout) oldHint.remove();
  let hint = document.getElementById(HINT_ID);
  if (!hint) {
    hint = ctx.el('section', 'points-e036-hint');
    hint.id = HINT_ID;
  }
  buildHint(ctx, hint);
  const detail = layout.querySelector('.points-detail');
  const parent = detail || layout;
  if (hint.parentElement !== parent) parent.appendChild(hint);

  /* Le clic sur le bouton natif déclenche un rendu asynchrone (import + set).
   * Ce greffon est réappliqué après ce rendu : le readout est donc recalculé
   * ici sur le DOM neuf, et le miroir consigne le dernier déplacement. */
  writeReadout(ctx);
  writeMetrics();
  if (pendingNav) {
    layout.dataset.pointsE036Last = pendingNav.key;
    pendingNav = null;
  }
  for (const spec of KEYS) {
    if (bound.includes(spec.key)) {
      const button = layout.querySelectorAll('.points-nav button')[spec.index];
      if (button) button.setAttribute(DATA_KEY, spec.key);
    }
  }

  if (!listenerInstalled) {
    window.addEventListener('keydown', onKeyDown, true);
    listenerInstalled = true;
  }
});
