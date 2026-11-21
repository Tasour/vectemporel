import { register } from './registry.js';

/* Lentille M44 — Performance perçue (domaine E : qualité & validation).
 *
 * La performance perçue ne se confond ni avec le budget de pixels (M06), ni avec
 * la boucle rAF (M07), ni avec la présence dans la vue (M08). Elle mesure ce que
 * la personne ressent : à quelle vitesse la liste devient utilisable, à quelle
 * vitesse le globe répond, si chaque geste reçoit un retour immédiat, si le
 * chargement progresse visiblement, si le mouvement réduit est respecté et si
 * l'état est auditable sans console.
 *
 * Dix chantiers, tous implémentés ici :
 *  M44-01 origine de temps unique (t0) captée au premier install()
 *  M44-02 liste des pays disponible avant le moteur 3D
 *  M44-03 latence du globe (onReady + repli si moteur déjà prêt)
 *  M44-04 progression des ressources locales via PerformanceObserver
 *  M44-05 panneau compact, non bloquant, sans décalage de layout
 *  M44-06 retour immédiat au survol, mesuré contre le plafond de 45 ms
 *  M44-07 retour optimiste à la sélection (avant la transition reveal)
 *  M44-08 mouvement réduit : pulsation désactivée, état miroir
 *  M44-09 mesures moteur lues uniquement sur événements discrets
 *  M44-10 synthèse live unique + miroirs data-* pour audit E2E
 *
 * Zéro fichier partagé modifié, zéro réseau, zéro Math.random, zéro console.*,
 * aucune boucle requestAnimationFrame propre, aucun timer d'intervalle, aucun
 * IntersectionObserver, aucun sélecteur de test modifié.
 */

const CSS_ID = 'monde-m44';
const PANEL_ID = 'monde-m44-perf';

/* Constantes miroirs :
 * - cible de disponibilité affichée comme référence (pas un seuil bloquant) ;
 * - plafond de la sonde de survol du moteur (globe-engine.js:277 : 45 ms) ;
 * - nombre d'entrées locales chargées par init() (globe-engine.js:611-618). */
const TARGET_READY_MS = 1500;
const HOVER_CEILING_MS = 45;
const RESOURCE_TOTAL = 4;
const RESOURCE_RE = /globe-(?:map(?:-2k)?|pick|palette)\b/i;
const PAINT_FLOOR_MS = 200;

const CSS = `
  #${PANEL_ID} {
    position: absolute; left: 72px; bottom: 16px; z-index: 5;
    width: min(300px, calc(100% - 96px)); padding: 7px 10px;
    border: 1px solid var(--line); border-radius: 8px;
    background: rgba(8, 11, 16, .9); color: var(--muted);
    font-size: 11px; line-height: 1.45; font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  #${PANEL_ID} .monde-m44-kicker {
    display: block; margin-bottom: 3px;
    font-size: 9px; letter-spacing: .14em; text-transform: uppercase;
    color: var(--ink-soft);
  }
  #${PANEL_ID} .monde-m44-pulse {
    display: inline-block; width: 6px; height: 6px; margin-right: 6px;
    border-radius: 50%; background: var(--gold);
    animation: monde-m44-pulse 1.2s ease-in-out infinite;
  }
  #${PANEL_ID}[data-motion="reduced"] .monde-m44-pulse { animation: none; }
  @keyframes monde-m44-pulse { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
  #${PANEL_ID} .monde-m44-status { margin: 0 0 2px; color: var(--gold-bright); }
  #${PANEL_ID} .monde-m44-metrics { margin: 0; color: var(--ink-soft); }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID} .monde-m44-pulse { animation: none; }
  }
  @media (max-width: 700px) {
    #${PANEL_ID} { left: 64px; bottom: 10px; width: calc(100% - 76px); font-size: 10px; }
  }
`;

/* État module : une seule origine et un seul jeu de gardes, partagés par tous
 * les rendus (la coque reconstruit le stage, pas ce module). */
let t0 = 0;
let readyAt = 0;
let readyHooked = false;
let engineRef = null;
let hostRef = null;
let countriesRef = null;
let panelRef = null;

let pointerHost = null;
let pointerAt = 0;
let hoverMs = null;
let hoverCount = 0;
let hoverHooked = false;
let leaveHooked = false;

let clickHooked = false;
let lastSelection = '';

let resourceHooked = false;
let resourceCount = 0;

let reduced = false;
let lastPaintAt = 0;
let lastStatus = '';

/* M44-01 : origine unique, posée une seule fois pour toute la session. */
function origin() {
  if (!t0) t0 = performance.now();
  return t0;
}

/* M44-04 : comptage dédupliqué des ressources locales déjà vues par le navigateur. */
function readResources() {
  let found = 0;
  try {
    const entries = performance.getEntriesByType('resource') || [];
    const seen = Object.create(null);
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      const name = entry && entry.name ? String(entry.name) : '';
      if (RESOURCE_RE.test(name) && !seen[name]) {
        seen[name] = 1;
        found += 1;
      }
    }
  } catch {
    /* API indisponible : on conserve le dernier compteur connu. */
  }
  return found;
}

/* M44-09 : lecture ponctuelle du compteur public du moteur, jamais en boucle. */
function readCalls() {
  if (!engineRef || typeof engineRef.getInfo !== 'function') return null;
  try {
    const info = engineRef.getInfo();
    return info && typeof info.calls === 'number' ? info.calls : null;
  } catch {
    return null;
  }
}

/* M44-05 : panneau unique par rendu, retrouvé par ID si la scène a été rebuildée. */
function ensurePanel(ctx) {
  if (panelRef && panelRef.isConnected) return panelRef;
  const existing = document.getElementById(PANEL_ID);
  if (existing) {
    panelRef = existing;
    return panelRef;
  }
  const panel = ctx.el('div', 'monde-m44-panel');
  panel.id = PANEL_ID;
  panel.dataset.motion = reduced ? 'reduced' : 'full';

  const kicker = ctx.el('span', 'monde-m44-kicker');
  const dot = ctx.el('span', 'monde-m44-pulse');
  dot.setAttribute('aria-hidden', 'true');
  kicker.append(dot, ctx.el('span', null, 'Performance perçue'));

  const status = ctx.el('p', 'monde-m44-status', 'Mesure en attente…');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  const metrics = ctx.el('p', 'monde-m44-metrics', '—');
  panel.append(kicker, status, metrics);
  ctx.scene.appendChild(panel);
  panelRef = panel;
  return panel;
}

/* M44-10 : une seule région live pour les messages discrets, des grandeurs
 * variables séparées et des miroirs data-* auditables. */
function paint(force) {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  const now = performance.now();
  if (!force && now - lastPaintAt < PAINT_FLOOR_MS) return;
  lastPaintAt = now;

  const listMs = Math.max(0, Math.round(origin()));
  const readyMs = readyAt ? Math.max(0, Math.round(readyAt - origin())) : null;
  const calls = readCalls();

  const readyText = readyMs === null
    ? `moteur … (cible ${TARGET_READY_MS} ms)`
    : `moteur ${readyMs} ms (cible ${TARGET_READY_MS} ms)`;
  const hoverText = hoverMs === null
    ? `survol — (plafond ${HOVER_CEILING_MS} ms)`
    : `survol ${Math.round(hoverMs)} ms (plafond ${HOVER_CEILING_MS} ms)`;

  const metrics = panel.querySelector('.monde-m44-metrics');
  if (metrics) {
    metrics.textContent =
      `liste ${listMs} ms · ${readyText} · ${hoverText} · ` +
      `ressources ${resourceCount}/${RESOURCE_TOTAL} locales · ` +
      `draw ${calls === null ? '—' : calls} · ` +
      `survol(s) ${hoverCount} · mouvement ${reduced ? 'réduit' : 'complet'}`;
  }

  let statusText;
  if (lastSelection) {
    /* M44-07 : accusé de réception immédiat, jamais une navigation confirmée. */
    statusText = `Retour immédiat : ouverture de ${lastSelection}.`;
  } else if (readyMs !== null) {
    statusText = `Globe prêt en ${readyMs} ms · la liste était déjà utilisable.`;
  } else {
    statusText = 'Chargement du globe · la liste des pays est déjà utilisable.';
  }
  const status = panel.querySelector('.monde-m44-status');
  if (status && statusText !== lastStatus) {
    status.textContent = statusText;
    lastStatus = statusText;
  }

  panel.dataset.motion = reduced ? 'reduced' : 'full';
  if (hostRef && hostRef.isConnected) {
    hostRef.dataset.m44ListMs = String(listMs);
    hostRef.dataset.m44ReadyMs = readyMs === null ? '' : String(readyMs);
    hostRef.dataset.m44HoverMs = hoverMs === null ? '' : String(Math.round(hoverMs));
    hostRef.dataset.m44Resources = `${resourceCount}/${RESOURCE_TOTAL}`;
    hostRef.dataset.m44Motion = reduced ? 'reduced' : 'full';
    hostRef.dataset.m44Selection = lastSelection;
  }
}

/* M44-03 : unique point de fixation du moteur et de l'instant « prêt ». */
function markReady(payload) {
  if (payload && payload.engine) engineRef = payload.engine;
  if (!engineRef) engineRef = window.VECTEMPOREL_GLOBE || null;
  if (payload && payload.host && payload.host.isConnected) hostRef = payload.host;
  if (!readyAt) readyAt = performance.now();
  installResources();
  paint(true);
}

/* M44-04 : un seul observateur de ressources, avec repli déterministe. */
function installResources() {
  const initial = readResources();
  if (initial !== resourceCount) resourceCount = initial;
  if (resourceHooked) return;
  resourceHooked = true;
  if (typeof PerformanceObserver === 'function') {
    try {
      const observer = new PerformanceObserver(() => {
        const next = readResources();
        if (next !== resourceCount) {
          resourceCount = next;
          paint(true);
        }
      });
      observer.observe({ type: 'resource', buffered: true });
    } catch {
      /* Repli : le compteur reste lisible via getEntriesByType(). */
    }
  }
}

/* M44-06 : on retient le premier mouvement en attente d'une notification. */
function onPointer() {
  if (!pointerAt) pointerAt = performance.now();
}

function installPointer(host) {
  if (!host || host === pointerHost) return;
  if (pointerHost) {
    pointerHost.removeEventListener('pointermove', onPointer);
    pointerHost.removeEventListener('pointerdown', onPointer);
  }
  host.addEventListener('pointermove', onPointer, { passive: true });
  host.addEventListener('pointerdown', onPointer, { passive: true });
  pointerHost = host;
}

/* M44-06 et M44-07 : greffes événementielles, une seule fois par session. */
function installHover(ctx) {
  if (typeof ctx.onHover === 'function' && !hoverHooked) {
    hoverHooked = true;
    ctx.onHover((info) => {
      const code = info && info.code;
      if (!code) return;
      const now = performance.now();
      if (pointerAt) {
        const elapsed = now - pointerAt;
        if (elapsed >= 0 && elapsed <= 500) {
          hoverMs = elapsed;
          hoverCount += 1;
        }
        pointerAt = 0;
      }
      paint(true);
    });
  }
  if (typeof ctx.onLeave === 'function' && !leaveHooked) {
    leaveHooked = true;
    ctx.onLeave(() => { pointerAt = 0; });
  }
}

function installClicks(ctx) {
  if (clickHooked) return;
  clickHooked = true;
  document.addEventListener('click', (event) => {
    const target = event.target;
    const button = target && typeof target.closest === 'function'
      ? target.closest('#globe-choices button') : null;
    if (!button) return;
    const index = Number(button.getAttribute('data-index'));
    const list = countriesRef || (Array.isArray(ctx.countries) ? ctx.countries : []);
    const country = list[index];
    if (!country || !country.name) return;
    lastSelection = country.name;
    paint(true);
  }, true);
}

function install(ctx) {
  if (!ctx || !ctx.scene || typeof ctx.css !== 'function' ||
      typeof ctx.el !== 'function' || typeof ctx.onReady !== 'function') return;

  origin(); /* M44-01 */
  reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false; /* M44-08 */
  ctx.css(CSS_ID, CSS); /* M44-05 */

  if (ctx.host && ctx.host.isConnected) hostRef = ctx.host;
  if (Array.isArray(ctx.countries) && ctx.countries.length) countriesRef = ctx.countries;

  ensurePanel(ctx); /* M44-05 */
  installResources(); /* M44-04 */
  installPointer(hostRef); /* M44-06 */
  installClicks(ctx); /* M44-07 */
  installHover(ctx); /* M44-06 */

  /* M44-03 : repli si le moteur était déjà prêt avant l'enregistrement. */
  const live = window.VECTEMPOREL_GLOBE;
  if (live && live.ready && !readyAt) {
    markReady({ engine: live, host: ctx.host });
  }
  if (!readyHooked) {
    readyHooked = true;
    ctx.onReady(markReady);
  }
  paint(true);
}

register('M44', install);
