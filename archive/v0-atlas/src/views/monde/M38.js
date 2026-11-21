import { register } from './registry.js';
import { formatDeepLink, parseDeepLink } from '../../domain/store.js';

/* Lentille M38 — « Deep links pays » (domaine D : données & sémantique).
 *
 * Le store sait déjà coder, valider et réfléchir un état dans le hash
 * (store.js:544-664, chantier T4-09). La vue Monde, elle, n'offre aucun geste
 * pour obtenir le lien d'un pays : c'est l'objet de cette lentille. Un panneau
 * « Lien local du pays », dérivé de ctx.selected et encodé par formatDeepLink(),
 * propose un lien local (aucun réseau), un bouton de copie accessible et un
 * repli hors presse-papiers. Les dix chantiers sont décrits dans
 * UNIFIED_AUDIT/MONDE/views/M38.md.
 *
 * Un seul fichier possédé, aucun sélecteur de test modifié, aucune donnée
 * historique inventée, zéro réseau, aucune source d'aléa, aucune écriture
 * de journalisation.
 */

const PANEL_ID = 'monde-m38-panel';
const LINK_ID = 'monde-m38-link';
const COPY_ID = 'monde-m38-copy';
const STATUS_ID = 'monde-m38-status';
const CSS_ID = 'monde-m38';

const CSS = `
.monde-m38-panel{box-sizing:border-box;max-width:100%;position:relative;z-index:2;
  margin:10px 0;padding:8px 10px;border:1px solid rgba(230,185,111,.4);
  border-radius:8px;background:rgba(0,0,0,.28);font-size:13px}
.monde-m38-title{margin:0 0 4px;font-size:14px;font-weight:600;line-height:1.25;
  color:var(--gold-bright,#e6b96f)}
.monde-m38-note{margin:0 0 6px;font-size:12px;opacity:.85;line-height:1.3}
.monde-m38-row{display:flex;gap:6px;flex-wrap:wrap;align-items:stretch}
.monde-m38-link{flex:1 1 220px;min-width:0;min-height:38px;padding:7px 9px;font:inherit;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;
  color:inherit;background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.3);border-radius:6px;
  text-overflow:ellipsis;white-space:nowrap;overflow:hidden}
.monde-m38-copy{min-height:38px;padding:7px 16px;font:inherit;font-size:13px;font-weight:700;
  white-space:nowrap;color:#1a1206;background:var(--gold,#e6b96f);
  border:1px solid var(--gold-bright,#e6b96f);border-radius:6px;cursor:pointer}
.monde-m38-copy:hover:not([disabled]){background:var(--gold-bright,#f0c77f)}
.monde-m38-copy[disabled]{opacity:.5;cursor:not-allowed}
.monde-m38-copy.monde-m38-copied{background:#2e7d5b;border-color:#49b686;color:#fff}
.monde-m38-copy:focus-visible,.monde-m38-link:focus-visible{
  outline:3px solid var(--gold-bright,#e6b96f);outline-offset:2px}
.monde-m38-status{margin:6px 0 0;min-height:1.2em;font-size:12px;opacity:.9;line-height:1.3}
.monde-m38-status.monde-m38-copied{color:#8fe0b6;font-weight:600}
`;

/* État module partagé par tous les rendus : la coque reconstruit le stage mais
 * les gardes ci-dessous empêchent panneaux, écouteurs et annonces en doublon. */
let copyTimer = null;
let boundButton = null;
let restoreAnnounced = false;
let lastUpdateMessage = '';

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

/* M38-09 : une seule voix. Le statut visible est un texte simple ; ctx.say()
 * écrit dans #globe-live, hors de #app (globe.js:73-85,148-150). */
function announce(ctx, message) {
  const status = byId(STATUS_ID);
  if (status && status.isConnected) status.textContent = message;
  if (ctx && typeof ctx.say === 'function') {
    try { ctx.say(message); } catch { /* région live indisponible : le texte visible suffit */ }
  }
}

/* M38-09 : les messages d'état dérivés du rendu ne sont énoncés qu'une fois
 * tant qu'ils ne changent pas ; les confirmations de copie, elles, restent
 * versionées à chaque action. */
function announceUpdate(ctx, message) {
  if (message === lastUpdateMessage) return;
  lastUpdateMessage = message;
  announce(ctx, message);
}

/* M38-02 : instantané minimal mais canonique. Les indices et le périmètre sont
 * ceux posés par selectCountry() (store.js:272-280) : aucune donnée inventée,
 * aucun libellé historique recopié dans l'URL. */
function linkSnapshot(country) {
  return {
    view: 'globe',
    countryId: country.id,
    eraIndex: 0,
    eventIndex: 0,
    pointIndex: 0,
    placeIndex: 0,
    scope: 'era',
    pointFilterDomain: '*',
    pointFilterFamily: '*',
    detailOpen: false,
    helpOpen: false,
  };
}

/* M38-03 : URL strictement locale. On ne remplace que le fragment de
 * location.href ; aucun fetch, aucune autre origine. */
function localLinkFor(country) {
  let encoded;
  try { encoded = formatDeepLink(linkSnapshot(country)); }
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

/* M38-01 / M38-08 : résoudre le pays par identité dans la collection transmise. */
function resolveCountry(ctx) {
  const selected = ctx && ctx.selected;
  if (!selected || !selected.id) return null;
  const list = ctx.countries;
  if (Array.isArray(list)) {
    const match = list.find((item) => item && item.id === selected.id);
    if (match) return match;
  }
  return selected;
}

function buildPanel(ctx) {
  let panel = byId(PANEL_ID);
  if (panel && panel.isConnected) return panel;

  panel = makeEl(ctx, 'section', 'monde-m38-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-label', 'Lien local du pays');

  panel.appendChild(makeEl(ctx, 'h2', 'monde-m38-title', 'Lien local du pays'));
  panel.appendChild(makeEl(ctx, 'p', 'monde-m38-note',
    'S’ouvre dans cet atlas sur le pays courant, sans service externe.'));

  const row = makeEl(ctx, 'div', 'monde-m38-row');
  const link = makeEl(ctx, 'input', 'monde-m38-link');
  link.id = LINK_ID;
  link.type = 'text';
  link.readOnly = true;
  link.setAttribute('aria-label', 'Lien local partageable du pays');
  const copy = makeEl(ctx, 'button', 'monde-m38-copy', 'Copier');
  copy.id = COPY_ID;
  copy.type = 'button';
  copy.setAttribute('aria-label', 'Copier le lien local du pays');
  row.append(link, copy);
  panel.appendChild(row);

  const status = makeEl(ctx, 'p', 'monde-m38-status');
  status.id = STATUS_ID;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  panel.appendChild(status);
  return panel;
}

function placePanel(ctx, panel) {
  const list = ctx.stage && typeof ctx.stage.querySelector === 'function'
    ? ctx.stage.querySelector('.globe-view') : null;
  const parent = list || ctx.stage || ctx.scene;
  if (parent && panel.parentElement !== parent) parent.appendChild(panel);
}

/* M38-06 : état « copié » textuel, borné dans le temps, sans couleur seule. */
function markCopied(ctx) {
  const copy = byId(COPY_ID);
  const status = byId(STATUS_ID);
  if (copy && copy.isConnected) {
    copy.classList.add('monde-m38-copied');
    copy.textContent = 'Copié ✓';
  }
  if (status && status.isConnected) status.classList.add('monde-m38-copied');
  if (copyTimer !== null) {
    try { clearTimeout(copyTimer); } catch { /* minuteur déjà écoulé */ }
    copyTimer = null;
  }
  if (typeof window === 'undefined' || typeof window.setTimeout !== 'function') return;
  copyTimer = window.setTimeout(() => {
    copyTimer = null;
    const button = byId(COPY_ID);
    if (button && button.isConnected) {
      button.classList.remove('monde-m38-copied');
      button.textContent = 'Copier';
    }
    const state = byId(STATUS_ID);
    if (state && state.isConnected) state.classList.remove('monde-m38-copied');
  }, 2400);
}

/* M38-07 : repli déterministe, sans execCommand déprécié. */
function revealFallback(ctx) {
  const link = byId(LINK_ID);
  if (link && link.isConnected) {
    try { link.focus({ preventScroll: true }); } catch { try { link.focus(); } catch { /*noop*/ } }
    try { link.select(); } catch { /* sélection non supportée */ }
  }
  announce(ctx, 'Presse-papiers indisponible : le lien est sélectionné, copiez-le avec Ctrl+C.');
}

/* M38-06 / M38-07 : une seule copie par clic, avec repli sur échec. */
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
        ok = true;
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

/* M38-05 : un seul attachement par nœud, même si apply est rejoué. */
function bindCopy(ctx, button) {
  if (!button || button === boundButton) return;
  boundButton = button;
  button.addEventListener('click', () => copyLink(ctx));
}

/* M38-08 : annoncer une seule fois l'arrivée depuis un lien de pays. */
function maybeAnnounceRestore(ctx, country) {
  if (restoreAnnounced || !country) return;
  let parsed = null;
  try { parsed = parseDeepLink(window.location.hash); } catch { parsed = null; }
  if (parsed && parsed.countryId === country.id) {
    restoreAnnounced = true;
    announce(ctx, `Lien local ouvert : pays ${country.name}.`);
  }
}

function updatePanel(ctx, country) {
  const link = byId(LINK_ID);
  const copy = byId(COPY_ID);
  if (!link || !copy) return;

  if (!country) {
    link.value = '';
    copy.disabled = true;
    announceUpdate(ctx, 'Aucun pays sélectionné : choisissez un pays pour obtenir son lien.');
    return;
  }
  lastUpdateMessage = '';
  link.value = localLinkFor(country);
  link.title = link.value;
  link.spellcheck = false;
  copy.disabled = !link.value;
  bindCopy(ctx, copy);
  if (copy.disabled) {
    announceUpdate(ctx, 'Lien indisponible : choisissez un pays pour obtenir son lien.');
    return;
  }
  maybeAnnounceRestore(ctx, country);
  const status = byId(STATUS_ID);
  if (status && status.isConnected && !status.textContent) {
    status.textContent = `Pays ${country.name} : lien prêt à copier.`;
  }
}

register('M38', (ctx) => {
  if (!ctx) return;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  if (!ctx.stage && !ctx.scene) return;

  /* M38-10 : un seul minuteur, remis à zéro à chaque rendu. */
  if (copyTimer !== null) {
    try { clearTimeout(copyTimer); } catch { /* minuteur déjà écoulé */ }
    copyTimer = null;
  }

  const panel = buildPanel(ctx);
  placePanel(ctx, panel);
  updatePanel(ctx, resolveCountry(ctx));
});
