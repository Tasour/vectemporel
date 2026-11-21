import { register } from './registry.js';

/* Lentille E035 — Adaptabilité responsive des arêtes du graphe (vue Constellation).
 * Dix chantiers concrets et variés : épaisseur par palier, contraste, pointillés,
 * densité calculée, breakpoint mesuré, compteur live, miroir SVG, préférence de
 * mouvement et légende. Greffon tolérant : aucune exception, aucun réseau, aucun
 * aléa, aucune journalisation, aucun timer, aucune boucle rAF propre, aucun
 * fichier partagé modifié. */

const CSS_ID = 'constellation-e035';
const COUNT_ID = 'e035-count';
const LEGEND_ID = 'e035-legend';

/* Le registre réapplique les greffons à chaque rendu ; l'écouteur resize, lui,
 * n'est installé qu'une seule fois et relit toujours le contexte courant. */
let latest = null;
let resizeInstalled = false;

function mesurer(node) {
  const cible = node.querySelector('.constellation-field') || node;
  const rect = typeof cible.getBoundingClientRect === 'function'
    ? cible.getBoundingClientRect() : null;
  const width = rect && Number.isFinite(rect.width) ? Math.round(rect.width) : 0;
  const step = !width ? 'inconnu'
    : width < 420 ? 'etroit'
      : width < 760 ? 'mobile'
        : width < 1100 ? 'tablette' : 'large';
  return {
    width,
    step,
    total: node.querySelectorAll('.constellation-edges line').length,
    paths: node.querySelectorAll('.constellation-edges line.is-path').length,
    moons: node.querySelectorAll('.constellation-edges line.is-moon').length,
  };
}

function rafraichir(node) {
  const mesures = mesurer(node);
  node.dataset.e035Bp = mesures.step;
  node.dataset.e035Width = String(mesures.width);
  const compteur = node.querySelector('#' + COUNT_ID);
  if (compteur) {
    compteur.textContent = `Arêtes : ${mesures.total} · chemin : ${mesures.paths}`
      + ` · lunes : ${mesures.moons} · largeur ${mesures.width} px (${mesures.step}).`;
  }
  return mesures;
}

function miroirSvg(node, mesures) {
  const svg = node.querySelector('.constellation-edges');
  if (!svg) return;
  svg.classList.add('e035-edges');
  svg.setAttribute('data-e035-lines', String(mesures.total));
  svg.setAttribute('data-e035-dashed',
    mesures.step === 'etroit' || mesures.step === 'mobile' ? '1' : '0');
}

function surResize() {
  const source = latest;
  if (!source || !source.layout || !source.layout.isConnected) return;
  try {
    miroirSvg(source.layout, rafraichir(source.layout));
  } catch {
    /* Greffon tolérant : un rendu intermédiaire est simplement ignoré. */
  }
}

register('E035', (ctx) => {
  /* E035-01 — Garde de contexte : zéro insertion DOM sans layout valide. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;

  try {
    latest = ctx; ctx.layout.dataset.e035Css = CSS_ID;
    const layout = ctx.layout;
    const make = typeof ctx.el === 'function' ? ctx.el : null;
    const svg = layout.querySelector('.constellation-edges');
    const lines = Array.from(layout.querySelectorAll('.constellation-edges line'));
    const paths = lines.filter((line) => line.classList.contains('is-path'));
    const moons = lines.filter((line) => line.classList.contains('is-moon'));
    const densite = lines.length > 24 ? 'haute'
      : lines.length > 10 ? 'moyenne' : 'faible';

    if (typeof ctx.css === 'function') {
      ctx.css('constellation-e035', `
        .constellation-layout .e035-count {
          display: flex; flex-wrap: wrap; gap: 3px 12px;
          margin: 8px 0 0; padding: 5px 8px;
          border: 1px solid var(--line); border-left: 3px solid var(--gold);
          border-radius: 6px; background: rgba(255,255,255,.02);
          color: var(--muted); font-size: 9px; line-height: 1.45;
          font-variant-numeric: tabular-nums;
        }
        /* E035-02 — Épaisseur de trait par palier, densité en multiplicateur. */
        .constellation-layout .constellation-field { --e035-hairline: 1px; }
        .constellation-layout .constellation-edges line {
          stroke-width: calc(var(--e035-hairline) * var(--e035-density-scale, 1));
        }
        @media (max-width: 1100px) {
          .constellation-layout .constellation-field { --e035-hairline: .95px; }
        }
        @media (max-width: 760px) {
          .constellation-layout .constellation-field { --e035-hairline: .85px; }
        }
        @media (max-width: 420px) {
          .constellation-layout .constellation-field { --e035-hairline: .75px; }
        }
        /* E035-03 — Contraste : secondaires atténués sur écran étroit. */
        @media (max-width: 760px) {
          .constellation-layout .constellation-edges line:not(.is-path) { opacity: .55; }
        }
        @media (max-width: 420px) {
          .constellation-layout .constellation-edges line:not(.is-path) { opacity: .4; }
        }
        /* E035-04 — Pointillés des lunes hors chemin actif. */
        @media (max-width: 760px) {
          .constellation-layout .constellation-edges line.is-moon:not(.is-path) {
            stroke-dasharray: 1.6 1.8;
          }
        }
        @media (max-width: 420px) {
          .constellation-layout .constellation-edges line.is-moon:not(.is-path) {
            stroke-dasharray: 1 1.4;
          }
        }
        /* densité (05) */
        .constellation-layout[data-e035-density="haute"] .constellation-edges line:not(.is-path) {
          opacity: .45;
        }
        .constellation-layout[data-e035-density="haute"] .constellation-edges line.is-moon:not(.is-path) {
          stroke-dasharray: 2 2;
        }
        /* breakpoint (06) */
        .constellation-layout[data-e035-bp="etroit"] .e035-count { font-size: 8px; padding: 4px 6px; }
        .constellation-layout[data-e035-bp="mobile"] .e035-count { font-size: 8px; }
        /* miroir SVG (08) */
        .constellation-layout .constellation-edges.e035-edges line.is-path { stroke-linecap: round; }
        /* mouvements et contraste (09) */
        @media (prefers-reduced-motion: reduce) {
          .constellation-layout .e035-count,
          .constellation-layout .e035-legend-item { transition: none !important; }
        }
        @media (prefers-contrast: more) {
          .constellation-layout .constellation-edges line {
            opacity: 1 !important; stroke: var(--ink);
          }
        }
        /* légende (10) */
        .constellation-layout .e035-legend {
          display: flex; flex-wrap: wrap; gap: 3px 14px;
          margin: 8px 0 0; color: var(--muted); font-size: 9px;
        }
        .constellation-layout .e035-legend-item {
          display: inline-flex; align-items: center; gap: 5px;
        }
        .constellation-layout .e035-swatch {
          display: inline-block; width: 22px; height: 0;
          border-top: 2px solid rgba(244,214,158,.2);
        }
        .constellation-layout .e035-swatch--path { border-top-color: rgba(230,185,111,.65); }
        .constellation-layout .e035-swatch--moon { border-top: 2px dashed rgba(178,139,221,.7); }
        @media (max-width: 420px) {
          .constellation-layout .e035-legend { font-size: 8px; gap: 2px 9px; }
          .constellation-layout .e035-swatch { width: 14px; }
        }
      `);
    }

    /* E035-05 — Densité calculée depuis le DOM réel et traduite en CSS. */
    layout.dataset.e035Density = densite;
    layout.dataset.e035Edges = String(lines.length);
    layout.dataset.e035Paths = String(paths.length);
    layout.dataset.e035Moons = String(moons.length);
    layout.style.setProperty('--e035-density-scale',
      densite === 'haute' ? '0.8' : densite === 'moyenne' ? '0.9' : '1');

    /* E035-06 — Écouteur resize unique, sans timer ni rAF, gardé sur le layout courant. */
    const view = layout.ownerDocument && layout.ownerDocument.defaultView;
    if (view && typeof view.addEventListener === 'function' && !resizeInstalled) {
      view.addEventListener('resize', surResize);
      resizeInstalled = true;
    }

    /* E035-07 — Compteur d'arêtes : région live, texte dérivé du graphe. */
    if (make && !layout.querySelector('#' + COUNT_ID)) {
      const compteur = make('p', 'e035-count', '');
      compteur.id = COUNT_ID;
      compteur.setAttribute('role', 'status');
      compteur.setAttribute('aria-live', 'polite');
      compteur.setAttribute('aria-atomic', 'true');
      const field = layout.querySelector('.constellation-field');
      if (field && field.parentNode === layout) layout.insertBefore(compteur, field);
      else layout.appendChild(compteur);
    }
    const mesures = rafraichir(layout);

    /* E035-08 — Miroir sur le SVG : classe, attributs, état des pointillés. */
    miroirSvg(layout, mesures);
    if (svg) svg.setAttribute('data-e035-density', densite);

    /* E035-09 — Préférence de mouvement réduit consignée sur le layout. */
    const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
    layout.dataset.e035Motion = reduit ? 'reduce' : 'normal';

    /* E035-10 — Légende adaptative des trois familles d'arêtes. */
    if (make && !layout.querySelector('#' + LEGEND_ID)) {
      const legend = make('div', 'e035-legend');
      legend.id = LEGEND_ID;
      const swatch = (classe, libelle) => {
        const item = make('span', 'e035-legend-item');
        const trait = make('span', 'e035-swatch ' + classe);
        item.append(trait, make('span', '', libelle));
        return item;
      };
      legend.append(
        swatch('e035-swatch--path', 'Chemin actif'),
        swatch('e035-swatch--moon', 'Lune secondaire'),
        swatch('', 'Arête secondaire')
      );
      const caption = layout.querySelector('.constellation-caption');
      if (caption) caption.appendChild(legend);
      else layout.appendChild(legend);
    }
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
