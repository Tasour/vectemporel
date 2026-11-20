import { register } from './registry.js';

/* Lentille E034 — priorité de la touche Échap : d'abord la modale, puis le
 * retour au monde (domaine D : navigation et clavier, passe V2).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E034.md — chantiers
 * E034-01 à E034-10. Fichier possédé : src/views/chronology/v2/E034.js
 * uniquement. Aucun fichier partagé n'est modifié.
 *
 * Contrat exploité : viewId ('chronologyv2'), stage, layout, css, el,
 * reducedMotion(). Un seul register('E034', install), une seule feuille CSS
 * via ctx.css('chronology-v2-e034', …).
 *
 * Invariants :
 * - aucun preventDefault, aucun stopPropagation, aucun focus() : le routeur
 *   (keyboard.js:143-154) garde la main sur Échap ;
 * - aucun timer, aucune boucle rAF, aucun aléa, aucun réseau, aucune
 *   journalisation, aucun HTML brut ;
 * - l'écouteur keydown est purement observationnel et installé une seule fois ;
 * - les écritures dans le panneau sont dédupliquées (write(), setData()).
 */

const CSS_ID = 'chronology-v2-e034';
const PANEL_ID = 'chronology-v2-e034-panel';
const TITLE_ID = 'chronology-v2-e034-title';
const DIALOGS_ID = 'chronology-v2-e034-dialogs';
const STATE_ID = 'chronology-v2-e034-state';
const TACTILE_ID = 'chronology-v2-e034-tactile';
const TACTILE_TEXT_ID = 'chronology-v2-e034-tactile-text';
const TRACE_ID = 'chronology-v2-e034-trace';
const RETURN_ID = 'chronology-v2-e034-return';
const METRIC_ID = 'chronology-v2-e034-metric';

/* E034-04, E034-09 : une seule feuille, injectée une fois par ctx.css. Le
   panneau reste un bloc en flux normal (jamais une modale, jamais superposé,
   jamais tabindex=-1) : il n'ajoute aucun arrêt Tab et ne masque rien. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${TITLE_ID} {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e034-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e034-block { margin: 6px 0 0; }
  #${PANEL_ID} .e034-dialogs { color: var(--ink-soft); }
  #${PANEL_ID} .e034-state { color: var(--gold-bright); }
  #${PANEL_ID} .e034-tactile { color: var(--muted); }
  #${PANEL_ID} .e034-trace { color: var(--ink-soft); }
  #${PANEL_ID} .e034-return { color: var(--muted-2); font-size: 9px; }
  #${PANEL_ID} .e034-kbd {
    display: inline-block; padding: 1px 5px; margin-right: 5px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    color: var(--gold-bright); font: inherit; font-size: 9px;
  }
  #${PANEL_ID} .e034-metric {
    margin: 8px 0 0; color: var(--muted-2); font-size: 9px;
  }
  #${PANEL_ID}[data-e034-mode="modal"] { border-left-color: var(--gold-bright); }
  #${PANEL_ID}[data-e034-mode="world"] { border-left-color: var(--line-strong); }
  #${PANEL_ID}[data-e034-editable="1"] .e034-state { color: var(--muted); }
  @media (max-width: 620px) {
    #${PANEL_ID} .e034-kbd { display: block; width: fit-content; margin-bottom: 4px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * {
      transition: none !important; animation: none !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${TITLE_ID}, #${PANEL_ID} .e034-state,
    #${PANEL_ID} .e034-kbd { color: CanvasText; }
  }
`;

/* E034-01 : sélecteur générique, aucune ID de modale codée en dur. Les ID
   historiques sont recherchés à l'exécution seulement pour le libellé tactile
   (E034-04), jamais pour décider de la priorité. */
const DIALOG_SELECTOR =
  '[aria-modal="true"], [role="dialog"], dialog[open], [open][role], .modal, .dialog';

let installCount = 0;
let writes = 0;
let escapeCount = 0;
let keyBound = false;
let observer = null;
let refs = {
  panel: null, dialogs: null, state: null, tactileText: null, trace: null,
  ret: null, metric: null, reduced: false, editable: false,
  lastAction: 'aucune pression observée', returnFocus: 'aucun', backLabel: '',
};

/* E034-10 : garde d'existence pour toute ID préfixée chronology-v2-e034.
   Un nœud déjà présent est réutilisé et déplacé dans le parent courant : la
   coque reconstruisant le stage, un nœud du rendu précédent est détaché et
   n'est pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E034-08 : une seule fonction d'écriture, dédupliquée. */
function write(node, text) {
  if (node && node.textContent !== text) {
    node.textContent = text;
    writes += 1;
  }
}

function setData(node, key, value) {
  if (!node) return;
  const name = `data-e034-${key}`;
  const next = String(value);
  if (node.getAttribute(name) !== next) node.setAttribute(name, next);
}

/* E034-01 : recensement en lecture seule des modales présentes dans le
   document. Aucune création, aucune modification de leur état. */
function collectDialogs() {
  try {
    return Array.from(document.querySelectorAll(DIALOG_SELECTOR));
  } catch {
    return [];
  }
}

/* E034-02 : une modale n'est « active » que si elle est réellement visible. */
function isVisible(node) {
  if (!node || !node.isConnected) return false;
  if (node.hasAttribute('hidden')) return false;
  if (node.getAttribute('aria-hidden') === 'true') return false;
  if (node.tagName === 'DIALOG') return node.open;
  const style = window.getComputedStyle(node);
  return Boolean(style) && style.display !== 'none' && style.visibility !== 'hidden';
}

function describeElement(node) {
  if (!(node instanceof Element)) return 'aucun';
  const id = node.id ? `#${node.id}` : node.tagName.toLowerCase();
  const label = node.getAttribute('aria-label')
    || (node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 48);
  return label ? `${id} — « ${label} »` : id;
}

/* E034-04 : l'équivalent tactile est déduit du DOM existant, sans ajouter
   d'aria-keyshortcuts (déjà porté par le bouton de la coque, cf. E049). */
function findBackLabel() {
  const back = document.getElementById('nav-c2a-back')
    || document.querySelector('[aria-keyshortcuts~="Escape"]');
  if (!back) return 'le bouton « Retour au monde » de la coque';
  const label = (back.getAttribute('aria-label') || (back.textContent || '').trim())
    .replace(/\s+/g, ' ');
  return label ? `« ${label} »` : 'le bouton « Retour au monde » de la coque';
}

/* E034-01 à E034-09 : toute l'état observable est écrit ici, sans région live
   supplémentaire (E041 reste maître des annonces). */
function refresh() {
  const { panel, dialogs, state, tactileText, trace, ret, metric } = refs;
  if (!panel || !panel.isConnected) return;

  const active = collectDialogs().filter(isVisible);
  const hasModal = active.length > 0;
  const mode = hasModal ? 'modal' : 'world';

  setData(panel, 'mode', mode);
  setData(panel, 'dialogs', active.length);
  setData(panel, 'editable', refs.editable ? '1' : '0');
  setData(panel, 'escape-count', escapeCount);
  setData(panel, 'return-focus', refs.returnFocus);
  setData(panel, 'reduced', refs.reduced ? '1' : '0');
  setData(panel, 'renders', installCount);
  setData(panel, 'writes', writes);

  write(dialogs, active.length
    ? `Modales visibles : ${active.map(describeElement).join(' · ')}.`
    : 'Aucune modale visible : Échap concerne le retour au Monde.');
  write(state, hasModal
    ? `Échap : fermer d'abord la modale ${describeElement(active[0])} (action laissée au routeur).`
    : 'Échap : aucune modale à fermer, retour au Monde (bouton tactile équivalent).');
  write(tactileText, `Équivalent tactile : ${refs.backLabel}. La touche n'est pas capturée.`);
  write(trace, `Pressions Échap observées : ${escapeCount} · dernière action : ${refs.lastAction}.`);
  write(ret, `Focus à restaurer après fermeture : ${refs.returnFocus}.`);
  write(metric, `Rendus : ${installCount} · écritures utiles : ${writes} · mouvement réduit : ${refs.reduced ? 'oui' : 'non'}.`);
}

/* E034-03, E034-05, E034-06 : écouteur de capture, purement observationnel.
   Aucun preventDefault, aucun stopPropagation, aucun focus() : le routeur
   (keyboard.js:143-154) ferme la modale ou ramène au Monde à notre place. */
function onKeyDown(event) {
  if (event.key !== 'Escape' && event.key !== 'Esc') return;
  escapeCount += 1;
  const target = event.target;
  const editable = target instanceof Element
    && target.matches('input, textarea, select, [contenteditable="true"], [contenteditable=""]');
  refs.editable = editable;
  const active = collectDialogs().filter(isVisible);
  if (active.length) {
    refs.lastAction = 'modale prioritaire (fermeture laissée au routeur)';
  } else if (editable) {
    refs.lastAction = 'champ éditable : aucun retour au Monde';
  } else {
    refs.lastAction = 'retour au Monde (routeur)';
  }
  if (refs.panel && refs.panel.isConnected) refresh();
}

/* E034-07 : mémorisation du dernier focus hors modale, sans déplacement. */
function onFocusIn(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const insideDialog = collectDialogs().some((node) => node !== target && node.contains(target));
  if (!insideDialog) refs.returnFocus = describeElement(target);
  if (refs.panel && refs.panel.isConnected) refresh();
}

/* E034-02 : rafraîchissement sans timer — un MutationObserver ciblé sur le
   stage, qui ignore nos propres écritures pour éviter toute boucle. */
function watch(root) {
  if (typeof MutationObserver !== 'function' || !root) return;
  if (observer) observer.disconnect();
  observer = new MutationObserver((records) => {
    const panel = refs.panel;
    for (const record of records) {
      const target = record.target;
      if (panel && target instanceof Node && (target === panel || panel.contains(target))) continue;
      refresh();
      return;
    }
  });
  observer.observe(root, {
    attributes: true,
    attributeFilter: ['aria-modal', 'aria-hidden', 'hidden', 'open', 'class', 'style'],
    childList: true,
    subtree: true,
  });
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function') return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const stage = ctx.stage || null;
  const host = document.querySelector('main') || ctx.layout || stage || document.body;
  if (!host) return;

  const panel = ensureNode(make, PANEL_ID, 'section', 'e034-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e034-title', 'Échap : modale d’abord, monde ensuite');
  title.id = TITLE_ID;

  const lede = make('p', 'e034-lede', 'Panneau d’observation : il décrit la priorité de la touche Échap. Il n’intercepte aucune touche, ne ferme aucune modale et ne déplace jamais le focus.');

  const dialogs = make('p', 'e034-block e034-dialogs');
  dialogs.id = DIALOGS_ID;
  const state = make('p', 'e034-block e034-state');
  state.id = STATE_ID;

  const tactile = make('p', 'e034-block e034-tactile');
  tactile.id = TACTILE_ID;
  const tactileText = make('span');
  tactileText.id = TACTILE_TEXT_ID;
  tactile.append(make('kbd', 'e034-kbd', 'Échap'), document.createTextNode(' '), tactileText);

  const trace = make('p', 'e034-block e034-trace');
  trace.id = TRACE_ID;
  const ret = make('p', 'e034-block e034-return');
  ret.id = RETURN_ID;
  const metric = make('p', 'e034-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(title, lede, dialogs, state, tactile, trace, ret, metric);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = {
    panel, dialogs, state, tactileText, trace, ret, metric, reduced,
    editable: false, lastAction: 'aucune pression observée',
    returnFocus: 'aucun', backLabel: findBackLabel(),
  };

  refresh();
  watch(stage || host);

  if (!keyBound) {
    window.VECTEMPOREL_KEYS?.registerScoped?.(() => true, onKeyDown);
    document.addEventListener('focusin', onFocusIn, true);
    keyBound = true;
  }
}

register('E034', install);
