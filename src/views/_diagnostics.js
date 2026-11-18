/* Mode diagnostic générique pour les vues à 100 lentilles.
 * Les panneaux des greffons sont marqués et masqués par défaut ; un bouton
 * les regroupe dans un tiroir défilant, avec restauration au parent d'origine.
 */
const originalParents = new WeakMap();
let enabled = false;
let button = null;
let drawer = null;

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

  if (!button) {
    button = document.getElementById(`${view}-diagnostics-toggle`);
    if (!button) {
      button = document.createElement('button');
      button.id = `${view}-diagnostics-toggle`;
      button.type = 'button';
      button.textContent = 'Diagnostics · 100';
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-controls', `${view}-diagnostics-drawer`);
      button.addEventListener('click', () => setDiagnostics(view, !enabled, ctx));
    }
    if (button.parentNode !== document.body) document.body.appendChild(button);
  }
  if (!drawer) {
    drawer = document.getElementById(`${view}-diagnostics-drawer`);
    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.id = `${view}-diagnostics-drawer`;
      const title = document.createElement('h2');
      title.className = 'diagnostics-title';
      title.textContent = `Diagnostic — ${view} (100 lentilles)`;
      drawer.appendChild(title);
    }
    if (drawer.parentNode !== document.body) document.body.appendChild(drawer);
  }

  mark(ctx, view);
  if (enabled) setDiagnostics(view, true, ctx);
}

function mark(ctx, view) {
  const attr = `data-${view}-diagnostic`;
  const containers = [document.body, ctx.stage, ctx.layout].filter(Boolean);
  const pattern = /^(e\d{2,3}[-_ ]|.*-e\d{2,3})/i;
  document.querySelectorAll('[id]').forEach((node) => {
    if (!pattern.test(node.id) || !containers.includes(node.parentElement)) return;
    if (node.hasAttribute(attr)) return;
    node.setAttribute(attr, '');
    originalParents.set(node, node.parentElement);
  });
}

function setDiagnostics(view, next, ctx) {
  enabled = Boolean(next);
  document.body.classList.toggle(`${view}-diagnostics`, enabled);
  if (button) {
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = enabled ? 'Fermer le diagnostic' : 'Diagnostics · 100';
  }
  if (!drawer) return;
  const title = drawer.querySelector('.diagnostics-title');
  const attr = `data-${view}-diagnostic`;
  if (enabled) {
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
