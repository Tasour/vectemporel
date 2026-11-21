import { register } from './registry.js';

/* Lentille E070 — G. Performance & rendu : latence de survol plafonnée et mesurée.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E070.md — chantiers E070-01 a E070-10.
 * Fichier possede : ce module uniquement. Aucun fichier partage n'est edite :
 * ni src/views/points.js (le rendu), ni points/registry.js, ni points/index.js,
 * ni le store, ni le routeur, ni une autre lentille.
 *
 * Contrat exploite : viewId, stage, layout, css(id, rules), el, reducedMotion
 * (tels que fournis par points/registry.js:28-44). Aucune dependance vers le
 * store, le routeur ou une autre lentille.
 *
 * Dix chantiers, tous implementes ici :
 *  E070-01 horloge monotone unique (t0) captee au premier install();
 *  E070-02 plafond de latence declare (45 ms) et affiche comme reference ;
 *  E070-03 capture de l'instant de survol par delegation unique sur le layout ;
 *  E070-04 retour visuel non destructif (data-points-e070-hover) immediat ;
 *  E070-05 plafonnement de la charge : garde de cadence sans timer ni rAF ;
 *  E070-06 PerformanceObserver « event » (Event Timing) avec repli deterministe ;
 *  E070-07 PerformanceObserver « longtask » avec repli explicite « indisponible » ;
 *  E070-08 panneau compact non bloquant, hors zone d'ecriture, role=status ;
 *  E070-09 compteurs auditables, limite falsifiable et mouvement reduit ;
 *  E070-10 idempotence multi-rendus, miroirs data-* et responsive 390x844.
 *
 * Invariants : un seul greffon, un seul CSS, un seul panneau, une seule paire
 * d'observateurs de performance, un seul jeu d'ecouteurs delegues (relogue a
 * chaque rendu). Zero reseau, zero alea, zero console.*, zero innerHTML, aucun
 * timer, aucune boucle requestAnimationFrame, aucune donnee historique inventee.
 */

const CSS_ID = 'points-e070';
const PANEL_ID = 'points-e070-perf';
const STATUS_ID = 'points-e070-status';
const METRICS_ID = 'points-e070-metrics';

/* Plafond de reference : 45 ms, aligne sur la sonde de survol du moteur globe
 * (globe-engine.js:277, deja rappele par M44). Ce n'est pas une donnee
 * historique : cible de latence affichee et contradictoire, jamais un resultat
 * simule. MIN_GAP_MS borne le travail par survol sans aucun timer ni rAF. */
const HOVER_CEILING_MS = 45;
const MIN_GAP_MS = 60;

const HOVER_SELECTORS =
  '.points-cell, .points-era, .points-nav button, .points-filters button, .points-filters select';
const EVENT_NAMES = new Set([
  'pointerover', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'keydown',
]);

const CSS = `
  #${PANEL_ID} {
    margin: 10px 0 0; padding: 6px 10px;
    border: 1px solid var(--line, #5b5b5b); border-radius: 8px;
    background: rgba(8, 11, 16, .9); color: var(--muted, #9a9a9a);
    font-size: 11px; line-height: 1.45; font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  #${PANEL_ID} .points-e070-kicker {
    display: block; margin-bottom: 2px;
    font-size: 9px; letter-spacing: .14em; text-transform: uppercase;
    color: var(--ink-soft, #d8d8d8);
  }
  #${PANEL_ID} .points-e070-status { margin: 0 0 2px; color: var(--gold-bright, #e9c98f); }
  #${PANEL_ID} .points-e070-metrics { margin: 0; color: var(--ink-soft, #d8d8d8); }
  .points-layout :is(.points-cell, .points-era, .points-nav button, .points-filters button, .points-filters select)[data-points-e070-hover="1"] {
    outline: 2px solid var(--gold-bright, #e9c98f);
    outline-offset: 2px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    .points-layout :is(.points-cell, .points-era, .points-nav button, .points-filters button, .points-filters select) {
      transition: none !important; animation: none !important;
    }
  }
  @media (max-width: 700px) {
    #${PANEL_ID} { font-size: 10px; padding: 5px 8px; }
  }
`;

/* Etat module : une seule horloge, un seul jeu de gardes, un seul panneau.
 * La closure survit aux rendus ; le ctx courant est relu a chaque passage. */
let t0 = 0;
let currentCtx = null;
let hookedLayout = null;
let panel = null;
let statusNode = null;
let metricsNode = null;
let marked = null;

let sampleCount = 0;
let lastMs = null;
let maxMs = 0;
let overrunCount = 0;
let avoidedCount = 0;
let lastPaintAt = 0;
let reduced = false;
let lastStatus = '';

let observersReady = false;
let etSupported = false;
let ltSupported = false;
let etCount = 0;
let etMax = 0;
let ltCount = 0;
let ltMax = 0;

function now() {
  try {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
  } catch { /* repli ci-dessous */ }
  return Date.now();
}

/* E070-01 : origine unique, posee une seule fois pour toute la session. */
function origin() {
  if (!t0) t0 = now();
  return t0;
}

function reducedMotion(ctx) {
  if (ctx && typeof ctx.reducedMotion === 'function') {
    try { return !!ctx.reducedMotion(); }
    catch { /* repli ci-dessous */ }
  }
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

/* E070-02 / E070-09 : la valeur affichee est plafonnee pour la lisibilite,
 * le maximum BRUT reste expose dans les miroirs pour verification. */
function fmt(ms) {
  if (ms === null || ms === undefined) return '—';
  if (ms > HOVER_CEILING_MS) return `>${HOVER_CEILING_MS}`;
  return String(Math.round(ms));
}

/* E070-04 : retour visuel immediat et non destructif. Seul un attribut data
 * que nous possedons est ecrit : ni classe, ni texte, ni titre d'origine. */
function applyFeedback(target) {
  if (!target || !target.dataset) return;
  if (marked && marked !== target && marked.isConnected && marked.dataset) {
    marked.dataset.pointsE070Hover = '0';
  }
  target.dataset.pointsE070Hover = '1';
  marked = target;
}

function recordLatency(ts) {
  const at = now();
  const latency = Math.max(0, at - ts);
  const rounded = Math.round(latency);
  sampleCount += 1;
  lastMs = rounded;
  if (rounded > maxMs) maxMs = rounded;
  if (rounded > HOVER_CEILING_MS) overrunCount += 1;
  return at;
}

/* E070-03 / E070-05 : un seul ecouteur delegue par rendu, passe en capture
 * passif. L'horodatage vient de event.timeStamp (meme origine que now()), ce
 * qui mesure le delai file d'attente -> traitement, pas un temps simule. */
function onPointer(event) {
  if (typeof document !== 'undefined' && document.hidden) return;
  const target = event.target && typeof event.target.closest === 'function'
    ? event.target.closest(HOVER_SELECTORS) : null;
  if (!target || !currentCtx || !currentCtx.layout || !currentCtx.layout.contains(target)) return;

  const ts = typeof event.timeStamp === 'number' && event.timeStamp > 0 ? event.timeStamp : now();
  const at = recordLatency(ts);

  /* La garde de cadence plafonne la CHARGE : au plus une ecriture par fenetre,
   * sans setTimeout, sans setInterval et sans requestAnimationFrame. */
  if (at - lastPaintAt < MIN_GAP_MS) {
    avoidedCount += 1;
    return;
  }
  lastPaintAt = at;
  applyFeedback(target);
  writeMetrics();
}

function installPointer(ctx) {
  const layout = ctx.layout;
  if (!layout || !layout.isConnected) return;
  if (hookedLayout === layout) return;
  if (hookedLayout) {
    hookedLayout.removeEventListener('pointerover', onPointer, true);
    hookedLayout.removeEventListener('pointermove', onPointer, true);
    hookedLayout.removeEventListener('focusin', onPointer, true);
  }
  layout.addEventListener('pointerover', onPointer, { passive: true, capture: true });
  layout.addEventListener('pointermove', onPointer, { passive: true, capture: true });
  /* Equivalent clavier du survol : le focus recoit le meme retour mesure. */
  layout.addEventListener('focusin', onPointer, { passive: true, capture: true });
  hookedLayout = layout;
}

/* E070-06 : comptage deduplique des entrees Event Timing de la timeline. */
function countEvents(entries) {
  let changed = false;
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (!entry || !EVENT_NAMES.has(String(entry.name || ''))) continue;
    const duration = typeof entry.duration === 'number' && entry.duration > 0
      ? Math.round(entry.duration) : 0;
    etCount += 1;
    if (duration > etMax) etMax = duration;
    changed = true;
  }
  return changed;
}

function countLongTasks(entries) {
  let changed = false;
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (!entry) continue;
    const duration = typeof entry.duration === 'number' ? Math.round(entry.duration) : 0;
    ltCount += 1;
    if (duration > ltMax) ltMax = duration;
    changed = true;
  }
  return changed;
}

function entriesOf(list) {
  return list && typeof list.getEntries === 'function' ? list.getEntries() : [];
}

/* E070-06 / E070-07 : une seule paire d'observateurs pour toute la session,
 * avec repli deterministe sur getEntriesByType quand l'API manque. */
function installObservers() {
  if (observersReady) return;
  observersReady = true;
  const perf = typeof performance !== 'undefined' ? performance : null;
  if (!perf) return;

  if (typeof PerformanceObserver === 'function') {
    try {
      const observer = new PerformanceObserver((list) => {
        if (countEvents(entriesOf(list))) writeMetrics();
      });
      observer.observe({ type: 'event', buffered: true });
      etSupported = true;
    } catch { etSupported = false; }
    try {
      const observer = new PerformanceObserver((list) => {
        if (countLongTasks(entriesOf(list))) writeMetrics();
      });
      observer.observe({ type: 'longtask', buffered: true });
      ltSupported = true;
    } catch { ltSupported = false; }
  }

  if (!etSupported && typeof perf.getEntriesByType === 'function') {
    try { countEvents(perf.getEntriesByType('event') || []); }
    catch { /* repli : compteur laisse a zero, etat « indisponible » */ }
  }
  if (!ltSupported && typeof perf.getEntriesByType === 'function') {
    try { countLongTasks(perf.getEntriesByType('longtask') || []); }
    catch { /* repli : compteur laisse a zero, etat « indisponible » */ }
  }
}

/* E070-08 : panneau unique, retrouve par id et reloge si mal parenté. */
function ensurePanel(ctx) {
  const layout = ctx.layout;
  const found = document.getElementById(PANEL_ID);
  if (found && found.parentElement && found.parentElement !== layout) found.remove();
  panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = ctx.el('aside', 'points-e070-panel');
    panel.id = PANEL_ID;
    const kicker = ctx.el('span', 'points-e070-kicker', 'Performance · survol plafonné');
    kicker.setAttribute('aria-hidden', 'true');
    statusNode = ctx.el('p', 'points-e070-status', 'Mesure en attente d’un survol.');
    statusNode.id = STATUS_ID;
    statusNode.setAttribute('role', 'status');
    statusNode.setAttribute('aria-live', 'polite');
    statusNode.setAttribute('aria-atomic', 'true');
    metricsNode = ctx.el('p', 'points-e070-metrics', '—');
    metricsNode.id = METRICS_ID;
    panel.append(kicker, statusNode, metricsNode);
  } else {
    statusNode = document.getElementById(STATUS_ID);
    metricsNode = document.getElementById(METRICS_ID);
  }
  if (panel.parentElement !== layout) layout.appendChild(panel);
}

/* E070-09 : une seule region live (la seule qui change), metriques hors live,
 * deduplication par signature et miroirs data-* auditables sans console. */
function writeMetrics() {
  origin();
  const etText = etSupported ? `${etCount} evt / max ${fmt(etMax)} ms` : 'indisponible';
  const ltText = ltSupported ? `${ltCount} tâche(s) / max ${fmt(ltMax)} ms` : 'indisponible';
  const metrics =
    `survol ${fmt(lastMs)} ms (plafond ${HOVER_CEILING_MS} ms) · max ${fmt(maxMs)} ms · ` +
    `échantillons ${sampleCount} · dépassements ${overrunCount} · écrans évités ${avoidedCount} · ` +
    `Event Timing ${etText} · longtasks ${ltText} · mouvement ${reduced ? 'réduit' : 'complet'}`;
  if (metricsNode && metricsNode.isConnected && metricsNode.textContent !== metrics) {
    metricsNode.textContent = metrics;
  }

  let statusText;
  if (overrunCount > 0) {
    statusText = `Plafond de ${HOVER_CEILING_MS} ms dépassé ${overrunCount} fois : la charge de survol est plafonnée (écrans regroupés).`;
  } else if (sampleCount > 0) {
    statusText = `Latence de survol ${fmt(lastMs)} ms, sous le plafond de ${HOVER_CEILING_MS} ms.`;
  } else {
    statusText = 'En attente d’un survol de contrôle : la latence sera mesurée et plafonnée.';
  }
  if (statusNode && statusNode.isConnected && statusText !== lastStatus) {
    lastStatus = statusText;
    statusNode.textContent = statusText;
  }

  const layout = currentCtx && currentCtx.layout;
  if (layout && layout.isConnected && layout.dataset) {
    const d = layout.dataset;
    d.pointsE070Last = lastMs === null ? '' : String(lastMs);
    d.pointsE070Max = String(maxMs);
    d.pointsE070Samples = String(sampleCount);
    d.pointsE070Overruns = String(overrunCount);
    d.pointsE070Avoided = String(avoidedCount);
    d.pointsE070Ceiling = String(HOVER_CEILING_MS);
    d.pointsE070Et = etSupported ? String(etCount) : '';
    d.pointsE070Lt = ltSupported ? String(ltCount) : '';
    d.pointsE070Css = CSS_ID;
    d.pointsE070Motion = reduced ? 'reduce' : 'normal';
    d.pointsE070Ready = '1';
  }
}

/* E070-10 : garde stricte, une seule feuille, un seul panneau, un seul jeu
 * d'ecouteurs, une seule paire d'observateurs, aucun etat applicatif touche. */
register('E070', (ctx) => {
  if (!ctx || ctx.viewId !== 'points' || !ctx.layout ||
      typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  currentCtx = ctx;
  reduced = reducedMotion(ctx);
  ctx.css(CSS_ID, CSS);
  origin();
  ensurePanel(ctx);
  installPointer(ctx);
  installObservers();
  writeMetrics();
});
