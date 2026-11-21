import { register } from './registry.js';

/* Lentille E061 — Performance & rendu : boucle rAF unique (ou nulle) et pause
 * sur `document.hidden` (domaine G).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E061.md — chantiers E061-01 à E061-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * (src/ui/shell.js) et les feuilles partagées ne sont ni éditées ni doublées.
 *
 * La vue « points » est une matrice DOM statique : aucun canvas, aucune animation.
 * La branche « rAF nulle » s'applique donc — le greffon ne possède aucune boucle
 * requestAnimationFrame et n'a rien à relancer au retour d'onglet. Il se contente
 * d'observer `document.hidden` et de publier un état auditable, sans timer.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres, le détail ni les autres lentilles.
 *
 * Invariants : un seul CSS préfixé, un seul readout, un seul écouteur
 * visibilitychange (garde module), aucune écriture périodique, zéro rAF,
 * zéro timer, zéro IntersectionObserver/MutationObserver, zéro réseau,
 * zéro aléa, zéro console.*, aucun nœud de la vue modifié.
 */

const CSS_ID = 'points-e061';
const SCOPE = 'points-e061';
const READOUT_ID = 'points-e061-status';
const VISIBILITY_ATTR = 'data-e061-visibility';

/* Toutes les règles sont préfixées par `.points-e061`, classe posée sur
 * `.points-layout`. Le readout porte un ID et une classe dédiés : aucune fuite
 * de style hors de cette lentille, aucun conflit avec les autres greffons. */
const CSS = `
  .points-e061 .points-e061-status {
    margin: 8px 0 0; padding: 6px 9px; min-height: 36px;
    display: flex; align-items: center;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: rgba(8, 11, 16, .86); color: var(--muted);
    font-size: 11px; line-height: 1.4; font-variant-numeric: tabular-nums;
    transition: border-color .18s linear;
  }
  /* E061-07 : l'onglet masqué est aussi marqué par un rail latéral, pas
   * seulement par la couleur du texte. */
  .points-e061 .points-e061-status[data-phase="hidden"] {
    border-left: 3px solid var(--gold);
  }
  @media (max-width: 620px) {
    .points-e061 .points-e061-status { padding: 8px; font-size: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-e061 .points-e061-status { transition: none; }
  }
  @media (forced-colors: active) {
    .points-e061 .points-e061-status {
      border: 1px solid CanvasText; color: CanvasText;
    }
    .points-e061 .points-e061-status[data-phase="hidden"] {
      border-left-color: Highlight;
    }
  }
`;

let visibilityHooked = false;   // un seul écouteur pour toute la session
let lastPhase = '';             // 'visible' | 'hidden', état au dernier évènement
let hiddenCount = 0;            // transitions visible -> hidden
let resumeCount = 0;            // transitions hidden -> visible
let hiddenSince = 0;            // horodatage (ms) du dernier masquage
let lastHiddenMs = 0;           // durée de la dernière pause
let layoutRef = null;           // .points-layout courant
let readoutRef = null;          // readout courant, recréé à chaque rendu

/* Horloge ponctuelle, jamais un timer : aucune fonction n'est planifiée. */
function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    try { return performance.now(); }
    catch { /* repli sans horloge */ }
  }
  return 0;
}

function phaseNow() {
  return typeof document !== 'undefined' && document.hidden ? 'hidden' : 'visible';
}

function readoutText(phase) {
  if (phase === 'hidden') {
    return `Onglet masqué : aucune frame demandée, aucune écriture de la grille. Masquages : ${hiddenCount}. Reprises : ${resumeCount}.`;
  }
  const pause = lastHiddenMs > 0
    ? ` Dernière pause : ${lastHiddenMs} ms sans travail de rendu.`
    : '';
  return `Onglet visible : grille statique, zéro boucle rAF.${pause} Reprises : ${resumeCount}.`;
}

/* Écriture uniquement sur évènement discret (install / visibilitychange),
 * jamais en boucle, et seulement si le texte change : pas de bavardage live. */
function paint() {
  const phase = lastPhase || phaseNow();
  if (layoutRef && layoutRef.isConnected) layoutRef.setAttribute(VISIBILITY_ATTR, phase);
  if (!readoutRef || !readoutRef.isConnected) return;
  readoutRef.setAttribute('data-phase', phase);
  const text = readoutText(phase);
  if (readoutRef.textContent !== text) readoutRef.textContent = text;
}

/* Unique point d'observation de la visibilité du document. Les transitions
 * sont dédupliquées : un évènement redundant ne modifie aucun compteur. */
function handleVisibility() {
  const phase = phaseNow();
  if (phase === lastPhase) return;
  if (phase === 'hidden') {
    hiddenCount += 1;
    hiddenSince = now();
  } else {
    resumeCount += 1;
    if (hiddenSince) lastHiddenMs = Math.max(0, Math.round(now() - hiddenSince));
    hiddenSince = 0;
  }
  lastPhase = phase;
  paint();
}

function ensureReadout(ctx) {
  if (readoutRef && readoutRef.isConnected && layoutRef && layoutRef.contains(readoutRef)) {
    return readoutRef;
  }
  const existing = document.getElementById(READOUT_ID);
  if (existing) {
    /* Nettoyage d'un readout périmé laissé par un rendu précédent : seul notre
     * propre nœud est retiré, jamais un nœud de la vue. */
    if (!layoutRef || !layoutRef.contains(existing)) existing.remove();
    readoutRef = existing;
  } else {
    readoutRef = ctx.el('p', SCOPE + '-status', '');
    readoutRef.id = READOUT_ID;
    readoutRef.setAttribute('role', 'status');
    readoutRef.setAttribute('aria-live', 'polite');
    readoutRef.setAttribute('aria-atomic', 'true');
  }
  const matrix = layoutRef && layoutRef.querySelector('.points-matrix');
  if (matrix && readoutRef.parentElement !== matrix) matrix.appendChild(readoutRef);
  return readoutRef;
}

register('E061', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  /* E061-01 : injection unique (cssOnce) et ancrage de portée sur la vue. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layoutRef = layout;

  if (!lastPhase) lastPhase = phaseNow();
  ensureReadout(ctx);
  paint();

  /* E061-04 : un seul écouteur pour toute la session, même si install() est
   * rejoué à chaque rendu de la coque. */
  if (!visibilityHooked) {
    visibilityHooked = true;
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }
  }
});
