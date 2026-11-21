import { register } from './registry.js';

/* Lentille V2 E025 — Adaptabilité responsive des lunes de la vue Constellation.
 * Seconde passe : dix chantiers inédits, tous locaux et dégradables. Préfixe
 * DOM/CSS v2e025, feuille unique constellation-v2-e025, un seul register.
 * Zéro journalisation, zéro réseau, zéro aléa, zéro minuteur, zéro animation
 * propre : les positions déterministes de constellation.js ne sont pas touchées.
 * Répartition : 01, 02, 03 et 05 dans la feuille ; 04, 06, 07, 08, 09 dans le
 * code ; 10 dans les gardes d'entrée et l'idempotence.
 */

const CSS_ID = 'constellation-v2-e025';
const GRILLE_ID = 'v2e025-grille';
const COMPTE_ID = 'v2e025-compte';
const ATTR_DENSITE = 'data-v2e025-densite';
const ATTR_COTE = 'data-v2e025-cote';
const ATTR_ACTIF = 'data-v2e025-actif';

/* Lecture défensive d'une variable CSS déjà calculée par la vue. */
function lireVariable(moon, nom) {
  if (!moon || !moon.style || typeof moon.style.getPropertyValue !== 'function') return NaN;
  const brut = moon.style.getPropertyValue(nom);
  if (typeof brut !== 'string') return NaN;
  const valeur = Number.parseFloat(brut);
  return Number.isFinite(valeur) ? valeur : NaN;
}

/* Orienter les libellés verticalement selon l'ordonnée fournie par la vue :
 * une lune haute remonte son libellé, une lune basse le garde sous le point.
 * Aucun angle ni rayon n'est recalculé. */
function orienterLibelles(moons) {
  moons.forEach((moon) => {
    if (!moon || typeof moon.setAttribute !== 'function') return;
    const y = lireVariable(moon, '--y');
    if (!Number.isFinite(y)) return;
    moon.setAttribute(ATTR_COTE, y > 52 ? 'haut' : 'bas');
  });
}

register('E025', (ctx) => {
  const { viewId, layout, css, el, reducedMotion } = ctx || {};

  /* E025-10 — Contrat d'entrée V2, gardes et idempotence : sans layout
   * exploitable ni document, on ne touche à rien, feuille comprise. La passe 2
   * est lancée avec viewId 'constellationv2' (constellation.js:368). */
  if (typeof document === 'undefined') return;
  if (!layout || typeof layout.querySelector !== 'function' ||
      typeof layout.querySelectorAll !== 'function' ||
      typeof layout.insertBefore !== 'function' || typeof el !== 'function') return;
  if (typeof viewId === 'string' && viewId !== 'constellationv2') return;
  if (typeof css !== 'function') return;

  let reduced = false;
  try { reduced = !!(typeof reducedMotion === 'function' && reducedMotion()); }
  catch { reduced = false; }

  /* Retrait des nœuds v2e025-* déjà présents, puis marqueur d'audit : un
   * double appel du greffon ne duplique ni la grille ni le compte. */
  const anciens = layout.querySelectorAll('[id^="v2e025-"]');
  if (anciens && typeof anciens.length === 'number') {
    Array.from(anciens).forEach((node) => {
      if (node && typeof node.remove === 'function') node.remove();
    });
  }
  if (typeof layout.setAttribute === 'function') layout.setAttribute('data-v2e025-monte', '1');

  /* E025-01 — Dimension fluide du point, de 10 à 14 px selon la largeur. */
  /* E025-02 — Libellé fluide, largeur 56–90 px et taille 6–7 px. */
  /* E025-03 — Requête de conteneur : le champ pilote la compacité réelle. */
  /* E025-05 — Ultra-compact sous 360 px : point 9 px, libellé 50 px. */
  css(CSS_ID, `
    /* v2e025-01 : la taille suit une courbe continue, sans saut de rupture. */
    .constellation-field .const-moon {
      width: var(--v2e025-dim, clamp(10px, 2.6vw, 14px));
      height: var(--v2e025-dim, clamp(10px, 2.6vw, 14px));
    }

    /* v2e025-02 : le libellé se rétracte proportionnellement à la largeur. */
    .constellation-field .const-moon::after {
      width: clamp(56px, 15vw, 90px);
      font-size: clamp(6px, 1.5vw, 7px);
    }

    /* v2e025-03 : le champ devient conteneur de requête ; les règles suivent
       sa largeur mesurée, pas celle de la fenêtre. */
    .constellation-field { container-type: inline-size; }
    @container (max-width: 560px) {
      .constellation-field .const-moon { width: 10px; height: 10px; }
      .constellation-field .const-moon::after { width: 56px; font-size: 6px; }
    }

    /* v2e025-04 : densité contentuelle posée par le code ; au-delà de huit
       lunes, le libellé se resserre pour limiter les recouvrements. */
    .constellation-field .const-moon[data-v2e025-densite="dense"]::after {
      width: 54px;
      font-size: 6px;
      letter-spacing: -.01em;
    }

    /* v2e025-05 : sous 360 px, mode ultra-compact pour écran très étroit. */
    @media (max-width: 360px) {
      .constellation-field .const-moon { width: 9px; height: 9px; }
      .constellation-field .const-moon::after { width: 50px; font-size: 5.5px; }
    }

    /* v2e025-06 : orientation du libellé déduite de l'ordonnée de la lune. */
    .constellation-field .const-moon[data-v2e025-cote="haut"]::after {
      top: auto; bottom: calc(100% + 2px);
    }
    .constellation-field .const-moon[data-v2e025-cote="bas"]::after {
      bottom: auto; top: calc(100% + 2px);
    }

    /* v2e025-08 : sur écran étroit, le point courant porte un anneau
       supplémentaire (une forme, pas une couleur) en plus de l'état de la vue. */
    @media (max-width: 620px) {
      .constellation-field .const-moon[data-v2e025-actif="true"] {
        outline: 2px solid var(--gold-bright);
        outline-offset: 2px;
      }
    }

    /* v2e025-09 : en cas de zoom texte, le libellé passe sur deux lignes au
       lieu d'être tronqué, avec des unités relatives au corps du texte. */
    .constellation-field.v2e025-zoom .const-moon::after {
      width: 11em;
      font-size: .95rem;
      line-height: 1.2;
      white-space: normal;
      overflow: hidden;
    }

    /* v2e025-07 : grille d'accès rapide, masquée hors de la plage tablette. */
    #v2e025-grille, #v2e025-compte { display: none; }
    @media (min-width: 621px) and (max-width: 1000px) {
      #v2e025-compte {
        display: block;
        margin: 12px 0 4px;
        color: var(--muted);
        font-size: 10px;
        line-height: 1.4;
      }
      #v2e025-grille {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(44px, 1fr));
        gap: 6px;
        margin: 0 0 6px;
      }
      #v2e025-grille .v2e025-grille-lune {
        min-height: 36px;
        padding: 4px 6px;
        border: 1px solid var(--violet);
        border-radius: 8px;
        background: var(--surface-2);
        color: var(--ink-soft);
        font-size: 10px;
        font-variant-numeric: tabular-nums;
        cursor: pointer;
      }
      #v2e025-grille .v2e025-grille-lune[aria-current="true"] {
        outline: 2px solid var(--gold-bright);
        outline-offset: 1px;
        font-weight: 600;
      }
      #v2e025-grille .v2e025-grille-lune:focus-visible {
        outline: 2px solid var(--gold-bright);
        outline-offset: 2px;
      }
      #v2e025-grille[data-v2e025-mouvement="calme"] { scroll-behavior: auto; }
    }
    @media (prefers-reduced-motion: reduce) {
      #v2e025-grille { scroll-behavior: auto; }
      .constellation-field .const-moon { transition: none; }
    }
  `);

  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.querySelectorAll !== 'function') return;
  const moons = Array.from(field.querySelectorAll('.const-moon[data-const-key^="moon:"]'));
  if (!moons.length) return;

  /* E025-04 — Densité : plus de huit lunes déclenchent le mode compact. */
  const densite = moons.length > 8 ? 'dense' : 'normal';
  if (typeof field.setAttribute === 'function') field.setAttribute(ATTR_DENSITE, densite);
  moons.forEach((moon) => {
    if (moon && typeof moon.setAttribute === 'function') moon.setAttribute(ATTR_DENSITE, densite);
  });

  /* E025-06 — Orientation verticale des libellés, angles inchangés. */
  orienterLibelles(moons);

  /* E025-09 — Zoom texte : la taille de police racine est lue une seule fois. */
  try {
    const racine = document.documentElement;
    const taille = racine && typeof window !== 'undefined' && window.getComputedStyle
      ? Number.parseFloat(window.getComputedStyle(racine).fontSize) : NaN;
    if (Number.isFinite(taille) && taille > 18 && field.classList) {
      field.classList.add('v2e025-zoom');
    }
  } catch { /* zoom non mesurable : on garde la présentation par défaut. */ }

  /* E025-08 — Marqueur de la lune courante recopié depuis la vue. */
  const courante = field.querySelector('.const-moon.is-active');
  moons.forEach((moon) => {
    if (moon === courante && typeof moon.setAttribute === 'function') {
      moon.setAttribute(ATTR_ACTIF, 'true');
    }
  });

  /* E025-07 — Grille d'accès rapide pour la plage tablette (621–1000 px). */
  const caption = layout.querySelector('.constellation-caption');
  const grille = el('div', 'v2e025-grille');
  grille.id = GRILLE_ID;
  grille.setAttribute('role', 'group');
  grille.setAttribute('aria-label', 'Accès rapide aux points vérifiés du repère');
  grille.setAttribute('data-v2e025-mouvement', reduced ? 'calme' : 'normal');

  const boutons = moons.map((moon, index) => {
    const bouton = el('button', 'v2e025-grille-lune', String(index + 1));
    bouton.type = 'button';
    bouton.setAttribute('data-v2e025-index', String(index));
    const source = moon && moon.getAttribute ? moon.getAttribute('aria-label') : '';
    bouton.setAttribute('aria-label', `Accès rapide : ${source || `point ${index + 1}`}`);
    bouton.addEventListener('click', () => {
      const cible = moons[index];
      if (cible && typeof cible.click === 'function') cible.click();
    });
    grille.appendChild(bouton);
    return bouton;
  });

  boutons.forEach((bouton, index) => {
    if (moons[index] === courante) bouton.setAttribute('aria-current', 'true');
  });

  const compte = el('p', 'v2e025-compte',
    `${moons.length} point${moons.length > 1 ? 's' : ''} vérifié${moons.length > 1 ? 's' : ''} dans la grille d’accès rapide.`);
  compte.id = COMPTE_ID;
  compte.setAttribute('role', 'status');
  compte.setAttribute('aria-live', 'polite');
  compte.setAttribute('aria-atomic', 'true');

  if (caption && typeof caption.parentNode === 'object') {
    layout.insertBefore(compte, caption);
    layout.insertBefore(grille, caption);
  } else {
    layout.appendChild(compte);
    layout.appendChild(grille);
  }
});
