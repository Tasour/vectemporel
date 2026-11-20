/* Registre des 50 lentilles d'amélioration de la vue Monde.
 * Chaque module possède son propre fichier et s'enregistre ici. Le registre
 * applique les greffons dans l'ordre d'enregistrement, sans jamais interrompre
 * le rendu : une lentille défaillante est neutralisée silencieusement.
 *
 * Contrat du greffon : register(id, (ctx) => void)
 * ctx = {
 *   stage, scene, host, selected, countries, state,
 *   selectCountry, reveal, reducedMotion, say, el,
 *   css(uniqueId, rules), onReady(cb), onHover(cb), onLeave(cb),
 * }
 * Aucun réseau, aucun aléa, aucun fichier partagé modifié par un greffon.
 */

const entries = [];
const readyCallbacks = [];
const hoverCallbacks = [];
const leaveCallbacks = [];
const diagnostics = [];

export function register(id, apply) {
  if (typeof id === 'string' && typeof apply === 'function') entries.push({ id, apply });
}

export function cssOnce(uniqueId, rules) {
  if (!uniqueId || document.getElementById(uniqueId)) return;
  const style = document.createElement('style');
  style.id = uniqueId;
  style.textContent = rules;
  document.head.appendChild(style);
}

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function safe(id, fn, arg) {
  try { fn(arg); }
  catch (error) { diagnostics.push({ id, message: String(error?.message || error) }); }
}

/* --------------------------------------------------------------------------
 * Mode diagnostic : les 50 lentilles ajoutent leurs panneaux dans la scène.
 * Par défaut, seule l'interface utile est visible ; un bouton regroupe tous
 * les panneaux de diagnostic dans un tiroir défilant, sans les détruire.
 * ------------------------------------------------------------------------ */
const CORE_SCENE = [
  '#globe-canvas', '.globe-hud', '.globe-controls', '#globe-reveal',
  '#m22-skip-list', '#globe-m05-hint', '#globe-m05-zoom',
  '#m17-legend', '#monde-m24-legend',
];
let diagnosticsEnabled = false;
let drawer = null;
let toggle = null;
const originalParents = new WeakMap();
const MARK_EXEMPT = new Set([
  'monde-diagnostics-toggle', 'monde-diagnostics-drawer',
  'm22-skip-list', 'globe-m05-hint', 'globe-m05-zoom',
  'm17-legend', 'monde-m24-legend', 'm48-doc',
]);

function coreSelector() {
  return CORE_SCENE.join(', ');
}

/* Marque tous les panneaux produits par les lentilles, y compris ceux qui ne
   sont pas des enfants directs de la scène (HUD collés au body). */
function markDiagnostics(ctx) {
  const view = document.querySelector('.globe-view');
  const containers = [document.body, ctx && ctx.scene, ctx && ctx.host, view].filter(Boolean);
  const prefix = /^(monde-m\d|m\d\d-)/;
  document.querySelectorAll('[id]').forEach((node) => {
    if (!prefix.test(node.id) || MARK_EXEMPT.has(node.id)) return;
    if (!containers.includes(node.parentElement)) return;
    if (node.hasAttribute('data-monde-diagnostic')) return;
    node.setAttribute('data-monde-diagnostic', '');
    originalParents.set(node, node.parentElement);
  });
}

function installDiagnosticsMode(ctx) {
  if (typeof document === 'undefined' || !ctx || !ctx.scene) return;
  cssOnce('monde-diagnostics-css', `
    body [data-monde-diagnostic] { display: none !important; }
    body.monde-diagnostics [data-monde-diagnostic] { display: block !important; }
    .globe-scene > *:not(${coreSelector()}) { display: none !important; }
    body.monde-diagnostics .globe-scene > *:not(${coreSelector()}) { display: block !important; }
    #monde-diagnostics-toggle {
      position: fixed; top: 62px; right: 12px; z-index: 80;
      min-width: 44px; min-height: 36px; padding: 6px 12px;
      font: 600 12px/1 inherit; letter-spacing: .04em;
      color: #f5e9d0; background: rgba(12,16,24,.92);
      border: 1px solid rgba(230,185,111,.5); border-radius: 6px; cursor: pointer;
    }
    #monde-diagnostics-toggle:focus-visible { outline: 2px solid #e6b96f; outline-offset: 2px; }
    #monde-diagnostics-drawer {
      position: fixed; inset: 108px 12px 64px auto; width: min(380px, 42vw);
      z-index: 79; overflow: auto; padding: 12px;
      background: rgba(8,11,18,.96); border: 1px solid rgba(230,185,111,.35);
      border-radius: 8px; display: none;
    }
    body.monde-diagnostics #monde-diagnostics-drawer { display: block; }
    #monde-diagnostics-drawer > *:not(#monde-diagnostics-title) {
      position: relative !important; inset: auto !important;
      max-width: 100% !important; margin: 0 0 12px !important;
      transform: none !important; z-index: auto !important;
    }
    #monde-diagnostics-drawer .monde-diagnostics-title {
      position: sticky; top: 0; margin: 0 0 12px; padding: 6px 0;
      background: rgba(8,11,18,.98); color: #e6b96f; font-size: 13px;
    }
    @media (max-width: 700px) {
      #monde-diagnostics-drawer { width: calc(100vw - 24px); inset: 108px 12px 64px 12px; }
    }
    @media (prefers-reduced-motion: reduce) { #monde-diagnostics-drawer { transition: none; } }
  `);

  // Hors mode explicite ?diagnostics=1, aucun bouton ni tiroir en production.
  if (typeof location !== 'undefined' && !new URLSearchParams(location.search).has('diagnostics')) return;
  if (!toggle) {
    toggle = document.getElementById('monde-diagnostics-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.id = 'monde-diagnostics-toggle';
      toggle.type = 'button';
      toggle.textContent = 'Diagnostics · 50';
      toggle.setAttribute('aria-pressed', 'false');
      toggle.setAttribute('aria-controls', 'monde-diagnostics-drawer');
      toggle.addEventListener('click', () => setDiagnostics(!diagnosticsEnabled, ctx));
    }
    if (toggle.parentNode !== document.body) document.body.appendChild(toggle);
  }
  if (!drawer) {
    drawer = document.getElementById('monde-diagnostics-drawer');
    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.id = 'monde-diagnostics-drawer';
      drawer.setAttribute('aria-label', 'Panneaux de diagnostic des 50 lentilles du Monde');
      const title = document.createElement('h2');
      title.className = 'monde-diagnostics-title';
      title.textContent = 'Diagnostic des lentilles';
      drawer.appendChild(title);
    }
    if (drawer.parentNode !== document.body) document.body.appendChild(drawer);
  }
}

function setDiagnostics(enabled, ctx) {
  diagnosticsEnabled = Boolean(enabled);
  document.body.classList.toggle('monde-diagnostics', diagnosticsEnabled);
  if (toggle) {
    toggle.setAttribute('aria-pressed', String(diagnosticsEnabled));
    toggle.textContent = diagnosticsEnabled ? 'Fermer le diagnostic' : 'Diagnostics · 50';
  }
  if (!drawer) return;
  const title = drawer.querySelector('.monde-diagnostics-title');
  if (diagnosticsEnabled) {
    markDiagnostics(ctx);
    document.querySelectorAll('[data-monde-diagnostic]').forEach((node) => {
      if (node.parentNode !== drawer) drawer.appendChild(node);
    });
  } else {
    [...drawer.children].filter((node) => node !== title).forEach((node) => {
      const parent = originalParents.get(node);
      if (parent && parent.isConnected) parent.appendChild(node);
      else if (ctx && ctx.scene && ctx.scene.isConnected) ctx.scene.appendChild(node);
      node.removeAttribute('data-monde-diagnostic');
    });
  }
}

export function runMondeEnhancements(ctx) {
  /* Le globe est re-rendu à chaque changement de vue : les callbacks
     enregistrés par les lentilles ne doivent pas s'accumuler. */
  readyCallbacks.length = 0;
  hoverCallbacks.length = 0;
  leaveCallbacks.length = 0;
  installDiagnosticsMode(ctx);
  const api = {
    ...ctx,
    css: cssOnce,
    el,
    onReady: (cb) => { if (typeof cb === 'function') readyCallbacks.push(cb); },
    onHover: (cb) => { if (typeof cb === 'function') hoverCallbacks.push(cb); },
    onLeave: (cb) => { if (typeof cb === 'function') leaveCallbacks.push(cb); },
    notifyMondeHover,
    notifyMondeLeave,
    flushMondeReady,
  };
  entries.forEach(({ id, apply }) => safe(id, apply, api));
  markDiagnostics(ctx);
  if (diagnosticsEnabled) setDiagnostics(true, ctx);
  return { applied: entries.length, diagnostics };
}

export function flushMondeReady(payload) {
  readyCallbacks.forEach((cb) => safe('onReady', cb, payload));
}

export function notifyMondeHover(country, code) {
  hoverCallbacks.forEach((cb) => safe('onHover', cb, { country, code }));
}

export function notifyMondeLeave() {
  leaveCallbacks.forEach((cb) => safe('onLeave', cb, undefined));
}

export function mondeDiagnostics() {
  return { entries: entries.map((e) => e.id), diagnostics: [...diagnostics] };
}
