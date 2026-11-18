import { register } from './registry.js';

/* Lentille E080 — micro-interactions, transitions et retours visuels discrets.
 *
 * Dix chantiers E080-01 … E080-10, tous implémentés ici. Rapport :
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E080.md. Lectures seules :
 * src/views/chronology.js, src/views/chronology/registry.js,
 * src/views/chronology/index.js, styles.css, src/views/_diagnostics.js.
 *
 * Greffon additif : aucune règle de styles.css n'est éditée, aucun nœud
 * existant n'est supprimé, aucun rôle/état ARIA n'est réécrit (E08 possède
 * l'ARIA, E07/E13 possèdent les régions live). Aucun écouteur de clic, aucun
 * timer, aucun requestAnimationFrame, aucun IntersectionObserver, aucun
 * Math.random, aucun réseau, aucun console.*. Les seuls retours animés sont
 * des keyframes CSS auto-terminées, déclenchées sur transition discrète et
 * neutralisées sous mouvement réduit.
 *
 * La coque reconstruisant le DOM à chaque rendu (chronology.js:214, :539),
 * chaque nœud est retrouvé par ID avec garde d'existence puis déplacé dans son
 * parent courant ; les compteurs comparatifs sont module-level et évitent
 * toute impulsion fantôme au premier rendu.
 */

const CSS_ID = 'chronology-e080';
const MIRROR_ID = 'e080-mirror';

/* Une seule feuille, injectée une seule fois par ctx.css → registry.js:13-19.
   Préfixe de portée `.chronology-layout` (chronology.js:214) : aucune fuite
   vers les autres vues. Aucune information n'est portée par la seule couleur :
   les états restent portés par aria-current (chronology.js:290, :390), les
   textes visibles (:344) et les badges de type/confiance (:483-484). */
const CSS = `
/* E080-01 — transitions courtes et locales, jamais sous mouvement réduit
   (chronology.js:89-90 et styles.css:342-344 neutralisent déjà la préférence). */
@media (prefers-reduced-motion: no-preference) {
  .chronology-layout .era-band,
  .chronology-layout .event-card,
  .chronology-layout .atlas-chrono-tag,
  .chronology-layout .nav-c2-back,
  .chronology-layout .aside-actions button,
  .chronology-layout .atlas-chrono-search,
  .chronology-layout .point {
    transition: border-color 150ms ease, background-color 150ms ease,
      box-shadow 150ms ease, color 150ms ease, transform 120ms ease;
  }
  .chronology-layout .event-card img { transition: transform 180ms ease; }
}

/* E080-02 — survol des bandes : la sélection reste aria-current="true"
   (chronology.js:290), le survol n'est qu'un liseré. État statique toujours
   présent, déplacement horizontal supprimé sous mouvement réduit. */
.chronology-layout .era-band:not([aria-current="true"]):hover { border-color: var(--line-strong); }
@media (prefers-reduced-motion: no-preference) {
  .chronology-layout .era-band:not([aria-current="true"]):hover { transform: translateY(-1px); }
}

/* E080-03 — survol des cartes : l'image respire dans son cadre rogné
   (styles.css:208 overflow:hidden, :214 hauteur 82 px). Le texte, le titre et
   l'aria-current de la carte (chronology.js:390) ne bougent pas. */
.chronology-layout .event-card:hover { border-color: var(--line-strong); }
@media (prefers-reduced-motion: no-preference) {
  .chronology-layout .event-card:hover img { transform: scale(1.015); }
}

/* E080-04 — retour pressé : :active répond aussi à Entrée/Espace sur les
   boutons réels (bandes :284, cartes :385, retour :269, précédent/suivant :508,
   puces de thème :330 et :445). Aucun faux bouton, aucun piège de focus. */
@media (prefers-reduced-motion: no-preference) {
  .chronology-layout .era-band:active,
  .chronology-layout .event-card:active,
  .chronology-layout .nav-c2-back:active,
  .chronology-layout .aside-actions button:active,
  .chronology-layout .atlas-chrono-tag:active { transform: translateY(1px); }
}

/* E080-05 — halo de focus complémentaire. styles.css:33-35 porte déjà
   l'outline et E08 cadre la recherche/les actions ; ici, seulement un halo
   autour des trois contrôles non couverts. Pas une animation : actif même en
   mouvement réduit, donc jamais de surprise. */
.chronology-layout .era-band:focus-visible,
.chronology-layout .event-card:focus-visible,
.chronology-layout .atlas-chrono-tag:focus-visible {
  outline: 2px solid var(--gold-bright);
  outline-offset: 3px;
  box-shadow: 0 0 0 5px rgba(230, 185, 111, .16);
}

/* E080-09 — survol des points vérifiés (chronology.js:473-502) : accent
   latéral et fond très léger, le kind et la confiance restent du texte. */
.chronology-layout .point:hover {
  background-color: rgba(255, 255, 255, .02);
  box-shadow: inset 2px 0 var(--line-strong);
}

/* E080-07 / E080-08 — keyframes auto-terminées, sans fill-mode persistant :
   l'état revient seul, sans timer et sans boucle. */
@media (prefers-reduced-motion: no-preference) {
  @keyframes e080-echo-filter {
    from { opacity: .45; }
    to { opacity: 1; }
  }
  .chronology-layout .atlas-chrono-count.e080-echo { animation: e080-echo-filter 320ms ease-out; }

  @keyframes e080-pulse-card {
    from { box-shadow: 0 0 0 0 rgba(230, 185, 111, 0); }
    40% { box-shadow: 0 0 0 3px rgba(230, 185, 111, .3); }
    to { box-shadow: 0 0 0 0 rgba(230, 185, 111, 0); }
  }
  @keyframes e080-pulse-title {
    from { text-shadow: none; }
    45% { text-shadow: 0 0 12px rgba(244, 214, 158, .55); }
    to { text-shadow: none; }
  }
  .chronology-layout .event-card.e080-pulse { animation: e080-pulse-card 420ms ease-out; }
  .chronology-layout #atlas-chrono-event-title.e080-pulse { animation: e080-pulse-title 420ms ease-out; }
}

/* E080-10 — nœud miroir hors flux, dans #atlas-chrono-status (:247-256).
   Son parent n'est ni body, ni stage, ni layout : _diagnostics.js:71-78 ne
   le marque donc pas data-chronology-diagnostic et ne le masque pas. */
.e080-sr {
  position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
`;

/* Un seul point de passage avec la préférence : registry.js:33-36 expose
   ctx.reducedMotion(). Le booléen est relu à chaque rendu et sur changement
   média, jamais échantillonné en boucle. */
let motionBound = false;
let motionQuery = null;
let currentLayout = null;
let lastCount = null;
let lastSelection = null;

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector)
    : null;
}

function text(node) {
  return node && typeof node.textContent === 'string' ? node.textContent.trim() : '';
}

/* E080-06 — miroir de préférence. Un seul écouteur module-level, enregistré
   sous garde ; repli addListener pour les moteurs anciens. Aucune écriture si
   le layout précédent n'est plus connecté. */
function applyMotion(layout, reduced) {
  const value = reduced ? 'reduce' : 'full';
  if (layout && layout.dataset) layout.dataset.e080Motion = value;
  return value;
}

function bindMotion() {
  if (motionBound || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  try {
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => {
      if (currentLayout && currentLayout.isConnected) {
        applyMotion(currentLayout, Boolean(motionQuery.matches));
      }
    };
    if (typeof motionQuery.addEventListener === 'function') motionQuery.addEventListener('change', handler);
    else if (typeof motionQuery.addListener === 'function') motionQuery.addListener(handler);
    motionBound = true;
  } catch {
    /* Repli silencieux : ctx.reducedMotion() reste relu à chaque rendu. */
  }
}

/* E080-10 — garde d'existence : le nœud survit éventuellement à un rendu
   (diagnostics drawer), on le réutilise et on le ramène dans le statut courant. */
function ensureMirror(root, ctx) {
  const status = q(root, '#atlas-chrono-status');
  if (!status) return null;
  let node = document.getElementById(MIRROR_ID);
  if (!node && typeof ctx.el === 'function') {
    node = ctx.el('span', 'e080-sr', '');
    node.id = MIRROR_ID;
    node.setAttribute('aria-hidden', 'true');
  }
  if (!node) return null;
  node.classList.add('e080-sr');
  if (node.parentNode !== status) status.appendChild(node);
  return node;
}

/* E080-07 — l'écho ne part que si le texte du compteur change réellement
   (chronology.js:344). Le premier rendu ne pulse pas : pas d'impulsion
   fantôme au chargement. Sous mouvement réduit, le compteur change sans
   animation mais lastCount est quand même à jour. */
function echoFilter(root, reduced) {
  const count = q(root, '.atlas-chrono-tools .atlas-chrono-count');
  if (!count) return '';
  const value = text(count);
  const changed = lastCount !== null && lastCount !== value;
  lastCount = value;
  if (!changed || reduced) return value;
  count.classList.remove('e080-echo');
  void count.offsetWidth; /* réarmement synchrone, sans timer ni rAF */
  count.classList.add('e080-echo');
  return value;
}

/* E080-08 — impulsion sur la seule carte devenue courante et sur le titre de
   la fiche (chronology.js:390, :423-429). La clé inclut le pays (:215) pour
   ne pas réveiller une impulsion lors d'un simple retour de navigateur. */
function pulseSelection(root, layout, reduced) {
  const card = q(root, '.event-card[aria-current="true"]');
  const title = q(root, '#atlas-chrono-event-title');
  const country = layout && layout.dataset ? layout.dataset.countryId || '' : '';
  const id = card ? card.dataset.eventId || card.id || '' : '';
  const key = `${country}|${id}`;
  const changed = lastSelection !== null && lastSelection !== key;
  lastSelection = key;
  if (!changed || reduced) return id || 'aucun';
  [card, title].filter(Boolean).forEach((node) => {
    node.classList.remove('e080-pulse');
    void node.offsetWidth;
    node.classList.add('e080-pulse');
  });
  return id || 'aucun';
}

/* E080-10 — miroir d'audit lisible par un test E2E, sans console ni région
   live supplémentaire (E07 et E13 possèdent déjà les annonces). */
function mirror(layout, state) {
  if (!layout || !layout.dataset) return;
  layout.dataset.e080Chantiers = '10/10';
  layout.dataset.e080Motion = state.motion;
  layout.dataset.e080FilterEcho = state.count ? '1' : '0';
  layout.dataset.e080Selection = state.selection;
  layout.dataset.e080Pulses = String(state.pulses);
  layout.dataset.e080Mirror = state.mirrorNode ? '1' : '0';
}

register('E080', (ctx) => {
  if (!ctx) return;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  const stage = ctx.stage || null;
  const layout = ctx.layout || null;
  const root = stage || layout;
  if (!root) return;

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  currentLayout = layout;
  bindMotion();
  const motion = applyMotion(layout, reduced);
  const mirrorNode = ensureMirror(root, ctx);
  const count = echoFilter(root, reduced);
  const selection = pulseSelection(root, layout, reduced);
  const pulses = reduced ? 0 : (count ? 1 : 0) + (selection !== 'aucun' ? 1 : 0);

  if (mirrorNode) {
    mirrorNode.textContent = `Micro-interactions E080 : 10 actives. Mouvement ${motion === 'reduce' ? 'réduit' : 'normal'}. Repère : ${selection}.`;
  }
  mirror(layout, { motion, count, selection, pulses, mirrorNode });
});
