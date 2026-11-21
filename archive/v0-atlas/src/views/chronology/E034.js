import { register } from './registry.js';

/* E34 — Micro-interactions de la chronologie.
   Une seule feuille de style (ctx.css déduplique par identifiant) et des
   écouteurs délégués posés sur le stage courant : la coque reconstruisant le
   stage à chaque rendu (chronology.js:539), il n'y a ni abonnement global à
   cumuler ni nœud à créer. Zéro réseau, zéro aléa, zéro console, zéro ID
   d'élément ajouté. */
register('E034', (ctx) => {
  const stage = ctx && ctx.stage;
  const css = ctx && typeof ctx.css === 'function' ? ctx.css : null;
  if (!stage || !css) return;

  css('chronology-e34', `
    /* E34-01 — survol des bandes d'ère, sans masquer l'état courant */
    .chronology-layout[data-view="chronology"] .era-band.atlas-chrono-band:hover:not([aria-current="true"]) {
      border-color: var(--era, var(--gold));
      transform: translateY(-1px);
    }
    /* E34-02 — retour tactile à l'enfoncement */
    .chronology-layout[data-view="chronology"] .era-band:active,
    .chronology-layout[data-view="chronology"] .event-card:active,
    .chronology-layout[data-view="chronology"] .atlas-chrono-tag:active,
    .chronology-layout[data-view="chronology"] .aside-actions button:active {
      transform: translateY(1px) scale(.995);
    }
    /* E34-03 — focus clavier lisible sur tous les contrôles locaux */
    .chronology-layout[data-view="chronology"] .event-card:focus-visible,
    .chronology-layout[data-view="chronology"] .era-band:focus-visible,
    .chronology-layout[data-view="chronology"] .atlas-chrono-tag:focus-visible,
    .chronology-layout[data-view="chronology"] .aside-actions button:focus-visible {
      outline: 2px solid var(--gold-bright);
      outline-offset: 2px;
      box-shadow: 0 0 0 3px rgba(230, 185, 111, .14);
    }
    /* E34-04 — fondu d'entrée des cartes après reconstruction du DOM */
    @keyframes chronology-e34-enter {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: none; }
    }
    .chronology-layout[data-view="chronology"] .event-list.atlas-chrono-events > li {
      animation: chronology-e34-enter .18s ease-out;
    }
    /* E34-05 — pouls du compteur de filtres */
    @keyframes chronology-e34-bump {
      0%, 100% { transform: none; }
      50% { transform: scale(1.09); color: var(--gold-bright); }
    }
    .chronology-layout[data-view="chronology"] #atlas-chrono-count.chronology-e34-bump {
      animation: chronology-e34-bump .22s ease-out;
    }
    /* E34-06 — champ de recherche : état actif piloté par le focus */
    .chronology-layout[data-view="chronology"] #atlas-chrono-search.is-typing {
      border-color: var(--gold);
      box-shadow: 0 0 0 2px rgba(230, 185, 111, .14);
    }
    /* E34-07 — puces de thème : retour au survol */
    .chronology-layout[data-view="chronology"] .atlas-chrono-tag:hover {
      border-color: var(--gold);
      color: var(--gold-bright);
    }
    /* E34-08 — transition du liseré de l'ère courante */
    .chronology-layout[data-view="chronology"] .era-band.atlas-chrono-band {
      transition: border-color .16s ease, box-shadow .16s ease,
                  background-color .16s ease, transform .16s ease;
    }
    /* E34-09 — filet de sécurité local (styles.css:342-344 reste la règle globale) */
    @media (prefers-reduced-motion: reduce) {
      .chronology-layout[data-view="chronology"] .era-band.atlas-chrono-band,
      .chronology-layout[data-view="chronology"] .event-list.atlas-chrono-events > li,
      .chronology-layout[data-view="chronology"] #atlas-chrono-count.chronology-e34-bump {
        animation: none !important;
        transition: none !important;
        transform: none !important;
      }
      .chronology-layout[data-view="chronology"] .era-band.atlas-chrono-band:hover:not([aria-current="true"]),
      .chronology-layout[data-view="chronology"] .era-band:active,
      .chronology-layout[data-view="chronology"] .event-card:active,
      .chronology-layout[data-view="chronology"] .atlas-chrono-tag:active,
      .chronology-layout[data-view="chronology"] .aside-actions button:active {
        transform: none !important;
      }
    }
  `);

  /* E34-05 / E34-09 : le mouvement réduit est relu à chaque action, pas figé
     au rendu, pour suivre un changement de préférence à chaud. */
  const prefersReduced = () =>
    typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false;

  let bumpFrame = 0;
  function scheduleBump() {
    if (prefersReduced() || bumpFrame) return;
    bumpFrame = requestAnimationFrame(() => {
      bumpFrame = 0;
      const count = document.getElementById('atlas-chrono-count');
      if (!count || !count.isConnected) return;
      count.classList.remove('chronology-e34-bump');
      void count.offsetWidth; /* réamorce l'animation, sans minuteur ni file */
      count.classList.add('chronology-e34-bump');
    });
  }

  /* E34-06 : la classe suit le focus, qui est restauré par applyFocusIntent
     (chronology.js:199-205) après chaque reconstruction du champ. */
  function onFocusIn(event) {
    const target = event.target;
    if (target && target.id === 'atlas-chrono-search') target.classList.add('is-typing');
  }
  function onFocusOut(event) {
    const target = event.target;
    if (target && target.id === 'atlas-chrono-search') target.classList.remove('is-typing');
  }

  function onInput(event) {
    const target = event.target;
    if (target && target.id === 'atlas-chrono-search') scheduleBump();
  }
  function onClick(event) {
    const target = event.target;
    if (target && typeof target.closest === 'function'
        && target.closest('.atlas-chrono-tag')) scheduleBump();
  }
  function onAnimationEnd(event) {
    if (event.animationName === 'chronology-e34-bump') {
      event.target.classList.remove('chronology-e34-bump');
    }
  }

  /* Tous les écouteurs vivent sur le stage neuf fourni par runEnhancements :
     un rendu = un stage = un jeu d'abonnements, sans garde module nécessaire. */
  stage.addEventListener('focusin', onFocusIn);
  stage.addEventListener('focusout', onFocusOut);
  stage.addEventListener('input', onInput);
  stage.addEventListener('click', onClick);
  stage.addEventListener('animationend', onAnimationEnd);
});
