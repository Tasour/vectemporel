import { register } from './registry.js';

/* Lentille E021 — Accessibilité clavier appliquée aux lunes de la vue Constellation.
   Dix chantiers concrets : ordre de Tab, flèches, Début/Fin, évitement, annonce
   vocalisée, compteur, focus visible, cible minimale, raccourci Alt+L et aide.
   Greffon tolérant : aucune exception, aucun réseau, aucun aléa, aucun timer. */
register('E021', (ctx) => {
  /* Garde d'entrée : le conteneur de la vue est obligatoire avant tout ajout DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;

  try {
    const layout = ctx.layout;
    const make = typeof ctx.el === 'function' ? ctx.el : null;
    const css = typeof ctx.css === 'function' ? ctx.css : null;

    /* Feuille de style unique, identifiant réservé à cette lentille. */
    if (css) {
      css('constellation-e021', `
        /* E021-04 — lien d'évitement masqué hors focus, révélé au focus. */
        #e021-skip {
          position: absolute; left: 8px; top: -60px; z-index: 20;
          padding: 6px 10px; border: 1px solid var(--gold); border-radius: 6px;
          background: var(--surface-2); color: var(--gold-bright);
          font-size: 11px; text-decoration: none; transition: top .15s ease;
        }
        #e021-skip:focus { top: 8px; }
        /* E021-05 — région live visuellement masquée mais vocalisée. */
        #e021-live {
          position: absolute !important; width: 1px; height: 1px;
          padding: 0; margin: -1px; overflow: hidden;
          clip: rect(0 0 0 0); white-space: nowrap; border: 0;
        }
        /* E021-06 — pastille « lune N / total » lisible au clavier. */
        #e021-counter {
          display: inline-block; min-width: 3.2em; padding: 2px 6px;
          border: 1px solid var(--violet); border-radius: 10px;
          color: var(--violet); font-size: 10px;
          font-variant-numeric: tabular-nums; text-align: center;
        }
        /* E021-07 — anneau de focus renforcé sur chaque lune. */
        .constellation-layout .const-moon:focus-visible {
          outline: 2px solid var(--gold-bright); outline-offset: 3px;
          box-shadow: 0 0 0 4px rgba(230, 185, 111, .25);
        }
        /* E021-08 — cible clavier minimale de 24 px sur chaque lune. */
        .constellation-layout .const-moon { min-width: 24px; min-height: 24px; }
        /* E021-10 — aide clavier discrète sous la constellation. */
        #e021-hint { color: var(--muted); font-size: 9px; line-height: 1.4; }
        @media (prefers-reduced-motion: reduce) { #e021-skip { transition: none; } }
      `);
    }

    /* Les lunes sont les points vérifiés du repère actif (boutons .const-moon). */
    const moons = Array.from(layout.querySelectorAll('.const-moon'));
    const moonLayer = layout.querySelector('.const-layer-moons');

    /* Index de parcours partagé par les chantiers 01, 02, 03, 04 et 09. */
    let rovingIndex = (() => {
      const courant = moons.findIndex((m) => m.getAttribute('aria-current') === 'true');
      return courant >= 0 ? courant : 0;
    })();

    function setRoving(index) {
      if (!moons.length) return;
      rovingIndex = ((index % moons.length) + moons.length) % moons.length;
      moons.forEach((moon, i) => {
        moon.setAttribute('tabindex', i === rovingIndex ? '0' : '-1');
        moon.dataset.e021Index = String(i);
      });
    }

    /* E021-01 — Roving tabindex : une seule lune entre dans l'ordre de Tab. */
    setRoving(rovingIndex);

    /* E021-02 — Flèches gauche/droite : déplacement circulaire du focus. */
    if (moonLayer) {
      moonLayer.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        if (!(event.target instanceof Element)) return;
        if (!event.target.classList.contains('const-moon')) return;
        const depuis = moons.indexOf(event.target);
        if (depuis < 0 || moons.length < 2) return;
        const pas = event.key === 'ArrowRight' ? 1 : -1;
        const vers = (depuis + pas + moons.length) % moons.length;
        event.preventDefault();
        event.stopPropagation();
        setRoving(vers);
        moons[vers].focus({ preventScroll: true });
      }, true);
    }

    /* E021-03 — Début/Fin : saut direct à la première ou dernière lune. */
    if (moonLayer) {
      moonLayer.addEventListener('keydown', (event) => {
        if (event.key !== 'Home' && event.key !== 'End') return;
        if (!(event.target instanceof Element)) return;
        if (!event.target.classList.contains('const-moon')) return;
        if (!moons.length) return;
        event.preventDefault();
        event.stopPropagation();
        const vers = event.key === 'Home' ? 0 : moons.length - 1;
        setRoving(vers);
        moons[vers].focus({ preventScroll: true });
      }, true);
    }

    /* E021-04 — Lien d'évitement « Aller aux points vérifiés », ancre posée. */
    if (make && layout.firstChild) {
      if (moonLayer) moonLayer.id = 'e021-moons';
      const evasion = make('a', 'e021-skip', 'Aller aux points vérifiés');
      evasion.id = 'e021-skip';
      evasion.href = '#e021-moons';
      evasion.addEventListener('click', (event) => {
        event.preventDefault();
        const cible = moons[rovingIndex] || moonLayer;
        if (cible && typeof cible.focus === 'function') cible.focus({ preventScroll: true });
      });
      layout.insertBefore(evasion, layout.firstChild);
    }

    /* E021-05 — Région live : annonce de la lune focalisée. */
    if (make && moonLayer) {
      const live = make('p', 'e021-live', '');
      live.id = 'e021-live';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      layout.appendChild(live);
      moonLayer.addEventListener('focusin', (event) => {
        if (!(event.target instanceof Element)) return;
        if (!event.target.classList.contains('const-moon')) return;
        const i = moons.indexOf(event.target);
        const nom = event.target.dataset.label
          || event.target.getAttribute('aria-label') || 'point vérifié';
        live.textContent = `Lune ${i + 1} sur ${moons.length} : ${nom}.`;
      });
    }

    /* E021-06 — Compteur de position « N / total » synchronisé au focus. */
    if (make) {
      const pastille = make('span', 'e021-counter', '');
      pastille.id = 'e021-counter';
      const total = moons.length;
      const afficher = (i) => { pastille.textContent = total ? `${i + 1} / ${total}` : '0 / 0'; };
      afficher(rovingIndex);
      const ancre = layout.querySelector('.constellation-caption') || layout;
      ancre.insertBefore(pastille, ancre.firstChild);
      if (moonLayer) {
        moonLayer.addEventListener('focusin', (event) => {
          if (!(event.target instanceof Element)) return;
          if (!event.target.classList.contains('const-moon')) return;
          const i = moons.indexOf(event.target);
          if (i >= 0) afficher(i);
        });
      }
    }

    /* E021-09 — Raccourci Alt+L : focaliser la lune courante (modificateur libre). */
    const doc = layout.ownerDocument;
    if (doc && doc.addEventListener) {
      doc.addEventListener('keydown', (event) => {
        if (!event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key !== 'l' && event.key !== 'L') return;
        if (!layout.isConnected) return;
        const cible = moons[rovingIndex] || moons[0];
        if (!cible) return;
        event.preventDefault();
        setRoving(moons.indexOf(cible));
        cible.focus({ preventScroll: true });
      }, true);
    }

    /* E021-10 — Aide visible, aria-keyshortcuts et trace du mode de mouvement. */
    moons.forEach((moon) => {
      moon.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight Home End Alt+L');
      moon.setAttribute('aria-describedby', 'e021-hint');
    });
    if (make) {
      const aide = make('p', 'e021-hint',
        'Lunes : ← → parcourir, Début/Fin sauter, Alt+L focaliser, Entrée ouvrir le détail.');
      aide.id = 'e021-hint';
      const ancre = layout.querySelector('.constellation-caption') || layout;
      ancre.appendChild(aide);
    }
    const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
    layout.dataset.e021Motion = reduit ? 'reduced' : 'full';
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
