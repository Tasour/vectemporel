import { register } from './registry.js';

/* Lentille E075 — Adaptabilité responsive appliquée au survol de la vue
   Constellation. Dix chantiers concrets (E075-01 … E075-10) : sonde de
   capacité, ampoule dédiée, bornage de position, ancrage mobile, cible
   tactile, tap à extinction automatique, équivalent clavier, désencombrement
   des libellés, paysage court et contraste, état live et idempotence.
   Une seule feuille, un seul greffon, zéro journalisation, zéro réseau,
   zéro aléa, zéro minuteur, zéro boucle d'animation propre. */

register('E075', (ctx) => {
  /* Garde d'entrée : sans layout exploitable, aucun ajout au DOM, y compris
     la feuille injectée dans <head>. Greffon tolérant aux ctx partiels. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (typeof document === 'undefined') return;
  const { viewId, layout, css, el } = ctx;
  if (typeof viewId === 'string' && viewId !== 'constellation') return;
  if (typeof css !== 'function' || typeof el !== 'function') return;
  if (typeof layout.appendChild !== 'function') return;

  try {
    let sobre = false;
    try { sobre = !!(typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()); }
    catch { sobre = false; }

    /* E075-01 — Sonde de capacité : on interroge une seule fois la capacité
       de survol fin et on fige le résultat dans un attribut du layout, que
       la feuille ci-dessous relit pour neutraliser les effets collants. */
    let capable = false;
    try {
      capable = !!(typeof window !== 'undefined' && window.matchMedia &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    } catch { capable = false; }
    layout.setAttribute('data-e075-capable', capable ? 'oui' : 'non');
    if (sobre) layout.classList.add('e075-sobre');
    else layout.classList.remove('e075-sobre');

    /* E075-10 (amorce) — Idempotence : avant toute création, on retire les
       nœuds e075-* déjà présents lors d'un second passage du greffon. */
    const anciens = layout.querySelectorAll('[id^="e075-"]');
    if (anciens && typeof anciens.length === 'number') {
      Array.from(anciens).forEach((n) => {
        if (n && typeof n.remove === 'function') n.remove();
      });
    }

    /* E075-02 à E075-09 — Feuille unique, un commentaire par chantier. */
    css('constellation-e075', `
      /* E075-01 — Sur appareil sans survol fin, on annule toute élévation
         au :hover (ainsi pas d'état collant après le retrait du doigt). */
      .constellation-layout[data-e075-capable="non"] .constellation-field button:hover {
        transform: translate(-50%, -50%);
      }
      .constellation-layout[data-e075-capable="non"] .constellation-field button {
        touch-action: manipulation;
      }

      /* E075-02 — Ampoule visuelle unique : deux lignes, masquée tant que
         l'attribut de visibilité n'est pas posé par le survol. */
      .e075-tip {
        position: absolute;
        left: var(--e075-x, 50%);
        top: var(--e075-y, 8%);
        z-index: 40;
        display: flex;
        flex-direction: column;
        gap: 2px;
        max-width: min(234px, 44%);
        padding: 6px 9px;
        border: 1px solid var(--gold, #e6b96f);
        border-radius: 8px;
        background: rgba(8, 12, 18, .95);
        color: var(--ink-soft, #d7d1c6);
        font-size: 9px;
        line-height: 1.35;
        transform: translateX(-50%);
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition: opacity .14s ease, transform .14s ease;
      }
      .e075-tip[data-e075-tip="1"] { opacity: 1; visibility: visible; }
      .e075-tip-kind {
        color: var(--gold-bright, #f4d69e);
        font-size: 7px;
        font-weight: 700;
        letter-spacing: .12em;
        text-transform: uppercase;
      }
      .e075-tip-label { overflow-wrap: anywhere; }

      /* E075-03 — Bornage horizontal : --e075-x est calculé dans [14 %, 86 %]
         par le JS ; la largeur maximale garantit le maintien dans le champ. */
      @media (min-width: 621px) {
        .e075-tip { max-width: min(240px, 40%); }
      }

      /* E075-04 — Ancrage mobile sous 620 px : l'ampoule devient une barre
         basse pleine largeur, alignée au centre, sans suivre le pointeur. */
      @media (max-width: 620px) {
        .e075-tip {
          left: 50%;
          top: auto;
          bottom: 6px;
          width: calc(100% - 16px);
          max-width: calc(100% - 16px);
          flex-direction: row;
          align-items: baseline;
          gap: 8px;
          padding: 5px 8px;
        }
        .e075-tip-label { flex: 1 1 auto; }
      }

      /* E075-05 — Cible tactile : sur pointeur grossier, l'aire de frappe
         des soleils et des planètes passe à au moins 36 px sans agrandir
         le point visible, hérité de la vue. */
      @media (pointer: coarse) {
        .constellation-field .const-sun::before,
        .constellation-field .const-planet::before {
          content: "";
          position: absolute;
          inset: -11px;
          border-radius: 50%;
          pointer-events: auto;
        }
      }

      /* E075-06 — Tap : une animation CSS porte elle-même son extinction,
         sans minutage côté script ; la classe est retirée puis reposée à
         chaque tap pour relancer la séquence. */
      .e075-tip.e075-tap { animation: e075-extinction 1.8s ease-out forwards; }
      @keyframes e075-extinction {
        0%, 62% { opacity: 1; visibility: visible; }
        100% { opacity: 0; visibility: hidden; }
      }

      /* E075-08 — Désencombrement : dès qu'un nœud est survolé ou focalisé,
         les libellés natifs des autres nœuds s'effacent au profit de
         l'ampoule, ce qui évite les collisions dans un champ étroit. */
      .constellation-field[data-e075-focus="1"] button[data-const-key]::after { opacity: .16; }
      .constellation-field[data-e075-focus="1"] button[data-const-key][data-e075-over]::after { opacity: 1; }

      /* E075-09 — Paysage court : ampoule compacte sur une seule ligne. */
      @media (max-height: 520px) and (orientation: landscape) {
        .e075-tip {
          flex-direction: row;
          align-items: baseline;
          gap: 6px;
          padding: 3px 7px;
          font-size: 8px;
        }
        .e075-tip-kind { font-size: 6px; }
      }

      /* E075-09 — Contraste forcé et mouvement réduit : couleurs système
         conservées, transitions et extinction suspendues en mode sobre. */
      @media (forced-colors: active) {
        .e075-tip { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
        .e075-tip-kind { color: Highlight; }
      }
      @media (prefers-reduced-motion: reduce) {
        .e075-tip { transition: none; animation: none; }
      }
      .e075-sobre .e075-tip { transition: none; animation: none; }

      /* E075-10 — Readout discret, placé sous le champ, jamais porté par la
         seule couleur. */
      .e075-readout {
        margin: 8px 0 0;
        color: var(--muted, #8c8d91);
        font-size: 9px;
        line-height: 1.45;
      }
    `);

    const field = layout.querySelector('.constellation-field');
    if (!field || typeof field.querySelectorAll !== 'function') return;
    const noeuds = Array.from(field.querySelectorAll('button[data-const-key]'));
    if (!noeuds.length) return;

    /* E075-02 — Ampoule dédiée : un seul nœud, deux parties (nature et
       libellé), aria-hidden car l'annonce est assumée par le readout. */
    const tip = el('div', 'e075-tip');
    tip.id = 'e075-tip';
    tip.setAttribute('aria-hidden', 'true');
    tip.setAttribute('data-e075-tip', '0');
    const nature = el('span', 'e075-tip-kind');
    nature.id = 'e075-tip-kind';
    const libelle = el('span', 'e075-tip-label');
    libelle.id = 'e075-tip-label';
    tip.appendChild(nature);
    tip.appendChild(libelle);
    field.appendChild(tip);

    /* E075-10 — Région live : elle annonce la nature, le libellé et le
       mode d'interaction courant (survol ou tactile), jamais une couleur. */
    const readout = el('p', 'e075-readout');
    readout.id = 'e075-readout';
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('aria-atomic', 'true');
    readout.textContent = capable
      ? 'Survol fin disponible : survolez un nœud pour lire son libellé.'
      : 'Survol fin indisponible : touchez un nœud pour lire son libellé.';
    layout.appendChild(readout);

    const direNature = (node) => {
      if (node && node.classList) {
        if (node.classList.contains('const-sun')) return 'Ère';
        if (node.classList.contains('const-planet')) return 'Repère';
        if (node.classList.contains('const-moon')) return 'Point vérifié';
      }
      return 'Nœud';
    };

    /* E075-03 — Bornage déterministe : lecture unique de --x et --y tels
       que déposés par la vue, puis écriture de variables d'ancrage sûres. */
    const placer = (node) => {
      let x = 50;
      let y = 8;
      const style = node.style;
      if (style && typeof style.getPropertyValue === 'function') {
        const bx = Number.parseFloat(style.getPropertyValue('--x'));
        const by = Number.parseFloat(style.getPropertyValue('--y'));
        if (Number.isFinite(bx)) x = Math.max(14, Math.min(86, bx));
        if (Number.isFinite(by)) y = Math.max(6, Math.min(72, by - 8));
      }
      tip.style.setProperty('--e075-x', `${x.toFixed(2)}%`);
      tip.style.setProperty('--e075-y', `${y.toFixed(2)}%`);
    };

    const montrer = (node, parTap) => {
      if (!node || !field.contains(node)) return;
      const texte = (node.dataset && node.dataset.label) ||
        (typeof node.getAttribute === 'function' && node.getAttribute('aria-label')) || 'Nœud';
      const genre = direNature(node);
      nature.textContent = genre;
      libelle.textContent = texte;
      placer(node);
      tip.setAttribute('data-e075-tip', '1');
      noeuds.forEach((n) => n.removeAttribute('data-e075-over'));
      node.setAttribute('data-e075-over', 'true');
      field.setAttribute('data-e075-focus', '1');
      readout.textContent = `${genre} : ${texte} — ${parTap ? 'sélection tactile' : 'survol'}.`;
      if (parTap) {
        /* E075-06 — relance d'animation sans minuteur : retrait, lecture
           de la largeur (forçage de style) puis reposée de la classe. */
        tip.classList.remove('e075-tap');
        void tip.offsetWidth;
        tip.classList.add('e075-tap');
      } else {
        tip.classList.remove('e075-tap');
      }
    };

    const cacher = () => {
      tip.setAttribute('data-e075-tip', '0');
      tip.classList.remove('e075-tap');
      field.removeAttribute('data-e075-focus');
      noeuds.forEach((n) => n.removeAttribute('data-e075-over'));
    };

    const cibleDe = (event) => {
      const t = event && event.target;
      if (!t || t.nodeType !== 1 || typeof t.closest !== 'function') return null;
      const node = t.closest('button[data-const-key]');
      return node && field.contains(node) ? node : null;
    };

    /* E075-02 — Survol délégué : deux écouteurs uniques pour tous les
       nœuds (soleils, planètes et lunes confondus), sans gestionnaire propre. */
    field.addEventListener('pointerover', (event) => {
      if (!capable || (event && event.pointerType === 'touch')) return;
      const node = cibleDe(event);
      if (node) montrer(node, false);
    });
    field.addEventListener('pointerout', (event) => {
      if (!capable || (event && event.pointerType === 'touch')) return;
      const node = cibleDe(event);
      if (!node) return;
      const suivant = event && event.relatedTarget;
      if (suivant && typeof node.contains === 'function' && node.contains(suivant)) return;
      cacher();
    });

    /* E075-06 — Tap tactile : l'ampoule s'affiche puis s'éteint d'elle-même
       par la feuille de style ; un tap hors nœud la referme immédiatement. */
    field.addEventListener('pointerdown', (event) => {
      const tactile = !capable || (event && event.pointerType === 'touch');
      if (!tactile) return;
      const node = cibleDe(event);
      if (node) montrer(node, true);
      else cacher();
    });

    /* E075-07 — Équivalent clavier : le focus reçoit exactement le même
       retour que le survol, y compris sur petite largeur et en mode sobre. */
    field.addEventListener('focusin', (event) => {
      const node = cibleDe(event);
      if (node) montrer(node, false);
    });
    field.addEventListener('focusout', (event) => {
      const node = cibleDe(event);
      if (node) cacher();
    });
  } catch {
    /* Greffon tolérant : toute anomalie neutralise la lentille sans bruit. */
    return;
  }
});
