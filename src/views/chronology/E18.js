import { register } from './registry.js';
import {
  state,
  currentCountry,
  currentEvent,
  formatDeepLink,
  parseDeepLink,
} from '../../domain/store.js';

/* Lentille CHRONOLOGIE E18 — « Deep links ».
 *
 * Le store sait déjà coder, valider, réfléchir et hydrater un état dans le hash
 * (store.js:544-664, chantier T4-09). La vue Chronologie, elle, n'offre aucun
 * geste pour obtenir le lien du repère courant : c'est l'objet de cette
 * lentille. Un panneau « Lien local du repère », dérivé de l'état réel du store
 * et encodé par formatDeepLink(), propose une URL strictement locale, un bouton
 * de copie accessible et un repli hors presse-papiers. Les dix chantiers sont
 * décrits dans UNIFIED_AUDIT/CHRONOLOGIE/views/E18.md.
 *
 * Le contexte transmis par chronology.js:539 est volontairement mince :
 * { viewId, stage, layout }. L'état courant est donc lu dans le store (lecture
 * seule) et le pays est résolu par identité, jamais deviné depuis le DOM.
 *
 * Un seul fichier possédé, aucun sélecteur de test modifié, aucune donnée
 * historique inventée, zéro réseau, zéro aléa, aucune écriture de journalisation.
 */

const CSS_ID = 'chronology-e18';
const PANEL_ID = 'chronology-e18-panel';
const TITLE_ID = 'chronology-e18-title';
const CONTEXT_ID = 'chronology-e18-context';
const LINK_ID = 'chronology-e18-link';
const COPY_ID = 'chronology-e18-copy';
const STATUS_ID = 'chronology-e18-status';

const CSS = `
.chronology-e18-panel{box-sizing:border-box;max-width:100%;margin:14px 0 4px;padding:9px 11px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02);font-size:11px}
.chronology-e18-title{margin:0 0 4px;color:var(--gold);font-size:10px;font-weight:600;
  letter-spacing:.08em;text-transform:uppercase}
.chronology-e18-note{margin:0 0 6px;color:var(--muted);font-size:9px;line-height:1.45}
.chronology-e18-context{margin:0 0 7px;color:var(--muted-2);font-size:9px;
  font-variant-numeric:tabular-nums;line-height:1.4}
.chronology-e18-row{display:flex;gap:7px;flex-wrap:wrap;align-items:stretch}
.chronology-e18-link{flex:1 1 220px;min-width:0;min-height:36px;padding:7px 9px;
  border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--ink);
  font:inherit;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:10px;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}
.chronology-e18-copy{min-height:36px;padding:7px 14px;border:1px solid var(--gold);border-radius:8px;
  background:transparent;color:var(--gold-bright);font:inherit;font-size:10px;
  font-weight:600;white-space:nowrap;cursor:pointer}
.chronology-e18-copy:hover:not([disabled]){background:rgba(230,185,111,.1)}
.chronology-e18-copy[disabled]{opacity:.5;cursor:not-allowed}
.chronology-e18-copy.chronology-e18-copied{background:#2e7d5b;border-color:#49b686;color:#fff}
.chronology-e18-copy:focus-visible,.chronology-e18-link:focus-visible{
  outline:2px solid var(--gold-bright);outline-offset:2px}
.chronology-e18-status{margin:6px 0 0;min-height:1.3em;color:var(--muted);font-size:9px;line-height:1.45}
.chronology-e18-status.chronology-e18-copied{color:var(--gold-bright);font-weight:600}
@media (max-width:620px){.chronology-e18-row{flex-direction:column}.chronology-e18-copy{width:100%}}
`;

/* État module partagé par tous les rendus : la coque reconstruit le stage mais
 * les gardes ci-dessous empêchent panneaux, écouteurs et annonces en doublon. */
let copyTimer = null;
let boundButton = null;
let restoreAnnounced = false;
let lastUpdateMessage = '';

/* E18-08 : seul le hash présent au chargement peut témoigner d'une arrivée par
 * lien. Le hash réfléchi par le store (store.js:633-647) n'est pas une arrival. */
const INITIAL_HASH = (typeof window !== 'undefined' && window.location
  && typeof window.location.hash === 'string') ? window.location.hash : '';

function makeEl(ctx, tag, className, text) {
  if (ctx && typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function byId(id) {
  return document.getElementById(id);
}

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

/* E18-09 : une seule voix. Le statut visible est la région live unique du
 * panneau ; aucune seconde région n'est créée, aucun ctx.say absent ici. */
function announce(ctx, message) {
  const status = byId(STATUS_ID);
  if (status && status.isConnected) status.textContent = message;
}

/* Les messages dérivés du rendu ne sont énoncés qu'une fois tant qu'ils ne
 * changent pas ; les confirmations de copie restent versionées à chaque action. */
function announceUpdate(ctx, message) {
  if (message === lastUpdateMessage) return;
  lastUpdateMessage = message;
  announce(ctx, message);
}

/* E18-01 / E18-02 : résolution par identité dans le store. Sans pays ou sans
 * repère, aucun lien n'est fabriqué : ce serait une donnée inventée. */
function currentSelection() {
  const country = currentCountry();
  if (!country) return null;
  const event = currentEvent();
  if (!event) return null;
  return {
    country,
    event,
    eraIndex: state.eraIndex,
    eventIndex: state.eventIndex,
  };
}

/* E18-02 : instantané minimal mais canonique. Les indices sont ceux du store,
 * aucun libellé historique n'est recopié à la main dans l'URL. Les filtres
 * locaux (recherche/thème de chronology.js:16) ne sont pas dans la grille du
 * store : ils ne sont donc pas encodés, plutôt que d'inventer un paramètre. */
function linkSnapshot(selection) {
  return {
    view: 'chronology',
    countryId: selection.country.id,
    eraIndex: selection.eraIndex,
    eventIndex: selection.eventIndex,
    pointIndex: 0,
    placeIndex: 0,
    scope: 'era',
    pointFilterDomain: '*',
    pointFilterFamily: '*',
    detailOpen: false,
    helpOpen: false,
  };
}

/* E18-03 : URL strictement locale. On ne remplace que le fragment de
 * location.href ; aucun fetch, aucune autre origine. */
function localLinkFor(selection) {
  let encoded;
  try { encoded = formatDeepLink(linkSnapshot(selection)); }
  catch { return ''; }
  try {
    const url = new URL(window.location.href);
    url.hash = encoded;
    return url.toString();
  } catch {
    const base = String(window.location.href || '').split('#')[0];
    return `${base}#${encoded}`;
  }
}

function buildPanel(ctx) {
  let panel = byId(PANEL_ID);
  if (panel && panel.isConnected) return panel;

  panel = makeEl(ctx, 'section', 'chronology-e18-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-label', 'Lien local du repère');

  const title = makeEl(ctx, 'h2', 'chronology-e18-title', 'Lien local du repère');
  title.id = TITLE_ID;
  panel.appendChild(title);
  panel.appendChild(makeEl(ctx, 'p', 'chronology-e18-note',
    'S’ouvre dans cet atlas sur le repère courant, sans service externe.'));

  const context = makeEl(ctx, 'p', 'chronology-e18-context');
  context.id = CONTEXT_ID;
  panel.appendChild(context);

  const row = makeEl(ctx, 'div', 'chronology-e18-row');
  /* E18-04 : champ en lecture seule, étiqueté, valeur jamais éditable. */
  const link = makeEl(ctx, 'input', 'chronology-e18-link');
  link.id = LINK_ID;
  link.type = 'text';
  link.readOnly = true;
  link.setAttribute('aria-label', 'Lien local partageable du repère');
  const copy = makeEl(ctx, 'button', 'chronology-e18-copy', 'Copier');
  copy.id = COPY_ID;
  copy.type = 'button';
  copy.disabled = true;
  copy.setAttribute('aria-label', 'Copier le lien local du repère');
  row.append(link, copy);
  panel.appendChild(row);

  const status = makeEl(ctx, 'p', 'chronology-e18-status');
  status.id = STATUS_ID;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  panel.appendChild(status);
  return panel;
}

/* E18-05 : le panneau vit dans la colonne narrative, jamais comme troisième
 * colonne de la grille .chronology-layout (styles.css:194). Aucun nœud existant
 * n'est modifié. */
function placePanel(ctx, panel) {
  const parent = (ctx.layout && ctx.layout.querySelector('#atlas-chrono-main'))
    || (ctx.layout && ctx.layout.querySelector('.chronology-main'))
    || ctx.stage;
  if (parent && panel.parentElement !== parent) parent.appendChild(panel);
}

/* E18-06 : état « copié » textuel, borné dans le temps, sans couleur seule. */
function markCopied(ctx) {
  const copy = byId(COPY_ID);
  const status = byId(STATUS_ID);
  if (copy && copy.isConnected) {
    copy.classList.add('chronology-e18-copied');
    copy.textContent = 'Copié ✓';
  }
  if (status && status.isConnected) status.classList.add('chronology-e18-copied');
  if (copyTimer !== null) {
    try { clearTimeout(copyTimer); } catch { /* minuteur déjà écoulé */ }
    copyTimer = null;
  }
  if (typeof window === 'undefined' || typeof window.setTimeout !== 'function') return;
  copyTimer = window.setTimeout(() => {
    copyTimer = null;
    const button = byId(COPY_ID);
    if (button && button.isConnected) {
      button.classList.remove('chronology-e18-copied');
      button.textContent = 'Copier';
    }
    const stateNode = byId(STATUS_ID);
    if (stateNode && stateNode.isConnected) stateNode.classList.remove('chronology-e18-copied');
  }, 2400);
}

/* E18-07 : repli déterministe, sans API dépréciée de presse-papiers. */
function revealFallback(ctx) {
  const link = byId(LINK_ID);
  if (link && link.isConnected) {
    try { link.focus({ preventScroll: true }); }
    catch { try { link.focus(); } catch { /* noop */ } }
    try { link.select(); } catch { /* sélection non supportée */ }
  }
  announce(ctx, 'Presse-papiers indisponible : le lien est sélectionné, copiez-le avec Ctrl+C.');
}

/* E18-06 / E18-07 : une seule copie par clic, avec repli sur échec. */
function copyLink(ctx) {
  const link = byId(LINK_ID);
  if (!link || !link.value || link.disabled) return;
  const text = link.value;
  const clipboard = (typeof navigator !== 'undefined') ? navigator.clipboard : null;
  if (!clipboard || typeof clipboard.writeText !== 'function') {
    revealFallback(ctx);
    return;
  }
  let ok = false;
  try {
    const result = clipboard.writeText(text);
    if (result && typeof result.then === 'function') {
      result.then(() => {
        markCopied(ctx);
        announce(ctx, 'Lien copié dans le presse-papiers.');
      }).catch(() => revealFallback(ctx));
      return;
    }
    ok = true;
  } catch { ok = false; }
  if (ok) {
    markCopied(ctx);
    announce(ctx, 'Lien copié dans le presse-papiers.');
  } else {
    revealFallback(ctx);
  }
}

/* E18-05 : un seul attachement par nœud, même si apply est rejoué. */
function bindCopy(ctx, button) {
  if (!button || button === boundButton) return;
  boundButton = button;
  button.addEventListener('click', () => copyLink(ctx));
}

/* E18-08 : annonce unique de l'arrivée depuis un lien de repère. Le hash
 * réfléchi identique à l'état courant ne réactive pas l'annonce. */
function maybeAnnounceRestore(ctx, selection) {
  if (restoreAnnounced || !selection || !INITIAL_HASH) return;
  let parsed = null;
  try { parsed = parseDeepLink(INITIAL_HASH); } catch { parsed = null; }
  if (!parsed || parsed.view !== 'chronology') return;
  if (parsed.countryId === selection.country.id
      && parsed.eventIndex === selection.eventIndex) {
    restoreAnnounced = true;
    announce(ctx, `Lien local ouvert : repère ${selection.event.title} de ${selection.country.name}.`);
  }
}

function updatePanel(ctx, selection) {
  const link = byId(LINK_ID);
  const copy = byId(COPY_ID);
  const context = byId(CONTEXT_ID);
  if (!link || !copy) return;

  if (!selection) {
    link.value = '';
    link.removeAttribute('title');
    copy.disabled = true;
    if (context) context.textContent = 'Aucun repère sélectionné.';
    announceUpdate(ctx, 'Aucun repère sélectionné : choisissez un repère pour obtenir son lien.');
    return;
  }

  lastUpdateMessage = '';
  link.value = localLinkFor(selection);
  link.title = link.value;
  link.spellcheck = false;
  copy.disabled = !link.value;
  if (context) {
    context.textContent = `${selection.country.name} · ère ${selection.eraIndex + 1}`
      + ` · repère ${selection.eventIndex + 1} (${formatYear(selection.event.year)})`;
  }
  bindCopy(ctx, copy);
  if (copy.disabled) {
    announceUpdate(ctx, 'Lien indisponible : choisissez un repère pour obtenir son lien.');
    return;
  }
  maybeAnnounceRestore(ctx, selection);
  const status = byId(STATUS_ID);
  if (status && status.isConnected && !status.textContent) {
    status.textContent = `Repère ${selection.event.title} : lien prêt à copier.`;
  }
}

register('E18', (ctx) => {
  if (!ctx) return;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  if (!ctx.stage && !ctx.layout) return;

  /* E18-10 : un seul minuteur, remis à zéro à chaque rendu. */
  if (copyTimer !== null) {
    try { clearTimeout(copyTimer); } catch { /* minuteur déjà écoulé */ }
    copyTimer = null;
  }

  const panel = buildPanel(ctx);
  placePanel(ctx, panel);
  updatePanel(ctx, currentSelection());
});
