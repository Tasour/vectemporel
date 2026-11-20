import { register } from './registry.js';

/* Lentille E041 — passe V2, domaine E (accessibilité & ARIA).
 * Thème : région live unique pour les annonces.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E041.md — chantiers E041-01 à E041-10.
 * Fichier possédé : src/views/chronology/v2/E041.js uniquement. Lectures seules :
 * src/views/chronology/E049.js et UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md.
 * Aucun fichier partagé (registry.js, index.js, styles.css, chronology.js) n'est modifié.
 *
 * Constat hérité du modèle passe 1 (E049.md:57-64) : la vue compte déjà trois
 * régions live concurrentes (keyboard.js:75-108, chronology.js:119-138,
 * shell.js:181-186) et le registre n'expose aucun say() (registry.js:28-37).
 * La lentille ne supprime ni ne double ces régions : elle fournit UN canal
 * d'annonce unique, nommé, dédupliqué, dont elle est l'unique écrivain, et elle
 * signale les régions tierces sans jamais y écrire.
 *
 * Invariants :
 * - un seul register('E041', install), un seul ctx.css('chronology-v2-e041', …) ;
 * - une seule région live possédée (#chronology-v2-e041-live), role="status",
 *   aria-live="polite", aria-atomic="true", aria-labelledby renseigné ;
 * - une seule fonction d'annonce (announce), dédupliquée par write() ;
 * - IDs préfixés chronology-v2-e041- avec garde d'existence (ensureNode) ;
 * - zéro console.*, fetch/XHR, Math.random, innerHTML, timer, rAF, boucle d'écoute.
 */

const CSS_ID = 'chronology-v2-e041';
const PANEL_ID = 'chronology-v2-e041-panel';
const TITLE_ID = 'chronology-v2-e041-title';
const DESC_ID = 'chronology-v2-e041-desc';
const LIVE_ID = 'chronology-v2-e041-live';
const METRIC_ID = 'chronology-v2-e041-metric';
const PEERS_ID = 'chronology-v2-e041-peers';
const MAIN_ID = 'atlas-chrono-main';
const SEARCH_ID = 'atlas-chrono-search';
const TOOLS_ID = 'atlas-chrono-tools';

/* E041-01, E041-02, E041-09 : une seule feuille injectée une fois. Le bandeau
   d'annonce est visible (alternative textuelle sans CSS, E041-09) mais discret ;
   il n'ajoute aucun arrêt Tab et ne recouvre ni la frise ni la fiche. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e041-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e041-desc { margin: 0 0 8px; color: var(--muted); }
  #${LIVE_ID} {
    margin: 0 0 8px; padding: 7px 9px;
    border: 1px solid var(--line-strong); border-radius: 6px;
    background: rgba(255,255,255,.04); color: var(--gold-bright);
    font-size: 11px; font-weight: 600;
  }
  #${LIVE_ID}:empty::before {
    content: "Aucune annonce pour l’instant."; color: var(--muted-2); font-weight: 400;
  }
  #${PANEL_ID} .e041-metric,
  #${PANEL_ID} .e041-peers { margin: 5px 0 0; color: var(--muted-2); font-size: 9px; }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 9px 10px 10px; }
    #${LIVE_ID} { font-size: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, #${LIVE_ID} { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${LIVE_ID} {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e041-title,
    #${PANEL_ID} .e041-desc,
    #${PANEL_ID} .e041-metric,
    #${PANEL_ID} .e041-peers { color: CanvasText; }
  }
`;

let installCount = 0;
let announceCount = 0;
let avoidedCount = 0;
let lastMessage = '';
let refs = { panel: null, live: null, metric: null, peers: null, reduced: false };

/* E041-10 : garde d'existence pour toute ID préfixée. Un nœud déjà présent est
   réutilisé et déplacé dans le parent courant : la coque reconstruisant #app,
   un nœud de la rendu précédent est détaché et n'est pas retrouvé par
   getElementById, tandis qu'un nœud survivant est réemployé sans doublon. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E041-03 : unique point d'écriture. write() ne touche au texte que s'il diffère :
   deux rafraîchissements sans changement ne produisent aucune mutation. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function textOf(node) {
  return node ? (node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60) : '';
}

function one(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

/* E041-06 : lecture du périmètre courant depuis le DOM / dataset, jamais de
   date ni de chiffre codé en dur. Recherche, puces actives, cartes et ères
   visibles sont dérivés de l'état réel du stage. */
function readState(ctx) {
  const root = ctx && ctx.stage ? ctx.stage : document;
  const search = document.getElementById(SEARCH_ID) || one(root, `#${SEARCH_ID}`);
  const tools = document.getElementById(TOOLS_ID) || one(root, `#${TOOLS_ID}`);
  const query = search && search.value ? search.value.trim() : '';
  const activeTags = tools
    ? tools.querySelectorAll('.atlas-chrono-tag[aria-pressed="true"], [data-e041-filter][aria-pressed="true"]')
    : [];
  const cards = root.querySelectorAll ? root.querySelectorAll('.event-card').length : 0;
  const eras = root.querySelectorAll ? root.querySelectorAll('.era-band').length : 0;
  const currentEra = one(root, '.era-band[aria-current], .era-band[aria-pressed="true"]');
  return {
    query,
    tags: activeTags.length,
    tagLabels: Array.prototype.map.call(activeTags, textOf).filter(Boolean),
    cards,
    eras,
    eraLabel: textOf(currentEra),
  };
}

/* E041-06 et E041-07 : une seule phrase de synthèse, reproduite mot pour mot
   d'un rendu à l'autre quand l'état ne change pas — condition du dédup E041-03. */
function composeMessage(state) {
  const parts = [
    state.query ? `recherche « ${state.query} »` : 'aucune recherche active',
    state.tags ? `${state.tags} filtre(s) actif(s)` : 'aucun filtre de type actif',
    `${state.cards} repère(s) affiché(s)`,
    `${state.eras} ère(s) sur la frise`,
  ];
  if (state.eraLabel) parts.push(`ère courante : ${state.eraLabel}`);
  return `Périmètre de la frise : ${parts.join(' · ')}.`;
}

/* E041-03 et E041-04 : une seule fonction d'annonce, une seule région écrite,
   aucun empilement de nœuds (aria-atomic remplace tout le contenu). Les doublons
   sont comptés mais non écrits : c'est la preuve observable de l'anti-bavardage. */
function announce(message) {
  if (!message) return false;
  if (message === lastMessage) {
    avoidedCount += 1;
    return false;
  }
  lastMessage = message;
  announceCount += 1;
  write(refs.live, message);
  if (refs.live) refs.live.dataset.e041Seq = String(announceCount);
  return true;
}

/* E041-08 : recensement en lecture seule des régions live tierces. La lentille
   ne leur écrit jamais ; elle publie seulement leur nombre et leurs repères. */
function detectPeers() {
  const nodes = Array.prototype.slice.call(
    document.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]')
  );
  return nodes.filter((node) => node.id !== LIVE_ID && !node.closest(`#${PANEL_ID}`));
}

function describePeers(peers) {
  if (!peers.length) return 'Régions live tierces détectées : aucune ; ce bandeau est le seul canal de la lentille.';
  const labels = peers.map((node) => (node.id ? `#${node.id}` : `<${node.tagName.toLowerCase()}>`));
  return `Régions live tierces détectées : ${peers.length} (${labels.join(', ')}). La lentille n’y écrit jamais.`;
}

/* E041-01, E041-05, E041-06, E041-07, E041-09, E041-10 : rafraîchissement
   synchrone, sans timer ni observateur. Tout l'état est publié en données et
   en texte visible, dédupliqué par write(). */
function refresh(state) {
  const { panel, metric, peers, reduced } = refs;
  if (!panel || !panel.isConnected) return;
  const peerList = detectPeers();
  write(metric, `Installations : ${installCount} · annonces émises : ${announceCount} · écritures redondantes évitées : ${avoidedCount}.`);
  write(peers, describePeers(peerList));
  panel.dataset.e041Installs = String(installCount);
  panel.dataset.e041Announces = String(announceCount);
  panel.dataset.e041Avoided = String(avoidedCount);
  panel.dataset.e041Peers = String(peerList.length);
  panel.dataset.e041Reduced = reduced ? '1' : '0';
  panel.dataset.e041Cards = String(state.cards);
  panel.dataset.e041Eras = String(state.eras);
}

function install(ctx) {
  if (!ctx || typeof ctx.el !== 'function' || typeof ctx.css !== 'function') return;
  const make = ctx.el;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const root = ctx.stage || document;
  const main = one(root, `#${MAIN_ID}`) || document.getElementById(MAIN_ID) || ctx.layout || root;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e041-panel', main);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.setAttribute('aria-describedby', DESC_ID);

  const title = make('h2', 'e041-title', 'Annonces de la frise');
  title.id = TITLE_ID;

  const desc = make('p', 'e041-desc', 'Canal d’annonce unique de la vue : une seule région live, nommée, dédupliquée. Les changements de périmètre et de repère y sont récapitulés sans doubler les régions du routeur, de la vue ou de la coque.');
  desc.id = DESC_ID;

  const live = make('div', 'e041-live');
  live.id = LIVE_ID;
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  live.setAttribute('aria-labelledby', TITLE_ID);

  const metric = make('p', 'e041-metric');
  metric.id = METRIC_ID;
  const peers = make('p', 'e041-peers');
  peers.id = PEERS_ID;

  panel.replaceChildren(title, desc, live, metric, peers);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { panel, live, metric, peers, reduced };

  const state = readState(ctx);
  announce(composeMessage(state));
  refresh(state);
}

register('E041', install);
