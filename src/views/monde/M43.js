import { register } from './registry.js';

/* Lentille M43 — Focus et piège (domaine E : qualité & validation).
 * Dix chantiers M43-01 … M43-10, tous implémentés ici.
 *
 * La coque possède la restauration après innerHTML (shell.js:251-292) et le
 * piège de Tab des dialogues (shell.js:294-314) ; M13 possède l'aperçu clavier
 * du drapeau et la restauration de aria-label ; M20 possède #globe-live.
 * Cette lentille ne reprend aucun de ces pouvoirs : elle ajoute une ancre de
 * repli, met l'overlay de révélation en inert, garde le host focalisable et
 * expose un témoin borné.
 *
 * Règle M43-06 : aucun écouteur keydown global, aucun preventDefault ni
 * stopPropagation — Échap/Tab restent au routeur unique (globe.js:226-227).
 * Zéro réseau, zéro aléa, zéro console.*, aucune boucle rAF récurrente, aucun
 * timer, aucun sélecteur de test modifié.
 */

const CSS_ID = 'monde-m43';
const ANCHOR_ID = 'monde-m43-anchor';
const STATUS_ID = 'monde-m43-status';
const HELP_ID = 'monde-m43-focushelp';
const OVERLAY_ID = 'globe-reveal'; /* lecture seule : ID existant, non modifié */
const APP_ID = 'app';
const ANNOUNCE_GAP_MS = 1500;

const CSS = `
  .monde-m43-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
    overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  @media (prefers-reduced-motion:reduce){.monde-m43-sr{transition:none;animation:none}}
`;

/* M43-08 : gardes module + état par host (le host est réattaché, pas remplacé). */
const weak = new WeakMap();
let latest = null;
let bound = false;
let readyHooked = false;
let overlayObserver = null;
let appObserver = null;

function slot(host) {
  let s = weak.get(host);
  if (!s) {
    s = {
      host,
      engine: 'absent',
      reduced: false,
      armed: false,
      recovered: 0,
      repaired: 0,
      lastAnnounce: -Infinity,
      raf: 0,
      overlay: null,
      app: null,
      hostObserver: null,
    };
    weak.set(host, s);
  }
  return s;
}

function byId(id) {
  return document.getElementById(id);
}

function ensureBodyNode(tag, id, className, text) {
  let node = byId(id);
  if (!node || !node.isConnected) {
    node = document.createElement(tag);
    node.id = id;
    if (className) node.className = className;
    if (text) node.textContent = text;
    document.body.appendChild(node);
  }
  return node;
}

/* M43-04 : annonce bornée, jamais dans #globe-live (propriété de M20). */
function announce(s, message) {
  const now = (typeof performance !== 'undefined' && performance.now)
    ? performance.now() : 0;
  if (now - s.lastAnnounce < ANNOUNCE_GAP_MS) return;
  s.lastAnnounce = now;
  const status = byId(STATUS_ID);
  if (status && status.textContent !== message) status.textContent = message;
}

/* M43-03 : union dédupliquée de aria-describedby — préserve globe-help et M05. */
function appendDescribed(host) {
  const ids = (host.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (ids.indexOf(HELP_ID) === -1) {
    ids.push(HELP_ID);
    host.setAttribute('aria-describedby', ids.join(' '));
  }
}

/* M43-05 : rôle et tabindex sont restaurés seuls ; aria-label (M13) et
   aria-describedby (M05/M43) sont hors du attributeFilter : pas de récursion. */
function repairHost(host, s) {
  let changed = false;
  if (host.getAttribute('role') !== 'group') {
    host.setAttribute('role', 'group');
    changed = true;
  }
  if (host.tabIndex !== 0) {
    host.tabIndex = 0;
    changed = true;
  }
  if (changed) {
    s.repaired += 1;
    host.dataset.m43Host = 'repaired';
    host.dataset.m43Repaired = String(s.repaired);
  } else if (host.dataset.m43Host !== 'ok') {
    host.dataset.m43Host = 'ok';
  }
}

/* M43-02/07 : une seule frame par rendu, puis vérification du focus réel.
   Le focus restauré par shell.js/M08-like garde la main ; l'ancre ne prend le
   relais que si le focus est-retombé sur <body> ou un nœud détaché. */
function scheduleRecovery(s) {
  if (s.raf) return;
  s.raf = requestAnimationFrame(() => {
    s.raf = 0;
    const active = document.activeElement;
    const lost = !active || active === document.body || active.isConnected === false;
    if (!lost) {
      s.armed = false;
      return;
    }
    if (!s.armed) return;
    const anchor = byId(ANCHOR_ID);
    if (!anchor || !anchor.isConnected) return;
    try { anchor.focus({ preventScroll: true }); } catch { /* focus indisponible */ }
    s.armed = false;
    s.recovered += 1;
    if (s.host) {
      s.host.dataset.m43Recovered = String(s.recovered);
      s.host.dataset.m43Anchor = 'active';
    }
    announce(s, 'Focus récupéré sur la navigation clavier du globe.');
  });
}

/* M43-01 : inert sur l'overlay de révélation. Repli sans inert : on retire
   tout tabindex d'un éventuel descendant focusable (aucun aujourd'hui). */
function makeOverlayInert(overlay) {
  if (!overlay) return;
  if ('inert' in overlay) {
    if (overlay.inert !== true) overlay.inert = true;
  } else {
    const candidates = overlay.querySelectorAll('button, a[href], [tabindex]');
    for (let i = 0; i < candidates.length; i += 1) {
      candidates[i].setAttribute('tabindex', '-1');
    }
  }
}

function markOverlayState(overlay) {
  const el = document.documentElement;
  const visible = !!(overlay && overlay.classList && overlay.classList.contains('is-visible'));
  el.dataset.m43Overlay = visible ? 'visible' : 'hidden';
}

register('M43', (ctx) => {
  latest = ctx || latest;
  if (!latest) return;
  const { host, css } = latest;
  if (!host) return;

  if (typeof css === 'function') css(CSS_ID, CSS);
  const s = slot(host);

  let reduced = false;
  try { reduced = !!(latest.reducedMotion && latest.reducedMotion()); }
  catch { reduced = false; }
  s.reduced = reduced;

  /* M43-02/04/03 : nœuds du body, hors de #app (survivent au innerHTML). */
  const anchor = ensureBodyNode('span', ANCHOR_ID, 'monde-m43-sr', 'Reprise du focus');
  anchor.tabIndex = -1; /* M43-06 : reachable seulement par programmation */
  const status = ensureBodyNode('p', STATUS_ID, 'monde-m43-sr');
  if (status.getAttribute('role') !== 'status') status.setAttribute('role', 'status');
  if (status.getAttribute('aria-live') !== 'polite') status.setAttribute('aria-live', 'polite');
  if (status.getAttribute('aria-atomic') !== 'true') status.setAttribute('aria-atomic', 'true');
  ensureBodyNode('p', HELP_ID, 'monde-m43-sr',
    'Navigation du globe : flèches pour parcourir les pays, Entrée pour ouvrir, Échap pour revenir, Tab pour quitter le groupe.');

  appendDescribed(host);

  /* M43-06/09/10 : marqueurs auditables, sans interaction clavier propre. */
  host.dataset.m43Escape = 'passive';
  host.dataset.m43Engine = s.engine;
  host.dataset.m43Reduced = reduced ? '1' : '0';
  if (host.dataset.m43Host !== 'repaired' || s.repaired === 0) {
    host.dataset.m43Host = host.dataset.m43Host || 'ok';
  }

  /* M43-01 : overlay existant avant runMondeEnhancements (globe.js:320,442). */
  const overlay = byId(OVERLAY_ID);
  if (overlay) {
    makeOverlayInert(overlay);
    markOverlayState(overlay);
    if (s.overlay !== overlay) {
      s.overlay = overlay;
      if (overlayObserver) overlayObserver.disconnect();
      overlayObserver = new MutationObserver(() => {
        makeOverlayInert(overlay);
        markOverlayState(overlay);
      });
      overlayObserver.observe(overlay, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* M43-05 : garde du host focalisable, réinstallée à chaque rendu. */
  if (s.hostObserver) s.hostObserver.disconnect();
  s.hostObserver = new MutationObserver(() => repairHost(host, s));
  s.hostObserver.observe(host, { attributes: true, attributeFilter: ['role', 'tabindex'] });
  repairHost(host, s);

  /* M43-02 : un seul observateur de rendu sur la racine de la coque. */
  const app = byId(APP_ID);
  if (app && s.app !== app) {
    s.app = app;
    if (appObserver) appObserver.disconnect();
    appObserver = new MutationObserver(() => scheduleRecovery(s));
    appObserver.observe(app, { childList: true });
  }

  /* M43-02 : arme la récupération uniquement depuis une cible du globe.
     Lecture de data-index et de stage.contains : aucun sélecteur modifié. */
  if (!bound) {
    bound = true;
    document.addEventListener('focusin', (event) => {
      const state = latest;
      if (!state || !state.host) return;
      const st = slot(state.host);
      const target = event.target;
      if (!target || typeof target.getAttribute !== 'function') return;
      const inHost = target === state.host
        || !!(state.host.contains && state.host.contains(target));
      const inStage = !!(state.stage && state.stage.contains && state.stage.contains(target));
      const isChoice = target.getAttribute('data-index') !== null;
      if (inHost || inStage || isChoice) st.armed = true;
    }, { passive: true });
  }

  /* M43-09 : onReady ne fait que publier l'état du moteur ; jamais de repli
     bruyant si le payload est incomplet (sans WebGL). */
  if (!readyHooked && typeof latest.onReady === 'function') {
    readyHooked = true;
    latest.onReady((payload) => {
      const state = latest;
      if (!state || !state.host) return;
      const st = slot(state.host);
      st.engine = (payload && payload.engine && payload.engine.ready) ? 'ready' : 'absent';
      state.host.dataset.m43Engine = st.engine;
    });
  }
});
