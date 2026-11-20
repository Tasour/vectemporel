import { register } from './registry.js';

/* Lentille E017 — Aide contextuelle de la Chronologie (domaine C : ergonomie).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/views/E17.md — chantiers E17-01 à E17-10.
 * Fichier possédé : src/views/chronology/E17.js (E017.js importe ce module).
 * L'aide globale de la coque
 * (src/ui/shell.js, renderHelp / #atlas-help, touche ?) n'est ni éditée ni
 * doublée : la lentille ajoute un panneau LOCAL et non modal, avec sa commande.
 *
 * Contrat exploité : viewId, layout, stage, css, el, reducedMotion. Le registre
 * de cette vue ne fournit pas say() : les annonces passent par la région live
 * locale déjà créée par chronology.js (#nav-c2a-live), dédupliquées, jamais par
 * une région supplémentaire ni par la coque.
 *
 * Invariants :
 * - un seul greffon, un seul CSS, un seul bouton, un seul panneau par rendu ;
 * - un seul MutationObserver, ciblé sur .chronology-main, jamais sur le panneau ;
 * - aucune touche globale : '?' et Échap restent au routeur (keyboard.js) ;
 *   Échap n'est consommé que si le panneau local porte le focus ;
 * - aucun millésime ni total codé en dur : le contexte est lu dans le DOM ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, ni journalisation ni HTML brut.
 */

const CSS_ID = 'chronology-e17';
const BUTTON_ID = 'chronology-e17-help-button';
const PANEL_ID = 'chronology-e17-help-panel';
const TITLE_ID = 'chronology-e17-help-title';
const LIVE_ID = 'nav-c2a-live';
const MAIN_ID = 'atlas-chrono-main';
const TOOLS_ID = 'atlas-chrono-tools';
const STATUS_ID = 'atlas-chrono-status';
const SEARCH_ID = 'atlas-chrono-search';
const EVENT_TITLE_ID = 'atlas-chrono-event-title';

/* E17-01, 07, 09 : une seule feuille injectée par ctx.css (cssOnce). Le panneau
   est une région annotée du layout, jamais une modale : pas de backdrop, pas de
   role=dialog, pas de piège de focus. La commande rejoint la barre d'outils
   existante (#atlas-chrono-tools) quand elle est présente. Les cibles tactiles
   font au moins 36 px et le repli mobile est documenté plus bas. */
const CSS = `
  .chronology-layout.chronology-e17-host { position: relative; }
  #${BUTTON_ID} {
    min-width: 36px; min-height: 36px; padding: 0 10px;
    border: 1px solid var(--line); border-radius: 8px;
    background: transparent; color: var(--gold-bright);
    font: inherit; font-size: 12px; font-weight: 700; line-height: 1;
    cursor: pointer;
  }
  #${BUTTON_ID}:hover { border-color: var(--gold); }
  #${BUTTON_ID}:focus-visible,
  #${PANEL_ID}:focus-visible,
  #${PANEL_ID} .e17-close:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  #${PANEL_ID} {
    position: absolute; top: 12px; right: 400px; z-index: 8;
    width: min(340px, 46vw); max-height: min(62vh, 460px); overflow: auto;
    margin: 0; padding: 12px 14px;
    border: 1px solid var(--line-strong); border-left: 3px solid var(--gold);
    border-radius: 10px;
    background: rgba(8, 11, 16, .96); color: var(--ink-soft);
    font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID}[hidden] { display: none; }
  #${PANEL_ID} h2 {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 15px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} p { margin: 0 0 8px; }
  #${PANEL_ID} ul { margin: 0 0 8px; padding-left: 18px; }
  #${PANEL_ID} li { margin-bottom: 4px; }
  #${PANEL_ID} kbd {
    display: inline-block; padding: 0 4px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    color: var(--gold-bright); font: inherit; font-size: 10px;
  }
  #${PANEL_ID} .e17-label {
    margin: 10px 0 4px; color: var(--gold);
    font-weight: 600; letter-spacing: .03em; text-transform: none;
  }
  #${PANEL_ID} .e17-context {
    border-left: 2px solid var(--gold); padding-left: 9px;
  }
  #${PANEL_ID} .e17-context p:last-child { margin-bottom: 0; }
  #${PANEL_ID} .e17-close {
    min-height: 36px; margin: 10px 0 6px; padding: 0 10px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: rgba(230, 185, 111, .08); color: var(--gold-bright);
    font: inherit; font-size: 11px; cursor: pointer;
  }
  #${PANEL_ID} .e17-close:hover { border-color: var(--gold-bright); }
  #${PANEL_ID} .e17-metrics {
    margin: 6px 0 0; color: var(--muted-2); font-size: 10px;
  }
  @media (max-width: 900px) {
    #${PANEL_ID} {
      top: 58px; right: 12px; left: auto;
      width: min(340px, calc(100vw - 24px)); max-height: 50vh;
    }
  }
  @media (max-width: 420px) {
    #${PANEL_ID} { width: calc(100vw - 24px); }
  }
  @media (prefers-reduced-motion: reduce) {
    #${BUTTON_ID}, #${PANEL_ID}, #${PANEL_ID} .e17-close { transition: none; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${PANEL_ID}[data-state="open"] {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} h2, #${PANEL_ID} kbd,
    #${PANEL_ID} .e17-label, #${PANEL_ID} .e17-close { color: CanvasText; }
  }
`;

let currentCtx = null;
let panel = null;
let button = null;
let contextBody = null;
let metricsNode = null;
let observer = null, escapeBound = false;
let open = false;
let openCount = 0;
let contextCount = 0;
let renderedSignature = '';
let lastAnnouncement = '';

function byId(id) {
  return document.getElementById(id);
}

function textOf(id) {
  const node = byId(id);
  return node ? String(node.textContent || '').trim() : '';
}

function withDot(value) {
  const result = String(value || '').trim();
  return result && !/[.!?]$/.test(result) ? `${result}.` : result;
}

function reducedMotion(ctx) {
  if (ctx && typeof ctx.reducedMotion === 'function') {
    try { return !!ctx.reducedMotion(); }
    catch { /* repli ci-dessous */ }
  }
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

/* E17-03/E17-05/E17-06 : aucun chiffre historique, aucun millésime et aucun
   total n'est écrit ici. Le statut, le titre du repère, le champ de recherche
   et l'état des puces de thème sont lus dans le DOM courant de la vue. */
function filterLabel() {
  const search = byId(SEARCH_ID);
  const query = search && typeof search.value === 'string' ? search.value.trim() : '';
  const tools = byId(TOOLS_ID);
  const pressed = tools && tools.querySelector('.atlas-chrono-tag[aria-pressed="true"]');
  const theme = pressed ? String(pressed.textContent || '').trim() : '';
  if (!query && !theme) return 'Aucun filtre actif : la liste suit l’ère courante.';
  const parts = [];
  if (query) parts.push(`texte « ${query} »`);
  if (theme) parts.push(`thème « ${theme} »`);
  return `Filtre actif : ${parts.join(' · ')}. Portée : tous les repères du pays.`;
}

function contextLines(ctx) {
  const lines = [];
  const status = textOf(STATUS_ID);
  lines.push(status
    ? withDot(status)
    : 'Situation en cours de calcul : la vue Chronologie n’a pas encore publié son statut.');
  const title = textOf(EVENT_TITLE_ID);
  lines.push(title
    ? `Repère affiché : ${title}.`
    : 'Aucun repère affiché : choisissez une carte dans la liste pour ouvrir ses points.');
  lines.push(filterLabel());
  lines.push(reducedMotion(ctx)
    ? 'Mouvement réduit détecté : les transitions de la vue sont désactivées.'
    : 'Transitions actives : le panneau reste non modal et ne fige pas la scène.');
  return lines;
}

function writeMetrics() {
  if (!metricsNode) return;
  metricsNode.textContent = `Ouvertures : ${openCount} · Contextes affichés : ${contextCount}.`;
}

/* E17-08 : la coque n'expose pas say() dans ce registre. On réutilise la région
   live déjà créée par chronology.js (hors #app), sans en créer une seconde, et
   on déduplique pour ne jamais bavarder sur les mutations de la scène. */
function announce(message) {
  if (!message || message === lastAnnouncement) return;
  const live = byId(LIVE_ID);
  if (!live) return;
  lastAnnouncement = message;
  live.textContent = message;
}

function setOpen(next, restoreFocus) {
  open = !!next;
  if (panel) { panel.hidden = !open; panel.dataset.state = open ? 'open' : 'closed'; }
  if (button) button.setAttribute('aria-expanded', String(open));
  if (currentCtx && currentCtx.layout && currentCtx.layout.dataset) {
    currentCtx.layout.dataset.e17Help = open ? 'open' : 'closed';
  }
  if (open) {
    openCount += 1;
    writeMetrics();
    announce(`Aide de la Chronologie ouverte. ${contextLines(currentCtx || {})[0] || ''}`.trim());
    if (panel) panel.focus({ preventScroll: true });
  } else {
    if (restoreFocus && button && button.isConnected) button.focus({ preventScroll: true });
    announce('Aide de la Chronologie fermée.');
  }
}

/* E17-02/E17-04/E17-09 : la structure statique n'est construite qu'une fois ;
   seul .e17-context est remplacé, par des nœuds créés via ctx.el. Les libellés
   décrivent exactement les touches du routeur (keyboard.js:43-51, 134-177) et
   les mécanismes réels de la vue (chronology.js:178-195, 309-373, 473-503). */
function addStep(ctx, list, key, label) {
  const li = ctx.el('li');
  li.append(ctx.el('kbd', '', key), document.createTextNode(` ${label}`));
  list.appendChild(li);
}

function buildPanel(ctx, target) {
  target.replaceChildren();
  target.setAttribute('role', 'region');
  target.setAttribute('aria-labelledby', TITLE_ID);
  target.tabIndex = -1;
  target.dataset.state = 'closed';

  const title = ctx.el('h2', '', 'Aide · Chronologie');
  title.id = TITLE_ID;
  target.appendChild(title);

  target.appendChild(ctx.el('p', '',
    'Aide locale de la vue Chronologie. La touche ? ou le bouton ? de la barre ouvre l’aide générale de l’application : ce panneau la complète, il ne la remplace pas.'));

  target.appendChild(ctx.el('p', 'e17-label', 'Deux axes, une seule scène'));
  const steps = ctx.el('ul');
  addStep(ctx, steps, '→', 'repère suivant');
  addStep(ctx, steps, '←', 'repère précédent');
  addStep(ctx, steps, '↓', 'ère suivante');
  addStep(ctx, steps, '↑', 'ère précédente');
  addStep(ctx, steps, 'Entrée', 'ouvrir la fiche du repère courant');
  addStep(ctx, steps, 'Échap', 'fermer cette aide si elle a le focus, sinon une modale ou revenir au Monde');
  addStep(ctx, steps, '?', 'ouvrir l’aide générale de l’application');
  target.appendChild(steps);

  target.appendChild(ctx.el('p', 'e17-label', 'Quand le clavier ne répond pas'));
  target.appendChild(ctx.el('p', '',
    'Le champ de recherche garde les flèches pour lui : tabsez hors du champ pour retrouver la navigation par ère et par repère. Les boutons restent utilisables avec Tab puis Entrée.'));

  target.appendChild(ctx.el('p', 'e17-label', 'Filtrer sans quitter le pays'));
  target.appendChild(ctx.el('p', '',
    'Recherche et thèmes filtrent tous les repères du pays, pas seulement l’ère courante ; la bande de statut et le compteur donnent le nombre affiché. « Réinitialiser le filtre » restaure la vue ère par ère.'));

  target.appendChild(ctx.el('p', 'e17-label', 'Repères vérifiés'));
  target.appendChild(ctx.el('p', '',
    'Chaque point indique son type, son degré de certitude et ses sources par identifiant : aucune liaison réseau.'));

  target.appendChild(ctx.el('p', 'e17-label', 'Contexte courant'));
  contextBody = ctx.el('div', 'e17-context');
  target.appendChild(contextBody);

  const close = ctx.el('button', 'e17-close', 'Fermer l’aide de la Chronologie');
  close.type = 'button';
  close.setAttribute('aria-label', 'Fermer l’aide locale de la Chronologie');
  close.addEventListener('click', () => setOpen(false, true));
  target.appendChild(close);

  metricsNode = ctx.el('p', 'e17-metrics', '');
  target.appendChild(metricsNode);

  /* E17-08 : le routeur écoute en capture sur document (keyboard.js:199) : un
     handler posé sur le panneau arriverait trop tard et laisserait Échap
     revenir au Monde. Un seul écouteur window en capture, installé une fois,
     n'agit que si ce panneau porte le focus (ou un de ses descendants). */
  if (!escapeBound) {
    escapeBound = true;
    window.addEventListener('keydown', (event) => {
      const active = document.activeElement;
      if (event.key !== 'Escape' || !panel || !panel.isConnected) return;
      if (active !== panel && !panel.contains(active)) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false, true);
    }, true);
  }
}

/* E17-03/E17-07 : signature et compteurs auditables. Le panneau n'est jamais
   observé (sinon boucle d'écriture) ; les écritures restent bornées. */
function refreshContext(ctx, doAnnounce) {
  if (!contextBody || !ctx) return;
  const lines = contextLines(ctx);
  const signature = lines.join(' | ');
  if (signature === renderedSignature) return;
  renderedSignature = signature;
  contextCount += 1;
  contextBody.replaceChildren(...lines.map((line) => ctx.el('p', '', line)));
  writeMetrics();
  if (doAnnounce && open) announce(`Aide de la Chronologie actualisée : ${lines[0]}`);
}

/* E17-10 : un seul observateur, déconnecté puis reconnecté à chaque rendu,
   ciblé sur .chronology-main (les signaux en lecture seule). Le bouton y vit :
   le filtre attributeFilter écarte aria-expanded de nos propres écritures. */
function observe() {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => {
    if (currentCtx) refreshContext(currentCtx, false);
  });
  const main = byId(MAIN_ID);
  if (main) {
    observer.observe(main, {
      childList: true, characterData: true, subtree: true,
      attributes: true, attributeFilter: ['aria-current', 'aria-pressed'],
    });
  }
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  currentCtx = ctx;
  lastAnnouncement = '';
  ctx.css(CSS_ID, CSS);

  const layout = ctx.layout && ctx.layout.isConnected ? ctx.layout : null;
  if (!layout) return;
  layout.classList.add('chronology-e17-host');

  /* E17-10 : shell.js:533 recrée le stage à chaque rendu. Un nœud déconnecté
     marque un rendu neuf : on repart d'un panneau fermé, sans nœud périmé. */
  const foundPanel = byId(PANEL_ID);
  const freshRender = !(foundPanel && foundPanel.isConnected);
  if (foundPanel && foundPanel.parentElement !== layout) foundPanel.remove();

  panel = byId(PANEL_ID);
  if (!panel) {
    panel = ctx.el('section', 'chronology-e17-panel');
    panel.id = PANEL_ID;
    buildPanel(ctx, panel);
  } else if (!panel.querySelector('.e17-context') || !panel.querySelector('.e17-metrics')) {
    buildPanel(ctx, panel);
  } else {
    contextBody = panel.querySelector('.e17-context');
    metricsNode = panel.querySelector('.e17-metrics');
  }
  if (panel.parentElement !== layout) layout.appendChild(panel);

  /* E17-02 : commande native distincte, sans '?', sans lettre réservée, sans
     data-fk (la coque ne doit pas la confondre avec un déclencheur de modale). */
  const tools = byId(TOOLS_ID);
  const buttonParent = tools || layout;
  const foundButton = byId(BUTTON_ID);
  if (foundButton && foundButton.parentElement !== buttonParent) foundButton.remove();
  button = byId(BUTTON_ID);
  if (!button) {
    button = ctx.el('button', 'chronology-e17-help-button', 'i');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.setAttribute('aria-label', 'Aide contextuelle de la Chronologie');
    button.setAttribute('aria-controls', PANEL_ID);
    button.setAttribute('aria-expanded', 'false');
    button.title = 'Aide de la Chronologie — la touche ? ouvre l’aide générale';
    button.addEventListener('click', () => setOpen(!open, !open));
  }
  if (button.parentElement !== buttonParent) buttonParent.appendChild(button);

  observe();

  if (freshRender) {
    open = false;
    renderedSignature = '';
  }
  panel.hidden = !open;
  panel.dataset.state = open ? 'open' : 'closed';
  button.setAttribute('aria-expanded', String(open));
  layout.dataset.e17Help = open ? 'open' : 'closed';
  refreshContext(ctx, false);
}

register('E17', install);
