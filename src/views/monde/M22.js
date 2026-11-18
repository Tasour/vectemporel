import { register } from './registry.js';

/* Lentille M22 — ordre de lecture et continuité du focus dans la vue Monde.
 *
 * Un seul fichier possédé. Aucun fichier partagé modifié, aucun réseau, aucun
 * aléa, aucun timer, aucune boucle rAF, aucun observateur, aucun message de journalisation
 * Structure préservée : ce greffon n'ajoute aucun enfant à .globe-list ni à
 * .globe-country ; il ne modifie que des attributs et des nœuds situés hors
 * de ces deux sous-arbres (scène et hôte du globe).
 *
 * Chantiers : M22-01 … M22-10 (voir UNIFIED_AUDIT/MONDE/views/M22.md).
 */

const CSS_ID = 'monde-m22';
const SKIP_ID = 'm22-skip-list';
const HELP_ID = 'm22-order-help';

const CSS = `
.m22-skip {
  position: absolute; left: 10px; top: 10px; z-index: 40;
  transform: translateY(-180%);
  padding: 9px 13px; border: 1px solid var(--gold); border-radius: 8px;
  background: var(--surface-2); color: var(--gold-bright);
  font-size: 12px; font-weight: 600; line-height: 1.2; text-decoration: none;
}
.m22-skip:focus { transform: none; outline: 3px solid var(--gold-bright); outline-offset: 2px; }
.m22-sr {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
`;

/* Garde module : un seul callback onReady malgré un rendu rejoué (registry.js:55). */
let readyHooked = false;
let viewRef = null;
let hostRef = null;

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function closestView(scene) {
  const view = scene && scene.closest ? scene.closest('.globe-view') : null;
  return view && view.isConnected ? view : null;
}

function applyCss(css) {
  if (typeof css === 'function') {
    css(CSS_ID, CSS);
    return;
  }
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

/* M22-01 — lien d'évitement : premier focus de la vue, hors de .globe-list. */
function installSkip(scene, el, create) {
  let skip = document.getElementById(SKIP_ID);
  if (!skip) {
    skip = (typeof el === 'function' ? el : create)('a', 'm22-skip', 'Aller à la liste des pays');
    skip.id = SKIP_ID;
    skip.setAttribute('href', '#globe-choices');
    skip.addEventListener('click', (event) => {
      const choices = document.getElementById('globe-choices')
        || (viewRef && viewRef.querySelector('.globe-choices'));
      if (!choices) return; // ancrage natif conservé si la cible n'existe pas
      event.preventDefault();
      if (choices.tabIndex !== -1) choices.tabIndex = -1;
      choices.focus({ preventScroll: false });
    });
  }
  if (skip.parentElement !== scene) scene.insertBefore(skip, scene.firstChild);
}

/* M22-02 — cible de saut focalisable, mais absente de la séquence Tab. */
function prepareChoiceTarget(view) {
  const choices = document.getElementById('globe-choices')
    || (view && view.querySelector('.globe-choices'));
  if (choices && choices.tabIndex !== -1) choices.tabIndex = -1;
  return choices;
}

/* M22-03 — descriptif de l'ordre de lecture, adjoint sans écraser globe-help. */
function attachOrderHelp(host, el, create) {
  let help = document.getElementById(HELP_ID);
  if (!help) {
    help = (typeof el === 'function' ? el : create)('p', 'm22-sr');
    help.id = HELP_ID;
    help.textContent = 'Ordre de lecture de la vue Monde : lien vers la liste des pays, globe interactif, commandes de zoom et de rotation, puis la liste des dix pays. Tab suit cet ordre ; les flèches parcourent les pays.';
  }
  if (help.parentElement !== host) host.appendChild(help);
  const ids = (host.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (ids.indexOf(HELP_ID) < 0) {
    ids.push(HELP_ID);
    host.setAttribute('aria-describedby', ids.join(' '));
  }
}

/* M22-04 et M22-09 — régions nommées : la liste et la vue entière. */
function nameRegions(view, list) {
  const title = document.getElementById('globe-title');
  if (!title) return;
  if (list && !list.hasAttribute('aria-labelledby')) {
    list.setAttribute('aria-labelledby', title.id);
  }
  if (view && !view.hasAttribute('aria-labelledby')) {
    if (!view.hasAttribute('role')) view.setAttribute('role', 'region');
    view.setAttribute('aria-labelledby', title.id);
  }
}

/* M22-05 — exactement un point de tabulation dans la grille des pays. */
function normalizeCountryStops(list) {
  const buttons = list ? Array.prototype.slice.call(list.querySelectorAll('.globe-country')) : [];
  if (!buttons.length) return 0;
  let keep = -1;
  for (let i = 0; i < buttons.length; i += 1) {
    if (buttons[i].getAttribute('aria-current') === 'true') { keep = i; break; }
  }
  if (keep < 0) keep = buttons.findIndex((button) => button.tabIndex === 0);
  if (keep < 0) keep = 0;
  buttons.forEach((button, index) => { button.tabIndex = index === keep ? 0 : -1; });
  return keep;
}

/* M22-06 — le HUD (statut, lecture) précède toujours les boutons dans le DOM. */
function orderControls(scene) {
  const hud = scene.querySelector('.globe-hud');
  const controls = scene.querySelector('.globe-controls');
  if (hud && controls && controls.parentElement === scene
      && controls !== scene.lastElementChild) {
    scene.appendChild(controls);
  }
}

/* M22-07 — ordinal en tête du nom accessible, sans toucher au contenu. */
function labelCountries(list, countries) {
  const buttons = list ? Array.prototype.slice.call(list.querySelectorAll('.globe-country')) : [];
  const total = buttons.length;
  buttons.forEach((button, index) => {
    if (button.hasAttribute('aria-label')) return;
    const nameNode = button.querySelector('.globe-country-name');
    const metaNode = button.querySelector('.globe-country-meta');
    const coverNode = button.querySelector('.globe-country-cover');
    const fallback = countries && countries[index] ? countries[index].name : '';
    const name = ((nameNode && nameNode.textContent) || fallback || '').trim();
    const parts = [`Pays ${index + 1} sur ${total} : ${name}`];
    if (metaNode && metaNode.textContent.trim()) parts.push(metaNode.textContent.trim());
    if (coverNode && coverNode.textContent.trim()) parts.push(coverNode.textContent.trim());
    button.setAttribute('aria-label', parts.join('. '));
  });
}

/* M22-08 et M22-10 — miroir déclaratif de la séquence de focus, auditable. */
function refreshOrderMarker(view, host, payload) {
  if (!view || !host) return;
  const nodes = Array.prototype.slice.call(view.querySelectorAll('a[href], button'));
  const parts = nodes.map((node, index) => {
    const label = node.id || node.getAttribute('aria-label')
      || (node.textContent || '').trim().slice(0, 26) || node.tagName.toLowerCase();
    return `${index + 1}:${label}`;
  });
  host.dataset.m22Order = parts.join(' > ');
  host.dataset.m22Stops = String(nodes.length);
  host.dataset.m22Engine = payload && payload.engine && payload.engine.ready
    ? 'ready' : (host.dataset.m22Engine || 'pending');
}

function install(ctx) {
  const context = ctx || {};
  const { scene, host, countries, css, el, onReady } = context;
  if (!scene || !host) return;

  applyCss(css);
  const view = closestView(scene);
  viewRef = view;
  hostRef = host;
  const list = view ? view.querySelector('.globe-list') : null;

  prepareChoiceTarget(view);                 // M22-02
  installSkip(scene, el, make);              // M22-01
  attachOrderHelp(host, el, make);           // M22-03
  nameRegions(view, list);                   // M22-04, M22-09
  normalizeCountryStops(list);               // M22-05
  orderControls(scene);                      // M22-06
  labelCountries(list, countries);           // M22-07

  if (!readyHooked && typeof onReady === 'function') {
    readyHooked = true;
    onReady((payload) => {
      const currentHost = (payload && payload.host) || hostRef;
      const currentView = currentHost && currentHost.closest
        ? currentHost.closest('.globe-view') : viewRef;
      refreshOrderMarker(
        currentView && currentView.isConnected ? currentView : viewRef,
        currentHost,
        payload
      );
    });
  }
  refreshOrderMarker(view, host, null);      // M22-08
}

register('M22', install);
