import { register } from './registry.js';

/* Lentille E011 — champ de recherche : état visible et libellé.
 *
 * Thème : themes.json « E011 » (domaine B — Filtres & périmètre). Dix chantiers
 * E011-01 à E011-10, tous intra-thème et non chevauchants.
 *
 * Fichier possédé : src/views/chronology/v2/E011.js uniquement. Lectures seules :
 * src/views/chronology/E049.js, UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md,
 * themes.json, v2/registry.js et v2/index.js. Aucun fichier partagé n'est modifié.
 *
 * Contrat exploité : viewId 'chronologyv2', stage, layout, css, el, reducedMotion.
 * Le registre V2 n'expose pas say() (v2/registry.js:28-44) : la lentille n'ajoute
 * AUCUNE région live et n'écrit dans aucune région existante. L'état est rendu
 * en texte visible ordinaire, dédupliqué, hors aria-live.
 *
 * Invariants :
 * - un seul register('E011', …), un seul ctx.css('chronology-v2-e011', …) ;
 * - tous les IDs créés sont préfixés chronology-v2-e011- et passent par ensureNode
 *   (garde d'existence + déplacement dans le parent courant) ;
 * - zéro console.*, zéro fetch/XHR, zéro Math.random, zéro innerHTML, zéro timer,
 *   zéro boucle d'animation, zéro réseau, aucun HTML brut ;
 * - aucun vol de focus hors action explicite sur le bouton « Effacer » ;
 * - français partout : commentaires, libellés et texte visible.
 */

const CSS_ID = 'chronology-v2-e011';
const PANEL_ID = 'chronology-v2-e011-panel';
const LABEL_ID = 'chronology-v2-e011-label';
const HINT_ID = 'chronology-v2-e011-hint';
const STATE_ID = 'chronology-v2-e011-state';
const COUNT_ID = 'chronology-v2-e011-count';
const CLEAR_ID = 'chronology-v2-e011-clear';
const MIRROR_ID = 'chronology-v2-e011-mirror';

/* Recherche du champ existant : la vue V2 réutilise les identifiants de la
 * passe 1 ; les variantes et le repli par type protègent contre un renommage. */
const SEARCH_IDS = ['atlas-chrono-search', 'chronology-v2-search', 'chronology-search'];
const TOOLS_IDS = ['atlas-chrono-tools', 'chronology-v2-tools', 'chronology-tools'];
const MIRROR_MAX = 48;

/* E011-02, E011-03, E011-04, E011-05, E011-07, E011-09 : une seule feuille.
 * Le panneau reste un bloc en flux normal : jamais de modale, jamais de
 * superposition, jamais de tabindex ajouté. */
const CSS = `
  #${PANEL_ID} {
    display: flex; flex-direction: column; gap: 6px;
    margin: 10px 0 0; padding: 10px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.45;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e011-label {
    margin: 0; color: var(--gold-bright); font-family: var(--serif);
    font-size: 13px; font-weight: 600;
  }
  #${PANEL_ID} .e011-hint { margin: 0; color: var(--muted); }
  #${PANEL_ID} .e011-state { margin: 0; color: var(--ink-soft); }
  #${PANEL_ID}[data-e011-active="1"] .e011-state {
    color: var(--gold-bright); font-weight: 600;
  }
  #${PANEL_ID} .e011-count { margin: 0; color: var(--muted-2); font-size: 10px; }
  #${PANEL_ID} .e011-mirror {
    margin: 0; max-width: 100%; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap;
  }
  #${PANEL_ID} .e011-clear {
    align-self: flex-start; min-height: 44px; min-width: 44px;
    padding: 8px 14px; border: 1px solid var(--line-strong); border-radius: 8px;
    background: transparent; color: var(--gold-bright);
    font: inherit; font-size: 11px; cursor: pointer;
  }
  #${PANEL_ID} .e011-clear[hidden] { display: none; }
  #${PANEL_ID} .e011-clear:hover { background: rgba(255,255,255,.05); }
  #${PANEL_ID} .e011-clear:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  #${PANEL_ID}[data-e011-focused="1"] {
    border-color: var(--gold-bright); box-shadow: inset 0 0 0 1px var(--gold-bright);
  }
  #${PANEL_ID}[data-e011-focused="1"] .e011-label {
    text-decoration: underline; text-underline-offset: 3px;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 8px 10px; }
    #${PANEL_ID} .e011-clear { width: 100%; }
    #${PANEL_ID} .e011-mirror { white-space: normal; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * {
      transition: none !important; animation: none !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID},
    #${PANEL_ID} .e011-clear { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e011-label,
    #${PANEL_ID} .e011-state,
    #${PANEL_ID} .e011-clear { color: CanvasText; }
  }
`;

/* État module : survit aux rendus sans créer de nœud ni d'écouteur surnuméraire. */
let lastValue = '';
let focused = false;
let boundInput = null;
let boundClear = null;
let installCount = 0;
let refs = { panel: null, state: null, count: null, clear: null, mirror: null, search: null };

/* E011-10 : garde d'existence pour toute ID préfixée. La coque reconstruisant
 * #app (shell.js:533, cf. E049.md:104), un nœud du rendu précédent est détaché
 * et n'est donc pas retrouvé par getElementById : il est recréé, sinon déplacé. */
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

function findFirst(ids) {
  for (let i = 0; i < ids.length; i += 1) {
    const node = document.getElementById(ids[i]);
    if (node) return node;
  }
  return null;
}

function findSearch(ctx) {
  const direct = findFirst(SEARCH_IDS);
  if (direct && direct.tagName === 'INPUT') return direct;
  const root = ctx.stage || ctx.layout || document;
  if (!root || typeof root.querySelector !== 'function') return null;
  return root.querySelector('input[type="search"]');
}

/* E011-02, E011-03, E011-04, E011-06, E011-09 : une seule fonction de
 * rafraîchissement, dédupliquée via write(), sans écriture live. */
function refresh() {
  const { panel, state, count, clear, mirror, search } = refs;
  if (!panel || !panel.isConnected) return;

  const value = search ? search.value : lastValue;
  const length = value.length;
  const active = value.trim().length > 0;

  write(state, active ? '● Recherche active' : '○ Aucune recherche');
  if (panel.dataset.e011Active !== String(Number(active))) {
    panel.dataset.e011Active = String(Number(active));
  }
  write(count, length === 1 ? '1 caractère saisi' : length + ' caractères saisis');
  if (panel.dataset.e011Length !== String(length)) {
    panel.dataset.e011Length = String(length);
  }

  if (clear) {
    const shouldHide = !active;
    if (clear.hidden !== shouldHide) clear.hidden = shouldHide;
  }

  /* E011-09 : le miroir borne la longueur affichée et garde le texte intégral
   * dans title ; aucune information n'est confiée à la seule couleur. */
  const short = length > MIRROR_MAX ? value.slice(0, MIRROR_MAX - 1) + '…' : value;
  write(mirror, active ? 'Recherche « ' + short + ' » — ' + length + ' caractères' : 'Aucun terme saisi.');
  if (mirror) {
    if (length > MIRROR_MAX) mirror.setAttribute('title', value);
    else if (mirror.hasAttribute('title')) mirror.removeAttribute('title');
  }

  /* E011-07 : état de focus distinct de l'état actif, piloté par le CSS. */
  if (panel.dataset.e011Focused !== String(Number(focused))) {
    panel.dataset.e011Focused = String(Number(focused));
  }
  if (panel.dataset.e011Installs !== String(installCount)) {
    panel.dataset.e011Installs = String(installCount);
  }
}

/* E011-08 : le champ et le miroir restent synchronisés sans événement synthétique. */
function onInput() {
  const search = refs.search;
  if (!search) return;
  lastValue = search.value;
  refresh();
}

function onFocus() {
  focused = true;
  refresh();
}

function onBlur() {
  focused = false;
  refresh();
}

/* E011-04 : effacement d'un geste, puis retour de focus au champ (action
 * explicite de l'utilisateur, contrairement à un vol de focus au rendu). */
function onClear() {
  const search = refs.search;
  if (!search) return;
  if (search.value !== '') search.value = '';
  lastValue = '';
  focused = true;
  refresh();
  if (typeof search.focus === 'function') search.focus();
}

register('E011', ctx => {
  const make = ctx.el;
  if (typeof make !== 'function' || (!ctx.layout && !ctx.stage)) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const search = findSearch(ctx);
  const host = findFirst(TOOLS_IDS)
    || (search && search.parentElement)
    || ctx.layout
    || ctx.stage;
  if (!host || typeof host.appendChild !== 'function') return;

  const panel = ensureNode(make, PANEL_ID, 'section', 'e011-panel', host);
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'État de la recherche dans la frise');

  /* E011-01 : libellé explicite, associé au champ par for (ou aria-labelledby
   * quand le champ n'a pas d'ID), et description reliée par aria-describedby. */
  const label = ensureNode(make, LABEL_ID, 'label', 'e011-label', panel);
  write(label, 'Rechercher dans la frise');
  if (search && search.id) {
    label.setAttribute('for', search.id);
    search.setAttribute('aria-labelledby', LABEL_ID);
  } else {
    if (label.hasAttribute('for')) label.removeAttribute('for');
    if (search) search.setAttribute('aria-labelledby', LABEL_ID);
  }
  if (search) {
    const described = (search.getAttribute('aria-describedby') || '')
      .split(/\s+/).filter(Boolean);
    if (described.indexOf(HINT_ID) < 0) described.push(HINT_ID);
    search.setAttribute('aria-describedby', described.join(' '));
  }

  /* E011-05 : aide de saisie permanente, visible même après une frappe. */
  const hint = ensureNode(make, HINT_ID, 'p', 'e011-hint', panel);
  write(hint, 'Saisissez un nom, une ère ou une année : par exemple « Renaissance », « Galilée » ou « 1610 ». Le filtre s’applique à la frise et à la fiche.');

  const state = ensureNode(make, STATE_ID, 'p', 'e011-state', panel);
  const count = ensureNode(make, COUNT_ID, 'p', 'e011-count', panel);
  const mirror = ensureNode(make, MIRROR_ID, 'p', 'e011-mirror', panel);

  /* E011-04 : bouton natif, type et libellé explicites, non focalisable quand
   * la recherche est vide (attribut hidden piloté dans refresh()). */
  const clear = ensureNode(make, CLEAR_ID, 'button', 'e011-clear', panel);
  clear.type = 'button';
  write(clear, 'Effacer la recherche');
  clear.setAttribute('aria-label', 'Effacer la recherche dans la frise');
  if (search && search.id) clear.setAttribute('aria-controls', search.id);
  else if (clear.hasAttribute('aria-controls')) clear.removeAttribute('aria-controls');

  panel.replaceChildren(label, hint, state, count, mirror, clear);

  /* E011-08 : restauration de la valeur visible après reconstruction du DOM.
   * Le signal de filtre lui-même reste hors périmètre (lentille E017). */
  if (search && lastValue && !search.value) {
    search.value = lastValue;
    panel.dataset.e011Restored = '1';
  } else {
    panel.dataset.e011Restored = '0';
  }

  /* E011-07 : la préférence de mouvement est exposée en attribut lisible,
   * sans créer la moindre animation. */
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  if (panel.dataset.e011Reduced !== String(Number(reduced))) {
    panel.dataset.e011Reduced = String(Number(reduced));
  }

  refs = { panel, state, count, clear, mirror, search };
  focused = search ? document.activeElement === search : false;
  refresh();

  /* E011-10 : écouteurs liés au nœud courant, jamais au document. Les anciens
   * nœuds détachés sont déliés avant d'être remplacés. */
  if (search && boundInput !== search) {
    if (boundInput) {
      boundInput.removeEventListener('input', onInput);
      boundInput.removeEventListener('focus', onFocus);
      boundInput.removeEventListener('blur', onBlur);
    }
    search.addEventListener('input', onInput);
    search.addEventListener('focus', onFocus);
    search.addEventListener('blur', onBlur);
    boundInput = search;
  }
  if (boundClear !== clear) {
    if (boundClear) boundClear.removeEventListener('click', onClear);
    clear.addEventListener('click', onClear);
    boundClear = clear;
  }
});
