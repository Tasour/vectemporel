import { register } from './registry.js';

/*
 * E039 — Transitions et mouvement (vue Récit).
 *
 * Dix chantiers indépendants, tous implémentés ici :
 *  01 fondu d'entrée du texte du point ;
 *  02 balayage animé de la barre de progression ;
 *  03 interrupteur global « mouvement réduit » ;
 *  04 retour tactile des boutons d'action ;
 *  05 halo du point courant dans le fil ;
 *  06 témoin animé de la lecture automatique ;
 *  07 chevron animé de la traçabilité ;
 *  08 arrivée animée de l'image du média ;
 *  09 transitions des outils de filtrage ;
 *  10 défilement fluide et retour au titre.
 *
 * Un seul register('E039', …), un seul css('recit-e039', …) regroupant toutes
 * les règles, toutes les classes introduites préfixées recit-e039-, tous les
 * ids DOM préfixés e039- et uniques. Zéro console, zéro réseau, zéro aléa.
 * Enrichissement non destructif : sans ce module, le récit reste lisible et
 * toutes les commandes d'origine restent utilisables. La coque reconstruisant
 * le DOM à chaque rendu, les animations d'entrée rejouent naturellement et
 * le bouton ajouté est réattaché sans duplication.
 */

const STYLE_ID = 'recit-e039';
const TOP_BTN_ID = 'e039-top-btn';

/* Liste unique des éléments animés par E039, reprise dans les deux blocs
   « mouvement réduit » pour ne neutraliser que ce module (pas les autres
   lentilles). */
const CIBLES = [
  '#recit-point-title',
  '#recit-context',
  '.recit-progress>span',
  '.recit-actions button',
  '.recit-thread-item.is-current',
  '.recit-play[aria-pressed="true"]::after',
  '.recit-trace summary::after',
  '.recit-media img',
  '.c3a-search',
  '.c3a-filter',
  '.recit-e039-top-btn',
  '.recit-body',
];

function selecteurs(prefixe) {
  return CIBLES.map((cible) => `${prefixe} ${cible}`).join(',\n  ');
}

const REDUIT_ATTRIBUT = selecteurs('.recit-e039[data-e039-motion="reduce"]');
const REDUIT_MEDIA = selecteurs('.recit-e039');

const CSS = `
/* E039-01 — fondu d'entrée du texte du point. */
.recit-e039 #recit-point-title,
.recit-e039 #recit-context{animation:recit-e039-entree 460ms cubic-bezier(.2,.7,.3,1) both}
@keyframes recit-e039-entree{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* E039-02 — balayage animé de la barre de progression. */
.recit-e039 .recit-progress>span{transform-origin:left center;animation:recit-e039-balayage 560ms ease-out both}
@keyframes recit-e039-balayage{from{transform:scaleX(0)}to{transform:scaleX(1)}}

/* E039-04 — retour tactile des commandes. */
.recit-e039 .recit-actions button{transition:background-color 160ms ease,border-color 160ms ease,color 160ms ease,box-shadow 160ms ease,transform 160ms ease}
.recit-e039 .recit-actions button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 3px 10px rgba(0,0,0,.3)}
.recit-e039 .recit-actions button:active:not(:disabled){transform:translateY(1px);box-shadow:none}

/* E039-05 — halo du point courant dans le fil. */
.recit-e039 .recit-thread-item.is-current{animation:recit-e039-halo 1200ms ease-out 1}
@keyframes recit-e039-halo{from{box-shadow:0 0 0 0 rgba(230,185,111,.55)}to{box-shadow:0 0 0 8px rgba(230,185,111,0)}}

/* E039-06 — témoin animé de la lecture automatique (le mouvement, pas la seule couleur). */
.recit-e039 .recit-play[aria-pressed="true"]::after{content:'';display:inline-block;width:6px;height:6px;margin-left:6px;border-radius:50%;background:currentColor;vertical-align:middle;animation:recit-e039-batement 1400ms ease-in-out infinite}
@keyframes recit-e039-batement{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.25)}}

/* E039-07 — chevron animé de la traçabilité. */
.recit-e039 .recit-trace summary{list-style:none}
.recit-e039 .recit-trace summary::-webkit-details-marker{display:none}
.recit-e039 .recit-trace summary::after{content:'▾';display:inline-block;margin-left:auto;color:var(--gold-bright,#e6b96f);transform:rotate(-90deg);transition:transform 180ms ease}
.recit-e039 .recit-trace[open] summary::after{transform:rotate(0deg)}

/* E039-08 — arrivée animée de l'image du média. */
.recit-e039 .recit-media img{animation:recit-e039-media 700ms ease-out both}
@keyframes recit-e039-media{from{opacity:0;transform:scale(1.05)}to{opacity:1;transform:scale(1)}}

/* E039-09 — transitions des outils de filtrage. */
.recit-e039 .c3a-search,
.recit-e039 .c3a-filter{transition:border-color 150ms ease,background-color 150ms ease,color 150ms ease,box-shadow 150ms ease}
.recit-e039 .c3a-search:hover,
.recit-e039 .c3a-filter:hover{border-color:var(--gold,#e6b96f)}

/* E039-10 — défilement fluide et retour au titre. */
.recit-e039 .recit-body{scroll-behavior:smooth;scroll-padding-top:12px}
.recit-e039 #recit-point-title,
.recit-e039 #recit-context{scroll-margin-top:12px}
.recit-e039-top-btn{min-height:36px;padding:0 12px;border:1px solid var(--line-strong,#3a3f4a);border-radius:8px;background:transparent;color:var(--gold-bright,#e6b96f);font:inherit;font-size:10px;cursor:pointer;transition:background-color 160ms ease,border-color 160ms ease,transform 160ms ease}
.recit-e039-top-btn:hover:not(:disabled){border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.1);transform:translateY(-1px)}
.recit-e039-top-btn:focus-visible{outline:2px solid var(--gold-bright,#e6b96f);outline-offset:2px}

/* E039-03 — mouvement réduit : cible exclusivement les éléments animés par
   ce module, sans toucher aux transitions des autres lentilles. */
  ${REDUIT_ATTRIBUT}{animation:none!important;transition:none!important;scroll-behavior:auto!important}
@media (prefers-reduced-motion:reduce){
  ${REDUIT_MEDIA}{animation:none!important;transition:none!important;scroll-behavior:auto!important}
}
`;

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector)
    : null;
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.contains === 'function'
      && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

register('E039', (ctx) => {
  if (!ctx) return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined') return;
    css(STYLE_ID, CSS); /* un seul appel, toutes les règles du module. */

    const cadre = layout || (stage && q(stage, '.recit-layout'));
    if (!cadre || typeof cadre.setAttribute !== 'function') return;

    /* E039-03 — une seule lecture de la préférence par rendu. */
    let mouvement = 'normal';
    try {
      if (reducedMotion && typeof reducedMotion === 'function' && reducedMotion()) mouvement = 'reduce';
    } catch {
      mouvement = 'normal';
    }
    cadre.setAttribute('data-e039-motion', mouvement);
    ajouteClasse(cadre, 'recit-e039');

    const corps = q(cadre, '.recit-body');
    const actions = q(cadre, '.recit-actions');
    const titre = q(cadre, '#recit-point-title');

    /* E039-01 / 02 / 04 / 05 / 06 / 07 / 08 / 09 : la feuille de style posée
       ci-dessus pilote ces huit chantiers via la classe .recit-e039 ; la
       lecture automatique (E039-06) est pilotée par aria-pressed, déjà posé
       par la vue sur .recit-play. Aucun nœud n'est retiré ni réécrit. */

    /* E039-10 — bouton « Revenir au titre », ajouté sans toucher aux commandes
       d'origine ; réattaché à chaque reconstruction du DOM. */
    if (actions && typeof actions.appendChild === 'function') {
      let bouton = q(document, `#${TOP_BTN_ID}`);
      if (!bouton || bouton.parentElement !== actions) {
        bouton = el('button', 'recit-e039-top-btn', '↑ Revenir au titre');
        bouton.id = TOP_BTN_ID;
        bouton.type = 'button';
        bouton.setAttribute('aria-label', 'Revenir en haut du point courant');
        bouton.addEventListener('click', () => {
          try {
            const cible = q(document, '.recit-body')
              || (corps && corps.isConnected ? corps : null);
            if (cible) {
              if (mouvement !== 'reduce' && typeof cible.scrollTo === 'function') {
                cible.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                cible.scrollTop = 0;
              }
            }
            const point = q(document, '#recit-point-title')
              || (titre && titre.isConnected ? titre : null);
            if (point && typeof point.focus === 'function') point.focus({ preventScroll: true });
          } catch {
            /* Commande purement facilitatrice : un échec ne casse jamais le rendu. */
          }
        });
        actions.appendChild(bouton);
      }
    }
  } catch {
    /* Lentille facilitatrice : neutralisée sans jamais interrompre le rendu. */
  }
});
