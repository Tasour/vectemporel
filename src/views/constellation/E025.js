import { register } from './registry.js';

/* Lentille E025 — Adaptabilité responsive des lunes de la vue Constellation.
 * Dix chantiers concrets (E025-01 … E025-10) : cible tactile, étiquettes de
 * bord, compacité mobile, bandeau compagnon, relay d'activation, état courant
 * annoncé, lien d'évitement, paysage court, contraste et mouvement, idempotence.
 * Une seule feuille via ctx.css('constellation-e025', …) et un seul enregistre.
 * Zéro journalisation, zéro réseau, zéro aléa, zéro minuteur, zéro animation
 * propre : les positions déterministes de constellation.js restent intactes.
 * Répartition : 01–03 et 08–09 dans la feuille ; 02 et 04–07, 10 dans le code.
 */

const CSS_ID = 'constellation-e025';
const BANDEAU_ID = 'e025-bandeau';
const SKIP_ID = 'e025-skip';
const COMPTE_ID = 'e025-compte';

/* E025-02 — Recadrage des étiquettes de bord : on lit la position horizontale
 * déjà calculée par la vue (--x, bornée entre 10 et 90) et on pose une classe
 * qui aligne le libellé vers l'intérieur du champ au lieu de le laisser
 * déborder sous overflow:hidden. Aucune position n'est modifiée. */
function alignerEtiquettes(moons) {
  moons.forEach((moon) => {
    const brut = moon.style && typeof moon.style.getPropertyValue === 'function'
      ? moon.style.getPropertyValue('--x') : '';
    const x = Number.parseFloat(brut);
    if (!Number.isFinite(x)) return;
    moon.classList.remove('e025-bord-gauche', 'e025-bord-droit');
    if (x <= 20) moon.classList.add('e025-bord-gauche');
    else if (x >= 80) moon.classList.add('e025-bord-droit');
  });
}

register('E025', (ctx) => {
  const { viewId, layout, css, el, reducedMotion } = ctx || {};

  /* Contrat : sans layout exploitable, on ne touche à aucun DOM, y compris
   * la feuille injectée dans <head>. Greffon tolérant aux ctx partiels. */
  if (!layout || typeof layout.querySelector !== 'function' ||
      typeof layout.insertBefore !== 'function' || typeof el !== 'function') return;
  if (typeof viewId === 'string' && viewId !== 'constellation') return;

  let reduced = false;
  try { reduced = !!(typeof reducedMotion === 'function' && reducedMotion()); }
  catch { reduced = false; }

  /* E025-10 — Idempotence : avant toute création, on reprend les nœuds
   * e025-* déjà présents dans ce layout (double exécution du greffon) et on
   * les retire. cssOnce fait le même travail pour la feuille unique. */
  const anciens = layout.querySelectorAll('[id^="e025-"]');
  if (anciens && typeof anciens.length === 'number') {
    Array.from(anciens).forEach((node) => {
      if (node && typeof node.remove === 'function') node.remove();
    });
  }

  /* Une seule feuille : chaque chantier CSS porte son propre commentaire. */
  if (typeof css === 'function') {
    css(CSS_ID, `
  /* E025-01 — Cible tactile : sur pointeur grossier, l'aire de frappe passe
     à 14 + 2×11 = 36 px sans agrandir le point visible, hérité de la vue. */
  @media (pointer: coarse) {
    .constellation-field .const-moon::before {
      content: "";
      position: absolute;
      inset: -11px;
      border-radius: 50%;
      pointer-events: auto;
    }
  }

  /* E025-02 — Étiquettes au bord : les classes posées par le calcul ci-dessus
     alignent le libellé vers l'intérieur du champ au lieu du centrage par défaut. */
  .constellation-field .const-moon.e025-bord-gauche::after {
    left: 0; right: auto; transform: none; text-align: left;
  }
  .constellation-field .const-moon.e025-bord-droit::after {
    left: auto; right: 0; transform: none; text-align: right;
  }

  /* E025-03 — Anneau compact sous 620 px : point 11 px, libellé 72 px et
     décalage réduit, pour que les lunes restent distinctes dans un champ étroit. */
  @media (max-width: 620px) {
    .constellation-field .const-moon { width: 11px; height: 11px; }
    .constellation-field .const-moon::after {
      top: calc(100% + 1px);
      width: 72px;
      font-size: 6.5px;
    }
  }

  /* Bandeau, compte et lien d'évitement (04, 06, 07) : aides de la vue
     compacte, absentes du rendu desktop et du paysage court. */
  #e025-bandeau, #e025-compte, #e025-skip { display: none; }

  @media (max-width: 620px) {
    #e025-skip {
      display: block;
      position: absolute;
      left: -9999px;
      top: 8px;
      z-index: 60;
      min-height: 36px;
      padding: 6px 10px;
      border: 1px solid var(--gold);
      border-radius: 8px;
      background: #0b0f15;
      color: var(--gold-bright);
      font-size: 10px;
      cursor: pointer;
    }
    #e025-skip:focus { left: 8px; }
    #e025-skip:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }

    #e025-compte {
      display: block;
      margin: 10px 0 4px;
      color: var(--muted);
      font-size: 9px;
      line-height: 1.4;
    }
    #e025-bandeau {
      display: flex;
      gap: 6px;
      margin: 0 0 8px;
      padding: 2px 0 6px;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }
    #e025-bandeau::-webkit-scrollbar { display: none; }
    #e025-bandeau .e025-lune {
      flex: 0 0 auto;
      min-height: 44px;
      padding: 0 10px;
      border: 1px solid var(--violet);
      border-radius: 999px;
      background: var(--surface-2);
      color: var(--ink-soft);
      font-size: 10px;
      cursor: pointer;
    }
    #e025-bandeau .e025-lune[aria-current="true"] {
      border-color: var(--gold-bright);
      color: var(--gold-bright);
      font-weight: 600;
    }
    #e025-bandeau .e025-lune:focus-visible {
      outline: 2px solid var(--gold-bright);
      outline-offset: 2px;
    }
  }

  /* E025-08 — Paysage court / clavier virtuel : on retire les aides mobiles
     et on resserre les libellés, en gardant toutes les lunes cliquables. */
  @media (max-height: 520px) and (orientation: landscape) {
    #e025-bandeau, #e025-compte, #e025-skip { display: none; }
    .constellation-field .const-moon::after { width: 64px; }
  }

  /* E025-09 — Contraste forcé et mouvement réduit : délimitations système
     conservées, aucune transition ni animation superflue. */
  @media (forced-colors: active) {
    .constellation-field .const-moon { border-color: CanvasText; background: Canvas; }
    .constellation-field .const-moon.is-active { background: Highlight; box-shadow: none; }
    #e025-bandeau .e025-lune {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .constellation-field .const-moon,
    .constellation-field .const-moon::after,
    #e025-bandeau,
    #e025-bandeau .e025-lune { transition: none; animation: none; }
  }
    `);
  }

  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.querySelectorAll !== 'function') return;
  const moons = Array.from(field.querySelectorAll('.const-moon[data-const-key^="moon:"]'));
  if (!moons.length) return;

  /* Application du calcul ci-dessus : pose des classes e025-bord-* sur les
     lunes dont l'abscisse est proche d'un bord du champ. */
  alignerEtiquettes(moons);

  /* E025-04 — Bandeau compagnon : une vue compacte et défilante des mêmes
     lunes, insérée dans le layout avec des identifiants e025-* uniques. */
  const bandeau = el('div', 'e025-bandeau');
  bandeau.id = BANDEAU_ID;
  bandeau.setAttribute('role', 'group');
  bandeau.setAttribute('aria-label', 'Vue compacte des points vérifiés du repère');

  /* E025-05 — Relay d'activation : un bouton du bandeau ne réécrit aucun
     état, il déclenche le gestionnaire déjà attaché à la vraie lune. */
  const boutons = moons.map((moon, index) => {
    const bouton = el('button', 'e025-lune',
      `${index + 1} · ${(moon.dataset && moon.dataset.label) || 'point'}`);
    bouton.id = `e025-lune-${index}`;
    bouton.type = 'button';
    const source = moon.getAttribute ? moon.getAttribute('aria-label') : '';
    bouton.setAttribute('aria-label', `Vue compacte : ${source || `point ${index + 1}`}`);
    bouton.addEventListener('click', () => {
      const cible = moons[index];
      if (cible && typeof cible.click === 'function') cible.click();
    });
    bandeau.appendChild(bouton);
    return bouton;
  });

  /* E025-06 — État courant et compte : on recopie l'indicateur d'activité
     de la lune réelle sur son doublon compact, puis on annonce le nombre
     total dans une région live, calculé depuis la liste des lunes. */
  const courante = field.querySelector('.const-moon.is-active');
  boutons.forEach((bouton, index) => {
    if (moons[index] !== courante) return;
    bouton.setAttribute('aria-current', 'true');
    bouton.setAttribute('data-e025-actif', 'true');
  });
  const compte = el('p', 'e025-compte',
    `${moons.length} lune${moons.length > 1 ? 's' : ''} disponible${moons.length > 1 ? 's' : ''} dans la vue compacte.`);
  compte.id = COMPTE_ID;
  compte.setAttribute('role', 'status');
  compte.setAttribute('aria-live', 'polite');
  compte.setAttribute('aria-atomic', 'true');

  /* E025-07 — Lien d'évitement : sur mobile, il donne un accès clavier
     direct à la lune courante (ou à la première) sans parcourir le champ. */
  const saut = el('button', 'e025-skip', 'Aller aux lunes');
  saut.id = SKIP_ID;
  saut.type = 'button';
  saut.setAttribute('aria-controls', BANDEAU_ID);
  saut.addEventListener('click', () => {
    const cible = courante || moons[0];
    if (!cible || typeof cible.focus !== 'function') return;
    try { cible.focus({ preventScroll: reduced }); }
    catch { cible.focus(); }
  });

  /* Insertion ordonnée : lien d'évitement en tête, compte et bandeau
     juste avant la légende pour rester adjacents au champ visuel. */
  layout.insertBefore(saut, layout.firstChild || null);
  const caption = layout.querySelector('.constellation-caption');
  if (caption && typeof caption.parentNode === 'object') {
    layout.insertBefore(compte, caption);
    layout.insertBefore(bandeau, caption);
  } else {
    layout.appendChild(compte);
    layout.appendChild(bandeau);
  }
});
