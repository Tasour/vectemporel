import { register } from './registry.js';

/* Lentille E040 — Navigation & clavier : ordre de lecture du détail
 * (focus programmatique) — domaine D : navigation & clavier.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E040.md — chantiers E040-01 à E040-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité.
 *
 * Complément de E035 (raccourcis locaux) : E040 ne lie AUCUNE touche et ne
 * détourne aucun raccourci du routeur. Il gère uniquement le focus après une
 * navigation réelle dans la vue Points, pour que le détail soit lu depuis son
 * début par le clavier et les lecteurs d'écran.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion
 * (points/registry.js:28-44). Aucune dépendance vers store, dataset ou routeur.
 *
 * Invariants :
 * - un seul CSS, un seul greffon, une seule région live par rendu ;
 * - deux écouteurs capture installés UNE fois (click, change), jamais en phase
 *   bulle, jamais preventDefault/stopPropagation : les handlers d'origine
 *   (points.js:42,49-53,69-72,81-84,87-91,119-120) restent seuls maîtres ;
 * - le focus n'est déplacé qu'après une activation utilisateur détectée ET un
 *   rendu effectif (contrôle d'origine déconnecté), jamais au rendu initial,
 *   jamais hors vue Points ;
 * - zéro réseau, zéro aléa, zéro journalisation, zéro timer, zéro rAF,
 *   zéro innerHTML, aucune donnée historique inventée.
 */

const CSS_ID = 'points-e040';
const LIVE_ID = 'points-e040-live';
const ORDER_ID = 'points-e040-order';
const METRICS_ID = 'points-e040-metrics';
const TITLE_ID = 'points-e040-title';
const TEXT_ID = 'points-e040-text';
const SOURCES_ID = 'points-e040-sources';
const JUSTIFICATION_ID = 'points-e040-justification';
const TARGET_ATTR = 'data-points-e040-target';
const DETAIL_ATTR = 'data-points-e040-detail';
const REASON_ATTR = 'data-points-e040-reason';

/* E040-08 : feuille unique injectée par cssOnce (registry.js:13-19), stable
 * quand la coque recrée #atlas-stage (shell.js:533). Tout est sous
 * .points-layout ou préfixé points-e040- : aucun effet hors de la vue Points. */
const CSS = `
  .points-layout :is(.points-point-title, .points-nav button, .points-filters button):focus-visible {
    outline: 2px solid var(--gold-bright, #e9c98f);
    outline-offset: 3px;
    box-shadow: 0 0 0 1px rgba(8, 11, 16, .9);
  }
  .points-layout .points-point-title { scroll-margin-block: 64px; }
  .points-layout .points-nav button { min-height: 36px; }
  .points-layout .points-e040-live,
  .points-layout .points-e040-order {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
  .points-layout .points-e040-metrics {
    margin: 8px 0 0; color: var(--muted, #9a9a9a); font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
  @media (max-width: 620px) {
    .points-layout .points-nav button { min-height: 44px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-layout :is(.points-point-title, .points-nav button) {
      transition: none !important; animation: none !important;
    }
  }
`;

/* Le registre réapplique les greffons à chaque rendu : la closure module
 * survit, le ctx courant est relu à chaque passage (jamais une copie figée). */
let latest = null;
let lastLayout = null;
let clickInstalled = false;
let changeInstalled = false;
let pendingReason = '';
let pendingTarget = null;
let focusCount = 0;
let lastAnnouncement = '';

function isEditable(node) {
  return node instanceof HTMLElement && (
    node.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(node.tagName) !== -1
  );
}

function detailNode(ctx) {
  return ctx.layout && typeof ctx.layout.querySelector === 'function'
    ? ctx.layout.querySelector('.points-detail') : null;
}

function titleNode(node) {
  return node && node.querySelector ? node.querySelector('.points-point-title') : null;
}

function kickerText(node) {
  const kicker = node && node.querySelector ? node.querySelector('.view-kicker') : null;
  return kicker ? String(kicker.textContent || '').trim() : '';
}

function writeMetrics() {
  const node = document.getElementById(METRICS_ID);
  if (node && node.isConnected) node.textContent = `Focus programmés : ${focusCount}.`;
}

/* E040-07 : annonce dans une région live LOCALE, dérivée du DOM réellement
 * rendu (titre + kicker). Aucune autre région live n'est écrite. */
function announce() {
  const textParts = [];
  const name = titleNode(detailNode(latest));
  const kicker = kickerText(detailNode(latest));
  if (name) textParts.push(String(name.textContent || '').trim());
  if (kicker) textParts.push(kicker);
  const text = textParts.filter(Boolean).join(' — ') || 'Détail du point actualisé.';
  if (text === lastAnnouncement) return;
  const live = document.getElementById(LIVE_ID);
  if (!live || !live.isConnected) return;
  lastAnnouncement = text;
  live.textContent = text;
}

/* E040-01/06 : cible de focus unique et ordre de lecture explicite. On
 * n'ajoute ni ne retire aucun nœud d'auteur : on nomme la région, on rend le
 * titre focalisable et on relie les paragraphes réels via aria-describedby. */
function prepareDetail(ctx, node) {
  node.setAttribute(DETAIL_ATTR, '1');
  const heading = titleNode(node);
  if (!heading) return;
  if (!heading.id) heading.id = TITLE_ID;
  if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
  heading.setAttribute(TARGET_ATTR, '1');
  node.setAttribute('aria-labelledby', heading.id);

  const links = [
    { selector: '.points-point-text', id: TEXT_ID },
    { selector: '.points-sources', id: SOURCES_ID },
    { selector: '.points-justification', id: JUSTIFICATION_ID },
  ];
  const described = [];
  links.forEach((link) => {
    const part = node.querySelector(link.selector);
    if (!part) return;
    if (!part.id) part.id = link.id;
    described.push(part.id);
  });
  if (described.length) heading.setAttribute('aria-describedby', described.join(' '));

  const buttons = node.querySelectorAll('.points-nav button');
  for (let i = 0; i < buttons.length; i += 1) {
    if (!buttons[i].hasAttribute('aria-label')) {
      buttons[i].setAttribute('aria-label', i === 0 ? 'Aller au point précédent' : 'Aller au point suivant');
    }
  }
}

/* E040-07/10 : région live, consigne de lecture et compteurs auditables.
 * Un seul nœud de chaque type par rendu ; un nœud mal parenté est retiré. */
function ensureNodes(ctx, node) {
  const parent = node || ctx.layout;
  let live = document.getElementById(LIVE_ID);
  if (live && live.parentElement !== ctx.layout) live.remove();
  if (!live || !live.isConnected) {
    live = ctx.el('p', 'points-e040-live');
    live.id = LIVE_ID;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    ctx.layout.appendChild(live);
  }

  if (node && !node.querySelector(`#${ORDER_ID}`)) {
    const hint = ctx.el('p', 'points-e040-order',
      'Ordre de lecture du détail : titre, texte, métadonnées, familles, sources, justification, puis navigation avec la touche Tab.');
    hint.id = ORDER_ID;
    node.appendChild(hint);
  }

  let metrics = document.getElementById(METRICS_ID);
  if (metrics && metrics.parentElement !== parent) metrics.remove();
  if (!metrics || !metrics.isConnected) {
    metrics = ctx.el('p', 'points-e040-metrics', '');
    metrics.id = METRICS_ID;
    parent.appendChild(metrics);
  }
  writeMetrics();
}

/* E040-02/03/04 : une activation est enregistrée en capture, SANS modifier
 * l'événement. pendingTarget garde le contrôle d'origine : s'il est encore
 * connecté au prochain rendu, c'est qu'aucun re-render n'a eu lieu et l'Intent
 * reste en attente (jamais de focus sur un rendu sans navigation). */
function remember(reason, event, control) {
  if (!latest || !latest.layout || !latest.layout.isConnected) return;
  if (!control) return;
  if (event) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (typeof event.button === 'number' && event.button !== 0) return;
  }
  pendingReason = reason;
  pendingTarget = control;
}

function onClick(event) {
  const target = event.target;
  if (!target || typeof target.closest !== 'function') return;
  if (isEditable(target)) return;
  const nav = target.closest('.points-nav button');
  if (nav) { remember('point', event, nav); return; }
  const matrix = target.closest('.points-era, .points-cell');
  if (matrix) { remember('matrix', event, matrix); return; }
  const reset = target.closest('.points-filters button');
  if (reset) remember('filter', event, reset);
}

function onChange(event) {
  const target = event.target;
  if (!target || target.tagName !== 'SELECT') return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (!latest || !latest.layout || !latest.layout.isConnected) return;
  const filters = latest.layout.querySelector('.points-filters');
  if (filters && filters.contains(target)) remember('filter', event, target);
}

/* E040-02 : déplacement du focus vers le titre du détail (tabindex=-1), avec
 * preventScroll pour éviter tout saut de mise en page ; repli sans option si
 * l'environnement ne prend pas preventScroll en charge. */
function focusDetail(ctx, reason) {
  const heading = titleNode(detailNode(ctx));
  if (!heading || !heading.isConnected) return false;
  if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
  heading.setAttribute(TARGET_ATTR, '1');
  try { heading.focus({ preventScroll: true }); }
  catch { heading.focus(); }
  focusCount += 1;
  const node = detailNode(ctx);
  if (node) node.setAttribute(REASON_ATTR, reason);
  return true;
}

register('E040', (ctx) => {
  if (!ctx || !ctx.layout || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E040-09 : un rendu neuf est détecté par identité de nœud, sans timer ni
   * rétention de nœud périmé : tout est requis à nouveau depuis ctx.layout. */
  const fresh = ctx.layout !== lastLayout;
  latest = ctx;
  ctx.css(CSS_ID, CSS);
  if (fresh) {
    lastLayout = ctx.layout;
    lastAnnouncement = '';
  }

  const node = detailNode(ctx);
  if (node) prepareDetail(ctx, node);
  ensureNodes(ctx, node);

  /* E040-05 : on consomme l'activation seulement si le contrôle d'origine a
   * été remplacé (shell.js:533 recrée le stage). Aucun focus au rendu initial. */
  const ready = Boolean(pendingReason) && !(pendingTarget && pendingTarget.isConnected);
  const reason = pendingReason;
  if (ready) {
    pendingReason = '';
    pendingTarget = null;
    if (focusDetail(ctx, reason)) {
      writeMetrics();
      announce();
    }
  }

  /* E040-10 : miroirs d'état auditables, sans instrumentation ni journal. */
  ctx.layout.dataset.pointsE040Css = CSS_ID;
  ctx.layout.dataset.pointsE040Focus = String(focusCount);
  ctx.layout.dataset.pointsE040Motion =
    typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() ? 'reduce' : 'normal';

  /* E040-05 : deux écouteurs capture installés une seule fois pour toute la
   * session ; aucun preventDefault/stopPropagation, phase capture uniquement. */
  if (!clickInstalled) {
    document.addEventListener('click', onClick, true);
    clickInstalled = true;
  }
  if (!changeInstalled) {
    document.addEventListener('change', onChange, true);
    changeInstalled = true;
  }
});
