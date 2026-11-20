import { register } from './registry.js';

/* Lentille V2 E039 — restauration du focus après filtrage
 * (domaine D : navigation & clavier de la vue Chronologie, passe V2).
 *
 * Thème : UNIFIED_AUDIT/CHRONOLOGIE/V2/themes.json, clé E039.
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E039.md — chantiers E039-01 à E039-10.
 * Fichier possédé : src/views/chronology/v2/E039.js uniquement. Lectures seules :
 * src/views/chronology/E049.js et UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md.
 * Aucun fichier partagé n'est modifié : ni registry.js, ni index.js, ni
 * styles.css, ni src/views/chronology.js, ni la passe 1, ni une autre lentille.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Le registre
 * V2 ne fournit pas say() : la lentille n'ajoute AUCUNE région live et n'écrit
 * dans aucune région existante. Elle rend visible, dans un panneau local en flux
 * normal, le chemin réellement pris par le focus après chaque action de filtre
 * (recherche, puce de type, réinitialisation) — sans jamais déplacer ce focus.
 *
 * Rappel de la mécanique observée (chronology.js, lecture seule) :
 * - focusIntent est posé avant set({}, 'chrono-filter') (:323, :339, :367, :453) ;
 * - applyFocusIntent() (:199-205) consomme l'intention et appelle focus() ;
 * - runEnhancementsV2() (:544) précède applyFocusIntent() (:545) : le greffon
 *   est installé avant la restauration qu'il observe, d'où un témoin piloté par
 *   événements (input / click / focusin) et non par un sondage temporisé.
 *
 * Invariants :
 * - un seul register('E039', install), un seul ctx.css('chronology-v2-e039', …) ;
 * - un seul jeu d'écouteurs documentaires (input, click, focusin), enregistrés
 *   sous une garde module, purement observationnels ;
 * - aucun appel à focus(), aucun preventDefault, aucun stopPropagation, aucun
 *   vol de focus, aucun piège de Tab, aucun gestionnaire de touche ;
 * - aucun timer, aucune boucle rAF, aucun aléa, aucun réseau, aucune
 *   journalisation, aucun HTML brut (createElement / textContent / replaceChildren) ;
 * - tous les IDs sont préfixés chronology-v2-e039- et gardés par ensureNode.
 */

const CSS_ID = 'chronology-v2-e039';
const PANEL_ID = 'chronology-v2-e039-panel';
const TITLE_ID = 'chronology-v2-e039-title';
const ANCHORS_ID = 'chronology-v2-e039-anchors';
const CURRENT_ID = 'chronology-v2-e039-current';
const RESTORED_ID = 'chronology-v2-e039-restored';
const LOSS_ID = 'chronology-v2-e039-loss';
const SEARCH_ID = 'chronology-v2-e039-search';
const TAG_ID = 'chronology-v2-e039-tag';
const RESET_ID = 'chronology-v2-e039-reset';
const HISTORY_ID = 'chronology-v2-e039-history';
const NOTE_ID = 'chronology-v2-e039-note';

/* IDs de la vue lus en lecture seule (chronology.js:220, :223, :312, :315). */
const MAIN_ID = 'atlas-chrono-main';
const ASIDE_ID = 'atlas-chrono-aside';
const TOOLS_ID = 'atlas-chrono-tools';
const CHRONO_SEARCH = 'atlas-chrono-search';

/* E039-01, E039-08, E039-09 : une seule feuille injectée une fois par ctx.css.
   Le panneau reste un bloc en flux normal en fin de colonne : ni modale, ni
   superposition, ni tabindex ajouté — il ne masque ni la frise ni la fiche. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e039-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e039-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e039-sub {
    margin: 7px 0 3px; color: var(--muted-2); font-size: 9px;
    text-transform: uppercase; letter-spacing: .04em;
  }
  #${PANEL_ID} .e039-current { margin: 6px 0 0; color: var(--gold-bright); }
  #${PANEL_ID} .e039-restored { margin: 5px 0 0; color: var(--ink-soft); }
  #${PANEL_ID} .e039-loss,
  #${PANEL_ID} .e039-search,
  #${PANEL_ID} .e039-tag,
  #${PANEL_ID} .e039-reset,
  #${PANEL_ID} .e039-note { margin: 4px 0 0; color: var(--muted); }
  #${PANEL_ID} .e039-loss[data-loss="1"] { color: var(--gold-bright); }
  #${PANEL_ID} .e039-anchors,
  #${PANEL_ID} .e039-history {
    margin: 2px 0 0; padding: 0 0 0 16px;
    color: var(--muted); font-size: 9px;
  }
  #${PANEL_ID} .e039-anchor,
  #${PANEL_ID} .e039-history-item { margin: 1px 0; }
  #${PANEL_ID} .e039-history-item[data-verdict="restauré"] { color: var(--gold-bright); }
  #${PANEL_ID} .e039-history-item[data-verdict="perdu"] { color: var(--muted-2); }
  @media (max-width: 620px) {
    #${PANEL_ID} .e039-anchors,
    #${PANEL_ID} .e039-history { padding-left: 12px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e039-title,
    #${PANEL_ID} .e039-current,
    #${PANEL_ID} .e039-loss,
    #${PANEL_ID} .e039-restored { color: CanvasText; }
  }
`;

/* État module : survit au innerHTML de la coque car le module n'est pas
   ré-importé entre deux rendus (chronology.js:544, E049.md:41). */
let installCount = 0;
let renderCount = 0;
let focusEvents = 0;
let currentFocus = 'aucun contrôle actif';
let totalRestored = 0;
let bodyLoss = 0;
let misdirected = 0;
let anchorCount = 0;
let restored = { recherche: 0, puce: 0, 'puce latérale': 0, réinitialisation: 0 };
let pending = null;
let history = [];
let eventsBound = false;
let boundMake = null;
let refs = {
  panel: null, anchors: null, current: null, restored: null, loss: null,
  search: null, tag: null, reset: null, history: null, note: null,
  reduced: false, viewId: 'chronologyv2',
};

/* E039-10 : garde d'existence pour toute ID préfixée chronology-v2-e039-. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écriture dédupliquée : deux rafraîchissements sans changement ne touchent
   aucun textContent (E039-10). */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function fallbackMake(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function describeFocus(target) {
  if (!(target instanceof Element)) return 'aucun contrôle actif';
  const id = target.id ? `#${target.id}` : target.tagName.toLowerCase();
  const label = target.getAttribute('aria-label') || (target.textContent || '').trim().slice(0, 36);
  return `${id}${label ? ` — « ${label} »` : ''}`;
}

function classify(id, node) {
  if (id === CHRONO_SEARCH) return 'recherche';
  if (id.indexOf('tag-btn-') === 0) return 'puce';
  if (id.indexOf('aside-tag-') === 0) return 'puce latérale';
  if (id.indexOf('event-btn-') === 0) return 'repère';
  if (id.indexOf('era-') === 0) return 'ère';
  if (/r[eé]initialis/i.test(node.textContent || '')) return 'réinitialisation';
  return 'autre';
}

/* E039-01 : inventaire déterministe des ancres de restauration réellement
   présentes dans la vue. Aucune donnée n'est inventée : tout vient du DOM. */
function renderAnchors(list, make) {
  const roots = [TOOLS_ID, MAIN_ID, ASIDE_ID]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const found = [];
  roots.forEach((root) => {
    root.querySelectorAll('input[id], button[id]').forEach((node) => {
      found.push({ id: node.id, kind: classify(node.id, node) });
    });
  });
  const seen = {};
  const unique = found.filter((entry) => {
    if (seen[entry.id]) return false;
    seen[entry.id] = true;
    return true;
  }).sort((a, b) => a.id.localeCompare(b.id));
  anchorCount = unique.length;
  const key = unique.map((entry) => `${entry.id}:${entry.kind}`).join('|');
  if (list.dataset.e039AnchorKey === key) return;
  list.dataset.e039AnchorKey = key;
  const items = unique.map((entry) => make('li', 'e039-anchor', `${entry.kind} — #${entry.id}`));
  list.replaceChildren(...(items.length ? items : [make('li', 'e039-anchor', 'Aucune ancre détectée.')]));
}

/* E039-08 : journal borné à cinq transitions, reconstruit uniquement quand
   son contenu change. */
function renderHistory(list, make) {
  const key = history
    .map((entry) => `${entry.kind}:${entry.expected}:${entry.observed}:${entry.verdict}`)
    .join('|');
  if (list.dataset.e039HistoryKey === key) return;
  list.dataset.e039HistoryKey = key;
  const items = history.map((entry) => {
    const item = make('li', 'e039-history-item',
      `${entry.kind} — attendu #${entry.expected} — observé ${entry.observed} — ${entry.verdict}.`);
    item.dataset.verdict = entry.verdict;
    return item;
  });
  list.replaceChildren(...(items.length ? items : [make('li', 'e039-history-item', 'Aucune transition de filtre observée.')]));
}

/* E039-03 à E039-07 : une intention en attente est résolue au premier focus
   suivant. Trois verdicts seulement : restauré (bonne ancre), perdu (corps du
   document), dévié (autre contrôle). Aucun focus n'est jamais provoqué. */
function resolvePending(target) {
  if (!pending) return;
  const observedId = target instanceof Element ? (target.id || '') : '';
  const onBody = target === document.body || target === document.documentElement || !(target instanceof Element);
  let verdict = 'dévié';
  if (observedId && observedId === pending.id) verdict = 'restauré';
  else if (onBody) verdict = 'perdu';

  if (verdict === 'restauré') {
    totalRestored += 1;
    restored[pending.kind] = (restored[pending.kind] || 0) + 1;
  } else if (verdict === 'perdu') {
    bodyLoss += 1;
  } else {
    misdirected += 1;
  }
  history.unshift({
    kind: pending.kind,
    expected: pending.id,
    observed: observedId || 'corps du document',
    verdict,
  });
  if (history.length > 5) history.length = 5;
  pending = null;
}

/* E039-05 : la saisie dans #atlas-chrono-search pose une intention de retour
   vers ce même champ (chronology.js:322-325). Délégation en capture : l'écouteur
   survit à la reconstruction du DOM. */
function onInput(event) {
  const target = event.target;
  if (target instanceof Element && target.id === CHRONO_SEARCH) {
    pending = { id: CHRONO_SEARCH, kind: 'recherche' };
  }
}

/* E039-06, E039-07 : une puce de type (tag-btn-*, aside-tag-*) ou le bouton
   « Réinitialiser le filtre » pose une intention de retour (chronology.js:338-340,
   :452-454, :364-369). L'ID attendu est lu sur le nœud lui-même. */
function onClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest('button');
  if (!button) return;
  const id = button.id || '';
  if (id.indexOf('tag-btn-') === 0) pending = { id, kind: 'puce' };
  else if (id.indexOf('aside-tag-') === 0) pending = { id, kind: 'puce latérale' };
  else if (/r[eé]initialis/i.test(button.textContent || '')) {
    pending = { id: CHRONO_SEARCH, kind: 'réinitialisation' };
  }
}

/* E039-02, E039-03, E039-04 : unique point d'écoute du focus, en capture. Il
   décrit le focus courant et résout l'intention en attente. Purement lecteur :
   ni preventDefault, ni stopPropagation, ni focus(). */
function onFocusIn(event) {
  focusEvents += 1;
  const target = event.target instanceof Element ? event.target : document.body;
  currentFocus = describeFocus(target);
  resolvePending(target);
  refresh(false);
}

function bindEvents() {
  if (eventsBound) return;
  document.addEventListener('input', onInput, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('focusin', onFocusIn, true);
  eventsBound = true;
}

/* E039-01 à E039-10 : rafraîchissement de tous les témoins visibles et des
   attributs d'audit. fromRender distingue un nouveau passage d'install(). */
function refresh() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;
  const make = boundMake || fallbackMake;

  renderAnchors(r.anchors, make);

  write(r.current, `Focus courant : ${currentFocus} · changements observés : ${focusEvents}.`);
  write(r.restored, `Restaurations confirmées : ${totalRestored}.`);
  write(r.loss, `Pertes de focus vers le corps du document : ${bodyLoss} · redirections ailleurs : ${misdirected}.`);
  write(r.search, `Recherche — focus rendu au champ : ${restored.recherche}.`);
  write(r.tag, `Puces — focus rendu à la puce d'origine : ${restored.puce} (dont puces latérales : ${restored['puce latérale']}).`);
  write(r.reset, `Réinitialisation — retour au champ de recherche : ${restored.réinitialisation}.`);
  renderHistory(r.history, make);
  write(r.note, `Témoin non live : aucune annonce ajoutée, aucun focus volé. Vue : ${r.viewId}. Rendus : ${renderCount}. Mouvement réduit : ${r.reduced ? 'oui' : 'non'}.`);

  if (r.loss) {
    const flag = bodyLoss > 0 ? '1' : '0';
    if (r.loss.dataset.loss !== flag) r.loss.dataset.loss = flag;
  }

  const d = r.panel.dataset;
  d.e039Renders = String(renderCount);
  d.e039Installs = String(installCount);
  d.e039Focus = currentFocus;
  d.e039FocusEvents = String(focusEvents);
  d.e039Restored = String(totalRestored);
  d.e039BodyLoss = String(bodyLoss);
  d.e039Misdirected = String(misdirected);
  d.e039SearchKept = String(restored.recherche);
  d.e039TagKept = String(restored.puce + restored['puce latérale']);
  d.e039ResetFocus = String(restored.réinitialisation);
  d.e039AnchorCount = String(anchorCount);
  d.e039Reduced = r.reduced ? '1' : '0';
  d.e039Steal = '0';
  d.e039Live = '0';
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || (!ctx.layout && !ctx.stage)) return;

  boundMake = make;
  installCount += 1;
  renderCount = installCount;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(MAIN_ID) || ctx.layout || ctx.stage || document.body;
  if (!host) return;

  const panel = ensureNode(make, PANEL_ID, 'section', 'e039-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e039-title', 'Focus restauré après filtrage');
  title.id = TITLE_ID;
  const lede = make('p', 'e039-lede', 'Témoin de lecture : il observe où le focus revient après une recherche, une puce de type ou une réinitialisation. Il ne déplace jamais le focus et n’ajoute aucune annonce live.');
  const anchorsHead = make('p', 'e039-sub', 'Ancres de restauration présentes dans la vue');
  const anchors = make('ul', 'e039-anchors');
  anchors.id = ANCHORS_ID;
  const current = make('p', 'e039-current');
  current.id = CURRENT_ID;
  const restoredNode = make('p', 'e039-restored');
  restoredNode.id = RESTORED_ID;
  const loss = make('p', 'e039-loss');
  loss.id = LOSS_ID;
  const search = make('p', 'e039-search');
  search.id = SEARCH_ID;
  const tag = make('p', 'e039-tag');
  tag.id = TAG_ID;
  const reset = make('p', 'e039-reset');
  reset.id = RESET_ID;
  const historyHead = make('p', 'e039-sub', 'Journal des cinq dernières transitions');
  const historyNode = make('ol', 'e039-history');
  historyNode.id = HISTORY_ID;
  const note = make('p', 'e039-note');
  note.id = NOTE_ID;

  panel.replaceChildren(title, lede, anchorsHead, anchors, current, restoredNode,
    loss, search, tag, reset, historyHead, historyNode, note);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = {
    panel, anchors, current, restored: restoredNode, loss, search, tag, reset,
    history: historyNode, note, reduced, viewId: ctx.viewId || 'chronologyv2',
  };

  refresh();
  if (!eventsBound) bindEvents();
}

register('E039', install);
