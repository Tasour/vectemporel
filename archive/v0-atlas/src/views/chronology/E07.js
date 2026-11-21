import { register } from './registry.js';

/* Lentille E07 — Transitions de la vue chronologie (ères, repères, filtres, vues, focus).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/views/E07.md (chantiers E07-01 à E07-10).
 * Lectures seules : src/views/chronology.js, src/views/chronology/registry.js.
 * Aucun fichier partagé modifié, aucun appel réseau, aucune source aléatoire,
 * aucune sortie de débogage, aucun timer ni boucle d'animation : le greffon
 * est purement réactif.
 *
 * La coque reconstruisant tout le DOM à chaque `set()`, le panneau de mesure est
 * recréé à chaque rendu tandis que les compteurs vivent au niveau module.
 * Un seul jeu d'écouteurs délégués sur `document`, sous garde, survit aux rendus.
 */

const CSS_ID = 'chronology-e07';
const PANEL_ID = 'chronology-e07-transitions';

/* E07-08 / E07-09 : transitions visuelles mesurées et neutralisables. Les
   règles ne portent aucune information par la seule couleur : l'état est
   toujours doublé d'un `aria-current`, d'un `data-e07-motion` et du readout. */
const CSS = `
  #${PANEL_ID} {
    position: absolute; left: 12px; bottom: 10px; z-index: 5;
    max-width: min(320px, 46vw); margin: 0; padding: 6px 9px;
    border: 1px solid var(--line); border-radius: 8px;
    background: rgba(8, 11, 16, .86); color: var(--muted);
    font-size: 10px; line-height: 1.45; font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  .chronology-layout .era-band,
  .chronology-layout .event-card,
  .chronology-layout .atlas-chrono-tag {
    transition: border-color .18s ease, box-shadow .18s ease,
                background-color .18s ease, color .18s ease;
  }
  .chronology-layout .era-band:active,
  .chronology-layout .event-card:active { transform: translateY(1px); }
  .chronology-layout .era-band:focus-visible,
  .chronology-layout .event-card:focus-visible,
  .chronology-layout .atlas-chrono-tag:focus-visible,
  .chronology-layout #nav-c2a-back:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .chronology-layout .era-band,
    .chronology-layout .event-card,
    .chronology-layout .atlas-chrono-tag {
      transition: none !important; transform: none !important;
    }
  }
`;

/* Compteurs de transitions — état module, survivant aux reconstructions du
   DOM (chronology.js:207-541). Aucune source aléatoire, aucun timer. */
let eraTransitions = 0;
let eventTransitions = 0;
let filterTransitions = 0;
let viewTransitions = 0;
let focusRestores = 0;
let lastTransition = 'aucune';

let panel = null;
let clickHooked = false;
let inputHooked = false;
let focusHooked = false;

/* E07-09 : unique point d'écriture du readout. On re-query à chaque appel :
   le nœud est détruit/recréé par la coque, le cache `panel` peut être périmé. */
function writePanel() {
  const node = document.getElementById(PANEL_ID);
  if (!node || !node.isConnected) return;
  node.textContent = `Transitions · ères ${eraTransitions} · repères ${eventTransitions}`
    + ` · filtres ${filterTransitions} · vues ${viewTransitions}`
    + ` · focus restaurés ${focusRestores}. Dernière : ${lastTransition}.`;
}

function ensurePanel(ctx) {
  const existing = document.getElementById(PANEL_ID);
  if (existing && existing.isConnected) {
    panel = existing;
    return existing;
  }
  const node = ctx.el('p', 'chronology-e07-readout');
  node.id = PANEL_ID;
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('aria-atomic', 'true');
  if (ctx.stage && ctx.stage.isConnected) ctx.stage.appendChild(node);
  panel = node;
  return node;
}

/* E07-07 : exclusivité de `aria-current` après chaque transition. La base pose
   déjà l'attribut sur la bande/carte active ; on normalise défensivement pour
   qu'un rendu partiel ne laisse jamais deux marqueurs ou aucun marqueur. */
function normalizeCurrent() {
  const pairs = [
    ['#atlas-chrono-eras .era-band', '#atlas-chrono-eras .era-band.is-active'],
    ['#atlas-chrono-events .event-card', '#atlas-chrono-events .event-card.is-active'],
  ];
  pairs.forEach(([allSelector, activeSelector]) => {
    const nodes = document.querySelectorAll(allSelector);
    if (!nodes.length) return;
    const active = document.querySelector(activeSelector);
    nodes.forEach((node) => {
      if (node !== active) node.removeAttribute('aria-current');
    });
    if (active) active.setAttribute('aria-current', 'true');
  });
}

/* E07-08 : miroir auditable du réglage de mouvement. `ctx.reducedMotion()` est
   la seule source (registry.js:33-36) ; aucun média query dupliqué côté JS. */
function markMotion(ctx) {
  if (!ctx.layout || typeof ctx.layout.setAttribute !== 'function') return;
  const reduced = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  ctx.layout.setAttribute('data-e07-motion', reduced ? 'reduced' : 'full');
}

/* E07-01 à E07-05 : un seul écouteur délégué par type, enregistré sous garde.
   La Phase « target » de la base (selectEra/selectEvent/set) re-rend avant la
   Phase « document » : `writePanel()` vise donc le panneau freshly recréé. */
function handleClick(event) {
  const target = event.target;
  if (!target || typeof target.closest !== 'function') return;
  if (target.closest('.atlas-chrono-band')) {
    eraTransitions += 1;
    lastTransition = 'ère';
    writePanel();
    return;
  }
  if (target.closest('.event-card')) {
    eventTransitions += 1;
    lastTransition = 'repère';
    writePanel();
    return;
  }
  if (target.closest('.atlas-chrono-tag')) {
    filterTransitions += 1;
    lastTransition = 'filtre (thème)';
    writePanel();
    return;
  }
  if (target.closest('#nav-c2a-back')) {
    viewTransitions += 1;
    lastTransition = 'vue (retour monde)';
    writePanel();
  }
}

function handleInput(event) {
  const target = event.target;
  if (!target || target.id !== 'atlas-chrono-search') return;
  filterTransitions += 1;
  lastTransition = 'filtre (recherche)';
  writePanel();
}

/* E07-06 : `focusIntent` (chronology.js:197-205, 540) place le focus après le
   rendu. On le mesure sans le piloter : aucun focus() ajouté par la lentille. */
function handleFocusIn(event) {
  const target = event.target;
  if (!target || !target.id) return;
  const id = target.id;
  if (id.startsWith('era-') || id.startsWith('event-btn-') || id === 'atlas-chrono-search') {
    focusRestores += 1;
    writePanel();
  }
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function' ||
      !ctx.stage || !ctx.stage.isConnected) return;

  ctx.css(CSS_ID, CSS);
  ensurePanel(ctx);
  markMotion(ctx);
  normalizeCurrent();

  if (!clickHooked) {
    clickHooked = true;
    document.addEventListener('click', handleClick);
  }
  if (!inputHooked) {
    inputHooked = true;
    document.addEventListener('input', handleInput);
  }
  if (!focusHooked) {
    focusHooked = true;
    document.addEventListener('focusin', handleFocusIn);
  }

  writePanel();
}

/* E07-10 : un seul register, une seule clé, aucun effet en dehors de `ctx`. */
register('E07', install);
