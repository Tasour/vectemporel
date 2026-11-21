import { register } from './registry.js';

/* Lentille E050 — Gouverneur des régions live et des annonces vocales.
 *
 * La vue possède déjà une région live canonique `#nav-c2a-live`
 * (chronology.js:11, 119-138) et une bande de statut visible sans `role`
 * (chronology.js:244-256). Deux annonces manquent pourtant : le changement de
 * repère (chronology.js:406-409, 515-524) et le changement d'ère au clavier
 * (chronology.js:231, 290). Cette lentille est strictement additive : elle
 * réutilise la région canonique, ne crée un canal de repli que si elle manque,
 * regroupe les messages en une seule microtâche et force la réannonce des
 * messages identiques. Aucun fichier partagé n'est modifié.
 *
 * E050-01 région live unique · E050-02 coalescence microtâche
 * E050-03 réannonce des doublons · E050-04 annonce du repère
 * E050-05 annonce de l'ère clavier · E050-06 statut relié à la liste
 * E050-07 aria-busy sur la liste · E050-08 readout chiffré
 * E050-09 mouvement réduit / zéro timer · E050-10 re-render safe
 *
 * Zéro journalisation, zéro appel réseau, zéro aléa, aucune boucle
 * d'animation propre à la lentille.
 */

const CSS_ID = 'chronology-e050';
const CANONICAL_LIVE_ID = 'nav-c2a-live';
const LIVE_FALLBACK_ID = 'e050-live';
const PANEL_ID = 'e050-panel';
const READOUT_ID = 'e050-readout';
const STATUS_ID = 'atlas-chrono-status';
const LIST_ID = 'atlas-chrono-events';

const CHANTIERS = Object.freeze([
  'E050-01', 'E050-02', 'E050-03', 'E050-04', 'E050-05',
  'E050-06', 'E050-07', 'E050-08', 'E050-09', 'E050-10',
]);

/* Une seule feuille, injectée une fois par cssOnce (registry.js:13-19).
   Les nœuds sont tous domestiqués dans `.chronology-main` : leur parent n'est
   ni `body`, ni `stage`, ni `layout`, donc _diagnostics.js:69-79 ne les masque
   pas malgré le préfixe `e050`. */
const CSS = `
.e050-panel{
  margin:0 0 10px;padding:6px 9px;border:1px solid var(--line);border-radius:8px;
  background:rgba(8,11,16,.55);color:var(--muted);
  font-size:9px;line-height:1.45;font-variant-numeric:tabular-nums;
}
.e050-readout{margin:0}
.e050-sr-only{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
}
@media (max-width:620px){.e050-panel{font-size:8px}}
@media (prefers-reduced-motion:reduce){
  .e050-panel,.e050-readout{transition:none!important;animation:none!important}
}`;

/* État module : toujours réinterrogé à partir du dernier ctx, jamais une
   capture périmée par la reconstruction du stage (shell.js). */
let latest = null;
let applies = 0;
let announces = 0;
let repeats = 0;
let lastWritten = '';
let pending = null;
let flushQueued = false;
let lastSig = null;
let lastCountryId = null;
let lastParts = null;
let bandClickAnnounced = false;
let bandBound = null;
let listObserver = null;
let observedList = null;

function afterCommit(fn) {
  if (typeof queueMicrotask === 'function') queueMicrotask(fn);
  else Promise.resolve().then(fn);
}

function findMain() {
  if (!latest || !latest.stage) return null;
  return latest.stage.querySelector('.chronology-main') || latest.layout || null;
}

/* E050-01 : la région canonique vit hors de #app (chronology.js:119-133) et
   survit au innerHTML de la coque. On ne la déplace jamais. Le repli n'est
   créé que si elle est absente, avec les mêmes attributs. */
function ensureFallback(main) {
  if (!main || typeof latest.el !== 'function') return null;
  let node = main.querySelector(`#${LIVE_FALLBACK_ID}`);
  if (!node) {
    node = latest.el('p', 'e050-sr-only');
    node.id = LIVE_FALLBACK_ID;
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    main.appendChild(node);
  }
  return node;
}

function liveNode() {
  const canonical = document.getElementById(CANONICAL_LIVE_ID);
  if (canonical && canonical.isConnected) return canonical;
  const fallback = document.getElementById(LIVE_FALLBACK_ID);
  if (fallback && fallback.isConnected) return fallback;
  return null;
}

/* E050-02 + E050-03 : une seule microtâche par salve (donc un seul message
   réellement écrit, le dernier), sans timer ni rAF. Un message identique au
   dernier écrit provoque un vidage puis une réécriture en deux microtâches :
   c'est le seul moyen fiable de réveiller un lecteur d'écran quand le texte
   ne change pas (chronology.js:137 pose directement `textContent`). */
function commit(job) {
  const node = liveNode();
  if (!node) return;
  if (node.textContent !== job.text) node.textContent = job.text;
  lastWritten = job.text;
  announces += 1;
}

function scheduleFlush() {
  if (flushQueued) return;
  flushQueued = true;
  afterCommit(() => {
    flushQueued = false;
    const job = pending;
    pending = null;
    if (!job) return;
    if (job.force) {
      repeats += 1;
      const node = liveNode();
      if (node) node.textContent = '';
      afterCommit(() => commit(job));
    } else {
      commit(job);
    }
  });
}

function say(message) {
  const text = String(message == null ? '' : message).trim();
  if (!text) return;
  const force = text === lastWritten || Boolean(pending && pending.force);
  pending = { text, force };
  scheduleFlush();
}

/* E050-04 + E050-05 : la signature est dérivée du DOM réellement rendu —
   `aria-current` des bandes (chronology.js:290) et des cartes (:390), titre de
   la fiche (:423-429) et kicker (:420). Elle est comparée entre deux rendus,
   donc elle couvre aussi les flèches du routeur global, invisibles d'un
   simple écouteur de clic. */
function currentSignature() {
  const main = findMain();
  if (!main) return null;
  const band = main.querySelector('.era-band[aria-current="true"]');
  const card = main.querySelector('.event-card[aria-current="true"]');
  const title = main.querySelector('#atlas-chrono-event-title');
  const kicker = main.querySelector('.aside-kicker');
  return [
    band ? (band.dataset.eraId || '') : '',
    card ? (card.dataset.eventId || '') : '',
    title ? (title.textContent || '').trim() : '',
    kicker ? (kicker.textContent || '').trim() : '',
  ].join('|');
}

function eraMessage(band, main) {
  const bands = main ? [...main.querySelectorAll('.era-band.atlas-chrono-band')] : [];
  const index = bands.indexOf(band) + 1;
  const name = band.firstElementChild ? (band.firstElementChild.textContent || '').trim() : '';
  const range = band.querySelector('.atlas-chrono-era-range');
  return `Ère ${index} sur ${bands.length} — ${name}${range ? ` · ${(range.textContent || '').trim()}` : ''}.`;
}

function eventMessage(card, main) {
  const kicker = main ? main.querySelector('.aside-kicker') : null;
  const year = card.querySelector('.event-year');
  const strong = card.querySelector('strong');
  const name = strong ? (strong.textContent || '').trim() : '';
  const prefix = kicker ? `${(kicker.textContent || '').trim()} — ` : '';
  const yearText = year ? (year.textContent || '').trim() : '';
  return `${prefix}${name}${yearText ? ` · ${yearText}` : ''}.`;
}

/* E050-05 : le clic sur une bande annonce déjà via navSay (chronology.js:301).
   Un écouteur de capture pose un marqueur local pour ne pas doubler l'annonce ;
   il ne stoppe jamais la propagation et meurt avec le stage reconstruit. */
function bindBands(main) {
  const nav = main ? main.querySelector('.atlas-chrono-era-nav') : null;
  if (!nav || bandBound === nav) return;
  bandBound = nav;
  nav.addEventListener('click', (event) => {
    if (event.target && typeof event.target.closest === 'function'
        && event.target.closest('.era-band')) bandClickAnnounced = true;
  }, true);
}

function announceChanges() {
  const main = findMain();
  const sig = currentSignature();
  if (!main || !sig) return;
  const parts = sig.split('|');
  const previous = lastParts;
  lastSig = sig;
  lastParts = parts;
  if (!previous) return; /* muet au premier rendu : jamais d'annonce à la charge */

  const [eraId, eventId] = parts;
  if (eraId !== previous[0] && !bandClickAnnounced) {
    const band = main.querySelector('.era-band[aria-current="true"]');
    if (band) say(eraMessage(band, main));
  }
  if (eventId !== previous[1] || parts[2] !== previous[2]) {
    const card = main.querySelector('.event-card[aria-current="true"]');
    if (card) say(eventMessage(card, main));
  }
}

/* E050-06 : `#atlas-chrono-status` reste du texte visible sans `role` ni
   `aria-live` (chronology.js:244-246) : on ne crée pas un second canal vocal,
   on relie seulement la liste au statut pour qu'il soit lu à la focalisation. */
function linkStatus(main) {
  const list = main ? main.querySelector(`#${LIST_ID}`) : null;
  const status = main ? main.querySelector(`#${STATUS_ID}`) : null;
  if (!list || !status) return;
  const ids = (list.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (!ids.includes(STATUS_ID)) {
    ids.push(STATUS_ID);
    list.setAttribute('aria-describedby', ids.join(' '));
  }
}

/* E050-07 : la liste est reconstruite à chaque filtre (chronology.js:353-414).
   Un seul observateur à la fois, reciblé sur la liste courante ; il marque
   `aria-busy` le temps de la microtâche de coalescence, sans timer. On n'observe
   que `childList` : l'attribut écrit par le greffon ne peut pas boucler. */
function stopWatching() {
  if (listObserver) listObserver.disconnect();
  listObserver = null;
  observedList = null;
}

function watchList(main) {
  const list = main ? main.querySelector(`#${LIST_ID}`) : null;
  if (!list) { stopWatching(); return; }
  if (observedList === list) return;
  stopWatching();
  if (typeof MutationObserver === 'undefined') return;
  observedList = list;
  listObserver = new MutationObserver(() => {
    if (!list.isConnected || list.getAttribute('aria-busy') === 'true') return;
    list.setAttribute('aria-busy', 'true');
    afterCommit(() => {
      if (list.isConnected && list.getAttribute('aria-busy') === 'true') {
        list.removeAttribute('aria-busy');
      }
    });
  });
  listObserver.observe(list, { childList: true });
}

/* E050-08 + E050-09 : panneau de mesure en texte réel, sans `aria-live`
   (role=group seulement). L'état de `ctx.reducedMotion()` est exposé dans le
   DOM et neutralise toute transition éventuelle via la feuille unique. */
function buildPanel(main) {
  if (!main || typeof latest.el !== 'function') return null;
  let panel = main.querySelector(`#${PANEL_ID}`);
  if (!panel) {
    panel = latest.el('div', 'e050-panel');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'État des annonces de la Chronologie');
    const readout = latest.el('p', 'e050-readout');
    readout.id = READOUT_ID;
    panel.appendChild(readout);
    main.appendChild(panel);
  }
  return panel;
}

function updateReadout(panel, ctx, liveId) {
  if (!panel) return;
  const readout = panel.querySelector(`#${READOUT_ID}`);
  if (!readout) return;
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  if (panel.dataset.e050Reduced !== String(reduced ? 1 : 0)) {
    panel.dataset.e050Reduced = reduced ? '1' : '0';
  }
  const regions = document.querySelectorAll(
    '#nav-c2a-live, #e050-live, [aria-live], [role="status"], [role="alert"]'
  ).length;
  const text = `Annonces E050 : ${applies} rendu(s), ${announces} message(s), ${repeats} réannonce(s) · canal vocal : ${liveId || 'aucun'} · régions live détectées : ${regions} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`;
  if (readout.textContent !== text) readout.textContent = text;
}

/* E050-10 : surface de vérification en lecture seule, additivité sans effet
   au rendu — même principle que E40 (E40.js:319-330). */
if (typeof window !== 'undefined') {
  window.VECTEMPOREL_E050 = Object.freeze({
    chantiers: () => CHANTIERS.slice(),
    state: () => Object.freeze({
      applies,
      announces,
      repeats,
      css: typeof document !== 'undefined' && Boolean(document.getElementById(CSS_ID)),
      live: liveNode() ? liveNode().id : '',
      panels: typeof document === 'undefined' ? 0 : document.querySelectorAll(`#${PANEL_ID}`).length,
      fallbacks: typeof document === 'undefined' ? 0 : document.querySelectorAll(`#${LIVE_FALLBACK_ID}`).length,
    }),
  });
}

register('E050', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.el !== 'function') return;
  latest = ctx;
  applies += 1;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);

  const main = findMain();
  if (!main) return;

  /* E050-10 : au changement de pays, la première signature est muette. */
  const countryId = ctx.layout && ctx.layout.dataset ? (ctx.layout.dataset.countryId || '') : '';
  if (countryId !== lastCountryId) {
    lastCountryId = countryId;
    lastSig = null;
    lastParts = null;
  }

  /* E050-01 : réutilisation de la région canonique, repli seulement si besoin. */
  const canonical = document.getElementById(CANONICAL_LIVE_ID);
  if (!canonical || !canonical.isConnected) ensureFallback(main);
  const active = liveNode();

  /* E050-04 / E050-05 : détection des changements depuis le DOM rendu. */
  bindBands(main);
  announceChanges();
  afterCommit(() => { bandClickAnnounced = false; });

  /* E050-06 / E050-07 : statut relié, liste marquée pendant le rendu. */
  linkStatus(main);
  watchList(main);

  /* E050-08 / E050-09 : panneau de mesure, jamais une région live de plus. */
  updateReadout(buildPanel(main), ctx, active ? active.id : '');
});
