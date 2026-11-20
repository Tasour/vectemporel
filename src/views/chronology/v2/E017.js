import { register } from './registry.js';

/* Lentille V2 E017 — signal de filtre conservé entre rendus
 * (domaine B : filtres & périmètre de la vue Chronologie).
 *
 * Thème : UNIFIED_AUDIT/CHRONOLOGIE/V2/themes.json, clé E017 (ligne 19).
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E017.md — chantiers E017-01 à E017-10.
 * Fichier possédé : src/views/chronology/v2/E017.js uniquement. Aucun fichier
 * partagé (registry.js, index.js, styles.css, chronology.js) n'est modifié.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Le registre
 * V2 ne fournit pas say() : la lentille n'ajoute AUCUNE région live, n'écrit
 * dans aucune région existante et se contente d'afficher son état en texte
 * visible, dédupliqué, hors aria-live.
 *
 * Invariants :
 * - un seul register('E017', install), un seul ctx.css('chronology-v2-e017', …) ;
 * - un seul panneau, une seule feuille, des IDs tous préfixés chronology-v2-e017-
 *   avec garde d'existence (idempotence multi-rendus) ;
 * - aucune valeur aléatoire : empreinte FNV-1a déterministe, sans tirage au sort ;
 * - aucun timer, aucune boucle rAF, aucun réseau, aucune journalisation,
 *   aucun HTML brut (createElement / textContent / replaceChildren uniquement).
 */

const CSS_ID = 'chronology-v2-e017';
const PANEL_ID = 'chronology-v2-e017-panel';
const TITLE_ID = 'chronology-v2-e017-title';
const STATE_ID = 'chronology-v2-e017-state';
const FINGERPRINT_ID = 'chronology-v2-e017-fingerprint';
const RENDER_ID = 'chronology-v2-e017-render';
const VERDICT_ID = 'chronology-v2-e017-verdict';
const RESTORED_ID = 'chronology-v2-e017-restored';
const HISTORY_ID = 'chronology-v2-e017-history';
const LOSS_ID = 'chronology-v2-e017-loss';
const RESET_ID = 'chronology-v2-e017-reset';
const NOTE_ID = 'chronology-v2-e017-note';

/* Lectures seules des ID de la vue (documentés par E049.md:4 et :23-41). */
const MAIN_ID = 'atlas-chrono-main';
const TOOLS_ID = 'atlas-chrono-tools';
const SEARCH_ID = 'atlas-chrono-search';

/* E017-01, E017-09, E017-10 : une seule feuille injectée une fois par ctx.css.
   Le panneau reste un bloc en flux normal en fin de colonne : ni modale, ni
   superposition, ni tabindex ajouté — il ne masque ni la frise ni la fiche. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e017-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e017-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e017-state { color: var(--gold-bright); }
  #${PANEL_ID} .e017-fingerprint { color: var(--muted); }
  #${PANEL_ID} .e017-render,
  #${PANEL_ID} .e017-restored,
  #${PANEL_ID} .e017-loss,
  #${PANEL_ID} .e017-reset,
  #${PANEL_ID} .e017-note { margin: 5px 0 0; color: var(--muted-2); font-size: 9px; }
  #${PANEL_ID} .e017-verdict { margin: 6px 0 0; color: var(--ink-soft); }
  #${PANEL_ID} .e017-verdict[data-verdict="conservé"] { color: var(--gold-bright); }
  #${PANEL_ID} .e017-loss[data-loss="1"] { color: var(--gold-bright); }
  #${PANEL_ID} .e017-history {
    margin: 5px 0 0; padding: 0 0 0 16px;
    color: var(--muted); font-size: 9px;
  }
  #${PANEL_ID} .e017-history-item { margin: 1px 0; }
  @media (max-width: 620px) {
    #${PANEL_ID} .e017-history { padding-left: 12px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e017-title,
    #${PANEL_ID} .e017-state,
    #${PANEL_ID} .e017-verdict,
    #${PANEL_ID} .e017-loss { color: CanvasText; }
  }
`;

/* État module : survit à la reconstruction de la coque (shell.js:533, documenté par
   E049.md:41) car le module n'est pas ré-importé entre deux rendus. */
let installCount = 0;
let renderCount = 0;
let lastRenderFingerprint = null;
let currentVerdict = 'premier relevé';
let restoredCount = 0;
let previousHadSignal = false;
let lossCount = 0;
let lossFlag = false;
let resetCount = 0;
let resetObserved = false;
let history = [];
let lastStageLabel = 'aucun';
let refs = {
  panel: null, state: null, fingerprintNode: null, renderNode: null, verdictNode: null,
  restoredNode: null, historyNode: null, lossNode: null, resetNode: null,
  note: null, reduced: false, viewId: 'chronologyv2',
};

/* E017-10 : garde d'existence pour toute ID préfixée chronology-v2-e017-. */
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

/* E017-02 : lecture canonique et déterministe du signal de filtre. La recherche
   est lue dans #atlas-chrono-search (chronology.js:312-325, E049.md:32-34) et
   les puces actives sont lues dans les boutons aria-pressed / .is-active
   (chronology.js:338, :452, E049.md:34). Aucune donnée n'est inventée. */
function readSignal() {
  const search = document.getElementById(SEARCH_ID);
  const query = search && typeof search.value === 'string' ? search.value.trim() : '';
  const types = [];
  const scopes = [
    document.getElementById(TOOLS_ID),
    document.getElementById(MAIN_ID),
  ].filter(Boolean);
  const selector = 'button[aria-pressed="true"], button.is-active, button.active, button[data-active="true"]';
  scopes.forEach((root) => {
    root.querySelectorAll(selector).forEach((node) => {
      const raw = node.getAttribute('aria-label') || node.getAttribute('value') ||
        (node.textContent || '').trim() || node.id || node.tagName;
      const label = String(raw).trim();
      if (label && types.indexOf(label) === -1) types.push(label);
    });
  });
  types.sort();
  return {
    query,
    types,
    hasSignal: query !== '' || types.length > 0,
    text: `q=${query}|types=${types.join(',')}`,
  };
}

/* E017-03 : empreinte FNV-1a 32 bits, stable et reproductible (aucun aléa). */
function fingerprint(text) {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/* E017-07 : journal borné des cinq derniers rendus, reconstruit à partir de
   données uniquement dérivées du DOM et de l'état module. */
function renderHistory(list, make) {
  const key = history.map((entry) => `${entry.render}:${entry.fp}:${entry.verdict}`).join('|');
  if (list.dataset.e017HistoryKey === key) return;
  list.dataset.e017HistoryKey = key;
  const items = history.map((entry) => make('li', 'e017-history-item',
    `Rendu ${entry.render} — empreinte ${entry.fp} — ${entry.verdict}.`));
  list.replaceChildren(...items);
}

/* E017-01, E017-04, E017-05, E017-06, E017-08, E017-09, E017-10 : rafraîchissement
   de tous les témoins. fromRender=true signale un nouveau passage d'install(). */
function refresh(fromRender) {
  const { panel, state, fingerprintNode, renderNode, verdictNode, restoredNode,
    historyNode, lossNode, resetNode, note, reduced } = refs;
  if (!panel || !panel.isConnected) return;

  const signal = readSignal();
  const fp = fingerprint(signal.text);
  const hasSignal = signal.hasSignal;

  if (fromRender) {
    if (lastRenderFingerprint === null) {
      currentVerdict = 'premier relevé';
    } else if (fp === lastRenderFingerprint) {
      currentVerdict = 'conservé';
      restoredCount += 1;
    } else {
      currentVerdict = 'modifié';
    }
    lastRenderFingerprint = fp;
    history.unshift({ render: renderCount, fp, verdict: currentVerdict });
    if (history.length > 5) history.length = 5;
  }

  /* E017-08 : une disparition de signal sans réinitialisation explicite est
     comptée comme perte silencieuse. */
  lossFlag = !hasSignal && previousHadSignal && !resetObserved;
  if (lossFlag) lossCount += 1;
  previousHadSignal = hasSignal;

  /* E017-09 : la réinitialisation explicite est consommée ici, une seule fois. */
  if (resetObserved) {
    resetCount += 1;
    resetObserved = false;
  }

  const typeLabel = signal.types.length ? signal.types.join(' · ') : 'aucune';
  write(state, `Signal courant — recherche « ${signal.query || 'vide'} » ; puces actives : ${typeLabel}.`);
  write(fingerprintNode, `Empreinte du signal : ${fp} (FNV-1a déterministe).`);
  write(renderNode, `Rendus observés : ${renderCount} · stage : ${lastStageLabel} · vue : ${refs.viewId || 'chronologyv2'}.`);
  write(verdictNode, `Après rendu : signal ${currentVerdict}.`);
  write(restoredNode, `Restaurations confirmées : ${restoredCount}.`);
  write(lossNode, lossFlag
    ? `Perte silencieuse détectée (total : ${lossCount}) : le signal a disparu sans réinitialisation explicite.`
    : `Pertes silencieuses détectées : ${lossCount}.`);
  write(resetNode, `Réinitialisations explicites observées : ${resetCount}.`);
  write(note, `Témoin non live : aucune annonce ajoutée. Mouvement réduit : ${reduced ? 'oui' : 'non'} ; contraste et 390 px pris en charge par la feuille dédiée.`);

  renderHistory(historyNode, makeNode());

  panel.dataset.e017Renders = String(renderCount);
  panel.dataset.e017Restored = String(restoredCount);
  panel.dataset.e017Verdict = currentVerdict;
  panel.dataset.e017Loss = String(lossCount);
  panel.dataset.e017LossNow = lossFlag ? '1' : '0';
  panel.dataset.e017Reset = String(resetCount);
  panel.dataset.e017Signal = signal.text;
  panel.dataset.e017Fingerprint = fp;
  panel.dataset.e017HasSignal = hasSignal ? '1' : '0';
  panel.dataset.e017Reduced = reduced ? '1' : '0';
  panel.dataset.e017Live = '0';
  panel.dataset.e017Installs = String(installCount);
}

/* Le constructeur ctx.el est conservé dans une closure locale pour rester
   disponible lors des rafraîchissements déclenchés par les événements. */
let boundMake = null;
function makeNode() {
  return boundMake || ((tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  });
}

/* E017-02, E017-09 : un seul point d'écoute délégué par cible fraîche. Les nœuds
   de la vue sont reconstruits à chaque rendu : la garde dataset évite tout
   double attachement si un nœud survit. */
function onViewInput() {
  refresh(false);
}

function onViewClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  const button = target ? target.closest('button') : null;
  if (button) {
    const label = (button.getAttribute('aria-label') || button.textContent || '').trim();
    if (/réinitialis|réinitialiser|reset|effacer|clear/i.test(label)) resetObserved = true;
  }
  refresh(false);
}

function bindEvents() {
  const search = document.getElementById(SEARCH_ID);
  const tools = document.getElementById(TOOLS_ID);
  const main = document.getElementById(MAIN_ID);
  if (search && !search.dataset.e017Bound) {
    search.dataset.e017Bound = '1';
    search.addEventListener('input', onViewInput);
  }
  [tools, main].forEach((root) => {
    if (root && !root.dataset.e017Bound) {
      root.dataset.e017Bound = '1';
      root.addEventListener('click', onViewClick);
    }
  });
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

  const panel = ensureNode(make, PANEL_ID, 'section', 'e017-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e017-title', 'Signal de filtre conservé entre rendus');
  title.id = TITLE_ID;
  const lede = make('p', 'e017-lede', 'Témoin de lecture : il observe le filtre (recherche et puces) et vérifie qu’il survit aux reconstructions du DOM. Il ne modifie aucun contrôle et n’ajoute aucune annonce live.');

  const state = make('p', 'e017-state');
  state.id = STATE_ID;
  const fingerprintNode = make('p', 'e017-fingerprint');
  fingerprintNode.id = FINGERPRINT_ID;
  const renderNode = make('p', 'e017-render');
  renderNode.id = RENDER_ID;
  const verdictNode = make('p', 'e017-verdict');
  verdictNode.id = VERDICT_ID;
  const restoredNode = make('p', 'e017-restored');
  restoredNode.id = RESTORED_ID;
  const historyNode = make('ol', 'e017-history');
  historyNode.id = HISTORY_ID;
  const lossNode = make('p', 'e017-loss');
  lossNode.id = LOSS_ID;
  const resetNode = make('p', 'e017-reset');
  resetNode.id = RESET_ID;
  const note = make('p', 'e017-note');
  note.id = NOTE_ID;

  panel.replaceChildren(title, lede, state, fingerprintNode, renderNode, verdictNode,
    restoredNode, historyNode, lossNode, resetNode, note);

  const stage = ctx.stage;
  lastStageLabel = stage
    ? (stage.id || (stage.tagName ? stage.tagName.toLowerCase() : 'stage'))
    : 'aucun';

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = {
    panel, state, fingerprintNode, renderNode, verdictNode, restoredNode,
    historyNode, lossNode, resetNode, note, reduced, viewId: ctx.viewId,
  };

  refresh(true);
  bindEvents();
}

register('E017', install);
