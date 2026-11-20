import { register } from './registry.js';

/* Lentille E013 — passe V2, domaine B « Filtres & périmètre ».
 * Thème : « réinitialisation du filtre (bouton + annonce) ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E013.md — chantiers E013-01 à E013-10.
 * Fichier possédé : src/views/chronology/v2/E013.js uniquement. Lectures seules :
 * src/views/chronology.js, src/views/chronology/v2/registry.js,
 * src/views/chronology/v2/index.js, src/ui/shell.js, src/domain/store.js.
 * Aucun fichier partagé n'est modifié.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } ; helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Un seul enregistrement de greffon « E013 », une seule feuille CSS « chronology-v2-e013 ».
 *
 * Invariants :
 * - le filtre reste la propriété de chronology.js (local.query / local.tag) :
 *   la lentille ne l'écrit jamais directement, elle pilote les contrôles réels
 *   (champ de recherche et puces) par des événements natifs ;
 * - une seule région live est utilisée, la région existante #nav-c2a-live :
 *   aucun doublon de région live ni de statut n'est créé ;
 * - aucun timer, aucune boucle d'animation, aucun aléa, aucun réseau, aucune
 *   journalisation, aucun HTML brut, aucune date codée en dur ;
 * - tous les Identifiants DOM sont préfixés chronology-v2-e013- et vérifiés
 *   par garde d'existence (idempotence sur rendus multiples).
 */

const CSS_ID = 'chronology-v2-e013';
const PANEL_ID = 'chronology-v2-e013-panel';
const RESET_ID = 'chronology-v2-e013-reset';
const SUMMARY_ID = 'chronology-v2-e013-summary';
const CONFIRM_ID = 'chronology-v2-e013-confirm';
const METRIC_ID = 'chronology-v2-e013-metric';
const LIVE_ID = 'nav-c2a-live';
const TOOLS_ID = 'atlas-chrono-tools';
const SEARCH_ID = 'atlas-chrono-search';
const EVENTS_ID = 'atlas-chrono-events';

/* E013-01, E013-02, E013-06, E013-10 : une seule feuille, injectée une fois
   par ctx.css. Le panneau est un bloc en flux dans la barre d'outils : il
   n'ajoute aucune modale, ne recouvre ni la frise ni la fiche, et ne modifie
   aucun sélecteur existant. Aucune information n'est portée par la seule
   couleur : l'état « désactivé » est aussi écrit dans le libellé. */
const CSS = `
  #${PANEL_ID} {
    flex: 1 1 100%; display: flex; flex-wrap: wrap; gap: 6px 10px;
    align-items: center; margin: 2px 0 0; padding: 8px 10px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 8px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.45;
    overflow-wrap: anywhere;
  }
  #${RESET_ID} {
    min-height: 36px; padding: 6px 12px;
    border: 1px solid var(--gold); border-radius: 7px;
    background: transparent; color: var(--gold-bright);
    font: inherit; font-size: 10px; cursor: pointer;
  }
  #${RESET_ID}:disabled {
    border-color: var(--line); color: var(--muted-2); cursor: not-allowed;
  }
  #${RESET_ID}:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  .e013-summary { flex: 1 1 220px; min-width: 0; margin: 0; color: var(--muted); }
  .e013-confirm, .e013-metric { flex: 1 1 100%; margin: 0; color: var(--muted-2); font-size: 9px; }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${RESET_ID} { border: 1px solid ButtonText; color: ButtonText; }
    #${RESET_ID}:disabled { border-color: GrayText; color: GrayText; }
  }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 7px 8px; }
    #${RESET_ID} { flex: 1 1 100%; }
  }
`;

/* État module : survit aux reconstructions du DOM par la coque (shell.js:533)
   sans créer de nœud ni d'écouteur supplémentaire. */
let renderCount = 0;
let resetCount = 0;
let announceCount = 0;
let noopCount = 0;
let lastConfirm = 'Aucune réinitialisation effectuée pour l’instant.';
let lastAction = 'aucune';
let lastAnnouncement = '';
let refs = { panel: null, reset: null, summary: null, confirm: null, metric: null, reduced: false };

/* E013-09 : garde d'existence pour toute ID préfixée chronology-v2-e013-.
   Un nœud déjà present est réutilisé et déplacé dans le parent courant ; la
   coque reconstruisant #app, un nœud de la rendu précédente est détaché et
   n'est donc pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E013-03 : lecture seule de l'état réel du filtre dans le DOM. Aucune date,
   aucun compte et aucun libellé n'est codé en dur : tout dérive du champ de
   recherche et des puces aria-pressed de la vue. */
function readFilterState() {
  const search = document.getElementById(SEARCH_ID);
  const query = search ? search.value.trim() : '';
  const chips = Array.from(document.querySelectorAll('.atlas-chrono-tag[aria-pressed="true"]'));
  const tag = chips.length ? (chips[0].textContent || '').trim() : '';
  return { query, tag, active: Boolean(query || tag), search, chips };
}

function describeSummary(state) {
  if (!state.active) return 'Aucun filtre actif : la frise est affichée ère par ère.';
  const parts = [];
  if (state.query) parts.push(`Recherche : « ${state.query} »`);
  if (state.tag) parts.push(`Thème : ${state.tag}`);
  return `Filtre actif — ${parts.join(' · ')}.`;
}

/* E013-05 : écriture dans l'unique région live existante de la vue. Aucune
   région supplémentaire n'est créée ; le texte est dédupliqué pour ne pas
   annoncer deux fois le même message. */
function announce(message) {
  const live = document.getElementById(LIVE_ID);
  if (!live || lastAnnouncement === message) return false;
  lastAnnouncement = message;
  live.textContent = message;
  announceCount += 1;
  return true;
}

/* E013-04 et E013-08 : action de réinitialisation. Le filtre est privé à
   chronology.js : on le remet à zéro en actionnant ses propres contrôles.
   Un seul thème peut être actif à la fois (local.tag est scalaire) : une
   seule puce est donc actionnée, puis l'état est relu après le rendu. */
function performReset() {
  const before = readFilterState();
  const cleared = [];
  if (before.search && before.search.value !== '') {
    before.search.value = '';
    before.search.dispatchEvent(new Event('input', { bubbles: true }));
    cleared.push('recherche');
  }
  if (readFilterState().active) {
    const chip = document.querySelector('.atlas-chrono-tag[aria-pressed="true"]');
    if (chip) {
      chip.click();
      cleared.push('thème');
    }
  }

  if (!cleared.length) {
    /* E013-08 : rien à effacer → aucun message live, aucun bavardage. */
    noopCount += 1;
    lastAction = 'néant';
    lastConfirm = `Aucun filtre à effacer : aucun changement (appel n° ${noopCount}).`;
    return;
  }

  resetCount += 1;
  const total = document.querySelectorAll(`#${EVENTS_ID} > li`).length;
  lastAction = cleared.join(' + ');
  lastConfirm = `Dernière réinitialisation : ${lastAction} — ${total} repère(s) affiché(s) (n° ${resetCount}).`;
  /* L'annonce est écrite APRÈS les événements : ceux-ci ont déclenché les
     rendus et leurs annonces de filtre, que celle-ci remplace une seule fois. */
  announce(`Filtre réinitialisé : ${lastAction}. ${total} repère(s) affiché(s) dans l'ère courante.`);
}

/* E013-01, E013-02, E013-03, E013-06, E013-09 : synchronisation de l'état
   visible après chaque rendu. Les écritures sont dédupliquées par write(). */
function refresh() {
  const { panel, reset, summary, confirm, metric, reduced } = refs;
  if (!panel || !panel.isConnected) return;
  const state = readFilterState();
  const active = state.active ? '1' : '0';

  if (reset) {
    reset.disabled = !state.active;
    reset.setAttribute('aria-disabled', state.active ? 'false' : 'true');
    write(reset, state.active ? 'Réinitialiser le filtre' : 'Réinitialiser le filtre (aucun filtre)');
    if (reset.dataset.e013Active !== active) reset.dataset.e013Active = active;
  }
  write(summary, describeSummary(state));

  write(confirm, lastConfirm);
  if (confirm) {
    const kind = lastAction === 'aucune' ? 'idle' : lastAction === 'néant' ? 'noop' : 'done';
    if (confirm.dataset.e013State !== kind) confirm.dataset.e013State = kind;
  }
  write(metric, `Rendus : ${renderCount} · réinitialisations : ${resetCount} · annonces : ${announceCount} · appels sans filtre : ${noopCount} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  panel.dataset.e013Renders = String(renderCount);
  panel.dataset.e013Resets = String(resetCount);
  panel.dataset.e013Announcements = String(announceCount);
  panel.dataset.e013Noops = String(noopCount);
  panel.dataset.e013Active = active;
  panel.dataset.e013LastAction = lastAction;
  panel.dataset.e013Reduced = reduced ? '1' : '0';
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function') return;
  const tools = document.getElementById(TOOLS_ID);
  const host = tools || ctx.layout;
  if (!host || typeof host.appendChild !== 'function') return;

  renderCount += 1;
  ctx.css(CSS_ID, CSS);

  /* E013-01 : panneau toujours présent, même quand la liste a des résultats. */
  const panel = ensureNode(make, PANEL_ID, 'div', 'chronology-v2-e013-panel', host);
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Réinitialisation du filtre de la chronologie');

  /* E013-04 et E013-10 : bouton natif (Tab, Entrée, Espace), libellé
     accessible unique, garde d'écouteur pour l'idempotence. */
  const reset = ensureNode(make, RESET_ID, 'button', 'e013-reset', panel);
  reset.type = 'button';
  reset.setAttribute('aria-label', 'Réinitialiser la recherche et le thème actifs de la chronologie');
  reset.setAttribute('aria-controls', EVENTS_ID);
  if (reset.dataset.e013Bound !== '1') {
    reset.addEventListener('click', performReset);
    reset.dataset.e013Bound = '1';
  }

  const summary = ensureNode(make, SUMMARY_ID, 'p', 'e013-summary', panel);
  const confirm = ensureNode(make, CONFIRM_ID, 'p', 'e013-confirm', panel);
  const metric = ensureNode(make, METRIC_ID, 'p', 'e013-metric', panel);
  panel.replaceChildren(reset, summary, confirm, metric);

  /* E013-07 : harmonisation du bouton de l'état vide existant : seul un
     aria-label et un marqueur de données sont ajoutés, jamais sa structure
     ni son comportement (chronology.js:361-372). */
  const emptyReset = document.querySelector('#nav-c2a-empty-filter button');
  if (emptyReset) {
    emptyReset.setAttribute('aria-label', 'Réinitialiser tous les filtres du pays');
    emptyReset.dataset.e013Linked = '1';
  }

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { panel, reset, summary, confirm, metric, reduced };
  refresh();
}

register('E013', install);
