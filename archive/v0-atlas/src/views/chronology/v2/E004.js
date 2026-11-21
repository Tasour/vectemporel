import { register } from './registry.js';

/* Lentille V2 E004 — repère « ère courante » explicite (aria-current + forme).
 *
 * Domaine A : frise & ères. Cette lentille ne touche ni au routeur, ni à la
 * coque, ni au CSS global, ni aux autres lentilles. Elle lit uniquement le DOM
 * déjà rendu par src/views/chronology.js (bandes d'ères sous #atlas-chrono-eras)
 * et y ajoute un marqueur d'ère courant explicite : une valeur aria-current
 * précise, un badge textuel, une forme non colorée et une légende lisible.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E004.md — chantiers E004-01 à
 * E004-10. Fichier possédé : src/views/chronology/v2/E004.js uniquement.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Le registre V2 n'expose aucun say() : la lentille n'ajoute AUCUNE région live
 * et n'écrit dans aucune région existante — l'état est rendu en texte visible.
 *
 * Invariants :
 * - un seul register('E004', install), un seul ctx.css('chronology-v2-e004', …) ;
 * - tous les IDs créés sont préfixés chronology-v2-e004- et gardés par
 *   ensureNode (idempotence multi-rendus) ;
 * - aucun appel à la console, aucun réseau, aucun nombre aléatoire, aucun HTML
 *   brut, aucun timer, aucune boucle rAF, aucun écouteur, aucun tabindex et
 *   aucun focus volé ;
 * - aucune date n'est codée en dur : tout est dérivé de data-start / data-end.
 */

const CSS_ID = 'chronology-v2-e004';
const NAV_ID = 'atlas-chrono-eras';
const LEGEND_ID = 'chronology-v2-e004-current-legend';
const BAND_SELECTOR = '.era-band[data-era-id]';

/* E004-01 à E004-10 : une seule feuille, injectée une fois par ctx.css.
   Le marqueur de forme utilise ::before + clip-path avec currentColor : il ne
   dépend donc jamais de la couleur seule et reste visible en forced-colors.
   Aucune règle ne surcharge le outline :focus-visible de styles.css:33-34. */
const CSS = `
  #${NAV_ID} .era-band { position: relative; }
  #${NAV_ID} .era-band[data-e004-current="1"] { font-weight: 600; }
  #${NAV_ID} .era-band[data-e004-current="1"]::before {
    content: ''; position: absolute; left: 3px; top: 6px; bottom: 6px;
    width: 3px; border-radius: 2px; background: currentColor;
  }
  #${NAV_ID} .e004-badge {
    display: inline-block; margin: 3px 0 0 6px; padding: 1px 5px;
    border: 1px solid currentColor; border-radius: 999px;
    font: inherit; font-size: 8px; font-weight: 600;
    letter-spacing: .06em; text-transform: uppercase; white-space: nowrap;
  }
  #${NAV_ID} .e004-shape {
    display: inline-block; width: 9px; height: 9px; margin-left: 6px;
    background: currentColor; clip-path: polygon(0 0, 100% 50%, 0 100%);
    vertical-align: middle;
  }
  #${LEGEND_ID} {
    margin: 6px 0 0; color: var(--gold-bright); font: inherit;
    font-size: 9px; line-height: 1.4;
  }
  #${LEGEND_ID}[data-e004-none="1"] { color: var(--muted); }
  @media (max-width: 620px) {
    #${NAV_ID} .e004-badge { white-space: normal; font-size: 8px; }
    #${NAV_ID} .era-band[data-e004-current="1"]::before { left: 2px; width: 2px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${NAV_ID} .era-band, #${LEGEND_ID} { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${NAV_ID} .era-band[data-e004-current="1"] { border-width: 2px; }
    #${NAV_ID} .e004-badge { border-color: CanvasText; color: CanvasText; }
    #${NAV_ID} .e004-shape { background: CanvasText; }
    #${LEGEND_ID} { color: CanvasText; }
  }
`;

let installCount = 0;

/* E004-10 : garde d'existence pour toute ID préfixée. Un nœud déjà présent est
   réutilisé et déplacé dans le parent courant ; la coque reconstruisant #app,
   un nœud de la rendu précédent est détaché et n'est donc pas retrouvé. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E004-05 : formatage dérivé du dataset, jamais une date écrite en dur. */
function formatYear(value) {
  const year = Number(value);
  if (!Number.isFinite(year)) return 'date inconnue';
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function eraName(band) {
  return (band && band.querySelector('span')?.textContent || '').trim()
    || (band && band.getAttribute('data-era-id'))
    || 'ère inconnue';
}

function legendText(band) {
  if (!band) return 'Ère courante : aucune ère sélectionnée.';
  return `Ère courante : ${eraName(band)} (${formatYear(band.dataset.start)} → ${formatYear(band.dataset.end)}). `
    + 'Repérée par le badge « En cours » et le triangle sur sa bande.';
}

/* E004-06 : retrait des marqueurs propres à la lentille avant chaque pose.
   Cela garantit qu'une seule bande porte data-e004-current="1", même si un
   rendu ou un rejeu de greffon avait laissé des marqueurs précédents. */
function clearMarkers(bands) {
  bands.forEach((band) => {
    const badge = band.querySelector('.e004-badge');
    if (badge) badge.remove();
    const shape = band.querySelector('.e004-shape');
    if (shape) shape.remove();
    band.removeAttribute('data-e004-current');
    band.classList.remove('e004-current');
  });
}

function decorate(band, make) {
  const badge = make('span', 'e004-badge', 'En cours');
  const shape = make('span', 'e004-shape');
  shape.setAttribute('aria-hidden', 'true');
  band.append(badge, shape);
}

function install(ctx) {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const nav = document.getElementById(NAV_ID);
  if (!nav) return;
  const bands = Array.from(nav.querySelectorAll(BAND_SELECTOR));
  if (!bands.length) return;

  clearMarkers(bands);

  /* E004-01 et E004-06 : une seule bande courante, désignée de façon
     explicite. On préfère aria-current, puis la classe is-active de la vue. */
  const marked = bands.filter((band) => {
    const value = band.getAttribute('aria-current');
    return Boolean(value) && value !== 'false';
  });
  const current = marked[0] || bands.find((band) => band.classList.contains('is-active')) || null;

  bands.forEach((band) => {
    if (band !== current && band.hasAttribute('aria-current')) band.removeAttribute('aria-current');
  });
  if (current) {
    /* E004-01 : 'location' est le jeton ARIA qui décrit une position courante
       dans un ensemble — plus précis que le générique 'true' de la vue. */
    current.setAttribute('aria-current', 'location');
    current.dataset.e004Current = '1';
    current.classList.add('e004-current');
    /* E004-02, E004-03 : badge textuel + forme non colorée. */
    decorate(current, make);
  }
  const markedCount = nav.querySelectorAll('[data-e004-current="1"]').length;

  /* E004-04 : l'état courant est exposé comme donnée sur la navigation et sur
     la liste ordonnée des ères, sans toucher aux attributs de la vue. */
  nav.dataset.e004CurrentEraId = current ? (current.dataset.eraId || '') : '';
  nav.dataset.e004CurrentEra = current ? eraName(current) : '';
  nav.dataset.e004CurrentCount = String(markedCount);
  nav.dataset.e004View = ctx.viewId || 'chronologyv2';
  nav.dataset.e004Installs = String(installCount);
  const list = nav.querySelector('ol');
  if (list) list.dataset.e004CurrentEraId = nav.dataset.e004CurrentEraId;

  /* E004-05 : légende visible et indexable, hors région live. */
  const legend = ensureNode(make, LEGEND_ID, 'p', 'e004-legend', nav);
  write(legend, legendText(current));
  if (legend.dataset.e004None !== (current ? '0' : '1')) legend.dataset.e004None = current ? '0' : '1';

  /* E004-09 : préférence de mouvement exposée sans créer la moindre animation. */
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  if (nav.dataset.e004Reduced !== (reduced ? '1' : '0')) nav.dataset.e004Reduced = reduced ? '1' : '0';
}

register('E004', install);
