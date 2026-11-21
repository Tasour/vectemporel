import { register } from './registry.js';

/* Lentille E31 — performance de la vue chronologie.
 *
 * Dix chantiers : CSS unique, mesure de latence sans timer, images différées,
 * content-visibility de la liste, confinement de la fiche, passe de
 * lecture/écriture unique, compteurs auditables, panneau live sans console,
 * absence de boucle rAF, mouvement réduit.
 *
 * Invariants vérifiés par le rapport UNIFIED_AUDIT/CHRONOLOGIE/views/E31.md :
 * - aucun journal, aucune requête, aucun aléa, aucune image créée ;
 * - aucune boucle d'animation, aucun timer, aucun observateur d'intersection ;
 * - un seul bloc CSS (chronology-e31), un seul panneau (#chronology-e31-perf),
 *   deux écouteurs de capture enregistrés une seule fois au niveau module ;
 * - aucun fichier partagé modifié : la lentille ne fait qu'observer et annoter
 *   le DOM produit par chronology.js (chronology.js:207-540).
 */

const CSS_ID = 'chronology-e31';
const PANEL_ID = 'chronology-e31-perf';

const CSS = `
@supports (content-visibility: auto) {
  #atlas-chrono-events > li {
    content-visibility: auto;
    contain-intrinsic-size: 96px;
  }
}
#atlas-chrono-aside { contain: layout style; }
#${PANEL_ID} {
  margin:0 0 10px; padding:5px 8px;
  border:1px solid var(--line); border-radius:6px;
  color:var(--muted-2); font-size:9px; line-height:1.5;
  font-variant-numeric:tabular-nums;
}
@media (prefers-reduced-motion: reduce) {
  #atlas-chrono-events .event-card,
  #atlas-chrono-aside button { transition:none !important; }
}`;

let installs = 0;
let interactions = 0;
let panel = null;
let pendingAt = null;
let lastLatency = null;
let captureHooked = false;

/* Horloge monotone quand elle existe, repli déterministe sinon. Aucun aléa. */
function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

/* Unique point d'observation des interactions qui déclenchent un rendu :
 * capture au niveau document, avant les handlers de chronology.js. L'horodatage
 * est consommé au prochain install(), c'est-à-dire à la fin du même rendu
 * synchrone (store.js:emit → shell.js:529) : aucune boucle, aucun timer. */
function observeInteraction(event) {
  if (!event || !event.target) return;
  const target = event.target;
  let relevant = false;
  if (event.type === 'input') {
    relevant = target.id === 'atlas-chrono-search';
  } else if (typeof target.closest === 'function') {
    relevant = Boolean(target.closest(
      '[data-tag], .era-band, .event-card, .aside-actions button, #nav-c2a-back'
    ));
  }
  if (!relevant) return;
  interactions += 1;
  pendingAt = now();
}

/* Le panneau de mesure vit dans #atlas-chrono-main (flux normal), pas dans
 * .chronology-layout (grille) : aucun effet sur la disposition existante. */
function ensurePanel(ctx, host) {
  if (panel && panel.isConnected && panel.parentElement === host) return panel;
  const existing = host.querySelector(`#${PANEL_ID}`);
  if (existing) {
    panel = existing;
    return panel;
  }
  panel = ctx.el('p', 'chronology-e31-perf');
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'status');
  panel.setAttribute('aria-live', 'polite');
  panel.setAttribute('aria-atomic', 'true');
  host.appendChild(panel);
  return panel;
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const stage = ctx.stage;
  const layout = ctx.layout;
  if (!stage || !stage.isConnected || !layout || !layout.isConnected) return;

  ctx.css(CSS_ID, CSS);
  installs += 1;

  if (pendingAt !== null) {
    lastLatency = Math.max(0, now() - pendingAt);
    pendingAt = null;
  }

  if (!captureHooked) {
    captureHooked = true;
    document.addEventListener('input', observeInteraction, true);
    document.addEventListener('click', observeInteraction, true);
  }

  /* Une seule passe de lecture : les listes sont rassemblées avant toute
   * écriture. Aucun appel à getBoundingClientRect / offsetWidth / scrollHeight :
   * pas de reflow forcé, pas d'alternance lecture-écriture. */
  const cards = Array.prototype.slice.call(layout.querySelectorAll('#atlas-chrono-events > li'));
  const images = Array.prototype.slice.call(layout.querySelectorAll('img'));
  const points = layout.querySelectorAll('#atlas-chrono-aside .point').length;
  let marked = 0;

  cards.forEach((card) => {
    card.dataset.e31Card = '1';
  });
  images.forEach((image) => {
    if (image.getAttribute('loading') !== 'lazy') {
      image.setAttribute('loading', 'lazy');
      marked += 1;
    }
    if (image.getAttribute('decoding') !== 'async') image.setAttribute('decoding', 'async');
    image.dataset.e31Deferred = '1';
  });

  const reduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false;
  layout.dataset.e31Renders = String(installs);
  layout.dataset.e31Interactions = String(interactions);
  layout.dataset.e31Cards = String(cards.length);
  layout.dataset.e31Points = String(points);
  layout.dataset.e31Images = String(images.length);
  layout.dataset.e31Deferred = String(marked);
  layout.dataset.e31Motion = reduced ? 'reduced' : 'full';
  layout.dataset.e31Latency = lastLatency === null ? 'na' : lastLatency.toFixed(1);

  const host = layout.querySelector('#atlas-chrono-main') || layout;
  const readout = ensurePanel(ctx, host);
  const latency = lastLatency === null ? 'non mesurée' : `${lastLatency.toFixed(1)} ms`;
  readout.textContent = `E31 · rendus ${installs} · interactions ${interactions} · cartes ${cards.length} · points ${points} · images différées ${marked}/${images.length} · dernier rendu ${latency} · mouvement ${reduced ? 'réduit' : 'normal'}.`;
}

register('E31', install);
