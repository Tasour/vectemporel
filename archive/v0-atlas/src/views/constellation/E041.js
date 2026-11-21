import { register } from './registry.js';

/* Lentille E041 — Accessibilité clavier appliquée à la légende de la vue Constellation.
   La légende est le div .constellation-legend portant trois entrées statiques
   (.legend-sun « Ère », .legend-planet « Repère », .legend-moon « Point vérifié »).
   Dix chantiers concrets et variés : roving tabindex, flèches circulaires,
   Début/Fin, lien d'évitement, annonce vocalisée, compteur de position,
   anneau de focus, cible minimale, raccourci Alt+K et aide documentée.
   Greffon tolérant : aucune exception, aucun réseau, aucun aléa, aucun timer,
   aucune boucle rAF propre. Aucun fichier partagé n'est modifié. */
register('E041', (ctx) => {
  /* Garde d'entrée : le conteneur de la vue est obligatoire avant tout ajout DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;

  try {
    const layout = ctx.layout;
    const make = typeof ctx.el === 'function' ? ctx.el : null;
    const css = typeof ctx.css === 'function' ? ctx.css : null;
    const doc = layout.ownerDocument || (typeof document === 'undefined' ? null : document);

    /* Feuille de style unique, identifiant réservé à cette lentille. */
    if (css) {
      css('constellation-e041', `
        /* E041-04 — lien d'évitement masqué hors focus, révélé au focus. */
        #e041-skip {
          position: absolute; left: 8px; top: -60px; z-index: 20;
          padding: 6px 10px; border: 1px solid var(--gold); border-radius: 6px;
          background: var(--surface-2); color: var(--gold-bright);
          font-size: 11px; text-decoration: none; transition: top .15s ease;
        }
        #e041-skip:focus { top: 8px; }
        /* E041-05 — région live masquée visuellement mais vocalisée. */
        #e041-live {
          position: absolute !important; width: 1px; height: 1px;
          padding: 0; margin: -1px; overflow: hidden;
          clip: rect(0 0 0 0); white-space: nowrap; border: 0;
        }
        /* E041-06 — pastille « N / total » de la légende, lisible au clavier. */
        #e041-counter {
          display: inline-block; min-width: 3.2em; padding: 2px 6px;
          border: 1px solid var(--violet); border-radius: 10px;
          color: var(--violet); font-size: 10px;
          font-variant-numeric: tabular-nums; text-align: center;
        }
        /* E041-07 — anneau de focus renforcé sur chaque entrée de légende. */
        .constellation-layout .constellation-legend [data-e041-index]:focus-visible {
          outline: 2px solid var(--gold-bright); outline-offset: 3px;
          box-shadow: 0 0 0 4px rgba(230, 185, 111, .25);
        }
        /* E041-08 — cible clavier minimale de 24 px sur chaque entrée. */
        .constellation-layout .constellation-legend [data-e041-index] {
          display: inline-flex; align-items: center;
          min-height: 24px; padding: 0 4px;
        }
        /* E041-10 — aide clavier discrète sous la légende. */
        #e041-hint { color: var(--muted); font-size: 9px; line-height: 1.4; }
        @media (prefers-reduced-motion: reduce) { #e041-skip { transition: none; } }
      `);
    }

    /* La légende et ses trois entrées symboliques, retrouvées à chaque rendu. */
    const legend = layout.querySelector('.constellation-legend');
    if (!legend) return;
    const entrees = Array.from(legend.querySelectorAll('.legend-sun, .legend-planet, .legend-moon'));
    if (!entrees.length) return;

    /* Libellés parlants, dérivés des symboles déjà affichés dans la légende. */
    const libelles = {
      'legend-sun': 'Ère : un anneau doré situe une ère sur le cercle extérieur.',
      'legend-planet': 'Repère : un disque bordé représente un repère de l’ère active.',
      'legend-moon': 'Point vérifié : un petit anneau violet marque un point vérifié du repère.',
    };
    function libelleDe(entree, index) {
      for (const cle in libelles) {
        if (entree.classList.contains(cle)) return libelles[cle];
      }
      const texte = (entree.textContent || '').trim();
      return texte ? `${texte}.` : `Entrée de légende ${index + 1}.`;
    }

    /* Index de parcours partagé par les chantiers 01, 02, 03, 04, 06 et 09. */
    let rovingIndex = (() => {
      const courant = entrees.findIndex((entree) => entree.getAttribute('tabindex') === '0');
      return courant >= 0 ? courant : 0;
    })();

    function setRoving(index) {
      rovingIndex = ((index % entrees.length) + entrees.length) % entrees.length;
      entrees.forEach((entree, i) => {
        entree.setAttribute('tabindex', i === rovingIndex ? '0' : '-1');
        entree.setAttribute('aria-current', i === rovingIndex ? 'true' : 'false');
        entree.setAttribute('data-e041-index', String(i));
        entree.setAttribute('data-e041-total', String(entrees.length));
      });
    }

    /* E041-01 — Roving tabindex : une seule entrée de légende entre dans l'ordre de Tab. */
    legend.setAttribute('role', 'list');
    legend.setAttribute('aria-label', 'Légende de la constellation : ères, repères et points vérifiés');
    legend.setAttribute('data-e041-legend', 'vrai');
    entrees.forEach((entree) => entree.setAttribute('role', 'listitem'));
    setRoving(rovingIndex);

    /* E041-02 — Flèches gauche/droite : déplacement circulaire du focus. */
    legend.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (!(event.target instanceof Element)) return;
      const depuis = entrees.indexOf(event.target);
      if (depuis < 0 || entrees.length < 2) return;
      const pas = event.key === 'ArrowRight' ? 1 : -1;
      const vers = (depuis + pas + entrees.length) % entrees.length;
      event.preventDefault();
      event.stopPropagation();
      setRoving(vers);
      entrees[vers].focus({ preventScroll: true });
    }, true);

    /* E041-03 — Début/Fin : saut direct à la première ou dernière entrée. */
    legend.addEventListener('keydown', (event) => {
      if (event.key !== 'Home' && event.key !== 'End') return;
      if (!(event.target instanceof Element)) return;
      if (entrees.indexOf(event.target) < 0) return;
      event.preventDefault();
      event.stopPropagation();
      const vers = event.key === 'Home' ? 0 : entrees.length - 1;
      setRoving(vers);
      entrees[vers].focus({ preventScroll: true });
    }, true);

    /* E041-04 — Lien d'évitement « Aller à la légende », ancre posée. */
    if (make && layout.firstChild) {
      legend.id = 'e041-legend';
      const evasion = make('a', 'e041-skip', 'Aller à la légende');
      evasion.id = 'e041-skip';
      evasion.href = '#e041-legend';
      evasion.addEventListener('click', (event) => {
        event.preventDefault();
        const cible = entrees[rovingIndex] || legend;
        if (cible && typeof cible.focus === 'function') cible.focus({ preventScroll: true });
      });
      layout.insertBefore(evasion, layout.firstChild);
    }

    /* E041-05 — Région live : annonce de l'entrée de légende focalisée. */
    if (make) {
      const live = make('p', 'e041-live', `${entrees.length} entrées de légende.`);
      live.id = 'e041-live';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      layout.appendChild(live);
      legend.addEventListener('focusin', (event) => {
        if (!(event.target instanceof Element)) return;
        const i = entrees.indexOf(event.target);
        if (i < 0) return;
        live.textContent = `Légende ${i + 1} sur ${entrees.length} : ${libelleDe(event.target, i)}`;
      });
    }

    /* E041-06 — Compteur de position « N / total » synchronisé au focus. */
    if (make) {
      const pastille = make('span', 'e041-counter', '');
      pastille.id = 'e041-counter';
      const afficher = (i) => {
        pastille.textContent = `${i + 1} / ${entrees.length}`;
      };
      afficher(rovingIndex);
      const ancre = layout.querySelector('.constellation-caption') || legend;
      ancre.insertBefore(pastille, ancre.firstChild);
      legend.addEventListener('focusin', (event) => {
        if (!(event.target instanceof Element)) return;
        const i = entrees.indexOf(event.target);
        if (i >= 0) afficher(i);
      });
    }

    /* E041-09 — Raccourci Alt+K : focaliser l'entrée courante (modificateur libre). */
    if (doc && doc.addEventListener) {
      doc.addEventListener('keydown', (event) => {
        if (!event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key !== 'k' && event.key !== 'K') return;
        if (!layout.isConnected) return;
        const cible = entrees[rovingIndex] || entrees[0];
        if (!cible) return;
        event.preventDefault();
        setRoving(entrees.indexOf(cible));
        cible.focus({ preventScroll: true });
      }, true);
    }

    /* E041-10 — Aide visible, raccourcis annoncés et mode de mouvement tracé. */
    entrees.forEach((entree) => {
      entree.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight Home End Alt+K');
      entree.setAttribute('aria-describedby', 'e041-hint');
    });
    if (make) {
      const aide = make('p', 'e041-hint',
        'Légende : ← → parcourir les symboles, Début/Fin sauter, Alt+K focaliser la légende.');
      aide.id = 'e041-hint';
      const ancre = layout.querySelector('.constellation-caption') || layout;
      ancre.appendChild(aide);
    }
    const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
    layout.dataset.e041Motion = reduit ? 'reduced' : 'full';
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
