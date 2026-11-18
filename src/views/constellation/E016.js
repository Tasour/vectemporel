import { register } from './registry.js';

/* Lentille E016 — Gestion de l'état appliquée aux planètes de la vue Constellation.
   Dix chantiers concrets (E016-01 … E016-10) : instantané, empreinte, historique,
   restauration, navigation, sémantique de sélection, réparation, persistance,
   cycle de vie et panneau de synthèse. Greffon tolérant : aucune exception,
   aucun réseau, aucun aléa, aucun timer, aucune animation propre. */
register('E016', (ctx) => {
  /* Garde d'entrée : le conteneur de la vue est obligatoire avant tout ajout DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;

  /* Mémoire du greffon, conservée entre deux passes du rendu du shell. */
  let historique = [];
  let derniereEmpreinte = null;
  let derniereCleActive = null;
  let nombreRendus = 0;

  const safe = (fn) => { try { return fn(); } catch { return null; } };
  const entier = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? Math.round(n) : 0; };

  try {
    const layout = ctx.layout;
    const make = typeof ctx.el === 'function' ? ctx.el : null;
    const css = typeof ctx.css === 'function' ? ctx.css : null;

    /* Feuille de style unique, identifiant réservé à cette lentille. */
    if (css) {
      css('constellation-e016', `
        /* E016-04, E016-10 — contrôles d'état lisibles, cibles ≥ 36 px. */
        #e016-undo, #e016-reset {
          min-height: 36px; padding: 0 10px; margin: 6px 8px 0 0;
          border: 1px solid var(--line); border-radius: 8px;
          background: rgba(255,255,255,.03); color: var(--ink-soft);
          font-size: 9px; cursor: pointer;
        }
        #e016-undo:disabled { opacity: .45; cursor: default; }
        #e016-undo:focus-visible, #e016-reset:focus-visible {
          outline: 2px solid var(--gold-bright); outline-offset: 2px;
        }
        /* E016-09 — halo de l'état actif, sans mouvement si préférence réduite. */
        .constellation-layout .const-planet.e016-cycle {
          box-shadow: 0 0 0 0 rgba(230,185,111,0);
          transition: box-shadow .25s ease;
        }
        .constellation-layout .const-planet.e016-cycle[data-e016-active="1"] {
          box-shadow: 0 0 0 2px rgba(230,185,111,.35);
        }
        /* E016-10 — panneau de synthèse de l'état. */
        #e016-status {
          display: block; margin: 8px 0 0;
          color: var(--gold); font-size: 9px; line-height: 1.5;
        }
        @media (prefers-reduced-motion: reduce) {
          .constellation-layout .const-planet.e016-cycle { transition: none; }
        }
      `);
    }

    /* Les planètes sont les repères de l'ère active (boutons .const-planet). */
    const planetes = Array.from(layout.querySelectorAll('.const-planet'));
    const couche = layout.querySelector('.const-layer-planets');
    const legende = layout.querySelector('.constellation-caption') || layout;

    /* Index actif : la classe .is-active fait foi, aria-current sert de repli. */
    let indexActif = planetes.findIndex((p) => p.classList && p.classList.contains('is-active'));
    if (indexActif < 0) indexActif = planetes.findIndex((p) => p.getAttribute('aria-current') === 'true');

    /* E016-01 — Instantané d'état : chaque planète reçoit son index, sa clé,
       son drapeau actif et sa position arrondie, calculés depuis le DOM. */
    safe(() => {
      planetes.forEach((planete, i) => {
        const x = entier(planete.style.getPropertyValue('--x'));
        const y = entier(planete.style.getPropertyValue('--y'));
        planete.setAttribute('data-e016-idx', String(i));
        planete.setAttribute('data-e016-key', planete.getAttribute('data-const-key') || `planet:${i}`);
        planete.setAttribute('data-e016-active', i === indexActif ? '1' : '0');
        planete.setAttribute('data-e016-pos', `${x},${y}`);
      });
    });

    /* E016-02 — Empreinte déterministe de l'état et nature de la transition. */
    let empreinte = '';
    let transition = 'initiale';
    safe(() => {
      empreinte = `${planetes.length}:${indexActif}:${planetes.map((p) => p.getAttribute('data-e016-pos')).join(';')}`;
      transition = derniereEmpreinte === null ? 'initiale'
        : (derniereEmpreinte === empreinte ? 'stable' : 'modifiee');
      layout.setAttribute('data-e016-fingerprint', empreinte);
      layout.setAttribute('data-e016-transition', transition);
      derniereEmpreinte = empreinte;
    });

    /* E016-03 — Historique borné des indices actifs (huit entrées au plus). */
    safe(() => {
      if (indexActif >= 0 && historique[historique.length - 1] !== indexActif) {
        historique = historique.concat(indexActif).slice(-8);
      }
      layout.setAttribute('data-e016-history', historique.join(','));
      layout.setAttribute('data-e016-history-size', String(historique.length));
    });

    /* E016-04 — Restauration : un bouton rejoue le clic sur le repère précédent. */
    safe(() => {
      if (!make) return;
      const precedent = historique.length >= 2 ? historique[historique.length - 2] : -1;
      const bouton = make('button', 'e016-undo', '← Repère précédent');
      bouton.id = 'e016-undo';
      bouton.type = 'button';
      bouton.disabled = precedent < 0;
      bouton.setAttribute('aria-label', precedent < 0
        ? 'Aucun repère précédent à restaurer'
        : `Restaurer le repère ${precedent + 1}`);
      bouton.addEventListener('click', () => {
        if (!layout.isConnected) return;
        const cible = planetes.find((p) => p.getAttribute('data-e016-idx') === String(precedent));
        if (cible && typeof cible.click === 'function') cible.click();
      });
      legende.insertBefore(bouton, legende.firstChild);
    });

    /* E016-05 — Navigation du groupe par flèches, Début et Fin. */
    safe(() => {
      if (!couche || !planetes.length) return;
      couche.addEventListener('keydown', (event) => {
        if (!(event.target instanceof Element)) return;
        const source = planetes.indexOf(event.target);
        if (source < 0) return;
        let cible = -1;
        if (event.key === 'ArrowRight') cible = (source + 1) % planetes.length;
        else if (event.key === 'ArrowLeft') cible = (source - 1 + planetes.length) % planetes.length;
        else if (event.key === 'Home') cible = 0;
        else if (event.key === 'End') cible = planetes.length - 1;
        if (cible < 0) return;
        event.preventDefault();
        event.stopPropagation();
        if (cible !== source && typeof planetes[cible].click === 'function') planetes[cible].click();
      }, true);
    });

    /* E016-06 — Sélection unique explicite : radiogroup et aria-checked. */
    safe(() => {
      if (couche) couche.setAttribute('role', 'radiogroup');
      planetes.forEach((planete, i) => {
        planete.setAttribute('role', 'radio');
        planete.setAttribute('aria-checked', i === indexActif ? 'true' : 'false');
        planete.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight Home End');
      });
    });

    /* E016-07 — Réparation d'un aria-current divergent de la classe active. */
    safe(() => {
      let reparations = 0;
      planetes.forEach((planete, i) => {
        const actif = i === indexActif;
        const courant = planete.getAttribute('aria-current') === 'true';
        if (courant === actif) return;
        if (actif) planete.setAttribute('aria-current', 'true');
        else planete.removeAttribute('aria-current');
        planete.setAttribute('data-e016-repaired', '1');
        reparations += 1;
      });
      layout.setAttribute('data-e016-repairs', String(reparations));
    });

    /* E016-08 — Persistance de la clé active entre deux rendus du shell. */
    safe(() => {
      const cleActive = indexActif >= 0
        ? planetes[indexActif].getAttribute('data-e016-key') : null;
      if (cleActive && cleActive === derniereCleActive) {
        planetes[indexActif].setAttribute('data-e016-restored', '1');
        layout.setAttribute('data-e016-restored', '1');
      }
      derniereCleActive = cleActive;
    });

    /* E016-09 — Cycle de vie : compteur de rendus et mode de mouvement. */
    safe(() => {
      nombreRendus += 1;
      layout.setAttribute('data-e016-render', String(nombreRendus));
      const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
      layout.setAttribute('data-e016-motion', reduit ? 'reduced' : 'full');
      planetes.forEach((p) => p.classList.add('e016-cycle'));
    });

    /* E016-10 — Panneau de synthèse d'état et remise à zéro de l'historique. */
    safe(() => {
      if (!make) return;
      const actif = indexActif >= 0 ? planetes[indexActif] : null;
      const libelle = actif
        ? (actif.getAttribute('data-label') || actif.getAttribute('aria-label') || `repère ${indexActif + 1}`)
        : 'aucun';
      const panneau = make('p', 'e016-status',
        `État des planètes : ${planetes.length} repère(s), actif « ${libelle} » ` +
        `(${indexActif >= 0 ? indexActif + 1 : 0}/${planetes.length}), ` +
        `transition ${transition}, historique ${historique.length}.`);
      panneau.id = 'e016-status';
      panneau.setAttribute('role', 'status');
      panneau.setAttribute('aria-live', 'polite');
      panneau.setAttribute('aria-atomic', 'true');
      legende.insertBefore(panneau, legende.firstChild);

      const raz = make('button', 'e016-reset', 'Réinitialiser l’historique');
      raz.id = 'e016-reset';
      raz.type = 'button';
      raz.addEventListener('click', () => {
        if (!layout.isConnected) return;
        historique = [];
        layout.setAttribute('data-e016-history', '');
        layout.setAttribute('data-e016-history-size', '0');
        const bouton = layout.querySelector('#e016-undo');
        if (bouton) bouton.disabled = true;
        panneau.textContent = 'Historique de l’état des planètes réinitialisé.';
      });
      legende.insertBefore(raz, legende.firstChild);
    });
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
