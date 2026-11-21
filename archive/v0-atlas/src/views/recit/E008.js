import { register } from './registry.js';

/* Lentille E008 — Performance et sobriété de la vue Récit.
 *
 * Dix chantiers E008-01 … E008-10, tous implémentés ici. Rapport :
 * UNIFIED_AUDIT/RECIT/views/E008.md. Lectures seules :
 * src/views/recit.js, src/views/recit/registry.js,
 * src/views/recit/index.js, src/views/_diagnostics.js.
 *
 * Greffon strictement non destructif : aucun nœud créé, aucun nœud retiré,
 * aucun écouteur, timer, observateur, rAF, aléa, réseau ni journal. Toutes
 * les modifications sont : une feuille de style unique, des attributs
 * d'image absents, une classe sur la liste du fil et un attribut de données
 * sur le conteneur. La coque reconstruisant #app à chaque rendu, le miroir
 * n'est écrit qu'une seule fois par rendu (garde sur data-e008-sobriete).
 *
 * Sobriété des identifiants : E008 ne crée aucun nœud DOM, donc aucun id
 * n'est introduit — aucune collision possible avec les 99 autres lentilles.
 * Le seul marqueur ajouté est l'attribut préfixé `data-e008-sobriete`.
 */

const MIRROR = 'data-e008-sobriete';
const SEUIL_FIL_DENSE = 40;

/* Une seule feuille, une seule règle par besoin. Pas de sélecteur universel,
   pas de will-change, pas de backdrop-filter, pas de filter : aucun effet ne
   force la création d'une couche GPU coûteuse. Aucune information n'est
   portée par la seule couleur. */
const CSS = `
.recit-layout .recit-progress,
.recit-layout .recit-conf,
.recit-layout .recit-timing {
  contain: layout style paint;
}
.recit-layout .recit-legend,
.recit-layout .recit-trace {
  content-visibility: auto;
  contain-intrinsic-size: auto 160px;
}
.recit-layout .recit-thread-list.recit-e008-thread-dense .recit-thread-item {
  contain: layout style;
  min-height: 28px;
  padding-top: 3px;
  padding-bottom: 3px;
}
.recit-layout .recit-actions button,
.recit-layout .recit-thread-item,
.recit-layout .recit-trace summary {
  touch-action: manipulation;
}
.recit-layout .recit-media-credit,
.recit-layout .media-caption {
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .recit-layout .recit-progress > span,
  .recit-layout .recit-actions button,
  .recit-layout .recit-thread-item,
  .recit-layout .recit-trace summary {
    transition: none !important;
    animation: none !important;
  }
  .recit-layout { scroll-behavior: auto !important; }
}
`;

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector)
    : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector))
    : [];
}

/* E008-01 — budget DOM : compter sans aucune journalisation. */
function budgetDom(root) {
  return {
    elements: qa(root, '*').length,
    buttons: qa(root, 'button').length,
    thread: qa(root, '.recit-thread-item').length,
  };
}

/* E008-02 — budget de régions live : recenser, jamais ajouter. */
function budgetLive() {
  if (typeof document === 'undefined') return { live: 0, added: 0 };
  const nodes = qa(document, '[role="status"], [role="alert"], [aria-live]');
  return { live: new Set(nodes).size, added: 0 };
}

/* E008-03 — image : décodage asynchrone et chargement différé si absents. */
function prepareImage(root) {
  const img = q(root, '.recit-media img');
  if (!img || typeof img.setAttribute !== 'function' || typeof img.hasAttribute !== 'function') {
    return { image: 0, async: 0, lazy: 0 };
  }
  let asyn = 0;
  let lazy = 0;
  if (!img.hasAttribute('decoding')) { img.setAttribute('decoding', 'async'); asyn = 1; }
  if (!img.hasAttribute('loading')) { img.setAttribute('loading', 'lazy'); lazy = 1; }
  return { image: 1, async: asyn, lazy };
}

/* E008-06 — préférence de mouvement, sans journal ni effet de bord. */
function motionMode(reducedMotion) {
  try { return reducedMotion && reducedMotion() ? 'reduce' : 'normal'; }
  catch { return 'normal'; }
}

/* E008-08 — fil dense : alléger le coût par item sans rien retirer. */
function densifyThread(root) {
  const items = qa(root, '.recit-thread-item').length;
  const over = items > SEUIL_FIL_DENSE;
  const list = q(root, '.recit-thread-list');
  let dense = 0;
  if (over && list && list.classList && typeof list.classList.add === 'function'
      && !list.classList.contains('recit-e008-thread-dense')) {
    list.classList.add('recit-e008-thread-dense');
    dense = 1;
  }
  return { over: over ? 1 : 0, dense, items };
}

/* E008-10 — miroir unique et compact : une seule écriture par rendu. */
function writeMirror(target, s) {
  if (!target || typeof target.setAttribute !== 'function') return;
  if (typeof target.hasAttribute === 'function' && target.hasAttribute(MIRROR)) return;
  const tokens = [
    `dom:${s.dom.elements}`,
    `btn:${s.dom.buttons}`,
    `fil:${s.dom.thread}`,
    `live:${s.live.live}`,
    `liveAdd:${s.live.added}`,
    `img:${s.img.image}`,
    `imgAsync:${s.img.async}`,
    `contain:1`,
    `cv:1`,
    `motion:${s.motion}`,
    `reads:0`,
    `filDense:${s.thread.dense}`,
    `touch:1`,
    `css:1`,
  ];
  target.setAttribute(MIRROR, tokens.join(' '));
}

register('E008', (ctx) => {
  if (!ctx) return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  /* el volontairement inutilisé : E008 ne crée aucun nœud (sobriété). */
  void el;
  if (typeof css === 'function') css('recit-e008', CSS);
  const root = stage || layout;
  if (!root) return;
  const target = layout && typeof layout.setAttribute === 'function' ? layout : null;
  if (target && typeof target.hasAttribute === 'function' && target.hasAttribute(MIRROR)) return;

  writeMirror(target, {
    dom: budgetDom(root),
    live: budgetLive(),
    img: prepareImage(root),
    motion: motionMode(reducedMotion),
    thread: densifyThread(root),
  });
});
