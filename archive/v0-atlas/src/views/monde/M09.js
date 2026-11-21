import { register } from './registry.js';

/* Lentille M09 — Contexte WebGL perdu / restauré (domaine A : rendu WebGL).
 *
 * Le moteur public/globe-engine.js n'est pas possédé : il n'expose aucun
 * abonnement « contexte » et son getInfo() ne dit rien d'une perte. La lentille
 * n'utilise donc que l'API publique reçue via onReady({ engine, host, selected })
 * et le canvas .globe-webgl du host. Aucun fichier partagé modifié, aucun
 * réseau, aucun aléa, aucun console.*, aucun sélecteur de test.
 *
 * Chantiers M09-01 à M09-10 : voir le rapport fourni avec la livraison.
 */

const CSS_ID = 'monde-m09';
const BADGE_ID = 'm09-contexte-badge';
const BOUND_KEY = 'm09Bound'; // data-m09-bound : garde d'idempotence des écouteurs
const RESTORE_DELAY_MS = 180;

const local = {
  ctx: null,
  host: null,
  engine: null,
  canvas: null,
  badge: null,
  onLost: null,
  onRestored: null,
  readyRegistered: false,
  contextLost: false,
  restoreTimer: 0,
  lossCount: 0,
  say: () => {},
  reducedMotion: () => false,
};

function cssRules() {
  return `
.m09-contexte-badge{
  margin:6px 0 0;padding:4px 8px;border-radius:6px;
  font-size:12px;line-height:1.35;
  color:var(--muted,#c9c9c9);
  background:rgba(0,0,0,.32);
  border:1px solid transparent;
}
.m09-contexte-badge[data-kind="lost"],
.m09-contexte-badge[data-kind="unavailable"]{
  color:var(--gold-bright,#f2d08c);
  border-color:rgba(230,185,111,.5);
  background:rgba(70,45,10,.5);
  font-weight:600;
}
.m09-contexte-badge[data-kind="restoring"]{ font-style:italic; }
@media (prefers-reduced-motion: reduce){
  .m09-contexte-badge{ transition:none !important; animation:none !important; }
}
`;
}

function badgeText(kind) {
  if (kind === 'lost') return 'Rendu 3D interrompu — utilisez la liste des pays ou les flèches au clavier.';
  if (kind === 'unavailable') return 'Rendu 3D indisponible — utilisez la liste des pays ou les flèches au clavier.';
  if (kind === 'restoring') return 'Rendu 3D en cours de rétablissement…';
  if (kind === 'pending') return 'Rendu 3D : initialisation…';
  return 'Rendu 3D disponible — glissez pour tourner, molette pour zoomer.';
}

function applyBadge(kind) {
  const badge = local.badge;
  if (!badge) return;
  badge.dataset.kind = kind;
  badge.textContent = badgeText(kind);
}

function initialKind() {
  if (typeof window === 'undefined') return 'pending';
  if (!window.THREE || !window.VECTEMPOREL_GLOBE) return 'unavailable';
  return 'pending';
}

/* M09-04 : nœud live autonome, indépendant du cycle d'initialisation du moteur.
   Il vit dans le host réutilisé par ensure() (globe.js), jamais dans le HUD
   recréé à chaque rendu. */
function ensureBadge(ctx) {
  const host = ctx.host;
  if (!host) return;
  let badge = document.getElementById(BADGE_ID);
  if (!badge) {
    badge = typeof ctx.el === 'function'
      ? ctx.el('p', 'm09-contexte-badge', '')
      : document.createElement('p');
    badge.id = BADGE_ID;
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    badge.setAttribute('aria-atomic', 'true');
  }
  if (badge.parentNode !== host) host.appendChild(badge);
  local.badge = badge;
  if (!local.contextLost) {
    const kind = initialKind();
    applyBadge(kind);
    if (!host.dataset.m09Contexte || host.dataset.m09Contexte === 'ok') {
      host.dataset.m09Contexte = kind;
    }
  }
  if (host.dataset.m09LossCount === undefined) host.dataset.m09LossCount = '0';
}

function currentCode(ctx) {
  if (!ctx) return null;
  const id = ctx.state && ctx.state.countryId;
  const list = ctx.countries;
  if (!id || !Array.isArray(list)) return null;
  const found = list.find((country) => country && country.id === id);
  return found ? found.code : null;
}

/* M09-05 : le moteur reste « visible » côté globe.js ; on ne relance la boucle
   qu si la vue est toujours active (marqueur positionné par syncEngine()). */
function shouldResume(ctx) {
  if (!ctx || !ctx.state || ctx.state.view !== 'globe') return false;
  if (typeof document === 'undefined' || !document.documentElement) return false;
  return document.documentElement.dataset.globeActive === '1';
}

/* M09-04, M09-08, M09-09 : une seule annonce par transition d'état. */
function announce(message) {
  local.say(message);
}

function handleLost(event) {
  /* M09-03 : preventDefault est requis par la spécification WebGL pour que
     restoreContext() soit autorisé. Surtout pas de stopPropagation : three.js
     doit recevoir l'événement pour recréer son contexte interne. */
  if (event && typeof event.preventDefault === 'function') event.preventDefault();

  clearTimeout(local.restoreTimer);
  local.restoreTimer = 0;

  if (!local.contextLost) {
    local.contextLost = true;
    local.lossCount += 1;
    if (local.host) {
      local.host.dataset.m09Contexte = 'lost';
      local.host.dataset.m09LossCount = String(local.lossCount);
      local.host.dataset.m09LastEvent = String(Date.now());
    }

    /* M09-05 : fermeture réversible (API publique) plutôt qu'un rendu no-op
       sur un contexte mort. close() garde renderer, textures et géométrie. */
    const engine = local.engine || window.VECTEMPOREL_GLOBE;
    if (engine && typeof engine.close === 'function') {
      try { engine.close(); } catch { /* le registre neutralise le greffon */ }
    }
    applyBadge('lost');
    announce('Rendu 3D interrompu. La liste des pays et le clavier restent disponibles.');
  }
}

function handleRestored() {
  if (!local.contextLost) return;
  if (local.host) local.host.dataset.m09Contexte = 'restoring';
  local.host.dataset.m09LastEvent = String(Date.now());
  applyBadge('restoring');

  /* M09-07 : anti-rafale — on stabilise avant de redémarrer ; une nouvelle
     perte annule la reprise en cours et reste en état « lost ». */
  clearTimeout(local.restoreTimer);
  local.restoreTimer = setTimeout(() => {
    local.restoreTimer = 0;
    if (!local.contextLost) return;
    local.contextLost = false;

    const ctx = local.ctx;
    if (local.host) {
      local.host.dataset.m09Contexte = 'ok';
      local.host.dataset.m09LastEvent = String(Date.now());
    }

    /* M09-06 : after initGLContext() de three.js, on réapplique l'état applicatif. */
    const engine = local.engine || window.VECTEMPOREL_GLOBE;
    if (engine) {
      const code = currentCode(ctx);
      try {
        if (shouldResume(ctx) && typeof engine.open === 'function') {
          engine.open(code || undefined);
        } else if (typeof engine.invalidate === 'function') {
          engine.invalidate();
        }
        if (code && typeof engine.setSelected === 'function') engine.setSelected(code);
      } catch { /* le registre neutralise le greffon */ }
    }

    applyBadge('ok');
    announce('Rendu 3D rétabli. La sphère est de nouveau interactive.');
  }, RESTORE_DELAY_MS);
}

/* M09-02, M09-10 : un seul jeu d'écouteurs par canvas, en phase capture pour
   devancer tout autre gestionnaire. Détachment sur remplacement du canvas. */
function attach(canvas) {
  if (canvas.dataset[BOUND_KEY] === '1') return;
  canvas.dataset[BOUND_KEY] = '1';
  local.onLost = (event) => handleLost(event);
  local.onRestored = () => handleRestored();
  canvas.addEventListener('webglcontextlost', local.onLost, true);
  canvas.addEventListener('webglcontextrestored', local.onRestored, true);
}

function detach(canvas) {
  if (!canvas) return;
  canvas.removeEventListener('webglcontextlost', local.onLost, true);
  canvas.removeEventListener('webglcontextrestored', local.onRestored, true);
  canvas.dataset[BOUND_KEY] = '';
}

function syncCanvas(ctx) {
  const host = ctx.host || local.host;
  if (!host || typeof document === 'undefined') return;
  if (!local.engine && typeof window !== 'undefined' && window.VECTEMPOREL_GLOBE) {
    local.engine = window.VECTEMPOREL_GLOBE;
  }
  const canvas = host.querySelector('canvas.globe-webgl') || host.querySelector('canvas');
  if (!canvas || canvas === local.canvas) return;
  if (local.canvas) detach(local.canvas);
  local.canvas = canvas;
  attach(canvas);
  /* Un canvas neuf créé pendant une perte doit refléter l'état en cours. */
  if (local.contextLost) {
    canvas.dataset[BOUND_KEY] = '1';
    applyBadge('lost');
  } else if (local.badge && local.badge.dataset.kind === 'pending' && local.engine) {
    applyBadge('ok');
    host.dataset.m09Contexte = 'ok';
  }
}

register('M09', (ctx) => {
  local.ctx = ctx;
  local.host = ctx.host || local.host;
  local.say = typeof ctx.say === 'function' ? ctx.say : () => {};
  local.reducedMotion = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : () => false;

  ctx.css(CSS_ID, cssRules());
  ensureBadge(ctx);

  /* M09-01 : l'engine n'est pas dans ctx ; on le récupère une seule fois via
     le payload onReady (flushMondeReady est appelé une seule fois au chargement). */
  if (!local.readyRegistered) {
    local.readyRegistered = true;
    ctx.onReady((payload) => {
      if (payload && payload.engine) local.engine = payload.engine;
      if (payload && payload.host) local.host = payload.host;
      if (local.host && local.badge && local.badge.parentNode !== local.host) {
        local.host.appendChild(local.badge);
      }
      if (!local.contextLost) {
        applyBadge('ok');
        if (local.host) local.host.dataset.m09Contexte = 'ok';
      }
      syncCanvas(local.ctx);
    });
  }

  /* M09-10 : à chaque rendu de la coque, on vérifie que le canvas attaché est
     toujours le bon (le host est réutilisé, le canvas peut être recréé). */
  syncCanvas(ctx);

  /* M09-09 : la préférence mouvement réduit est lue au moment de l'attachement
     pour ne jamais produire d'annonce animée ; le CSS neutralise toute transition. */
  if (local.reducedMotion() && local.badge) local.badge.style.transition = 'none';
});
