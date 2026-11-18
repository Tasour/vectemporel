import { register } from './registry.js';

/* Lentille E002 — Performance de rendu appliquée aux soleils de la vue
   Constellation. Dix chantiers E002-01..10, tous implémentés ci-dessous :
   confinement, GPU ciblé, signature de position, aplatissement des ombres,
   événements délégués, veille hors écran, hiérarchie de détail, focus sans
   reflow, largeur figée et allègement mobile.
   Greffon tolérant : aucune écriture n'est tentée sans ctx.layout valide ;
   l'état reste local au DOM (attributs data-e002-*), jamais dans le store.
   Zéro appel réseau, zéro source d'aléa, zéro sortie de diagnostic. */

const STYLE_ID = 'constellation-e002';
const ROOT_ID = 'e002-constellation-root';
const METER_ID = 'e002-sun-meter';
const SUN_LIMIT_DETAIL = 3;

const CSS = `
  /* E002-01 — confinement : un soleil ne invalide ni les arêtes ni les planètes. */
  .constellation-layout .const-layer-suns {
    contain: layout paint style;
    isolation: isolate;
  }

  /* E002-02 — promotion GPU du seul soleil actif, neutralisée en mouvement réduit. */
  .constellation-layout .const-sun.is-active {
    backface-visibility: hidden;
    will-change: transform;
  }
  .constellation-layout[data-e002-reduced="1"] .const-sun.is-active,
  .constellation-layout .const-sun[data-e002-gpu="0"] {
    will-change: auto;
  }

  /* E002-03 — empreinte lisible, largeur fixe, chiffres tabulaires. */
  .constellation-layout .e002-meter {
    margin: 0; color: var(--muted-2); font-size: 9px;
    font-variant-numeric: tabular-nums;
  }

  /* E002-04 — aucune ombre, aucun filtre, aucun lissage de texte coûteux. */
  .constellation-layout .const-sun[data-e002-ink="flat"] { box-shadow: none; }
  .constellation-layout .const-sun::after {
    filter: none; text-shadow: none; text-rendering: optimizeSpeed;
  }

  /* E002-05 — survol délégué : l'opacité seule reste composable. */
  .constellation-layout .const-sun[data-e002-hover="1"] { opacity: .82; }

  /* E002-06 — veille hors écran : retrait des indices GPU et du confinement. */
  .constellation-layout[data-e002-visible="0"] .const-sun.is-active {
    will-change: auto;
  }
  .constellation-layout[data-e002-visible="0"] .const-layer-suns {
    contain: layout style;
  }

  /* E002-07 — seuls les soleils « détail » gardent l'étiquette large. */
  .constellation-layout .const-sun[data-e002-detail="0"]::after {
    max-width: 96px; font-size: 8px;
  }

  /* E002-08 — focus signalé par une surcharge locale, sans déplacement. */
  .constellation-layout .const-sun[data-e002-focus="1"] {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }

  /* E002-09 — largeur figée : aucune invalidation des soleils voisins. */
  .constellation-layout .const-sun[data-e002-stable="1"] {
    contain: inline-size;
    font-variant-numeric: tabular-nums;
  }

  /* E002-10 — mobile : moins de surface peinte, aucun écouteur de redimensionnement. */
  @media (max-width: 620px) {
    .constellation-layout .const-sun { width: 34px; height: 34px; font-size: 10px; }
    .constellation-layout .const-sun::after { width: 108px; }
    .constellation-layout .const-sun.is-active { will-change: auto; }
  }
  @media (prefers-reduced-motion: reduce) {
    .constellation-layout .const-sun { transition: none !important; }
  }
`;

/* --- Utilitaires tolérants : jamais d'accès non protégé au DOM. --- */

function sunButtons(layer) {
  if (!layer || typeof layer.querySelectorAll !== 'function') return [];
  return Array.from(layer.querySelectorAll('.const-sun'));
}

function closestSun(target, layer) {
  const origin = target;
  const node = origin && typeof origin.closest === 'function'
    ? origin.closest('.const-sun') : null;
  return node && layer && layer.contains(node) ? node : null;
}

/* E002-03 : empreinte déterministe, calculée une seule fois depuis les
   variables de position déjà écrites par la vue, sans nouvelle trigonométrie. */
function computeSignature(suns) {
  return suns.map((sun) => {
    const key = sun.dataset && sun.dataset.constKey ? sun.dataset.constKey : '?';
    const x = sun.style ? sun.style.getPropertyValue('--x') : '';
    const y = sun.style ? sun.style.getPropertyValue('--y') : '';
    return `${key}:${x}/${y}`;
  }).join('|');
}

function installMeter(caption, el, count, signatureLength) {
  if (!caption || typeof caption.querySelector !== 'function' || typeof el !== 'function') return;
  if (caption.querySelector(`#${METER_ID}`)) return;
  const node = el('p', 'e002-meter',
    `${count} soleil${count > 1 ? 's' : ''} · empreinte ${signatureLength} car.`);
  node.id = METER_ID;
  caption.appendChild(node);
}

/* E002-05 : un seul écouteur par couche, déclaré passif, au lieu d'un
   écouteur de survol par bouton soleil. */
function installHoverDelegation(layer) {
  if (!layer || typeof layer.addEventListener !== 'function') return;
  if (layer.dataset && layer.dataset.e002HoverBound === '1') return;
  if (layer.dataset) layer.dataset.e002HoverBound = '1';
  layer.addEventListener('pointerover', (event) => {
    const sun = closestSun(event.target, layer);
    if (sun) sun.setAttribute('data-e002-hover', '1');
  }, { passive: true });
  layer.addEventListener('pointerout', (event) => {
    const sun = closestSun(event.target, layer);
    if (sun) sun.removeAttribute('data-e002-hover');
  }, { passive: true });
}

/* E002-08 : même délégation pour le focus, sans écrire dans le store ni
   provoquer de reflow : seul un attribut change. */
function installFocusDelegation(layer) {
  if (!layer || typeof layer.addEventListener !== 'function') return;
  if (layer.dataset && layer.dataset.e002FocusBound === '1') return;
  if (layer.dataset) layer.dataset.e002FocusBound = '1';
  layer.addEventListener('focusin', (event) => {
    const sun = closestSun(event.target, layer);
    if (sun) sun.setAttribute('data-e002-focus', '1');
  }, { passive: true });
  layer.addEventListener('focusout', (event) => {
    const sun = closestSun(event.target, layer);
    if (sun) sun.removeAttribute('data-e002-focus');
  }, { passive: true });
}

/* E002-06 : observation d'intersection, sans boucle d'animation ni minuteur.
   L'observeur précédent est détaché avant d'en créer un nouveau, ce qui évite
   d'accumuler des callbacks lorsque la coque reconstruit le DOM. */
let observedLayer = null;

function watchVisibility(layer, layout) {
  if (observedLayer && observedLayer !== layer &&
      typeof observedLayer.disconnect === 'function') {
    observedLayer.disconnect();
  }
  if (typeof IntersectionObserver !== 'function') {
    layout.dataset.e002Visible = '1';
    observedLayer = null;
    return;
  }
  observedLayer = new IntersectionObserver((entries) => {
    for (let i = 0; i < entries.length; i += 1) {
      if (entries[i].target === layer) {
        layout.dataset.e002Visible = entries[i].isIntersecting ? '1' : '0';
      }
    }
  }, { root: null, rootMargin: '0px', threshold: 0 });
  observedLayer.observe(layer);
  layout.dataset.e002Visible = '1';
}

/* E002-07 : un seul soleil « riche » (l'actif) et au plus trois étiquettes
   développées ; les autres restent lisibles mais moins coûteuses à mesurer. */
function markDetail(suns) {
  let activeIndex = -1;
  for (let i = 0; i < suns.length; i += 1) {
    if (suns[i].classList && suns[i].classList.contains('is-active')) {
      activeIndex = i;
      break;
    }
  }
  suns.forEach((sun, index) => {
    sun.dataset.e002Detail = (index === activeIndex || index < SUN_LIMIT_DETAIL) ? '1' : '0';
  });
}

register('E002', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;

  /* Contrat : sans layout rendu, aucun ajout au DOM, aucune feuille de style. */
  if (!layout || typeof layout.querySelector !== 'function') return;

  if (typeof css === 'function') css(STYLE_ID, CSS);

  layout.id = ROOT_ID;
  const reduced = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;

  const layer = layout.querySelector('.const-layer-suns');
  if (!layer) return;
  const suns = sunButtons(layer);
  const caption = layout.querySelector('.constellation-caption');

  /* E002-01 : marquage du confinement (la règle vive dans le bloc CSS). */
  layer.dataset.e002Confined = '1';

  /* E002-02 : mouvement réduit mémorisé sur la racine, promotion posée sur
     le seul soleil actif. */
  layout.dataset.e002Reduced = reduced ? '1' : '0';
  suns.forEach((sun) => {
    if (sun.classList && sun.classList.contains('is-active')) {
      sun.dataset.e002Gpu = reduced ? '0' : '1';
    }
  });

  /* E002-03 : signature figée + compteur visible, sans recalcul diffus. */
  const signature = computeSignature(suns);
  layout.dataset.e002Signature = signature;
  layer.dataset.e002Frozen = '1';
  installMeter(caption, el, suns.length, signature.length);

  /* E002-04 : encre plate sur chaque soleil, pilote de la règle CSS. */
  suns.forEach((sun) => { sun.dataset.e002Ink = 'flat'; });

  /* E002-05 : délégation du survol. */
  installHoverDelegation(layer);

  /* E002-06 : veille hors écran. */
  watchVisibility(layer, layout);

  /* E002-07 : hiérarchie de détail. */
  markDetail(suns);

  /* E002-08 : délégation du focus. */
  installFocusDelegation(layer);

  /* E002-09 : stabilité de largeur des soleils. */
  suns.forEach((sun) => { sun.dataset.e002Stable = '1'; });

  /* E002-10 : l'allègement mobile est purement CSS (media query):
     aucun écouteur de redimensionnement, donc aucun calcul synchrone. */
});
