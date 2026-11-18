import { register } from './registry.js';

/* Lentille M15 — Animation de zoom dans le contour.
 * Domaine B : drapeau & révélation.
 *
 * La transition de zoom est produite par `src/views/globe-reveal.js` via
 * l'API Web Animations sur `#globe-reveal .gr-figure` (voir ses lignes 228-234).
 * Cette lentille ne remplace pas le fichier partagé : elle affine l'animation
 * au moment où elle est créée (durée, easing, facteur d'échelle), garantit
 * l'annulation d'une animation périmée et respecte le mouvement réduit.
 *
 * Contraintes : zéro réseau, zéro aléa, zéro console, un seul fichier. */

const STYLE_ID = 'monde-m15';
const OVERLAY_ID = 'globe-reveal';
const FIGURE_CLASS = 'gr-figure';

/* Valeurs de référence — une seule source de vérité pour le zoom. */
const ZOOM = Object.freeze({
  duration: 620,                         // ms, durée centrale (M15-01)
  easing: 'cubic-bezier(.18,.62,.24,1)', // décélération douce (M15-02)
  scale: 6,                              // facteur final borné (M15-03)
  reducedDuration: 1,                    // quasi-instantané (M15-09)
});

const CSS = `
  /* M15-04 / M15-05 : couche compositée stable, centre de zoom figé. */
  #globe-reveal.is-revealing .gr-figure{
    transform-origin:50% 50%;
    backface-visibility:hidden;
    -webkit-backface-visibility:hidden;
  }
  /* M15-06 : will-change n'est actif que pendant la révélation. */
  #globe-reveal .gr-figure{will-change:auto}
  #globe-reveal.is-revealing .gr-figure{will-change:transform,opacity}
  /* M15-04 : l'ombre portée est coûteuse pendant le scale — on la retire. */
  #globe-reveal.is-revealing .gr-figure{filter:none}
  /* M15-09 : aucune transition résiduelle en mouvement réduit. */
  @media (prefers-reduced-motion:reduce){
    #globe-reveal,#globe-reveal .gr-page,#globe-reveal .gr-figure{
      transition:none!important;animation:none!important
    }
  }
`;

/* État partagé des transitions (un seul jeu pour toutes les instances). */
let generation = 0;   // jeton de génération : rend l'annulation déterministe
let tracked = null;   // animation WAAPI en cours, ou null
let hooksRegistered = false;

function reduced(ctx) {
  return typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
}

function release(node) {
  try { node.style.willChange = ''; } catch (_) { /* style figé : on ignore */ }
}

function stopTracked() {
  const anim = tracked;
  tracked = null;
  if (anim && typeof anim.cancel === 'function') {
    try { anim.cancel(); } catch (_) { /* déjà terminée */ }
  }
}

function beginTransition() {
  generation += 1;
  stopTracked();
}

/* Ne substitue que les animations de zoom (transform: scale(...)), afin de
 * laisser passer toute autre animation qu'une autre lentille appliquerait
 * au figure. */
function isZoom(keyframes) {
  if (!Array.isArray(keyframes)) return false;
  return keyframes.some((frame) => (
    frame && typeof frame.transform === 'string' && frame.transform.indexOf('scale') !== -1
  ));
}

register('M15', (ctx) => {
  if (!ctx || !ctx.reveal) return;
  const api = ctx.reveal;
  if (api.__m15Installed) return;       // garde d'idempotence sur un même objet
  api.__m15Installed = true;

  if (typeof ctx.css === 'function') ctx.css(STYLE_ID, CSS);

  /* L'overlay est fixé au body par globe-reveal.js (ligne 156), pas à la scène.
     Garde d'existence avant toute manipulation du DOM. */
  const overlay = document.getElementById(OVERLAY_ID);
  const figure = overlay ? overlay.querySelector(`.${FIGURE_CLASS}`) : null;
  if (!overlay || !figure) return;

  /* Interception de l'animation créée par globe-reveal.js : on ne touche pas
     au fichier partagé, on substitue ses paramètres au moment de l'appel.
     Patch une seule fois par élément (le figure survit aux re-renders). */
  if (!figure.__m15AnimatePatched && typeof figure.animate === 'function') {
    const nativeAnimate = figure.animate.bind(figure);
    figure.animate = function (keyframes, options) {
      if (!isZoom(keyframes)) return nativeAnimate(keyframes, options);
      const isReduced = reduced(ctx);
      const frames = [
        { transform: 'scale(1)', opacity: 1 },
        { transform: `scale(${ZOOM.scale})`, opacity: 0 },
      ];
      const settings = {
        duration: isReduced ? ZOOM.reducedDuration : ZOOM.duration,
        easing: isReduced ? 'linear' : ZOOM.easing,
        fill: 'forwards',
      };
      const animation = nativeAnimate(frames, settings);
      const token = generation;
      tracked = animation;
      if (animation && animation.finished && typeof animation.finished.then === 'function') {
        const cleanup = () => {
          if (token === generation) { tracked = null; release(figure); }
        };
        animation.finished.then(cleanup, cleanup);
      }
      return animation;
    };
    figure.__m15AnimatePatched = true;
  }

  /* Annulation sur changement de phase : un nouveau survol, une nouvelle
     révélation ou une sortie invalide le zoom précédent. */
  const baseReveal = typeof api.reveal === 'function' ? api.reveal.bind(api) : null;
  if (baseReveal) {
    api.reveal = function (country, done) {
      beginTransition();
      return baseReveal(country, done);
    };
  }
  const baseHover = typeof api.hover === 'function' ? api.hover.bind(api) : null;
  if (baseHover) {
    api.hover = function (country) {
      beginTransition();
      return baseHover(country);
    };
  }
  const baseLeave = typeof api.leave === 'function' ? api.leave.bind(api) : null;
  if (baseLeave) {
    api.leave = function () {
      beginTransition();
      return baseLeave();
    };
  }

  /* M15-08 : la vue notifie aussi la fin de survol ; on en profite pour
     stopper un zoom encore en vol. Enregistré une seule fois (les tableaux
     de callbacks du registre vivent hors du rendu). */
  if (!hooksRegistered) {
    if (typeof ctx.onHover === 'function') ctx.onHover(() => { beginTransition(); });
    if (typeof ctx.onLeave === 'function') ctx.onLeave(() => { beginTransition(); });
    hooksRegistered = true;
  }
});
