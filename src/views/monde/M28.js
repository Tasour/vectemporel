import { register } from './registry.js';

/* Lentille M28 — Aide contextuelle du globe (domaine C : ergonomie & interaction).
 *
 * Rapport : UNIFIED_AUDIT/MONDE/views/M28.md — chantiers M28-01 à M28-10.
 * Fichier possédé : ce module uniquement. L'aide de la coque (src/ui/shell.js,
 * renderHelp / #atlas-help) n'est ni éditée ni doublée : M28 ajoute un panneau
 * LOCAL et non modal, dédié à la vue Monde, avec sa propre commande.
 *
 * Contrat exploité : scene, host, css, el, say, countries (plus les signaux DOM
 * déjà écrits par globe.js). Aucune dépendance vers onReady/onHover/onLeave,
 * selected ou state : la lentille reste active même avec le ctx minimal.
 *
 * Invariants :
 * - un seul greffon, un seul CSS, un seul bouton et un seul panneau par rendu ;
 * - un seul MutationObserver, déconnecté puis reconnecté à chaque rendu ;
 * - aucune touche globale : '?' et Échap restent au routeur (keyboard.js) ;
 *   Échap n'est consommé que si le panneau local porte le focus ;
 * - aucune annonce dans la région live de la coque : ctx.say() uniquement ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*.
 */

const CSS_ID = 'monde-m28';
const BUTTON_ID = 'monde-m28-help-button';
const PANEL_ID = 'monde-m28-help-panel';
const TITLE_ID = 'monde-m28-help-title';

const CSS = `
  #${BUTTON_ID} { font-size: 15px; line-height: 1; }
  #${PANEL_ID} {
    position: absolute; left: 72px; bottom: 16px; z-index: 6;
    width: min(330px, 46vw); max-height: min(62vh, 460px); overflow: auto;
    margin: 0; padding: 12px 14px;
    border: 1px solid var(--line-strong); border-radius: 10px;
    background: rgba(8, 11, 16, .95); color: var(--ink-soft);
    font-size: 12px; line-height: 1.5; font-variant-numeric: tabular-nums;
  }
  #${PANEL_ID}[hidden] { display: none; }
  #${PANEL_ID}:focus-visible, #${BUTTON_ID}:focus-visible,
  #${PANEL_ID} button:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 3px; }
  #${PANEL_ID} h2 {
    margin: 0 0 6px; font-family: var(--serif);
    font-size: 16px; color: var(--gold-bright);
  }
  #${PANEL_ID} p { margin: 0 0 8px; }
  #${PANEL_ID} ul { margin: 0 0 8px; padding-left: 18px; }
  #${PANEL_ID} li { margin-bottom: 4px; }
  #${PANEL_ID} kbd {
    display: inline-block; padding: 0 4px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    color: var(--gold-bright); font: inherit; font-size: 11px;
  }
  #${PANEL_ID} .m28-label { color: var(--gold); font-weight: 600; letter-spacing: .03em; }
  #${PANEL_ID} .m28-context { border-left: 2px solid var(--gold); padding-left: 9px; }
  #${PANEL_ID} .m28-context p:last-child { margin-bottom: 0; }
  #${PANEL_ID} .m28-close {
    min-height: 36px; margin: 10px 0 6px; padding: 0 10px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: rgba(230, 185, 111, .08); color: var(--gold-bright);
    font: inherit; font-size: 11px; cursor: pointer;
  }
  #${PANEL_ID} .m28-close:hover { border-color: var(--gold-bright); }
  #${PANEL_ID} .m28-metrics { margin: 0; color: var(--muted-2); font-size: 11px; }
  @media (max-width: 900px) {
    #${PANEL_ID} { left: 8px; bottom: 64px; width: min(330px, calc(100vw - 16px)); max-height: 50vh; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${BUTTON_ID}, #${PANEL_ID} .m28-close { transition: none; }
  }
`;

let host = null;            // #globe-canvas, réutilisé d'un rendu à l'autre
let button = null;          // commande locale du panneau
let panel = null;           // panneau recréé à chaque rendu de la scène
let contextBody = null;     // bloc de contexte, mis à jour sans innerHTML
let metricsNode = null;     // compteurs auditables, hors région live
let observer = null;        // unique MutationObserver, ciblé sur trois nœuds
let currentCtx = null;      // dernier ctx reçu, pour l'observateur
let open = false;           // l'aide locale est volatile, comme la scène
let openCount = 0;
let contextCount = 0;
let renderedSignature = '';
let lastAnnouncement = '';

function announce(text) {
  if (!text || text === lastAnnouncement) return;
  if (!currentCtx || typeof currentCtx.say !== 'function') return;
  lastAnnouncement = text;
  currentCtx.say(text);
}

function node(ctx, selector) {
  return ctx.scene && typeof ctx.scene.querySelector === 'function'
    ? ctx.scene.querySelector(selector) : null;
}

function withDot(text) {
  const value = String(text || '').trim();
  return value && !/[.!?]$/.test(value) ? `${value}.` : value;
}

function reducedMotion(ctx) {
  if (ctx.reducedMotion) {
    try { return !!ctx.reducedMotion(); }
    catch { /* repli ci-dessous */ }
  }
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

function eventCount(country) {
  return country && Array.isArray(country.events) ? country.events.length : 0;
}

function selectedCountry(ctx) {
  if (ctx.selected && ctx.selected.name) return ctx.selected;
  const code = host && host.dataset ? host.dataset.globeSelected : '';
  if (code && Array.isArray(ctx.countries)) {
    const found = ctx.countries.find((country) => country && country.code === code);
    if (found) return found;
  }
  return null;
}

function selectedLabel(ctx) {
  const country = selectedCountry(ctx);
  if (country) return `${country.name} · ${eventCount(country)} repères`;
  const current = node(ctx, '.globe-country[aria-current="true"] .globe-country-name');
  return current ? String(current.textContent || '').trim() : '';
}

function hoverLabel(ctx) {
  const readout = node(ctx, '#globe-hover-readout');
  const text = readout ? String(readout.textContent || '').trim() : '';
  if (!text) return 'Survol : informations indisponibles.';
  return withDot(/^survol/i.test(text) ? text : `Survol : ${text}`);
}

/* Aucune date ni aucun total codé en dur : tout vient du HUD ou des données. */
function contextLines(ctx) {
  const status = node(ctx, '#globe-status');
  const kind = status && status.dataset ? status.dataset.kind : 'busy';
  const selected = selectedLabel(ctx);
  const lines = [];
  lines.push(selected
    ? `Sélection : ${selected}.`
    : 'Sélection : aucun pays. La sphère et la liste permettent d’en choisir un.');
  lines.push(hoverLabel(ctx));
  if (kind === 'ready') lines.push('Moteur 3D prêt : la sphère répond au pointeur et au clavier.');
  else if (kind === 'error') lines.push('Moteur 3D indisponible : la liste des pays reste utilisable.');
  else lines.push('Moteur 3D en chargement : la liste des pays est déjà utilisable.');
  lines.push(reducedMotion(ctx)
    ? 'Mouvement réduit détecté : rotation inactive, image statique.'
    : 'Rotation automatique active : le bouton « Rotation » la met en pause.');
  return lines;
}

function writeMetrics() {
  if (!metricsNode) return;
  metricsNode.textContent = `Ouvertures : ${openCount} · Contextes affichés : ${contextCount}.`;
}

function refreshContext(ctx, doAnnounce) {
  if (!contextBody) return;
  const lines = contextLines(ctx);
  const signature = lines.join(' | ');
  if (signature === renderedSignature) return;
  renderedSignature = signature;
  contextCount += 1;
  contextBody.replaceChildren(...lines.map((line) => ctx.el('p', '', line)));
  writeMetrics();
  if (doAnnounce && open) announce(`Aide du globe actualisée : ${lines[0]}`);
}

function setOpen(next, restoreFocus) {
  open = !!next;
  if (panel) panel.hidden = !open;
  if (button) button.setAttribute('aria-expanded', String(open));
  if (host && host.dataset) host.dataset.m28Help = open ? 'open' : 'closed';
  if (open) {
    openCount += 1;
    writeMetrics();
    announce(`Aide du globe ouverte. ${contextLines(currentCtx)[0] || ''}`.trim());
    if (panel) panel.focus({ preventScroll: true });
  } else {
    if (restoreFocus && button && button.isConnected) button.focus({ preventScroll: true });
    announce('Aide du globe fermée.');
  }
}

function addStep(ctx, list, key, text) {
  const li = ctx.el('li');
  li.appendChild(ctx.el('kbd', '', key));
  li.appendChild(document.createTextNode(` ${text}`));
  list.appendChild(li);
}

/* Structure statique construite une seule fois : seul .m28-context est remplacé. */
function buildPanel(ctx, target) {
  target.replaceChildren();
  target.setAttribute('role', 'region');
  target.setAttribute('aria-labelledby', TITLE_ID);
  target.tabIndex = -1;

  const title = ctx.el('h2', '', 'Aide du globe');
  title.id = TITLE_ID;
  target.appendChild(title);

  target.appendChild(ctx.el('p', '',
    'Aide locale de la vue Monde. La touche ? ouvre l’aide générale de l’application : ce panneau la complète, il ne la remplace pas.'));

  target.appendChild(ctx.el('p', 'm28-label', 'Trois façons d’agir'));
  const steps = ctx.el('ul');
  addStep(ctx, steps, 'Tab + ← →', 'sur la sphère : parcourir les pays, puis Entrée pour ouvrir.');
  addStep(ctx, steps, 'Tab + ← →', 'sur la liste « Choisir un pays » : déplacer le focus, puis Entrée.');
  addStep(ctx, steps, 'Entrée', 'sur les boutons Zoom +, Zoom − et Rotation : les activer sans souris.');
  target.appendChild(steps);

  target.appendChild(ctx.el('p', 'm28-label', 'Contexte courant'));
  contextBody = ctx.el('div', 'm28-context');
  target.appendChild(contextBody);

  const close = ctx.el('button', 'm28-close', 'Fermer l’aide du globe');
  close.type = 'button';
  close.setAttribute('aria-label', 'Fermer l’aide locale du globe');
  close.addEventListener('click', () => setOpen(false, true));
  target.appendChild(close);

  metricsNode = ctx.el('p', 'm28-metrics', '');
  target.appendChild(metricsNode);

  /* Échap local : le routeur (keyboard.js:143-154) ne consomme pas Échap en
   * vue globe hors modale, donc ce traitement reste sans conflit. */
  target.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    setOpen(false, true);
  });
}

/* Un seul observateur, jamais sur le panneau (sinon boucle d'écriture). */
function observeTargets(ctx) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => {
    if (currentCtx) refreshContext(currentCtx, false);
  });
  const readout = node(ctx, '#globe-hover-readout');
  const status = node(ctx, '#globe-status');
  if (readout) observer.observe(readout, { childList: true, characterData: true, subtree: true });
  if (status) observer.observe(status, { attributes: true, attributeFilter: ['data-kind'] });
  if (host && host.isConnected) {
    observer.observe(host, { attributes: true, attributeFilter: ['data-globe-selected'] });
  }
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  currentCtx = ctx;
  lastAnnouncement = '';
  ctx.css(CSS_ID, CSS);
  if (ctx.host && ctx.host.isConnected) host = ctx.host;

  const scene = ctx.scene && ctx.scene.isConnected ? ctx.scene : null;
  if (!scene) return;

  /* shell.js:533 recrée le stage à chaque rendu : un nœud déconnecté marque
   * un rendu neuf, l'état d'ouverture est alors remis à zéro. */
  const foundPanel = document.getElementById(PANEL_ID);
  const freshRender = !(foundPanel && foundPanel.isConnected);
  if (foundPanel && foundPanel.parentElement !== scene) foundPanel.remove();

  panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = ctx.el('section', 'monde-m28-panel');
    panel.id = PANEL_ID;
    buildPanel(ctx, panel);
  } else if (!panel.querySelector('.m28-context') || !panel.querySelector('.m28-metrics')) {
    buildPanel(ctx, panel);
  } else {
    contextBody = panel.querySelector('.m28-context');
    metricsNode = panel.querySelector('.m28-metrics');
  }
  if (panel.parentElement !== scene) scene.appendChild(panel);

  /* Commande distincte : pas de '?', pas de lettre réservée, aucun écouteur
   * documentaire ; elle rejoint la barre de commandes existante du globe. */
  const foundButton = document.getElementById(BUTTON_ID);
  if (foundButton && foundButton.parentElement !== scene) foundButton.remove();
  button = document.getElementById(BUTTON_ID);
  if (!button) {
    button = ctx.el('button', '', 'i');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.setAttribute('aria-label', 'Aide contextuelle du globe');
    button.setAttribute('aria-controls', PANEL_ID);
    button.setAttribute('aria-expanded', 'false');
    button.title = 'Aide du globe — la touche ? ouvre l’aide générale';
    button.addEventListener('click', () => setOpen(!open, !open));
  }
  const controls = scene.querySelector('.globe-controls');
  const buttonParent = controls || scene;
  if (button.parentElement !== buttonParent) buttonParent.appendChild(button);

  observeTargets(ctx);

  if (freshRender) {
    open = false;
    renderedSignature = '';
  }
  panel.hidden = !open;
  button.setAttribute('aria-expanded', String(open));
  if (host && host.dataset) host.dataset.m28Help = open ? 'open' : 'closed';
  refreshContext(ctx, false);
}

register('M28', install);
