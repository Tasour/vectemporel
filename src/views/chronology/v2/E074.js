import { register } from './registry.js';

/* Lentille E074 — passe V2 du domaine H (responsive & mobile).
 * Thème : « détail empilé sous la frise » (themes.json, clé E074).
 *
 * Périmètre possédé : src/views/chronology/v2/E074.js uniquement, ainsi que
 * le rapport UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E074.md. Lectures seules :
 * src/views/chronology.js, les registres V1/V2, index.js, styles.css et le
 * modèle de qualité E049. Aucun fichier partagé n'est modifié.
 *
 * Contrat exploité : viewId === 'chronologyv2', stage, layout, css, el,
 * reducedMotion. Le registre V2 ne fournit pas say() : la lentille n'ajoute
 * AUCUNE région live et n'écrit dans aucune région existante ; elle expose son
 * état en texte visible ordinaire, dédupliqué.
 *
 * Invariants : un seul enregistrement E074 (ctx => …), une seule feuille CSS
 * ctx.css('chronology-v2-e074', …), un seul écouteur matchMedia sous garde,
 * aucun timer, aucune boucle rAF, aucun aléa, aucun réseau, aucune
 * journalisation, aucun innerHTML. Tous les IDs sont préfixés et gardés.
 *
 * Chantiers : E074-01 à E074-10, chacun avec un effet DOM/CSS observable.
 */

const CSS_ID = 'chronology-v2-e074';
const HEAD_ID = 'chronology-v2-e074-aside-head';
const BELOW_ID = 'chronology-v2-e074-below-hint';
const BREAKPOINT_ID = 'chronology-v2-e074-breakpoint';
const SEPARATOR_ID = 'chronology-v2-e074-separator';
const KICKER_ID = 'chronology-v2-e074-aside-kicker';
const RETURN_ID = 'chronology-v2-e074-return';
const MEASURE_ID = 'chronology-v2-e074-measure-note';
const STATE_ID = 'chronology-v2-e074-state';

/* E074-01, E074-02, E074-03, E074-05, E074-06, E074-07, E074-08 :
   une seule feuille. Le point de rupture est 620 px, aligné sur la règle
   mobile déjà utilisée par la vue (chronology.js:84). La pile retire la
   hauteur fixe de 45 % du styles.css:316, qui tronquait la fiche empilée.
   Les repères textuels ne sont affichés qu'en pile, sauf le seuil, toujours
   lisible. Aucune transition n'est créée. */
const CSS = `
  #${BREAKPOINT_ID} {
    margin: 6px 0 0; color: var(--muted-2);
    font-size: 9px; line-height: 1.4; font-variant-numeric: tabular-nums;
  }
  #${STATE_ID} {
    margin: 8px 0 0; color: var(--muted-2);
    font-size: 9px; line-height: 1.4; font-variant-numeric: tabular-nums;
  }
  #${BELOW_ID}, #${SEPARATOR_ID}, #${KICKER_ID},
  #${RETURN_ID}, #${MEASURE_ID} { display: none; }

  /* E074-01 : l'ordre visuel suit l'ordre DOM (frise puis fiche). */
  .chronology-layout[data-e074-order="frise-puis-fiche"] > .chronology-main { order: 0; }
  .chronology-layout[data-e074-order="frise-puis-fiche"] > .chronology-aside { order: 1; }

  @media (max-width: 620px) {
    /* E074-01, E074-06, E074-08 : pile réelle, sans plafond de hauteur. */
    .chronology-layout[data-e074-order="frise-puis-fiche"] {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto;
      height: auto; min-height: 0;
    }
    .chronology-layout[data-e074-order="frise-puis-fiche"] > .chronology-main,
    .chronology-layout[data-e074-order="frise-puis-fiche"] > .chronology-aside {
      min-width: 0; box-sizing: border-box; overflow: visible;
      overflow-wrap: anywhere;
    }
    /* E074-05 : mesure de lecture de la fiche empilée. */
    .chronology-layout[data-e074-order="frise-puis-fiche"] > .chronology-aside {
      max-width: 72ch; border-left: 0;
      border-top: 1px solid var(--line);
      padding-top: 12px; margin-top: 4px;
    }
    #${SEPARATOR_ID} {
      display: block; width: 100%; height: 1px; margin: 12px 0 0;
      border: 0; border-top: 1px dashed var(--line-strong);
    }
    #${BELOW_ID} {
      display: block; margin: 10px 0 0; padding: 7px 9px;
      border-left: 3px solid var(--gold);
      background: rgba(255, 255, 255, .02);
      color: var(--ink-soft); font-size: 10px; line-height: 1.5;
    }
    #${KICKER_ID} {
      display: block; margin: 0 0 6px; color: var(--gold);
      font-size: 9px; font-weight: 600;
      letter-spacing: .12em; text-transform: uppercase;
    }
    #${MEASURE_ID} {
      display: block; margin: 6px 0 0;
      color: var(--muted-2); font-size: 9px;
    }
    /* E074-04 : cible tactile conforme (>= 44 px). */
    #${RETURN_ID} {
      display: inline-block; min-height: 44px;
      margin: 8px 0 4px; padding: 6px 12px;
      border: 1px solid var(--line-strong); border-radius: 8px;
      background: transparent; color: var(--gold-bright);
      font: inherit; font-size: 11px; cursor: pointer;
    }
    #${RETURN_ID}:focus-visible {
      outline: 2px solid var(--gold-bright); outline-offset: 2px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    #${RETURN_ID}, #${SEPARATOR_ID}, #${BELOW_ID} { transition: none !important; }
  }
  @media (forced-colors: active) {
    #${SEPARATOR_ID} { border-top-color: CanvasText; }
    #${RETURN_ID} { border-color: CanvasText; color: CanvasText; }
  }
`;

let installCount = 0;
let stackQuery = null;
let stackBound = false;
let refs = {
  layout: null, main: null, aside: null,
  state: null, reduced: false, stacked: false,
};

/* E074-10 : garde d'existence pour toute ID préfixée. La coque reconstruisant
   #app à chaque rendu, un nœud de la rendu précédent est détaché et n'est pas
   retrouvé par getElementById : il est recréé dans le parent courant. */
function ensureNode(make, id, tagName, className, text, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className, text);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E074-09 : état de la pile déduit de matchMedia (et non du CSS), afin que le
   texte visible reste exact. Aucune écriture live : c'est un <p> ordinaire. */
function applyState() {
  const { layout, main, aside, state, reduced } = refs;
  if (!layout || !layout.isConnected) return;
  const stacked = Boolean(stackQuery && stackQuery.matches);
  refs.stacked = stacked;
  layout.dataset.e074Stacked = stacked ? '1' : '0';
  if (aside) aside.dataset.e074Measure = stacked ? '72ch' : 'libre';
  if (main) main.dataset.e074NoOverflow = '1';
  if (aside) aside.dataset.e074NoOverflow = '1';
  write(
    state,
    `Mode empilé : ${stacked ? 'oui' : 'non'} · largeur de lecture : `
      + `${stacked ? '72 caractères' : 'libre'} · mouvement réduit : `
      + `${reduced ? 'oui' : 'non'} · installations : ${installCount}.`
  );
}

function onStackChange() {
  applyState();
}

register('E074', ctx => {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const layout = ctx.layout;
  const main = document.getElementById('atlas-chrono-main');
  const aside = document.getElementById('atlas-chrono-aside');
  if (!main) return;

  /* E074-01 : ordre de lecture explicite, ordre DOM laissé intact. */
  layout.dataset.e074Order = 'frise-puis-fiche';
  /* E074-08 : garde anti-débordement, appliquée en CSS au point de rupture. */
  main.dataset.e074NoOverflow = '1';
  if (aside) aside.dataset.e074NoOverflow = '1';
  /* E074-10 : unicité du greffon et compteur de rendus. */
  layout.dataset.e074Installs = String(installCount);

  /* E074-02, E074-03, E074-06 : la frise porte les repères de la pile. */
  ensureNode(
    make, BELOW_ID, 'p', 'e074-below',
    'Le détail du repère est affiché juste sous la frise : faites défiler vers le bas pour le lire.',
    main
  );
  ensureNode(
    make, BREAKPOINT_ID, 'p', 'e074-breakpoint',
    'Mise en page empilée sous 620 px de largeur (point de rupture mobile).',
    main
  );
  const separator = ensureNode(make, SEPARATOR_ID, 'hr', 'e074-separator', undefined, main);
  separator.setAttribute('aria-hidden', 'true');

  let state = null;
  if (aside) {
    /* E074-04, E074-05, E074-07, E074-09 : un en-tête de fiche unique,
       placé en tête de l'aside, regroupe les repères propres au détail. */
    const head = ensureNode(make, HEAD_ID, 'div', 'e074-aside-head', undefined, aside);
    if (aside.firstElementChild !== head) aside.insertBefore(head, aside.firstChild);

    ensureNode(make, KICKER_ID, 'p', 'e074-aside-kicker', 'Détail du repère', head);
    ensureNode(
      make, MEASURE_ID, 'p', 'e074-measure',
      'Largeur de lecture limitée à 72 caractères.', head
    );

    const button = ensureNode(make, RETURN_ID, 'button', 'e074-return', '↑ Retour à la frise', head);
    if (button.type !== 'button') button.type = 'button';
    button.setAttribute('aria-controls', 'atlas-chrono-main');
    /* Un seul écouteur par nœud, même si le bouton est réutilisé. */
    if (!button.dataset.e074Bound) {
      button.dataset.e074Bound = '1';
      button.addEventListener('click', () => {
        const reduced = typeof ctx.reducedMotion === 'function'
          ? Boolean(ctx.reducedMotion()) : false;
        if (typeof main.scrollIntoView === 'function') {
          main.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        }
      });
    }
    state = ensureNode(make, STATE_ID, 'p', 'e074-state', '', head);
  }

  if (typeof window !== 'undefined' && window.matchMedia) {
    stackQuery = window.matchMedia('(max-width: 620px)');
  }
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { layout, main, aside, state, reduced, stacked: false };
  applyState();

  /* Un seul écouteur matchMedia pour toute la session. */
  if (!stackBound && stackQuery && typeof stackQuery.addEventListener === 'function') {
    stackQuery.addEventListener('change', onStackChange);
    stackBound = true;
  }
});
