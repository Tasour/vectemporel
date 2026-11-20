import { register } from './registry.js';

/* Lentille E020 — B. Filtres & périmètre : équivalent clavier pour chaque filtre.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E020.md — chantiers E020-01 à E020-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Le module
 * lit le DOM écrit par points.js (:60-93 : deux <select> et un bouton dans
 * .points-filters) et ajoute des raccourcis LOCAUX non destructifs. Aucune
 * écriture d'état, aucun import vers le store : chaque action clavier délègue
 * au comportement déjà installé sur le contrôle (focus, .click() ou change).
 *
 * Invariants :
 * - un seul register, un seul CSS (ctx.css('points-e020', …)), un seul
 *   panneau d'aide, un seul status, un seul écouteur keydown documentaire ;
 * - aucune lettre nue : le routeur réserve m/c/r/g/s/p, 1–6, ?, Échap,
 *   Entrée, Espace et les flèches (platform/keyboard.js:127, :160-166) ;
 *   seules des combinaisons avec Alt sont utilisées, que le routeur ignore ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*, zéro
 *   innerHTML, aucun fichier partagé.
 */

const CSS_ID = 'points-e020';
const HINTS_ID = 'points-e020-hints';
const HINTS_TITLE_ID = 'points-e020-hints-title';
const STATUS_ID = 'points-e020-status';

/* Aucune animation : le mouvement réduit est respecté par construction. */
const CSS = `
  #${HINTS_ID} {
    flex: 1 1 100%; margin: 4px 0 0; padding: 9px 11px;
    border: 1px solid var(--line); border-radius: 8px;
    background: rgba(255,255,255,.02); color: var(--ink-soft);
    font-size: 10px; line-height: 1.55; overflow-wrap: anywhere;
  }
  #${HINTS_ID} h3 {
    margin: 0 0 5px; font-family: var(--serif);
    font-size: 12px; color: var(--gold-bright);
  }
  #${HINTS_ID} p { margin: 0 0 4px; }
  #${HINTS_ID} p:last-child { margin-bottom: 0; }
  #${HINTS_ID} ul { margin: 0; padding-left: 16px; }
  #${HINTS_ID} li { margin-bottom: 2px; }
  #${HINTS_ID} kbd {
    display: inline-block; padding: 0 4px; min-width: 18px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    color: var(--gold-bright); font: inherit; font-size: 10px;
  }
  #${STATUS_ID} { margin-top: 5px; color: var(--gold); }
  #${STATUS_ID}:empty { display: none; }
  .points-e020-control:focus-visible, #${HINTS_ID}:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  @media (max-width: 700px) {
    #${HINTS_ID} { padding: 8px 9px; font-size: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${HINTS_ID}, .points-e020-control { transition: none; }
  }
`;

let current = null;          // derniers contrôles vus, relus par l'écouteur unique
let listenerAttached = false;
let lastAnnouncement = '';
let lastStatus = '';

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

/* E020-01 / E020-02 — les deux <select> sont identifiés par leur aria-label,
 * avec repli sur leur ordre réel dans .points-filters (points.js:61-84 :
 * domaine puis famille). */
function selectsOf(filters) {
  const list = nodes(filters, 'select');
  const result = { domain: list[0] || null, family: list[1] || null };
  list.forEach((select) => {
    const label = (select.getAttribute('aria-label') || '').toLowerCase();
    if (label.indexOf('domaine') !== -1) result.domain = select;
    else if (label.indexOf('famille') !== -1) result.family = select;
  });
  return result;
}

/* E020-03 — bouton de réinitialisation : libellé « réinitialiser » d'abord
 * (points.js:85-92), sinon premier bouton du groupe de filtres. */
function resetOf(filters) {
  const buttons = nodes(filters, 'button');
  return buttons.filter((button) => /réinit/i.test(txt(button)))[0] || buttons[0] || null;
}

/* Libellé de l'option courante, pour une annonce vérifiable. */
function optionLabel(select) {
  if (!select) return '';
  const checked = typeof select.querySelector === 'function'
    ? select.querySelector('option:checked') : null;
  const option = checked || (select.options ? select.options[select.selectedIndex] : null);
  return option ? txt(option) : txt(select.value);
}

/* E020-08 — status local unique, dédupliqué ; jamais écrit par un simple rendu. */
function announce(text) {
  const value = String(text || '').trim();
  if (!value || value === lastAnnouncement) return;
  const status = current && current.status;
  if (!status || !status.isConnected) return;
  lastAnnouncement = value;
  lastStatus = value;
  status.textContent = value;
}

/* E020-04 — cycle l'option suivante, avec retour au début. La valeur est
 * posée sur le contrôle puis le changement est émis comme si l'utilisateur
 * avait choisi l'option : le gestionnaire de points.js:69-84 applique le filtre. */
function cycle(select) {
  const options = nodes(select, 'option');
  if (!options.length) return false;
  let at = 0;
  options.forEach((option, index) => { if (option.value === select.value) at = index; });
  const next = options[(at + 1) % options.length];
  if (!next || next.value === select.value) return false;
  select.value = next.value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

/* E020-05 — le routeur ignore toute combinaison avec Alt (keyboard.js:127) :
 * nos raccourcis ne peuvent donc ni détourner '?' / Échap / les touches de vue,
 * ni être détournés par elles. Un gestionnaire local ayant déjà consommé
 * l'événement (defaultPrevented) est respecté. */
function onKeydown(event) {
  if (event.defaultPrevented || !event.altKey || event.ctrlKey || event.metaKey) return;
  const target = current;
  if (!target || target.viewId !== 'points') return;
  const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';

  if (key === 'r') {
    const reset = target.reset;
    if (!reset || !reset.isConnected) return;
    event.preventDefault();
    event.stopPropagation();
    reset.click();                       // réutilise points.js:87-91, sans état dupliqué
    announce('Filtres réinitialisés au clavier.');
    return;
  }

  const control = key === 'd' ? target.domain : key === 'f' ? target.family : null;
  if (!control || !control.isConnected) return;
  const name = key === 'd' ? 'Domaine' : 'Famille';
  event.preventDefault();
  event.stopPropagation();
  if (event.shiftKey) {
    const changed = cycle(control);
    announce(changed
      ? `${name} : ${optionLabel(control)}.`
      : `${name} : aucune autre option disponible.`);
  } else {
    control.focus({ preventScroll: true });
    announce(`${name} : filtre ciblé au clavier, flèches pour choisir.`);
  }
}

/* E020-10 — un seul écouteur documentaire, installé une fois ; il relit
 * `current` à chaque rendu et n'agit plus dès que la vue est quittée (nœuds
 * alors déconnectés). */
function ensureListener() {
  if (listenerAttached) return;
  if (typeof document === 'undefined' || !document.addEventListener) return;
  document.addEventListener('keydown', onKeydown, false);
  listenerAttached = true;
}

function addHint(ctx, list, key, text) {
  const li = ctx.el('li');
  li.appendChild(ctx.el('kbd', '', key));
  li.appendChild(document.createTextNode(` ${text}`));
  list.appendChild(li);
}

/* E020-07 — panneau local non modal : il complète l'aide globale ouverte par
 * '?' (platform/keyboard.js:134-140), qu'il n'édite ni ne remplace. */
function hintsOf(ctx, filters) {
  let hints = document.getElementById(HINTS_ID);
  if (hints && !hints.isConnected) hints = null;
  if (hints && hints.parentElement !== filters) hints.remove();
  if (!hints) {
    hints = ctx.el('section', 'points-e020-hints');
    hints.id = HINTS_ID;
    put(hints, 'role', 'region');
    put(hints, 'aria-labelledby', HINTS_TITLE_ID);
    put(hints, 'data-points-e020', 'hints');
    hints.tabIndex = -1;
    const title = ctx.el('h3', '', 'Filtres au clavier');
    title.id = HINTS_TITLE_ID;
    hints.appendChild(title);
    hints.appendChild(ctx.el('p', '',
      'Ces raccourcis complètent l’aide globale ouverte par « ? » : ils n’agissent que sur les filtres de cette vue.'));
    const list = ctx.el('ul');
    addHint(ctx, list, 'Alt + D', 'cibler le filtre Domaine, puis ← / → pour choisir.');
    addHint(ctx, list, 'Alt + F', 'cibler le filtre Famille, puis ← / → pour choisir.');
    addHint(ctx, list, 'Alt + Maj + D', 'passer au domaine suivant sans ouvrir la liste.');
    addHint(ctx, list, 'Alt + Maj + F', 'passer à la famille suivante sans ouvrir la liste.');
    addHint(ctx, list, 'Alt + R', 'réinitialiser les deux filtres.');
    hints.appendChild(list);
    const status = ctx.el('p', 'points-e020-status', lastStatus);
    status.id = STATUS_ID;
    put(status, 'role', 'status');
    put(status, 'aria-live', 'polite');
    put(status, 'aria-atomic', 'true');
    hints.appendChild(status);
    lastAnnouncement = lastStatus;   // un message restauré n'est pas ré-annoncé
  }
  if (hints.parentElement !== filters) filters.appendChild(hints);
  return hints;
}

/* E020-06 — découvrabilité par les technologies d'assistance : attributs et
 * classe ajoutés aux contrôles existants, sans toucher à leur valeur ni à
 * leurs gestionnaires (ajout pur, jamais suppressif). */
function describe(controls) {
  if (controls.domain) {
    put(controls.domain, 'aria-keyshortcuts', 'Alt+D Alt+Shift+D');
    put(controls.domain, 'title', 'Alt+D : cibler le domaine ; Alt+Maj+D : domaine suivant.');
    if (controls.domain.classList) controls.domain.classList.add('points-e020-control');
  }
  if (controls.family) {
    put(controls.family, 'aria-keyshortcuts', 'Alt+F Alt+Shift+F');
    put(controls.family, 'title', 'Alt+F : cibler la famille ; Alt+Maj+F : famille suivante.');
    if (controls.family.classList) controls.family.classList.add('points-e020-control');
  }
  if (controls.reset) {
    put(controls.reset, 'aria-keyshortcuts', 'Alt+R');
    put(controls.reset, 'title', 'Alt+R : réinitialiser les filtres.');
    if (controls.reset.classList) controls.reset.classList.add('points-e020-control');
  }
}

/* E020-09 — mouvement réduit : aucune animation propre ; on expose seulement
 * l'état observé pour audit, via le contrat ctx.reducedMotion. */
function motionState(ctx) {
  if (typeof ctx.reducedMotion !== 'function') return 'full';
  try { return ctx.reducedMotion() ? 'reduced' : 'full'; }
  catch { return 'full'; }
}

/* E020-01 à E020-10 — passe unique, tolérante, appliquée à chaque rendu par
 * runEnhancements({ viewId, stage, layout }) (points.js:126). */
function apply(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const filters = layout.querySelector('.points-filters');
  if (!filters) return;
  ctx.css(CSS_ID, CSS);

  const selects = selectsOf(filters);
  const hints = hintsOf(ctx, filters);
  const controls = {
    viewId: ctx.viewId || 'points',
    domain: selects.domain,
    family: selects.family,
    reset: resetOf(filters),
    status: hints.querySelector('#' + STATUS_ID),
  };
  describe(controls);
  put(hints, 'data-points-e020-motion', motionState(ctx));
  current = controls;
  ensureListener();
}

register('E020', (ctx) => {
  try { apply(ctx); }
  catch { /* une structure inattendue neutralise la lentille, jamais le rendu. */ }
});
