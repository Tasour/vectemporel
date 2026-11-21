import { register } from './registry.js';

/* Lentille E034 — Navigation & clavier : Échap rend le focus au déclencheur.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E034.md — chantiers E034-01 à E034-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Le panneau
 * d'aide clavier est LOCAL et non modal : il complète l'aide générale (touche ?)
 * sans la remplacer. Échap n'est consommé que lorsque le focus est dans le
 * panneau ou sur son déclencheur ; ailleurs, la touche reste au routeur.
 *
 * Invariants :
 * - un seul greffon, un seul CSS, un seul déclencheur, un seul panneau,
 *   une seule région live par rendu ;
 * - zéro touche globale, zéro annonce dans la live de la coque ;
 * - zéro réseau, zéro aléa, zéro minuteur, zéro rAF, zéro console.*,
 *   zéro innerHTML / insertAdjacentHTML / outerHTML.
 */

const CSS_ID = 'points-e034';
const TRIGGER_ID = 'points-e034-help-trigger';
const PANEL_ID = 'points-e034-help-panel';
const TITLE_ID = 'points-e034-help-title';
const LIVE_ID = 'points-e034-live';

const CSS = `
  #${TRIGGER_ID} {
    min-width: 36px; min-height: 36px; padding: 4px 10px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: rgba(230, 185, 111, .08); color: var(--gold-bright);
    font: 600 13px/1 inherit; cursor: pointer;
  }
  #${TRIGGER_ID}[aria-expanded="true"] { border-color: var(--gold-bright); }
  #${PANEL_ID} {
    margin-top: 10px; padding: 10px 12px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: rgba(8, 11, 16, .96); color: var(--ink-soft);
    font-size: 12px; line-height: 1.5; font-variant-numeric: tabular-nums;
  }
  #${PANEL_ID}[hidden] { display: none; }
  #${PANEL_ID} h2 {
    margin: 0 0 6px; font-family: var(--serif);
    font-size: 14px; color: var(--gold-bright);
  }
  #${PANEL_ID} p { margin: 0 0 8px; }
  #${PANEL_ID} ul { margin: 0 0 8px; padding-left: 18px; }
  #${PANEL_ID} li { margin-bottom: 4px; }
  #${PANEL_ID} kbd {
    display: inline-block; padding: 0 4px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    color: var(--gold-bright); font: inherit; font-size: 11px;
  }
  #${PANEL_ID} .points-e034-label { color: var(--gold); font-weight: 600; }
  #${PANEL_ID} .points-e034-metrics { color: var(--muted-2); font-size: 11px; }
  #${TRIGGER_ID}:focus-visible, #${PANEL_ID}:focus-visible,
  .points-cell:focus-visible, .points-era:focus-visible,
  .points-filters select:focus-visible, .points-filters button:focus-visible,
  .points-nav button:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
    box-shadow: 0 0 0 3px rgba(230, 185, 111, .14);
  }
  #${LIVE_ID} {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
  @media (max-width: 700px) {
    #${PANEL_ID} { padding: 8px 10px; font-size: 11px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${TRIGGER_ID}, #${PANEL_ID} { transition: none; }
  }
`;

let currentCtx = null;   // dernier ctx reçu, pour les fonctions d'instance
let trigger = null;      // bouton déclencheur du panneau local
let panel = null;        // panneau d'aide clavier local
let live = null;         // région live locale, dédiée aux annonces de focus
let contextNode = null;  // ligne de contexte dérivée du DOM
let metricsNode = null;  // compteur auditable, hors région live
let open = false;        // l'ouverture est volatile, comme le rendu de la vue
let openCount = 0;
let lastAnnouncement = '';

function byId(id) {
  const node = document.getElementById(id);
  return node && node.isConnected ? node : null;
}

function scoped(ctx, selector) {
  return ctx.layout && typeof ctx.layout.querySelector === 'function'
    ? ctx.layout.querySelector(selector) : null;
}

function withDot(text) {
  const value = String(text || '').trim();
  return value && !/[.!?]$/.test(value) ? `${value}.` : value;
}

function announce(text) {
  const value = withDot(text);
  if (!value || value === lastAnnouncement || !live) return;
  lastAnnouncement = value;
  live.textContent = value;
}

/* Aucun millésime ni total codé en dur : le contexte vient du seul DOM. */
function contextLine(ctx) {
  const eras = scoped(ctx, '.points-grid');
  const eraCount = eras ? eras.querySelectorAll('.points-era').length : 0;
  const cellCount = eras ? eras.querySelectorAll('.points-cell.has-points').length : 0;
  return `Ères : ${eraCount} · cellules avec points : ${cellCount}.`;
}

function refreshContext(ctx) {
  if (!contextNode) return;
  const line = contextLine(ctx);
  if (contextNode.textContent !== line) contextNode.textContent = line;
}

function writeMetrics() {
  if (metricsNode) metricsNode.textContent = `Ouvertures : ${openCount}.`;
}

function setOpen(next, restoreFocus) {
  open = !!next;
  if (panel) panel.hidden = !open;
  if (trigger) trigger.setAttribute('aria-expanded', String(open));
  if (open) {
    openCount += 1;
    writeMetrics();
    refreshContext(currentCtx);
    announce('Aide clavier de la matrice ouverte');
    if (panel) panel.focus({ preventScroll: true });
  } else {
    if (restoreFocus && trigger && trigger.isConnected) {
      trigger.focus({ preventScroll: true });
    }
    announce('Aide clavier fermée, focus rendu au déclencheur');
  }
}

function addStep(ctx, list, key, text) {
  const li = ctx.el('li');
  li.appendChild(ctx.el('kbd', '', key));
  li.appendChild(document.createTextNode(` ${text}`));
  list.appendChild(li);
}

/* Structure statique construite une seule fois : seul .points-e034-context
 * est remplacé, sans innerHTML. */
function buildPanel(ctx, target) {
  target.replaceChildren();
  target.setAttribute('role', 'region');
  target.setAttribute('aria-labelledby', TITLE_ID);
  target.tabIndex = -1;

  const title = ctx.el('h2', '', 'Aide clavier — matrice des points');
  title.id = TITLE_ID;
  target.appendChild(title);

  target.appendChild(ctx.el('p', '',
    'Aide locale de la vue Points. La touche ? ouvre l’aide générale de l’application : ce panneau la complète, il ne la remplace pas.'));

  target.appendChild(ctx.el('p', 'points-e034-label', 'Parcourir la matrice'));
  const steps = ctx.el('ul');
  addStep(ctx, steps, 'Tab', 'parcourir les ères, les cellules, les filtres et les boutons de détail.');
  addStep(ctx, steps, 'Entrée / Espace', 'activer une cellule, une ère ou un bouton.');
  addStep(ctx, steps, 'Échap', 'fermer ce panneau et rendre le focus au bouton Aide clavier.');
  target.appendChild(steps);

  target.appendChild(ctx.el('p', 'points-e034-label', 'Contexte courant'));
  contextNode = ctx.el('p', 'points-e034-context', '');
  target.appendChild(contextNode);

  metricsNode = ctx.el('p', 'points-e034-metrics', '');
  target.appendChild(metricsNode);
  writeMetrics();
}

/* Échap n'est consommé que depuis le panneau ou son déclencheur : ailleurs,
 * le routeur (keyboard.js) reste seul maître de la touche. */
function onEscape(event) {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  event.stopPropagation();
  if (open) setOpen(false, true);
}

function buildTrigger(ctx, target) {
  const button = ctx.el('button', '', '?');
  button.id = TRIGGER_ID;
  button.type = 'button';
  button.setAttribute('aria-label', 'Aide clavier de la matrice des points');
  button.setAttribute('aria-controls', PANEL_ID);
  button.setAttribute('aria-expanded', 'false');
  button.title = 'Aide clavier — la touche ? ouvre l’aide générale';
  button.addEventListener('click', () => setOpen(!open, !open));
  button.addEventListener('keydown', onEscape);
  target.appendChild(button);
  return button;
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  ctx.css(CSS_ID, CSS);
  currentCtx = ctx;
  lastAnnouncement = '';

  /* Les panneaux sont attachés à des conteneurs profonds (.points-filters,
   * .points-detail) et non à stage/layout : le diagnostic générique ne les
   * masque donc pas en fonctionnement normal. */
  const filters = scoped(ctx, '.points-filters');
  const detail = scoped(ctx, '.points-detail');
  if (!filters && !detail) return;

  const foundTrigger = byId(TRIGGER_ID);
  const foundPanel = byId(PANEL_ID);
  const freshRender = !(foundTrigger && foundPanel);

  trigger = foundTrigger;
  if (!trigger && filters) trigger = buildTrigger(ctx, filters);
  if (trigger && filters && trigger.parentElement !== filters
      && trigger.parentElement && trigger.parentElement.id !== 'points-diagnostics-drawer') {
    filters.appendChild(trigger);
  }

  panel = foundPanel;
  if (!panel && detail) {
    panel = ctx.el('section', 'points-e034-panel');
    panel.id = PANEL_ID;
    buildPanel(ctx, panel);
    panel.addEventListener('keydown', onEscape);
    detail.appendChild(panel);
  } else if (panel && (!panel.querySelector('.points-e034-context')
                      || !panel.querySelector('.points-e034-metrics'))) {
    contextNode = null;
    metricsNode = null;
    buildPanel(ctx, panel);
    panel.addEventListener('keydown', onEscape);
  } else if (panel) {
    contextNode = panel.querySelector('.points-e034-context');
    metricsNode = panel.querySelector('.points-e034-metrics');
  }

  live = byId(LIVE_ID);
  if (!live && detail) {
    live = ctx.el('div', 'points-e034-live', '');
    live.id = LIVE_ID;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    detail.appendChild(live);
  }

  if (freshRender) open = false;
  if (panel) panel.hidden = !open;
  if (trigger) trigger.setAttribute('aria-expanded', String(open));
  refreshContext(ctx);
}

register('E034', install);
