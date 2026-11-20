import { register } from './registry.js';

/* Lentille V2 E072 — budget de peinture appliqué au survol de la vue Constellation.
   Seconde passe : dix chantiers inédits, tous implémentés, sans réseau, sans
   source aléatoire, sans minuteur ni boucle d'animation propre. */

const STYLE_ID = 'constellation-v2-e072';
const PANEL_ID = 'v2e072-budget';
const STATE_ID = 'v2e072-budget-state';
const HELP_ID = 'v2e072-budget-help';
const TOGGLE_ID = 'v2e072-toggle';
const NODE_SELECTOR = '.const-sun, .const-planet, .const-moon';

const CSS = `
/* v2e072-01 — un seul marqueur par nœud, posé et retiré en phase de capture. */
.constellation-field [data-v2e072-hover="1"]{z-index:7}

/* v2e072-02 — défilement : l'effet de survol est neutralisé tant que ça bouge. */
.constellation-field[data-v2e072-scroll="1"] [data-v2e072-hover="1"]{transform:translate(-50%,-50%)!important;outline:none!important;will-change:auto!important}

/* v2e072-03 — onglet masqué, fenêtre sans focus ou suspension manuelle. */
.constellation-field[data-v2e072-idle="1"] [data-v2e072-hover="1"],
.constellation-field[data-v2e072-useroff="1"] [data-v2e072-hover="1"]{transform:translate(-50%,-50%)!important;outline:none!important;will-change:auto!important}

/* v2e072-04 — pointeur grossier ou sans survol : aucune promotion coûteuse. */
@media (hover:none),(pointer:coarse){
  .constellation-field [data-v2e072-hover="1"]{transform:translate(-50%,-50%)!important;outline:none!important;will-change:auto!important}
}

/* v2e072-05 — confinement de style et de mise en page sur chaque bouton. */
.constellation-field[data-v2e072-armed="1"] .const-sun[data-v2e072-node="1"],
.constellation-field[data-v2e072-armed="1"] .const-planet[data-v2e072-node="1"],
.constellation-field[data-v2e072-armed="1"] .const-moon[data-v2e072-node="1"]{contain:layout style}

/* v2e072-06 — calques hors écran non peints, avec repli sur les anciens moteurs. */
.constellation-field[data-v2e072-cv="1"] .const-layer{content-visibility:auto;contain-intrinsic-size:1px 1px}

/* v2e072-07 — une seule règle de transformation, paramétrée par une variable. */
.constellation-field[data-v2e072-armed="1"] [data-v2e072-hover="1"]{
  transform:translate(-50%,-50%) scale(var(--v2e072-scale,1));
  outline:2px solid var(--gold-bright,#f0cf8f);
  outline-offset:2px;
  will-change:transform
}

/* v2e072-09 — ombres, filtres et transitions coûteux suspendus au survol. */
.constellation-field[data-v2e072-lean="1"] [data-v2e072-hover="1"]{box-shadow:none!important;filter:none!important;text-shadow:none!important;transition:none!important;animation:none!important}

/* v2e072-10 — panneau de budget : témoin lisible, cible ≥ 36 px, focus visible. */
#v2e072-budget{margin-top:8px;padding:6px 9px;border:1px solid rgba(230,185,111,.28);border-radius:8px;background:rgba(7,11,18,.72);max-width:100%}
#v2e072-budget-state{margin:0 0 6px;color:var(--muted,#93a0b4);font:9px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
#v2e072-toggle{min-height:36px;padding:0 12px;border:1px solid var(--gold,#e6b96f);border-radius:8px;background:rgba(255,255,255,.03);color:var(--gold-bright,#f0cf8f);font-size:10px;cursor:pointer}
#v2e072-toggle:focus-visible{outline:3px solid var(--gold-bright,#f0cf8f);outline-offset:2px}
.v2e072-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (max-width:620px){#v2e072-budget-state{font-size:8px}}
@media (prefers-reduced-motion:reduce){.constellation-field [data-v2e072-hover="1"]{transform:translate(-50%,-50%)!important}}
@media (forced-colors:active){.constellation-field [data-v2e072-hover="1"]{outline:2px solid CanvasText!important;will-change:auto!important}}
`;

function ensureNode(id, tag, className, parent, factory) {
  let node = document.getElementById(id);
  if (!node) {
    node = factory(tag, className);
    node.id = id;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

/* Retourne le bouton survolé sans aucune lecture de géométrie. */
function nodeFrom(target, field) {
  if (!target || typeof target.closest !== 'function') return null;
  const node = target.closest(NODE_SELECTOR);
  return node && field.contains(node) ? node : null;
}

/* Retire tous les marqueurs : aucun état collant ne peut retenir une couche GPU. */
function clearHover(field) {
  const marked = field.querySelectorAll(NODE_SELECTOR + '[data-v2e072-hover="1"]');
  for (let i = 0; i < marked.length; i += 1) marked[i].removeAttribute('data-v2e072-hover');
}

register('E072', ctx => {
  /* Garde d'entrée : aucun ajout au DOM sans layout ni feuille de style disponible. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  const field = layout.querySelector('.constellation-field');
  if (!field) return;

  const factory = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      };

  css(STYLE_ID, CSS);

  const nodes = Array.from(field.querySelectorAll(NODE_SELECTOR));
  const nodeCount = nodes.length;
  const layerCount = field.querySelectorAll('.const-layer').length;
  field.dataset.v2e072Armed = nodeCount > 0 ? '1' : '0';

  /* E072-01 — Délégation en capture par événements non bouillonnants. */
  if (field.dataset.v2e072Bound !== '1') {
    field.dataset.v2e072Bound = '1';
    const enter = event => {
      const node = nodeFrom(event.target, field);
      if (node && node.dataset.v2e072Hover !== '1') node.dataset.v2e072Hover = '1';
    };
    const leave = event => {
      const node = nodeFrom(event.target, field);
      if (node && node.dataset.v2e072Hover === '1') node.removeAttribute('data-v2e072-hover');
    };
    field.addEventListener('pointerenter', enter, true);
    field.addEventListener('pointerleave', leave, true);
    field.addEventListener('focusin', enter, true);
    field.addEventListener('focusout', leave, true);
  }

  /* E072-02 — Suspension pendant le défilement, sans minuteur : scroll pose, scrollend lève. */
  field.dataset.v2e072Scroll = '0';
  field.addEventListener('scroll', () => { field.dataset.v2e072Scroll = '1'; }, true);
  const endScroll = () => {
    field.dataset.v2e072Scroll = '0';
    clearHover(field);
  };
  field.addEventListener('scrollend', endScroll, true);
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const KEY = '__v2e072_scroll';
    const previous = window[KEY];
    if (typeof previous === 'function' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('scrollend', previous, true);
    }
    window[KEY] = endScroll;
    window.addEventListener('scrollend', endScroll, true);
  }

  /* E072-03 — Suspension hors focus ou onglet masqué, lue une seule fois au départ. */
  field.dataset.v2e072Idle = typeof document !== 'undefined' && document.hidden ? '1' : '0';
  if (typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      field.dataset.v2e072Idle = document.hidden ? '1' : '0';
      if (document.hidden) clearHover(field);
    });
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const KEY = '__v2e072_focus';
    const previous = window[KEY];
    if (previous && typeof window.removeEventListener === 'function') {
      window.removeEventListener('focus', previous.on, true);
      window.removeEventListener('blur', previous.off, true);
    }
    const on = () => { field.dataset.v2e072Idle = '0'; };
    const off = () => { field.dataset.v2e072Idle = '1'; clearHover(field); };
    window[KEY] = { on, off };
    window.addEventListener('focus', on, true);
    window.addEventListener('blur', off, true);
  }

  /* E072-04 — Pointeur grossier ou sans survol : la promotion est désarmée d'emblée. */
  let coarse = false;
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    }
  } catch { coarse = false; }
  field.dataset.v2e072Coarse = coarse ? '1' : '0';

  /* E072-05 — Confinement appliqué uniquement aux boutons réellement présents. */
  nodes.forEach(node => { node.dataset.v2e072Node = '1'; });

  /* E072-06 — Calques différés seulement si le moteur porte content-visibility. */
  let canDefer = false;
  try {
    canDefer = typeof window !== 'undefined' && !!window.CSS
      && typeof window.CSS.supports === 'function'
      && window.CSS.supports('content-visibility', 'auto');
  } catch { canDefer = false; }
  field.dataset.v2e072Cv = canDefer ? '1' : '0';

  /* E072-07 — Une seule règle de transformation : l'échelle est écrite une fois par nœud. */
  field.style.setProperty('--v2e072-scale', '1');
  nodes.forEach(node => {
    let scale = '1';
    if (node.classList.contains('const-sun')) scale = '1.08';
    else if (node.classList.contains('const-planet')) scale = '1.12';
    else if (node.classList.contains('const-moon')) scale = '1.25';
    node.style.setProperty('--v2e072-scale', scale);
  });

  /* E072-08 — Filet de sécurité : au départ du pointeur, plus aucun état collant. */
  field.addEventListener('pointerleave', event => {
    if (event.target === field) clearHover(field);
  }, true);
  field.addEventListener('pointercancel', () => { clearHover(field); }, true);

  /* E072-09 — Ombres, filtres et transitions des lentilles voisines suspendus au survol. */
  field.dataset.v2e072Lean = '1';

  /* E072-10 — Témoin de budget : leviers actifs et couches évitées, sans mesure continue. */
  const panel = ensureNode(PANEL_ID, 'div', null, layout, factory);
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Budget de peinture du survol');
  panel.setAttribute('aria-describedby', HELP_ID);
  const state = ensureNode(STATE_ID, 'p', null, panel, factory);
  state.setAttribute('role', 'status');
  state.setAttribute('aria-live', 'polite');
  state.setAttribute('aria-atomic', 'true');
  const help = ensureNode(HELP_ID, 'p', 'v2e072-sr', layout, factory);
  help.textContent = 'Budget local du survol : les effets coûteux sont neutralisés pendant le défilement, hors focus et sur pointeur grossier. Un interrupteur permet de suspendre le survol à la main.';
  const toggle = ensureNode(TOGGLE_ID, 'button', null, panel, factory);
  toggle.type = 'button';
  toggle.setAttribute('aria-pressed', 'false');
  const textToggle = () => {
    toggle.textContent = field.dataset.v2e072Useroff === '1'
      ? 'Réactiver le survol' : 'Suspendre le survol';
  };
  const paint = () => {
    const levers = [];
    if (field.dataset.v2e072Scroll === '1') levers.push('défilement');
    if (field.dataset.v2e072Idle === '1') levers.push('inactivité');
    if (field.dataset.v2e072Coarse === '1') levers.push('pointeur grossier');
    if (field.dataset.v2e072Cv === '1') levers.push('calques différés');
    if (field.dataset.v2e072Useroff === '1') levers.push('suspension manuelle');
    const avoided = Math.max(0, nodeCount - 1);
    state.textContent = `${nodeCount} nœuds · ${layerCount} calques · au plus 1 couche promue au lieu de ${nodeCount} résidentes (${avoided} évitées) · leviers actifs : ${levers.length ? levers.join(', ') : 'aucun'}`;
  };
  toggle.addEventListener('click', () => {
    const halted = field.dataset.v2e072Useroff !== '1';
    field.dataset.v2e072Useroff = halted ? '1' : '0';
    toggle.setAttribute('aria-pressed', halted ? 'true' : 'false');
    if (halted) clearHover(field);
    textToggle();
    paint();
  });
  textToggle();
  paint();
});
