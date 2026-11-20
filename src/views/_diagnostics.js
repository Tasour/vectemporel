/* Mode diagnostic optionnel des vues à 100 lentilles.
 * Les panneaux sont toujours masqués ; l'interface de bascule n'existe que si
 * l'URL porte ?diagnostics=1. L'état est propre à chaque vue (plus de singleton
 * partagé entre les 10 registres). */
const originalParents = new WeakMap();
const states = new Map();
const contexts = new Map();
let markObserver = null;
const DIAGNOSTICS_ENABLED = typeof location !== 'undefined'
  && new URLSearchParams(location.search).has('diagnostics');

export function installDiagnostics(ctx) {
  if (typeof document === 'undefined' || !ctx || !ctx.stage) return;
  const view = ctx.viewId || 'view';
  const styleId = `${view}-diagnostics-css`;
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      body [data-${view}-diagnostic] { display: none !important; }
      body.${view}-diagnostics [data-${view}-diagnostic] { display: block !important; }
      body:not(.atlas-diagnostics) [data-lens-panel] { display: none !important; }
      #${view}-diagnostics-toggle { position: fixed; top: 62px; right: 12px; z-index: 80;
        min-width: 44px; min-height: 36px; padding: 6px 12px; font: 600 12px/1 inherit;
        color: #f5e9d0; background: rgba(12,16,24,.92); border: 1px solid rgba(230,185,111,.5);
        border-radius: 6px; cursor: pointer; }
      #${view}-diagnostics-toggle:focus-visible { outline: 2px solid #e6b96f; outline-offset: 2px; }
      #${view}-diagnostics-drawer { position: fixed; inset: 108px 12px 64px auto; width: min(380px, 42vw);
        z-index: 79; overflow: auto; padding: 12px; display: none;
        background: rgba(8,11,18,.96); border: 1px solid rgba(230,185,111,.35); border-radius: 8px; }
      body.${view}-diagnostics #${view}-diagnostics-drawer { display: block; }
      #${view}-diagnostics-drawer > *:not(.diagnostics-title) { position: relative !important;
        inset: auto !important; max-width: 100% !important; margin: 0 0 12px !important;
        transform: none !important; z-index: auto !important; }
      .diagnostics-title { position: sticky; top: 0; margin: 0 0 12px; padding: 6px 0;
        background: rgba(8,11,18,.98); color: #e6b96f; font-size: 13px; }
      @media (max-width: 700px) { #${view}-diagnostics-drawer { width: calc(100vw - 24px); inset: 108px 12px 64px 12px; } }
    `;
    document.head.appendChild(style);
  }

  // Le marquage universel des panneaux a lieu même hors diagnostics : c'est ce
  // qui permet de les masquer par défaut en production. Les lentilles étant
  // chargées en différé, un observateur marque aussi les nœuds ajoutés ensuite.
  contexts.set(view, ctx);
  if (!markObserver && typeof MutationObserver !== 'undefined') {
    markObserver = new MutationObserver(() => {
      for (const [registeredView, registeredCtx] of contexts) mark(registeredCtx, registeredView);
    });
    markObserver.observe(document.body, { childList: true, subtree: true });
  }
  mark(ctx, view);
  if (DIAGNOSTICS_ENABLED) document.body.classList.add('atlas-diagnostics');
  else return;

  let state = states.get(view);
  if (!state) {
    let button = document.getElementById(`${view}-diagnostics-toggle`);
    if (!button) {
      button = document.createElement('button');
      button.id = `${view}-diagnostics-toggle`;
      button.type = 'button';
      button.textContent = 'Diagnostics · 100';
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-controls', `${view}-diagnostics-drawer`);
    }
    if (button.parentNode !== document.body) document.body.appendChild(button);

    let drawer = document.getElementById(`${view}-diagnostics-drawer`);
    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.id = `${view}-diagnostics-drawer`;
      const title = document.createElement('h2');
      title.className = 'diagnostics-title';
      title.textContent = `Diagnostic — ${view} (100 lentilles)`;
      drawer.appendChild(title);
    }
    if (drawer.parentNode !== document.body) document.body.appendChild(drawer);
    state = { button, drawer, enabled: false };
    button.addEventListener('click', () => setDiagnostics(view, !state.enabled, ctx));
    states.set(view, state);
  }

  mark(ctx, view);
  if (state.enabled) setDiagnostics(view, true, ctx);
}

function mark(ctx, view) {
  const attr = `data-${view}-diagnostic`;
  const containers = [document.body, ctx.stage, ctx.layout].filter(Boolean);
  const pattern = /^(e\d{2,3}[-_ ]|.*-e\d{2,3})/i;
  document.querySelectorAll('[id]').forEach((node) => {
    if (!pattern.test(node.id)) return;
    const LENS = /(^|[-_])(e\d{2,3}|v2[-_]?e\d{3})([-_]|$)/i;
    const isLens = LENS.test(node.id)
      || String(node.className || '').split(/\s+/).some((name) => LENS.test(name));
    const isSkip = /skip/i.test(node.id);
    if (isLens && !isSkip && !node.hasAttribute('data-lens-panel')) node.setAttribute('data-lens-panel', '');
    if (!containers.includes(node.parentElement)) return;
    if (node.hasAttribute(attr)) return;
    node.setAttribute(attr, '');
    originalParents.set(node, node.parentElement);
  });
}

function setDiagnostics(view, next, ctx) {
  const state = states.get(view);
  if (!state) return;
  state.enabled = Boolean(next);
  document.body.classList.toggle(`${view}-diagnostics`, state.enabled);
  state.button.setAttribute('aria-pressed', String(state.enabled));
  state.button.textContent = state.enabled ? 'Fermer le diagnostic' : 'Diagnostics · 100';
  const { drawer } = state;
  const title = drawer.querySelector('.diagnostics-title');
  const attr = `data-${view}-diagnostic`;
  if (state.enabled) {
    mark(ctx, view);
    document.querySelectorAll(`[${attr}]`).forEach((node) => {
      if (node.parentNode !== drawer) drawer.appendChild(node);
    });
  } else {
    [...drawer.children].filter((node) => node !== title).forEach((node) => {
      const parent = originalParents.get(node);
      if (parent && parent.isConnected) parent.appendChild(node);
      else if (ctx.stage && ctx.stage.isConnected) ctx.stage.appendChild(node);
      node.removeAttribute(attr);
    });
  }
}
