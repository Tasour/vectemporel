import { register } from './registry.js';

/* Lentille V2 E032 — Navigation & clavier : flèches entre ères et repères,
 * sans casser focusSignature (domaine D de la passe 2).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E032.md — chantiers E032-01 à E032-10.
 * Fichier possédé : src/views/chronology/v2/E032.js uniquement. Aucun fichier
 * partagé n'est modifié : ni registry.js, ni index.js, ni styles.css, ni
 * src/views/chronology.js, ni la passe 1, ni une autre lentille V2.
 *
 * Contrat exploité : { viewId:'chronologyv2', stage, layout } ; helpers ctx.css,
 * ctx.el, ctx.reducedMotion. Un seul register('E032', install), une seule
 * feuille ctx.css('chronology-v2-e032', …), un seul écouteur documentaire
 * (focusin), purement observationnel.
 *
 * Invariants de la lentille :
 * - ZÉRO écouteur 'keydown' : les quatre flèches appartiennent au routeur
 *   (keyboard.js:171-177). E032 ne les intercepte pas, ne les annule pas,
 *   n'appelle ni preventDefault ni stopPropagation.
 * - ZÉRO appel à focus() : la restauration de focus de la coque
 *   (focusSignature / manageFocus, shell.js:188-221, 251-289) et le
 *   focusIntent de la vue (chronology.js:18, 199-205) gardent la main.
 * - ZÉRO écriture dans data-fk, dans #nav-c2a-live ou dans #nav-t2-live :
 *   l'état est affiché en texte visible, dédupliqué, hors aria-live.
 * - ZÉRO timer, rAF, Math.random, console.*, fetch/XHR, innerHTML, import distant.
 *
 * Les dix chantiers, tous observable dans le DOM/CSS :
 *   E032-01 ← → ↑ ↓ documentées ; -02 axes lus au runtime ; -03 bornes clamp ;
 *   -04 focus observé ; -05 data-fk préservés ; -06 garde éditable ;
 *   -07 gel sous modale ; -08 propriété exclusive du routeur ;
 *   -09 équivalents tactiles ; -10 idempotence et robustesse d'affichage.
 */

const CSS_ID = 'chronology-v2-e032';
const PANEL_ID = 'chronology-v2-e032-panel';
const TITLE_ID = 'chronology-v2-e032-title';
const KEYS_ID = 'chronology-v2-e032-keys';
const AXIS_ID = 'chronology-v2-e032-axis';
const BOUNDS_ID = 'chronology-v2-e032-bounds';
const FOCUS_ID = 'chronology-v2-e032-focus';
const FK_ID = 'chronology-v2-e032-fk';
const EDITABLE_ID = 'chronology-v2-e032-editable';
const MODAL_ID = 'chronology-v2-e032-modal';
const OWNER_ID = 'chronology-v2-e032-owner';
const TOUCH_ID = 'chronology-v2-e032-touch';
const METRIC_ID = 'chronology-v2-e032-metric';
const MAIN_ID = 'atlas-chrono-main';
const SEARCH_ID = 'atlas-chrono-search';

/* E032-01, E032-10 : une seule feuille, injectée une fois par ctx.css. Le
   panneau est un bloc en flux normal en fin de colonne : jamais de modale,
   jamais de superposition, jamais de tabindex ajouté au parcours de Tab. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e032-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
  }
  #${PANEL_ID} .e032-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e032-keys { margin: 0 0 8px; padding: 0; list-style: none; }
  #${PANEL_ID} .e032-key { display: flex; gap: 8px; margin: 0 0 4px; }
  #${PANEL_ID} .e032-kbd {
    flex: 0 0 26px; padding: 1px 5px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    color: var(--gold-bright); font: inherit; font-size: 9px; text-align: center;
  }
  #${PANEL_ID} .e032-key-label { flex: 1 1 auto; min-width: 0; }
  #${PANEL_ID} .e032-line { margin: 5px 0 0; }
  #${PANEL_ID} .e032-axis,
  #${PANEL_ID} .e032-bounds,
  #${PANEL_ID} .e032-focus { color: var(--gold-bright); }
  #${PANEL_ID} .e032-fk,
  #${PANEL_ID} .e032-editable,
  #${PANEL_ID} .e032-modal,
  #${PANEL_ID} .e032-owner,
  #${PANEL_ID} .e032-touch,
  #${PANEL_ID} .e032-metric { color: var(--muted-2); font-size: 9px; }
  #${PANEL_ID}[data-e032-editable="1"] .e032-editable,
  #${PANEL_ID}[data-e032-modal="1"] .e032-modal { color: var(--ink-soft); }
  @media (max-width: 620px) {
    #${PANEL_ID} .e032-key { flex-wrap: wrap; gap: 2px 8px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e032-title, #${PANEL_ID} .e032-kbd,
    #${PANEL_ID} .e032-axis, #${PANEL_ID} .e032-bounds,
    #${PANEL_ID} .e032-focus,
    #${PANEL_ID}[data-e032-editable="1"] .e032-editable,
    #${PANEL_ID}[data-e032-modal="1"] .e032-modal { color: CanvasText; }
  }
`;

/* E032-01 : quatre lignes, une par flèche. L'axe horizontal est 'event'
   (repère) et l'axe vertical 'era' (ère) pour la Chronologie
   (keyboard.js:43-51) : l'indice 8 px de chronology.js:232 n'en cite que trois. */
const ARROW_ROWS = [
  ['←', 'repère précédent — axe horizontal'],
  ['→', 'repère suivant — axe horizontal'],
  ['↑', 'ère précédente — axe vertical'],
  ['↓', 'ère suivante — axe vertical'],
];

let installCount = 0;
let refreshCount = 0;
let focusBound = false;
let refs = {
  panel: null, keys: null, axis: null, bounds: null, focus: null,
  fk: null, editable: null, modal: null, owner: null, touch: null,
  metric: null, search: null, stage: null, reduced: false,
};

/* E032-10 : garde d'existence pour toute ID préfixée chronology-v2-e032-.
   Un nœud déjà présent est réutilisé et déplacé dans le parent courant ; la
   coque reconstruisant #app, un nœud de la rendu précédent est détaché et
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

/* E032-10 : toute écriture passe par un déduplication ; deux rafraîchissements
   sans changement ne touchent aucun textContent. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function flag(panel, name, value) {
  const key = `e032${name}`;
  if (panel && panel.dataset[key] !== String(value)) panel.dataset[key] = String(value);
}

/* E032-04 : lecture seule de document.activeElement. */
function describeFocus(target) {
  if (!(target instanceof Element)) return 'Focus courant : aucun contrôle actif.';
  const name = target.id ? `#${target.id}` : target.tagName.toLowerCase();
  const label = target.getAttribute('aria-label') || (target.textContent || '').trim().slice(0, 36);
  return `Focus courant : ${name}${label ? ` — « ${label} »` : ''}.`;
}

/* E032-06 : même prédicat que le routeur (keyboard.js:59-63). Aucun
   keydown n'est installé : le module se contente de refléter l'état. */
function isEditable(node) {
  if (!(node instanceof HTMLElement)) return false;
  return node.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName);
}

/* E032-02 : contrat d'axes publié par window.VECTEMPOREL_KEYS
   (keyboard.js:202-207). Repli strictement identique à AXIS_BY_VIEW.chronology
   (keyboard.js:46) si le contrat n'est pas encore exposé. */
function readAxis() {
  const contract = window.VECTEMPOREL_KEYS;
  const published = contract && contract.axis && contract.axis.chronology;
  const source = published ? 'contrat' : 'repli';
  const horizontal = (published && published.horizontal) || 'event';
  const vertical = (published && published.vertical) || 'era';
  return { horizontal, vertical, source };
}

/* E032-03 : bornes réelles lues dans navigationBounds() (keyboard.js:240-245).
   Les axes event et era sont en mode 'clamp' : aucune flèche ne boucle. */
function readBounds() {
  const contract = window.VECTEMPOREL_KEYS;
  if (!contract || typeof contract.navigationBounds !== 'function') return null;
  try { return contract.navigationBounds(); }
  catch { return null; }
}

/* E032-05 : les signatures de focus créées par la vue sont lues, jamais
   écrites. chronology.js:428-429 pose data-fk="country-title" sur le titre. */
function countSignatures(root) {
  if (!root) return { total: 0, current: '' };
  const total = root.querySelectorAll('[data-fk]').length;
  const active = document.activeElement;
  const current = active instanceof Element ? (active.getAttribute('data-fk') || '') : '';
  return { total, current };
}

/* E032-09 : bandes d'ère (chronology.js:285-305) et cartes de repère
   (chronology.js:386-411) sont les équivalents tactiles des flèches. */
function countTouch(root) {
  if (!root) return { eras: 0, cards: 0 };
  return {
    eras: root.querySelectorAll('.era-band').length,
    cards: root.querySelectorAll('.event-card').length,
  };
}

/* E032-02 à E032-09 : un seul rafraîchissement, sans effet de bord. */
function refresh() {
  const { panel, keys, axis, bounds, focus, fk, editable, modal, owner, touch, metric, search, stage, reduced } = refs;
  if (!panel || !panel.isConnected) return;
  refreshCount += 1;

  /* E032-01 : les quatre lignes sont reconstruites à l'identique à chaque
     rendu ; l'unicité des nœuds est assurée par ensureNode. */
  if (keys && !keys.childElementCount) {
    ARROW_ROWS.forEach(([key, label]) => {
      const row = document.createElement('li');
      row.className = 'e032-key';
      const kbd = document.createElement('kbd');
      kbd.className = 'e032-kbd';
      kbd.textContent = key;
      const description = document.createElement('span');
      description.className = 'e032-key-label';
      description.textContent = label;
      row.append(kbd, description);
      keys.appendChild(row);
    });
  }

  /* E032-02 : axes déclarés vs axes affichés. */
  const a = readAxis();
  write(axis, `Axes déclarés par le routeur (${a.source}) : ← → = ${a.horizontal} (repère) · ↑ ↓ = ${a.vertical} (ère).`);
  flag(panel, 'AxisH', a.horizontal);
  flag(panel, 'AxisV', a.vertical);
  flag(panel, 'AxisSource', a.source);

  /* E032-03 : bornes et mode d'arrêt. */
  const b = readBounds();
  if (b) {
    const ev = b.event || {};
    const er = b.era || {};
    write(bounds, `Bornes : repère ${ev.index ?? '?'}/${ev.total ?? '?'} (${ev.mode || 'clamp'}) · ère ${er.index ?? '?'}/${er.total ?? '?'} (${er.mode || 'clamp'}).`);
    flag(panel, 'BoundsEvent', `${ev.index ?? '?'}/${ev.total ?? '?'}`);
    flag(panel, 'BoundsEra', `${er.index ?? '?'}/${er.total ?? '?'}`);
  } else {
    write(bounds, 'Bornes : le contrat du routeur n’est pas encore exposé ; les flèches restent sous sa seule responsabilité.');
    flag(panel, 'BoundsEvent', 'nd');
    flag(panel, 'BoundsEra', 'nd');
  }

  /* E032-04 : le focus courant est nommé, jamais déplacé. */
  write(focus, describeFocus(document.activeElement));
  flag(panel, 'Focus', document.activeElement instanceof Element
    ? (document.activeElement.id || document.activeElement.tagName.toLowerCase())
    : 'aucun');

  /* E032-05 : signatures de focus préservées. */
  const signatures = countSignatures(stage);
  write(fk, `Signatures data-fk dans la scène : ${signatures.total} · signature du focus courant : ${signatures.current || 'aucune'}. Aucune n'est écrite par E032.`);
  flag(panel, 'Fk', signatures.total);

  /* E032-06 : les flèches sont suspendues dès qu'un champ a le focus. */
  const active = document.activeElement;
  const editableActive = isEditable(active);
  if (editableActive) {
    const name = active.id ? `#${active.id}` : active.tagName.toLowerCase();
    write(editable, `Champ éditable actif (${name}) : le routeur suspend les flèches ; Tab pour en sortir.`);
  } else {
    write(editable, search
      ? 'Aucun champ éditable actif : ← → changent de repère, ↑ ↓ changent d’ère.'
      : 'Aucun champ éditable actif : les flèches pilotent ères et repères.');
  }
  flag(panel, 'Editable', editableActive ? '1' : '0');

  /* E032-07 : gel sous modale, lu dans modalState() (keyboard.js:210). */
  const contract = window.VECTEMPOREL_KEYS;
  let state = null;
  if (contract && typeof contract.modalState === 'function') {
    try { state = contract.modalState(); }
    catch { state = null; }
  }
  const frozen = Boolean(state && (state.help || state.detail));
  write(modal, frozen
    ? 'Modale ouverte : le routeur gèle les flèches (priorité à l’aide et au détail).'
    : 'Aucune modale ouverte : les flèches sont actives.');
  flag(panel, 'Modal', frozen ? '1' : '0');

  /* E032-08 : propriété exclusive du routeur, vérifiable par relecture. */
  write(owner, 'E032 n’installe aucun écouteur de touche : ← → ↑ ↓ appartiennent au routeur (keyboard.js:171-177). Aucun preventDefault, aucun vol de focus.');
  flag(panel, 'Owner', 'routeur');
  flag(panel, 'Keydown', '0');

  /* E032-09 : équivalents tactiles des flèches. */
  const touchCounts = countTouch(stage);
  write(touch, `Équivalents tactiles : ${touchCounts.eras} bande(s) d’ère (↑ ↓) · ${touchCounts.cards} carte(s) de repère (← →).`);
  flag(panel, 'TouchEras', touchCounts.eras);
  flag(panel, 'TouchCards', touchCounts.cards);

  /* E032-10 : métrique d'installation, sans timer ni aléa. */
  write(metric, `Installations : ${installCount} · rafraîchissements : ${refreshCount} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);
  flag(panel, 'Installs', installCount);
}

/* E032-04 : unique écouteur, observationnel. Il ne fait ni preventDefault,
   ni stopPropagation, ni focus(), ni écriture live. */
function onFocusIn() {
  if (refs.panel && refs.panel.isConnected) {
    refresh();
  }
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e032-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ensureNode(make, TITLE_ID, 'h2', 'e032-title', panel);
  title.textContent = 'Flèches : ères et repères';
  const lede = make('p', 'e032-lede', 'Panneau de lecture : il décrit le contrat clavier existant. Il n’ajoute aucun raccourci, ne détourne aucune flèche et ne déplace jamais le focus.');
  const keys = ensureNode(make, KEYS_ID, 'ul', 'e032-keys', panel);
  const axis = ensureNode(make, AXIS_ID, 'p', 'e032-line e032-axis', panel);
  const bounds = ensureNode(make, BOUNDS_ID, 'p', 'e032-line e032-bounds', panel);
  const focus = ensureNode(make, FOCUS_ID, 'p', 'e032-line e032-focus', panel);
  const fk = ensureNode(make, FK_ID, 'p', 'e032-line e032-fk', panel);
  const editable = ensureNode(make, EDITABLE_ID, 'p', 'e032-line e032-editable', panel);
  const modal = ensureNode(make, MODAL_ID, 'p', 'e032-line e032-modal', panel);
  const owner = ensureNode(make, OWNER_ID, 'p', 'e032-line e032-owner', panel);
  const touch = ensureNode(make, TOUCH_ID, 'p', 'e032-line e032-touch', panel);
  const metric = ensureNode(make, METRIC_ID, 'p', 'e032-line e032-metric', panel);

  panel.replaceChildren(
    title, lede, keys, axis, bounds, focus, fk, editable, modal, owner, touch, metric
  );

  refs = {
    panel, keys, axis, bounds, focus, fk, editable, modal, owner, touch, metric,
    search: document.getElementById(SEARCH_ID),
    stage: ctx.stage || ctx.layout,
    reduced: typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false,
  };
  refresh();

  if (!focusBound) {
    document.addEventListener('focusin', onFocusIn, true);
    focusBound = true;
  }
}

register('E032', install);
