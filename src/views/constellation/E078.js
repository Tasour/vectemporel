import { register } from './registry.js';

/* Lentille E078 — instrumentation E2E appliquée au survol de la vue Constellation.
   Dix chantiers locaux : capture des événements de survol, journal borné,
   compteurs de visites, durées issues des horodatages d'événements, détection
   de balayage, halo piloté par attribut, télémétrie live, cibles chaudes,
   empreinte déterministe et mode sobre. Zéro réseau, zéro aléa, zéro minuteur,
   aucune boucle d'animation propre, aucun fichier partagé modifié. */

const TELEMETRY_ID = 'e078-telemetry';
const TRACE_MAX = 12;
const HOT_THRESHOLD = 3;

/* État local persistant d'un rendu complet du shell à l'autre. */
let currentLayout = null;
let listenersReady = false;
let renderCount = 0;
let trace = [];
const hits = Object.create(null);
let lastKey = '';
let hoveredNode = null;
let hoverActive = false;
let dwellStart = null;
let lastDwell = 0;
let sweepCount = 0;
let fingerprint = '811c9dc5';
let previousFingerprint = '811c9dc5';
let stable = true;

/* Feuille unique de la lentille : halo, badge de visites, télémétrie, mode sobre. */
const CSS = `
.constellation-layout button[data-e078-hovered] {
  outline: 2px solid var(--gold-bright);
  outline-offset: 2px;
  box-shadow: 0 0 12px rgba(244, 214, 158, .42);
  z-index: 7;
  transition: box-shadow .12s ease, outline-color .12s ease;
}
.constellation-layout button.e078-hot::before {
  position: absolute; top: -14px; right: -12px;
  display: grid; place-items: center;
  min-width: 16px; height: 16px; padding: 0 3px;
  border: 1px solid var(--gold); border-radius: 9px;
  background: var(--surface-2); color: var(--gold-bright);
  font-size: 8px; line-height: 1; font-variant-numeric: tabular-nums;
  content: attr(data-e078-hits); pointer-events: none;
}
.constellation-layout .e078-telemetry {
  flex: 1 1 100%; margin: 6px 0 0;
  color: var(--muted); font-size: 8px; line-height: 1.5;
  font-variant-numeric: tabular-nums;
}
.constellation-field.e078-calm button[data-e078-hovered] {
  transition: none; box-shadow: none;
}
@media (prefers-reduced-motion: reduce) {
  .constellation-layout button[data-e078-hovered] { transition: none !important; }
}
`;

function keyOf(node) {
  return node && node.dataset ? (node.dataset.constKey || '') : '';
}

function nodeFrom(event) {
  if (!event || !currentLayout || !event.target) return null;
  const target = event.target;
  if (!target || target.nodeType !== 1 || typeof target.closest !== 'function') return null;
  let node = null;
  try { node = target.closest('button[data-const-key]'); } catch (error) { return null; }
  if (!node || typeof currentLayout.contains !== 'function' || !currentLayout.contains(node)) return null;
  return node;
}

function stampOf(event) {
  return event && typeof event.timeStamp === 'number' && isFinite(event.timeStamp)
    ? event.timeStamp : null;
}

/* FNV-1a 32 bits : même trace, même empreinte — aucune source aléatoire. */
function hashTrace(sequence) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < sequence.length; i += 1) {
    const item = String(sequence[i]);
    for (let j = 0; j < item.length; j += 1) {
      hash ^= item.charCodeAt(j);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    hash ^= 0x2c;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function totalVisits() {
  let total = 0;
  for (const key in hits) {
    if (Object.prototype.hasOwnProperty.call(hits, key)) total += hits[key];
  }
  return total;
}

function clearHover() {
  if (hoveredNode && typeof hoveredNode.removeAttribute === 'function') {
    hoveredNode.removeAttribute('data-e078-hovered');
  }
  hoveredNode = null;
  hoverActive = false;
}

/* Répercute l'état local sur un nœud fraîchement recréé par le shell. */
function paintNode(node) {
  if (!node || typeof node.setAttribute !== 'function') return;
  const key = keyOf(node);
  const count = hits[key] || 0;
  if (count > 0) node.setAttribute('data-e078-hits', String(count));
  else if (typeof node.removeAttribute === 'function') node.removeAttribute('data-e078-hits');
  if (node.classList) {
    if (count >= HOT_THRESHOLD) node.classList.add('e078-hot');
    else node.classList.remove('e078-hot');
  }
  if (key && trace.indexOf(key) >= 0) node.setAttribute('data-e078-seen', 'true');
  if (hoverActive && key && key === lastKey) {
    node.setAttribute('data-e078-hovered', 'true');
    hoveredNode = node;
  }
}

function refresh() {
  const layout = currentLayout;
  if (!layout || typeof layout.setAttribute !== 'function' || !layout.dataset) return;
  const data = layout.dataset;
  data.e078Trace = trace.length ? trace.join('|') : 'none';
  data.e078Last = lastKey || 'none';
  data.e078Dwell = String(lastDwell);
  data.e078Sweep = String(sweepCount);
  data.e078Fingerprint = fingerprint;
  data.e078Stable = stable ? '1' : '0';
  data.e078Renders = String(renderCount);
  const telemetry = layout.querySelector('#' + TELEMETRY_ID);
  if (telemetry && typeof telemetry.textContent === 'string') {
    telemetry.textContent = `Télémétrie E078 — dernier survol : ${lastKey || 'aucun'} · `
      + `visites : ${totalVisits()} · séjour : ${lastDwell} ms · `
      + `balayages : ${sweepCount} · trace : ${trace.length} · empreinte : ${fingerprint}.`;
  }
}

function onOver(event) {
  const node = nodeFrom(event);
  if (!node || typeof node.setAttribute !== 'function') return;
  const key = keyOf(node);
  if (!key) return;
  const stamp = stampOf(event);

  /* Marquage du nœud courant : complément DOM de E078-01 et E078-06. */
  clearHover();
  node.setAttribute('data-e078-hovered', 'true');
  hoveredNode = node;
  hoverActive = true;
  if (currentLayout && currentLayout.dataset) currentLayout.dataset.e078Over = key;

  /* E078-02 — Journal borné de la trajectoire de survol. */
  if (trace.length === 0 || trace[trace.length - 1] !== key) {
    trace.push(key);
    if (trace.length > TRACE_MAX) trace.splice(0, trace.length - TRACE_MAX);
  }

  /* E078-03 — Compteurs de visites par nœud, répercutés sur le DOM. */
  hits[key] = (hits[key] || 0) + 1;
  paintNode(node);

  /* E078-04 — Durée de séjour calculée depuis l'horodatage de l'événement. */
  if (lastKey !== key) {
    if (lastKey && dwellStart !== null && stamp !== null) {
      lastDwell = Math.max(0, Math.round(stamp - dwellStart));
    }
    /* E078-05 — Balayage : transition entre deux nœuds distincts. */
    sweepCount += 1;
    if (lastKey) node.setAttribute('data-e078-from', lastKey);
    lastKey = key;
    dwellStart = stamp;
  } else if (dwellStart === null) {
    dwellStart = stamp;
  }

  /* E078-08 — Cible chaude : classe et badge numérique au-delà du seuil. */
  if ((hits[key] || 0) >= HOT_THRESHOLD && node.classList) node.classList.add('e078-hot');

  /* E078-09 — Empreinte FNV-1a de la trajectoire observée. */
  fingerprint = hashTrace(trace);

  refresh();
}

function onOut(event) {
  const node = nodeFrom(event);
  if (!node) return;
  const key = keyOf(node);
  const stamp = stampOf(event);
  /* Clôture du séjour : complément de E078-04, sans minuteur. */
  if (key && key === lastKey && dwellStart !== null && stamp !== null) {
    lastDwell = Math.max(0, Math.round(stamp - dwellStart));
    dwellStart = null;
    refresh();
  }
  if (node === hoveredNode) clearHover();
}

register('E078', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  if (typeof ctx.css !== 'function') return;
  const layout = ctx.layout;
  currentLayout = layout;
  renderCount += 1;

  /* E078-06 — Halo de survol piloté par attribut : une seule feuille CSS. */
  ctx.css('constellation-e078', CSS);

  /* E078-01 — Écouteurs de capture installés une seule fois pour la session. */
  if (!listenersReady && typeof document.addEventListener === 'function') {
    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mouseout', onOut, true);
    listenersReady = true;
  }

  /* E078-07 — Panneau de télémétrie : région live créée une fois par rendu. */
  let telemetry = layout.querySelector('#' + TELEMETRY_ID);
  if (!telemetry) {
    telemetry = typeof ctx.el === 'function'
      ? ctx.el('p', 'e078-telemetry', '')
      : document.createElement('p');
    telemetry.id = TELEMETRY_ID;
    telemetry.setAttribute('role', 'status');
    telemetry.setAttribute('aria-live', 'polite');
    telemetry.setAttribute('aria-atomic', 'true');
    const host = layout.querySelector('.constellation-caption') || layout;
    host.appendChild(telemetry);
  }

  /* E078-10 — Mode sobre, réhydratation et relevé consolidé. */
  const field = layout.querySelector('.constellation-field');
  if (field && field.classList) {
    if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) field.classList.add('e078-calm');
    else field.classList.remove('e078-calm');
  }
  const nodes = layout.querySelectorAll('button[data-const-key]');
  for (let i = 0; i < nodes.length; i += 1) paintNode(nodes[i]);
  if (hoveredNode && typeof layout.contains === 'function' && !layout.contains(hoveredNode)) clearHover();
  if (layout.dataset) layout.dataset.e078Nodes = String(nodes.length);
  fingerprint = hashTrace(trace);
  stable = fingerprint === previousFingerprint;
  previousFingerprint = fingerprint;
  refresh();
});
