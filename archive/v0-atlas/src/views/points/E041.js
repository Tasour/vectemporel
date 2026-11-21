import { register } from './registry.js';

/* Lentille E041 — Accessibilité & ARIA : région live unique pour les annonces
 * (domaine E). Rapport : UNIFIED_AUDIT/POINTS/views/E041.md — E041-01 à E041-10.
 *
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque,
 * styles.css et les autres lentilles ne sont ni édités ni doublés. Le ctx de la
 * vue Points n'expose pas say() (points.js:126 appelle runEnhancements avec
 * viewId, stage, layout seulement) : E041 fournit donc UN seul point d'écriture
 * audible, persistant hors du stage, et le publie comme pont coopératif.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion
 * (points/registry.js:28-44). Aucune dépendance vers le store, le routeur ou
 * un jeu de données importé : chaque phrase est dérivée du DOM rendu.
 *
 * Invariants :
 * - un seul CSS, une seule région live, une seule fonction d'écriture ;
 * - un seul MutationObserver, ciblé sur le layout, jamais sur la région live ;
 * - aucune région d'autrui n'est modifiée, aucun gestionnaire n'est retiré ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*,
 *   zéro innerHTML, aucun vol de focus, aucune touche globale.
 */

const CSS_ID = 'points-e041';
const LIVE_ID = 'points-e041-live';
const BRIDGE_KEY = 'VECTEMPOREL_POINTS_LIVE';
const LIVE_CLASS = 'points-e041-live';

/* La région est masquée à la vue, PAS à l'arbre d'accessibilité : ni
 * display:none, ni visibility:hidden, ni hidden, ni aria-hidden. Le clip
 * rect() couvre les lecteurs d'écran anciens, clip-path les récents. */
const CSS = `
  #${LIVE_ID} {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%);
    white-space: nowrap; border: 0;
  }
`;

let liveNode = null;          // unique nœud annonceur, réutilisé entre rendus
let observer = null;          // unique MutationObserver, déconnecté/reconnecté
let currentCtx = null;        // dernier ctx reçu (jamais une copie figée)
let lastLayout = null;        // détection de rendu neuf par identité de nœud
let lastSignature = '';       // signature de l'état annonçable déjà traité
let lastMessage = '';         // dédup exacte du dernier texte écrit
let announceCount = 0;        // compteur auditable, hors région live
let internalCount = 0;        // annonces produites par E041 lui-même
let bridgeCount = 0;          // annonces reçues via le pont coopératif

function makeNode(ctx) {
  if (ctx && typeof ctx.el === 'function') return ctx.el('p', LIVE_CLASS, '');
  return document.createElement('p');
}

/* E041-01/02/03 : création paresseuse, garde d'existence, rattachement au
 * document.body pour survivre au re-render du stage (shell.js / points.js).
 * Un nœud identifié trouvé ailleurs est RAPPATRIÉ, jamais supprimé. */
function ensureLive(ctx) {
  let live = document.getElementById(LIVE_ID);
  if (!live) {
    live = makeNode(ctx);
    live.id = LIVE_ID;
    live.textContent = '';
    document.body.appendChild(live);
  }
  if (live.parentNode !== document.body) document.body.appendChild(live);
  if (live.getAttribute('role') !== 'status') live.setAttribute('role', 'status');
  if (live.getAttribute('aria-live') !== 'polite') live.setAttribute('aria-live', 'polite');
  if (live.getAttribute('aria-atomic') !== 'true') live.setAttribute('aria-atomic', 'true');
  if (live.getAttribute('aria-relevant') !== 'text') live.setAttribute('aria-relevant', 'text');
  if (live.hasAttribute('aria-hidden')) live.removeAttribute('aria-hidden');
  if (live.hasAttribute('hidden')) live.removeAttribute('hidden');
  if (live.dataset.pointsE041 !== 'live') live.dataset.pointsE041 = 'live';
  liveNode = live;
  return live;
}

function mirror(ctx) {
  const layout = ctx && ctx.layout && ctx.layout.isConnected ? ctx.layout : lastLayout;
  if (!layout || !layout.dataset) return;
  layout.dataset.pointsE041Count = String(announceCount);
  layout.dataset.pointsE041Internal = String(internalCount);
  layout.dataset.pointsE041Bridge = String(bridgeCount);
  layout.dataset.pointsE041Last = lastMessage;
  if (liveNode && liveNode.dataset) liveNode.dataset.pointsE041Count = String(announceCount);
}

/* E041-04 : L'unique écriture audible du module. textContent seulement ;
 * le même texte n'est jamais réécrit (dédup), ce qui évite le bavardage. */
function say(message, origin) {
  const text = String(message == null ? '' : message).trim();
  if (!text || text === lastMessage) return false;
  const live = ensureLive(currentCtx);
  if (!live || !live.isConnected) return false;
  lastMessage = text;
  announceCount += 1;
  if (origin === 'bridge') bridgeCount += 1;
  else internalCount += 1;
  live.textContent = text;
  mirror(currentCtx);
  return true;
}

/* E041-08 : pont opt-in. Aucun fichier partagé n'est édité : les autres
 * lentilles PEUVENT converger vers la même région sans toucher la leur. Un
 * objet étranger déjà publié sous la même clé n'est jamais écrasé. */
function publishBridge() {
  if (typeof window === 'undefined') return;
  const existing = window[BRIDGE_KEY];
  if (existing && existing.source === 'points-e041') return;
  if (existing) return;
  window[BRIDGE_KEY] = Object.freeze({
    source: 'points-e041',
    id: LIVE_ID,
    say: (message) => say(message, 'bridge'),
  });
}

function activeEra(layout) {
  const row = layout && typeof layout.querySelector === 'function'
    ? layout.querySelector('.points-grid-row.is-active') : null;
  const button = row && row.querySelector ? row.querySelector('.points-era') : null;
  const name = button ? String(button.textContent || '').trim() : '';
  let count = 0;
  if (row && row.querySelectorAll) {
    row.querySelectorAll('.points-cell.has-points').forEach((cell) => {
      const value = Number.parseInt(String(cell.textContent || '').trim(), 10);
      if (Number.isFinite(value) && value > 0) count += value;
    });
  }
  return { name, count };
}

/* E041-05 : aucune date, aucun total, aucun libellé historique codé en dur.
 * Le nom et le compte viennent des nœuds réellement rendus par points.js. */
function buildMessage(era) {
  if (!era.name) return '';
  const plural = era.count === 1 ? '' : 's';
  return `Ère ${era.name} sélectionnée : ${era.count} point${plural} dans cette ligne de la matrice.`;
}

/* E041-06/07 : un seul observateur, ciblé sur le layout et ses attributs de
 * ligne active. La région live vit dans body : elle n'est jamais observée,
 * donc aucune boucle écriture → mutation → écriture. Signature + garde
 * d'onglet masqué : aucune phrase redondante, aucun bavardage différé. */
function reconcile(ctx, fromObserver) {
  if (!ctx || !ctx.layout) return;
  const era = activeEra(ctx.layout);
  const signature = `${era.name}|${era.count}`;
  if (signature === lastSignature) return;
  const first = lastSignature === '';
  lastSignature = signature;
  if (ctx.layout.dataset) {
    ctx.layout.dataset.pointsE041Trigger = fromObserver ? 'observer' : 'render';
  }
  if (first) return;
  /* L'annonce a lieu dès que l'état change, que ce soit au rendu (points.js)
   * ou sur mutation in-place : fromObserver ne fait que qualifier l'origine. */
  if (typeof document !== 'undefined' && document.hidden) return;
  const message = buildMessage(era);
  if (message) say(message, 'internal');
}

function observe(ctx) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  observer = null;
  if (typeof MutationObserver === 'undefined' || !ctx.layout) return;
  observer = new MutationObserver(() => {
    if (currentCtx) reconcile(currentCtx, true);
  });
  observer.observe(ctx.layout, {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
}

register('E041', (ctx) => {
  if (!ctx || ctx.viewId !== 'points' || !ctx.layout) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  currentCtx = ctx;
  const fresh = ctx.layout !== lastLayout;
  lastLayout = ctx.layout;

  /* E041-10 : une seule feuille (cssOnce de registry.js:13-19) et un seul
   * marqueur de portée, réappliqués sans doublon à chaque rendu. */
  ctx.css(CSS_ID, CSS);
  ctx.layout.dataset.pointsE041 = CSS_ID;
  ctx.layout.dataset.pointsE041Motion =
    typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() ? 'reduce' : 'normal';

  ensureLive(ctx);
  publishBridge();
  observe(ctx);
  reconcile(ctx, false);

  /* E041-09 : mesure honnête du nombre total de régions annonçantes du
   * document. E041 garantit LA SIENNE ; le chiffre rend visible l'héritage
   * des autres lentilles sans jamais toucher à leurs nœuds. */
  if (fresh && ctx.layout.dataset) {
    ctx.layout.dataset.pointsE041LiveCount = String(document.querySelectorAll(
      '[aria-live], [role="status"], [role="alert"], [role="log"]'
    ).length);
  }
  mirror(ctx);
});
